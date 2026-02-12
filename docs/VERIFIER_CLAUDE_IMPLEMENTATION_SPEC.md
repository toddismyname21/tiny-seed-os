# VERIFIER_CLAUDE ("Karen") Implementation Specification

**Document Version:** 1.0
**Created:** 2026-02-12
**Purpose:** Complete implementation guide for the VERIFIER_CLAUDE agent
**Status:** READY FOR IMPLEMENTATION

---

## Executive Summary

The audit of `AGENTIC_TEAM_CONFIGURATION.md` found that VERIFIER_CLAUDE (alias "Karen") is **0% implemented** despite extensive documentation. This specification provides the complete blueprint for implementing this critical quality control agent.

### Why Karen Exists

On 2026-02-12, PM_Architect trusted a sub-agent's claim that "tabs were fixed" but they weren't. The Mantra was created:
- Research before implementing
- Check before creating
- **Test before declaring done**
- Audit before deploying
- Never assume - always confirm

Karen enforces: **"Test before declaring done"**

---

## Part 1: Files to Create

### 1.1 Session Folder Structure

```
/claude_sessions/verifier_claude/
    INBOX.md                    # Incoming verification requests
    OUTBOX.md                   # Verification results/reports
    CONFIG.md                   # Agent configuration
    VERIFICATION_QUEUE.json     # Active verification queue
    VERIFICATION_HISTORY.json   # Historical verification records
    TEMPLATES/
        verification_report.md  # Template for verification reports
        rejection_notice.md     # Template for rejection notices
```

#### Create Directory Structure

```bash
mkdir -p /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/verifier_claude/TEMPLATES
```

### 1.2 INBOX.md Format

```markdown
# VERIFIER_CLAUDE (Karen) INBOX

## Active Verification Requests

### REQUEST-001
**From:** Backend_Claude
**Task ID:** TASK-001
**Timestamp:** 2026-02-12T14:30:00Z
**Priority:** HIGH
**Claim:** Bug fix completed - API endpoint now returns correct data

#### Claimed Changes
- Modified: `apps_script/MERGED TOTAL.js`
- Function: `getCustomerOrders()`
- Fix: Added null check for missing customer IDs

#### Evidence Submitted
- Type: test_output
- Content: "Function returns empty array for null ID"

#### Acceptance Criteria
- [ ] API returns 200 for valid customer ID
- [ ] API returns empty array (not error) for null ID
- [ ] No console errors in frontend

---

### REQUEST-002
...
```

### 1.3 OUTBOX.md Format

```markdown
# VERIFIER_CLAUDE (Karen) OUTBOX

## Verification Reports

### REPORT-001
**Re:** REQUEST-001
**Task ID:** TASK-001
**Timestamp:** 2026-02-12T15:00:00Z
**Status:** VERIFIED / REJECTED

## VERIFICATION REPORT

**Task:** Fix null customer ID handling in getCustomerOrders()
**Agent:** Backend_Claude
**Status:** VERIFIED

| Check | Status | Evidence |
|-------|--------|----------|
| File exists | PASS | apps_script/MERGED TOTAL.js exists |
| Code parses | PASS | No syntax errors |
| API test - valid ID | PASS | Returns order array |
| API test - null ID | PASS | Returns [] not error |
| Frontend test | PASS | No console errors |

**Decision:** VERIFIED
**Reason:** All acceptance criteria met with captured evidence.

**Test Commands Executed:**
```bash
curl -X GET "API_URL?action=getCustomerOrders&customerId=CUST001"
# Response: {"success":true,"data":[...]}

curl -X GET "API_URL?action=getCustomerOrders&customerId="
# Response: {"success":true,"data":[]}
```

---
```

### 1.4 Verification Request Schema

```json
{
  "schema_version": "1.0",
  "request": {
    "id": "REQ-{timestamp}-{uuid}",
    "from_agent": "Backend_Claude | Desktop_Claude | Mobile_Claude | etc",
    "task_id": "TASK-XXX",
    "timestamp": "ISO8601",
    "priority": "HIGH | MEDIUM | LOW",
    "claim_type": "bug_fix | file_creation | ui_change | api_change | deployment",
    "claim_description": "What the agent claims to have done",
    "files_modified": ["path/to/file1.js", "path/to/file2.html"],
    "functions_changed": ["functionName1", "functionName2"],
    "evidence_submitted": [
      {
        "type": "test_output | screenshot | log_snippet | api_response | user_confirmation",
        "description": "What this evidence shows",
        "content": "Actual content or URL",
        "metadata": {}
      }
    ],
    "acceptance_criteria": [
      "Criterion 1",
      "Criterion 2"
    ],
    "rollback_plan": "How to undo if verification fails"
  }
}
```

### 1.5 Verification Result Schema

```json
{
  "schema_version": "1.0",
  "result": {
    "id": "VER-{timestamp}-{uuid}",
    "request_id": "REQ-XXX",
    "task_id": "TASK-XXX",
    "verifier": "Verifier_Claude",
    "timestamp": "ISO8601",
    "status": "VERIFIED | REJECTED | NEEDS_MORE_INFO",
    "checks_performed": [
      {
        "check_name": "file_exists",
        "status": "PASS | FAIL | SKIP",
        "evidence": "Actual output or screenshot URL",
        "notes": "Additional context"
      }
    ],
    "test_commands_executed": [
      {
        "command": "actual command run",
        "output": "actual output",
        "exit_code": 0
      }
    ],
    "decision": "VERIFIED | REJECTED",
    "decision_reason": "Detailed explanation",
    "next_action": "What should happen next",
    "sent_to": "PM_Architect | implementing_agent"
  }
}
```

---

## Part 2: Functions Needed

### 2.1 Core Verification Functions

Create file: `/scripts/verifier_claude.js`

```javascript
/**
 * VERIFIER_CLAUDE (Karen) - Core Functions
 *
 * Quality control agent that verifies task completion claims.
 * KEY RULE: No direct path from IMPLEMENTED to DONE
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const governor = require('./governor_helpers.js');

// Paths
const VERIFIER_SESSION = path.join(__dirname, '..', 'claude_sessions', 'verifier_claude');
const INBOX_FILE = path.join(VERIFIER_SESSION, 'INBOX.md');
const OUTBOX_FILE = path.join(VERIFIER_SESSION, 'OUTBOX.md');
const QUEUE_FILE = path.join(VERIFIER_SESSION, 'VERIFICATION_QUEUE.json');

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION: receiveVerificationRequest
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Receive and queue a new verification request
 *
 * @param {object} request - Verification request object
 * @returns {object} Result with request ID and queue position
 *
 * Trigger: Called when any agent claims "done" or "complete"
 */
function receiveVerificationRequest(request) {
  const result = {
    success: false,
    requestId: null,
    queuePosition: null,
    errors: []
  };

  // Validate required fields
  const requiredFields = ['from_agent', 'task_id', 'claim_type', 'claim_description'];
  for (const field of requiredFields) {
    if (!request[field]) {
      result.errors.push(`Missing required field: ${field}`);
    }
  }
  if (result.errors.length > 0) return result;

  // Generate request ID
  const requestId = `REQ-${Date.now()}-${generateShortUUID()}`;

  // Read current queue
  let queue = readJsonFile(QUEUE_FILE) || { requests: [], processed: [] };

  // Create queue entry
  const queueEntry = {
    id: requestId,
    ...request,
    timestamp: new Date().toISOString(),
    status: 'pending',
    priority: request.priority || 'MEDIUM'
  };

  // Add to queue (HIGH priority goes to front)
  if (request.priority === 'HIGH') {
    queue.requests.unshift(queueEntry);
  } else {
    queue.requests.push(queueEntry);
  }

  // Save queue
  writeJsonFile(QUEUE_FILE, queue);

  // Update INBOX.md
  appendToInbox(queueEntry);

  // Log to governor
  governor.logGovernorEvent('Verifier_Claude', 'verification_gate_initiated', 'pending', {
    requestId: requestId,
    taskId: request.task_id,
    claimType: request.claim_type,
    fromAgent: request.from_agent
  });

  // Transition task state
  governor.transitionTaskState(
    request.task_id,
    governor.TASK_STATES.IMPLEMENTED,
    governor.TASK_STATES.AWAITING_VERIFICATION,
    request.from_agent
  );

  result.success = true;
  result.requestId = requestId;
  result.queuePosition = queue.requests.findIndex(r => r.id === requestId) + 1;

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION: executeVerification
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Execute verification checks for a request
 *
 * @param {string} requestId - ID of the verification request
 * @returns {object} Verification result
 *
 * This is the main verification engine that runs tests based on claim_type
 */
function executeVerification(requestId) {
  const result = {
    success: false,
    verified: false,
    checks: [],
    errors: []
  };

  // Get request from queue
  const queue = readJsonFile(QUEUE_FILE);
  const request = queue?.requests?.find(r => r.id === requestId);

  if (!request) {
    result.errors.push(`Request not found: ${requestId}`);
    return result;
  }

  // Run checks based on claim type
  const checks = [];

  switch (request.claim_type) {
    case 'file_creation':
      checks.push(...verifyFileCreation(request));
      break;
    case 'bug_fix':
      checks.push(...verifyBugFix(request));
      break;
    case 'ui_change':
      checks.push(...verifyUIChange(request));
      break;
    case 'api_change':
      checks.push(...verifyAPIChange(request));
      break;
    case 'deployment':
      checks.push(...verifyDeployment(request));
      break;
    default:
      checks.push(...verifyGeneric(request));
  }

  // Always run these standard checks
  checks.push(verifyChangeLogUpdated(request));
  checks.push(verifyNoOrphanedReferences(request));

  result.checks = checks;
  result.verified = checks.every(c => c.status === 'PASS' || c.status === 'SKIP');
  result.success = true;

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION: reportResults
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Report verification results
 *
 * @param {string} requestId - ID of the verification request
 * @param {object} verificationResult - Result from executeVerification
 * @returns {object} Report result
 */
function reportResults(requestId, verificationResult) {
  const result = {
    success: false,
    reportId: null,
    sentTo: []
  };

  // Get request
  const queue = readJsonFile(QUEUE_FILE);
  const request = queue?.requests?.find(r => r.id === requestId);

  if (!request) {
    result.errors = [`Request not found: ${requestId}`];
    return result;
  }

  // Generate report ID
  const reportId = `VER-${Date.now()}-${generateShortUUID()}`;

  // Determine status
  const status = verificationResult.verified ? 'VERIFIED' : 'REJECTED';

  // Create report
  const report = {
    id: reportId,
    requestId: requestId,
    taskId: request.task_id,
    verifier: 'Verifier_Claude',
    timestamp: new Date().toISOString(),
    status: status,
    checks: verificationResult.checks,
    decision: status,
    decisionReason: generateDecisionReason(verificationResult)
  };

  // Update OUTBOX.md
  appendToOutbox(report);

  // Update governor state
  if (status === 'VERIFIED') {
    governor.transitionTaskState(
      request.task_id,
      governor.TASK_STATES.AWAITING_VERIFICATION,
      governor.TASK_STATES.VERIFIED,
      'Verifier_Claude'
    );
    governor.logGovernorEvent('Verifier_Claude', 'verification_gate_passed', 'success', {
      taskId: request.task_id,
      reportId: reportId
    });
    governor.incrementMetric('verification_gates_passed', 'Verifier_Claude');
  } else {
    governor.transitionTaskState(
      request.task_id,
      governor.TASK_STATES.AWAITING_VERIFICATION,
      governor.TASK_STATES.IMPLEMENTED,
      'Verifier_Claude'
    );
    governor.logGovernorEvent('Verifier_Claude', 'verification_gate_failed', 'failure', {
      taskId: request.task_id,
      reportId: reportId,
      failedChecks: verificationResult.checks.filter(c => c.status === 'FAIL')
    });
    governor.incrementMetric('verification_gates_failed', 'Verifier_Claude');
  }

  // Move request to processed
  queue.requests = queue.requests.filter(r => r.id !== requestId);
  queue.processed = queue.processed || [];
  queue.processed.push({
    ...request,
    status: status,
    reportId: reportId,
    processedAt: new Date().toISOString()
  });
  writeJsonFile(QUEUE_FILE, queue);

  // Notify implementing agent (write to their INBOX)
  notifyAgent(request.from_agent, report);

  result.success = true;
  result.reportId = reportId;
  result.sentTo = [request.from_agent, 'PM_Architect'];

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION: blockDoneWithoutVerification
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Block any attempt to mark a task as DONE without passing verification
 *
 * @param {string} agent - Agent attempting to mark done
 * @param {string} taskId - Task being marked done
 * @returns {object} Result with blocked status and required actions
 *
 * This is the ENFORCEMENT function - called before any task completion
 */
function blockDoneWithoutVerification(agent, taskId) {
  const result = {
    allowed: false,
    blocked: true,
    reason: null,
    requiredActions: []
  };

  // Get task status
  const taskStatus = governor.getTaskVerificationStatus(taskId);

  // Check current state
  if (!taskStatus.exists) {
    result.reason = 'Task has no verification record';
    result.requiredActions = [
      'Submit proof of success via submitProofOfSuccess()',
      'Request verification via receiveVerificationRequest()'
    ];
    governor.logGovernorEvent(agent, 'verification_gate_blocked', 'blocked', {
      taskId: taskId,
      reason: 'No verification record exists'
    });
    governor.incrementMetric('direct_done_attempts_blocked', agent);
    return result;
  }

  if (taskStatus.currentState !== 'VERIFIED') {
    result.reason = `Task is in ${taskStatus.currentState} state, not VERIFIED`;
    result.requiredActions = [taskStatus.nextRequiredAction];
    governor.logGovernorEvent(agent, 'verification_gate_blocked', 'blocked', {
      taskId: taskId,
      currentState: taskStatus.currentState,
      reason: 'Not in VERIFIED state'
    });
    governor.incrementMetric('direct_done_attempts_blocked', agent);
    return result;
  }

  if (taskStatus.passedProofsCount === 0) {
    result.reason = 'No passing proofs of success';
    result.requiredActions = ['At least one proof must pass validation'];
    return result;
  }

  // All checks passed
  result.allowed = true;
  result.blocked = false;
  result.reason = 'Verification gate passed';

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION TYPE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify file creation claims
 */
function verifyFileCreation(request) {
  const checks = [];

  for (const filePath of (request.files_modified || [])) {
    const fullPath = path.join(__dirname, '..', filePath);

    // Check file exists
    checks.push({
      check_name: `file_exists: ${filePath}`,
      status: fs.existsSync(fullPath) ? 'PASS' : 'FAIL',
      evidence: fs.existsSync(fullPath) ? 'File exists' : 'File not found',
      notes: ''
    });

    // Check file is not empty
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      checks.push({
        check_name: `file_not_empty: ${filePath}`,
        status: content.trim().length > 0 ? 'PASS' : 'FAIL',
        evidence: `File size: ${content.length} bytes`,
        notes: ''
      });

      // Check file parses (for JS/JSON files)
      if (filePath.endsWith('.js')) {
        try {
          new Function(content);
          checks.push({
            check_name: `js_parses: ${filePath}`,
            status: 'PASS',
            evidence: 'JavaScript parses without syntax errors',
            notes: ''
          });
        } catch (e) {
          checks.push({
            check_name: `js_parses: ${filePath}`,
            status: 'FAIL',
            evidence: `Syntax error: ${e.message}`,
            notes: ''
          });
        }
      }

      if (filePath.endsWith('.json')) {
        try {
          JSON.parse(content);
          checks.push({
            check_name: `json_parses: ${filePath}`,
            status: 'PASS',
            evidence: 'JSON parses without errors',
            notes: ''
          });
        } catch (e) {
          checks.push({
            check_name: `json_parses: ${filePath}`,
            status: 'FAIL',
            evidence: `Parse error: ${e.message}`,
            notes: ''
          });
        }
      }
    }
  }

  return checks;
}

/**
 * Verify bug fix claims
 */
function verifyBugFix(request) {
  const checks = [];

  // Check files were actually modified
  checks.push(...verifyFileCreation(request));

  // Check for test evidence
  const hasTestEvidence = (request.evidence_submitted || []).some(
    e => e.type === 'test_output' || e.type === 'automated_test'
  );

  checks.push({
    check_name: 'test_evidence_provided',
    status: hasTestEvidence ? 'PASS' : 'FAIL',
    evidence: hasTestEvidence ? 'Test output provided' : 'No test evidence submitted',
    notes: 'Bug fixes MUST include test execution output, not just code review'
  });

  // Validate element references if HTML was modified
  const htmlFiles = (request.files_modified || []).filter(f => f.endsWith('.html'));
  for (const htmlFile of htmlFiles) {
    const fullPath = path.join(__dirname, '..', htmlFile);
    if (fs.existsSync(fullPath)) {
      try {
        const output = execSync(
          `./scripts/validate-element-refs.sh ${htmlFile}`,
          { cwd: path.join(__dirname, '..'), encoding: 'utf-8' }
        );
        checks.push({
          check_name: `no_orphaned_refs: ${htmlFile}`,
          status: output.includes('VALIDATION PASSED') ? 'PASS' : 'FAIL',
          evidence: output.trim().slice(0, 500),
          notes: ''
        });
      } catch (e) {
        checks.push({
          check_name: `no_orphaned_refs: ${htmlFile}`,
          status: 'FAIL',
          evidence: e.message,
          notes: ''
        });
      }
    }
  }

  return checks;
}

/**
 * Verify UI change claims
 */
function verifyUIChange(request) {
  const checks = [];

  // Basic file checks
  checks.push(...verifyFileCreation(request));

  // Check for screenshot evidence
  const hasScreenshot = (request.evidence_submitted || []).some(
    e => e.type === 'screenshot'
  );

  checks.push({
    check_name: 'screenshot_evidence',
    status: hasScreenshot ? 'PASS' : 'FAIL',
    evidence: hasScreenshot ? 'Screenshot provided' : 'No screenshot evidence',
    notes: 'UI changes SHOULD include visual evidence'
  });

  // Validate HTML files
  const htmlFiles = (request.files_modified || []).filter(f => f.endsWith('.html'));
  for (const htmlFile of htmlFiles) {
    const fullPath = path.join(__dirname, '..', htmlFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check for console errors in script
      const hasConsoleError = content.includes('console.error') && !content.includes('catch');
      checks.push({
        check_name: `no_unhandled_errors: ${htmlFile}`,
        status: hasConsoleError ? 'FAIL' : 'PASS',
        evidence: hasConsoleError ? 'Potential unhandled errors' : 'Error handling appears present',
        notes: ''
      });

      // Validate element references
      checks.push(...verifyNoOrphanedReferencesForFile(htmlFile));
    }
  }

  return checks;
}

/**
 * Verify API change claims
 */
function verifyAPIChange(request) {
  const checks = [];

  // Basic file checks
  checks.push(...verifyFileCreation(request));

  // Check for API response evidence
  const hasAPIEvidence = (request.evidence_submitted || []).some(
    e => e.type === 'api_response'
  );

  checks.push({
    check_name: 'api_response_evidence',
    status: hasAPIEvidence ? 'PASS' : 'FAIL',
    evidence: hasAPIEvidence ? 'API response captured' : 'No API response evidence',
    notes: 'API changes MUST include curl/fetch response output'
  });

  // Check CHANGE_LOG for API documentation
  checks.push(verifyChangeLogUpdated(request));

  return checks;
}

/**
 * Verify deployment claims
 */
function verifyDeployment(request) {
  const checks = [];

  // Check CHANGE_LOG updated
  checks.push(verifyChangeLogUpdated(request));

  // Check for deployment evidence
  const hasDeployEvidence = (request.evidence_submitted || []).some(
    e => e.type === 'api_response' || e.description?.includes('deploy')
  );

  checks.push({
    check_name: 'deployment_verified',
    status: hasDeployEvidence ? 'PASS' : 'FAIL',
    evidence: hasDeployEvidence ? 'Deployment evidence provided' : 'No deployment verification',
    notes: 'Deployments MUST include live endpoint verification'
  });

  // Check correct deployment ID was used
  const hasCorrectDeployId = (request.evidence_submitted || []).some(
    e => e.content?.includes('AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm')
  );

  if ((request.files_modified || []).some(f => f.includes('apps_script'))) {
    checks.push({
      check_name: 'correct_deployment_id',
      status: hasCorrectDeployId ? 'PASS' : 'FAIL',
      evidence: hasCorrectDeployId ? 'Correct deployment ID used' : 'Deployment ID not verified',
      notes: 'Apps Script deployments MUST use the production deployment ID'
    });
  }

  return checks;
}

/**
 * Generic verification for unspecified claim types
 */
function verifyGeneric(request) {
  const checks = [];

  // Basic file checks
  checks.push(...verifyFileCreation(request));

  // Check for any evidence
  const hasAnyEvidence = (request.evidence_submitted || []).length > 0;

  checks.push({
    check_name: 'evidence_provided',
    status: hasAnyEvidence ? 'PASS' : 'FAIL',
    evidence: hasAnyEvidence
      ? `${request.evidence_submitted.length} evidence items provided`
      : 'No evidence submitted',
    notes: ''
  });

  return checks;
}

/**
 * Check if CHANGE_LOG.md was updated
 */
function verifyChangeLogUpdated(request) {
  const changeLogPath = path.join(__dirname, '..', 'CHANGE_LOG.md');

  if (!fs.existsSync(changeLogPath)) {
    return {
      check_name: 'changelog_updated',
      status: 'FAIL',
      evidence: 'CHANGE_LOG.md not found',
      notes: ''
    };
  }

  const content = fs.readFileSync(changeLogPath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];

  // Check for today's entry mentioning the task or files
  const hasTodayEntry = content.includes(today);
  const mentionsFiles = (request.files_modified || []).some(f => content.includes(f));

  return {
    check_name: 'changelog_updated',
    status: (hasTodayEntry && mentionsFiles) ? 'PASS' : 'FAIL',
    evidence: hasTodayEntry
      ? (mentionsFiles ? 'CHANGE_LOG has relevant entry' : 'Entry exists but missing file references')
      : 'No entry for today',
    notes: 'All changes MUST be logged in CHANGE_LOG.md'
  };
}

/**
 * Check for orphaned element references in a specific file
 */
function verifyNoOrphanedReferencesForFile(htmlFile) {
  const checks = [];
  const fullPath = path.join(__dirname, '..', htmlFile);

  if (!fs.existsSync(fullPath)) {
    return [{
      check_name: `orphan_check: ${htmlFile}`,
      status: 'SKIP',
      evidence: 'File not found',
      notes: ''
    }];
  }

  try {
    const output = execSync(
      `./scripts/validate-element-refs.sh ${htmlFile}`,
      { cwd: path.join(__dirname, '..'), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    checks.push({
      check_name: `no_orphaned_refs: ${htmlFile}`,
      status: output.includes('VALIDATION PASSED') ? 'PASS' : 'FAIL',
      evidence: output.trim().slice(0, 500),
      notes: ''
    });
  } catch (e) {
    checks.push({
      check_name: `no_orphaned_refs: ${htmlFile}`,
      status: 'FAIL',
      evidence: `Validation error: ${e.stderr || e.message}`,
      notes: ''
    });
  }

  return checks;
}

/**
 * Standard orphan reference check
 */
function verifyNoOrphanedReferences(request) {
  const htmlFiles = (request.files_modified || []).filter(f => f.endsWith('.html'));

  if (htmlFiles.length === 0) {
    return {
      check_name: 'orphan_references',
      status: 'SKIP',
      evidence: 'No HTML files modified',
      notes: ''
    };
  }

  const allChecks = htmlFiles.flatMap(f => verifyNoOrphanedReferencesForFile(f));
  const allPass = allChecks.every(c => c.status === 'PASS' || c.status === 'SKIP');

  return {
    check_name: 'orphan_references_all',
    status: allPass ? 'PASS' : 'FAIL',
    evidence: `Checked ${htmlFiles.length} HTML files`,
    notes: allChecks.filter(c => c.status === 'FAIL').map(c => c.evidence).join('; ')
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateShortUUID() {
  return Math.random().toString(36).substring(2, 10);
}

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return null;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e.message);
    return false;
  }
}

function appendToInbox(request) {
  let content = '';
  if (fs.existsSync(INBOX_FILE)) {
    content = fs.readFileSync(INBOX_FILE, 'utf-8');
  } else {
    content = '# VERIFIER_CLAUDE (Karen) INBOX\n\n## Active Verification Requests\n\n';
  }

  const entry = `
### ${request.id}
**From:** ${request.from_agent}
**Task ID:** ${request.task_id}
**Timestamp:** ${request.timestamp}
**Priority:** ${request.priority}
**Claim:** ${request.claim_description}

#### Files Modified
${(request.files_modified || []).map(f => `- ${f}`).join('\n')}

#### Evidence Submitted
${(request.evidence_submitted || []).map(e => `- Type: ${e.type}\n  Content: ${e.description || e.content?.slice(0, 100)}`).join('\n')}

---
`;

  fs.writeFileSync(INBOX_FILE, content + entry);
}

function appendToOutbox(report) {
  let content = '';
  if (fs.existsSync(OUTBOX_FILE)) {
    content = fs.readFileSync(OUTBOX_FILE, 'utf-8');
  } else {
    content = '# VERIFIER_CLAUDE (Karen) OUTBOX\n\n## Verification Reports\n\n';
  }

  const checksTable = report.checks.map(c =>
    `| ${c.check_name} | ${c.status} | ${c.evidence?.slice(0, 50)} |`
  ).join('\n');

  const entry = `
### ${report.id}
**Re:** ${report.requestId}
**Task ID:** ${report.taskId}
**Timestamp:** ${report.timestamp}
**Status:** ${report.status}

| Check | Status | Evidence |
|-------|--------|----------|
${checksTable}

**Decision:** ${report.decision}
**Reason:** ${report.decisionReason}

---
`;

  fs.writeFileSync(OUTBOX_FILE, content + entry);
}

function notifyAgent(agentName, report) {
  const agentFolderMap = {
    'Backend_Claude': 'backend',
    'Desktop_Claude': 'desktop_web',
    'Mobile_Claude': 'mobile_app',
    'UX_Design_Claude': 'ux_design',
    'Sales_Claude': 'sales_crm',
    'Security_Claude': 'security',
    'PM_Architect': 'pm_architect'
  };

  const folderName = agentFolderMap[agentName];
  if (!folderName) return;

  const inboxPath = path.join(__dirname, '..', 'claude_sessions', folderName, 'INBOX.md');

  if (!fs.existsSync(inboxPath)) return;

  const notification = `
## VERIFICATION RESULT - ${report.status}
**From:** Verifier_Claude (Karen)
**Task:** ${report.taskId}
**Report:** ${report.id}
**Timestamp:** ${report.timestamp}

**Decision:** ${report.decision}
**Reason:** ${report.decisionReason}

${report.status === 'REJECTED' ? `
### Required Actions
Please address the failed checks and resubmit for verification:
${report.checks.filter(c => c.status === 'FAIL').map(c => `- ${c.check_name}: ${c.evidence}`).join('\n')}
` : ''}

---
`;

  let content = fs.readFileSync(inboxPath, 'utf-8');
  fs.writeFileSync(inboxPath, notification + content);
}

function generateDecisionReason(verificationResult) {
  const failedChecks = verificationResult.checks.filter(c => c.status === 'FAIL');
  const passedChecks = verificationResult.checks.filter(c => c.status === 'PASS');

  if (failedChecks.length === 0) {
    return `All ${passedChecks.length} verification checks passed.`;
  }

  return `Failed ${failedChecks.length} of ${verificationResult.checks.length} checks: ${failedChecks.map(c => c.check_name).join(', ')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core functions
  receiveVerificationRequest,
  executeVerification,
  reportResults,
  blockDoneWithoutVerification,

  // Verification type functions
  verifyFileCreation,
  verifyBugFix,
  verifyUIChange,
  verifyAPIChange,
  verifyDeployment,
  verifyGeneric,

  // Helper functions
  verifyChangeLogUpdated,
  verifyNoOrphanedReferences
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI SUPPORT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'receive':
      // node verifier_claude.js receive '{"from_agent":"Backend_Claude","task_id":"TASK-001",...}'
      const request = JSON.parse(args[1]);
      console.log(JSON.stringify(receiveVerificationRequest(request), null, 2));
      break;

    case 'verify':
      // node verifier_claude.js verify REQ-123456
      const requestId = args[1];
      const verResult = executeVerification(requestId);
      console.log(JSON.stringify(verResult, null, 2));
      break;

    case 'report':
      // node verifier_claude.js report REQ-123456
      const repRequestId = args[1];
      const verRes = executeVerification(repRequestId);
      const repResult = reportResults(repRequestId, verRes);
      console.log(JSON.stringify(repResult, null, 2));
      break;

    case 'block-check':
      // node verifier_claude.js block-check Backend_Claude TASK-001
      const agent = args[1];
      const taskId = args[2];
      console.log(JSON.stringify(blockDoneWithoutVerification(agent, taskId), null, 2));
      break;

    case 'queue':
      // node verifier_claude.js queue
      const queue = readJsonFile(QUEUE_FILE);
      console.log(JSON.stringify(queue, null, 2));
      break;

    default:
      console.log(`
VERIFIER_CLAUDE (Karen) CLI

Usage:
  node verifier_claude.js <command> [options]

Commands:
  receive <request_json>     Queue a new verification request
  verify <request_id>        Execute verification checks
  report <request_id>        Generate and send verification report
  block-check <agent> <task> Check if task can be marked done
  queue                      Show current verification queue

Examples:
  node verifier_claude.js receive '{"from_agent":"Backend_Claude","task_id":"TASK-001","claim_type":"bug_fix","claim_description":"Fixed null check"}'
  node verifier_claude.js verify REQ-1234567890-abcd1234
  node verifier_claude.js block-check Backend_Claude TASK-001
      `);
  }
}
```

---

## Part 3: Integration with governor_helpers.js

### 3.1 How Karen Connects to the Governor System

The `governor_helpers.js` file already has the foundation for verification gates:

```javascript
// Already exists in governor_helpers.js:
TASK_STATES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  IMPLEMENTED: 'IMPLEMENTED',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  DONE: 'DONE'
};

VALID_STATE_TRANSITIONS = {
  'PENDING': ['IN_PROGRESS'],
  'IN_PROGRESS': ['IMPLEMENTED', 'PENDING'],
  'IMPLEMENTED': ['AWAITING_VERIFICATION'],  // CANNOT go to DONE!
  'AWAITING_VERIFICATION': ['VERIFIED', 'IMPLEMENTED'],
  'VERIFIED': ['DONE'],
  'DONE': []
};
```

### 3.2 Integration Points

| Governor Function | Karen's Usage |
|-------------------|---------------|
| `transitionTaskState()` | Karen calls this to move tasks through verification states |
| `logGovernorEvent()` | Karen logs all verification events |
| `incrementMetric()` | Karen tracks verification_gates_passed/failed |
| `canDeclareComplete()` | Called before any "done" claim to enforce verification |
| `submitProofOfSuccess()` | Agents submit proof, Karen validates it |
| `validateProof()` | Karen validates submitted proofs |
| `getTaskVerificationStatus()` | Karen checks task state before verification |

### 3.3 Integration Code to Add to governor_helpers.js

Add this to the exports and functions in `governor_helpers.js`:

```javascript
/**
 * Trigger verification request to Verifier_Claude
 *
 * @param {string} agent - Agent claiming completion
 * @param {string} taskId - Task being claimed as complete
 * @param {object} claimDetails - Details of the completion claim
 * @returns {object} Result with verification request ID
 */
function triggerVerification(agent, taskId, claimDetails) {
  const verifierClaude = require('./verifier_claude.js');

  const request = {
    from_agent: agent,
    task_id: taskId,
    claim_type: claimDetails.type || 'generic',
    claim_description: claimDetails.description || 'Task claimed complete',
    files_modified: claimDetails.files || [],
    evidence_submitted: claimDetails.evidence || [],
    acceptance_criteria: claimDetails.criteria || [],
    priority: claimDetails.priority || 'MEDIUM'
  };

  return verifierClaude.receiveVerificationRequest(request);
}

// Add to exports:
module.exports = {
  // ... existing exports ...
  triggerVerification
};
```

---

## Part 4: Trigger Mechanism

### 4.1 How Karen Is Triggered When Agents Claim "Done"

The trigger mechanism intercepts "done" claims at multiple points:

#### Option A: Pre-Commit Hook (Recommended)

Create/update `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check if any task completion is being committed
if git diff --cached --name-only | grep -q "CHANGE_LOG.md"; then
  # Extract task IDs from commit message or changes
  TASK_IDS=$(git diff --cached CHANGE_LOG.md | grep -oP 'TASK-\d+' | sort -u)

  for TASK_ID in $TASK_IDS; do
    # Check verification status
    RESULT=$(node scripts/governor_helpers.js task-status $TASK_ID 2>/dev/null)

    if echo "$RESULT" | grep -q '"currentState": "IMPLEMENTED"'; then
      echo "ERROR: Task $TASK_ID is IMPLEMENTED but not VERIFIED"
      echo "Run: node scripts/verifier_claude.js block-check [YourRole] $TASK_ID"
      exit 1
    fi
  done
fi

exit 0
```

#### Option B: Agent Workflow Integration

Modify agent workflows to call verification trigger:

```javascript
// In any agent's completion workflow:
const governor = require('./scripts/governor_helpers.js');

async function completeTask(agent, taskId, details) {
  // 1. Check if verification is required
  const canComplete = governor.canDeclareComplete(agent, taskId, {
    currentState: 'IMPLEMENTED',
    proofs: [],
    verifierApproved: false
  });

  if (!canComplete.canComplete) {
    // 2. Trigger verification if not verified
    const verificationResult = governor.triggerVerification(agent, taskId, {
      type: details.type,
      description: details.description,
      files: details.filesModified,
      evidence: details.evidence
    });

    return {
      success: false,
      message: 'Task sent to verification queue',
      verificationRequestId: verificationResult.requestId,
      nextSteps: canComplete.requirements
    };
  }

  // 3. Task is verified, proceed to DONE
  return governor.transitionTaskState(taskId, 'VERIFIED', 'DONE', agent);
}
```

#### Option C: API Endpoint Integration

Add to Apps Script `MERGED TOTAL.js`:

```javascript
function verifyTaskCompletion(taskId, agent, evidence) {
  // This would call the Node.js verifier via webhook
  // or check local verification status

  const verificationStatus = getVerificationStatus(taskId);

  if (verificationStatus.state !== 'VERIFIED') {
    return {
      success: false,
      error: 'Task not verified',
      currentState: verificationStatus.state,
      nextAction: 'Submit to verification queue'
    };
  }

  return {
    success: true,
    message: 'Task verified, can mark as DONE'
  };
}
```

### 4.2 Result Flow Diagram

```
Agent Claims "Done"
        │
        ▼
┌───────────────────┐
│ blockDoneWithout  │
│ Verification()    │
└────────┬──────────┘
         │
    ┌────┴────┐
    │ VERIFIED │──Yes──▶ Allow DONE transition
    │   ?      │
    └────┬────┘
         │No
         ▼
┌───────────────────┐
│ receiveVerifica-  │
│ tionRequest()     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ VERIFICATION_     │
│ QUEUE.json        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ executeVerifica-  │
│ tion()            │
└────────┬──────────┘
         │
    ┌────┴────┐
    │ All     │──Yes──▶ VERIFIED state
    │ Pass?   │              │
    └────┬────┘              ▼
         │No           Agent notified
         ▼             Can now mark DONE
   REJECTED state
         │
         ▼
   Agent notified
   Must fix and retry
```

---

## Part 5: Verification Types Reference

### 5.1 File Creation Verification

**Checks Performed:**
1. File exists at claimed path
2. File is not empty
3. JavaScript files parse without syntax errors
4. JSON files parse correctly
5. CHANGE_LOG.md updated

**Required Evidence:**
- `file_path` - Path to created file
- None required (Karen checks existence)

**Example Request:**
```json
{
  "from_agent": "Backend_Claude",
  "task_id": "TASK-001",
  "claim_type": "file_creation",
  "claim_description": "Created new API module",
  "files_modified": ["apps_script/NewModule.js"],
  "evidence_submitted": []
}
```

### 5.2 Bug Fix Verification

**Checks Performed:**
1. All file creation checks
2. Test evidence is provided (not just "it works")
3. No orphaned element references (for HTML)
4. CHANGE_LOG.md updated

**Required Evidence:**
- `type: test_output` - Actual test execution output
- `type: api_response` - For API bug fixes

**Example Request:**
```json
{
  "from_agent": "Backend_Claude",
  "task_id": "TASK-002",
  "claim_type": "bug_fix",
  "claim_description": "Fixed null check in getOrders",
  "files_modified": ["apps_script/MERGED TOTAL.js"],
  "evidence_submitted": [
    {
      "type": "test_output",
      "description": "API returns empty array for null ID",
      "content": "curl response: {\"success\":true,\"data\":[]}"
    }
  ]
}
```

### 5.3 UI Change Verification

**Checks Performed:**
1. All file creation checks
2. Screenshot evidence provided
3. No orphaned element references
4. No console errors in code
5. CHANGE_LOG.md updated

**Required Evidence:**
- `type: screenshot` - Visual evidence of change
- `type: test_output` - Console output showing no errors

**Example Request:**
```json
{
  "from_agent": "Desktop_Claude",
  "task_id": "TASK-003",
  "claim_type": "ui_change",
  "claim_description": "Added new dashboard tab",
  "files_modified": ["index.html", "web_app/admin.html"],
  "evidence_submitted": [
    {
      "type": "screenshot",
      "description": "New tab visible in dashboard",
      "content": "URL or base64 of screenshot"
    }
  ]
}
```

### 5.4 API Change Verification

**Checks Performed:**
1. All file creation checks
2. API response evidence provided (curl output)
3. Correct deployment ID used (for Apps Script)
4. CHANGE_LOG.md updated

**Required Evidence:**
- `type: api_response` - Actual curl/fetch response
- Must show success response with correct data

**Example Request:**
```json
{
  "from_agent": "Backend_Claude",
  "task_id": "TASK-004",
  "claim_type": "api_change",
  "claim_description": "Added new endpoint getCustomerHistory",
  "files_modified": ["apps_script/MERGED TOTAL.js"],
  "evidence_submitted": [
    {
      "type": "api_response",
      "description": "Endpoint returns customer history",
      "content": "curl -X GET 'API_URL?action=getCustomerHistory&id=123'\n{\"success\":true,\"data\":[...]}"
    }
  ]
}
```

### 5.5 Deployment Verification

**Checks Performed:**
1. CHANGE_LOG.md updated
2. Deployment evidence provided
3. Correct deployment ID used
4. Live endpoint verification

**Required Evidence:**
- `type: api_response` - Live endpoint check
- Deployment ID in evidence content

**Example Request:**
```json
{
  "from_agent": "Backend_Claude",
  "task_id": "TASK-005",
  "claim_type": "deployment",
  "claim_description": "Deployed v2.1.0 to production",
  "files_modified": ["apps_script/MERGED TOTAL.js"],
  "evidence_submitted": [
    {
      "type": "api_response",
      "description": "clasp deploy output and live verification",
      "content": "clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d 'v2.1.0'\n\ncurl API_URL?action=ping\n{\"success\":true,\"version\":\"2.1.0\"}"
    }
  ]
}
```

---

## Part 6: Quick Start Checklist

### To Implement Karen:

- [ ] 1. Create session folder structure
  ```bash
  mkdir -p claude_sessions/verifier_claude/TEMPLATES
  touch claude_sessions/verifier_claude/INBOX.md
  touch claude_sessions/verifier_claude/OUTBOX.md
  touch claude_sessions/verifier_claude/CONFIG.md
  echo '{"requests":[],"processed":[]}' > claude_sessions/verifier_claude/VERIFICATION_QUEUE.json
  ```

- [ ] 2. Create `/scripts/verifier_claude.js` with functions above

- [ ] 3. Add `triggerVerification()` to `governor_helpers.js`

- [ ] 4. Install pre-commit hook for enforcement

- [ ] 5. Update `AGENTIC_TEAM_CONFIGURATION.md` with Karen's session folder

- [ ] 6. Add Karen to `VALID_AGENTS` in `governor_helpers.js` (already done)

- [ ] 7. Test the workflow:
  ```bash
  # Submit a request
  node scripts/verifier_claude.js receive '{"from_agent":"Backend_Claude","task_id":"TEST-001","claim_type":"bug_fix","claim_description":"Test fix"}'

  # Check queue
  node scripts/verifier_claude.js queue

  # Run verification
  node scripts/verifier_claude.js verify REQ-XXX
  ```

---

## Appendix A: Error Messages and Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Request not found" | Invalid request ID | Check VERIFICATION_QUEUE.json |
| "Task not in VERIFIED state" | Agent tried to skip verification | Submit to verification queue first |
| "No test evidence submitted" | Bug fix without test output | Provide actual test execution output |
| "Deployment ID not verified" | Missing deployment ID in evidence | Include clasp deploy command with -i flag |
| "No screenshot evidence" | UI change without visual proof | Provide screenshot or DOM inspection |

---

## Appendix B: Karen's Constraints (From Documentation)

Karen CANNOT:
- Make code changes (only verify)
- Approve her own work
- Skip test execution
- Accept "it works" as evidence

Karen MUST:
- Execute tests (not just review code)
- Capture evidence
- Provide detailed verification reports
- Report to PM_Architect
- Send rejection notices to implementing agent

---

**Document Complete**

This specification provides everything needed to implement VERIFIER_CLAUDE (Karen) from the ground up, ensuring the verification protocol documented in AGENTIC_TEAM_CONFIGURATION.md becomes fully functional.
