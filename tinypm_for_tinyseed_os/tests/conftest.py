"""
TinyPM Test Configuration and Shared Fixtures
==============================================

This module provides pytest fixtures and configuration shared across all tests.

Fixtures:
- app_dir: Path to the main tinypm application directory
- temp_test_dir: Temporary directory for test files (auto-cleanup)
- mock_user_id: Sample user ID for testing
- mock_request_id: Sample request ID for testing
- env_setup: Loads environment variables from .env file
- async_client: Async HTTP client for API testing

Usage:
    def test_something(app_dir, mock_user_id):
        # Use fixtures directly as function arguments
        pass

Created: 2026-01-31
"""

import os
import sys
import json
import uuid
import tempfile
import shutil
from pathlib import Path
from typing import Generator, Dict, Any

import pytest

# =============================================================================
# PATH SETUP
# =============================================================================

# Add parent directory to path for imports
APP_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(APP_DIR))


# =============================================================================
# FIXTURES - Basic Setup
# =============================================================================

@pytest.fixture(scope="session")
def app_dir() -> Path:
    """Get the path to the main application directory."""
    return APP_DIR


@pytest.fixture
def temp_test_dir() -> Generator[Path, None, None]:
    """
    Create a temporary directory for test files.

    Automatically cleaned up after the test completes.
    """
    temp_dir = Path(tempfile.mkdtemp(prefix="tinypm_test_"))
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_user_id() -> str:
    """Generate a unique test user ID."""
    return f"test-user-{uuid.uuid4().hex[:8]}"


@pytest.fixture
def mock_request_id() -> str:
    """Generate a unique test request ID."""
    return f"test-req-{uuid.uuid4().hex[:12]}"


# =============================================================================
# FIXTURES - Environment
# =============================================================================

@pytest.fixture(scope="session")
def env_setup() -> Dict[str, str]:
    """
    Load environment variables from .env file.

    Returns dict of loaded variables for reference.
    """
    env_file = APP_DIR / ".env"
    loaded_vars = {}

    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip()
                os.environ.setdefault(key, val)
                loaded_vars[key] = val

    return loaded_vars


@pytest.fixture
def supabase_url(env_setup) -> str:
    """Get Supabase URL from environment."""
    return os.environ.get("SUPABASE_URL", "")


@pytest.fixture
def supabase_anon_key(env_setup) -> str:
    """Get Supabase anon key from environment."""
    return os.environ.get("SUPABASE_ANON_KEY", "")


@pytest.fixture
def supabase_service_key(env_setup) -> str:
    """Get Supabase service key from environment."""
    return os.environ.get("SUPABASE_SERVICE_KEY", "")


# =============================================================================
# FIXTURES - Mock Data
# =============================================================================

@pytest.fixture
def sample_task() -> Dict[str, Any]:
    """Create a sample task for testing."""
    return {
        "id": f"TASK-{uuid.uuid4().hex[:8].upper()}",
        "title": "Test Task",
        "description": "This is a test task for unit testing",
        "status": "pending",
        "priority": "medium",
        "tags": ["test", "automated"],
    }


@pytest.fixture
def sample_memory_entry() -> Dict[str, Any]:
    """Create a sample memory entry for testing."""
    return {
        "key": f"test_memory_{uuid.uuid4().hex[:8]}",
        "value": "Test memory value",
        "category": "test",
        "importance": "low",
    }


@pytest.fixture
def sample_agent_card() -> Dict[str, Any]:
    """Create a sample A2A agent card for testing."""
    return {
        "name": "test-agent",
        "description": "Test agent for unit testing",
        "version": "1.0.0",
        "url": "http://localhost:8000",
        "skills": [
            {
                "id": "test_skill",
                "name": "Test Skill",
                "description": "A test skill",
            }
        ],
        "capabilities": ["task_management"],
    }


# =============================================================================
# FIXTURES - Skills Testing
# =============================================================================

@pytest.fixture
def skill_execution_request(mock_user_id, mock_request_id) -> Dict[str, Any]:
    """Create a sample skill execution request."""
    from skills import SkillExecutionRequest

    return SkillExecutionRequest(
        skill_name="test_skill",
        parameters={},
        user_id=mock_user_id,
        request_id=mock_request_id,
    )


@pytest.fixture
def action_classifier():
    """Create an ActionClassifier instance for testing."""
    from skills import ActionClassifier
    return ActionClassifier()


@pytest.fixture
def skill_registry():
    """Create a fresh SkillRegistry for testing."""
    from skills import SkillRegistry
    # Note: SkillRegistry is a singleton, so we get the existing instance
    return SkillRegistry()


# =============================================================================
# ASYNC FIXTURES
# =============================================================================

@pytest.fixture
def event_loop():
    """Create an event loop for async tests."""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# PYTEST CONFIGURATION
# =============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "security: marks tests as security-related"
    )
    config.addinivalue_line(
        "markers", "requires_supabase: marks tests requiring Supabase connection"
    )
    config.addinivalue_line(
        "markers", "requires_mcp: marks tests requiring MCP server"
    )


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers based on test names.
    """
    for item in items:
        # Auto-mark tests based on file/function name
        if "multitenancy" in item.nodeid.lower():
            item.add_marker(pytest.mark.security)
            item.add_marker(pytest.mark.requires_supabase)

        if "mcp" in item.nodeid.lower():
            item.add_marker(pytest.mark.requires_mcp)

        if "a2a" in item.nodeid.lower():
            item.add_marker(pytest.mark.integration)

        if "action_classifier" in item.nodeid.lower():
            item.add_marker(pytest.mark.security)
