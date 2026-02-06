"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                        GOVERNOR INTEGRATION LAYER                             ║
║              Auto-wiring for pm_brain, pm_orchestrator, web_server            ║
║                                                                                ║
║  This module provides drop-in replacements for key functions that             ║
║  automatically route all operations through the Governor.                     ║
║                                                                                ║
║  Usage:                                                                        ║
║    from governor_integration import governed_llm_call, governed_save          ║
║    response = await governed_llm_call(system, messages, user_id="user123")    ║
╚══════════════════════════════════════════════════════════════════════════════╝

Created: 2026-02-06
Author: Claude (PM_Architect)
Version: 1.0.0
"""

import asyncio
import functools
import json
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union
import uuid

from governor import (
    Governor, GovernorContext, GovernorResult, GovernorDecision,
    SafeLevel, get_governor, init_governor, GovernanceError
)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

# Cached governor instance
_governor: Optional[Governor] = None


async def _get_initialized_governor() -> Governor:
    """Get or create initialized Governor instance"""
    global _governor
    if _governor is None:
        _governor = await init_governor()
    return _governor


# ═══════════════════════════════════════════════════════════════════════════════
# GOVERNED LLM CALLS
# ═══════════════════════════════════════════════════════════════════════════════

async def governed_llm_call(
    llm_func: Callable,
    system_prompt: str,
    messages: List[Dict],
    user_id: Optional[str] = None,
    operation_type: str = "chat",
    source: str = "api",
    metadata: Dict = None,
    **llm_kwargs
) -> Optional[str]:
    """
    Execute an LLM call through the Governor.

    This wraps any LLM call (Anthropic, OpenAI, etc.) with full governance.

    Args:
        llm_func: Async function that takes (system, messages, **kwargs) and returns response text
        system_prompt: System prompt to pass to LLM
        messages: Message history
        user_id: User ID for audit trail
        operation_type: Type of operation (chat, suggest, analyze, etc.)
        source: Source of request (web_api, orchestrator, brain, etc.)
        metadata: Additional metadata
        **llm_kwargs: Additional arguments passed to LLM function

    Returns:
        Response text if approved, None if blocked

    Raises:
        GovernanceError: If operation is blocked or escalated

    Example:
        async def my_claude_call(system, messages, **kwargs):
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                system=system,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', 1000)
            )
            return response.content[0].text

        response = await governed_llm_call(
            my_claude_call,
            system_prompt="You are a helpful assistant.",
            messages=[{"role": "user", "content": "Hello!"}],
            user_id="user123"
        )
    """
    governor = await _get_initialized_governor()

    ctx = GovernorContext(
        request_id=str(uuid.uuid4()),
        user_id=user_id,
        operation_type=operation_type,
        source=source,
        timestamp=datetime.now(),
        data={
            "messages_count": len(messages),
            "system_prompt_length": len(system_prompt),
            "llm_kwargs": {k: str(v)[:100] for k, v in llm_kwargs.items()}
        },
        metadata=metadata or {}
    )

    result, response = await governor.govern_llm_operation(
        ctx, llm_func, system_prompt, messages, **llm_kwargs
    )

    if result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
        return response
    elif result.decision == GovernorDecision.DEFER:
        logging.info(f"LLM call deferred: {result.reason}")
        return None
    elif result.decision == GovernorDecision.ESCALATE:
        raise GovernanceError(result)
    else:
        raise GovernanceError(result)


async def governed_anthropic_call(
    client,
    model: str,
    system: str,
    messages: List[Dict],
    user_id: Optional[str] = None,
    operation_type: str = "chat",
    source: str = "api",
    metadata: Dict = None,
    **kwargs
) -> Optional[str]:
    """
    Convenience wrapper specifically for Anthropic API calls.

    Args:
        client: Anthropic client instance
        model: Model ID (e.g., "claude-sonnet-4-20250514")
        system: System prompt
        messages: Message history
        user_id: User ID
        operation_type: Operation type
        source: Request source
        metadata: Additional metadata
        **kwargs: Additional Anthropic API parameters

    Returns:
        Response text if approved

    Example:
        from anthropic import Anthropic
        client = Anthropic()

        response = await governed_anthropic_call(
            client,
            model="claude-sonnet-4-20250514",
            system="You are a helpful assistant.",
            messages=[{"role": "user", "content": "Hello!"}],
            user_id="user123",
            max_tokens=1000
        )
    """
    async def llm_func(sys, msgs, **kw):
        # Anthropic client is sync, run in thread
        response = await asyncio.to_thread(
            lambda: client.messages.create(
                model=model,
                system=sys,
                messages=msgs,
                **kw
            )
        )
        return response.content[0].text

    return await governed_llm_call(
        llm_func,
        system,
        messages,
        user_id=user_id,
        operation_type=operation_type,
        source=source,
        metadata=metadata,
        **kwargs
    )


# ═══════════════════════════════════════════════════════════════════════════════
# GOVERNED ACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def governed_action(
    action_func: Callable,
    action_data: Dict,
    user_id: Optional[str] = None,
    operation_type: str = "action",
    source: str = "api",
    metadata: Dict = None
) -> Optional[Any]:
    """
    Execute an action through the Governor.

    Actions include: task updates, skill executions, financial operations, etc.

    Args:
        action_func: Async function that takes action_data and returns result
        action_data: Data for the action
        user_id: User ID for audit trail
        operation_type: Type of action
        source: Source of request
        metadata: Additional metadata

    Returns:
        Action result if approved, None if blocked

    Raises:
        GovernanceError: If action is blocked or escalated

    Example:
        async def update_task(data):
            return await task_service.update(data['task_id'], data['updates'])

        result = await governed_action(
            update_task,
            {"task_id": "123", "updates": {"status": "completed"}},
            user_id="user123",
            operation_type="task_update"
        )
    """
    governor = await _get_initialized_governor()

    ctx = GovernorContext(
        request_id=str(uuid.uuid4()),
        user_id=user_id,
        operation_type=operation_type,
        source=source,
        timestamp=datetime.now(),
        data=action_data,
        metadata=metadata or {}
    )

    result, execution_result = await governor.govern_action(
        ctx, action_data, action_func
    )

    if result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
        return execution_result
    elif result.decision == GovernorDecision.DEFER:
        logging.info(f"Action deferred: {result.reason}")
        return None
    elif result.decision == GovernorDecision.ESCALATE:
        raise GovernanceError(result)
    else:
        raise GovernanceError(result)


# ═══════════════════════════════════════════════════════════════════════════════
# GOVERNED PERSISTENCE
# ═══════════════════════════════════════════════════════════════════════════════

async def governed_save(
    file_path: Union[str, Path],
    new_data: Dict,
    old_data: Optional[Dict] = None,
    user_id: Optional[str] = None,
    operation_type: str = "persist",
    source: str = "api",
    metadata: Dict = None
) -> bool:
    """
    Save data to a file through the Governor.

    Args:
        file_path: Path to the file
        new_data: Data to save
        old_data: Previous data (for state transition validation)
        user_id: User ID for audit trail
        operation_type: Type of persistence operation
        source: Source of request
        metadata: Additional metadata

    Returns:
        True if save succeeded, False otherwise

    Raises:
        GovernanceError: If persistence is blocked

    Example:
        success = await governed_save(
            "board.json",
            {"tasks": [...]},
            old_data=previous_board,
            user_id="user123",
            operation_type="board_update"
        )
    """
    governor = await _get_initialized_governor()
    file_path = Path(file_path)

    # Load old data if not provided
    if old_data is None and file_path.exists():
        try:
            old_data = json.loads(file_path.read_text())
        except Exception:
            old_data = None

    ctx = GovernorContext(
        request_id=str(uuid.uuid4()),
        user_id=user_id,
        operation_type=operation_type,
        source=source,
        timestamp=datetime.now(),
        data={
            "file_path": str(file_path),
            "data_size": len(json.dumps(new_data, default=str))
        },
        metadata=metadata or {}
    )

    async def persist_func(path, data):
        path = Path(path)
        path.write_text(json.dumps(data, indent=2, default=str))

    result, success = await governor.govern_persist(
        ctx, str(file_path), new_data, old_data, persist_func
    )

    if result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
        return success
    elif result.decision == GovernorDecision.DEFER:
        logging.info(f"Persistence deferred: {result.reason}")
        return False
    else:
        raise GovernanceError(result)


async def governed_save_json(
    file_path: Union[str, Path],
    new_data: Dict,
    user_id: Optional[str] = None,
    source: str = "api"
) -> bool:
    """
    Simplified JSON save with governance.

    Example:
        await governed_save_json("config.json", {"setting": "value"}, user_id="admin")
    """
    return await governed_save(
        file_path,
        new_data,
        user_id=user_id,
        source=source
    )


# ═══════════════════════════════════════════════════════════════════════════════
# DROP-IN REPLACEMENTS FOR PM_BRAIN.PY / PM_ORCHESTRATOR.PY
# ═══════════════════════════════════════════════════════════════════════════════

def wrap_pm_brain_suggestion(original_func):
    """
    Decorator to wrap pm_brain's suggestion generation with governance.

    Usage in pm_brain.py:
        @wrap_pm_brain_suggestion
        async def generate_suggestion(self, context):
            ...
    """
    @functools.wraps(original_func)
    async def wrapper(self, *args, **kwargs):
        governor = await _get_initialized_governor()

        # Create context
        ctx = GovernorContext(
            request_id=str(uuid.uuid4()),
            user_id=kwargs.get('user_id'),
            operation_type="brain_suggestion",
            source="pm_brain",
            timestamp=datetime.now(),
            data={"args": str(args)[:200], "kwargs_keys": list(kwargs.keys())},
            metadata={}
        )

        # Check intake gate
        intake_result = await governor._intake_gate(ctx)
        if intake_result.decision in [GovernorDecision.BLOCK, GovernorDecision.ESCALATE]:
            logging.warning(f"PM Brain suggestion blocked: {intake_result.reason}")
            return None

        # Execute original function
        result = await original_func(self, *args, **kwargs)

        # Validate output
        if result:
            post_result, validated = await governor._post_response_validator(
                ctx, str(result) if not isinstance(result, str) else result
            )
            if post_result.decision == GovernorDecision.BLOCK:
                logging.warning(f"PM Brain output blocked: {post_result.reason}")
                return None

        return result

    return wrapper


def wrap_pm_orchestrator_action(original_func):
    """
    Decorator to wrap pm_orchestrator's action execution with governance.

    Usage in pm_orchestrator.py:
        @wrap_pm_orchestrator_action
        async def execute_action(self, action_data):
            ...
    """
    @functools.wraps(original_func)
    async def wrapper(self, action_data, *args, **kwargs):
        try:
            result = await governed_action(
                lambda data: original_func(self, data, *args, **kwargs),
                action_data,
                user_id=action_data.get('user_id'),
                operation_type=action_data.get('type', 'orchestrator_action'),
                source="pm_orchestrator"
            )
            return result
        except GovernanceError as e:
            logging.warning(f"Orchestrator action blocked: {e.result.reason}")
            return None

    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════
# AUTO-RESPONDER WRAPPER (for web_server.py)
# ═══════════════════════════════════════════════════════════════════════════════

async def governed_auto_respond(
    client,
    system_prompt: str,
    messages: List[Dict],
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 1000,
    user_id: Optional[str] = None
) -> Optional[str]:
    """
    Drop-in replacement for the auto-responder in web_server.py.

    Instead of:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            system=system_prompt,
            messages=messages,
            max_tokens=1000
        )
        text = response.content[0].text

    Use:
        text = await governed_auto_respond(
            client,
            system_prompt,
            messages,
            user_id=user_id
        )
    """
    return await governed_anthropic_call(
        client,
        model=model,
        system=system_prompt,
        messages=messages,
        user_id=user_id,
        operation_type="auto_respond",
        source="web_server",
        max_tokens=max_tokens
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MONKEY-PATCHING HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def patch_anthropic_client(client):
    """
    Monkey-patch an Anthropic client to route all calls through the Governor.

    WARNING: This modifies the client in-place. Use with caution.

    Usage:
        from anthropic import Anthropic
        client = Anthropic()
        patch_anthropic_client(client)

        # Now all calls go through Governor
        response = client.messages.create(...)  # Governed!
    """
    original_create = client.messages.create

    def governed_create(*args, **kwargs):
        # Extract parameters
        model = kwargs.get('model', args[0] if args else 'claude-sonnet-4-20250514')
        system = kwargs.get('system', '')
        messages = kwargs.get('messages', [])
        user_id = kwargs.pop('user_id', None)  # Custom param

        # Run governed call
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        result = loop.run_until_complete(
            governed_anthropic_call(
                client,
                model=model,
                system=system,
                messages=messages,
                user_id=user_id,
                **{k: v for k, v in kwargs.items() if k not in ['model', 'system', 'messages']}
            )
        )

        # Return mock response object
        class MockContent:
            def __init__(self, text):
                self.text = text

        class MockResponse:
            def __init__(self, text):
                self.content = [MockContent(text)]

        return MockResponse(result)

    client.messages.create = governed_create
    logging.info("Anthropic client patched with Governor")


# ═══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

async def initialize_governor_integration():
    """
    Initialize the Governor integration.
    Call this at application startup.

    Example:
        # In app.py or web_server.py:
        import asyncio
        from governor_integration import initialize_governor_integration

        async def startup():
            await initialize_governor_integration()
            print("Governor integration initialized")

        asyncio.run(startup())
    """
    global _governor
    _governor = await init_governor()
    logging.info("Governor integration initialized")
    return _governor


def get_current_safe_level() -> str:
    """Get current safe level (sync helper)"""
    governor = get_governor()
    return governor.safe_level.value if governor else "UNKNOWN"


def is_operations_allowed() -> bool:
    """Check if operations are currently allowed"""
    governor = get_governor()
    if not governor:
        return True  # Default to allow if governor not initialized
    return governor.safe_level not in [SafeLevel.LOCKDOWN]


def is_writes_allowed() -> bool:
    """Check if write operations are currently allowed"""
    governor = get_governor()
    if not governor:
        return True
    return governor.safe_level in [SafeLevel.GREEN, SafeLevel.YELLOW]


# ═══════════════════════════════════════════════════════════════════════════════
# QUICK CHECK FUNCTIONS (for inline governance checks)
# ═══════════════════════════════════════════════════════════════════════════════

async def can_proceed(
    operation_type: str,
    user_id: Optional[str] = None,
    data: Dict = None
) -> tuple[bool, Optional[str]]:
    """
    Quick check if an operation can proceed.

    Returns (can_proceed: bool, reason: Optional[str])

    Example:
        can, reason = await can_proceed("financial_transaction", user_id="user123")
        if not can:
            return {"error": reason}
    """
    governor = await _get_initialized_governor()

    ctx = GovernorContext(
        request_id=str(uuid.uuid4()),
        user_id=user_id,
        operation_type=operation_type,
        source="quick_check",
        timestamp=datetime.now(),
        data=data or {},
        metadata={}
    )

    result = await governor._intake_gate(ctx)

    if result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
        return True, None
    else:
        return False, result.reason


# ═══════════════════════════════════════════════════════════════════════════════
# TESTING
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    async def test_integration():
        print("Testing Governor Integration...")

        # Initialize
        await initialize_governor_integration()
        print(f"Safe level: {get_current_safe_level()}")
        print(f"Operations allowed: {is_operations_allowed()}")
        print(f"Writes allowed: {is_writes_allowed()}")

        # Test quick check
        can, reason = await can_proceed("test_operation", user_id="test_user")
        print(f"Can proceed: {can}, Reason: {reason}")

        # Test governed save
        success = await governed_save_json(
            "/tmp/test_governed.json",
            {"test": "data", "timestamp": datetime.now().isoformat()},
            user_id="test_user"
        )
        print(f"Save success: {success}")

        print("\nIntegration test complete!")

    asyncio.run(test_integration())
