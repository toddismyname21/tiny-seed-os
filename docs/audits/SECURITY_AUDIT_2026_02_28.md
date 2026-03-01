# SECURITY AUDIT REPORT — Tiny Seed Farm OS
## Full 5-Pass Comprehensive Audit
**Date:** 2026-02-28
**Auditor:** Claude Opus 4.6 (PM_Architect)
**Scope:** Full codebase — `apps_script/MERGED TOTAL.js` (148,737 lines), 89+ HTML frontends, TinyPM Python agents, infrastructure

---

## EXECUTIVE SUMMARY

This audit uncovered **critical systemic security failures**. The most severe finding: **~1,890 API endpoints are publicly accessible with zero authentication**. The API is deployed as "Anyone, even anonymous" with no global auth middleware. An attacker with only the API URL (publicly available on GitHub) can:

- Create admin accounts and take over the system (30 seconds)
- Execute stock trades on connected brokerage accounts
- Send bulk email/SMS from the farm's identity
- Access all customer PII (names, emails, phones, addresses)
- View bank account balances and transaction history
- Publish to all connected social media accounts
- Corrupt compliance records, financial data, and inventory

**This is not theoretical.** Pass 4 constructed step-by-step exploit scenarios requiring only `curl` and the public API URL.

---

## METHODOLOGY

| Pass | Technique | Duration |
|------|-----------|----------|
| **Pass 1** | Automated surface scan (Semgrep, gitleaks, Lighthouse, ESLint, Repomix) | 15 min |
| **Pass 2** | Deep context building (architecture map, data contracts, trust boundaries) | 25 min |
| **Pass 3** | Systematic vulnerability detection with evidence | 20 min |
| **Pass 4** | Adversarial validation (red team, exploit scenarios, false positive filtering) | 11 min |
| **Pass 5** | Cross-reference & synthesis (this report) | — |
| **Code Quality** | Senior architect review (functions, duplication, dead code, error handling) | 18 min |
| **Infrastructure** | DevOps security review (headers, deployment, CI/CD, source exposure) | 10 min |

---

## AUTOMATED TOOL RESULTS (Pass 1)

| Tool | Findings | Key Results |
|------|----------|-------------|
| **Semgrep** | 612 | 185 ERROR (166 insecure-document-method, 7 JWT tokens, 1 OAuth token, 1 raw SQL), 408 WARNING |
| **gitleaks** | 189 | Mostly in non-code files (email archives, saved webpages). Real secrets: OAuth tokens in `tinypm/.oauth_tokens/` |
| **Lighthouse** | — | Performance 100/100, Accessibility 77/100, Best Practices 77/100, SEO 90/100 |
| **ESLint** | 1 | Could not parse `MERGED TOTAL.js` (duplicate `callClaudeAPI` declaration at line 10816) |
| **Repomix** | 0 | 112 files, 2.19M tokens in web_app/. No suspicious files detected |

---

## CONSOLIDATED FINDINGS

### Severity Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 Critical** | 8 | Immediate exploitation possible, severe business impact |
| **P1 High** | 12 | Significant security risk, exploitation requires minimal effort |
| **P2 Medium** | 14 | Moderate risk, defense-in-depth failures |
| **P3 Low** | 8 | Minor issues, best-practice violations |
| **Total** | **42** | After deduplication across all passes |

---

## P0 CRITICAL FINDINGS (8)

### P0-1: No Global Authentication Layer
**Source:** Pass 3 (VULN-002), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js:17767-19206`
**Evidence:** `doPost` has 539 case statements; only 14 reference any auth mechanism. `doGet` has 1,351 case statements with only 4 auth references. No global auth middleware exists. CSRF enforcement is explicitly commented as "DEFERRED."
**Impact:** ~1,890 API endpoints accessible to anyone on the internet.
**Exploitability:** Trivial — requires only the API URL.
**Remediation:** Add auth check at top of `doGet`/`doPost` before the switch statement. Whitelist only truly public actions (authenticateUser, validateSession). Deny all others without valid session token.

### P0-2: Admin Routes Fall Back to Unauthenticated Execution
**Source:** Pass 3 (VULN-001), Pass 4 (validated), Code Quality (CQ-006)
**File:** `apps_script/MERGED TOTAL.js:17853-17883`
**Evidence:** `createUser`, `updateUser`, `deactivateUser`, `resetUserPin`, `forceLogout` try secured version first, fall back to unsecured if no token. `resetUserPin` (line 22687) returns the new PIN in plaintext: `{success: true, newPin: "5823"}`.
**Impact:** Full system takeover in 30 seconds. Create admin account → authenticate → control everything.
**Exploitability:** Trivial.
**Remediation:** Remove ALL unsecured fallback paths. Auth failures must return 401, never fall through.

### P0-3: Client-Supplied Prices Trusted in Sales Orders
**Source:** Pass 3 (VULN-010), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js:40424-40431`
**Evidence:** `unitPrice`, `taxRate`, `deliveryFee` taken directly from client POST body with no server-side lookup or validation. Negative values not blocked.
**Impact:** Financial fraud — orders at $0.01, negative prices creating credits.
**Exploitability:** Trivial.
**Remediation:** Server-side price lookup from product catalog. Reject negative values. Validate tax rate against configured rates.

### P0-4: Unauthenticated Stock Trading
**Source:** Pass 3 (VULN-012), Pass 4 (validated + expanded)
**File:** `apps_script/MERGED TOTAL.js:63497-63551`
**Evidence:** `placeAlpacaOrder` has no auth check. The `confirmLive` bypass is trivial. Entire Alpaca suite unauthenticated: `saveAlpacaCredentials`, `deleteAlpacaCredentials`, `cancelAlpacaOrder`, `closeAlpacaPosition`, `saveAlpacaAutoInvestConfig`, `executeAlpacaAutoInvest`.
**Impact:** Direct financial loss potentially in six figures. Attacker can overwrite credentials to redirect trades to their own account.
**Exploitability:** Trivial (if Alpaca configured).
**Remediation:** Require admin-level auth on ALL financial endpoints. Add confirmation workflow for trades.

### P0-5: Unauthenticated Bulk SMS/Email
**Source:** Pass 3 (VULN-013), Pass 4 (validated + expanded)
**File:** `apps_script/MERGED TOTAL.js:49961-50022`
**Evidence:** `sendBulkSMSToPhones`, `sendBulkEmailToRecipients`, `sendSystemEmail` all execute without auth. Emails sent FROM the farm's actual Gmail identity. Additional unauthenticated communication: `publishSocialPost`, `sendWeeklyAvailabilityBlast`, `sendFreshHarvestAlert`, `inviteChef`, `bulkInviteChefs`, `sendCustomerMagicLink`.
**Impact:** Phishing attacks using farm's real email identity, TCPA liability ($500-1,500/message), Twilio costs, brand damage.
**Exploitability:** Trivial.
**Remediation:** Require admin auth on ALL messaging endpoints. Add rate limiting. Add opt-out verification.

### P0-6: Unauthenticated Social Media Publishing
**Source:** Pass 4 (NEW-001)
**File:** `apps_script/MERGED TOTAL.js:17912` → `publishToAyrshare` at line 34065
**Evidence:** `publishSocialPost` case in doPost with no auth. Publishes to Facebook, Instagram, TikTok, YouTube, Pinterest, Threads, Twitter, LinkedIn.
**Impact:** Immediate brand destruction across all platforms. Potentially irrecoverable reputation harm.
**Exploitability:** Trivial (if Ayrshare configured).
**Remediation:** Require admin auth. Add approval workflow for social posts.

### P0-7: Unauthenticated Bank Account Data Access
**Source:** Pass 4 (NEW-002)
**File:** `apps_script/MERGED TOTAL.js:15956-15958`
**Evidence:** GET endpoints `getPlaidItems`, `getPlaidAccounts`, `getPlaidTransactions`, `getPlaidInvestmentHoldings`, `getPlaidInvestmentTransactions`, `exchangePlaidPublicToken` — all unauthenticated.
**Impact:** Complete exposure of farm's banking: account balances, transaction history, investment portfolio.
**Exploitability:** Trivial (if Plaid configured).
**Remediation:** Require admin auth on ALL Plaid endpoints.

### P0-8: Unauthenticated Credential Overwrite
**Source:** Pass 4 (NEW-004)
**File:** `apps_script/MERGED TOTAL.js:18295`
**Evidence:** `saveAlpacaCredentials` stores attacker-supplied API keys into `PropertiesService`, overwriting legitimate keys. Verifies attacker's keys work before saving.
**Impact:** Redirects investment account to attacker-controlled credentials. Future auto-invest trades go to attacker.
**Exploitability:** Trivial.
**Remediation:** Require admin auth. Add confirmation step requiring existing credential verification.

---

## P1 HIGH FINDINGS (12)

### P1-1: Plaintext PIN Storage and Comparison
**Source:** Pass 3 (VULN-003), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js:22362-22366`
**Evidence:** PINs stored plaintext in USERS sheet, compared via string equality. Default PIN is "0000". Only 10,000 possible values (4 digits). Rate limiting accepts IP from client (`params.ip`), making it bypassable.
**Remediation:** Hash PINs with bcrypt/scrypt. Use server-side IP detection. Enforce account lockout after failed attempts.

### P1-2: Session Tokens in Google Sheets
**Source:** Pass 3 (VULN-004), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js:21879-21905`
**Evidence:** UUID session tokens stored plaintext in AUTH_TOKENS sheet alongside user IDs and roles. Anyone with sheet access can steal sessions.
**Remediation:** Use CacheService instead of Sheets for tokens. Add token rotation. Bind tokens to IP/user-agent.

### P1-3: Error Stack Traces Returned to Client (4 locations)
**Source:** Pass 3 (VULN-005), Pass 4 (validated), Code Quality (CQ-004)
**File:** `apps_script/MERGED TOTAL.js:9691, 17761, 19203, 29016`
**Evidence:** `doGet` and `doPost` global catch blocks return `error.stack` in JSON response. Reveals function names, file structure, line numbers.
**Remediation:** Log stack server-side via `Logger.log()`. Return only generic error message to client. **5-minute fix.**

### P1-4: No Formula Injection Defense on 565 appendRow Calls
**Source:** Pass 3 (VULN-006), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js` — 565 `appendRow` calls, zero sanitization
**Evidence:** User input written directly to Google Sheets. Formulas like `=IMPORTRANGE()` or `=IMAGE()` can exfiltrate data when admin opens the sheet.
**Remediation:** Create `sanitizeForSheet(value)` function that prepends `'` to values starting with `=`, `+`, `-`, `@`. Apply to all user-input fields.

### P1-5: Test/Sample Data Endpoints Active in Production
**Source:** Pass 3 (VULN-007), Pass 4 (validated), Code Quality (CQ-007)
**File:** `apps_script/MERGED TOTAL.js:14587-14596`
**Evidence:** `insertSampleCustomers`, `insertSampleDeliveries`, `diagnoseSheets`, `getSheetSchema`, `diagnoseIntegrations` — all accessible without auth. `insertSampleCustomers` contains hardcoded PII (phone `7177255177`).
**Remediation:** Remove test endpoints. Move diagnostics behind admin auth.

### P1-6: Script Property Names Exposed
**Source:** Pass 3 (VULN-008), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js:14608-14614`
**Evidence:** `listScriptProperties` reveals all property key names (ALPACA_CREDENTIALS, TWILIO_AUTH_TOKEN, etc.) — values masked but names expose attack surface.
**Remediation:** Remove or require admin auth.

### P1-7: Shopify Webhook — No HMAC Verification
**Source:** Pass 3 (VULN-009), Pass 4 (validated)
**File:** `apps_script/MERGED TOTAL.js:42952`
**Evidence:** Zero HMAC, signature, or origin verification. Grep for `HMAC|hmac|X-Shopify-Hmac` returned no matches.
**Remediation:** Implement Shopify HMAC-SHA256 signature verification using the shared secret.

### P1-8: Customer PII Accessible Without Authentication
**Source:** Pass 4 (NEW-003)
**File:** Multiple doGet endpoints
**Evidence:** `getCSAMembers`, `getCustomerProfile`, `getCustomerOrders`, `getCustomerById`, `getCustomerIntelligence` — all return full records (email, phone, address, order history) with no auth.
**Remediation:** Require auth. Implement field-level access control.

### P1-9: `callClaudeAPI` Duplicate Definition — Active Production Bug
**Source:** Code Quality (CQ-002, CQ-003)
**File:** `apps_script/MERGED TOTAL.js:9111, 10816`
**Evidence:** Two definitions with incompatible signatures. First takes `(prompt, model)`, second takes `(prompt, temperature)`. Last definition wins — callers passing `'haiku'` as model are silently passing it as temperature. 20 total duplicate function names across the file.
**Remediation:** Remove first definition. Consolidate into single function with options object. Audit all 20 duplicates.

### P1-10: LockService Missing on 99.8% of Sheet Writes
**Source:** Code Quality (CQ-005)
**File:** `apps_script/MERGED TOTAL.js` — 564 `appendRow` calls, only 4 use LockService
**Evidence:** Concurrent POST requests can cause race conditions. Two simultaneous `completeTask` calls could double-count. CLAUDE.md mandates "LockService on all Sheets writes" — 99.8% non-compliant.
**Remediation:** Create `withLock(fn)` wrapper. Prioritize write-path POST handlers.

### P1-11: 1,650 innerHTML Assignments Without Sanitization
**Source:** Code Quality (CQ-012, CQ-020), Semgrep (166 findings)
**File:** Multiple HTML files — `chief-of-staff.html` (124), `loan-readiness.html` (102), `greenhouse-dashboard.html` (86), `financial-dashboard.html` (74)
**Evidence:** 16 HTML files with 20+ innerHTML assignments each have NO sanitizer (DOMPurify). `marketing-command-center.html` has DOMPurify but only uses `safeHTML()` on 14% of assignments.
**Remediation:** Add DOMPurify to all HTML files. Create global `safeHTML()` utility.

### P1-12: 137 Dead Functions Including PII-Containing Test Data
**Source:** Code Quality (CQ-007)
**File:** `apps_script/MERGED TOTAL.js`
**Evidence:** 137 functions defined but never referenced. Includes `insertSampleCustomers` with hardcoded phone number `7177255177` (6 occurrences). Dead code adds parse overhead and may contain stale security patterns.
**Remediation:** Remove `insertSample*` immediately (PII risk). Systematically verify and remove remaining dead functions.

---

## P2 MEDIUM FINDINGS (14)

| ID | Title | Source | Key Evidence |
|----|-------|--------|-------------|
| P2-1 | CSP allows unsafe-inline/unsafe-eval | Infrastructure | Weakens XSS protection |
| P2-2 | CSRF protection disabled | Pass 3 | Only validates if token present — skip by omitting |
| P2-3 | Missing security headers | Infrastructure | No X-Content-Type-Options, Referrer-Policy |
| P2-4 | apps_script/ tracked in public repo | Infrastructure | .gitignore added after files were tracked |
| P2-5 | Plaid access tokens stored in sheet cells | Pass 3 | Financial tokens in plaintext in Sheets |
| P2-6 | 84% of fetch() calls lack error handling | Code Quality | 174/208 calls in MCC.html have no .catch() |
| P2-7 | Flask debug enabled in production | Semgrep | `tinypm_for_tinyseed_os/energy_api.py:564` |
| P2-8 | 29 empty catch blocks (JS) + 162 bare except: (Python) | Code Quality | Silent error swallowing across both languages |
| P2-9 | doGet 3,618 lines / doPost 1,441 lines | Code Quality | Unmaintainable, untestable routing layer |
| P2-10 | 299 console.log statements in production | Code Quality | May leak sensitive data, degrades performance |
| P2-11 | 1,136 lines of inline HTML templates | Code Quality | Can't lint/format/syntax-check embedded templates |
| P2-12 | Plaid link token logged to server logs | Code Quality | `Logger.log` of financial service token |
| P2-13 | Insecure WebSocket connections (7 instances) | Semgrep | `ws://` instead of `wss://` |
| P2-14 | Raw SQL query via SQLAlchemy | Semgrep | `decision_replay_engine.py:684` |

---

## P3 LOW FINDINGS (8)

| ID | Title | Source |
|----|-------|--------|
| P3-1 | 5 hardcoded spreadsheet IDs (should use constant) | Code Quality |
| P3-2 | 53 snake_case functions in camelCase codebase | Code Quality |
| P3-3 | Misspelled function name `analyzeCommuncationPatterns` | Code Quality |
| P3-4 | 601+ magic numbers in conditions | Code Quality |
| P3-5 | 9 functions with 6+ positional parameters (max 9) | Code Quality |
| P3-6 | 3 identical copies of `getTimeBasedGreeting` | Code Quality |
| P3-7 | Missing robots.txt | Infrastructure |
| P3-8 | No disaster recovery plan documented | Infrastructure |

---

## VALIDATED ATTACK CHAINS (Pass 4)

### Chain 1: Full System Takeover (~30 seconds)
1. `GET ?action=listScriptProperties` → reveals all integrations
2. `POST {"action":"createUser", "username":"admin2", "pin":"9999", "role":"Admin"}` → creates admin account
3. `GET ?action=authenticateUser&username=admin2&pin=9999` → valid admin session

### Chain 2: Financial Fraud Pipeline
1. `GET ?action=getPlaidAccounts` → map bank accounts/balances
2. `POST createSalesOrder` with `unitPrice: 0.01` → fraudulent below-cost orders
3. `POST saveAlpacaCredentials` → hijack brokerage to attacker account
4. `POST executeAlpacaAutoInvest` → trigger trades on hijacked account

### Chain 3: Brand Destruction + Phishing
1. `GET ?action=getCSAMembers` → harvest all customer emails/phones
2. `POST sendBulkEmail` → phishing FROM farm's real Gmail identity
3. `POST publishSocialPost` → publish damaging content across all social channels

### Chain 4: Compliance Sabotage
1. `POST addComplianceWaterTest` (failing results) → fabricated contamination records
2. `POST addComplianceTemperature` (out-of-range) → temperature violations
3. Audit triggers → loss of certifications, product recalls

---

## FALSE POSITIVES FILTERED (Pass 4)

| Original Finding | Verdict | Evidence |
|------------------|---------|----------|
| Maps API key exposed in public repo | FALSE POSITIVE | Key is in `PropertiesService` (server-side). `getGoogleMapsApiKey()` is NOT exposed through any doGet/doPost case — only called via `google.script.run` from served HTML pages. |

---

## PRIORITIZED REMEDIATION ROADMAP

### Phase 1: EMERGENCY (Do Today) — Estimated 2-4 hours
These prevent the most catastrophic exploits with minimal code changes.

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | **Remove admin auth fallback paths** (P0-2) | Blocks account takeover | 15 min |
| 2 | **Remove `error.stack` from 4 catch blocks** (P1-3) | Stops info disclosure | 5 min |
| 3 | **Remove test/diagnostic endpoints** (P1-5) | Stops recon + data pollution | 10 min |
| 4 | **Remove `listScriptProperties` endpoint** (P1-6) | Stops integration recon | 5 min |
| 5 | **Add auth to ALL financial endpoints** (P0-4, P0-7, P0-8) | Blocks financial exploitation | 30 min |
| 6 | **Add auth to ALL messaging endpoints** (P0-5, P0-6) | Blocks phishing/brand damage | 30 min |
| 7 | **Add auth to ALL PII-returning endpoints** (P1-8) | Blocks customer data theft | 30 min |
| 8 | **Fix `callClaudeAPI` duplicate** (P1-9) | Fixes active production bug | 15 min |

### Phase 2: CRITICAL (This Week) — Estimated 4-8 hours

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 9 | **Implement global auth middleware** in doGet/doPost (P0-1) | Secures all endpoints | 2 hr |
| 10 | **Server-side price lookup** for sales orders (P0-3) | Prevents price manipulation | 1 hr |
| 11 | **Shopify HMAC verification** (P1-7) | Prevents webhook spoofing | 1 hr |
| 12 | **Formula injection sanitization** on appendRow (P1-4) | Prevents sheet injection | 2 hr |
| 13 | **Enable CSRF enforcement** (P2-2) | Prevents cross-site attacks | 1 hr |
| 14 | **Hash PINs** (P1-1) | Protects stored credentials | 1 hr |

### Phase 3: IMPORTANT (Next 2 Weeks)

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 15 | Add DOMPurify to all HTML files (P1-11) | Prevents XSS | 4 hr |
| 16 | Add LockService to write-path handlers (P1-10) | Prevents race conditions | 4 hr |
| 17 | Remove 137 dead functions (P1-12) | Reduces attack surface | 4 hr |
| 18 | Tighten CSP (P2-1) | Strengthens XSS defense | 2 hr |
| 19 | Add security headers (P2-3) | Defense in depth | 1 hr |
| 20 | Remove apps_script from git tracking (P2-4) | Prevents source exposure | 1 hr |
| 21 | Add .catch() to all fetch() calls (P2-6) | Prevents silent failures | 3 hr |
| 22 | Resolve all 20 duplicate function names (P1-9) | Prevents silent bugs | 2 hr |

### Phase 4: STRUCTURAL (Next Month)

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 23 | Decompose doGet/doPost into route table (P2-9) | Maintainability | 8 hr |
| 24 | Replace empty catch blocks (P2-8) | Debuggability | 4 hr |
| 25 | Move session storage to CacheService (P1-2) | Security | 4 hr |
| 26 | Extract inline HTML templates (P2-11) | Maintainability | 4 hr |
| 27 | Remove console.log from production (P2-10) | Performance/security | 2 hr |
| 28 | Extract magic numbers to constants (P3-4) | Maintainability | 2 hr |

---

## ARCHITECTURE STATISTICS

| Metric | Value |
|--------|-------|
| Backend lines of code | 148,737 (MERGED TOTAL.js) |
| Total functions | 2,612 |
| API endpoints (GET + POST) | ~1,890 |
| Authenticated endpoints | ~18 (~1%) |
| Google Sheets tabs | 319 |
| Frontend HTML files | 89+ |
| External integrations | 10+ (Alpaca, Plaid, Twilio, Shopify, Ayrshare, Claude, Gmail, Maps, Meta, Gemini) |
| appendRow calls | 565 (4 with LockService) |
| innerHTML assignments | 1,650+ (across 16+ files) |
| Duplicate function names | 20 |
| Dead functions | 137 |

---

## CLOSING ASSESSMENT

The Tiny Seed Farm OS has **no effective security perimeter**. The Google Apps Script deployment is set to "Anyone, even anonymous" and the `doGet`/`doPost` functions process ~1,890 API endpoints with virtually no authentication. This is equivalent to leaving every door of the farm unlocked, unmonitored, with signs pointing to the valuables.

**Phase 1 (today) is non-negotiable.** The admin fallback paths, financial endpoints, and messaging endpoints must be secured immediately. An attacker discovering the API URL can execute the system takeover attack chain in under 30 seconds.

The code quality findings (3,618-line doGet, 20 duplicate functions, 137 dead functions) compound the security issues by making the codebase nearly impossible to audit, maintain, or secure incrementally. The structural Phase 4 work is not optional — it's required to make ongoing security maintenance feasible.

---

*Report generated by 5-pass audit methodology. Pass 4 (adversarial validation) confirmed all P0 findings are exploitable with trivial effort. One false positive filtered (Maps API key). Three new P0 findings discovered during red team exercise.*
