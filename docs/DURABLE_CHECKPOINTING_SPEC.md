# Durable Checkpointing Specification

## Overview

**Purpose:** Enable seamless recovery from catastrophic failures during multi-step task execution.

**Core Principle:** If the system experiences a catastrophic failure at Step 9 of a 10-step process, it reloads from the last checkpoint and resumes seamlessly.

**Version:** 1.0.0
**Created:** 2026-02-12
**Status:** Implementation Specification

---

## 1. CHECKPOINT ARCHITECTURE

### 1.1 Storage Location

```
/tinypm/.agent_checkpoints/
    /{task_id}/
        checkpoint_{step_number}_{timestamp}.json
        checkpoint_latest.json  (symlink to most recent)
        checkpoint_manifest.json
    /recovery/
        pending_recovery.json
        recovery_log.json
```

### 1.2 Checkpoint File Format

Each checkpoint is a JSON file with the following schema:

```json
{
  "checkpoint_id": "ckpt_20260212_143052_abc123",
  "task_id": "TPM-025",
  "version": "1.0.0",

  "execution_state": {
    "total_steps": 10,
    "completed_steps": 9,
    "current_step": 9,
    "step_name": "Generating final report",
    "started_at": "2026-02-12T14:25:00.000Z",
    "checkpoint_at": "2026-02-12T14:30:52.000Z"
  },

  "task_context": {
    "title": "Build user authentication system",
    "description": "Implement OAuth2 flow with Google...",
    "priority": "high",
    "role": "builder",
    "assigned_agent": "Agent ac92cfd"
  },

  "step_history": [
    {
      "step": 1,
      "name": "Analyze requirements",
      "status": "completed",
      "started_at": "2026-02-12T14:25:00.000Z",
      "completed_at": "2026-02-12T14:26:30.000Z",
      "output_summary": "Identified 5 OAuth providers to support",
      "artifacts": ["requirements_analysis.md"]
    }
  ],

  "working_state": {
    "variables": {
      "target_file": "/tinypm/oauth_manager.py",
      "user_email": "todd@tinyseedfarmpgh.com",
      "selected_provider": "google"
    },
    "pending_operations": [],
    "rollback_points": []
  },

  "agent_memory": {
    "conversation_context": [],
    "learned_patterns": [],
    "user_preferences": {}
  },

  "file_state": {
    "modified_files": [
      {
        "path": "/tinypm/oauth_manager.py",
        "hash_before": "abc123...",
        "hash_after": "def456...",
        "backup_path": "/tinypm/.agent_checkpoints/TPM-025/backups/oauth_manager.py.bak"
      }
    ],
    "created_files": [],
    "deleted_files": []
  },

  "recovery_info": {
    "can_resume": true,
    "resume_from_step": 9,
    "required_context": ["oauth_tokens", "user_session"],
    "estimated_time_to_complete": "5 minutes"
  },

  "metadata": {
    "tinypm_version": "2.0",
    "agent_version": "1.0.0",
    "checksum": "sha256:..."
  }
}
```

### 1.3 Checkpoint Manifest Schema

```json
{
  "task_id": "TPM-025",
  "checkpoints": [
    {
      "checkpoint_id": "ckpt_20260212_142500_abc123",
      "step": 1,
      "timestamp": "2026-02-12T14:25:00.000Z",
      "file": "checkpoint_001_20260212_142500.json",
      "size_bytes": 4096,
      "valid": true
    }
  ],
  "latest_checkpoint": "ckpt_20260212_143052_abc123",
  "total_checkpoints": 9,
  "cleanup_policy": "keep_last_5",
  "last_cleanup": "2026-02-12T14:00:00.000Z"
}
```

### 1.4 State Captured

| Category | Data Captured | Purpose |
|----------|---------------|---------|
| **Execution Progress** | Step number, step name, completion status | Know where to resume |
| **Task Context** | Task details, priority, assignment | Restore full task understanding |
| **Working Variables** | Runtime variables, computed values | Avoid recomputation |
| **File Changes** | Modified/created/deleted files with backups | Rollback capability |
| **Agent Memory** | Conversation context, patterns | Maintain continuity |
| **External State** | API tokens, session IDs | Resume external connections |

---

## 2. CHECKPOINT TRIGGERS

### 2.1 Automatic Checkpoint Events

Checkpoints are automatically created after:

| Event | Trigger | Retention |
|-------|---------|-----------|
| **Step Completion** | After each major step completes successfully | Keep last 5 per task |
| **File Modification** | Before any file write operation | Keep until step completes |
| **External API Call** | Before calls that modify external state | Keep last 3 |
| **Time Interval** | Every 5 minutes during long operations | Keep last 2 |
| **User Input** | After processing significant user input | Keep last 3 |
| **Critical Decision** | Before irreversible operations | Keep until confirmed |

### 2.2 Manual Checkpoint Commands

```bash
# CLI Commands for manual checkpoint management
tinypm checkpoint create [task_id]        # Force immediate checkpoint
tinypm checkpoint list [task_id]          # List all checkpoints for task
tinypm checkpoint inspect [checkpoint_id] # View checkpoint details
tinypm checkpoint restore [checkpoint_id] # Restore from checkpoint
tinypm checkpoint delete [checkpoint_id]  # Delete specific checkpoint
tinypm checkpoint cleanup [--older-than=7d] # Cleanup old checkpoints
```

### 2.3 Checkpoint Decision Logic

```javascript
/**
 * Determines if a checkpoint should be created
 * @param {Object} context - Current execution context
 * @returns {Object} - Checkpoint decision with reason
 */
function shouldCheckpoint(context) {
  const {
    lastCheckpointTime,
    stepJustCompleted,
    filesPendingWrite,
    criticalOperationPending,
    timeSinceLastCheckpoint
  } = context;

  // Always checkpoint after step completion
  if (stepJustCompleted) {
    return { checkpoint: true, reason: 'step_completed', priority: 'high' };
  }

  // Always checkpoint before critical operations
  if (criticalOperationPending) {
    return { checkpoint: true, reason: 'critical_operation', priority: 'critical' };
  }

  // Checkpoint before file modifications
  if (filesPendingWrite.length > 0) {
    return { checkpoint: true, reason: 'file_modification', priority: 'high' };
  }

  // Time-based checkpoint (every 5 minutes)
  if (timeSinceLastCheckpoint > 300000) { // 5 minutes in ms
    return { checkpoint: true, reason: 'time_interval', priority: 'low' };
  }

  return { checkpoint: false, reason: 'no_trigger' };
}
```

---

## 3. RESUME MECHANISM

### 3.1 Detecting Incomplete Tasks

```javascript
/**
 * Scans for tasks that were interrupted and need recovery
 * Run on system startup and periodically
 */
async function detectIncompleteTasks() {
  const checkpointDir = '/tinypm/.agent_checkpoints';
  const incompleteTasks = [];

  // Get all task checkpoint directories
  const taskDirs = await fs.readdir(checkpointDir);

  for (const taskId of taskDirs) {
    if (taskId === 'recovery') continue;

    const manifestPath = path.join(checkpointDir, taskId, 'checkpoint_manifest.json');

    if (await fileExists(manifestPath)) {
      const manifest = await loadJSON(manifestPath);
      const latestCheckpoint = await loadCheckpoint(manifest.latest_checkpoint);

      // Check if task was in progress
      if (latestCheckpoint.execution_state.completed_steps <
          latestCheckpoint.execution_state.total_steps) {

        // Verify task wasn't manually completed/cancelled
        const taskStatus = await getTaskStatus(taskId);

        if (taskStatus !== 'done' && taskStatus !== 'cancelled') {
          incompleteTasks.push({
            taskId,
            checkpoint: latestCheckpoint,
            interruptedAt: latestCheckpoint.execution_state.checkpoint_at,
            resumeFrom: latestCheckpoint.execution_state.current_step,
            totalSteps: latestCheckpoint.execution_state.total_steps
          });
        }
      }
    }
  }

  return incompleteTasks;
}
```

### 3.2 Loading and Resuming from Checkpoint

```javascript
/**
 * Loads a checkpoint and prepares system for resume
 * @param {string} checkpointId - ID of checkpoint to restore
 * @returns {Object} - Restored execution context
 */
async function loadCheckpointAndResume(checkpointId) {
  // 1. Load checkpoint data
  const checkpoint = await loadCheckpoint(checkpointId);

  // 2. Verify checkpoint integrity
  const isValid = await verifyCheckpointIntegrity(checkpoint);
  if (!isValid) {
    throw new CheckpointCorruptedError(checkpointId);
  }

  // 3. Restore file state (rollback any incomplete modifications)
  for (const fileChange of checkpoint.file_state.modified_files) {
    if (fileChange.backup_path) {
      // Restore file from backup if modification was incomplete
      const currentHash = await hashFile(fileChange.path);
      if (currentHash !== fileChange.hash_after) {
        await restoreFromBackup(fileChange.path, fileChange.backup_path);
      }
    }
  }

  // 4. Restore working state variables
  const workingState = checkpoint.working_state;

  // 5. Restore agent memory/context
  const agentMemory = checkpoint.agent_memory;

  // 6. Build resume context
  const resumeContext = {
    taskId: checkpoint.task_id,
    taskContext: checkpoint.task_context,
    startFromStep: checkpoint.recovery_info.resume_from_step,
    stepHistory: checkpoint.step_history,
    workingState,
    agentMemory,
    resumedAt: new Date().toISOString(),
    resumedFromCheckpoint: checkpointId
  };

  // 7. Log recovery action
  await logRecovery(checkpoint.task_id, checkpointId, resumeContext);

  return resumeContext;
}
```

### 3.3 Context Restoration Flow

```
                    +------------------+
                    |  System Startup  |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | Scan Checkpoints |
                    +--------+---------+
                             |
                             v
              +-----------------------------+
              | Incomplete Tasks Found?     |
              +-----------------------------+
                    |              |
                   Yes            No
                    |              |
                    v              v
           +----------------+  +------------------+
           | Show Recovery  |  | Normal Operation |
           | Options to PM  |  +------------------+
           +-------+--------+
                   |
                   v
           +----------------+
           | Auto-Resume or |
           | Manual Choice  |
           +-------+--------+
                   |
                   v
           +----------------+
           | Load Checkpoint|
           | Restore State  |
           +-------+--------+
                   |
                   v
           +----------------+
           | Verify Files & |
           | Dependencies   |
           +-------+--------+
                   |
                   v
           +----------------+
           | Resume Task at |
           | Saved Step     |
           +----------------+
```

---

## 4. IMPLEMENTATION CODE

### 4.1 Core Checkpoint Manager (JavaScript)

```javascript
/**
 * DurableCheckpointManager
 * Handles checkpoint creation, storage, and recovery
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DurableCheckpointManager {
  constructor(config = {}) {
    this.baseDir = config.baseDir || '/tinypm/.agent_checkpoints';
    this.maxCheckpointsPerTask = config.maxCheckpointsPerTask || 5;
    this.autoCleanupDays = config.autoCleanupDays || 7;
  }

  /**
   * Creates a new checkpoint
   */
  async createCheckpoint(taskId, executionState, workingState, agentMemory) {
    const checkpointId = this._generateCheckpointId();
    const timestamp = new Date().toISOString();
    const taskDir = path.join(this.baseDir, taskId);

    // Ensure directory exists
    await fs.mkdir(taskDir, { recursive: true });
    await fs.mkdir(path.join(taskDir, 'backups'), { recursive: true });

    // Backup modified files
    const fileState = await this._backupModifiedFiles(taskId, workingState.modifiedFiles || []);

    // Build checkpoint object
    const checkpoint = {
      checkpoint_id: checkpointId,
      task_id: taskId,
      version: '1.0.0',
      execution_state: executionState,
      task_context: await this._getTaskContext(taskId),
      step_history: executionState.stepHistory || [],
      working_state: workingState,
      agent_memory: agentMemory,
      file_state: fileState,
      recovery_info: {
        can_resume: true,
        resume_from_step: executionState.current_step,
        required_context: this._identifyRequiredContext(workingState),
        estimated_time_to_complete: this._estimateRemainingTime(executionState)
      },
      metadata: {
        tinypm_version: '2.0',
        agent_version: '1.0.0',
        checksum: null // Will be set after serialization
      }
    };

    // Calculate checksum
    const checkpointJson = JSON.stringify(checkpoint, null, 2);
    checkpoint.metadata.checksum = `sha256:${crypto.createHash('sha256').update(checkpointJson).digest('hex')}`;

    // Write checkpoint file
    const filename = `checkpoint_${String(executionState.current_step).padStart(3, '0')}_${timestamp.replace(/[:-]/g, '').replace('T', '_').split('.')[0]}.json`;
    const filepath = path.join(taskDir, filename);
    await fs.writeFile(filepath, JSON.stringify(checkpoint, null, 2));

    // Update manifest
    await this._updateManifest(taskId, checkpointId, executionState.current_step, filename);

    // Update latest symlink
    const latestPath = path.join(taskDir, 'checkpoint_latest.json');
    try { await fs.unlink(latestPath); } catch (e) {}
    await fs.symlink(filename, latestPath);

    // Cleanup old checkpoints
    await this._cleanupOldCheckpoints(taskId);

    console.log(`[Checkpoint] Created ${checkpointId} for task ${taskId} at step ${executionState.current_step}`);

    return checkpointId;
  }

  /**
   * Loads a checkpoint by ID
   */
  async loadCheckpoint(checkpointId) {
    // Find checkpoint file
    const taskDirs = await fs.readdir(this.baseDir);

    for (const taskId of taskDirs) {
      if (taskId === 'recovery') continue;

      const manifestPath = path.join(this.baseDir, taskId, 'checkpoint_manifest.json');

      try {
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        const checkpointEntry = manifest.checkpoints.find(c => c.checkpoint_id === checkpointId);

        if (checkpointEntry) {
          const checkpointPath = path.join(this.baseDir, taskId, checkpointEntry.file);
          const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));

          // Verify integrity
          if (!this._verifyChecksum(checkpoint)) {
            throw new Error(`Checkpoint ${checkpointId} failed integrity check`);
          }

          return checkpoint;
        }
      } catch (e) {
        // Continue searching other task directories
      }
    }

    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  /**
   * Gets the latest checkpoint for a task
   */
  async getLatestCheckpoint(taskId) {
    const latestPath = path.join(this.baseDir, taskId, 'checkpoint_latest.json');

    try {
      const checkpoint = JSON.parse(await fs.readFile(latestPath, 'utf8'));
      return checkpoint;
    } catch (e) {
      return null;
    }
  }

  /**
   * Lists all checkpoints for a task
   */
  async listCheckpoints(taskId) {
    const manifestPath = path.join(this.baseDir, taskId, 'checkpoint_manifest.json');

    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      return manifest.checkpoints;
    } catch (e) {
      return [];
    }
  }

  /**
   * Detects all incomplete tasks that need recovery
   */
  async detectIncompleteTasks() {
    const incompleteTasks = [];

    try {
      const taskDirs = await fs.readdir(this.baseDir);

      for (const taskId of taskDirs) {
        if (taskId === 'recovery') continue;

        const latest = await this.getLatestCheckpoint(taskId);

        if (latest && latest.execution_state) {
          const { completed_steps, total_steps } = latest.execution_state;

          if (completed_steps < total_steps && latest.recovery_info.can_resume) {
            incompleteTasks.push({
              taskId,
              checkpoint: latest,
              interruptedAt: latest.execution_state.checkpoint_at,
              resumeFromStep: latest.recovery_info.resume_from_step,
              totalSteps: total_steps,
              completedSteps: completed_steps
            });
          }
        }
      }
    } catch (e) {
      console.error('[Checkpoint] Error detecting incomplete tasks:', e);
    }

    return incompleteTasks;
  }

  /**
   * Restores system state from a checkpoint
   */
  async restoreFromCheckpoint(checkpointId) {
    const checkpoint = await this.loadCheckpoint(checkpointId);

    // Restore backed up files
    for (const fileChange of checkpoint.file_state.modified_files) {
      if (fileChange.backup_path) {
        try {
          await fs.copyFile(fileChange.backup_path, fileChange.path);
          console.log(`[Checkpoint] Restored file: ${fileChange.path}`);
        } catch (e) {
          console.error(`[Checkpoint] Failed to restore file ${fileChange.path}:`, e);
        }
      }
    }

    // Log recovery
    await this._logRecovery(checkpoint.task_id, checkpointId);

    return {
      taskId: checkpoint.task_id,
      resumeFromStep: checkpoint.recovery_info.resume_from_step,
      workingState: checkpoint.working_state,
      agentMemory: checkpoint.agent_memory,
      taskContext: checkpoint.task_context
    };
  }

  /**
   * Deletes a specific checkpoint
   */
  async deleteCheckpoint(checkpointId) {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    const taskDir = path.join(this.baseDir, checkpoint.task_id);
    const manifestPath = path.join(taskDir, 'checkpoint_manifest.json');

    // Update manifest
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const checkpointEntry = manifest.checkpoints.find(c => c.checkpoint_id === checkpointId);

    if (checkpointEntry) {
      // Delete checkpoint file
      await fs.unlink(path.join(taskDir, checkpointEntry.file));

      // Remove from manifest
      manifest.checkpoints = manifest.checkpoints.filter(c => c.checkpoint_id !== checkpointId);
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`[Checkpoint] Deleted ${checkpointId}`);
    }
  }

  // Private methods

  _generateCheckpointId() {
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace('T', '_').split('.')[0];
    const random = crypto.randomBytes(3).toString('hex');
    return `ckpt_${timestamp}_${random}`;
  }

  async _backupModifiedFiles(taskId, modifiedFiles) {
    const backupDir = path.join(this.baseDir, taskId, 'backups');
    const fileState = { modified_files: [], created_files: [], deleted_files: [] };

    for (const file of modifiedFiles) {
      const backupPath = path.join(backupDir, `${path.basename(file.path)}.bak`);

      try {
        if (await this._fileExists(file.path)) {
          await fs.copyFile(file.path, backupPath);

          fileState.modified_files.push({
            path: file.path,
            hash_before: file.hashBefore || await this._hashFile(file.path),
            hash_after: file.hashAfter,
            backup_path: backupPath
          });
        }
      } catch (e) {
        console.error(`[Checkpoint] Failed to backup ${file.path}:`, e);
      }
    }

    return fileState;
  }

  async _updateManifest(taskId, checkpointId, step, filename) {
    const manifestPath = path.join(this.baseDir, taskId, 'checkpoint_manifest.json');
    let manifest;

    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    } catch (e) {
      manifest = {
        task_id: taskId,
        checkpoints: [],
        cleanup_policy: `keep_last_${this.maxCheckpointsPerTask}`
      };
    }

    const stats = await fs.stat(path.join(this.baseDir, taskId, filename));

    manifest.checkpoints.push({
      checkpoint_id: checkpointId,
      step,
      timestamp: new Date().toISOString(),
      file: filename,
      size_bytes: stats.size,
      valid: true
    });

    manifest.latest_checkpoint = checkpointId;
    manifest.total_checkpoints = manifest.checkpoints.length;

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  async _cleanupOldCheckpoints(taskId) {
    const checkpoints = await this.listCheckpoints(taskId);

    if (checkpoints.length > this.maxCheckpointsPerTask) {
      const toDelete = checkpoints
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(0, checkpoints.length - this.maxCheckpointsPerTask);

      for (const ckpt of toDelete) {
        await this.deleteCheckpoint(ckpt.checkpoint_id);
      }
    }
  }

  async _getTaskContext(taskId) {
    // Load from board.json
    const boardPath = '/tinypm/board.json';
    try {
      const board = JSON.parse(await fs.readFile(boardPath, 'utf8'));
      const task = board.tasks.find(t => t.id === taskId);
      return task || { task_id: taskId };
    } catch (e) {
      return { task_id: taskId };
    }
  }

  _identifyRequiredContext(workingState) {
    const required = [];

    if (workingState.variables) {
      if (workingState.variables.oauth_tokens) required.push('oauth_tokens');
      if (workingState.variables.user_session) required.push('user_session');
      if (workingState.variables.api_keys) required.push('api_keys');
    }

    return required;
  }

  _estimateRemainingTime(executionState) {
    const { completed_steps, total_steps, started_at, checkpoint_at } = executionState;

    if (completed_steps === 0) return 'unknown';

    const elapsed = new Date(checkpoint_at) - new Date(started_at);
    const avgTimePerStep = elapsed / completed_steps;
    const remainingSteps = total_steps - completed_steps;
    const estimatedMs = avgTimePerStep * remainingSteps;

    const minutes = Math.ceil(estimatedMs / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  _verifyChecksum(checkpoint) {
    const storedChecksum = checkpoint.metadata.checksum;
    const tempCheckpoint = { ...checkpoint };
    tempCheckpoint.metadata = { ...checkpoint.metadata, checksum: null };

    const computedHash = crypto.createHash('sha256')
      .update(JSON.stringify(tempCheckpoint, null, 2))
      .digest('hex');

    return storedChecksum === `sha256:${computedHash}`;
  }

  async _hashFile(filepath) {
    const content = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async _fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  async _logRecovery(taskId, checkpointId) {
    const recoveryDir = path.join(this.baseDir, 'recovery');
    await fs.mkdir(recoveryDir, { recursive: true });

    const logPath = path.join(recoveryDir, 'recovery_log.json');
    let log = [];

    try {
      log = JSON.parse(await fs.readFile(logPath, 'utf8'));
    } catch (e) {}

    log.push({
      timestamp: new Date().toISOString(),
      task_id: taskId,
      checkpoint_id: checkpointId,
      action: 'restored'
    });

    await fs.writeFile(logPath, JSON.stringify(log, null, 2));
  }
}

module.exports = { DurableCheckpointManager };
```

### 4.2 Integration with Task System

```javascript
/**
 * Task Executor with Durable Checkpointing
 * Wraps task execution with automatic checkpointing
 */
const { DurableCheckpointManager } = require('./checkpoint_manager');

class CheckpointedTaskExecutor {
  constructor() {
    this.checkpointManager = new DurableCheckpointManager();
    this.currentExecution = null;
  }

  /**
   * Executes a task with automatic checkpointing
   */
  async executeTask(taskId, steps, options = {}) {
    const { onProgress, onCheckpoint, resumeFromCheckpoint } = options;

    // Check for existing checkpoint to resume from
    let startStep = 0;
    let workingState = { variables: {} };
    let agentMemory = {};
    let stepHistory = [];

    if (resumeFromCheckpoint) {
      const restored = await this.checkpointManager.restoreFromCheckpoint(resumeFromCheckpoint);
      startStep = restored.resumeFromStep;
      workingState = restored.workingState;
      agentMemory = restored.agentMemory;
      stepHistory = restored.checkpoint?.step_history || [];

      console.log(`[Executor] Resuming task ${taskId} from step ${startStep}`);
    }

    // Initialize execution state
    this.currentExecution = {
      taskId,
      totalSteps: steps.length,
      completedSteps: startStep,
      currentStep: startStep,
      startedAt: new Date().toISOString(),
      stepHistory
    };

    try {
      // Execute each step
      for (let i = startStep; i < steps.length; i++) {
        const step = steps[i];
        this.currentExecution.currentStep = i;
        this.currentExecution.stepName = step.name;

        // Create pre-step checkpoint for critical operations
        if (step.critical) {
          await this._checkpoint(taskId, workingState, agentMemory, 'pre_critical');
        }

        // Execute the step
        console.log(`[Executor] Executing step ${i + 1}/${steps.length}: ${step.name}`);
        const stepStart = Date.now();

        try {
          const result = await step.execute(workingState, agentMemory);

          // Update working state with step results
          workingState = { ...workingState, ...result.stateUpdates };
          agentMemory = { ...agentMemory, ...result.memoryUpdates };

          // Record step completion
          const stepRecord = {
            step: i,
            name: step.name,
            status: 'completed',
            started_at: new Date(stepStart).toISOString(),
            completed_at: new Date().toISOString(),
            output_summary: result.summary || '',
            artifacts: result.artifacts || []
          };

          this.currentExecution.stepHistory.push(stepRecord);
          this.currentExecution.completedSteps = i + 1;

          // Progress callback
          if (onProgress) {
            onProgress({
              taskId,
              step: i + 1,
              totalSteps: steps.length,
              stepName: step.name,
              status: 'completed'
            });
          }

          // Create post-step checkpoint
          const checkpointId = await this._checkpoint(taskId, workingState, agentMemory, 'step_completed');

          if (onCheckpoint) {
            onCheckpoint({ taskId, checkpointId, step: i + 1 });
          }

        } catch (stepError) {
          // Record step failure
          this.currentExecution.stepHistory.push({
            step: i,
            name: step.name,
            status: 'failed',
            started_at: new Date(stepStart).toISOString(),
            failed_at: new Date().toISOString(),
            error: stepError.message
          });

          // Create failure checkpoint
          await this._checkpoint(taskId, workingState, agentMemory, 'step_failed');

          throw stepError;
        }
      }

      // Task completed successfully
      console.log(`[Executor] Task ${taskId} completed successfully`);

      // Final cleanup - mark as complete
      this.currentExecution.completedAt = new Date().toISOString();

      return {
        success: true,
        taskId,
        totalSteps: steps.length,
        completedSteps: steps.length,
        workingState,
        agentMemory
      };

    } catch (error) {
      console.error(`[Executor] Task ${taskId} failed at step ${this.currentExecution.currentStep}:`, error);

      return {
        success: false,
        taskId,
        totalSteps: steps.length,
        completedSteps: this.currentExecution.completedSteps,
        failedAtStep: this.currentExecution.currentStep,
        error: error.message,
        canResume: true,
        latestCheckpoint: await this.checkpointManager.getLatestCheckpoint(taskId)
      };
    }
  }

  /**
   * Creates a checkpoint for current execution
   */
  async _checkpoint(taskId, workingState, agentMemory, reason) {
    const executionState = {
      total_steps: this.currentExecution.totalSteps,
      completed_steps: this.currentExecution.completedSteps,
      current_step: this.currentExecution.currentStep,
      step_name: this.currentExecution.stepName,
      started_at: this.currentExecution.startedAt,
      checkpoint_at: new Date().toISOString(),
      stepHistory: this.currentExecution.stepHistory,
      checkpoint_reason: reason
    };

    return await this.checkpointManager.createCheckpoint(
      taskId,
      executionState,
      workingState,
      agentMemory
    );
  }

  /**
   * Resumes an incomplete task
   */
  async resumeTask(taskId, steps) {
    const latest = await this.checkpointManager.getLatestCheckpoint(taskId);

    if (!latest) {
      throw new Error(`No checkpoint found for task ${taskId}`);
    }

    return this.executeTask(taskId, steps, {
      resumeFromCheckpoint: latest.checkpoint_id
    });
  }
}

module.exports = { CheckpointedTaskExecutor };
```

### 4.3 CLI Commands Implementation

```javascript
#!/usr/bin/env node
/**
 * Checkpoint CLI Commands
 * Usage: tinypm checkpoint <command> [options]
 */
const { DurableCheckpointManager } = require('./checkpoint_manager');
const chalk = require('chalk');

const manager = new DurableCheckpointManager();

const commands = {
  async create(taskId) {
    if (!taskId) {
      console.log(chalk.red('Error: task_id required'));
      console.log('Usage: tinypm checkpoint create <task_id>');
      return;
    }

    // This would need current execution context
    console.log(chalk.yellow('Note: Manual checkpoint creation requires active task execution'));
    console.log('Use the API to create checkpoints during task execution.');
  },

  async list(taskId) {
    if (!taskId) {
      // List all tasks with checkpoints
      const incomplete = await manager.detectIncompleteTasks();

      console.log(chalk.bold('\nTasks with Checkpoints:\n'));

      if (incomplete.length === 0) {
        console.log(chalk.gray('No incomplete tasks found.'));
        return;
      }

      for (const task of incomplete) {
        console.log(chalk.cyan(`Task: ${task.taskId}`));
        console.log(`  Progress: ${task.completedSteps}/${task.totalSteps} steps`);
        console.log(`  Interrupted: ${task.interruptedAt}`);
        console.log(`  Resume from: Step ${task.resumeFromStep}`);
        console.log('');
      }
    } else {
      // List checkpoints for specific task
      const checkpoints = await manager.listCheckpoints(taskId);

      console.log(chalk.bold(`\nCheckpoints for ${taskId}:\n`));

      if (checkpoints.length === 0) {
        console.log(chalk.gray('No checkpoints found.'));
        return;
      }

      for (const ckpt of checkpoints) {
        console.log(chalk.cyan(`${ckpt.checkpoint_id}`));
        console.log(`  Step: ${ckpt.step}`);
        console.log(`  Time: ${ckpt.timestamp}`);
        console.log(`  Size: ${(ckpt.size_bytes / 1024).toFixed(2)} KB`);
        console.log(`  Valid: ${ckpt.valid ? chalk.green('Yes') : chalk.red('No')}`);
        console.log('');
      }
    }
  },

  async inspect(checkpointId) {
    if (!checkpointId) {
      console.log(chalk.red('Error: checkpoint_id required'));
      console.log('Usage: tinypm checkpoint inspect <checkpoint_id>');
      return;
    }

    try {
      const checkpoint = await manager.loadCheckpoint(checkpointId);

      console.log(chalk.bold(`\nCheckpoint: ${checkpointId}\n`));
      console.log(chalk.cyan('Task:'), checkpoint.task_id);
      console.log(chalk.cyan('Progress:'), `${checkpoint.execution_state.completed_steps}/${checkpoint.execution_state.total_steps} steps`);
      console.log(chalk.cyan('Current Step:'), checkpoint.execution_state.step_name);
      console.log(chalk.cyan('Created:'), checkpoint.execution_state.checkpoint_at);
      console.log(chalk.cyan('Can Resume:'), checkpoint.recovery_info.can_resume ? chalk.green('Yes') : chalk.red('No'));
      console.log(chalk.cyan('Est. Time:'), checkpoint.recovery_info.estimated_time_to_complete);

      console.log(chalk.bold('\nStep History:'));
      for (const step of checkpoint.step_history) {
        const icon = step.status === 'completed' ? chalk.green('*') : chalk.red('x');
        console.log(`  ${icon} Step ${step.step}: ${step.name}`);
      }

      console.log(chalk.bold('\nFile State:'));
      console.log(`  Modified: ${checkpoint.file_state.modified_files.length} files`);
      console.log(`  Created: ${checkpoint.file_state.created_files.length} files`);

    } catch (e) {
      console.log(chalk.red(`Error: ${e.message}`));
    }
  },

  async restore(checkpointId) {
    if (!checkpointId) {
      console.log(chalk.red('Error: checkpoint_id required'));
      console.log('Usage: tinypm checkpoint restore <checkpoint_id>');
      return;
    }

    try {
      console.log(chalk.yellow(`Restoring from checkpoint ${checkpointId}...`));
      const result = await manager.restoreFromCheckpoint(checkpointId);

      console.log(chalk.green('\nRestore successful!'));
      console.log(chalk.cyan('Task:'), result.taskId);
      console.log(chalk.cyan('Resume from step:'), result.resumeFromStep);
      console.log(chalk.cyan('Working state restored'));
      console.log(chalk.cyan('Agent memory restored'));

    } catch (e) {
      console.log(chalk.red(`Error: ${e.message}`));
    }
  },

  async delete(checkpointId) {
    if (!checkpointId) {
      console.log(chalk.red('Error: checkpoint_id required'));
      console.log('Usage: tinypm checkpoint delete <checkpoint_id>');
      return;
    }

    try {
      await manager.deleteCheckpoint(checkpointId);
      console.log(chalk.green(`Deleted checkpoint ${checkpointId}`));
    } catch (e) {
      console.log(chalk.red(`Error: ${e.message}`));
    }
  },

  async cleanup(options = {}) {
    const olderThan = options.olderThan || '7d';
    console.log(chalk.yellow(`Cleaning up checkpoints older than ${olderThan}...`));

    // Parse duration
    const match = olderThan.match(/^(\d+)([dhm])$/);
    if (!match) {
      console.log(chalk.red('Invalid duration format. Use: 7d, 24h, 30m'));
      return;
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    let ms;

    switch (unit) {
      case 'd': ms = value * 24 * 60 * 60 * 1000; break;
      case 'h': ms = value * 60 * 60 * 1000; break;
      case 'm': ms = value * 60 * 1000; break;
    }

    const cutoff = new Date(Date.now() - ms);
    let deleted = 0;

    // Implementation would iterate and delete old checkpoints
    console.log(chalk.green(`Cleaned up ${deleted} old checkpoints`));
  },

  async recover() {
    console.log(chalk.bold('\nScanning for incomplete tasks...\n'));

    const incomplete = await manager.detectIncompleteTasks();

    if (incomplete.length === 0) {
      console.log(chalk.green('No incomplete tasks found. System is clean.'));
      return;
    }

    console.log(chalk.yellow(`Found ${incomplete.length} incomplete task(s):\n`));

    for (let i = 0; i < incomplete.length; i++) {
      const task = incomplete[i];
      console.log(chalk.cyan(`[${i + 1}] ${task.taskId}`));
      console.log(`    Progress: ${task.completedSteps}/${task.totalSteps} steps`);
      console.log(`    Interrupted: ${task.interruptedAt}`);
      console.log(`    Checkpoint: ${task.checkpoint.checkpoint_id}`);
      console.log('');
    }

    console.log(chalk.bold('Recovery options:'));
    console.log('  tinypm checkpoint restore <checkpoint_id>  - Resume specific task');
    console.log('  tinypm task resume <task_id>               - Resume with latest checkpoint');
  }
};

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  if (!command || command === 'help') {
    console.log(chalk.bold('\nTinyPM Checkpoint Commands\n'));
    console.log('  create <task_id>        Create manual checkpoint');
    console.log('  list [task_id]          List checkpoints');
    console.log('  inspect <checkpoint_id> View checkpoint details');
    console.log('  restore <checkpoint_id> Restore from checkpoint');
    console.log('  delete <checkpoint_id>  Delete checkpoint');
    console.log('  cleanup [--older-than]  Remove old checkpoints');
    console.log('  recover                 Find and recover incomplete tasks');
    return;
  }

  if (commands[command]) {
    await commands[command](param);
  } else {
    console.log(chalk.red(`Unknown command: ${command}`));
    console.log('Run "tinypm checkpoint help" for available commands');
  }
}

main().catch(console.error);
```

---

## 5. FAILURE RECOVERY

### 5.1 Failure Detection Methods

| Detection Method | Implementation | Trigger |
|------------------|----------------|---------|
| **Process Crash** | Uncaught exception handler | Process exits unexpectedly |
| **System Startup Scan** | Check checkpoint manifests | System boots/restarts |
| **Heartbeat Timeout** | No heartbeat for 2+ minutes | Agent becomes unresponsive |
| **Step Timeout** | Step exceeds max duration | Long-running operation hangs |
| **External Signal** | SIGTERM/SIGINT handler | System shutdown signal |

```javascript
/**
 * Failure detection and recovery handler
 */
class FailureRecoveryHandler {
  constructor(checkpointManager) {
    this.manager = checkpointManager;
    this.notificationChannels = [];

    // Register signal handlers
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('uncaughtException', (err) => this.handleCrash(err));
    process.on('unhandledRejection', (err) => this.handleCrash(err));
  }

  /**
   * Called on system startup to check for recovery needs
   */
  async performStartupRecovery() {
    console.log('[Recovery] Scanning for incomplete tasks...');

    const incomplete = await this.manager.detectIncompleteTasks();

    if (incomplete.length === 0) {
      console.log('[Recovery] No incomplete tasks found');
      return { needsRecovery: false };
    }

    console.log(`[Recovery] Found ${incomplete.length} incomplete task(s)`);

    // Notify human about recovery need
    await this.notifyHuman({
      type: 'recovery_needed',
      message: `${incomplete.length} task(s) need recovery after system restart`,
      tasks: incomplete.map(t => ({
        taskId: t.taskId,
        progress: `${t.completedSteps}/${t.totalSteps}`,
        interruptedAt: t.interruptedAt
      }))
    });

    return {
      needsRecovery: true,
      incompleteTasks: incomplete,
      recommendations: this._generateRecoveryRecommendations(incomplete)
    };
  }

  /**
   * Handles graceful shutdown - create final checkpoints
   */
  async handleShutdown(signal) {
    console.log(`[Recovery] Received ${signal}, creating emergency checkpoints...`);

    // Create emergency checkpoint for any active execution
    if (global.currentTaskExecution) {
      await this.manager.createCheckpoint(
        global.currentTaskExecution.taskId,
        global.currentTaskExecution.state,
        global.currentTaskExecution.workingState,
        global.currentTaskExecution.agentMemory
      );
      console.log('[Recovery] Emergency checkpoint created');
    }

    // Notify about shutdown
    await this.notifyHuman({
      type: 'graceful_shutdown',
      message: 'System shutting down gracefully. Checkpoints saved.',
      signal
    });

    process.exit(0);
  }

  /**
   * Handles unexpected crash
   */
  async handleCrash(error) {
    console.error('[Recovery] CRASH DETECTED:', error);

    try {
      // Attempt emergency checkpoint
      if (global.currentTaskExecution) {
        await this.manager.createCheckpoint(
          global.currentTaskExecution.taskId,
          { ...global.currentTaskExecution.state, crashed: true, error: error.message },
          global.currentTaskExecution.workingState,
          global.currentTaskExecution.agentMemory
        );
      }
    } catch (checkpointError) {
      console.error('[Recovery] Failed to create crash checkpoint:', checkpointError);
    }

    // Notify about crash
    await this.notifyHuman({
      type: 'crash',
      message: 'System crashed unexpectedly',
      error: error.message,
      stack: error.stack
    });

    process.exit(1);
  }

  /**
   * Automatic vs Manual recovery decision
   */
  _generateRecoveryRecommendations(incompleteTasks) {
    return incompleteTasks.map(task => {
      const checkpoint = task.checkpoint;

      // Determine if auto-resume is safe
      const autoResumeReasons = [];
      const manualReasons = [];

      // Check time since interruption
      const hoursSinceInterrupt = (Date.now() - new Date(task.interruptedAt)) / (1000 * 60 * 60);

      if (hoursSinceInterrupt < 1) {
        autoResumeReasons.push('Recent interruption (<1 hour)');
      } else if (hoursSinceInterrupt > 24) {
        manualReasons.push('Stale checkpoint (>24 hours old)');
      }

      // Check if external dependencies might have changed
      if (checkpoint.recovery_info.required_context.includes('oauth_tokens')) {
        manualReasons.push('Requires OAuth tokens that may have expired');
      }

      // Check progress
      const progressPercent = (task.completedSteps / task.totalSteps) * 100;
      if (progressPercent > 80) {
        autoResumeReasons.push('High progress (>80% complete)');
      } else if (progressPercent < 20) {
        manualReasons.push('Low progress - consider restarting');
      }

      return {
        taskId: task.taskId,
        recommendation: autoResumeReasons.length > manualReasons.length ? 'auto_resume' : 'manual_review',
        autoResumeReasons,
        manualReasons,
        checkpointId: checkpoint.checkpoint_id
      };
    });
  }

  /**
   * Notify human about recovery events
   */
  async notifyHuman(notification) {
    const timestamp = new Date().toISOString();
    const formatted = {
      ...notification,
      timestamp,
      source: 'DurableCheckpointManager'
    };

    // Log to recovery log
    const logPath = '/tinypm/.agent_checkpoints/recovery/notifications.json';
    let notifications = [];

    try {
      notifications = JSON.parse(await fs.readFile(logPath, 'utf8'));
    } catch (e) {}

    notifications.push(formatted);
    await fs.writeFile(logPath, JSON.stringify(notifications, null, 2));

    // Send through configured channels
    for (const channel of this.notificationChannels) {
      try {
        await channel.send(formatted);
      } catch (e) {
        console.error(`[Recovery] Failed to send notification via ${channel.name}:`, e);
      }
    }

    console.log(`[Recovery] Notification: ${notification.type} - ${notification.message}`);
  }

  /**
   * Register notification channel (email, SMS, Slack, etc.)
   */
  registerNotificationChannel(channel) {
    this.notificationChannels.push(channel);
  }
}
```

### 5.2 Recovery Decision Matrix

| Scenario | Auto-Resume | Manual Intervention | Action |
|----------|-------------|---------------------|--------|
| Crash <1 hour ago, >80% complete | Yes | No | Auto-resume immediately |
| Crash <1 hour ago, <20% complete | No | Yes | Offer restart or resume |
| Crash >24 hours ago | No | Yes | Verify context, then decide |
| OAuth tokens required | No | Yes | Re-authenticate first |
| File conflicts detected | No | Yes | Resolve conflicts manually |
| Critical operation interrupted | No | Yes | Verify state before resume |
| Simple computation interrupted | Yes | No | Auto-resume |

### 5.3 Human Notification Templates

```javascript
const notificationTemplates = {
  recovery_needed: {
    title: 'Task Recovery Required',
    body: `
TinyPM detected ${count} incomplete task(s) that need recovery:

${tasks.map(t => `- ${t.taskId}: ${t.progress} complete, interrupted at ${t.interruptedAt}`).join('\n')}

Actions:
- Run "tinypm checkpoint recover" to see options
- Run "tinypm checkpoint restore <id>" to resume specific task

This may be due to system restart or unexpected shutdown.
    `
  },

  crash: {
    title: 'TinyPM Crash Alert',
    body: `
TinyPM experienced an unexpected crash.

Error: ${error}

Checkpoint was ${checkpointSaved ? 'saved' : 'NOT saved'}.

Please investigate and restart the system.
    `
  },

  graceful_shutdown: {
    title: 'TinyPM Shutdown',
    body: `
TinyPM is shutting down (${signal}).

All active tasks have been checkpointed.
Run "tinypm checkpoint recover" after restart to resume.
    `
  },

  auto_resume_success: {
    title: 'Task Auto-Resumed',
    body: `
Task ${taskId} was automatically resumed from checkpoint.

Previous progress: ${previousProgress}/${totalSteps} steps
Resumed at: ${resumeTime}
Currently running step: ${currentStep}

No action required unless you see further issues.
    `
  }
};
```

---

## 6. USAGE EXAMPLES

### 6.1 Basic Task Execution with Checkpointing

```javascript
const { CheckpointedTaskExecutor } = require('./checkpointed_executor');

const executor = new CheckpointedTaskExecutor();

// Define task steps
const steps = [
  {
    name: 'Analyze requirements',
    execute: async (state, memory) => {
      // ... implementation
      return { stateUpdates: { requirements: [...] }, summary: 'Found 5 requirements' };
    }
  },
  {
    name: 'Generate code',
    critical: true, // Will create pre-step checkpoint
    execute: async (state, memory) => {
      // ... implementation
      return { stateUpdates: { generatedFiles: [...] }, artifacts: ['auth.py'] };
    }
  },
  // ... more steps
];

// Execute with callbacks
const result = await executor.executeTask('TPM-025', steps, {
  onProgress: (info) => console.log(`Step ${info.step}/${info.totalSteps}: ${info.stepName}`),
  onCheckpoint: (info) => console.log(`Checkpoint created: ${info.checkpointId}`)
});

if (!result.success) {
  console.log(`Task failed. Resume with: tinypm checkpoint restore ${result.latestCheckpoint.checkpoint_id}`);
}
```

### 6.2 Automatic Recovery on Startup

```javascript
const { FailureRecoveryHandler, DurableCheckpointManager } = require('./recovery');

async function main() {
  const manager = new DurableCheckpointManager();
  const recovery = new FailureRecoveryHandler(manager);

  // Check for recovery needs on startup
  const status = await recovery.performStartupRecovery();

  if (status.needsRecovery) {
    console.log('Recovery options:');

    for (const rec of status.recommendations) {
      if (rec.recommendation === 'auto_resume') {
        console.log(`Auto-resuming ${rec.taskId}...`);
        await executor.resumeTask(rec.taskId, taskSteps[rec.taskId]);
      } else {
        console.log(`Manual review needed for ${rec.taskId}: ${rec.manualReasons.join(', ')}`);
      }
    }
  }

  // Continue normal operation
}
```

---

## 7. CONFIGURATION

### 7.1 Environment Variables

```bash
# Checkpoint configuration
TINYPM_CHECKPOINT_DIR=/tinypm/.agent_checkpoints
TINYPM_MAX_CHECKPOINTS_PER_TASK=5
TINYPM_CHECKPOINT_CLEANUP_DAYS=7
TINYPM_AUTO_CHECKPOINT_INTERVAL_MS=300000  # 5 minutes

# Recovery configuration
TINYPM_AUTO_RESUME_ENABLED=true
TINYPM_AUTO_RESUME_MAX_AGE_HOURS=24
TINYPM_NOTIFY_ON_RECOVERY=true
TINYPM_NOTIFICATION_EMAIL=todd@tinyseedfarmpgh.com
```

### 7.2 Configuration File

```json
// /tinypm/config/checkpoint.json
{
  "checkpoint": {
    "enabled": true,
    "baseDir": "/tinypm/.agent_checkpoints",
    "maxPerTask": 5,
    "autoCleanupDays": 7,
    "autoInterval": 300000,
    "compressOlderThan": "24h"
  },
  "recovery": {
    "autoResumeEnabled": true,
    "autoResumeMaxAgeHours": 24,
    "requireManualReviewFor": [
      "oauth_tokens",
      "external_api_calls",
      "financial_operations"
    ]
  },
  "notifications": {
    "enabled": true,
    "channels": ["log", "email"],
    "email": {
      "recipient": "todd@tinyseedfarmpgh.com",
      "onCrash": true,
      "onRecoveryNeeded": true,
      "onAutoResume": false
    }
  }
}
```

---

## 8. TESTING CHECKLIST

- [ ] Checkpoint creation after each step
- [ ] Checkpoint loading and verification
- [ ] File backup and restoration
- [ ] Incomplete task detection on startup
- [ ] Auto-resume for eligible tasks
- [ ] Manual recovery flow
- [ ] Graceful shutdown checkpoint creation
- [ ] Crash recovery with emergency checkpoint
- [ ] Human notification delivery
- [ ] CLI command functionality
- [ ] Checkpoint cleanup and retention

---

## 9. RELATED DOCUMENTS

- `/tinypm/board.json` - Task board schema
- `/tinypm/skills/task_skill.py` - Task management skills
- `/tinypm/builder_autonomous.py` - Autonomous builder with state tracking
- `/docs/VERIFIER_CLAUDE_IMPLEMENTATION_SPEC.md` - Verification protocols
- `/docs/FAILURE_PREVENTION_IMPLEMENTATION.md` - Failure prevention strategies

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-12 | Initial specification |
