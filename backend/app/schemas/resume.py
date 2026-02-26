"""
Pydantic schemas for resume management
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ResumeResponse(BaseModel):
    """Schema for resume response"""
    id: int
    user_id: int
    original_filename: str
    file_size: int
    file_type: str
    encryption_method: str
    is_encrypted: bool
    is_public: bool
    download_count: int
    uploaded_at: datetime
    last_accessed: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ResumeListResponse(BaseModel):
    """Schema for listing resumes"""
    resumes: list[ResumeResponse]
    total: int
