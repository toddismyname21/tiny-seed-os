# GitHub Agent Implementations Research

**Research Date:** February 12, 2026
**Purpose:** Mining GitHub for the most advanced open source agent implementations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tier 1: Leading Multi-Agent Frameworks](#tier-1-leading-multi-agent-frameworks)
3. [Tier 2: Specialized Agent Frameworks](#tier-2-specialized-agent-frameworks)
4. [Tier 3: Emerging & Innovative Frameworks](#tier-3-emerging--innovative-frameworks)
5. [Browser & Automation Agents](#browser--automation-agents)
6. [Development & Coding Agents](#development--coding-agents)
7. [Memory & Infrastructure](#memory--infrastructure)
8. [Awesome Lists & Curated Resources](#awesome-lists--curated-resources)
9. [Code Patterns Worth Adopting](#code-patterns-worth-adopting)
10. [Recommendations for Tiny Seed OS](#recommendations-for-tiny-seed-os)

---

## Executive Summary

The AI agent ecosystem on GitHub has exploded, with over 4.3 million AI-related repositories (178% YoY growth in LLM-focused projects). This research documents the most significant open-source agent implementations, focusing on architectural patterns, recent activity, and code patterns worth adopting.

### Key Trends in 2026

- **Model-agnostic designs** supporting OpenAI, Anthropic, Gemini, and more
- **Model Context Protocol (MCP)** emerging as interoperability standard
- **Code agents** outperforming JSON/text-based tool calling by ~30%
- **Human-in-the-loop** becoming native to workflow architectures
- **Graph-based memory** complementing vector search for richer context

---

## Tier 1: Leading Multi-Agent Frameworks

### 1. LangFlow

**Repository:** https://github.com/langflow-ai/langflow
**Stars:** ~140,000
**Activity:** Very Active

**Problem Solved:**
Visual orchestration of multi-agent conversations with memory and retrieval, deployable as APIs or standalone apps.

**Key Features:**
- Drag-and-drop workflow builder
- Built-in RAG capabilities
- API deployment with one click
- Extensive integrations

**Code Patterns:**
```python
# Visual workflow as code pattern
from langflow import FlowBuilder

flow = FlowBuilder()
flow.add_node("agent", config={"model": "claude-3"})
flow.add_node("memory", config={"type": "vector"})
flow.connect("agent", "memory")
flow.deploy_as_api()
```

---

### 2. CrewAI

**Repository:** https://github.com/crewAIInc/crewAI
**Stars:** ~43,775+
**Latest Release:** v1.9.3 (January 30, 2026)
**Activity:** Very Active

**Problem Solved:**
Orchestrating role-playing, autonomous AI agents that work together in "crews" with defined workflows and event-driven execution.

**Key Features:**
- Lean Python framework (independent of LangChain)
- Event-driven orchestration engine
- 5.76x faster than LangGraph in certain tasks
- Integration with LlamaIndex, LangChain, and AutoGen agents

**Code Patterns:**
```python
from crewai import Crew, Agent, Task

# Define specialized agents with roles
researcher = Agent(
    role='Senior Researcher',
    goal='Find comprehensive information',
    backstory='Expert researcher with deep knowledge',
    tools=[search_tool, scrape_tool]
)

writer = Agent(
    role='Content Writer',
    goal='Create compelling content',
    backstory='Experienced writer'
)

# Create tasks with dependencies
research_task = Task(
    description='Research the topic thoroughly',
    agent=researcher,
    expected_output='Detailed research report'
)

writing_task = Task(
    description='Write based on research',
    agent=writer,
    context=[research_task]  # Dependency pattern
)

# Assemble the crew
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential  # or Process.hierarchical
)

result = crew.kickoff()
```

---

### 3. LangGraph

**Repository:** https://github.com/langchain-ai/langgraph
**Stars:** 10,000+
**Latest Release:** LangGraph SDK v0.3.5 / LangGraph v1.0.8 (February 2026)
**Activity:** Very Active

**Problem Solved:**
Building resilient language agents as graphs with durable execution, human-in-the-loop, and comprehensive memory.

**Key Features:**
- Event-driven, async-first workflows
- Checkpointing and state persistence
- Human-in-the-loop integration
- Debugging with LangSmith

**Code Patterns:**
```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    current_step: str

# Define the graph
workflow = StateGraph(AgentState)

# Add nodes (processing steps)
workflow.add_node("analyze", analyze_function)
workflow.add_node("decide", decision_function)
workflow.add_node("execute", execute_function)

# Add conditional edges
workflow.add_conditional_edges(
    "decide",
    route_based_on_decision,
    {
        "research": "analyze",
        "action": "execute",
        "complete": END
    }
)

# Compile and run
app = workflow.compile()
result = app.invoke(initial_state)
```

---

### 4. Microsoft Agent Framework (Semantic Kernel + AutoGen)

**Repository:** https://github.com/microsoft/semantic-kernel
**Stars:** 20,000+
**Target Release:** GA Q1 2026
**Activity:** Very Active

**Problem Solved:**
Enterprise-grade multi-agent workflows combining Semantic Kernel's orchestration with AutoGen's multi-agent patterns.

**Key Features:**
- .NET and Python support
- GitHub Copilot SDK integration
- Claude Agent SDK integration (Jan 2026)
- MCP server support
- Type-based routing with checkpointing

**Code Patterns:**
```python
from agent_framework import Agent, Workflow

# Agent with tools pattern
agent = Agent(
    name="research_assistant",
    model="claude-3-opus",
    tools=[file_tool, search_tool, mcp_server],
    instructions="Research thoroughly and cite sources"
)

# Workflow with human-in-the-loop
workflow = Workflow()
workflow.add_step("gather", agent.gather_info)
workflow.add_step("review", human_review_step)  # Pause for human
workflow.add_step("finalize", agent.compile_report)

result = await workflow.execute(checkpoint=True)
```

---

### 5. AutoGen

**Repository:** https://github.com/microsoft/autogen
**Stars:** 35,000+
**Activity:** Active (merging into Microsoft Agent Framework)

**Problem Solved:**
Conversational multi-agent systems where agents collaborate through dialogue rather than fixed workflows.

**Key Features:**
- AgentChat abstraction
- Human-in-the-loop conversations
- Emergent problem-solving through dialogue
- Code execution capabilities

**Code Patterns:**
```python
from autogen import AssistantAgent, UserProxyAgent

# Conversational agent pattern
assistant = AssistantAgent(
    name="assistant",
    llm_config={"model": "gpt-4"}
)

user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="TERMINATE",
    code_execution_config={"work_dir": "workspace"}
)

# Emergent collaboration through conversation
user_proxy.initiate_chat(
    assistant,
    message="Analyze this dataset and create visualizations"
)
```

---

### 6. MetaGPT

**Repository:** https://github.com/FoundationAgents/MetaGPT
**Stars:** 50,000+
**Activity:** Very Active

**Problem Solved:**
Multi-agent software company simulation with Standard Operating Procedures (SOPs) for generating complete codebases from requirements.

**Key Features:**
- "Code = SOP(Team)" philosophy
- Simulates product managers, architects, engineers
- Assembly line paradigm
- MGX (MetaGPT X) natural language programming

**Code Patterns:**
```python
from metagpt.roles import ProductManager, Architect, Engineer
from metagpt.team import Team

# Create a virtual software company
team = Team()
team.hire([
    ProductManager(),
    Architect(),
    Engineer()
])

# Run with a single requirement
team.run_project("Create a todo app with user authentication")

# Outputs: PRD, Design docs, Tasks, Complete repo, CI pipeline
```

---

### 7. Dify

**Repository:** https://github.com/langgenius/dify
**Stars:** 100,000+
**Activity:** Very Active

**Problem Solved:**
Production-ready platform for agentic workflow development with visual interface, RAG, and LLMOps.

**Key Features:**
- 50+ built-in tools
- Human Input node for trust gap
- Workflow pausing at decision points
- Self-hostable with custom branding

**Code Patterns:**
```python
# Workflow with human oversight pattern
workflow:
  steps:
    - name: ai_analysis
      type: llm
      model: claude-3

    - name: human_review
      type: human_input
      actions:
        - approve
        - reject
        - modify
      timeout: 24h

    - name: execute
      type: action
      condition: "{{human_review.action}} == 'approve'"
```

---

## Tier 2: Specialized Agent Frameworks

### 8. OpenAI Agents SDK

**Repository:** https://github.com/openai/openai-agents-python
**Activity:** Active (successor to Swarm)

**Problem Solved:**
Lightweight, production-ready multi-agent workflows with tool use, handoffs, and guardrails.

**Key Features:**
- Provider-agnostic (100+ LLM support)
- Built-in tracing
- Realtime voice agents
- Manager + Handoff patterns

**Code Patterns:**
```python
from openai_agents import Agent, handoff

# Handoff pattern between specialized agents
triage_agent = Agent(
    name="triage",
    instructions="Route to appropriate specialist"
)

billing_agent = Agent(
    name="billing",
    instructions="Handle billing inquiries"
)

# Define handoffs
triage_agent.add_handoff(
    to=billing_agent,
    condition="billing related query"
)

# Guardrails pattern
@triage_agent.guardrail
def validate_input(message):
    if contains_pii(message):
        return "Please don't share personal information"
    return None
```

---

### 9. LlamaIndex

**Repository:** https://github.com/run-llama/llama_index
**Stars:** ~46,945
**Activity:** Very Active

**Problem Solved:**
Building LLM-powered agents over your data with 300+ data connectors and production-grade RAG.

**Key Features:**
- Hierarchical agent systems (agents as tools)
- Event-driven workflows
- ACP (Agent Client Protocol) integration
- AgentFS for secure filesystem access

**Code Patterns:**
```python
from llama_index.core import VectorStoreIndex
from llama_index.core.agent import ReActAgent
from llama_index.core.tools import QueryEngineTool

# RAG-powered agent pattern
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()

# Wrap as tool for agent
query_tool = QueryEngineTool.from_defaults(
    query_engine=query_engine,
    name="knowledge_base",
    description="Search the knowledge base"
)

# Agent with RAG capability
agent = ReActAgent.from_tools(
    tools=[query_tool, search_tool],
    llm=llm,
    verbose=True
)
```

---

### 10. AgentScope (Alibaba)

**Repository:** https://github.com/agentscope-ai/agentscope
**Stars:** ~12,000+
**Activity:** Active

**Problem Solved:**
Production-ready agent framework with transparency, real-time interruption, and model-agnostic design.

**Key Features:**
- MsgHub for multi-agent conversations
- Real-time agent steering
- LEGO-like composable components
- Java version available

**Code Patterns:**
```python
from agentscope import Agent, MsgHub

# Message hub pattern for multi-agent coordination
hub = MsgHub()

agent1 = Agent(name="researcher", hub=hub)
agent2 = Agent(name="writer", hub=hub)

# Agents can interrupt and resume
with hub.session() as session:
    result = await session.run_with_steering(
        agents=[agent1, agent2],
        allow_interrupt=True
    )
```

---

### 11. PydanticAI

**Repository:** https://github.com/pydantic/pydantic-ai
**Stars:** 15,000+
**Activity:** Active

**Problem Solved:**
Bringing the "FastAPI feeling" to GenAI app development with type safety and validation.

**Key Features:**
- Model-agnostic
- Pydantic validation built-in
- Structured outputs
- Production-ready patterns

**Code Patterns:**
```python
from pydantic_ai import Agent
from pydantic import BaseModel

class ResearchOutput(BaseModel):
    summary: str
    sources: list[str]
    confidence: float

# Structured output pattern
agent = Agent(
    model="claude-3-opus",
    output_type=ResearchOutput  # Enforced schema
)

result = await agent.run("Research AI agent frameworks")
# result is validated ResearchOutput
```

---

### 12. smolagents (Hugging Face)

**Repository:** https://github.com/huggingface/smolagents
**Stars:** 10,000+
**Activity:** Active

**Problem Solved:**
Minimalist framework for code agents that write Python instead of JSON tool calls.

**Key Features:**
- Code agents ~30% more efficient
- Sandboxed execution (E2B, Modal, Docker)
- Hub integration for sharing
- Multimodal support

**Code Patterns:**
```python
from smolagents import CodeAgent, Tool

# Code agent pattern - writes Python directly
agent = CodeAgent(
    tools=[search_tool, calculator],
    model="claude-3",
    sandbox="e2b"  # Secure execution
)

# Agent writes and executes Python
result = agent.run(
    "Calculate compound interest for $10000 at 5% for 10 years"
)
# Agent generates: result = 10000 * (1.05 ** 10)
```

---

## Tier 3: Emerging & Innovative Frameworks

### 13. Superpowers

**Repository:** https://github.com/obra/superpowers
**Stars:** 27,000+ (9,000/month growth)
**Activity:** Very Active

**Problem Solved:**
Enforcing disciplined software development methodology for AI coding agents through composable skills.

**Key Features:**
- 14 skills including TDD, debugging, code review
- Mandatory design -> plan -> implement workflow
- Subagent-driven development
- Git worktree support

**Code Patterns:**
```markdown
# Skill-based agent instruction pattern
# skills/systematic-debugging/SKILL.md

## When to Use
- When tests fail unexpectedly
- When behavior differs from spec

## Process
1. Root Cause Analysis
   - Reproduce the issue
   - Identify the minimal failing case

2. Defense in Depth
   - Add guards at multiple levels

3. Verification
   - Confirm fix doesn't break other tests
```

---

### 14. GPT-Researcher

**Repository:** https://github.com/assafelovic/gpt-researcher
**Stars:** 20,000+
**Activity:** Active

**Problem Solved:**
Autonomous deep research with tree-like exploration and comprehensive report generation.

**Key Features:**
- Deep Research with recursive exploration
- Multi-agent research workflow
- Factual, unbiased reports with citations
- 5-6 page reports per run

**Code Patterns:**
```python
from gpt_researcher import GPTResearcher

# Deep research pattern
researcher = GPTResearcher(
    query="AI agent frameworks comparison 2026",
    report_type="deep_research",  # Tree exploration
    max_depth=3
)

report = await researcher.conduct_research()
# Generates comprehensive report with citations
```

---

### 15. AutoGPT Platform

**Repository:** https://github.com/Significant-Gravitas/AutoGPT
**Stars:** 170,000+
**Latest Release:** v0.6.47 (February 2026)
**Activity:** Very Active

**Problem Solved:**
Creating, deploying, and managing continuous AI agents that automate complex workflows.

**Key Features:**
- Continuous autonomous operation
- Short and long-term memory
- Self-reflection and improvement
- Agent Protocol standard

**Code Patterns:**
```python
from autogpt import AutoGPTAgent

# Autonomous agent with goals pattern
agent = AutoGPTAgent(
    name="ResearchBot",
    goals=[
        "Research the latest AI developments",
        "Summarize key findings",
        "Save report to disk"
    ],
    memory_type="long_term"
)

# Runs autonomously until goals achieved
await agent.run_continuous()
```

---

## Browser & Automation Agents

### 16. Browser-Use

**Repository:** https://github.com/browser-use/browser-use
**Activity:** Active

**Problem Solved:**
Making websites accessible for AI agents with CLI-based browser automation.

**Code Patterns:**
```python
from browser_use import Browser, Agent

# Browser automation pattern
browser = Browser()
agent = Agent(browser=browser)

await agent.run(
    "Go to GitHub, search for 'AI agents', "
    "and save the top 5 results"
)
```

---

### 17. Stagehand (Browserbase)

**Repository:** https://github.com/browserbase/stagehand
**Activity:** Active

**Problem Solved:**
Combining natural language with code for reliable browser automation.

**Code Patterns:**
```python
# Natural language + code pattern
await page.act("Click the login button")
await page.fill("#username", credentials.user)
data = await page.extract("Get all product prices")
```

---

### 18. Skyvern

**Repository:** https://github.com/Skyvern-AI/skyvern
**Activity:** Active

**Problem Solved:**
Browser automation using LLMs and computer vision, especially for form filling.

**Key Features:**
- Best performance on WRITE tasks
- Playwright-compatible SDK
- No-code workflow builder

---

## Development & Coding Agents

### 19. GPT-Engineer

**Repository:** https://github.com/gpt-engineer-org/gpt-engineer
**Stars:** 50,000+
**Activity:** Active

**Problem Solved:**
Generating entire codebases from natural language specifications.

**Code Patterns:**
```bash
# Single prompt to full codebase
gpt-engineer "Build a Flask todo app with authentication"

# Improve existing code
gpt-engineer -i "Add dark mode to the UI"
```

---

### 20. Cline

**Repository:** https://github.com/clinebot/cline
**Stars:** 48,000+
**Activity:** Very Active

**Problem Solved:**
Autopilot coding assistant that autonomously runs tests and searches the web.

---

## Memory & Infrastructure

### 21. Mem0

**Repository:** https://github.com/mem0ai/mem0
**Stars:** 37,000+
**Activity:** Very Active

**Problem Solved:**
Universal memory layer for AI agents with semantic, episodic, and long-term memory.

**Key Features:**
- +26% accuracy over OpenAI Memory
- 91% faster responses
- 90% lower token usage
- Graph memory (Mem0g) for relationships

**Code Patterns:**
```python
from mem0 import Memory

# Memory layer pattern
memory = Memory()

# Store memories with context
memory.add(
    messages=conversation,
    user_id="user123",
    metadata={"session": "planning"}
)

# Retrieve relevant memories
relevant = memory.search(
    query="What are their preferences?",
    user_id="user123"
)

# Memory scoring: relevance + importance + recency
```

---

## Awesome Lists & Curated Resources

### Primary Curated Lists

| Repository | Description | Focus |
|------------|-------------|-------|
| [kyrolabs/awesome-agents](https://github.com/kyrolabs/awesome-agents) | Comprehensive AI agents list | Tools & Products |
| [kaushikb11/awesome-llm-agents](https://github.com/kaushikb11/awesome-llm-agents) | LLM frameworks list | Agent Frameworks |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | LLM apps with agents & RAG | Applications |
| [Jenqyang/Awesome-AI-Agents](https://github.com/Jenqyang/Awesome-AI-Agents) | Autonomous LLM agents | Research Focus |
| [jim-schwoebel/awesome_ai_agents](https://github.com/jim-schwoebel/awesome_ai_agents) | 1,500+ resources | Comprehensive |
| [tmgthb/Autonomous-Agents](https://github.com/tmgthb/Autonomous-Agents) | Research papers (daily updates) | Academic |
| [slavakurilyak/awesome-ai-agents](https://github.com/slavakurilyak/awesome-ai-agents) | 300+ agentic resources | Broad Coverage |

---

## Code Patterns Worth Adopting

### 1. Handoff Pattern (Agent-to-Agent Delegation)

```python
# From OpenAI Agents SDK
def handoff(from_agent, to_agent, condition):
    """Transfer conversation control between specialized agents"""
    if condition(context):
        return to_agent.continue_conversation(
            messages=from_agent.messages,
            metadata=from_agent.context
        )
```

**When to use:** Routing between specialized agents based on task type.

---

### 2. Guardrails Pattern (Input/Output Validation)

```python
# Before agent processes
@agent.input_guardrail
def validate_input(message):
    if detect_injection(message):
        raise SecurityError("Potential injection detected")
    return sanitize(message)

# After agent responds
@agent.output_guardrail
def validate_output(response):
    if contains_hallucination(response):
        return request_regeneration()
    return response
```

**When to use:** Production systems requiring safety and quality guarantees.

---

### 3. Skill-Based Architecture (Superpowers Pattern)

```python
# Skills as composable markdown instructions
skills = {
    "planning": load_skill("skills/writing-plans/SKILL.md"),
    "debugging": load_skill("skills/systematic-debugging/SKILL.md"),
    "tdd": load_skill("skills/test-driven-development/SKILL.md")
}

# Context-aware skill activation
def activate_skills(context):
    active = []
    if context.is_new_feature:
        active.extend(["planning", "tdd"])
    if context.has_failing_tests:
        active.append("debugging")
    return active
```

**When to use:** Complex development workflows requiring structured methodology.

---

### 4. Memory Layer Pattern (Mem0 Architecture)

```python
class HybridMemory:
    def __init__(self):
        self.vector_store = VectorDB()  # Semantic similarity
        self.kv_store = KeyValueDB()    # Exact recall
        self.graph_store = GraphDB()    # Relationships

    def add(self, content, context):
        # Store in all three for different query types
        embedding = embed(content)
        self.vector_store.add(embedding, content)
        self.kv_store.set(context.key, content)
        self.graph_store.add_edges(extract_entities(content))

    def search(self, query, context):
        # Multi-source retrieval with scoring
        results = []
        results += self.vector_store.search(query)  # "What's similar?"
        results += self.graph_store.search(query)   # "What's related?"
        results += self.kv_store.get(context.key)   # "What's exact?"
        return self.score_and_rank(results)
```

**When to use:** Agents needing rich contextual memory across sessions.

---

### 5. Code Agent Pattern (smolagents Approach)

```python
# Instead of JSON tool calls, generate Python
class CodeAgent:
    def run(self, task):
        # Agent generates actual Python code
        code = self.llm.generate_code(task, self.tools)

        # Execute in sandbox
        result = self.sandbox.execute(code)

        # ~30% more efficient than JSON tool calls
        return result
```

**When to use:** Tasks requiring complex logic that's natural in code.

---

### 6. Human-in-the-Loop Workflow Pattern

```python
from dify_pattern import Workflow, HumanInputNode

workflow = Workflow()

workflow.add_step(
    "ai_draft",
    type="llm",
    output="draft_content"
)

workflow.add_step(
    "human_review",
    type=HumanInputNode(
        actions=["approve", "reject", "modify"],
        timeout="24h",
        on_timeout="escalate"
    )
)

workflow.add_conditional(
    "route",
    conditions={
        "approve": "publish",
        "modify": "ai_revise",
        "reject": "archive"
    }
)
```

**When to use:** High-stakes decisions requiring human oversight.

---

### 7. Workflow as Graph Pattern (LangGraph)

```python
from typing import TypedDict
from langgraph.graph import StateGraph

class State(TypedDict):
    messages: list
    iteration: int
    status: str

def build_reflective_agent():
    graph = StateGraph(State)

    # Nodes are processing steps
    graph.add_node("think", think_step)
    graph.add_node("act", act_step)
    graph.add_node("reflect", reflect_step)

    # Conditional routing based on state
    graph.add_conditional_edges(
        "reflect",
        lambda s: "complete" if s["status"] == "done" else "think"
    )

    return graph.compile(checkpointer=MemoryCheckpointer())
```

**When to use:** Complex workflows needing state management and recovery.

---

## Recommendations for Tiny Seed OS

### High-Priority Patterns to Adopt

1. **Memory Layer (Mem0 pattern)**
   - Implement hybrid memory for farm operations context
   - Track user preferences, seasonal patterns, customer history
   - Use graph memory for relationship mapping (customers, crops, suppliers)

2. **Skill-Based Architecture (Superpowers pattern)**
   - Create skills for: market analysis, inventory planning, CSA management
   - Context-aware activation based on current operation
   - Composable and testable

3. **Human-in-the-Loop (Dify pattern)**
   - Critical for financial decisions (pricing, large orders)
   - Review points for marketing content before publishing
   - Approval workflows for automated communications

4. **Code Agent Approach (smolagents)**
   - For complex calculations (yield forecasting, pricing optimization)
   - More efficient than multiple tool calls
   - Natural for data analysis tasks

### Framework Integrations to Consider

| Framework | Use Case | Priority |
|-----------|----------|----------|
| **CrewAI** | Multi-agent farm operations crew | High |
| **LangGraph** | Complex workflow orchestration | High |
| **Mem0** | Memory layer for personalization | High |
| **Browser-Use** | Market research automation | Medium |
| **PydanticAI** | Type-safe agent outputs | Medium |
| **LlamaIndex** | RAG over farm documentation | Medium |

### Recommended Agent Crew for Farm OS

```python
# Conceptual farm operations crew
farm_crew = Crew(
    agents=[
        Agent(role="Operations Manager",
              goal="Optimize daily farm operations"),
        Agent(role="Market Analyst",
              goal="Monitor prices and demand"),
        Agent(role="Customer Relations",
              goal="Handle inquiries and orders"),
        Agent(role="Inventory Planner",
              goal="Manage stock and predict needs")
    ],
    memory=Mem0Memory(
        long_term=True,
        graph=True  # For customer relationships
    ),
    human_oversight=HumanInLoop(
        trigger_on=["financial_decision", "public_communication"]
    )
)
```

---

## Activity & Maintenance Summary

| Framework | Stars | Last Update | Maintenance Level |
|-----------|-------|-------------|-------------------|
| LangFlow | 140K | Feb 2026 | Very Active |
| AutoGPT | 170K | Feb 2026 | Very Active |
| Dify | 100K | Feb 2026 | Very Active |
| CrewAI | 43K+ | Jan 2026 | Very Active |
| MetaGPT | 50K+ | Feb 2026 | Very Active |
| LlamaIndex | 47K | Feb 2026 | Very Active |
| Mem0 | 37K | Feb 2026 | Very Active |
| Superpowers | 27K | Feb 2026 | Very Active |
| LangGraph | 10K+ | Feb 2026 | Very Active |
| AgentScope | 12K | Feb 2026 | Active |
| smolagents | 10K | Feb 2026 | Active |
| PydanticAI | 15K | Feb 2026 | Active |
| OpenAI Agents SDK | 5K+ | Feb 2026 | Active |

---

## Sources

- [Top 10 Most Starred AI Agent Frameworks on GitHub](https://techwithibrahim.medium.com/top-10-most-starred-ai-agent-frameworks-on-github-2026-df6e760a950b)
- [The Top Ten GitHub Agentic AI Repositories in 2025](https://opendatascience.com/the-top-ten-github-agentic-ai-repositories-in-2025/)
- [GitHub AI Agents Topic](https://github.com/topics/ai-agents)
- [LangGraph Releases](https://github.com/langchain-ai/langgraph/releases)
- [CrewAI Changelog](https://docs.crewai.com/en/changelog)
- [Dify Blog - 100K Stars](https://dify.ai/blog/100k-stars-on-github-thank-you-to-our-amazing-open-source-community)
- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [Microsoft Agent Framework Blog](https://devblogs.microsoft.com/semantic-kernel/semantic-kernel-and-microsoft-agent-framework/)
- [Superpowers GitHub](https://github.com/obra/superpowers)
- [Mem0 GitHub](https://github.com/mem0ai/mem0)
- [smolagents Documentation](https://huggingface.co/docs/smolagents/en/index)
- [kyrolabs/awesome-agents](https://github.com/kyrolabs/awesome-agents)
- [From Prompting to Autonomy: 10 GitHub Repos](https://engineering.01cloud.com/2026/01/22/from-prompting-to-autonomy-10-github-repos-to-master-ai-agents/)
- [Top 7 Agentic AI Frameworks in 2026](https://www.alphamatch.ai/blog/top-agentic-ai-frameworks-2026)

---

*Research compiled February 12, 2026*
