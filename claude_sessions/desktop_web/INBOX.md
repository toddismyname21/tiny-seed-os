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

---

## PRIORITY 5: QUICK POST UX FIXES (From PM_Architect Tab Audit - 2026-02-18)

**Context:** PM_Architect + Owner audited the Quick Post tab against the North Star Principle: "If posting from the MCC is not EASIER than opening Instagram and hitting post, what is the point?" These are the friction points found.

**File:** `web_app/marketing-command-center.html`

---

### Fix 5A: DEFAULT ONLY PRIMARY IG ACCOUNT (CRITICAL)

**Problem:** All 3 Instagram account checkboxes (lines ~7917, 7921, 7925) are checked by default. User accidentally broadcasts to @tinyseedfarm + @tinyseedfleurs + @tinyseedfungi when they probably only want 1 account. This is a privacy/broadcast risk.

**Fix:**
1. Find the 3 Instagram account checkboxes in `#instagramAccountOptions` (around line 7914-7929)
2. Only the FIRST account (index 0, Tiny Seed Farm) should have `checked` attribute
3. Remove `checked` from accounts 1 and 2 (Tiny Seed Fleurs, Tiny Seed Fungi)
4. Add a visible badge/counter showing "1 of 3 accounts" so the user KNOWS which accounts are selected
5. Keep the "Toggle All" button so they can opt-in to all 3 when they want

**Before:**
```html
<input type="checkbox" name="igAccount" value="0" checked> Tiny Seed Farm
<input type="checkbox" name="igAccount" value="1" checked> Tiny Seed Fleurs
<input type="checkbox" name="igAccount" value="2" checked> Tiny Seed Fungi
```

**After:**
```html
<input type="checkbox" name="igAccount" value="0" checked> Tiny Seed Farm
<input type="checkbox" name="igAccount" value="1"> Tiny Seed Fleurs
<input type="checkbox" name="igAccount" value="2"> Tiny Seed Fungi
```

Also update any JavaScript that initializes the `selectedPlatforms` or account selection state to match (check `togglePlatform()` and any initialization code).

---

### Fix 5B: FIX TIKTOK MESSAGING (HIGH)

**Problem:** TikTok is NOT connected yet. The current UI has contradictory messaging:
- Header says "TikTok-first for max engagement" (line ~7882)
- But the TikTok toggle says "optional" (line ~7890)
- TikTok isn't even connected to an account

**Fix:**
1. Change the platform selection label from `"Publish to: (TikTok-first for max engagement)"` to just `"Publish to:"`
2. On the TikTok toggle button, change the "optional" label to **"Coming Soon"**
3. Make the TikTok toggle **visually disabled** (greyed out, `opacity: 0.5`, `pointer-events: none`) so users can't click it
4. Add a small tooltip or subtitle: "Connect TikTok in Settings"
5. Keep TikTok in the UI so it's ready when connected, but make it clear it's not active yet

**Do NOT remove TikTok from the UI entirely** - just disable it visually until it's connected.

---

### Fix 5C: AUTO-EXPAND MEDIA TOOLS ON UPLOAD (MEDIUM)

**Problem:** When user uploads a photo, the media editing tools (crop, filters, trim) are collapsed. They have to click to expand them. This adds an unnecessary click.

**Fix:**
1. Find the `handleFileSelect()` function (or wherever the upload success is handled)
2. After a successful file upload, automatically expand `#mediaToolsSection` if it's collapsed
3. Show the Edit tab by default (not Trim or Carousel)
4. If the user collapses it manually, respect that choice for subsequent uploads in the same session

---

### Fix 5D: ADD KEYBOARD SHORTCUT FOR POST NOW (LOW)

**Problem:** Power users can't quick-post with keyboard.

**Fix:**
1. Add a `keydown` event listener for `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
2. When triggered, call `postNow()` if the button is not disabled
3. Add subtle hint text under the POST NOW button: `"⌘+Enter"` in small gray text

---

## OUTBOX REQUIREMENTS FOR PRIORITY 5

When you finish, write to your OUTBOX:
```markdown
## PRIORITY 5 COMPLETE: Quick Post UX Fixes - [Date]

### Changes Made
| Fix | Line | What Changed |
|-----|------|-------------|
| 5A: IG account defaults | ~7917-7925 | Only account 0 checked by default |
| 5B: TikTok disabled | ~7882, 7887-7891 | Greyed out, "Coming Soon" label |
| 5C: Auto-expand media | handleFileSelect() | Media tools expand on upload |
| 5D: Keyboard shortcut | new listener | Cmd+Enter triggers postNow() |

### Awaiting Code Audit + Verifier Review
```

---

---

## PRIORITY 6: EXTERNAL UX AUDIT FIXES (From PM_Architect - 2026-02-18)

**Context:** A comprehensive external UX audit was conducted on ALL 4 CREATE sub-tabs. These are the functional issues (HTML/JS changes) that need fixing. UX Design Claude is handling the purely visual/CSS fixes separately.

**North Star Reminder:** "If posting from the MCC is not EASIER than opening Instagram and hitting post, what is the point?"

**File:** `web_app/marketing-command-center.html`

---

### Fix 6A: FLOATING/STICKY ACTION BAR ON DESKTOP (P1 CRITICAL)

**Problem:** The POST NOW and SCHEDULE buttons are buried at the bottom of the Quick Post form. On desktop, a user scrolls 8-10 lengths to reach them. The CTA is invisible until you scroll all the way down.

**Note:** Mobile sticky was already done in Session 7. This is for DESKTOP viewport.

**Fix:**
1. Create a floating action bar that stays visible at the bottom of the viewport while the user is in the Quick Post tab
2. It should contain: POST NOW button, SCHEDULE button, and the predicted engagement indicator
3. Use `position: sticky; bottom: 0;` on the `.publish-actions` container (or create a new sticky wrapper)
4. Add a subtle top border and backdrop blur so it looks clean over content
5. Only show when Quick Post tab is active (`createMode === 'quickPost'`)
6. On mobile, the existing Session 7 sticky CSS already handles this — don't duplicate

**Implementation hint:**
```css
@media (min-width: 769px) {
    .publish-actions {
        position: sticky;
        bottom: 0;
        background: rgba(var(--bg-card-rgb), 0.95);
        backdrop-filter: blur(12px);
        border-top: 1px solid var(--border);
        z-index: 50;
        padding: 1rem;
    }
}
```

---

### Fix 6B: POST NOW BUTTON STATE COMMUNICATION (P1 CRITICAL)

**Problem:** POST NOW appears greyed out/dim even on an empty form. There is NO explanation of why it's disabled or what's required. Users think it's broken.

**Fix:**
1. Find the POST NOW button and its disabled/enabled logic
2. When the button is disabled, show a small text below it explaining WHY:
   - No content? → "Add a caption or media to post"
   - No platform selected? → "Select at least one platform"
   - Currently posting? → "Posting..." with spinner
3. When all requirements are met, button should be CLEARLY bright/active (full opacity, vivid gradient)
4. Add a function `updatePostButtonState()` that checks conditions and updates both button state and helper text
5. Call it on: caption input, platform toggle, media upload/remove

**Example HTML addition below the button:**
```html
<small id="postButtonHelper" style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;">
    Add a caption or media to post
</small>
```

---

### Fix 6C: POST SUBMISSION SUCCESS FEEDBACK (P1 CRITICAL)

**Problem:** After posting, there is no visible confirmation that the post was submitted. Users don't know if it worked. The schedule path already has celebration (from Session 7 Schedule Flow Fix), but the immediate post path may not.

**Fix:**
1. In `postNow()` or `publishAll()`, after a SUCCESSFUL post:
   - Show a prominent success toast: "Posted to Instagram!" (with platform names)
   - If scheduling: "Scheduled for [date/time]!" and update the Scheduling Queue counter visibly
   - Add a brief celebration animation (confetti or checkmark pulse)
2. In `publishAll()`, after a FAILED post:
   - Show error toast with retry button
   - Auto-save caption as draft so user doesn't lose their work
3. After scheduling, the "Scheduling Queue: 0" counter should update to "Scheduling Queue: 1" and briefly flash/pulse to draw attention

**Verify first:** Check if `publishAll()` already has success feedback. If yes, ensure it's prominent enough. If it just logs to console, upgrade to user-visible toast.

---

### Fix 6D: PREDICTED ENGAGEMENT EMPTY STATE (P1 CRITICAL)

**Problem:** "Predicted Engagement: --%" reads as a broken state, not a loading state. The "--%" with no animation or message makes users distrust the feature.

**Fix:**
1. Find the `predictedEngagement` element and its initialization
2. Replace "--%" default with "Enter content to calculate"
3. When user starts typing content, show "Calculating..." with a subtle animation
4. Only show the "XX%" when there's actual data
5. If the prediction API fails or times out, show "Unable to calculate" (not "--")

---

### Fix 6E: CSA BOX VISUAL EMPTY STATE (P1 CRITICAL)

**Problem:** The CSA Box Visual preview area shows a blank brown/rust rectangle when no items are added. No instructional message — a new user thinks the feature is broken.

**Fix:**
1. Find the CSA preview/canvas area (around `csaCanvas` or `csaPreviewCanvas`)
2. When no items are added, show an overlay or message: "Add items above to preview your box visual" with a subtle icon (basket or box)
3. Show the current item list with removal capability:
   - Each added item should display as a pill/tag with an "×" button to remove
   - Show item count: "5 items added"
4. The item list should be visible BEFORE generating — users need to see and edit their selections
5. In `addCSAItem()` and `quickAddCSAItem()`, update a visible item list (not just internal array)

**Implementation hint:**
```javascript
function updateCSAItemDisplay() {
    const container = document.getElementById('csaItemList'); // create this if needed
    if (csaItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No items added yet. Use Quick Add or type a custom item above.</p>';
    } else {
        container.innerHTML = csaItems.map((item, i) =>
            `<span class="csa-item-pill">${safeHTML(item)} <span onclick="removeCSAItem(${i})" style="cursor:pointer; margin-left:4px;">&times;</span></span>`
        ).join('');
    }
}
```

---

### Fix 6F: AI STUDIO RESULTS PLACEHOLDER (P2 MODERATE)

**Problem:** In the AI Content Studio Generate tab, there is no visible results area before generating. Users don't know where output will appear or what format it takes.

**Fix:**
1. Find the results container for the Generate tab
2. Before any generation, show a placeholder: "Your generated content will appear here" with a subtle icon
3. After generation, replace with actual results
4. Ensure the "Generate Content" button is visible without excessive scrolling — if it's below the fold on smaller screens, consider moving it closer to the input area

---

### Fix 6G: REPURPOSE EMPTY STATES (P2 MODERATE)

**Problem:**
- "High-Performing Posts — Loading..." transitions to small grey "No high-performing posts found" text. The empty state is buried and not actionable.
- "Generate Blog Ideas from Top Posts" button is enabled even when there are no posts loaded. Clicking it when empty is confusing.

**Fix:**
1. In `loadHighPerformers()`, when no posts found:
   - Show a prominent empty state card (not just small grey text)
   - Include an action button: "Go to Brain to add training posts" or "Import posts from Instagram"
   - Use an icon (empty inbox or seedling illustration)
2. Disable the "Generate Blog Ideas from Top Posts" button when no high-performing posts are loaded
   - Add `disabled` attribute and greyed style
   - Show tooltip: "Load high-performing posts first"
3. Add a brief tooltip to the Threads checkbox explaining why it defaults to unchecked: "Threads is newer — opt in when ready"

---

### Fix 6H: "CHECK" BUTTON RENAME (P2 MODERATE)

**Problem:** The "Check" button before POST NOW has no tooltip or label explaining what it does. Its purpose is completely opaque — does it check grammar? Post validity? Platform requirements?

**Fix:**
1. Find the Check button (around line ~6456 per Session 7c)
2. Rename from "Check" to "Validate Post" or "Pre-Flight Check"
3. Add a tooltip: "Checks character limits, hashtag count, image sizes, and platform requirements"
4. Consider showing the validation results inline (below the button) rather than in a modal, for faster feedback

---

### Fix 6I: 5-3-2 CONTENT TYPE EXPLAINER (P2 MODERATE)

**Problem:** The "5-3-2 Content Type" tracker (Curated 5, Original 3, Personal 2) has no inline explanation. New team members unfamiliar with this content marketing framework will be confused.

**Fix:**
1. Add a small "?" icon or info button next to the 5-3-2 header
2. On click/hover, show a tooltip or popover explaining:
   - "The 5-3-2 rule: For every 10 posts, aim for 5 curated (shared from others), 3 original (your unique content), and 2 personal (behind-the-scenes, team stories)"
3. Alternatively, add a collapsed one-liner below the tracker: "ℹ️ A balanced content mix for engagement"

---

### Fix 6J: CHARACTER COUNTER PLATFORM LABELS (P2 MODERATE)

**Problem:** The character counter bar uses small platform icons only. They are hard to recognize for users unfamiliar with platform icons.

**Fix:**
1. Find the character counter section (multi-platform counter below caption)
2. Add short text labels next to each icon: "IG" "FB" "TT" "YT"
3. Keep the icons but make them larger (at least 16px) and add the text label for clarity
4. Alternatively, spell out on hover: tooltip showing "Instagram: 284/2200 characters"

---

### Fix 6K: SUB-TAB NAVIGATION SIZING (P2 MODERATE)

**Problem:** "AI Content Studio" is too long and wraps to two lines in the sub-tab navigation bar, breaking the visual rhythm of the tabs.

**Fix:**
1. Find the create-mode-btn for AI Content Studio (around line ~6990)
2. Change the label from "AI Content Studio" to "AI Studio"
3. This makes all 4 tabs consistent width: "Quick Post" | "AI Studio" | "CSA Box Visual" | "Repurpose"
4. If "CSA Box Visual" is also too long, consider "CSA Visual" or "Box Builder"

---

### Fix 6L: INTELLIGENCE PANEL TOOLTIP (P3 MINOR)

**Problem:** The floating lightbulb button (Intelligence Panel toggle) has no tooltip or label. First-time users don't know what it does.

**Fix:**
1. Find the Intelligence Panel toggle button (floating button on right edge)
2. Add `title="Open Intelligence Panel"` attribute for hover tooltip
3. On first visit (check localStorage), briefly pulse the button or show a one-time hint: "💡 Tap for AI insights"

---

### Fix 6M: "OPTIMAL: CALCULATING..." FIX (P2 MODERATE)

**Problem:** "Optimal: Calculating..." stays perpetually loading. If it depends on content being entered first, the UI should say so.

**Fix:**
1. Find the optimal time calculation display
2. Before content is entered: "Optimal: Enter content first"
3. While calculating after content entered: "Optimal: Calculating..." with spinner
4. After calculation: "Optimal: Tue 9:15 AM" (actual result)
5. If calculation fails: "Optimal: Try again" with refresh icon

---

### Fix 6N: FIRST COMMENT VISUAL TREATMENT (P3 MINOR)

**Problem:** The First Comment textarea has a red dashed border that looks like an error state, not a feature zone.

**Fix:**
1. Find the first comment textarea (Session 7c, around line ~6522-6542)
2. Change the red dashed border to a blue or teal dashed border (matching the IG brand color)
3. Or use a solid subtle border with a "💬 First Comment (IG only)" header in the feature's accent color

---

## OUTBOX REQUIREMENTS FOR PRIORITY 6

When you finish, write to your OUTBOX:
```markdown
## PRIORITY 6 COMPLETE: External UX Audit Fixes - [Date]

### Changes Made
| Fix | Line | What Changed |
|-----|------|-------------|
| 6A: Sticky action bar | ~XXXX | Desktop floating POST NOW/SCHEDULE bar |
| 6B: Button state messaging | ~XXXX | Disabled state shows why |
| 6C: Success feedback | publishAll() | Toast + celebration on post |
| 6D: Engagement empty state | ~XXXX | "--%" → "Enter content to calculate" |
| 6E: CSA empty state | ~XXXX | Instructional message + item list with removal |
| 6F: AI results placeholder | ~XXXX | "Results will appear here" placeholder |
| 6G: Repurpose empty states | ~XXXX | Prominent empty + disabled button |
| 6H: Check → Validate Post | ~XXXX | Renamed + tooltip |
| 6I: 5-3-2 explainer | ~XXXX | Info tooltip added |
| 6J: Counter labels | ~XXXX | Platform text labels added |
| 6K: Tab sizing | ~XXXX | "AI Content Studio" → "AI Studio" |
| 6L: Panel tooltip | ~XXXX | Hover label added |
| 6M: Optimal time fix | ~XXXX | Content-dependent state messaging |
| 6N: First comment border | ~XXXX | Red dashed → teal dashed |

### Awaiting Code Audit + Verifier Review
```

---

---

## PRIORITY 7: OWNER-FOUND BUGS (From Live Browser Testing - 2026-02-18)

**Context:** Owner tested the CREATE tab live in browser. These are real bugs, not theoretical. Fix immediately.

**File:** `web_app/marketing-command-center.html`

---

### Bug 7A: "MORE PLATFORMS / FEWER PLATFORMS" TOGGLE DOES NOTHING (HIGH)

**Problem:** The "More platforms..." / "Fewer platforms" toggle button exists but clicking it reveals nothing new and hides nothing. It's a dead button.

**Diagnosis steps:**
1. Find the toggle button — grep for `more platforms` or `fewer platforms` (case-insensitive)
2. Find the onclick handler — what function does it call?
3. Find the hidden platforms container it's supposed to toggle — does it exist? Does it have content?
4. Likely causes:
   - The container it toggles is empty (no additional platforms inside)
   - The toggle target ID doesn't match the actual container
   - The platforms (Twitter/Threads/Pinterest) were never added to the hidden section

**Fix:**
1. Ensure these platforms exist in the hidden container: **Twitter/X, Threads, Pinterest** (and any others)
2. Each should have a toggle button matching the IG/FB style
3. The toggle button should show/hide the container with a smooth transition
4. If these platforms aren't connected yet, show them greyed out with "Coming Soon" (same treatment as TikTok in Priority 5B)

---

### Bug 7B: CAROUSEL MODE REJECTS VIDEO (HIGH)

**Problem:** Owner tried to add a video (cat video) as one of the carousel slides. It was rejected. Instagram supports mixed-media carousels (photos + videos), so this is a frontend validation bug.

**Diagnosis steps:**
1. Find the carousel file upload handler — likely in `handleFileSelect()` or the carousel-specific upload function
2. Check the file type validation — is it filtering to images only? (`accept="image/*"`)
3. Check the carousel slide addition logic — does it reject non-image MIME types?

**Fix:**
1. Allow video files (`.mp4`, `.mov`) as carousel slides
2. Update the file input `accept` attribute to include video: `accept="image/*,video/mp4,video/quicktime"`
3. For video slides, show a video thumbnail or play icon instead of image preview
4. Keep the single-slide limit for video length (Instagram: 60s for feed, 90s for Reels)
5. Update the carousel counter to show media type: "3 slides (2 photos, 1 video)"

---

## OUTBOX REQUIREMENTS FOR PRIORITY 7

```markdown
## PRIORITY 7 COMPLETE: Owner-Found Bugs - [Date]

### Changes Made
| Bug | Line | What Changed |
|-----|------|-------------|
| 7A: More platforms toggle | ~XXXX | Fixed toggle target / added platform content |
| 7B: Carousel video | ~XXXX | Accept video MIME types in carousel upload |

### Awaiting Code Audit + Verifier Review
```

---

---

## PRIORITY 8: SEED INVENTORY — FULL FLOW WIRING (From PM_Architect - 2026-02-18)

**Context:** Owner has seed orders arriving NOW. The seed inventory backend is fully built but the frontend is disconnected. We need to wire everything so the owner can: photograph seed packets → AI auto-fills details → print QR labels → scan at seeding. Backend Claude is adding receipt photo upload in parallel.

**North Star:** Taking a photo of a seed packet and getting it into inventory should be EASIER than typing it into a spreadsheet.

---

### Fix 8A: WIRE AI PARSING INTO INVENTORY CAPTURE (CRITICAL)

**File:** `inventory_capture.html`

**Problem:** `inventory_capture.html` takes photos but NEVER calls the AI parsing functions. The user has to manually fill every field. The backend `analyzeSeedPacket()` function works perfectly (Claude Vision API) but is never invoked.

**Current flow (broken):**
```
Photo taken → stored as base64 → user manually fills form → submit
```

**Target flow:**
```
Photo taken → stored as base64 → call analyzeSeedPacket API → auto-fill form → user reviews/edits → submit
```

**Fix:**
1. Find the `handlePhoto()` function (around line ~1571)
2. After the photo is captured and base64 is stored, add an automatic API call:
```javascript
// After photo captured, call AI parsing
async function parsePhotoWithAI(base64Image) {
    try {
        showToast('Analyzing seed packet...', 'info');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'analyzeSeedPacket',
                image: base64Image
            })
        });
        const result = await response.json();
        if (result.success && result.data) {
            // Auto-fill form fields
            document.getElementById('itemName').value = result.data.crop + ' - ' + (result.data.variety || '');
            // Map AI results to form fields — adapt field IDs to match existing form
            // Fill: crop, variety, vendor, lot number, quantity, organic status, etc.
            showToast('Seed packet details extracted!', 'success');
        }
    } catch (err) {
        console.warn('AI parsing failed, fill manually:', err);
        showToast('Could not read packet — fill details manually', 'warning');
    }
}
```
3. Call `parsePhotoWithAI(currentPhotoBase64)` right after `currentPhotoBase64` is set in `handlePhoto()`
4. The form should pre-fill but remain EDITABLE so the user can correct anything the AI got wrong
5. Show a subtle badge: "AI-filled ✓" next to auto-populated fields

**Important:** The existing form in inventory_capture.html is for GENERAL farm inventory (addFarmInventoryItem). For SEEDS specifically, we need the form to also support calling `addSeedLot` instead of `addFarmInventoryItem`. Add a toggle or auto-detect:
- If AI detects it's a seed packet → switch to seed lot submission mode
- Show seed-specific fields: variety, germination rate, organic cert, days to maturity
- Submit calls `addSeedLot` instead of `addFarmInventoryItem`

---

### Fix 8B: ADD SEED INVENTORY LINK TO EMPLOYEE APP (CRITICAL)

**File:** `employee.html`

**Problem:** Employees cannot access inventory capture from the employee app. There's no button or link.

**Fix:**
1. Read `employee.html` and find the navigation or quick-action section
2. Add a prominent button/card: "📦 Seed Inventory" or "📸 Capture Inventory"
3. Link to `inventory_capture.html` (same domain, relative path)
4. Also add a link to `seed_inventory_PRODUCTION.html` for viewing existing inventory
5. Make the button large and obvious — this is used in the field with muddy hands

**Example:**
```html
<a href="inventory_capture.html" class="quick-action-card">
    <i class="fas fa-camera"></i>
    <span>Capture Seed Packet</span>
    <small>Photo → AI reads → auto-log</small>
</a>
<a href="seed_inventory_PRODUCTION.html" class="quick-action-card">
    <i class="fas fa-boxes-stacked"></i>
    <span>View Seed Inventory</span>
    <small>QR labels, stock levels, usage</small>
</a>
```

---

### Fix 8C: ADD RECEIPT PHOTO UPLOAD TO SEED INVENTORY UI (HIGH)

**File:** `seed_inventory_PRODUCTION.html`

**Problem:** No way to attach purchase receipt photos or organic certificate photos to a seed lot. The owner needs this for organic traceability audits.

**Fix:**
1. Find the "Add New Seed Lot" form in seed_inventory_PRODUCTION.html
2. Add TWO photo upload fields after the existing form fields:
   - **"Purchase Receipt"** — camera/gallery photo upload
   - **"Organic Certificate"** — camera/gallery photo upload (only show when organic = Yes)
3. On form submit:
   - Upload each photo via `uploadSeedPhoto` API (Backend Claude is building this)
   - Pass the returned URLs to `addSeedLot` as `receiptPhotoUrl` and `organicCertPhotoUrl`
4. On the seed detail view (when viewing an existing lot):
   - Show receipt thumbnail if one exists (clickable to view full size)
   - Show organic cert thumbnail if one exists
   - Add "Upload Receipt" / "Upload Cert" buttons for lots that don't have them yet

**Photo upload pattern** — reuse the same camera/gallery approach from inventory_capture.html:
```html
<div class="photo-upload-section">
    <label>Purchase Receipt</label>
    <div class="upload-zone" onclick="document.getElementById('receiptInput').click()">
        <i class="fas fa-receipt"></i>
        <span>Tap to photograph receipt</span>
    </div>
    <input type="file" id="receiptInput" accept="image/*" capture="environment" style="display:none">
    <img id="receiptPreview" style="display:none; max-width: 200px; border-radius: 8px;">
</div>
```

---

### Fix 8D: CREATE seed_track.html (HIGH)

**Problem:** Every seed lot QR code points to `https://toddismyname21.github.io/tiny-seed-os/seed_track.html?id=SEED_LOT_ID` but this page DOES NOT EXIST. Scanning a QR code externally returns a 404.

**Fix:**
Create `seed_track.html` in the project root. This is a PUBLIC page (no auth required) that displays seed lot information when a QR code is scanned.

**Page should show:**
- Seed Lot ID (large, prominent)
- Crop + Variety
- Supplier
- Organic certification status (with badge)
- Certifier name
- Pack date / Expiration date
- Status (Active / Low / Empty)
- Farm name: "Tiny Seed Farm" with logo
- "Traced with Tiny Seed OS" footer branding

**How it works:**
1. Page loads, reads `?id=` parameter from URL
2. Calls `GET ${API_URL}?action=getSeedByQR&seedLotId=${id}`
3. Displays the seed lot data in a clean, mobile-friendly card
4. If lot not found, shows "Seed lot not found" message

**Design:**
- Mobile-first (will be opened by scanning QR with phone)
- Clean card layout with farm branding
- Green/earthy color scheme matching Tiny Seed Farm brand
- No login required — this is for transparency/traceability
- Loads fast — single API call, minimal CSS

**Pre-flight note:** This file is REQUIRED by existing QR codes. It's not a duplicate — check `generateSeedQRCode()` in MERGED TOTAL.js line ~26465 which references this exact file.

---

## OUTBOX REQUIREMENTS FOR PRIORITY 8

```markdown
## PRIORITY 8 COMPLETE: Seed Inventory Flow - [Date]

### Changes Made
| Fix | File | What Changed |
|-----|------|-------------|
| 8A: AI parsing wired | inventory_capture.html | Photo → analyzeSeedPacket API → auto-fill form |
| 8B: Employee app link | employee.html | Added Capture + View Seed Inventory buttons |
| 8C: Receipt upload | seed_inventory_PRODUCTION.html | Receipt + organic cert photo upload fields |
| 8D: Seed track page | seed_track.html (NEW) | Public QR scan landing page |

### Functions Added/Modified
- parsePhotoWithAI() in inventory_capture.html: Calls analyzeSeedPacket, auto-fills form
- Receipt upload handlers in seed_inventory_PRODUCTION.html
- seed_track.html: Full page with API lookup

### Awaiting Code Audit + Verifier Review
```

---

*Desktop Web Claude - Build it right. Code Audit and Verifier will check your work.*
