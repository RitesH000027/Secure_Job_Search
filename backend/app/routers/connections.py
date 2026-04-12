"""
Connection request and friends endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_verified_user
from app.models.user import User, Profile
from app.models.networking import ConnectionRequest, ConnectionRequestStatus
from app.schemas.networking import (
	ConnectionRequestCreate,
	ConnectionRequestResponse,
	UserConnectionResponse,
)
from app.utils.audit import log_audit_event


router = APIRouter(prefix="/connections", tags=["Connections"])


def _relationship_status(db: Session, current_user_id: int, other_user_id: int) -> str:
	existing = (
		db.query(ConnectionRequest)
		.filter(
			or_(
				and_(
					ConnectionRequest.requester_id == current_user_id,
					ConnectionRequest.recipient_id == other_user_id,
				),
				and_(
					ConnectionRequest.requester_id == other_user_id,
					ConnectionRequest.recipient_id == current_user_id,
				),
			)
		)
		.order_by(ConnectionRequest.updated_at.desc())
		.first()
	)

	if not existing:
		return "none"

	if existing.status == ConnectionRequestStatus.ACCEPTED:
		return "connected"

	if existing.status == ConnectionRequestStatus.PENDING:
		return "pending_sent" if existing.requester_id == current_user_id else "pending_received"

	return "none"


def _user_display_name(user: User | None) -> str | None:
	if not user:
		return None
	return user.full_name or user.email


@router.get("/search", response_model=list[UserConnectionResponse])
async def search_users_for_connection(
	query: str = Query("", min_length=0, max_length=100),
	limit: int = Query(20, ge=1, le=100),
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	users_query = db.query(User).filter(User.id != current_user.id)

	if query:
		pattern = f"%{query}%"
		users_query = users_query.filter(
			or_(
				User.full_name.ilike(pattern),
				User.email.ilike(pattern),
			)
		)

	users = users_query.order_by(User.full_name.asc()).limit(limit).all()

	results = []
	for user in users:
		profile = db.query(Profile).filter(Profile.user_id == user.id).first()
		results.append(
			UserConnectionResponse(
				id=user.id,
				full_name=user.full_name or user.email,
				role=user.role.value,
				headline=profile.headline if profile else None,
				connection_status=_relationship_status(db, current_user.id, user.id),
			)
		)

	return results


@router.post("/requests", response_model=ConnectionRequestResponse, status_code=status.HTTP_201_CREATED)
async def send_connection_request(
	payload: ConnectionRequestCreate,
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	if payload.recipient_id == current_user.id:
		raise HTTPException(status_code=400, detail="Cannot connect with yourself")

	recipient = db.query(User).filter(User.id == payload.recipient_id).first()
	if not recipient:
		raise HTTPException(status_code=404, detail="Recipient not found")

	existing = (
		db.query(ConnectionRequest)
		.filter(
			or_(
				and_(
					ConnectionRequest.requester_id == current_user.id,
					ConnectionRequest.recipient_id == payload.recipient_id,
				),
				and_(
					ConnectionRequest.requester_id == payload.recipient_id,
					ConnectionRequest.recipient_id == current_user.id,
				),
			)
		)
		.order_by(ConnectionRequest.updated_at.desc())
		.first()
	)

	if existing and existing.status == ConnectionRequestStatus.ACCEPTED:
		raise HTTPException(status_code=400, detail="Already connected")

	if existing and existing.status == ConnectionRequestStatus.PENDING:
		raise HTTPException(status_code=400, detail="Connection request already pending")

	request = ConnectionRequest(
		requester_id=current_user.id,
		recipient_id=payload.recipient_id,
		status=ConnectionRequestStatus.PENDING,
	)
	db.add(request)

	log_audit_event(
		db,
		action="connection_request_sent",
		target_type="connection",
		actor_user_id=current_user.id,
		target_id=str(payload.recipient_id),
		details={"recipient_id": payload.recipient_id},
	)

	db.commit()
	db.refresh(request)
	return ConnectionRequestResponse(
		id=request.id,
		requester_id=request.requester_id,
		requester_name=_user_display_name(current_user),
		recipient_id=request.recipient_id,
		recipient_name=_user_display_name(recipient),
		status=request.status,
		created_at=request.created_at,
	)


@router.get("/requests/received", response_model=list[ConnectionRequestResponse])
async def list_received_requests(
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	requests = (
		db.query(ConnectionRequest)
		.filter(
			ConnectionRequest.recipient_id == current_user.id,
			ConnectionRequest.status == ConnectionRequestStatus.PENDING,
		)
		.order_by(ConnectionRequest.created_at.desc())
		.all()
	)
	requester_ids = [item.requester_id for item in requests]
	requester_map = {user.id: user for user in db.query(User).filter(User.id.in_(requester_ids)).all()} if requester_ids else {}
	return [
		ConnectionRequestResponse(
			id=item.id,
			requester_id=item.requester_id,
			requester_name=_user_display_name(requester_map.get(item.requester_id)),
			recipient_id=item.recipient_id,
			recipient_name=_user_display_name(current_user),
			status=item.status,
			created_at=item.created_at,
		)
		for item in requests
	]


@router.get("/requests/sent", response_model=list[ConnectionRequestResponse])
async def list_sent_requests(
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	requests = (
		db.query(ConnectionRequest)
		.filter(
			ConnectionRequest.requester_id == current_user.id,
			ConnectionRequest.status == ConnectionRequestStatus.PENDING,
		)
		.order_by(ConnectionRequest.created_at.desc())
		.all()
	)
	recipient_ids = [item.recipient_id for item in requests]
	recipient_map = {user.id: user for user in db.query(User).filter(User.id.in_(recipient_ids)).all()} if recipient_ids else {}
	return [
		ConnectionRequestResponse(
			id=item.id,
			requester_id=item.requester_id,
			requester_name=_user_display_name(current_user),
			recipient_id=item.recipient_id,
			recipient_name=_user_display_name(recipient_map.get(item.recipient_id)),
			status=item.status,
			created_at=item.created_at,
		)
		for item in requests
	]


@router.post("/requests/{request_id}/accept", response_model=ConnectionRequestResponse)
async def accept_connection_request(
	request_id: int,
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	request = db.query(ConnectionRequest).filter(ConnectionRequest.id == request_id).first()
	if not request:
		raise HTTPException(status_code=404, detail="Connection request not found")

	if request.recipient_id != current_user.id:
		raise HTTPException(status_code=403, detail="Not authorized to accept this request")

	if request.status != ConnectionRequestStatus.PENDING:
		raise HTTPException(status_code=400, detail="Request is not pending")

	request.status = ConnectionRequestStatus.ACCEPTED

	log_audit_event(
		db,
		action="connection_request_accepted",
		target_type="connection",
		actor_user_id=current_user.id,
		target_id=str(request.requester_id),
		details={"request_id": request_id},
	)

	db.commit()
	db.refresh(request)
	return request


@router.post("/requests/{request_id}/reject", response_model=ConnectionRequestResponse)
async def reject_connection_request(
	request_id: int,
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	request = db.query(ConnectionRequest).filter(ConnectionRequest.id == request_id).first()
	if not request:
		raise HTTPException(status_code=404, detail="Connection request not found")

	if request.recipient_id != current_user.id:
		raise HTTPException(status_code=403, detail="Not authorized to reject this request")

	if request.status != ConnectionRequestStatus.PENDING:
		raise HTTPException(status_code=400, detail="Request is not pending")

	request.status = ConnectionRequestStatus.REJECTED

	log_audit_event(
		db,
		action="connection_request_rejected",
		target_type="connection",
		actor_user_id=current_user.id,
		target_id=str(request.requester_id),
		details={"request_id": request_id},
	)

	db.commit()
	db.refresh(request)
	return request


@router.get("/friends", response_model=list[UserConnectionResponse])
async def list_my_friends(
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	accepted = (
		db.query(ConnectionRequest)
		.filter(
			ConnectionRequest.status == ConnectionRequestStatus.ACCEPTED,
			or_(
				ConnectionRequest.requester_id == current_user.id,
				ConnectionRequest.recipient_id == current_user.id,
			),
		)
		.order_by(ConnectionRequest.updated_at.desc())
		.all()
	)

	friend_ids = []
	for connection in accepted:
		friend_id = connection.recipient_id if connection.requester_id == current_user.id else connection.requester_id
		friend_ids.append(friend_id)

	if not friend_ids:
		return []

	users = db.query(User).filter(User.id.in_(friend_ids)).all()
	profile_map = {
		profile.user_id: profile
		for profile in db.query(Profile).filter(Profile.user_id.in_(friend_ids)).all()
	}

	return [
		UserConnectionResponse(
			id=user.id,
			full_name=user.full_name or user.email,
			role=user.role.value,
			headline=profile_map.get(user.id).headline if profile_map.get(user.id) else None,
			connection_status="connected",
		)
		for user in users
	]


@router.delete("/friends/{friend_id}", response_model=dict)
async def remove_friend(
	friend_id: int,
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	relation = (
		db.query(ConnectionRequest)
		.filter(
			ConnectionRequest.status == ConnectionRequestStatus.ACCEPTED,
			or_(
				and_(ConnectionRequest.requester_id == current_user.id, ConnectionRequest.recipient_id == friend_id),
				and_(ConnectionRequest.requester_id == friend_id, ConnectionRequest.recipient_id == current_user.id),
			),
		)
		.first()
	)

	if not relation:
		raise HTTPException(status_code=404, detail="Friend connection not found")

	db.delete(relation)

	log_audit_event(
		db,
		action="friend_removed",
		target_type="connection",
		actor_user_id=current_user.id,
		target_id=str(friend_id),
		details={"friend_id": friend_id},
	)

	db.commit()
	return {"message": "Friend removed"}


@router.get("/graph", response_model=dict)
async def get_connection_graph(
	current_user: User = Depends(get_current_verified_user),
	db: Session = Depends(get_db),
):
	friends = await list_my_friends(current_user=current_user, db=db)
	friend_ids = [friend.id for friend in friends]

	edges = []
	if friend_ids:
		relations = (
			db.query(ConnectionRequest)
			.filter(
				ConnectionRequest.status == ConnectionRequestStatus.ACCEPTED,
				ConnectionRequest.requester_id.in_(friend_ids),
				ConnectionRequest.recipient_id.in_(friend_ids),
			)
			.all()
		)
		edges = [
			{"from": relation.requester_id, "to": relation.recipient_id}
			for relation in relations
		]

	return {
		"owner_id": current_user.id,
		"nodes": [{"id": current_user.id, "label": current_user.full_name or current_user.email}] + [
			{"id": friend.id, "label": friend.full_name}
			for friend in friends
		],
		"edges": edges,
	}

