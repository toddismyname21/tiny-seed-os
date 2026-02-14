# MCC SEO/AEO INTEGRATION AUDIT

**Audit Date:** February 14, 2026
**Auditor:** Claude Opus 4.5 (PM_Architect)
**Purpose:** Assess current SEO/AEO integration in Marketing Command Center and identify opportunities for unified marketing strategy

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Existing Integration Points](#existing-integration-points)
4. [Integration Opportunities](#integration-opportunities)
5. [Unified Marketing Strategy](#unified-marketing-strategy)
6. [Technical Requirements](#technical-requirements)
7. [Implementation Plan](#implementation-plan)
8. [Appendix: Code References](#appendix-code-references)

---

## Executive Summary

### Current State: PARTIAL INTEGRATION (65% Connected)

The Tiny Seed OS already has substantial SEO/AEO infrastructure in place with meaningful integration between the Marketing Command Center (MCC) and SEO Dashboard. However, several critical gaps exist that prevent a truly unified marketing strategy.

### Key Findings

| Category | Status | Assessment |
|----------|--------|------------|
| Keyword Library | INTEGRATED | Shared `keyword-hashtag-library.js` bridges SEO and social |
| Content Calendar | INTEGRATED | Shared across MCC and SEO Dashboard |
| AEO Panel in MCC | IMPLEMENTED | Collapsible AEO Visibility panel exists |
| Traffic-to-Posting | MISSING | No automatic adjustment based on performance |
| Keyword Suggestions | PARTIAL | Keywords available but not suggested dynamically |
| Content Attribution | IMPLEMENTED | Social-to-SEO impact tracking exists in SEO Dashboard |

### Quick Stats

- **Shared Files:** 3 (keyword-hashtag-library.js, shared-content-calendar.js, api-config.js)
- **API Endpoints:** 8 SEO/AEO related endpoints in MERGED TOTAL.js
- **AEO Tracking:** Manual logging + automated research framework documented
- **Integration Score:** 65/100 (Good foundation, gaps in automation)

---

## Current State Analysis

### 1. SEO Dashboard (`web_app/seo_dashboard.html`)

**Purpose:** Comprehensive SEO tracking with keyword rankings, Google reviews, citations, and AI visibility (AEO) monitoring.

**Key Features:**
- Overall SEO Score with trend tracking
- AI Visibility Score (AEO metric)
- Keyword ranking tracking by category
- Google reviews integration
- Citation tracking
- Wizard AI Intelligence insights
- Social Media Impact on SEO panel
- GBP Posts management

**AEO-Specific Features:**
- AI platform tracking grid (ChatGPT, Gemini, Perplexity, Google AI)
- Manual AI check logging
- AI visibility tips/guidance
- Critical shift banner (60%+ searches end without click)

### 2. Marketing Command Center (`web_app/marketing-command-center.html`)

**Purpose:** Social media management, content creation, and posting across platforms.

**Key SEO/AEO Features:**
- AEO Visibility Panel (collapsible)
- SEO Keyword Targeting buttons for hashtag generation
- Link to SEO Dashboard
- SEO-tagged social post capabilities
- GBP post creation within MCC

**AEO Panel Elements:**
- `mccAeoScore` - AEO score display
- `mccAeoTrend` - Trend indicator
- `mccAeoRecommendations` - AI-driven recommendations
- Platform coverage indicators

### 3. Keyword/Hashtag Library (`web_app/keyword-hashtag-library.js`)

**Purpose:** Bridge between SEO keywords and social media hashtags.

**Key Features:**
```javascript
// 8 SEO Keyword Categories:
- core_csa: CSA pittsburgh, best CSA pittsburgh, etc.
- farm: farm pittsburgh, organic farm pittsburgh, etc.
- farmers_market: pittsburgh farmers market, etc.
- farm_to_table: farm to table pittsburgh, etc.
- flowers: flower CSA pittsburgh, florist pittsburgh, etc.
- mushrooms: pittsburgh mushrooms, gourmet mushrooms, etc.
- delivery: farm delivery pittsburgh, etc.
- pick_your_own: pick your own pittsburgh, etc.

// 9 Hashtag Sets:
- farmlife, pittsburgh, csa, seasonal, organic, flowers, mushrooms, wellness, engagement

// Keyword-to-Hashtag Mapping:
- Each SEO keyword maps to specific hashtag sets
- AI caption prompts per category
```

### 4. Shared Content Calendar (`web_app/shared-content-calendar.js`)

**Purpose:** Unified calendar across MCC and SEO Dashboard.

**Content Pillars (aligned with 52-week SEO strategy):**
1. CSA_EDUCATION
2. PITTSBURGH_LOCAL
3. SEASONAL_HARVEST
4. RECIPES_TIPS
5. BEHIND_FARM
6. FOOD_SAFETY

**Content Types:**
- SOCIAL (Instagram, Facebook, TikTok, Threads)
- BLOG (Website)
- GBP (Google Business Profile)
- EMAIL (Mailchimp)

### 5. AEO Research Documentation (`docs/research/AEO_AUTOMATED_TRACKING_RESEARCH.md`)

**Comprehensive research including:**
- API access to ChatGPT, Gemini, Perplexity, Claude
- Query strategy with tiered monitoring
- Technical implementation architecture
- Cost optimization strategies
- DIY tracking code examples

---

## Existing Integration Points

### A. Already Working

| Integration | Source | Destination | Method |
|-------------|--------|-------------|--------|
| SEO Keywords -> Social Hashtags | keyword-hashtag-library.js | MCC Post Creation | Button click adds mapped hashtags |
| Shared Calendar | shared-content-calendar.js | Both dashboards | API: getSharedContentCalendar |
| AEO Metrics | SEO Dashboard | MCC AEO Panel | API: getAIVisibilityMetrics |
| Social Impact | MCC Analytics | SEO Dashboard | "Social Media Impact on SEO" panel |
| GBP Posts | MCC | SEO Dashboard | Cross-linked, shared backend |

### B. Code Evidence of Integration

**MCC linking to SEO Dashboard:**
```html
<!-- Line 4905-4906 in marketing-command-center.html -->
<a href="seo_dashboard.html" class="btn btn-secondary">
    <i class="fas fa-search"></i> SEO Dashboard
</a>
```

**SEO Dashboard linking to MCC:**
```html
<!-- Line 1139 in seo_dashboard.html -->
<a href="marketing-command-center.html" class="btn btn-secondary">
    <i class="fas fa-bullhorn"></i> Marketing Command Center
</a>
```

**Keyword-to-Hashtag in MCC:**
```javascript
// Function addSEOHashtags() adds category-specific hashtags
<button class="hashtag-set-btn" onclick="addSEOHashtags('core_csa')">
    <i class="fas fa-box-open"></i> CSA Keywords
</button>
```

**API Endpoints (MERGED TOTAL.js):**
```javascript
case 'getSEOMasterDashboard': return jsonResponse(getSEOMasterDashboard(e.parameter));
case 'getSEOCompetitors': return jsonResponse(getSEOCompetitors(e.parameter));
case 'logSEORanking': return jsonResponse(logSEORanking(data));
case 'getAIVisibilityMetrics': return jsonResponse(getAIVisibilityMetrics(e.parameter));
case 'getSharedContentCalendar': return jsonResponse(getSharedContentCalendar(e.parameter));
case 'generateSeoKeywords': return jsonResponse(generateSeoKeywords(e.parameter));
```

---

## Integration Opportunities

### 1. Social Posts Supporting SEO Goals

**Current State:**
- Keywords mapped to hashtags exist
- Manual selection of keyword categories

**Opportunities:**
| Opportunity | Impact | Effort |
|-------------|--------|--------|
| Auto-suggest keywords based on low-ranking SEO terms | HIGH | MEDIUM |
| Display weekly "SEO priority keyword" at top of MCC | HIGH | LOW |
| Show keyword ranking alongside hashtag suggestions | MEDIUM | LOW |
| Alert when high-value keyword hasn't been used in X days | MEDIUM | MEDIUM |

**Implementation Concept:**
```javascript
// In MCC, show weekly priority keyword from SEO data
async function showSEOKeywordOfTheWeek() {
    const seoData = await fetch(API_URL + '?action=getSEOMasterDashboard');
    const lowestRanking = seoData.keywords.sort((a,b) => b.rank - a.rank)[0];
    document.getElementById('weeklyKeywordTarget').innerHTML = `
        <div class="priority-keyword">
            <strong>SEO FOCUS:</strong> "${lowestRanking.keyword}"
            <span class="rank-badge">Currently #${lowestRanking.rank}</span>
            <button onclick="addSEOHashtags('${lowestRanking.category}')">Use in Post</button>
        </div>
    `;
}
```

### 2. Keyword Research Informing Content Creation

**Current State:**
- Keyword library exists with search volume and difficulty
- No dynamic suggestions during content creation

**Opportunities:**
| Opportunity | Impact | Effort |
|-------------|--------|--------|
| Content idea generator based on keyword gaps | HIGH | MEDIUM |
| AI caption generator pre-loaded with target keywords | HIGH | LOW |
| Seasonal keyword recommendations in calendar | MEDIUM | LOW |
| Competitor keyword gap analysis integration | MEDIUM | HIGH |

**Implementation Concept:**
```javascript
// When AI generates captions, include SEO context
function generateAICaption(imageContext) {
    const seoContext = KeywordHashtagLibrary.getWeeklyTargetKeywords();
    const prompt = `Generate an Instagram caption for ${imageContext}.
    IMPORTANT: Naturally include these keywords: ${seoContext.join(', ')}
    These are our current SEO targets.`;
    return callClaudeAPI(prompt);
}
```

### 3. Traffic Data Guiding Posting Strategy

**Current State:**
- Social analytics exist in MCC
- SEO traffic data exists in SEO Dashboard
- No cross-correlation

**Opportunities:**
| Opportunity | Impact | Effort |
|-------------|--------|--------|
| Show "best performing" content types that drive traffic | HIGH | MEDIUM |
| Correlate social post themes with website traffic spikes | HIGH | HIGH |
| Identify which hashtag sets drive most site visits | MEDIUM | MEDIUM |
| Time-of-day posting recommendations based on traffic | LOW | MEDIUM |

**Implementation Concept:**
```javascript
// In Analytics tab, add traffic correlation
async function showTrafficCorrelation() {
    const socialPosts = await fetch(API_URL + '?action=getSocialAnalytics');
    const trafficData = await fetch(API_URL + '?action=getSEOTrafficData');

    // Correlate high-engagement posts with traffic spikes
    const correlations = analyzePostTrafficCorrelation(socialPosts, trafficData);

    // Display insights
    renderTrafficInsights({
        bestPerformer: correlations.topPost,
        trafficIncrease: correlations.trafficLift,
        recommendation: `Post more ${correlations.topCategory} content`
    });
}
```

### 4. AEO Insights Driving Content Themes

**Current State:**
- AEO research documented
- Manual AI visibility checks
- Recommendations panel exists but limited

**Opportunities:**
| Opportunity | Impact | Effort |
|-------------|--------|--------|
| Auto-run weekly AEO checks for core queries | HIGH | MEDIUM |
| Generate blog post ideas from AEO gaps | HIGH | LOW |
| Alert when competitor gains AI visibility | MEDIUM | MEDIUM |
| Content optimization tips based on AI response patterns | MEDIUM | HIGH |

**Implementation Concept:**
```javascript
// AEO-driven content suggestions
async function getAEOContentSuggestions() {
    const aeoData = await fetch(API_URL + '?action=getAIVisibilityMetrics');

    const suggestions = [];

    // For queries where Tiny Seed Farm is NOT mentioned
    aeoData.queries.forEach(query => {
        if (!query.mentioned) {
            suggestions.push({
                type: 'BLOG',
                title: `Create authoritative content for: "${query.query}"`,
                reason: 'AI assistants not mentioning Tiny Seed Farm for this query',
                priority: query.queryVolume === 'high' ? 'HIGH' : 'MEDIUM'
            });
        }
    });

    return suggestions;
}
```

---

## Unified Marketing Strategy

### Content Should Serve Multiple Purposes

**The Triple-Duty Content Framework:**

```
                    ┌─────────────────────┐
                    │   CONTENT PIECE     │
                    │   (Blog, Post, etc) │
                    └─────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │  SOCIAL │         │   SEO   │         │   AEO   │
    │ Engage  │         │ Rank    │         │ Get Cited│
    │ audience│         │ for key │         │ by AI   │
    └─────────┘         │ queries │         │ assistants│
                        └─────────┘         └─────────┘
```

### Implementation: Unified Content Creation Workflow

**Step 1: Start with SEO/AEO Intelligence**
```
When creating content, first check:
├── What keywords are underperforming?
├── What queries don't cite Tiny Seed Farm?
├── What competitors are ranking for?
└── What's the seasonal content focus?
```

**Step 2: Create Multi-Format Content**
```
One topic generates:
├── Blog post (SEO primary)
├── Social posts x3-5 (Engagement + backlinks)
├── GBP post (Local SEO)
├── Email snippet (Direct traffic)
└── FAQ content (AEO structured data)
```

**Step 3: Distribute Strategically**
```
Timeline:
├── Day 1: Blog post published (SEO)
├── Day 2: Instagram post teaser (Social)
├── Day 3: TikTok/Reel video (Reach)
├── Day 4: GBP update with link (Local)
├── Day 5: Email newsletter (Traffic)
└── Day 7: Twitter thread recap (Engagement)
```

### Keywords from SEO Should Appear in Social Captions

**Current Implementation (Working):**
- MCC has "SEO Keyword Targeting" section
- Buttons for each keyword category
- Adds mapped hashtags to caption

**Enhancement Needed:**
- Show current ranking next to each button
- Highlight "priority" keywords that need boosting
- Track which keywords have been used recently

### Social Engagement Should Drive Website Traffic

**Strategy:**
1. Every social post should have clear CTA driving to website
2. Track link clicks from social to website
3. Identify which content types drive most conversions
4. Double down on high-traffic content formats

**Technical Implementation:**
- Use UTM parameters on all social links
- Track in Google Analytics 4
- Pull data into SEO Dashboard
- Display in MCC Analytics tab

### Website Content Should Be Shareable on Social

**Requirements:**
- Every blog post should have social-ready excerpts
- Pre-formatted captions for each post
- Optimal image sizes for each platform
- One-click share to MCC queue

---

## Technical Requirements

### Data Flow Between SEO and MCC

```
┌─────────────────────────────────────────────────────────────────┐
│                       GOOGLE SHEETS                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ SEO_Keywords   │  │ AI_Visibility  │  │ Content_Calendar│    │
│  │ - keyword      │  │ - platform     │  │ - date         │    │
│  │ - rank         │  │ - query        │  │ - type         │    │
│  │ - target       │  │ - mentioned    │  │ - pillar       │    │
│  │ - category     │  │ - timestamp    │  │ - keywords     │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                    │             │
└──────────┼───────────────────┼────────────────────┼─────────────┘
           │                   │                    │
           ▼                   ▼                    ▼
    ┌──────────────────────────────────────────────────────┐
    │                   MERGED TOTAL.js                     │
    │  ┌─────────────────┐  ┌─────────────────┐            │
    │  │ getSEOMaster    │  │ getAIVisibility │            │
    │  │ Dashboard()     │  │ Metrics()       │            │
    │  └────────┬────────┘  └────────┬────────┘            │
    │           │                    │                     │
    └───────────┼────────────────────┼─────────────────────┘
                │                    │
                ▼                    ▼
    ┌─────────────────────────────────────────────────────────┐
    │                 FRONTEND (web_app/)                      │
    │  ┌─────────────────────┐  ┌─────────────────────┐       │
    │  │ seo_dashboard.html  │  │ marketing-command-  │       │
    │  │                     │  │ center.html         │       │
    │  │  - Rankings         │◄──►│  - AEO Panel       │       │
    │  │  - AEO Tracking     │  │  - Keyword Hashtags │       │
    │  │  - Social Impact    │  │  - Post Creation    │       │
    │  └─────────────────────┘  └─────────────────────┘       │
    │            │                        │                    │
    │            └────────────┬───────────┘                    │
    │                         ▼                                │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │ keyword-hashtag-library.js                       │    │
    │  │ shared-content-calendar.js                       │    │
    │  │ api-config.js                                    │    │
    │  └─────────────────────────────────────────────────┘    │
    └─────────────────────────────────────────────────────────┘
```

### New API Endpoints Needed

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `getWeeklyKeywordPriority` | Return top 3 keywords needing content boost | HIGH |
| `getContentSuggestionsFromSEO` | AI-generated content ideas from keyword gaps | HIGH |
| `logSocialPostKeywords` | Track which keywords were used in each post | MEDIUM |
| `getKeywordUsageHistory` | Show when each keyword was last used in content | MEDIUM |
| `getTrafficByContentType` | Correlate post types with website traffic | MEDIUM |
| `getAEOContentGaps` | Queries where farm is not mentioned in AI | HIGH |
| `runAutomatedAEOCheck` | Scheduled check of AI platforms (per research doc) | MEDIUM |

### UI Changes for Unified Experience

**MCC Changes:**
1. Add "SEO Intelligence" panel at top of Create tab
2. Show weekly keyword priority prominently
3. Add "Content serves SEO goal" checkbox when posting
4. Display keyword ranking change after post

**SEO Dashboard Changes:**
1. Add "Create Social Post" button next to each keyword
2. Show "Last social post" date for each keyword
3. Add "Schedule Content" shortcut to MCC
4. Display MCC-generated content in Social Impact section

---

## Implementation Plan

### Phase 1: Quick Wins (< 2 hours)

| Task | File(s) | Effort |
|------|---------|--------|
| Add "SEO Priority Keyword" banner to MCC Create tab | marketing-command-center.html | 30 min |
| Show keyword current rank next to hashtag buttons | marketing-command-center.html | 30 min |
| Add "Create Post" link in SEO Dashboard keyword rows | seo_dashboard.html | 30 min |
| Add prominent cross-navigation between dashboards | Both files | 15 min |
| Display last-used date for each keyword category | keyword-hashtag-library.js | 15 min |

**Deliverables:**
- MCC shows which keyword to focus on this week
- Clear visibility of keyword rankings when creating posts
- Seamless navigation between SEO and social

### Phase 2: Core Integration (< 1 day)

| Task | File(s) | Effort |
|------|---------|--------|
| Implement `getWeeklyKeywordPriority` endpoint | MERGED TOTAL.js | 1 hour |
| Track keyword usage when posts are created | MERGED TOTAL.js + MCC | 1 hour |
| Build "SEO Intelligence" sidebar in MCC Create tab | marketing-command-center.html | 2 hours |
| Implement `getContentSuggestionsFromSEO` with Claude AI | MERGED TOTAL.js | 1.5 hours |
| Add keyword-to-post correlation tracking | Both dashboards | 1.5 hours |

**Deliverables:**
- AI-powered content suggestions based on SEO gaps
- Tracking of which posts target which keywords
- Weekly keyword priority system

### Phase 3: Advanced Features (Future)

| Task | Complexity | Impact |
|------|------------|--------|
| Automated AEO monitoring (per research doc) | HIGH | HIGH |
| Traffic-to-content correlation analytics | MEDIUM | HIGH |
| Competitor keyword gap integration | HIGH | MEDIUM |
| Content performance prediction | HIGH | MEDIUM |
| Auto-schedule posts based on traffic patterns | MEDIUM | MEDIUM |
| Blog-to-social content atomization tool | HIGH | HIGH |

**Estimated Timeline:**
- Phase 3a (AEO Automation): 3-5 days
- Phase 3b (Traffic Analytics): 2-3 days
- Phase 3c (Content Atomization): 3-4 days

---

## Appendix: Code References

### Existing Files Reviewed

| File | Location | Lines | Purpose |
|------|----------|-------|---------|
| marketing-command-center.html | web_app/ | ~27,000 | MCC frontend |
| seo_dashboard.html | web_app/ | ~3,500 | SEO Dashboard frontend |
| keyword-hashtag-library.js | web_app/ | ~450 | Keyword/hashtag mapping |
| shared-content-calendar.js | web_app/ | ~400 | Shared calendar logic |
| MERGED TOTAL.js | apps_script/ | ~140,000 | Backend API |
| keyword_hashtag_library.json | config/ | ~400 | Keyword config data |
| AEO_AUTOMATED_TRACKING_RESEARCH.md | docs/research/ | ~500 | AEO implementation guide |

### Key Functions in MERGED TOTAL.js

```javascript
// SEO/AEO Functions (approximate line numbers)
logSEORanking(params)           // Line 70867
getAIVisibilityMetrics(params)  // Line 71245
getSEOCompetitors(params)       // Line 72183
getSEOMasterDashboard(params)   // Line 72480
getSharedContentCalendar(params) // Line 134186
generateSeoKeywords(e.parameter) // Line 14518
```

### Keyword Library Structure

```javascript
// From keyword-hashtag-library.js
const seoKeywordCategories = {
    core_csa: {
        displayName: "Core CSA",
        keywords: [
            { keyword: "CSA pittsburgh", target: 1, searchVolume: "high", difficulty: "medium" }
        ],
        mappedHashtagSets: ["csa", "pittsburgh", "farmlife"]
    }
    // ... 7 more categories
};

const keywordToHashtagMapping = {
    "CSA pittsburgh": ["csa", "pittsburgh", "farmlife"],
    "best CSA pittsburgh": ["csa", "pittsburgh", "engagement"]
    // ... more mappings
};
```

---

## Summary

The MCC and SEO Dashboard already have a **solid foundation** for integration:
- Shared keyword library
- Shared content calendar
- AEO panel in MCC
- Cross-linking between dashboards
- Common API endpoints

**Priority Improvements:**
1. **Make SEO intelligence visible during content creation** - Show weekly keyword priority at top of MCC
2. **Track keyword usage in posts** - Know when each keyword was last used
3. **AI-powered content suggestions** - Generate ideas from SEO/AEO gaps
4. **Automated AEO monitoring** - Implement the research doc strategy

**Success Metrics:**
- % of social posts that include target SEO keywords
- Correlation between social activity and SEO ranking changes
- AEO visibility score improvement
- Time saved in content ideation

---

*Audit completed: February 14, 2026*
*Next review recommended: March 2026 (post-Phase 2 implementation)*
