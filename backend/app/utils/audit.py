"""
Utility helpers for initial tamper-evident audit logging.
"""
import hashlib
import json
from datetime import datetime
from typing import Any, Optional, cast
from sqlalchemy.orm import Session
from app.models.networking import AuditLog


def _serialize_details(details: Optional[dict[str, Any]]) -> str:
    if not details:
        return "{}"
    return json.dumps(details, sort_keys=True, default=str)


def _compute_hash(
    previous_hash: Optional[str],
    actor_user_id: Optional[int],
    action: str,
    target_type: str,
    target_id: Optional[str],
    details_json: str,
    timestamp: datetime,
) -> str:
    payload = "|".join([
        previous_hash or "",
        str(actor_user_id or ""),
        action,
        target_type,
        target_id or "",
        details_json,
        timestamp.isoformat(),
    ])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def log_audit_event(
    db: Session,
    action: str,
    target_type: str,
    actor_user_id: Optional[int] = None,
    target_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> AuditLog:
    previous_entry = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    previous_hash = cast(Optional[str], previous_entry.entry_hash) if previous_entry else None
    details_json = _serialize_details(details)
    timestamp = datetime.utcnow()

    entry_hash = _compute_hash(
        previous_hash=previous_hash,
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details_json=details_json,
        timestamp=timestamp,
    )

    audit_log = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details_json=details_json,
        previous_hash=previous_hash,
        entry_hash=entry_hash,
        created_at=timestamp,
    )

    db.add(audit_log)
    db.flush()
    return audit_log


def verify_audit_chain(db: Session) -> dict[str, Any]:
    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()

    previous_hash = None
    for entry in entries:
        entry_any = cast(Any, entry)

        entry_id = int(entry_any.id)
        actor_user_id = int(entry_any.actor_user_id) if entry_any.actor_user_id is not None else None
        action = str(entry_any.action)
        target_type = str(entry_any.target_type)
        target_id = str(entry_any.target_id) if entry_any.target_id is not None else None
        details_json = str(entry_any.details_json) if entry_any.details_json is not None else "{}"
        timestamp = cast(datetime, entry_any.created_at)
        entry_previous_hash = str(entry_any.previous_hash) if entry_any.previous_hash is not None else None
        entry_hash = str(entry_any.entry_hash)

        expected = _compute_hash(
            previous_hash=previous_hash,
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details_json=details_json,
            timestamp=timestamp,
        )

        if entry_previous_hash != previous_hash or entry_hash != expected:
            return {
                "valid": False,
                "broken_at_id": entry_id,
                "total_entries": len(entries),
            }

        previous_hash = entry_hash

    return {
        "valid": True,
        "broken_at_id": None,
        "total_entries": len(entries),
    }
