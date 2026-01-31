# TinyPM Test Suite

This directory contains all tests for the TinyPM project.

## Test Structure

```
tests/
├── __init__.py              # Package initialization
├── conftest.py              # Shared pytest fixtures
├── README.md                # This file
├── test_mcp_server.py       # MCP server integration tests
├── test_mcp_session.py      # MCP client session management tests
├── test_multitenancy.py     # Row-Level Security tests
├── test_a2a_integration.py  # A2A protocol integration tests
└── test_action_classifier.py # Skills action classifier tests
```

## Running Tests

### Using pytest (Recommended)

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_mcp_server.py -v

# Run specific test class
python -m pytest tests/test_action_classifier.py::TestActionClassifierAllKeyword -v

# Run specific test method
python -m pytest tests/test_action_classifier.py::TestActionClassifierAllKeyword::test_all_not_in_dangerous_keywords -v

# Run with coverage
python -m pytest tests/ --cov=. --cov-report=html

# Run tests matching a pattern
python -m pytest tests/ -k "security" -v

# Run only fast tests (exclude slow ones)
python -m pytest tests/ -m "not slow" -v
```

### Running Tests Standalone

Each test file can also be run directly:

```bash
# From the tinypm directory
python tests/test_mcp_server.py
python tests/test_mcp_session.py
python tests/test_multitenancy.py
python tests/test_a2a_integration.py
python tests/test_action_classifier.py
```

## Test Categories

### MCP Server Tests (`test_mcp_server.py`)
Tests the Model Context Protocol server integration:
- Task creation, listing, and updating
- Agent status checking
- Memory store and retrieve operations
- Proactive brief generation
- Resource endpoints
- Predictive intent

### MCP Session Tests (`test_mcp_session.py`)
Tests MCP client session management:
- Session persistence across operations
- Session timeout configuration
- Keepalive mechanism
- Graceful disconnection
- Multi-server connections

### Multi-Tenancy Tests (`test_multitenancy.py`)
Security tests for Row-Level Security:
- User data isolation (User A cannot see User B's data)
- Tasks table isolation
- Memory table isolation
- OAuth tokens isolation (CRITICAL)
- User profiles isolation
- Unauthenticated access blocking
- Service role access

**Requires:** Supabase configuration (SUPABASE_URL, SUPABASE_SERVICE_KEY)

### A2A Integration Tests (`test_a2a_integration.py`)
Tests Agent-to-Agent protocol integration:
- Agent Card validation
- A2A server module components
- A2A client module components
- Web server endpoints
- Orchestrator integration
- Message routing logic
- Input sanitization

### Action Classifier Tests (`test_action_classifier.py`)
Tests the skills security gate:
- Dangerous keyword detection (with word boundary matching)
- Risk level escalation
- Auto-approve behavior
- External communication detection
- Real-world skill scenarios

## Test Markers

Tests are tagged with markers for selective running:

- `@pytest.mark.slow` - Long-running tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.security` - Security-related tests
- `@pytest.mark.requires_supabase` - Needs Supabase connection
- `@pytest.mark.requires_mcp` - Needs MCP server

Example:
```bash
# Run only security tests
python -m pytest tests/ -m security -v

# Skip tests requiring Supabase
python -m pytest tests/ -m "not requires_supabase" -v
```

## Fixtures (conftest.py)

Common fixtures available in all tests:

- `app_dir` - Path to the main application directory
- `temp_test_dir` - Temporary directory (auto-cleanup)
- `mock_user_id` - Unique test user ID
- `mock_request_id` - Unique test request ID
- `env_setup` - Loads environment variables
- `supabase_url` - Supabase URL from env
- `sample_task` - Sample task dictionary
- `sample_memory_entry` - Sample memory entry
- `sample_agent_card` - Sample A2A agent card
- `action_classifier` - ActionClassifier instance
- `skill_registry` - SkillRegistry instance

## Environment Variables

Some tests require environment variables:

```bash
# Required for multi-tenancy tests
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_KEY="your-service-key"
```

Or create a `.env` file in the tinypm directory.

## Writing New Tests

1. Create a new file named `test_*.py`
2. Import fixtures from conftest.py
3. Use descriptive test names: `test_<feature>_<scenario>_<expected_outcome>`
4. Add appropriate markers
5. Follow existing test patterns

Example:
```python
import pytest
from pathlib import Path
import sys

APP_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(APP_DIR))

class TestNewFeature:
    def test_feature_works(self, mock_user_id):
        # Test implementation
        assert True
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
test:
  script:
    - pip install pytest pytest-cov
    - python -m pytest tests/ -v --junitxml=report.xml --cov=. --cov-report=xml
  artifacts:
    reports:
      junit: report.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml
```

## Troubleshooting

### Import Errors
Make sure you're running from the tinypm directory:
```bash
cd /path/to/tinypm
python -m pytest tests/
```

### Supabase Connection Errors
Check your `.env` file has valid credentials.

### MCP Server Errors
Ensure MCP dependencies are installed:
```bash
pip install -r requirements_mcp.txt
```
