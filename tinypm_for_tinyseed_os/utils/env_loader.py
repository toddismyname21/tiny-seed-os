"""
Environment Variable Loader for TinyPM
======================================
Centralized .env file loading and environment variable access.

Usage:
    from utils import load_env, get_env

    # Load from .env file (auto-detects location)
    load_env()

    # Get environment variables with defaults
    api_key = get_env("ANTHROPIC_API_KEY")
    debug_mode = get_env("DEBUG", "false")

Features:
- Automatic .env file detection
- Support for multiple .env files (.env, .env.local, .env.production)
- Type conversion helpers (get_env_bool, get_env_int)
- Doesn't override existing environment variables by default
"""

import os
from pathlib import Path
from typing import Any, Optional, Union

# Default .env locations to check (in order of priority)
TINYPM_DIR = Path(__file__).parent.parent
PROJECT_ROOT = TINYPM_DIR.parent

DEFAULT_ENV_PATHS = [
    TINYPM_DIR / ".env.local",      # Local overrides (gitignored)
    TINYPM_DIR / ".env",            # Main env file
    PROJECT_ROOT / ".env.local",    # Project root local
    PROJECT_ROOT / ".env",          # Project root
]

# Track whether we've loaded env already
_env_loaded = False


def load_env(
    env_file: Optional[Union[str, Path]] = None,
    override: bool = False
) -> dict:
    """
    Load environment variables from a .env file.

    Args:
        env_file: Specific .env file to load. If None, searches default locations.
        override: If True, override existing environment variables.
                  If False (default), only set variables that aren't already set.

    Returns:
        Dictionary of variables that were loaded

    Examples:
        >>> load_env()  # Auto-detect .env file
        {'ANTHROPIC_API_KEY': 'sk-...', 'DEBUG': 'true'}

        >>> load_env(Path("/custom/.env"), override=True)
        {'CUSTOM_VAR': 'value'}
    """
    global _env_loaded

    loaded_vars = {}

    # Determine which file to load
    if env_file:
        paths_to_try = [Path(env_file)]
    else:
        paths_to_try = DEFAULT_ENV_PATHS

    # Try each path
    for path in paths_to_try:
        if path.exists():
            try:
                content = path.read_text(encoding='utf-8')
                for line in content.splitlines():
                    line = line.strip()

                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue

                    # Parse key=value
                    if '=' not in line:
                        continue

                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()

                    # Remove quotes if present
                    if (value.startswith('"') and value.endswith('"')) or \
                       (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]

                    # Set in environment
                    if override or key not in os.environ:
                        os.environ[key] = value
                        loaded_vars[key] = value

                # Only load the first file found (unless env_file was specified)
                if not env_file:
                    break

            except (IOError, OSError):
                continue

    _env_loaded = True
    return loaded_vars


def get_env(
    key: str,
    default: Optional[str] = None,
    required: bool = False
) -> Optional[str]:
    """
    Get an environment variable value.

    Args:
        key: Environment variable name
        default: Default value if not found (default: None)
        required: If True, raise ValueError if not found

    Returns:
        Environment variable value, or default

    Raises:
        ValueError: If required=True and variable is not set

    Examples:
        >>> api_key = get_env("ANTHROPIC_API_KEY")
        >>> debug = get_env("DEBUG", "false")
        >>> secret = get_env("SECRET_KEY", required=True)  # Raises if not set
    """
    # Auto-load env if not already done
    global _env_loaded
    if not _env_loaded:
        load_env()

    value = os.environ.get(key)

    if value is None:
        if required:
            raise ValueError(f"Required environment variable '{key}' is not set")
        return default

    return value


def get_env_bool(
    key: str,
    default: bool = False
) -> bool:
    """
    Get an environment variable as a boolean.

    True values: "true", "1", "yes", "on" (case-insensitive)
    False values: everything else

    Args:
        key: Environment variable name
        default: Default value if not found

    Returns:
        Boolean value

    Examples:
        >>> debug = get_env_bool("DEBUG")
        False
        >>> verbose = get_env_bool("VERBOSE", default=True)
        True
    """
    value = get_env(key)
    if value is None:
        return default
    return value.lower() in ('true', '1', 'yes', 'on')


def get_env_int(
    key: str,
    default: int = 0
) -> int:
    """
    Get an environment variable as an integer.

    Args:
        key: Environment variable name
        default: Default value if not found or invalid

    Returns:
        Integer value

    Examples:
        >>> port = get_env_int("PORT", 8080)
        8080
        >>> timeout = get_env_int("TIMEOUT_SECONDS", 30)
        30
    """
    value = get_env(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def get_env_float(
    key: str,
    default: float = 0.0
) -> float:
    """
    Get an environment variable as a float.

    Args:
        key: Environment variable name
        default: Default value if not found or invalid

    Returns:
        Float value
    """
    value = get_env(key)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def get_env_list(
    key: str,
    default: Optional[list] = None,
    separator: str = ","
) -> list:
    """
    Get an environment variable as a list (split by separator).

    Args:
        key: Environment variable name
        default: Default value if not found
        separator: Separator to split on (default: comma)

    Returns:
        List of strings

    Examples:
        >>> # ALLOWED_HOSTS=localhost,127.0.0.1,example.com
        >>> hosts = get_env_list("ALLOWED_HOSTS")
        ['localhost', '127.0.0.1', 'example.com']
    """
    value = get_env(key)
    if value is None:
        return default or []
    return [item.strip() for item in value.split(separator) if item.strip()]


# Convenience: common environment variables
def get_anthropic_api_key() -> Optional[str]:
    """Get the Anthropic API key."""
    return get_env("ANTHROPIC_API_KEY")


def get_supabase_url() -> Optional[str]:
    """Get the Supabase URL."""
    return get_env("SUPABASE_URL")


def get_supabase_key() -> Optional[str]:
    """Get the Supabase key."""
    return get_env("SUPABASE_KEY") or get_env("SUPABASE_SERVICE_KEY")


def is_debug_mode() -> bool:
    """Check if debug mode is enabled."""
    return get_env_bool("DEBUG") or get_env_bool("TINYPM_DEBUG")
