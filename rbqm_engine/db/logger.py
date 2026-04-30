from sqlalchemy.orm import Session
from db.models import AuditLog
from typing import Optional

def log_event(db: Session, event_type: str, user_email: str, detail: str, trial_id: Optional[int] = None):
    """
    Logs a system event to the AuditLog table.
    """
    new_log = AuditLog(
        event_type=event_type,
        user_email=user_email,
        trial_id=trial_id,
        detail=detail
    )
    db.add(new_log)
    db.commit()
