"""
Logging Utilities for TinyPM
============================
Centralized logging configuration and helpers.

Usage:
    from utils import log, get_logger

    # Simple logging (writes to default tinypm.log)
    log("Task completed successfully")
    log("Something went wrong", level="ERROR")

    # Get a named logger for a specific module
    logger = get_logger("pm_orchestrator")
    logger.info("Orchestrator started")
    logger.error("Failed to process message")

Features:
- Console + file logging
- Colored console output (when available)
- Automatic log rotation
- Configurable log levels
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Union
from logging.handlers import RotatingFileHandler

# Default log directory (same as tinypm root)
DEFAULT_LOG_DIR = Path(__file__).parent.parent
DEFAULT_LOG_FILE = DEFAULT_LOG_DIR / ".tinypm.log"
DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10MB
DEFAULT_BACKUP_COUNT = 3

# Global logger registry
_loggers: dict = {}

# ANSI colors for console output
COLORS = {
    "DEBUG": "\033[36m",     # Cyan
    "INFO": "\033[32m",      # Green
    "WARNING": "\033[33m",   # Yellow
    "ERROR": "\033[31m",     # Red
    "CRITICAL": "\033[35m",  # Magenta
    "RESET": "\033[0m"
}


class ColoredFormatter(logging.Formatter):
    """Formatter that adds colors to console output."""

    def __init__(self, fmt: str, datefmt: Optional[str] = None, use_colors: bool = True):
        super().__init__(fmt, datefmt=datefmt)
        self.use_colors = use_colors and sys.stdout.isatty()

    def format(self, record: logging.LogRecord) -> str:
        if self.use_colors:
            color = COLORS.get(record.levelname, "")
            reset = COLORS["RESET"]
            record.levelname = f"{color}{record.levelname}{reset}"
        return super().format(record)


def get_logger(
    name: str,
    log_file: Optional[Union[str, Path]] = None,
    level: Union[str, int] = logging.INFO,
    console_level: Union[str, int] = logging.INFO,
    file_level: Union[str, int] = logging.DEBUG,
    max_bytes: int = DEFAULT_MAX_BYTES,
    backup_count: int = DEFAULT_BACKUP_COUNT
) -> logging.Logger:
    """
    Get or create a named logger with file and console handlers.

    Args:
        name: Logger name (usually module name like "pm_orchestrator")
        log_file: Path to log file (default: .tinypm.log in tinypm dir)
        level: Base log level for the logger
        console_level: Minimum level for console output
        file_level: Minimum level for file output
        max_bytes: Max log file size before rotation
        backup_count: Number of backup files to keep

    Returns:
        Configured logger instance

    Examples:
        >>> logger = get_logger("pm_brain")
        >>> logger.info("Brain started")
        >>> logger.error("Something failed", exc_info=True)
    """
    # Return cached logger if already configured
    if name in _loggers:
        return _loggers[name]

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(level if isinstance(level, int) else getattr(logging, level.upper()))
    logger.handlers.clear()  # Remove any existing handlers

    # File handler with rotation
    log_path = Path(log_file) if log_file else DEFAULT_LOG_FILE
    log_path.parent.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(file_level if isinstance(file_level, int) else getattr(logging, file_level.upper()))
    file_formatter = logging.Formatter(
        "[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    # Console handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(console_level if isinstance(console_level, int) else getattr(logging, console_level.upper()))
    console_formatter = ColoredFormatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # Cache the logger
    _loggers[name] = logger

    return logger


def log(
    msg: str,
    level: str = "INFO",
    logger_name: str = "tinypm"
) -> None:
    """
    Simple logging function for quick use.

    This is the easiest way to log - just call log("message").

    Args:
        msg: Message to log
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        logger_name: Name of logger to use (default: "tinypm")

    Examples:
        >>> log("Starting process")
        >>> log("Warning: rate limit approaching", level="WARNING")
        >>> log("Critical failure!", level="CRITICAL")
    """
    logger = get_logger(logger_name)
    log_method = getattr(logger, level.lower(), logger.info)
    log_method(msg)


def log_to_file(
    msg: str,
    file_path: Union[str, Path],
    level: str = "INFO",
    include_timestamp: bool = True
) -> None:
    """
    Log a message to a specific file (append mode).

    Useful for module-specific logs without the full logging infrastructure.

    Args:
        msg: Message to log
        file_path: Path to the log file
        level: Log level string to include
        include_timestamp: Whether to include timestamp

    Examples:
        >>> log_to_file("Task started", Path(".builder.log"))
    """
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if include_timestamp:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] [{level}] {msg}\n"
    else:
        line = f"[{level}] {msg}\n"

    with open(path, "a", encoding="utf-8") as f:
        f.write(line)


# Convenience: pre-configured loggers for common modules
def get_pm_logger() -> logging.Logger:
    """Get the PM-specific logger."""
    return get_logger("pm", log_file=DEFAULT_LOG_DIR / ".pm.log")


def get_builder_logger() -> logging.Logger:
    """Get the Builder-specific logger."""
    return get_logger("builder", log_file=DEFAULT_LOG_DIR / ".builder.log")


def get_orchestrator_logger() -> logging.Logger:
    """Get the Orchestrator-specific logger."""
    return get_logger("orchestrator", log_file=DEFAULT_LOG_DIR / ".pm_orchestrator.log")
