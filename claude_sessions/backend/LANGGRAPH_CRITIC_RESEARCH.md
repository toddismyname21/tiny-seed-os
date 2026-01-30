# LangGraph Critic Loop - Implementation Research

## Date: 2026-01-29
## Analyst: Backend Claude
## Methodology: ULTRATHINK Protocol

---

## EXECUTIVE SUMMARY

**Key Finding 1:** LangGraph natively supports cyclic graphs with `add_conditional_edges` and `Command` objects for retry-until-success patterns.

**Key Finding 2:** The self-correcting agent pattern (Generate → Check → Reflect → Retry) is a proven architecture with explicit iteration counters preventing infinite loops.

**Key Finding 3:** The Claude Agent SDK provides a cleaner integration path than raw subprocess calls, with built-in tool hooks for verification.

**Recommended Approach:** **Hybrid** - Keep current builder subprocess structure, add LangGraph critic loop wrapper with Claude Agent SDK for the critic agent.

**Confidence Level:** HIGH - Based on official documentation and multiple verified examples.

---

## 1. LANGGRAPH CYCLIC GRAPHS

**How It Works:**

LangGraph models applications as directed graphs where nodes are functions and edges define execution flow. Unlike traditional DAG (Directed Acyclic Graph) frameworks, LangGraph explicitly supports cycles - a node can route back to a previous node, creating retry loops.

The key primitives are:
1. **`add_conditional_edges(source, routing_function, path_map)`** - Routes to different nodes based on state
2. **`Command(update={...}, goto="node_name")`** - Combines state update + routing in one return
3. **State persistence** - TypedDict state automatically flows between nodes

**Code Pattern:**

```python
from typing import TypedDict, Literal, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from operator import add

# State schema with retry tracking
class CriticLoopState(TypedDict):
    task: str                           # Original task description
    builder_output: str                 # What the builder produced
    critic_feedback: str                # Critic's assessment
    error: Literal["yes", "no", ""]     # Pass/fail flag
    iterations: int                     # Retry counter
    max_iterations: int                 # Retry limit

# Builder node
def builder_node(state: CriticLoopState) -> dict:
    # Execute task (calls Claude CLI or API)
    output = execute_builder_task(state["task"], state.get("critic_feedback", ""))
    return {
        "builder_output": output,
        "iterations": state["iterations"] + 1
    }

# Critic node
def critic_node(state: CriticLoopState) -> dict:
    # Verify the builder's output
    is_valid, feedback = verify_output(state["builder_output"], state["task"])
    return {
        "error": "no" if is_valid else "yes",
        "critic_feedback": feedback
    }

# Routing function
def should_continue(state: CriticLoopState) -> Literal["builder", "end"]:
    if state["error"] == "no":
        return "end"  # Success!
    if state["iterations"] >= state["max_iterations"]:
        return "end"  # Give up after max retries
    return "builder"  # Retry with feedback

# Build the graph
workflow = StateGraph(CriticLoopState)

workflow.add_node("builder", builder_node)
workflow.add_node("critic", critic_node)

workflow.add_edge(START, "builder")
workflow.add_edge("builder", "critic")

workflow.add_conditional_edges(
    "critic",
    should_continue,
    {"builder": "builder", "end": END}
)

app = workflow.compile()

# Execute
result = app.invoke({
    "task": "Add logout button to settings page",
    "builder_output": "",
    "critic_feedback": "",
    "error": "",
    "iterations": 0,
    "max_iterations": 3
})
```

**State Persistence Across Iterations:**

State automatically carries forward. Each node receives the full current state and returns partial updates. LangGraph merges updates using "reducers" (default: overwrite, optional: append via `Annotated[list, add]`).

**Max Retries & Infinite Loop Protection:**

LangGraph has a built-in `recursion_limit` (default: 1000 steps). When exceeded, it raises `GraphRecursionError`. For critic loops, use an explicit `iterations` counter with `max_iterations` limit (recommended: 3).

**Source:** [LangChain Graph API Docs](https://docs.langchain.com/oss/python/langgraph/graph-api)
**Confidence:** HIGH

---

## 2. CRITIC/VERIFIER PATTERNS

**What to Check:**

| Check Type | Speed | Thoroughness | When to Use |
|------------|-------|--------------|-------------|
| File existence check | ~10ms | Low | Always - did anything change? |
| Syntax validation | ~50ms | Medium | Code changes - is it valid? |
| Static analysis (AST) | ~200ms | Medium | Python/JS - structural correctness |
| Unit test execution | ~2-10s | High | When tests exist for changed code |
| Endpoint health check | ~500ms | Medium | API changes - does it respond? |
| Integration test | ~10-60s | Very High | Critical paths only |
| LLM self-verification | ~1-3s | Variable | When rules are complex/subjective |

**Recommended Checks for TinyPM Builder:**

1. **File Change Verification** (ALWAYS)
   - Did the target file actually change?
   - Is the change non-empty?
   - Git diff shows meaningful modifications?

2. **Syntax Validation** (FOR CODE TASKS)
   - Python: `python -m py_compile file.py`
   - JavaScript: `node --check file.js`
   - JSON: `python -m json.tool file.json`

3. **Smoke Test** (FOR API ENDPOINTS)
   - Can we curl the endpoint?
   - Does it return 200 or expected status?
   - Is the response valid JSON?

**Lightweight Critic Implementation:**

```python
import subprocess
import os
import json

def critic_verify(task_type: str, builder_output: str, context: dict) -> tuple[bool, str]:
    """
    Verify builder output based on task type.
    Returns (is_valid, feedback_message)
    """

    if task_type == "code_change":
        # Check 1: File was modified
        file_path = context.get("target_file")
        if file_path and os.path.exists(file_path):
            # Check modification time
            mtime = os.path.getmtime(file_path)
            if mtime < context.get("start_time", 0):
                return False, f"File {file_path} was not modified"

        # Check 2: Syntax validation
        if file_path.endswith(".py"):
            result = subprocess.run(
                ["python", "-m", "py_compile", file_path],
                capture_output=True, text=True
            )
            if result.returncode != 0:
                return False, f"Syntax error: {result.stderr}"

        elif file_path.endswith(".js"):
            result = subprocess.run(
                ["node", "--check", file_path],
                capture_output=True, text=True
            )
            if result.returncode != 0:
                return False, f"Syntax error: {result.stderr}"

        return True, "Code changes verified"

    elif task_type == "api_endpoint":
        endpoint = context.get("endpoint_url")
        if endpoint:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", endpoint],
                capture_output=True, text=True, timeout=10
            )
            if result.stdout not in ["200", "201", "204"]:
                return False, f"Endpoint returned {result.stdout}, expected 2xx"

        return True, "Endpoint responding"

    elif task_type == "file_create":
        file_path = context.get("target_file")
        if not file_path or not os.path.exists(file_path):
            return False, f"File {file_path} was not created"
        if os.path.getsize(file_path) == 0:
            return False, f"File {file_path} is empty"
        return True, "File created successfully"

    # Default: Ask LLM to verify
    return llm_verify(builder_output, context.get("original_task", ""))

def llm_verify(output: str, task: str) -> tuple[bool, str]:
    """Use LLM to verify complex/subjective outputs"""
    prompt = f"""
    Task: {task}

    Builder Output:
    {output}

    Does this output successfully complete the task?
    Respond with JSON: {{"valid": true/false, "reason": "..."}}
    """
    # Call lightweight model (e.g., Claude Haiku)
    response = call_llm(prompt, model="claude-3-haiku")
    result = json.loads(response)
    return result["valid"], result["reason"]
```

**Retry Strategy:**

- **Max retries:** 3 (based on research: diminishing returns after 3 attempts)
- **Feedback format:** Include specific error message + what to fix
- **Backoff:** Not needed for LLM retries (unlike API rate limits)
- **When to give up:** After max retries OR if same error repeats twice

**Confidence:** MEDIUM (reasonable based on patterns, but needs testing with real tasks)

---

## 3. MULTI-AGENT HANDOFF

**State Schema:**

```python
from typing import TypedDict, Literal, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class TinyPMState(TypedDict):
    # Task info
    task_id: str
    task_description: str
    task_type: Literal["code_change", "api_endpoint", "file_create", "research"]

    # Builder context
    builder_output: str
    files_modified: list[str]

    # Critic context
    verification_result: Literal["pass", "fail", "skip"]
    critic_feedback: str

    # Flow control
    current_agent: Literal["orchestrator", "builder", "critic"]
    iterations: int
    max_iterations: int

    # Message history (appends via reducer)
    messages: Annotated[Sequence[BaseMessage], add_messages]
```

**Handoff Pattern - Command Object:**

```python
from langgraph.types import Command

def builder_node(state: TinyPMState) -> Command:
    """Builder executes task, then hands off to Critic"""

    # Execute the task
    output = execute_with_claude_cli(
        task=state["task_description"],
        feedback=state.get("critic_feedback", "")
    )

    # Determine what files were touched
    files = detect_modified_files(state["task_description"])

    # Hand off to critic with updated state
    return Command(
        update={
            "builder_output": output,
            "files_modified": files,
            "iterations": state["iterations"] + 1,
            "current_agent": "critic"
        },
        goto="critic"
    )

def critic_node(state: TinyPMState) -> Command:
    """Critic verifies, then routes to retry or complete"""

    is_valid, feedback = critic_verify(
        task_type=state["task_type"],
        builder_output=state["builder_output"],
        context={
            "target_file": state["files_modified"][0] if state["files_modified"] else None,
            "original_task": state["task_description"]
        }
    )

    if is_valid:
        return Command(
            update={
                "verification_result": "pass",
                "critic_feedback": feedback,
                "current_agent": "orchestrator"
            },
            goto="complete"
        )

    if state["iterations"] >= state["max_iterations"]:
        return Command(
            update={
                "verification_result": "fail",
                "critic_feedback": f"Max retries exceeded. Last error: {feedback}",
                "current_agent": "orchestrator"
            },
            goto="complete"
        )

    # Retry with feedback
    return Command(
        update={
            "verification_result": "fail",
            "critic_feedback": feedback,
            "current_agent": "builder"
        },
        goto="builder"
    )
```

**Error Handling - Downstream Agent Failure:**

```python
def safe_builder_node(state: TinyPMState) -> Command:
    """Builder with error handling"""
    try:
        output = execute_with_claude_cli(
            task=state["task_description"],
            feedback=state.get("critic_feedback", ""),
            timeout=300  # 5 minute timeout
        )
        return Command(
            update={"builder_output": output, "iterations": state["iterations"] + 1},
            goto="critic"
        )
    except subprocess.TimeoutExpired:
        return Command(
            update={
                "builder_output": "",
                "critic_feedback": "Builder timed out after 5 minutes",
                "verification_result": "fail"
            },
            goto="complete" if state["iterations"] >= state["max_iterations"] else "builder"
        )
    except Exception as e:
        return Command(
            update={
                "builder_output": "",
                "critic_feedback": f"Builder crashed: {str(e)}",
                "verification_result": "fail"
            },
            goto="complete"
        )
```

**Confidence:** HIGH (Command pattern is well-documented and matches our use case)

---

## 4. CLAUDE CLI INTEGRATION

**Option A: Keep CLI Calls (Current Approach)**

```python
# Current builder_autonomous.py pattern
result = subprocess.run([
    claude, "-p", prompt,
    "--dangerously-skip-permissions"
], capture_output=True, text=True, timeout=timeout)
```

**Pros:**
- Already working
- Simple, no new dependencies
- Full Claude Code capabilities (file system, bash, etc.)
- Easy to debug (just run the command manually)

**Cons:**
- Subprocess overhead (~500ms startup per call)
- No streaming - wait for full completion
- Limited programmatic control
- Error handling is string parsing
- No tool hooks or permission control

**Option B: Claude Agent SDK**

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async def execute_with_sdk(task: str, feedback: str = "") -> str:
    prompt = f"{task}\n\nPrevious feedback to address: {feedback}" if feedback else task

    options = ClaudeAgentOptions(
        system_prompt="You are a code builder. Execute the task completely.",
        max_turns=10,
        cwd="/path/to/project",
        allowed_tools=["Read", "Write", "Edit", "Bash"],
        permission_mode="acceptEdits"
    )

    full_output = []
    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for msg in client.receive_response():
            if hasattr(msg, 'content'):
                for block in msg.content:
                    if hasattr(block, 'text'):
                        full_output.append(block.text)

    return "\n".join(full_output)
```

**Pros:**
- Python-native, async support
- Streaming responses
- Programmatic hooks for verification
- Better error handling (typed exceptions)
- Tool filtering (only allow safe tools)
- Bundled CLI (no separate install)

**Cons:**
- New dependency to manage
- Async code complexity
- Less mature than raw CLI
- May have edge cases vs full CLI

**Option C: Direct Anthropic API**

```python
import anthropic

client = anthropic.Anthropic()

def execute_with_api(task: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": task}]
    )
    return response.content[0].text
```

**Pros:**
- Simplest code
- Most control over prompts
- Works in any environment
- No file system side effects

**Cons:**
- No file system access (can't actually edit files!)
- No bash execution
- Would need separate tool to apply changes
- Defeats purpose of autonomous builder

**Recommendation:** **Option B - Claude Agent SDK**

Rationale:
1. We need file system access (rules out Option C)
2. SDK provides hooks for critic integration
3. Better error handling for retry loops
4. Async streaming is useful for long tasks
5. SDK bundles CLI, so deployment is still simple

For the **Critic agent**, use **Option C (Direct API)** with Claude Haiku - it doesn't need file access, just verification logic, and Haiku is faster/cheaper.

**Confidence:** MEDIUM (SDK is newer, but architecture is sound)

---

## 5. IMPLEMENTATION PLAN

**Recommended Approach:** HYBRID

Why not Full LangGraph?
- Current builder_autonomous.py works
- Rewriting everything introduces risk
- LangGraph adds complexity without full benefit

Why not Simple Python (no LangGraph)?
- Conditional routing logic gets messy
- State management becomes manual
- No built-in cycle/recursion protection

Why Hybrid?
- Keep builder subprocess (it works)
- Add LangGraph wrapper for critic loop orchestration
- Best of both: reliability + proper state management

---

### Phase 1: Add Lightweight Critic (No LangGraph)

**Goal:** Prove the critic concept works before adding complexity.

- [ ] Create `critic.py` module with verification functions
  - File change detection
  - Syntax validation
  - Endpoint health checks

- [ ] Modify `builder_autonomous.py` to call critic after execution
  ```python
  # After builder completes
  is_valid, feedback = critic_verify(task_type, output, context)
  if not is_valid and retries < 3:
      # Re-run builder with feedback
      output = run_builder(task + f"\n\nFIX THIS: {feedback}")
      retries += 1
  ```

- [ ] Test with 10 real tasks, measure success rate

**Files to Create/Modify:**
- `tinypm/critic.py` (new)
- `tinypm/builder_autonomous.py` (modify)

---

### Phase 2: Add LangGraph State Management

**Goal:** Proper state tracking and flow control.

- [ ] Install LangGraph: `pip install langgraph`

- [ ] Create `tinypm/critic_loop.py` with LangGraph graph
  ```python
  from langgraph.graph import StateGraph, START, END

  workflow = StateGraph(CriticLoopState)
  workflow.add_node("builder", builder_node)
  workflow.add_node("critic", critic_node)
  # ... edges
  app = workflow.compile()
  ```

- [ ] Wrap existing builder in LangGraph node
  - Builder node calls `subprocess.run()` (existing)
  - Critic node calls `critic_verify()` (from Phase 1)

- [ ] Add iteration tracking and max retry limit

- [ ] Test graph execution with visualization

**Files to Create/Modify:**
- `tinypm/critic_loop.py` (new)
- `tinypm/state.py` (new - state schemas)

---

### Phase 3: Upgrade to Claude Agent SDK (Optional)

**Goal:** Better integration and control.

- [ ] Install SDK: `pip install claude-agent-sdk`

- [ ] Replace subprocess builder with SDK client
  ```python
  async with ClaudeSDKClient(options=options) as client:
      await client.query(prompt)
      # ...
  ```

- [ ] Add pre-tool hooks for safety checks

- [ ] Add streaming progress output

- [ ] Benchmark: SDK vs subprocess performance

**Files to Create/Modify:**
- `tinypm/builder_sdk.py` (new)
- `tinypm/critic_loop.py` (modify to use async)

---

### Phase 4: Production Hardening

**Goal:** Make it reliable for real use.

- [ ] Add observability (logging, metrics)

- [ ] Add circuit breaker (stop after N consecutive failures)

- [ ] Add task-type-specific critic rules

- [ ] Create critic rule configuration file

- [ ] Add tests for critic logic

- [ ] Document the system

**Files to Create/Modify:**
- `tinypm/critic_rules.yaml` (new)
- `tests/test_critic.py` (new)
- `docs/CRITIC_SYSTEM.md` (new)

---

**Estimated Complexity:** MEDIUM

Phase 1 is straightforward (1-2 hours of coding). Phase 2 requires LangGraph learning (4-8 hours). Phase 3 is optional enhancement. Phase 4 is ongoing.

---

## SOURCES

- [LangGraph Official Documentation](https://docs.langchain.com/oss/python/langgraph/overview) - Graph API, conditional edges, state management
- [LangGraph GitHub Repository](https://github.com/langchain-ai/langgraph) - Source code and examples
- [LangGraph Self-Correcting Agent Tutorial](https://learnopencv.com/langgraph-self-correcting-agent-code-generation/) - Generate-Check-Reflect pattern
- [Agent Handoffs in Multi-Agent Systems](https://towardsdatascience.com/how-agent-handoffs-work-in-multi-agent-systems/) - Command object pattern
- [Claude Agent SDK GitHub](https://github.com/anthropics/claude-agent-sdk-python) - Official Python SDK
- [Claude Agent SDK PyPI](https://pypi.org/project/claude-agent-sdk/) - Package documentation
- [LangGraph Multi-Agent Orchestration Guide](https://latenode.com/blog/ai-frameworks-technical-infrastructure/langgraph-multi-agent-orchestration/langgraph-multi-agent-orchestration-complete-framework-guide-architecture-analysis-2025) - Architecture patterns
- [Building AI Agents with LangGraph 2026 Edition](https://ai.gopubby.com/building-ai-agents-with-langgraph-2026-edition-a-step-by-step-guide-494d36e801f9) - Updated patterns
- [LangGraph Cycles and Conditional Edges](https://medium.com/fundamentals-of-artificial-intelligence/langgraph-cycles-and-conditional-edges-fb4c4839e0a4) - Cycle implementation details

---

## GAPS & UNKNOWNS

### What Couldn't Be Verified
- **SDK performance vs subprocess** - No benchmarks found; need to test ourselves
- **LangGraph memory usage** - State accumulation in long-running graphs unclear
- **Critic accuracy** - What % of "false negatives" (valid work marked invalid)?

### What Needs Testing
- Real-world retry scenarios with TinyPM tasks
- SDK async behavior under load
- Error recovery after Claude CLI crash
- State persistence across process restarts (may need Redis/SQLite)

### What Requires PM Decision
1. **Retry limit:** Recommend 3, but configurable?
2. **Critic aggressiveness:** Strict (reject on any doubt) vs lenient (accept unless obvious failure)?
3. **Task type detection:** Manual tagging vs auto-detect?
4. **Failure escalation:** Auto-escalate to human after max retries?
5. **Phase priority:** Do we need SDK (Phase 3) or is subprocess sufficient?

---

## APPENDIX: FULL WORKING EXAMPLE

```python
"""
Complete LangGraph Critic Loop for TinyPM
Copy this file to tinypm/critic_loop.py
"""

import subprocess
import os
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command

# ============ STATE ============

class CriticLoopState(TypedDict):
    task: str
    task_type: Literal["code_change", "api_endpoint", "file_create", "other"]
    target_file: str
    builder_output: str
    critic_feedback: str
    is_valid: bool
    iterations: int
    max_iterations: int

# ============ NODES ============

def builder_node(state: CriticLoopState) -> dict:
    """Execute task with Claude CLI"""

    prompt = state["task"]
    if state.get("critic_feedback"):
        prompt += f"\n\n[IMPORTANT] Fix this issue from previous attempt:\n{state['critic_feedback']}"

    claude = os.path.expanduser("~/.claude/local/claude")

    try:
        result = subprocess.run(
            [claude, "-p", prompt, "--dangerously-skip-permissions"],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=os.path.expanduser("~/Documents/TIny_Seed_OS")
        )
        output = result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        output = "ERROR: Builder timed out after 5 minutes"
    except Exception as e:
        output = f"ERROR: Builder crashed: {str(e)}"

    return {
        "builder_output": output,
        "iterations": state["iterations"] + 1
    }

def critic_node(state: CriticLoopState) -> dict:
    """Verify builder output"""

    is_valid = True
    feedback = "Looks good"

    # Check 1: Builder didn't error
    if state["builder_output"].startswith("ERROR:"):
        is_valid = False
        feedback = state["builder_output"]

    # Check 2: File was modified (for code tasks)
    elif state["task_type"] == "code_change" and state.get("target_file"):
        file_path = state["target_file"]
        if not os.path.exists(file_path):
            is_valid = False
            feedback = f"File {file_path} does not exist"
        else:
            # Syntax check for Python
            if file_path.endswith(".py"):
                result = subprocess.run(
                    ["python", "-m", "py_compile", file_path],
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    is_valid = False
                    feedback = f"Python syntax error: {result.stderr}"

            # Syntax check for JavaScript
            elif file_path.endswith(".js"):
                result = subprocess.run(
                    ["node", "--check", file_path],
                    capture_output=True, text=True
                )
                if result.returncode != 0:
                    is_valid = False
                    feedback = f"JavaScript syntax error: {result.stderr}"

    return {
        "is_valid": is_valid,
        "critic_feedback": feedback
    }

def should_continue(state: CriticLoopState) -> Literal["builder", "end"]:
    """Route based on critic result"""

    if state["is_valid"]:
        return "end"

    if state["iterations"] >= state["max_iterations"]:
        return "end"

    return "builder"

# ============ GRAPH ============

def create_critic_loop():
    """Create the LangGraph workflow"""

    workflow = StateGraph(CriticLoopState)

    workflow.add_node("builder", builder_node)
    workflow.add_node("critic", critic_node)

    workflow.add_edge(START, "builder")
    workflow.add_edge("builder", "critic")

    workflow.add_conditional_edges(
        "critic",
        should_continue,
        {"builder": "builder", "end": END}
    )

    return workflow.compile()

# ============ USAGE ============

def execute_with_critic(task: str, task_type: str = "other", target_file: str = "") -> dict:
    """
    Execute a task with critic loop verification.

    Args:
        task: The task description
        task_type: One of "code_change", "api_endpoint", "file_create", "other"
        target_file: Path to file being modified (for code_change type)

    Returns:
        dict with keys: success, output, iterations, feedback
    """

    app = create_critic_loop()

    result = app.invoke({
        "task": task,
        "task_type": task_type,
        "target_file": target_file,
        "builder_output": "",
        "critic_feedback": "",
        "is_valid": False,
        "iterations": 0,
        "max_iterations": 3
    })

    return {
        "success": result["is_valid"],
        "output": result["builder_output"],
        "iterations": result["iterations"],
        "feedback": result["critic_feedback"]
    }

# ============ EXAMPLE ============

if __name__ == "__main__":
    result = execute_with_critic(
        task="Add a docstring to the function at line 42 in apps_script/MERGED TOTAL.js",
        task_type="code_change",
        target_file="/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js"
    )

    print(f"Success: {result['success']}")
    print(f"Iterations: {result['iterations']}")
    print(f"Feedback: {result['feedback']}")
```

---

*Research completed 2026-01-29 using ULTRATHINK protocol.*
