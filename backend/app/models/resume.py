"""
Database model for encrypted resume storage
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Resume(Base):
    """
    Resume model for storing encrypted resume files
    """
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # File information
    original_filename = Column(String(255), nullable=False)
    encrypted_filename = Column(String(255), nullable=False, unique=True)  # Stored filename on disk
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String(50), nullable=False)  # MIME type
    
    # Encryption metadata
    encryption_method = Column(String(50), default="fernet", nullable=False)
    is_encrypted = Column(Boolean, default=True, nullable=False)
    
    # Access control
    is_public = Column(Boolean, default=False)  # If true, anyone can download
    download_count = Column(Integer, default=0)
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_accessed = Column(DateTime, nullable=True)
    
    # Relationship back to user
    user = relationship("User", back_populates="resumes")

    def __repr__(self):
        return f"<Resume {self.original_filename} user_id={self.user_id}>"
