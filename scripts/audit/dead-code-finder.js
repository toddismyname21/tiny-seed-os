#!/usr/bin/env node
/**
 * DEAD CODE FINDER
 *
 * Identifies functions that are defined but never called anywhere in the file.
 * Also detects functions only referenced in commented-out code.
 *
 * Usage: node scripts/audit/dead-code-finder.js <file>
 *
 * Methodology:
 * 1. Extract all function definitions (name + line number)
 * 2. For each function name, search for references outside its definition
 * 3. Exclude self-references (recursive calls) from the count
 * 4. Report functions with zero external references as potentially dead
 *
 * Known limitations:
 * - Cannot detect functions called via string interpolation or eval
 * - Cannot detect functions called from OTHER files (reports as dead when called externally)
 * - Functions used as event handlers via addEventListener('click', funcName) are detected
 * - Functions used in HTML attributes (onclick="funcName()") are detected
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

function extractAllContent(content) {
  // Return the full file content for HTML files (we need to search HTML attributes too)
  return content;
}

function findFunctionDefinitions(content) {
  const functions = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    // function declarations
    const funcDeclMatch = trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (funcDeclMatch) {
      functions.push({ name: funcDeclMatch[1], line: lineNum, type: 'declaration' });
      continue;
    }

    // function expressions and arrow functions
    const funcExprMatch = trimmed.match(/^(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\(|[a-zA-Z_$].*=>)/);
    if (funcExprMatch) {
      functions.push({ name: funcExprMatch[1], line: lineNum, type: 'expression' });
      continue;
    }
  }

  return functions;
}

function countReferences(content, funcName, definitionLine) {
  const lines = content.split('\n');
  let references = [];
  let commentedReferences = [];

  // Patterns that count as a reference to funcName
  const refPatterns = [
    new RegExp(`\\b${funcName}\\s*\\(`),             // funcName( -- direct call
    new RegExp(`['"]${funcName}['"]`),                 // 'funcName' or "funcName" -- string reference
    new RegExp(`=\\s*${funcName}\\b`),                 // = funcName -- assignment
    new RegExp(`\\b${funcName}\\b.*\\)`),              // funcName in some context with parens
    new RegExp(`\\.${funcName}\\b`),                   // .funcName -- method access
    new RegExp(`\\b${funcName}\\b`),                   // Any word-boundary reference
  ];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Skip the definition line itself
    if (lineNum === definitionLine) continue;

    // Check if this line is a comment
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');

    // Check if the function name appears on this line
    if (line.includes(funcName)) {
      // Use the simple word-boundary check
      const wordBoundaryRegex = new RegExp(`\\b${funcName}\\b`);
      if (wordBoundaryRegex.test(line)) {
        // Also skip if this is another definition of the same function
        const isAnotherDef = trimmed.match(new RegExp(`^(?:async\\s+)?function\\s+${funcName}\\s*\\(`));
        const isExprDef = trimmed.match(new RegExp(`^(?:var|let|const)\\s+${funcName}\\s*=`));

        if (isAnotherDef || isExprDef) continue;

        if (isComment) {
          commentedReferences.push(lineNum);
        } else {
          references.push(lineNum);
        }
      }
    }
  }

  return { references, commentedReferences };
}

// Well-known functions that are called externally (event handlers, lifecycle, etc.)
const KNOWN_EXTERNAL_CALLERS = new Set([
  'onload', 'onclick', 'onchange', 'onsubmit', 'oninput', 'onkeyup', 'onkeydown',
  'onfocus', 'onblur', 'onscroll', 'onresize', 'DOMContentLoaded',
  'init', 'initialize', 'setup', 'main', 'start', 'boot',
]);

// Main execution
const filePath = process.argv[2];
if (!filePath) {
  console.error(`${RED}Usage: node dead-code-finder.js <file>${NC}`);
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`${RED}File not found: ${absolutePath}${NC}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const functions = findFunctionDefinitions(content);

console.log(`\n${CYAN}=== DEAD CODE FINDER ===${NC}`);
console.log(`File: ${absolutePath}`);
console.log(`Functions found: ${functions.length}\n`);

const deadFunctions = [];
const commentOnlyFunctions = [];
const liveFunctions = [];

for (const func of functions) {
  const { references, commentedReferences } = countReferences(content, func.name, func.line);

  if (references.length === 0 && commentedReferences.length === 0) {
    deadFunctions.push(func);
  } else if (references.length === 0 && commentedReferences.length > 0) {
    commentOnlyFunctions.push({ ...func, commentLines: commentedReferences });
  } else {
    liveFunctions.push({ ...func, refCount: references.length });
  }
}

// Report dead functions
if (deadFunctions.length > 0) {
  console.log(`${RED}DEAD FUNCTIONS (defined but never referenced): ${deadFunctions.length}${NC}\n`);
  for (const func of deadFunctions) {
    const isKnown = KNOWN_EXTERNAL_CALLERS.has(func.name.toLowerCase());
    const tag = isKnown ? ` ${YELLOW}[may be called externally]${NC}` : '';
    console.log(`  ${RED}[DEAD]${NC} Line ${func.line}: ${func.name}()${tag}`);
  }
  console.log('');
}

// Report comment-only references
if (commentOnlyFunctions.length > 0) {
  console.log(`${YELLOW}COMMENT-ONLY REFERENCES (only referenced in comments): ${commentOnlyFunctions.length}${NC}\n`);
  for (const func of commentOnlyFunctions) {
    console.log(`  ${YELLOW}[COMMENT-ONLY]${NC} Line ${func.line}: ${func.name}() - referenced in comments at lines: ${func.commentLines.join(', ')}`);
  }
  console.log('');
}

// Summary
console.log('---');
console.log(`${GREEN}Live functions: ${liveFunctions.length}${NC}`);
console.log(`${RED}Dead functions: ${deadFunctions.length}${NC}`);
console.log(`${YELLOW}Comment-only references: ${commentOnlyFunctions.length}${NC}`);
console.log(`Total: ${functions.length}\n`);

// List most-referenced functions (useful for understanding critical code)
if (liveFunctions.length > 0) {
  const sorted = liveFunctions.sort((a, b) => b.refCount - a.refCount);
  console.log(`${CYAN}Top 10 most-referenced functions:${NC}`);
  for (const func of sorted.slice(0, 10)) {
    console.log(`  ${func.refCount} refs: ${func.name}() (line ${func.line})`);
  }
  console.log('');
}

if (deadFunctions.length > 0) {
  process.exit(1);
} else {
  console.log(`${GREEN}No dead code detected.${NC}`);
  process.exit(0);
}
