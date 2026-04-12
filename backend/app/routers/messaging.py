"""
Encrypted messaging endpoints for one-to-one and group chats.
"""
from datetime import datetime
from typing import cast
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_verified_user
from app.models.user import User
from app.models.networking import (
    Conversation,
    ConversationParticipant,
    Message,
    ConnectionRequest,
    ConnectionRequestStatus,
    UserEncryptionKey,
    ConversationKeyEnvelope,
    GroupJoinRequest,
    GroupJoinRequestStatus,
)
from app.schemas.networking import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
    UserEncryptionKeyUpsert,
    UserEncryptionKeyResponse,
    ConversationKeyEnvelopeBatchCreate,
    ConversationKeyEnvelopeResponse,
    GroupConversationRename,
    GroupParticipantManage,
    GroupJoinRequestResponse,
    GroupSearchResult,
)
from app.utils.audit import log_audit_event
from app.utils.input_sanitization import sanitize_text


router = APIRouter(prefix="/messages", tags=["Messaging"])


def _is_participant(db: Session, conversation_id: int, user_id: int) -> bool:
    return (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
        is not None
    )


def _is_connected_friend(db: Session, user_id_a: int, user_id_b: int) -> bool:
    return (
        db.query(ConnectionRequest)
        .filter(
            ConnectionRequest.status == ConnectionRequestStatus.ACCEPTED,
            or_(
                and_(ConnectionRequest.requester_id == user_id_a, ConnectionRequest.recipient_id == user_id_b),
                and_(ConnectionRequest.requester_id == user_id_b, ConnectionRequest.recipient_id == user_id_a),
            ),
        )
        .first()
        is not None
    )


def _require_group_admin(conversation: Conversation, user_id: int) -> None:
    if not conversation.is_group:
        raise HTTPException(status_code=400, detail="This action is only for group conversations")

    if conversation.created_by != user_id:
        raise HTTPException(status_code=403, detail="Only the group admin can perform this action")


def _conversation_response(db: Session, conversation: Conversation) -> ConversationResponse:
    members = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation.id)
        .all()
    )
    participant_ids = [int(cast(int, m.user_id)) for m in members]
    users = db.query(User).filter(User.id.in_(participant_ids)).all() if participant_ids else []
    user_map = {int(cast(int, u.id)): u for u in users}
    participant_names = {
        str(uid): (user_map[uid].full_name or user_map[uid].email or f"User #{uid}")
        for uid in participant_ids
        if uid in user_map
    }

    return ConversationResponse(
        id=int(cast(int, conversation.id)),
        name=cast(str | None, conversation.name),
        is_group=bool(cast(bool, conversation.is_group)),
        created_by=cast(int | None, conversation.created_by),
        created_at=cast(datetime, conversation.created_at),
        participant_ids=participant_ids,
        participant_names=participant_names,
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    participant_ids = set(payload.participant_ids)
    participant_ids.add(current_user_id)

    if not payload.is_group and len(participant_ids) != 2:
        raise HTTPException(status_code=400, detail="One-to-one chat must have exactly two participants")

    if not payload.is_group:
        other_user_id = next(user_id for user_id in participant_ids if user_id != current_user_id)
        if not _is_connected_friend(db, current_user_id, other_user_id):
            raise HTTPException(status_code=403, detail="You can only message connected friends")

    conversation_name = sanitize_text(payload.name, max_length=255)

    conversation = Conversation(
        name=conversation_name,
        is_group=payload.is_group,
        created_by=current_user_id,
    )
    db.add(conversation)
    db.flush()

    for user_id in participant_ids:
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=user_id))

    log_audit_event(
        db,
        action="conversation_created",
        target_type="conversation",
        actor_user_id=current_user_id,
        target_id=str(conversation.id),
        details={"is_group": payload.is_group, "participant_count": len(participant_ids)},
    )

    db.commit()

    return _conversation_response(db, conversation)


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_my_conversations(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    participant_rows = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.user_id == current_user.id)
        .all()
    )
    conversation_ids = [row.conversation_id for row in participant_rows]

    if not conversation_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(conversation_ids))
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    response = []
    for conversation in conversations:
        response.append(_conversation_response(db, conversation))

    return response


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user_id,
        ciphertext=payload.ciphertext,
        message_type=payload.message_type,
    )
    db.add(message)

    log_audit_event(
        db,
        action="message_sent",
        target_type="conversation",
        actor_user_id=current_user_id,
        target_id=str(conversation_id),
        details={"message_type": payload.message_type.value},
    )

    db.commit()
    db.refresh(message)
    return message


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )


@router.put("/keys/me", response_model=UserEncryptionKeyResponse)
async def upsert_my_public_key(
    payload: UserEncryptionKeyUpsert,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    row = db.query(UserEncryptionKey).filter(UserEncryptionKey.user_id == current_user_id).first()
    if row:
        setattr(row, "public_key", payload.public_key)
    else:
        row = UserEncryptionKey(user_id=current_user_id, public_key=payload.public_key)
        db.add(row)

    db.commit()
    db.refresh(row)
    return UserEncryptionKeyResponse(
        user_id=int(cast(int, row.user_id)),
        public_key=str(cast(str, row.public_key)),
        updated_at=cast(datetime | None, row.updated_at),
    )


@router.get("/keys/users", response_model=list[UserEncryptionKeyResponse])
async def get_users_public_keys(
    user_ids: str,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    try:
        requested_ids = {int(item.strip()) for item in user_ids.split(",") if item.strip()}
    except ValueError:
        raise HTTPException(status_code=400, detail="user_ids must be a comma-separated list of integers")

    if not requested_ids:
        return []

    keys = db.query(UserEncryptionKey).filter(UserEncryptionKey.user_id.in_(requested_ids)).all()
    return [
        UserEncryptionKeyResponse(
            user_id=int(cast(int, item.user_id)),
            public_key=str(cast(str, item.public_key)),
            updated_at=cast(datetime | None, item.updated_at),
        )
        for item in keys
    ]


@router.post("/conversations/{conversation_id}/keys", status_code=status.HTTP_204_NO_CONTENT)
async def upsert_conversation_key_envelopes(
    conversation_id: int,
    payload: ConversationKeyEnvelopeBatchCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    participant_rows = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id)
        .all()
    )
    participant_ids = {row.user_id for row in participant_rows}

    for envelope in payload.envelopes:
        if envelope.user_id not in participant_ids:
            raise HTTPException(status_code=400, detail=f"User {envelope.user_id} is not a participant")

        existing = (
            db.query(ConversationKeyEnvelope)
            .filter(
                ConversationKeyEnvelope.conversation_id == conversation_id,
                ConversationKeyEnvelope.user_id == envelope.user_id,
            )
            .first()
        )
        if existing:
            setattr(existing, "encrypted_key", envelope.encrypted_key)
        else:
            db.add(
                ConversationKeyEnvelope(
                    conversation_id=conversation_id,
                    user_id=envelope.user_id,
                    encrypted_key=envelope.encrypted_key,
                )
            )

    db.commit()


@router.get("/conversations/{conversation_id}/keys/me", response_model=ConversationKeyEnvelopeResponse)
async def get_my_conversation_key_envelope(
    conversation_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    current_user_id = int(cast(int, current_user.id))
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    envelope = (
        db.query(ConversationKeyEnvelope)
        .filter(
            ConversationKeyEnvelope.conversation_id == conversation_id,
            ConversationKeyEnvelope.user_id == current_user_id,
        )
        .first()
    )
    if not envelope:
        raise HTTPException(status_code=404, detail="Conversation key not initialized")

    return ConversationKeyEnvelopeResponse(
        conversation_id=int(cast(int, envelope.conversation_id)),
        user_id=int(cast(int, envelope.user_id)),
        encrypted_key=str(cast(str, envelope.encrypted_key)),
    )


@router.patch("/conversations/{conversation_id}/name", response_model=ConversationResponse)
async def rename_group_conversation(
    conversation_id: int,
    payload: GroupConversationRename,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_user_id = int(cast(int, current_user.id))
    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    _require_group_admin(conversation, current_user_id)

    new_name = sanitize_text(payload.name, max_length=255)
    if not new_name:
        raise HTTPException(status_code=400, detail="Group name cannot be empty")

    conversation.name = new_name
    db.commit()

    return _conversation_response(db, conversation)


@router.post("/conversations/{conversation_id}/participants", response_model=ConversationResponse)
async def add_group_participant(
    conversation_id: int,
    payload: GroupParticipantManage,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_user_id = int(cast(int, current_user.id))
    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    _require_group_admin(conversation, current_user_id)

    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    exists = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == payload.user_id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="User is already in the group")

    db.add(ConversationParticipant(conversation_id=conversation_id, user_id=payload.user_id))

    pending_request = (
        db.query(GroupJoinRequest)
        .filter(
            GroupJoinRequest.conversation_id == conversation_id,
            GroupJoinRequest.requester_id == payload.user_id,
            GroupJoinRequest.status == GroupJoinRequestStatus.PENDING,
        )
        .first()
    )
    if pending_request:
        pending_request.status = GroupJoinRequestStatus.ACCEPTED

    db.commit()

    return _conversation_response(db, conversation)


@router.delete("/conversations/{conversation_id}/participants/{user_id}", response_model=ConversationResponse)
async def remove_group_participant(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_user_id = int(cast(int, current_user.id))
    if not _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    _require_group_admin(conversation, current_user_id)

    if conversation.created_by == user_id:
        raise HTTPException(status_code=400, detail="Group admin cannot be removed")

    member = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="User is not in this group")

    db.delete(member)
    db.commit()

    return _conversation_response(db, conversation)


@router.get("/groups/search", response_model=list[GroupSearchResult])
async def search_groups(
    query: str = Query("", min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    search_term = query.strip()
    if not search_term:
        return []

    groups = (
        db.query(Conversation)
        .filter(Conversation.is_group == True, Conversation.name.isnot(None), Conversation.name.ilike(f"%{search_term}%"))
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .all()
    )

    current_user_id = int(cast(int, current_user.id))
    response: list[GroupSearchResult] = []
    for group in groups:
        participant_rows = (
            db.query(ConversationParticipant)
            .filter(ConversationParticipant.conversation_id == group.id)
            .all()
        )
        participant_ids = {int(cast(int, row.user_id)) for row in participant_rows}
        has_pending = (
            db.query(GroupJoinRequest)
            .filter(
                GroupJoinRequest.conversation_id == group.id,
                GroupJoinRequest.requester_id == current_user_id,
                GroupJoinRequest.status == GroupJoinRequestStatus.PENDING,
            )
            .first()
            is not None
        )
        response.append(
            GroupSearchResult(
                id=int(cast(int, group.id)),
                name=cast(str, group.name),
                participant_count=len(participant_ids),
                is_member=current_user_id in participant_ids,
                has_pending_request=has_pending,
            )
        )

    return response


@router.post("/groups/{conversation_id}/join-requests", response_model=GroupJoinRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_join_group(
    conversation_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.is_group == True).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Group not found")

    current_user_id = int(cast(int, current_user.id))
    if _is_participant(db, conversation_id, current_user_id):
        raise HTTPException(status_code=400, detail="You are already a member of this group")

    existing_pending = (
        db.query(GroupJoinRequest)
        .filter(
            GroupJoinRequest.conversation_id == conversation_id,
            GroupJoinRequest.requester_id == current_user_id,
            GroupJoinRequest.status == GroupJoinRequestStatus.PENDING,
        )
        .first()
    )
    if existing_pending:
        raise HTTPException(status_code=400, detail="Join request already pending")

    request_row = GroupJoinRequest(
        conversation_id=conversation_id,
        requester_id=current_user_id,
        status=GroupJoinRequestStatus.PENDING,
    )
    db.add(request_row)
    db.commit()
    db.refresh(request_row)

    return GroupJoinRequestResponse(
        id=int(cast(int, request_row.id)),
        conversation_id=int(cast(int, request_row.conversation_id)),
        requester_id=int(cast(int, request_row.requester_id)),
        requester_name=current_user.full_name or current_user.email,
        status=cast(GroupJoinRequestStatus, request_row.status),
        created_at=cast(datetime, request_row.created_at),
    )


@router.get("/conversations/{conversation_id}/join-requests", response_model=list[GroupJoinRequestResponse])
async def list_group_join_requests(
    conversation_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_user_id = int(cast(int, current_user.id))
    _require_group_admin(conversation, current_user_id)

    requests = (
        db.query(GroupJoinRequest)
        .filter(
            GroupJoinRequest.conversation_id == conversation_id,
            GroupJoinRequest.status == GroupJoinRequestStatus.PENDING,
        )
        .order_by(GroupJoinRequest.created_at.asc())
        .all()
    )

    requester_ids = [int(cast(int, item.requester_id)) for item in requests]
    requester_map = {
        int(cast(int, user.id)): user
        for user in db.query(User).filter(User.id.in_(requester_ids)).all()
    } if requester_ids else {}

    return [
        GroupJoinRequestResponse(
            id=int(cast(int, item.id)),
            conversation_id=int(cast(int, item.conversation_id)),
            requester_id=int(cast(int, item.requester_id)),
            requester_name=(requester_map.get(int(cast(int, item.requester_id))).full_name or requester_map.get(int(cast(int, item.requester_id))).email) if requester_map.get(int(cast(int, item.requester_id))) else f"User #{int(cast(int, item.requester_id))}",
            status=cast(GroupJoinRequestStatus, item.status),
            created_at=cast(datetime, item.created_at),
        )
        for item in requests
    ]


@router.post("/conversations/{conversation_id}/join-requests/{request_id}/approve", response_model=ConversationResponse)
async def approve_group_join_request(
    conversation_id: int,
    request_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_user_id = int(cast(int, current_user.id))
    _require_group_admin(conversation, current_user_id)

    request_row = (
        db.query(GroupJoinRequest)
        .filter(
            GroupJoinRequest.id == request_id,
            GroupJoinRequest.conversation_id == conversation_id,
        )
        .first()
    )
    if not request_row:
        raise HTTPException(status_code=404, detail="Join request not found")
    if request_row.status != GroupJoinRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Join request is not pending")

    if not _is_participant(db, conversation_id, int(cast(int, request_row.requester_id))):
        db.add(ConversationParticipant(conversation_id=conversation_id, user_id=int(cast(int, request_row.requester_id))))

    request_row.status = GroupJoinRequestStatus.ACCEPTED
    db.commit()

    return _conversation_response(db, conversation)


@router.post("/conversations/{conversation_id}/join-requests/{request_id}/reject", response_model=dict)
async def reject_group_join_request(
    conversation_id: int,
    request_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_user_id = int(cast(int, current_user.id))
    _require_group_admin(conversation, current_user_id)

    request_row = (
        db.query(GroupJoinRequest)
        .filter(
            GroupJoinRequest.id == request_id,
            GroupJoinRequest.conversation_id == conversation_id,
        )
        .first()
    )
    if not request_row:
        raise HTTPException(status_code=404, detail="Join request not found")

    request_row.status = GroupJoinRequestStatus.REJECTED
    db.commit()
    return {"message": "Join request rejected"}
