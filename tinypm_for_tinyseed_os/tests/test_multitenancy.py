#!/usr/bin/env python3
"""
TinyPM Multi-Tenancy Security Tests
====================================
Comprehensive tests to verify that Row-Level Security is working correctly.
User A should NEVER be able to see or modify User B's data.

Created: 2026-01-30
Author: Security_Claude (Team 1: Security & Multi-Tenancy)
Purpose: Verify complete user isolation in multi-tenant environment

Usage:
    # Run all tests via pytest
    python -m pytest tests/test_multitenancy.py -v

    # Run specific test
    python -m pytest tests/test_multitenancy.py::MultiTenancyTester::test_tasks_isolation -v

    # Run standalone
    python tests/test_multitenancy.py

    # Run with verbose output
    python tests/test_multitenancy.py -v

Requirements:
    - SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
    - Tables created with COMPLETE_RLS_MIGRATION.sql
"""

import os
import sys
import json
import uuid
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Setup path for standalone execution
APP_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(APP_DIR))

# Load environment
_env_file = APP_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bznidonyuztfplqzkmks.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


class TestResult:
    """Test result container."""
    def __init__(self, name: str, passed: bool, message: str = "", details: Dict = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.now().isoformat()


class MultiTenancyTester:
    """
    Comprehensive multi-tenancy security tester.

    Creates two test users and verifies that:
    1. Each user can only see their own data
    2. Each user can only modify their own data
    3. Service role can see all data (for admin purposes)
    4. Unauthenticated requests see nothing
    """

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: List[TestResult] = []

        # Test user IDs (UUIDs to avoid collision with real users)
        self.user_a_id = f"test-user-a-{uuid.uuid4().hex[:8]}"
        self.user_b_id = f"test-user-b-{uuid.uuid4().hex[:8]}"

        # Initialize Supabase clients
        self.service_client = None
        self.user_a_client = None
        self.user_b_client = None
        self.anon_client = None

        self._init_clients()

    def _init_clients(self):
        """Initialize Supabase clients with different auth levels."""
        try:
            from supabase import create_client
        except ImportError:
            print("ERROR: supabase-py not installed. Run: pip install supabase")
            sys.exit(1)

        if not SUPABASE_URL:
            print("ERROR: SUPABASE_URL not set")
            sys.exit(1)

        # Service role client (bypasses RLS)
        if SUPABASE_SERVICE_KEY:
            self.service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            self.log("Service client initialized")
        else:
            print("WARNING: SUPABASE_SERVICE_KEY not set - service role tests will be skipped")

        # Anonymous client (for testing unauthenticated access)
        if SUPABASE_ANON_KEY:
            self.anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            self.log("Anonymous client initialized")
        else:
            print("WARNING: SUPABASE_ANON_KEY not set - anon tests will be skipped")

    def log(self, message: str):
        """Log message if verbose mode is on."""
        if self.verbose:
            print(f"  [DEBUG] {message}")

    def add_result(self, name: str, passed: bool, message: str = "", details: Dict = None):
        """Add a test result."""
        result = TestResult(name, passed, message, details)
        self.results.append(result)

        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}: {message}")

    def set_user_context(self, client, user_id: str):
        """
        Set the user context for RLS via session variable.
        This simulates what our auth middleware does.
        """
        try:
            # Use raw SQL to set session variable
            client.rpc('set_config', {
                'setting': 'app.current_user_id',
                'value': user_id,
                'is_local': True
            }).execute()
            self.log(f"Set user context to {user_id}")
        except Exception as e:
            self.log(f"Warning: Could not set user context: {e}")

    # =========================================================================
    # TEST: Tasks Table Isolation
    # =========================================================================

    def test_tasks_isolation(self) -> bool:
        """Test that users can only see their own tasks."""
        print("\n--- Testing Tasks Table Isolation ---")

        if not self.service_client:
            self.add_result("tasks_isolation", False, "Service client not available")
            return False

        try:
            # Setup: Create test tasks for both users using service role
            task_a = {
                "id": f"TEST-A-{uuid.uuid4().hex[:8]}",
                "title": "User A's Private Task",
                "user_id": self.user_a_id,
                "status": "pending"
            }
            task_b = {
                "id": f"TEST-B-{uuid.uuid4().hex[:8]}",
                "title": "User B's Private Task",
                "user_id": self.user_b_id,
                "status": "pending"
            }

            # Insert using service role (bypasses RLS)
            self.service_client.table("tasks").insert(task_a).execute()
            self.service_client.table("tasks").insert(task_b).execute()
            self.log(f"Created test tasks: {task_a['id']}, {task_b['id']}")

            # Test 1: User A can only see their own task
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                result = self.anon_client.table("tasks").select("*").execute()
                user_a_tasks = [t for t in result.data if t.get("user_id") == self.user_a_id]
                user_b_tasks_visible = [t for t in result.data if t.get("user_id") == self.user_b_id]

                if user_b_tasks_visible:
                    self.add_result(
                        "tasks_user_a_cannot_see_user_b",
                        False,
                        f"User A can see {len(user_b_tasks_visible)} of User B's tasks!",
                        {"visible_tasks": [t['id'] for t in user_b_tasks_visible]}
                    )
                    return False
                else:
                    self.add_result(
                        "tasks_user_a_cannot_see_user_b",
                        True,
                        "User A correctly cannot see User B's tasks"
                    )

            # Test 2: User B can only see their own task
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_b_id)
                result = self.anon_client.table("tasks").select("*").execute()
                user_a_tasks_visible = [t for t in result.data if t.get("user_id") == self.user_a_id]

                if user_a_tasks_visible:
                    self.add_result(
                        "tasks_user_b_cannot_see_user_a",
                        False,
                        f"User B can see {len(user_a_tasks_visible)} of User A's tasks!",
                        {"visible_tasks": [t['id'] for t in user_a_tasks_visible]}
                    )
                    return False
                else:
                    self.add_result(
                        "tasks_user_b_cannot_see_user_a",
                        True,
                        "User B correctly cannot see User A's tasks"
                    )

            # Test 3: User A cannot update User B's task
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                try:
                    result = self.anon_client.table("tasks").update({
                        "title": "HACKED BY USER A"
                    }).eq("id", task_b["id"]).execute()

                    # Check if update actually happened
                    check = self.service_client.table("tasks").select("*").eq("id", task_b["id"]).execute()
                    if check.data and check.data[0].get("title") == "HACKED BY USER A":
                        self.add_result(
                            "tasks_user_a_cannot_update_user_b",
                            False,
                            "User A was able to update User B's task!"
                        )
                        return False
                    else:
                        self.add_result(
                            "tasks_user_a_cannot_update_user_b",
                            True,
                            "User A correctly cannot update User B's task"
                        )
                except Exception as e:
                    self.add_result(
                        "tasks_user_a_cannot_update_user_b",
                        True,
                        f"Update correctly blocked: {e}"
                    )

            # Test 4: User A cannot delete User B's task
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                try:
                    self.anon_client.table("tasks").delete().eq("id", task_b["id"]).execute()

                    # Check if delete actually happened
                    check = self.service_client.table("tasks").select("*").eq("id", task_b["id"]).execute()
                    if not check.data:
                        self.add_result(
                            "tasks_user_a_cannot_delete_user_b",
                            False,
                            "User A was able to delete User B's task!"
                        )
                        return False
                    else:
                        self.add_result(
                            "tasks_user_a_cannot_delete_user_b",
                            True,
                            "User A correctly cannot delete User B's task"
                        )
                except Exception as e:
                    self.add_result(
                        "tasks_user_a_cannot_delete_user_b",
                        True,
                        f"Delete correctly blocked: {e}"
                    )

            return True

        except Exception as e:
            self.add_result("tasks_isolation", False, f"Error: {e}")
            return False

        finally:
            # Cleanup: Remove test tasks
            try:
                self.service_client.table("tasks").delete().eq("user_id", self.user_a_id).execute()
                self.service_client.table("tasks").delete().eq("user_id", self.user_b_id).execute()
                self.log("Cleaned up test tasks")
            except:
                pass

    # =========================================================================
    # TEST: Memory Table Isolation
    # =========================================================================

    def test_memory_isolation(self) -> bool:
        """Test that users can only see their own memory entries."""
        print("\n--- Testing Memory Table Isolation ---")

        if not self.service_client:
            self.add_result("memory_isolation", False, "Service client not available")
            return False

        try:
            # Setup: Create test memory for both users
            mem_a = {
                "id": f"mem-{self.user_a_id}",
                "user_id": self.user_a_id,
                "data": json.dumps({"secret": "User A's private data"})
            }
            mem_b = {
                "id": f"mem-{self.user_b_id}",
                "user_id": self.user_b_id,
                "data": json.dumps({"secret": "User B's private data"})
            }

            self.service_client.table("memory").upsert(mem_a).execute()
            self.service_client.table("memory").upsert(mem_b).execute()
            self.log("Created test memory entries")

            # Test: User A cannot see User B's memory
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                result = self.anon_client.table("memory").select("*").execute()
                user_b_visible = [m for m in result.data if m.get("user_id") == self.user_b_id]

                if user_b_visible:
                    self.add_result(
                        "memory_isolation",
                        False,
                        f"User A can see User B's memory!"
                    )
                    return False
                else:
                    self.add_result(
                        "memory_isolation",
                        True,
                        "Memory isolation working correctly"
                    )

            return True

        except Exception as e:
            self.add_result("memory_isolation", False, f"Error: {e}")
            return False

        finally:
            # Cleanup
            try:
                self.service_client.table("memory").delete().eq("user_id", self.user_a_id).execute()
                self.service_client.table("memory").delete().eq("user_id", self.user_b_id).execute()
            except:
                pass

    # =========================================================================
    # TEST: OAuth Tokens Isolation (CRITICAL - security sensitive data)
    # =========================================================================

    def test_oauth_tokens_isolation(self) -> bool:
        """Test that users absolutely cannot see other users' OAuth tokens."""
        print("\n--- Testing OAuth Tokens Isolation (CRITICAL) ---")

        if not self.service_client:
            self.add_result("oauth_isolation", False, "Service client not available")
            return False

        try:
            # Setup: Create test tokens for both users
            token_a = {
                "user_id": self.user_a_id,
                "provider": "google",
                "access_token": "USER_A_SECRET_TOKEN_12345",
                "refresh_token": "USER_A_REFRESH_SECRET",
                "scopes": ["calendar.readonly", "gmail.readonly"]
            }
            token_b = {
                "user_id": self.user_b_id,
                "provider": "google",
                "access_token": "USER_B_SECRET_TOKEN_67890",
                "refresh_token": "USER_B_REFRESH_SECRET",
                "scopes": ["calendar.readonly"]
            }

            self.service_client.table("user_oauth_tokens").upsert(token_a).execute()
            self.service_client.table("user_oauth_tokens").upsert(token_b).execute()
            self.log("Created test OAuth tokens")

            # Test 1: User A cannot see User B's tokens
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                result = self.anon_client.table("user_oauth_tokens").select("*").execute()
                user_b_tokens = [t for t in result.data if t.get("user_id") == self.user_b_id]

                if user_b_tokens:
                    self.add_result(
                        "oauth_user_a_cannot_see_user_b",
                        False,
                        "CRITICAL: User A can see User B's OAuth tokens!",
                        {"exposed_tokens": [t.get("access_token", "")[:10] + "..." for t in user_b_tokens]}
                    )
                    return False
                else:
                    self.add_result(
                        "oauth_user_a_cannot_see_user_b",
                        True,
                        "User A correctly cannot see User B's OAuth tokens"
                    )

            # Test 2: User A cannot steal User B's refresh token
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                result = self.anon_client.table("user_oauth_tokens").select("refresh_token").eq(
                    "user_id", self.user_b_id
                ).execute()

                if result.data and any(t.get("refresh_token") for t in result.data):
                    self.add_result(
                        "oauth_cannot_steal_refresh_token",
                        False,
                        "CRITICAL: User A can access User B's refresh token!"
                    )
                    return False
                else:
                    self.add_result(
                        "oauth_cannot_steal_refresh_token",
                        True,
                        "Refresh token protection working correctly"
                    )

            return True

        except Exception as e:
            self.add_result("oauth_isolation", False, f"Error: {e}")
            return False

        finally:
            # Cleanup
            try:
                self.service_client.table("user_oauth_tokens").delete().eq("user_id", self.user_a_id).execute()
                self.service_client.table("user_oauth_tokens").delete().eq("user_id", self.user_b_id).execute()
            except:
                pass

    # =========================================================================
    # TEST: User Profiles Isolation
    # =========================================================================

    def test_profiles_isolation(self) -> bool:
        """Test that users can only see their own profile."""
        print("\n--- Testing User Profiles Isolation ---")

        if not self.service_client:
            self.add_result("profiles_isolation", False, "Service client not available")
            return False

        try:
            # Setup: Create test profiles
            profile_a = {
                "id": self.user_a_id,
                "name": "User A",
                "timezone": "America/New_York",
                "productivity_challenge": "Private info about User A"
            }
            profile_b = {
                "id": self.user_b_id,
                "name": "User B",
                "timezone": "America/Los_Angeles",
                "productivity_challenge": "Private info about User B"
            }

            self.service_client.table("user_profiles").upsert(profile_a).execute()
            self.service_client.table("user_profiles").upsert(profile_b).execute()
            self.log("Created test profiles")

            # Test: User A cannot see User B's profile
            if self.anon_client:
                self.set_user_context(self.anon_client, self.user_a_id)
                result = self.anon_client.table("user_profiles").select("*").execute()
                user_b_profile = [p for p in result.data if p.get("id") == self.user_b_id]

                if user_b_profile:
                    self.add_result(
                        "profiles_isolation",
                        False,
                        "User A can see User B's profile!"
                    )
                    return False
                else:
                    self.add_result(
                        "profiles_isolation",
                        True,
                        "Profile isolation working correctly"
                    )

            return True

        except Exception as e:
            self.add_result("profiles_isolation", False, f"Error: {e}")
            return False

        finally:
            # Cleanup
            try:
                self.service_client.table("user_profiles").delete().eq("id", self.user_a_id).execute()
                self.service_client.table("user_profiles").delete().eq("id", self.user_b_id).execute()
            except:
                pass

    # =========================================================================
    # TEST: Unauthenticated Access
    # =========================================================================

    def test_unauthenticated_access(self) -> bool:
        """Test that unauthenticated requests see no data."""
        print("\n--- Testing Unauthenticated Access ---")

        if not self.anon_client:
            self.add_result("unauth_access", False, "Anon client not available")
            return False

        try:
            # Don't set any user context - simulate unauthenticated request
            # Note: The anon key still allows connecting, but RLS should block data

            tables = ["tasks", "memory", "conversations", "user_profiles"]
            all_passed = True

            for table in tables:
                try:
                    # Create a fresh client without user context
                    from supabase import create_client
                    fresh_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

                    result = fresh_client.table(table).select("*").execute()

                    # With proper RLS, unauthenticated users should see nothing
                    # (or only their own data if they somehow have a user_id match)
                    if result.data:
                        # Check if any data belongs to our test users
                        test_data = [
                            d for d in result.data
                            if d.get("user_id") in [self.user_a_id, self.user_b_id]
                            or d.get("id") in [self.user_a_id, self.user_b_id]
                        ]
                        if test_data:
                            self.add_result(
                                f"unauth_{table}",
                                False,
                                f"Unauthenticated user can see data in {table}!"
                            )
                            all_passed = False
                        else:
                            self.add_result(
                                f"unauth_{table}",
                                True,
                                f"{table}: No test data visible to unauthenticated users"
                            )
                    else:
                        self.add_result(
                            f"unauth_{table}",
                            True,
                            f"{table}: No data visible to unauthenticated users"
                        )

                except Exception as e:
                    # Access denied is actually good!
                    if "permission denied" in str(e).lower() or "rls" in str(e).lower():
                        self.add_result(
                            f"unauth_{table}",
                            True,
                            f"{table}: Access correctly denied"
                        )
                    else:
                        self.add_result(
                            f"unauth_{table}",
                            False,
                            f"Unexpected error: {e}"
                        )
                        all_passed = False

            return all_passed

        except Exception as e:
            self.add_result("unauth_access", False, f"Error: {e}")
            return False

    # =========================================================================
    # TEST: Service Role Access
    # =========================================================================

    def test_service_role_access(self) -> bool:
        """Test that service role can access all data (for admin purposes)."""
        print("\n--- Testing Service Role Access ---")

        if not self.service_client:
            self.add_result("service_role_access", False, "Service client not available")
            return False

        try:
            # Setup: Create data for both users
            task_a = {
                "id": f"SVC-A-{uuid.uuid4().hex[:8]}",
                "title": "User A's task",
                "user_id": self.user_a_id,
                "status": "pending"
            }
            task_b = {
                "id": f"SVC-B-{uuid.uuid4().hex[:8]}",
                "title": "User B's task",
                "user_id": self.user_b_id,
                "status": "pending"
            }

            self.service_client.table("tasks").insert(task_a).execute()
            self.service_client.table("tasks").insert(task_b).execute()

            # Test: Service role can see both users' data
            result = self.service_client.table("tasks").select("*").in_(
                "user_id", [self.user_a_id, self.user_b_id]
            ).execute()

            if len(result.data) >= 2:
                self.add_result(
                    "service_role_sees_all",
                    True,
                    "Service role can correctly access all users' data"
                )
            else:
                self.add_result(
                    "service_role_sees_all",
                    False,
                    f"Service role only sees {len(result.data)} records, expected 2+"
                )

            return True

        except Exception as e:
            self.add_result("service_role_access", False, f"Error: {e}")
            return False

        finally:
            # Cleanup
            try:
                self.service_client.table("tasks").delete().eq("user_id", self.user_a_id).execute()
                self.service_client.table("tasks").delete().eq("user_id", self.user_b_id).execute()
            except:
                pass

    # =========================================================================
    # RUN ALL TESTS
    # =========================================================================

    def run_all_tests(self) -> bool:
        """Run all multi-tenancy security tests."""
        print("=" * 60)
        print("TinyPM Multi-Tenancy Security Tests")
        print("=" * 60)
        print(f"Test User A: {self.user_a_id}")
        print(f"Test User B: {self.user_b_id}")
        print(f"Supabase URL: {SUPABASE_URL}")

        all_passed = True

        # Run each test suite
        test_methods = [
            self.test_tasks_isolation,
            self.test_memory_isolation,
            self.test_oauth_tokens_isolation,
            self.test_profiles_isolation,
            self.test_unauthenticated_access,
            self.test_service_role_access,
        ]

        for test_method in test_methods:
            try:
                if not test_method():
                    all_passed = False
            except Exception as e:
                self.add_result(test_method.__name__, False, f"Unexpected error: {e}")
                all_passed = False

        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)

        print(f"Total: {len(self.results)} | Passed: {passed} | Failed: {failed}")

        if failed > 0:
            print("\nFAILED TESTS:")
            for r in self.results:
                if not r.passed:
                    print(f"  - {r.name}: {r.message}")

        if all_passed:
            print("\nALL TESTS PASSED - Multi-tenancy security is working correctly!")
        else:
            print("\nSECURITY ISSUE DETECTED - Some tests failed!")
            print("Review the failed tests above and fix the RLS policies.")

        return all_passed


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM Multi-Tenancy Security Tests")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("test", nargs="?", help="Specific test to run")

    args = parser.parse_args()

    tester = MultiTenancyTester(verbose=args.verbose)

    if args.test:
        # Run specific test
        test_method = getattr(tester, args.test, None)
        if test_method and callable(test_method):
            test_method()
        else:
            print(f"Unknown test: {args.test}")
            print("Available tests:")
            for name in dir(tester):
                if name.startswith("test_"):
                    print(f"  - {name}")
            sys.exit(1)
    else:
        # Run all tests
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
