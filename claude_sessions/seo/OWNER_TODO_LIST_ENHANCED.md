# SEO DOMINATION - ENHANCED OWNER TO-DO LIST
## Now With Proactive Intelligence

**Updated:** 2026-01-21
**System Version:** v222 (Intelligence Layer Active)

---

## FIRST: ACTIVATE THE INTELLIGENCE LAYER

### Run These Functions in Apps Script (One Time)
- [ ] **Run `initializeSEOModule()`** - Creates base tracking sheets
- [ ] **Run `initializeSEOIntelligence()`** - Creates intelligence sheets
- [ ] **Run `setupDailySEOTrigger()`** - Activates 7 AM daily checks

After this, the system will automatically:
- Check for ranking drops
- Alert you to unresponded reviews
- Generate "Today's Actions" list

---

## WEEK 1: FOUNDATION

### Google Business Profile (32% of ranking)
- [ ] Claim GBP at business.google.com
- [ ] Verify ownership
- [ ] Set primary category: "Farm" or "Vegetable farm"
- [ ] Add secondary categories: CSA, Organic farm, Farm stand
- [ ] Write 750-character description
- [ ] Add all service areas (Mt. Lebanon, Squirrel Hill, Bloomfield, etc.)
- [ ] Upload 20+ photos

### Log Initial Rankings
- [ ] Search "farm pittsburgh" in Google (incognito) - note position
- [ ] Search "CSA pittsburgh" - note position
- [ ] Search "organic farm pittsburgh" - note position
- [ ] Search "local produce pittsburgh" - note position
- [ ] **Log rankings in SEO Dashboard** (`/web_app/seo_dashboard.html`)

---

## WEEK 2: VOICE PLATFORMS (NEW!)

The system now tracks voice assistant optimization. **75% of smart speaker users search "near me".**

### Claim These Listings (System tracks progress)
| Platform | Data Source | Claim Here |
|----------|-------------|------------|
| [ ] Google Assistant | Google Business Profile | Already done above |
| [ ] Apple Siri | Apple Maps + Yelp | mapsconnect.apple.com + biz.yelp.com |
| [ ] Amazon Alexa | Bing Places | bingplaces.com |
| [ ] Microsoft Cortana | Bing Places | Already done with Alexa |

### After Claiming Each:
- [ ] Log status: Run `logVoicePlatformStatus({platform: 'Apple Siri', claimed: true, napAccurate: true})`
- [ ] Or update via dashboard when UI is ready

---

## WEEK 3: AI VISIBILITY (NEW!)

**AI search traffic grew 527% year-over-year.** The system now tracks this.

### Check AI Visibility Weekly
- [ ] Search "farm Pittsburgh" in **ChatGPT** - does Tiny Seed appear?
- [ ] Search "best CSA Pittsburgh" in **Perplexity** - does Tiny Seed appear?
- [ ] Check **Google AI Overview** - is Tiny Seed mentioned?

### Log Results
```javascript
// In Apps Script or via API:
logAIVisibility({
  platform: 'chatgpt',  // or 'perplexity', 'gemini', 'ai_overview'
  query: 'farm pittsburgh',
  appeared: true,       // or false
  position: 'mentioned' // 'featured', 'mentioned', 'not_found'
});
```

---

## WEEK 4: GEOGRID CHECK (NEW!)

**Rankings vary by searcher location.** A customer in Mt. Lebanon sees different results than Squirrel Hill.

### Run GeoGrid Check
- [ ] Sign up for [Local Dominator](https://localdominator.co) (free trial)
- [ ] Run GeoGrid for "farm pittsburgh" centered on your location
- [ ] Take screenshot of heatmap
- [ ] Note: Which neighborhoods are GREEN (top 3)? YELLOW (4-10)? RED (11+)?

### Log Results
```javascript
logGeoGridSnapshot({
  keyword: 'farm pittsburgh',
  gridSize: '5x5',
  centerLat: 40.4406,
  centerLng: -79.9959,
  gridPoints: [
    {area: 'Mt. Lebanon', rank: 3},
    {area: 'Squirrel Hill', rank: 7},
    {area: 'Bloomfield', rank: 12},
    // ... more points
  ]
});
```

---

## ONGOING: LET THE SYSTEM TELL YOU WHAT TO DO

### Every Morning
The system runs `runDailySEOCheck()` at 7 AM and creates alerts.

**Check the dashboard for:**
- [ ] "Today's Actions" - prioritized task list
- [ ] Active Alerts - things that need attention
- [ ] Unresponded reviews

### When You Get an Alert
| Alert Type | Action |
|------------|--------|
| `ranking_drop` | Check what changed, create content targeting that keyword |
| `negative_review` | Respond within 24 hours (system drafts response for you) |
| `citation_issue` | Fix NAP inconsistency |

### Use AI Review Response Drafts
When you need to respond to a review:
```javascript
generateReviewResponseDraft({
  rating: 5,
  reviewerName: 'Sarah M.',
  reviewText: 'Best fresh organic vegetables in Pittsburgh!'
});
// Returns a draft you can copy/paste and personalize
```

---

## CITATIONS (Unchanged from before)

### Tier 1 - Essential (Week 2)
- [ ] Google Business Profile ✓
- [ ] Bing Places - bingplaces.com
- [ ] Apple Maps - mapsconnect.apple.com
- [ ] Facebook Business Page
- [ ] Yelp Business - biz.yelp.com

### Tier 2 - Farm Directories (Week 3)
- [ ] LocalHarvest.org
- [ ] USDA CSA Directory
- [ ] FindMyCSAFarm.com
- [ ] EatWild.com

### Tier 3 - Pittsburgh Local (Week 4)
- [ ] Visit Pittsburgh
- [ ] Good Food Pittsburgh (pitch)
- [ ] Pittsburgh Magazine (pitch)
- [ ] Nextdoor Business

---

## REVIEWS (Unchanged but Enhanced)

### Week 3: Seed Reviews
- [ ] Identify 10 most loyal CSA members
- [ ] Send personal email asking for Google review
- [ ] **Use system to find candidates:** `getReviewRequestCandidates({limit: 10})`

### Ongoing: Respond Fast
- [ ] System alerts you to new reviews
- [ ] **Use AI draft:** `generateReviewResponseDraft({...})`
- [ ] Personalize and post within 24 hours

---

## CONTENT (Unchanged)

### Blog Posts - Follow Content Calendar
- [ ] Week 1: "The Complete Guide to Pittsburgh CSAs in 2026"
- [ ] Week 2: "5 Reasons to Join a CSA This Year"
- [ ] Week 3: "CSA vs Grocery Store: The Real Cost Comparison"
- [ ] Week 4: "What's in a CSA Box? Week-by-Week Guide"

**Full calendar:** `/claude_sessions/seo/CONTENT_CALENDAR_52_WEEKS.md`

---

## QUICK REFERENCE: NEW FUNCTIONS

| Function | Purpose |
|----------|---------|
| `getTodaysActions()` | Get prioritized "do this today" list |
| `getActiveAlerts()` | See unacknowledged alerts |
| `acknowledgeAlert({alertId})` | Mark alert as handled |
| `logAIVisibility({...})` | Track ChatGPT/Perplexity appearance |
| `getAIVisibilityMetrics()` | See AI visibility stats |
| `logGeoGridSnapshot({...})` | Log neighborhood ranking data |
| `getGeoGridAnalysis()` | Get weak area recommendations |
| `logVoicePlatformStatus({...})` | Update voice platform status |
| `getVoicePlatformChecklist()` | See voice optimization status |
| `generateReviewResponseDraft({...})` | Get AI-written review response |
| `getSEODashboardEnhanced()` | Get all data including intelligence |

---

## MILESTONES

| Timeline | Reviews | Ranking Goal | New Metrics |
|----------|---------|--------------|-------------|
| Month 1 | 15 | Appear in results | AI visibility baseline |
| Month 2 | 25 | Top 20 | GeoGrid: 50% green |
| Month 3 | 40 | Top 10 | Voice platforms: 100% claimed |
| Month 6 | 75 | Top 5 | GeoGrid: 75% green |
| Month 12 | 150+ | **#1** | AI visibility: 50%+ appearance rate |

---

## THE SYSTEM WILL NOW:

1. **ALERT YOU** when rankings drop
2. **TELL YOU** what to do each day
3. **DRAFT** review responses for you
4. **TRACK** AI search visibility
5. **SHOW** neighborhood-level rankings
6. **MONITOR** voice platform optimization

**You just need to follow its guidance.**

---

*System Version: v222 - SEO Intelligence Layer Active*
*Let's get to #1!*
