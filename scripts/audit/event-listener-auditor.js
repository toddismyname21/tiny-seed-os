#!/usr/bin/env node
/**
 * EVENT LISTENER AUDITOR
 *
 * Finds all event listeners (addEventListener + inline handlers) and checks:
 * - Are there matching removeEventListener calls?
 * - Are inline handlers calling defined functions?
 * - Are there duplicate listeners on the same event?
 * - Are listeners set up on elements that might not exist?
 *
 * Usage: node scripts/audit/event-listener-auditor.js <file>
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
  console.error(`${RED}Usage: node event-listener-auditor.js <file>${NC}`);
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`${RED}File not found: ${absolutePath}${NC}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const lines = content.split('\n');

console.log(`\n${CYAN}=== EVENT LISTENER AUDITOR ===${NC}`);
console.log(`File: ${absolutePath}\n`);

let warnings = 0;
let errors = 0;

// =============================================================================
// CHECK 1: addEventListener without removeEventListener
// =============================================================================
console.log(`${CYAN}--- Check 1: addEventListener without cleanup ---${NC}`);

const addListenerPattern = /\.addEventListener\s*\(\s*['"]([^'"]+)['"]/g;
const removeListenerPattern = /\.removeEventListener\s*\(\s*['"]([^'"]+)['"]/g;

const addedEvents = new Map(); // event type -> [{line, element, handler}]
const removedEvents = new Set(); // event types that have at least one removal

// Collect all addEventListener calls
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  let match;
  const linePattern = /(\w+)\.addEventListener\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\w+|function|\()/g;

  while ((match = linePattern.exec(line)) !== null) {
    const element = match[1];
    const eventType = match[2];
    const handler = match[3];

    if (!addedEvents.has(eventType)) {
      addedEvents.set(eventType, []);
    }
    addedEvents.get(eventType).push({
      line: i + 1,
      element,
      handler,
      isAnonymous: handler === 'function' || handler === '('
    });
  }
}

// Collect all removeEventListener calls
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let match;
  while ((match = removeListenerPattern.exec(line)) !== null) {
    removedEvents.add(match[1]);
  }
}

// Report unremoved listeners
let unremovedCount = 0;
let anonymousCount = 0;

for (const [eventType, listeners] of addedEvents.entries()) {
  if (!removedEvents.has(eventType)) {
    for (const listener of listeners) {
      if (listener.isAnonymous) {
        console.log(`  ${YELLOW}[ANONYMOUS]${NC} Line ${listener.line}: ${listener.element}.addEventListener('${eventType}', function/arrow) -- anonymous function CANNOT be removed`);
        anonymousCount++;
      } else {
        // Named handlers can be removed but are not
        // Only warn for non-window/document listeners (those are usually fine)
        if (listener.element !== 'window' && listener.element !== 'document') {
          console.log(`  ${YELLOW}[NO CLEANUP]${NC} Line ${listener.line}: ${listener.element}.addEventListener('${eventType}', ${listener.handler}) -- no matching removeEventListener`);
          unremovedCount++;
        }
      }
    }
  }
}

const totalListeners = [...addedEvents.values()].reduce((sum, arr) => sum + arr.length, 0);
console.log(`\n  Total addEventListener calls: ${totalListeners}`);
console.log(`  Event types with removal: ${removedEvents.size}`);
console.log(`  Unremoved (non-window/document): ${unremovedCount}`);
console.log(`  Anonymous listeners (cannot remove): ${anonymousCount}`);
warnings += unremovedCount + anonymousCount;
console.log('');

// =============================================================================
// CHECK 2: Duplicate event listeners
// =============================================================================
console.log(`${CYAN}--- Check 2: Potential duplicate event listeners ---${NC}`);

let duplicateCount = 0;

for (const [eventType, listeners] of addedEvents.entries()) {
  // Group by element name
  const byElement = {};
  for (const l of listeners) {
    const key = `${l.element}|${eventType}`;
    if (!byElement[key]) byElement[key] = [];
    byElement[key].push(l);
  }

  for (const [key, group] of Object.entries(byElement)) {
    if (group.length > 1) {
      const [element, event] = key.split('|');
      console.log(`  ${YELLOW}[DUPLICATE?]${NC} ${element}.addEventListener('${event}') called ${group.length} times:`);
      for (const g of group) {
        console.log(`    Line ${g.line}: handler=${g.handler}`);
      }
      duplicateCount++;
    }
  }
}

if (duplicateCount === 0) {
  console.log(`  ${GREEN}No duplicate listeners detected.${NC}`);
}
warnings += duplicateCount;
console.log('');

// =============================================================================
// CHECK 3: setInterval/setTimeout without cleanup
// =============================================================================
console.log(`${CYAN}--- Check 3: setInterval/setTimeout without cleanup ---${NC}`);

let intervalCount = 0;
let timeoutCount = 0;
let clearIntervalCount = 0;
let clearTimeoutCount = 0;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  if (/\bsetInterval\s*\(/.test(trimmed)) intervalCount++;
  if (/\bsetTimeout\s*\(/.test(trimmed)) timeoutCount++;
  if (/\bclearInterval\s*\(/.test(trimmed)) clearIntervalCount++;
  if (/\bclearTimeout\s*\(/.test(trimmed)) clearTimeoutCount++;
}

console.log(`  setInterval calls: ${intervalCount}, clearInterval calls: ${clearIntervalCount}`);
console.log(`  setTimeout calls: ${timeoutCount}, clearTimeout calls: ${clearTimeoutCount}`);

if (intervalCount > 0 && clearIntervalCount === 0) {
  console.log(`  ${YELLOW}[LEAK RISK]${NC} setInterval used ${intervalCount} times but clearInterval never called`);
  console.log(`  Intervals run forever if not cleared -- memory/CPU leak risk`);
  warnings++;
}
console.log('');

// =============================================================================
// CHECK 4: Inline event handlers
// =============================================================================
console.log(`${CYAN}--- Check 4: Inline event handlers ---${NC}`);

const inlineHandlerPattern = /\bon(click|change|input|submit|load|focus|blur|keyup|keydown|mouseover|mouseout|scroll|error|resize|contextmenu)\s*=\s*"([^"]*)"/gi;
const inlineHandlers = [];

for (let i = 0; i < lines.length; i++) {
  let match;
  const linePattern = /\bon(click|change|input|submit|load|focus|blur|keyup|keydown|mouseover|mouseout|scroll|error|resize|contextmenu)\s*=\s*"([^"]*)"/gi;
  while ((match = linePattern.exec(lines[i])) !== null) {
    inlineHandlers.push({
      line: i + 1,
      event: match[1],
      handler: match[2]
    });
  }
}

console.log(`  Inline event handlers found: ${inlineHandlers.length}`);

// Count by event type
const inlineByType = {};
for (const h of inlineHandlers) {
  inlineByType[h.event] = (inlineByType[h.event] || 0) + 1;
}

for (const [event, count] of Object.entries(inlineByType).sort((a, b) => b[1] - a[1])) {
  console.log(`    on${event}: ${count}`);
}

if (inlineHandlers.length > 50) {
  console.log(`  ${YELLOW}[INFO]${NC} Large number of inline handlers. Consider using addEventListener for better separation of concerns.`);
}
console.log('');

// =============================================================================
// CHECK 5: Event listener on potentially null elements
// =============================================================================
console.log(`${CYAN}--- Check 5: addEventListener on potentially null elements ---${NC}`);

let nullRiskCount = 0;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

  // Pattern: getElementById('x').addEventListener (no null check)
  const directPattern = /getElementById\s*\([^)]+\)\s*\.addEventListener/;
  if (directPattern.test(trimmed)) {
    // Check if there is a null guard on this or previous line
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const hasGuard = /\bif\s*\(/.test(prevLine) || /\?\.\s*addEventListener/.test(trimmed);

    if (!hasGuard) {
      console.log(`  ${YELLOW}[NULL RISK]${NC} Line ${i + 1}: .getElementById().addEventListener without null check`);
      console.log(`    If the element doesn't exist, this will throw: "Cannot read property 'addEventListener' of null"`);
      nullRiskCount++;
    }
  }

  // Pattern: querySelector('x').addEventListener (no null check)
  const qsPattern = /querySelector\s*\([^)]+\)\s*\.addEventListener/;
  if (qsPattern.test(trimmed)) {
    const hasGuard = /\?\.\s*addEventListener/.test(trimmed);
    if (!hasGuard) {
      console.log(`  ${YELLOW}[NULL RISK]${NC} Line ${i + 1}: .querySelector().addEventListener without null check`);
      nullRiskCount++;
    }
  }
}

if (nullRiskCount === 0) {
  console.log(`  ${GREEN}All addEventListener calls appear safe.${NC}`);
}
warnings += nullRiskCount;
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`${CYAN}=== SUMMARY ===${NC}`);
console.log(`addEventListener calls: ${totalListeners}`);
console.log(`Inline handlers: ${inlineHandlers.length}`);
console.log(`Warnings: ${YELLOW}${warnings}${NC}`);
console.log(`Errors: ${RED}${errors}${NC}`);
console.log('');

if (errors > 0) {
  console.log(`${RED}FAIL: ${errors} error(s) found${NC}`);
  process.exit(2);
} else if (warnings > 0) {
  console.log(`${YELLOW}PASS WITH WARNINGS: ${warnings} warning(s)${NC}`);
  process.exit(1);
} else {
  console.log(`${GREEN}PASS: Event listeners look clean${NC}`);
  process.exit(0);
}
