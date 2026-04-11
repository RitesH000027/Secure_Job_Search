"""
Company management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_recruiter
from app.models.user import User
from app.models.networking import Company, CompanyAdmin
from app.schemas.networking import CompanyCreate, CompanyUpdate, CompanyResponse
from app.utils.audit import log_audit_event
from app.utils.input_sanitization import sanitize_fields


router = APIRouter(prefix="/companies", tags=["Company"])


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    payload_data = sanitize_fields(
        payload.dict(),
        text_fields=["name", "description", "location"],
        url_fields=["website"],
    )

    if not payload_data.get("name"):
        raise HTTPException(status_code=400, detail="Company name cannot be empty")

    existing = db.query(Company).filter(Company.name == payload_data["name"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company name already exists")

    company = Company(
        name=payload_data["name"],
        description=payload_data.get("description"),
        location=payload_data.get("location"),
        website=payload_data.get("website"),
        created_by=current_user.id,
    )
    db.add(company)
    db.flush()

    company_admin = CompanyAdmin(company_id=company.id, user_id=current_user.id)
    db.add(company_admin)

    log_audit_event(
        db,
        action="company_created",
        target_type="company",
        actor_user_id=current_user.id,
        target_id=str(company.id),
        details={"name": company.name},
    )

    db.commit()
    db.refresh(company)
    return company


@router.get("", response_model=list[CompanyResponse])
async def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.get("/my", response_model=list[CompanyResponse])
async def list_my_companies(
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    company_ids = (
        db.query(CompanyAdmin.company_id)
        .filter(CompanyAdmin.user_id == current_user.id)
        .subquery()
    )

    return (
        db.query(Company)
        .filter(Company.id.in_(company_ids))
        .order_by(Company.created_at.desc())
        .all()
    )


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    payload: CompanyUpdate,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    is_admin_member = (
        db.query(CompanyAdmin)
        .filter(CompanyAdmin.company_id == company_id, CompanyAdmin.user_id == current_user.id)
        .first()
    )

    if not is_admin_member and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update company")

    update_data = sanitize_fields(
        payload.dict(exclude_unset=True),
        text_fields=["description", "location"],
        url_fields=["website"],
    )

    for field, value in update_data.items():
        setattr(company, field, value)

    log_audit_event(
        db,
        action="company_updated",
        target_type="company",
        actor_user_id=current_user.id,
        target_id=str(company.id),
        details=update_data,
    )

    db.commit()
    db.refresh(company)
    return company


@router.post("/{company_id}/admins/{user_id}", response_model=dict)
async def add_company_admin(
    company_id: int,
    user_id: int,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    is_admin_member = (
        db.query(CompanyAdmin)
        .filter(CompanyAdmin.company_id == company_id, CompanyAdmin.user_id == current_user.id)
        .first()
    )

    if not is_admin_member and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to manage company admins")

    existing = (
        db.query(CompanyAdmin)
        .filter(CompanyAdmin.company_id == company_id, CompanyAdmin.user_id == user_id)
        .first()
    )
    if existing:
        return {"message": "User is already a company admin"}

    db.add(CompanyAdmin(company_id=company_id, user_id=user_id))

    log_audit_event(
        db,
        action="company_admin_added",
        target_type="company",
        actor_user_id=current_user.id,
        target_id=str(company_id),
        details={"added_user_id": user_id},
    )

    db.commit()

    return {"message": "Company admin added"}
