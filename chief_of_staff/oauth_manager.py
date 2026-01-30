"""
Chief of Staff OAuth Manager
============================
Handles OAuth 2.0 flows for Google Calendar, Gmail, Sheets, and Drive.

FULL ACCESS: Unlike TinyPM (which is restricted), Chief of Staff has full
access to all Google APIs needed to manage the business.

Scopes:
- Calendar (read/write)
- Gmail (read/compose)
- Sheets (full access)
- Drive (full access)

Created: 2026-01-30
Author: Chief_of_Staff_Claude
Purpose: Full OAuth access for Chief of Staff command center
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required if env vars set another way


# =============================================================================
# CHIEF OF STAFF SCOPES - FULL ACCESS
# =============================================================================

# Chief of Staff has FULL access to manage the entire business
COS_ALLOWED_SCOPES = [
    # Calendar
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',

    # Gmail
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',

    # Sheets (Chief of Staff ONLY - TinyPM cannot use these)
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly',

    # Drive (Chief of Staff ONLY - TinyPM cannot use these)
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',

    # User info
    'openid',
    'email',
    'profile'
]


# =============================================================================
# CUSTOM EXCEPTIONS
# =============================================================================

class OAuthConfigError(Exception):
    """Raised when OAuth configuration is missing or invalid."""
    pass


class OAuthTokenError(Exception):
    """Raised when token operations fail."""
    pass


# =============================================================================
# CHIEF OF STAFF OAUTH MANAGER
# =============================================================================

class ChiefOfStaffOAuthManager:
    """
    OAuth manager for Chief of Staff with FULL Google API access.

    FULL ACCESS INCLUDES:
    - Calendar (read/write events)
    - Gmail (read emails, compose, send)
    - Sheets (full access to spreadsheets)
    - Drive (full file access)

    Usage:
        oauth = get_oauth_manager()

        # Get authorization URL for user to visit
        auth_url = oauth.get_authorization_url(state='my_state')

        # After user authorizes, exchange code for tokens
        tokens = oauth.exchange_code_for_tokens(code)

        # Save tokens
        oauth.save_tokens('default', tokens)

        # Later, get valid access token (auto-refreshes if needed)
        access_token = oauth.get_valid_access_token('default')
    """

    TOKEN_PREFIX = "cos_"
    TOKEN_FILE_NAME = ".cos_oauth_tokens.json"

    def __init__(self):
        """Initialize OAuth manager with credentials from environment."""
        self.client_id = os.environ.get('COS_GOOGLE_CLIENT_ID', '')
        self.client_secret = os.environ.get('COS_GOOGLE_CLIENT_SECRET', '')
        self.redirect_uri = os.environ.get(
            'COS_OAUTH_REDIRECT',
            'http://localhost:8001/auth/callback'
        )
        self._validate_config()

    def _validate_config(self):
        """
        Validate OAuth configuration exists.

        Note: We don't raise an error here, just warn - this allows
        the system to run in a degraded mode without OAuth.
        """
        if not self.client_id:
            print("[Chief of Staff OAuth] Warning: COS_GOOGLE_CLIENT_ID not set")
        if not self.client_secret:
            print("[Chief of Staff OAuth] Warning: COS_GOOGLE_CLIENT_SECRET not set")

    def is_configured(self) -> bool:
        """Check if OAuth is properly configured."""
        return bool(self.client_id and self.client_secret)

    # =========================================================================
    # AUTHORIZATION URL
    # =========================================================================

    def get_authorization_url(self, state: str = None,
                               scopes: List[str] = None) -> str:
        """
        Generate OAuth authorization URL with FULL scopes.

        Args:
            state: Optional state parameter for CSRF protection
            scopes: Optional list of scopes (defaults to ALL scopes)

        Returns:
            URL string for user to visit

        Raises:
            OAuthConfigError: If OAuth is not configured
        """
        if not self.is_configured():
            raise OAuthConfigError(
                "OAuth not configured. Set COS_GOOGLE_CLIENT_ID and "
                "COS_GOOGLE_CLIENT_SECRET environment variables."
            )

        from urllib.parse import urlencode

        # Use provided scopes or default to ALL
        request_scopes = scopes or COS_ALLOWED_SCOPES

        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(request_scopes),
            'access_type': 'offline',  # Required for refresh tokens
            'prompt': 'consent',  # Force consent to get refresh token
            'state': state or f'cos_auth_{datetime.now().timestamp()}'
        }

        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    # =========================================================================
    # TOKEN EXCHANGE
    # =========================================================================

    def exchange_code_for_tokens(self, code: str) -> Dict:
        """
        Exchange authorization code for tokens.

        Args:
            code: Authorization code from Google callback

        Returns:
            Token dictionary with access_token, refresh_token, etc.

        Raises:
            OAuthTokenError: If exchange fails
        """
        if not self.is_configured():
            raise OAuthConfigError("OAuth not configured")

        import urllib.request
        import urllib.parse
        import urllib.error

        data = urllib.parse.urlencode({
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': self.redirect_uri
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://oauth2.googleapis.com/token',
            data=data,
            method='POST',
            headers={
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                token_data = json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            raise OAuthTokenError(f"Token exchange failed: {error_body}")
        except Exception as e:
            raise OAuthTokenError(f"Token exchange failed: {e}")

        # Add metadata
        token_data['obtained_at'] = datetime.now().isoformat()
        token_data['expires_at'] = (
            datetime.now() +
            timedelta(seconds=token_data.get('expires_in', 3600))
        ).isoformat()

        return token_data

    def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresh an access token using the refresh token.

        Args:
            refresh_token: The refresh token from initial authorization

        Returns:
            New token dictionary with fresh access_token

        Raises:
            OAuthTokenError: If refresh fails
        """
        if not self.is_configured():
            raise OAuthConfigError("OAuth not configured")

        import urllib.request
        import urllib.parse
        import urllib.error

        data = urllib.parse.urlencode({
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://oauth2.googleapis.com/token',
            data=data,
            method='POST',
            headers={
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                token_data = json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            raise OAuthTokenError(f"Token refresh failed: {error_body}")
        except Exception as e:
            raise OAuthTokenError(f"Token refresh failed: {e}")

        # Add metadata
        token_data['refreshed_at'] = datetime.now().isoformat()
        token_data['expires_at'] = (
            datetime.now() +
            timedelta(seconds=token_data.get('expires_in', 3600))
        ).isoformat()

        return token_data

    # =========================================================================
    # TOKEN STORAGE
    # =========================================================================

    def save_tokens(self, user_id: str, token_data: Dict) -> bool:
        """
        Save tokens to local storage with Chief of Staff prefix.

        Args:
            user_id: User identifier (will be prefixed with cos_)
            token_data: Token dictionary from exchange or refresh

        Returns:
            True if save successful
        """
        token_file = Path(__file__).parent / self.TOKEN_FILE_NAME

        tokens = {}
        if token_file.exists():
            try:
                tokens = json.loads(token_file.read_text())
            except json.JSONDecodeError:
                tokens = {}

        # Use prefixed ID to prevent collision
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"

        tokens[prefixed_id] = {
            **token_data,
            'updated_at': datetime.now().isoformat()
        }

        try:
            token_file.write_text(json.dumps(tokens, indent=2))
            print(f"[Chief of Staff OAuth] Tokens saved for {prefixed_id}")
            return True
        except Exception as e:
            print(f"[Chief of Staff OAuth] Save error: {e}")
            return False

    # =========================================================================
    # TOKEN RETRIEVAL
    # =========================================================================

    def get_valid_access_token(self, user_id: str = 'default') -> Optional[str]:
        """
        Get a valid access token, refreshing if needed.

        This is the main method to use when making API calls.
        It handles token refresh automatically.

        Args:
            user_id: User identifier (defaults to 'default')

        Returns:
            Valid access token string, or None if no tokens found
        """
        # Try to load existing tokens
        token_data = self._load_tokens(user_id)
        if not token_data:
            return None

        # Check if token is expired or about to expire (5 min buffer)
        expires_at_str = token_data.get('expires_at')
        if expires_at_str:
            try:
                # Handle various ISO format variations
                exp_str = expires_at_str.replace('Z', '+00:00')
                if '+' not in exp_str and 'T' in exp_str:
                    # Naive datetime, assume local
                    exp_time = datetime.fromisoformat(exp_str)
                else:
                    exp_time = datetime.fromisoformat(exp_str)
                    # Convert to naive for comparison
                    if exp_time.tzinfo:
                        exp_time = exp_time.replace(tzinfo=None)

                if datetime.now() >= exp_time - timedelta(minutes=5):
                    # Token expired or expiring soon - refresh it
                    refresh_token = token_data.get('refresh_token')
                    if refresh_token:
                        try:
                            new_tokens = self.refresh_access_token(refresh_token)
                            # Keep the refresh token (Google doesn't always return new one)
                            new_tokens['refresh_token'] = refresh_token
                            self.save_tokens(user_id, new_tokens)
                            return new_tokens.get('access_token')
                        except OAuthTokenError as e:
                            print(f"[Chief of Staff OAuth] Refresh failed: {e}")
                            return None
                    else:
                        print("[Chief of Staff OAuth] No refresh token available")
                        return None
            except Exception as e:
                print(f"[Chief of Staff OAuth] Error parsing expiration: {e}")

        return token_data.get('access_token')

    def get_token_info(self, user_id: str = 'default') -> Optional[Dict]:
        """
        Get token info including scopes for a user.

        Args:
            user_id: User identifier

        Returns:
            Dict with token info including scopes, or None if not found
        """
        token_data = self._load_tokens(user_id)
        if not token_data:
            return None

        # Parse scope string into list
        scopes = []
        if 'scope' in token_data:
            scopes = token_data['scope'].split(' ')

        return {
            'scopes': scopes,
            'expires_at': token_data.get('expires_at'),
            'has_refresh_token': bool(token_data.get('refresh_token')),
            'token_type': token_data.get('token_type', 'Bearer')
        }

    def _load_tokens(self, user_id: str) -> Optional[Dict]:
        """
        Load tokens from local storage.

        Args:
            user_id: User identifier

        Returns:
            Token dictionary or None if not found
        """
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"

        token_file = Path(__file__).parent / self.TOKEN_FILE_NAME
        if token_file.exists():
            try:
                tokens = json.loads(token_file.read_text())
                return tokens.get(prefixed_id)
            except Exception as e:
                print(f"[Chief of Staff OAuth] Load error: {e}")

        return None

    # =========================================================================
    # TOKEN REVOCATION
    # =========================================================================

    def revoke_tokens(self, user_id: str = 'default') -> bool:
        """
        Revoke and delete tokens for a user.

        Args:
            user_id: User identifier

        Returns:
            True if revocation successful
        """
        token_data = self._load_tokens(user_id)
        if not token_data:
            return True  # Nothing to revoke

        # Revoke with Google
        access_token = token_data.get('access_token')
        if access_token:
            import urllib.request
            import urllib.error

            try:
                req = urllib.request.Request(
                    f'https://oauth2.googleapis.com/revoke?token={access_token}',
                    method='POST',
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                )
                urllib.request.urlopen(req, timeout=10)
                print(f"[Chief of Staff OAuth] Token revoked with Google")
            except urllib.error.HTTPError:
                pass  # Token may already be invalid
            except Exception as e:
                print(f"[Chief of Staff OAuth] Revocation warning: {e}")

        # Delete from local storage
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"
        token_file = Path(__file__).parent / self.TOKEN_FILE_NAME
        if token_file.exists():
            try:
                tokens = json.loads(token_file.read_text())
                if prefixed_id in tokens:
                    del tokens[prefixed_id]
                    token_file.write_text(json.dumps(tokens, indent=2))
                    print(f"[Chief of Staff OAuth] Tokens deleted")
            except Exception as e:
                print(f"[Chief of Staff OAuth] Delete error: {e}")

        return True

    # =========================================================================
    # UTILITY METHODS
    # =========================================================================

    def get_user_info(self, access_token: str) -> Optional[Dict]:
        """
        Get user info from Google using access token.

        Args:
            access_token: Valid access token

        Returns:
            User info dictionary with email, name, etc.
        """
        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={
                'Authorization': f'Bearer {access_token}'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"[Chief of Staff OAuth] Failed to get user info: {e}")
            return None

    def get_status(self) -> Dict:
        """
        Get OAuth manager status.

        Returns:
            Dictionary with configuration and token status
        """
        status = {
            'configured': self.is_configured(),
            'client_id_set': bool(self.client_id),
            'client_secret_set': bool(self.client_secret),
            'redirect_uri': self.redirect_uri,
            'allowed_scopes': COS_ALLOWED_SCOPES,
            'token_prefix': self.TOKEN_PREFIX,
            'capabilities': {
                'calendar': True,
                'gmail': True,
                'sheets': True,
                'drive': True
            }
        }

        # Check local token storage
        token_file = Path(__file__).parent / self.TOKEN_FILE_NAME
        if token_file.exists():
            try:
                tokens = json.loads(token_file.read_text())
                status['local_tokens_count'] = len(tokens)
            except:
                status['local_tokens_count'] = 'error'
        else:
            status['local_tokens_count'] = 0

        return status


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_oauth_manager = None


def get_oauth_manager() -> ChiefOfStaffOAuthManager:
    """
    Get or create global OAuth manager.

    Use this function rather than creating instances directly.

    Returns:
        ChiefOfStaffOAuthManager singleton instance
    """
    global _oauth_manager
    if _oauth_manager is None:
        _oauth_manager = ChiefOfStaffOAuthManager()
    return _oauth_manager


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys

    oauth = get_oauth_manager()

    if len(sys.argv) < 2:
        print("Chief of Staff OAuth Manager")
        print("=" * 50)
        print("\nFULL ACCESS CAPABILITIES:")
        print("  - Calendar (read/write)")
        print("  - Gmail (read/compose/send)")
        print("  - Sheets (full access)")
        print("  - Drive (full access)")
        print()

        status = oauth.get_status()
        print("STATUS:")
        print(f"  Configured: {status['configured']}")
        print(f"  Client ID set: {status['client_id_set']}")
        print(f"  Client Secret set: {status['client_secret_set']}")
        print(f"  Redirect URI: {status['redirect_uri']}")
        print(f"  Local tokens: {status['local_tokens_count']}")
        print()

        if not status['configured']:
            print("TO CONFIGURE:")
            print("  export COS_GOOGLE_CLIENT_ID='your-client-id'")
            print("  export COS_GOOGLE_CLIENT_SECRET='your-client-secret'")
            print("  export COS_OAUTH_REDIRECT='http://localhost:8001/auth/callback'")

        print()
        print("COMMANDS:")
        print("  python oauth_manager.py auth-url     # Get authorization URL")
        print("  python oauth_manager.py status       # Show detailed status")
        print("  python oauth_manager.py authorize    # Start full OAuth flow")
        sys.exit(0)

    command = sys.argv[1]

    if command == "auth-url":
        if not oauth.is_configured():
            print("ERROR: OAuth not configured. Set environment variables first.")
            sys.exit(1)

        state = sys.argv[2] if len(sys.argv) > 2 else None
        url = oauth.get_authorization_url(state=state)
        print("\nAuthorization URL (visit in browser):")
        print(url)

    elif command == "status":
        status = oauth.get_status()
        print(json.dumps(status, indent=2))

    elif command == "authorize":
        # Start the full OAuth flow with callback server
        print("\nStarting OAuth authorization flow...")
        print("This will open a browser window for Google sign-in.\n")

        try:
            from oauth_callback_server import run_oauth_flow
            tokens = run_oauth_flow()
            if tokens:
                print("\nAuthorization successful!")
                print(f"  Scopes: {tokens.get('scope', 'unknown')}")
            else:
                print("\nAuthorization failed or was cancelled.")
        except ImportError:
            print("ERROR: oauth_callback_server.py not found.")
            print("Run the auth-url command manually and use a callback server.")

    elif command == "exchange":
        if len(sys.argv) < 3:
            print("Usage: python oauth_manager.py exchange <code>")
            sys.exit(1)

        code = sys.argv[2]
        try:
            tokens = oauth.exchange_code_for_tokens(code)
            print("Token exchange successful!")
            print(f"  Access token: {tokens.get('access_token', '')[:20]}...")
            print(f"  Expires in: {tokens.get('expires_in')} seconds")
            print(f"  Scope: {tokens.get('scope')}")

            # Save tokens
            oauth.save_tokens('default', tokens)
            print("  Tokens saved!")
        except Exception as e:
            print(f"ERROR: {e}")
            sys.exit(1)

    elif command == "revoke":
        user_id = sys.argv[2] if len(sys.argv) > 2 else 'default'
        if oauth.revoke_tokens(user_id):
            print(f"Tokens revoked for user: {user_id}")
        else:
            print(f"Failed to revoke tokens for user: {user_id}")

    elif command == "test":
        print("\nTesting OAuth configuration...")

        # Check configuration
        if not oauth.is_configured():
            print("FAIL: OAuth not configured")
            sys.exit(1)
        print("PASS: OAuth configured")

        # Check if we have tokens
        token_info = oauth.get_token_info('default')
        if token_info:
            print(f"PASS: Tokens found")
            print(f"      Scopes: {len(token_info['scopes'])} granted")
            print(f"      Has refresh token: {token_info['has_refresh_token']}")

            # Try to get valid access token
            access_token = oauth.get_valid_access_token('default')
            if access_token:
                print("PASS: Got valid access token")

                # Get user info
                user_info = oauth.get_user_info(access_token)
                if user_info:
                    print(f"PASS: User info retrieved")
                    print(f"      Email: {user_info.get('email')}")
                    print(f"      Name: {user_info.get('name')}")
            else:
                print("FAIL: Could not get valid access token")
        else:
            print("WARN: No tokens found - run 'authorize' first")

    else:
        print(f"Unknown command: {command}")
        print("Available commands: auth-url, status, authorize, exchange, revoke, test")
        sys.exit(1)
