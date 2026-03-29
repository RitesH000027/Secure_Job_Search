import os
from pathlib import Path
from typing import cast
from cryptography.fernet import Fernet

# Configure isolated test environment before importing app settings
os.environ["SECRET_KEY"] = "smoke-test-secret-key-with-at-least-32-chars"
os.environ["DATABASE_URL"] = "sqlite:///./smoke_march.db"
os.environ["ENCRYPTION_KEY"] = Fernet.generate_key().decode()
os.environ["DEBUG"] = "False"
os.environ["CORS_ORIGINS"] = '["http://localhost:5174"]'

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User, Profile, UserRole
from app.utils.security import hash_password, create_access_token


def create_user(db, email: str, mobile: str, full_name: str, role: UserRole) -> tuple[int, str]:
    user = User(
        email=email,
        mobile_number=mobile,
        hashed_password=hash_password("SecurePass123"),
        full_name=full_name,
        role=role,
        is_active=True,
        is_verified=True,
        is_mobile_verified=True,
        is_suspended=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(user_id=user.id, headline=f"{full_name} headline")
    db.add(profile)
    db.commit()
    return cast(int, user.id), cast(str, user.email)


def auth_headers(user_id: int, email: str) -> dict:
    token = create_access_token({"sub": str(user_id), "email": email})
    return {"Authorization": f"Bearer {token}"}


def run_smoke() -> None:
    db_file = Path("smoke_march.db")
    if db_file.exists():
        db_file.unlink()

    with TestClient(app) as client:
        db = SessionLocal()
        try:
            recruiter_id, recruiter_email = create_user(
                db,
                email="recruiter.smoke@example.com",
                mobile="+15550000001",
                full_name="Recruiter Smoke",
                role=UserRole.RECRUITER,
            )
            candidate_id, candidate_email = create_user(
                db,
                email="candidate.smoke@example.com",
                mobile="+15550000002",
                full_name="Candidate Smoke",
                role=UserRole.USER,
            )
            admin_id, admin_email = create_user(
                db,
                email="admin.smoke@example.com",
                mobile="+15550000003",
                full_name="Admin Smoke",
                role=UserRole.ADMIN,
            )
        finally:
            db.close()

        recruiter_headers = auth_headers(recruiter_id, recruiter_email)
        candidate_headers = auth_headers(candidate_id, candidate_email)
        admin_headers = auth_headers(admin_id, admin_email)

        # 1) Company creation
        company_response = client.post(
            "/companies",
            headers=recruiter_headers,
            json={
                "name": "Smoke Corp",
                "description": "Smoke test company",
                "location": "Remote",
                "website": "https://smoke.example.com",
            },
        )
        assert company_response.status_code == 201, company_response.text
        company_id = company_response.json()["id"]

        # 2) Job posting
        job_response = client.post(
            "/jobs",
            headers=recruiter_headers,
            json={
                "company_id": company_id,
                "title": "Backend Engineer",
                "description": "Build secure APIs for the platform",
                "required_skills": "python,fastapi,sql",
                "location": "Remote",
                "work_mode": "remote",
                "employment_type": "full-time",
            },
        )
        assert job_response.status_code == 201, job_response.text
        job_id = job_response.json()["id"]

        # 3) Job search
        search_response = client.get("/jobs/search", params={"keyword": "Backend"})
        assert search_response.status_code == 200, search_response.text
        assert any(job["id"] == job_id for job in search_response.json()), "Posted job not found in search"

        # 4) Candidate apply
        apply_response = client.post(
            f"/jobs/{job_id}/apply",
            headers=candidate_headers,
            json={"cover_note": "I am interested in this role."},
        )
        assert apply_response.status_code == 201, apply_response.text
        application_id = apply_response.json()["id"]

        # 5) Recruiter updates status
        status_response = client.patch(
            f"/jobs/applications/{application_id}/status",
            headers=recruiter_headers,
            json={"status": "Reviewed", "recruiter_notes": "Strong profile", "is_shortlisted": True},
        )
        assert status_response.status_code == 200, status_response.text
        assert status_response.json()["status"] == "Reviewed", "Application status update failed"

        # 6) Create conversation and send encrypted message (ciphertext only)
        conversation_response = client.post(
            "/messages/conversations",
            headers=candidate_headers,
            json={"participant_ids": [recruiter_id], "is_group": False},
        )
        assert conversation_response.status_code == 201, conversation_response.text
        conversation_id = conversation_response.json()["id"]

        message_response = client.post(
            f"/messages/conversations/{conversation_id}/messages",
            headers=candidate_headers,
            json={"ciphertext": "ZW5jcnlwdGVkLWhlbGxv", "message_type": "e2ee"},
        )
        assert message_response.status_code == 201, message_response.text

        # 7) Admin reads audit logs
        audit_response = client.get("/admin/audit-logs", headers=admin_headers)
        assert audit_response.status_code == 200, audit_response.text
        logs = audit_response.json()
        required_actions = {
            "company_created",
            "job_created",
            "job_applied",
            "application_status_updated",
            "conversation_created",
            "message_sent",
        }
        found_actions = {entry["action"] for entry in logs}
        missing = required_actions - found_actions
        assert not missing, f"Missing audit actions: {missing}"

        print("SMOKE TEST PASSED")
        print(f"company_id={company_id}, job_id={job_id}, application_id={application_id}, conversation_id={conversation_id}")
        print(f"audit_logs={len(logs)}")


if __name__ == "__main__":
    run_smoke()
