# INBOX: Backend Claude
## MARCHING ORDERS - 2026-02-15

**From:** PM_Architect
**Priority:** CRITICAL
**File:** `apps_script/MERGED TOTAL.js`

---

## MANDATORY PIPELINE - READ THIS FIRST

**NOTHING is "done" until it passes Code Audit + Verifier.**

### Your workflow for EVERY change:
1. Make the fix/feature in MERGED TOTAL.js
2. Deploy: `clasp push && clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"`
3. Write what you did to your OUTBOX.md with function names and line numbers
4. Code Audit Claude will review your changes
5. Verifier Claude will test your endpoints with curl
6. If either flags issues → you fix → redeploy → repeat
7. Only after BOTH say PASS is it done

---

## PRIORITY 1: TOKEN CONVERSION (URGENT - 60-day expiry)

Social Media Claude prepared the complete code. Read `claude_sessions/social_media/OUTBOX.md` under "TOKEN CONVERSION PLAN" section.

### Add these functions to MERGED TOTAL.js:

**1. `exchangeForPermanentPageTokens()`**
- Exchanges short-lived user token for permanent Page Access Tokens
- Full code is in Social Media Claude's OUTBOX
- Wire to router: `case 'exchangeForPermanentPageTokens': return exchangeForPermanentPageTokens();`

**2. `checkTokenHealth()`**
- Weekly health check testing all 3 account tokens
- Emails todd@tinyseedfarmpgh.com on failure
- Full code in Social Media Claude's OUTBOX
- Wire to router: `case 'checkTokenHealth': return checkTokenHealth();`

**3. `refreshAllIGAATokens()`**
- Fallback for tokens not yet converted
- Full code in Social Media Claude's OUTBOX
- Wire to router: `case 'refreshAllIGAATokens': return refreshAllIGAATokens();`

### Deploy and test:
```bash
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Token conversion + health check + IGAA refresh"
```

### Verify:
```
curl "API_URL?action=checkTokenHealth"
```
Should return JSON with each account's token status.

---

## PRIORITY 2: VERIFY + FIX API ENDPOINTS FOR CREATE SUB-TABS

Desktop Claude is about to deep-dive 3 CREATE sub-tabs (AI Content Studio, CSA Box Visual, Repurpose). They need working backend endpoints.

**Check if these endpoints exist and work. If missing, implement them:**

### AI Content Studio endpoints:
| Action | Purpose | Test |
|--------|---------|------|
| `generateAIContent` | Generate social media content from prompt + platform + tone + count | `curl "API_URL?action=generateAIContent"` with POST body |
| `getContentTemplates` | Return caption templates by category | `curl "API_URL?action=getContentTemplates"` |
| `analyzePhoto` | AI analysis of uploaded photo for caption generation | POST with image data |
| `generateABVariants` | Generate A/B test caption variants | POST with caption + tone |

### CSA Box Visual endpoints:
| Action | Purpose | Test |
|--------|---------|------|
| `generateCSABoxVisual` | If AI-powered visual generation is needed | Check if this is frontend-only (fabric.js) or needs backend |
| `getCSABoxContents` | Get current week's CSA box contents | `curl "API_URL?action=getCSABoxContents"` |

### Repurpose endpoints:
| Action | Purpose | Test |
|--------|---------|------|
| `repurposeBlogToSocial` | Parse blog URL/content → generate platform-specific posts | POST with URL or content |
| `repurposeSocialToBlog` | Analyze high-performing posts → generate blog ideas | POST with post IDs |
| `getHighPerformingPosts` | Fetch top-performing posts from Instagram | GET |

**For each endpoint:**
1. Check if it exists in the router
2. Check if the function is a real implementation or a stub
3. If stub → implement using OpenAI/Claude API for AI operations
4. If missing → create and wire to router
5. Test with curl and document response format

---

## PRIORITY 3: CSRF TOKEN SYSTEM

Add server-side CSRF protection:

1. **`generateCSRFToken()`** - Generate a random token, store in CacheService with 1-hour expiry
2. **`validateCSRFToken(token)`** - Validate incoming token against CacheService
3. **Add to doPost()** - All state-changing POST requests must include valid CSRF token
4. **New endpoint** - `?action=getCSRFToken` returns a fresh token for the frontend

This pairs with Desktop Claude adding the token to frontend fetch calls.

---

## OUTBOX REQUIREMENTS

When you finish each priority, write to your OUTBOX:
```markdown
## PRIORITY X COMPLETE - [Date]

### Endpoints Added/Fixed
| Endpoint | Status | Test Result |
|----------|--------|-------------|
| exchangeForPermanentPageTokens | DEPLOYED | curl returns {success: true} |
| ... | ... | ... |

### Deployment
Version: vXXX @YYY

### Awaiting Code Audit + Verifier Review
```

---

*Backend Claude - Build it, deploy it, test it. Code Audit and Verifier will verify.*
