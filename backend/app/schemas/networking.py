"""
Schemas for company, jobs, applications, messaging, and audit logs.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.networking import (
    WorkMode,
    EmploymentType,
    ApplicationStatus,
    MessageType,
    ConnectionRequestStatus,
    GroupJoinRequestStatus,
)


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)


class CompanyUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)


class CompanyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    location: Optional[str]
    website: Optional[str]
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobCreate(BaseModel):
    company_id: int
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    required_skills: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    work_mode: WorkMode = WorkMode.ONSITE
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    application_deadline: Optional[datetime] = None


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    required_skills: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    work_mode: Optional[WorkMode] = None
    employment_type: Optional[EmploymentType] = None
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    application_deadline: Optional[datetime] = None
    is_active: Optional[bool] = None


class JobResponse(BaseModel):
    id: int
    company_id: int
    title: str
    description: str
    required_skills: Optional[str]
    location: Optional[str]
    work_mode: WorkMode
    employment_type: EmploymentType
    salary_min: Optional[int]
    salary_max: Optional[int]
    application_deadline: Optional[datetime]
    is_active: bool
    created_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class JobApplicationCreate(BaseModel):
    resume_id: Optional[int] = None
    cover_note: Optional[str] = Field(None, max_length=2000)


class JobApplicationUpdate(BaseModel):
    status: ApplicationStatus
    recruiter_notes: Optional[str] = Field(None, max_length=2000)
    is_shortlisted: Optional[bool] = None


class JobApplicationResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    resume_id: Optional[int]
    cover_note: Optional[str]
    status: ApplicationStatus
    recruiter_notes: Optional[str]
    is_shortlisted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    participant_ids: list[int]
    is_group: bool = False
    name: Optional[str] = Field(None, max_length=255)


class MessageCreate(BaseModel):
    ciphertext: str = Field(..., min_length=1)
    message_type: MessageType = MessageType.E2EE


class ConversationResponse(BaseModel):
    id: int
    name: Optional[str]
    is_group: bool
    created_by: Optional[int]
    created_at: datetime
    participant_ids: list[int]
    participant_names: dict[str, str] = {}


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    ciphertext: str
    message_type: MessageType
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: Optional[int]
    action: str
    target_type: str
    target_id: Optional[str]
    details_json: Optional[str]
    previous_hash: Optional[str]
    entry_hash: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectionRequestCreate(BaseModel):
    recipient_id: int


class UserConnectionResponse(BaseModel):
    id: int
    full_name: str
    role: str
    headline: Optional[str] = None
    connection_status: str


class ConnectionRequestResponse(BaseModel):
    id: int
    requester_id: int
    requester_name: Optional[str] = None
    recipient_id: int
    recipient_name: Optional[str] = None
    status: ConnectionRequestStatus
    created_at: datetime

    class Config:
        from_attributes = True


class UserEncryptionKeyUpsert(BaseModel):
    public_key: str = Field(..., min_length=1)


class UserEncryptionKeyResponse(BaseModel):
    user_id: int
    public_key: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationKeyEnvelopeCreate(BaseModel):
    user_id: int
    encrypted_key: str = Field(..., min_length=1)


class ConversationKeyEnvelopeBatchCreate(BaseModel):
    envelopes: list[ConversationKeyEnvelopeCreate]


class ConversationKeyEnvelopeResponse(BaseModel):
    conversation_id: int
    user_id: int
    encrypted_key: str

    class Config:
        from_attributes = True


class GlobalSearchResult(BaseModel):
    result_type: str
    id: int
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    url: str
    connection_status: Optional[str] = None


class GroupConversationRename(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class GroupParticipantManage(BaseModel):
    user_id: int


class GroupSearchResult(BaseModel):
    id: int
    name: str
    participant_count: int
    is_member: bool
    has_pending_request: bool


class GroupJoinRequestResponse(BaseModel):
    id: int
    conversation_id: int
    requester_id: int
    requester_name: str
    status: GroupJoinRequestStatus
    created_at: datetime

    class Config:
        from_attributes = True


class UserPostResponse(BaseModel):
    id: int
    author_id: int
    author_name: str
    content: str
    image_url: Optional[str]
    like_count: int = 0
    comment_count: int = 0
    is_liked_by_me: bool = False
    comments: list["PostCommentResponse"] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


class CompanyJobFeedResponse(BaseModel):
    id: int
    company_id: int
    company_name: str
    title: str
    description: str
    location: Optional[str]
    work_mode: WorkMode
    employment_type: EmploymentType
    created_at: datetime


class HomeFeedResponse(BaseModel):
    friend_posts: list[UserPostResponse]
    company_jobs: list[CompanyJobFeedResponse]
    next_post_offset: int
    next_job_offset: int
    has_more_posts: bool
    has_more_jobs: bool


class PostUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class PostCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class PostCommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    user_name: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
