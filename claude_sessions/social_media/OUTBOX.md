# STATUS: Social Media Claude

**Last Updated:** 2026-02-14 @ MCC CREATE TAB UX RESEARCH COMPLETE
**Report To:** PM_Architect & Desktop_Claude

---

## CURRENT SESSION: Meta API Setup - COMPLETE

### All Credentials Retrieved ✅

#### App Credentials
| Platform | Item | Value |
|----------|------|-------|
| **Meta (FB/IG)** | App ID | `1453282209770271` |
| **Meta (FB/IG)** | App Secret | `923bd5e066093def628e01836769e4a5` |
| **Threads** | App ID | `1080497484205906` |
| **Threads** | App Secret | `4e45ad6e506f214158017586a75caac6` |

#### Tiny Seed Farm
| Item | Value |
|------|-------|
| Facebook Page ID | `1760385317513019` |
| Instagram Business ID | `17841403850522` |
| Instagram Handle | @tinyseedfarm |
| Page Access Token | `EAAUpwKHfKx8BQi92G2mojrsPm5iokMIYYcWCYl0oaqY8FX1iCvjjtDgWC0SZB1Td1W5ZC8tmx0eRH7DnXsHo6tkZBE2UgiRC53ZAZCJZATOLiJQZBsq0dKSKLAKD0zZAJYJzRP73iHJvEjoGxf3ZAniNpwynrhv4nIkQUsNjy978K8mzCd29AhXEzJkamfzepmunPFIJziEPEFPhYGXoJDJsreuMqQXtE7OG9l6KM0Wl7CbDn7XVuZAISHCmEZD` |

#### Tiny Seed Fleurs
| Item | Value |
|------|-------|
| Facebook Page ID | `975076245687644` |
| Instagram Business ID | `17841435193515793` |
| Instagram Handle | @tinyseedfleurs |
| Page Access Token | `EAAUpwKHfKx8BQtcLLKvR2VsctslWZBz9DvGmBCWvyiE9nfpSvi2qyvyrBNO7PZAAF2Xr7OhlCxaKc45KKHf3opskTwLZBG9rb0ybUuJWGYbbTRrrMBe8T7YmB0gyTQBwu7W4xrWpj2o2ZCs9yFhCV7vzcL9az8ba9sa5sPZC8snQOCtGSQAkB8kRlrLc5prfZCoNgo8ZCQtkj4VxT2EDKm8ZCbcIyG0TfidrpAaKz8j8fdAdciGMxR1YE4QZD` |

#### Tiny Seed Fungi
| Item | Value |
|------|-------|
| Facebook Page ID | `1025602933961290` |
| Instagram Business ID | `17841464175325954` |
| Instagram Handle | @tinyseedfungi |
| Page Access Token | `EAAUpwKHfKx8BQkhyBRRjrnPDcKsNwKKvwwhttIawkvNycUWsZBUpIw6Fp7psdMfjPPoJ0g0d2a3ZA0ZAq964PpEsw4wAFI8QbtGoX6ReDZAG10c3cUhblzWGIL5YFWuCgXsMpm6aN5mpcpr32OVk3zjJeFkCdvQkZBKQzqy23LjsBwULUIuXkZALxSxowMAyYPOGg5sGLYzux1cIgVZCuJEHqej4IKfZCyvP3RNfH3cycG9wH6zabX5iookZD` |

### App Configuration
| Setting | Value |
|---------|-------|
| App Name | Tiny Seed Farm OS FINAL |
| Contact Email | todd@tinyseedfarmpgh.com |
| Privacy Policy | https://app.tinyseedfarm.com/web_app/privacy-policy.html |
| Data Deletion URL | https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=metaDataDeletion |

---

## PROGRESS UPDATE: 2026-01-29

### Backend Deployed ✅

1. **API Version Updated** - Changed from v21.0 to v24.0 (current)
2. **Setup Function Created** - `setupInstagramCredentials_ONETIME()` added to MERGED TOTAL.js
3. **Test Function Created** - `testInstagramPost()` added for verification
4. **Deployed** - v462 deployed to production
5. **GitHub Updated** - Pushed to main branch

### ACTION REQUIRED: Run Setup Function

To activate Instagram posting, owner must:
1. Open Apps Script: https://script.google.com
2. Open Tiny Seed project
3. Select function: `setupInstagramCredentials_ONETIME`
4. Click ▶️ Run
5. Authorize if prompted

This stores all credentials in Script Properties securely.

---

## NEXT STEPS

1. **~~Store Credentials in Apps Script Properties~~** ✅ FUNCTION CREATED
   - Run `setupInstagramCredentials_ONETIME()` in Apps Script editor

2. **Test Instagram Posting**
   - Run `testInstagramPost()` in Apps Script editor
   - Or POST to API with action: `postToInstagram`

3. **Update Marketing Command Center**
   - Replace Ayrshare integration with direct Meta Graph API
   - Fix account names (@tinyseedfleurs, @tinyseedfungi)
   - Remove Ayrshare dependencies

4. **Convert to Long-Lived Tokens**
   - Current tokens expire in ~60 days
   - Exchange for long-lived tokens
   - Set up automatic refresh trigger

---

## API Integration Status

| Platform | API | Status |
|----------|-----|--------|
| Instagram | Meta Graph API | ✅ **READY** - All credentials collected |
| Facebook | Meta Graph API | ✅ **READY** - All credentials collected |
| Threads | Meta Threads API | ⏳ Pending |
| TikTok | Content Posting API | ⏳ Pending |
| YouTube | Data API v3 | ⏳ Pending |
| Pinterest | API v5 | ⏳ Pending |
| SMS | Twilio | ✅ Working |

---

## HOW TO POST TO INSTAGRAM (Reference)

### Step 1: Create Media Container
```
POST https://graph.facebook.com/v24.0/{instagram-business-account-id}/media
?image_url={public-image-url}
&caption={your-caption}
&access_token={page-access-token}
```

### Step 2: Publish Media
```
POST https://graph.facebook.com/v24.0/{instagram-business-account-id}/media_publish
?creation_id={container-id-from-step-1}
&access_token={page-access-token}
```

---

## CONTENT SOURCES FOR SOCIAL MEDIA POSTS

These files contain valuable content for generating authentic social media posts:

| File | Content Type | Use For |
|------|--------------|---------|
| `claude_sessions/business_foundation/OUTBOX.md` | Farm mission, values, story | Brand posts, about us content, mission statements |
| `CHANGE_LOG.md` | New features & updates | Announcements, "what's new" posts, tech updates |
| `apps_script/MarketModule.js` | Market schedules & locations | Market day reminders, location posts, schedule updates |
| `web_app/csa.html` | CSA program details | CSA promotion, member benefits, signup CTAs |

### Other OUTBOX Files (Real-Time Activity Logs)

| Claude Session | OUTBOX Location | Content Gold |
|----------------|-----------------|--------------|
| PM_Architect | `claude_sessions/pm_architect/OUTBOX.md` | System updates, big picture news |
| Sales CRM | `claude_sessions/sales_crm/OUTBOX.md` | Customer wins, sales milestones |
| Field Operations | `claude_sessions/field_operations/OUTBOX.md` | Harvest updates, field activity |
| Backend | `claude_sessions/backend/OUTBOX.md` | Technical achievements |

**Pro Tip:** Check OUTBOX files before generating posts - they contain real-time farm activity that makes authentic content.

---

## ✅ INSTAGRAM API FULLY WORKING - 2026-01-30

### ALL 3 ACCOUNTS POSTING SUCCESSFULLY!

| Account | Instagram ID | Status | Test Post ID |
|---------|--------------|--------|--------------|
| **@tinyseedfarm** | `17841403850522716` | ✅ WORKING | `18077607812205789` |
| **@tinyseedfleurs** | `17841435193515791` | ✅ WORKING | `18556383001028329` |
| **@tinyseedfungi** | `17841464175329542` | ✅ WORKING | `18094248095487032` |

### What Was Fixed

1. **Added Instagram Product** to Meta App via Use Cases → "Manage messaging & content on Instagram"
2. **Generated New Tokens** with `instagram_business_basic` permission (IGAA tokens)
3. **Updated API Endpoint** - Changed from `graph.facebook.com` to `graph.instagram.com` for IGAA tokens
4. **Correct Instagram IDs** - Retrieved from Meta's Instagram API setup page

### API Details

| Setting | Value |
|---------|-------|
| Instagram App ID | `1829369821799880` |
| API Endpoint | `https://graph.instagram.com` |
| Token Type | IGAA (Instagram API) |
| Permissions | `instagram_business_basic`, `instagram_manage_comments`, `instagram_business_manage_messages` |

### How to Post

```
GET/POST to API:
?action=testInstagramPost
&accountIndex=0  (0=Farm, 1=Fleurs, 2=Fungi)
&imageUrl=https://public-image-url.jpg
&caption=Your caption here
```

---

*Report updated: 2026-01-30 01:45 - FULLY OPERATIONAL*

---

## MARKETING COMMAND CENTER v4.0 - THE ULTIMATE PLATFORM

**Date:** 2026-01-30
**Status:** DEPLOYED - STATE OF THE ART

### What Was Built

Integrated Social Intelligence Engine into Marketing Command Center to create ONE PLATFORM TO RULE THEM ALL.

### New Tabs Added

| Tab | Purpose | Status |
|-----|---------|--------|
| **Brain** | Autonomous AI command center | ✅ LIVE |
| **Brand Voice** | Train AI on your writing style | ✅ LIVE |
| **Content Studio** | AI content generation (GPT-4o) | ✅ LIVE |
| **Comments** | AI-powered response management | ✅ LIVE |
| **Evergreen** | Recyclable content library | ✅ LIVE |
| **Crisis** | Sentiment monitoring & response | ✅ LIVE |
| **Settings** | API key configuration | ✅ LIVE |

### 2026 Algorithm Intelligence

Based on research from Sprout Social, Buffer, Hootsuite (2.7M+ engagements analyzed):

| Signal | Importance | Action |
|--------|------------|--------|
| **DM Shares** | #1 Ranking Signal | Create shareable content |
| **First 3 Seconds** | Critical for Reels | Hook immediately |
| **Best Days** | Wed & Thursday | Schedule for these |
| **Best Times** | 11AM-1PM, 6-8PM | Post during peaks |
| **Golden Hour** | First 60 minutes | Engage immediately after posting |
| **Hashtags** | 3-5 maximum | Algorithm changed - fewer is better |
| **Worst Time** | Saturday 6-9 AM | AVOID |

### 5-3-2 Content Mix Rule

- **5** - Curated/shared industry content
- **3** - Original content (non-sales focused)
- **2** - Personal/fun content (humanize brand)

### API Connections

| API | Status | Purpose |
|-----|--------|---------|
| OpenAI GPT-4o | ✅ Ready | Content generation, voice matching |
| Claude API | ✅ Configured | Advanced AI analysis |
| Twilio SMS | ✅ Connected | SMS marketing campaigns |
| Meta Graph API | ✅ LIVE | Direct Instagram/Facebook posting |

### Files Changed

- `web_app/marketing-command-center.html` - Major upgrade with 8 new tabs
- `web_app/marketing-command-center-v3-backup.html` - Backup created
- `CHANGE_LOG.md` - Documented all changes

### Next Steps

1. Owner to test Brain tab recommendations
2. Add training posts to Brand Voice
3. Connect remaining platforms (TikTok, Pinterest, YouTube)
4. Monitor live follower counts in Social Growth tab

---

**NO SHORTCUTS. STATE OF THE ART. THE ULTIMATE PLATFORM.**

*Report updated: 2026-01-30 - Marketing Command Center v4.0 DEPLOYED*

---

## BRAIN TAB v5.0 - THE INTELLIGENT UPGRADE

**Date:** 2026-01-30
**Status:** DEPLOYED - TRULY STATE OF THE ART

### What Was Built

Complete overhaul of the Brain tab to be genuinely intelligent - knows what to post before you do.

### New Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Account Selector** | Toggle @tinyseedfarm/@tinyseedfleurs/@tinyseedfungi/ALL | ✅ LIVE |
| **5-3-2 Tracker** | Real-time content mix tracking with AI guidance | ✅ LIVE |
| **Smart AI Recommends** | Tells you WHAT type to post next | ✅ LIVE |
| **Optimal Timing** | Buffer 9.6M posts research integrated | ✅ LIVE |
| **Self-Updating Research** | Weekly algorithm intelligence refresh | ✅ LIVE |
| **Voice Learning** | Analyzes past posts to learn your style | ✅ LIVE |

### Research Sources Integrated

| Source | Data | Finding |
|--------|------|---------|
| **Buffer** | 9.6M posts | Best times: Thu 9am, Wed 12pm/6pm |
| **Sprout Social** | Algorithm signals | DM Shares = #1 ranking signal |
| **Later** | 6M posts | Wed/Thu best days, Sat worst |
| **LocalLine** | Farm content | 40+ post ideas by category |

### 5-3-2 Content Mix Rule - NOW TRACKED

For every 10 posts:
- **5 Curated** - Share industry content, customer reposts
- **3 Original** - Your own content, non-sales
- **2 Personal** - Humanize brand, behind-scenes

The AI now tells you exactly which type to post next!

### Optimal Posting Times (2026 Research)

| Day | Best Times | Quality |
|-----|------------|---------|
| **Wednesday** | 12pm, 6pm, 8am | 🔥 BEST |
| **Thursday** | 9am, 8am, 7am | 🔥 BEST |
| **Tuesday** | 7pm, 3pm, 5pm | ✨ GREAT |
| **Monday** | 7pm, 6pm, 8pm | 👍 GOOD |
| **Sunday** | 9pm, 10pm, 8pm | 📊 MEDIUM |
| **Friday** | 10pm, 9pm, 6am | ⚠️ LOW |
| **Saturday** | 9pm, 10pm, 8pm | ❌ WORST |

### Voice Learning System

Click "Learn My Voice" to:
1. Analyze past Instagram posts across all 3 accounts
2. Learn your tone, emoji style, caption length
3. Extract top-performing hashtags
4. Get personalized recommendations matching YOUR voice

### How It Works Now

1. **Select Account** → Choose which account(s) to post to
2. **AI Shows What's Needed** → Badge tells you "Post CURATED next"
3. **Select Content Type** → Pick from 5-3-2 options
4. **Get Smart Ideas** → 40+ farm-specific content ideas
5. **See Optimal Time** → Research-backed timing
6. **Approve & Schedule** → Tracks to 5-3-2 automatically

### Next Steps

1. Click "Learn My Voice" to train on past posts
2. Click "Research Update" weekly for latest algorithm intel
3. Use the 5-3-2 tracker to stay on optimal content mix
4. Post on Wed/Thu for maximum engagement

---

**THE AI NOW KNOWS WHAT YOU SHOULD DO BEFORE YOU DO.**

*Report updated: 2026-01-30 - Brain Tab v5.0 DEPLOYED*

---

# MCC CREATE TAB UX RESEARCH - 2026-02-14

**From:** Social Media Claude
**For:** Desktop_Claude (implementation) + PM_Architect (review)
**Priority:** HIGH - Supports Priority 2 tasks in MCC_CREATE_TAB_REMAINING_TASKS.md

---

## RESEARCH 1: Social Media Tagging UX Best Practices

### Executive Summary

Every major tool (Later, Buffer, Hootsuite, Sprout Social, Planoly, Metricool) uses `@` typed inline in the caption as the universal trigger for mentions. **No tool has reliable autocomplete for Instagram or TikTok** due to API restrictions. Location tagging universally uses a search field (not a map picker). The biggest opportunity for MCC is **saved/favorite locations** and **recent mentions** -- features no competitor has shipped despite clear user demand.

### 1. Tag Input UI -- The Industry Standard

**Universal pattern: `@` typed inline in caption textarea triggers a dropdown.**

| Tool | Autocomplete? | IG Support | FB Support | TikTok Support |
|------|--------------|------------|------------|----------------|
| Hootsuite | Yes (FB/LinkedIn) | NO - manual typing | YES - Pages | NO |
| Buffer | Yes (LinkedIn only) | NO - manual typing | YES - Pages | NO |
| Sprout Social | No for IG | NO - manual typing | Partial | NO |
| Later | No | NO - manual typing | N/A | N/A |
| Planoly | Tag Groups | NO - manual typing | N/A | N/A |
| Metricool | Yes (FB/X/LinkedIn) | NO - manual typing | YES - Pages | NO |

**Key insight:** Instagram and TikTok APIs do NOT support username autocomplete for third-party tools. All tools require exact manual typing for IG/TikTok mentions.

### 2. Recommended Tagging UI for MCC

#### A. @Mention Input (Inline + Local Favorites)

```
Caption textarea:
+--------------------------------------------------+
| Had an amazing time at the farm with              |
| @tinyseedfarm picking fresh veggies!              |
|                                                    |
+--------------------------------------------------+
  Type @ to mention...
  +---------------------------+
  | * Recent Mentions         |
  |   @tinyseedfleurs         |
  |   @tinyseedfungi          |
  |   @kretschmannfarm        |
  | * Favorites               |
  |   @lawrencevillefm        |
  |   @bryantstreetmarket     |
  +---------------------------+
```

- `@` triggers a dropdown of **locally saved recent/favorite usernames** (since platform APIs don't provide autocomplete)
- Mentions render as **blue text** in the caption (matching native platform behavior)
- Subtle warning below: "Verify spelling -- Instagram does not support username autocomplete"
- **Differentiator:** No competitor has a local recent/favorites mention list

#### B. Location Tagging (Search + Favorites)

```
Location: [Search locations...        ] [pin icon]
           +--------------------------+
           | * Recent Locations       |
           |   Rochester, PA          |
           |   Lawrenceville Market   |
           | * Favorites              |
           |   Kretschmann Farm       |
           |   Bryant St. Market      |
           |   Sewickley Farmers Mkt  |
           +--------------------------+
```

- Dedicated search field below caption (NOT inline)
- Search against Facebook Places API
- **Saved favorite locations** -- Pre-populate with CSA stops from Todd's route
- **Recent locations** (last 5-10 used)
- Platform indicator: "Applies to IG + FB only" (TikTok doesn't support via API)
- Selected location shown as removable pill/chip

**This is a differentiator.** Later has a community feature request for saved locations (LATER-I-990) with high demand but no tool has built it yet.

#### C. Hashtag Management (Floating Popover + First Comment)

```
Caption toolbar: [emoji] [#] [@] [location pin]
                          |
                 +--------v---------+
                 | Hashtag Groups   |
                 | [Farm Fresh] (8) |
                 | [Markets]   (5)  |
                 | [Seasonal]  (6)  |
                 |                  |
                 | + New Group      |
                 | AI Suggest...    |
                 +------------------+

First Comment (Instagram):
+--------------------------------------------------+
| #organic #farmfresh #pittsburgh #localfood       |
| Remaining: 26/30                                  |
+--------------------------------------------------+
```

- `#` icon opens floating popover with saved hashtag groups (Buffer pattern)
- One-click group insertion
- AI-suggested hashtags based on caption content
- Live counter: `X/30` for Instagram
- Separate "First Comment" field for Instagram (toggleable) -- industry best practice to keep caption clean
- Hashtags shown in **teal/lighter blue** to distinguish from @mentions

#### D. Per-Platform Customization

Show/hide features based on selected platforms:

| Feature | Instagram | Facebook | TikTok |
|---------|-----------|----------|--------|
| @Mentions | YES (max 20) | YES | YES |
| Location tags | YES (business locations only) | YES | NO (hide field) |
| Photo tags | YES | YES | NO |
| Product tags | YES (if Shop connected) | YES | NO |
| First comment | YES | NO | NO |
| Hashtag limit | 30 max | No hard limit | No stated limit |

Gray out / hide unsupported features when a platform is deselected.

#### E. Visual Design Spec

| Element | Visual Treatment |
|---------|-----------------|
| @Mention (confirmed) | Blue chip/pill with `x` to remove |
| @Mention (unverified) | Blue text with subtle dotted underline |
| Hashtag | Teal text |
| Location tag | Pill with pin icon + `x` |
| Hashtag group | Rounded card with group name + count badge |
| First comment field | Separate textarea with dashed border, "First Comment (IG)" label |
| Character counter | Right-aligned, color-coded green/yellow/red per platform |

### 3. Key Differentiators to Build (No Competitor Has These)

1. **Saved/favorite locations** -- No competitor has this. Pre-populate with Todd's CSA stops.
2. **Recent mentions list** -- Since IG/TikTok lack autocomplete, local history is a huge time saver.
3. **Tag templates per CSA stop** -- Pre-built mention + location combos for each market/stop.
4. **Cross-platform tag validation** -- Warn when username doesn't match across platforms.
5. **Smart hashtag-to-first-comment** -- Auto-move hashtags to first comment when IG is selected.

### Sources
- Later, Buffer, Hootsuite, Sprout Social, Planoly, Metricool help centers
- Smart Interface Design Patterns (badges/chips/tags/pills)
- Mobbin component patterns
- NN/g autocomplete design research

---

## RESEARCH 2: "Generate 3 Options" UX -- Multi-Caption Display Patterns

### Executive Summary

The industry standard for displaying multiple AI-generated caption options is **vertical card stack with "Use This" buttons** -- which the MCC's existing A/B Testing tab already uses. The recommendation is 3 options (backed by decision science research on choice overload). Do NOT use horizontal swipe/carousel for text captions -- NN/g research shows <2% of users interact past the first carousel slide.

### 1. How Competitors Display Options

| Tool | # Options | Display Pattern |
|------|-----------|-----------------|
| Hootsuite OwlyWriter AI | List of ideas, then captions | Two-step funnel, vertical list |
| Buffer AI Assistant | 1 at a time | Inline, iterative refinement ("Rephrase") |
| Cloud Campaign CaptionAI | 1-10 (configurable) | Vertical list with checkboxes |
| SocialBee AI Generator | Configurable | Vertical list with tick-to-select |
| ContentStudio | Configurable | Vertical scrollable list |
| Adobe Express | 1 at a time | Single card with Insert/Try Again |
| Copy.ai | Multiple | Vertical selectable list |
| Midjourney | 4 | 2x2 grid (visual content only) |

**Dominant pattern for text:** Vertical card stack (used by 5 of 8 tools studied).
**Why 3 options:** Decision science research (Iyengar/Lepper choice paradox, Laws of UX) confirms 3-4 options is the sweet spot -- enough variety without paralysis.

### 2. Recommended Implementation for Quick Post

#### UI Layout

```
+------------------------------------------+
|  Quick Post                              |
|  [Photo area]                            |
|  [Caption textarea]                      |
|  [Tone: v] [AI Caption] [3 Options]     |
+------------------------------------------+
|                                          |
|  +--------------------------------------+|
|  | A  Authentic                  142 ch ||
|  | "Fresh from the field to your table. ||
|  |  This week's harvest includes..."    ||
|  |                    [Copy] [Use This] ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  | B  Fun                         98 ch ||
|  | "Who's ready for the BEST chard     ||
|  |  you've ever seen?! 🌿"             ||
|  |                    [Copy] [Use This] ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  | C  Educational                156 ch ||
|  | "Did you know rainbow chard is one  ||
|  |  of the most nutrient-dense..."     ||
|  |                    [Copy] [Use This] ||
|  +--------------------------------------+|
|                                          |
|  [Regenerate All]                        |
+------------------------------------------+
```

#### Card Design Spec

Each option card includes:
- **Color-coded left border** (pink / purple / cyan -- reuse existing A/B Testing colors)
- **Variant label** (A, B, C) with matching color
- **Tone badge** (top-right pill: "Authentic", "Fun", "Educational")
- **Character count** (right-aligned, e.g., "142 ch")
- **Caption text** (full text, no truncation for typical social captions)
- **Action buttons**: `[Copy]` + `[Use This]` (right-aligned at bottom)

#### Interaction Flow

1. User is in Quick Post with photo and/or topic entered
2. User selects tone from existing `quickPostTone` dropdown (or leaves on "Mixed")
3. User clicks **"3 Options"** button (next to existing "AI Caption" button)
4. Loading state: skeleton cards with pulse animation
5. Options panel slides open below caption with 3 variant cards
6. User reads, compares, clicks **"Use This"** on preferred variant
7. Caption loads into textarea, options panel collapses with brief animation
8. User edits further if desired, then clicks POST NOW

#### Regeneration

- **"Regenerate All"** button below all 3 cards
- Replaces all 3 with new variants (overwrite pattern -- safe since user hasn't "saved" any)
- If user already edited caption and clicks regenerate: warn "This will replace your current caption"

#### Mobile Behavior

- **Vertical stack at full width** (cards go 100% viewport width under 768px)
- **NO carousel/swipe** -- NN/g research: carousels on mobile have <2% interaction past first slide
- Touch-friendly buttons: minimum 44px tap targets
- After selection: options collapse, caption field scrolls into view

#### What to Reuse from Existing Code

The A/B Testing tab (lines 16058-16176) already has:
- `displayABTestVariants()` -- card layout with color borders, labels, tone badges, Copy/Use This
- `generateABTestVariants()` -- API call structure with fallback
- `useABVariant()` -- loads caption into Quick Post
- `copyABVariant()` -- clipboard function

**Desktop_Claude should port this code** into Quick Post with these modifications:
1. Embed inline within Quick Post (not as separate tab)
2. Hardcode count to 3 (no dropdown needed)
3. Add character count per card
4. Add "Regenerate All" button
5. Add collapse/expand animation
6. Use existing `quickPostTone` selector

### 3. What NOT to Do

| Bad Idea | Why |
|----------|-----|
| Horizontal swipe/carousel | <2% interaction past first slide (NN/g) |
| Full-screen per option | Prevents comparison, which is the point |
| Checkbox multi-select | Overkill for "pick one" flow |
| Edit-in-place on cards | Adds complexity; user edits in textarea after selection |
| Show more than 5 options | Choice overload triggers decision paralysis |

### Sources
- ShapeofAI.com Variations & Regenerate patterns
- Laws of UX - Choice Overload
- NN/g Mobile Carousels research
- Microsoft Copilot UX Guidance
- Cloud Campaign, SocialBee, Buffer, Hootsuite product documentation

---

## RESEARCH 3: Trending Audio Integration for TikTok/Reels

### Executive Summary

**Hard truth: No API exists to directly attach trending audio to scheduled posts.** TikTok's Content Posting API only supports `auto_add_music: true` (platform picks the music). Instagram's Graph API has zero music library access. Vista Social is the only tool with proprietary platform partnerships for trending audio scheduling. The best approach for MCC is a curated "Trending Sounds" discovery display + royalty-free audio library with FFmpeg pre-baking.

### 1. API Availability

| Platform | Audio Attachment via API? | What's Available |
|----------|--------------------------|------------------|
| TikTok Content Posting API | NO specific sound selection | `auto_add_music: true` only (TikTok picks) |
| TikTok Research API | Metadata only | Can fetch trending content data, not sounds themselves |
| TikTok Creative Center | Browse only (no API) | 1M+ Commercial Music Library tracks, trending lists |
| Instagram Graph API | NO music library access | `audioName` string parameter only (labels, doesn't select) |
| Meta Sound Collection | In-app only | 14,000 royalty-free tracks, not accessible via API |

### 2. Third-Party Data Sources

| Provider | What It Offers | Cost |
|----------|---------------|------|
| **Apify TikTok Sound Scraper** | Trending sounds with rank, title, author, trend data | Free tier $5/mo; Starter $49/mo |
| **TokChart** | Real-time trending songs, updated daily | Free web tool |
| **HeyOrca** | Weekly curated trending audio lists | Free blog/newsletter |
| **Chartmetric** | TikTok Top 1,000 tracks, cross-platform analytics | Enterprise pricing |
| **Dash Social** | Monthly curated trending Reels/TikTok sounds | Subscription |

### 3. Legal/Licensing -- CRITICAL for Business Accounts

| Scenario | TikTok Business | Instagram Business |
|----------|----------------|-------------------|
| Trending pop song | BLOCKED | BLOCKED |
| Commercial Music Library | ALLOWED | N/A |
| Meta Sound Collection | N/A | ALLOWED (limited) |
| Royalty-free/original audio | ALLOWED | ALLOWED |
| Farm sounds/voiceovers | ALLOWED | ALLOWED |

**Business accounts cannot use trending popular songs.** TikTok requires Commercial Music Library only. Instagram restricts business accounts to Meta's Sound Collection (~14K tracks vs millions for personal accounts).

**This actually simplifies the problem:** We only need to surface commercial/royalty-free audio.

### 4. How Competitors Handle Audio

| Tool | Approach |
|------|----------|
| **Vista Social** | ONLY tool with direct trending audio scheduling (proprietary Meta/TikTok partnership) |
| **Later** | "Schedule + notification" -- user manually adds audio in native app |
| **HeyOrca** | Weekly editorial lists with direct links to trending sounds |
| **Metricool** | Schedule content, notification to manually add audio |
| **CapCut** | Full audio library browsable by genre/mood/trending (editing tool, not scheduler) |

### 5. Recommended Implementation for MCC

#### Phase 1: Curated Trending Display (Low Effort, High Value)

Add a "Trending Sounds" section to the CREATE tab:

```
+---------------------------------------------+
| Trending Sounds This Week                    |
+------+------+-------------------------------+
| Trending | Rising | My Sounds | Upload      |
+------+------+-------------------------------+
|                                             |
| "Golden Hour"          +340%  [View on TT]  |
|  Artist | 0:22 | 12.4K uses                 |
|                                             |
| "Sunday Morning"       +180%  [View on IG]  |
|  Artist | 0:18 | 8.2K uses                  |
|                                             |
| "Country Roads Remix"  +95%   [View on TT]  |
|  Artist | 0:30 | 5.1K uses                  |
|                                             |
| Filter: [Mood v] [Genre v] [Duration v]     |
+---------------------------------------------+
```

- Weekly curated list sourced from TokChart + HeyOrca
- Links to sounds on native platforms
- Trend arrows showing popularity direction
- Genre/mood filters: Country, Acoustic, Upbeat, Calm, Farm-Specific
- **Cost: Free** (editorial curation)
- **LOE: 4-6 hours**

#### Phase 2: Audio Library + Video Pre-Baking (Medium Effort)

- Build a curated royalty-free audio library
- Upload capability for original audio (farm sounds, voiceovers, ambient nature)
- Server-side FFmpeg merge: selected audio + user's video = video with embedded audio
- Upload merged video via standard API (platforms treat it as "original audio")
- **Cost: Server processing only**
- **LOE: 2-3 weeks**

#### Phase 3: Automated Trend Data (Lower Priority)

- Connect Apify TikTok Sound Scraper ($49/mo)
- Auto-populate "Trending Now" / "Rising" categories
- Add inline audio preview player
- **LOE: 1-2 weeks**

### 6. Farm-Specific Audio Recommendations

For Todd's farm content, these royalty-free audio categories would be most useful:
- **Morning harvest:** Acoustic guitar, birdsong, ambient farm sounds
- **Market day:** Upbeat folk, country, energetic indie
- **CSA box reveals:** Satisfying ASMR, gentle music
- **Educational/how-to:** Calm background, lo-fi
- **Seasonal transitions:** Cinematic, inspiring orchestral

### Sources
- TikTok Content Posting API documentation
- Instagram Graph API / Reels documentation
- Vista Social (first approved tool for trending audio scheduling)
- TikTok Commercial Music Library terms
- Meta Sound Collection documentation
- Apify, TokChart, HeyOrca, Dash Social, Chartmetric
- NN/g, Later, Buffer audio research

---

## ACTION ITEMS FOR DESKTOP_CLAUDE

### Priority 2.1: Generate 3 Options (Ready to Implement)

1. Port `displayABTestVariants()` card layout into Quick Post
2. Add "3 Options" button next to existing "AI Caption" button
3. Use existing `quickPostTone` selector for tone input
4. Hardcode count to 3, display as vertical card stack
5. Each card: color border + variant label + tone badge + character count + Copy/Use This
6. Add "Regenerate All" button below cards
7. Collapse options panel after "Use This" selection

### Tagging UX (New Feature -- Needs PM Approval)

1. Add `@` trigger in caption textarea with local recent/favorites dropdown
2. Add location search field with saved favorites (pre-populate with CSA stops)
3. Add hashtag group popover triggered by `#` icon
4. Add "First Comment" field for Instagram
5. Show/hide tag features based on selected platforms

### Trending Audio (Phase 1 Only -- Needs PM Approval)

1. Add "Trending Sounds" section with curated weekly list
2. Links to sounds on native platforms
3. Genre/mood filters
4. No API integration needed for Phase 1

---

*Research completed: 2026-02-14 by Social Media Claude*
*All findings sourced from competitor analysis, platform documentation, and UX research*

---

## TOKEN CONVERSION PLAN -- URGENT

**Date:** 2026-02-14
**Priority:** HIGH -- Current IGAA tokens expire in ~60 days. Must act before they die.
**For:** Backend_Claude (implementation) + PM_Architect (approval)

### The Problem

Current setup uses IGAA tokens (prefix `IGAA...`) for all 3 Instagram accounts. These expire after 60 days and require periodic refresh. If the refresh fails or is missed, posting breaks for all 3 accounts.

### The Solution: Never-Expire Page Access Tokens

Meta's token hierarchy allows converting to **permanent Page Access Tokens** that never expire:

```
Short-lived User Token (1 hour)
    |  exchange via /oauth/access_token
    v
Long-lived User Token (60 days)
    |  query /me/accounts
    v
Page Access Token (NEVER EXPIRES)
```

Page tokens obtained from a long-lived user token are permanent. Even after the user token expires, the page tokens remain valid indefinitely.

### IGAA vs Page Access Tokens

| Feature | IGAA Token (`IGAA...`) | Page Access Token (`EAA...`) |
|---------|------------------------|------------------------------|
| Max lifespan | 60 days (must refresh) | **Never expires** |
| API base URL | `graph.instagram.com` | `graph.facebook.com/v24.0` |
| Can post to Instagram? | Yes | Yes (via connected IG Business Account) |
| Can post to Facebook? | No | Yes |
| Refresh needed? | Every 50 days | **Never** |
| Requires FB Page link? | No | Yes (already linked for all 3 accounts) |

**Your backend already supports both:** `MERGED TOTAL.js` line ~63564 routes `IGAA` tokens to `graph.instagram.com` and `EAA` tokens to `graph.facebook.com/v24.0`.

### Which Accounts Need This

All 3 accounts need conversion:

| Account | Current Token Type | Action Needed |
|---------|-------------------|---------------|
| @tinyseedfarm | IGAA (60-day) | Convert to permanent EAA |
| @tinyseedfleurs | IGAA (60-day) | Convert to permanent EAA |
| @tinyseedfungi | IGAA (60-day) | Convert to permanent EAA |

### Step-by-Step Conversion Process

This is a **one-time manual process**. After completion, tokens are permanent.

#### Prerequisites
- Access to Meta Developer Console for "Tiny Seed Farm OS FINAL" (App ID: `1829369821799880`)
- Admin access to all 3 Facebook Pages
- The App Secret (App Settings > Basic)

#### Step 1: Generate Short-Lived User Token
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select app "Tiny Seed Farm OS FINAL"
3. Click "Generate Access Token"
4. Select permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `business_management`, `public_profile`
5. Authorize and select all 3 Facebook Pages
6. Copy the token

#### Step 2: Exchange for Long-Lived User Token

**Option A -- Access Token Debugger (easiest):**
1. Go to [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
2. Paste short-lived token, click "Debug"
3. Click "Extend Access Token" at bottom
4. Copy the new long-lived token

**Option B -- API call:**
```
GET https://graph.facebook.com/v24.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=1829369821799880
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

Response: `{ "access_token": "EAAZAk...", "expires_in": 5184000 }`

#### Step 3: Get Never-Expire Page Tokens
```
GET https://graph.facebook.com/v24.0/me/accounts
  ?fields=id,name,access_token,instagram_business_account
  &access_token={LONG_LIVED_USER_TOKEN}
```

Response returns all 3 Pages with **permanent** access tokens. Each `access_token` in the response never expires.

#### Step 4: Verify Tokens Are Permanent
For each page token, check at:
```
https://developers.facebook.com/tools/debug/accesstoken/?access_token={PAGE_TOKEN}
```
The "Expires" field should say **"Never"**.

#### Step 5: Store in Apps Script Properties
Run the `exchangeForPermanentPageTokens()` function (code below) or manually update Script Properties.

### Apps Script: One-Time Exchange Function

```javascript
/**
 * ONE-TIME SETUP: Exchange short-lived user token for permanent Page Access Tokens
 *
 * 1. Get short-lived token from Graph API Explorer
 * 2. Set it as 'TEMP_SHORT_LIVED_TOKEN' in Script Properties
 * 3. Run this function ONCE
 * 4. Tokens stored are PERMANENT -- no refresh ever needed
 */
function exchangeForPermanentPageTokens() {
  var props = PropertiesService.getScriptProperties();
  var shortLivedToken = props.getProperty('TEMP_SHORT_LIVED_TOKEN');
  var appId = '1829369821799880';
  var appSecret = props.getProperty('META_APP_SECRET');

  if (!shortLivedToken || !appSecret) {
    Logger.log('ERROR: Set TEMP_SHORT_LIVED_TOKEN and META_APP_SECRET in Script Properties');
    return;
  }

  // Step 1: Exchange for long-lived user token
  var exchangeUrl = 'https://graph.facebook.com/v24.0/oauth/access_token'
    + '?grant_type=fb_exchange_token'
    + '&client_id=' + appId
    + '&client_secret=' + appSecret
    + '&fb_exchange_token=' + shortLivedToken;

  var exchangeResult = JSON.parse(UrlFetchApp.fetch(exchangeUrl, {muteHttpExceptions: true}).getContentText());

  if (exchangeResult.error) {
    Logger.log('Exchange failed: ' + exchangeResult.error.message);
    return;
  }

  var longLivedUserToken = exchangeResult.access_token;
  Logger.log('Long-lived user token obtained');

  // Step 2: Get permanent page tokens
  var accountsUrl = 'https://graph.facebook.com/v24.0/me/accounts'
    + '?fields=id,name,access_token,instagram_business_account'
    + '&access_token=' + longLivedUserToken;

  var accountsResult = JSON.parse(UrlFetchApp.fetch(accountsUrl, {muteHttpExceptions: true}).getContentText());

  if (accountsResult.error) {
    Logger.log('Accounts fetch failed: ' + accountsResult.error.message);
    return;
  }

  var pages = accountsResult.data || [];
  var accounts = JSON.parse(props.getProperty('instagram_accounts') || '[]');

  for (var p = 0; p < pages.length; p++) {
    var page = pages[p];
    var igAccount = page.instagram_business_account;
    Logger.log('Page: ' + page.name + ' (ID: ' + page.id + ')');

    // Store page token
    props.setProperty('FB_PAGE_TOKEN_' + page.id, page.access_token);

    // Update matching Instagram account token
    if (igAccount) {
      for (var i = 0; i < accounts.length; i++) {
        if (accounts[i].igUserId === igAccount.id) {
          props.setProperty('ig_token_' + i, page.access_token);
          Logger.log('  Updated ig_token_' + i + ' for ' + accounts[i].name);
        }
      }
    }
  }

  props.setProperty('PAGE_TOKENS_GENERATED_AT', new Date().toISOString());
  props.setProperty('PAGE_TOKENS_TYPE', 'PERMANENT_NEVER_EXPIRE');
  props.deleteProperty('TEMP_SHORT_LIVED_TOKEN');

  Logger.log('COMPLETE: All page tokens stored. These tokens NEVER EXPIRE.');
}
```

### Apps Script: Weekly Health Check (Safety Net)

Even permanent tokens can be invalidated if the user changes their Facebook password, de-authorizes the app, or admin access is revoked. Add a weekly health check:

```javascript
/**
 * Weekly health check for token validity.
 * Set up: ScriptApp.newTrigger('checkTokenHealth').timeBased().everyDays(7).atHour(4).create();
 */
function checkTokenHealth() {
  var props = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(props.getProperty('instagram_accounts') || '[]');
  var failures = [];

  for (var i = 0; i < accounts.length; i++) {
    var token = props.getProperty('ig_token_' + i);
    if (!token) continue;

    var testUrl = token.startsWith('IGAA')
      ? 'https://graph.instagram.com/me?fields=id,username&access_token=' + token
      : 'https://graph.facebook.com/v24.0/' + accounts[i].igUserId
        + '?fields=id,username&access_token=' + token;

    var result = JSON.parse(UrlFetchApp.fetch(testUrl, {muteHttpExceptions: true}).getContentText());

    if (result.error) {
      failures.push(accounts[i].name + ': ' + result.error.message);
    } else {
      Logger.log(accounts[i].name + ': Token VALID (' + (token.startsWith('EAA') ? 'permanent' : 'IGAA') + ')');
    }
  }

  if (failures.length > 0) {
    MailApp.sendEmail({
      to: 'todd@tinyseedfarmpgh.com',
      subject: '[Tiny Seed OS] Instagram Token Alert',
      body: 'Token issues detected:\n\n' + failures.join('\n') + '\n\nRe-authenticate at Meta Developer Console.'
    });
  }
}
```

### Fallback: IGAA Token Auto-Refresh (If Staying on IGAA)

If for any reason you can't do the one-time Page Token conversion, set up IGAA auto-refresh:

```javascript
/**
 * Refresh IGAA tokens. Run every 50 days via time trigger.
 * Only refreshes IGAA tokens -- skips EAA (permanent) tokens.
 */
function refreshAllIGAATokens() {
  var props = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(props.getProperty('instagram_accounts') || '[]');

  for (var i = 0; i < accounts.length; i++) {
    var token = props.getProperty('ig_token_' + i);
    if (!token || token.startsWith('EAA')) continue; // Skip permanent tokens

    var refreshUrl = 'https://graph.instagram.com/refresh_access_token'
      + '?grant_type=ig_refresh_token&access_token=' + token;

    var result = JSON.parse(UrlFetchApp.fetch(refreshUrl, {muteHttpExceptions: true}).getContentText());

    if (result.error) {
      Logger.log('FAILED to refresh ' + accounts[i].name + ': ' + result.error.message);
      // Token expired -- needs full re-auth
      if (result.error.code === 190) {
        MailApp.sendEmail({
          to: 'todd@tinyseedfarmpgh.com',
          subject: '[Tiny Seed OS] Token Expired: ' + accounts[i].name,
          body: 'Token for ' + accounts[i].name + ' has expired. Re-authenticate in Meta Developer Console.'
        });
      }
    } else {
      props.setProperty('ig_token_' + i, result.access_token);
      props.setProperty('ig_token_refreshed_' + i, new Date().toISOString());
      Logger.log('Refreshed ' + accounts[i].name + ': expires in ' + Math.round(result.expires_in / 86400) + ' days');
    }
  }
}
```

### Error Codes to Watch For

| Code | Meaning | Action |
|------|---------|--------|
| 190 | Token expired/invalid | Re-authenticate (manual) |
| 190 (subcode 463) | Token expired on specific date | Re-authenticate |
| 190 (subcode 467) | Invalidated by password change | Re-authenticate |
| 4 | Rate limit | Wait and retry |
| 10 | Permission denied | Check token permissions |

### When "Never-Expire" Tokens Can Still Die

Even permanent page tokens become invalid if:
1. User changes Facebook password
2. User de-authorizes the app
3. App secret is rotated
4. Facebook Page is unpublished/deleted
5. Admin access to Page is revoked
6. Meta app is suspended

**That's why the weekly health check matters even with permanent tokens.**

### Recommended Action Plan

| Step | Who | When | What |
|------|-----|------|------|
| 1 | Backend_Claude | This week | Add `exchangeForPermanentPageTokens()` and `checkTokenHealth()` to MERGED TOTAL.js |
| 2 | Todd (with guidance) | This week | Generate short-lived token in Graph API Explorer, set as `TEMP_SHORT_LIVED_TOKEN` |
| 3 | Todd | This week | Run `exchangeForPermanentPageTokens()` in Apps Script editor |
| 4 | Backend_Claude | After step 3 | Verify tokens say "Never" in Access Token Debugger |
| 5 | Backend_Claude | After step 4 | Set up weekly `checkTokenHealth()` trigger |
| 6 | Backend_Claude | After step 5 | Wire `?action=checkTokenHealth` API endpoint |

### Alternative: System User Tokens (Enterprise Path)

For even more robustness, create a System User in Meta Business Manager:
1. Business Settings > Users > System Users > Add
2. Set role to Admin
3. Add Assets: App + all 3 Pages
4. Generate token with all required permissions
5. Token never expires and is not tied to Todd's personal account

This is the enterprise best practice but requires Meta Business Manager access.

---

## UPDATED STATUS - 2026-02-14 Evening

### Completed Deliverables

| Task | Status | Section |
|------|--------|---------|
| Tagging UX Research | COMPLETE | `RESEARCH 1: Social Media Tagging UX Best Practices` |
| Generate 3 Options UX | COMPLETE (but Task 2 already implemented by PM_Architect) | `RESEARCH 2: "Generate 3 Options" UX` |
| Trending Audio Research | COMPLETE | `RESEARCH 3: Trending Audio Integration` |
| Token Conversion Plan | COMPLETE | `TOKEN CONVERSION PLAN -- URGENT` |

### Cross-Reference with Backend_Claude

Backend_Claude's API research (`SOCIAL_MEDIA_TAGGING_API_RESEARCH.md`) and my UX research are fully aligned:

| Backend Finding | UX Recommendation |
|-----------------|-------------------|
| IG: @mentions in caption, max 20 | Inline `@` trigger with local favorites dropdown |
| IG: photo tags via `user_tags` array with x/y coords | Click-on-image tag placement UI |
| IG: collaborators max 3 | "Invite Collaborator" input field |
| IG+FB: location via Facebook Places API | Search field with saved favorites (CSA stops) |
| FB: Pages only for mentions | Show "Pages only" note when FB is selected |
| TikTok: text-only @mentions, no location | Gray out location field when only TikTok selected |

### Next Steps for PM_Architect

1. **URGENT:** Approve token conversion plan -- current tokens on a 60-day clock
2. **This week:** Route tagging UX research to Desktop_Claude for implementation
3. **Lower priority:** Trending audio Phase 1 when bandwidth allows

---

*Updated: 2026-02-14 evening by Social Media Claude*
*Token conversion research sourced from Meta Graph API docs, developer guides, and n8n automation patterns*
