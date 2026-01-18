# CLAUDE COORDINATION RULES

**CRITICAL: READ BEFORE MAKING ANY CHANGES**

## The Problem
Multiple Claude sessions working on the same codebase have been:
- Deleting code other Claudes depend on
- Using inconsistent API URLs
- Not checking what exists before creating new things
- Wasting owner's time and money on redundant work

## MANDATORY RULES

### 1. BEFORE MODIFYING ANY FILE
- Read the file first
- Check OUTBOX.md files in `/claude_sessions/` to see what other Claudes built
- If unsure, ASK the owner before changing

### 2. API URLs - USE THE CANONICAL DEPLOYMENT
**Current Production API:**
```
https://script.google.com/macros/s/AKfycbzvrDVCBUIKO6v-3PDqRX87B94uMYULzuBO6e-G8wMPZBj-egyR2ftgAGrEPU8Z5ZJY/exec
```

**DO NOT** create new deployments unless absolutely necessary.
**DO NOT** use old deployment URLs you find in code - they may be stale.

### 3. WHEN YOU FINISH WORK
Update your OUTBOX.md with:
- What you built
- What files you modified
- What API endpoints you added
- Any dependencies other Claudes need to know about

### 4. BEFORE DELETING ANYTHING
- Search for references to it across the codebase
- Check if other Claudes documented using it
- If in doubt, COMMENT OUT instead of delete

### 5. TEST BEFORE DECLARING DONE
- Actually test the URL/feature works
- Don't just assume - verify

## Current Active Deployments

| Purpose | URL |
|---------|-----|
| Main API | `AKfycbzvrDVCBUIKO6v-3PDqRX87B94uMYULzuBO6e-G8wMPZBj-egyR2ftgAGrEPU8Z5ZJY` |
| Delivery Page | Same URL + `?page=delivery` |

## Files That MUST NOT BE MODIFIED Without Checking
- `MERGED TOTAL.js` - Core backend, all Claudes depend on this
- `api-config.js` - Frontend API configuration
- Any file in `apps_script/` folder

---

*Created after coordination failures caused wasted work. ALL CLAUDES MUST FOLLOW THESE RULES.*
