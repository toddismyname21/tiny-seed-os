# CODE AUDIT TOOL KIT

Complete reference of every tool the Code Audit Claude should use, how to use it, and what it detects. Tools are organized by category: built-in scripts, installable CLI tools, and manual techniques.

---

## Section 1: Custom Audit Scripts (scripts/audit/)

These are purpose-built scripts for this codebase. Run them first in every session.

### 1.1 run-full-audit.sh
**What it does:** Orchestrates all other audit scripts in sequence. The single command to run everything.
**Usage:**
```bash
bash scripts/audit/run-full-audit.sh web_app/marketing-command-center.html
bash scripts/audit/run-full-audit.sh  # Runs on all HTML files
```
**Output:** Combined report with pass/fail per tool and summary statistics.

### 1.2 duplicate-function-detector.js
**What it does:** Parses JavaScript with an AST parser (acorn) and finds all function declarations/expressions. Reports any function name defined more than once, showing which definition is at which line and which one "wins" (last definition in source order).
**Detects:**
- Multiple `function foo()` declarations
- Function expressions overwriting earlier declarations
- Method definitions in objects that shadow each other
- Arrow functions assigned to same variable name
**Usage:**
```bash
node scripts/audit/duplicate-function-detector.js web_app/marketing-command-center.html
```

### 1.3 dead-code-finder.js
**What it does:** Identifies functions that are defined but never called anywhere in the file.
**Detects:**
- Functions defined but never referenced
- Functions only referenced in commented-out code
- Event handler functions that reference removed HTML elements
**Usage:**
```bash
node scripts/audit/dead-code-finder.js web_app/marketing-command-center.html
```

### 1.4 dom-orphan-checker.sh
**What it does:** Enhanced version of `validate-element-refs.sh`. Cross-references every `getElementById`, `querySelector`, `getElementsByClassName`, and `getElementsByTagName` call against actual HTML element definitions.
**Detects:**
- JS references to non-existent HTML IDs
- JS references to non-existent CSS classes (in querySelector)
- HTML elements with IDs that are never referenced (dead HTML)
- Dynamic ID construction patterns that might fail
**Usage:**
```bash
bash scripts/audit/dom-orphan-checker.sh web_app/marketing-command-center.html
```

### 1.5 function-call-graph.js
**What it does:** Builds a call graph showing which functions call which other functions. Identifies unreachable functions and circular call chains.
**Detects:**
- Functions that are defined but unreachable from any entry point
- Circular call chains (A calls B calls C calls A)
- Functions with many callers (fragile -- changing them breaks many things)
- Functions with no callers (dead code candidates)
**Usage:**
```bash
node scripts/audit/function-call-graph.js web_app/marketing-command-center.html
# Output: JSON call graph + summary statistics
```

### 1.6 api-contract-validator.js
**What it does:** Extracts all API calls (fetch, XMLHttpRequest, $.ajax) from frontend code and catalogs the expected request format (URL, method, headers, body fields) and expected response format. Then compares against backend endpoint definitions if available.
**Detects:**
- Frontend sending fields the backend does not expect
- Frontend not sending required fields
- Frontend expecting response fields the backend does not return
- Mismatched action names between frontend and backend
- Hardcoded API URLs (should use api-config.js)
**Usage:**
```bash
node scripts/audit/api-contract-validator.js web_app/marketing-command-center.html
```

### 1.7 unused-css-finder.sh
**What it does:** Extracts all CSS selectors from `<style>` blocks and compares against HTML elements and JS-created elements.
**Detects:**
- CSS rules targeting classes/IDs that do not exist in HTML
- CSS rules targeting elements that are only created dynamically (flagged for review)
- Duplicate CSS rules (same selector defined twice)
- CSS rules that are overridden and never take effect
**Usage:**
```bash
bash scripts/audit/unused-css-finder.sh web_app/marketing-command-center.html
```

### 1.8 event-listener-auditor.js
**What it does:** Finds all addEventListener calls and inline event handlers (onclick, onchange, etc.) and checks whether they have corresponding removeEventListener calls or cleanup patterns.
**Detects:**
- Event listeners added but never removed (memory leak risk)
- Inline event handlers calling undefined functions
- Multiple listeners on the same element for the same event (potential duplicate handling)
- Event delegation patterns that might miss dynamically added elements
**Usage:**
```bash
node scripts/audit/event-listener-auditor.js web_app/marketing-command-center.html
```

### 1.9 stub-function-detector.js
**What it does:** Identifies functions whose body is empty, contains only a console.log, or contains only a TODO/FIXME comment. These are "fake" implementations that look real but do nothing.
**Detects:**
- Empty function bodies: `function doThing() {}`
- Console-only bodies: `function doThing() { console.log('TODO'); }`
- Comment-only bodies: `function doThing() { /* TODO: implement */ }`
- Functions that only return a hardcoded value suggesting placeholder: `return 'Not implemented'`
**Usage:**
```bash
node scripts/audit/stub-function-detector.js web_app/marketing-command-center.html
```

### 1.10 async-pattern-checker.sh
**What it does:** Scans for common async/await and Promise anti-patterns.
**Detects:**
- `fetch()` without `.catch()` or surrounding try/catch
- `async` functions without any `await` (suspicious -- why is it async?)
- `await` inside loops (performance issue -- should use Promise.all)
- Missing `await` on async function calls (fire-and-forget, may lose errors)
- `.then()` chains without `.catch()` at the end
- Promise constructor anti-pattern (new Promise wrapping another Promise)
**Usage:**
```bash
bash scripts/audit/async-pattern-checker.sh web_app/marketing-command-center.html
```

---

## Section 2: Installable CLI Tools

These tools need to be installed via npm. Install them in the project or globally.

### 2.1 ESLint (with security plugins)
**What it does:** The industry-standard JavaScript linter. With the right plugins, it catches security issues, code quality problems, and potential bugs.
**Install:**
```bash
npm install -g eslint @eslint/js eslint-plugin-security eslint-plugin-no-unsanitized
```
**Usage:**
```bash
# Quick scan with default rules
npx eslint --no-eslintrc --rule '{"no-unused-vars":"warn","no-undef":"error","no-redeclare":"error","no-shadow":"warn","eqeqeq":"warn"}' file.js

# With security plugin
npx eslint --plugin security --rule '{"security/detect-eval-with-expression":"error","security/detect-non-literal-fs-filename":"error","security/detect-non-literal-require":"error","security/detect-object-injection":"warn"}' file.js
```
**Detects:** Unused variables, undefined references, redeclared variables, loose equality, eval usage, prototype pollution patterns, non-literal require/import.

### 2.2 Semgrep
**What it does:** Pattern-matching static analysis. Can find security vulnerabilities, bugs, and anti-patterns using rules that look like the target language.
**Install:**
```bash
pip3 install semgrep
# Or: brew install semgrep
```
**Usage:**
```bash
# Run OWASP Top 10 rules
semgrep --config "p/owasp-top-ten" web_app/

# Run JavaScript-specific rules
semgrep --config "p/javascript" web_app/

# Run XSS detection
semgrep --config "p/xss" web_app/

# Run all recommended rules
semgrep --config "p/default" web_app/
```
**Detects:** XSS, SQL injection, command injection, SSRF, path traversal, hardcoded secrets, insecure configurations.

### 2.3 Lighthouse
**What it does:** Google's web quality auditor. Measures performance, accessibility, best practices, and SEO.
**Install:** Comes with Chrome/Chromium. CLI: `npm install -g lighthouse`
**Usage:**
```bash
# Full audit
npx lighthouse http://localhost:8080/page.html --output json --output html --quiet

# Performance only
npx lighthouse http://localhost:8080/page.html --only-categories=performance --output json --quiet

# Accessibility only
npx lighthouse http://localhost:8080/page.html --only-categories=accessibility --output json --quiet
```
**Detects:** Performance bottlenecks (large JS bundles, render-blocking resources, layout shifts), accessibility violations (missing labels, poor contrast, keyboard traps), SEO issues (missing meta tags, no viewport).

### 2.4 Pa11y
**What it does:** Automated accessibility testing using HTML CodeSniffer. Tests against WCAG 2.1 standards.
**Install:** `npm install -g pa11y`
**Usage:**
```bash
# Test a URL
pa11y http://localhost:8080/page.html

# Test with specific standard
pa11y --standard WCAG2AA http://localhost:8080/page.html

# JSON output for parsing
pa11y --reporter json http://localhost:8080/page.html
```
**Detects:** WCAG 2.1 A/AA/AAA violations, missing alt text, poor color contrast, missing form labels, incorrect ARIA usage, keyboard navigation issues.

### 2.5 Playwright
**What it does:** Browser automation. Used for screenshot-based visual verification and runtime testing.
**Install:** `npm install -g playwright && npx playwright install chromium`
**Usage:**
```bash
# Screenshot a page
npx playwright screenshot --browser chromium http://localhost:8080/page.html screenshot.png

# Screenshot at mobile viewport
npx playwright screenshot --browser chromium --viewport-size="375,812" http://localhost:8080/page.html mobile.png

# Full page screenshot
npx playwright screenshot --browser chromium --full-page http://localhost:8080/page.html full.png
```
**Detects:** Visual rendering issues, layout broken at specific viewports, elements overlapping or hidden incorrectly, broken images.

### 2.6 html-validate
**What it does:** Validates HTML against the HTML spec. Catches structural errors that browsers silently fix.
**Install:** `npm install -g html-validate`
**Usage:**
```bash
html-validate web_app/marketing-command-center.html
```
**Detects:** Unclosed tags, invalid nesting, deprecated elements, invalid attributes, duplicate IDs in HTML, missing required attributes.

### 2.7 Retire.js
**What it does:** Scans for known vulnerabilities in JavaScript libraries.
**Install:** `npm install -g retire`
**Usage:**
```bash
# Scan a directory
retire --path web_app/

# Scan a specific file
retire --js web_app/some-library.js
```
**Detects:** Known CVEs in jQuery, Bootstrap, Angular, React, and hundreds of other JS libraries.

### 2.8 PurgeCSS (for unused CSS analysis)
**What it does:** Analyzes CSS against HTML/JS content to find unused rules.
**Install:** `npm install -g purgecss`
**Usage:**
```bash
purgecss --css styles.css --content index.html --output purged/
# Compare original vs purged to see what was removed
```
**Detects:** CSS rules that are never applied to any element in the HTML.

---

## Section 3: Node.js Built-in Analysis Techniques

These do not require any installation -- just use Node.js.

### 3.1 AST Parsing with Acorn
**What it does:** Parse JavaScript into an Abstract Syntax Tree for deep structural analysis.
**Usage:**
```javascript
const acorn = require('acorn');
const walk = require('acorn-walk');

const code = fs.readFileSync('file.js', 'utf8');
const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' });

// Find all function declarations
walk.simple(ast, {
  FunctionDeclaration(node) {
    console.log(`Function: ${node.id.name} at line ${node.loc.start.line}`);
  }
});
```
**Install acorn:** `npm install acorn acorn-walk`

### 3.2 Regex-Based Pattern Matching
**What it does:** Fast pattern matching for known anti-patterns without needing a full parser.
**Usage:**
```bash
# Find all fetch() calls without error handling
grep -n "fetch(" file.html | grep -v "catch\|try"

# Find innerHTML assignments (XSS risk)
grep -n "\.innerHTML\s*=" file.html

# Find eval() usage
grep -n "eval(" file.html

# Find hardcoded API URLs
grep -n "https://script.google.com" file.html | grep -v "api-config"
```

### 3.3 JSON Schema Validation
**What it does:** Validate API response shapes against expected schemas.
**Usage:**
```javascript
// Define expected schema
const schema = {
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object' }
  }
};

// Fetch and validate
const response = await fetch(url);
const json = await response.json();
// Check each required field exists and has correct type
```

---

## Section 4: Manual Techniques

These require human judgment but are the most powerful.

### 4.1 Control Flow Tracing
**How:** Pick a user action (e.g., "user clicks POST NOW"). Trace every function call from the event handler through to the API call and response handling. Document each step.
**Finds:** Logic errors, missing error handling, wrong function being called, race conditions.

### 4.2 State Machine Verification
**How:** For any multi-step flow (like the schedule flow), map out all possible states and transitions. Verify that every transition is handled and no state is reachable-but-unhandled.
**Finds:** Stuck states, impossible transitions, missing reset logic.

### 4.3 Cross-Reference Audit
**How:** When frontend code sends `{action: 'schedulePost'}`, search the backend for a handler for 'schedulePost'. Verify the request fields match what the backend expects.
**Finds:** Typos in action names, missing fields, wrong field names.

### 4.4 "What If" Analysis
**How:** For each function, ask: What if the input is null? Empty string? Very large? HTML? A script tag? A number when a string is expected?
**Finds:** Null pointer errors, XSS, type confusion, buffer issues.

### 4.5 Diff-Based Regression Check
**How:** Compare the current file against the last known-good version. For every change, verify it was intentional and does not break anything.
**Finds:** Accidental deletions, unintended side effects of edits.

---

## Section 5: Tool Installation Quick Reference

Run this once to set up the full toolkit:

```bash
# Core analysis tools
npm install -g eslint semgrep lighthouse pa11y html-validate retire

# Browser automation
npm install -g playwright && npx playwright install chromium

# AST parsing (install locally in project)
cd /Users/samanthapollack/Documents/TIny_Seed_OS
npm install acorn acorn-walk

# CSS analysis
npm install -g purgecss

# Accessibility
npm install -g @axe-core/cli
```

---

## Section 6: Tool Selection by Audit Category

| Category | Primary Tool | Secondary Tool | Manual Check |
|----------|-------------|----------------|--------------|
| Duplicate Functions | duplicate-function-detector.js | ESLint no-redeclare | Read function bodies |
| Dead Code | dead-code-finder.js | ESLint no-unused-vars | Trace call graph |
| DOM Orphans | dom-orphan-checker.sh | validate-element-refs.sh | Runtime in browser |
| API Contracts | api-contract-validator.js | curl + jq | Cross-reference backend |
| Security (XSS) | Semgrep p/xss | ESLint security plugin | innerHTML audit |
| Security (Injection) | Semgrep p/owasp-top-ten | -- | Input sanitization review |
| Security (Secrets) | Semgrep p/secrets | grep for API keys | .env review |
| Performance | Lighthouse | -- | Bundle size check |
| Accessibility | Pa11y / axe-core | Lighthouse a11y | Keyboard nav test |
| CSS Quality | unused-css-finder.sh | PurgeCSS | Visual inspection |
| HTML Validity | html-validate | W3C validator | Tag nesting review |
| Async Patterns | async-pattern-checker.sh | ESLint no-floating-promises | Trace async flows |
| Event Listeners | event-listener-auditor.js | -- | Memory profiling |
| Stub Functions | stub-function-detector.js | -- | Read function bodies |
| Visual Integrity | Playwright screenshots | -- | Compare across viewports |
| Dependency Vulns | Retire.js | npm audit | Check library versions |
