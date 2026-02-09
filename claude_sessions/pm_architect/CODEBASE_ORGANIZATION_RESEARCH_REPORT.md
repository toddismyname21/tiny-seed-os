# Codebase Organization Research Report
## Preventing Fragmentation and Duplication in Multi-Agent Development

**Date:** 2026-02-09
**Prepared by:** PM_Architect Claude
**Purpose:** Research best practices for organizing large codebases with multiple AI agents

---

## Executive Summary

TinyPM has experienced significant fragmentation due to organic growth with multiple Claude sessions creating overlapping functionality. This report analyzes industry best practices from companies like Google, Meta, Stripe, and emerging multi-agent AI coordination patterns to provide actionable recommendations.

**Key Findings:**
1. Google's monorepo success relies on strict single-source-of-truth enforcement
2. Multi-agent AI systems require explicit file-level locking or git worktree isolation
3. Automated duplicate detection tools can reduce maintenance costs by 20-40%
4. CODEOWNERS patterns provide clear module boundaries and accountability
5. Dead code detection tools like Knip can identify orphaned files automatically

---

## Part 1: Monorepo Organization Patterns (2025-2026)

### How Industry Leaders Organize Code

#### Google's Approach
Google's monorepo contains **all code in one repository as a single source of truth** - no submodules, no complex dependency graphs between repositories, no "which version of the shared library should I use?" questions. While this approach might seem like it cannot scale, Google has proven it works with 2 billion+ lines of code.

**Key principles:**
- One canonical location for every piece of code
- Strict code review requirements before merge
- Automated testing on every change
- Clear ownership boundaries via OWNERS files

#### Meta's SCARF System
Meta developed the **Systematic Code and Asset Removal Framework (SCARF)** which:
- Combines static and dynamic analysis to detect dead code
- Operates at symbol level (not just file level) for granular cleanup
- Automatically creates change requests to delete identified dead code
- Minimizes developer costs for maintenance

#### Stripe, Airbnb, Dropbox
These companies have invested heavily in **Bazel** build systems with entire ecosystems (like Aspect.dev) emerging to make monorepo tooling accessible to non-Google teams.

### Recommended Monorepo Tools for 2025-2026

| Tool | Purpose | Best For |
|------|---------|----------|
| **Nx** | JavaScript/TypeScript monorepo | Frontend-heavy projects |
| **Turborepo** | Fast build system | Next.js, Vercel projects |
| **Bazel** | Multi-language builds | Large mixed-language codebases |
| **Gradle** | JVM ecosystem builds | Java/Kotlin projects |

**TinyPM Recommendation:** Given TinyPM's Apps Script + HTML structure, a lightweight manifest-based approach (detailed below) is more appropriate than full monorepo tooling.

---

## Part 2: Single Source of Truth Patterns

### The Documentation-as-Code Approach

The most effective pattern involves maintaining documentation alongside code in the same version control system. This ensures docs evolve with the codebase they describe.

**Best Practices:**
1. **Treat docs like code** - Use Git, plain text formats (Markdown), and code review
2. **Continuous documentation** - Prevent "documentation drift" by updating docs with every code change
3. **Auto-generate where possible** - Use tools like Sphinx autodoc to sync API docs with code
4. **Single schema ownership** - One definitive schema eliminates duplicate model classes

### Implementation for TinyPM

TinyPM already has `SYSTEM_MANIFEST.md` but it requires manual updates. Recommendations:

1. **Automated Manifest Generation**
```javascript
// Add to Apps Script: generateSystemManifest()
function generateSystemManifest() {
  // Scan all function names in project
  // Scan all sheets in spreadsheet
  // Scan API endpoints in doGet/doPost
  // Output structured manifest
}
```

2. **Pre-commit Validation**
```bash
# Existing: validate-element-refs.sh
# Add: validate-manifest-sync.sh
# Checks that new functions are documented in SYSTEM_MANIFEST.md
```

3. **Single Source for Reference Data**
Currently TinyPM has naming inconsistencies:
- `EMPLOYEES` vs `USERS`
- `HARVEST_LOG` vs `HARVESTS`
- `REF_Fields` vs `FIELD_MAP`

**Recommendation:** Standardize to ONE canonical name and create migration script.

---

## Part 3: Code Deduplication Strategies

### Automated Detection Tools

#### For JavaScript/TypeScript: Knip (Highly Recommended)

**Knip** finds unused dependencies, exports, and files. Key features:
- Detects dead code, unused exports, redundant dependencies
- Helped Vercel delete ~300,000 lines of unused code
- Reports files never imported by non-test code
- Reports unused class members and enum members

**Installation and Usage:**
```bash
npx knip
```

#### For General Code: PMD's CPD (Copy/Paste Detector)

Works with Java, JSP, C/C++, C#, Go, Kotlin, Ruby, Swift and more. Can be run via command-line or Maven.

#### For AI-Assisted Analysis: CodeAnt AI

- Scans for unused functions, classes, variables
- Tracks occurrences across large numbers of files
- Provides likelihood scores for truly dead code
- Integrates with GitHub, GitLab, Bitbucket

#### For Enterprise: SonarQube

- Comprehensive code quality inspection
- Highlights duplicated blocks graphically
- Reports duplication coverage percentages
- Customizable duplication thresholds

### TinyPM-Specific Duplicate Detection

Based on `SYSTEM_MANIFEST.md`, known duplicates include:

| System | Versions | Recommendation |
|--------|----------|----------------|
| Morning Brief | 5 versions | Consolidate into `generateMorningBrief(options)` with level parameter |
| Approval Systems | 2 versions | Connect EmailWorkflowEngine.js to frontend |
| Email Processing | 3 pipelines | Create single email processing service |
| Sheet Names | Multiple aliases | Standardize to ONE name per concept |

**Recommended Script for TinyPM:**
```javascript
// Add to Apps Script: detectDuplicateFunctions()
function detectDuplicateFunctions() {
  const files = DriveApp.getFilesByType(MimeType.JAVASCRIPT);
  const functionMap = {};

  while (files.hasNext()) {
    const file = files.next();
    const content = file.getBlob().getDataAsString();
    const regex = /function\s+(\w+)\s*\(/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const funcName = match[1];
      if (!functionMap[funcName]) {
        functionMap[funcName] = [];
      }
      functionMap[funcName].push(file.getName());
    }
  }

  // Report functions appearing in multiple files
  const duplicates = {};
  for (const [name, files] of Object.entries(functionMap)) {
    if (files.length > 1) {
      duplicates[name] = files;
    }
  }

  return duplicates;
}
```

---

## Part 4: Multi-Developer/Multi-Agent Coordination

### The Challenge with AI Agents

According to 2025-2026 research, multi-agent systems face specific coordination challenges:

- **Token Duplication:** MetaGPT shows 72% duplication, CAMEL 86%, AgentVerse 53%
- **Lock Contention:** Cursor's equal-status agents with locking slowed 20 agents to throughput of 2-3
- **Merge Conflicts:** Simultaneous edits cause cascading failures

### Successful Patterns

#### 1. Git Worktree Isolation (Most Common)

Each agent works in an independent Git worktree, preventing them from overwriting each other's code changes.

```bash
# Create isolated worktree for each Claude session
git worktree add ../claude-session-backend -b session/backend
git worktree add ../claude-session-frontend -b session/frontend
```

**Advantages:**
- Complete isolation between agents
- No file locking required
- Natural merge points via pull requests

#### 2. File-Level Locking Systems

**Agent-MCP** provides built-in conflict prevention through file-level locking and task assignment.

**Agent Farm** supports 50 AI instances with a lock-based system to prevent conflicts.

**TinyPM Already Has This:**
```
tinypm/.pm_orchestrator_state.json
tinypm/.claude_intercom.json
```

#### 3. Hierarchical Architecture (Most Successful at Scale)

Research shows the most successful multi-agent architecture uses three roles:
- **Planners:** Continuously explore codebase and create tasks
- **Workers:** Execute assigned tasks without coordinating with each other
- **Judges:** Determine whether to continue at each cycle end

**TinyPM Application:**
- PM_Architect acts as Planner
- Backend_Claude, Desktop_Claude, etc. act as Workers
- Human owner acts as Judge (approving PRs)

### TinyPM-Specific Coordination Rules

Current rules in `CLAUDE.md` are good but should add:

```markdown
## FILE CLAIMING PROTOCOL

Before editing ANY file:
1. Check `tinypm/.file_claims.json` for existing claims
2. If unclaimed, add your claim:
   ```json
   {
     "file": "apps_script/MERGED TOTAL.js",
     "claude_role": "Backend_Claude",
     "claimed_at": "2026-02-09T10:00:00Z",
     "purpose": "Adding satellite integration endpoints",
     "expected_release": "2026-02-09T12:00:00Z"
   }
   ```
3. If claimed by another role, coordinate via INBOX/OUTBOX
4. Release claim when done

## CONFLICT RESOLUTION
- If two roles need same file, PM_Architect arbitrates
- Longer-running claims get priority
- Security_Claude can override for security fixes
```

---

## Part 5: Manifest/Registry Patterns

### Industry Approaches to Inventory Tracking

#### Auto-Generated Manifests

Best practice is to auto-generate manifests from code annotations:
```javascript
/**
 * @module TaskManagement
 * @owner Backend_Claude
 * @endpoint getUnifiedTasks
 * @sheet UNIFIED_TASKS
 */
function getUnifiedTasks(params) {
  // ...
}
```

A build script then scans these annotations to generate `SYSTEM_MANIFEST.md`.

#### Package Manifest Pattern

A package manifest enumerates files included in a software distribution:
- Version numbers for tracking updates
- Lists of dependencies
- Inventories of included files
- Checksums to verify integrity
- Permission declarations

#### File Integrity Monitoring (FIM)

Wazuh-style FIM:
- Periodic scans of monitored files
- Stores checksums and attributes in local database
- Triggers alerts when changes detected
- Syncs inventory between components

### TinyPM Manifest Recommendations

#### 1. Create `FILE_REGISTRY.json`

```json
{
  "version": "1.0.0",
  "generated_at": "2026-02-09T10:00:00Z",
  "files": {
    "apps_script/MERGED TOTAL.js": {
      "owner": "Backend_Claude",
      "purpose": "Central API router",
      "endpoints": ["getUnifiedTasks", "createUnifiedTask", "..."],
      "sheets_used": ["UNIFIED_TASKS", "REF_Crops"],
      "last_modified": "2026-02-03",
      "status": "ACTIVE"
    },
    "web_app/manager-dashboard.html": {
      "owner": "Desktop_Claude",
      "purpose": "Manager AI Dashboard",
      "api_dependencies": ["getAIPriorityDashboard", "getTeamWorkloadBalance"],
      "last_modified": "2026-02-03",
      "status": "ACTIVE"
    }
  }
}
```

#### 2. Orphaned File Detection Script

```bash
#!/bin/bash
# detect-orphaned-files.sh

# Find HTML files not listed in FILE_REGISTRY.json
for file in web_app/*.html; do
  if ! grep -q "$(basename $file)" FILE_REGISTRY.json; then
    echo "ORPHANED: $file"
  fi
done

# Find JS files not listed in FILE_REGISTRY.json
for file in apps_script/*.js; do
  if ! grep -q "$(basename $file)" FILE_REGISTRY.json; then
    echo "ORPHANED: $file"
  fi
done
```

#### 3. Automated Manifest Sync Check

Add to CI/pre-commit:
```bash
# Check that all files are registered
./scripts/detect-orphaned-files.sh

# Check that registered files exist
node scripts/validate-registry.js

# Check for duplicate function names
node scripts/detect-duplicates.js
```

---

## Part 6: CODEOWNERS Pattern for TinyPM

### What is CODEOWNERS?

A CODEOWNERS file declares users or teams responsible for specific files or directories. It helps ensure code changes are reviewed by appropriate stakeholders.

### TinyPM CODEOWNERS File

Create `/.github/CODEOWNERS`:

```
# Default owner for everything
* @PM_Architect

# Backend (Apps Script)
/apps_script/ @Backend_Claude
/apps_script/MERGED\ TOTAL.js @Backend_Claude @PM_Architect

# Chief of Staff modules
/apps_script/ChiefOfStaff_*.js @Backend_Claude

# Frontend - Desktop
/index.html @Desktop_Claude
/planning.html @Desktop_Claude
/web_app/manager-dashboard.html @Desktop_Claude
/web_app/task-assignment.html @Desktop_Claude
/web_app/chief-of-staff.html @Desktop_Claude

# Frontend - Mobile
/employee.html @Mobile_Claude
/web_app/chef-order.html @Mobile_Claude
/web_app/driver.html @Mobile_Claude

# Design System
/web_app/*.css @UX_Design_Claude

# Financial
/web_app/financial-dashboard.html @Financial_Claude
/web_app/wealth-builder.html @Financial_Claude
/web_app/accounting.html @Financial_Claude

# Sales
/web_app/sales.html @Sales_Claude
/web_app/wholesale.html @Sales_Claude

# Security
/web_app/auth-guard.js @Security_Claude
/web_app/admin.html @Security_Claude

# Coordination files - require PM approval
/CLAUDE.md @PM_Architect
/claude_sessions/pm_architect/*.md @PM_Architect
/CHANGE_LOG.md @PM_Architect
```

### Benefits for TinyPM

1. **Clear Ownership:** Each Claude role knows exactly what they own
2. **Review Requirements:** Changes to shared files require PM_Architect approval
3. **Reduced Conflicts:** Roles stay in their lanes
4. **Accountability:** Easy to trace who changed what

---

## Part 7: Dead Code Detection for TinyPM

### Recommended Tools

#### For JavaScript/HTML: Knip

```bash
# Install globally
npm install -g knip

# Run in project root
npx knip
```

Knip will detect:
- Unused HTML files
- Unused JavaScript functions
- Unused CSS classes
- Orphaned dependencies

#### For Apps Script: Custom Detection

Since Apps Script doesn't have standard dead code tools, create custom detection:

```javascript
// DeadCodeDetector.js
function findUnusedFunctions() {
  const MERGED_TOTAL = getFileContent('MERGED TOTAL.js');

  // Extract all function names
  const functionRegex = /function\s+(\w+)\s*\(/g;
  const allFunctions = [];
  let match;
  while ((match = functionRegex.exec(MERGED_TOTAL)) !== null) {
    allFunctions.push(match[1]);
  }

  // Check which functions are never called
  const unused = allFunctions.filter(func => {
    // Exclude entry points (doGet, doPost, triggers)
    if (['doGet', 'doPost', 'onEdit', 'onOpen'].includes(func)) return false;

    // Count calls (excluding the definition)
    const callRegex = new RegExp(`\\b${func}\\s*\\(`, 'g');
    const calls = (MERGED_TOTAL.match(callRegex) || []).length;

    // If only 1 match (the definition), it's unused
    return calls <= 1;
  });

  return {
    total_functions: allFunctions.length,
    unused_count: unused.length,
    unused_functions: unused
  };
}

function findUnusedEndpoints() {
  const MERGED_TOTAL = getFileContent('MERGED TOTAL.js');

  // Extract all endpoint names from doGet/doPost
  const endpointRegex = /case\s+['"]([\w-]+)['"]/g;
  const endpoints = [];
  let match;
  while ((match = endpointRegex.exec(MERGED_TOTAL)) !== null) {
    endpoints.push(match[1]);
  }

  // Check each HTML file for endpoint usage
  const htmlFiles = getHTMLFiles();
  const usedEndpoints = new Set();

  htmlFiles.forEach(html => {
    endpoints.forEach(endpoint => {
      if (html.includes(endpoint)) {
        usedEndpoints.add(endpoint);
      }
    });
  });

  const unused = endpoints.filter(e => !usedEndpoints.has(e));

  return {
    total_endpoints: endpoints.length,
    unused_count: unused.length,
    unused_endpoints: unused
  };
}
```

### TinyPM Dead Code Audit Checklist

Based on `SYSTEM_MANIFEST.md`, prioritize checking:

1. **Chief of Staff Modules (12 files)** - Built but disconnected from frontend
2. **Backup Files** - `/apps_script_backup_20260114_165630/` - Can likely be deleted
3. **Duplicate Morning Brief Functions** - 5 versions exist
4. **Legacy Task System** - If UNIFIED_TASKS replaced it
5. **Flower Farming Reference Files** - Downloaded HTML/JS files in `/FLOWER FARMING/`

---

## Part 8: Recommended Tools Summary

### Immediate Implementation (Week 1)

| Tool | Purpose | Effort |
|------|---------|--------|
| **CODEOWNERS file** | Ownership boundaries | 1 hour |
| **FILE_REGISTRY.json** | Inventory tracking | 2 hours |
| **detect-orphaned-files.sh** | Find untracked files | 1 hour |
| **validate-manifest-sync.sh** | Pre-commit check | 2 hours |

### Short-term Implementation (Month 1)

| Tool | Purpose | Effort |
|------|---------|--------|
| **Knip** | Dead code detection | 4 hours |
| **Custom duplicate detector** | Apps Script analysis | 8 hours |
| **File claiming system** | Multi-agent coordination | 4 hours |
| **Auto-manifest generator** | Keep docs in sync | 8 hours |

### Long-term Consideration (Quarter 1)

| Tool | Purpose | Effort |
|------|---------|--------|
| **SonarQube** | Comprehensive code quality | 1 week |
| **CodeAnt AI** | AI-assisted code review | 2 days |
| **Git worktrees** | Full agent isolation | 1 week |

---

## Part 9: Specific TinyPM Recommendations

### Immediate Actions

1. **Standardize Sheet Names**
   ```
   EMPLOYEES (not USERS)
   HARVEST_LOG (not HARVESTS)
   REF_Fields (not FIELD_MAP)
   ```

2. **Consolidate Morning Brief**
   - Keep `generateMorningBriefV2()` as primary
   - Deprecate other 4 versions
   - Add `level` parameter for different detail levels

3. **Connect Chief of Staff Backend**
   - 12 modules are built but disconnected
   - Priority: Memory, Autonomy, Proactive Intel

4. **Delete Backup Folder**
   - `/apps_script_backup_20260114_165630/` is 2 months old
   - Git history provides backup

5. **Clean Up Reference Files**
   - Move `/FLOWER FARMING/` to external storage
   - Move `/Johnny's Winter Growing Guide/` to external storage

### Process Changes

1. **Before Creating ANY New File:**
   - Check `SYSTEM_MANIFEST.md`
   - Check `FILE_REGISTRY.json`
   - Search for similar functionality
   - Get PM_Architect approval

2. **Before Modifying Shared Files:**
   - Check `.file_claims.json`
   - Claim the file
   - Update CHANGE_LOG.md when done
   - Release claim

3. **Weekly Maintenance:**
   - Run dead code detection
   - Update FILE_REGISTRY.json
   - Review orphaned files
   - Check for new duplicates

### Architecture Changes

1. **API Versioning**
   ```javascript
   // All new endpoints should be versioned
   case 'v2/tasks/get':
   case 'v2/tasks/create':
   ```

2. **Shared Component Library**
   ```
   /shared/
     api-config.js (exists)
     auth-guard.js (exists)
     ui-components.js (NEW)
     date-utils.js (NEW)
     validation.js (NEW)
   ```

3. **Module Boundaries**
   ```
   /modules/
     tasks/         # All task-related code
     chef/          # All chef-related code
     employee/      # All employee-related code
     satellite/     # All satellite-related code
   ```

---

## Part 10: Implementation Roadmap

### Week 1: Foundation
- [ ] Create CODEOWNERS file
- [ ] Create FILE_REGISTRY.json
- [ ] Create detect-orphaned-files.sh
- [ ] Add pre-commit hook for manifest sync

### Week 2: Cleanup
- [ ] Delete backup folder (after verification)
- [ ] Move reference files to external storage
- [ ] Standardize sheet names
- [ ] Run Knip for dead code detection

### Week 3: Consolidation
- [ ] Consolidate Morning Brief functions
- [ ] Connect Chief of Staff Memory module
- [ ] Connect Chief of Staff Autonomy module
- [ ] Document deprecated functions

### Week 4: Process
- [ ] Implement file claiming system
- [ ] Create auto-manifest generator
- [ ] Set up weekly maintenance schedule
- [ ] Train all Claude roles on new processes

### Month 2+: Optimization
- [ ] Consider SonarQube integration
- [ ] Evaluate git worktrees for isolation
- [ ] Build shared component library
- [ ] Implement API versioning

---

## Sources

- [The Ultimate Guide to Building a Monorepo in 2026](https://medium.com/@sanjaytomar717/the-ultimate-guide-to-building-a-monorepo-in-2025-sharing-code-like-the-pros-ee4d6d56abaa)
- [The Monorepo Strategy That Scaled Google to 2 Billion Lines of Code](https://medium.com/@sohail_saifi/the-monorepo-strategy-that-scaled-google-to-2-billion-lines-of-code-cb3eb59f02d4)
- [Monorepo.tools](https://monorepo.tools/)
- [Top 5 Monorepo Tools for 2025](https://www.aviator.co/blog/monorepo-tools/)
- [Single Source of Truth - Strapi](https://strapi.io/blog/what-is-single-source-of-truth)
- [Code Duplication Detection Tools](https://www.getpanto.ai/blog/code-duplication-detection-tools)
- [5 Best Duplicate Code Checker Tools for Developers in 2025](https://www.codeant.ai/blogs/best-duplicate-code-checker-tools)
- [PMD Copy/Paste Detector](https://pmd.github.io/pmd/pmd_userdocs_cpd.html)
- [Knip - Dead Code Detection](https://knip.dev/)
- [Automating Dead Code Cleanup - Meta Engineering](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)
- [10 Multi-Agent Coordination Strategies](https://galileo.ai/blog/multi-agent-coordination-strategies)
- [AI Coding Agents in 2026: Coherence Through Orchestration](https://mikemason.ca/writing/ai-coding-agents-jan-2026/)
- [Claude Code Multiple Agent Systems: Complete 2026 Guide](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide)
- [Agent-MCP Framework](https://github.com/rinadelph/Agent-MCP)
- [Understanding CODEOWNERS](https://www.harness.io/blog/mastering-codeowners)
- [Code Ownership: Using CODEOWNERS Strategically](https://www.aviator.co/blog/code-ownership-using-codeowners-strategically/)
- [The Ultimate Guide to GitHub Codeowners File](https://www.graphapp.ai/blog/the-ultimate-guide-to-github-codeowners-file)
- [DRY Principle and AI-Generated Code](https://www.faros.ai/blog/ai-generated-code-and-the-dry-principle)
- [How to Make Linting Rules Work](https://medium.com/agoda-engineering/how-to-make-linting-rules-work-from-enforcement-to-education-be7071d2fcf0)

---

**END OF RESEARCH REPORT**

*Prepared by PM_Architect Claude for TinyPM codebase organization improvement initiative.*
