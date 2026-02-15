# INBOX: Desktop Web Claude
## MARCHING ORDERS - 2026-02-15

**From:** PM_Architect
**Priority:** CRITICAL
**File:** `web_app/marketing-command-center.html`

---

## MANDATORY PIPELINE - READ THIS FIRST

**NOTHING is "done" until it passes Code Audit + Verifier.**

### Your workflow for EVERY change:
1. Make the fix/feature
2. Write what you did to your OUTBOX.md with exact line numbers
3. Code Audit Claude will review your changes for security/quality
4. Verifier Claude will verify your changes actually work
5. If either flags issues → you fix them → repeat from step 2
6. Only after BOTH say PASS is it done

**DO NOT declare "COMPLETE" in your OUTBOX until you have made the changes. Code Audit and Verifier will independently verify.**

---

## PRIORITY 1: SECURITY FIXES (CRITICAL)

### 1A. Add DOMPurify CDN

Add to `<head>` after the fabric.js script (after line ~17):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js"></script>
```

### 1B. Fix XSS via innerHTML (8+ locations)

These lines inject unsanitized API response data into `.innerHTML`. For EACH one, either:
- Use `textContent` (for plain text)
- Or wrap in `DOMPurify.sanitize()` before assigning to innerHTML

| Line (approx) | Element | Current Problem | Fix |
|---------------|---------|-----------------|-----|
| ~15037 | `settingsVoiceFeedback` | `innerHTML = '<p>' + data.feedback + '</p>'` | Use `textContent = data.feedback` |
| ~15517 | `monitoredHashtagsContainer` | Hashtag value in `onclick="loadHashtagFeed('${tag}')"` string concat | Escape tag value or use `addEventListener` with closure |
| ~15770 | `engageSingleSentimentFeedback` | API data in innerHTML template | Wrap full string in `DOMPurify.sanitize()` |
| ~15784 | container | `data.content.map(item =>` in innerHTML | Wrap in `DOMPurify.sanitize()` |
| ~31425 | `contentGaps` | `${gap}` interpolated into innerHTML | Wrap in `DOMPurify.sanitize()` |
| ~31426 | `topContent` | `${theme}` interpolated into innerHTML | Wrap in `DOMPurify.sanitize()` |
| ~31427 | `strategyRecs` | `${s}` interpolated into innerHTML | Wrap in `DOMPurify.sanitize()` |
| ~30034 | `voiceFeedback` | `data.feedback` in innerHTML | Use `textContent` |
| ~30124 | container | `data.comments.map` in innerHTML | Wrap in `DOMPurify.sanitize()` |
| ~30196 | container | `data.content.map` in innerHTML | Wrap in `DOMPurify.sanitize()` |
| ~30603 | resultDiv | `data.error` in innerHTML | Escape or use textContent for error |

**Pattern for bulk fix:** Create a helper at the top of the script section:
```javascript
function safeHTML(html) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
}
```
Then replace `el.innerHTML = htmlString` with `el.innerHTML = safeHTML(htmlString)` for all API-data-driven innerHTML assignments.

### 1C. Fix 3 Unhandled Fetch Calls

Wrap these in try/catch with user-facing error toasts:
- Line ~19043: image upload fetch
- Line ~19439: farm pics batch approval fetch
- Line ~35597: field capture queue fetch

### 1D. Implement 6 Missing Functions

These are called from onclick handlers but DON'T EXIST, causing runtime JS errors:

| Function | Called At | Implementation |
|----------|----------|----------------|
| `editEvergreen(id)` | Line ~16129 | Show toast: `showToast('Evergreen editing coming soon', 'info')` |
| `import52WeekTemplate()` | Line ~9024 | Show toast: `showToast('52-week template import coming soon', 'info')` |
| `loadSharedContentCalendar()` | Line ~9000 | Show toast: `showToast('Loading shared calendar...', 'info')` then call `?action=getSharedContentCalendar` if endpoint exists |
| `open52WeekImportModal()` | Line ~9112 | Show toast: `showToast('52-week import coming soon', 'info')` |
| `openAddCalendarEntryModal()` | Line ~8999 | Show toast: `showToast('Calendar entry coming soon', 'info')` |
| `openSharedContentEntryModal()` | Line ~9115 | Show toast: `showToast('Shared content entry coming soon', 'info')` |

Add these as real function definitions in the script section. Even if they're stubs, they MUST exist so buttons don't throw errors.

### 1E. Consolidate selectMixTrackerAccount

Two definitions exist:
- Line ~24830: Uses CSS classes (KEEP this approach)
- Lines ~25636-25670: Overrides with inline styles + adds igSyncedPosts re-render

**Merge into ONE function at line ~24830:**
1. Keep the CSS class logic from definition 1
2. Add the `igSyncedPosts` re-render and weekly summary calculation from definition 2
3. DELETE the inline style overrides (lines ~25636-25670) - let CSS `.active` class handle styling
4. Delete definition 2 entirely

### 1F. Fix truncateText Duplicate
- Defined at ~21419 and ~29694 (identical). Delete the first copy at ~21419.

---

## PRIORITY 2: DEEP DIVE - AI CONTENT STUDIO

Sub-tab `id="aiStudioMode"` (starts line ~8167) has 4 inner tabs: Generate, Templates, Photo Analysis, A/B Testing.

For EACH inner tab:
1. Find the JS functions that power it
2. Verify they actually work (not stubs)
3. Fix any broken functions, add error handling
4. Ensure results display properly with good UX

Key functions to verify:
- `switchStudioTab()` - does tab switching work?
- `studioQuickAction()` - do quick action buttons trigger generation?
- `generateStudioContent()` - does the main generate button call the API?
- `refreshAIContext()` - does the context banner update?
- All A/B Testing functions
- All Photo Analysis functions

---

## PRIORITY 3: DEEP DIVE - CSA BOX VISUAL

Sub-tab `id="csaVisualizerMode"` (starts line ~8594).

Verify and fix:
- `addCSAItem()` / `quickAddCSAItem()` - item management
- `generateCSABoxVisual()` - fabric.js canvas rendering
- `downloadCSAVisual()` - canvas export
- `clearCSACanvas()` - reset

If `generateCSABoxVisual()` is a stub, implement it properly using fabric.js to create a beautiful flat-lay style graphic.

---

## PRIORITY 4: DEEP DIVE - REPURPOSE

Sub-tab `id="repurposeMode"` (starts line ~8808).

Verify and fix:
- `toggleRepurposeInput()` - URL vs content toggle
- `generateBlogToSocial()` - blog → social posts
- `generateSocialToBlog()` - social → blog ideas
- `loadHighPerformers()` - fetch top posts

---

## OUTBOX REQUIREMENTS

When you finish each priority, write to your OUTBOX:
```markdown
## PRIORITY X COMPLETE - [Date]

### Changes Made
| Fix | File | Line | What Changed |
|-----|------|------|-------------|
| XSS fix | marketing-command-center.html | 15037 | Changed innerHTML to textContent |
| ... | ... | ... | ... |

### Functions Added/Modified
- functionName() at line XXX: description

### Awaiting Code Audit + Verifier Review
```

---

*Desktop Web Claude - Build it right. Code Audit and Verifier will check your work.*
