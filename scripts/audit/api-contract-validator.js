#!/usr/bin/env node
/**
 * API CONTRACT VALIDATOR
 *
 * Extracts all API calls from frontend code and catalogs:
 * - Request URL (should use centralized API_URL)
 * - HTTP method
 * - Request body fields
 * - Expected response fields
 * - Action parameters
 *
 * Then validates:
 * - No hardcoded API URLs
 * - All API calls have error handling
 * - Action names are consistent
 * - Request payloads include required fields
 *
 * Usage: node scripts/audit/api-contract-validator.js <file>
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m';

const filePath = process.argv[2];
if (!filePath) {
  console.error(`${RED}Usage: node api-contract-validator.js <file>${NC}`);
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`${RED}File not found: ${absolutePath}${NC}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const lines = content.split('\n');

console.log(`\n${CYAN}=== API CONTRACT VALIDATOR ===${NC}`);
console.log(`File: ${absolutePath}\n`);

let errors = 0;
let warnings = 0;

// =============================================================================
// CHECK 1: Hardcoded API URLs
// =============================================================================
console.log(`${CYAN}--- Check 1: Hardcoded API URLs ---${NC}`);

const googleScriptPattern = /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Skip comments
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

  // Skip the line that defines the API_URL constant itself (that is fine)
  if (trimmed.includes('TINY_SEED_API') || trimmed.includes('api-config')) continue;

  const matches = line.match(googleScriptPattern);
  if (matches) {
    console.log(`  ${RED}[HARDCODED URL]${NC} Line ${i + 1}: Found hardcoded Google Script URL`);
    console.log(`    ${line.trim().substring(0, 120)}`);
    errors++;
  }
}

if (errors === 0) {
  console.log(`  ${GREEN}No hardcoded API URLs found.${NC}`);
}
console.log('');

// =============================================================================
// CHECK 2: Fetch calls without error handling
// =============================================================================
console.log(`${CYAN}--- Check 2: Fetch calls without error handling ---${NC}`);

let fetchCount = 0;
let unhandledFetches = 0;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();

  // Skip comments
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  // Look for fetch( calls
  if (/\bfetch\s*\(/.test(trimmed)) {
    fetchCount++;

    // Look within a reasonable range (50 lines) for error handling
    let hasCatch = false;
    let hasTryCatch = false;

    // Check backwards for try {
    for (let j = Math.max(0, i - 20); j < i; j++) {
      if (/\btry\s*\{/.test(lines[j])) {
        hasTryCatch = true;
        break;
      }
    }

    // Check forwards for .catch or catch {
    for (let j = i; j < Math.min(lines.length, i + 50); j++) {
      if (/\.catch\s*\(/.test(lines[j]) || /\bcatch\s*\(/.test(lines[j])) {
        hasCatch = true;
        break;
      }
    }

    if (!hasCatch && !hasTryCatch) {
      console.log(`  ${RED}[NO ERROR HANDLING]${NC} Line ${i + 1}: fetch() without try/catch or .catch()`);
      console.log(`    ${trimmed.substring(0, 120)}`);
      errors++;
      unhandledFetches++;
    }
  }
}

console.log(`  Total fetch calls: ${fetchCount}`);
console.log(`  Unhandled: ${unhandledFetches}`);
if (unhandledFetches === 0 && fetchCount > 0) {
  console.log(`  ${GREEN}All fetch calls have error handling.${NC}`);
}
console.log('');

// =============================================================================
// CHECK 3: API Action Names
// =============================================================================
console.log(`${CYAN}--- Check 3: API Action Names ---${NC}`);

const actionPattern = /action['"]?\s*[:=]\s*['"]([^'"]+)['"]/g;
const actions = new Map(); // action name -> [line numbers]

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  let match;
  const lineActionPattern = /action['"]?\s*[:=]\s*['"]([^'"]+)['"]/g;
  while ((match = lineActionPattern.exec(lines[i])) !== null) {
    const actionName = match[1];
    if (!actions.has(actionName)) {
      actions.set(actionName, []);
    }
    actions.get(actionName).push(i + 1);
  }
}

// Also check for action in URL params: ?action=something
const urlActionPattern = /[?&]action=([a-zA-Z0-9_]+)/g;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  let match;
  const linePattern = /[?&]action=([a-zA-Z0-9_]+)/g;
  while ((match = linePattern.exec(lines[i])) !== null) {
    const actionName = match[1];
    if (!actions.has(actionName)) {
      actions.set(actionName, []);
    }
    actions.get(actionName).push(i + 1);
  }
}

console.log(`  Unique API actions found: ${actions.size}`);

// List all actions
const sortedActions = [...actions.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [action, lineNums] of sortedActions) {
  const occurrences = lineNums.length > 3 ? `${lineNums.slice(0, 3).join(', ')}... (${lineNums.length} total)` : lineNums.join(', ');
  console.log(`    ${action} (lines: ${occurrences})`);
}

// Check for suspicious action names (typo patterns)
const actionNames = [...actions.keys()];
for (let i = 0; i < actionNames.length; i++) {
  for (let j = i + 1; j < actionNames.length; j++) {
    const a = actionNames[i].toLowerCase();
    const b = actionNames[j].toLowerCase();
    // Simple similarity check: same start, different by 1-2 chars
    if (a.length > 5 && b.length > 5) {
      const minLen = Math.min(a.length, b.length);
      let diffs = 0;
      for (let k = 0; k < minLen; k++) {
        if (a[k] !== b[k]) diffs++;
      }
      diffs += Math.abs(a.length - b.length);
      if (diffs <= 2 && diffs > 0) {
        console.log(`  ${YELLOW}[POSSIBLE TYPO]${NC} '${actionNames[i]}' and '${actionNames[j]}' are very similar -- check if one is a typo`);
        warnings++;
      }
    }
  }
}
console.log('');

// =============================================================================
// CHECK 4: Response handling patterns
// =============================================================================
console.log(`${CYAN}--- Check 4: Response handling patterns ---${NC}`);

let responseCheckCount = 0;
let missingResponseCheck = 0;

// Look for patterns where fetch result is used
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  // Pattern: .json() or response.json()
  if (/\.json\s*\(\s*\)/.test(trimmed)) {
    responseCheckCount++;

    // Look ahead for success/ok check
    let hasCheck = false;
    for (let j = i; j < Math.min(lines.length, i + 15); j++) {
      if (/\.success|\.ok|result\.error|data\.error|response\.status/i.test(lines[j])) {
        hasCheck = true;
        break;
      }
    }

    if (!hasCheck) {
      console.log(`  ${YELLOW}[NO RESPONSE CHECK]${NC} Line ${i + 1}: .json() called but no success/error check within 15 lines`);
      warnings++;
      missingResponseCheck++;
    }
  }
}

console.log(`  Response parsing calls: ${responseCheckCount}`);
console.log(`  Missing success/error check: ${missingResponseCheck}`);
console.log('');

// =============================================================================
// CHECK 5: Request body consistency
// =============================================================================
console.log(`${CYAN}--- Check 5: Request body analysis ---${NC}`);

// Find JSON.stringify patterns to extract payload structures
const payloadPattern = /JSON\.stringify\s*\(\s*\{([^}]+)\}/g;
let payloadCount = 0;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  // Look for multi-line JSON.stringify
  if (/JSON\.stringify\s*\(/.test(trimmed)) {
    payloadCount++;

    // Extract the object being stringified (next ~20 lines)
    let objectLines = '';
    let braceCount = 0;
    let started = false;
    for (let j = i; j < Math.min(lines.length, i + 30); j++) {
      const l = lines[j];
      for (const ch of l) {
        if (ch === '{') { braceCount++; started = true; }
        if (ch === '}') braceCount--;
      }
      objectLines += l + '\n';
      if (started && braceCount <= 0) break;
    }

    // Extract field names from the payload
    const fieldPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
    const fields = [];
    let match;
    while ((match = fieldPattern.exec(objectLines)) !== null) {
      fields.push(match[1]);
    }

    // Check if 'action' field is present (required for Google Apps Script)
    if (fields.length > 0 && !fields.includes('action')) {
      console.log(`  ${YELLOW}[MISSING ACTION]${NC} Line ${i + 1}: JSON payload has no 'action' field`);
      console.log(`    Fields: ${fields.join(', ')}`);
      warnings++;
    }
  }
}

console.log(`  Total API payloads found: ${payloadCount}`);
console.log('');

// =============================================================================
// CHECK 6: AbortController / timeout usage
// =============================================================================
console.log(`${CYAN}--- Check 6: Request timeout/abort handling ---${NC}`);

const hasAbortController = content.includes('AbortController');
const hasTimeout = content.includes('signal:') || content.includes('AbortSignal.timeout');

if (fetchCount > 0 && !hasAbortController && !hasTimeout) {
  console.log(`  ${YELLOW}[NO TIMEOUT]${NC} ${fetchCount} fetch calls but no AbortController or timeout signal found`);
  console.log(`  Requests could hang indefinitely on slow/dead backend`);
  warnings++;
} else if (hasAbortController || hasTimeout) {
  console.log(`  ${GREEN}AbortController/timeout handling found.${NC}`);
} else {
  console.log(`  No fetch calls to check.`);
}
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`${CYAN}=== SUMMARY ===${NC}`);
console.log(`Errors: ${RED}${errors}${NC}`);
console.log(`Warnings: ${YELLOW}${warnings}${NC}`);
console.log(`Fetch calls: ${fetchCount}`);
console.log(`API actions: ${actions.size}`);
console.log(`API payloads: ${payloadCount}`);
console.log('');

if (errors > 0) {
  console.log(`${RED}FAIL: ${errors} error(s) found${NC}`);
  process.exit(2);
} else if (warnings > 0) {
  console.log(`${YELLOW}PASS WITH WARNINGS: ${warnings} warning(s)${NC}`);
  process.exit(1);
} else {
  console.log(`${GREEN}PASS: All API contracts look correct${NC}`);
  process.exit(0);
}
