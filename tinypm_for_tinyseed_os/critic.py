"""
TinyPM Critic Module - Verification & Quality Assurance
Based on SOTA research: LangGraph + Reflection Pattern

The Mentor agent - verifies Builder output before reporting "done"
"""

import subprocess
import os
import json
import time
from typing import Literal

# ============ VERIFICATION FUNCTIONS ============

def critic_verify(task_type: str, builder_output: str, context: dict) -> tuple[bool, str]:
    """
    Verify builder output based on task type.
    Returns (is_valid, feedback_message)

    This is the Mentor's core function - it checks the Artificer's work.
    """

    # Check for obvious builder errors first
    if builder_output.startswith("ERROR:"):
        return False, builder_output

    if "timed out" in builder_output.lower():
        return False, "Builder timed out - task may be too complex"

    if task_type == "code_change":
        return verify_code_change(context)

    elif task_type == "api_endpoint":
        return verify_api_endpoint(context)

    elif task_type == "file_create":
        return verify_file_create(context)

    elif task_type == "research":
        return verify_research(builder_output, context)

    # Default: basic sanity check
    if len(builder_output.strip()) < 50:
        return False, "Output too short - may not have completed task"

    return True, "Output looks reasonable"


def verify_code_change(context: dict) -> tuple[bool, str]:
    """Verify code changes: file exists, syntax valid"""

    file_path = context.get("target_file")
    start_time = context.get("start_time", 0)

    if not file_path:
        return True, "No target file specified - skipping verification"

    # Check 1: File exists
    if not os.path.exists(file_path):
        return False, f"File {file_path} does not exist"

    # Check 2: File was modified (if we have start time)
    if start_time:
        mtime = os.path.getmtime(file_path)
        if mtime < start_time:
            return False, f"File {file_path} was not modified"

    # Check 3: Syntax validation
    if file_path.endswith(".py"):
        result = subprocess.run(
            ["python3", "-m", "py_compile", file_path],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return False, f"Python syntax error: {result.stderr}"

    elif file_path.endswith(".js"):
        result = subprocess.run(
            ["node", "--check", file_path],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return False, f"JavaScript syntax error: {result.stderr}"

    elif file_path.endswith(".json"):
        try:
            with open(file_path) as f:
                json.load(f)
        except json.JSONDecodeError as e:
            return False, f"JSON syntax error: {str(e)}"

    return True, "Code changes verified - syntax valid"


def verify_api_endpoint(context: dict) -> tuple[bool, str]:
    """Verify API endpoint responds correctly"""

    endpoint = context.get("endpoint_url")
    expected_status = context.get("expected_status", ["200", "201", "204"])

    if not endpoint:
        return True, "No endpoint specified - skipping verification"

    try:
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", endpoint],
            capture_output=True, text=True, timeout=10
        )
        status = result.stdout.strip()

        if status not in expected_status:
            return False, f"Endpoint returned {status}, expected one of {expected_status}"

        return True, f"Endpoint responding with {status}"

    except subprocess.TimeoutExpired:
        return False, "Endpoint timed out after 10 seconds"
    except Exception as e:
        return False, f"Failed to check endpoint: {str(e)}"


def verify_file_create(context: dict) -> tuple[bool, str]:
    """Verify file was created and has content"""

    file_path = context.get("target_file")
    min_size = context.get("min_size", 1)  # Minimum bytes

    if not file_path:
        return True, "No target file specified - skipping verification"

    if not os.path.exists(file_path):
        return False, f"File {file_path} was not created"

    size = os.path.getsize(file_path)
    if size < min_size:
        return False, f"File {file_path} is too small ({size} bytes)"

    return True, f"File created successfully ({size} bytes)"


def verify_research(builder_output: str, context: dict) -> tuple[bool, str]:
    """Verify research output has substance"""

    min_length = context.get("min_length", 500)
    required_sections = context.get("required_sections", [])

    # Check length
    if len(builder_output) < min_length:
        return False, f"Research output too short ({len(builder_output)} chars, need {min_length})"

    # Check required sections
    missing = []
    for section in required_sections:
        if section.lower() not in builder_output.lower():
            missing.append(section)

    if missing:
        return False, f"Research missing sections: {', '.join(missing)}"

    return True, "Research output verified"


# ============ CRITIC LOOP INTEGRATION ============

def run_with_critic(
    execute_fn,
    task: str,
    task_type: str = "other",
    context: dict = None,
    max_retries: int = 3
) -> dict:
    """
    Execute a task with critic verification loop.

    Args:
        execute_fn: Function that takes (task, feedback) and returns output string
        task: The task description
        task_type: One of "code_change", "api_endpoint", "file_create", "research", "other"
        context: Additional context for verification (target_file, endpoint_url, etc.)
        max_retries: Maximum retry attempts (default: 3)

    Returns:
        dict with: success, output, iterations, feedback
    """

    context = context or {}
    context["start_time"] = time.time()

    iterations = 0
    feedback = ""
    output = ""

    while iterations < max_retries:
        iterations += 1

        # Execute task (with feedback if retrying)
        if feedback:
            full_task = f"{task}\n\n[IMPORTANT] Fix this issue from previous attempt:\n{feedback}"
        else:
            full_task = task

        output = execute_fn(full_task, feedback)

        # Verify output
        is_valid, feedback = critic_verify(task_type, output, context)

        if is_valid:
            return {
                "success": True,
                "output": output,
                "iterations": iterations,
                "feedback": feedback
            }

        # Log retry
        print(f"[Critic] Attempt {iterations} failed: {feedback}")

    # Max retries exceeded
    return {
        "success": False,
        "output": output,
        "iterations": iterations,
        "feedback": f"Max retries ({max_retries}) exceeded. Last error: {feedback}"
    }


# ============ TASK TYPE DETECTION ============

def detect_task_type(task: str) -> str:
    """Auto-detect task type from description"""

    task_lower = task.lower()

    # Code change indicators
    if any(kw in task_lower for kw in ["edit", "modify", "update", "fix", "change", "add to", "remove from"]):
        if any(ext in task_lower for ext in [".py", ".js", ".html", ".css", ".json"]):
            return "code_change"

    # API endpoint indicators
    if any(kw in task_lower for kw in ["endpoint", "api", "route", "curl", "request"]):
        return "api_endpoint"

    # File creation indicators
    if any(kw in task_lower for kw in ["create file", "new file", "write file", "generate file"]):
        return "file_create"

    # Research indicators
    if any(kw in task_lower for kw in ["research", "analyze", "investigate", "find out", "compare"]):
        return "research"

    return "other"


# ============ EXAMPLE USAGE ============

if __name__ == "__main__":
    # Example: verify a code change
    result = verify_code_change({
        "target_file": "/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/pm_brain.py"
    })
    print(f"Code verification: {result}")

    # Example: detect task type
    task = "Edit web_server.py to add a new /api/health endpoint"
    task_type = detect_task_type(task)
    print(f"Detected task type: {task_type}")
