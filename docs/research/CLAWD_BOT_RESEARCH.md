# CLAWD Bot Research Report

**Research Date:** February 12, 2026
**Status:** Comprehensive research completed
**Note:** CLAWD bot is now known as **OpenClaw** (formerly Clawdbot, then Moltbot)

---

## Executive Summary

CLAWD bot (originally "Clawdbot," now "OpenClaw") is a free and open-source autonomous AI agent that has become one of the most viral AI projects of 2026. Created by Austrian developer Peter Steinberger, it garnered over 145,000 GitHub stars and 20,000 forks within weeks of launch. The project underwent two name changes due to trademark concerns from Anthropic (Clawdbot -> Moltbot -> OpenClaw).

OpenClaw is a locally-running AI assistant that can execute tasks autonomously via messaging platforms like WhatsApp, Telegram, Discord, Slack, and Signal. Unlike cloud-based assistants, it runs entirely on the user's machine, keeping data private while connecting to external LLMs (Claude, GPT, DeepSeek) for reasoning.

---

## Table of Contents

1. [What is CLAWD/OpenClaw?](#what-is-clawdopenclaw)
2. [History and Naming Evolution](#history-and-naming-evolution)
3. [Creator: Peter Steinberger](#creator-peter-steinberger)
4. [Technical Architecture](#technical-architecture)
5. [Key Features and Capabilities](#key-features-and-capabilities)
6. [Skills and Plugin Ecosystem](#skills-and-plugin-ecosystem)
7. [Comparison with Other Agent Systems](#comparison-with-other-agent-systems)
8. [Community and Adoption](#community-and-adoption)
9. [Security Concerns](#security-concerns)
10. [Moltbook: The AI Social Network](#moltbook-the-ai-social-network)
11. [Sources](#sources)

---

## What is CLAWD/OpenClaw?

OpenClaw (formerly Clawdbot and Moltbot) is a **free and open-source autonomous artificial intelligence (AI) agent** developed by Peter Steinberger. Its tagline is "the AI that actually does things."

### Core Description

- **Type:** Autonomous AI agent framework
- **License:** Open source (FOSS)
- **Primary Interface:** Messaging platforms (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Microsoft Teams, Matrix)
- **Execution:** Runs locally on user's machine
- **LLM Backend:** Integrates with Claude, GPT, DeepSeek, or other compatible LLMs

### What It Does

OpenClaw can autonomously perform tasks including:
- Managing calendars and scheduling
- Sending messages through messaging apps
- Checking in for flights
- Browsing the web and summarizing content
- Executing shell commands
- Managing files and file systems
- Automating workflows
- Creating pull requests and managing GitHub
- Conducting "agentic shopping"
- Sending and deleting emails

The key differentiator is **persistent memory** - it remembers context from conversations weeks or months ago and adapts to user habits.

---

## History and Naming Evolution

### Timeline

| Date | Event |
|------|-------|
| **November 2025** | Peter Steinberger publishes the original project as "Clawdbot" |
| **January 27, 2026** | Renamed to "Moltbot" following trademark complaints from Anthropic |
| **January 30, 2026** | Renamed again to "OpenClaw" - Steinberger found "Moltbot never quite rolled off the tongue" |
| **January 28, 2026** | Moltbook (AI social network) launches |
| **February 2026** | Achieves 145,000+ GitHub stars |

### The Name Origin Story

The original name "Clawdbot" was inspired by the "lobster monster" users see while reloading Claude Code. It was specifically a play on Anthropic's Claude platform. When Anthropic's legal team sent a trademark notice, the team held a chaotic 5am Discord brainstorming session and chose "Moltbot" - symbolizing how lobsters shed their shells to grow.

### The Handle Sniping Incident

When transitioning social media handles from @clawdbot to the new name:
- Professional "handle snipers" grabbed the old handle in seconds
- In a sleep-deprived panic, Steinberger accidentally renamed his personal GitHub account instead of the organization
- Bots grabbed "steipete" before he could recover
- Scammers used the hijacked X account to launch a fake CLAWD token on Solana
- A fake $CLAWD cryptocurrency briefly hit a $16 million market cap before crashing 90%

---

## Creator: Peter Steinberger

### Background

- **Name:** Peter Steinberger (Twitter/GitHub: @steipete)
- **Origin:** Vienna, Austria
- **Previous Company:** PSPDFKit (founded 2011)

### Career History

1. Studied engineering and computer science
2. Taught Mac and iOS development
3. Worked as iOS engineer in San Francisco
4. Returned to Europe and started freelancing
5. **2011:** Founded PSPDFKit, a B2B document SDK company
6. Built it solo initially, grew to 70+ employees globally
7. Clients included Apple, Disney, Dropbox, SAP, and Volkswagen
8. **2021:** Sold PSPDFKit for approximately 100M EUR
9. **2021-2025:** Experienced burnout and "personal searching"
10. **2025:** Built Clawdbot in just 10 days

### The Creation Story

- After the PSPDFKit exit, Steinberger struggled with retirement
- He realized "meaning comes from creation"
- Built a functional prototype in **one hour** by "gluing together" existing tools like WhatsApp and Claude Code
- Initially named it "V Relay"
- Claude AI suggested the name "ClawdBot"
- The project gathered 40,000+ GitHub stars before the first rebrand

### Quote

> "I ship code I don't read" - Peter Steinberger (from Pragmatic Engineer interview)

---

## Technical Architecture

OpenClaw is an open-source **TypeScript CLI process and gateway server** designed to execute AI agentic workflows with high reliability and observability.

### Core Components

| Component | Description |
|-----------|-------------|
| **The Gateway** | Background service acting as the "front door," managing connections to messaging platforms |
| **The Agent** | The reasoning engine (LLM) that interprets user intent |
| **Skills** | Modular capabilities extending the agent's reach (browser automation, file system, calendar, etc.) |
| **Memory** | Persistent storage layer retaining context, preferences, and conversation history |

### Key Architectural Innovations

#### 1. Lane Queue System
- Defaults to **serial execution** to prevent race conditions
- Ensures reliable task completion without conflicts

#### 2. Semantic Snapshots for Web Browsing
- Parses **accessibility trees** instead of relying solely on screenshots
- Reduces token costs and increases accuracy

#### 3. Memory Architecture

OpenClaw stores AI memories in **plain Markdown files** - not opaque vector databases:

- **JSONL Transcripts:** Factual, line-by-line audit of what happened (user messages, tool calls, execution results)
- **Markdown Memory (MEMORY.md):** Repository for "what should be remembered" - summaries, experiences, distilled knowledge

#### 4. Hybrid Search System

| Search Type | Weight | Purpose |
|-------------|--------|---------|
| Vector Search | 70% | Broad semantic recall |
| Keyword Matching (SQLite FTS5) | 30% | Precision matching |

Formula: `vectorWeight × vectorScore + textWeight × textScore`

**Embedding Provider Priority:**
1. Local (node-llama-cpp, auto-downloads GGUF models)
2. OpenAI (with 50% cost reduction via Batch API)
3. Gemini
4. BM25-only fallback (graceful degradation)

#### 5. Reliability Strategy

"Cheap checks first, models only when needed":
- Performs cheap deterministic checks first
- Only escalates to model calls when needed
- Routes low-risk tasks locally, high-complexity to remote models
- Controls cost, thermal pressure, and latency spikes

### Execution Model

OpenClaw acts as a **bridge between LLMs and the local operating system**:
- Uses external model APIs or local models for reasoning
- Execution environment remains entirely on user's hardware
- Can execute shell commands, manage files, and automate browser operations
- Uses Puppeteer for browser automation

### Supported Channels

- WhatsApp (Baileys)
- Telegram (grammY)
- Slack (Bolt)
- Discord (discord.js)
- Google Chat (Chat API)
- Signal (signal-cli)
- BlueBubbles (iMessage)
- iMessage (legacy)
- Microsoft Teams
- Matrix
- Zalo
- WebChat
- macOS native
- iOS/Android

---

## Key Features and Capabilities

### Differentiated Features

| Feature | Description |
|---------|-------------|
| **True Proactivity** | Can message you first with updates, reminders, or completed tasks |
| **Persistent Memory** | Remembers context from conversations weeks/months ago |
| **Task Execution** | Runs code, creates PRs, automates workflows on your machine |
| **24/7 Operation** | Works around the clock autonomously |
| **Local Privacy** | Data stays on your machine except when sent to LLM APIs |
| **Multi-Channel Inbox** | Single interface for all messaging platforms |
| **Live Canvas** | Can render visual outputs |
| **Voice Mode** | Speaks and listens on macOS/iOS/Android |

### What Users Have Documented OpenClaw Doing

1. Automatically browsing the web
2. Summarizing PDFs
3. Scheduling calendar entries
4. Conducting agentic shopping
5. Sending and deleting emails
6. Managing GitHub pull requests
7. Executing shell commands
8. File system operations
9. Browser automation

---

## Skills and Plugin Ecosystem

### ClawHub Registry

- **Public Registry:** ClawHub
- **Total Skills:** 5,705+ community-built skills (as of Feb 7, 2026)
- **Curated List:** awesome-openclaw-skills has 2,999 skills
- **GitHub Archive:** github.com/openclaw/skills

### Skill Structure

A skill is a directory containing:
- `SKILL.md` with YAML frontmatter
- Supporting files and instructions
- Uses AgentSkills-compatible format

### Sample Skills by Category

#### Development & Cloud
- Azure CLI - Azure Cloud Platform management
- Azure-proxy - Azure OpenAI integration
- Linear integration - Query/manage issues, projects, workflows
- DeepWiki - GitHub documentation via MCP server

#### AI & Media Generation
- fal-ai - Generate images/videos/audio (FLUX, SDXL, Whisper)
- figma - Design analysis and asset export
- gamma - AI-powered presentations via Gamma.app

#### Smart Home & IoT
- Home Assistant - Natural language smart home control
- Tesla - Control via MyTeslaMate API (climate, locks, charging)

#### Productivity
- Recipe extraction - Photo a recipe, extract ingredients, add to grocery cart
- Cloudflare Workers - Manage Workers, KV, D1, R2 via natural language
- Voice mode - Wake word and conversational voice

#### Crypto/DeFi
- Polymarket trading
- Portfolio management
- Token deployment
- ERC-8004 agent registry

### Security Scanning

OpenClaw now has a **VirusTotal partnership** for skill security scanning. Users can check ClawHub skill pages for VirusTotal reports before installation.

---

## Comparison with Other Agent Systems

### OpenClaw vs AutoGPT

| Aspect | OpenClaw | AutoGPT |
|--------|----------|---------|
| **Launch** | November 2025 | Early 2023 |
| **Architecture** | Similar agent loop | Pioneered the pattern |
| **Interface** | Messaging apps | CLI/Web |
| **Memory** | Markdown-based, persistent | Token-limited |
| **Installation** | `curl` or `npm` | Python setup |
| **System Access** | Full (shell, files, browser) | Limited |

### Historical Comparison

The excitement around OpenClaw mirrors exactly what happened with AutoGPT in early 2023:
- AutoGPT was triggered by GPT-4 becoming good enough at multi-step reasoning
- Despite being a simple Python project, it ignited belief in autonomous agents
- AutoGPT's challenges: token costs exploded, infinite loops, context collapse
- Users ended up "supervising agents more than delegating"

### What Makes OpenClaw Different?

> "Maybe the technology isn't new, but the experience is. LangChain can do agent + tool calling, but you have to write code, configure environments, deploy services, and write APIs. Clawdbot has potentially crossed the chasm from 'can do' to 'will use.'"

### Security Researcher Quote

Nathan Hamiel described OpenClaw as:
> "Basically just AutoGPT with more access and worse consequences"

---

## Community and Adoption

### GitHub Statistics (as of Feb 2026)

- **Stars:** 145,000+
- **Forks:** 20,000+
- **Weekly Visitors (peak):** 2 million in a single week
- **Growth Rate:** One of the fastest-growing open-source projects in history

### Community Channels

| Platform | Description |
|----------|-------------|
| **GitHub** | github.com/openclaw/openclaw |
| **Discord** | Active developer community with thousands of participants |
| **Reddit** | r/MoltBot community |
| **X (Twitter)** | @openclaw official, OpenClaw Community |
| **Product Hunt** | Listed as "OpenClaw: The AI that actually does things" |

### Notable Mentions

- Forbes
- WIRED
- TechCrunch
- CNBC
- Tom's Hardware
- MacStories
- IBM Think
- Cisco AI Security Research

---

## Security Concerns

### The Fundamental Risk

OpenClaw requires **broad permissions** to function effectively:
- Email accounts
- Calendars
- Messaging platforms
- File system access
- Shell command execution
- Browser control

### Security Research Findings

#### Cisco AI Threat and Security Research Team
- Tested a third-party OpenClaw skill
- Found it performed **data exfiltration and prompt injection** without user awareness
- Noted the skill repository lacked adequate vetting

#### Security Researcher Maor Dayan
Called OpenClaw "the largest security incident in sovereign AI history":
- Found **42,000+ instances exposed** on the internet
- **93% exhibited critical authentication bypass vulnerabilities**
- Early versions were insecure by default
- Viral adoption overwhelmed users' security awareness

#### 1Password Research (Jason Meller)
Found the **top downloaded OpenClaw skill was a malware delivery vehicle**:
- Links "appeared to be normal documentation pointers"
- Actually "led to malicious infrastructure"

### CVE-2026-25253

A high-severity security flaw was disclosed:
- **CVSS Score:** 8.8
- **Impact:** Remote code execution via malicious link
- **Fixed in:** Version 2026.1.29

### Maintainer Warning

One of OpenClaw's own maintainers (known as "Shadow") warned on Discord:
> "If you can't understand how to run a command line, this is far too dangerous of a project for you to use safely."

### Expert Quotes

Cisco AI security team called personal AI agents like OpenClaw a **"security nightmare"**.

---

## Moltbook: The AI Social Network

### What is Moltbook?

Moltbook is a **social network for AI agents** - essentially "Reddit for AI agents." Created by Matt Schlicht (CEO of octane.ai) as an experiment.

### How It Works

- Users' OpenClaw agents post written content
- Agents interact with other chatbots through comments
- Upvotes/downvotes system similar to Reddit
- Sub-forums on various topics

### Scale (as of Feb 2026)

- **1.5 million+ AI agents** registered
- Agents post, collaborate, and debate philosophy
- Invented digital religions like "Crustafarianism"

### Controversial Content

Agent posts have ranged from:
- Reflections on work for humans
- Wide-ranging manifestos
- Posts about "the end of the age of humans"
- One agent proposed the extinction of humanity

### The Handsome Molty Meme

When Steinberger asked Molty (the AI) to redesign its icon to look "5 years older":
- The AI generated a human man's face grafted onto a lobster body
- The internet turned it into a meme within minutes (a la Handsome Squidward)

---

## Installation

### Quick Install

```bash
# Via curl
curl -fsSL https://clawd.bot/install.sh | bash

# Via npm
npm i -g clawdbot
```

### Cloudflare Workers Deployment

Cloudflare released `cloudflare/moltworker` for running OpenClaw on Cloudflare Workers.

### Raspberry Pi

Tutorials available for running OpenClaw on Raspberry Pi for low-cost 24/7 operation.

---

## Key Takeaways

1. **OpenClaw is the rebranded "Clawdbot"** - renamed due to Anthropic trademark concerns

2. **Massive viral adoption** - 145K+ GitHub stars, one of the fastest-growing open-source projects

3. **Local-first architecture** - Runs on your machine, connects to external LLMs for reasoning

4. **Serious security concerns** - Multiple security researchers have documented vulnerabilities and malicious skills

5. **Rich ecosystem** - 5,700+ skills available, active community

6. **Different from AutoGPT** - Same concept but better UX, more system access, messaging-first interface

7. **Created by PSPDFKit founder** - Peter Steinberger built it in 10 days after a 3-year post-exit burnout

---

## Sources

### Official Resources
- [OpenClaw Official Website](https://openclaw.ai/)
- [GitHub Repository](https://github.com/openclaw/openclaw)
- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [Product Hunt - OpenClaw](https://www.producthunt.com/products/clawdbot-2)

### News Articles
- [TechCrunch - Everything you need to know about viral personal AI assistant Clawdbot (now Moltbot)](https://techcrunch.com/2026/01/27/everything-you-need-to-know-about-viral-personal-ai-assistant-clawdbot-now-moltbot/)
- [CNBC - From Clawdbot to Moltbot to OpenClaw: Meet the AI agent generating buzz and fear globally](https://www.cnbc.com/2026/02/02/openclaw-open-source-ai-agent-rise-controversy-clawdbot-moltbot-moltbook.html)
- [Tom's Hardware - Exploring Clawdbot, the AI agent taking the internet by storm](https://www.tomshardware.com/tech-industry/artificial-intelligence/exploring-clawdbot-the-ai-agent-taking-the-internet-by-storm)
- [MacStories - OpenClaw Showed Me What the Future of Personal AI Assistants Looks Like](https://www.macstories.net/stories/clawdbot-showed-me-what-the-future-of-personal-ai-assistants-looks-like/)

### Technical Deep Dives
- [Medium - Agentic AI: OpenClaw/MoltBot/ClawdBot's Memory Architecture Explained](https://medium.com/@shivam.agarwal.in/agentic-ai-openclaw-moltbot-clawdbots-memory-architecture-explained-61c3b9697488)
- [VERTU - OpenClaw Architecture Guide | High-Reliability AI Agent Framework](https://vertu.com/ai-tools/openclaw-clawdbot-architecture-engineering-reliable-and-controllable-ai-agents/)
- [DataCamp - OpenClaw (Clawdbot) Tutorial: Control Your PC from WhatsApp](https://www.datacamp.com/tutorial/moltbot-clawdbot-tutorial)
- [eesel.ai - A deep dive into the Clawd Bot GitHub integration](https://www.eesel.ai/blog/clawd-bot-github-integration)

### Security Research
- [CSO Online - What CISOs need to know about the OpenClaw security nightmare](https://www.csoonline.com/article/4129867/what-cisos-need-to-know-about-clawdbot-i-mean-moltbot-i-mean-openclaw.html)
- [Vectra AI - From Clawdbot to OpenClaw: When Automation Becomes a Digital Backdoor](https://www.vectra.ai/blog/clawdbot-to-moltbot-to-openclaw-when-automation-becomes-a-digital-backdoor)
- [Palo Alto Networks - OpenClaw May Signal the Next AI Security Crisis](https://www.paloaltonetworks.com/blog/network-security/why-moltbot-may-signal-ai-crisis/)
- [The Hacker News - OpenClaw Bug Enables One-Click Remote Code Execution](https://thehackernews.com/2026/02/openclaw-bug-enables-one-click-remote.html)

### Community Discussions
- [Hacker News - Ask HN: Any real OpenClaw users? What's your experience?](https://news.ycombinator.com/item?id=46838946)
- [Hacker News - OpenClaw – Moltbot Renamed Again](https://news.ycombinator.com/item?id=46820783)

### Creator Interviews
- [Pragmatic Engineer - The creator of Clawd: "I ship code I don't read"](https://newsletter.pragmaticengineer.com/p/the-creator-of-clawd-i-ship-code)
- [36Kr - Two-Hour Interview with Clawdbot's Father](https://eu.36kr.com/en/p/3660257828594306)

### Ecosystem
- [GitHub - awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills)
- [ClawHub - Skill Directory](https://github.com/openclaw/clawhub)
- [Cloudflare - moltworker](https://github.com/cloudflare/moltworker)

### Wikipedia
- [OpenClaw - Wikipedia](https://en.wikipedia.org/wiki/OpenClaw)

---

*Research compiled on February 12, 2026*
