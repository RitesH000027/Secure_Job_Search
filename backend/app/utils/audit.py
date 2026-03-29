"""
Utility helpers for initial tamper-evident audit logging.
"""
import hashlib
import json
from datetime import datetime
from typing import Any, Optional
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
    previous_hash = previous_entry.entry_hash if previous_entry else None
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
