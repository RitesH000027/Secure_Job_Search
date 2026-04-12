"""
Job posting, search, and application tracking endpoints.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_recruiter, get_current_verified_user
from app.models.user import User
from app.models.resume import Resume
from app.models.networking import (
    Company,
    CompanyAdmin,
    JobPosting,
    JobApplication,
    ApplicationStatus,
    WorkMode,
    EmploymentType,
)
from app.schemas.networking import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobApplicationCreate,
    JobApplicationUpdate,
    JobApplicationResponse,
)
from app.utils.audit import log_audit_event
from app.utils.input_sanitization import sanitize_fields


router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _is_company_admin(db: Session, company_id: int, user_id: int) -> bool:
    return (
        db.query(CompanyAdmin)
        .filter(CompanyAdmin.company_id == company_id, CompanyAdmin.user_id == user_id)
        .first()
        is not None
    )


def _application_to_response(application: JobApplication, candidate: User | None = None) -> JobApplicationResponse:
    return JobApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        candidate_id=application.candidate_id,
        candidate_name=(candidate.full_name if candidate else None),
        candidate_email=(candidate.email if candidate else None),
        resume_id=application.resume_id,
        cover_note=application.cover_note,
        status=application.status,
        recruiter_notes=application.recruiter_notes,
        is_shortlisted=application.is_shortlisted,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    payload_data = sanitize_fields(
        payload.dict(),
        text_fields=["title", "description", "required_skills", "location"],
    )

    if not payload_data.get("title") or not payload_data.get("description"):
        raise HTTPException(status_code=400, detail="Title and description are required")

    company = db.query(Company).filter(Company.id == payload_data["company_id"]).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not _is_company_admin(db, payload_data["company_id"], current_user.id) and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to post for this company")

    if payload_data.get("salary_min") and payload_data.get("salary_max") and payload_data["salary_min"] > payload_data["salary_max"]:
        raise HTTPException(status_code=400, detail="salary_min cannot exceed salary_max")

    deadline_value = payload_data.get("application_deadline")
    if deadline_value is None:
        deadline_value = datetime.utcnow() + timedelta(days=30)
    if deadline_value <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="application_deadline must be in the future")

    job = JobPosting(
        company_id=payload_data["company_id"],
        title=payload_data["title"],
        description=payload_data["description"],
        required_skills=payload_data.get("required_skills"),
        location=payload_data.get("location"),
        work_mode=payload_data.get("work_mode"),
        employment_type=payload_data.get("employment_type"),
        salary_min=payload_data.get("salary_min"),
        salary_max=payload_data.get("salary_max"),
        application_deadline=deadline_value,
        created_by=current_user.id,
    )
    db.add(job)

    log_audit_event(
        db,
        action="job_created",
        target_type="job_posting",
        actor_user_id=current_user.id,
        target_id=None,
        details={"title": payload_data["title"], "company_id": payload_data["company_id"]},
    )

    db.commit()
    db.refresh(job)
    return job


@router.get("/search", response_model=list[JobResponse])
async def search_jobs(
    keyword: Optional[str] = None,
    company_id: Optional[int] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    skill: Optional[str] = None,
    remote: Optional[bool] = None,
    employment_type: Optional[str] = Query(None, pattern="^(full-time|internship)$"),
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(JobPosting).join(Company, Company.id == JobPosting.company_id)

    if active_only:
        query = query.filter(JobPosting.is_active == True)

    if keyword:
        like_query = f"%{keyword}%"
        query = query.filter(
            or_(
                JobPosting.title.ilike(like_query),
                JobPosting.description.ilike(like_query),
            )
        )

    if company_id is not None:
        query = query.filter(JobPosting.company_id == company_id)

    if company:
        query = query.filter(Company.name.ilike(f"%{company}%"))

    if location:
        query = query.filter(JobPosting.location.ilike(f"%{location}%"))

    if skill:
        query = query.filter(JobPosting.required_skills.ilike(f"%{skill}%"))

    if remote is not None:
        query = query.filter(JobPosting.work_mode == (WorkMode.REMOTE if remote else WorkMode.ONSITE))

    if employment_type:
        query = query.filter(
            JobPosting.employment_type == (
                EmploymentType.FULL_TIME if employment_type == "full-time" else EmploymentType.INTERNSHIP
            )
        )

    return query.order_by(JobPosting.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    payload: JobUpdate,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not _is_company_admin(db, job.company_id, current_user.id) and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this job")

    update_data = sanitize_fields(
        payload.dict(exclude_unset=True),
        text_fields=["title", "description", "required_skills", "location"],
    )

    salary_min = update_data.get("salary_min", job.salary_min)
    salary_max = update_data.get("salary_max", job.salary_max)
    if salary_min and salary_max and salary_min > salary_max:
        raise HTTPException(status_code=400, detail="salary_min cannot exceed salary_max")

    if "application_deadline" in update_data and update_data["application_deadline"] is not None:
        if update_data["application_deadline"] <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="application_deadline must be in the future")

    for field, value in update_data.items():
        setattr(job, field, value)

    log_audit_event(
        db,
        action="job_updated",
        target_type="job_posting",
        actor_user_id=current_user.id,
        target_id=str(job.id),
        details=update_data,
    )

    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/apply", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: int,
    payload: JobApplicationCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id, JobPosting.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Active job not found")

    payload_data = sanitize_fields(
        payload.dict(),
        text_fields=["cover_note"],
    )

    if payload_data.get("resume_id"):
        resume = db.query(Resume).filter(Resume.id == payload_data["resume_id"]).first()
        if not resume or (resume.user_id != current_user.id and current_user.role.value != "admin"):
            raise HTTPException(status_code=403, detail="Invalid resume access")

    if job.application_deadline and datetime.utcnow() > job.application_deadline:
        raise HTTPException(status_code=400, detail="Application deadline has passed")

    existing = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job_id, JobApplication.candidate_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    application = JobApplication(
        job_id=job_id,
        candidate_id=current_user.id,
        resume_id=payload_data.get("resume_id"),
        cover_note=payload_data.get("cover_note"),
        status=ApplicationStatus.APPLIED,
    )
    db.add(application)

    log_audit_event(
        db,
        action="job_applied",
        target_type="job_application",
        actor_user_id=current_user.id,
        details={"job_id": job_id},
    )

    db.commit()
    db.refresh(application)
    return application


@router.get("/applications/me", response_model=list[JobApplicationResponse])
async def list_my_applications(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    applications = (
        db.query(JobApplication)
        .filter(JobApplication.candidate_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    return [
        _application_to_response(application, current_user)
        for application in applications
    ]


@router.get("/{job_id}/applications", response_model=list[JobApplicationResponse])
async def list_job_applications(
    job_id: int,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not _is_company_admin(db, job.company_id, current_user.id) and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view applicants")

    applications = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job_id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )

    candidate_ids = {application.candidate_id for application in applications}
    candidates = db.query(User).filter(User.id.in_(candidate_ids)).all() if candidate_ids else []
    candidate_map = {candidate.id: candidate for candidate in candidates}

    return [
        _application_to_response(application, candidate_map.get(application.candidate_id))
        for application in applications
    ]


@router.patch("/applications/{application_id}/status", response_model=JobApplicationResponse)
async def update_application_status(
    application_id: int,
    payload: JobApplicationUpdate,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(JobPosting).filter(JobPosting.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not _is_company_admin(db, job.company_id, current_user.id) and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this application")

    application.status = payload.status
    update_data = sanitize_fields(
        payload.dict(),
        text_fields=["recruiter_notes"],
    )
    application.recruiter_notes = update_data.get("recruiter_notes")
    if payload.is_shortlisted is not None:
        application.is_shortlisted = payload.is_shortlisted

    log_audit_event(
        db,
        action="application_status_updated",
        target_type="job_application",
        actor_user_id=current_user.id,
        target_id=str(application.id),
        details={
            "status": payload.status.value,
            "is_shortlisted": application.is_shortlisted,
        },
    )

    db.commit()
    db.refresh(application)
    return application
