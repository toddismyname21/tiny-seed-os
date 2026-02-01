# TinyPM Codebase Functionality Audit Report

**Date:** January 31, 2026
**Overall Status:** 70-80% Working (needs configuration for remaining features)

---

## Executive Summary

TinyPM has a solid architecture with most core features functional. The main gaps are configuration-dependent features (OAuth, API keys) and missing API endpoints for some dashboard features.

---

## WORKING (Green) - Fully Functional

### Core Web Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard Serving | ✅ Working | HTML at root path |
| Task CRUD | ✅ Working | Full create/update/delete |
| Task Board | ✅ Working | Status, priority, roles |
| Activity Feed | ✅ Working | Posts updates, marks read |
| File Uploads | ✅ Working | Multipart, manifest tracking |
| PM Chat | ✅ Working | Claude API integration |
| Agent Chat | ✅ Working | Multi-agent, persona-based |
| Agent Registry | ✅ Working | Spawn, heartbeat |
| Intercom System | ✅ Working | User-to-agent messaging |
| Agent Questions | ✅ Working | Post & answer questions |
| Launch Checklist | ✅ Working | Full tracking |
| Persona System | ✅ Working | Markdown personas |
| Braindump Parser | ✅ Working | Claude task extraction |

### Backend Systems
| System | Status | Notes |
|--------|--------|-------|
| PM Orchestrator | ✅ Working | File watching, Claude integration |
| PM Brain | ✅ Working | Pattern learning, confidence scoring |
| Builder Autonomous | ✅ Working | Task execution, mentor/critic loop |
| Wild Claims Czar | ✅ Working | Database, claim management |
| Project Manager | ✅ Working | Multiple project types |
| Life Organizer | ✅ Working | State, settings, logging |
| Skills API | ✅ Working | Listing, execution, history |

---

## PARTIALLY WORKING (Yellow) - Needs Configuration

| Feature | Issue | Fix Required |
|---------|-------|--------------|
| Remote Terminal | Needs `websockets` library | `pip install websockets` |
| Calendar Integration | Needs Google OAuth | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Email Integration | Needs Gmail OAuth | Same as calendar |
| Weather Widget | Returns hardcoded data | Add OpenWeatherMap API |
| Feedback System | No GET endpoint | Add `api_get_feedback` |
| Life Organizer Tasks | Needs APScheduler | `pip install apscheduler` |
| OAuth Manager | Needs Supabase setup | Configure env vars |

---

## BROKEN (Red) - Not Functional

| Feature | Status | Impact |
|---------|--------|--------|
| LangGraph Integration | Import fails without package | Durable execution unavailable |
| Predictive Intent Engine | Optional, may not load | Feature disabled |
| A2A Protocol | Partially implemented | Integration unclear |
| MCP Server | Exists but unclear setup | Needs documentation |

---

## MISSING Features

| Feature | Description | Priority |
|---------|-------------|----------|
| GET /api/feedback | Admin view for feedback | P1 |
| Real Weather API | Replace hardcoded data | P2 |
| Remote Terminal in Dashboard | Currently separate | P2 |
| Projects Tab API | Incomplete endpoints | P2 |
| Goals API | Referenced but missing | P3 |
| Important Dates API | Missing implementation | P3 |
| Nudge Engine API | Dashboard integration | P3 |
| Progress Monitor API | Not exposed | P4 |

---

## Required Dependencies

### Python Packages
```bash
pip install anthropic apscheduler websockets supabase langgraph
```

### Environment Variables
```bash
ANTHROPIC_API_KEY       # Required for API chat
GOOGLE_CLIENT_ID        # Required for Calendar/Gmail
GOOGLE_CLIENT_SECRET    # Required for Calendar/Gmail
SUPABASE_URL           # Optional for cloud sync
SUPABASE_KEY           # Optional for cloud sync
```

---

## Priority Fixes for 100% Production

### Priority 1 (Critical)
1. Add GET /api/feedback endpoint
2. Document OAuth setup with step-by-step guide
3. Add requirements.txt with all dependencies

### Priority 2 (High)
1. Integrate Remote Terminal into main dashboard tabs
2. Implement real Weather API (OpenWeatherMap free tier)
3. Complete Projects API with full CRUD

### Priority 3 (Medium)
1. Add Nudge Engine API endpoints for dashboard
2. Implement Goals tracking UI
3. Add Important Dates management

### Priority 4 (Low)
1. Document A2A protocol usage
2. Add MCP server documentation
3. Improve error messages for missing dependencies

---

## Files Analyzed

| File | Lines | Status |
|------|-------|--------|
| web_server.py | 3400+ | ✅ Working |
| pm_orchestrator.py | 2700+ | ✅ Working |
| pm_brain.py | 1000+ | ✅ Working |
| web_dashboard.html | 9500+ | ✅ Working |
| wild_claims_czar.py | 500+ | ⚠️ Partial |
| builder_autonomous.py | 356 | ✅ Working |
| remote_terminal_bridge.py | 800+ | ⚠️ Partial |
| life_organizer.py | 200+ | ⚠️ Partial |
| project_manager.py | 200+ | ✅ Working |
| skills_api.py | 200+ | ✅ Working |
| critic.py | 200+ | ✅ Working |

---

*Audit completed January 31, 2026*
