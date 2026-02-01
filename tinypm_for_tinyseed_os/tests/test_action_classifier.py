#!/usr/bin/env python3
"""
Tests for ActionClassifier - Security Gate for TinyPM Skills
============================================================

Critical tests to verify:
1. "all" is NOT in DANGEROUS_KEYWORDS (caused 60%+ false positives)
2. Word boundary matching prevents substring false positives
3. Legitimate skills are not incorrectly blocked

Created: 2026-01-30
Reason: Fix for critical bug where "show all tasks" was blocked as DANGEROUS

Run with: python -m pytest tests/test_action_classifier.py -v
Or standalone: python tests/test_action_classifier.py
"""

import unittest
import sys
from pathlib import Path

# Setup path for standalone execution
APP_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(APP_DIR))

from skills import (
    ActionClassifier,
    TinyPMSkill,
    RiskLevel,
    SkillCategory,
    SkillExecutionRequest,
    ExecutionStatus,
    SkillExecutionResult,
)


class MockReadOnlySkill(TinyPMSkill):
    """Mock skill for testing - READ_ONLY level."""
    name = "list_all_tasks"
    description = "List all tasks from the board"
    risk_level = RiskLevel.READ_ONLY
    category = SkillCategory.TASK
    triggers = ["show all tasks", "list all tasks", "get all tasks"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={"tasks": []})


class MockReadAllEmailsSkill(TinyPMSkill):
    """Mock skill for testing - reading all emails."""
    name = "read_all_emails"
    description = "Read all emails from inbox"
    risk_level = RiskLevel.READ_ONLY
    category = SkillCategory.COMMUNICATION
    triggers = ["show all emails", "list all emails", "get all messages"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={"emails": []})


class MockCalendarAllEventsSkill(TinyPMSkill):
    """Mock skill for testing - getting all calendar events."""
    name = "get_all_calendar_events"
    description = "Retrieve all calendar events for the day"
    risk_level = RiskLevel.READ_ONLY
    category = SkillCategory.CALENDAR
    triggers = ["show all events", "get all meetings", "list all appointments"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={"events": []})


class MockDeleteSkill(TinyPMSkill):
    """Mock skill for testing - actually dangerous."""
    name = "delete_records"
    description = "Delete records from the database"
    risk_level = RiskLevel.INTERNAL
    category = SkillCategory.SYSTEM
    triggers = ["delete records", "remove data"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={})


class MockInstallSkill(TinyPMSkill):
    """Mock skill for testing - word boundary check with 'all' substring."""
    name = "install_package"
    description = "Install a new package or plugin"
    risk_level = RiskLevel.INTERNAL
    category = SkillCategory.SYSTEM
    triggers = ["install package", "add plugin"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={})


class MockOverallReportSkill(TinyPMSkill):
    """Mock skill for testing - word boundary check with 'all' substring."""
    name = "overall_performance_report"
    description = "Generate an overall performance report"
    risk_level = RiskLevel.READ_ONLY
    category = SkillCategory.ANALYTICS
    triggers = ["overall report", "generate performance report"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={})


class MockSendEmailSkill(TinyPMSkill):
    """Mock skill for testing - actually needs EXTERNAL."""
    name = "send_email"
    description = "Send an email to someone"
    risk_level = RiskLevel.READ_ONLY  # Deliberately wrong to test escalation
    category = SkillCategory.COMMUNICATION
    triggers = ["send email", "email someone"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={})


class MockBulkDeleteSkill(TinyPMSkill):
    """Mock skill for testing - actually dangerous."""
    name = "bulk_delete"
    description = "Bulk delete multiple records"
    risk_level = RiskLevel.INTERNAL
    category = SkillCategory.SYSTEM
    triggers = ["bulk delete", "mass remove"]

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        return self.success_result(request, data={})


class TestActionClassifierAllKeyword(unittest.TestCase):
    """Tests specifically for the 'all' keyword bug fix."""

    def setUp(self):
        self.classifier = ActionClassifier()

    def test_all_not_in_dangerous_keywords(self):
        """CRITICAL: 'all' should NOT be in DANGEROUS_KEYWORDS."""
        self.assertNotIn(
            "all",
            ActionClassifier.DANGEROUS_KEYWORDS,
            "CRITICAL BUG: 'all' should NOT be in DANGEROUS_KEYWORDS - it causes 60%+ false positives"
        )

    def test_show_all_tasks_not_dangerous(self):
        """'list_all_tasks' skill should remain READ_ONLY, not escalate to DANGEROUS."""
        skill = MockReadOnlySkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_001",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.READ_ONLY,
            f"'list_all_tasks' should be READ_ONLY, got {classification.risk_level.value}. "
            "This is the critical bug - 'all' in the name should not escalate to DANGEROUS."
        )
        self.assertTrue(classification.auto_approve)

    def test_read_all_emails_not_dangerous(self):
        """'read_all_emails' skill should remain READ_ONLY."""
        skill = MockReadAllEmailsSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_002",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.READ_ONLY,
            f"'read_all_emails' should be READ_ONLY, got {classification.risk_level.value}"
        )

    def test_get_all_calendar_events_not_dangerous(self):
        """'get_all_calendar_events' skill should remain READ_ONLY."""
        skill = MockCalendarAllEventsSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_003",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.READ_ONLY,
            f"'get_all_calendar_events' should be READ_ONLY, got {classification.risk_level.value}"
        )


class TestWordBoundaryMatching(unittest.TestCase):
    """Tests for word boundary matching to prevent substring false positives."""

    def setUp(self):
        self.classifier = ActionClassifier()

    def test_word_boundary_match_method_exists(self):
        """_word_boundary_match should be a class method."""
        self.assertTrue(
            hasattr(ActionClassifier, '_word_boundary_match'),
            "ActionClassifier should have _word_boundary_match method"
        )

    def test_word_boundary_exact_match(self):
        """Should match exact word."""
        self.assertTrue(
            ActionClassifier._word_boundary_match("delete", "delete this record")
        )

    def test_word_boundary_no_match_substring(self):
        """Should NOT match when keyword is substring of another word."""
        # "all" should not match inside "install"
        self.assertFalse(
            ActionClassifier._word_boundary_match("all", "install package"),
            "'all' should not match inside 'install'"
        )

        # "all" should not match inside "overall"
        self.assertFalse(
            ActionClassifier._word_boundary_match("all", "overall report"),
            "'all' should not match inside 'overall'"
        )

        # "all" should not match inside "actually"
        self.assertFalse(
            ActionClassifier._word_boundary_match("all", "actually works"),
            "'all' should not match inside 'actually'"
        )

    def test_word_boundary_match_with_punctuation(self):
        """Should match word at boundaries with punctuation."""
        self.assertTrue(
            ActionClassifier._word_boundary_match("delete", "delete, remove, or update")
        )
        self.assertTrue(
            ActionClassifier._word_boundary_match("delete", "action: delete")
        )

    def test_install_skill_not_escalated(self):
        """'install_package' should NOT be escalated due to 'all' in 'install'."""
        skill = MockInstallSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_004",
        )

        classification = self.classifier.classify(skill, request)

        # Should stay at INTERNAL, not escalate to DANGEROUS
        self.assertEqual(
            classification.risk_level,
            RiskLevel.INTERNAL,
            f"'install_package' should be INTERNAL, got {classification.risk_level.value}. "
            "Word boundary matching should prevent 'all' from matching inside 'install'."
        )

    def test_overall_report_skill_not_escalated(self):
        """'overall_performance_report' should NOT be escalated."""
        skill = MockOverallReportSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_005",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.READ_ONLY,
            f"'overall_performance_report' should be READ_ONLY, got {classification.risk_level.value}"
        )


class TestLegitimateEscalation(unittest.TestCase):
    """Tests to ensure legitimate dangerous actions ARE still escalated."""

    def setUp(self):
        self.classifier = ActionClassifier()

    def test_delete_skill_escalated_to_dangerous(self):
        """Skills with 'delete' in name/description SHOULD escalate to DANGEROUS."""
        skill = MockDeleteSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_006",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.DANGEROUS,
            f"'delete_records' should be DANGEROUS, got {classification.risk_level.value}"
        )

    def test_send_email_escalated_to_external(self):
        """Skills with 'send' in name/description SHOULD escalate to EXTERNAL."""
        skill = MockSendEmailSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_007",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.EXTERNAL,
            f"'send_email' should be EXTERNAL, got {classification.risk_level.value}"
        )

    def test_bulk_delete_escalated_to_dangerous(self):
        """Skills with 'bulk' and 'delete' SHOULD escalate to DANGEROUS."""
        skill = MockBulkDeleteSkill()
        request = SkillExecutionRequest(
            skill_name=skill.name,
            parameters={},
            user_id="test_user",
            request_id="test_008",
        )

        classification = self.classifier.classify(skill, request)

        self.assertEqual(
            classification.risk_level,
            RiskLevel.DANGEROUS,
            f"'bulk_delete' should be DANGEROUS, got {classification.risk_level.value}"
        )

    def test_dangerous_keywords_still_present(self):
        """Verify that actual dangerous keywords are still in the set."""
        expected_keywords = {"delete", "remove", "destroy", "drop", "truncate",
                           "everyone", "mass", "bulk", "force"}

        for keyword in expected_keywords:
            self.assertIn(
                keyword,
                ActionClassifier.DANGEROUS_KEYWORDS,
                f"'{keyword}' should be in DANGEROUS_KEYWORDS"
            )

    def test_external_keywords_still_present(self):
        """Verify that external communication keywords are still in the set."""
        expected_keywords = {"send", "post", "publish", "share", "email", "notify",
                           "submit", "broadcast", "announce"}

        for keyword in expected_keywords:
            self.assertIn(
                keyword,
                ActionClassifier.EXTERNAL_KEYWORDS,
                f"'{keyword}' should be in EXTERNAL_KEYWORDS"
            )


class TestRealWorldScenarios(unittest.TestCase):
    """Integration tests for real-world skill invocations."""

    def setUp(self):
        self.classifier = ActionClassifier()

    def test_common_read_operations_not_blocked(self):
        """Common read operations should never be blocked."""
        read_only_skills = [
            ("list_all_tasks", "Show all tasks from the kanban board"),
            ("get_all_emails", "Retrieve all emails from inbox"),
            ("view_all_events", "View all calendar events for today"),
            ("show_all_contacts", "Display all contacts in the address book"),
            ("fetch_all_orders", "Fetch all orders from the database"),
        ]

        for skill_name, skill_desc in read_only_skills:
            # Create a mock skill dynamically
            skill = type(
                'DynamicTestSkill',
                (TinyPMSkill,),
                {
                    'name': skill_name,
                    'description': skill_desc,
                    'risk_level': RiskLevel.READ_ONLY,
                    'category': SkillCategory.TASK,
                    'execute': lambda self, req: self.success_result(req, data={}),
                }
            )()

            request = SkillExecutionRequest(
                skill_name=skill.name,
                parameters={},
                user_id="test_user",
                request_id=f"test_{skill_name}",
            )

            classification = self.classifier.classify(skill, request)

            self.assertEqual(
                classification.risk_level,
                RiskLevel.READ_ONLY,
                f"'{skill_name}' should be READ_ONLY, got {classification.risk_level.value}"
            )
            self.assertTrue(
                classification.auto_approve,
                f"'{skill_name}' should be auto-approved"
            )


if __name__ == "__main__":
    # Run tests with verbose output
    unittest.main(verbosity=2)
