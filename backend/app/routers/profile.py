"""
User profile management endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Profile
from app.schemas.user import ProfileUpdate, ProfileResponse, UserWithProfile
from app.dependencies import get_current_verified_user, get_optional_current_user


router = APIRouter(prefix="/profile", tags=["Profile Management"])


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
    Get a user's profile (respects privacy settings)
    
    - Public fields always visible
    - Private fields only visible to profile owner or admin
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Check if viewer is the profile owner or admin
    is_owner = current_user and current_user.id == user_id
    is_admin = current_user and current_user.role.value == "admin"
    
    # Apply privacy filters if not owner/admin
    if not (is_owner or is_admin):
        # Hide private fields based on privacy settings
        profile_dict = {
            "id": profile.id,
            "user_id": profile.user_id,
            "headline": profile.headline if profile.privacy_headline == "public" else None,
            "location": profile.location if profile.privacy_location == "public" else None,
            "bio": profile.bio if profile.privacy_bio == "public" else None,
            "profile_picture_url": profile.profile_picture_url if profile.privacy_profile_picture == "public" else None,
            "privacy_show_email": profile.privacy_show_email,
            "privacy_show_phone": profile.privacy_show_phone,
            "privacy_show_location": profile.privacy_show_location,
            "profile_view_count": profile.profile_view_count if profile.allow_profile_view_tracking else 0,
            "allow_profile_view_tracking": profile.allow_profile_view_tracking,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }
        
        # Increment view count if tracking is enabled
        if profile.allow_profile_view_tracking and current_user:
            profile.profile_view_count += 1
            db.commit()
        
        return profile_dict
    
    # Owner/admin can see everything
    return profile


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


@router.delete("/me", response_model=dict)
async def delete_my_profile(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate user account (soft delete)
    
    - Marks user as inactive
    - Does not delete data (for compliance)
    """
    current_user.is_active = False
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
    Get profile statistics
    
    Returns:
    - Profile view count
    - Account creation date
    - Verification status
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "account_created": current_user.created_at,
        "is_verified": current_user.is_verified,
        "role": current_user.role.value,
        "profile_views": profile.profile_view_count if profile else 0,
        "profile_updated": profile.updated_at if profile else None
    }
