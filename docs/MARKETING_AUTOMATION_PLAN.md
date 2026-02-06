# MARKETING AUTOMATION IMPLEMENTATION PLAN
## Tiny Seed Farm - Autonomous Social Media & Marketing System
## Created: 2026-02-04 by PM_Architect/Marketing_Claude

---

# EXECUTIVE SUMMARY

This document outlines a comprehensive plan to build a **self-updating, self-researching, proactive marketing system** that will autonomously manage social media, generate content, and drive sales with minimal human intervention.

**Core Philosophy:** The system should know goals and take action. If the owner forgets to post, the system should post anyway.

**Key Requirements (from owner):**
1. Posts go out automatically if forgotten
2. System knows goals and takes action
3. Photo requests sent to employees periodically
4. Rotation so not everyone is on phone at once

---

# PART 1: CURRENT STATE AUDIT

## 1.1 Marketing Command Center Features

**File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/marketing-command-center.html`
**Status:** WORKING (400+ KB, comprehensive)

| Tab | Feature | Status | Automation Level |
|-----|---------|--------|------------------|
| Brain | AI Command Center | WORKING | Semi-automated |
| Dashboard | Overview stats | WORKING | Real-time data |
| Field Mode | Quick posting | WORKING | Manual |
| Farm Pics | Photo gallery | WORKING | Manual approval |
| Campaigns | Campaign management | WORKING | Manual |
| Schedule | Post scheduling | WORKING | Manual scheduling |
| Connections | Social accounts | PARTIAL | Not all connected |
| Budget | Spend tracking | WORKING | Manual entry |
| Analytics | Performance | WORKING | API-dependent |
| Intelligence | AI insights | WORKING | Automated |
| Social Growth | Growth tips | WORKING | Static content |
| Brand Voice | Voice training | WORKING | AI-powered |
| Content Studio | AI generation | WORKING | AI-powered |
| Comments | Response management | WORKING | Semi-automated |
| Evergreen | Content library | WORKING | Manual curation |
| Crisis | Sentiment monitoring | WORKING | Automated detection |
| Settings | Configuration | WORKING | Manual |

## 1.2 Social Intelligence Features

**File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/social-intelligence.html`
**Status:** WORKING

| Feature | Status | Integration |
|---------|--------|-------------|
| Brain Tab | WORKING | Connected to API |
| Dashboard | WORKING | Real-time stats |
| Brand Voice Training | WORKING | AI-powered |
| Content Studio | WORKING | AI generation |
| Scheduler | WORKING | Manual scheduling |
| Comments Management | WORKING | With AI drafts |
| Evergreen Library | WORKING | Content recycling |
| Revenue Attribution | WORKING | Manual tracking |
| Competitor Watch | WORKING | Manual entry |
| Crisis Monitor | WORKING | Automated alerts |

## 1.3 What's Working vs Not Working

### Working Well:
- AI content generation (when OpenAI key configured)
- Brand voice training system
- Content scheduling interface
- Sentiment analysis
- Comment draft responses
- Crisis detection
- 5-3-2 content mix tracking

### Not Working / Missing:
- **No automatic posting** - Posts must be manually approved
- **No social API connections** - Instagram/Facebook not connected
- **No automated photo collection** - Manual uploads only
- **No employee rotation system** - No assignment logic
- **No goal-based autonomous action** - System waits for input

## 1.4 Integration Status

| Platform | API Status | Current Capability |
|----------|------------|-------------------|
| Instagram | NOT CONNECTED | None |
| Facebook | NOT CONNECTED | None |
| TikTok | NOT CONNECTED | None |
| OpenAI | PARTIAL | Content generation |
| Google Sheets | WORKING | Data storage |
| SMS (Twilio) | WORKING | Notifications |

---

# PART 2: AUTOMATED POSTING SYSTEM DESIGN

## 2.1 Goal-to-Action Planning Architecture

```
+------------------+     +--------------------+     +------------------+
|   GOAL ENGINE    |     |  CONTENT PLANNER   |     |  ACTION EXECUTOR |
|                  | --> |                    | --> |                  |
| - Weekly targets |     | - Content calendar |     | - Auto-post      |
| - Platform mix   |     | - Optimal times    |     | - Photo requests |
| - Content ratios |     | - Content type     |     | - Notifications  |
+------------------+     +--------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+------------------------------------------------------------------------+
|                    GOOGLE SHEETS DATA STORE                             |
| SOCIAL_Goals | SOCIAL_Calendar | SOCIAL_Queue | SOCIAL_PhotoRequests  |
+------------------------------------------------------------------------+
```

## 2.2 Weekly Goal Configuration

```javascript
// Goal configuration stored in SOCIAL_Goals sheet
const weeklyGoals = {
  totalPosts: 10,                    // 10 posts per week
  platforms: {
    instagram: { posts: 7, stories: 14 },
    facebook: { posts: 5 },
    tiktok: { posts: 3 }
  },
  contentMix: {                      // 5-3-2 rule
    curated: 5,                      // Shared/industry content
    original: 3,                     // Farm original content
    personal: 2                      // Fun/personal content
  },
  accounts: {
    '@tinyseedfarm': { posts: 5 },
    '@tinyseedfleurs': { posts: 3 },
    '@tinyseedfungi': { posts: 2 }
  }
};
```

## 2.3 Autonomous Posting Logic

```javascript
// Runs daily at 7 AM
function dailyPostingCheck() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Get today's scheduled posts
  const todayPosts = getScheduledPosts(today);

  // Check if any are missing (gaps in schedule)
  const gaps = findScheduleGaps(today);

  if (gaps.length > 0) {
    // AUTONOMOUS ACTION: Fill gaps from queue
    gaps.forEach(gap => {
      const post = getNextFromQueue(gap.platform, gap.contentType);
      if (post) {
        schedulePost(post, gap.time);
        notifyOwner(`Auto-scheduled: "${post.caption.substring(0,50)}..." for ${gap.time}`);
      } else {
        // No content available - request from team
        requestContentFromTeam(gap);
      }
    });
  }

  // Check if any posts should go out NOW
  const dueNow = todayPosts.filter(p => isDue(p));
  dueNow.forEach(post => {
    if (post.approved) {
      publishPost(post);  // Via Later/Buffer API
    } else if (post.autoApprove) {
      publishPost(post);  // Auto-approve enabled
      notifyOwner(`Auto-published: "${post.caption.substring(0,50)}..."`);
    } else {
      // Needs approval - send reminder
      sendApprovalReminder(post);
    }
  });
}
```

## 2.4 Fallback Content System

```javascript
// If no content scheduled and queue empty
function emergencyContentFallback() {
  // Priority 1: Recycle evergreen content
  const evergreen = getOldestUnusedEvergreen();
  if (evergreen && daysSinceLastUse(evergreen) > 90) {
    return refreshAndSchedule(evergreen);
  }

  // Priority 2: Generate AI content
  const aiContent = generateEmergencyPost({
    type: 'seasonal_update',
    tone: 'casual',
    keywords: getCurrentSeasonalKeywords()
  });

  // Priority 3: Photo-only post with generic caption
  const lastPhoto = getMostRecentApprovedPhoto();
  if (lastPhoto) {
    return {
      image: lastPhoto,
      caption: generateQuickCaption(lastPhoto.category)
    };
  }

  // Priority 4: Alert owner - posting will be missed
  createUrgentAlert('No content available for scheduled post!');
}
```

---

# PART 3: EMPLOYEE PHOTO REQUEST ROTATION SYSTEM

## 3.1 System Design

**Goal:** Get fresh farm photos from employees on rotation without overwhelming anyone

```
+------------------+     +------------------+     +------------------+
|  EMPLOYEE ROSTER |     | ROTATION ENGINE  |     |  REQUEST SENDER  |
|                  | --> |                  | --> |                  |
| - Name, phone    |     | - Fair rotation  |     | - SMS request    |
| - Shift schedule |     | - Skip if busy   |     | - In-app notify  |
| - Photo skill    |     | - Track response |     | - Follow-up      |
+------------------+     +------------------+     +------------------+
```

## 3.2 Rotation Logic

```javascript
// Configuration
const rotationConfig = {
  requestFrequency: 'daily',           // One request per day
  maxRequestsPerWeek: 2,               // Max 2 requests per employee per week
  skipIfWorking: true,                 // Don't request if on shift
  followUpHours: 4,                    // Send reminder after 4 hours
  rewardPoints: 5                      // Points for submitting photo
};

// Daily at 10 AM
function dailyPhotoRequest() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Get eligible employees
  const employees = getActiveEmployees();
  const eligibleToday = employees.filter(emp => {
    return !isOnShift(emp, today) &&
           getWeeklyRequestCount(emp) < rotationConfig.maxRequestsPerWeek &&
           lastRequestDaysAgo(emp) >= 2;  // At least 2 days between requests
  });

  if (eligibleToday.length === 0) {
    // Everyone has been asked recently
    return;
  }

  // Select next in rotation (round-robin)
  const nextEmployee = getNextInRotation(eligibleToday);

  // Determine what type of photo we need
  const photoNeed = determinePhotoNeed();

  // Send request
  sendPhotoRequest(nextEmployee, photoNeed);

  // Log request
  logPhotoRequest(nextEmployee.id, photoNeed, today);
}

function determinePhotoNeed() {
  const contentCalendar = getUpcomingCalendar(7);  // Next 7 days
  const photoInventory = getPhotoInventory();

  // Check what categories are low
  const needs = {
    harvest: countAvailable('harvest') < 5,
    flowers: countAvailable('flowers') < 3,
    behind_scenes: countAvailable('behind_scenes') < 3,
    team: countAvailable('team') < 2,
    fields: countAvailable('fields') < 2
  };

  // Find most urgent need
  const urgent = Object.keys(needs).find(k => needs[k]);

  return {
    category: urgent || 'any',
    suggestions: getPhotoSuggestions(urgent),
    deadline: 'end of shift'
  };
}
```

## 3.3 SMS Request Template

```javascript
function sendPhotoRequest(employee, need) {
  const messages = {
    harvest: `Hey ${employee.firstName}! We need a fresh harvest photo today. Snap something beautiful from the field when you get a chance. Just reply to this text with the photo!`,

    flowers: `Hi ${employee.firstName}! The flower account needs content. Can you grab a quick photo of the prettiest blooms today? Reply with pic when ready.`,

    behind_scenes: `${employee.firstName} - would love a behind-the-scenes shot today! Show our followers what farm life really looks like. Reply with photo whenever.`,

    team: `Team photo time ${employee.firstName}! If you're working with others today, snap a quick team pic. Our followers love seeing the crew!`,

    any: `Hey ${employee.firstName}! Quick ask - can you snap something cool from the farm today? Harvest, flowers, views, anything works. Reply with photo!`
  };

  const message = messages[need.category];

  sendSMS(employee.phone, message);

  // Schedule follow-up
  scheduleFollowUp(employee.id, 4);  // 4 hours later
}
```

## 3.4 Photo Submission Flow

```javascript
// When employee texts back with photo
function handlePhotoSubmission(fromPhone, mediaUrl) {
  const employee = findEmployeeByPhone(fromPhone);

  // Download and store photo
  const photoId = storePhoto(mediaUrl, {
    submittedBy: employee.id,
    submittedAt: new Date(),
    status: 'pending_review',
    source: 'employee_request'
  });

  // Auto-categorize with AI
  const category = categorizePhoto(mediaUrl);
  updatePhotoCategory(photoId, category);

  // Thank the employee
  sendSMS(fromPhone, `Thanks ${employee.firstName}! Photo received and added to the queue. You earned 5 points!`);

  // Award points
  awardPoints(employee.id, 5, 'photo_submission');

  // Notify marketing for approval
  createPhotoApprovalTask(photoId);
}
```

## 3.5 Rotation Fairness Tracking

| Employee | This Week | Last Week | Total | Last Request |
|----------|-----------|-----------|-------|--------------|
| Maria | 1 | 2 | 45 | Feb 2 |
| James | 2 | 1 | 38 | Feb 3 |
| Sarah | 0 | 2 | 42 | Jan 31 |
| Carlos | 1 | 1 | 36 | Feb 1 |

---

# PART 4: SOCIAL MEDIA INTEGRATION

## 4.1 Platform Connection Strategy

Since direct API access to Instagram/Facebook for posting requires Business API approval, we recommend using a scheduling tool as middleware.

### Recommended Tools (based on [2026 research](https://www.eclincher.com/articles/10-best-social-media-automation-tools-for-2026)):

| Tool | Cost | Instagram | Facebook | TikTok | Auto-Post |
|------|------|-----------|----------|--------|-----------|
| **Later** | $25/mo | Yes | Yes | Yes | Yes |
| **Buffer** | $15/mo | Yes | Yes | No | Yes |
| **Hootsuite** | $49/mo | Yes | Yes | Yes | Yes |
| **SocialBee** | $29/mo | Yes | Yes | Yes | Yes |

### Integration Architecture

```
Tiny Seed OS                    Scheduling Tool              Social Platforms
+---------------+              +---------------+             +---------------+
| Content Queue | -- API -->   | Later/Buffer  | -- Auto --> | Instagram     |
| (Our System)  |              | (Middleware)  |             | Facebook      |
+---------------+              +---------------+             | TikTok        |
       |                              |                      +---------------+
       |                              v
       |                       +---------------+
       +-- Webhook <---------  | Analytics    |
           (Performance data)  +---------------+
```

## 4.2 Later API Integration

```javascript
// Post to Later via API
async function scheduleToLater(post) {
  const laterApiKey = getScriptProperty('LATER_API_KEY');

  const payload = {
    media_url: post.imageUrl,
    caption: post.caption,
    scheduled_time: post.scheduledTime,
    platforms: post.platforms,  // ['instagram', 'facebook']
    auto_publish: true
  };

  const response = await fetch('https://api.later.com/v1/media', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${laterApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return await response.json();
}
```

## 4.3 Analytics Collection

```javascript
// Daily at 11 PM - collect performance data
async function collectSocialAnalytics() {
  const platforms = ['instagram', 'facebook', 'tiktok'];

  for (const platform of platforms) {
    const analytics = await fetchPlatformAnalytics(platform);

    // Store metrics
    analytics.posts.forEach(post => {
      updatePostMetrics(post.id, {
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        reach: post.reach,
        engagement_rate: post.engagement_rate
      });
    });

    // Update overall platform metrics
    updatePlatformMetrics(platform, {
      followers: analytics.followers,
      follower_growth: analytics.follower_growth,
      avg_engagement: analytics.avg_engagement
    });
  }

  // Identify top performers for evergreen
  const topPosts = getTopPerformers(7);  // Last 7 days
  topPosts.forEach(post => {
    if (post.engagement_rate > 5) {
      addToEvergreenSuggestions(post);
    }
  });
}
```

---

# PART 5: CONTENT CALENDAR AUTOMATION

## 5.1 Weekly Planning Algorithm

```javascript
// Runs every Sunday at 6 PM
function generateWeeklyContentCalendar() {
  const startDate = getNextMonday();
  const goals = getWeeklyGoals();
  const calendar = [];

  // For each day of the week
  for (let day = 0; day < 7; day++) {
    const date = addDays(startDate, day);
    const dayPlan = {
      date: date,
      posts: []
    };

    // Determine optimal posting times for this day
    const optimalTimes = getOptimalTimes(date.getDay());

    // Get content needs based on 5-3-2 rule
    const contentNeeds = calculateDailyContentNeeds(day, goals);

    // Fill each time slot
    optimalTimes.forEach((time, i) => {
      if (i < contentNeeds.total) {
        const contentType = contentNeeds.types[i];
        const platform = getBestPlatformForTime(time);

        // Try to find existing content
        let content = findQueuedContent(contentType, platform);

        if (!content) {
          // Generate AI content
          content = generateAIContent({
            type: contentType,
            platform: platform,
            date: date,
            context: getSeasonalContext()
          });
        }

        dayPlan.posts.push({
          time: time,
          platform: platform,
          contentType: contentType,
          content: content,
          status: 'scheduled',
          autoApprove: contentType === 'curated'  // Auto-approve curated
        });
      }
    });

    calendar.push(dayPlan);
  }

  // Store calendar
  saveContentCalendar(calendar);

  // Notify owner
  notifyOwner(`Weekly content calendar generated: ${calendar.reduce((a,d) => a + d.posts.length, 0)} posts scheduled`);

  return calendar;
}
```

## 5.2 Content Type Definitions

| Type | Description | Sources | Auto-Approve |
|------|-------------|---------|--------------|
| **Curated (50%)** | Industry articles, recipes, tips | RSS feeds, saved content | Yes |
| **Original (30%)** | Farm photos, harvest updates | Employee photos, inventory | Review |
| **Personal (20%)** | Team moments, fun content | Employee submissions | Review |

## 5.3 Seasonal Content Calendar

```javascript
const seasonalThemes = {
  february: {
    themes: ['Valentine flowers', 'Winter storage crops', 'CSA signup'],
    holidays: ['Valentines Day (14)', 'Presidents Day'],
    crops: ['storage vegetables', 'early greens', 'flower pre-orders'],
    hashtags: ['#ValentinesFlowers', '#WinterFarming', '#CSASignup']
  },
  march: {
    themes: ['Spring planting', 'CSA launch', 'Seed starting'],
    holidays: ['St Patricks Day', 'Spring Equinox'],
    crops: ['early greens', 'spinach', 'microgreens'],
    hashtags: ['#SpringPlanting', '#SeedStarting', '#LocalFood']
  }
  // ... etc for each month
};
```

---

# PART 6: IMPLEMENTATION PHASES

## Phase 1: Core Automation (Weeks 1-3)

### Week 1: Scheduling Tool Integration

| Task | Priority | Owner |
|------|----------|-------|
| Select and subscribe to Later or Buffer | HIGH | Owner |
| Get API credentials | HIGH | Owner |
| Build API integration in Apps Script | HIGH | Backend_Claude |
| Connect Instagram business account | HIGH | Owner |
| Connect Facebook page | HIGH | Owner |

### Week 2: Autonomous Posting

| Task | Priority | Owner |
|------|----------|-------|
| Build content queue system | HIGH | Backend_Claude |
| Create auto-scheduling trigger | HIGH | Backend_Claude |
| Build fallback content system | HIGH | Backend_Claude |
| Connect to marketing dashboard | HIGH | Desktop_Claude |

### Week 3: Photo Request System

| Task | Priority | Owner |
|------|----------|-------|
| Build employee rotation system | HIGH | Backend_Claude |
| Create SMS request templates | HIGH | Backend_Claude |
| Build photo submission handler | HIGH | Backend_Claude |
| Create approval workflow | MEDIUM | Backend_Claude |

## Phase 2: Intelligence Layer (Weeks 4-6)

### Week 4: Analytics Integration

| Task | Priority | Owner |
|------|----------|-------|
| Build analytics collector | HIGH | Backend_Claude |
| Create performance dashboard | HIGH | Desktop_Claude |
| Build top performer detection | MEDIUM | Backend_Claude |
| Auto-add to evergreen suggestions | MEDIUM | Backend_Claude |

### Week 5: Content Calendar AI

| Task | Priority | Owner |
|------|----------|-------|
| Build weekly calendar generator | HIGH | Backend_Claude |
| Implement 5-3-2 rule automation | HIGH | Backend_Claude |
| Create seasonal theme system | MEDIUM | Backend_Claude |
| Build content gap detection | MEDIUM | Backend_Claude |

### Week 6: Brand Voice Enhancement

| Task | Priority | Owner |
|------|----------|-------|
| Improve voice matching algorithm | MEDIUM | Backend_Claude |
| Add platform-specific tone adjustment | MEDIUM | Backend_Claude |
| Create voice quality scoring | LOW | Backend_Claude |

## Phase 3: Advanced Features (Weeks 7-9)

### Week 7: Multi-Account Management

| Task | Priority | Owner |
|------|----------|-------|
| Build account-specific queues | HIGH | Backend_Claude |
| Create cross-post detection | MEDIUM | Backend_Claude |
| Implement account rotation | MEDIUM | Backend_Claude |

### Week 8: Engagement Automation

| Task | Priority | Owner |
|------|----------|-------|
| Build comment response queue | HIGH | Backend_Claude |
| Create AI response suggestions | HIGH | Backend_Claude |
| Implement response time tracking | MEDIUM | Backend_Claude |

### Week 9: Revenue Attribution

| Task | Priority | Owner |
|------|----------|-------|
| Build UTM tracking system | HIGH | Backend_Claude |
| Create Shopify integration | HIGH | Backend_Claude |
| Build attribution dashboard | MEDIUM | Desktop_Claude |

## Phase 4: Optimization (Weeks 10-12)

### Week 10: A/B Testing

| Task | Priority | Owner |
|------|----------|-------|
| Build caption A/B testing | MEDIUM | Backend_Claude |
| Create time optimization learning | MEDIUM | Backend_Claude |
| Implement hashtag testing | LOW | Backend_Claude |

### Week 11: Competitor Intelligence

| Task | Priority | Owner |
|------|----------|-------|
| Build competitor content tracker | MEDIUM | Backend_Claude |
| Create trend detection | MEDIUM | Backend_Claude |
| Implement opportunity alerts | LOW | Backend_Claude |

### Week 12: Full Autonomy

| Task | Priority | Owner |
|------|----------|-------|
| Enable full auto-approve mode | HIGH | Owner decision |
| Create owner override system | HIGH | Backend_Claude |
| Build emergency stop mechanism | HIGH | Backend_Claude |
| Complete documentation | MEDIUM | PM_Architect |

---

# PART 7: GOOGLE SHEETS DATA MODEL

## 7.1 New Sheets Required

### SOCIAL_Goals
| Column | Type | Description |
|--------|------|-------------|
| week_start | Date | Week starting date |
| total_posts | Number | Target posts for week |
| instagram_posts | Number | Instagram target |
| facebook_posts | Number | Facebook target |
| curated_target | Number | 5-3-2 curated |
| original_target | Number | 5-3-2 original |
| personal_target | Number | 5-3-2 personal |

### SOCIAL_Queue
| Column | Type | Description |
|--------|------|-------------|
| queue_id | String | Unique ID |
| content | String | Post content |
| image_url | String | Image URL |
| content_type | String | curated/original/personal |
| platform | String | Target platform |
| priority | Number | 1-10 priority |
| status | String | queued/scheduled/posted |
| created_by | String | Creator |
| created_at | DateTime | Creation time |

### SOCIAL_PhotoRequests
| Column | Type | Description |
|--------|------|-------------|
| request_id | String | Unique ID |
| employee_id | String | Employee ID |
| category | String | Photo category needed |
| sent_at | DateTime | Request sent time |
| response_at | DateTime | Photo received time |
| status | String | pending/received/no_response |
| photo_id | String | Resulting photo ID |

### SOCIAL_EmployeeRotation
| Column | Type | Description |
|--------|------|-------------|
| employee_id | String | Employee ID |
| name | String | Name |
| phone | String | Phone number |
| last_request | DateTime | Last photo request |
| requests_this_week | Number | Count this week |
| total_submissions | Number | Total photos submitted |
| response_rate | Number | % of requests answered |

---

# PART 8: NOTIFICATION SYSTEM

## 8.1 Owner Notifications

| Event | Channel | Urgency |
|-------|---------|---------|
| Weekly calendar generated | Dashboard | Low |
| Post auto-published | Dashboard | Low |
| Content gap detected | SMS + Dashboard | Medium |
| No content available | SMS | High |
| Negative comment detected | SMS | High |
| Crisis sentiment | SMS + Call | Critical |

## 8.2 Employee Notifications

| Event | Channel | Template |
|-------|---------|----------|
| Photo request | SMS | "Hey {name}! We need a {category} photo today..." |
| Request reminder | SMS | "Quick reminder - still need that {category} photo!" |
| Photo approved | SMS | "Your photo was approved and posted!" |
| Points earned | In-app | "You earned {points} points for your photo!" |

## 8.3 Notification Templates

```javascript
const notificationTemplates = {
  photo_request_harvest: "Hey {firstName}! We need a fresh harvest photo today. Snap something beautiful from the field when you get a chance.",

  photo_request_flowers: "Hi {firstName}! The flower account needs content. Can you grab a quick photo of the prettiest blooms today?",

  photo_request_reminder: "Quick reminder {firstName} - still need that {category} photo if you get a chance!",

  photo_approved: "Nice shot {firstName}! Your {category} photo was approved and will be posted soon. +5 points!",

  content_gap_alert: "Content gap detected: No posts scheduled for {date}. Queue is empty. Action needed.",

  auto_post_notification: "Auto-posted to {platform}: '{captionPreview}...' at {time}",

  crisis_alert: "URGENT: Negative sentiment spike detected on {platform}. {details}. All posts paused."
};
```

---

# PART 9: SUCCESS METRICS

## 9.1 Automation KPIs

| Metric | Current | 30-Day Target | 90-Day Target |
|--------|---------|---------------|---------------|
| Posts per week | Manual ~3 | 10 (automated) | 15 (automated) |
| Content gaps | Unknown | <2/week | 0/week |
| Auto-publish rate | 0% | 50% | 80% |
| Photo response rate | N/A | 60% | 80% |
| Calendar fill rate | 0% | 80% | 100% |

## 9.2 Engagement KPIs

| Metric | Target |
|--------|--------|
| Average engagement rate | >3% |
| Comment response time | <4 hours |
| Follower growth rate | +5%/month |
| Content quality score | >4.0/5.0 |

## 9.3 Revenue KPIs

| Metric | Target |
|--------|--------|
| Social-attributed sales | Track all |
| UTM tracking coverage | 100% |
| Conversion rate from social | >2% |
| Cost per acquisition | <$5 |

---

# PART 10: AUTONOMY LEVELS

## 10.1 Autonomy Settings

The system should support multiple autonomy levels that the owner can configure:

| Level | Description | Auto-Actions |
|-------|-------------|--------------|
| **Manual** | Human approves everything | None |
| **Assisted** | AI suggests, human approves | Suggestions only |
| **Supervised** | AI acts, human can override | Acts with notification |
| **Autonomous** | AI acts independently | Full automation |
| **Emergency** | All posting paused | Nothing posts |

## 10.2 Default Autonomy by Content Type

| Content Type | Default Level | Override Allowed |
|--------------|---------------|------------------|
| Curated/Shared | Autonomous | Yes |
| Evergreen Recycle | Supervised | Yes |
| AI-Generated | Assisted | Yes |
| Employee Photos | Supervised | Yes |
| Original Content | Manual | Yes |
| Crisis Response | Manual | No |

## 10.3 Autonomy Control Interface

```javascript
// Dashboard controls
const autonomyControls = {
  // Global pause button
  emergencyStop: {
    action: 'pause_all_posts',
    confirmation: true,
    reversible: true
  },

  // Resume posting
  resumePosting: {
    action: 'resume_posts',
    confirmation: true
  },

  // Adjust autonomy level
  setAutonomyLevel: {
    options: ['manual', 'assisted', 'supervised', 'autonomous'],
    perContentType: true
  },

  // Override specific post
  overridePost: {
    options: ['approve', 'edit', 'delete', 'reschedule']
  }
};
```

---

# PART 11: CRISIS MANAGEMENT

## 11.1 Automatic Crisis Detection

```javascript
function detectCrisis() {
  const recentComments = getRecentComments(24);  // Last 24 hours
  const sentimentScores = recentComments.map(c => analyzeSentiment(c.text));

  const avgSentiment = average(sentimentScores);
  const negativeCount = sentimentScores.filter(s => s < -0.3).length;

  if (avgSentiment < -0.5 || negativeCount > 5) {
    return {
      isCrisis: true,
      severity: avgSentiment < -0.7 ? 'critical' : 'warning',
      triggers: recentComments.filter(c => c.sentiment < -0.3),
      recommendation: 'Pause all scheduled posts and review'
    };
  }

  return { isCrisis: false };
}
```

## 11.2 Crisis Response Actions

| Severity | Automatic Actions |
|----------|-------------------|
| Warning | Notify owner, flag for review |
| Critical | Pause all posts, SMS owner, show crisis banner |
| Resolved | Resume posts, log incident, generate report |

---

# APPENDIX A: RESEARCH SOURCES

## Social Media Automation Tools
- [10 Best Social Media Automation Tools 2026](https://www.eclincher.com/articles/10-best-social-media-automation-tools-for-2026)
- [12 Best Tools - Pros & Cons](https://adamconnell.me/social-media-automation-tools/)
- [Hootsuite Overview](https://www.hootsuite.com/)
- [SocialPilot Features](https://www.socialpilot.co/social-media-automation-tools)
- [Sprout Social Tools](https://sproutsocial.com/insights/social-media-automation-tools/)

## Content Strategy
- [5-3-2 Content Rule](https://www.socialmediaexaminer.com/the-5-3-2-principle-for-social-media-success/)
- [Content Calendar Best Practices](https://buffer.com/library/social-media-content-calendar/)

---

# APPENDIX B: API ENDPOINTS NEEDED

## New Apps Script Functions

```javascript
// Core Automation
function dailyPostingCheck()           // Daily trigger for posting
function generateWeeklyCalendar()      // Weekly calendar generation
function processPhotoSubmission()      // Handle employee photos
function collectSocialAnalytics()      // Daily analytics collection

// Photo Rotation
function dailyPhotoRequest()           // Send photo requests
function handlePhotoSMS()              // Process incoming photos
function sendPhotoReminder()           // Follow-up reminders

// Content Management
function scheduleToLater()             // Post via Later API
function getNextFromQueue()            // Get queued content
function addToQueue()                  // Add to content queue
function recycleEvergreenPost()        // Recycle old content

// Analytics
function fetchPlatformAnalytics()      // Get platform data
function updatePostMetrics()           // Store performance
function identifyTopPerformers()       // Find best posts

// Crisis
function detectCrisis()                // Sentiment monitoring
function pauseAllPosts()               // Emergency stop
function resumePosts()                 // Resume posting
```

---

**Document Status:** Ready for Implementation
**Next Action:** Select scheduling tool (Later recommended), then begin Phase 1
**Estimated ROI:** 10x time savings, 200%+ increase in posting consistency

---

*This document was created by PM_Architect/Marketing_Claude during the overnight sprint on 2026-02-04.*
