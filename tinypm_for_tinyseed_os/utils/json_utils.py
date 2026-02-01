"""
JSON Utilities for TinyPM
=========================
Centralized JSON read/write with error handling and atomic writes.

Usage:
    from utils import safe_read_json, safe_write_json

    # Read with default fallback
    data = safe_read_json(Path("config.json"), default={})

    # Write with atomic operation (temp file + rename)
    safe_write_json(Path("config.json"), data)

Features:
- Atomic writes (prevents corruption on crash)
- Default fallback on read errors
- Automatic datetime serialization
- Type-safe Path handling
"""

import json
import tempfile
import shutil
from datetime import datetime, date
from pathlib import Path
from typing import Any, Optional, Union


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that handles datetime objects."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


def safe_read_json(
    path: Union[str, Path],
    default: Any = None
) -> Any:
    """
    Safely read a JSON file with fallback to default value.

    Args:
        path: Path to the JSON file (str or Path object)
        default: Value to return if file doesn't exist or is invalid
                 (default: None)

    Returns:
        Parsed JSON data, or default value on error

    Examples:
        >>> data = safe_read_json(Path("config.json"), default={})
        >>> tasks = safe_read_json("tasks.json", default=[])
    """
    path = Path(path) if isinstance(path, str) else path

    if not path.exists():
        return default

    try:
        content = path.read_text(encoding='utf-8')
        if not content.strip():
            return default
        return json.loads(content)
    except (json.JSONDecodeError, IOError, OSError) as e:
        # Could add logging here if desired
        return default


def safe_write_json(
    path: Union[str, Path],
    data: Any,
    indent: int = 2,
    atomic: bool = True,
    ensure_parents: bool = True
) -> bool:
    """
    Safely write data to a JSON file with atomic operations.

    Uses write-to-temp-then-rename pattern to prevent corruption
    if the process crashes mid-write.

    Args:
        path: Path to the JSON file (str or Path object)
        data: Data to serialize to JSON
        indent: JSON indentation level (default: 2)
        atomic: Use atomic write (write to temp, then rename) - default: True
        ensure_parents: Create parent directories if they don't exist

    Returns:
        True on success, False on failure

    Examples:
        >>> safe_write_json(Path("config.json"), {"key": "value"})
        True
        >>> safe_write_json("state.json", {"updated": datetime.now()})
        True
    """
    path = Path(path) if isinstance(path, str) else path

    try:
        if ensure_parents:
            path.parent.mkdir(parents=True, exist_ok=True)

        content = json.dumps(data, indent=indent, cls=DateTimeEncoder, default=str)

        if atomic:
            # Write to temp file in same directory (for same filesystem)
            # Then atomic rename
            temp_fd, temp_path = tempfile.mkstemp(
                dir=path.parent,
                prefix=f".{path.name}.",
                suffix=".tmp"
            )
            try:
                with open(temp_fd, 'w', encoding='utf-8') as f:
                    f.write(content)
                shutil.move(temp_path, path)
            except Exception:
                # Clean up temp file on error
                try:
                    Path(temp_path).unlink()
                except Exception:
                    pass
                raise
        else:
            path.write_text(content, encoding='utf-8')

        return True

    except (IOError, OSError, TypeError) as e:
        # Could add logging here if desired
        return False


def json_merge(base: dict, updates: dict) -> dict:
    """
    Deep merge two dictionaries.

    Args:
        base: Base dictionary
        updates: Dictionary with updates to merge

    Returns:
        Merged dictionary (new copy, doesn't modify inputs)
    """
    result = base.copy()
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = json_merge(result[key], value)
        else:
            result[key] = value
    return result


# Convenience aliases
read_json = safe_read_json
write_json = safe_write_json
