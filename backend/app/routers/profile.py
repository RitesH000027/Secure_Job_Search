"""
User profile management endpoints
"""
import mimetypes
import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Profile, ProfileView
from app.models.networking import ConnectionRequest, ConnectionRequestStatus
from app.schemas.user import ProfileUpdate, ProfileResponse, UserWithProfile
from app.dependencies import get_current_verified_user, get_optional_current_user
from app.utils.otp import verify_otp
from app.utils.audit import log_audit_event
from app.config import settings


router = APIRouter(prefix="/profile", tags=["Profile Management"])

ALLOWED_PROFILE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_PROFILE_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


def _profile_picture_directory() -> str:
    return os.path.join(settings.UPLOAD_DIR, "profile_pictures")


def _profile_picture_url(filename: str) -> str:
    return f"/profile-pictures/{filename}"


def _is_connection(db: Session, user_a: int, user_b: int) -> bool:
    return (
        db.query(ConnectionRequest)
        .filter(
            ConnectionRequest.status == ConnectionRequestStatus.ACCEPTED,
            or_(
                and_(ConnectionRequest.requester_id == user_a, ConnectionRequest.recipient_id == user_b),
                and_(ConnectionRequest.requester_id == user_b, ConnectionRequest.recipient_id == user_a),
            ),
        )
        .first()
        is not None
    )


def _can_view_field(policy: str, is_owner: bool, is_admin: bool, is_connected: bool) -> bool:
    if is_owner or is_admin:
        return True
    if policy == "public":
        return True
    if policy == "connections" and is_connected:
        return True
    return False


@router.get("/me", response_model=UserWithProfile)
async def get_my_profile(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    # Return user with profile
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "is_mobile_verified": bool(getattr(current_user, "is_mobile_verified", False)),
        "is_suspended": current_user.is_suspended,
        "public_key": current_user.public_key,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "profile": profile
    }
    
    return user_data


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a user's profile with field-level privacy controls.

    Privacy policies supported per field:
    - public
    - connections
    - private
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    is_owner = bool(current_user and current_user.id == user_id)
    is_admin = bool(current_user and current_user.role.value == "admin")
    is_connected = bool(current_user and _is_connection(db, current_user.id, user_id))

    if profile.allow_profile_view_tracking and current_user and not is_owner:
        profile.profile_view_count += 1
        db.add(ProfileView(viewed_user_id=user_id, viewer_user_id=current_user.id))
        db.commit()

    if is_owner or is_admin:
        return profile

    profile_dict = {
        "id": profile.id,
        "user_id": profile.user_id,
        "headline": profile.headline if _can_view_field(profile.privacy_headline, is_owner, is_admin, is_connected) else None,
        "location": profile.location if _can_view_field(profile.privacy_location, is_owner, is_admin, is_connected) else None,
        "bio": profile.bio if _can_view_field(profile.privacy_bio, is_owner, is_admin, is_connected) else None,
        "education": profile.education if _can_view_field(profile.privacy_education, is_owner, is_admin, is_connected) else None,
        "experience": profile.experience if _can_view_field(profile.privacy_experience, is_owner, is_admin, is_connected) else None,
        "skills": profile.skills if _can_view_field(profile.privacy_skills, is_owner, is_admin, is_connected) else None,
        "profile_picture_url": profile.profile_picture_url if _can_view_field(profile.privacy_profile_picture, is_owner, is_admin, is_connected) else None,
        "privacy_show_email": profile.privacy_show_email,
        "privacy_show_phone": profile.privacy_show_phone,
        "privacy_show_location": profile.privacy_show_location,
        "profile_view_count": profile.profile_view_count if profile.allow_profile_view_tracking else 0,
        "allow_profile_view_tracking": profile.allow_profile_view_tracking,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }

    return profile_dict


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile
    
    Can update:
    - Professional info (headline, location, bio)
    - Privacy settings
    - Profile tracking preferences
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Update fields that were provided
    update_data = profile_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    return profile


@router.post("/me/picture", response_model=ProfileResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    """Upload a binary profile picture and store its public URL."""
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_PROFILE_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed types: {', '.join(sorted(ALLOWED_PROFILE_IMAGE_EXTENSIONS))}",
        )

    if file.content_type not in ALLOWED_PROFILE_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image content type",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is empty",
        )

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large. Maximum size: 5MB",
        )

    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    upload_dir = _profile_picture_directory()
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{current_user.id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as image_file:
        image_file.write(content)

    old_picture_url = profile.profile_picture_url
    profile.profile_picture_url = _profile_picture_url(filename)

    if old_picture_url and old_picture_url.startswith("/profile-pictures/"):
        old_path = os.path.join(upload_dir, old_picture_url.rsplit("/", 1)[-1])
        if os.path.exists(old_path) and old_path != file_path:
            try:
                os.remove(old_path)
            except OSError:
                pass

    log_audit_event(
        db,
        action="profile_picture_uploaded",
        target_type="profile",
        actor_user_id=current_user.id,
        target_id=str(profile.id),
        details={"filename": file.filename, "content_type": file.content_type},
    )
    db.commit()
    db.refresh(profile)

    return profile


@router.delete("/me", response_model=dict)
async def delete_my_profile(
    otp_code: str = Query(..., min_length=6, max_length=6),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate user account (soft delete) with OTP for high-risk action.
    """
    is_valid_otp, otp_error = verify_otp(db, current_user.id, otp_code, purpose="account_delete")
    if not is_valid_otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=otp_error)

    current_user.is_active = False
    log_audit_event(
        db,
        action="account_deactivated",
        target_type="user",
        actor_user_id=current_user.id,
        target_id=str(current_user.id),
    )
    db.commit()

    return {
        "message": "Account deactivated successfully. Contact admin to reactivate."
    }


@router.get("/stats/me", response_model=dict)
async def get_my_profile_stats(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get profile statistics.
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    recent_views_count = db.query(ProfileView).filter(ProfileView.viewed_user_id == current_user.id).count()

    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "account_created": current_user.created_at,
        "is_verified": current_user.is_verified,
        "role": current_user.role.value,
        "profile_views": profile.profile_view_count if profile else 0,
        "recent_view_events": recent_views_count,
        "profile_updated": profile.updated_at if profile else None
    }


@router.get("/viewers/me", response_model=list[dict])
async def get_recent_viewers(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile or not profile.allow_profile_view_tracking:
        return []

    views = (
        db.query(ProfileView)
        .filter(ProfileView.viewed_user_id == current_user.id, ProfileView.viewer_user_id.isnot(None))
        .order_by(ProfileView.viewed_at.desc())
        .limit(limit)
        .all()
    )

    viewer_ids = [view.viewer_user_id for view in views if view.viewer_user_id is not None]
    users = db.query(User).filter(User.id.in_(viewer_ids)).all() if viewer_ids else []
    user_map = {user.id: user for user in users}

    return [
        {
            "viewer_id": view.viewer_user_id,
            "viewer_name": user_map.get(view.viewer_user_id).full_name if user_map.get(view.viewer_user_id) else "Unknown",
            "viewed_at": view.viewed_at,
        }
        for view in views
    ]
