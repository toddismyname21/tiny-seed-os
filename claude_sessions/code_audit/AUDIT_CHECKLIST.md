# MASTER AUDIT CHECKLIST

Organized by category. Each item is a specific check to perform. Use this as the definitive reference for what to audit.

---

## Category 1: CORRECTNESS
*Does the code do what it claims to do?*

### 1.1 Function Behavior
- [ ] **C-FUNC-01**: Every function's actual behavior matches its name and comments
- [ ] **C-FUNC-02**: No duplicate function definitions (use duplicate-function-detector.js)
- [ ] **C-FUNC-03**: When duplicates exist, verify which definition "wins" (last in source order for JS) and that all callers get the expected behavior
- [ ] **C-FUNC-04**: No stub/TODO functions that callers depend on (use stub-function-detector.js)
- [ ] **C-FUNC-05**: Return values match what callers expect (e.g., function returns HTML but caller expects plain text)
- [ ] **C-FUNC-06**: Function parameters are validated (null checks, type checks)
- [ ] **C-FUNC-07**: Recursive functions have proper termination conditions

### 1.2 Data Flow
- [ ] **C-DATA-01**: Variables are initialized before use
- [ ] **C-DATA-02**: No variable shadowing that changes behavior (inner scope variable hides outer)
- [ ] **C-DATA-03**: Global state mutations are intentional and documented
- [ ] **C-DATA-04**: Data transformations preserve required fields (no accidental field dropping)
- [ ] **C-DATA-05**: Numeric operations handle NaN, Infinity, and integer overflow
- [ ] **C-DATA-06**: String operations handle empty strings, null, and special characters
- [ ] **C-DATA-07**: Array operations handle empty arrays and out-of-bounds access

### 1.3 Control Flow
- [ ] **C-FLOW-01**: All if/else branches have correct logic (no inverted conditions)
- [ ] **C-FLOW-02**: Switch statements have default cases or documented reason for omission
- [ ] **C-FLOW-03**: Loop termination conditions are correct (no off-by-one, no infinite loops)
- [ ] **C-FLOW-04**: Early returns do not skip necessary cleanup
- [ ] **C-FLOW-05**: Ternary expressions are not nested beyond one level (readability)

---

## Category 2: COMPLETENESS
*Are all code paths handled?*

### 2.1 Error Handling
- [ ] **CM-ERR-01**: Every `fetch()` call has a `.catch()` or surrounding `try/catch`
- [ ] **CM-ERR-02**: Every `.then()` chain ends with `.catch()`
- [ ] **CM-ERR-03**: `catch` blocks do something meaningful (not empty, not just `console.log`)
- [ ] **CM-ERR-04**: Network failure is handled (timeout, DNS failure, CORS error)
- [ ] **CM-ERR-05**: API error responses are handled (4xx, 5xx status codes)
- [ ] **CM-ERR-06**: User-facing error messages are helpful (not "Error" or "undefined")
- [ ] **CM-ERR-07**: Error state cleans up UI (removes spinners, re-enables buttons)

### 2.2 Edge Cases
- [ ] **CM-EDGE-01**: Empty state is handled (no data, first-time user)
- [ ] **CM-EDGE-02**: Maximum input is handled (very long text, very large file)
- [ ] **CM-EDGE-03**: Rapid repeated actions are handled (double-click, spam submit)
- [ ] **CM-EDGE-04**: Browser back/forward does not break state
- [ ] **CM-EDGE-05**: Page refresh preserves necessary state or gracefully resets

### 2.3 Feature Completeness
- [ ] **CM-FEAT-01**: Every button/link has a click handler
- [ ] **CM-FEAT-02**: Every form has a submit handler
- [ ] **CM-FEAT-03**: Every input has validation (at least basic)
- [ ] **CM-FEAT-04**: Loading states exist for all async operations
- [ ] **CM-FEAT-05**: Success states exist for all completed operations
- [ ] **CM-FEAT-06**: Empty states exist for all data-dependent views

---

## Category 3: CONSISTENCY
*Are patterns used uniformly throughout the codebase?*

### 3.1 Code Patterns
- [ ] **CN-PAT-01**: Same problem solved the same way everywhere (e.g., all API calls use the same pattern)
- [ ] **CN-PAT-02**: Error handling follows the same pattern in all similar contexts
- [ ] **CN-PAT-03**: DOM manipulation uses consistent approach (all getElementById OR all querySelector, not mixed without reason)
- [ ] **CN-PAT-04**: Event binding uses consistent approach (all addEventListener OR all inline handlers, not mixed without reason)
- [ ] **CN-PAT-05**: Date formatting is consistent across the UI

### 3.2 Naming
- [ ] **CN-NAME-01**: Functions follow consistent naming convention (camelCase, verb-first)
- [ ] **CN-NAME-02**: Variables follow consistent naming convention
- [ ] **CN-NAME-03**: CSS classes follow consistent naming convention (kebab-case, BEM, etc.)
- [ ] **CN-NAME-04**: HTML IDs follow consistent naming convention
- [ ] **CN-NAME-05**: API action names follow consistent pattern

### 3.3 UI Consistency
- [ ] **CN-UI-01**: Similar components look the same (all buttons same style, all cards same padding)
- [ ] **CN-UI-02**: Color usage is consistent (same color for same meaning throughout)
- [ ] **CN-UI-03**: Spacing/margins are consistent
- [ ] **CN-UI-04**: Typography hierarchy is consistent (h1 > h2 > h3 sizing)
- [ ] **CN-UI-05**: Icon style is consistent (all Font Awesome, all same weight/size)

---

## Category 4: SECURITY
*Can an attacker exploit this code?*

### 4.1 Input Validation & Output Encoding
- [ ] **S-XSS-01**: No `innerHTML` with unsanitized user input
- [ ] **S-XSS-02**: No `document.write()` with user input
- [ ] **S-XSS-03**: No `eval()` or `Function()` with user input
- [ ] **S-XSS-04**: URL parameters are sanitized before use
- [ ] **S-XSS-05**: API response data is sanitized before rendering
- [ ] **S-XSS-06**: Template literals do not embed unsanitized data into HTML

### 4.2 Authentication & Authorization
- [ ] **S-AUTH-01**: All API endpoints require authentication (or are intentionally public)
- [ ] **S-AUTH-02**: Client-side auth checks are backed by server-side enforcement
- [ ] **S-AUTH-03**: Session tokens are stored securely (not in localStorage for sensitive data)
- [ ] **S-AUTH-04**: Logout actually invalidates the session
- [ ] **S-AUTH-05**: No hardcoded credentials in client-side code

### 4.3 Secrets Management
- [ ] **S-SEC-01**: No API keys in client-side JavaScript
- [ ] **S-SEC-02**: No OAuth tokens in source code
- [ ] **S-SEC-03**: No passwords in comments or variable names
- [ ] **S-SEC-04**: API URLs do not contain credentials as query parameters
- [ ] **S-SEC-05**: `.env` files are in `.gitignore`

### 4.4 Data Exposure
- [ ] **S-DATA-01**: Console.log does not expose sensitive data
- [ ] **S-DATA-02**: Error messages do not expose internal structure (stack traces, file paths)
- [ ] **S-DATA-03**: Network requests do not send unnecessary PII
- [ ] **S-DATA-04**: Local storage does not contain sensitive data without encryption

### 4.5 Third-Party Dependencies
- [ ] **S-DEP-01**: All included JS libraries are from trusted CDNs with integrity hashes
- [ ] **S-DEP-02**: No libraries with known CVEs (use Retire.js)
- [ ] **S-DEP-03**: Library versions are pinned (not "latest")

---

## Category 5: PERFORMANCE
*Is the code efficient?*

### 5.1 Loading Performance
- [ ] **P-LOAD-01**: No render-blocking scripts without `async` or `defer`
- [ ] **P-LOAD-02**: Large JS/CSS files are minified in production
- [ ] **P-LOAD-03**: Images are optimized (correct format, lazy loading)
- [ ] **P-LOAD-04**: Fonts are preloaded or use `font-display: swap`
- [ ] **P-LOAD-05**: No unnecessary third-party scripts

### 5.2 Runtime Performance
- [ ] **P-RUN-01**: No DOM queries inside loops (cache the element reference)
- [ ] **P-RUN-02**: No layout thrashing (read-then-write, not interleaved)
- [ ] **P-RUN-03**: Large lists use virtual scrolling or pagination
- [ ] **P-RUN-04**: Event handlers are debounced/throttled where appropriate (scroll, resize, input)
- [ ] **P-RUN-05**: No synchronous XHR
- [ ] **P-RUN-06**: No `await` inside loops when `Promise.all` would work

### 5.3 Memory
- [ ] **P-MEM-01**: Event listeners are removed when elements are destroyed
- [ ] **P-MEM-02**: setInterval/setTimeout are cleared when no longer needed
- [ ] **P-MEM-03**: Large data structures are released when no longer needed
- [ ] **P-MEM-04**: No closure-based memory leaks (functions holding references to large outer scopes)

---

## Category 6: ACCESSIBILITY
*Can all users access this content?*

### 6.1 Structure
- [ ] **A-STR-01**: Page has a single `<h1>` and logical heading hierarchy
- [ ] **A-STR-02**: Landmark regions are used (`<main>`, `<nav>`, `<header>`, `<footer>`)
- [ ] **A-STR-03**: Lists use `<ul>`/`<ol>`, not styled `<div>`s
- [ ] **A-STR-04**: Tables have `<th>` headers and `<caption>` where appropriate

### 6.2 Interactive Elements
- [ ] **A-INT-01**: All images have alt text (or `alt=""` for decorative)
- [ ] **A-INT-02**: All form inputs have associated `<label>` elements
- [ ] **A-INT-03**: All buttons have accessible names (text content or `aria-label`)
- [ ] **A-INT-04**: All links have descriptive text (not "click here")
- [ ] **A-INT-05**: Custom interactive elements have appropriate ARIA roles
- [ ] **A-INT-06**: Focus indicators are visible on all interactive elements
- [ ] **A-INT-07**: Tab order follows logical reading order

### 6.3 Visual
- [ ] **A-VIS-01**: Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large)
- [ ] **A-VIS-02**: Information is not conveyed by color alone
- [ ] **A-VIS-03**: Text can be resized to 200% without loss of content
- [ ] **A-VIS-04**: Animations respect `prefers-reduced-motion`

### 6.4 Keyboard
- [ ] **A-KEY-01**: All functionality is accessible via keyboard alone
- [ ] **A-KEY-02**: No keyboard traps (focus cannot be moved away)
- [ ] **A-KEY-03**: Modal dialogs trap focus correctly (focus stays inside modal)
- [ ] **A-KEY-04**: Escape key closes modals/dropdowns

---

## Category 7: MAINTAINABILITY
*Can this code be understood and modified safely?*

### 7.1 Complexity
- [ ] **M-CX-01**: No function exceeds 50 lines (flag for review if so)
- [ ] **M-CX-02**: Cyclomatic complexity per function is below 15
- [ ] **M-CX-03**: No deeply nested code (more than 4 levels of indentation)
- [ ] **M-CX-04**: Single file does not exceed 5,000 lines (flag at 1,000+)

### 7.2 Code Organization
- [ ] **M-ORG-01**: Related functions are grouped together
- [ ] **M-ORG-02**: Constants are defined at the top of the scope
- [ ] **M-ORG-03**: Utility functions are separated from business logic
- [ ] **M-ORG-04**: No copy-pasted code blocks (DRY principle)

### 7.3 Documentation
- [ ] **M-DOC-01**: Complex functions have JSDoc or comment explaining purpose
- [ ] **M-DOC-02**: Non-obvious logic has inline comments
- [ ] **M-DOC-03**: Magic numbers are named constants
- [ ] **M-DOC-04**: TODOs have associated tracking (ticket number, date, or owner)

---

## Category 8: API CONTRACT
*Do frontend calls match backend expectations?*

### 8.1 Request Validation
- [ ] **API-REQ-01**: All API calls use the centralized API_URL from api-config.js
- [ ] **API-REQ-02**: HTTP method matches backend expectation (GET vs POST)
- [ ] **API-REQ-03**: Request body includes all required fields
- [ ] **API-REQ-04**: Field names match exactly (case-sensitive)
- [ ] **API-REQ-05**: Field types match (string vs number vs boolean)
- [ ] **API-REQ-06**: `action` parameter in payload matches backend handler name

### 8.2 Response Handling
- [ ] **API-RES-01**: Success response is checked (response.success or response.ok)
- [ ] **API-RES-02**: Error response shape is handled
- [ ] **API-RES-03**: Missing/null fields in response do not crash the UI
- [ ] **API-RES-04**: Response data types are validated before use

### 8.3 Network
- [ ] **API-NET-01**: Timeout is set on fetch calls (AbortController or equivalent)
- [ ] **API-NET-02**: Retry logic exists for transient failures (or documented reason for no retry)
- [ ] **API-NET-03**: CORS configuration is correct
- [ ] **API-NET-04**: Request size does not exceed backend limits

---

## Category 9: STATE MANAGEMENT
*Is application state handled correctly?*

### 9.1 Global State
- [ ] **ST-GLB-01**: All global variables are documented (purpose, expected type, who modifies them)
- [ ] **ST-GLB-02**: Global state is modified only through defined functions (not scattered assignments)
- [ ] **ST-GLB-03**: No race conditions on global state (two async operations writing to same variable)
- [ ] **ST-GLB-04**: State is reset properly after operations complete (forms clear, flags reset)

### 9.2 Local Storage
- [ ] **ST-LS-01**: localStorage reads handle missing/corrupted data (try/catch JSON.parse)
- [ ] **ST-LS-02**: localStorage is not used for sensitive data
- [ ] **ST-LS-03**: Storage quota exceeded is handled
- [ ] **ST-LS-04**: Stored data has a versioning/migration strategy

### 9.3 UI State
- [ ] **ST-UI-01**: Loading states are shown during async operations
- [ ] **ST-UI-02**: Loading states are cleared on both success AND failure
- [ ] **ST-UI-03**: Buttons are disabled during operations to prevent double-submit
- [ ] **ST-UI-04**: UI state matches data state (if data says "scheduled", UI shows "scheduled")

---

## Category 10: VISUAL INTEGRITY
*Does it render correctly?*

### 10.1 Layout
- [ ] **V-LAY-01**: No horizontal scrollbar on any viewport width
- [ ] **V-LAY-02**: Content does not overflow its container
- [ ] **V-LAY-03**: Flexbox/grid layouts handle variable content sizes
- [ ] **V-LAY-04**: Fixed/sticky elements do not overlap content

### 10.2 Responsive Design
- [ ] **V-RES-01**: Layout works at 320px (minimum mobile)
- [ ] **V-RES-02**: Layout works at 768px (tablet)
- [ ] **V-RES-03**: Layout works at 1024px (laptop)
- [ ] **V-RES-04**: Layout works at 1920px (desktop)
- [ ] **V-RES-05**: Touch targets are at least 44x44px on mobile

### 10.3 Dynamic Content
- [ ] **V-DYN-01**: Long text truncates gracefully (ellipsis, not overflow)
- [ ] **V-DYN-02**: Empty states show meaningful content (not blank space)
- [ ] **V-DYN-03**: Loading skeletons or spinners during data fetch
- [ ] **V-DYN-04**: Images have defined dimensions to prevent layout shift

---

## Category 11: CROSS-BROWSER
*Does it work in all target browsers?*

- [ ] **XB-01**: No usage of APIs without checking browser support (caniuse.com)
- [ ] **XB-02**: CSS properties use vendor prefixes where needed
- [ ] **XB-03**: ES6+ syntax is compatible with target browsers or transpiled
- [ ] **XB-04**: Tested in Chrome, Firefox, Safari (at minimum)
- [ ] **XB-05**: Mobile Safari tested (different rendering engine from desktop Chrome)

---

## How to Use This Checklist

### For a Full Audit
Run through every category in order. Mark each item as:
- PASS: Verified with evidence
- FAIL: Issue found, documented in findings
- N/A: Not applicable to this codebase/file
- STATUS_ABSTAIN: Cannot verify without additional tools/access

### For a Targeted Audit
Choose only the categories relevant to the change being audited. Always include Category 1 (Correctness) and Category 8 (API Contract).

### For a Regression Audit
Focus on Categories 1 (Correctness), 2 (Completeness), and 8 (API Contract). Run automated tools for all other categories.

### Tracking Progress
Create a summary table:

| Category | Total Items | Pass | Fail | N/A | Abstain |
|----------|------------|------|------|-----|---------|
| Correctness | 19 | | | | |
| Completeness | 18 | | | | |
| Consistency | 15 | | | | |
| Security | 17 | | | | |
| Performance | 13 | | | | |
| Accessibility | 15 | | | | |
| Maintainability | 11 | | | | |
| API Contract | 10 | | | | |
| State Management | 11 | | | | |
| Visual Integrity | 9 | | | | |
| Cross-Browser | 5 | | | | |
| **TOTAL** | **143** | | | | |
