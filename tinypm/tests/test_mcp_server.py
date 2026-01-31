#!/usr/bin/env python3
"""
Test script for TinyPM MCP Server.

Run with: python -m pytest tests/test_mcp_server.py -v
Or standalone: python tests/test_mcp_server.py
"""

import asyncio
import sys
from pathlib import Path

# Setup path for standalone execution
APP_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(APP_DIR))

# Import MCP tools
from mcp_server import (
    task_create,
    task_list,
    task_update,
    agent_get_status,
    research_get_validated_claims,
    predict_user_intent,
    get_proactive_brief,
    memory_store,
    memory_retrieve,
    memory_get_context,
    resource_all_tasks,
    resource_active_tasks,
    resource_memory_facts,
    mcp
)


async def run_tests():
    """Run MCP server tests."""
    print("=" * 60)
    print("TinyPM MCP Server Integration Tests")
    print("=" * 60)

    tests_passed = 0
    tests_failed = 0

    # Test 1: List tasks
    print("\n[TEST 1] task_list()")
    try:
        result = await task_list()
        assert "summary" in result, "Missing summary in task_list result"
        assert "tasks" in result, "Missing tasks in task_list result"
        print(f"  PASS - Found {result['summary']['total']} tasks")
        print(f"    Pending: {result['summary']['pending']}")
        print(f"    In Progress: {result['summary']['in_progress']}")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 2: Create task
    print("\n[TEST 2] task_create()")
    try:
        result = await task_create(
            title="MCP Test Task",
            description="This is a test task created via MCP",
            priority="low",
            tags=["test", "mcp"]
        )
        assert result["success"], f"Failed to create task: {result.get('error')}"
        task_id = result["task"]["id"]
        print(f"  PASS - Created task {task_id}")
        tests_passed += 1

        # Test 3: Update task
        print("\n[TEST 3] task_update()")
        try:
            update_result = await task_update(task_id, status="done")
            assert update_result["success"], f"Failed to update: {update_result.get('error')}"
            print(f"  PASS - Updated task {task_id} to done")
            tests_passed += 1
        except Exception as e:
            print(f"  FAIL - {e}")
            tests_failed += 1

    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 4: Agent status
    print("\n[TEST 4] agent_get_status()")
    try:
        result = await agent_get_status()
        assert "agents" in result, "Missing agents in status"
        assert "builder" in result["agents"], "Missing builder status"
        print(f"  PASS - Builder status: {result['agents']['builder']['status']}")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 5: Memory store/retrieve
    print("\n[TEST 5] memory_store() / memory_retrieve()")
    try:
        store_result = await memory_store("test_key", "test_value_from_mcp")
        assert store_result["success"], "Failed to store"

        retrieve_result = await memory_retrieve("test_key")
        assert retrieve_result["found"], "Key not found"
        assert retrieve_result["value"] == "test_value_from_mcp", "Value mismatch"
        print(f"  PASS - Stored and retrieved: {retrieve_result['value']}")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 6: Get proactive brief
    print("\n[TEST 6] get_proactive_brief()")
    try:
        result = await get_proactive_brief()
        assert "generated_at" in result, "Missing generated_at"
        assert "tasks" in result, "Missing tasks"
        assert "greeting" in result, "Missing greeting"
        print(f"  PASS - {result['greeting']}, {result['tasks']['pending']} pending tasks")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 7: Resource - all tasks
    print("\n[TEST 7] resource: board://tasks")
    try:
        result = await resource_all_tasks()
        import json
        tasks = json.loads(result)
        assert isinstance(tasks, list), "Resource should return list"
        print(f"  PASS - Resource returned {len(tasks)} tasks")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 8: Research validated claims
    print("\n[TEST 8] research_get_validated_claims()")
    try:
        result = await research_get_validated_claims(min_score=0.5)
        assert "total_validated" in result, "Missing total_validated"
        assert "claims" in result, "Missing claims"
        print(f"  PASS - Found {result['total_validated']} validated claims")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Test 9: Predictive intent
    print("\n[TEST 9] predict_user_intent()")
    try:
        result = await predict_user_intent()
        assert "timestamp" in result, "Missing timestamp"
        assert "suggestions" in result, "Missing suggestions"
        print(f"  PASS - Got {len(result['suggestions'])} suggestions")
        tests_passed += 1
    except Exception as e:
        print(f"  FAIL - {e}")
        tests_failed += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"TESTS COMPLETED: {tests_passed + tests_failed}")
    print(f"  PASSED: {tests_passed}")
    print(f"  FAILED: {tests_failed}")
    print("=" * 60)

    return tests_failed == 0


if __name__ == "__main__":
    print("\nMCP Server Info:")
    print(f"  Name: {mcp.name}")

    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
