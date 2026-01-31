"""
TinyPM Tests Package
====================

This package contains all tests for the TinyPM project.

Test Categories:
- test_mcp_server.py: MCP server integration tests
- test_mcp_session.py: MCP client session management tests
- test_multitenancy.py: Row-Level Security and multi-tenant isolation tests
- test_a2a_integration.py: A2A protocol integration tests
- test_action_classifier.py: Skills action classifier security gate tests

Running Tests:
    # Run all tests
    python -m pytest tests/

    # Run specific test file
    python -m pytest tests/test_mcp_server.py

    # Run with verbose output
    python -m pytest tests/ -v

    # Run specific test class or method
    python -m pytest tests/test_action_classifier.py::TestActionClassifierAllKeyword -v

Created: 2026-01-31
"""
