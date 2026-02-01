"""
TinyPM Utilities
================
Centralized utility functions for the TinyPM codebase.

This package consolidates common patterns that were duplicated across
multiple files, providing a single source of truth for:
- JSON file operations (read/write with error handling)
- Logging (centralized, colored, with rotation)
- Environment variable loading (.env files)
- Anthropic client initialization (singleton pattern)

Usage:
    # Import specific functions
    from utils import safe_read_json, safe_write_json
    from utils import log, get_logger
    from utils import load_env, get_env
    from utils import get_anthropic_client

    # Or import everything
    from utils import *

Migration Guide:
    OLD (duplicate patterns):
        import json
        if path.exists():
            try:
                data = json.loads(path.read_text())
            except:
                data = {}

    NEW (centralized):
        from utils import safe_read_json
        data = safe_read_json(path, default={})

Author: TinyPM Team
Created: January 2026
"""

# JSON utilities
from .json_utils import (
    safe_read_json,
    safe_write_json,
    read_json,  # alias
    write_json,  # alias
    json_merge,
    DateTimeEncoder,
)

# Logging utilities
from .logging_utils import (
    log,
    get_logger,
    log_to_file,
    get_pm_logger,
    get_builder_logger,
    get_orchestrator_logger,
)

# Environment variable utilities
from .env_loader import (
    load_env,
    get_env,
    get_env_bool,
    get_env_int,
    get_env_float,
    get_env_list,
    get_anthropic_api_key,
    get_supabase_url,
    get_supabase_key,
    is_debug_mode,
)

# Anthropic client utilities
from .anthropic_client import (
    get_anthropic_client,
    get_async_anthropic_client,
    reset_client,
    create_message,
    CLAUDE_OPUS,
    CLAUDE_SONNET,
    CLAUDE_HAIKU,
)

# Define what's exported with "from utils import *"
__all__ = [
    # JSON
    "safe_read_json",
    "safe_write_json",
    "read_json",
    "write_json",
    "json_merge",
    "DateTimeEncoder",
    # Logging
    "log",
    "get_logger",
    "log_to_file",
    "get_pm_logger",
    "get_builder_logger",
    "get_orchestrator_logger",
    # Environment
    "load_env",
    "get_env",
    "get_env_bool",
    "get_env_int",
    "get_env_float",
    "get_env_list",
    "get_anthropic_api_key",
    "get_supabase_url",
    "get_supabase_key",
    "is_debug_mode",
    # Anthropic
    "get_anthropic_client",
    "get_async_anthropic_client",
    "reset_client",
    "create_message",
    "CLAUDE_OPUS",
    "CLAUDE_SONNET",
    "CLAUDE_HAIKU",
]

__version__ = "1.0.0"
