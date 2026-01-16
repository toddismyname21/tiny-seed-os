# INBOX: Security Claude
## From: PM_Architect

**Updated:** 2026-01-15
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: SECURITY HARDENING & PERMISSIONS AUDIT

Your previous work secured 25 pages. Now we need to ensure everything is locked down properly and plan for safe automation.

#### Task 1: Permission Model Audit

Create `/claude_sessions/security/PERMISSION_AUDIT.md`:

**Document current security model:**
- What roles exist?
- What can each role access?
- Where are permissions checked?
- Any gaps or inconsistencies?

**Permission matrix:**
```
| Page/Feature | Admin | Manager | Employee | Public |
|--------------|-------|---------|----------|--------|
| Dashboard | ✓ | ✓ | - | - |
| Planning | ✓ | ✓ | - | - |
| Employee Tasks | ✓ | ✓ | ✓ | - |
| ...
```

#### Task 2: API Security Review

Create `/claude_sessions/security/API_SECURITY_REVIEW.md`:

**Analyze all API endpoints for:**
- Authentication required?
- Authorization checked?
- Input validation?
- Rate limiting?
- Error message security (no info leakage)

**Identify:**
- Endpoints that should be public
- Endpoints that need auth
- Any endpoints missing auth checks

#### Task 3: Safe Automation Recommendations

Owner wants to "minimize restrictions so we can throw the safe stuff on autopilot."

Create `/claude_sessions/security/SAFE_AUTOMATION_GUIDE.md`:

**Define what's safe to automate:**
- Read-only operations
- Internal data processing
- Report generation
- Notifications

**Define what requires human approval:**
- Financial transactions
- Data deletion
- External API calls
- User management

**Recommendations for:**
- How to safely give Claudes more autonomy
- What guardrails to keep
- Logging and audit trail requirements

#### Task 4: Session Security

Create `/claude_sessions/security/SESSION_SECURITY.md`:

**Review session management:**
- Session timeout settings
- Token rotation
- Concurrent session handling
- Logout behavior

**Recommendations:**
- Optimal timeout duration
- Session invalidation on password change
- Multi-device session management

#### Deliverable: MORNING SECURITY BRIEF

Create `/claude_sessions/security/MORNING_SECURITY_BRIEF.md`:
- Current security posture summary
- Critical issues found (if any)
- Quick fixes available
- Roadmap for improvements
- Safe automation recommendations

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't access the codebase or hit permissions:

**Security Best Practices Guide**
- Document security best practices for Apps Script
- Google Workspace security features to leverage
- Two-factor authentication recommendations
- Backup and recovery procedures

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Permission audit complete
2. API security review done
3. Safe automation guide drafted
4. Morning brief ready

**PM_Architect will check your OUTBOX.**

---

*Security Claude - Keep us secure while enabling automation*
