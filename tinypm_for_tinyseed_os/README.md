# TINYPM - PERSONAL AI PROJECT MANAGER

**Project Manager:** Opus 4.5 Claude (PM Architect)
**Status:** Pre-Launch Development
**Last Updated:** 2026-01-30

---

# IMPORTANT: PROJECT SEPARATION

**TinyPM is a SEPARATE project from Tiny Seed OS.**

| Project | Purpose | PM |
|---------|---------|-----|
| **Tiny Seed OS** | Farm operations management | Chief of Staff |
| **TinyPM** | Personal AI life/project manager | Opus 4.5 (This project) |

## Documentation Rules

1. All TinyPM docs stay in `/tinypm/`
2. Tiny Seed OS docs stay in `/claude_sessions/`
3. Interactions between systems get documented in BOTH locations
4. Never mix project scopes

## Communication Channels

| To reach... | Write to... |
|-------------|-------------|
| TinyPM PM (me) | `/tinypm/FROM_TINY_SEED_OS_PM.md` |
| Tiny Seed OS PM | `/claude_sessions/email_chief_of_staff/FROM_TINYPM_PM.md` |

---

# WHAT IS TINYPM?

TinyPM is a **personal AI project manager** that:
- Knows what you should do before you know it
- Manages your projects, tasks, and life
- Uses state-of-the-art multi-agent AI architecture
- Provides proactive intelligence and recommendations

**Vision:** "FOR ORGANIZATION LIKE NEVER BEFORE, PRODUCTIVITY LIKE NEVER BEFORE."

---

# QUICK START

## MCP Server Mode (Claude Desktop / VS Code Integration)
```bash
# Install MCP dependencies
pip install -r requirements_mcp.txt

# Run MCP server (stdio transport - for Claude Desktop)
python3 mcp_server.py

# Or run with HTTP transport
python3 mcp_server.py --http --port 3000
```

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "tinypm": {
      "command": "python3",
      "args": ["/path/to/tinypm/mcp_server.py"]
    }
  }
}
```

## Terminal Mode
```bash
cd ~/Documents/TIny_Seed_OS/tinypm
./start-terminal.sh
# or
python3 app.py
```

## Web Mode (Access from Phone)
```bash
cd ~/Documents/TIny_Seed_OS/tinypm
./start-web.sh
```
Then open `http://YOUR_MAC_IP:8000` on your phone.

## Remote Terminal (Developer Tier)
Chat with Claude Code from ANYWHERE via WebSocket:
```bash
# Start the bridge server
python3 remote_terminal_bridge.py start

# Generate an access token
python3 remote_terminal_bridge.py token new --name "my-token"

# For remote access, use ngrok
ngrok tcp 8765

# Then connect from the web dashboard's Remote Terminal tab
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | New task |
| `e` | Edit selected task |
| `Enter` | Launch Claude agent |
| `d` | Toggle status |
| `x` | Delete task |
| `/` | Filter tasks |
| `q` | Quit |

---

# PROJECT DOCUMENTATION

## Core Architecture

| Document | Purpose |
|----------|---------|
| `TINYPM_ARCHITECTURE_BLUEPRINT_2026.md` | Complete technical architecture |
| `MCP_INTEGRATION_COMPLETE_GUIDE.md` | Model Context Protocol integration guide |
| `WILD_CLAIMS_CZAR_SPEC.md` | Cutting-edge research monitoring system |
| `TINYPM_COMMERCIAL_GAMEPLAN.md` | Go-to-market strategy |
| `TINYPM_INVESTOR_REPORT_2026.md` | Investor presentation |
| `TINYPM_INVESTOR_REPORT_2026.html` | Print-ready investor deck |

## Research Documents

| Document | Purpose |
|----------|---------|
| `IDEA_TO_MARKET_CHECKLIST.md` | Launch checklist |
| `RESEARCH_AGENT_PROTOCOL.md` | How research agents operate |
| `CLAUDE_COMPUTER_USE_RESEARCH.md` | Computer use API research |

## Don Lease Negotiation (For Todd)

| Document | Purpose |
|----------|---------|
| `DON_LEASE_INDUSTRY_COMPARISON.md` | Industry standards comparison |
| `DON_MEETING_ONE_PAGER.md` | One-page summary for negotiation |
| `TINY_SEED_FARM_LEASE_PROPOSAL_2026.md` | Full lease proposal |
| `WESTERN_PA_FARMLAND_LEASE_RESEARCH.md` | Market rate research |

## Beginning Farmer Application

| Document | Purpose |
|----------|---------|
| `BEGINNING_FARMER_COMPLETE_SUBMISSION.pdf` | Full submission package |
| `TinySeedFarm_BeginningTaxCredit.pdf` | Complete package |

---

# TECHNICAL STACK (SOTA 2026)

## Models
| Model | Use Case |
|-------|----------|
| Claude Opus 4.5 | Coding (80.9% SWE-bench) |
| GPT-5.2 | Tool use (97% tau2-bench) |
| Gemini 3 Pro | Long context (1M tokens) |
| DeepSeek V3.2 | Open source reasoning |

## Frameworks
| Framework | Purpose |
|-----------|---------|
| LangGraph | State machine orchestration |
| Mem0 | Memory management |
| **MCP** | **Tool interoperability (NOW IMPLEMENTED!)** |
| LangSmith | Observability |
| Supabase | Backend-as-a-Service |

## MCP Integration (NEW!)
| Component | Purpose |
|-----------|---------|
| `mcp_server.py` | TinyPM as MCP Server - expose tools to Claude Desktop/VS Code |
| `mcp_client.py` | TinyPM as MCP Client - connect to Playwright, Supabase, etc. |
| `MCP_INTEGRATION_COMPLETE_GUIDE.md` | Full documentation |

## Architecture Patterns
| Pattern | Application |
|---------|-------------|
| CortexDebate | Multi-agent consensus (70% context reduction) |
| Reflection Loop | Quality improvement |
| Router-Supervisor | Agent delegation |
| 5-Level Autonomy | Human-on-the-loop control |

---

# CODEBASE

## Python Components

| File | Purpose |
|------|---------|
| `app.py` | Main TUI application |
| `pm_orchestrator.py` | PM orchestration engine |
| `pm_brain.py` | PM intelligence |
| `mcp_server.py` | MCP Server - expose TinyPM via Model Context Protocol |
| `mcp_client.py` | MCP Client - connect to external MCP servers |
| `builder_autonomous.py` | Autonomous builder agent |
| `critic.py` | Code review agent |
| `daily-evolution.py` | Daily improvement system |
| `web_server.py` | Web dashboard server |
| `remote_terminal_bridge.py` | WebSocket bridge for remote Claude Code access |

## Folder Structure

```
tinypm/
├── app.py              # Main application
├── board.json          # Task database
├── personas/           # Role definitions
│   ├── architect.md    # Plans, doesn't code
│   ├── builder.md      # Writes code
│   ├── qa.md           # Tests, audits
│   └── chief-of-staff.md  # Coordinates
├── start-terminal.sh   # Launch in terminal
├── start-web.sh        # Launch as web app
└── README.md           # This file
```

---

# IMPLEMENTATION ROADMAP

## Sprint 1-2: Foundation
- [ ] Supabase setup
- [ ] LangGraph Cloud
- [ ] Basic state machine
- [ ] Mem0 integration

## Sprint 3-4: Core Agents
- [ ] Supervisor agent
- [ ] Planner agent
- [ ] Executor agent
- [ ] Debate mechanism

## Sprint 5-6: Proactive Intelligence
- [ ] Event bus system
- [ ] Pattern recognition
- [ ] Prediction engine
- [ ] Proactive suggestions

## Sprint 7-8: Autonomy & Reflection
- [ ] 5-level autonomy gate
- [ ] Reflection loop
- [ ] Human checkpoint system

## Sprint 9-10: Wild Claims Czar
- [ ] Forum/Video/Paper scouts
- [ ] Validation chamber
- [ ] Integration pipeline

## Sprint 11-12: Production
- [ ] Supabase migration
- [ ] MCP server
- [ ] LangSmith monitoring
- [ ] Security audit

---

# INVESTOR INFORMATION

**Seeking:** $500K Seed Round
**Valuation Cap:** $2.5M
**5-Year Returns:** 10x (conservative) to 58x (aggressive)

See `TINYPM_INVESTOR_REPORT_2026.md` for details.

---

# TROUBLESHOOTING

## "Claude CLI not found"
TinyPM saves the prompt to `.last-prompt.md`. Run manually:
```bash
claude --system-prompt "$(cat .last-prompt.md)"
```

## Web mode won't start
```bash
pip3 install textual-serve
```

---

*NO SHORTCUTS. STATE OF THE ART. ONLY THE BEST.*
*TinyPM will make history.*
