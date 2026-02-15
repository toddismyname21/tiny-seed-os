#!/usr/bin/env node
/**
 * STUB FUNCTION DETECTOR
 *
 * Identifies functions that look real but do nothing meaningful:
 * - Empty function bodies
 * - Functions that only console.log
 * - Functions that only have TODO/FIXME comments
 * - Functions that return hardcoded placeholder values
 * - Functions that throw "not implemented" errors
 *
 * These are dangerous because callers think they work.
 *
 * Usage: node scripts/audit/stub-function-detector.js <file>
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
  console.error(`${RED}Usage: node stub-function-detector.js <file>${NC}`);
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`${RED}File not found: ${absolutePath}${NC}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const lines = content.split('\n');

console.log(`\n${CYAN}=== STUB FUNCTION DETECTOR ===${NC}`);
console.log(`File: ${absolutePath}\n`);

const stubs = [];
const STUB_PATTERNS = {
  EMPTY: /^(async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*\}\s*$/,
  TODO_ONLY: /TODO|FIXME|HACK|XXX|PLACEHOLDER/i,
  NOT_IMPLEMENTED: /not\s*implemented|not\s*yet|coming\s*soon|placeholder/i,
  CONSOLE_ONLY: /^\s*console\.(log|warn|info|debug|error)\s*\(/,
  RETURN_NULL: /^\s*return\s+(null|undefined|false|''|""|0|\[\]|\{\})\s*;?\s*$/,
  NOOP_ALERT: /^\s*alert\s*\(\s*['"].*not.*implement|todo/i,
};

function extractFunctionBody(startLine) {
  let braceCount = 0;
  let foundOpen = false;
  const bodyLines = [];
  let openLine = startLine;

  for (let j = startLine; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === '{') {
        if (!foundOpen) openLine = j;
        braceCount++;
        foundOpen = true;
      }
      if (ch === '}') braceCount--;
    }

    if (foundOpen && j > openLine) {
      // Only include lines INSIDE the function body (not the opening/closing braces)
      bodyLines.push({ text: lines[j], lineNum: j + 1 });
    }

    if (foundOpen && braceCount === 0) {
      // Remove the last line (closing brace)
      bodyLines.pop();
      return { bodyLines, endLine: j + 1 };
    }
  }

  return { bodyLines, endLine: lines.length };
}

function classifyStub(bodyLines) {
  // Filter out empty lines and pure whitespace
  const meaningful = bodyLines.filter(l => l.text.trim().length > 0);

  // Check: completely empty body
  if (meaningful.length === 0) {
    return { type: 'EMPTY', severity: 'HIGH', reason: 'Function body is empty' };
  }

  // Check: body is only comments
  const nonCommentLines = meaningful.filter(l => {
    const t = l.text.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  });

  if (nonCommentLines.length === 0) {
    // Check if comments contain TODO
    const hasTodo = meaningful.some(l => STUB_PATTERNS.TODO_ONLY.test(l.text));
    if (hasTodo) {
      return { type: 'TODO_STUB', severity: 'HIGH', reason: 'Function body contains only TODO/FIXME comments' };
    }
    return { type: 'COMMENT_ONLY', severity: 'MEDIUM', reason: 'Function body contains only comments' };
  }

  // Check: body is only console.log statements
  const allConsole = nonCommentLines.every(l => STUB_PATTERNS.CONSOLE_ONLY.test(l.text));
  if (allConsole && nonCommentLines.length <= 3) {
    return { type: 'CONSOLE_ONLY', severity: 'HIGH', reason: 'Function body only contains console.log statements' };
  }

  // Check: body is a single return null/undefined/false/empty
  if (nonCommentLines.length === 1) {
    if (STUB_PATTERNS.RETURN_NULL.test(nonCommentLines[0].text)) {
      return { type: 'RETURN_NOTHING', severity: 'MEDIUM', reason: `Function returns a placeholder value: ${nonCommentLines[0].text.trim()}` };
    }
  }

  // Check: body contains "not implemented" style messages
  const hasNotImpl = meaningful.some(l => STUB_PATTERNS.NOT_IMPLEMENTED.test(l.text));
  if (hasNotImpl) {
    return { type: 'NOT_IMPLEMENTED', severity: 'HIGH', reason: 'Function contains "not implemented" or "placeholder" language' };
  }

  // Not a stub
  return null;
}

// Scan for function definitions
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();

  // Skip comments
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

  // Function declarations
  const funcDeclMatch = trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
  if (funcDeclMatch) {
    const name = funcDeclMatch[1];
    const { bodyLines, endLine } = extractFunctionBody(i);
    const classification = classifyStub(bodyLines);

    if (classification) {
      stubs.push({
        name,
        line: i + 1,
        endLine,
        ...classification,
        bodyPreview: bodyLines.slice(0, 3).map(l => l.text.trim()).join(' | '),
      });
    }

    // Skip to end of function
    i = endLine - 1;
    continue;
  }

  // Function expressions / arrow functions
  const funcExprMatch = trimmed.match(/^(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\()/);
  if (funcExprMatch) {
    const name = funcExprMatch[1];
    const { bodyLines, endLine } = extractFunctionBody(i);
    const classification = classifyStub(bodyLines);

    if (classification) {
      stubs.push({
        name,
        line: i + 1,
        endLine,
        ...classification,
        bodyPreview: bodyLines.slice(0, 3).map(l => l.text.trim()).join(' | '),
      });
    }

    i = endLine - 1;
  }
}

// Report findings
if (stubs.length === 0) {
  console.log(`${GREEN}No stub functions detected.${NC}`);
  console.log(`All functions have meaningful implementations.\n`);
  process.exit(0);
}

const highCount = stubs.filter(s => s.severity === 'HIGH').length;
const medCount = stubs.filter(s => s.severity === 'MEDIUM').length;

console.log(`${RED}STUB FUNCTIONS FOUND: ${stubs.length}${NC}\n`);

// Group by severity
for (const severity of ['HIGH', 'MEDIUM']) {
  const group = stubs.filter(s => s.severity === severity);
  if (group.length === 0) continue;

  const color = severity === 'HIGH' ? RED : YELLOW;
  console.log(`${color}${severity} SEVERITY (${group.length}):${NC}`);

  for (const stub of group) {
    console.log(`  ${color}[${stub.type}]${NC} Line ${stub.line}: ${stub.name}()`);
    console.log(`    Reason: ${stub.reason}`);
    if (stub.bodyPreview) {
      console.log(`    Preview: ${stub.bodyPreview.substring(0, 100)}`);
    }
  }
  console.log('');
}

// Check which stubs are actually called (dangerous!)
console.log(`${CYAN}--- Stub functions that are CALLED (dangerous!) ---${NC}`);
let dangerousCount = 0;

for (const stub of stubs) {
  // Search for calls to this stub
  const callPattern = new RegExp(`\\b${stub.name}\\s*\\(`, 'g');
  let callLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (i + 1 === stub.line) continue; // Skip the definition
    if (callPattern.test(lines[i])) {
      callLines.push(i + 1);
    }
    callPattern.lastIndex = 0; // Reset regex
  }

  if (callLines.length > 0) {
    console.log(`  ${RED}[DANGER]${NC} ${stub.name}() is a ${stub.type} stub but is CALLED at lines: ${callLines.join(', ')}`);
    console.log(`    Callers expect this function to work, but it does nothing!`);
    dangerousCount++;
  }
}

if (dangerousCount === 0) {
  console.log(`  ${GREEN}No stub functions are actively called.${NC}`);
}
console.log('');

// Summary
console.log('---');
console.log(`Total stubs: ${stubs.length} (${highCount} HIGH, ${medCount} MEDIUM)`);
console.log(`Dangerous (called stubs): ${dangerousCount}`);
console.log('');

if (dangerousCount > 0) {
  console.log(`${RED}FAIL: ${dangerousCount} stub function(s) are being called by live code${NC}`);
  process.exit(2);
} else if (highCount > 0) {
  console.log(`${YELLOW}WARNING: ${highCount} HIGH severity stubs found${NC}`);
  process.exit(1);
} else {
  console.log(`${YELLOW}INFO: Only MEDIUM severity stubs found${NC}`);
  process.exit(0);
}
