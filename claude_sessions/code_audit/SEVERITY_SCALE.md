# SEVERITY CLASSIFICATION SCALE

Adapted from CVSS v4.0, OWASP Risk Rating, and Trail of Bits audit practices for the specific context of a web application codebase.

---

## Severity Levels

### CRITICAL (Score 9.0-10.0)

**Definition:** The issue causes data loss, security breach, or complete feature failure for users. Requires immediate action before any deployment.

**Characteristics:**
- Exploitable without authentication
- Causes data corruption or loss
- Exposes sensitive user data (PII, credentials, API keys)
- Makes the entire page/app non-functional
- Allows unauthorized actions (posting as another user, accessing admin features)

**Examples in This Codebase:**
- API key or OAuth token exposed in client-side JavaScript
- XSS vulnerability allowing script injection through user input
- A function that deletes user data instead of updating it (wrong API action)
- The main page fails to load due to a JavaScript syntax error
- publishAll() sends to wrong endpoint, causing posts to fail silently

**Response:** Block all deployments. Fix immediately. Notify PM_Architect.

---

### HIGH (Score 7.0-8.9)

**Definition:** The issue causes significant functionality loss or security weakness but has workarounds or limited exposure.

**Characteristics:**
- Feature is broken for a subset of users (e.g., mobile only)
- Duplicate function definitions where the wrong version wins and changes behavior
- Missing authentication on an API endpoint
- Data is displayed incorrectly (wrong numbers, wrong dates)
- Error handling is missing on critical paths (API calls, form submissions)

**Examples in This Codebase:**
- `getPlatformIcon` defined twice: first returns emoji, second returns HTML. All callers get HTML, breaking any context expecting text
- Schedule flow sends to wrong backend action due to a typo in the action string
- An API endpoint that accepts any request without checking auth headers
- Missing try/catch on publishAll() -- if the fetch fails, the UI hangs with spinner forever
- getElementById on a removed element causes subsequent code to silently fail

**Response:** Fix before next deployment. Can continue development on unrelated areas.

---

### MEDIUM (Score 4.0-6.9)

**Definition:** The issue affects user experience or code quality but does not break core functionality.

**Characteristics:**
- Visual rendering bugs (wrong colors, misaligned elements, but still usable)
- Performance issues (slow load, unnecessary re-renders, but functional)
- Accessibility violations (missing alt text, poor contrast, but content accessible)
- Inconsistent behavior (feature works differently in two similar contexts)
- Dead code that increases maintenance burden

**Examples in This Codebase:**
- `escapeHtml` defined 3 times -- all behave the same way, just wastes bytes and creates maintenance risk
- CSS rule targets a class that no longer exists in HTML
- A toast notification that shows "undefined" instead of a meaningful message in one edge case
- Carousel allows dragging past the last slide, showing blank space before snapping back
- Missing `aria-label` on interactive elements

**Response:** Fix in next planned work session. Does not block deployment unless accumulation is severe.

---

### LOW (Score 0.1-3.9)

**Definition:** Minor issues that affect code quality, maintainability, or polish but have no impact on users.

**Characteristics:**
- Code style inconsistencies (mixed const/let, inconsistent naming)
- Unused variables or imports
- Console.log statements left in production code
- Redundant CSS rules (not broken, just unnecessary)
- Comments that are outdated or misleading
- Functions that could be simplified but work correctly

**Examples in This Codebase:**
- `var` used instead of `const/let` in a new function
- A CSS transition on an element that is never animated
- An event listener for a feature that is disabled via `display: none`
- `console.log('debug:', data)` left in a production function

**Response:** Fix opportunistically. Bundle with other changes. Does not warrant its own commit.

---

### INFO (Score 0.0)

**Definition:** Observations, recommendations, or notes that are not bugs but could improve the codebase.

**Characteristics:**
- Architectural suggestions (this could be refactored, this pattern is unusual)
- Performance optimization opportunities (not slow, but could be faster)
- Documentation gaps (function is undocumented but works correctly)
- Future risk indicators (this pattern will cause problems if the codebase grows)
- Positive observations (this is well-implemented, good pattern)

**Examples in This Codebase:**
- "The file is 33,000+ lines. Consider splitting into modules when feasible."
- "This function uses `innerHTML` -- not currently a vulnerability because input is sanitized, but switching to `textContent` where possible would reduce future risk."
- "The carousel implementation is clean and well-structured."

**Response:** Document in report. No action required. Useful for long-term planning.

---

## Severity Decision Matrix

Use this matrix when you are unsure about severity:

| Factor | Increases Severity | Decreases Severity |
|--------|-------------------|-------------------|
| **User Impact** | Affects all users | Affects edge case only |
| **Data Impact** | Data loss or corruption | Display-only issue |
| **Security Impact** | Exploitable by attacker | Requires authenticated access |
| **Reproducibility** | Always reproducible | Intermittent / race condition |
| **Scope** | Entire page/app affected | Single feature affected |
| **Workaround** | No workaround exists | User can work around it |
| **Detection** | Silent failure (user unaware) | Visible error (user knows) |
| **Blast Radius** | Production live site | Dev/preview only |

### Quick Decision Flow

```
Is user data at risk? ---------> YES --> CRITICAL
                       |
                       NO
                       |
Does core functionality break? -> YES --> HIGH
                       |
                       NO
                       |
Does it affect user experience? -> YES --> MEDIUM
                       |
                       NO
                       |
Does it affect code quality? ---> YES --> LOW
                       |
                       NO
                       |
                       v
                      INFO
```

---

## Aggregation Rules

When multiple findings of the same type exist:

- 3+ MEDIUM findings in the same category --> Elevate to HIGH (systemic issue)
- 5+ LOW findings in the same file --> Elevate to MEDIUM (maintenance burden)
- Any CRITICAL finding --> Entire audit verdict is FAIL
- Any HIGH finding without mitigation --> Audit verdict is NEEDS_REMEDIATION
- Only MEDIUM/LOW/INFO --> Audit verdict is PASS (with notes)

---

## Example Severity Assignments

| Finding | Severity | Reasoning |
|---------|----------|-----------|
| API key in client JS | CRITICAL | Directly exploitable, data breach risk |
| innerHTML with unsanitized user input | CRITICAL | XSS, exploitable by any visitor |
| Duplicate function where wrong version runs | HIGH | Changes behavior silently |
| Missing error handling on API fetch | HIGH | UI hangs on failure |
| getElementById returns null, no guard | HIGH | Downstream code crashes |
| CSS class mismatch (element uses wrong class) | MEDIUM | Visual bug, still functional |
| Unused function (100 lines of dead code) | MEDIUM | Maintenance burden |
| Missing aria-label on button | MEDIUM | Accessibility violation |
| console.log in production | LOW | No user impact |
| Inconsistent variable naming | LOW | Code style issue |
| "Consider splitting this file" | INFO | Architecture observation |
| "Good error handling pattern here" | INFO | Positive note |
