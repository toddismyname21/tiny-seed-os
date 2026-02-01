# TINYPM PROTOTYPE BUILD PLAN

## DEFINITIVE PLAN FOR BETA-READY PROTOTYPE

**Target:** Functional prototype ready for beta testing
**Approach:** Agents with full permissions, production-focused
**Philosophy:** NO SHORTCUTS. SHIP IT.

---

# WHAT THE PROTOTYPE MUST DO

A beta-testable TinyPM prototype must:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Task Management** | Create, edit, complete tasks | P0 |
| **Project Organization** | Group tasks into projects | P0 |
| **AI Chat** | Conversational interface with memory | P0 |
| **Proactive Suggestions** | AI knows what you should do | P0 |
| **Calendar Integration** | See upcoming events, suggest scheduling | P1 |
| **Email Integration** | Draft emails based on context | P1 |
| **Multi-Agent Debate** | Critical decisions get debated | P2 |
| **Autonomy Levels** | User controls how autonomous AI is | P2 |

---

# TECH STACK (FINAL DECISION)

| Component | Choice | Reason |
|-----------|--------|--------|
| **Backend** | Supabase | PostgreSQL + Auth + Realtime + Edge Functions |
| **Frontend** | Next.js | React + SSR + API routes |
| **Mobile** | React Native | Cross-platform iOS/Android |
| **AI Orchestration** | LangGraph | State machine, checkpointing, production-ready |
| **Memory** | Mem0 | 26% accuracy boost, 91% lower latency |
| **Primary Model** | Claude Opus 4.5 | Best for coding and reasoning |
| **Fast Model** | Claude Haiku 3.5 | Routing and classification |
| **Observability** | LangSmith | Tracing, debugging, monitoring |

---

# BUILD PHASES

## PHASE 1: FOUNDATION (2 days)

### Day 1: Supabase Setup
```
AGENT TASK: Set up Supabase project with full schema

Tables to create:
- users (id, email, name, preferences)
- projects (id, user_id, name, description, status)
- tasks (id, project_id, title, description, status, priority, due_date)
- memory (id, user_id, content, type, embedding, metadata)
- conversations (id, user_id, messages[], created_at)
- suggestions (id, user_id, content, type, confidence, status)

Enable:
- Row Level Security (RLS)
- Realtime subscriptions
- Edge Functions

Output: Working Supabase project with all tables
```

### Day 2: LangGraph Core
```
AGENT TASK: Implement LangGraph state machine

Nodes to create:
- router_node: Classify user intent
- planner_node: Break down complex tasks
- executor_node: Execute actions
- memory_node: Store/retrieve context
- suggestion_node: Generate proactive suggestions

Edges:
- router -> planner (if complex)
- router -> executor (if simple)
- executor -> memory (always)
- memory -> suggestion (after each interaction)

Output: Working LangGraph app with checkpointing
```

---

## PHASE 2: CORE FEATURES (3 days)

### Day 3: Task Management API
```
AGENT TASK: Build complete task management API

Edge Functions:
- POST /tasks - Create task
- GET /tasks - List tasks (with filters)
- GET /tasks/:id - Get task details
- PATCH /tasks/:id - Update task
- DELETE /tasks/:id - Delete task
- POST /tasks/:id/complete - Mark complete

Features:
- Priority scoring
- Due date handling
- Status transitions
- Project association

Output: Full CRUD API for tasks
```

### Day 4: AI Chat with Memory
```
AGENT TASK: Implement conversational AI with Mem0

Features:
- Persistent conversation history
- Mem0 memory integration
- Context retrieval before each response
- User preference learning
- Style adaptation over time

Tools available to AI:
- create_task
- update_task
- list_tasks
- search_memory
- get_calendar
- send_email

Output: Chat endpoint that remembers everything
```

### Day 5: Proactive Suggestions Engine
```
AGENT TASK: Build the proactive intelligence system

Triggers to monitor:
- Task due dates approaching
- Calendar events coming up
- Patterns in user behavior
- Time of day (morning brief)
- Idle time (suggest next action)

Suggestion types:
- "You have 3 tasks due today"
- "Based on your pattern, you usually X now"
- "Meeting in 30 minutes - want me to prep?"
- "You haven't responded to [email] - draft reply?"

Output: Background job that generates suggestions
```

---

## PHASE 3: FRONTEND (3 days)

### Day 6: Next.js App Shell
```
AGENT TASK: Create Next.js application with auth

Pages:
- / (dashboard)
- /chat (AI chat interface)
- /tasks (task list/board)
- /projects (project management)
- /settings (preferences)

Components:
- Sidebar navigation
- Task card
- Chat interface
- Suggestion popup
- Calendar widget

Auth:
- Supabase Auth integration
- Protected routes
- Session management

Output: Working Next.js app with routing and auth
```

### Day 7: Chat Interface
```
AGENT TASK: Build the AI chat UI

Features:
- Message history display
- Streaming responses
- Tool use visualization
- Suggestion chips
- Voice input (optional)
- Markdown rendering

UX:
- Fast, responsive
- Shows "thinking" indicator
- Displays tool calls
- One-click suggestion acceptance

Output: Beautiful, functional chat interface
```

### Day 8: Task & Project Views
```
AGENT TASK: Build task management UI

Task List View:
- Filterable by status, priority, project
- Sortable by due date, priority
- Inline edit
- Drag-drop status change

Kanban View:
- Columns: To Do, In Progress, Done
- Drag-drop between columns
- Task cards with key info

Project View:
- Project header with stats
- Task list within project
- Progress visualization

Output: Full task management interface
```

---

## PHASE 4: INTEGRATION (2 days)

### Day 9: Calendar & Email
```
AGENT TASK: Integrate external services

Google Calendar:
- OAuth connection
- Display upcoming events
- Suggest task scheduling
- Create events from tasks

Email (Gmail):
- OAuth connection
- Read inbox (with permission)
- Draft replies
- Send on user approval

Output: Working calendar and email integration
```

### Day 10: Polish & Deploy
```
AGENT TASK: Production deployment

Deployment:
- Deploy Next.js to Vercel
- Configure Supabase production
- Set up LangSmith monitoring
- Configure error tracking (Sentry)

Polish:
- Loading states
- Error handling
- Mobile responsiveness
- Performance optimization

Testing:
- End-to-end user flows
- Error scenarios
- Load testing

Output: Live, production-ready prototype
```

---

# AGENT ASSIGNMENTS

| Phase | Agent | Task | Days |
|-------|-------|------|------|
| 1 | Backend Agent | Supabase setup | 1 |
| 1 | AI Agent | LangGraph core | 1 |
| 2 | Backend Agent | Task API | 1 |
| 2 | AI Agent | Chat + Memory | 1 |
| 2 | AI Agent | Proactive suggestions | 1 |
| 3 | Frontend Agent | Next.js shell | 1 |
| 3 | Frontend Agent | Chat UI | 1 |
| 3 | Frontend Agent | Task/Project UI | 1 |
| 4 | Integration Agent | Calendar/Email | 1 |
| 4 | DevOps Agent | Deploy + Polish | 1 |

**Total: 10 days to beta-ready prototype**

---

# PARALLEL EXECUTION PLAN

Days 1-2 can run in parallel:
```
Day 1-2:
├── Agent 1: Supabase Setup
└── Agent 2: LangGraph Core
```

Days 3-5 can partially parallelize:
```
Day 3: Task API
Day 4: Chat + Memory (depends on Day 3)
Day 5: Proactive (depends on Day 4)
```

Days 6-8 can run in parallel:
```
Day 6-8:
├── Agent 1: Next.js Shell
├── Agent 2: Chat UI
└── Agent 3: Task UI
```

With parallelization: **5-7 days to prototype**

---

# SUCCESS CRITERIA

The prototype is beta-ready when:

| Criterion | Requirement |
|-----------|-------------|
| **Tasks** | Can create, edit, complete tasks |
| **Chat** | AI responds with context awareness |
| **Memory** | AI remembers previous conversations |
| **Suggestions** | AI proactively suggests actions |
| **Calendar** | Shows upcoming events |
| **Email** | Can draft replies |
| **Deploy** | Accessible via web URL |
| **Mobile** | Works on phone browser |

---

# PERMISSIONS NEEDED

To run agents with "dangerously skip permissions":

```bash
# Example: Run agent with full permissions
claude --dangerously-skip-permissions "Build the Supabase schema for TinyPM"

# Or set in config
claude config set dangerouslySkipPermissions true
```

**Warning:** Only use this in a sandboxed environment or when you trust the agent's actions.

---

# IMMEDIATE NEXT STEP

**SPAWN 2 AGENTS IN PARALLEL:**

1. **Backend Agent**: Set up Supabase with full schema
2. **AI Agent**: Implement LangGraph state machine

When those complete, spawn the next batch.

---

# READY TO BUILD

Say "GO" and I will spawn the first agents to begin Phase 1.

---

*NO SHORTCUTS. SHIP IT.*
*TinyPM prototype in 5-7 days.*
