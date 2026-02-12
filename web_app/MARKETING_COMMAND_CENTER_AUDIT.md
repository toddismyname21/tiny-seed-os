# Marketing Command Center - Complete System Audit

**File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/marketing-command-center.html`
**Total Lines:** 20,950
**File Size:** ~1.1MB
**Audit Date:** 2026-02-12
**Purpose:** Complete understanding documentation before any further changes

---

## SECTION 1: TAB ARCHITECTURE

### Overview
The Marketing Command Center has a total of **23 tabs** defined in the navigation system:
- **10 VISIBLE tabs** (actively displayed in navigation)
- **13 HIDDEN tabs** (merged/consolidated, display:none in CSS)

### Tab Navigation Buttons (Lines 3258-3403)

| Tab ID | Button Text | Visibility | Line Number | Icon |
|--------|-------------|------------|-------------|------|
| brain | Brain | VISIBLE | ~3269 | fa-brain |
| create | Create | VISIBLE | ~3275 | fa-edit |
| farmpics | Photos | VISIBLE | ~3281 | fa-images |
| contentcalendar | Calendar | VISIBLE | ~3287 | fa-calendar-alt |
| growth | Growth | VISIBLE | ~3293 | fa-chart-line |
| campaigns | Campaigns | VISIBLE | ~3299 | fa-bullhorn |
| paidads | Ads | VISIBLE | ~3305 | fa-ad |
| analytics | Analytics | VISIBLE | ~3311 | fa-chart-bar |
| engage | Engage | VISIBLE | ~3317 | fa-comments |
| settings | Settings | VISIBLE | ~3323 | fa-cog |
| dashboard | Dashboard | HIDDEN | ~3329 | fa-th-large |
| schedule | Schedule | HIDDEN | ~3335 | fa-clock |
| connections | Connections | HIDDEN | ~3341 | fa-plug |
| budget | Budget | HIDDEN | ~3347 | fa-dollar-sign |
| intelligence | Intelligence | HIDDEN | ~3353 | fa-lightbulb |
| brandvoice | Brand Voice | HIDDEN | ~3359 | fa-signature |
| contentstudio | Content Studio | HIDDEN | ~3365 | fa-palette |
| evergreen | Evergreen | HIDDEN | ~3371 | fa-tree |
| revenue | Revenue | HIDDEN | ~3377 | fa-money-bill |
| competitors | Competitors | HIDDEN | ~3383 | fa-users |
| crisis | Crisis | HIDDEN | ~3389 | fa-exclamation-triangle |
| comments | Comments | HIDDEN | ~3395 | fa-comment-dots |
| autopilot | Autopilot | HIDDEN | ~3401 | fa-robot |

### Tab Content Panels (Lines 3409-8500)

Each tab has a corresponding content panel with ID pattern: `{tabId}Tab`

| Tab ID | Panel ID | Start Line | Status |
|--------|----------|------------|--------|
| brainTab | brainTab | ~3410 | Active, extensive content |
| createTab | createTab | ~3800 | Active, multi-mode creation |
| farmpicsTab | farmpicsTab | ~4200 | Active, photo gallery |
| contentcalendarTab | contentcalendarTab | ~4500 | Active, 7-day calendar |
| growthTab | growthTab | ~4900 | Active, social growth metrics |
| campaignsTab | campaignsTab | ~5300 | Active, campaign management + markets |
| paidadsTab | paidadsTab | ~5700 | Active, Meta Ads management |
| analyticsTab | analyticsTab | ~6100 | Active, analytics hub |
| engageTab | engageTab | ~6500 | Active, unified inbox |
| settingsTab | settingsTab | ~6900 | Active, API configs |
| dashboardTab | dashboardTab | ~7300 | HIDDEN - merged elsewhere |
| scheduleTab | scheduleTab | ~7400 | HIDDEN - merged into Calendar |
| connectionsTab | connectionsTab | ~7500 | HIDDEN - merged into Settings |
| budgetTab | budgetTab | ~7600 | HIDDEN - merged into Analytics |
| intelligenceTab | intelligenceTab | ~7700 | HIDDEN - merged into Brain |
| brandvoiceTab | brandvoiceTab | ~7800 | HIDDEN - merged into Settings |
| contentstudioTab | contentstudioTab | ~7900 | HIDDEN - merged into Create |
| evergreenTab | evergreenTab | ~8000 | HIDDEN - merged into Engage |
| revenueTab | revenueTab | ~8100 | HIDDEN - merged into Analytics |
| competitorsTab | competitorsTab | ~8200 | HIDDEN - merged into Growth |
| crisisTab | crisisTab | ~8300 | HIDDEN - merged into Engage |
| commentsTab | commentsTab | ~8350 | HIDDEN - merged into Engage |
| autopilotTab | autopilotTab | ~8400 | HIDDEN - content exists but tab hidden |

---

## SECTION 2: JAVASCRIPT FUNCTION MAP

### Core Navigation Functions

| Function | Line | Purpose | Dependencies |
|----------|------|---------|--------------|
| `switchTab(tabId)` | 9402 | Main tab switching handler | DOM selectors |
| `mobileNavSwitch(tabId)` | 19650 | Mobile-specific tab switching | switchTab() |
| `switchSettingsSection(section)` | ~9440 | Settings sub-tab switching | None |
| `switchEngageSection(section)` | ~9460 | Engage sub-tab switching | None |
| `switchCreateMode(mode)` | ~9480 | Create tab mode switching | None |
| `showAnalyticsSection(section)` | ~9500 | Analytics sub-section display | None |

### Brain Tab Functions (Lines 15400-16999)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadBrainTab()` | ~15430 | Initialize Brain tab data | getMarketingBrainData |
| `loadActionQueue()` | ~15480 | Load urgent/today actions | Part of brainData |
| `showAIRecommendations()` | ~15550 | Display AI suggestions | generateAIRecommendations |
| `showTimeSuggestions()` | ~15600 | Show optimal posting times | getOptimalPostingTimes |
| `loadTrendingAudio()` | ~15650 | Load trending audio/sounds | getTrendingAudio |
| `loadAlgorithmChanges()` | ~15700 | Display platform algorithm updates | getAlgorithmUpdates |
| `loadContentMixTracker()` | ~15800 | 5-3-2 content mix display | getContentMixStats |
| `analyzeVoice()` | ~16200 | Voice learning engine | analyzeVoicePatterns |
| `switchBrainAccount(account)` | ~16300 | Switch Instagram accounts | None |
| `refreshBrainData()` | ~16400 | Force refresh brain data | Multiple API calls |

### Content Creation Functions (Lines 10000-11000)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `generateCaption()` | ~10050 | AI caption generation | generateAICaption |
| `generateWithTemplate(templateId)` | ~10150 | Template-based generation | generateFromTemplate |
| `handleImageUpload(e)` | ~10250 | Process image upload | None (local) |
| `loadCaptionTemplates()` | ~10350 | Load saved templates | getCaptionTemplates |
| `saveCaptionTemplate()` | ~10450 | Save new template | saveCaptionTemplate |
| `deleteTemplate(id)` | ~10550 | Remove template | deleteTemplate |
| `updateCharCount()` | ~10600 | Character counter | None |
| `copyCaption()` | ~10650 | Copy to clipboard | None |

### Publishing Functions (Lines 11100-11400)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `publishPost()` | ~11100 | Publish to Instagram | publishToInstagram |
| `schedulePost()` | ~11200 | Schedule for later | scheduleInstagramPost |
| `saveDraft()` | ~11300 | Save as draft | savePostDraft |
| `loadDrafts()` | ~11350 | Load saved drafts | getDrafts |
| `deleteDraft(id)` | ~11400 | Remove draft | deleteDraft |

### Farm Pics Gallery Functions (Lines 11091-11350)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadFarmPics()` | ~11091 | Load photo gallery | getFarmPics |
| `renderFarmPics()` | ~11150 | Display photos grid | None |
| `uploadNewPhoto()` | ~11200 | Upload new photo | uploadFarmPic |
| `deleteFarmPic(id)` | ~11250 | Remove photo | deleteFarmPic |
| `selectPhotoForPost(url)` | ~11300 | Pick photo for post | None |
| `showPhotoDetail(id)` | ~11350 | Show photo modal | None |

### Content Calendar Functions (Lines 11900-12999)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadContentCalendar()` | ~11900 | Initialize calendar | getContentCalendar |
| `renderWeekView(weekData)` | ~12000 | Display 7-day grid | None |
| `navigateWeek(direction)` | ~12100 | Week navigation | getContentCalendar |
| `loadPhotoLibrary()` | ~12200 | Load photos for calendar | getPhotoLibrary |
| `loadToddInput()` | ~12300 | Load Todd's notes | getToddInput |
| `detectContentGaps()` | ~12400 | Find missing content | analyzeContentGaps |
| `showContentPillars()` | ~12500 | Display pillar balance | None |
| `showPostDetail(postId)` | ~12600 | Post detail modal | getPostDetail |
| `editScheduledPost(postId)` | ~12700 | Edit scheduled post | None |
| `deleteScheduledPost(postId)` | ~12800 | Remove scheduled | deleteScheduledPost |
| `movePost(postId, newDate)` | ~12900 | Drag/drop move | updatePostSchedule |

### Sunday Planning Dashboard Functions (Lines 17023-17434)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `openSundayPlanning()` | ~17023 | Open planning overlay | loadContentPool |
| `closeSundayPlanning()` | ~17060 | Close planning overlay | None |
| `loadContentPool()` | ~17100 | Load available content | getContentPool |
| `renderWeekGrid()` | ~17150 | Display week grid | None |
| `initDragDrop()` | ~17200 | Enable drag/drop | None |
| `handleDrop(e)` | ~17250 | Process dropped content | None |
| `autoPlanWeek()` | ~17300 | AI auto-plan week | autoGenerateWeekPlan |
| `approveSelected()` | ~17350 | Approve selected posts | batchApprove |
| `scheduleAllApproved()` | ~17400 | Schedule approved posts | batchSchedule |

### Brand Voice Functions (Lines 17437-17515)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadBrandVoice()` | ~17437 | Load voice settings | getBrandVoice |
| `trainVoice()` | ~17470 | Train on past posts | trainBrandVoice |
| `generateVoiceSample()` | ~17500 | Generate sample text | generateWithVoice |
| `saveBrandVoice()` | ~17515 | Save voice settings | saveBrandVoice |

### Social Growth Functions (Lines 18693-18776)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadSocialGrowthData()` | ~18696 | Load growth metrics | getSocialStats |
| `loadSocialGrowthLive()` | ~18696 | Load live follower counts | getSocialStats |
| `formatNumber(num)` | ~18772 | Format numbers (1K, 1M) | None |
| `updateGrowthCard()` | ~18754 | Update growth display | None |

### Competitor Watch Functions (Lines 17822-18224)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadCompetitors()` | ~17822 | Load competitor list | getCompetitors |
| `analyzeCompetitor(id)` | ~18006 | AI competitor analysis | analyzeCompetitorContent |
| `analyzeAllCompetitors()` | ~18030 | Analyze all competitors | analyzeCompetitorContent (batch) |
| `checkCompetitorAds()` | ~18046 | Check Meta Ad Library | checkCompetitorAds |
| `showAddCompetitor()` | ~18071 | Open add form | None |
| `editCompetitor(id)` | ~18095 | Edit competitor | None |
| `saveCompetitor()` | ~18133 | Save competitor | addCompetitor/updateCompetitor |
| `deleteCompetitor()` | ~18195 | Remove competitor | deleteCompetitor |

### Your Farm Stats Functions (Lines 18225-18479)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadYourFarmStats()` | ~18229 | Load your follower stats | getYourFarmStats |
| `checkAutoSyncStatus()` | ~18280 | Check auto-sync setup | checkMonthlyFollowerSyncStatus |
| `syncFollowersNow()` | ~18299 | Sync from Instagram API | autoSyncYourFarmStats |
| `setupAutoSync()` | ~18322 | Enable monthly sync | setupMonthlyFollowerSync |
| `saveYourStats()` | ~18400 | Manual stats update | saveYourFarmStats |
| `viewFollowerHistory()` | ~18431 | View history modal | getYourFarmStats |
| `sendCompetitorReport()` | ~18338 | Email competitor report | generateMonthlyCompetitorReport |

### Crisis Management Functions (Lines 18481-18556)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `checkSentiment()` | ~18485 | Check sentiment health | getSentimentHealth |
| `analyzeSingleSentiment()` | ~18514 | Analyze single text | analyzeSentiment |
| `copyTemplate(type)` | ~18548 | Copy response template | None |

### Settings & API Functions (Lines 18557-18691)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `saveOpenAI()` | ~18561 | Save OpenAI key | configureOpenAI |
| `saveClaude()` | ~18593 | Save Claude key | configureClaude |
| `saveStability()` | ~18621 | Save Stability AI key | configureStabilityAI |
| `savePhotoroom()` | ~18638 | Save Photoroom key | configurePhotoroom |
| `checkAllAPIs()` | ~18655 | Check all API status | checkAllAPIStatus |

### Auto-Pilot Functions (Lines 18778-19188)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadAutoPilotStatus()` | ~18782 | Load automation status | getMarketingAutomationStatus |
| `renderUpcomingPosts(posts)` | ~18833 | Display pending posts | None |
| `renderRecentPosts(posts)` | ~18866 | Display posted items | None |
| `addToQueue()` | ~18928 | Add to marketing queue | addToMarketingQueue |
| `generateAIContent()` | ~18970 | Generate AI content | generateMarketingContent |
| `postImmediately()` | ~18992 | Post now | postNow |
| `generateWeekContent()` | ~19033 | Generate week of content | generateWeeklyMarketingContent |
| `processQueueNow()` | ~19063 | Process all queue | processMarketingQueue |
| `setupAutomationTriggers()` | ~19089 | Enable daily triggers | setupMarketingAutomationTrigger |
| `initializeQueue()` | ~19113 | Initialize queue sheet | initializeMarketingQueue |
| `postQueueItemNow(id)` | ~19134 | Post specific item | postNow |

### Farmers Market Schedule Functions (Lines 19190-19606)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadMarketSchedule()` | ~19243 | Load market list | localStorage |
| `renderMarketSchedule(markets)` | ~19257 | Display market list | None |
| `formatMarketTime(time)` | ~19321 | Format 24h to 12h | None |
| `updateMarketCountdown(markets)` | ~19331 | Update countdown banner | None |
| `getNextMarketDay(markets)` | ~19369 | Calculate next market | None |
| `openAddMarketModal()` | ~19391 | Open add modal | None |
| `closeMarketModal()` | ~19406 | Close modal | None |
| `editMarket(id)` | ~19411 | Edit market | None |
| `saveMarket()` | ~19429 | Save market | localStorage |
| `deleteMarket(id)` | ~19486 | Delete market | localStorage |
| `openScheduleReminderModal(id)` | ~19497 | Open reminder modal | None |
| `confirmScheduleReminder()` | ~19530 | Save reminder | localStorage |

### Mobile/Field Mode Functions (Lines 19608-20678)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `toggleFieldMode()` | ~19613 | Toggle high-contrast | localStorage |
| `initFieldMode()` | ~19637 | Initialize field mode | localStorage |
| `mobileNavSwitch(tabId)` | ~19650 | Mobile nav handler | None |
| `initOfflineDetection()` | ~19676 | Setup offline handling | None |
| `addToPostQueue(data)` | ~19704 | Add to offline queue | localStorage |
| `syncPendingPosts()` | ~19726 | Sync offline posts | socialPost |
| `openFieldCapture()` | ~20121 | Open capture overlay | None |
| `closeFieldCapture()` | ~20151 | Close capture overlay | None |
| `handleFieldCaptureImage(e)` | ~20167 | Process captured image | None |
| `generateFieldCaptureSuggestions()` | ~20193 | AI caption suggestions | None |
| `toggleFieldCaptureVoice()` | ~20280 | Voice input toggle | SpeechRecognition |
| `queueFieldCapture()` | ~20346 | Queue captured content | addToMarketingQueue |
| `undoFieldCapture()` | ~20522 | Undo last queue | deleteMarketingQueueItem |
| `calculateOptimalPostTime()` | ~20459 | Calculate best time | None |
| `initFieldCapture()` | ~20649 | Initialize field capture | None |

### Hashtag Set Functions (Lines 19760-19838)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `toggleHashtagSets()` | ~19790 | Expand/collapse sets | None |
| `addHashtagSet(setName)` | ~19798 | Add hashtags to caption | None |
| `createCustomHashtagSet()` | ~19823 | Create new set | None |

### Instagram Grid Preview Functions (Lines 19975-20027)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `loadInstagramGrid()` | ~19980 | Load grid preview | None |
| `updateGridDisplay()` | ~19998 | Update grid display | None |
| `updateGridPreview(url)` | ~20009 | Preview new post | None |
| `clearGridPreview()` | ~20020 | Clear preview | None |

### Quick Reply Templates (Lines 20030-20075)

| Function | Line | Purpose | API Calls |
|----------|------|---------|-----------|
| `insertQuickReply(text)` | ~20046 | Copy/paste reply | None |
| `customizeQuickReply(key)` | ~20066 | Edit template | None |

### Utility Functions

| Function | Line | Purpose |
|----------|------|---------|
| `showToast(msg, type)` | ~9350 | Display toast notification |
| `showNotification(msg, type)` | ~9360 | Alias for showToast |
| `apiPost(action, data)` | ~9370 | POST helper function |
| `apiGet(action)` | ~9380 | GET helper function |
| `formatDate(date)` | ~9390 | Date formatting |
| `debounce(fn, delay)` | ~9395 | Debounce utility |

---

## SECTION 3: API DEPENDENCY MAP

### Primary API Endpoint
```javascript
const API_URL = TINY_SEED_API.MAIN_API;
// Loaded from api-config.js
// Points to: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

### API Actions by Category

#### Brain Tab APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getMarketingBrainData | GET | loadBrainTab() | Load all brain data |
| generateAIRecommendations | POST | showAIRecommendations() | AI content suggestions |
| getOptimalPostingTimes | GET | showTimeSuggestions() | Best posting times |
| getTrendingAudio | GET | loadTrendingAudio() | Trending sounds |
| getAlgorithmUpdates | GET | loadAlgorithmChanges() | Platform changes |
| getContentMixStats | GET | loadContentMixTracker() | 5-3-2 stats |
| analyzeVoicePatterns | POST | analyzeVoice() | Voice learning |

#### Content Creation APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| generateAICaption | POST | generateCaption() | AI caption |
| generateFromTemplate | POST | generateWithTemplate() | Template content |
| getCaptionTemplates | GET | loadCaptionTemplates() | Load templates |
| saveCaptionTemplate | POST | saveCaptionTemplate() | Save template |
| deleteTemplate | POST | deleteTemplate() | Remove template |

#### Publishing APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| publishToInstagram | POST | publishPost() | Direct publish |
| scheduleInstagramPost | POST | schedulePost() | Schedule post |
| savePostDraft | POST | saveDraft() | Save draft |
| getDrafts | GET | loadDrafts() | Load drafts |
| deleteDraft | POST | deleteDraft() | Remove draft |

#### Farm Pics APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getFarmPics | GET | loadFarmPics() | Get photo gallery |
| uploadFarmPic | POST | uploadNewPhoto() | Upload photo |
| deleteFarmPic | POST | deleteFarmPic() | Remove photo |

#### Content Calendar APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getContentCalendar | GET | loadContentCalendar() | Load calendar |
| getPhotoLibrary | GET | loadPhotoLibrary() | Load photos |
| getToddInput | GET | loadToddInput() | Load notes |
| analyzeContentGaps | GET | detectContentGaps() | Find gaps |
| getPostDetail | GET | showPostDetail() | Post detail |
| updatePostSchedule | POST | movePost() | Move post |
| deleteScheduledPost | POST | deleteScheduledPost() | Remove post |

#### Social Growth APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getSocialStats | GET | loadSocialGrowthLive() | Live follower counts |

#### Competitor APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getCompetitors | GET | loadCompetitors() | Load competitors |
| analyzeCompetitorContent | POST | analyzeCompetitor() | AI analysis |
| checkCompetitorAds | GET | checkCompetitorAds() | Ad Library check |
| addCompetitor | POST | saveCompetitor() | Add new |
| updateCompetitor | POST | saveCompetitor() | Update existing |
| deleteCompetitor | POST | deleteCompetitor() | Remove |

#### Your Farm Stats APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getYourFarmStats | GET | loadYourFarmStats() | Get stats + history |
| checkMonthlyFollowerSyncStatus | GET | checkAutoSyncStatus() | Check sync status |
| autoSyncYourFarmStats | GET | syncFollowersNow() | Sync from IG API |
| setupMonthlyFollowerSync | GET | setupAutoSync() | Enable auto-sync |
| saveYourFarmStats | POST | saveYourStats() | Manual update |
| generateMonthlyCompetitorReport | GET | sendCompetitorReport() | Email report |
| setupMonthlyCompetitorReport | GET | setupMonthlyReport() | Schedule report |

#### Crisis Management APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getSentimentHealth | GET | checkSentiment() | Sentiment status |
| analyzeSentiment | POST | analyzeSingleSentiment() | Analyze text |

#### Settings APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| configureOpenAI | POST | saveOpenAI() | Save OpenAI key |
| configureClaude | POST | saveClaude() | Save Claude key |
| configureStabilityAI | POST | saveStability() | Save Stability key |
| configurePhotoroom | POST | savePhotoroom() | Save Photoroom key |
| checkAllAPIStatus | GET | checkAllAPIs() | Check all APIs |

#### Auto-Pilot APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getMarketingAutomationStatus | GET | loadAutoPilotStatus() | Queue status |
| addToMarketingQueue | POST | addToQueue() | Add to queue |
| generateMarketingContent | GET | generateAIContent() | AI content |
| postNow | POST | postImmediately() | Immediate post |
| generateWeeklyMarketingContent | POST | generateWeekContent() | Week of content |
| processMarketingQueue | POST | processQueueNow() | Process queue |
| setupMarketingAutomationTrigger | POST | setupAutomationTriggers() | Enable triggers |
| initializeMarketingQueue | POST | initializeQueue() | Init sheet |
| deleteMarketingQueueItem | POST | undoFieldCapture() | Delete queue item |

#### Sunday Planning APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getContentPool | GET | loadContentPool() | Available content |
| autoGenerateWeekPlan | POST | autoPlanWeek() | AI plan week |
| batchApprove | POST | approveSelected() | Approve multiple |
| batchSchedule | POST | scheduleAllApproved() | Schedule batch |

#### Brand Voice APIs
| Action | Method | Calling Function | Purpose |
|--------|--------|------------------|---------|
| getBrandVoice | GET | loadBrandVoice() | Get voice settings |
| trainBrandVoice | POST | trainVoice() | Train on posts |
| generateWithVoice | POST | generateVoiceSample() | Generate sample |
| saveBrandVoice | POST | saveBrandVoice() | Save settings |

---

## SECTION 4: TAB SWITCH FLOW

### Primary switchTab() Function (Lines 9402-9437)

```javascript
function switchTab(tabId) {
    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Add active state to clicked button
    event.target.closest('.tab-btn').classList.add('active');

    // Hide all tab content panels
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Show selected tab content
    document.getElementById(tabId + 'Tab').classList.add('active');

    // Load tab-specific data
    if (tabId === 'paidads') loadPaidAdsTab();
    else if (tabId === 'farmpics') loadFarmPics();
    else if (tabId === 'contentcalendar') {
        loadContentCalendar();
        loadPhotoLibrary();
        loadToddInput();
    }
    else if (tabId === 'engage') {
        loadUnifiedInbox();
        loadComments();
        loadEvergreenLibraryEngage();
    }
    else if (tabId === 'analytics') refreshAnalyticsHub();
    else if (tabId === 'growth') loadSocialGrowthData();
    else if (tabId === 'settings') {
        checkAllAPIs();
        loadTrainingCount();
        loadAutoPilotStatusForSettings();
    }
}
```

### Extended switchTab Override (Lines 19163-19188)

```javascript
const originalSwitchTab = switchTab;
switchTab = function(tabId) {
    // Call original logic
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab-btn')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId + 'Tab')?.classList.add('active');

    // Additional handlers
    if (tabId === 'autopilot') {
        loadAutoPilotStatus();
    }
    if (tabId === 'contentcalendar') {
        loadContentCalendar();
        loadPhotoLibrary();
        loadToddInput();
    }
    if (tabId === 'campaigns') {
        loadMarketSchedule();
    }
};
```

### Tab Load Handlers Summary

| Tab ID | Functions Called on Switch |
|--------|---------------------------|
| brain | (Default tab - loads on page init) |
| create | None |
| farmpics | loadFarmPics() |
| contentcalendar | loadContentCalendar(), loadPhotoLibrary(), loadToddInput() |
| growth | loadSocialGrowthData() |
| campaigns | loadMarketSchedule() |
| paidads | loadPaidAdsTab() |
| analytics | refreshAnalyticsHub() |
| engage | loadUnifiedInbox(), loadComments(), loadEvergreenLibraryEngage() |
| settings | checkAllAPIs(), loadTrainingCount(), loadAutoPilotStatusForSettings() |
| autopilot | loadAutoPilotStatus() |

### Missing Tab Handlers

The following tabs have NO explicit load handler in switchTab():
- dashboard (HIDDEN)
- schedule (HIDDEN)
- connections (HIDDEN)
- budget (HIDDEN)
- intelligence (HIDDEN)
- brandvoice (HIDDEN)
- contentstudio (HIDDEN)
- evergreen (HIDDEN)
- revenue (HIDDEN)
- competitors (HIDDEN)
- crisis (HIDDEN)
- comments (HIDDEN)

---

## SECTION 5: DATA FLOW

### Major Data Arrays

| Array/Object | Line | Purpose | Populated By |
|--------------|------|---------|--------------|
| `farmPicsData` | ~11091 | Farm photo gallery | loadFarmPics() |
| `campaignsData` | ~11355 | Marketing campaigns | loadCampaigns() |
| `contentCalendarData` | ~11900 | Scheduled posts | loadContentCalendar() |
| `photoLibraryData` | ~11901 | Photo library | loadPhotoLibrary() |
| `brainData` | ~15425 | Brain tab data structure | loadBrainTab() |
| `competitorsCache` | ~17850 | Cached competitor data | loadCompetitors() |
| `instagramGridPosts` | ~19979 | IG grid preview | loadInstagramGrid() |
| `pendingPostsQueue` | ~19674 | Offline post queue | initOfflineDetection() |
| `fieldCaptureState` | ~20110 | Field capture state | openFieldCapture() |
| `hashtagSets` | ~19763 | Predefined hashtag sets | Static definition |
| `marketSchedules` | ~19844 | Market schedule config | Static definition |
| `quickReplyTemplates` | ~20033 | Quick reply templates | Static definition |
| `defaultMarkets` | ~19195 | Default farmers markets | Static definition |

### Data Flow Patterns

#### Brain Tab Data Flow
```
1. Page loads -> loadBrainTab() called
2. loadBrainTab() fetches getMarketingBrainData
3. API returns: { actionQueue, recommendations, contentMix, trendingAudio, algorithmChanges }
4. brainData populated
5. Various render functions display sections
```

#### Content Calendar Data Flow
```
1. User switches to Calendar tab
2. switchTab('contentcalendar') triggers:
   - loadContentCalendar() -> fetches getContentCalendar -> contentCalendarData
   - loadPhotoLibrary() -> fetches getPhotoLibrary -> photoLibraryData
   - loadToddInput() -> fetches getToddInput -> displays in UI
3. renderWeekView() displays 7-day grid
4. Drag/drop moves trigger updatePostSchedule API call
```

#### Field Capture Offline Flow
```
1. User captures photo in field mode
2. queueFieldCapture() creates post data
3. If online: saveFieldCaptureToServer() -> API call
4. If offline: saveFieldCaptureLocally() -> localStorage
5. When online event fires: syncPendingFieldCaptures() syncs all pending
```

#### Farmers Market Local Storage Flow
```
1. loadMarketSchedule() checks localStorage for 'tinySeedMarkets'
2. If empty, uses defaultMarkets array
3. Saves to localStorage for persistence
4. All CRUD operations update localStorage
5. No server sync (purely local)
```

---

## SECTION 6: CSS/VISIBILITY ISSUES

### Hidden Tabs (CSS)

The following tabs are hidden via CSS at approximately lines 3000-3200:

```css
/* Hidden consolidated tabs */
.tab-btn[onclick*="dashboard"],
.tab-btn[onclick*="schedule"],
.tab-btn[onclick*="connections"],
.tab-btn[onclick*="budget"],
.tab-btn[onclick*="intelligence"],
.tab-btn[onclick*="brandvoice"],
.tab-btn[onclick*="contentstudio"],
.tab-btn[onclick*="evergreen"],
.tab-btn[onclick*="revenue"],
.tab-btn[onclick*="competitors"],
.tab-btn[onclick*="crisis"],
.tab-btn[onclick*="comments"],
.tab-btn[onclick*="autopilot"] {
    display: none !important;
}
```

### Elements with Conditional Visibility

| Element ID | Default State | Toggled By |
|------------|---------------|------------|
| fieldCaptureOverlay | hidden | openFieldCapture() |
| sundayPlanningOverlay | hidden | openSundayPlanning() |
| offlineIndicator | hidden | Online/offline events |
| pendingQueueIndicator | hidden | updateQueueIndicator() |
| fieldCaptureSuccess | hidden | queueFieldCapture() |
| fieldCaptureUndo | hidden | showFieldCaptureUndoToast() |
| crisisStatusBanner | hidden | checkSentiment() |
| adAlertBanner | hidden | checkCompetitorAds() |
| addCompetitorCard | hidden | showAddCompetitor() |
| updateYourStatsCard | hidden | showUpdateYourStats() |
| sentimentResult | hidden | analyzeSingleSentiment() |
| hashtagSetsBody | hidden | toggleHashtagSets() |
| marketModal | hidden | openAddMarketModal() |
| scheduleReminderModal | hidden | openScheduleReminderModal() |
| shortcutsModal | hidden | showKeyboardShortcuts() |
| celebrationOverlay | hidden | showCelebration() |

### Mobile-Specific Visibility

```css
/* Mobile bottom nav - visible only on mobile */
.mobile-bottom-nav {
    display: none; /* Hidden on desktop */
}

@media (max-width: 768px) {
    .mobile-bottom-nav {
        display: flex; /* Visible on mobile */
    }
}
```

### Field Mode Toggle
```css
body.field-mode {
    /* High contrast mode for outdoor use */
    --bg-main: #000000;
    --text-primary: #ffffff;
    /* Increased contrast ratios */
}
```

---

## SECTION 7: BROKEN REFERENCES

### Potential Issues Identified

#### 1. Duplicate switchTab Definition
The file defines switchTab twice:
- Line ~9402: Original definition
- Line ~19163: Override that may conflict

```javascript
// Line 19163
const originalSwitchTab = switchTab;
switchTab = function(tabId) { ... }
```

This override stores the original but then redefines without calling originalSwitchTab().

#### 2. Missing Element IDs Referenced in JavaScript

These IDs are referenced but need verification in HTML:

| Element ID | Referenced In | Potential Issue |
|------------|---------------|-----------------|
| briefTemp | (check needed) | May be orphaned |
| replyText | insertQuickReply() | Needs verification |
| gridItem1-8 | updateGridDisplay() | Needs verification |
| newPostSlot | updateGridPreview() | Needs verification |

#### 3. Undefined Functions Called

| Function Call | Location | Issue |
|---------------|----------|-------|
| loadPaidAdsTab() | switchTab | Definition not found in read sections |
| loadUnifiedInbox() | switchTab | Definition not found in read sections |
| loadEvergreenLibraryEngage() | switchTab | Definition not found in read sections |
| loadTrainingCount() | switchTab | Definition not found in read sections |
| loadAutoPilotStatusForSettings() | switchTab | Definition not found in read sections |
| loadCampaigns() | (referenced) | May be alias/missing |

#### 4. API Actions Without Handlers

Some API actions defined in calls may not have corresponding backend handlers:
- `batchApprove`
- `batchSchedule`
- `autoGenerateWeekPlan`

#### 5. Event Handler References

```javascript
// Uses 'event' global without passing event parameter
event.target.closest('.tab-btn').classList.add('active');
```

This relies on the implicit `event` object which may not work in all browsers.

---

## SECTION 8: STATE OF EACH VISIBLE TAB

### 1. Brain Tab (Default/Home)
**Status: FUNCTIONAL**
- AI-powered marketing intelligence hub
- 5-3-2 content mix tracker (Curated/Original/Personal)
- Algorithm change alerts (2026 research-backed)
- Trending audio monitor
- Optimal posting time suggestions
- Voice learning engine
- Action queue (urgent/today tasks)
- Multi-account support (@tinyseedfarm, @tinyseedfleurs, @tinyseedfungi)
- Empty state: Shows "Loading..." then populates

### 2. Create Tab
**Status: FUNCTIONAL**
- Multi-mode creation (Photo, Video, Story, Reel, Carousel)
- AI caption generation with multiple AI providers
- Caption template system
- Character count with platform limits
- Image upload with preview
- Hashtag set manager (5 predefined sets)
- Instagram grid preview
- Draft saving
- Publishing to Instagram via Meta Graph API
- Empty state: Shows upload zone and form

### 3. Photos (farmpics) Tab
**Status: FUNCTIONAL**
- Photo gallery from Google Drive
- Upload new photos
- Select photos for posts
- Delete photos
- Photo detail modal
- Integration with content calendar
- Empty state: Shows "No photos uploaded yet"

### 4. Calendar (contentcalendar) Tab
**Status: FUNCTIONAL**
- 7-day week view
- Content pillar visualization (6 pillars)
- Gap detection algorithm
- Drag-and-drop post movement
- Post detail modal
- Week navigation (prev/next/today)
- Photo library sidebar
- Todd's notes input
- Sunday Planning Dashboard integration
- Empty state: Shows empty day slots

### 5. Growth Tab
**Status: FUNCTIONAL**
- Live follower counts from Instagram API
- Three Instagram accounts tracked
- Facebook page tracking
- TikTok tracking (manual)
- Threads estimate (30% of IG)
- Progress bars toward goals
- Competitor comparison
- Your Farm Stats section
- Auto-sync from Instagram API
- Monthly snapshot history
- Empty state: Shows "--" for missing data

### 6. Campaigns Tab
**Status: FUNCTIONAL**
- Campaign management
- Farmers Market Schedule Manager (4 default markets)
- Market countdown banner
- Add/Edit/Delete markets
- Schedule reminder posts
- Market day quick schedule
- Empty state: Shows "No campaigns"

### 7. Ads (paidads) Tab
**Status: FUNCTIONAL**
- Meta Ads campaign management
- Ad budget tracking
- Ad performance metrics
- Campaign creation
- Empty state: Shows "No active campaigns"

### 8. Analytics Tab
**Status: FUNCTIONAL**
- Analytics hub with multiple sections
- Revenue attribution tracking
- UTM tracking integration
- Performance metrics
- Engagement analytics
- Empty state: Shows loading spinner

### 9. Engage Tab
**Status: FUNCTIONAL**
- Unified inbox for all platforms
- Comments management
- Evergreen content library
- Quick reply templates (10 predefined)
- Sentiment analysis
- Crisis management section
- Empty state: Shows "No messages"

### 10. Settings Tab
**Status: FUNCTIONAL**
- API key configuration
  - OpenAI
  - Claude
  - Stability AI
  - Photoroom
- Instagram API connection
- Twilio SMS configuration
- Auto-pilot trigger setup
- Brand voice training
- Data export options
- API status indicators

---

## SECTION 9: ADDITIONAL OVERLAYS & MODALS

### Full-Screen Overlays

| Overlay ID | Lines | Purpose |
|------------|-------|---------|
| sundayPlanningOverlay | 20681-20770 | Week planning dashboard |
| fieldCaptureOverlay | 20844-20919 | Mobile photo capture |
| celebrationOverlay | 20808-20818 | Success celebration |
| shortcutsModal | 20772-20806 | Keyboard shortcuts help |

### Modal Systems

| Modal ID | Lines | Purpose |
|----------|-------|---------|
| marketModal | ~19391-19426 | Add/Edit farmers market |
| scheduleReminderModal | ~19497-19517 | Schedule market reminder |
| postDetailModal | ~12600 | View/edit scheduled post |
| photoDetailModal | ~11350 | View photo detail |
| metaAdsCampaignModal | ~9000 | Create Meta ad campaign |
| adBudgetModal | ~9100 | Set ad budget |
| followerCountModal | ~9200 | Manual follower entry |
| socialAPIModal | ~9300 | Social API configuration |
| utmBuilderModal | ~9400 | UTM parameter builder |

---

## SECTION 10: MOBILE INFRASTRUCTURE

### Mobile Navigation
```html
<nav class="mobile-bottom-nav">
    <button onclick="mobileNavSwitch('brain')">Brain</button>
    <button onclick="mobileNavSwitch('create')">Create</button>
    <button onclick="mobileNavSwitch('calendar')">Calendar</button>
    <button onclick="mobileNavSwitch('farmpics')">Pics</button>
    <button onclick="mobileNavSwitch('analytics')">Stats</button>
</nav>
```

### Field Mode Features
- High contrast mode for outdoor visibility
- Toggle button (sun/moon icon)
- Saved preference in localStorage
- Haptic feedback on interactions

### Field Capture System
- 2-tap photo capture
- Voice input for captions
- Auto-suggested captions (time/day/season based)
- Offline-first with queue
- Undo functionality
- Optimal posting time calculation

### Offline Support
- Online/offline event listeners
- Local storage queue for posts
- Automatic sync when back online
- Pending posts indicator

---

## SECTION 11: THIRD-PARTY INTEGRATIONS

### Instagram/Meta Graph API
- Publishing to 3 accounts
- Follower count retrieval
- Insights/analytics
- Token management

### AI Providers
- OpenAI (GPT) - Caption generation, analysis
- Claude (Anthropic) - Alternative AI provider
- Stability AI - Image generation
- Photoroom - Background removal

### Google Services
- Google Drive - Photo storage
- Google Sheets - Data backend
- Apps Script - API endpoints

### SMS/Notifications
- Twilio - SMS alerts
- Push notifications (future)

---

## SECTION 12: CONSTANTS & CONFIGURATION

### Hashtag Sets (Lines 19763-19786)
```javascript
const hashtagSets = {
    farmlife: 10 hashtags,
    pittsburgh: 10 hashtags,
    csa: 10 hashtags,
    seasonal: 8 hashtags,
    organic: 10 hashtags
};
```

### Default Farmers Markets (Lines 19195-19240)
```javascript
const defaultMarkets = [
    "Sewickley Saturday Farmer's Market",
    "Lawrenceville Tuesday Farmer's Market",
    "Bloomfield Saturday Farmer's Market",
    "Bryant St. Market (Highland Park)"
];
```

### Quick Reply Templates (Lines 20033-20044)
```javascript
const quickReplyTemplates = {
    thanks, market, dm, csa, question,
    order, availability, soldout,
    wholesale, directions
};
```

### Optimal Posting Times Logic (Lines 20459-20488)
- Before 7 AM: Schedule for 7 AM
- 7-12: Schedule for noon
- 12-18: Schedule for 6 PM
- 18-20: Schedule 1 hour later
- After 20: Schedule for 7 AM tomorrow

---

## SUMMARY

The Marketing Command Center is a comprehensive 20,950-line single-file application that serves as the marketing hub for Tiny Seed Farm. It features:

**Strengths:**
- Complete social media management for 3 Instagram accounts
- AI-powered content creation with multiple providers
- Mobile-first design with field mode
- Offline-first architecture
- Comprehensive analytics integration
- Well-organized tab structure with 10 visible tabs

**Areas of Concern:**
- File size (1.1MB) may impact load time
- Duplicate switchTab definition could cause issues
- Some functions referenced but not found in visible code
- Hidden tabs still have content panels (potential dead code)
- Heavy reliance on localStorage for some features

**Architecture:**
- Frontend: Single HTML file with embedded CSS and JavaScript
- Backend: Google Apps Script via api-config.js
- Storage: Google Sheets + localStorage
- APIs: Meta Graph API, OpenAI, Claude, Stability AI

This audit provides a complete foundation for understanding the system before making any further changes.
