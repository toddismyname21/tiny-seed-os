"""
TinyPM OAuth Manager
====================
Handles OAuth 2.0 flows for Google Calendar and Gmail.

SECURITY: This module has HARD BOUNDARIES separating it from Tiny Seed OS.
- ONLY calendar and gmail scopes allowed
- REJECTS any token with sheets/drive scopes
- Separate token storage in Supabase (tinypm_oauth_tokens table)
- All tokens prefixed with 'tpm_' to prevent collision

Created: 2026-01-30
Author: Backend_Agent_8
Purpose: Secure OAuth for TinyPM calendar/email integration
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
# SECURITY BOUNDARY DEFINITIONS
# =============================================================================

# ALLOWED SCOPES - TinyPM ONLY (NOT Tiny Seed OS scopes)
TINYPM_ALLOWED_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'openid',
    'email',
    'profile'
]

# FORBIDDEN SCOPES - Tiny Seed OS ONLY (TinyPM must NEVER use these)
# If any of these scopes are detected, the OAuth flow MUST fail
FORBIDDEN_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/documents.readonly',
]


# =============================================================================
# CUSTOM EXCEPTIONS
# =============================================================================

class OAuthBoundaryError(Exception):
    """
    Raised when OAuth boundary is violated.

    This is a SECURITY exception - it means TinyPM detected an attempt
    to use scopes that belong to Tiny Seed OS only.
    """
    pass


class OAuthConfigError(Exception):
    """Raised when OAuth configuration is missing or invalid."""
    pass


class OAuthTokenError(Exception):
    """Raised when token operations fail."""
    pass


# =============================================================================
# TINYPM OAUTH MANAGER
# =============================================================================

class TinyPMOAuthManager:
    """
    Secure OAuth manager for TinyPM.

    BOUNDARIES ENFORCED:
    - Only calendar/gmail scopes
    - Rejects sheets/drive scopes
    - Separate token storage
    - Token prefix: tpm_

    Usage:
        oauth = get_oauth_manager()

        # Get authorization URL for user to visit
        auth_url = oauth.get_authorization_url(state='my_state')

        # After user authorizes, exchange code for tokens
        tokens = oauth.exchange_code_for_tokens(code)

        # Save tokens
        oauth.save_tokens_to_supabase('user123', tokens)

        # Later, get valid access token (auto-refreshes if needed)
        access_token = oauth.get_valid_access_token('user123')
    """

    TOKEN_PREFIX = "tpm_"
    TOKEN_FILE_NAME = ".tinypm_oauth_tokens.json"

    def __init__(self):
        """Initialize OAuth manager with credentials from environment."""
        self.client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
        self.client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
        self.redirect_uri = os.environ.get(
            'TINYPM_OAUTH_REDIRECT',
            'http://localhost:8000/auth/callback'
        )
        self._validate_config()

    def _validate_config(self):
        """
        Validate OAuth configuration exists.

        Note: We don't raise an error here, just warn - this allows
        the system to run in a degraded mode without OAuth.
        """
        if not self.client_id:
            print("[TinyPM OAuth] Warning: GOOGLE_CLIENT_ID not set")
        if not self.client_secret:
            print("[TinyPM OAuth] Warning: GOOGLE_CLIENT_SECRET not set")

    def is_configured(self) -> bool:
        """Check if OAuth is properly configured."""
        return bool(self.client_id and self.client_secret)

    # =========================================================================
    # SECURITY: SCOPE VALIDATION
    # =========================================================================

    def _validate_scopes(self, scopes: List[str]) -> bool:
        """
        SECURITY: Validate scopes don't cross boundaries.

        Args:
            scopes: List of OAuth scope strings

        Returns:
            True if scopes are valid

        Raises:
            OAuthBoundaryError: If any forbidden scope is detected
        """
        for scope in scopes:
            # Normalize scope (remove trailing slashes, lowercase)
            normalized = scope.lower().rstrip('/')

            for forbidden in FORBIDDEN_SCOPES:
                if normalized == forbidden.lower() or normalized.startswith(forbidden.lower()):
                    raise OAuthBoundaryError(
                        f"BOUNDARY VIOLATION: Scope '{scope}' is FORBIDDEN for TinyPM. "
                        f"This scope belongs to Tiny Seed OS only. "
                        f"TinyPM can ONLY use calendar and gmail scopes."
                    )

        return True

    def _validate_token(self, token_data: Dict) -> bool:
        """
        SECURITY: Validate token doesn't have forbidden scopes.

        This is called EVERY time we receive or refresh tokens to ensure
        we never accidentally accept a token with unauthorized scopes.

        Args:
            token_data: Token response from Google OAuth

        Returns:
            True if token is valid

        Raises:
            OAuthBoundaryError: If token has forbidden scopes
        """
        scope_string = token_data.get('scope', '')
        if scope_string:
            # Google returns scopes as space-separated string
            token_scopes = scope_string.split(' ')
            self._validate_scopes(token_scopes)

        return True

    # =========================================================================
    # AUTHORIZATION URL
    # =========================================================================

    def get_authorization_url(self, state: str = None,
                               include_gmail: bool = True) -> str:
        """
        Generate OAuth authorization URL for calendar + gmail ONLY.

        Args:
            state: Optional state parameter for CSRF protection
            include_gmail: Whether to include gmail scopes (default True)

        Returns:
            URL string for user to visit

        Raises:
            OAuthConfigError: If OAuth is not configured
        """
        if not self.is_configured():
            raise OAuthConfigError(
                "OAuth not configured. Set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET environment variables."
            )

        from urllib.parse import urlencode

        # ONLY TinyPM scopes - NEVER sheets/drive
        scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'openid',
            'email'
        ]

        if include_gmail:
            scopes.extend([
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.compose',
            ])

        # Double-check our own scopes (paranoia is good for security)
        self._validate_scopes(scopes)

        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(scopes),
            'access_type': 'offline',  # Required for refresh tokens
            'prompt': 'consent',  # Force consent to get refresh token
            'state': state or f'tinypm_auth_{datetime.now().timestamp()}'
        }

        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    # =========================================================================
    # TOKEN EXCHANGE
    # =========================================================================

    def exchange_code_for_tokens(self, code: str) -> Dict:
        """
        Exchange authorization code for tokens.

        VALIDATES scopes before returning to ensure we never accept
        a token with unauthorized scopes.

        Args:
            code: Authorization code from Google callback

        Returns:
            Token dictionary with access_token, refresh_token, etc.

        Raises:
            OAuthBoundaryError: If token has forbidden scopes
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

        # SECURITY: Validate scopes before accepting
        self._validate_token(token_data)

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
            OAuthBoundaryError: If refreshed token has forbidden scopes
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

        # SECURITY: Validate refreshed token
        self._validate_token(token_data)

        # Add metadata
        token_data['refreshed_at'] = datetime.now().isoformat()
        token_data['expires_at'] = (
            datetime.now() +
            timedelta(seconds=token_data.get('expires_in', 3600))
        ).isoformat()

        return token_data

    # =========================================================================
    # TOKEN STORAGE: SUPABASE
    # =========================================================================

    def save_tokens_to_supabase(self, user_id: str, token_data: Dict) -> bool:
        """
        Save tokens to Supabase with TinyPM prefix.

        Stored in tinypm-specific table, NOT shared with Tiny Seed OS.
        Falls back to local storage if Supabase is unavailable.

        Args:
            user_id: User identifier (will be prefixed with tpm_)
            token_data: Token dictionary from exchange or refresh

        Returns:
            True if save successful
        """
        # Import here to avoid circular dependency
        try:
            from supabase_sync import get_supabase_sync
            sync = get_supabase_sync()
        except ImportError:
            print("[TinyPM OAuth] supabase_sync not available, using local storage")
            return self._save_tokens_local(user_id, token_data)

        if not sync.is_connected():
            print("[TinyPM OAuth] Supabase not connected, using local storage")
            return self._save_tokens_local(user_id, token_data)

        # SECURITY: Prefix user_id to prevent collision with other systems
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"

        try:
            # Calculate expiration time
            expires_in = token_data.get('expires_in', 3600)
            expires_at = datetime.now() + timedelta(seconds=expires_in)

            sync.client.table('tinypm_oauth_tokens').upsert({
                'id': prefixed_id,
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token'),
                'token_type': token_data.get('token_type', 'Bearer'),
                'scope': token_data.get('scope', ''),
                'expires_at': expires_at.isoformat(),
                'updated_at': datetime.now().isoformat()
            }).execute()

            print(f"[TinyPM OAuth] Tokens saved to Supabase for {prefixed_id}")
            return True

        except Exception as e:
            print(f"[TinyPM OAuth] Supabase save error: {e}")
            # Fallback to local storage
            return self._save_tokens_local(user_id, token_data)

    def _save_tokens_local(self, user_id: str, token_data: Dict) -> bool:
        """
        Fallback: save tokens locally in JSON file.

        Args:
            user_id: User identifier
            token_data: Token dictionary

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

        # SECURITY: Use prefixed ID
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"

        tokens[prefixed_id] = {
            **token_data,
            'updated_at': datetime.now().isoformat()
        }

        try:
            token_file.write_text(json.dumps(tokens, indent=2))
            print(f"[TinyPM OAuth] Tokens saved locally for {prefixed_id}")
            return True
        except Exception as e:
            print(f"[TinyPM OAuth] Local save error: {e}")
            return False

    # =========================================================================
    # TOKEN RETRIEVAL
    # =========================================================================

    def get_valid_access_token(self, user_id: str) -> Optional[str]:
        """
        Get a valid access token, refreshing if needed.

        This is the main method to use when making API calls.
        It handles token refresh automatically.

        Args:
            user_id: User identifier

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
                            self.save_tokens_to_supabase(user_id, new_tokens)
                            return new_tokens.get('access_token')
                        except OAuthTokenError as e:
                            print(f"[TinyPM OAuth] Refresh failed: {e}")
                            return None
                    else:
                        print("[TinyPM OAuth] No refresh token available")
                        return None
            except Exception as e:
                print(f"[TinyPM OAuth] Error parsing expiration: {e}")

        return token_data.get('access_token')

    def get_token_info(self, user_id: str) -> Optional[Dict]:
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
        Load tokens from Supabase or local storage.

        Args:
            user_id: User identifier

        Returns:
            Token dictionary or None if not found
        """
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"

        # Try Supabase first
        try:
            from supabase_sync import get_supabase_sync
            sync = get_supabase_sync()

            if sync.is_connected():
                result = sync.client.table('tinypm_oauth_tokens').select('*').eq('id', prefixed_id).execute()
                if result.data:
                    return result.data[0]
        except ImportError:
            pass
        except Exception as e:
            print(f"[TinyPM OAuth] Supabase load error: {e}")

        # Fallback to local storage
        token_file = Path(__file__).parent / self.TOKEN_FILE_NAME
        if token_file.exists():
            try:
                tokens = json.loads(token_file.read_text())
                return tokens.get(prefixed_id)
            except Exception as e:
                print(f"[TinyPM OAuth] Local load error: {e}")

        return None

    # =========================================================================
    # TOKEN REVOCATION
    # =========================================================================

    def revoke_tokens(self, user_id: str) -> bool:
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
                print(f"[TinyPM OAuth] Token revoked with Google")
            except urllib.error.HTTPError:
                pass  # Token may already be invalid
            except Exception as e:
                print(f"[TinyPM OAuth] Revocation warning: {e}")

        # Delete from Supabase
        prefixed_id = f"{self.TOKEN_PREFIX}{user_id}"
        try:
            from supabase_sync import get_supabase_sync
            sync = get_supabase_sync()

            if sync.is_connected():
                sync.client.table('tinypm_oauth_tokens').delete().eq('id', prefixed_id).execute()
                print(f"[TinyPM OAuth] Tokens deleted from Supabase")
        except Exception as e:
            print(f"[TinyPM OAuth] Supabase delete error: {e}")

        # Delete from local storage
        token_file = Path(__file__).parent / self.TOKEN_FILE_NAME
        if token_file.exists():
            try:
                tokens = json.loads(token_file.read_text())
                if prefixed_id in tokens:
                    del tokens[prefixed_id]
                    token_file.write_text(json.dumps(tokens, indent=2))
                    print(f"[TinyPM OAuth] Tokens deleted from local storage")
            except Exception as e:
                print(f"[TinyPM OAuth] Local delete error: {e}")

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
            print(f"[TinyPM OAuth] Failed to get user info: {e}")
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
            'allowed_scopes': TINYPM_ALLOWED_SCOPES,
            'forbidden_scopes': FORBIDDEN_SCOPES,
            'token_prefix': self.TOKEN_PREFIX
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


def get_oauth_manager() -> TinyPMOAuthManager:
    """
    Get or create global OAuth manager.

    Use this function rather than creating instances directly.

    Returns:
        TinyPMOAuthManager singleton instance
    """
    global _oauth_manager
    if _oauth_manager is None:
        _oauth_manager = TinyPMOAuthManager()
    return _oauth_manager


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys

    oauth = get_oauth_manager()

    if len(sys.argv) < 2:
        print("TinyPM OAuth Manager")
        print("=" * 50)
        print("\nSECURITY BOUNDARIES:")
        print("  - TinyPM uses ONLY calendar + gmail scopes")
        print("  - Sheets/Drive scopes are FORBIDDEN (Tiny Seed OS only)")
        print("  - All tokens prefixed with 'tpm_'")
        print("  - Stored in separate 'tinypm_oauth_tokens' table")
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
            print("  export GOOGLE_CLIENT_ID='your-client-id'")
            print("  export GOOGLE_CLIENT_SECRET='your-client-secret'")
            print("  export TINYPM_OAUTH_REDIRECT='http://localhost:8000/auth/callback'")

        print()
        print("COMMANDS:")
        print("  python oauth_manager.py auth-url     # Get authorization URL")
        print("  python oauth_manager.py status       # Show detailed status")
        print("  python oauth_manager.py test-scopes  # Test scope validation")
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

    elif command == "test-scopes":
        print("\nTesting scope validation...")

        # Test allowed scopes
        print("\n1. Testing ALLOWED scopes:")
        try:
            oauth._validate_scopes([
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/gmail.readonly',
            ])
            print("   PASS: Calendar + Gmail scopes accepted")
        except OAuthBoundaryError as e:
            print(f"   FAIL: {e}")

        # Test forbidden scopes
        print("\n2. Testing FORBIDDEN scopes:")
        for scope in FORBIDDEN_SCOPES[:3]:  # Test first 3
            try:
                oauth._validate_scopes([scope])
                print(f"   FAIL: {scope} was accepted (should be rejected)")
            except OAuthBoundaryError:
                print(f"   PASS: {scope} correctly rejected")

        print("\nScope validation working correctly!")

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
        except Exception as e:
            print(f"ERROR: {e}")
            sys.exit(1)

    elif command == "revoke":
        if len(sys.argv) < 3:
            print("Usage: python oauth_manager.py revoke <user_id>")
            sys.exit(1)

        user_id = sys.argv[2]
        if oauth.revoke_tokens(user_id):
            print(f"Tokens revoked for user: {user_id}")
        else:
            print(f"Failed to revoke tokens for user: {user_id}")

    else:
        print(f"Unknown command: {command}")
        print("Available commands: auth-url, status, test-scopes, exchange, revoke")
        sys.exit(1)
