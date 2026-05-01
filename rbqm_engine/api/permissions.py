from fastapi import Request, HTTPException, Depends
from db.models import Trial, UserSiteAssignment, SponsorStudyAccess, StudyTeamMember

def require_platform_admin(request: Request):
    if getattr(request.state, "role", None) != "platform_admin":
        raise HTTPException(status_code=403, detail="Platform Admin access required")
    return request.state

def require_cro_admin(request: Request):
    role = getattr(request.state, "role", None)
    if role not in ["cro_admin", "platform_admin"]:
        raise HTTPException(status_code=403, detail="CRO Admin access required")
    return request.state

def require_central_monitor(request: Request):
    role = getattr(request.state, "role", None)
    central_roles = ["cro_admin", "central_monitor", "platform_admin", "project_manager", "cdm_lead", "data_manager"]
    if role not in central_roles:
        raise HTTPException(status_code=403, detail="Higher-level access required")
    return request.state

def require_any_authenticated(request: Request):
    user_id = getattr(request.state, "user_id", None)
    role = getattr(request.state, "role", None)
    if not role:
        raise HTTPException(status_code=401, detail="Authentication required")
    return request.state

def require_study_access(study_id: int):
    def dependency(request: Request):
        user_id = getattr(request.state, "user_id", None)
        role = getattr(request.state, "role", None)
        org_id = getattr(request.state, "org_id", None)
        db = request.state.db

        if role == "platform_admin":
            return request.state

        trial = db.query(Trial).filter(Trial.id == study_id).first()
        if not trial:
            raise HTTPException(status_code=404, detail="Study not found")

        if role in ["cro_admin", "central_monitor", "project_manager", "cdm_lead", "data_manager"]:
            if trial.org_id != org_id:
                raise HTTPException(status_code=403, detail="Study belongs to a different organisation")
            # If we enforce study_team_members for specific roles
            if role in ["central_monitor", "cdm_lead"]:
                has_team = db.query(StudyTeamMember).filter(StudyTeamMember.study_id == study_id).count() > 0
                if has_team:
                    member = db.query(StudyTeamMember).filter(
                        StudyTeamMember.study_id == study_id, 
                        StudyTeamMember.user_id == user_id
                    ).first()
                    if not member:
                        raise HTTPException(status_code=403, detail="Not assigned to this study team")
            return request.state

        if role == "site_monitor":
            assignment = db.query(UserSiteAssignment).filter(
                UserSiteAssignment.user_id == user_id,
                UserSiteAssignment.study_id == study_id,
                UserSiteAssignment.is_active == True
            ).first()
            if not assignment:
                raise HTTPException(status_code=403, detail="No sites assigned in this study")
            return request.state

        if role == "sponsor_viewer":
            access = db.query(SponsorStudyAccess).filter(
                SponsorStudyAccess.sponsor_org_id == org_id,
                SponsorStudyAccess.study_id == study_id,
                SponsorStudyAccess.is_active == True
            ).first()
            if not access:
                raise HTTPException(status_code=403, detail="Sponsor access not granted for this study")
            return request.state

        raise HTTPException(status_code=403, detail="Access denied")
    return dependency

def require_site_access(site_id: int, study_id: int):
    def dependency(request: Request):
        user_id = getattr(request.state, "user_id", None)
        role = getattr(request.state, "role", None)
        org_id = getattr(request.state, "org_id", None)
        db = request.state.db

        if role == "platform_admin":
            return request.state

        trial = db.query(Trial).filter(Trial.id == study_id).first()
        if not trial:
            raise HTTPException(status_code=404, detail="Study not found")

        if role in ["cro_admin", "central_monitor", "project_manager", "cdm_lead", "data_manager"]:
            if trial.org_id != org_id:
                raise HTTPException(status_code=403, detail="Site belongs to a different organisation")
            return request.state

        if role == "site_monitor":
            assignment = db.query(UserSiteAssignment).filter(
                UserSiteAssignment.user_id == user_id,
                UserSiteAssignment.site_id == site_id,
                UserSiteAssignment.study_id == study_id,
                UserSiteAssignment.is_active == True
            ).first()
            if not assignment:
                raise HTTPException(status_code=403, detail="Not assigned to this site")
            return request.state

        if role == "sponsor_viewer":
            access = db.query(SponsorStudyAccess).filter(
                SponsorStudyAccess.sponsor_org_id == org_id,
                SponsorStudyAccess.study_id == study_id,
                SponsorStudyAccess.is_active == True
            ).first()
            if not access:
                raise HTTPException(status_code=403, detail="Sponsor access not granted for this study")
            return request.state

        raise HTTPException(status_code=403, detail="Access denied")
    return dependency
