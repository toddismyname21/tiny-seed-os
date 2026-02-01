"""
TinyPM Google OAuth Handler
============================
Seamless ONE-CLICK Google OAuth for Calendar + Gmail.

This module provides a simple, clean OAuth flow:
1. generate_auth_url() - Get URL for user to click
2. exchange_code() - Exchange auth code for tokens
3. refresh_token() - Refresh expired tokens

SCOPES REQUESTED (Calendar + Gmail):
- calendar.readonly - Read calendar events
- calendar.events - Create/modify events
- gmail.readonly - Read emails
- gmail.send - Send emails
- gmail.modify - Modify email labels/mark read

SECURITY: Hard boundaries - NO sheets/drive access ever.

Created: 2026-01-30
Author: Backend_Agent
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from pathlib import Path
import urllib.request
import urllib.parse
import urllib.error

# Load .env file
APP_DIR = Path(__file__).parent
_env_file = APP_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())


# =============================================================================
# CONFIGURATION
# =============================================================================

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:8000/oauth/callback')

# ONE-CLICK scopes - Calendar + Gmail full access
GOOGLE_SCOPES = [
    # Calendar
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    # Gmail
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    # User info
    'openid',
    'email',
    'profile'
]

# FORBIDDEN - TinyPM should NEVER access these
FORBIDDEN_SCOPE_PATTERNS = ['spreadsheets', 'drive', 'docs', 'documents']


# =============================================================================
# EXCEPTIONS
# =============================================================================

class OAuthError(Exception):
    """Base OAuth error."""
    pass


class OAuthConfigError(OAuthError):
    """OAuth not configured."""
    pass


class OAuthExchangeError(OAuthError):
    """Token exchange failed."""
    pass


class OAuthRefreshError(OAuthError):
    """Token refresh failed."""
    pass


class OAuthScopeError(OAuthError):
    """Forbidden scope detected."""
    pass


# =============================================================================
# OAUTH FUNCTIONS
# =============================================================================

def is_configured() -> bool:
    """Check if Google OAuth credentials are configured."""
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def generate_auth_url(state: str = None, redirect_uri: str = None) -> str:
    """
    Generate Google OAuth authorization URL.

    User clicks this URL -> Google consent screen -> redirected back with code.

    Args:
        state: Optional state for CSRF protection (recommended)
        redirect_uri: Optional override for redirect URI

    Returns:
        Authorization URL string

    Raises:
        OAuthConfigError: If credentials not configured
    """
    if not is_configured():
        raise OAuthConfigError(
            "Google OAuth not configured. Set GOOGLE_CLIENT_ID and "
            "GOOGLE_CLIENT_SECRET in .env file."
        )

    # Build authorization URL
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': redirect_uri or GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(GOOGLE_SCOPES),
        'access_type': 'offline',  # Get refresh token
        'prompt': 'consent',  # Always show consent to get refresh token
        'state': state or f'tinypm_{datetime.now().timestamp()}'
    }

    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"


def exchange_code(code: str, redirect_uri: str = None) -> Dict:
    """
    Exchange authorization code for access and refresh tokens.

    Called after user approves consent screen.

    Args:
        code: Authorization code from Google callback
        redirect_uri: Must match the URI used in generate_auth_url

    Returns:
        Token dictionary with:
        - access_token: For API calls (expires in ~1 hour)
        - refresh_token: For getting new access tokens
        - token_type: Usually "Bearer"
        - expires_in: Seconds until access_token expires
        - scope: Space-separated scopes granted
        - expires_at: ISO timestamp when token expires

    Raises:
        OAuthConfigError: If credentials not configured
        OAuthExchangeError: If exchange fails
        OAuthScopeError: If forbidden scopes detected
    """
    if not is_configured():
        raise OAuthConfigError("Google OAuth not configured")

    # Build token request
    data = urllib.parse.urlencode({
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': redirect_uri or GOOGLE_REDIRECT_URI
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=data,
        method='POST',
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            token_data = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        raise OAuthExchangeError(f"Token exchange failed: {error_body}")
    except Exception as e:
        raise OAuthExchangeError(f"Token exchange failed: {e}")

    # Validate scopes (security check)
    _validate_scopes(token_data.get('scope', ''))

    # Add expiration timestamp
    expires_in = token_data.get('expires_in', 3600)
    token_data['expires_at'] = (
        datetime.now() + timedelta(seconds=expires_in)
    ).isoformat()
    token_data['obtained_at'] = datetime.now().isoformat()

    return token_data


def refresh_token(refresh_token_str: str) -> Dict:
    """
    Refresh an expired access token using the refresh token.

    Call this when access_token is expired or about to expire.

    Args:
        refresh_token_str: The refresh_token from initial authorization

    Returns:
        New token dictionary with fresh access_token
        (Note: Google doesn't always return a new refresh_token)

    Raises:
        OAuthConfigError: If credentials not configured
        OAuthRefreshError: If refresh fails
        OAuthScopeError: If forbidden scopes detected
    """
    if not is_configured():
        raise OAuthConfigError("Google OAuth not configured")

    data = urllib.parse.urlencode({
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'refresh_token': refresh_token_str,
        'grant_type': 'refresh_token'
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=data,
        method='POST',
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            token_data = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        raise OAuthRefreshError(f"Token refresh failed: {error_body}")
    except Exception as e:
        raise OAuthRefreshError(f"Token refresh failed: {e}")

    # Validate scopes
    _validate_scopes(token_data.get('scope', ''))

    # Add expiration timestamp
    expires_in = token_data.get('expires_in', 3600)
    token_data['expires_at'] = (
        datetime.now() + timedelta(seconds=expires_in)
    ).isoformat()
    token_data['refreshed_at'] = datetime.now().isoformat()

    # Keep original refresh token if not provided in response
    if 'refresh_token' not in token_data:
        token_data['refresh_token'] = refresh_token_str

    return token_data


def revoke_token(token: str) -> bool:
    """
    Revoke a token (access or refresh).

    Call this when user wants to disconnect Google.

    Args:
        token: Access token or refresh token to revoke

    Returns:
        True if revocation successful, False otherwise
    """
    try:
        req = urllib.request.Request(
            f'https://oauth2.googleapis.com/revoke?token={token}',
            method='POST',
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f"[GoogleOAuth] Revocation warning: {e}")
        return False


def get_user_info(access_token: str) -> Optional[Dict]:
    """
    Get user info from Google using access token.

    Returns user's email, name, profile picture, etc.

    Args:
        access_token: Valid access token

    Returns:
        User info dictionary with email, name, picture, etc.
        None if request fails.
    """
    req = urllib.request.Request(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"[GoogleOAuth] Failed to get user info: {e}")
        return None


def _validate_scopes(scope_string: str) -> bool:
    """
    SECURITY: Validate that no forbidden scopes are present.

    Raises:
        OAuthScopeError: If any forbidden scope pattern detected
    """
    if not scope_string:
        return True

    scope_lower = scope_string.lower()
    for forbidden in FORBIDDEN_SCOPE_PATTERNS:
        if forbidden in scope_lower:
            raise OAuthScopeError(
                f"SECURITY: Forbidden scope pattern '{forbidden}' detected. "
                f"TinyPM can NEVER access Google Sheets/Drive."
            )

    return True


# =============================================================================
# TOKEN STORAGE (Supabase Integration)
# =============================================================================

def save_tokens_to_supabase(user_id: str, token_data: Dict) -> bool:
    """
    Save tokens to Supabase user_oauth_tokens table.

    Args:
        user_id: User's unique identifier
        token_data: Token dictionary from exchange_code or refresh_token

    Returns:
        True if save successful, False otherwise
    """
    try:
        from supabase_sync import get_supabase_sync
        sync = get_supabase_sync()

        if not sync.is_connected():
            print("[GoogleOAuth] Supabase not connected")
            return False

        # Parse scopes into array
        scopes = token_data.get('scope', '').split(' ') if token_data.get('scope') else []

        # Calculate expiry
        expires_at = token_data.get('expires_at')
        if not expires_at:
            expires_in = token_data.get('expires_in', 3600)
            expires_at = (datetime.now() + timedelta(seconds=expires_in)).isoformat()

        # Upsert to database
        sync.client.table('user_oauth_tokens').upsert({
            'user_id': user_id,
            'provider': 'google',
            'access_token': token_data.get('access_token'),
            'refresh_token': token_data.get('refresh_token'),
            'token_expiry': expires_at,
            'scopes': scopes,
            'updated_at': datetime.now().isoformat()
        }, on_conflict='user_id,provider').execute()

        print(f"[GoogleOAuth] Tokens saved for user {user_id}")
        return True

    except Exception as e:
        print(f"[GoogleOAuth] Supabase save error: {e}")
        return False


def load_tokens_from_supabase(user_id: str) -> Optional[Dict]:
    """
    Load tokens from Supabase user_oauth_tokens table.

    Args:
        user_id: User's unique identifier

    Returns:
        Token dictionary or None if not found
    """
    try:
        from supabase_sync import get_supabase_sync
        sync = get_supabase_sync()

        if not sync.is_connected():
            return None

        result = sync.client.table('user_oauth_tokens').select('*').eq(
            'user_id', user_id
        ).eq('provider', 'google').execute()

        if result.data:
            row = result.data[0]
            return {
                'access_token': row.get('access_token'),
                'refresh_token': row.get('refresh_token'),
                'expires_at': row.get('token_expiry'),
                'scopes': row.get('scopes', []),
                'updated_at': row.get('updated_at')
            }
        return None

    except Exception as e:
        print(f"[GoogleOAuth] Supabase load error: {e}")
        return None


def delete_tokens_from_supabase(user_id: str) -> bool:
    """
    Delete tokens from Supabase (user disconnects Google).

    Args:
        user_id: User's unique identifier

    Returns:
        True if deletion successful
    """
    try:
        from supabase_sync import get_supabase_sync
        sync = get_supabase_sync()

        if not sync.is_connected():
            return False

        sync.client.table('user_oauth_tokens').delete().eq(
            'user_id', user_id
        ).eq('provider', 'google').execute()

        print(f"[GoogleOAuth] Tokens deleted for user {user_id}")
        return True

    except Exception as e:
        print(f"[GoogleOAuth] Supabase delete error: {e}")
        return False


def get_valid_access_token(user_id: str) -> Optional[str]:
    """
    Get a valid access token, auto-refreshing if expired.

    This is the main function to use when making API calls.

    Args:
        user_id: User's unique identifier

    Returns:
        Valid access token string, or None if not available
    """
    token_data = load_tokens_from_supabase(user_id)
    if not token_data:
        return None

    # Check if token is expired or about to expire (5 min buffer)
    expires_at_str = token_data.get('expires_at')
    if expires_at_str:
        try:
            # Handle various ISO format variations
            exp_str = expires_at_str.replace('Z', '+00:00')
            if '+' not in exp_str and 'T' in exp_str:
                exp_time = datetime.fromisoformat(exp_str)
            else:
                exp_time = datetime.fromisoformat(exp_str)
                if exp_time.tzinfo:
                    exp_time = exp_time.replace(tzinfo=None)

            if datetime.now() >= exp_time - timedelta(minutes=5):
                # Token expired or expiring soon - refresh it
                refresh_tok = token_data.get('refresh_token')
                if refresh_tok:
                    try:
                        new_tokens = refresh_token(refresh_tok)
                        save_tokens_to_supabase(user_id, new_tokens)
                        return new_tokens.get('access_token')
                    except OAuthRefreshError as e:
                        print(f"[GoogleOAuth] Refresh failed: {e}")
                        return None
                else:
                    print("[GoogleOAuth] No refresh token available")
                    return None
        except Exception as e:
            print(f"[GoogleOAuth] Error parsing expiration: {e}")

    return token_data.get('access_token')


def get_oauth_status(user_id: str) -> Dict:
    """
    Get OAuth connection status for a user.

    Args:
        user_id: User's unique identifier

    Returns:
        Status dictionary with connection info
    """
    token_data = load_tokens_from_supabase(user_id)

    status = {
        'configured': is_configured(),
        'connected': False,
        'provider': 'google',
        'scopes': [],
        'expires_at': None,
        'user_email': None
    }

    if token_data:
        status['connected'] = bool(token_data.get('access_token'))
        status['scopes'] = token_data.get('scopes', [])
        status['expires_at'] = token_data.get('expires_at')

        # Try to get user email
        if status['connected']:
            access_token = get_valid_access_token(user_id)
            if access_token:
                user_info = get_user_info(access_token)
                if user_info:
                    status['user_email'] = user_info.get('email')
                    status['user_name'] = user_info.get('name')
                    status['user_picture'] = user_info.get('picture')

    return status


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("TinyPM Google OAuth")
    print("=" * 60)

    if len(sys.argv) < 2:
        print(f"\nConfiguration:")
        print(f"  Client ID set: {bool(GOOGLE_CLIENT_ID)}")
        print(f"  Client Secret set: {bool(GOOGLE_CLIENT_SECRET)}")
        print(f"  Redirect URI: {GOOGLE_REDIRECT_URI}")
        print(f"  Configured: {is_configured()}")
        print()
        print("Scopes requested:")
        for scope in GOOGLE_SCOPES:
            print(f"  - {scope}")
        print()
        print("Commands:")
        print("  python google_oauth.py auth-url           # Get authorization URL")
        print("  python google_oauth.py exchange <code>    # Exchange code for tokens")
        print("  python google_oauth.py status <user_id>   # Check connection status")
        print("  python google_oauth.py disconnect <user_id>  # Disconnect Google")
        sys.exit(0)

    command = sys.argv[1]

    if command == "auth-url":
        if not is_configured():
            print("ERROR: OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
            sys.exit(1)

        state = sys.argv[2] if len(sys.argv) > 2 else None
        url = generate_auth_url(state=state)
        print("\nAuthorization URL (open in browser):")
        print(url)

    elif command == "exchange":
        if len(sys.argv) < 3:
            print("Usage: python google_oauth.py exchange <code> [user_id]")
            sys.exit(1)

        code = sys.argv[2]
        user_id = sys.argv[3] if len(sys.argv) > 3 else "default"

        try:
            tokens = exchange_code(code)
            print("Token exchange successful!")
            print(f"  Access token: {tokens.get('access_token', '')[:30]}...")
            print(f"  Refresh token: {'Yes' if tokens.get('refresh_token') else 'No'}")
            print(f"  Expires in: {tokens.get('expires_in')} seconds")
            print(f"  Scopes: {tokens.get('scope')}")

            # Save to Supabase
            if save_tokens_to_supabase(user_id, tokens):
                print(f"\nTokens saved for user: {user_id}")
            else:
                print("\nWarning: Could not save tokens to Supabase")

        except OAuthError as e:
            print(f"ERROR: {e}")
            sys.exit(1)

    elif command == "status":
        user_id = sys.argv[2] if len(sys.argv) > 2 else "default"
        status = get_oauth_status(user_id)
        print(f"\nOAuth Status for '{user_id}':")
        print(json.dumps(status, indent=2))

    elif command == "disconnect":
        if len(sys.argv) < 3:
            print("Usage: python google_oauth.py disconnect <user_id>")
            sys.exit(1)

        user_id = sys.argv[2]

        # Load tokens first to revoke
        token_data = load_tokens_from_supabase(user_id)
        if token_data:
            # Revoke access token
            if token_data.get('access_token'):
                revoke_token(token_data['access_token'])
            # Revoke refresh token
            if token_data.get('refresh_token'):
                revoke_token(token_data['refresh_token'])

        # Delete from database
        if delete_tokens_from_supabase(user_id):
            print(f"Google disconnected for user: {user_id}")
        else:
            print("Warning: Could not delete tokens from database")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
