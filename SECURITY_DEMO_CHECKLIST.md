# Security Demo Checklist (April Final)

## 0) Pre-demo startup
- Start backend on server (latest pull):
  - `cd ~/projects/FCS`
  - `bash scripts/start_backend_server.sh`
- Start frontend locally:
  - `npm --prefix frontend run dev -- --host localhost --port 5175`

---

## 1) PKI Function #1: Resume integrity verification
1. Login and upload a resume in Resume Manager.
2. Click **Verify Integrity** on the uploaded resume.
3. Show success message: PKI signature and hash verification pass.
4. Optional API proof:
   - `GET /resume/{resume_id}/integrity`

Expected:
- `hash_matches: true`
- `signature_valid: true`
- `signer_public_key` present

---

## 2) PKI Function #2: Signed audit verification snapshot
1. Login as admin and open Admin dashboard.
2. Trigger audit verification action.
3. Optional API proof:
   - `GET /admin/audit-logs/verify`

Expected:
- `valid: true`
- `pki_snapshot_signature` present
- `pki_signature_valid: true`
- `signer_public_key` present

---

## 3) OTP + virtual keyboard for high-risk actions
1. Go to Resume page and click **Download** (or **Delete**) on a resume.
2. In modal, click **Send OTP**.
3. Enter OTP using virtual keypad (not physical keyboard field typing).
4. Confirm action.
5. Open **Forgot Password** from login page.
6. Request reset OTP, then enter OTP using the same virtual keypad style.
7. Set a new password and sign in with the updated credentials.

Expected:
- Download/Delete proceeds only with valid OTP.
- Invalid or missing OTP is rejected by backend.
- Password reset confirmation only succeeds with valid OTP entered through virtual keyboard.

---

## 4) Tamper-evident audit logs
1. Perform critical actions (resume upload/download/delete, admin view actions).
2. Open admin audit logs and verify chain.

Expected:
- New events visible.
- Chain verification reports valid.

---

## 5) Defenses against common web attacks (demonstration)

### SQL Injection
- Attempt malformed query input in search endpoints/UI.
- Show normal error handling and no data leakage.

### XSS
- Try script-like text in profile fields.
- Show rendered output is escaped text, not executed script.

### CSRF
- Explain header-token architecture and CORS restrictions.
- Show unauthorized cross-origin requests fail without valid bearer token.

### Session hijack/fixation
- Show API rejects invalid/expired token.
- Show suspended user cannot access protected endpoints.

---

## 6) Final submission packet
- Source code + branch/commit hash
- Milestone reports (`Milestone1_Report.md`, `MILESTONE2_REPORT.md`, `MILESTONE3_REPORT.md`, `APRIL_MILESTONE_REPORT.md`)
- Demo video/screenshots for each requirement
- This checklist for evaluator reproduction
