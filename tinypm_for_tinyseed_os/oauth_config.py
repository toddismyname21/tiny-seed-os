"""
TinyPM OAuth Configuration
==========================
Centralized OAuth configuration that reads from environment variables.

This module provides a single source of truth for OAuth settings,
supporting both development (localhost) and production deployments.

Usage:
    from oauth_config import get_oauth_config, get_redirect_uri

    config = get_oauth_config()
    redirect_uri = get_redirect_uri()

Created: 2026-01-30
Purpose: Production-ready OAuth configuration management
"""

import os
from typing import Dict, Optional
from urllib.parse import urlparse


def _load_env_file():
    """Load .env file if present (for local development)."""
    from pathlib import Path

    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                # Don't override existing env vars (platform vars take precedence)
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


# Load .env on import (safe to call multiple times)
_load_env_file()


# ============================================
# CONFIGURATION
# ============================================

def get_production_domain() -> Optional[str]:
    """
    Get the production domain from environment.

    Returns:
        Production domain URL or None if not set
    """
    domain = os.environ.get("PRODUCTION_DOMAIN", "")
    if domain:
        # Ensure no trailing slash
        return domain.rstrip("/")
    return None


def get_redirect_uri() -> str:
    """
    Get the OAuth redirect URI.

    Priority:
    1. GOOGLE_REDIRECT_URI environment variable
    2. PRODUCTION_DOMAIN + /oauth/callback
    3. Default localhost for development

    Returns:
        Full OAuth redirect URI
    """
    # Check explicit redirect URI first
    explicit_uri = os.environ.get("GOOGLE_REDIRECT_URI", "")
    if explicit_uri:
        return explicit_uri

    # Try to build from production domain
    prod_domain = get_production_domain()
    if prod_domain:
        return f"{prod_domain}/oauth/callback"

    # Default for local development
    port = os.environ.get("PORT") or os.environ.get("TINYPM_PORT") or "8000"
    return f"http://localhost:{port}/oauth/callback"


def get_oauth_config() -> Dict[str, str]:
    """
    Get complete OAuth configuration.

    Returns:
        Dictionary with all OAuth settings:
        - client_id: Google OAuth client ID
        - client_secret: Google OAuth client secret
        - redirect_uri: Callback URL
        - production_domain: Production domain (if set)
        - is_production: Whether running in production
        - scopes: List of OAuth scopes to request
    """
    redirect_uri = get_redirect_uri()
    prod_domain = get_production_domain()

    # Determine if we're in production based on redirect URI
    parsed = urlparse(redirect_uri)
    is_production = parsed.scheme == "https" and "localhost" not in parsed.netloc

    return {
        "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uri": redirect_uri,
        "production_domain": prod_domain,
        "is_production": is_production,
        "scopes": [
            # Calendar scopes
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
            # Gmail scopes
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.modify",
            # Identity scopes
            "openid",
            "email",
            "profile",
        ],
    }


def is_oauth_configured() -> bool:
    """
    Check if OAuth is properly configured.

    Returns:
        True if client ID and secret are set
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    return bool(client_id and client_secret)


def get_cors_origins() -> list:
    """
    Get allowed CORS origins.

    Returns list from CORS_ALLOWED_ORIGINS or defaults to production domain.
    """
    cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
    if cors_env:
        return [origin.strip() for origin in cors_env.split(",") if origin.strip()]

    # Default to production domain if set
    prod_domain = get_production_domain()
    if prod_domain:
        return [prod_domain]

    # Local development defaults
    return ["http://localhost:8000", "http://127.0.0.1:8000"]


def validate_config() -> Dict[str, bool]:
    """
    Validate OAuth configuration.

    Returns:
        Dictionary with validation results for each setting
    """
    config = get_oauth_config()

    return {
        "client_id_set": bool(config["client_id"]),
        "client_secret_set": bool(config["client_secret"]),
        "redirect_uri_valid": config["redirect_uri"].startswith(("http://", "https://")),
        "production_domain_set": bool(config["production_domain"]),
        "is_https": config["redirect_uri"].startswith("https://"),
        "ready_for_production": (
            bool(config["client_id"]) and
            bool(config["client_secret"]) and
            config["redirect_uri"].startswith("https://")
        ),
    }


def print_config_status():
    """Print OAuth configuration status for debugging."""
    config = get_oauth_config()
    validation = validate_config()

    print("\n" + "=" * 50)
    print("TinyPM OAuth Configuration Status")
    print("=" * 50)

    print(f"\nClient ID: {'[SET]' if validation['client_id_set'] else '[NOT SET]'}")
    print(f"Client Secret: {'[SET]' if validation['client_secret_set'] else '[NOT SET]'}")
    print(f"Redirect URI: {config['redirect_uri']}")
    print(f"Production Domain: {config['production_domain'] or '[NOT SET]'}")
    print(f"Is Production: {config['is_production']}")
    print(f"HTTPS Enabled: {validation['is_https']}")
    print(f"\nReady for Production: {'YES' if validation['ready_for_production'] else 'NO'}")

    if not validation['ready_for_production']:
        print("\nTo prepare for production:")
        if not validation['client_id_set']:
            print("  - Set GOOGLE_CLIENT_ID environment variable")
        if not validation['client_secret_set']:
            print("  - Set GOOGLE_CLIENT_SECRET environment variable")
        if not validation['is_https']:
            print("  - Set PRODUCTION_DOMAIN to your HTTPS domain")
            print("  - Or set GOOGLE_REDIRECT_URI to HTTPS callback URL")

    print("\n" + "=" * 50)


# ============================================
# CLI
# ============================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "status":
            print_config_status()

        elif cmd == "redirect-uri":
            print(get_redirect_uri())

        elif cmd == "validate":
            validation = validate_config()
            for key, value in validation.items():
                status = "OK" if value else "MISSING"
                print(f"  {key}: {status}")

            if validation['ready_for_production']:
                print("\nConfiguration is PRODUCTION READY")
                sys.exit(0)
            else:
                print("\nConfiguration is NOT ready for production")
                sys.exit(1)

        elif cmd == "json":
            import json
            print(json.dumps(get_oauth_config(), indent=2))

        else:
            print(f"Unknown command: {cmd}")
            print("Commands: status, redirect-uri, validate, json")
            sys.exit(1)
    else:
        print_config_status()
