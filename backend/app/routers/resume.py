"""
Resume upload and download endpoints with encryption
"""
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeResponse, ResumeListResponse
from app.dependencies import get_current_verified_user, get_optional_current_user
from app.utils.encryption import encrypt_file, decrypt_file, generate_unique_filename
from app.config import settings
import io


router = APIRouter(prefix="/resume", tags=["Resume Management"])


# Allowed file types
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE  # 10MB


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    is_public: bool = False,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Upload and encrypt a resume file
    
    - Validates file type (PDF, DOCX, DOC)
    - Encrypts file with Fernet
    - Stores encrypted file on disk
    - Creates database record
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )
    
    # Encrypt file content
    encrypted_content = encrypt_file(file_content)
    
    # Generate unique filename
    encrypted_filename = generate_unique_filename(file.filename, current_user.id)
    
    # Ensure upload directory exists
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save encrypted file to disk
    file_path = os.path.join(upload_dir, encrypted_filename)
    with open(file_path, "wb") as f:
        f.write(encrypted_content)
    
    # Create database record
    resume = Resume(
        user_id=current_user.id,
        original_filename=file.filename,
        encrypted_filename=encrypted_filename,
        file_size=file_size,
        file_type=file.content_type,
        encryption_method="fernet",
        is_encrypted=True,
        is_public=is_public,
        download_count=0
    )
    
    db.add(resume)
    db.commit()
    db.refresh(resume)
    
    return resume


@router.get("/list", response_model=ResumeListResponse)
async def list_my_resumes(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    List all resumes uploaded by current user
    """
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    
    return {
        "resumes": resumes,
        "total": len(resumes)
    }


@router.get("/download/{resume_id}")
async def download_resume(
    resume_id: int,
    current_user: User = Depends(get_optional_current_user),
   db: Session = Depends(get_db)
):
    """
    Download and decrypt a resume
    
    Access control:
    - Owner can always download
    - Admin can always download
    - Public resumes can be downloaded by anyone (authenticated)
    - Private resumes require authentication and ownership
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    #Check access permissions
    is_owner = current_user and current_user.id == resume.user_id
    is_admin = current_user and current_user.role.value == "admin"
    is_public = resume.is_public
    
    if not (is_owner or is_admin or is_public):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resume"
        )
    
    # Read encrypted file from disk
    file_path = os.path.join(settings.UPLOAD_DIR, resume.encrypted_filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on disk"
        )
    
    with open(file_path, "rb") as f:
        encrypted_content = f.read()
    
    # Decrypt file content
    try:
        decrypted_content = decrypt_file(encrypted_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt resume file"
        )
    
    # Update download count and last accessed
    resume.download_count += 1
    resume.last_accessed = datetime.utcnow()
    db.commit()
    
    # Return decrypted file
    return StreamingResponse(
        io.BytesIO(decrypted_content),
        media_type=resume.file_type,
        headers={
            "Content-Disposition": f'attachment; filename="{resume.original_filename}"'
        }
    )


@router.delete("/{resume_id}", response_model=dict)
async def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Delete a resume (owner or admin only)
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Check permissions
    if resume.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this resume"
        )
    
    # Delete file from disk
    file_path = os.path.join(settings.UPLOAD_DIR, resume.encrypted_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete database record
    db.delete(resume)
    db.commit()
    
    return {"message": "Resume deleted successfully"}


@router.patch("/{resume_id}/visibility", response_model=ResumeResponse)
async def update_resume_visibility(
    resume_id: int,
    is_public: bool,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Update resume visibility (public/private)
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Check permissions
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this resume"
        )
    
    resume.is_public = is_public
    db.commit()
    db.refresh(resume)
    
    return resume
