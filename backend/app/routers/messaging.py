"""
Encrypted messaging endpoints for one-to-one and group chats.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_verified_user
from app.models.user import User
from app.models.networking import Conversation, ConversationParticipant, Message, ConnectionRequest, ConnectionRequestStatus
from app.schemas.networking import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.utils.audit import log_audit_event


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


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    participant_ids = set(payload.participant_ids)
    participant_ids.add(current_user.id)

    if not payload.is_group and len(participant_ids) != 2:
        raise HTTPException(status_code=400, detail="One-to-one chat must have exactly two participants")

    if not payload.is_group:
        other_user_id = next(user_id for user_id in participant_ids if user_id != current_user.id)
        if not _is_connected_friend(db, current_user.id, other_user_id):
            raise HTTPException(status_code=403, detail="You can only message connected friends")

    conversation = Conversation(
        name=payload.name,
        is_group=payload.is_group,
        created_by=current_user.id,
    )
    db.add(conversation)
    db.flush()

    for user_id in participant_ids:
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=user_id))

    log_audit_event(
        db,
        action="conversation_created",
        target_type="conversation",
        actor_user_id=current_user.id,
        target_id=str(conversation.id),
        details={"is_group": payload.is_group, "participant_count": len(participant_ids)},
    )

    db.commit()

    return ConversationResponse(
        id=conversation.id,
        name=conversation.name,
        is_group=conversation.is_group,
        created_by=conversation.created_by,
        created_at=conversation.created_at,
        participant_ids=list(participant_ids),
    )


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
        members = (
            db.query(ConversationParticipant)
            .filter(ConversationParticipant.conversation_id == conversation.id)
            .all()
        )
        response.append(
            ConversationResponse(
                id=conversation.id,
                name=conversation.name,
                is_group=conversation.is_group,
                created_by=conversation.created_by,
                created_at=conversation.created_at,
                participant_ids=[m.user_id for m in members],
            )
        )

    return response


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not _is_participant(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        ciphertext=payload.ciphertext,
        message_type=payload.message_type,
    )
    db.add(message)

    log_audit_event(
        db,
        action="message_sent",
        target_type="conversation",
        actor_user_id=current_user.id,
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
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not _is_participant(db, conversation_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
