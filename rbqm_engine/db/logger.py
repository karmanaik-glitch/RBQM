from sqlalchemy.orm import Session
from db.models import AuditLog
from typing import Optional

def log_event(db: Session, action: str, detail: str, org_id: Optional[int] = None, study_id: Optional[int] = None, actor_id: Optional[int] = None):
    """
    Logs a system event to the AuditLog table.
    """
    new_log = AuditLog(
        action=action,
        detail={"message": detail},
        org_id=org_id,
        study_id=study_id,
        actor_id=actor_id
    )
    db.add(new_log)
    db.commit()
