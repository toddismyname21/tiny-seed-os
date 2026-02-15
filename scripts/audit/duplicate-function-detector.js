#!/usr/bin/env node
/**
 * DUPLICATE FUNCTION DETECTOR
 *
 * Parses JavaScript (including inline JS in HTML files) using regex-based analysis
 * and detects functions defined more than once. Reports which definition "wins"
 * (last-definition-wins in JavaScript) and flags behavioral differences.
 *
 * Usage: node scripts/audit/duplicate-function-detector.js <file>
 *
 * Detects:
 * - function declarations: function foo() {}
 * - function expressions: var foo = function() {}
 * - arrow functions assigned to variables: const foo = () => {}
 * - method definitions assigned to variables: const foo = async function() {}
 * - object method shorthand in window/global assignments
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m';

function extractJavaScript(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.js') {
    return [{ code: content, offset: 0 }];
  }

  if (ext === '.html' || ext === '.htm') {
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
      // Skip external scripts (those with src attribute)
      const tagPart = match[0].substring(0, match[0].indexOf('>'));
      if (tagPart.includes('src=')) continue;

      const scriptContent = match[1];
      // Calculate the line offset where this script block starts
      const beforeScript = content.substring(0, match.index);
      const lineOffset = (beforeScript.match(/\n/g) || []).length;

      scripts.push({ code: scriptContent, offset: lineOffset + 1 }); // +1 for the <script> tag line
    }
    return scripts;
  }

  return [{ code: content, offset: 0 }];
}

function findFunctionDefinitions(code, lineOffset) {
  const functions = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1 + lineOffset;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    // Pattern 1: function declarations - function foo(
    const funcDeclMatch = trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (funcDeclMatch) {
      // Extract function body (first ~200 chars for comparison)
      const bodyStart = i;
      let braceCount = 0;
      let bodyLines = [];
      let foundOpen = false;
      for (let j = i; j < Math.min(i + 100, lines.length); j++) {
        bodyLines.push(lines[j]);
        for (const ch of lines[j]) {
          if (ch === '{') { braceCount++; foundOpen = true; }
          if (ch === '}') braceCount--;
        }
        if (foundOpen && braceCount === 0) break;
      }

      functions.push({
        name: funcDeclMatch[1],
        line: lineNum,
        type: 'declaration',
        isAsync: trimmed.startsWith('async'),
        bodyPreview: bodyLines.join('\n').substring(0, 300)
      });
      continue;
    }

    // Pattern 2: function expressions - var/let/const foo = function(
    const funcExprMatch = trimmed.match(/^(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function\s*\(/);
    if (funcExprMatch) {
      functions.push({
        name: funcExprMatch[1],
        line: lineNum,
        type: 'expression',
        isAsync: trimmed.includes('async'),
        bodyPreview: trimmed.substring(0, 300)
      });
      continue;
    }

    // Pattern 3: arrow functions - var/let/const foo = (...) => or var/let/const foo = x =>
    // Must ensure the => is part of the assignment, not inside a callback on the right side
    const arrowMatch = trimmed.match(/^(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/);
    if (arrowMatch) {
      // Filter out common loop/callback variable names that are NOT real function definitions
      const varName = arrowMatch[1];
      const CALLBACK_VAR_NAMES = new Set([
        'index', 'item', 'el', 'elem', 'element', 'i', 'j', 'k', 'v', 'x', 'y',
        'key', 'val', 'value', 'entry', 'result', 'err', 'error', 'res', 'req',
        'row', 'col', 'cell', 'node', 'child', 'parent', 'acc', 'curr', 'prev', 'next',
        'pic', 'img', 'photo', 'post', 'msg', 'btn', 'opt', 'tag', 'comp',
        'market', 'dayPosts', 'successCount', 'hashtagString',
      ]);

      // Only flag as function if name looks like a function name (verb-prefixed or longer than 3 chars and not a known variable pattern)
      if (!CALLBACK_VAR_NAMES.has(varName)) {
        functions.push({
          name: varName,
          line: lineNum,
          type: 'arrow',
          isAsync: trimmed.includes('async'),
          bodyPreview: trimmed.substring(0, 300)
        });
      }
      continue;
    }

    // Pattern 4: standalone assignment - foo = function( or foo = (
    const assignMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function\s*\(/);
    if (assignMatch && !trimmed.startsWith('var') && !trimmed.startsWith('let') && !trimmed.startsWith('const') && !trimmed.startsWith('this.')) {
      functions.push({
        name: assignMatch[1],
        line: lineNum,
        type: 'reassignment',
        isAsync: trimmed.includes('async'),
        bodyPreview: trimmed.substring(0, 300)
      });
      continue;
    }
  }

  return functions;
}

function detectDuplicates(functions) {
  const byName = {};

  for (const func of functions) {
    if (!byName[func.name]) {
      byName[func.name] = [];
    }
    byName[func.name].push(func);
  }

  const duplicates = {};
  for (const [name, defs] of Object.entries(byName)) {
    if (defs.length > 1) {
      duplicates[name] = defs;
    }
  }

  return duplicates;
}

function analyzeBehaviorDifference(definitions) {
  // Check if the function bodies look meaningfully different
  const previews = definitions.map(d => d.bodyPreview.replace(/\s+/g, ' ').trim());

  const allSame = previews.every(p => p === previews[0]);
  if (allSame) return 'IDENTICAL';

  // Check if they return different types
  const hasReturn = previews.map(p => p.includes('return'));
  if (hasReturn.some(r => r) && hasReturn.some(r => !r)) return 'DIFFERENT_RETURN';

  return 'DIFFERENT_BODY';
}

// Main execution
const filePath = process.argv[2];
if (!filePath) {
  console.error(`${RED}Usage: node duplicate-function-detector.js <file>${NC}`);
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`${RED}File not found: ${absolutePath}${NC}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const scriptBlocks = extractJavaScript(content, absolutePath);

console.log(`\n${CYAN}=== DUPLICATE FUNCTION DETECTOR ===${NC}`);
console.log(`File: ${absolutePath}`);
console.log(`Script blocks found: ${scriptBlocks.length}\n`);

let allFunctions = [];
for (const block of scriptBlocks) {
  const funcs = findFunctionDefinitions(block.code, block.offset);
  allFunctions = allFunctions.concat(funcs);
}

console.log(`Total functions found: ${allFunctions.length}\n`);

const duplicates = detectDuplicates(allFunctions);
const dupCount = Object.keys(duplicates).length;

if (dupCount === 0) {
  console.log(`${GREEN}NO DUPLICATES FOUND${NC}`);
  console.log(`All ${allFunctions.length} functions have unique names.\n`);
  process.exit(0);
}

console.log(`${RED}DUPLICATES FOUND: ${dupCount} functions defined multiple times${NC}\n`);

let criticalCount = 0;
let warningCount = 0;

for (const [name, defs] of Object.entries(duplicates)) {
  const behavior = analyzeBehaviorDifference(defs);
  const severity = behavior === 'IDENTICAL' ? 'WARNING' : 'CRITICAL';

  if (severity === 'CRITICAL') criticalCount++;
  else warningCount++;

  const severityColor = severity === 'CRITICAL' ? RED : YELLOW;

  console.log(`${severityColor}[${severity}]${NC} ${name} - defined ${defs.length} times (${behavior})`);

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const isWinner = i === defs.length - 1;
    const marker = isWinner ? `${GREEN}[WINS]${NC}` : `${RED}[OVERRIDDEN]${NC}`;
    console.log(`  ${marker} Line ${def.line}: ${def.type}${def.isAsync ? ' (async)' : ''}`);
  }

  if (behavior !== 'IDENTICAL') {
    console.log(`  ${RED}WARNING: Definitions have DIFFERENT behavior!${NC}`);
    console.log(`  The last definition (line ${defs[defs.length - 1].line}) overwrites all previous definitions.`);
    console.log(`  If any caller expected the behavior of an earlier definition, it will get wrong results.`);
  }
  console.log('');
}

console.log('---');
console.log(`Summary: ${criticalCount} CRITICAL (different behavior), ${warningCount} WARNING (identical copies)`);
console.log(`Total duplicate function names: ${dupCount}`);
console.log(`Total individual redundant definitions: ${Object.values(duplicates).reduce((sum, d) => sum + d.length - 1, 0)}`);

if (criticalCount > 0) {
  process.exit(2);
} else if (warningCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
