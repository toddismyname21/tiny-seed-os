#!/usr/bin/env python3
"""
Thread Analyzer Module
======================

Deep conversation analysis module for the SMS Intelligence System.
Implements enterprise patterns from Gong.io and Salesforce Einstein.

Features:
- Hierarchical summarization for long conversation threads
- Relationship health scoring
- Commitment tracking and deadline detection
- Next-best-action predictions
- Sentiment trend analysis
- Proactive alert generation

Usage:
    from thread_analyzer import ThreadAnalyzer

    analyzer = ThreadAnalyzer(config)
    analysis = analyzer.analyze_thread(messages)
    health = analyzer.calculate_relationship_health(analysis)
    actions = analyzer.predict_next_actions(analysis)
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum

from anthropic import Anthropic

from config import SMSIntelligenceConfig, get_config


# ============================================================================
# DATA MODELS
# ============================================================================

class RelationshipHealth(Enum):
    """Relationship health levels"""
    EXCELLENT = "excellent"   # 80-100
    GOOD = "good"             # 60-79
    FAIR = "fair"             # 40-59
    NEEDS_ATTENTION = "needs_attention"  # 0-39


class ActionType(Enum):
    """Types of recommended actions"""
    SEND_FOLLOWUP = "send_followup"
    SCHEDULE_MEETING = "schedule_meeting"
    SEND_REMINDER = "send_reminder"
    ESCALATE = "escalate"
    WAIT = "wait"
    SEND_INFORMATION = "send_information"
    MAKE_COMMITMENT = "make_commitment"
    ASK_QUESTION = "ask_question"
    ACKNOWLEDGE = "acknowledge"
    APOLOGIZE = "apologize"


@dataclass
class Commitment:
    """Represents a commitment/promise made in conversation"""
    who: str                    # Who made the commitment ("me" or contact name)
    what: str                   # What was committed to
    when: Optional[str]         # When it should be done
    parsed_deadline: Optional[datetime]  # Parsed deadline if determinable
    status: str                 # "pending", "completed", "overdue", "unclear"
    confidence: float           # Confidence in extraction (0-1)
    source_message_timestamp: Optional[datetime]


@dataclass
class ThreadAnalysis:
    """Complete analysis of a conversation thread"""
    chat_id: str
    contact_name: str
    message_count: int
    date_range: Tuple[Optional[datetime], Optional[datetime]]

    # Summary
    summary: str
    relationship_context: str
    key_topics: List[str]

    # Sentiment
    overall_sentiment: str
    sentiment_trend: str  # "improving", "stable", "declining"
    notable_moments: List[str]

    # Commitments
    their_commitments: List[Commitment]
    my_commitments: List[Commitment]

    # Pending items
    unanswered_questions: List[str]
    unresolved_topics: List[str]
    action_items: List[Dict[str, Any]]

    # Communication patterns
    their_communication_style: str  # "formal", "casual", "brief", "detailed"
    response_expectations: str      # "quick", "relaxed", "unknown"
    best_times_to_reach: str

    # Predictions
    next_best_actions: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]

    # Metadata
    analyzed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "chat_id": self.chat_id,
            "contact_name": self.contact_name,
            "message_count": self.message_count,
            "date_range": {
                "start": self.date_range[0].isoformat() if self.date_range[0] else None,
                "end": self.date_range[1].isoformat() if self.date_range[1] else None,
            },
            "summary": self.summary,
            "relationship_context": self.relationship_context,
            "key_topics": self.key_topics,
            "sentiment": {
                "overall": self.overall_sentiment,
                "trend": self.sentiment_trend,
                "notable_moments": self.notable_moments,
            },
            "commitments": {
                "theirs": [
                    {
                        "who": c.who,
                        "what": c.what,
                        "when": c.when,
                        "status": c.status,
                        "confidence": c.confidence,
                    }
                    for c in self.their_commitments
                ],
                "mine": [
                    {
                        "who": c.who,
                        "what": c.what,
                        "when": c.when,
                        "status": c.status,
                        "confidence": c.confidence,
                    }
                    for c in self.my_commitments
                ],
            },
            "pending_items": {
                "unanswered_questions": self.unanswered_questions,
                "unresolved_topics": self.unresolved_topics,
                "action_items": self.action_items,
            },
            "communication_patterns": {
                "their_style": self.their_communication_style,
                "response_expectations": self.response_expectations,
                "best_times": self.best_times_to_reach,
            },
            "next_best_actions": self.next_best_actions,
            "alerts": self.alerts,
            "analyzed_at": self.analyzed_at.isoformat(),
        }


@dataclass
class RelationshipHealthScore:
    """Relationship health assessment"""
    total_score: float  # 0-100
    health_level: RelationshipHealth
    factor_breakdown: Dict[str, float]
    recommendations: List[str]
    insights: List[str]


# ============================================================================
# THREAD ANALYZER
# ============================================================================

class ThreadAnalyzer:
    """
    Deep conversation thread analyzer using Claude API.
    Implements hierarchical summarization and enterprise intelligence patterns.
    """

    def __init__(self, config: Optional[SMSIntelligenceConfig] = None):
        self.config = config or get_config()
        self.client = Anthropic(api_key=self.config.anthropic_api_key)
        self.logger = logging.getLogger("sms_intelligence.thread_analyzer")

    def _format_messages(self, messages: List[Any]) -> str:
        """Format messages for LLM analysis"""
        formatted = []
        for msg in messages:
            sender = "ME" if msg.is_from_me else msg.sender_name
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M") if msg.timestamp else "Unknown"
            formatted.append(f"[{timestamp}] {sender}: {msg.text}")
        return "\n".join(formatted)

    def analyze_thread(self, messages: List[Any], contact_name: str = "Contact") -> ThreadAnalysis:
        """
        Perform comprehensive analysis of a conversation thread.
        Uses hierarchical summarization for long threads.
        """
        if not messages:
            return self._empty_analysis(contact_name)

        # Determine contact name from messages
        for msg in messages:
            if not msg.is_from_me and msg.sender_name != "Unknown":
                contact_name = msg.sender_name
                break

        # Get chat ID
        chat_id = messages[0].chat_id if messages else "unknown"

        # Get date range
        timestamps = [m.timestamp for m in messages if m.timestamp]
        date_range = (min(timestamps), max(timestamps)) if timestamps else (None, None)

        # Use hierarchical summarization for long threads
        if len(messages) > self.config.analysis.deep_analysis_message_threshold:
            analysis_result = self._hierarchical_analysis(messages, contact_name)
        else:
            analysis_result = self._single_pass_analysis(messages, contact_name)

        # Build ThreadAnalysis object
        return ThreadAnalysis(
            chat_id=chat_id,
            contact_name=contact_name,
            message_count=len(messages),
            date_range=date_range,
            summary=analysis_result.get("summary", ""),
            relationship_context=analysis_result.get("relationship_context", ""),
            key_topics=analysis_result.get("key_topics", []),
            overall_sentiment=analysis_result.get("sentiment_analysis", {}).get("overall", "neutral"),
            sentiment_trend=analysis_result.get("sentiment_analysis", {}).get("trend", "stable"),
            notable_moments=analysis_result.get("sentiment_analysis", {}).get("notable_moments", []),
            their_commitments=self._parse_commitments(
                analysis_result.get("commitments", {}).get("their_commitments", []),
                contact_name
            ),
            my_commitments=self._parse_commitments(
                analysis_result.get("commitments", {}).get("my_commitments", []),
                "Me"
            ),
            unanswered_questions=analysis_result.get("pending_items", {}).get("unanswered_questions", []),
            unresolved_topics=analysis_result.get("pending_items", {}).get("unresolved_topics", []),
            action_items=analysis_result.get("pending_items", {}).get("action_items", []),
            their_communication_style=analysis_result.get("communication_patterns", {}).get("their_style", "unknown"),
            response_expectations=analysis_result.get("communication_patterns", {}).get("response_expectations", "unknown"),
            best_times_to_reach=analysis_result.get("communication_patterns", {}).get("best_times_to_reach", "unknown"),
            next_best_actions=analysis_result.get("next_best_actions", []),
            alerts=analysis_result.get("alerts", []),
        )

    def _single_pass_analysis(self, messages: List[Any], contact_name: str) -> Dict[str, Any]:
        """Analyze a shorter thread in a single API call"""
        conversation_text = self._format_messages(messages)

        prompt = f"""Perform comprehensive analysis of this conversation thread between me and {contact_name}.
Return ONLY valid JSON with no additional text.

CONVERSATION:
{conversation_text}

TODAY'S DATE: {datetime.now().strftime("%Y-%m-%d")}

Return this exact JSON structure:
{{
    "summary": "2-3 sentence summary of the entire conversation",
    "relationship_context": "Nature of the relationship based on conversation style and content",
    "key_topics": ["main topic 1", "main topic 2", "..."],
    "sentiment_analysis": {{
        "overall": "positive" | "neutral" | "negative",
        "trend": "improving" | "stable" | "declining",
        "notable_moments": ["any significant emotional moments or tone shifts"]
    }},
    "commitments": {{
        "their_commitments": [
            {{"what": "what they committed to", "when": "deadline if mentioned", "status": "pending|completed|unclear"}}
        ],
        "my_commitments": [
            {{"what": "what I committed to", "when": "deadline if mentioned", "status": "pending|completed|unclear"}}
        ]
    }},
    "pending_items": {{
        "unanswered_questions": ["questions that still need answers"],
        "unresolved_topics": ["topics that need follow-up"],
        "action_items": [
            {{"task": "specific action", "owner": "me|them", "priority": "high|medium|low"}}
        ]
    }},
    "communication_patterns": {{
        "their_style": "formal" | "casual" | "brief" | "detailed",
        "response_expectations": "quick" | "relaxed" | "unknown",
        "best_times_to_reach": "observed patterns or 'unknown'"
    }},
    "next_best_actions": [
        {{
            "action": "recommended action to take",
            "action_type": "send_followup|schedule_meeting|send_reminder|wait|send_information|ask_question|acknowledge",
            "timing": "immediate|within_1h|within_24h|this_week|no_rush",
            "reasoning": "why this action is recommended",
            "priority": "high|medium|low",
            "suggested_message": "optional draft message if applicable"
        }}
    ],
    "alerts": [
        {{
            "type": "overdue_commitment|relationship_risk|urgent_followup|missed_question",
            "message": "description of what needs attention",
            "urgency": "high|medium|low"
        }}
    ]
}}

Be thorough in extracting ALL commitments, questions, and action items.
For dates/times, interpret relative references (tomorrow, next week) based on today's date."""

        response = self.client.messages.create(
            model=self.config.llm.model_deep,
            max_tokens=self.config.llm.max_tokens_deep,
            temperature=self.config.llm.temperature_analysis,
            messages=[{"role": "user", "content": prompt}]
        )

        return self._parse_json_response(response.content[0].text)

    def _hierarchical_analysis(self, messages: List[Any], contact_name: str) -> Dict[str, Any]:
        """
        Hierarchical summarization for long conversation threads.
        Chunks the conversation, summarizes each chunk, then combines.
        """
        chunk_size = self.config.analysis.thread_chunk_size
        chunks = [messages[i:i + chunk_size] for i in range(0, len(messages), chunk_size)]

        self.logger.info(f"Hierarchical analysis: {len(messages)} messages in {len(chunks)} chunks")

        # Phase 1: Analyze each chunk
        chunk_summaries = []
        all_commitments = {"their_commitments": [], "my_commitments": []}
        all_questions = []
        all_action_items = []

        for i, chunk in enumerate(chunks):
            chunk_text = self._format_messages(chunk)

            prompt = f"""Analyze this segment ({i+1}/{len(chunks)}) of a conversation with {contact_name}.
Return ONLY valid JSON.

CONVERSATION SEGMENT:
{chunk_text}

Return:
{{
    "segment_summary": "brief summary of this segment",
    "topics": ["topics in this segment"],
    "sentiment": "positive|neutral|negative",
    "commitments": {{
        "their_commitments": [{{"what": "...", "when": "..."}}],
        "my_commitments": [{{"what": "...", "when": "..."}}]
    }},
    "questions_asked": ["any questions that may need follow-up"],
    "action_items": [{{"task": "...", "owner": "me|them"}}],
    "notable_moments": ["any significant events or tone changes"]
}}"""

            try:
                response = self.client.messages.create(
                    model=self.config.llm.model_standard,
                    max_tokens=800,
                    temperature=self.config.llm.temperature_analysis,
                    messages=[{"role": "user", "content": prompt}]
                )

                chunk_result = self._parse_json_response(response.content[0].text)
                chunk_summaries.append(chunk_result)

                # Aggregate commitments and questions
                if "commitments" in chunk_result:
                    all_commitments["their_commitments"].extend(
                        chunk_result["commitments"].get("their_commitments", [])
                    )
                    all_commitments["my_commitments"].extend(
                        chunk_result["commitments"].get("my_commitments", [])
                    )

                all_questions.extend(chunk_result.get("questions_asked", []))
                all_action_items.extend(chunk_result.get("action_items", []))

            except Exception as e:
                self.logger.error(f"Chunk {i+1} analysis failed: {e}")

        # Phase 2: Synthesize chunk summaries
        combined_summaries = "\n---\n".join([
            f"Segment {i+1}: {s.get('segment_summary', 'No summary')}\n"
            f"Topics: {', '.join(s.get('topics', []))}\n"
            f"Sentiment: {s.get('sentiment', 'unknown')}\n"
            f"Notable: {', '.join(s.get('notable_moments', []))}"
            for i, s in enumerate(chunk_summaries)
        ])

        synthesis_prompt = f"""Synthesize these conversation segment summaries into one cohesive analysis.
This is a conversation with {contact_name} spanning {len(messages)} messages.

SEGMENT SUMMARIES:
{combined_summaries}

AGGREGATED COMMITMENTS:
Their commitments: {json.dumps(all_commitments['their_commitments'][:10])}
My commitments: {json.dumps(all_commitments['my_commitments'][:10])}

QUESTIONS THAT MAY NEED FOLLOW-UP:
{json.dumps(all_questions[:10])}

TODAY'S DATE: {datetime.now().strftime("%Y-%m-%d")}

Return a complete analysis JSON:
{{
    "summary": "Comprehensive 3-4 sentence summary of the entire conversation history",
    "relationship_context": "Overall nature of this relationship",
    "key_topics": ["the most important recurring topics"],
    "sentiment_analysis": {{
        "overall": "positive|neutral|negative",
        "trend": "improving|stable|declining",
        "notable_moments": ["key emotional moments across all segments"]
    }},
    "commitments": {{
        "their_commitments": [{{"what": "...", "when": "...", "status": "pending|completed|unclear"}}],
        "my_commitments": [{{"what": "...", "when": "...", "status": "pending|completed|unclear"}}]
    }},
    "pending_items": {{
        "unanswered_questions": ["questions still needing answers"],
        "unresolved_topics": ["topics needing follow-up"],
        "action_items": [{{"task": "...", "owner": "me|them", "priority": "high|medium|low"}}]
    }},
    "communication_patterns": {{
        "their_style": "formal|casual|brief|detailed",
        "response_expectations": "quick|relaxed|unknown",
        "best_times_to_reach": "patterns observed or unknown"
    }},
    "next_best_actions": [
        {{
            "action": "recommended action",
            "action_type": "send_followup|schedule_meeting|send_reminder|wait|send_information|ask_question|acknowledge",
            "timing": "immediate|within_1h|within_24h|this_week|no_rush",
            "reasoning": "why",
            "priority": "high|medium|low"
        }}
    ],
    "alerts": [
        {{"type": "...", "message": "...", "urgency": "high|medium|low"}}
    ]
}}

Deduplicate and prioritize commitments and action items. Identify which questions are still unanswered."""

        try:
            response = self.client.messages.create(
                model=self.config.llm.model_deep,
                max_tokens=self.config.llm.max_tokens_deep,
                temperature=self.config.llm.temperature_analysis,
                messages=[{"role": "user", "content": synthesis_prompt}]
            )

            return self._parse_json_response(response.content[0].text)

        except Exception as e:
            self.logger.error(f"Synthesis failed: {e}")
            return {}

    def _parse_commitments(self, raw_commitments: List[Dict], who: str) -> List[Commitment]:
        """Parse raw commitment data into Commitment objects"""
        commitments = []
        for c in raw_commitments:
            commitments.append(Commitment(
                who=who,
                what=c.get("what", ""),
                when=c.get("when"),
                parsed_deadline=self._parse_deadline(c.get("when")),
                status=c.get("status", "unclear"),
                confidence=0.8,  # Default confidence
                source_message_timestamp=None,
            ))
        return commitments

    def _parse_deadline(self, when_str: Optional[str]) -> Optional[datetime]:
        """Attempt to parse a deadline string into a datetime"""
        if not when_str:
            return None

        when_lower = when_str.lower()
        now = datetime.now()

        # Simple relative date parsing
        if "today" in when_lower:
            return now.replace(hour=23, minute=59)
        elif "tomorrow" in when_lower:
            return (now + timedelta(days=1)).replace(hour=23, minute=59)
        elif "this week" in when_lower:
            days_until_friday = (4 - now.weekday()) % 7
            return (now + timedelta(days=days_until_friday)).replace(hour=23, minute=59)
        elif "next week" in when_lower:
            days_until_monday = (7 - now.weekday())
            return (now + timedelta(days=days_until_monday + 4)).replace(hour=23, minute=59)
        elif "end of month" in when_lower:
            if now.month == 12:
                return datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                return datetime(now.year, now.month + 1, 1) - timedelta(days=1)

        return None

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response"""
        try:
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            self.logger.warning(f"JSON parse error: {e}")
            return {}

    def _empty_analysis(self, contact_name: str) -> ThreadAnalysis:
        """Return empty analysis for empty message list"""
        return ThreadAnalysis(
            chat_id="unknown",
            contact_name=contact_name,
            message_count=0,
            date_range=(None, None),
            summary="No messages to analyze",
            relationship_context="Unknown",
            key_topics=[],
            overall_sentiment="neutral",
            sentiment_trend="stable",
            notable_moments=[],
            their_commitments=[],
            my_commitments=[],
            unanswered_questions=[],
            unresolved_topics=[],
            action_items=[],
            their_communication_style="unknown",
            response_expectations="unknown",
            best_times_to_reach="unknown",
            next_best_actions=[],
            alerts=[],
        )


# ============================================================================
# RELATIONSHIP HEALTH SCORER
# ============================================================================

class RelationshipHealthScorer:
    """
    Calculate relationship health scores based on multiple factors.
    Implements enterprise patterns from Introhive and relationship intelligence systems.
    """

    def __init__(self):
        self.logger = logging.getLogger("sms_intelligence.health_scorer")

        # Scoring weights (total = 100)
        self.weights = {
            "response_reciprocity": 20,
            "sentiment": 25,
            "engagement": 20,
            "commitment_fulfillment": 20,
            "conversation_depth": 15,
        }

    def calculate_health(
        self,
        thread_analysis: ThreadAnalysis,
        conversation_metrics: Optional[Dict[str, Any]] = None
    ) -> RelationshipHealthScore:
        """
        Calculate relationship health score from thread analysis.

        Args:
            thread_analysis: ThreadAnalysis from ThreadAnalyzer
            conversation_metrics: Optional additional metrics like response times

        Returns:
            RelationshipHealthScore with breakdown and recommendations
        """
        metrics = conversation_metrics or {}
        factors = {}
        insights = []

        # 1. Response Reciprocity (20 points)
        avg_their_response_hours = metrics.get("avg_their_response_hours", 12)
        avg_my_response_hours = metrics.get("avg_my_response_hours", 12)

        if max(avg_their_response_hours, avg_my_response_hours) > 0:
            response_balance = min(avg_their_response_hours, avg_my_response_hours) / max(avg_their_response_hours, avg_my_response_hours, 1)
        else:
            response_balance = 1.0

        factors["response_reciprocity"] = response_balance * self.weights["response_reciprocity"]

        if response_balance < 0.5:
            insights.append(f"Response time imbalance detected")

        # 2. Sentiment (25 points)
        sentiment_scores = {
            "positive": 22,
            "neutral": 15,
            "negative": 5,
        }
        trend_modifiers = {
            "improving": 3,
            "stable": 0,
            "declining": -5,
        }

        base_sentiment = sentiment_scores.get(thread_analysis.overall_sentiment, 15)
        trend_mod = trend_modifiers.get(thread_analysis.sentiment_trend, 0)
        factors["sentiment"] = max(0, min(self.weights["sentiment"], base_sentiment + trend_mod))

        if thread_analysis.sentiment_trend == "declining":
            insights.append("Sentiment has been declining recently")
        elif thread_analysis.sentiment_trend == "improving":
            insights.append("Relationship sentiment is improving")

        # 3. Engagement (20 points)
        messages_per_week = metrics.get("messages_per_week", thread_analysis.message_count / 4)

        if messages_per_week >= 10:
            factors["engagement"] = 20
            insights.append("High engagement level")
        elif messages_per_week >= 5:
            factors["engagement"] = 15
        elif messages_per_week >= 2:
            factors["engagement"] = 10
        elif messages_per_week >= 0.5:
            factors["engagement"] = 5
            insights.append("Low engagement - consider reaching out more often")
        else:
            factors["engagement"] = 2
            insights.append("Very low engagement - relationship may be going cold")

        # 4. Commitment Fulfillment (20 points)
        total_commitments = len(thread_analysis.my_commitments) + len(thread_analysis.their_commitments)
        completed_commitments = sum(
            1 for c in thread_analysis.my_commitments + thread_analysis.their_commitments
            if c.status == "completed"
        )
        overdue_commitments = sum(
            1 for c in thread_analysis.my_commitments + thread_analysis.their_commitments
            if c.status == "overdue"
        )

        if total_commitments > 0:
            fulfillment_rate = completed_commitments / total_commitments
            factors["commitment_fulfillment"] = fulfillment_rate * self.weights["commitment_fulfillment"]

            if overdue_commitments > 0:
                factors["commitment_fulfillment"] = max(0, factors["commitment_fulfillment"] - 5)
                insights.append(f"{overdue_commitments} overdue commitment(s) detected")
        else:
            factors["commitment_fulfillment"] = 15  # Neutral if no commitments

        # 5. Conversation Depth (15 points)
        topic_diversity = len(thread_analysis.key_topics)
        has_substantial_content = len(thread_analysis.summary) > 50

        depth_score = 0
        if topic_diversity >= 5:
            depth_score += 8
        elif topic_diversity >= 3:
            depth_score += 5
        else:
            depth_score += 3

        if has_substantial_content:
            depth_score += 7
        else:
            depth_score += 3

        factors["conversation_depth"] = min(self.weights["conversation_depth"], depth_score)

        # Calculate total score
        total_score = sum(factors.values())

        # Determine health level
        if total_score >= 80:
            health_level = RelationshipHealth.EXCELLENT
        elif total_score >= 60:
            health_level = RelationshipHealth.GOOD
        elif total_score >= 40:
            health_level = RelationshipHealth.FAIR
        else:
            health_level = RelationshipHealth.NEEDS_ATTENTION

        # Generate recommendations
        recommendations = self._generate_recommendations(factors, thread_analysis)

        return RelationshipHealthScore(
            total_score=round(total_score, 1),
            health_level=health_level,
            factor_breakdown=factors,
            recommendations=recommendations,
            insights=insights,
        )

    def _generate_recommendations(
        self,
        factors: Dict[str, float],
        analysis: ThreadAnalysis
    ) -> List[str]:
        """Generate actionable recommendations based on scores"""
        recommendations = []

        # Check each factor against thresholds
        if factors.get("response_reciprocity", 0) < 10:
            recommendations.append("Response times are imbalanced - consider adjusting your response speed")

        if factors.get("sentiment", 0) < 12:
            recommendations.append("Sentiment is declining - consider addressing any concerns directly")

        if factors.get("engagement", 0) < 10:
            recommendations.append("Low engagement - initiate more conversations")

        if factors.get("commitment_fulfillment", 0) < 12:
            recommendations.append("Commitment fulfillment needs attention - prioritize pending promises")

        # Check for pending items
        if analysis.unanswered_questions:
            recommendations.append(f"Follow up on {len(analysis.unanswered_questions)} unanswered question(s)")

        # Check for overdue commitments
        overdue = [c for c in analysis.my_commitments if c.status == "overdue"]
        if overdue:
            recommendations.append(f"Address {len(overdue)} overdue commitment(s) immediately")

        return recommendations


# ============================================================================
# NEXT BEST ACTION ENGINE
# ============================================================================

class NextBestActionEngine:
    """
    Predictive engine that recommends optimal next actions.
    Implements patterns from Pega, Salesforce, and enterprise CRM systems.
    """

    def __init__(self, config: Optional[SMSIntelligenceConfig] = None):
        self.config = config or get_config()
        self.client = Anthropic(api_key=self.config.anthropic_api_key)
        self.logger = logging.getLogger("sms_intelligence.nba_engine")

    def predict_next_action(
        self,
        thread_analysis: ThreadAnalysis,
        health_score: Optional[RelationshipHealthScore] = None,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict the optimal next action for a conversation.

        Args:
            thread_analysis: Analysis of the conversation thread
            health_score: Optional relationship health score
            additional_context: Any additional context to consider

        Returns:
            Dictionary with recommended action, timing, reasoning, and confidence
        """
        prompt = f"""Based on the conversation analysis, recommend the BEST next action.
Return ONLY valid JSON.

CONVERSATION ANALYSIS:
- Contact: {thread_analysis.contact_name}
- Messages: {thread_analysis.message_count}
- Summary: {thread_analysis.summary}
- Sentiment: {thread_analysis.overall_sentiment} (trend: {thread_analysis.sentiment_trend})
- Key Topics: {', '.join(thread_analysis.key_topics[:5])}

PENDING ITEMS:
- Unanswered Questions: {thread_analysis.unanswered_questions[:3]}
- My Pending Commitments: {[c.what for c in thread_analysis.my_commitments if c.status == 'pending'][:3]}
- Their Pending Commitments: {[c.what for c in thread_analysis.their_commitments if c.status == 'pending'][:3]}

{f"RELATIONSHIP HEALTH: {health_score.health_level.value} ({health_score.total_score}/100)" if health_score else ""}

{f"ADDITIONAL CONTEXT: {additional_context}" if additional_context else ""}

TODAY'S DATE: {datetime.now().strftime("%Y-%m-%d %H:%M")}

Available action types:
- send_followup: Send a follow-up message
- schedule_meeting: Propose a meeting or call
- send_reminder: Send a gentle reminder about something
- wait: No action needed right now
- send_information: Share requested information
- ask_question: Ask a clarifying question
- acknowledge: Simply acknowledge/thank them
- apologize: Address a concern or issue

Return:
{{
    "recommended_action": "action description",
    "action_type": "one of the action types above",
    "timing": "immediate|within_1h|within_24h|this_week|no_rush",
    "specific_time": "ISO timestamp if applicable, null otherwise",
    "reasoning": "why this action now",
    "confidence": 0.0-1.0,
    "suggested_message": "draft message to send (if applicable)",
    "alternatives": [
        {{"action": "alternative action", "reasoning": "why this could also work"}}
    ]
}}"""

        try:
            response = self.client.messages.create(
                model=self.config.llm.model_standard,
                max_tokens=1000,
                temperature=self.config.llm.temperature_suggestions,
                messages=[{"role": "user", "content": prompt}]
            )

            result = self._parse_json_response(response.content[0].text)
            return result

        except Exception as e:
            self.logger.error(f"Next action prediction failed: {e}")
            return {
                "recommended_action": "Review conversation manually",
                "action_type": "wait",
                "timing": "no_rush",
                "reasoning": f"Automated prediction failed: {str(e)}",
                "confidence": 0.0,
            }

    def generate_proactive_alerts(
        self,
        analyses: List[ThreadAnalysis]
    ) -> List[Dict[str, Any]]:
        """
        Scan multiple conversation analyses and generate proactive alerts.

        Args:
            analyses: List of ThreadAnalysis objects

        Returns:
            List of alerts sorted by priority
        """
        alerts = []
        now = datetime.now()

        for analysis in analyses:
            # Check for overdue commitments
            for commitment in analysis.my_commitments:
                if commitment.status == "overdue" or (
                    commitment.parsed_deadline and commitment.parsed_deadline < now
                ):
                    alerts.append({
                        "type": "overdue_commitment",
                        "priority": "high",
                        "contact": analysis.contact_name,
                        "details": commitment.what,
                        "deadline": commitment.when,
                        "suggested_action": "Send update or deliver on commitment immediately",
                    })

            # Check for contacts going cold
            if analysis.date_range[1]:
                days_since = (now - analysis.date_range[1]).days
                if days_since > 14:
                    alerts.append({
                        "type": "contact_going_cold",
                        "priority": "medium",
                        "contact": analysis.contact_name,
                        "days_since_contact": days_since,
                        "suggested_action": "Send a check-in message",
                    })

            # Check for unanswered questions
            if analysis.unanswered_questions:
                alerts.append({
                    "type": "pending_questions",
                    "priority": "medium",
                    "contact": analysis.contact_name,
                    "questions": analysis.unanswered_questions[:3],
                    "suggested_action": "Follow up on unanswered questions",
                })

            # Check for declining sentiment
            if analysis.sentiment_trend == "declining":
                alerts.append({
                    "type": "relationship_risk",
                    "priority": "high",
                    "contact": analysis.contact_name,
                    "details": "Sentiment has been declining",
                    "suggested_action": "Address any concerns proactively",
                })

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        return sorted(alerts, key=lambda x: priority_order.get(x.get("priority", "low"), 2))

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response"""
        try:
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {}


# ============================================================================
# SENTIMENT TREND ANALYZER
# ============================================================================

class SentimentTrendAnalyzer:
    """Track sentiment trends over time for a relationship"""

    def __init__(self):
        self.sentiment_scores = {
            'very_positive': 2,
            'positive': 1,
            'neutral': 0,
            'negative': -1,
            'very_negative': -2,
        }

    def analyze_trend(
        self,
        analyzed_messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze sentiment trend over time.

        Args:
            analyzed_messages: List of dicts with 'date' (datetime) and 'sentiment' (str)

        Returns:
            Trend analysis with weekly breakdown
        """
        if not analyzed_messages:
            return {'trend': 'insufficient_data', 'message': 'No data available'}

        # Filter to messages with valid dates
        valid_messages = [
            m for m in analyzed_messages
            if m.get('date') and m.get('sentiment')
        ]

        if len(valid_messages) < 2:
            return {'trend': 'insufficient_data', 'message': 'Need at least 2 data points'}

        # Group by week
        weekly_sentiment = defaultdict(list)
        for msg in valid_messages:
            week_start = msg['date'] - timedelta(days=msg['date'].weekday())
            week_key = week_start.strftime("%Y-%m-%d")
            score = self.sentiment_scores.get(msg['sentiment'], 0)
            weekly_sentiment[week_key].append(score)

        # Calculate weekly averages
        weekly_averages = {
            week: sum(scores) / len(scores)
            for week, scores in weekly_sentiment.items()
        }

        # Determine trend
        weeks = sorted(weekly_averages.keys())
        if len(weeks) >= 2:
            recent_avg = weekly_averages[weeks[-1]]
            previous_avg = weekly_averages[weeks[-2]]

            if recent_avg > previous_avg + 0.3:
                trend = 'improving'
            elif recent_avg < previous_avg - 0.3:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        return {
            'trend': trend,
            'current_score': weekly_averages.get(weeks[-1], 0) if weeks else 0,
            'weekly_data': weekly_averages,
            'total_messages_analyzed': len(valid_messages),
        }


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """CLI for thread analyzer testing"""
    import argparse

    parser = argparse.ArgumentParser(description="Thread Analyzer CLI")
    parser.add_argument('--chat-id', help='Chat ID to analyze')
    parser.add_argument('--limit', type=int, default=100, help='Message limit')

    args = parser.parse_args()

    # Import here to avoid circular dependency
    from sms_daemon import MessageDatabase

    config = get_config()
    errors = config.validate()
    if errors:
        print(f"Configuration errors: {errors}")
        return

    db = MessageDatabase()
    analyzer = ThreadAnalyzer(config)
    health_scorer = RelationshipHealthScorer()
    nba_engine = NextBestActionEngine(config)

    if args.chat_id:
        messages = db.get_conversation_history(args.chat_id, args.limit)
    else:
        # Get most recent chat
        chats = db.get_all_chats()
        if not chats:
            print("No chats found")
            return

        chat = chats[0]
        print(f"Analyzing chat with: {chat['display_name']}")
        messages = db.get_conversation_history(chat['chat_id'], args.limit)

    if not messages:
        print("No messages found")
        return

    print(f"\nAnalyzing {len(messages)} messages...")

    # Perform analysis
    analysis = analyzer.analyze_thread(messages)

    print("\n" + "=" * 60)
    print("THREAD ANALYSIS RESULTS")
    print("=" * 60)
    print(f"\nContact: {analysis.contact_name}")
    print(f"Messages: {analysis.message_count}")
    print(f"\nSummary: {analysis.summary}")
    print(f"\nSentiment: {analysis.overall_sentiment} (trend: {analysis.sentiment_trend})")
    print(f"Topics: {', '.join(analysis.key_topics[:5])}")

    if analysis.my_commitments:
        print(f"\nMy Commitments:")
        for c in analysis.my_commitments[:5]:
            print(f"  - {c.what} (status: {c.status})")

    if analysis.unanswered_questions:
        print(f"\nUnanswered Questions:")
        for q in analysis.unanswered_questions[:3]:
            print(f"  - {q}")

    # Calculate health score
    health = health_scorer.calculate_health(analysis)
    print(f"\nRelationship Health: {health.health_level.value} ({health.total_score}/100)")

    if health.recommendations:
        print("Recommendations:")
        for r in health.recommendations[:3]:
            print(f"  - {r}")

    # Get next best action
    nba = nba_engine.predict_next_action(analysis, health)
    print(f"\nNext Best Action: {nba.get('recommended_action', 'N/A')}")
    print(f"Timing: {nba.get('timing', 'N/A')}")
    print(f"Reasoning: {nba.get('reasoning', 'N/A')}")

    if nba.get('suggested_message'):
        print(f"\nSuggested Message:\n{nba['suggested_message']}")


if __name__ == "__main__":
    main()
