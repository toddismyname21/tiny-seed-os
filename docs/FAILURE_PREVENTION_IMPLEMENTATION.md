# Agent Failure Prevention Implementation Plan

> **Purpose:** Actionable implementation guide for preventing agent failures in Tiny Seed OS
> **Created:** 2026-02-12
> **Based on:** AGENT_FAILURE_PREVENTION_PATTERNS.md, NICHE_FORUMS_PRACTICAL_SOLUTIONS.md
> **Status:** Implementation Ready

---

## Table of Contents

1. [Circuit Breakers](#1-circuit-breakers)
2. [Verification Gates](#2-verification-gates)
3. [Documentation Drift Prevention](#3-documentation-drift-prevention)
4. [Scope Enforcement](#4-scope-enforcement)
5. [Implementation Checklist](#5-implementation-checklist)

---

## 1. Circuit Breakers

### Overview

Circuit breakers prevent cascading failures by stopping agent operations when failure thresholds are exceeded. Based on the research, we need both **failure-based** and **behavioral** circuit breakers.

### What Triggers Circuit Breakers

| Trigger Type | Threshold | Action |
|--------------|-----------|--------|
| **Consecutive Failures** | 5 failures in sequence | Open circuit, pause agent |
| **Error Rate** | >50% failures in 10-minute window | Open circuit, alert human |
| **Repeated Same Action** | Same action 3+ times consecutively | Trip breaker, force new approach |
| **Escalating Scope** | Actions progressively more impactful | Trip breaker, require approval |
| **Resource Exhaustion** | Token/API limits exceeded | Throttle, then stop |
| **Cost Threshold** | Hourly/daily cost limit hit | Kill switch activation |

### Implementation in Our System

#### File to Create: `/scripts/circuit_breaker.js`

```javascript
/**
 * Circuit Breaker for Tiny Seed OS Agent System
 * Implements failure-based and behavioral circuit breakers
 */

const fs = require('fs');
const path = require('path');

const BREAKER_STATE_FILE = path.join(__dirname, '..', 'tinypm', '.circuit_breaker_state.json');

const CircuitState = {
  CLOSED: 'CLOSED',      // Normal operation
  OPEN: 'OPEN',          // Failing, rejecting requests
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

const THRESHOLDS = {
  failure_threshold: 5,           // Failures before opening circuit
  recovery_timeout_ms: 60000,     // 1 minute before testing recovery
  half_open_success_threshold: 3, // Successes needed to close
  max_iterations: 30,             // LangChain-style iteration limit
  max_execution_time_ms: 120000,  // 2 minute timeout
  repeated_action_limit: 3,       // Same action limit
  error_rate_threshold: 0.5,      // 50% error rate
  error_rate_window_ms: 600000    // 10 minute window
};

class AgentCircuitBreaker {
  constructor(agentId) {
    this.agentId = agentId;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.actionHistory = [];
    this.recentResults = []; // For error rate calculation
  }

  // Check if agent can proceed
  canProceed() {
    this.loadState();

    if (this.state === CircuitState.OPEN) {
      // Check if recovery timeout elapsed
      if (Date.now() - this.lastFailureTime > THRESHOLDS.recovery_timeout_ms) {
        this.state = CircuitState.HALF_OPEN;
        this.saveState();
        return { canProceed: true, state: CircuitState.HALF_OPEN, message: 'Circuit half-open, testing recovery' };
      }
      return { canProceed: false, state: CircuitState.OPEN, message: `Circuit open. Wait ${Math.ceil((THRESHOLDS.recovery_timeout_ms - (Date.now() - this.lastFailureTime))/1000)}s` };
    }

    return { canProceed: true, state: this.state, message: 'Proceed' };
  }

  // Record success
  recordSuccess() {
    this.loadState();
    this.recentResults.push({ success: true, timestamp: Date.now() });
    this.cleanOldResults();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= THRESHOLDS.half_open_success_threshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        console.log(`[CircuitBreaker] ${this.agentId}: Circuit CLOSED - recovered`);
      }
    } else {
      this.failureCount = 0; // Reset on success in closed state
    }

    this.saveState();
    return { state: this.state };
  }

  // Record failure
  recordFailure(errorType = 'unknown') {
    this.loadState();
    this.recentResults.push({ success: false, timestamp: Date.now(), errorType });
    this.cleanOldResults();

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery test
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      console.log(`[CircuitBreaker] ${this.agentId}: Circuit OPEN - recovery failed`);
    } else if (this.failureCount >= THRESHOLDS.failure_threshold) {
      this.state = CircuitState.OPEN;
      console.log(`[CircuitBreaker] ${this.agentId}: Circuit OPEN - ${this.failureCount} failures`);
    }

    // Check error rate
    const errorRate = this.calculateErrorRate();
    if (errorRate > THRESHOLDS.error_rate_threshold) {
      this.state = CircuitState.OPEN;
      console.log(`[CircuitBreaker] ${this.agentId}: Circuit OPEN - error rate ${(errorRate * 100).toFixed(1)}%`);
    }

    this.saveState();
    return { state: this.state, failureCount: this.failureCount, errorRate };
  }

  // Behavioral check: repeated same action
  checkBehavioralPattern(action) {
    this.loadState();
    this.actionHistory.push({ action: JSON.stringify(action), timestamp: Date.now() });

    // Keep last 10 actions
    if (this.actionHistory.length > 10) {
      this.actionHistory = this.actionHistory.slice(-10);
    }

    // Check for repeated same action
    if (this.actionHistory.length >= THRESHOLDS.repeated_action_limit) {
      const lastN = this.actionHistory.slice(-THRESHOLDS.repeated_action_limit);
      const allSame = lastN.every(a => a.action === lastN[0].action);

      if (allSame) {
        this.state = CircuitState.OPEN;
        this.lastFailureTime = Date.now();
        this.saveState();
        return {
          blocked: true,
          reason: `Repeated same action ${THRESHOLDS.repeated_action_limit} times`,
          pattern: 'REPEATED_SAME_ACTION'
        };
      }
    }

    this.saveState();
    return { blocked: false };
  }

  // Calculate error rate over window
  calculateErrorRate() {
    this.cleanOldResults();
    if (this.recentResults.length === 0) return 0;
    const failures = this.recentResults.filter(r => !r.success).length;
    return failures / this.recentResults.length;
  }

  // Remove results outside the error rate window
  cleanOldResults() {
    const cutoff = Date.now() - THRESHOLDS.error_rate_window_ms;
    this.recentResults = this.recentResults.filter(r => r.timestamp > cutoff);
  }

  // Manual reset (for human intervention)
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.actionHistory = [];
    this.recentResults = [];
    this.saveState();
    return { state: this.state, message: 'Circuit breaker reset' };
  }

  // Persistence
  loadState() {
    try {
      if (fs.existsSync(BREAKER_STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(BREAKER_STATE_FILE, 'utf-8'));
        if (data[this.agentId]) {
          Object.assign(this, data[this.agentId]);
        }
      }
    } catch (e) {
      console.error('Error loading circuit breaker state:', e.message);
    }
  }

  saveState() {
    try {
      let data = {};
      if (fs.existsSync(BREAKER_STATE_FILE)) {
        data = JSON.parse(fs.readFileSync(BREAKER_STATE_FILE, 'utf-8'));
      }
      data[this.agentId] = {
        state: this.state,
        failureCount: this.failureCount,
        successCount: this.successCount,
        lastFailureTime: this.lastFailureTime,
        actionHistory: this.actionHistory,
        recentResults: this.recentResults
      };
      fs.writeFileSync(BREAKER_STATE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error saving circuit breaker state:', e.message);
    }
  }
}

// Kill switch for emergency stops
class KillSwitch {
  constructor() {
    this.enabled = true;
    this.killConditions = [];
  }

  addCondition(name, checkFn, reason) {
    this.killConditions.push({ name, check: checkFn, reason });
  }

  checkBeforeAction() {
    if (!this.enabled) {
      return { killed: true, reason: 'Kill switch activated' };
    }

    for (const condition of this.killConditions) {
      if (condition.check()) {
        this.enabled = false;
        return { killed: true, reason: condition.reason, condition: condition.name };
      }
    }

    return { killed: false };
  }

  kill(reason) {
    this.enabled = false;
    console.log(`[KillSwitch] ACTIVATED: ${reason}`);
    return { killed: true, reason };
  }

  reactivate() {
    this.enabled = true;
    return { enabled: true };
  }
}

module.exports = {
  AgentCircuitBreaker,
  KillSwitch,
  CircuitState,
  THRESHOLDS
};
```

### Integration with Existing System

#### Modify: `/scripts/pre-flight-check.sh`

Add circuit breaker check as CHECK 0 (before all other checks):

```bash
# =============================================================================
# CHECK 0: CIRCUIT BREAKER CHECK
# =============================================================================
echo -e "${BLUE}[CHECK 0]${NC} Circuit Breaker Status..."

if [ -n "$AGENT" ] && [ "$AGENT" != "unknown" ]; then
    BREAKER_STATUS=$(node "$SCRIPT_DIR/circuit_breaker_cli.js" check "$AGENT" 2>/dev/null || echo '{"canProceed":true}')
    CAN_PROCEED=$(echo "$BREAKER_STATUS" | grep -o '"canProceed":[^,}]*' | cut -d':' -f2)

    if [ "$CAN_PROCEED" = "false" ]; then
        echo -e "  ${RED}CRITICAL: Circuit breaker is OPEN for $AGENT${NC}"
        echo -e "  ${RED}Agent must wait for recovery timeout or human intervention${NC}"
        ((CRITICAL++))
    else
        BREAKER_STATE=$(echo "$BREAKER_STATUS" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
        echo -e "  ${GREEN}PASS: Circuit breaker state: $BREAKER_STATE${NC}"
    fi
else
    echo -e "  ${YELLOW}SKIP: No agent specified${NC}"
fi
```

### Recovery Procedures

#### Automatic Recovery

1. **Timeout-based**: After `recovery_timeout_ms` (60 seconds), circuit enters HALF_OPEN
2. **Success-based**: 3 consecutive successes in HALF_OPEN state closes circuit
3. **Gradual**: First request in HALF_OPEN is a test request

#### Manual Recovery

```bash
# Check circuit breaker status
node scripts/circuit_breaker_cli.js status Backend_Claude

# Reset a specific agent's circuit breaker
node scripts/circuit_breaker_cli.js reset Backend_Claude

# Reset all circuit breakers (emergency)
node scripts/circuit_breaker_cli.js reset-all
```

#### Escalation Procedure

When circuit opens:
1. Log event to governor audit trail
2. Notify PM_Architect via console output
3. If error budget also exceeded, block all operations until human review
4. Human must either:
   - Reset circuit breaker after investigating root cause
   - Reduce agent's scope/permissions
   - Address underlying issue

### How to Verify It's Working

```bash
# Test 1: Simulate failures to trigger circuit breaker
node scripts/circuit_breaker_cli.js test-failure Backend_Claude
node scripts/circuit_breaker_cli.js test-failure Backend_Claude
node scripts/circuit_breaker_cli.js test-failure Backend_Claude
node scripts/circuit_breaker_cli.js test-failure Backend_Claude
node scripts/circuit_breaker_cli.js test-failure Backend_Claude

# Check status - should be OPEN
node scripts/circuit_breaker_cli.js status Backend_Claude
# Expected output: { "canProceed": false, "state": "OPEN", ... }

# Test 2: Run pre-flight check - should show CRITICAL
./scripts/pre-flight-check.sh test.html create Backend_Claude
# Expected: "[CHECK 0] CRITICAL: Circuit breaker is OPEN for Backend_Claude"

# Test 3: Wait 60 seconds, then test recovery
sleep 60
node scripts/circuit_breaker_cli.js test-success Backend_Claude
node scripts/circuit_breaker_cli.js status Backend_Claude
# Expected output: { "state": "HALF_OPEN", ... }
```

---

## 2. Verification Gates

### Overview

Verification gates ensure agents cannot claim task completion without evidence. The key rule: **No direct path from IMPLEMENTED to DONE**.

### Pre-Execution Gates

| Gate | Trigger | Checks | Blocking? |
|------|---------|--------|-----------|
| **Circuit Breaker** | Any action | Agent not in OPEN state | Yes |
| **Error Budget** | High-risk actions | Agent has budget remaining | Yes |
| **Role Boundary** | File operations | File within agent's scope | Yes |
| **Duplicate Check** | File creation | No similar files exist | Yes |
| **Recent Changes** | File modification | File not recently modified by others | Warning |

### Post-Execution Verification

| Task Type | Verification Method | Evidence Required |
|-----------|---------------------|-------------------|
| **Bug Fix** | `validate-element-refs.sh`, syntax check | Test output log |
| **File Creation** | File exists, non-empty, parses | File stats |
| **UI Change** | Element ID exists in HTML | Line number reference |
| **API Change** | curl endpoint, check response | HTTP status + body |
| **Deployment** | Health check URL | HTTP 200 response |

### Evidence Requirements by Task Type

```javascript
// Evidence requirements configuration
const EVIDENCE_REQUIREMENTS = {
  bug_fix: {
    required: ['test_output'],
    optional: ['screenshot', 'log_snippet'],
    automated_check: 'validate-element-refs.sh'
  },
  file_creation: {
    required: ['file_exists'],
    optional: ['syntax_check'],
    automated_check: 'verify_file_created'
  },
  ui_change: {
    required: ['element_exists', 'screenshot'],
    optional: ['user_confirmation'],
    automated_check: 'verify_ui_change'
  },
  api_change: {
    required: ['api_response'],
    optional: ['test_output'],
    automated_check: 'verify_api_endpoint'
  },
  deployment: {
    required: ['health_check', 'deployment_log'],
    optional: ['user_confirmation'],
    automated_check: 'verify_deployment'
  }
};
```

### Implementation: Enhanced Verification Flow

#### File to Modify: `/scripts/verify-completion.sh`

Add the following new verification types:

```bash
# Add to the case statement in verify-completion.sh

"code_change")
    verify_code_change "$TARGET"
    ;;

"documentation_update")
    verify_documentation_update "$TARGET"
    ;;

"config_change")
    verify_config_change "$TARGET"
    ;;
```

Add these functions:

```bash
verify_code_change() {
    local file_path="$1"

    if [[ ! "$file_path" = /* ]]; then
        file_path="$PROJECT_ROOT/$file_path"
    fi

    echo "Verifying code change for: $file_path"

    # Check file exists
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}FAILED: File does not exist${NC}"
        return 1
    fi

    # Check git shows changes
    cd "$PROJECT_ROOT"
    local git_diff=$(git diff --stat -- "$file_path" 2>/dev/null)
    local git_diff_staged=$(git diff --cached --stat -- "$file_path" 2>/dev/null)

    if [ -z "$git_diff" ] && [ -z "$git_diff_staged" ]; then
        # Check if file is new (untracked)
        local is_untracked=$(git status --porcelain -- "$file_path" 2>/dev/null | grep "^??")
        if [ -z "$is_untracked" ]; then
            echo -e "${RED}FAILED: No changes detected in git${NC}"
            return 1
        fi
    fi

    # Syntax validation based on file type
    local ext="${file_path##*.}"
    case "$ext" in
        js)
            if command -v node &> /dev/null; then
                if ! node --check "$file_path" 2>/dev/null; then
                    echo -e "${RED}FAILED: JavaScript syntax error${NC}"
                    return 1
                fi
            fi
            ;;
        json)
            if ! python3 -c "import json; json.load(open('$file_path'))" 2>/dev/null; then
                echo -e "${RED}FAILED: Invalid JSON${NC}"
                return 1
            fi
            ;;
        sh)
            if ! bash -n "$file_path" 2>/dev/null; then
                echo -e "${RED}FAILED: Bash syntax error${NC}"
                return 1
            fi
            ;;
    esac

    echo -e "${GREEN}VERIFIED: Code change validated${NC}"
    return 0
}

verify_documentation_update() {
    local doc_path="$1"

    if [[ ! "$doc_path" = /* ]]; then
        doc_path="$PROJECT_ROOT/$doc_path"
    fi

    echo "Verifying documentation update: $doc_path"

    # Check file exists
    if [ ! -f "$doc_path" ]; then
        echo -e "${RED}FAILED: Documentation file does not exist${NC}"
        return 1
    fi

    # Check it's a markdown file
    if [[ ! "$doc_path" == *.md ]]; then
        echo -e "${YELLOW}WARNING: Not a markdown file${NC}"
    fi

    # Check for common markdown issues
    # - Empty sections
    local empty_sections=$(grep -E "^#+\s+.*$" "$doc_path" | while read header; do
        # This is a simplified check
        echo "Checking: $header"
    done)

    # Check links work (basic check for relative links)
    local broken_links=0
    grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$doc_path" | while read link; do
        local target=$(echo "$link" | grep -oE '\(([^)]+)\)' | tr -d '()')
        # Check if it's a relative link and file exists
        if [[ "$target" != http* ]] && [[ "$target" != "#"* ]]; then
            local full_path="$(dirname "$doc_path")/$target"
            if [ ! -f "$full_path" ]; then
                echo -e "${YELLOW}WARNING: Broken link: $target${NC}"
            fi
        fi
    done

    echo -e "${GREEN}VERIFIED: Documentation updated${NC}"
    return 0
}
```

### Integration with Governor System

The existing `governor_helpers.js` already implements verification gate functions. Here's how to use them:

```bash
# Task flow with verification gates

# 1. Agent claims implementation complete
node scripts/governor_helpers.js transition TASK-001 IN_PROGRESS IMPLEMENTED Backend_Claude

# 2. Agent submits proof of success (REQUIRED)
node scripts/governor_helpers.js submit-proof Backend_Claude TASK-001 \
  '{"type":"test_output","description":"All validation passes","content":"VALIDATION PASSED: 47 element references validated"}'

# 3. Agent moves to awaiting verification (REQUIRED - cannot skip to DONE)
node scripts/governor_helpers.js transition TASK-001 IMPLEMENTED AWAITING_VERIFICATION Backend_Claude

# 4. Verifier validates the proof
node scripts/governor_helpers.js validate-proof Verifier_Claude TASK-001 PROOF-TASK-001-xxx true "Confirmed fix works"

# 5. If proof passes, transition to VERIFIED
node scripts/governor_helpers.js transition TASK-001 AWAITING_VERIFICATION VERIFIED Verifier_Claude

# 6. NOW agent can mark as DONE
node scripts/governor_helpers.js can-complete Backend_Claude TASK-001 \
  '{"currentState":"VERIFIED","proofs":[{"passed":true}],"verifierApproved":true}'
# Returns: {"canComplete": true, ...}
```

### How to Verify It's Working

```bash
# Test 1: Try to skip verification (should fail)
node scripts/governor_helpers.js transition TASK-TEST IMPLEMENTED DONE Backend_Claude
# Expected: {"success": false, "error": "Invalid transition: IMPLEMENTED -> DONE"}

# Test 2: Follow correct flow
node scripts/governor_helpers.js transition TASK-TEST PENDING IN_PROGRESS Backend_Claude
node scripts/governor_helpers.js transition TASK-TEST IN_PROGRESS IMPLEMENTED Backend_Claude
node scripts/governor_helpers.js submit-proof Backend_Claude TASK-TEST \
  '{"type":"test_output","description":"Test","content":"PASS"}'
node scripts/governor_helpers.js transition TASK-TEST IMPLEMENTED AWAITING_VERIFICATION Backend_Claude
# Should all succeed

# Test 3: Check task status
node scripts/governor_helpers.js task-status TASK-TEST
# Expected: Shows state history and proofs

# Test 4: Verify verify-completion.sh works
./scripts/verify-completion.sh file_created index.html
# Expected: VERIFIED if file exists, FAILED if not
```

---

## 3. Documentation Drift Prevention

### Overview

Documentation drift occurs when docs no longer match code reality. Prevention requires:
1. Code as source of truth
2. Automated consistency checks
3. CI/CD enforcement

### How to Keep Docs in Sync with Code

#### Strategy: Single Source of Truth

```
Code (apps_script/, web_app/)
    ↓ generates ↓
API Documentation (auto-generated)
    ↓ links to ↓
User Documentation (manually curated, links to generated docs)
```

#### File to Create: `/scripts/check-doc-drift.sh`

```bash
#!/bin/bash
# =============================================================================
# DOCUMENTATION DRIFT CHECKER
# =============================================================================
# Detects when documentation no longer matches code reality
# Run as part of CI/CD or pre-commit
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

DRIFT_FOUND=0
WARNINGS=0

echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}   DOCUMENTATION DRIFT CHECK${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# =============================================================================
# CHECK 1: SYSTEM_MANIFEST.md vs Actual Files
# =============================================================================
echo -e "${BLUE}[CHECK 1]${NC} SYSTEM_MANIFEST.md accuracy..."

MANIFEST="$BASE_DIR/claude_sessions/pm_architect/SYSTEM_MANIFEST.md"

if [ -f "$MANIFEST" ]; then
    # Check for files mentioned in manifest that don't exist
    PHANTOM_FILES=0

    # Extract file paths from manifest (looking for patterns like `file.js`, `/path/file.html`)
    grep -oE '[a-zA-Z0-9_/-]+\.(js|html|md|json|css|sh)' "$MANIFEST" 2>/dev/null | sort -u | while read file; do
        # Skip common false positives
        if [[ "$file" == *.example.* ]] || [[ "$file" == "example."* ]]; then
            continue
        fi

        # Try to find the file
        if ! find "$BASE_DIR" -name "$(basename "$file")" -type f 2>/dev/null | head -1 | grep -q .; then
            echo -e "  ${YELLOW}WARNING: File in manifest but not found: $file${NC}"
            ((WARNINGS++)) || true
        fi
    done

    # Check for key files NOT in manifest
    for important_file in "MERGED TOTAL.js" "index.html" "api-config.js" "auth-guard.js"; do
        if ! grep -q "$important_file" "$MANIFEST" 2>/dev/null; then
            echo -e "  ${YELLOW}WARNING: Important file not documented: $important_file${NC}"
            ((WARNINGS++)) || true
        fi
    done

    echo -e "  ${GREEN}Manifest check complete${NC}"
else
    echo -e "  ${RED}ERROR: SYSTEM_MANIFEST.md not found!${NC}"
    ((DRIFT_FOUND++))
fi

# =============================================================================
# CHECK 2: API Documentation vs Code
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 2]${NC} API endpoint documentation..."

# Extract documented endpoints from any API docs
API_DOC="$BASE_DIR/docs/API_REFERENCE.md"
MAIN_SCRIPT="$BASE_DIR/apps_script/MERGED TOTAL.js"

if [ -f "$MAIN_SCRIPT" ]; then
    # Count action handlers in code
    CODE_ENDPOINTS=$(grep -c "case ['\"]" "$MAIN_SCRIPT" 2>/dev/null || echo "0")
    echo "  Found approximately $CODE_ENDPOINTS action handlers in code"

    if [ -f "$API_DOC" ]; then
        # Count documented endpoints
        DOC_ENDPOINTS=$(grep -cE "^###.*action=" "$API_DOC" 2>/dev/null || grep -cE "action=" "$API_DOC" 2>/dev/null || echo "0")
        echo "  Found approximately $DOC_ENDPOINTS documented endpoints"

        # Check for significant drift
        DIFF=$((CODE_ENDPOINTS - DOC_ENDPOINTS))
        if [ ${DIFF#-} -gt 20 ]; then
            echo -e "  ${YELLOW}WARNING: Large difference between code and docs (${DIFF})${NC}"
            ((WARNINGS++))
        else
            echo -e "  ${GREEN}PASS: Endpoint counts approximately match${NC}"
        fi
    else
        echo -e "  ${YELLOW}INFO: No API_REFERENCE.md found - consider generating one${NC}"
    fi
fi

# =============================================================================
# CHECK 3: CLAUDE.md Rules vs Actual Enforcement
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 3]${NC} CLAUDE.md enforcement verification..."

CLAUDE_MD="$BASE_DIR/CLAUDE.md"

if [ -f "$CLAUDE_MD" ]; then
    # Check if pre-flight-check.sh exists (mentioned in CLAUDE.md)
    if grep -q "pre-flight-check.sh" "$CLAUDE_MD" && [ ! -x "$BASE_DIR/scripts/pre-flight-check.sh" ]; then
        echo -e "  ${RED}DRIFT: CLAUDE.md references pre-flight-check.sh but it's not executable${NC}"
        ((DRIFT_FOUND++))
    fi

    # Check if governor_helpers.js exists
    if grep -q "governor_helpers.js" "$CLAUDE_MD" && [ ! -f "$BASE_DIR/scripts/governor_helpers.js" ]; then
        echo -e "  ${RED}DRIFT: CLAUDE.md references governor_helpers.js but it doesn't exist${NC}"
        ((DRIFT_FOUND++))
    fi

    # Check API URL consistency
    CLAUDE_API=$(grep -oE 'AKfycby[a-zA-Z0-9_-]+' "$CLAUDE_MD" | head -1)
    if [ -f "$BASE_DIR/web_app/api-config.js" ]; then
        CONFIG_API=$(grep -oE 'AKfycby[a-zA-Z0-9_-]+' "$BASE_DIR/web_app/api-config.js" | head -1)
        if [ "$CLAUDE_API" != "$CONFIG_API" ]; then
            echo -e "  ${RED}DRIFT: API URL in CLAUDE.md doesn't match api-config.js${NC}"
            ((DRIFT_FOUND++))
        else
            echo -e "  ${GREEN}PASS: API URLs consistent${NC}"
        fi
    fi

    echo -e "  ${GREEN}CLAUDE.md enforcement check complete${NC}"
else
    echo -e "  ${RED}ERROR: CLAUDE.md not found!${NC}"
    ((DRIFT_FOUND++))
fi

# =============================================================================
# CHECK 4: Dashboard List in CLAUDE.md vs Actual Dashboards
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 4]${NC} Dashboard documentation accuracy..."

if [ -f "$CLAUDE_MD" ]; then
    # Find actual dashboards
    ACTUAL_DASHBOARDS=$(find "$BASE_DIR" -name "*[Dd]ashboard*.html" -type f 2>/dev/null | wc -l)

    # Count documented dashboards (rough estimate from the table in CLAUDE.md)
    DOCUMENTED_DASHBOARDS=$(grep -c "Dashboard" "$CLAUDE_MD" | head -1 || echo "0")

    echo "  Actual dashboard files: $ACTUAL_DASHBOARDS"
    echo "  Documented mentions: ~$DOCUMENTED_DASHBOARDS"

    # List any undocumented dashboards
    find "$BASE_DIR" -name "*[Dd]ashboard*.html" -type f 2>/dev/null | while read dashboard; do
        basename_dash=$(basename "$dashboard")
        if ! grep -q "$basename_dash" "$CLAUDE_MD" 2>/dev/null; then
            echo -e "  ${YELLOW}WARNING: Undocumented dashboard: $basename_dash${NC}"
            ((WARNINGS++)) || true
        fi
    done
fi

# =============================================================================
# CHECK 5: CHANGE_LOG.md Recency
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 5]${NC} CHANGE_LOG.md maintenance..."

CHANGE_LOG="$BASE_DIR/CHANGE_LOG.md"

if [ -f "$CHANGE_LOG" ]; then
    # Get most recent date in CHANGE_LOG
    LAST_ENTRY=$(grep -oE "20[0-9]{2}-[0-9]{2}-[0-9]{2}" "$CHANGE_LOG" | head -1)

    if [ -n "$LAST_ENTRY" ]; then
        # Calculate days since last entry
        LAST_EPOCH=$(date -j -f "%Y-%m-%d" "$LAST_ENTRY" "+%s" 2>/dev/null || date -d "$LAST_ENTRY" "+%s" 2>/dev/null || echo "0")
        NOW_EPOCH=$(date "+%s")
        DAYS_AGO=$(( (NOW_EPOCH - LAST_EPOCH) / 86400 ))

        echo "  Last CHANGE_LOG entry: $LAST_ENTRY ($DAYS_AGO days ago)"

        if [ "$DAYS_AGO" -gt 7 ]; then
            echo -e "  ${YELLOW}WARNING: CHANGE_LOG hasn't been updated in over a week${NC}"
            ((WARNINGS++))
        else
            echo -e "  ${GREEN}PASS: CHANGE_LOG is being maintained${NC}"
        fi
    fi
else
    echo -e "  ${RED}ERROR: CHANGE_LOG.md not found!${NC}"
    ((DRIFT_FOUND++))
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}   DOCUMENTATION DRIFT SUMMARY${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

if [ $DRIFT_FOUND -gt 0 ]; then
    echo -e "${RED}DRIFT DETECTED: $DRIFT_FOUND issue(s) found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}WARNINGS: $WARNINGS${NC}"
fi

if [ $DRIFT_FOUND -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}ALL CHECKS PASSED - No significant drift detected${NC}"
fi

echo ""

# Exit with appropriate code
if [ $DRIFT_FOUND -gt 0 ]; then
    exit 2  # Critical drift
elif [ $WARNINGS -gt 0 ]; then
    exit 1  # Warnings only
else
    exit 0  # All good
fi
```

### Automated Checks

Add to `.git/hooks/pre-commit` (or create):

```bash
#!/bin/bash
# Run documentation drift check before commit

echo "Running documentation drift check..."
./scripts/check-doc-drift.sh

if [ $? -eq 2 ]; then
    echo "COMMIT BLOCKED: Critical documentation drift detected"
    echo "Please update documentation before committing"
    exit 1
fi

# Also run validate-api-urls.sh if it exists
if [ -x "./scripts/validate-api-urls.sh" ]; then
    ./scripts/validate-api-urls.sh
fi
```

### Single Source of Truth Enforcement

#### Configuration: `/.docconfig.json` (new file)

```json
{
  "singleSourceOfTruth": {
    "apiUrl": "web_app/api-config.js",
    "agentRoles": "claude_sessions/pm_architect/CLAUDE_ROLES.md",
    "fileManifest": "claude_sessions/pm_architect/SYSTEM_MANIFEST.md",
    "changeTracking": "CHANGE_LOG.md"
  },
  "generatedDocs": {
    "apiReference": {
      "source": "apps_script/MERGED TOTAL.js",
      "target": "docs/API_REFERENCE.md",
      "generator": "scripts/generate-api-docs.sh"
    }
  },
  "syncRules": [
    {
      "source": "web_app/api-config.js",
      "mustMatch": ["CLAUDE.md", "apps_script/*.js"],
      "pattern": "AKfycby[a-zA-Z0-9_-]+"
    }
  ]
}
```

### How to Verify It's Working

```bash
# Test 1: Run drift check
./scripts/check-doc-drift.sh
# Should show all checks and any warnings/errors

# Test 2: Intentionally create drift
# Comment out a documented endpoint, then run check
# Should detect the drift

# Test 3: Check pre-commit hook
git add -A && git commit -m "Test commit"
# Should run drift check automatically
```

---

## 4. Scope Enforcement

### Overview

Scope enforcement prevents agents from modifying files outside their designated role boundaries. This prevents cross-contamination and maintains system integrity.

### Role-to-File Mapping

| Role | Allowed Paths | Forbidden Paths |
|------|---------------|-----------------|
| **Backend_Claude** | `apps_script/*.js` | `*.html`, `web_app/`, `tinypm/` |
| **Desktop_Claude** | `*.html`, `web_app/`, `!*employee*` | `apps_script/`, `tinypm/` |
| **Mobile_Claude** | `*employee*.html`, `*mobile*`, `*pwa*` | `apps_script/`, non-mobile web_app/ |
| **UX_Design_Claude** | `*.css`, `*style*`, `*design*` | `apps_script/`, `tinypm/` |
| **Security_Claude** | `*auth*`, `*security*`, `*permission*` | Everything else |
| **PM_Architect** | `*.md`, `claude_sessions/`, `docs/` | Production code files |

### Integration with pre-flight-check.sh

The existing pre-flight-check.sh already has CHECK 3 for role boundaries. Enhance it:

#### File to Modify: `/scripts/pre-flight-check.sh`

Replace the `check_role_boundary` function with this enhanced version:

```bash
# Enhanced role boundary check with explicit allow/deny lists
check_role_boundary() {
    local file="$1"
    local agent="$2"

    # Normalize file path
    file=$(echo "$file" | sed 's|^\./||')

    case "$agent" in
        "Backend_Claude")
            # ALLOW: Only apps_script/*.js
            if [[ "$file" == apps_script/*.js ]] || [[ "$file" == */apps_script/*.js ]]; then
                echo "PASS"
            elif [[ "$file" == *.js ]]; then
                echo "FAIL:Backend_Claude can only modify JavaScript files in /apps_script/ directory"
            else
                echo "FAIL:Backend_Claude can only modify /apps_script/*.js files"
            fi
            ;;

        "Desktop_Claude")
            # ALLOW: *.html and web_app/* (except employee/mobile)
            # DENY: apps_script/, employee*, mobile*
            if [[ "$file" == *employee* ]] || [[ "$file" == *mobile* ]]; then
                echo "FAIL:Desktop_Claude cannot modify employee/mobile files (use Mobile_Claude)"
            elif [[ "$file" == apps_script/* ]]; then
                echo "FAIL:Desktop_Claude cannot modify apps_script/ (use Backend_Claude)"
            elif [[ "$file" == *.html ]] || [[ "$file" == web_app/* ]]; then
                echo "PASS"
            else
                echo "WARN:Desktop_Claude typically modifies HTML and web_app files"
            fi
            ;;

        "Mobile_Claude")
            # ALLOW: *employee*.html, *mobile*, *pwa*
            if [[ "$file" == *employee* ]] || [[ "$file" == *mobile* ]] || [[ "$file" == *pwa* ]]; then
                echo "PASS"
            else
                echo "FAIL:Mobile_Claude can only modify employee/mobile/PWA files"
            fi
            ;;

        "UX_Design_Claude")
            # ALLOW: *.css, *style*, *design*
            if [[ "$file" == *.css ]] || [[ "$file" == *style* ]] || [[ "$file" == *design* ]]; then
                echo "PASS"
            elif [[ "$file" == apps_script/* ]]; then
                echo "FAIL:UX_Design_Claude cannot modify backend code"
            else
                echo "WARN:UX_Design_Claude should focus on CSS and design files"
            fi
            ;;

        "Security_Claude")
            # ALLOW: *auth*, *security*, *permission*, *guard*
            if [[ "$file" == *auth* ]] || [[ "$file" == *security* ]] || [[ "$file" == *permission* ]] || [[ "$file" == *guard* ]]; then
                echo "PASS"
            else
                echo "FAIL:Security_Claude can only modify auth, security, and permission files"
            fi
            ;;

        "PM_Architect")
            # ALLOW: *.md, claude_sessions/, docs/, scripts/ (for coordination), config files
            if [[ "$file" == *.md ]] || [[ "$file" == claude_sessions/* ]] || [[ "$file" == docs/* ]]; then
                echo "PASS"
            elif [[ "$file" == scripts/*.sh ]] || [[ "$file" == scripts/*.js ]]; then
                echo "WARN:PM_Architect modifying scripts - ensure it's for coordination, not features"
            elif [[ "$file" == *.json ]] && [[ "$file" == config/* ]]; then
                echo "PASS"
            elif [[ "$file" == apps_script/*.js ]] || [[ "$file" == web_app/*.html ]]; then
                echo "FAIL:PM_Architect should not modify production code directly"
            else
                echo "WARN:PM_Architect should primarily modify documentation and coordination files"
            fi
            ;;

        "Verifier_Claude"|"Critic_Claude")
            # READ-ONLY - should not modify files
            echo "FAIL:${agent} is a verification role and should not modify files"
            ;;

        *)
            echo "UNKNOWN:Agent role not recognized: $agent"
            ;;
    esac
}
```

### Consequences for Violations

#### Violation Handling Flow

```
Agent attempts file operation
    ↓
pre-flight-check.sh runs
    ↓
Role boundary check fails
    ↓
┌─────────────────────────────────────┐
│ VIOLATION LOGGED                     │
│ - Governor audit trail              │
│ - Error budget increment            │
│ - If critical: circuit breaker trip │
└─────────────────────────────────────┘
    ↓
Operation BLOCKED (exit code 2)
    ↓
Agent must either:
- Request PM_Architect approval
- Hand off to correct agent
- Escalate to human
```

#### File to Modify: `/scripts/pre-flight-check.sh`

Add violation logging after role check fails:

```bash
# After the role boundary check (around line 207)
case "$ROLE_STATUS" in
    "PASS")
        echo -e "  ${GREEN}PASS: File is within ${AGENT}'s scope${NC}"
        ;;
    "FAIL")
        echo -e "  ${RED}CRITICAL: Role boundary violation - ${ROLE_MSG}${NC}"

        # Log violation to governor system
        if command -v node &> /dev/null && [ -f "$SCRIPT_DIR/governor_helpers.js" ]; then
            node "$SCRIPT_DIR/governor_helpers.js" log "$AGENT" "pre_flight_failed" "failure" \
                "{\"violation\":\"role_boundary\",\"file\":\"$FILE_NAME\",\"message\":\"$ROLE_MSG\"}" 2>/dev/null
            node "$SCRIPT_DIR/governor_helpers.js" increment "pre_flight_failures" "$AGENT" 2>/dev/null
        fi

        ((CRITICAL++))
        ;;
    "WARN")
        echo -e "  ${YELLOW}WARNING: ${ROLE_MSG}${NC}"
        ((WARNINGS++))
        ;;
    "UNKNOWN")
        echo -e "  ${YELLOW}WARNING: Unknown agent role - cannot verify boundaries${NC}"
        ((WARNINGS++))
        ;;
esac
```

### Pre-Commit Hook Enforcement

#### File to Modify: `.git/hooks/pre-commit`

```bash
#!/bin/bash
# Enforce scope boundaries on commit

echo "Running pre-commit checks..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Determine agent from environment or recent activity
AGENT="${CLAUDE_AGENT:-unknown}"

# If agent unknown, try to infer from file patterns
if [ "$AGENT" = "unknown" ]; then
    if echo "$STAGED_FILES" | grep -qE "^apps_script/.*\.js$"; then
        AGENT="Backend_Claude"
    elif echo "$STAGED_FILES" | grep -qE "employee|mobile|pwa"; then
        AGENT="Mobile_Claude"
    elif echo "$STAGED_FILES" | grep -qE "\.html$|^web_app/"; then
        AGENT="Desktop_Claude"
    elif echo "$STAGED_FILES" | grep -qE "\.md$|^docs/|^claude_sessions/"; then
        AGENT="PM_Architect"
    fi
fi

echo "Detected agent: $AGENT"

# Check each file
BLOCKED=0
for file in $STAGED_FILES; do
    result=$(./scripts/pre-flight-check.sh "$file" "modify" "$AGENT" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 2 ]; then
        echo "BLOCKED: $file"
        echo "$result" | grep -E "CRITICAL|FAIL"
        BLOCKED=1
    fi
done

if [ $BLOCKED -eq 1 ]; then
    echo ""
    echo "COMMIT BLOCKED: Scope violations detected"
    echo "Review the errors above and ensure each agent only modifies files within their scope."
    exit 1
fi

echo "Pre-commit checks passed"
exit 0
```

### How to Verify It's Working

```bash
# Test 1: Backend_Claude trying to modify HTML (should fail)
./scripts/pre-flight-check.sh index.html modify Backend_Claude
# Expected: CRITICAL: Role boundary violation

# Test 2: Desktop_Claude modifying web_app file (should pass)
./scripts/pre-flight-check.sh web_app/feature.html modify Desktop_Claude
# Expected: PASS: File is within Desktop_Claude's scope

# Test 3: Security_Claude modifying auth file (should pass)
./scripts/pre-flight-check.sh web_app/auth-guard.js modify Security_Claude
# Expected: PASS

# Test 4: Any agent modifying outside scope (should increment failure counter)
./scripts/pre-flight-check.sh apps_script/MERGED\ TOTAL.js modify UX_Design_Claude
# Then check:
node scripts/governor_helpers.js performance UX_Design_Claude
# Should show pre_flight_failures incremented

# Test 5: Pre-commit hook test
export CLAUDE_AGENT=Backend_Claude
echo "test" > test.html
git add test.html
git commit -m "Test scope enforcement"
# Expected: COMMIT BLOCKED: Scope violations detected
rm test.html
git reset HEAD test.html 2>/dev/null
```

---

## 5. Implementation Checklist

### Phase 1: Circuit Breakers (Priority: HIGH)

- [ ] Create `/scripts/circuit_breaker.js`
- [ ] Create `/scripts/circuit_breaker_cli.js` (CLI wrapper)
- [ ] Create `/tinypm/.circuit_breaker_state.json` (initial state)
- [ ] Modify `/scripts/pre-flight-check.sh` to add CHECK 0
- [ ] Test circuit breaker triggers correctly
- [ ] Test recovery procedures work
- [ ] Document in CLAUDE.md

### Phase 2: Verification Gates (Priority: HIGH)

- [ ] Already implemented in `governor_helpers.js`
- [ ] Add new verification types to `verify-completion.sh`
- [ ] Create verification gate documentation
- [ ] Test IMPLEMENTED -> DONE blocking
- [ ] Test proof submission workflow
- [ ] Train agents on new workflow

### Phase 3: Documentation Drift Prevention (Priority: MEDIUM)

- [ ] Create `/scripts/check-doc-drift.sh`
- [ ] Create `/.docconfig.json`
- [ ] Add to pre-commit hook
- [ ] Run initial drift check and fix issues
- [ ] Set up weekly drift check schedule

### Phase 4: Scope Enforcement (Priority: MEDIUM)

- [ ] Enhance `check_role_boundary` in pre-flight-check.sh
- [ ] Add violation logging to governor system
- [ ] Update pre-commit hook
- [ ] Test all agent role boundaries
- [ ] Update CLAUDE.md with consequences

### Validation Checklist

After implementation, verify:

- [ ] `./scripts/pre-flight-check.sh test.html create Backend_Claude` blocks with role violation
- [ ] `./scripts/pre-flight-check.sh apps_script/test.js create Backend_Claude` passes
- [ ] Circuit breaker opens after 5 failures
- [ ] Circuit breaker recovers after timeout
- [ ] `node scripts/governor_helpers.js transition X IMPLEMENTED DONE Y` fails
- [ ] Documentation drift check finds intentional drift
- [ ] Pre-commit hook blocks scope violations

---

## Summary

This implementation plan provides:

1. **Circuit Breakers**: Failure-based and behavioral protection against cascading failures
2. **Verification Gates**: State machine enforcement ensuring tasks are verified before completion
3. **Documentation Drift Prevention**: Automated checks to keep docs in sync with code
4. **Scope Enforcement**: Role-based file access control with consequences for violations

Key principle: **Trust but verify. Verify before trust. Evidence over claims.**

---

*Implementation Owner: PM_Architect*
*Review Date: 2026-02-12*
*Next Review: After Phase 1 completion*
