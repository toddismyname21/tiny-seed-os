# TinyPM MCP Server - Quick Start Guide

**Date:** 2026-01-30
**Status:** PRODUCTION READY

---

## What is this?

TinyPM exposes its capabilities via the Model Context Protocol (MCP), allowing Claude Desktop, VS Code, and other AI tools to:
- Manage tasks in your TinyPM board
- Communicate with Builder, Researcher, and other agents
- Trigger research via Wild Claims Czar
- Access predictive intelligence
- Store and retrieve facts from memory

---

## Quick Setup (5 minutes)

### Step 1: Install Dependencies

The MCP virtual environment is already set up. Just verify it works:

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm
source .mcp_venv/bin/activate
python3 -c "from mcp_server import mcp; print(f'MCP Server ready: {mcp.name}')"
```

### Step 2: Configure Claude Desktop

Copy the MCP configuration to Claude Desktop:

**macOS:**
```bash
# Option 1: Use the example config
cat claude_desktop_config_example.json
# Then manually add mcpServers to your Claude Desktop settings

# Option 2: Create new config
mkdir -p ~/.config/claude
cp claude_desktop_config_example.json ~/.config/claude/claude_desktop_config.json
```

**Or manually add to Claude Desktop settings:**

1. Open Claude Desktop
2. Go to Settings > Developer
3. Add MCP Server configuration:

```json
{
  "mcpServers": {
    "tinypm": {
      "command": "/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.mcp_venv/bin/python3",
      "args": ["/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/mcp_server.py"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### Step 4: Test It Works

In Claude Desktop, try:
- "What tasks are in TinyPM?"
- "Create a new task called 'Test MCP'"
- "Show me the proactive brief"

---

## Available Tools

| Tool | Description |
|------|-------------|
| `task_create` | Create new tasks |
| `task_list` | List all tasks (with filters) |
| `task_update` | Update task status/details |
| `task_delete` | Delete a task |
| `task_assign_to_builder` | Assign task to Builder agent |
| `agent_send_message` | Send message to any agent |
| `agent_get_status` | Check agent status |
| `agent_get_messages` | Get messages from agents |
| `research_scan_sources` | Trigger Wild Claims Czar scan |
| `research_get_validated_claims` | Get validated research |
| `predict_user_intent` | Get AI predictions |
| `get_proactive_brief` | Morning/daily brief |
| `memory_store` | Store a fact |
| `memory_retrieve` | Retrieve a fact |
| `memory_get_context` | Get recent context |

---

## Available Resources

| URI | Description |
|-----|-------------|
| `board://tasks` | All tasks |
| `board://active` | In-progress tasks only |
| `board://pending` | Pending tasks only |
| `memory://facts` | Stored memory facts |
| `claims://recent` | Recent wild claims |
| `claims://validated` | Validated claims |
| `intercom://messages` | Agent messages |

---

## Running Tests

```bash
source .mcp_venv/bin/activate
python3 test_mcp_server.py
```

---

## HTTP Server Mode

For remote access or debugging:

```bash
source .mcp_venv/bin/activate
python3 mcp_server.py --http --port 3000
```

Then access at `http://localhost:3000/mcp`

---

## Troubleshooting

### "MCP SDK not installed"
```bash
source .mcp_venv/bin/activate
pip install mcp
```

### "PM Brain not available"
The server will still work with reduced functionality. Memory operations will use local JSON storage.

### "Server not showing in Claude Desktop"
1. Check config file path
2. Verify Python path is correct
3. Restart Claude Desktop completely

---

## Files

| File | Purpose |
|------|---------|
| `mcp_server.py` | TinyPM MCP Server (tools + resources) |
| `mcp_client.py` | MCP Client Manager (connect to external servers) |
| `test_mcp_server.py` | Test suite |
| `claude_desktop_config_example.json` | Example config for Claude Desktop |
| `.mcp_venv/` | Python virtual environment |
| `.mcp_memory.json` | MCP memory storage |

---

*NO SHORTCUTS. PRODUCTION READY.*
