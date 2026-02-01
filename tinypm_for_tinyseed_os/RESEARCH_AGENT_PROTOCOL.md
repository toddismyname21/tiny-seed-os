# RESEARCH AGENT PROTOCOL
## Extended Thinking Mode for Maximum Intelligence

**Version:** 1.0
**Date:** 2026-01-29
**Status:** MANDATORY for all research tasks

---

## CORE PRINCIPLE

> "Extended thinking is our competitive advantage. We don't rush. We think deeply, verify thoroughly, and deliver insights that surface-level AI cannot."

---

## ULTRATHINK PROTOCOL

All research agents MUST apply these principles:

### 1. THINK STEP BY STEP
Before answering any complex question:
- Break it into components
- Analyze each component separately
- Synthesize findings
- Check for contradictions

**Trigger phrases:**
- "Think step by step through this"
- "Break this down systematically"
- "Analyze each aspect before concluding"

### 2. CONSIDER ALL ANGLES
For every claim or recommendation:
- What's the supporting evidence?
- What's the counter-argument?
- What edge cases exist?
- What assumptions are we making?

**Trigger phrases:**
- "Consider all angles"
- "What would challenge this conclusion?"
- "Examine from multiple perspectives"

### 3. VERIFY BEFORE INCLUDING
Never state facts without verification:
- Cross-reference minimum 2 sources
- Distinguish facts from opinions
- Flag uncertain claims with confidence levels
- Prefer primary sources over aggregators

**Trigger phrases:**
- "Verify this claim"
- "Cross-reference sources"
- "State your confidence level"

### 4. DEPTH OVER SPEED
Quality research takes time:
- Don't rush to conclusions
- Explore fully before synthesizing
- Better to be thorough than fast
- Revisit initial assumptions

**Trigger phrases:**
- "Analyze thoroughly"
- "Take your time"
- "Depth matters more than speed"

### 5. STRUCTURE OUTPUT
Organized findings are usable findings:
- Use tables for comparisons
- Use headers for navigation
- Include sources inline
- Provide executive summary

---

## CONFIDENCE LEVELS

All major claims must include confidence assessment:

| Level | Meaning | When to Use |
|-------|---------|-------------|
| **High** | Verified from 2+ reliable sources | Official docs, multiple reviews confirm |
| **Medium** | Single reliable source or inference | One good source, logical deduction |
| **Low** | Unverified or conflicting info | Marketing claims, single anecdote |

**Format:** "The pricing is $29/month (Confidence: High, Source: usemotion.com/pricing)"

---

## QUERY CONSTRUCTION

When searching for information:

### DO:
- Include specific entity names: "Motion AI pricing 2026"
- Include time bounds: "2025 2026"
- Request comparisons: "vs", "comparison", "alternative to"
- Specify data types: "pricing", "features", "user reviews"

### DON'T:
- Use vague queries: "AI PM tools" (too broad)
- Assume current info: Always check dates
- Trust first result: Verify across sources

---

## OUTPUT REQUIREMENTS

Every research deliverable must include:

1. **Executive Summary** - Key findings in 3-5 bullets
2. **Detailed Analysis** - Full breakdown with sources
3. **Confidence Ratings** - For all major claims
4. **Source List** - URLs for all referenced materials
5. **Gaps Identified** - What couldn't be verified
6. **Recommendations** - Actionable next steps

---

## STANDARD PROMPT COMPONENTS

Include these in research task prompts:

```markdown
## METHODOLOGY
- Think step by step through each section
- Consider all angles before concluding
- Verify claims from multiple sources
- State confidence levels (High/Medium/Low)
- Analyze thoroughly - depth over speed

## QUALITY REQUIREMENTS
- [ ] All claims have sources
- [ ] Confidence levels stated
- [ ] Counter-arguments considered
- [ ] Gaps acknowledged
- [ ] Recommendations are actionable
```

---

## EXAMPLE: GOOD VS BAD RESEARCH

### BAD (Surface Level):
> "Motion is an AI calendar app that costs around $30/month. It's popular and has good reviews."

**Problems:** No source, vague pricing, no specifics, no confidence level

### GOOD (Extended Thinking):
> "Motion (usemotion.com) is an AI-powered calendar and task management tool.
>
> **Pricing (Confidence: High):**
> - Individual: $19/month annual, $34/month monthly
> - Team (3+ seats): 40% discount
> - No free tier, 7-day trial only
> - Source: usemotion.com/pricing (verified 2026-01-29)
>
> **AI Capabilities (Confidence: Medium):**
> - Auto-schedules tasks based on deadlines and priorities
> - Reschedules dynamically when calendar changes
> - Does NOT appear to learn from user patterns long-term
> - Single AI, not multi-agent
> - Source: Product demo + G2 reviews
>
> **Weakness (Confidence: High):**
> - Steep learning curve (multiple G2 reviews mention 1-2 week adjustment)
> - No Gantt charts or complex dependencies
> - Source: g2.com/products/motion/reviews"

---

## IMPLEMENTATION

### For PM Orchestrator:
When delegating research, include:
1. This protocol reference
2. Specific ULTRATHINK trigger phrases
3. Required confidence levels
4. Quality checklist

### For Research Agents:
Before starting any research:
1. Read this protocol
2. Apply extended thinking to every section
3. Self-check against quality requirements
4. Include confidence levels in output

---

## WHY THIS MATTERS

Surface-level AI research is:
- Easily replicated by competitors
- Prone to hallucination
- Missing critical nuance
- Not actionable

Extended thinking research is:
- Defensible with sources
- Catches errors before delivery
- Surfaces non-obvious insights
- Ready for decision-making

**This is how we build AI that's actually intelligent.**

---

*Protocol established by PM Orchestrator based on SOTA research into effective AI reasoning patterns.*
