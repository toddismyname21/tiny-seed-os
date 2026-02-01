#!/usr/bin/env python3
"""
===============================================================================
A2A AUTHENTICATION & RATE LIMITING MODULE
===============================================================================

Security layer for A2A Protocol endpoints.

Features:
- API Key validation (X-API-Key header or api_key query parameter)
- Rate limiting per API key (configurable, default 100 req/min)
- Authentication failure logging
- Public endpoint exemptions (e.g., /.well-known/agent.json)

Configuration via .env:
- A2A_API_KEYS: Comma-separated list of valid API keys
- A2A_RATE_LIMIT: Requests per minute per key (default: 100)

Created: 2026-01-30
"""

import os
import time
import logging
from collections import defaultdict
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Optional, Tuple, Callable
from urllib.parse import parse_qs, urlparse

# Configuration
APP_DIR = Path(__file__).parent
A2A_AUTH_LOG_FILE = APP_DIR / ".a2a_auth.log"

# Load .env if present
_env_file = APP_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())

# Parse API keys from environment
def _load_api_keys() -> set:
    """Load valid API keys from A2A_API_KEYS environment variable."""
    keys_str = os.environ.get("A2A_API_KEYS", "")
    if not keys_str:
        return set()
    return {k.strip() for k in keys_str.split(",") if k.strip()}

# Rate limiting configuration
A2A_RATE_LIMIT = int(os.environ.get("A2A_RATE_LIMIT", "100"))  # requests per minute
A2A_RATE_WINDOW = 60  # seconds

# In-memory rate limit tracking
# Structure: {api_key: [(timestamp1, timestamp2, ...)]}
_rate_limit_buckets = defaultdict(list)

# Public endpoints that don't require authentication
PUBLIC_ENDPOINTS = {
    "/.well-known/agent.json",
    "/a2a/health",  # Health check can be public for monitoring
}


# ===============================================================================
# LOGGING
# ===============================================================================

def _setup_logger():
    """Set up authentication logger."""
    logger = logging.getLogger("a2a_auth")
    logger.setLevel(logging.INFO)

    # File handler
    try:
        fh = logging.FileHandler(A2A_AUTH_LOG_FILE)
        fh.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "[%(asctime)s] [A2A-AUTH] [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        fh.setFormatter(formatter)
        logger.addHandler(fh)
    except Exception:
        pass  # Graceful degradation if can't write logs

    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.WARNING)
    ch.setFormatter(formatter if 'formatter' in dir() else logging.Formatter("%(message)s"))
    logger.addHandler(ch)

    return logger

_logger = _setup_logger()


def log_auth_event(level: str, message: str, **kwargs):
    """Log an authentication event."""
    extra_info = " ".join(f"{k}={v}" for k, v in kwargs.items())
    full_message = f"{message} {extra_info}".strip()

    if level == "INFO":
        _logger.info(full_message)
    elif level == "WARN":
        _logger.warning(full_message)
    elif level == "ERROR":
        _logger.error(full_message)
    else:
        _logger.debug(full_message)

    # Also print to console for visibility
    print(f"[A2A-AUTH] [{level}] {full_message}")


# ===============================================================================
# RATE LIMITING
# ===============================================================================

def _clean_old_requests(api_key: str):
    """Remove requests older than the rate window."""
    current_time = time.time()
    cutoff = current_time - A2A_RATE_WINDOW
    _rate_limit_buckets[api_key] = [
        ts for ts in _rate_limit_buckets[api_key] if ts > cutoff
    ]


def check_rate_limit(api_key: str) -> Tuple[bool, int]:
    """
    Check if the API key has exceeded its rate limit.

    Returns:
        (is_allowed, remaining_requests)
    """
    _clean_old_requests(api_key)
    current_count = len(_rate_limit_buckets[api_key])

    if current_count >= A2A_RATE_LIMIT:
        log_auth_event(
            "WARN",
            "Rate limit exceeded",
            api_key=api_key[:8] + "...",
            requests=current_count,
            limit=A2A_RATE_LIMIT
        )
        return False, 0

    # Record this request
    _rate_limit_buckets[api_key].append(time.time())
    remaining = A2A_RATE_LIMIT - current_count - 1

    return True, remaining


def get_rate_limit_info(api_key: str) -> dict:
    """Get current rate limit status for an API key."""
    _clean_old_requests(api_key)
    current_count = len(_rate_limit_buckets[api_key])
    return {
        "limit": A2A_RATE_LIMIT,
        "remaining": max(0, A2A_RATE_LIMIT - current_count),
        "reset_seconds": A2A_RATE_WINDOW,
        "window_seconds": A2A_RATE_WINDOW
    }


# ===============================================================================
# API KEY VALIDATION
# ===============================================================================

def validate_api_key(api_key: Optional[str]) -> Tuple[bool, str]:
    """
    Validate an API key.

    Returns:
        (is_valid, error_message)
    """
    valid_keys = _load_api_keys()

    # If no keys configured, authentication is disabled (development mode)
    if not valid_keys:
        log_auth_event(
            "WARN",
            "A2A authentication disabled - no A2A_API_KEYS configured"
        )
        return True, ""

    if not api_key:
        return False, "Missing API key. Provide X-API-Key header or api_key query parameter."

    if api_key not in valid_keys:
        log_auth_event(
            "ERROR",
            "Invalid API key rejected",
            key_prefix=api_key[:8] + "..." if len(api_key) > 8 else api_key
        )
        return False, "Invalid API key."

    return True, ""


def extract_api_key_from_request(headers: dict, query_string: str = "") -> Optional[str]:
    """
    Extract API key from request headers or query parameters.

    Checks in order:
    1. X-API-Key header
    2. Authorization: Bearer <key> header
    3. api_key query parameter
    """
    # Check X-API-Key header (case-insensitive)
    for key, value in headers.items():
        if key.lower() == "x-api-key":
            return value.strip()

    # Check Authorization header
    for key, value in headers.items():
        if key.lower() == "authorization":
            if value.lower().startswith("bearer "):
                return value[7:].strip()

    # Check query parameter
    if query_string:
        params = parse_qs(query_string)
        if "api_key" in params:
            return params["api_key"][0]

    return None


# ===============================================================================
# MAIN AUTHENTICATION FUNCTION
# ===============================================================================

def authenticate_a2a_request(
    path: str,
    headers: dict,
    query_string: str = "",
    client_ip: str = "unknown"
) -> Tuple[bool, Optional[str], int, dict]:
    """
    Authenticate an A2A request.

    Args:
        path: Request path (e.g., "/a2a/rpc")
        headers: Request headers dict
        query_string: Query string (e.g., "api_key=xxx&foo=bar")
        client_ip: Client IP address for logging

    Returns:
        (is_authenticated, error_message, http_status_code, headers_to_add)
    """
    # Check if path is public (exempt from auth)
    if path in PUBLIC_ENDPOINTS:
        return True, None, 200, {}

    # Extract API key
    api_key = extract_api_key_from_request(headers, query_string)

    # Validate API key
    is_valid, error_msg = validate_api_key(api_key)

    if not is_valid:
        log_auth_event(
            "ERROR",
            "Authentication failed",
            path=path,
            client_ip=client_ip,
            reason=error_msg
        )
        return False, error_msg, 401, {}

    # If no API keys configured (dev mode), skip rate limiting
    valid_keys = _load_api_keys()
    if not valid_keys:
        return True, None, 200, {}

    # Check rate limit
    is_allowed, remaining = check_rate_limit(api_key)

    rate_headers = {
        "X-RateLimit-Limit": str(A2A_RATE_LIMIT),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(A2A_RATE_WINDOW)
    }

    if not is_allowed:
        log_auth_event(
            "WARN",
            "Rate limit exceeded",
            path=path,
            client_ip=client_ip,
            api_key=api_key[:8] + "..."
        )
        return False, "Rate limit exceeded. Try again later.", 429, rate_headers

    # Success
    log_auth_event(
        "INFO",
        "Request authenticated",
        path=path,
        client_ip=client_ip,
        api_key=api_key[:8] + "..."
    )

    return True, None, 200, rate_headers


# ===============================================================================
# STARLETTE MIDDLEWARE (for a2a_server.py)
# ===============================================================================

def create_starlette_auth_middleware():
    """
    Create a Starlette middleware for A2A authentication.

    Usage in a2a_server.py:
        from a2a_auth import create_starlette_auth_middleware
        middleware = create_starlette_auth_middleware()
        app.add_middleware(middleware)
    """
    try:
        from starlette.middleware.base import BaseHTTPMiddleware
        from starlette.responses import JSONResponse

        class A2AAuthMiddleware(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                path = request.url.path

                # Convert headers to dict
                headers = dict(request.headers)
                query_string = str(request.url.query)
                client_ip = request.client.host if request.client else "unknown"

                # Authenticate
                is_auth, error_msg, status_code, rate_headers = authenticate_a2a_request(
                    path, headers, query_string, client_ip
                )

                if not is_auth:
                    response = JSONResponse(
                        {"error": error_msg, "code": status_code},
                        status_code=status_code
                    )
                    for key, value in rate_headers.items():
                        response.headers[key] = value
                    return response

                # Proceed with request
                response = await call_next(request)

                # Add rate limit headers
                for key, value in rate_headers.items():
                    response.headers[key] = value

                return response

        return A2AAuthMiddleware

    except ImportError:
        return None


# ===============================================================================
# HTTP.SERVER INTEGRATION (for web_server.py)
# ===============================================================================

def check_a2a_auth_for_handler(handler) -> Tuple[bool, Optional[dict]]:
    """
    Check A2A authentication for a SimpleHTTPRequestHandler.

    Args:
        handler: The request handler instance (has self.path, self.headers, etc.)

    Returns:
        (is_authenticated, error_response_dict_if_failed)
    """
    path = urlparse(handler.path).path
    query_string = urlparse(handler.path).query

    # Convert headers
    headers = dict(handler.headers)

    # Get client IP
    client_ip = handler.client_address[0] if handler.client_address else "unknown"

    # Authenticate
    is_auth, error_msg, status_code, rate_headers = authenticate_a2a_request(
        path, headers, query_string, client_ip
    )

    if not is_auth:
        return False, {
            "error": error_msg,
            "code": status_code,
            "status": status_code,
            "rate_headers": rate_headers
        }

    return True, {"rate_headers": rate_headers}


# ===============================================================================
# UTILITY FUNCTIONS
# ===============================================================================

def is_a2a_endpoint(path: str) -> bool:
    """Check if a path is an A2A endpoint that requires authentication."""
    a2a_paths = {
        "/a2a",
        "/a2a/rpc",
        "/a2a/tasks",
        "/a2a/cancel",
        "/a2a/stream",
    }
    return path in a2a_paths or path.startswith("/a2a/")


def generate_api_key() -> str:
    """Generate a new secure API key."""
    import secrets
    return f"a2a_{secrets.token_urlsafe(32)}"


def print_auth_status():
    """Print current authentication configuration status."""
    valid_keys = _load_api_keys()

    print("\n" + "=" * 60)
    print("A2A AUTHENTICATION STATUS")
    print("=" * 60)

    if valid_keys:
        print(f"Status: ENABLED")
        print(f"API Keys configured: {len(valid_keys)}")
        print(f"Rate limit: {A2A_RATE_LIMIT} requests per {A2A_RATE_WINDOW} seconds")
        print(f"Public endpoints (no auth required):")
        for ep in PUBLIC_ENDPOINTS:
            print(f"  - {ep}")
    else:
        print("Status: DISABLED (no A2A_API_KEYS configured)")
        print("WARNING: All A2A endpoints are publicly accessible!")
        print("")
        print("To enable authentication:")
        print("1. Generate an API key: python3 -c \"from a2a_auth import generate_api_key; print(generate_api_key())\"")
        print("2. Add to .env: A2A_API_KEYS=your_key_here")
        print("3. Restart the server")

    print("=" * 60 + "\n")


# ===============================================================================
# MAIN (for testing)
# ===============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "generate":
        # Generate a new API key
        key = generate_api_key()
        print(f"\nGenerated A2A API Key:\n{key}\n")
        print("Add to your .env file:")
        print(f"A2A_API_KEYS={key}")
        print("")
    elif len(sys.argv) > 1 and sys.argv[1] == "status":
        print_auth_status()
    else:
        print("A2A Authentication Module")
        print("")
        print("Commands:")
        print("  python3 a2a_auth.py generate  - Generate a new API key")
        print("  python3 a2a_auth.py status    - Show authentication status")
        print("")
        print_auth_status()
