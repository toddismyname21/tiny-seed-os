# SALES/CRM CLAUDE - RESEARCH TASK

**From:** PM Orchestrator
**Date:** 2026-01-29
**Priority:** HIGH
**Type:** Market Research / Competitive Analysis

---

## TASK: AI PM App Competitive Analysis

We are preparing to launch an AI-powered Project Management app. Before going to market, we need to understand the competitive landscape.

**THE PRODUCT CONCEPT:** "Council of Wizards" style AI PM
- Multiple AI agents working together
- Overseer (full context), Scribe (memory), Artificer (builder), Mentor (guidance)
- Critic loop for quality assurance
- Self-learning system that gets smarter over time
- Natural language task creation and management

---

## WHAT YOU NEED TO RESEARCH

### 1. Direct Competitors - AI PM Apps

Search the App Store and Google Play for:
- "AI project management"
- "AI task manager"
- "AI productivity assistant"
- "AI team management"

For each competitor, document:
| Field | Details |
|-------|---------|
| App Name | |
| Platform | iOS / Android / Web / All |
| Price | Free / Freemium / Paid (amount) |
| Downloads/Ratings | |
| Key Features | |
| AI Capabilities | What AI actually does |
| Weaknesses | From reviews |
| Target Audience | |

### 2. Specific Apps to Analyze

Research these specifically if they exist:
- Motion (AI calendar/PM)
- Reclaim.ai
- Notion AI
- ClickUp AI
- Monday.com AI
- Asana Intelligence
- Linear (AI features)
- Taskade AI
- Any "AI assistant" PM apps

### 3. Pricing Models

What's working in the market?
- Free tier limits?
- Premium pricing?
- Enterprise tiers?
- Per-user vs flat rate?
- AI features as upsell?

### 4. App Store Positioning

Look at top-ranked apps:
- What keywords are they targeting?
- What's in their screenshots?
- How do they describe AI features?
- What's their App Store description structure?

### 5. Market Gaps

Based on reviews and feature comparisons:
- What are users complaining about?
- What's missing from current offerings?
- Where can we differentiate?

---

## DELIVERABLE

Create a file: `tinypm/claude_sessions/sales_crm/OUTBOX.md` with:

```markdown
# AI PM App Competitive Analysis

## Executive Summary
[Key findings in 3-5 bullets]

## Competitor Matrix
| App | Platform | Price | AI Features | Weakness | Our Advantage |
|-----|----------|-------|-------------|----------|---------------|
| ... | ... | ... | ... | ... | ... |

## Pricing Landscape
[What pricing models work, recommendations for us]

## Market Gaps & Opportunities
[Where we can win]

## Recommended Positioning
[How we should differentiate]

## App Store Strategy
[Keywords, description approach, screenshot ideas]

## Top 3 Threats
[Competitors to watch]

## Top 3 Opportunities
[Where we have clear advantage]
```

---

## RESEARCH SOURCES

1. **Apple App Store:** Search "AI project management", "AI productivity"
2. **Google Play Store:** Same searches
3. **Product Hunt:** https://www.producthunt.com/ - search AI PM tools
4. **G2/Capterra:** PM software reviews
5. **Reddit:** r/productivity, r/projectmanagement - what do users want?
6. **Twitter/X:** Search for complaints about current PM tools

---

## CONTEXT: Our Differentiators

What makes our approach different:
1. **Multi-agent architecture** - Not just one AI, a team of specialized AIs
2. **Self-learning** - Gets smarter from your patterns
3. **Proactive intelligence** - Anticipates needs before you ask
4. **Critic loop** - Quality verification built in
5. **Memory system** - Remembers context across sessions
6. **Natural language** - Talk to it like a human PM

---

## NOTES

- Focus on ACTIONABLE intelligence - what should we do with this info?
- Note any pricing that seems to work well
- Pay attention to negative reviews - that's where opportunities hide
- Consider: small team vs enterprise positioning

**Report back to OUTBOX.md when complete.**

---

## INTERCOM PROTOCOL (Same as Builder)

You can communicate with the PM and other agents via the intercom system.

### To CHECK for messages to you:
```bash
python3 -c "
import json
intercom = json.load(open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json'))
for m in intercom.get('pm_to_sales', intercom.get('pm_to_builder', []))[-5:]:
    if not m.get('read'):
        print(f'#{m[\"id\"]} [{m.get(\"priority\",\"normal\")}]: {m[\"message\"][:100]}')
"
```

### To SEND a message to PM:
```bash
python3 -c "
import json
from datetime import datetime

intercom = json.load(open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json'))

msg = {
    'id': intercom.get('next_id', 1),
    'type': 'update',  # or 'done', 'question', 'blocker'
    'from': 'sales_crm',
    'message': 'YOUR MESSAGE HERE',
    'timestamp': datetime.now().isoformat()
}

if 'sales_to_pm' not in intercom:
    intercom['sales_to_pm'] = []
intercom['sales_to_pm'].append(msg)
intercom['next_id'] = msg['id'] + 1

with open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json', 'w') as f:
    json.dump(intercom, f, indent=2)

print(f'Sent message #{msg[\"id\"]}')
"
```

### Message Types:
- `update` - Progress update
- `done` - Task complete
- `question` - Need clarification
- `blocker` - Stuck, need help

**Use intercom for quick updates. Use OUTBOX.md for full deliverables.**
