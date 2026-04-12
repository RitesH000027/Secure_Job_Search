"""
Home feed and social post endpoints.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import cast

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_verified_user
from app.models.networking import (
    Company,
    ConnectionRequest,
    ConnectionRequestStatus,
    JobPosting,
    PostComment,
    PostLike,
    UserPost,
)
from app.models.user import User
from app.schemas.networking import (
    CompanyJobFeedResponse,
    HomeFeedResponse,
    PostCommentCreate,
    PostCommentResponse,
    PostUpdateRequest,
    UserPostResponse,
)
from app.utils.input_sanitization import sanitize_text


router = APIRouter(prefix="/feed", tags=["Feed"])

POST_IMAGE_DIR = os.path.join(settings.UPLOAD_DIR, "post_images")
os.makedirs(POST_IMAGE_DIR, exist_ok=True)
_ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _get_connected_user_ids(db: Session, current_user_id: int) -> set[int]:
    rows = (
        db.query(ConnectionRequest)
        .filter(
            ConnectionRequest.status == ConnectionRequestStatus.ACCEPTED,
            or_(
                ConnectionRequest.requester_id == current_user_id,
                ConnectionRequest.recipient_id == current_user_id,
            ),
        )
        .all()
    )
    user_ids = {current_user_id}
    for row in rows:
        requester_id = int(cast(int, row.requester_id))
        recipient_id = int(cast(int, row.recipient_id))
        user_ids.add(recipient_id if requester_id == current_user_id else requester_id)
    return user_ids


def _build_post_response(post: UserPost, author_name: str) -> UserPostResponse:
    comments = cast(list[PostCommentResponse], getattr(post, "_feed_comments", []))
    like_count = int(cast(int, getattr(post, "_feed_like_count", 0)))
    is_liked_by_me = bool(cast(bool, getattr(post, "_feed_is_liked", False)))
    return UserPostResponse(
        id=int(cast(int, post.id)),
        author_id=int(cast(int, post.author_id)),
        author_name=author_name,
        content=str(cast(str, post.content)),
        image_url=cast(str | None, post.image_url),
        like_count=like_count,
        comment_count=len(comments),
        is_liked_by_me=is_liked_by_me,
        comments=comments,
        created_at=cast(datetime, post.created_at),
        updated_at=cast(datetime | None, post.updated_at),
    )


def _extract_image_path(image_url: str | None) -> str | None:
    if not image_url or "/post-images/" not in image_url:
        return None
    filename = image_url.rsplit("/post-images/", 1)[1]
    if not filename:
        return None
    return os.path.join(POST_IMAGE_DIR, filename)


def _hydrate_post_interactions(db: Session, posts: list[UserPost], current_user_id: int) -> None:
    post_ids = [int(cast(int, post.id)) for post in posts]
    if not post_ids:
        return

    likes = db.query(PostLike).filter(PostLike.post_id.in_(post_ids)).all()
    like_count_map: dict[int, int] = {}
    liked_by_me = set()
    for like in likes:
        post_id = int(cast(int, like.post_id))
        user_id = int(cast(int, like.user_id))
        like_count_map[post_id] = like_count_map.get(post_id, 0) + 1
        if user_id == current_user_id:
            liked_by_me.add(post_id)

    comments = (
        db.query(PostComment)
        .filter(PostComment.post_id.in_(post_ids))
        .order_by(PostComment.created_at.asc())
        .all()
    )
    comment_user_ids = {int(cast(int, comment.user_id)) for comment in comments}
    users = db.query(User).filter(User.id.in_(comment_user_ids)).all() if comment_user_ids else []
    user_map = {int(cast(int, user.id)): (user.full_name or user.email) for user in users}

    comments_map: dict[int, list[PostCommentResponse]] = {post_id: [] for post_id in post_ids}
    for comment in comments:
        post_id = int(cast(int, comment.post_id))
        user_id = int(cast(int, comment.user_id))
        comments_map.setdefault(post_id, []).append(
            PostCommentResponse(
                id=int(cast(int, comment.id)),
                post_id=post_id,
                user_id=user_id,
                user_name=user_map.get(user_id, f"User #{user_id}"),
                content=str(cast(str, comment.content)),
                created_at=cast(datetime, comment.created_at),
                updated_at=cast(datetime | None, comment.updated_at),
            )
        )

    for post in posts:
        post_id = int(cast(int, post.id))
        setattr(post, "_feed_like_count", like_count_map.get(post_id, 0))
        setattr(post, "_feed_is_liked", post_id in liked_by_me)
        setattr(post, "_feed_comments", comments_map.get(post_id, []))


def _load_post_or_404(db: Session, post_id: int) -> UserPost:
    post = db.query(UserPost).filter(UserPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/posts", response_model=UserPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    request: Request,
    content: str = Form(""),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    sanitized_content = sanitize_text(content, max_length=5000) or ""
    if not sanitized_content.strip() and image is None:
        raise HTTPException(status_code=400, detail="Post content or image is required")

    image_url: str | None = None
    if image is not None:
        _, ext = os.path.splitext(image.filename or "")
        ext = ext.lower()
        if ext not in _ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported image format")

        filename = f"{uuid.uuid4().hex}{ext}"
        destination = os.path.join(POST_IMAGE_DIR, filename)
        content_bytes = await image.read()
        if len(content_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image exceeds 5MB limit")

        with open(destination, "wb") as file_obj:
            file_obj.write(content_bytes)

        base_url = str(request.base_url).rstrip("/")
        image_url = f"{base_url}/post-images/{filename}"

    post = UserPost(
        author_id=int(cast(int, current_user.id)),
        content=sanitized_content,
        image_url=image_url,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    author_name = current_user.full_name or current_user.email
    return _build_post_response(post, author_name)


@router.get("/home", response_model=HomeFeedResponse)
async def get_home_feed(
    post_offset: int = Query(0, ge=0),
    job_offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    connected_user_ids = _get_connected_user_ids(db, current_user_id)

    posts = (
        db.query(UserPost)
        .filter(UserPost.author_id.in_(connected_user_ids))
        .order_by(UserPost.created_at.desc())
        .offset(post_offset)
        .limit(limit + 1)
        .all()
    )

    has_more_posts = len(posts) > limit
    posts_page = posts[:limit]
    _hydrate_post_interactions(db, posts_page, current_user_id)

    author_ids = {int(cast(int, post.author_id)) for post in posts_page}
    authors = db.query(User).filter(User.id.in_(author_ids)).all() if author_ids else []
    author_map = {int(cast(int, user.id)): (user.full_name or user.email) for user in authors}

    friend_posts = [
        _build_post_response(post, author_map.get(int(cast(int, post.author_id)), f"User #{int(cast(int, post.author_id))}"))
        for post in posts_page
    ]

    jobs = (
        db.query(JobPosting, Company)
        .join(Company, Company.id == JobPosting.company_id)
        .filter(JobPosting.is_active == True)
        .order_by(JobPosting.created_at.desc())
        .offset(job_offset)
        .limit(limit + 1)
        .all()
    )

    has_more_jobs = len(jobs) > limit
    jobs_page = jobs[:limit]

    company_jobs = [
        CompanyJobFeedResponse(
            id=int(cast(int, job.id)),
            company_id=int(cast(int, company.id)),
            company_name=str(cast(str, company.name)),
            title=str(cast(str, job.title)),
            description=str(cast(str, job.description)),
            location=cast(str | None, job.location),
            work_mode=job.work_mode,
            employment_type=job.employment_type,
            created_at=cast(datetime, job.created_at),
        )
        for job, company in jobs_page
    ]

    return HomeFeedResponse(
        friend_posts=friend_posts,
        company_jobs=company_jobs,
        next_post_offset=post_offset + len(friend_posts),
        next_job_offset=job_offset + len(company_jobs),
        has_more_posts=has_more_posts,
        has_more_jobs=has_more_jobs,
    )


@router.patch("/posts/{post_id}", response_model=UserPostResponse)
async def update_post(
    post_id: int,
    payload: PostUpdateRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    post = _load_post_or_404(db, post_id)
    current_user_id = int(cast(int, current_user.id))
    if int(cast(int, post.author_id)) != current_user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own posts")

    sanitized_content = sanitize_text(payload.content, max_length=5000) or ""
    if not sanitized_content.strip():
        raise HTTPException(status_code=400, detail="Post content cannot be empty")

    post.content = sanitized_content
    db.commit()
    db.refresh(post)

    _hydrate_post_interactions(db, [post], current_user_id)
    return _build_post_response(post, current_user.full_name or current_user.email)


@router.delete("/posts/{post_id}", response_model=dict)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    post = _load_post_or_404(db, post_id)
    current_user_id = int(cast(int, current_user.id))
    if int(cast(int, post.author_id)) != current_user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    image_path = _extract_image_path(cast(str | None, post.image_url))
    db.query(PostLike).filter(PostLike.post_id == post_id).delete()
    db.query(PostComment).filter(PostComment.post_id == post_id).delete()
    db.delete(post)
    db.commit()

    if image_path and os.path.exists(image_path):
        try:
            os.remove(image_path)
        except OSError:
            pass

    return {"message": "Post deleted"}


@router.post("/posts/{post_id}/likes/toggle", response_model=UserPostResponse)
async def toggle_post_like(
    post_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    post = _load_post_or_404(db, post_id)
    current_user_id = int(cast(int, current_user.id))

    existing_like = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user_id)
        .first()
    )
    if existing_like:
        db.delete(existing_like)
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user_id))

    db.commit()
    db.refresh(post)
    _hydrate_post_interactions(db, [post], current_user_id)

    author = db.query(User).filter(User.id == post.author_id).first()
    author_name = (author.full_name or author.email) if author else f"User #{int(cast(int, post.author_id))}"
    return _build_post_response(post, author_name)


@router.post("/posts/{post_id}/comments", response_model=UserPostResponse)
async def add_post_comment(
    post_id: int,
    payload: PostCommentCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    post = _load_post_or_404(db, post_id)
    sanitized_content = sanitize_text(payload.content, max_length=1000) or ""
    if not sanitized_content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")

    db.add(
        PostComment(
            post_id=post_id,
            user_id=int(cast(int, current_user.id)),
            content=sanitized_content,
        )
    )
    db.commit()
    db.refresh(post)

    current_user_id = int(cast(int, current_user.id))
    _hydrate_post_interactions(db, [post], current_user_id)
    author = db.query(User).filter(User.id == post.author_id).first()
    author_name = (author.full_name or author.email) if author else f"User #{int(cast(int, post.author_id))}"
    return _build_post_response(post, author_name)
