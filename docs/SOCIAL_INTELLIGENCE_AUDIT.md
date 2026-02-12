# Social Intelligence vs Marketing Command Center - FULL AUDIT

**Purpose:** Identify all unique features before any deletion
**Status:** IN PROGRESS

---

## FILE COMPARISON

| File | Lines | Purpose |
|------|-------|---------|
| social-intelligence.html | 2,963 | Original Social Intelligence Engine |
| marketing-command-center.html | 19,141 | Consolidated Marketing Command Center |

---

## TAB COMPARISON

### social-intelligence.html tabs (11):
1. brain
2. dashboard
3. brandvoice
4. content
5. scheduler
6. comments
7. evergreen
8. revenue
9. competitors
10. crisis
11. settings

### marketing-command-center.html tabs (24+):
- All 11 tabs from social-intelligence PLUS:
- analytics, autopilot, budget, campaigns, connections
- contentcalendar, contentstudio, create, engage
- farmpics, growth, intelligence, paidads, schedule

**Conclusion:** Marketing Command Center is a SUPERSET

---

## UNIQUE SETTINGS FOUND IN social-intelligence.html

### API Configuration (Settings Tab):
1. **OpenAI API Key** - Input field with save function
2. **Stability AI Key** - Input field with save function
3. **Photoroom API Key** - Input field with save function

### Functions for saving keys:
- `saveOpenAI()` - calls `configureOpenAI`
- `saveStability()` - calls `configureStabilityAI`
- `savePhotoroom()` - calls `configurePhotoroom`

---

## CRITICAL FINDINGS

### MISSING from marketing-command-center.html:
- **Stability AI API Key configuration** - for AI image generation
- **Photoroom API Key configuration** - for background removal

### PRESENT in both:
- OpenAI API Key configuration ✓

---

## ACTION ITEMS BEFORE ANY DELETION

1. [x] Verify marketing-command-center.html has API key configuration - PARTIAL (only OpenAI)
2. [ ] **ADD Stability AI key config to marketing-command-center.html**
3. [ ] **ADD Photoroom key config to marketing-command-center.html**
4. [ ] Verify all backend endpoints exist for key saving
5. [ ] Test that settings work in marketing-command-center
6. [ ] Only after verification - consider removing redundant file

---

## RULES TO PREVENT FUTURE MISTAKES

1. **NEVER delete files without full audit**
2. **NEVER make changes without testing**
3. **ALWAYS verify deployments succeeded**
4. **ALWAYS compare before consolidating**
5. **CREATE audit documents FIRST**
