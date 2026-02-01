"""
TinyPM Task Skills - Board.json Operations
==========================================

Skills for managing tasks in the TinyPM board.json file.

Skills included:
- list_tasks: List all tasks with optional filtering (READ_ONLY)
- get_task: Get a specific task by ID (READ_ONLY)
- create_task: Create a new task (INTERNAL)
- update_task: Update an existing task (INTERNAL)
- update_task_status: Change task status (INTERNAL)
- delete_task: Delete a task (EXTERNAL - requires approval)
- assign_task: Assign a task to an agent (INTERNAL)
- get_task_summary: Get summary of all tasks (READ_ONLY)
- find_tasks_by_status: Find tasks by status (READ_ONLY)
- find_tasks_by_role: Find tasks by role (READ_ONLY)

Created: 2026-01-30
Author: Builder Agent
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills import (
    TinyPMSkill,
    RiskLevel,
    SkillCategory,
    SkillExecutionRequest,
    SkillExecutionResult,
    ExecutionStatus,
    get_skill_registry,
)

# Board file path
APP_DIR = Path(__file__).parent.parent
BOARD_FILE = APP_DIR / "board.json"

# Valid statuses and priorities
VALID_STATUSES = ["pending", "in_progress", "done", "blocked", "cancelled"]
VALID_PRIORITIES = ["low", "medium", "high", "critical"]
VALID_ROLES = ["builder", "designer", "researcher", "coordinator", "pm", "any"]


# =============================================================================
# BOARD FILE OPERATIONS
# =============================================================================

def load_board() -> Dict:
    """Load the board.json file."""
    if not BOARD_FILE.exists():
        return {
            "version": "2.0",
            "project": "TinyPM",
            "mission": "",
            "tasks": [],
            "next_id": 1,
            "activity": [],
            "next_activity_id": 1,
        }
    try:
        return json.loads(BOARD_FILE.read_text())
    except Exception as e:
        print(f"[TaskSkill] Error loading board: {e}")
        return None


def save_board(board: Dict) -> bool:
    """Save the board.json file."""
    try:
        BOARD_FILE.write_text(json.dumps(board, indent=2, default=str))
        return True
    except Exception as e:
        print(f"[TaskSkill] Error saving board: {e}")
        return False


def add_activity(board: Dict, activity_type: str, description: str, task_id: str = None):
    """Add an activity entry to the board."""
    activity_id = board.get("next_activity_id", 1)
    board["activity"].append({
        "id": activity_id,
        "type": activity_type,
        "description": description,
        "task_id": task_id,
        "timestamp": datetime.now().isoformat(),
    })
    board["next_activity_id"] = activity_id + 1

    # Keep last 100 activities
    if len(board["activity"]) > 100:
        board["activity"] = board["activity"][-100:]


# =============================================================================
# LIST TASKS SKILL
# =============================================================================

class ListTasksSkill(TinyPMSkill):
    """List all tasks with optional filtering."""

    name = "list_tasks"
    description = "List all tasks from the project board with optional filtering by status, role, or priority."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "list tasks",
        "show tasks",
        "all tasks",
        "task list",
        "project tasks",
        "what needs to be done",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["tasks:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="status",
            type="string",
            description="Filter by status",
            required=False,
            enum=VALID_STATUSES + ["all"],
            default="all",
        )
        self.add_parameter(
            name="role",
            type="string",
            description="Filter by role",
            required=False,
            enum=VALID_ROLES,
            default="any",
        )
        self.add_parameter(
            name="priority",
            type="string",
            description="Filter by priority",
            required=False,
            enum=VALID_PRIORITIES + ["any"],
            default="any",
        )
        self.add_parameter(
            name="limit",
            type="integer",
            description="Maximum number of tasks to return",
            required=False,
            default=50,
            min_value=1,
            max_value=200,
        )

    def _setup_examples(self):
        self.add_example(
            intent="Show me all pending tasks",
            parameters={"status": "pending"},
            expected_outcome="Returns all tasks with status 'pending'",
        )
        self.add_example(
            intent="What high priority tasks do we have?",
            parameters={"priority": "high"},
            expected_outcome="Returns all high priority tasks",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            status_filter = request.parameters.get("status", "all")
            role_filter = request.parameters.get("role", "any")
            priority_filter = request.parameters.get("priority", "any")
            limit = request.parameters.get("limit", 50)

            tasks = board.get("tasks", [])

            # Apply filters
            if status_filter != "all":
                tasks = [t for t in tasks if t.get("status") == status_filter]

            if role_filter != "any":
                tasks = [t for t in tasks if t.get("role") == role_filter]

            if priority_filter != "any":
                tasks = [t for t in tasks if t.get("priority") == priority_filter]

            # Apply limit
            tasks = tasks[:limit]

            data = {
                "count": len(tasks),
                "filters": {
                    "status": status_filter,
                    "role": role_filter,
                    "priority": priority_filter,
                },
                "tasks": [
                    {
                        "id": t.get("id"),
                        "title": t.get("title"),
                        "status": t.get("status"),
                        "priority": t.get("priority"),
                        "role": t.get("role"),
                        "assigned_agent": t.get("assigned_agent"),
                        "created": t.get("created"),
                        "updated": t.get("updated"),
                    }
                    for t in tasks
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET TASK SKILL
# =============================================================================

class GetTaskSkill(TinyPMSkill):
    """Get a specific task by ID."""

    name = "get_task"
    description = "Get detailed information about a specific task by its ID."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "get task",
        "show task",
        "task details",
        "task info",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["tasks:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_id",
            type="string",
            description="The task ID (e.g., TPM-001)",
            required=True,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            task_id = request.parameters["task_id"]
            tasks = board.get("tasks", [])

            task = next((t for t in tasks if t.get("id") == task_id), None)

            if not task:
                return self.error_result(request, error=f"Task {task_id} not found")

            return self.success_result(request, data={"task": task})

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# CREATE TASK SKILL
# =============================================================================

class CreateTaskSkill(TinyPMSkill):
    """Create a new task."""

    name = "create_task"
    description = "Create a new task in the project board."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "create task",
        "new task",
        "add task",
        "add to board",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["tasks:write"]

    def _setup_parameters(self):
        self.add_parameter(
            name="title",
            type="string",
            description="Task title",
            required=True,
        )
        self.add_parameter(
            name="description",
            type="string",
            description="Task description",
            required=False,
            default="",
        )
        self.add_parameter(
            name="role",
            type="string",
            description="Role responsible for this task",
            required=False,
            enum=VALID_ROLES,
            default="builder",
        )
        self.add_parameter(
            name="priority",
            type="string",
            description="Task priority",
            required=False,
            enum=VALID_PRIORITIES,
            default="medium",
        )
        self.add_parameter(
            name="context",
            type="array",
            description="Related files or context items",
            required=False,
            default=[],
        )

    def _setup_examples(self):
        self.add_example(
            intent="Create a task to fix the login bug",
            parameters={
                "title": "Fix login bug",
                "description": "Users can't log in with special characters in password",
                "priority": "high",
                "role": "builder",
            },
            expected_outcome="Creates a new high-priority task",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            title = request.parameters["title"]
            description = request.parameters.get("description", "")
            role = request.parameters.get("role", "builder")
            priority = request.parameters.get("priority", "medium")
            context = request.parameters.get("context", [])

            # Generate task ID
            next_id = board.get("next_id", 1)
            task_id = f"TPM-{next_id:03d}"

            now = datetime.now().strftime("%Y-%m-%d")

            new_task = {
                "id": task_id,
                "title": title,
                "description": description,
                "role": role,
                "priority": priority,
                "status": "pending",
                "context": context,
                "created": now,
                "updated": now,
            }

            board["tasks"].append(new_task)
            board["next_id"] = next_id + 1

            add_activity(board, "task_created", f"Created task: {title}", task_id)

            if not save_board(board):
                return self.error_result(request, error="Failed to save board")

            return self.success_result(request, data={
                "task_id": task_id,
                "task": new_task,
                "message": f"Task {task_id} created successfully",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# UPDATE TASK SKILL
# =============================================================================

class UpdateTaskSkill(TinyPMSkill):
    """Update an existing task."""

    name = "update_task"
    description = "Update fields of an existing task."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "update task",
        "edit task",
        "modify task",
        "change task",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["tasks:write"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_id",
            type="string",
            description="The task ID to update",
            required=True,
        )
        self.add_parameter(
            name="title",
            type="string",
            description="New task title",
            required=False,
        )
        self.add_parameter(
            name="description",
            type="string",
            description="New task description",
            required=False,
        )
        self.add_parameter(
            name="priority",
            type="string",
            description="New priority",
            required=False,
            enum=VALID_PRIORITIES,
        )
        self.add_parameter(
            name="role",
            type="string",
            description="New role assignment",
            required=False,
            enum=VALID_ROLES,
        )
        self.add_parameter(
            name="context",
            type="array",
            description="Updated context items",
            required=False,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            task_id = request.parameters["task_id"]
            tasks = board.get("tasks", [])

            task_index = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)

            if task_index is None:
                return self.error_result(request, error=f"Task {task_id} not found")

            task = tasks[task_index]
            updated_fields = []

            # Update fields if provided
            for field in ["title", "description", "priority", "role", "context"]:
                if field in request.parameters and request.parameters[field] is not None:
                    old_value = task.get(field)
                    new_value = request.parameters[field]
                    if old_value != new_value:
                        task[field] = new_value
                        updated_fields.append(field)

            if updated_fields:
                task["updated"] = datetime.now().strftime("%Y-%m-%d")
                add_activity(board, "task_updated", f"Updated {task_id}: {', '.join(updated_fields)}", task_id)

                if not save_board(board):
                    return self.error_result(request, error="Failed to save board")

            return self.success_result(request, data={
                "task_id": task_id,
                "task": task,
                "updated_fields": updated_fields,
                "message": f"Task {task_id} updated" if updated_fields else "No changes made",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# UPDATE TASK STATUS SKILL
# =============================================================================

class UpdateTaskStatusSkill(TinyPMSkill):
    """Change task status."""

    name = "update_task_status"
    description = "Change the status of a task (pending, in_progress, done, blocked, cancelled)."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "mark task",
        "change status",
        "complete task",
        "start task",
        "block task",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["tasks:write"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_id",
            type="string",
            description="The task ID",
            required=True,
        )
        self.add_parameter(
            name="status",
            type="string",
            description="New status",
            required=True,
            enum=VALID_STATUSES,
        )

    def _setup_examples(self):
        self.add_example(
            intent="Mark TPM-001 as done",
            parameters={"task_id": "TPM-001", "status": "done"},
            expected_outcome="Changes task status to done",
        )
        self.add_example(
            intent="Start working on TPM-005",
            parameters={"task_id": "TPM-005", "status": "in_progress"},
            expected_outcome="Changes task status to in_progress",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            task_id = request.parameters["task_id"]
            new_status = request.parameters["status"]
            tasks = board.get("tasks", [])

            task_index = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)

            if task_index is None:
                return self.error_result(request, error=f"Task {task_id} not found")

            task = tasks[task_index]
            old_status = task.get("status")

            if old_status == new_status:
                return self.success_result(request, data={
                    "task_id": task_id,
                    "status": new_status,
                    "message": f"Task {task_id} is already {new_status}",
                    "changed": False,
                })

            task["status"] = new_status
            task["updated"] = datetime.now().strftime("%Y-%m-%d")

            add_activity(board, "status_changed", f"{task_id}: {old_status} -> {new_status}", task_id)

            if not save_board(board):
                return self.error_result(request, error="Failed to save board")

            return self.success_result(request, data={
                "task_id": task_id,
                "old_status": old_status,
                "new_status": new_status,
                "task": task,
                "changed": True,
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# DELETE TASK SKILL
# =============================================================================

class DeleteTaskSkill(TinyPMSkill):
    """Delete a task (requires approval)."""

    name = "delete_task"
    description = "Delete a task from the board. This is a destructive action requiring approval."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "delete task",
        "remove task",
    ]
    risk_level = RiskLevel.EXTERNAL  # Requires approval
    required_permissions = ["tasks:delete"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_id",
            type="string",
            description="The task ID to delete",
            required=True,
        )
        self.add_parameter(
            name="reason",
            type="string",
            description="Reason for deletion",
            required=False,
            default="No reason provided",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            task_id = request.parameters["task_id"]
            reason = request.parameters.get("reason", "No reason provided")
            tasks = board.get("tasks", [])

            task_index = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)

            if task_index is None:
                return self.error_result(request, error=f"Task {task_id} not found")

            deleted_task = tasks.pop(task_index)

            add_activity(board, "task_deleted", f"Deleted {task_id}: {deleted_task.get('title')} - {reason}", task_id)

            if not save_board(board):
                return self.error_result(request, error="Failed to save board")

            return self.success_result(request, data={
                "task_id": task_id,
                "deleted_task": deleted_task,
                "reason": reason,
                "message": f"Task {task_id} deleted successfully",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# ASSIGN TASK SKILL
# =============================================================================

class AssignTaskSkill(TinyPMSkill):
    """Assign a task to an agent."""

    name = "assign_task"
    description = "Assign a task to a specific agent or unassign it."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "assign task",
        "give task to",
        "task assignment",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["tasks:write"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_id",
            type="string",
            description="The task ID",
            required=True,
        )
        self.add_parameter(
            name="agent_id",
            type="string",
            description="Agent ID to assign to, or empty to unassign",
            required=False,
            default="",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            task_id = request.parameters["task_id"]
            agent_id = request.parameters.get("agent_id", "")
            tasks = board.get("tasks", [])

            task_index = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)

            if task_index is None:
                return self.error_result(request, error=f"Task {task_id} not found")

            task = tasks[task_index]
            old_agent = task.get("assigned_agent")

            if agent_id:
                task["assigned_agent"] = agent_id
                activity_desc = f"Assigned {task_id} to {agent_id}"
            else:
                task.pop("assigned_agent", None)
                activity_desc = f"Unassigned {task_id}"

            task["updated"] = datetime.now().strftime("%Y-%m-%d")
            add_activity(board, "task_assigned", activity_desc, task_id)

            if not save_board(board):
                return self.error_result(request, error="Failed to save board")

            return self.success_result(request, data={
                "task_id": task_id,
                "old_agent": old_agent,
                "new_agent": agent_id or None,
                "task": task,
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET TASK SUMMARY SKILL
# =============================================================================

class GetTaskSummarySkill(TinyPMSkill):
    """Get summary of all tasks."""

    name = "get_task_summary"
    description = "Get a summary of tasks grouped by status and priority."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "task summary",
        "project summary",
        "task overview",
        "project status",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["tasks:read"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            tasks = board.get("tasks", [])

            # Count by status
            status_counts = {status: 0 for status in VALID_STATUSES}
            for task in tasks:
                status = task.get("status", "pending")
                if status in status_counts:
                    status_counts[status] += 1

            # Count by priority
            priority_counts = {priority: 0 for priority in VALID_PRIORITIES}
            for task in tasks:
                priority = task.get("priority", "medium")
                if priority in priority_counts:
                    priority_counts[priority] += 1

            # Count by role
            role_counts = {}
            for task in tasks:
                role = task.get("role", "builder")
                role_counts[role] = role_counts.get(role, 0) + 1

            # Completion percentage
            total = len(tasks)
            done = status_counts.get("done", 0)
            completion_pct = round(done / total * 100) if total > 0 else 0

            data = {
                "total_tasks": total,
                "completion_percentage": completion_pct,
                "by_status": status_counts,
                "by_priority": priority_counts,
                "by_role": role_counts,
                "project": board.get("project"),
                "mission": board.get("mission"),
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# FIND TASKS BY STATUS SKILL
# =============================================================================

class FindTasksByStatusSkill(TinyPMSkill):
    """Find tasks by status."""

    name = "find_tasks_by_status"
    description = "Find all tasks with a specific status."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "pending tasks",
        "in progress tasks",
        "completed tasks",
        "blocked tasks",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["tasks:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="status",
            type="string",
            description="Status to filter by",
            required=True,
            enum=VALID_STATUSES,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            status = request.parameters["status"]
            tasks = board.get("tasks", [])

            matching_tasks = [t for t in tasks if t.get("status") == status]

            data = {
                "status": status,
                "count": len(matching_tasks),
                "tasks": matching_tasks,
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# FIND TASKS BY ROLE SKILL
# =============================================================================

class FindTasksByRoleSkill(TinyPMSkill):
    """Find tasks by role."""

    name = "find_tasks_by_role"
    description = "Find all tasks assigned to a specific role."
    version = "1.0.0"
    category = SkillCategory.TASK
    triggers = [
        "builder tasks",
        "designer tasks",
        "researcher tasks",
        "tasks for role",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["tasks:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="role",
            type="string",
            description="Role to filter by",
            required=True,
            enum=VALID_ROLES,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        board = load_board()
        if board is None:
            return self.error_result(request, error="Failed to load board")

        try:
            role = request.parameters["role"]
            tasks = board.get("tasks", [])

            matching_tasks = [t for t in tasks if t.get("role") == role]

            data = {
                "role": role,
                "count": len(matching_tasks),
                "tasks": matching_tasks,
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# REGISTRATION
# =============================================================================

def register_task_skills():
    """Register all task skills with the global registry."""
    registry = get_skill_registry()

    skills = [
        ListTasksSkill(),
        GetTaskSkill(),
        CreateTaskSkill(),
        UpdateTaskSkill(),
        UpdateTaskStatusSkill(),
        DeleteTaskSkill(),
        AssignTaskSkill(),
        GetTaskSummarySkill(),
        FindTasksByStatusSkill(),
        FindTasksByRoleSkill(),
    ]

    for skill in skills:
        registry.register(skill)

    print(f"[TaskSkill] Registered {len(skills)} task skills")
    return skills


# Auto-register on import
register_task_skills()
