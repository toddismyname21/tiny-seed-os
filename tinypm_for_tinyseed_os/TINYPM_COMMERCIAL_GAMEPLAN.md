# TinyPM Commercial Product Game Plan
## "The Initiate's Orb" & "The Archmage's Sanctum"
### Compiled Research + Strategy Document — January 28, 2026

---

## EXECUTIVE SUMMARY

TinyPM is being positioned as a commercial AI project management product with a wizard-themed two-tier offering. This document synthesizes research from 5 parallel agents covering competitors, ASO/app store strategy, tech stack, marketing, and monetization/compliance.

**The Opportunity:** The AI agent orchestration market is projected at $8.5B by 2026 and $35-52B by 2030. Height AI (the closest autonomous PM competitor) shut down in September 2025, leaving a market gap. No existing PM tool offers true multi-agent orchestration accessible to non-developers. TinyPM fills that gap.

**The Product:** A wizard-themed AI project management platform in two tiers:
- **Tier 1: "The Initiate's Orb"** — Consumer-friendly, cloud-only, subscription-based
- **Tier 2: "The Archmage's Sanctum"** — Power user, BYOK, terminal access, full control

---

## PART 1: PRODUCT VISION — THE WIZARD THEME

### Tier 1: The Initiate's Orb (Consumer — $20/mo "Mana Pool")

**Target:** Non-technical users, freelancers, small teams who want AI to manage their projects without touching a terminal.

| Feature | Description |
|---------|-------------|
| **Cloud-Only** | Everything runs in the cloud. No terminal, no local files. Just open the app and go. |
| **Pre-Built Agents** | "Select Your Familiar" — choose from pre-built agent archetypes: The Researcher, The Scribe, The Taskmaster, The Analyst |
| **Mana Pool Subscription** | $20/mo buys a pool of AI credits. Credits consumed by agent actions. Visual mana bar shows remaining balance. |
| **Brain Dump** | Natural language input → AI structures into tasks, projects, and agent assignments |
| **The Scrying Pool** | Visual dashboard showing all active agents, their progress, and real-time activity |
| **Chamber of Sigils** | Template marketplace where users create and share project "spells" (templates) |

**Upsell Trigger:** When a user hits a capability limit, the system says: *"I cannot see beyond the veil, Architect. The Archmage's Sanctum holds the power you seek."*

### Tier 2: The Archmage's Sanctum (Pro — $35/mo or BYOK)

**Target:** Developers, technical leads, power users who want full control.

| Feature | Description |
|---------|-------------|
| **BYOK (Bring Your Own Key)** | Use your own Anthropic/OpenAI API key. Zero server-side AI cost for us. |
| **Terminal Access** | Full terminal integration. Agents can execute commands, access local files. |
| **Custom Agents** | Build custom agent "familiars" with specific skills, tools, and behaviors |
| **Multi-Agent Orchestration** | Spawn parallel agents on different tasks. The Overseer coordinates. |
| **Desktop Hook-In** | Local file system access, IDE integration, shell commands |
| **Self-Learning** | System learns your workflow patterns and suggests automations |
| **Advanced Scrying** | Deep analytics, agent performance tracking, cost monitoring |

### Why This Two-Tier Structure Works

1. **Zero server AI cost on Pro tier** — BYOK users pay Anthropic directly. Our margin is 95%+ on Pro subscriptions.
2. **Consumer tier captures the "just works" market** — 90% of PM tool users are non-technical. They want AI to do the work without configuring anything.
3. **Natural upsell path** — Consumer users who outgrow the Orb naturally graduate to the Sanctum.
4. **Wizard theme differentiates** — In a market of bland corporate UIs (Monday, Asana, ClickUp), the wizard theme is memorable, shareable, and fun.

---

## PART 2: COMPETITIVE LANDSCAPE

### Direct PM Competitors

| Tool | Revenue | AI Capability | TinyPM Advantage |
|------|---------|---------------|------------------|
| **Monday.com** | $1.23B | "Sidekick" AI (beta), text generation only | TinyPM agents DO the work, not just suggest |
| **Notion** | $500-600M | Autonomous agents (3.0), but single-agent, 20-min limit, cloud-only | TinyPM: multi-agent, no time limit, desktop access |
| **Asana** | $790M | "AI Teammates" within Asana structure only | TinyPM works on ANY project type, not just Asana tasks |
| **ClickUp** | N/A | Brain AI — buggy, expensive add-on ($9-28/user/mo extra) | TinyPM: AI is the core product, not a bolt-on |
| **Taskade** | $1.8M | Closest feature match — custom AI agents, multi-agent | TinyPM: desktop access, terminal integration, much deeper |
| **Height AI** | DEAD | Was the most ambitious autonomous PM — shut down Sept 2025 | TinyPM fills the exact gap Height left |

### Adjacent AI Tool Competitors

| Tool | Revenue | Why Not a Threat |
|------|---------|------------------|
| **Cursor** | $500M-1B ARR | Code-only. No PM layer. No task management. |
| **Devin** | N/A ($4B val) | Code-only. No PM layer. No brain dump. |
| **GitHub Copilot** | Massive | Locked to GitHub ecosystem. No PM. |
| **CrewAI** | Enterprise ($60K/yr) | Developer framework, not a product. Requires Python. |
| **LangGraph** | 90M downloads | Infrastructure, not a product. |

### The Key Insight

**No product in the market combines:**
1. Multi-agent AI orchestration
2. Project management (tasks, boards, tracking)
3. Brain dump (natural language → structured work)
4. Desktop/terminal access
5. Accessible to non-developers

TinyPM is the only product attempting all five. The closest competitor (Taskade, $1.8M revenue) lacks desktop access and depth. The most well-funded competitor (Notion, $10B valuation) is limited to single-agent, cloud-only, 20-minute sessions.

---

## PART 3: RECOMMENDED TECH STACK

### Primary Recommendation: Tauri 2.0 + Supabase

| Layer | Technology | Why |
|-------|-----------|-----|
| **Desktop + Mobile App** | Tauri 2.0 (Rust + React/TypeScript) | Single codebase for Mac, Windows, Linux, iOS, Android. System-level access. 10x smaller than Electron. |
| **Web App** | React / Next.js | Shares React components with Tauri frontend. SSR/SSG. |
| **Backend** | Supabase (PostgreSQL + Realtime + Auth) | Open source. Row-level security. pgvector for AI. Self-hostable. |
| **AI Orchestration** | Dedicated service (Rust or Python + LangGraph) | Separate for independent scaling. MCP protocol support. |
| **AI APIs** | Anthropic Claude (primary) | Intelligent routing: Haiku for simple, Sonnet for most, Opus for complex. |
| **Offline Sync** | SQLite + CRDTs | Local-first with conflict-free sync to cloud PostgreSQL. |
| **On-Device AI** | ONNX Runtime | Cross-platform inference. CoreML on iOS, NNAPI on Android. |
| **Plugin Sandbox** | WebAssembly | Capability-based security for third-party plugins. |
| **Agent Sandbox** | Firecracker microVMs | Hardware-level isolation for untrusted code execution. |

### Alternative (If Team Lacks Rust Experience)

| Layer | Technology |
|-------|-----------|
| Desktop | Electron |
| Mobile | React Native (Expo) |
| Web | Next.js |
| Shared | TypeScript monorepo |

### Critical Architecture Note

**AI agent orchestration CANNOT run on-device in mobile background.** iOS limits background tasks to ~30 seconds. All agent execution must be server-side, with mobile as a monitoring/control interface receiving push notifications.

---

## PART 4: MONETIZATION STRATEGY

### Recommended Pricing

| Tier | Name | Price | AI Model | Target |
|------|------|-------|----------|--------|
| **Free** | "The Apprentice" | $0 | Haiku only, 50 actions/mo | Try before buy |
| **Consumer** | "The Initiate's Orb" | $20/mo (Mana Pool) | Sonnet, generous credits | Non-technical users |
| **Pro** | "The Archmage's Sanctum" | $35/mo OR BYOK | Sonnet + Opus, BYOK option | Developers, power users |
| **Team** | "The Council" | $25/user/mo | Shared agents, collaboration | Small teams |
| **Enterprise** | "The Grand Conclave" | Custom | Dedicated, SSO, SLA | Organizations |

### Unit Economics

| Metric | Estimate |
|--------|----------|
| Light user API cost | $0.50-1.50/mo |
| Medium user API cost | $1.50-5.00/mo |
| Heavy user API cost | $5.00-25.00/mo |
| Consumer tier margin ($20/mo) | 65-75% (with Sonnet) |
| Pro BYOK tier margin ($35/mo) | 95%+ (user pays AI directly) |

### Cost Optimization

1. **Prompt caching** — 70-90% cost reduction on repeated context
2. **Batch API** — 50% discount for non-urgent tasks
3. **Model routing** — Haiku for classification/routing ($1/M), Sonnet for most work ($3/M), Opus only for complex reasoning ($5/M)
4. **Hard caps on Free tier**, soft caps with overage on paid tiers

### Revenue Benchmarks

- Freemium converts at 2-5% (top quartile: 8-15%)
- 7-day reverse trial converts at ~40%
- Target NRR above 100% for sustainable growth
- Usage-based pricing delivers 10% higher NRR, 22% lower churn, 2x faster growth vs. flat subscriptions

---

## PART 5: APP STORE STRATEGY

### Category Selection
- **Primary:** Productivity
- **Secondary:** Business (Apple allows two categories)
- **Google Play:** Productivity (only one category allowed)

### Critical Apple Requirement: Guideline 5.1.2(i)
Since TinyPM sends data to Anthropic's API, Apple requires:
1. **Name the AI provider** (Anthropic) explicitly
2. **Explain why data is sent** and what AI does with it
3. **Get explicit opt-in consent** BEFORE first data transmission
4. Build this consent flow BEFORE submitting to App Store

### ASO (App Store Optimization) Priorities

**Title:** "TinyPM: AI Project Manager" (max 30 chars)
**Subtitle:** "Multi-Agent Task Automation" (max 30 chars)

**Target Keywords:**
- "AI project management"
- "AI task manager"
- "AI agent"
- "project automation"
- "AI productivity"

**Screenshots:** 10 screenshots following Value → Usage → Trust framework
**Video:** 15-30 second preview showing brain dump → agent execution → results

### Launch Strategy

1. **Product Hunt** (Tuesday-Thursday, 12:01 AM PST)
2. **Hacker News** Show HN (same week)
3. **Reddit** — r/SideProject, r/ProductManagement, r/artificial
4. **Apple Featuring Nomination** — submit 3+ weeks before launch
5. **Coordinated email/social blast** on Day 1

---

## PART 6: MARKETING GAME PLAN

### The Single Most Important Insight

From every successful case study (Notion, Linear, Cursor):
> **The product IS the marketing.** Build something so good that users can't help but share it.

- Notion grew to millions with <5% paid traffic
- Linear spent $35K total on marketing ($400M valuation)
- Cursor had 15 employees at $500M ARR

### Priority Marketing Channels (Ranked)

1. **Product Hunt + Hacker News** — Free, high-intent developer/tech audience
2. **Twitter/X** — Build in public, changelog-as-marketing (Linear playbook)
3. **Reddit** — r/SideProject, r/ProductManagement, r/artificial (Perplexity sources 46.7% from Reddit)
4. **YouTube** — Tutorials, comparisons, "TinyPM vs Notion/Monday" videos
5. **GEO (Generative Engine Optimization)** — Get cited by ChatGPT, Perplexity, Google AI Overviews. This is the NEW frontier. 84% of brands aren't tracking this yet.
6. **LinkedIn** — Thought Leader Ads, founder-led content
7. **Newsletter sponsorships** — Niche AI/dev newsletters ($500-3K each)
8. **TikTok** — Start 3-6 months post-launch with user stories

### Budget Recommendations

| Budget Level | Focus | Allocation |
|-------------|-------|------------|
| **$1K** | 90% organic | BetaList, newsletters, community |
| **$5K** | 70% organic, 30% paid | Add Google Ads test, small YouTube influencer |
| **$10K** | 60% organic, 40% paid | Scale Google Ads, LinkedIn, YouTube reviews |
| **$50K** | 40% organic, 60% paid | Full multi-channel with measurement |

### Viral Loop Opportunities

1. **Template marketplace** — "Chamber of Sigils" where users create/share project templates
2. **"Powered by TinyPM"** watermark on free tier exports
3. **Team invitations** — inherent virality (every user invites teammates)
4. **Shareable project dashboards** — public project status pages
5. **Referral program** — Dropbox-style: referrer gets extra month, referred gets extended trial

### Open Source Strategy

Open-source the **agent SDK/framework** to build developer community. Keep the hosted platform, AI models, and enterprise features proprietary. This is the "open core" model used by GitLab, Supabase, and others.

---

## PART 7: LEGAL & COMPLIANCE CHECKLIST

### Must-Do Before Launch

- [ ] Form LLC or Corporation
- [ ] Obtain DUNS number (5-30 business days, free)
- [ ] Draft Privacy Policy (must name Anthropic as AI provider)
- [ ] Draft Terms of Service (AI output disclaimer, liability limitation)
- [ ] Draft Acceptable Use Policy
- [ ] Implement Apple Guideline 5.1.2(i) consent flow
- [ ] Complete Apple privacy labels
- [ ] Complete Google Play data safety section
- [ ] Implement in-app account deletion
- [ ] Implement in-app AI content reporting (Google Play)
- [ ] Obtain Apple Developer account ($99/yr)
- [ ] Obtain Google Play Developer account ($25 one-time)
- [ ] Code signing certificate for macOS ($99/yr Apple Developer)
- [ ] Code signing for Windows (Azure Trusted Signing $120/yr)

### Key Compliance Dates

| Date | Requirement |
|------|-------------|
| **Now** | Apple Guideline 5.1.2(i) — AI data sharing consent |
| **January 2026** | California AI Transparency Act (SB 942) |
| **August 2026** | EU AI Act transparency obligations |
| **September 2026** | Google Play developer verification global rollout |

### Desktop Distribution Decision

**Recommended: Direct distribution (NOT App Store)**
- macOS: Developer ID + notarization (avoids 30% commission + sandbox limitations)
- Windows: Azure Trusted Signing ($120/yr) for direct distribution
- Reason: App Store sandboxing would limit agent capabilities (file access, terminal, etc.)

---

## PART 8: BUILD ROADMAP

### Phase 1: Foundation (Months 1-2)
- [ ] Form legal entity + DUNS number
- [ ] Set up Supabase backend (auth, database, realtime)
- [ ] Core web app with React/Next.js
- [ ] Brain dump → structured tasks pipeline
- [ ] Basic agent orchestration (single agent)
- [ ] Privacy Policy, ToS, consent flows

### Phase 2: The Initiate's Orb MVP (Months 3-4)
- [ ] Pre-built agent archetypes (Researcher, Scribe, Taskmaster, Analyst)
- [ ] Mana Pool credit system
- [ ] Scrying Pool dashboard (agent monitoring)
- [ ] Mobile-responsive web app
- [ ] Stripe payment integration
- [ ] Beta test with 50-100 users

### Phase 3: The Archmage's Sanctum (Months 4-5)
- [ ] BYOK API key management
- [ ] Tauri desktop app with terminal access
- [ ] Custom agent builder
- [ ] Multi-agent orchestration
- [ ] Local file system access
- [ ] Offline sync (SQLite + CRDTs)

### Phase 4: Launch (Month 6)
- [ ] Product Hunt launch
- [ ] Hacker News Show HN
- [ ] App Store + Play Store submission
- [ ] Press outreach to AI/productivity journalists
- [ ] Begin paid acquisition tests
- [ ] Open-source agent SDK

### Phase 5: Growth (Months 7-12)
- [ ] Chamber of Sigils (template marketplace)
- [ ] Team tier features
- [ ] Plugin system (WebAssembly sandboxed)
- [ ] Integration partners (GitHub, Slack, Jira)
- [ ] Referral/affiliate program
- [ ] Content marketing + GEO optimization
- [ ] Scale paid channels based on CAC data

---

## PART 9: KEY RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| **AI API costs destroy margins** | Model routing (Haiku/Sonnet/Opus), prompt caching, BYOK tier |
| **Tauri mobile immature** | Build desktop first (Tauri proven), fallback to React Native for mobile |
| **Apple rejects app** | Build Guideline 5.1.2(i) consent flow early, test thoroughly |
| **Notion 3.0 adds multi-agent** | Move fast. Ship before they do. Our desktop hook-in is hard to replicate. |
| **User churn** | Focus on "wow moments", self-learning, and making agents genuinely useful |
| **Legal/compliance** | Hire privacy attorney, use compliance automation (Vanta/Drata) |
| **Market timing** | Height's death + AI agent hype cycle = window is NOW |

---

## SOURCES

All research sourced from 5 parallel research agents with 100+ verified web sources including:
- G2, Gartner, Deloitte, a16z, Sensor Tower, AppTweak
- Apple Developer Documentation, Google Play Developer Policies
- Competitor pricing pages and earnings reports
- Case studies: Notion, Linear, Cursor, ChatGPT, Perplexity
- Legal: GDPR, CCPA, EU AI Act, California AI Transparency Act
- Full source URLs available in individual research reports

---

*Document compiled by PM Architect — January 28, 2026*
*For Todd Wilson / Tiny Seed Farm OS*
