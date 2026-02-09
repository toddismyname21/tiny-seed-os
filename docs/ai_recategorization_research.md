# AI-Assisted Recategorization Research

**Generated:** 2026-02-09
**Purpose:** Best practices for click-to-recategorize with learning capabilities

---

## Executive Summary

**Recommended Approach:** Hybrid inline + modal UI with progressive disclosure. Combine rule-based learning (immediate) with ML examples (batch). Store corrections in Google Sheets with JSON rules.

---

## 1. UX Patterns for Data Correction

### Industry Leader Patterns

**Expensify:**
- Concierge AI learns from past behavior AND company policies
- Proactively flags errors before requiring review
- Bidirectional learning: learns from past + applies forward

**Gmail:**
- User direct input is "most important" signal
- Single corrections don't permanently change - consistency matters
- Context-aware: sender + content + engagement history

### Recommended UI Pattern

**Inline + Modal Hybrid:**
- Primary correction: inline with confidence badge
- "Why?" link opens modal for explanation + alternatives
- Progressive disclosure - start simple, let users dig deeper

### Confidence Display

```
85%+ = Green "Very likely" - auto-apply safe
70-84% = Yellow "Likely" - show, ask confirmation
<70% = Gray "Uncertain" - flag for review
```

### Effortless Workflow Keys

1. Minimize clicks - inline editing with smart defaults
2. Show WHY - brief reason for categorization
3. Offer alternatives immediately
4. Batch operations - correct multiple items at once
5. Remember corrections - apply to similar items in session

---

## 2. AI Explanation Interface

### Showing WHY AI Decided

**Feature Importance Display:**
```
"Categorized as 'CSA Subscription' because:
- Product name contains '2024 Summer CSA' (95% match)
- Similar to 15 previous CSA products"
```

### Alternative Suggestions UI

```
Primary: CSA Subscription [88% confidence]
├─ Why: "Contains 'CSA' + 'Summer' + year pattern"

Alternatives:
├─ Partner Add-On [62%]
├─ Direct Sales [45%]
└─ [Change to other...]
```

---

## 3. Learning from Corrections

### Hybrid Strategy (Recommended)

**Rule-Based (Immediate):**
- Deterministic mappings
- User says "Always categorize X as Y"
- Changes apply instantly

**Example-Based (Batch):**
- Complex patterns
- ML model retraining nightly
- Fuzzy matching improvements

### Correction Flow

```
User corrects item
  ↓
"Apply to similar items?"
  ├─ Yes → Create rule (immediate)
  └─ No → Store as example (batch learning)
```

### Conflict Handling

- Detect contradictory corrections
- Ask: "Should ALL items from this vendor go here, or depends on product?"
- Store context for conditional rules

---

## 4. JSON Schema for Corrections

```json
{
  "corrections": [
    {
      "id": "corr_001",
      "timestamp": "2026-02-09T14:00:00Z",
      "product": {
        "title": "Farm Fresh Bouquet",
        "original_category": "FARMERS_MARKET",
        "sales": 150.00
      },
      "ai_suggestion": {
        "category": "FARMERS_MARKET",
        "confidence": 0.72,
        "reasoning": "Contains 'bouquet', no subscription keywords"
      },
      "user_correction": {
        "category": "FLOWER_SALES",
        "apply_as_rule": true,
        "rule_scope": "keywords"
      }
    }
  ],
  "rules": [
    {
      "id": "rule_001",
      "type": "keywords",
      "conditions": {
        "contains": ["bouquet", "fresh"],
        "not_contains": ["subscription"]
      },
      "target_category": "FLOWER_SALES",
      "confidence_boost": 0.20,
      "applied_count": 0,
      "active": true
    }
  ]
}
```

---

## 5. Implementation Priority

### Phase 1: MVP (This Sprint)
1. Click-to-correct UI modal
2. Show AI reasoning + alternatives
3. Store corrections to Google Sheet
4. Basic rule creation ("Apply to similar")

### Phase 2: Smart Learning
1. Fuzzy matching for product names
2. Apply rules during parsing
3. Conflict detection

### Phase 3: Polish
1. Confidence visualization
2. Batch operations
3. Correction analytics

---

## 6. Technical Architecture

```
┌─────────────────────────────────────┐
│     Frontend (loan-readiness.html)  │
├─────────────────────────────────────┤
│  - Correction modal UI              │
│  - Confidence badges                │
│  - Rule preview                     │
│  - Local cache of rules             │
└──────────────┬──────────────────────┘
               │ API calls
               ▼
┌─────────────────────────────────────┐
│     Backend (Apps Script)           │
├─────────────────────────────────────┤
│  - saveCorrection()                 │
│  - getCorrections()                 │
│  - applyRules()                     │
│  - getCorrectionRules()             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Storage (Google Sheets)         │
├─────────────────────────────────────┤
│  - PARSER_CORRECTIONS sheet         │
│  - PARSER_RULES sheet               │
│  - PARSER_AUDIT_LOG sheet           │
└─────────────────────────────────────┘
```

---

## 7. Fuzzy Matching Strategy

**For Product Names:**
1. Exact match first (fastest)
2. Jaro-Winkler string distance (typos, variations)
3. Keyword extraction + matching
4. Semantic similarity (future)

**Threshold:** 0.85 similarity = consider match

---

## Sources

- Plaid Transactions Documentation
- Gmail Smart Categorization
- Expensify AI Expense Management
- PatternFly Inline Edit Guidelines
- Fintech UX Best Practices 2026
- Google PAIR Explainability Research
