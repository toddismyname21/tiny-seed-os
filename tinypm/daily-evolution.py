#!/usr/bin/env python3
"""
TinyPM Daily Evolution Engine
═════════════════════════════════════════════════════════════════
Runs daily to keep Tiny Seed Farm OS at state-of-the-art.

This script:
1. Performs research on latest AI/farm/business techniques
2. Compares against current system capabilities
3. Generates evolution tasks
4. Logs improvements made

Usage:
    python3 daily-evolution.py              # Run evolution cycle
    python3 daily-evolution.py --research   # Research only
    python3 daily-evolution.py --evolve     # Evolution only
    python3 daily-evolution.py --report     # Show evolution stats

Automation:
    Add to crontab for daily runs:
    0 6 * * * cd ~/Documents/TIny_Seed_OS/tinypm && python3 daily-evolution.py

The Mantra:
    NO SHORTCUTS. ONLY THE BEST POSSIBLE.
    SO SMART IT KNOWS WHAT I NEED BEFORE I DO.
    STATE OF THE ART. TOP OF THE LINE. PRODUCTION READY.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# ═══════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════
APP_DIR = Path(__file__).parent
PROJECT_ROOT = APP_DIR.parent
RESEARCH_DIR = PROJECT_ROOT / "research"
BOARD_FILE = APP_DIR / "board.json"
EVOLUTION_LOG = RESEARCH_DIR / "EVOLUTION_LOG.md"
PERSONAS_DIR = APP_DIR / "personas"

# Existing Tiny Seed OS Learning System API
# The system already has RLHF-inspired learning - we ENHANCE, not rebuild
API_BASE = "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec"

# Existing learning endpoints to leverage:
# - getLearningStats() - Get current learning statistics
# - getDTMLearningData() - Get DTM learning data
# - getLearnedDTM() - Get learned DTM predictions
# - recordPriorityFeedback() - RLHF feedback with seasonal awareness
# - recordCorrectionFeedback() - COS learning feedback

# Research topics to cycle through
RESEARCH_TOPICS = [
    {
        "topic": "Agentic AI 2026",
        "queries": [
            "agentic AI orchestration 2026",
            "multi-agent systems best practices",
            "AI agent memory systems",
            "trust calibration AI agents"
        ],
        "category": "AI"
    },
    {
        "topic": "Farm Intelligence",
        "queries": [
            "AI crop planning algorithms 2026",
            "predictive yield forecasting",
            "farm labor optimization AI",
            "weather integration agriculture"
        ],
        "category": "FARM"
    },
    {
        "topic": "Business AI",
        "queries": [
            "customer retention AI small business",
            "predictive analytics SMB",
            "AI marketing automation 2026",
            "inventory optimization machine learning"
        ],
        "category": "BUSINESS"
    },
    {
        "topic": "Technical Stack",
        "queries": [
            "Google Apps Script performance 2026",
            "Progressive Web Apps best practices",
            "GitHub Pages optimization",
            "API caching strategies"
        ],
        "category": "TECH"
    },
    {
        "topic": "UX Innovation",
        "queries": [
            "dashboard design patterns 2026",
            "mobile first farm software",
            "AI powered UX",
            "voice interface business apps"
        ],
        "category": "UX"
    },
    {
        "topic": "Food Safety Tech",
        "queries": [
            "food traceability software 2026",
            "FSMA compliance automation",
            "PHI tracking technology",
            "farm food safety AI"
        ],
        "category": "COMPLIANCE"
    },
    {
        "topic": "Self-Improving Systems",
        "queries": [
            "self-improving AI systems",
            "continuous learning production systems",
            "MLOps small business",
            "automated system optimization"
        ],
        "category": "META"
    }
]

# ═══════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════
def ensure_dirs():
    """Create necessary directories."""
    RESEARCH_DIR.mkdir(exist_ok=True)

def load_board() -> dict:
    """Load the task board."""
    if BOARD_FILE.exists():
        with open(BOARD_FILE, "r") as f:
            return json.load(f)
    return {"version": "1.0", "project": "Tiny Seed Farm OS", "tasks": [], "next_id": 1}

def save_board(board: dict):
    """Save the task board."""
    with open(BOARD_FILE, "w") as f:
        json.dump(board, f, indent=2)

def get_day_of_week() -> int:
    """Get current day of week (0=Monday)."""
    return datetime.now().weekday()

def get_todays_topic() -> dict:
    """Get the research topic for today (cycles through topics)."""
    day = get_day_of_week()
    return RESEARCH_TOPICS[day % len(RESEARCH_TOPICS)]

def log_evolution(message: str):
    """Append to evolution log."""
    ensure_dirs()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    if not EVOLUTION_LOG.exists():
        EVOLUTION_LOG.write_text("# Tiny Seed Farm OS - Evolution Log\n\nTracking daily improvements to keep the system state-of-the-art.\n\n---\n\n")

    with open(EVOLUTION_LOG, "a") as f:
        f.write(f"\n## {timestamp}\n\n{message}\n\n---\n")

def create_evolution_task(title: str, description: str, role: str = "builder", priority: str = "high") -> dict:
    """Create a new evolution task."""
    board = load_board()
    task_id = board.get("next_id", 1)
    now = datetime.now().strftime("%Y-%m-%d")

    task = {
        "id": f"EVO-{task_id:03d}",
        "title": f"[EVOLUTION] {title}",
        "description": description,
        "role": role,
        "priority": priority,
        "status": "pending",
        "context": [],
        "created": now,
        "updated": now,
        "source": "daily-evolution"
    }

    board["tasks"].append(task)
    board["next_id"] = task_id + 1
    save_board(board)

    return task

# ═══════════════════════════════════════════════════════════════
# RESEARCH ENGINE
# ═══════════════════════════════════════════════════════════════
def perform_research():
    """
    Perform today's research.

    This launches a Claude agent with the researcher persona
    to search the web and compile findings.
    """
    topic = get_todays_topic()
    today = datetime.now().strftime("%Y-%m-%d")

    print(f"\n{'═' * 60}")
    print(f"  DAILY RESEARCH: {topic['topic']}")
    print(f"  Category: {topic['category']}")
    print(f"  Date: {today}")
    print(f"{'═' * 60}\n")

    # Load researcher persona
    researcher_prompt = (PERSONAS_DIR / "researcher.md").read_text()

    # Build research request
    queries = "\n".join(f"- {q}" for q in topic['queries'])

    research_prompt = f"""
{researcher_prompt}

## TODAY'S RESEARCH ASSIGNMENT

**Topic:** {topic['topic']}
**Category:** {topic['category']}
**Date:** {today}

**Search Queries to Use:**
{queries}

**Your Task:**
1. Search the web for each query
2. Find the most recent (2025-2026) and authoritative sources
3. Identify techniques that could improve Tiny Seed Farm OS
4. Write a research report following the format in your persona
5. Save the report to: /Users/samanthapollack/Documents/TIny_Seed_OS/research/{today}_{topic['category'].lower()}_research.md

Focus on ACTIONABLE improvements, not theoretical concepts.
What can we actually implement to make the system smarter?
"""

    # Save prompt for manual use if Claude CLI isn't available
    prompt_file = APP_DIR / ".research-prompt.md"
    prompt_file.write_text(research_prompt)

    print(f"Research prompt saved to: {prompt_file}")
    print(f"Topic: {topic['topic']}")
    print(f"Queries: {len(topic['queries'])}")
    print()

    # Try to launch Claude
    claude_cmd = find_claude()
    if claude_cmd:
        print(f"Launching Claude researcher...")
        try:
            subprocess.run([
                claude_cmd,
                "--system-prompt", research_prompt,
                "--cwd", str(PROJECT_ROOT),
            ])
        except Exception as e:
            print(f"Error launching Claude: {e}")
            print(f"Run manually: claude --system-prompt \"$(cat {prompt_file})\"")
    else:
        print("Claude CLI not found.")
        print(f"Run research manually with: claude --system-prompt \"$(cat {prompt_file})\"")

    log_evolution(f"### Research Performed\n- Topic: {topic['topic']}\n- Category: {topic['category']}\n- Queries: {len(topic['queries'])}")

def find_claude() -> Optional[str]:
    """Find Claude CLI."""
    candidates = [
        "claude",
        os.path.expanduser("~/.claude/local/claude"),
        "/usr/local/bin/claude",
        "/opt/homebrew/bin/claude",
    ]
    for c in candidates:
        try:
            result = subprocess.run(["which", c] if "/" not in c else ["test", "-x", c],
                                  capture_output=True, timeout=5)
            if result.returncode == 0:
                return c
        except:
            pass
    return None

# ═══════════════════════════════════════════════════════════════
# EVOLUTION ENGINE
# ═══════════════════════════════════════════════════════════════
def check_recent_research() -> List[Path]:
    """Find research reports from the last 7 days."""
    cutoff = datetime.now() - timedelta(days=7)
    recent = []

    if RESEARCH_DIR.exists():
        for f in RESEARCH_DIR.glob("*.md"):
            if f.name.startswith("20"):  # Date-prefixed files
                try:
                    date_str = f.name[:10]
                    file_date = datetime.strptime(date_str, "%Y-%m-%d")
                    if file_date >= cutoff:
                        recent.append(f)
                except:
                    pass

    return sorted(recent, reverse=True)

def extract_recommendations(report_path: Path) -> List[dict]:
    """Extract actionable recommendations from a research report."""
    content = report_path.read_text()
    recommendations = []

    # Simple parsing - look for table rows or bullet points under "Recommendations"
    in_recommendations = False
    for line in content.split("\n"):
        if "recommendation" in line.lower() and "#" in line:
            in_recommendations = True
            continue
        if in_recommendations:
            if line.startswith("#"):
                break
            if "|" in line and "HIGH" in line.upper():
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 3:
                    recommendations.append({
                        "priority": "high",
                        "title": parts[1] if len(parts) > 1 else "Unknown",
                        "source": report_path.name
                    })
            elif line.strip().startswith("- ") and ("implement" in line.lower() or "add" in line.lower() or "create" in line.lower()):
                recommendations.append({
                    "priority": "medium",
                    "title": line.strip("- ").strip(),
                    "source": report_path.name
                })

    return recommendations

def run_evolution():
    """
    Run the evolution cycle:
    1. Check recent research
    2. Extract recommendations
    3. Create evolution tasks
    4. Log progress
    """
    print(f"\n{'═' * 60}")
    print(f"  EVOLUTION CYCLE")
    print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'═' * 60}\n")

    # Find recent research
    reports = check_recent_research()
    print(f"Recent research reports: {len(reports)}")

    if not reports:
        print("No recent research found. Run --research first.")
        return

    # Extract recommendations
    all_recommendations = []
    for report in reports:
        recs = extract_recommendations(report)
        all_recommendations.extend(recs)
        print(f"  {report.name}: {len(recs)} recommendations")

    print(f"\nTotal recommendations: {len(all_recommendations)}")

    # Check what's already in the board
    board = load_board()
    existing_titles = {t.get("title", "").lower() for t in board.get("tasks", [])}

    # Create tasks for new recommendations
    created = 0
    for rec in all_recommendations:
        title = rec["title"][:60]
        if f"[evolution] {title}".lower() not in existing_titles:
            task = create_evolution_task(
                title=title,
                description=f"From research: {rec['source']}\n\nImplement this improvement to keep Tiny Seed Farm OS state-of-the-art.",
                priority=rec["priority"]
            )
            print(f"  Created: {task['id']} - {title}")
            created += 1

    print(f"\nTasks created: {created}")

    # Log
    log_evolution(f"### Evolution Cycle\n- Reports analyzed: {len(reports)}\n- Recommendations found: {len(all_recommendations)}\n- Tasks created: {created}")

# ═══════════════════════════════════════════════════════════════
# EXISTING LEARNING SYSTEM INTEGRATION
# ═══════════════════════════════════════════════════════════════
def fetch_existing_learning_stats() -> Optional[dict]:
    """
    Fetch learning statistics from the EXISTING Tiny Seed OS learning system.
    This leverages the already-built RLHF-inspired learning that's been working.
    """
    import urllib.request
    import urllib.error

    try:
        url = f"{API_BASE}?action=getLearningStats"
        req = urllib.request.Request(url, headers={'User-Agent': 'TinyPM-Evolution'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            return data if data.get('success') else None
    except Exception as e:
        print(f"  (Could not fetch learning stats: {e})")
        return None

def fetch_dtm_learning_data() -> Optional[dict]:
    """
    Fetch DTM (Days to Maturity) learning data from existing system.
    The system already learns from actual harvest dates vs predictions.
    """
    import urllib.request

    try:
        url = f"{API_BASE}?action=getDTMLearningData"
        req = urllib.request.Request(url, headers={'User-Agent': 'TinyPM-Evolution'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            return data if data.get('success') else None
    except Exception as e:
        print(f"  (Could not fetch DTM data: {e})")
        return None

# ═══════════════════════════════════════════════════════════════
# METRICS & REPORTING
# ═══════════════════════════════════════════════════════════════
def show_evolution_stats():
    """Show evolution statistics including existing learning system."""
    print(f"\n{'═' * 60}")
    print(f"  EVOLUTION & LEARNING STATISTICS")
    print(f"{'═' * 60}\n")

    # --- EXISTING LEARNING SYSTEM STATS ---
    print("EXISTING LEARNING SYSTEM (Already Built):")
    print("─" * 40)

    learning_stats = fetch_existing_learning_stats()
    if learning_stats:
        print(f"  Total Feedback Recorded: {learning_stats.get('totalFeedback', 0)}")
        print(f"  Applied Learnings: {learning_stats.get('appliedLearnings', 0)}")
        patterns = learning_stats.get('patterns', [])
        if patterns:
            print(f"  Patterns Learned: {len(patterns)}")
            for p in patterns[:3]:  # Show top 3
                print(f"    - {p}")
    else:
        print("  (API not reachable - stats unavailable)")

    dtm_data = fetch_dtm_learning_data()
    if dtm_data:
        print(f"\n  DTM Learning:")
        print(f"    Crops Tracked: {dtm_data.get('cropsTracked', 0)}")
        print(f"    Prediction Accuracy: {dtm_data.get('accuracy', 'N/A')}")
    print()

    # --- EVOLUTION ENGINE STATS ---
    print("EVOLUTION ENGINE (Enhancement Layer):")
    print("─" * 40)

    # Research stats
    if RESEARCH_DIR.exists():
        reports = list(RESEARCH_DIR.glob("*.md"))
        print(f"  Research Reports: {len(reports)}")
        recent = check_recent_research()
        print(f"  Last 7 days: {len(recent)}")
    else:
        print("  Research Reports: 0")

    # Task stats
    board = load_board()
    tasks = board.get("tasks", [])
    evo_tasks = [t for t in tasks if t.get("source") == "daily-evolution" or "[EVOLUTION]" in t.get("title", "")]

    print(f"\n  Evolution Tasks: {len(evo_tasks)}")
    pending = sum(1 for t in evo_tasks if t.get("status") == "pending")
    progress = sum(1 for t in evo_tasks if t.get("status") == "in_progress")
    done = sum(1 for t in evo_tasks if t.get("status") == "done")
    print(f"    Pending: {pending}")
    print(f"    In Progress: {progress}")
    print(f"    Done: {done}")

    if evo_tasks and done > 0:
        print(f"\n  Completion Rate: {done}/{len(evo_tasks)} ({100*done//len(evo_tasks)}%)")

    # Topic coverage
    print("\n  Research Topic Schedule (Daily Rotation):")
    for i, topic in enumerate(RESEARCH_TOPICS):
        day_name = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7]
        marker = "→" if i == get_day_of_week() else " "
        print(f"    {marker} {day_name}: {topic['topic']} ({topic['category']})")

    print()

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def main():
    ensure_dirs()

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "--research":
            perform_research()
        elif arg == "--evolve":
            run_evolution()
        elif arg == "--report":
            show_evolution_stats()
        elif arg == "--help":
            print(__doc__)
        else:
            print(f"Unknown argument: {arg}")
            print("Use --help for usage info")
    else:
        # Full cycle: research + evolution
        print("""
╔═══════════════════════════════════════════════════════════════╗
║  TINY SEED FARM OS - DAILY EVOLUTION ENGINE                   ║
║                                                               ║
║  NO SHORTCUTS. ONLY THE BEST POSSIBLE.                       ║
║  SO SMART IT KNOWS WHAT I NEED BEFORE I DO.                  ║
║  STATE OF THE ART. TOP OF THE LINE. PRODUCTION READY.        ║
╚═══════════════════════════════════════════════════════════════╝
""")
        perform_research()
        print("\n" + "─" * 60 + "\n")
        run_evolution()
        print("\n" + "─" * 60 + "\n")
        show_evolution_stats()

if __name__ == "__main__":
    main()
