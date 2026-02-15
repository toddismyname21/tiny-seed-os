#!/usr/bin/env node
/**
 * FUNCTION CALL GRAPH BUILDER
 *
 * Builds a call graph showing which functions call which other functions.
 * Identifies:
 * - Unreachable functions (no callers)
 * - Circular call chains
 * - High fan-out functions (call many others -- fragile)
 * - High fan-in functions (called by many -- critical)
 *
 * Usage: node scripts/audit/function-call-graph.js <file> [--json] [--top N]
 *
 * Options:
 *   --json   Output full call graph as JSON
 *   --top N  Show top N functions by fan-in/fan-out (default: 15)
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const topIdx = args.indexOf('--top');
const topN = topIdx !== -1 ? parseInt(args[topIdx + 1]) || 15 : 15;
const filePath = args.find(a => !a.startsWith('--') && (topIdx === -1 || args.indexOf(a) !== topIdx + 1));

if (!filePath) {
  console.error(`${RED}Usage: node function-call-graph.js <file> [--json] [--top N]${NC}`);
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`${RED}File not found: ${absolutePath}${NC}`);
  process.exit(1);
}

const content = fs.readFileSync(absolutePath, 'utf8');
const lines = content.split('\n');

// Phase 1: Find all function definitions
function findFunctions() {
  const functions = new Map(); // name -> { line, endLine }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // function declarations
    const funcDeclMatch = trimmed.match(/^(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (funcDeclMatch) {
      const name = funcDeclMatch[1];
      // Find the end of this function (matching braces)
      let braceCount = 0;
      let foundOpen = false;
      let endLine = i;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') { braceCount++; foundOpen = true; }
          if (ch === '}') braceCount--;
        }
        if (foundOpen && braceCount === 0) {
          endLine = j;
          break;
        }
      }

      // If name already exists, this is a duplicate -- store the later one as it "wins"
      functions.set(name, { line: i + 1, endLine: endLine + 1 });
      continue;
    }

    // function expressions / arrow functions
    const funcExprMatch = trimmed.match(/^(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\(|[a-zA-Z_$].*=>)/);
    if (funcExprMatch) {
      const name = funcExprMatch[1];
      let braceCount = 0;
      let foundOpen = false;
      let endLine = i;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') { braceCount++; foundOpen = true; }
          if (ch === '}') braceCount--;
        }
        if (foundOpen && braceCount === 0) {
          endLine = j;
          break;
        }
      }
      functions.set(name, { line: i + 1, endLine: endLine + 1 });
    }
  }

  return functions;
}

// Phase 2: Find calls within each function
function buildCallGraph(functions) {
  const graph = {}; // caller -> [callees]
  const reverseGraph = {}; // callee -> [callers]
  const allFuncNames = new Set(functions.keys());

  for (const [name, { line, endLine }] of functions.entries()) {
    graph[name] = new Set();
    if (!reverseGraph[name]) reverseGraph[name] = new Set();

    // Scan the body of this function for calls to other known functions
    for (let i = line - 1; i < endLine; i++) {
      const lineContent = lines[i] || '';
      const trimmed = lineContent.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

      for (const targetName of allFuncNames) {
        if (targetName === name) continue; // Skip self-references for graph purposes (but detect them)

        // Check for word-boundary reference followed by (
        const callRegex = new RegExp(`\\b${targetName}\\s*\\(`);
        if (callRegex.test(lineContent)) {
          graph[name].add(targetName);
          if (!reverseGraph[targetName]) reverseGraph[targetName] = new Set();
          reverseGraph[targetName].add(name);
        }
      }
    }

    // Convert Set to Array
    graph[name] = [...graph[name]];
  }

  // Convert reverse graph Sets to Arrays
  for (const key of Object.keys(reverseGraph)) {
    reverseGraph[key] = [...reverseGraph[key]];
  }

  return { graph, reverseGraph };
}

// Phase 3: Detect cycles using DFS
function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();
  const path = [];

  function dfs(node) {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        cycles.push(cycle);
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

// Phase 4: Find entry points (functions with no callers -- called from HTML or event system)
function findEntryPoints(reverseGraph, functions) {
  const entryPoints = [];
  for (const name of functions.keys()) {
    if (!reverseGraph[name] || reverseGraph[name].length === 0) {
      entryPoints.push(name);
    }
  }
  return entryPoints;
}

// Main execution
const functions = findFunctions();
const { graph, reverseGraph } = buildCallGraph(functions);
const cycles = detectCycles(graph);
const entryPoints = findEntryPoints(reverseGraph, functions);

if (jsonOutput) {
  const output = {
    file: absolutePath,
    functionCount: functions.size,
    callGraph: graph,
    reverseGraph: reverseGraph,
    cycles: cycles,
    entryPoints: entryPoints,
    fanOut: Object.entries(graph).map(([k, v]) => ({ name: k, callCount: v.length })).sort((a, b) => b.callCount - a.callCount),
    fanIn: Object.entries(reverseGraph).map(([k, v]) => ({ name: k, callerCount: v.length })).sort((a, b) => b.callerCount - a.callerCount),
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

console.log(`\n${CYAN}=== FUNCTION CALL GRAPH ===${NC}`);
console.log(`File: ${absolutePath}`);
console.log(`Functions found: ${functions.size}`);
console.log(`Entry points (no callers): ${entryPoints.length}`);
console.log(`Circular call chains: ${cycles.length}`);
console.log('');

// Report cycles
if (cycles.length > 0) {
  console.log(`${RED}CIRCULAR CALL CHAINS:${NC}`);
  for (const cycle of cycles.slice(0, 10)) {
    console.log(`  ${RED}[CYCLE]${NC} ${cycle.join(' -> ')}`);
  }
  if (cycles.length > 10) {
    console.log(`  ... and ${cycles.length - 10} more`);
  }
  console.log('');
}

// Report entry points (these are called from HTML/events, not from other JS functions)
console.log(`${CYAN}ENTRY POINTS (called from HTML/events/external, not from other functions):${NC}`);
for (const ep of entryPoints.slice(0, 30)) {
  const info = functions.get(ep);
  const callCount = (graph[ep] || []).length;
  console.log(`  Line ${info.line}: ${ep}() -> calls ${callCount} function(s)`);
}
if (entryPoints.length > 30) {
  console.log(`  ... and ${entryPoints.length - 30} more`);
}
console.log('');

// Report top fan-out (functions that call the most other functions)
const fanOutSorted = Object.entries(graph)
  .map(([name, callees]) => ({ name, count: callees.length, callees }))
  .sort((a, b) => b.count - a.count);

console.log(`${CYAN}TOP ${topN} HIGHEST FAN-OUT (calls most functions -- complex/fragile):${NC}`);
for (const item of fanOutSorted.slice(0, topN)) {
  if (item.count === 0) break;
  const info = functions.get(item.name);
  console.log(`  ${item.count} calls: ${item.name}() (line ${info.line})`);
  if (item.count <= 5) {
    console.log(`    ${DIM}-> ${item.callees.join(', ')}${NC}`);
  }
}
console.log('');

// Report top fan-in (functions called by the most other functions)
const fanInSorted = Object.entries(reverseGraph)
  .map(([name, callers]) => ({ name, count: callers.length, callers }))
  .sort((a, b) => b.count - a.count);

console.log(`${CYAN}TOP ${topN} HIGHEST FAN-IN (called by most functions -- critical to stability):${NC}`);
for (const item of fanInSorted.slice(0, topN)) {
  if (item.count === 0) break;
  const info = functions.get(item.name);
  if (info) {
    console.log(`  ${item.count} callers: ${item.name}() (line ${info.line})`);
  }
}
console.log('');

// Summary stats
const totalEdges = Object.values(graph).reduce((sum, callees) => sum + callees.length, 0);
const isolatedFunctions = [...functions.keys()].filter(name =>
  (graph[name] || []).length === 0 && (!reverseGraph[name] || reverseGraph[name].length === 0)
);

console.log('---');
console.log(`Total call relationships: ${totalEdges}`);
console.log(`Isolated functions (no calls in or out): ${isolatedFunctions.length}`);
if (isolatedFunctions.length > 0 && isolatedFunctions.length <= 20) {
  for (const name of isolatedFunctions) {
    const info = functions.get(name);
    console.log(`  ${YELLOW}[ISOLATED]${NC} ${name}() at line ${info.line}`);
  }
}
console.log(`Average fan-out: ${(totalEdges / functions.size).toFixed(1)} calls per function`);
console.log('');

if (cycles.length > 0) {
  process.exit(2);
} else if (isolatedFunctions.length > functions.size * 0.2) {
  // More than 20% isolated functions is concerning
  process.exit(1);
} else {
  process.exit(0);
}
