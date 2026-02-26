"""
Admin dashboard endpoints for user and platform management
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, Profile
from app.models.resume import Resume
from app.schemas.user import UserResponse
from app.dependencies import get_current_admin


router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/stats", response_model=dict)
async def get_platform_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get platform statistics
    
    Returns:
    - Total users
    - Active users
    - Verified users
    - Total resumes uploaded
    - Users by role
    """
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar()
    suspended_users = db.query(func.count(User.id)).filter(User.is_suspended == True).scalar()
    total_resumes = db.query(func.count(Resume.id)).scalar()
    
    # Count by role
    users_count = db.query(func.count(User.id)).filter(User.role == "user").scalar()
    recruiters_count = db.query(func.count(User.id)).filter(User.role == "recruiter").scalar()
    admins_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar()
    
    # TOTP statistics
    totp_enabled_count = db.query(func.count(User.id)).filter(User.totp_enabled == True).scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "suspended_users": suspended_users,
        "total_resumes": total_resumes,
        "users_by_role": {
            "users": users_count,
            "recruiters": recruiters_count,
            "admins": admins_count
        },
        "security_stats": {
            "totp_enabled": totp_enabled_count
        }
    }


@router.get("/users", response_model=dict)
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    is_suspended: Optional[bool] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all users with filtering and pagination
    
    Query params:
    - skip: Number of records to skip (pagination)
    - limit: Maximum number of records to return
    - role: Filter by role (user/recruiter/admin)
    - is_active: Filter by active status
    - is_verified: Filter by verification status
    - is_suspended: Filter by suspension status
    """
    query = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_verified is not None:
        query = query.filter(User.is_verified == is_verified)
    if is_suspended is not None:
        query = query.filter(User.is_suspended == is_suspended)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    users = query.offset(skip).limit(limit).all()
    
    return {
        "users": [UserResponse.from_orm(user) for user in users],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/users/{user_id}", response_model=dict)
async def get_user_details(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific user
    
    Includes:
    - User account details
    - Profile information
    - Resume count
    - Account activity
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    resume_count = db.query(func.count(Resume.id)).filter(Resume.user_id == user_id).scalar()
    
    return {
        "user": UserResponse.from_orm(user),
        "profile": profile,
        "resume_count": resume_count,
        "totp_enabled": user.totp_enabled
    }


@router.post("/users/{user_id}/suspend", response_model=dict)
async def suspend_user(
    user_id: int,
    reason: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Suspend a user account
    
    - User cannot login
    - Existing sessions remain valid until token expires
    - Can be reversed by activating the account
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role.value == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot suspend admin users"
        )
    
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already suspended"
        )
    
    user.is_suspended = True
    db.commit()
    
    return {
        "message": f"User {user.email} suspended successfully",
        "reason": reason,
        "user_id": user_id
    }


@router.post("/users/{user_id}/activate", response_model=dict)
async def activate_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Activate a suspended user account
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not suspended"
        )
    
    user.is_suspended = False
    user.is_active = True
    db.commit()
    
    return {
        "message": f"User {user.email} activated successfully",
        "user_id": user_id
    }


@router.delete("/users/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Permanently delete a user account
    
    WARNING: This action cannot be undone!
    - Deletes user data
    - Deletes profile
    - Deletes all uploaded resumes
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role.value == "admin" and user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own admin account"
        )
    
    email = user.email
    
    # Delete will cascade to profile, otp_tokens, and resumes
    db.delete(user)
    db.commit()
    
    return {
        "message": f"User {email} deleted permanently",
        "user_id": user_id
    }


@router.get("/resumes", response_model=dict)
async def list_all_resumes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all uploaded resumes (admin view)
    """
    query = db.query(Resume)
    
    total = query.count()
    resumes = query.offset(skip).limit(limit).all()
    
    return {
        "resumes": resumes,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/activity", response_model=dict)
async def get_recent_activity(
    limit: int = Query(50, ge=1, le=500),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get recent platform activity
    
    Returns:
    - Recently registered users
    - Recently uploaded resumes
    """
    recent_users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(limit)
        .all()
    )
    
    recent_resumes = (
        db.query(Resume)
        .order_by(Resume.uploaded_at.desc())
        .limit(limit)
        .all()
    )
    
    return {
        "recent_users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "created_at": u.created_at
            }
            for u in recent_users
        ],
        "recent_resumes": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "filename": r.original_filename,
                "uploaded_at": r.uploaded_at
            }
            for r in recent_resumes
        ]
    }
