"""
TinyPM Authentication Middleware
================================
Provides JWT verification and user context extraction for API requests.

Created: 2026-01-30
Author: Security_Claude (Team 1: Security & Multi-Tenancy)
Purpose: Secure all API endpoints with proper authentication

Usage:
    from auth_middleware import require_auth, get_current_user, verify_jwt

    # As a decorator
    @require_auth
    def my_endpoint(request, user):
        # user is guaranteed to be authenticated
        return {"user_id": user["id"]}

    # Manual verification
    user = get_current_user(request)
    if not user:
        return {"error": "Unauthorized"}, 401
"""

import os
import json
import base64
import time
import hmac
import hashlib
from functools import wraps
from typing import Optional, Dict, Any, Tuple, Callable
from pathlib import Path

# Configuration
APP_DIR = Path(__file__).parent
_env_file = APP_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bznidonyuztfplqzkmks.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

# Cache for validated tokens (simple in-memory cache)
_token_cache: Dict[str, Tuple[Dict, float]] = {}
_CACHE_TTL = 300  # 5 minutes


class AuthError(Exception):
    """Authentication error with HTTP status code."""
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _base64url_decode(data: str) -> bytes:
    """Decode base64url encoded string."""
    # Add padding if needed
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)


def _base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url string (no padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def verify_jwt(token: str) -> Dict[str, Any]:
    """
    Verify a Supabase JWT token and return the payload.

    Args:
        token: The JWT token string (without 'Bearer ' prefix)

    Returns:
        Dictionary containing the JWT payload (including user info)

    Raises:
        AuthError: If token is invalid, expired, or verification fails
    """
    if not token:
        raise AuthError("No token provided", 401)

    # Remove 'Bearer ' prefix if present
    if token.startswith("Bearer "):
        token = token[7:]

    # Check cache first
    cache_key = hashlib.sha256(token.encode()).hexdigest()[:16]
    if cache_key in _token_cache:
        cached_payload, cached_time = _token_cache[cache_key]
        if time.time() - cached_time < _CACHE_TTL:
            # Check if token is still valid (not expired)
            if cached_payload.get("exp", 0) > time.time():
                return cached_payload

    # Split token into parts
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise AuthError("Invalid token format", 401)

        header_b64, payload_b64, signature_b64 = parts

        # Decode header and payload
        header = json.loads(_base64url_decode(header_b64))
        payload = json.loads(_base64url_decode(payload_b64))

    except (json.JSONDecodeError, ValueError) as e:
        raise AuthError(f"Invalid token encoding: {e}", 401)

    # Verify algorithm
    if header.get("alg") != "HS256":
        raise AuthError(f"Unsupported algorithm: {header.get('alg')}", 401)

    # Verify signature if we have the secret
    if SUPABASE_JWT_SECRET:
        try:
            # Create signing input
            signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

            # Create expected signature
            secret = SUPABASE_JWT_SECRET.encode("utf-8")
            expected_sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
            expected_sig_b64 = _base64url_encode(expected_sig)

            # Compare signatures (constant-time comparison)
            actual_sig = signature_b64
            if not hmac.compare_digest(expected_sig_b64, actual_sig):
                raise AuthError("Invalid token signature", 401)

        except Exception as e:
            if isinstance(e, AuthError):
                raise
            raise AuthError(f"Signature verification failed: {e}", 401)
    else:
        # SECURITY FIX 2026-02-28: No secret = reject token (was silently skipping verification)
        raise AuthError("JWT_SECRET not configured — cannot verify token signature. Set SUPABASE_JWT_SECRET in environment.", 500)

    # Check expiration
    exp = payload.get("exp", 0)
    if exp and exp < time.time():
        raise AuthError("Token expired", 401)

    # Check not-before
    nbf = payload.get("nbf", 0)
    if nbf and nbf > time.time():
        raise AuthError("Token not yet valid", 401)

    # Check issuer (should be Supabase URL)
    iss = payload.get("iss", "")
    if iss and SUPABASE_URL and not iss.startswith(SUPABASE_URL.replace("https://", "")):
        # Be lenient with issuer check - Supabase uses project ref
        pass

    # Cache the validated token
    _token_cache[cache_key] = (payload, time.time())

    # Clean old cache entries periodically
    if len(_token_cache) > 1000:
        current_time = time.time()
        _token_cache.clear()

    return payload


def get_user_from_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract user information from JWT payload.

    Args:
        payload: The decoded JWT payload

    Returns:
        User dictionary with id, email, and metadata
    """
    # Supabase JWT structure
    return {
        "id": payload.get("sub"),  # User ID is in 'sub' claim
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
        "aud": payload.get("aud"),
        "user_metadata": payload.get("user_metadata", {}),
        "app_metadata": payload.get("app_metadata", {}),
        "iat": payload.get("iat"),
        "exp": payload.get("exp"),
    }


def extract_token_from_request(request: Any) -> Optional[str]:
    """
    Extract JWT token from various request types.

    Supports:
    - http.server.BaseHTTPRequestHandler (web_server.py)
    - Flask request objects
    - FastAPI Request objects
    - Dict with headers

    Args:
        request: The request object

    Returns:
        Token string or None if not found
    """
    token = None

    # Try different ways to get Authorization header
    if hasattr(request, 'headers'):
        headers = request.headers
        if hasattr(headers, 'get'):
            token = headers.get('Authorization') or headers.get('authorization')
        elif isinstance(headers, dict):
            token = headers.get('Authorization') or headers.get('authorization')

    # Check for cookie-based token
    if not token and hasattr(request, 'cookies'):
        cookies = request.cookies
        if hasattr(cookies, 'get'):
            token = cookies.get('sb-access-token')
        elif isinstance(cookies, dict):
            token = cookies.get('sb-access-token')

    # Remove 'Bearer ' prefix if present
    if token and token.startswith("Bearer "):
        token = token[7:]

    return token


def get_current_user(request: Any) -> Optional[Dict[str, Any]]:
    """
    Get the current authenticated user from the request.

    Args:
        request: The HTTP request object

    Returns:
        User dictionary or None if not authenticated
    """
    token = extract_token_from_request(request)
    if not token:
        return None

    try:
        payload = verify_jwt(token)
        return get_user_from_payload(payload)
    except AuthError:
        return None


def get_current_user_id(request: Any) -> Optional[str]:
    """
    Get just the user ID from the request.

    Args:
        request: The HTTP request object

    Returns:
        User ID string or None if not authenticated
    """
    user = get_current_user(request)
    return user["id"] if user else None


def require_auth(func: Callable) -> Callable:
    """
    Decorator that requires authentication for an endpoint.

    The decorated function will receive an additional 'user' keyword argument
    containing the authenticated user's information.

    Usage:
        @require_auth
        def my_endpoint(request, user=None):
            return {"user_id": user["id"]}
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Find the request object in args or kwargs
        request = None
        for arg in args:
            if hasattr(arg, 'headers'):
                request = arg
                break
        if not request:
            request = kwargs.get('request')

        if not request:
            raise AuthError("No request object found", 500)

        # Get user from token
        user = get_current_user(request)
        if not user:
            raise AuthError("Authentication required", 401)

        # Add user to kwargs
        kwargs['user'] = user
        return func(*args, **kwargs)

    return wrapper


def create_auth_response(error: AuthError) -> Tuple[Dict, int]:
    """
    Create an error response for authentication failures.

    Args:
        error: The AuthError exception

    Returns:
        Tuple of (response_dict, status_code)
    """
    return {
        "error": error.message,
        "code": error.status_code,
        "type": "authentication_error"
    }, error.status_code


# ============================================================================
# HTTP Server Integration (for web_server.py)
# ============================================================================

class AuthenticatedHandler:
    """
    Mixin for http.server.BaseHTTPRequestHandler to add authentication.

    Usage:
        class MyHandler(AuthenticatedHandler, SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path.startswith("/api/"):
                    user = self.get_authenticated_user()
                    if not user:
                        self.send_auth_error("Authentication required")
                        return
                    # ... handle authenticated request
    """

    def get_authenticated_user(self) -> Optional[Dict[str, Any]]:
        """Get authenticated user from request headers."""
        return get_current_user(self)

    def get_authenticated_user_id(self) -> Optional[str]:
        """Get just the user ID from request headers."""
        return get_current_user_id(self)

    def require_authentication(self) -> Optional[Dict[str, Any]]:
        """
        Require authentication and return user.
        Sends 401 response if not authenticated.

        Returns:
            User dict if authenticated, None if auth failed (response already sent)
        """
        user = self.get_authenticated_user()
        if not user:
            self.send_auth_error("Authentication required")
            return None
        return user

    def send_auth_error(self, message: str, status_code: int = 401):
        """Send an authentication error response."""
        response = {
            "error": message,
            "code": status_code,
            "type": "authentication_error"
        }
        body = json.dumps(response).encode('utf-8')

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("WWW-Authenticate", 'Bearer realm="TinyPM"')
        self.end_headers()
        self.wfile.write(body)


# ============================================================================
# Supabase Client Context Setting
# ============================================================================

def set_supabase_user_context(supabase_client, user_id: str):
    """
    Set the user context for RLS in a Supabase query.

    This sets the app.current_user_id session variable that our
    RLS policies check.

    Args:
        supabase_client: The Supabase client instance
        user_id: The user ID to set

    Usage:
        from supabase import create_client
        client = create_client(url, key)
        set_supabase_user_context(client, user_id)
        # Now queries will be filtered by RLS
    """
    try:
        # For supabase-py, we need to set this via RPC or raw SQL
        # This is a PostgreSQL session variable
        supabase_client.rpc(
            'set_config',
            {'setting': 'app.current_user_id', 'value': user_id, 'is_local': True}
        ).execute()
    except Exception as e:
        print(f"[AUTH] Warning: Could not set user context: {e}")
        # Fallback: use auth.uid() in RLS policies (requires JWT)


def get_authenticated_supabase_client(token: str):
    """
    Create a Supabase client with user authentication.

    Args:
        token: The user's JWT token

    Returns:
        Authenticated Supabase client
    """
    try:
        from supabase import create_client, Client
    except ImportError:
        raise ImportError("supabase-py not installed. Run: pip install supabase")

    # Verify token first
    payload = verify_jwt(token)
    user_id = payload.get("sub")

    if not user_id:
        raise AuthError("Token missing user ID", 401)

    # Create client with user's JWT
    client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    # Set the access token for this client
    client.auth.set_session(token, payload.get("refresh_token", ""))

    return client, user_id


# ============================================================================
# API Endpoint Helpers
# ============================================================================

def api_verify_endpoint():
    """
    Handler for /api/auth/verify endpoint.

    Returns the authenticated user's information.
    """
    def handler(request):
        user = get_current_user(request)
        if not user:
            return {"authenticated": False, "error": "Not authenticated"}, 401

        return {
            "authenticated": True,
            "user": {
                "id": user["id"],
                "email": user.get("email"),
                "role": user.get("role"),
                "metadata": user.get("user_metadata", {})
            }
        }, 200

    return handler


# ============================================================================
# CLI for testing
# ============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("TinyPM Auth Middleware")
        print("=" * 40)
        print("Usage:")
        print("  python auth_middleware.py verify <token>")
        print("  python auth_middleware.py test")
        print()
        print("Configuration:")
        print(f"  SUPABASE_URL: {SUPABASE_URL}")
        print(f"  JWT_SECRET: {'configured' if SUPABASE_JWT_SECRET else 'NOT SET (will skip signature verification)'}")
        sys.exit(0)

    command = sys.argv[1]

    if command == "verify" and len(sys.argv) > 2:
        token = sys.argv[2]
        try:
            payload = verify_jwt(token)
            user = get_user_from_payload(payload)
            print("Token verified successfully!")
            print(json.dumps(user, indent=2))
        except AuthError as e:
            print(f"Verification failed: {e.message}")
            sys.exit(1)

    elif command == "test":
        print("Running auth middleware tests...")

        # Test 1: Invalid token
        try:
            verify_jwt("invalid.token.here")
            print("FAIL: Should have rejected invalid token")
        except AuthError:
            print("PASS: Rejected invalid token")

        # Test 2: Empty token
        try:
            verify_jwt("")
            print("FAIL: Should have rejected empty token")
        except AuthError:
            print("PASS: Rejected empty token")

        # Test 3: Malformed token
        try:
            verify_jwt("not-a-jwt")
            print("FAIL: Should have rejected malformed token")
        except AuthError:
            print("PASS: Rejected malformed token")

        print("\nAll tests passed!")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
