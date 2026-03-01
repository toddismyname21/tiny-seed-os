#!/usr/bin/env python3
"""
===============================================================================
     WILD CLAIMS CZAR - THE MAD SCIENTIST'S RESEARCH APPARATUS
===============================================================================

"THEY SAID MY SCIENCE WAS MAD! BUT WHO'S LAUGHING NOW WHEN MY AGENTS
 DISCOVER BREAKTHROUGH TECHNIQUES BEFORE THE INK IS DRY ON THE ARXIV PAPER!"

                    *lightning crackles*
                     ______________
                    /              \
                   /  WILD CLAIMS   \
                  /      CZAR        \
                 |   ============     |
                 |   || SCAN ||       |
                 |   || VALID||       |
                 |   || INTEG||       |
                 |   ============     |
                  \                  /
                   \________________/
                         ||||
                    SCIENCE RULES!

This multi-agent research system keeps TinyPM on the ABSOLUTE CUTTING EDGE by:
1. DISCOVERING wild claims from forums, papers, social media
2. VALIDATING claims through rigorous multi-agent verification
3. INTEGRATING validated techniques into actionable plans
4. REPORTING opportunities to the development team

ARCHITECTURE:
- Scout Team: ForumScout, PaperScout, SocialScout
- Validation Team: FactChecker, CodeTester, DebateAgent
- Integration Team: ArchitectAgent, PlannerAgent
- Czar Supervisor: Coordinates all operations

USAGE:
    python wild_claims_czar.py scan        # Scan all sources
    python wild_claims_czar.py validate    # Validate pending claims
    python wild_claims_czar.py report      # Generate daily digest
    python wild_claims_czar.py run         # Full autonomous cycle
    python wild_claims_czar.py --daemon    # Run as background service

Created: 2026-01-30
Author: The Mad Scientist (Backend_Claude #7)
Purpose: SCIENCE OUTSHINES MAGIC!
===============================================================================
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, TypedDict, Annotated
import operator

# ===============================================================================
# CONFIGURATION - THE MAD SCIENTIST'S CONTROL PANEL
# ===============================================================================

APP_DIR = Path(__file__).parent
CLAIMS_DB_FILE = APP_DIR / ".wild_claims_db.json"
CZAR_STATE_FILE = APP_DIR / ".wild_claims_czar_state.json"
CZAR_LOG_FILE = APP_DIR / ".wild_claims_czar.log"
DIGEST_OUTPUT_DIR = APP_DIR / "wild_claims_digests"

# Claude CLI for AI-powered analysis
CLAUDE_BIN = Path.home() / ".local" / "bin" / "claude"

# API Keys (from environment)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Scan intervals (in hours)
SCAN_INTERVALS = {
    "forums": 4,      # Reddit, HN every 4 hours
    "papers": 24,     # arXiv daily
    "social": 2,      # Twitter every 2 hours
    "youtube": 24     # YouTube daily
}

# ===============================================================================
# WILD CLAIM PATTERNS - WHAT MAKES A CLAIM "WILD"?
# ===============================================================================

WILD_CLAIM_PATTERNS = [
    # Performance claims
    r"beats?\s+(GPT-?[45]|Claude|Gemini)",
    r"\d+x\s+(faster|better|cheaper)",
    r"state[\s\-]of[\s\-]the[\s\-]art",
    r"\bSOTA\b",
    r"benchmark.*(record|breakthrough)",
    r"(\d+)%?\s+(improvement|better|faster)",

    # Novelty claims
    r"(first|novel|new)\s+(approach|method|technique)",
    r"breakthrough",
    r"revolutionary",
    r"game[\s\-]?changer",

    # Insider claims
    r"\bleaked\b",
    r"\binsider\b",
    r"unreleased",
    r"early[\s\-]?access",

    # Specific techniques
    r"(prompt|RAG|agent|memory)\s*(hack|trick|technique)",
    r"one\s*weird\s*trick",
    r"they\s*don'?t\s*want\s*you\s*to\s*know"
]

ENGAGEMENT_THRESHOLDS = {
    "reddit": {"upvotes": 100, "comments": 20},
    "hackernews": {"points": 50, "comments": 15},
    "twitter": {"likes": 500, "retweets": 100},
    "youtube": {"views": 10000, "likes": 500}
}

SOURCE_CREDIBILITY = {
    "peer_reviewed_paper": 0.95,
    "preprint_arxiv": 0.75,
    "official_docs": 0.90,
    "reputable_blog": 0.70,
    "influencer_twitter": 0.50,
    "random_reddit": 0.30,
    "anonymous_claim": 0.10
}

# ===============================================================================
# DATA STRUCTURES - THE SCIENTIFIC SPECIMENS
# ===============================================================================

class ClaimStatus(Enum):
    DISCOVERED = "discovered"
    VALIDATING = "validating"
    VALIDATED = "validated"
    REJECTED = "rejected"
    INTEGRATED = "integrated"

class ClaimType(Enum):
    PERFORMANCE = "performance"
    NOVELTY = "novelty"
    TECHNIQUE = "technique"
    INSIDER = "insider"
    RESEARCH = "research"

@dataclass
class WildClaim:
    """A wild claim discovered in the digital wilderness."""
    id: str
    source_type: str  # reddit, arxiv, twitter, youtube, hackernews
    source_url: str
    title: str
    content: str
    author: str
    discovered_at: str
    wildness_score: float  # 0-10, how wild is this claim?
    claim_type: str
    status: str = ClaimStatus.DISCOVERED.value
    extracted_claims: List[str] = field(default_factory=list)
    engagement: Dict[str, int] = field(default_factory=dict)
    validation_score: Optional[float] = None
    validation_results: Dict[str, Any] = field(default_factory=dict)
    integration_plan: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'WildClaim':
        return cls(**data)

@dataclass
class ValidationResult:
    """Result from a validation agent."""
    validator: str
    claim_id: str
    score: float  # 0-1
    confidence: float  # 0-1
    evidence: List[str]
    concerns: List[str]
    timestamp: str

    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class IntegrationPlan:
    """Plan for integrating a validated technique into TinyPM."""
    claim_id: str
    effort_estimate: float  # days
    impact_estimate: float  # 0-1
    priority_score: float  # 0-1
    prerequisites: List[str]
    implementation_steps: List[str]
    rollback_plan: List[str]
    success_metrics: List[str]
    sprint_recommended: Optional[str] = None
    created_at: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)

# ===============================================================================
# LOGGING - THE MAD SCIENTIST'S LAB NOTEBOOK
# ===============================================================================

def log(msg: str, level: str = "INFO"):
    """Log with timestamp and flair."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Add some mad scientist flair
    prefixes = {
        "INFO": "[SCIENCE]",
        "WARNING": "[CAUTION]",
        "ERROR": "[EXPLOSION]",
        "SUCCESS": "[EUREKA!]",
        "DISCOVERY": "[SPECIMEN]"
    }

    prefix = prefixes.get(level, "[SCIENCE]")
    line = f"[{timestamp}] {prefix} {msg}"

    print(line)
    try:
        with open(CZAR_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass

# ===============================================================================
# DATABASE - THE SPECIMEN VAULT
# ===============================================================================

class ClaimsDatabase:
    """
    Local-first database for wild claims.
    The mad scientist's specimen vault.
    """

    def __init__(self):
        self.claims: Dict[str, WildClaim] = {}
        self.validations: Dict[str, List[ValidationResult]] = {}
        self.plans: Dict[str, IntegrationPlan] = {}
        self._load()

    def _load(self):
        """Load database from disk."""
        if CLAIMS_DB_FILE.exists():
            try:
                data = json.loads(CLAIMS_DB_FILE.read_text())
                self.claims = {
                    k: WildClaim.from_dict(v)
                    for k, v in data.get("claims", {}).items()
                }
                self.validations = {
                    k: [ValidationResult(**r) for r in v]
                    for k, v in data.get("validations", {}).items()
                }
                self.plans = {
                    k: IntegrationPlan(**v)
                    for k, v in data.get("plans", {}).items()
                }
                log(f"Loaded {len(self.claims)} claims from vault")
            except Exception as e:
                log(f"Error loading claims vault: {e}", "ERROR")

    def _save(self):
        """Save database to disk."""
        data = {
            "claims": {k: v.to_dict() for k, v in self.claims.items()},
            "validations": {
                k: [r.to_dict() for r in v]
                for k, v in self.validations.items()
            },
            "plans": {k: v.to_dict() for k, v in self.plans.items()},
            "updated_at": datetime.now().isoformat()
        }
        CLAIMS_DB_FILE.write_text(json.dumps(data, indent=2))

    def add_claim(self, claim: WildClaim) -> bool:
        """Add a new claim to the vault."""
        if claim.id in self.claims:
            return False  # Already exists

        self.claims[claim.id] = claim
        self._save()
        log(f"New specimen added: {claim.title[:50]}...", "DISCOVERY")
        return True

    def update_claim(self, claim: WildClaim):
        """Update an existing claim."""
        self.claims[claim.id] = claim
        self._save()

    def get_claim(self, claim_id: str) -> Optional[WildClaim]:
        """Retrieve a claim by ID."""
        return self.claims.get(claim_id)

    def add_validation(self, result: ValidationResult):
        """Add a validation result."""
        if result.claim_id not in self.validations:
            self.validations[result.claim_id] = []
        self.validations[result.claim_id].append(result)
        self._save()

    def add_plan(self, plan: IntegrationPlan):
        """Add an integration plan."""
        self.plans[plan.claim_id] = plan
        self._save()

    def get_claims_by_status(self, status: ClaimStatus) -> List[WildClaim]:
        """Get all claims with a specific status."""
        return [c for c in self.claims.values() if c.status == status.value]

    def get_top_claims(self, limit: int = 10) -> List[WildClaim]:
        """Get top claims by wildness score."""
        validated = [
            c for c in self.claims.values()
            if c.status == ClaimStatus.VALIDATED.value
        ]
        return sorted(validated, key=lambda c: c.wildness_score, reverse=True)[:limit]

    def get_recent_discoveries(self, hours: int = 24) -> List[WildClaim]:
        """Get claims discovered in the last N hours."""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent = []
        for claim in self.claims.values():
            try:
                discovered = datetime.fromisoformat(claim.discovered_at)
                if discovered > cutoff:
                    recent.append(claim)
            except:
                pass
        return sorted(recent, key=lambda c: c.wildness_score, reverse=True)

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        by_status = {}
        for claim in self.claims.values():
            by_status[claim.status] = by_status.get(claim.status, 0) + 1

        return {
            "total_claims": len(self.claims),
            "by_status": by_status,
            "total_validations": sum(len(v) for v in self.validations.values()),
            "total_plans": len(self.plans)
        }

# Global database instance
_db: Optional[ClaimsDatabase] = None

def get_db() -> ClaimsDatabase:
    """Get or create the database singleton."""
    global _db
    if _db is None:
        _db = ClaimsDatabase()
    return _db

# ===============================================================================
# CLAUDE CLI INTERFACE - THE NEURAL INTERFACE
# ===============================================================================

async def call_claude(prompt: str, timeout: int = 120) -> Tuple[str, bool]:
    """
    Call Claude CLI for AI-powered analysis.
    The mad scientist's neural interface!
    """
    if not CLAUDE_BIN.exists():
        return "Claude CLI not found - science is limited!", False

    cmd = [
        str(CLAUDE_BIN),
        "-p",
        prompt,
        # SECURITY FIX 2026-02-28: Removed --dangerously-skip-permissions
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(APP_DIR),
            env={**os.environ, "NO_COLOR": "1"}
        )

        if result.returncode == 0:
            response = result.stdout.strip()
            # Clean ANSI codes
            response = re.sub(r'\x1b\[[0-9;]*m', '', response)
            return response, True
        else:
            return f"Error: {result.stderr}", False

    except subprocess.TimeoutExpired:
        return "Neural interface timeout!", False
    except Exception as e:
        return f"Error: {str(e)}", False

# ===============================================================================
# BASE AGENT CLASS - THE SCIENTIFIC METHOD
# ===============================================================================

class BaseAgent(ABC):
    """
    Abstract base class for all agents.
    Every scientist follows the scientific method!
    """

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    async def run(self, *args, **kwargs) -> Any:
        """Execute the agent's primary function."""
        pass

    def log(self, msg: str, level: str = "INFO"):
        """Log with agent name prefix."""
        log(f"[{self.name}] {msg}", level)

# ===============================================================================
# SCOUT TEAM - THE FIELD RESEARCHERS
# ===============================================================================

class ForumScout(BaseAgent):
    """
    Monitors forums and communities for emerging claims.
    The field researcher who braves the wilds of Reddit and HN!
    """

    def __init__(self):
        super().__init__(
            name="ForumScout",
            description="Monitors Reddit, HackerNews for wild claims"
        )
        self.sources = [
            ("reddit", "r/MachineLearning"),
            ("reddit", "r/LocalLLaMA"),
            ("reddit", "r/LangChain"),
            ("hackernews", "front_page")
        ]

    async def run(self) -> List[WildClaim]:
        """Scan forums for wild claims."""
        self.log("Beginning forum expedition...")
        claims = []

        for source_type, source_name in self.sources:
            try:
                source_claims = await self._scan_source(source_type, source_name)
                claims.extend(source_claims)
            except Exception as e:
                self.log(f"Error scanning {source_name}: {e}", "WARNING")

        self.log(f"Expedition complete: {len(claims)} specimens collected", "SUCCESS")
        return claims

    async def _scan_source(self, source_type: str, source_name: str) -> List[WildClaim]:
        """Scan a specific source using web search."""
        claims = []

        # Use Claude to search and analyze
        prompt = f"""You are a research scout looking for wild AI claims on {source_type}/{source_name}.

Search for recent posts (last 24 hours) containing:
- Performance claims ("beats GPT-4", "10x faster", "SOTA")
- Novel techniques ("new prompting method", "breakthrough")
- Insider information ("leaked", "early access")

For each promising finding, extract:
1. Title/headline
2. Key claims made
3. URL (if available)
4. Author
5. Engagement metrics (upvotes, comments)
6. Wildness assessment (1-10)

Format your response as JSON array:
[
  {{
    "title": "...",
    "content": "Brief summary of claims",
    "author": "username",
    "url": "https://...",
    "engagement": {{"upvotes": 100, "comments": 20}},
    "extracted_claims": ["Claim 1", "Claim 2"],
    "wildness_score": 7.5,
    "claim_type": "performance|novelty|technique|insider"
  }}
]

If no wild claims found, return empty array: []

Search and analyze {source_type}/{source_name} now:"""

        response, success = await call_claude(prompt, timeout=180)

        if success:
            try:
                # Extract JSON from response
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    findings = json.loads(json_match.group())
                    for finding in findings:
                        claim = WildClaim(
                            id=str(uuid.uuid4()),
                            source_type=source_type,
                            source_url=finding.get("url", f"https://{source_type}.com/{source_name}"),
                            title=finding.get("title", "Unknown"),
                            content=finding.get("content", ""),
                            author=finding.get("author", "unknown"),
                            discovered_at=datetime.now().isoformat(),
                            wildness_score=float(finding.get("wildness_score", 5.0)),
                            claim_type=finding.get("claim_type", "technique"),
                            extracted_claims=finding.get("extracted_claims", []),
                            engagement=finding.get("engagement", {})
                        )
                        claims.append(claim)
            except json.JSONDecodeError:
                self.log(f"Could not parse forum findings", "WARNING")

        return claims


class PaperScout(BaseAgent):
    """
    Monitors academic sources for breakthrough research.
    The scholar who reads the ancient scrolls of arXiv!
    """

    def __init__(self):
        super().__init__(
            name="PaperScout",
            description="Monitors arXiv for breakthrough papers"
        )
        self.categories = ["cs.AI", "cs.CL", "cs.LG"]
        self.keywords = [
            "agent", "multi-agent", "reasoning", "planning",
            "memory", "retrieval", "langchain", "langgraph",
            "prompt engineering", "tool use"
        ]

    async def run(self) -> List[WildClaim]:
        """Scan arXiv for wild papers."""
        self.log("Beginning scholarly expedition...")
        claims = []

        prompt = f"""You are a research scout analyzing recent arXiv papers in {', '.join(self.categories)}.

Look for papers from the last 7 days that make bold claims about:
- Performance improvements (beating benchmarks, SOTA results)
- Novel methods (new architectures, techniques)
- Agent systems (multi-agent, tool use, planning)
- Memory systems (RAG, long-term memory)
- Prompt engineering (new prompting strategies)

Keywords to focus on: {', '.join(self.keywords)}

For each promising paper, extract:
1. Paper title
2. Key claims and contributions
3. arXiv URL
4. Authors
5. Why this is wild/important
6. Wildness score (1-10)

Format as JSON array:
[
  {{
    "title": "Paper Title",
    "content": "Summary of key claims and contributions",
    "author": "First Author et al.",
    "url": "https://arxiv.org/abs/...",
    "extracted_claims": ["Key claim 1", "Key claim 2"],
    "wildness_score": 8.0,
    "claim_type": "research"
  }}
]

Search arXiv for recent breakthrough papers:"""

        response, success = await call_claude(prompt, timeout=180)

        if success:
            try:
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    findings = json.loads(json_match.group())
                    for finding in findings:
                        claim = WildClaim(
                            id=str(uuid.uuid4()),
                            source_type="arxiv",
                            source_url=finding.get("url", "https://arxiv.org"),
                            title=finding.get("title", "Unknown"),
                            content=finding.get("content", ""),
                            author=finding.get("author", "unknown"),
                            discovered_at=datetime.now().isoformat(),
                            wildness_score=float(finding.get("wildness_score", 5.0)),
                            claim_type=finding.get("claim_type", "research"),
                            extracted_claims=finding.get("extracted_claims", []),
                            engagement={"citations": 0}  # New paper
                        )
                        claims.append(claim)
            except json.JSONDecodeError:
                self.log(f"Could not parse paper findings", "WARNING")

        self.log(f"Scholarly expedition complete: {len(claims)} papers found", "SUCCESS")
        return claims


class SocialScout(BaseAgent):
    """
    Monitors social media for real-time AI signals.
    The spy who tracks the influencers!
    """

    def __init__(self):
        super().__init__(
            name="SocialScout",
            description="Tracks AI influencer signals on social media"
        )
        self.influencers = [
            "@karpathy", "@ylecun", "@sama", "@AnthropicAI",
            "@GoogleDeepMind", "@hwchase17", "@drjimfan"
        ]

    async def run(self) -> List[WildClaim]:
        """Scan social media for wild signals."""
        self.log("Beginning social reconnaissance...")
        claims = []

        prompt = f"""You are a social media scout tracking AI influencers for breaking news.

Focus on recent posts (last 24 hours) from key AI figures that contain:
- Announcements of new capabilities
- Performance claims
- Technique revelations
- Early access information
- Breakthrough discussions

Key accounts to track: {', '.join(self.influencers)}

Look for posts with high engagement that contain wild claims.

For each finding, extract:
1. Author
2. Content summary
3. URL
4. Engagement (likes, retweets)
5. Why this is significant
6. Wildness score (1-10)

Format as JSON array:
[
  {{
    "title": "Brief headline for the claim",
    "content": "What they claimed",
    "author": "@username",
    "url": "https://twitter.com/...",
    "engagement": {{"likes": 1000, "retweets": 200}},
    "extracted_claims": ["Claim 1"],
    "wildness_score": 7.0,
    "claim_type": "insider|novelty|performance"
  }}
]

Search for recent AI influencer posts with wild claims:"""

        response, success = await call_claude(prompt, timeout=180)

        if success:
            try:
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    findings = json.loads(json_match.group())
                    for finding in findings:
                        claim = WildClaim(
                            id=str(uuid.uuid4()),
                            source_type="twitter",
                            source_url=finding.get("url", "https://twitter.com"),
                            title=finding.get("title", "Unknown"),
                            content=finding.get("content", ""),
                            author=finding.get("author", "unknown"),
                            discovered_at=datetime.now().isoformat(),
                            wildness_score=float(finding.get("wildness_score", 5.0)),
                            claim_type=finding.get("claim_type", "insider"),
                            extracted_claims=finding.get("extracted_claims", []),
                            engagement=finding.get("engagement", {})
                        )
                        claims.append(claim)
            except json.JSONDecodeError:
                self.log(f"Could not parse social findings", "WARNING")

        self.log(f"Social reconnaissance complete: {len(claims)} signals detected", "SUCCESS")
        return claims

# ===============================================================================
# VALIDATION TEAM - THE PEER REVIEWERS
# ===============================================================================

class FactChecker(BaseAgent):
    """
    Verifies factual accuracy of claims.
    The skeptic who demands EVIDENCE!
    """

    def __init__(self):
        super().__init__(
            name="FactChecker",
            description="Verifies claims against authoritative sources"
        )

    async def run(self, claim: WildClaim) -> ValidationResult:
        """Fact-check a claim."""
        self.log(f"Fact-checking: {claim.title[:50]}...")

        prompt = f"""You are a rigorous fact-checker analyzing an AI claim.

CLAIM TO VERIFY:
Title: {claim.title}
Content: {claim.content}
Source: {claim.source_type} - {claim.source_url}
Extracted claims: {json.dumps(claim.extracted_claims)}

Your task:
1. Search for authoritative sources that support or refute each claim
2. Check for peer-reviewed papers, official documentation, reputable sources
3. Identify any contradictions or red flags
4. Assess source credibility

Provide your analysis as JSON:
{{
    "score": 0.0-1.0,  // How well-supported is this claim?
    "confidence": 0.0-1.0,  // How confident are you in your assessment?
    "evidence": ["List of supporting evidence found"],
    "concerns": ["List of concerns or red flags"],
    "sources_checked": ["URLs of sources verified"],
    "verdict": "supported|partially_supported|unverified|contradicted"
}}

Analyze this claim thoroughly:"""

        response, success = await call_claude(prompt, timeout=180)

        score = 0.5
        confidence = 0.5
        evidence = []
        concerns = []

        if success:
            try:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                    score = float(analysis.get("score", 0.5))
                    confidence = float(analysis.get("confidence", 0.5))
                    evidence = analysis.get("evidence", [])
                    concerns = analysis.get("concerns", [])
            except:
                pass

        result = ValidationResult(
            validator="FactChecker",
            claim_id=claim.id,
            score=score,
            confidence=confidence,
            evidence=evidence,
            concerns=concerns,
            timestamp=datetime.now().isoformat()
        )

        self.log(f"Fact-check complete: score={score:.2f}", "SUCCESS")
        return result


class DebateAgent(BaseAgent):
    """
    Devil's advocate analysis of claims.
    The debater who argues BOTH sides!
    """

    def __init__(self):
        super().__init__(
            name="DebateAgent",
            description="Pro/Con analysis through structured debate"
        )

    async def run(self, claim: WildClaim) -> ValidationResult:
        """Debate a claim from both sides."""
        self.log(f"Debating: {claim.title[:50]}...")

        prompt = f"""You are a debate moderator conducting a structured analysis of an AI claim.

CLAIM TO DEBATE:
Title: {claim.title}
Content: {claim.content}
Extracted claims: {json.dumps(claim.extracted_claims)}

Conduct a structured debate:

PRO POSITION (argue in favor):
- What evidence supports this claim?
- What use cases would make this valuable?
- What theoretical basis supports it?

CON POSITION (argue against):
- What are potential flaws?
- What contradicting evidence exists?
- What edge cases might fail?
- Is this cherry-picking results?

SYNTHESIS:
- Under what conditions does this claim hold?
- What caveats should be noted?
- What's the nuanced truth?

Provide your debate summary as JSON:
{{
    "pro_arguments": ["List of pro arguments"],
    "con_arguments": ["List of con arguments"],
    "conditions": ["Conditions where claim holds"],
    "caveats": ["Important caveats"],
    "score": 0.0-1.0,  // Overall validity after debate
    "confidence": 0.0-1.0,  // Confidence in verdict
    "verdict": "valid|conditionally_valid|invalid|uncertain"
}}

Conduct the debate:"""

        response, success = await call_claude(prompt, timeout=180)

        score = 0.5
        confidence = 0.5
        evidence = []
        concerns = []

        if success:
            try:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                    score = float(analysis.get("score", 0.5))
                    confidence = float(analysis.get("confidence", 0.5))
                    evidence = analysis.get("pro_arguments", [])
                    concerns = analysis.get("con_arguments", [])
            except:
                pass

        result = ValidationResult(
            validator="DebateAgent",
            claim_id=claim.id,
            score=score,
            confidence=confidence,
            evidence=evidence,
            concerns=concerns,
            timestamp=datetime.now().isoformat()
        )

        self.log(f"Debate concluded: score={score:.2f}", "SUCCESS")
        return result


class CodeTester(BaseAgent):
    """
    Tests code-based claims in a sandbox.
    The experimentalist who PROVES it works!

    Note: Currently does conceptual analysis.
    Future: Docker sandbox for actual execution.
    """

    def __init__(self):
        super().__init__(
            name="CodeTester",
            description="Analyzes and conceptually tests code claims"
        )

    async def run(self, claim: WildClaim) -> ValidationResult:
        """Analyze code claims."""
        self.log(f"Analyzing code claim: {claim.title[:50]}...")

        prompt = f"""You are a code analyst evaluating whether an AI code claim is reproducible.

CLAIM TO ANALYZE:
Title: {claim.title}
Content: {claim.content}
Extracted claims: {json.dumps(claim.extracted_claims)}
Source: {claim.source_url}

Your task:
1. Check if code/implementation details are provided
2. Analyze if the approach is theoretically sound
3. Identify dependencies and requirements
4. Assess reproducibility likelihood
5. Note any missing details that would prevent reproduction

Provide your analysis as JSON:
{{
    "has_code": true/false,
    "code_quality": "complete|partial|missing",
    "dependencies": ["List of required dependencies"],
    "theoretical_soundness": 0.0-1.0,
    "reproducibility_score": 0.0-1.0,
    "missing_details": ["List of missing information"],
    "implementation_notes": ["Notes about implementing this"],
    "score": 0.0-1.0,  // Overall score for code claim
    "confidence": 0.0-1.0
}}

Analyze the code claim:"""

        response, success = await call_claude(prompt, timeout=180)

        score = 0.5
        confidence = 0.5
        evidence = []
        concerns = []

        if success:
            try:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                    score = float(analysis.get("score", 0.5))
                    confidence = float(analysis.get("confidence", 0.5))
                    evidence = analysis.get("implementation_notes", [])
                    concerns = analysis.get("missing_details", [])
            except:
                pass

        result = ValidationResult(
            validator="CodeTester",
            claim_id=claim.id,
            score=score,
            confidence=confidence,
            evidence=evidence,
            concerns=concerns,
            timestamp=datetime.now().isoformat()
        )

        self.log(f"Code analysis complete: score={score:.2f}", "SUCCESS")
        return result

# ===============================================================================
# INTEGRATION TEAM - THE ARCHITECTS
# ===============================================================================

class ArchitectAgent(BaseAgent):
    """
    Assesses compatibility with TinyPM architecture.
    The architect who ensures EVERYTHING FITS!
    """

    # TinyPM's current architecture
    TINYPM_ARCHITECTURE = {
        "orchestration": "LangGraph",
        "memory": "Mem0-style hybrid",
        "models": ["Claude", "GPT", "Gemini"],
        "protocols": ["MCP"],
        "backend": "Supabase",
        "frontend": "React/HTML"
    }

    def __init__(self):
        super().__init__(
            name="ArchitectAgent",
            description="Assesses TinyPM compatibility"
        )

    async def run(self, claim: WildClaim) -> Dict[str, Any]:
        """Assess architectural compatibility."""
        self.log(f"Assessing compatibility: {claim.title[:50]}...")

        prompt = f"""You are a software architect assessing a new technique for integration with TinyPM.

TINYPM CURRENT ARCHITECTURE:
{json.dumps(self.TINYPM_ARCHITECTURE, indent=2)}

TECHNIQUE TO ASSESS:
Title: {claim.title}
Content: {claim.content}
Claims: {json.dumps(claim.extracted_claims)}

Assess compatibility:
1. Does this fit with LangGraph orchestration?
2. Does it work with our memory system?
3. Is it compatible with Claude/GPT/Gemini?
4. Does it support MCP protocol?
5. Can it use Supabase for persistence?

Provide your assessment as JSON:
{{
    "compatibility_score": 0.0-1.0,
    "requires_changes": ["List of required architecture changes"],
    "conflicts": ["List of conflicts with current architecture"],
    "synergies": ["List of synergies with current architecture"],
    "integration_difficulty": "easy|medium|hard|very_hard",
    "recommended": true/false,
    "rationale": "Why you recommend this or not"
}}

Assess compatibility:"""

        response, success = await call_claude(prompt, timeout=180)

        compatibility = {
            "compatibility_score": 0.5,
            "requires_changes": [],
            "conflicts": [],
            "synergies": [],
            "integration_difficulty": "medium",
            "recommended": False,
            "rationale": "Analysis pending"
        }

        if success:
            try:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    compatibility = json.loads(json_match.group())
            except:
                pass

        self.log(f"Compatibility: {compatibility.get('compatibility_score', 0):.2f}", "SUCCESS")
        return compatibility


class PlannerAgent(BaseAgent):
    """
    Generates actionable implementation plans.
    The planner who turns DREAMS into REALITY!
    """

    def __init__(self):
        super().__init__(
            name="PlannerAgent",
            description="Generates implementation plans"
        )

    async def run(self, claim: WildClaim, compatibility: Dict[str, Any]) -> IntegrationPlan:
        """Generate an implementation plan."""
        self.log(f"Planning implementation: {claim.title[:50]}...")

        prompt = f"""You are a technical planner creating an implementation plan for TinyPM.

VALIDATED TECHNIQUE:
Title: {claim.title}
Content: {claim.content}
Validation Score: {claim.validation_score}
Claims: {json.dumps(claim.extracted_claims)}

COMPATIBILITY ASSESSMENT:
{json.dumps(compatibility, indent=2)}

Create a detailed implementation plan as JSON:
{{
    "effort_estimate": 5.0,  // Estimated days
    "impact_estimate": 0.8,  // Expected impact 0-1
    "priority_score": 0.75,  // Priority 0-1
    "prerequisites": [
        "Prerequisite 1",
        "Prerequisite 2"
    ],
    "implementation_steps": [
        "Phase 1: Setup - Step description",
        "Phase 2: Core - Step description",
        "Phase 3: Integration - Step description",
        "Phase 4: Testing - Step description"
    ],
    "rollback_plan": [
        "Step to rollback if issues arise"
    ],
    "success_metrics": [
        "Metric to measure success"
    ],
    "sprint_recommended": "Sprint 1|Sprint 2|Backlog"
}}

Create the implementation plan:"""

        response, success = await call_claude(prompt, timeout=180)

        plan_data = {
            "effort_estimate": 5.0,
            "impact_estimate": 0.5,
            "priority_score": 0.5,
            "prerequisites": [],
            "implementation_steps": [],
            "rollback_plan": [],
            "success_metrics": [],
            "sprint_recommended": "Backlog"
        }

        if success:
            try:
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    plan_data = json.loads(json_match.group())
            except:
                pass

        plan = IntegrationPlan(
            claim_id=claim.id,
            effort_estimate=float(plan_data.get("effort_estimate", 5.0)),
            impact_estimate=float(plan_data.get("impact_estimate", 0.5)),
            priority_score=float(plan_data.get("priority_score", 0.5)),
            prerequisites=plan_data.get("prerequisites", []),
            implementation_steps=plan_data.get("implementation_steps", []),
            rollback_plan=plan_data.get("rollback_plan", []),
            success_metrics=plan_data.get("success_metrics", []),
            sprint_recommended=plan_data.get("sprint_recommended", "Backlog"),
            created_at=datetime.now().isoformat()
        )

        self.log(f"Plan created: priority={plan.priority_score:.2f}", "SUCCESS")
        return plan

# ===============================================================================
# CZAR SUPERVISOR - THE MAD SCIENTIST MASTERMIND
# ===============================================================================

class WildClaimsCzar(BaseAgent):
    """
    The Wild Claims Czar - Supreme Coordinator of Science!

    Orchestrates all scouts, validators, and integrators.
    Prioritizes claims by wildness + validity.
    Generates daily digests for the development team.

    "WHERE OTHERS SEE CHAOS, I SEE... OPPORTUNITY FOR SCIENCE!"
    """

    def __init__(self):
        super().__init__(
            name="WildClaimsCzar",
            description="Supreme coordinator of the Wild Claims research team"
        )

        # Initialize all agents
        self.scouts = [
            ForumScout(),
            PaperScout(),
            SocialScout()
        ]

        self.validators = [
            FactChecker(),
            DebateAgent(),
            CodeTester()
        ]

        self.architect = ArchitectAgent()
        self.planner = PlannerAgent()

        # Load state
        self.state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        """Load Czar state from disk."""
        if CZAR_STATE_FILE.exists():
            try:
                return json.loads(CZAR_STATE_FILE.read_text())
            except:
                pass
        return {
            "last_scan": {},
            "claims_processed": 0,
            "validations_run": 0,
            "plans_generated": 0,
            "started_at": datetime.now().isoformat()
        }

    def _save_state(self):
        """Save Czar state to disk."""
        self.state["updated_at"] = datetime.now().isoformat()
        CZAR_STATE_FILE.write_text(json.dumps(self.state, indent=2))

    async def run(self, command: str = "full"):
        """Run the Czar's command cycle."""
        self.log("=" * 60)
        self.log("WILD CLAIMS CZAR AWAKENS!")
        self.log("=" * 60)

        if command == "scan" or command == "full":
            await self.scan_all_sources()

        if command == "validate" or command == "full":
            await self.validate_pending_claims()

        if command == "integrate" or command == "full":
            await self.generate_integration_plans()

        if command == "report" or command == "full":
            await self.generate_daily_digest()

        self._save_state()
        self.log("CZAR CYCLE COMPLETE - SCIENCE MARCHES ON!")

    async def scan_all_sources(self):
        """Deploy all scouts to gather claims."""
        self.log("DEPLOYING SCOUT TEAM...")

        db = get_db()
        new_claims = 0

        for scout in self.scouts:
            try:
                claims = await scout.run()
                for claim in claims:
                    # Check for duplicates (by title hash)
                    title_hash = hashlib.md5(claim.title.encode()).hexdigest()[:8]
                    claim.id = f"{claim.source_type}_{title_hash}"

                    if db.add_claim(claim):
                        new_claims += 1

            except Exception as e:
                self.log(f"Scout {scout.name} failed: {e}", "ERROR")

        self.state["last_scan"]["all"] = datetime.now().isoformat()
        self.state["claims_processed"] = db.get_stats()["total_claims"]

        self.log(f"SCAN COMPLETE: {new_claims} new specimens collected", "SUCCESS")

    async def validate_pending_claims(self):
        """Validate all pending claims."""
        self.log("BEGINNING VALIDATION SEQUENCE...")

        db = get_db()
        pending = db.get_claims_by_status(ClaimStatus.DISCOVERED)

        # Only validate high-wildness claims first
        pending = sorted(pending, key=lambda c: c.wildness_score, reverse=True)[:10]

        validated = 0
        for claim in pending:
            try:
                # Update status to validating
                claim.status = ClaimStatus.VALIDATING.value
                db.update_claim(claim)

                # Run all validators
                validation_scores = []
                for validator in self.validators:
                    result = await validator.run(claim)
                    db.add_validation(result)
                    validation_scores.append(result.score)

                # Calculate overall validation score
                claim.validation_score = sum(validation_scores) / len(validation_scores)

                # Update status based on score
                if claim.validation_score >= 0.6:
                    claim.status = ClaimStatus.VALIDATED.value
                    validated += 1
                else:
                    claim.status = ClaimStatus.REJECTED.value

                db.update_claim(claim)

            except Exception as e:
                self.log(f"Validation failed for {claim.id}: {e}", "ERROR")
                claim.status = ClaimStatus.DISCOVERED.value
                db.update_claim(claim)

        self.state["validations_run"] = db.get_stats()["total_validations"]
        self.log(f"VALIDATION COMPLETE: {validated}/{len(pending)} claims validated", "SUCCESS")

    async def generate_integration_plans(self):
        """Generate plans for validated claims."""
        self.log("GENERATING INTEGRATION PLANS...")

        db = get_db()
        validated = db.get_claims_by_status(ClaimStatus.VALIDATED)

        # Only plan for claims without existing plans
        needs_plan = [c for c in validated if c.id not in db.plans]

        plans_created = 0
        for claim in needs_plan[:5]:  # Limit to 5 at a time
            try:
                # Assess compatibility
                compatibility = await self.architect.run(claim)

                if compatibility.get("recommended", False):
                    # Generate plan
                    plan = await self.planner.run(claim, compatibility)
                    db.add_plan(plan)

                    # Update claim status
                    claim.integration_plan = plan.to_dict()
                    claim.status = ClaimStatus.INTEGRATED.value
                    db.update_claim(claim)

                    plans_created += 1

            except Exception as e:
                self.log(f"Planning failed for {claim.id}: {e}", "ERROR")

        self.state["plans_generated"] = db.get_stats()["total_plans"]
        self.log(f"PLANNING COMPLETE: {plans_created} new plans generated", "SUCCESS")

    async def generate_daily_digest(self):
        """Generate the daily digest report."""
        self.log("GENERATING DAILY DIGEST...")

        db = get_db()
        stats = db.get_stats()

        # Gather data for digest
        top_claims = db.get_top_claims(limit=3)
        recent = db.get_recent_discoveries(hours=24)
        validating = db.get_claims_by_status(ClaimStatus.VALIDATING)
        rejected = db.get_claims_by_status(ClaimStatus.REJECTED)

        # Build digest
        date_str = datetime.now().strftime("%Y-%m-%d")

        digest = f"""# Wild Claims Daily Digest - {date_str}

## THE MAD SCIENTIST'S REPORT

*"WHERE OTHERS SEE DATA, I SEE... THE FUTURE!"*

---

## Top 3 Validated Claims

"""

        for i, claim in enumerate(top_claims, 1):
            plan = db.plans.get(claim.id)
            effort = plan.effort_estimate if plan else "TBD"
            priority = plan.priority_score if plan else 0

            digest += f"""### {i}. {claim.title}
**Source:** {claim.source_type} - {claim.source_url}
**Validation Score:** {claim.validation_score:.1f}/1.0
**Wildness:** {claim.wildness_score}/10
**Effort:** {effort} days
**Priority:** {priority:.2f}

{claim.content[:300]}...

**Key Claims:**
"""
            for extracted in claim.extracted_claims[:3]:
                digest += f"- {extracted}\n"

            digest += "\n---\n\n"

        digest += f"""## Claims Under Investigation ({len(validating)})

"""
        for claim in validating[:5]:
            digest += f"- **{claim.title[:50]}...** - Validation in progress\n"

        digest += f"""

## Recent Discoveries ({len(recent)} in last 24h)

"""
        for claim in recent[:5]:
            digest += f"- [{claim.wildness_score}/10] {claim.title[:60]}...\n"

        digest += f"""

## Rejected Claims ({len(rejected)})

"""
        for claim in rejected[:5]:
            validations = db.validations.get(claim.id, [])
            concerns = []
            for v in validations:
                concerns.extend(v.concerns[:1])
            concern_str = concerns[0] if concerns else "Failed validation"
            digest += f"- **{claim.title[:40]}...** - {concern_str}\n"

        digest += f"""

## Database Statistics

| Metric | Count |
|--------|-------|
| Total Claims | {stats['total_claims']} |
| Validated | {stats['by_status'].get('validated', 0)} |
| In Validation | {stats['by_status'].get('validating', 0)} |
| Rejected | {stats['by_status'].get('rejected', 0)} |
| Integration Plans | {stats['total_plans']} |

---

## Recommended Actions

"""

        if top_claims:
            digest += f"1. **Review claim #1** for immediate implementation: {top_claims[0].title[:50]}...\n"
        if len(top_claims) > 1:
            digest += f"2. **Assign engineer** to prototype claim #2: {top_claims[1].title[:50]}...\n"
        if recent:
            digest += f"3. **Monitor** {len(recent)} recent discoveries for emerging patterns\n"

        digest += """
---

*This digest was generated by the Wild Claims Czar.*
*SCIENCE OUTSHINES MAGIC!*
"""

        # Save digest
        DIGEST_OUTPUT_DIR.mkdir(exist_ok=True)
        digest_file = DIGEST_OUTPUT_DIR / f"digest_{date_str}.md"
        digest_file.write_text(digest)

        self.log(f"DIGEST SAVED: {digest_file}", "SUCCESS")

        # Also print to stdout
        print("\n" + "=" * 60)
        print(digest)
        print("=" * 60)

        return digest

# ===============================================================================
# CLI INTERFACE - THE CONTROL PANEL
# ===============================================================================

async def main():
    """Main entry point for the Wild Claims Czar."""

    parser = argparse.ArgumentParser(
        description="Wild Claims Czar - The Mad Scientist's Research Apparatus",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  scan        Scan all sources for wild claims
  validate    Validate pending claims
  integrate   Generate integration plans for validated claims
  report      Generate daily digest
  run         Run full cycle (scan + validate + integrate + report)
  status      Show current database statistics
  daemon      Run as background service (coming soon)

SCIENCE OUTSHINES MAGIC!
        """
    )

    parser.add_argument("command", nargs="?", default="status",
                       choices=["scan", "validate", "integrate", "report", "run", "status", "daemon"],
                       help="Command to execute")
    parser.add_argument("--daemon", action="store_true",
                       help="Run as background daemon")

    args = parser.parse_args()

    print("""
    ===============================================================================
         WILD CLAIMS CZAR - THE MAD SCIENTIST'S RESEARCH APPARATUS
    ===============================================================================
                        *lightning crackles*

                 "WHERE OTHERS SEE DATA, I SEE... THE FUTURE!"

    ===============================================================================
    """)

    if args.command == "status" and not args.daemon:
        db = get_db()
        stats = db.get_stats()

        print("SPECIMEN VAULT STATUS:")
        print("-" * 40)
        print(f"  Total Claims:      {stats['total_claims']}")
        print(f"  By Status:")
        for status, count in stats.get('by_status', {}).items():
            print(f"    - {status}: {count}")
        print(f"  Total Validations: {stats['total_validations']}")
        print(f"  Integration Plans: {stats['total_plans']}")
        print("-" * 40)

        # Show recent top claims
        top = db.get_top_claims(limit=3)
        if top:
            print("\nTOP VALIDATED SPECIMENS:")
            for i, claim in enumerate(top, 1):
                print(f"  {i}. [{claim.wildness_score}/10] {claim.title[:60]}...")

        return

    czar = WildClaimsCzar()

    if args.daemon:
        log("DAEMON MODE - CONTINUOUS SCIENCE ACTIVATED!")
        while True:
            try:
                await czar.run("full")
                log("Sleeping for 4 hours until next scan cycle...")
                await asyncio.sleep(4 * 60 * 60)  # 4 hours
            except KeyboardInterrupt:
                log("DAEMON SHUTTING DOWN - SCIENCE PAUSED")
                break
            except Exception as e:
                log(f"Error in daemon cycle: {e}", "ERROR")
                await asyncio.sleep(60)  # Wait 1 minute on error
    else:
        await czar.run(args.command)

# ===============================================================================
# ENTRY POINT
# ===============================================================================

if __name__ == "__main__":
    asyncio.run(main())
