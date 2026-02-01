#!/usr/bin/env python3
"""
Test script for Skills System API endpoints.

This tests the skills API both directly and via HTTP.

Usage:
    python3 test_skills_api.py              # Test directly
    python3 test_skills_api.py --http       # Test HTTP endpoints (server must be running)
"""

import json
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


def test_direct():
    """Test the Skills API directly."""
    print("=" * 60)
    print("Testing Skills API - Direct")
    print("=" * 60)

    from skills_api import SkillsAPI, SKILLS_AVAILABLE

    if not SKILLS_AVAILABLE:
        print("FAIL: Skills system not available")
        return False

    api = SkillsAPI("test_user")
    all_pass = True

    # Test 1: Get Skills
    print("\n[Test 1] GET /api/skills")
    result = api.get_skills()
    if result["success"] and result["skill_count"] > 0:
        print(f"  PASS: Found {result['skill_count']} skills")
        print(f"  Categories: {result['categories']}")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 2: Execute list_tasks (should work without OAuth)
    print("\n[Test 2] POST /api/skills/execute - list_tasks")
    result = api.execute_skill("list_tasks", {"status": "all", "limit": 5})
    if result["success"]:
        print(f"  PASS: Executed successfully, found {result['data'].get('count', 0)} tasks")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 3: Execute get_task_summary
    print("\n[Test 3] POST /api/skills/execute - get_task_summary")
    result = api.execute_skill("get_task_summary", {})
    if result["success"]:
        data = result["data"]
        print(f"  PASS: Total tasks: {data.get('total_tasks', 0)}, Completion: {data.get('completion_percentage', 0)}%")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 4: Parse Intent
    print("\n[Test 4] POST /api/skills/parse-intent")
    result = api.parse_intent("show me all pending tasks")
    if result["success"] and result["match_count"] > 0:
        best = result["matches"][0]
        print(f"  PASS: Matched '{best['skill_name']}' with confidence {best['confidence']:.2f}")
    else:
        print(f"  FAIL: {result.get('error', 'No matches')}")
        all_pass = False

    # Test 5: Pending Approvals
    print("\n[Test 5] GET /api/skills/pending-approvals")
    result = api.get_pending_approvals()
    if result["success"]:
        print(f"  PASS: {result['count']} pending approvals")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 6: Execute History
    print("\n[Test 6] GET /api/skills/history")
    result = api.get_history()
    if result["success"]:
        print(f"  PASS: {result['count']} history entries")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 7: Create a task (INTERNAL risk level - no approval needed)
    print("\n[Test 7] POST /api/skills/execute - create_task")
    result = api.execute_skill("create_task", {
        "title": "Skills API Test Task",
        "description": "Created by test_skills_api.py",
        "priority": "low",
        "role": "builder",
    })
    if result["success"]:
        task_id = result["data"].get("task_id")
        print(f"  PASS: Created task {task_id}")

        # Delete the test task
        print("\n[Test 8] POST /api/skills/execute - delete_task (EXTERNAL - may need approval)")
        result = api.execute_skill("delete_task", {"task_id": task_id, "reason": "Test cleanup"})
        if result["success"]:
            print(f"  PASS: Deleted task {task_id}")
        elif result.get("requires_approval"):
            print(f"  INFO: Task deletion requires approval (approval_id: {result.get('approval_request_id')})")
        else:
            print(f"  FAIL: {result.get('error', 'Unknown error')}")
            all_pass = False
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 9: Email skill (should gracefully fail without OAuth)
    print("\n[Test 9] POST /api/skills/execute - read_unread_emails (graceful degradation)")
    result = api.execute_skill("read_unread_emails", {"max_results": 5})
    if result["success"]:
        print(f"  PASS: Email skill worked (OAuth connected)")
    elif "not connected" in result.get("error", "").lower() or "not available" in result.get("error", "").lower():
        print(f"  PASS: Graceful failure - {result.get('error')}")
    else:
        print(f"  WARN: Unexpected error - {result.get('error')}")

    print("\n" + "=" * 60)
    print(f"Result: {'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")
    print("=" * 60)
    return all_pass


def test_http(base_url="http://localhost:8000"):
    """Test the Skills API via HTTP endpoints."""
    print("=" * 60)
    print(f"Testing Skills API - HTTP ({base_url})")
    print("=" * 60)

    all_pass = True

    def make_request(method, path, data=None):
        """Make HTTP request and return JSON response."""
        url = f"{base_url}{path}"
        headers = {"Content-Type": "application/json"}

        try:
            if method == "GET":
                req = Request(url)
            else:
                req = Request(url, data=json.dumps(data or {}).encode(), headers=headers, method=method)

            with urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except HTTPError as e:
            return {"error": f"HTTP {e.code}: {e.reason}"}
        except URLError as e:
            return {"error": f"Connection failed: {e.reason}"}
        except Exception as e:
            return {"error": str(e)}

    # Test 1: GET /api/skills
    print("\n[Test 1] GET /api/skills")
    result = make_request("GET", "/api/skills")
    if result.get("success") and result.get("skill_count", 0) > 0:
        print(f"  PASS: Found {result['skill_count']} skills")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 2: POST /api/skills/execute
    print("\n[Test 2] POST /api/skills/execute - list_tasks")
    result = make_request("POST", "/api/skills/execute", {
        "skill_name": "list_tasks",
        "parameters": {"status": "all", "limit": 3},
    })
    if result.get("success"):
        print(f"  PASS: Found {result['data'].get('count', 0)} tasks")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 3: POST /api/skills/parse-intent
    print("\n[Test 3] POST /api/skills/parse-intent")
    result = make_request("POST", "/api/skills/parse-intent", {
        "text": "show me all pending tasks",
    })
    if result.get("success") and result.get("match_count", 0) > 0:
        best = result["matches"][0]
        print(f"  PASS: Matched '{best['skill_name']}'")
    else:
        print(f"  FAIL: {result.get('error', 'No matches')}")
        all_pass = False

    # Test 4: GET /api/skills/pending-approvals
    print("\n[Test 4] GET /api/skills/pending-approvals")
    result = make_request("GET", "/api/skills/pending-approvals")
    if result.get("success"):
        print(f"  PASS: {result['count']} pending approvals")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    # Test 5: GET /api/skills/history
    print("\n[Test 5] GET /api/skills/history")
    result = make_request("GET", "/api/skills/history")
    if result.get("success"):
        print(f"  PASS: {result['count']} history entries")
    else:
        print(f"  FAIL: {result.get('error', 'Unknown error')}")
        all_pass = False

    print("\n" + "=" * 60)
    print(f"Result: {'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")
    print("=" * 60)
    return all_pass


def main():
    if "--http" in sys.argv:
        port = 8000
        if "--port" in sys.argv:
            idx = sys.argv.index("--port")
            if idx + 1 < len(sys.argv):
                port = int(sys.argv[idx + 1])
        test_http(f"http://localhost:{port}")
    else:
        test_direct()


if __name__ == "__main__":
    main()
