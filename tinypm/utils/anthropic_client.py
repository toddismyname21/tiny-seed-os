"""
Anthropic Client Singleton for TinyPM
=====================================
Centralized Anthropic client initialization with lazy loading.

Usage:
    from utils import get_anthropic_client

    # Get the shared client instance
    client = get_anthropic_client()

    # Use it
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello!"}]
    )

Features:
- Singleton pattern (one client instance across all modules)
- Lazy initialization (only creates client when first needed)
- Automatic API key loading from environment
- Error handling for missing API key
"""

from typing import Optional, TYPE_CHECKING

# Only import for type checking to avoid import errors if anthropic not installed
if TYPE_CHECKING:
    import anthropic

# Singleton client instance
_client: Optional["anthropic.Anthropic"] = None
_async_client: Optional["anthropic.AsyncAnthropic"] = None


def get_anthropic_client(api_key: Optional[str] = None) -> "anthropic.Anthropic":
    """
    Get or create the singleton Anthropic client.

    Uses lazy initialization - the client is only created on first call.
    Subsequent calls return the same client instance.

    Args:
        api_key: Optional API key. If not provided, loads from environment.
                 Only used on first call (when creating the client).

    Returns:
        Anthropic client instance

    Raises:
        ImportError: If anthropic package is not installed
        ValueError: If no API key is available

    Examples:
        >>> client = get_anthropic_client()
        >>> response = client.messages.create(...)

        >>> # With explicit API key
        >>> client = get_anthropic_client(api_key="sk-ant-...")
    """
    global _client

    if _client is not None:
        return _client

    # Import here to catch ImportError gracefully
    try:
        import anthropic
    except ImportError:
        raise ImportError(
            "anthropic package is not installed. "
            "Install it with: pip install anthropic"
        )

    # Get API key
    if api_key is None:
        from .env_loader import get_env
        api_key = get_env("ANTHROPIC_API_KEY")

    if not api_key:
        raise ValueError(
            "No Anthropic API key found. "
            "Set ANTHROPIC_API_KEY environment variable or pass api_key parameter."
        )

    _client = anthropic.Anthropic(api_key=api_key)
    return _client


def get_async_anthropic_client(api_key: Optional[str] = None) -> "anthropic.AsyncAnthropic":
    """
    Get or create the singleton async Anthropic client.

    Uses lazy initialization - the client is only created on first call.
    Subsequent calls return the same client instance.

    Args:
        api_key: Optional API key. If not provided, loads from environment.
                 Only used on first call (when creating the client).

    Returns:
        AsyncAnthropic client instance

    Raises:
        ImportError: If anthropic package is not installed
        ValueError: If no API key is available

    Examples:
        >>> client = get_async_anthropic_client()
        >>> response = await client.messages.create(...)
    """
    global _async_client

    if _async_client is not None:
        return _async_client

    # Import here to catch ImportError gracefully
    try:
        import anthropic
    except ImportError:
        raise ImportError(
            "anthropic package is not installed. "
            "Install it with: pip install anthropic"
        )

    # Get API key
    if api_key is None:
        from .env_loader import get_env
        api_key = get_env("ANTHROPIC_API_KEY")

    if not api_key:
        raise ValueError(
            "No Anthropic API key found. "
            "Set ANTHROPIC_API_KEY environment variable or pass api_key parameter."
        )

    _async_client = anthropic.AsyncAnthropic(api_key=api_key)
    return _async_client


def reset_client() -> None:
    """
    Reset the singleton client(s).

    Useful for testing or when you need to reinitialize with a different API key.

    Examples:
        >>> reset_client()
        >>> client = get_anthropic_client(api_key="new-key")
    """
    global _client, _async_client
    _client = None
    _async_client = None


def create_message(
    content: str,
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 1024,
    system: Optional[str] = None,
    **kwargs
) -> str:
    """
    Convenience function to create a simple message and get the response text.

    This is a high-level helper for the common use case of sending a single
    message and getting the text response.

    Args:
        content: The user message content
        model: Model to use (default: claude-sonnet-4-20250514)
        max_tokens: Maximum tokens in response
        system: Optional system prompt
        **kwargs: Additional arguments passed to messages.create()

    Returns:
        The assistant's response text

    Examples:
        >>> response = create_message("What is 2+2?")
        '2+2 equals 4.'

        >>> response = create_message(
        ...     "Summarize this document",
        ...     system="You are a helpful assistant.",
        ...     max_tokens=500
        ... )
    """
    client = get_anthropic_client()

    messages = [{"role": "user", "content": content}]

    create_kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
        **kwargs
    }

    if system:
        create_kwargs["system"] = system

    response = client.messages.create(**create_kwargs)

    # Extract text from response
    if response.content and len(response.content) > 0:
        return response.content[0].text
    return ""


# Model constants for convenience
CLAUDE_OPUS = "claude-opus-4-20250514"
CLAUDE_SONNET = "claude-sonnet-4-20250514"
CLAUDE_HAIKU = "claude-3-5-haiku-20241022"
