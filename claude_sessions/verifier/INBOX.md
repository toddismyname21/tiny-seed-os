# INBOX: Verifier Claude
## FULL CREATE TAB VERIFICATION - RUN NOW

**Updated:** 2026-02-18
**From:** PM_Architect
**Priority:** CRITICAL - Owner is doing live browser testing RIGHT NOW
**Role:** You verify that changes exist in the code. Owner verifies they work in browser.

---

## YOUR ONE JOB RIGHT NOW

**Run a SINGLE comprehensive static verification of the MCC CREATE tab.**

File: `web_app/marketing-command-center.html`
Backend: `apps_script/MERGED TOTAL.js`

ALL builder terminals are DONE:
- Desktop Claude: 6 priorities complete (security, sub-tabs, UX fixes, external audit fixes)
- Backend Claude: 3 priorities complete (tokens, endpoints, CSRF)
- UX Design Claude: Phase 1 + Phase 2 complete (CSS polish + external audit visual fixes)
- PM_Architect: 18 innerHTML XSS fixes (commit a59f7cf)

**Do NOT wait for Code Audit. Run your verification NOW and write results to your OUTBOX.**

---

## VERIFICATION RULES (IRON CLAD)

1. **NEVER modify code** - Only read and report
2. **Document evidence** - Line numbers, grep output
3. **Use STATUS_ABSTAIN** - If you cannot verify without a browser, say so
4. **Report ALL issues** - Even small ones
5. **Check for orphans** - HTML elements without JS handlers, JS calls to missing elements

---

## VERIFICATION CHECKLIST

Run each check. For every item, report PASS / FAIL / STATUS_ABSTAIN with evidence.

---

### A. SECURITY (Priority 1 + XSS Remediation)

| # | Check | How to Verify |
|---|-------|--------------|
| A1 | DOMPurify CDN in `<head>` | `grep -n 'dompurify\|purify.min.js' web_app/marketing-command-center.html` |
| A2 | `safeHTML()` helper function defined | `grep -n 'function safeHTML' web_app/marketing-command-center.html` |
| A3 | No remaining unsafe innerHTML with API data | `grep -n '\.innerHTML.*data\.\|\.innerHTML.*result\.\|\.innerHTML.*item\.\|\.innerHTML.*alert\.\|\.innerHTML.*rec\.' web_app/marketing-command-center.html` — every match should be wrapped in `safeHTML()` or use `textContent` |
| A4 | 6 missing functions now exist | Grep for ALL 6: `editEvergreen`, `import52WeekTemplate`, `loadSharedContentCalendar`, `open52WeekImportModal`, `openAddCalendarEntryModal`, `openSharedContentEntryModal` |
| A5 | `selectMixTrackerAccount` - exactly 1 definition | `grep -c 'function selectMixTrackerAccount' web_app/marketing-command-center.html` → should return 1 |
| A6 | `truncateText` - exactly 1 definition | `grep -c 'function truncateText' web_app/marketing-command-center.html` → should return 1 |
| A7 | Fetch calls have try/catch | Read around lines ~19719 (approveAllPics) and ~35880 (saveFieldCapture) — verify try/catch with toast |

---

### B. AI CONTENT STUDIO (Priority 2)

| # | Check | How to Verify |
|---|-------|--------------|
| B1 | `switchStudioTab()` exists | `grep -n 'function switchStudioTab'` |
| B2 | `generateStudioContent()` exists and calls API | Read function body — should contain `fetch` or API call, not just a stub |
| B3 | `studioQuickAction()` exists | `grep -n 'function studioQuickAction'` |
| B4 | `analyzeStudioPhoto()` exists | `grep -n 'function analyzeStudioPhoto'` |
| B5 | `generateABTestVariants()` exists | `grep -n 'function generateABTestVariants'` |
| B6 | All 4 studio tab containers exist in HTML | Grep for `studioGenerateTab`, `studioTemplatesTab`, `studioPhotoTab`, `studioABTab` |
| B7 | Results placeholder exists (Priority 6F) | Grep for results container in AI Studio section — should have placeholder text |

---

### C. CSA BOX VISUAL (Priority 3)

| # | Check | How to Verify |
|---|-------|--------------|
| C1 | `generateCSABoxVisual()` exists and uses fabric.js | Read function body — should contain `new fabric.Canvas` or `fabric.` calls |
| C2 | `addCSAItem()` exists | `grep -n 'function addCSAItem'` |
| C3 | `quickAddCSAItem()` exists | `grep -n 'function quickAddCSAItem'` |
| C4 | `downloadCSAVisual()` exists | `grep -n 'function downloadCSAVisual'` |
| C5 | Canvas element in HTML | `grep -n 'csaCanvas\|csaPreviewCanvas'` |
| C6 | Empty state message exists (Priority 6E) | Grep for instructional text in CSA section ("Add items" or similar) |
| C7 | Item removal capability | Grep for `removeCSAItem` or item delete/remove function |

---

### D. REPURPOSE (Priority 4)

| # | Check | How to Verify |
|---|-------|--------------|
| D1 | `generateBlogToSocial()` exists and calls API | Read function body |
| D2 | `generateSocialToBlog()` exists | `grep -n 'function generateSocialToBlog'` |
| D3 | `toggleRepurposeInput()` exists | `grep -n 'function toggleRepurposeInput'` |
| D4 | `loadHighPerformers()` exists | `grep -n 'function loadHighPerformers'` |
| D5 | Results containers exist | Grep for `blogToSocialResults` and `socialToBlogResults` |
| D6 | Empty state for high performers (Priority 6G) | Check that empty state is prominent, not just small grey text |

---

### E. QUICK POST UX (Priority 5)

| # | Check | How to Verify |
|---|-------|--------------|
| E1 | Only first IG account checked by default | Find the 3 `igAccount` checkboxes — only value="0" should have `checked` |
| E2 | Account counter badge exists | Grep for `igAccountCounter` or "of 3" |
| E3 | TikTok disabled with "Coming Soon" | Find TikTok toggle — should have `opacity: 0.5`, `pointer-events: none`, "Coming Soon" text |
| E4 | Media tools auto-expand on upload | Find `showMediaToolsSection` — should auto-expand body |
| E5 | Cmd+Enter keyboard shortcut | Grep for `keydown` listener with `metaKey\|ctrlKey` and `Enter` |

---

### F. EXTERNAL UX AUDIT FIXES (Priority 6)

| # | Check | How to Verify |
|---|-------|--------------|
| F1 | Sticky/floating action bar on desktop | Check for `position: sticky` on `.publish-actions` in desktop media query or main styles |
| F2 | POST NOW disabled state messaging | Grep for `postButtonHelper` or disabled reason text near the POST NOW button |
| F3 | Predicted Engagement empty state | Find predicted engagement display — should NOT show "--%" as default. Should show "Enter content" or similar |
| F4 | "Check" renamed to "Validate Post" | Find the check/validate button — text should say "Validate" not just "Check" |
| F5 | 5-3-2 explainer tooltip | Grep for "5-3-2" — should have tooltip or info icon nearby |
| F6 | Character counter has platform labels | Find character counter — should have text labels (IG, FB, etc.) not just icons |
| F7 | Tab label: "AI Studio" not "AI Content Studio" | Find the create-mode-btn for AI Studio — text should be shortened |
| F8 | Intelligence Panel has tooltip | Find the lightbulb/panel toggle button — should have `title` attribute |
| F9 | First Comment border is NOT red | Find first comment textarea — border should be teal/blue, not red |

---

### G. BACKEND ENDPOINTS (Backend Priority 1-3)

| # | Check | How to Verify |
|---|-------|--------------|
| G1 | `exchangeForPermanentPageTokens` exists | `grep -n 'function exchangeForPermanentPageTokens' apps_script/MERGED\ TOTAL.js` |
| G2 | `checkTokenHealth` exists and is routed | Grep for function AND for `case 'checkTokenHealth'` in router |
| G3 | `refreshAllIGAATokens` exists and is routed | Same pattern |
| G4 | `generateCSRFToken` exists | `grep -n 'function generateCSRFToken' apps_script/MERGED\ TOTAL.js` |
| G5 | CREATE sub-tab endpoints routed | Grep for: `generateAIContent`, `analyzePhoto`, `generateABVariants`, `repurposeBlogToSocial`, `repurposeSocialToBlog`, `getHighPerformingPosts` in router |

---

### H. CSS / NO REGRESSIONS

| # | Check | How to Verify |
|---|-------|--------------|
| H1 | No `display: none` on interactive elements | `grep -n 'display.*none' web_app/marketing-command-center.html` — check none target buttons/inputs |
| H2 | No `pointer-events: none` on buttons (except TikTok) | `grep -n 'pointer-events.*none' web_app/marketing-command-center.html` — only TikTok toggle should have this |
| H3 | No orphaned getElementById calls | Spot-check 5-10 `getElementById` calls to confirm their target elements exist in HTML |
| H4 | No orphaned onclick handlers | Spot-check 5-10 `onclick="functionName()"` to confirm those functions are defined in `<script>` |

---

## OUTPUT FORMAT

Write your FULL verdict to `claude_sessions/verifier/OUTBOX.md` using this format:

```markdown
## FULL CREATE TAB VERIFICATION - 2026-02-18
**Verified By:** Verifier_Claude

### Summary
- Total checks: XX
- PASS: XX
- FAIL: XX
- STATUS_ABSTAIN: XX

### Results
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| A1 | DOMPurify CDN | PASS/FAIL | [grep output or line number] |
| A2 | safeHTML() helper | PASS/FAIL | [evidence] |
| ... | ... | ... | ... |

### FAIL Items (Must Fix Before Ship)
[Numbered list of any FAIL items with what specifically is wrong]

### STATUS_ABSTAIN Items (Need Browser Testing)
[Items that require runtime verification — owner is testing these live]

### FINAL VERDICT: PASS / FAIL / NEEDS_REMEDIATION
```

---

**DO NOT DELAY. Run all checks NOW. The owner is testing in browser in parallel.**

---

## UPCOMING: SEED INVENTORY VERIFICATION - 2026-02-18

**New work assigned to Desktop Claude (Priority 8) and Backend Claude (Priority 4).**

When their OUTBOXes claim done, verify:

### Desktop Claude Priority 8 (Seed Inventory Flow)
| Check | How to Verify |
|-------|--------------|
| 8A: AI parsing wired | inventory_capture.html calls `analyzeSeedPacket` API after photo capture |
| 8A: Form auto-fill | AI results populate form fields (crop, variety, vendor, etc.) |
| 8B: Employee app link | employee.html has links to inventory_capture.html and seed_inventory_PRODUCTION.html |
| 8C: Receipt upload | seed_inventory_PRODUCTION.html has receipt + cert photo upload fields |
| 8C: Upload calls API | Receipt photos call `uploadSeedPhoto` endpoint |
| 8D: seed_track.html exists | File exists in project root, loads ?id= param, calls getSeedByQR API |

### Backend Claude Priority 4 (Seed Backend)
| Check | How to Verify |
|-------|--------------|
| 4A: Schema updated | SEED_INVENTORY_HEADERS includes Receipt_Photo_URL, Organic_Cert_Photo_URL |
| 4A: addSeedLot stores photos | Function accepts receiptPhotoUrl and organicCertPhotoUrl |
| 4B: uploadSeedPhoto endpoint | Function exists AND is routed in POST router |
| 4C: analyzeSeedPacket routed | Exists in POST router, returns parsed seed data |

*Verifier Claude - Trust but verify. Every claim needs evidence. You are the gate.*
