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


router = APIRouter(prefix="/companies", tags=["Company"])


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    existing = db.query(Company).filter(Company.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company name already exists")

    company = Company(
        name=payload.name,
        description=payload.description,
        location=payload.location,
        website=payload.website,
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

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(company, field, value)

    log_audit_event(
        db,
        action="company_updated",
        target_type="company",
        actor_user_id=current_user.id,
        target_id=str(company.id),
        details=payload.dict(exclude_unset=True),
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
