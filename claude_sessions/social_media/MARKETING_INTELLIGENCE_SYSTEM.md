# TINY SEED FARM: Marketing Intelligence System
## State-of-the-Art Marketing Machine Architecture

**Version:** 1.0
**Created:** 2026-01-17
**Status:** MASTER BLUEPRINT

---

## EXECUTIVE SUMMARY

This document outlines a **fully-owned, zero-subscription, AI-powered marketing system** that will:

1. **Replace Ayrshare** ($1,200/year saved) - Direct Instagram Graph API for 3 accounts
2. **Predict customer behavior** - CLV, churn risk, next best action
3. **Automate intelligently** - Right message, right channel, right time
4. **Attribute everything** - Know exactly which campaigns drive revenue
5. **Own all data** - No platform lock-in, complete control

**Total Annual Savings:** ~$2,000+ vs paid platforms
**Expected ROI Improvement:** 30-50% through intelligent targeting

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TINY SEED MARKETING INTELLIGENCE SYSTEM                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA LAYER                                    │   │
│  │                                                                      │   │
│  │   [Shopify]──────┐                                                  │   │
│  │   [Instagram x3]─┤                                                  │   │
│  │   [Twilio SMS]───┼────► [Google Sheets Database] ◄────[Web Forms]  │   │
│  │   [Email Opens]──┤              │                                   │   │
│  │   [Website]──────┘              │                                   │   │
│  │                                 ▼                                    │   │
│  │                    ┌────────────────────────┐                       │   │
│  │                    │   UNIFIED CUSTOMER     │                       │   │
│  │                    │   PROFILE DATABASE     │                       │   │
│  │                    │   ─────────────────    │                       │   │
│  │                    │   • Customer ID        │                       │   │
│  │                    │   • All touchpoints    │                       │   │
│  │                    │   • Purchase history   │                       │   │
│  │                    │   • Engagement scores  │                       │   │
│  │                    │   • Predicted values   │                       │   │
│  │                    └────────────────────────┘                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INTELLIGENCE LAYER                               │   │
│  │                                                                      │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │   │  CUSTOMER    │  │    CHURN     │  │   OPTIMAL    │             │   │
│  │   │  LIFETIME    │  │  PREDICTION  │  │  SEND TIME   │             │   │
│  │   │   VALUE      │  │   ENGINE     │  │  CALCULATOR  │             │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │           │                │                  │                      │   │
│  │           └────────────────┼──────────────────┘                      │   │
│  │                            ▼                                         │   │
│  │              ┌──────────────────────────┐                           │   │
│  │              │    NEXT BEST ACTION      │                           │   │
│  │              │    RECOMMENDATION        │                           │   │
│  │              │    ENGINE                │                           │   │
│  │              └──────────────────────────┘                           │   │
│  │                            │                                         │   │
│  │              ┌─────────────┼─────────────┐                          │   │
│  │              ▼             ▼             ▼                          │   │
│  │         [SEGMENT]    [CONTENT]    [TIMING]                         │   │
│  │         Who to       What to      When to                          │   │
│  │         target       send         send                              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ACTIVATION LAYER                                │   │
│  │                                                                      │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │   │  INSTAGRAM   │  │   SHOPIFY    │  │   TWILIO     │             │   │
│  │   │  GRAPH API   │  │    EMAIL     │  │    SMS       │             │   │
│  │   │  (3 accounts)│  │  MARKETING   │  │  CAMPAIGNS   │             │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │          │                 │                  │                      │   │
│  │          ▼                 ▼                  ▼                      │   │
│  │   • Feed posts      • Welcome series   • Order alerts              │   │
│  │   • Reels           • Win-back flows   • Pickup reminders          │   │
│  │   • Stories         • CSA nurture      • Flash sale blasts         │   │
│  │   • Carousels       • Newsletters      • Win-back messages         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MEASUREMENT LAYER                                 │   │
│  │                                                                      │   │
│  │   [Attribution Tracking] ──► [Performance Dashboard] ──► [Reports] │   │
│  │                                                                      │   │
│  │   • Time-decay attribution across all channels                      │   │
│  │   • Revenue per channel/campaign                                    │   │
│  │   • Customer acquisition cost by source                             │   │
│  │   • Predicted vs actual performance                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## COMPONENT 1: INSTAGRAM GRAPH API INTEGRATION

### Why Direct API vs Ayrshare

| Feature | Ayrshare | Direct API |
|---------|----------|------------|
| Cost | $1,200/year (3 accounts) | $0 |
| Post to 3 accounts | Yes | Yes |
| Photos | Yes | Yes |
| Reels | Yes | Yes |
| Stories | Yes | Yes |
| Carousels | Yes | Yes |
| Analytics | Yes | Yes |
| Rate limits | Their limits | 200 req/hr/account |
| Data ownership | Theirs | Yours |

### Requirements

1. **Instagram Professional Accounts** (Business or Creator) - Already have
2. **Facebook Pages** - One per Instagram account
3. **Meta Developer App** - Free to create
4. **Access Tokens** - Long-lived (60 days, auto-refresh)

### Implementation

```javascript
// INSTAGRAM INTEGRATION - Add to MERGED TOTAL.js

const INSTAGRAM_CONFIG = {
  accounts: [
    {
      name: 'Tiny Seed Farm',
      igUserId: 'IG_USER_ID_1',
      accessToken: 'STORED_IN_PROPERTIES',
      fbPageId: 'FB_PAGE_ID_1'
    },
    {
      name: 'Tiny Seed Energy',
      igUserId: 'IG_USER_ID_2',
      accessToken: 'STORED_IN_PROPERTIES',
      fbPageId: 'FB_PAGE_ID_2'
    },
    {
      name: 'Tiny Seed Market',
      igUserId: 'IG_USER_ID_3',
      accessToken: 'STORED_IN_PROPERTIES',
      fbPageId: 'FB_PAGE_ID_3'
    }
  ],
  apiVersion: 'v21.0',
  baseUrl: 'https://graph.facebook.com'
};

// Post to Instagram
function postToInstagram(accountIndex, mediaType, content) {
  const account = INSTAGRAM_CONFIG.accounts[accountIndex];
  const token = PropertiesService.getScriptProperties().getProperty(`ig_token_${accountIndex}`);

  // Step 1: Create media container
  let containerPayload = {
    access_token: token
  };

  if (mediaType === 'IMAGE') {
    containerPayload.image_url = content.imageUrl;
    containerPayload.caption = content.caption;
  } else if (mediaType === 'REELS') {
    containerPayload.video_url = content.videoUrl;
    containerPayload.media_type = 'REELS';
    containerPayload.caption = content.caption;
  } else if (mediaType === 'STORIES') {
    containerPayload.image_url = content.imageUrl;
    containerPayload.media_type = 'STORIES';
  }

  const containerUrl = `${INSTAGRAM_CONFIG.baseUrl}/${INSTAGRAM_CONFIG.apiVersion}/${account.igUserId}/media`;
  const containerResponse = UrlFetchApp.fetch(containerUrl, {
    method: 'POST',
    payload: containerPayload
  });

  const containerId = JSON.parse(containerResponse.getContentText()).id;

  // Step 2: Wait for processing (videos only)
  if (mediaType === 'REELS') {
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status !== 'FINISHED' && attempts < 30) {
      Utilities.sleep(5000);
      const statusUrl = `${INSTAGRAM_CONFIG.baseUrl}/${INSTAGRAM_CONFIG.apiVersion}/${containerId}?fields=status_code&access_token=${token}`;
      const statusResponse = UrlFetchApp.fetch(statusUrl);
      status = JSON.parse(statusResponse.getContentText()).status_code;
      attempts++;
      if (status === 'ERROR') throw new Error('Video processing failed');
    }
  }

  // Step 3: Publish
  const publishUrl = `${INSTAGRAM_CONFIG.baseUrl}/${INSTAGRAM_CONFIG.apiVersion}/${account.igUserId}/media_publish`;
  const publishResponse = UrlFetchApp.fetch(publishUrl, {
    method: 'POST',
    payload: {
      creation_id: containerId,
      access_token: token
    }
  });

  const result = JSON.parse(publishResponse.getContentText());

  // Log to history
  logSocialPost(account.name, mediaType, content.caption, result.id);

  return { success: true, mediaId: result.id, account: account.name };
}

// Get Instagram Insights
function getInstagramInsights(accountIndex, period = 'day') {
  const account = INSTAGRAM_CONFIG.accounts[accountIndex];
  const token = PropertiesService.getScriptProperties().getProperty(`ig_token_${accountIndex}`);

  const url = `${INSTAGRAM_CONFIG.baseUrl}/${INSTAGRAM_CONFIG.apiVersion}/${account.igUserId}/insights?metric=impressions,reach,follower_count&period=${period}&access_token=${token}`;

  const response = UrlFetchApp.fetch(url);
  return JSON.parse(response.getContentText());
}

// Refresh token (call every 50 days via trigger)
function refreshInstagramTokens() {
  const appId = PropertiesService.getScriptProperties().getProperty('meta_app_id');
  const appSecret = PropertiesService.getScriptProperties().getProperty('meta_app_secret');

  for (let i = 0; i < INSTAGRAM_CONFIG.accounts.length; i++) {
    const currentToken = PropertiesService.getScriptProperties().getProperty(`ig_token_${i}`);
    const url = `${INSTAGRAM_CONFIG.baseUrl}/${INSTAGRAM_CONFIG.apiVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;

    const response = UrlFetchApp.fetch(url);
    const newToken = JSON.parse(response.getContentText()).access_token;

    PropertiesService.getScriptProperties().setProperty(`ig_token_${i}`, newToken);
  }

  return { success: true, message: 'All tokens refreshed' };
}
```

### Setup Steps

1. **Create Meta Developer App**
   - Go to developers.facebook.com
   - Create new app → Business type
   - Add "Instagram Graph API" product

2. **Connect Instagram Accounts**
   - Each IG account → Settings → Linked Accounts → Facebook
   - Link to respective Facebook Page

3. **Get Access Tokens**
   - Use Graph API Explorer
   - Request permissions: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `pages_read_engagement`
   - Exchange for long-lived token

4. **Store Credentials**
   - Add to Script Properties (secure storage)
   - Set up 50-day auto-refresh trigger

---

## COMPONENT 2: PREDICTIVE INTELLIGENCE ENGINE

### Customer Lifetime Value (CLV) Prediction

```javascript
// CLV CALCULATION - Add to MERGED TOTAL.js

function calculateAllCLV() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ordersSheet = ss.getSheetByName('Shopify_Orders');
  const customersSheet = ss.getSheetByName('MARKETING_CustomerIntelligence');

  if (!customersSheet) {
    createCustomerIntelligenceSheet();
  }

  const orders = ordersSheet.getDataRange().getValues();
  const customers = {};
  const today = new Date();

  // Build customer profiles from order history
  for (let i = 1; i < orders.length; i++) {
    const customerId = orders[i][0];
    const email = orders[i][1];
    const orderDate = new Date(orders[i][2]);
    const orderValue = parseFloat(orders[i][3]) || 0;

    if (!customers[customerId]) {
      customers[customerId] = {
        email: email,
        transactions: [],
        totalSpend: 0,
        firstPurchase: orderDate,
        lastPurchase: orderDate
      };
    }

    customers[customerId].transactions.push({ date: orderDate, value: orderValue });
    customers[customerId].totalSpend += orderValue;

    if (orderDate < customers[customerId].firstPurchase) {
      customers[customerId].firstPurchase = orderDate;
    }
    if (orderDate > customers[customerId].lastPurchase) {
      customers[customerId].lastPurchase = orderDate;
    }
  }

  // Calculate metrics for each customer
  const results = [];

  for (const [id, data] of Object.entries(customers)) {
    const recencyDays = Math.floor((today - data.lastPurchase) / (1000 * 60 * 60 * 24));
    const frequency = data.transactions.length;
    const monetary = data.totalSpend / frequency;
    const tenureDays = Math.floor((today - data.firstPurchase) / (1000 * 60 * 60 * 24)) || 1;

    // RFM Scores (1-5 quintiles)
    const rScore = recencyDays <= 30 ? 5 : recencyDays <= 60 ? 4 : recencyDays <= 90 ? 3 : recencyDays <= 180 ? 2 : 1;
    const fScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
    const mScore = monetary >= 100 ? 5 : monetary >= 50 ? 4 : monetary >= 30 ? 3 : monetary >= 15 ? 2 : 1;

    // Probability still active (180-day half-life for CSA)
    const pAlive = Math.exp(-recencyDays / 180);

    // Predicted annual orders
    const avgOrdersPerYear = (frequency / tenureDays) * 365;

    // Predicted CLV (1-year horizon)
    const predictedCLV = avgOrdersPerYear * monetary * pAlive;

    // Churn risk
    const churnRisk = 1 - pAlive;

    // Segment assignment
    let segment = 'Standard';
    if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'Champions';
    else if (rScore >= 4 && fScore >= 3) segment = 'Loyal';
    else if (rScore >= 3 && fScore === 1) segment = 'New';
    else if (rScore <= 2 && fScore >= 3) segment = 'At Risk';
    else if (rScore <= 2 && fScore <= 2) segment = 'Hibernating';
    else if (rScore === 1) segment = 'Lost';

    results.push([
      id,
      data.email,
      recencyDays,
      frequency,
      monetary.toFixed(2),
      data.totalSpend.toFixed(2),
      rScore,
      fScore,
      mScore,
      `${rScore}${fScore}${mScore}`,
      pAlive.toFixed(3),
      churnRisk.toFixed(3),
      predictedCLV.toFixed(2),
      segment,
      new Date().toISOString()
    ]);
  }

  // Write to intelligence sheet
  const headers = [
    'Customer ID', 'Email', 'Recency (Days)', 'Frequency', 'Avg Order Value',
    'Total Spend', 'R Score', 'F Score', 'M Score', 'RFM Score',
    'P(Active)', 'Churn Risk', 'Predicted CLV', 'Segment', 'Last Updated'
  ];

  customersSheet.clear();
  customersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  customersSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  if (results.length > 0) {
    customersSheet.getRange(2, 1, results.length, results[0].length).setValues(results);
  }

  // Apply conditional formatting
  applyIntelligenceFormatting(customersSheet);

  return {
    success: true,
    customersAnalyzed: results.length,
    segments: countBySegment(results)
  };
}

function countBySegment(results) {
  const counts = {};
  results.forEach(r => {
    const segment = r[13];
    counts[segment] = (counts[segment] || 0) + 1;
  });
  return counts;
}

function createCustomerIntelligenceSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.insertSheet('MARKETING_CustomerIntelligence');
  sheet.setFrozenRows(1);
  return sheet;
}
```

### Next Best Action Engine

```javascript
// NEXT BEST ACTION ENGINE - Add to MERGED TOTAL.js

function getNextBestAction(customerId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const intelligenceSheet = ss.getSheetByName('MARKETING_CustomerIntelligence');

  const data = intelligenceSheet.getDataRange().getValues();
  const headers = data[0];

  // Find customer
  let customer = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === customerId) {
      customer = {};
      headers.forEach((h, idx) => {
        customer[h.toLowerCase().replace(/\s+/g, '_')] = data[i][idx];
      });
      break;
    }
  }

  if (!customer) {
    return { action: 'NEW_CUSTOMER_ACQUISITION', priority: 1 };
  }

  const actions = [];

  // Rule 1: Critical churn risk
  if (parseFloat(customer.churn_risk) > 0.7 && parseFloat(customer.total_spend) > 200) {
    actions.push({
      priority: 1,
      action: 'RETENTION_EMERGENCY',
      channel: 'sms',
      message: 'Personalized win-back with 20% discount',
      trigger: 'immediate',
      expectedValue: parseFloat(customer.predicted_clv) * 0.3
    });
  }

  // Rule 2: At-risk segment
  if (customer.segment === 'At Risk') {
    actions.push({
      priority: 2,
      action: 'REENGAGEMENT_CAMPAIGN',
      channel: 'email',
      message: 'We miss you + special offer',
      trigger: 'next_batch',
      expectedValue: parseFloat(customer.predicted_clv) * 0.2
    });
  }

  // Rule 3: Champions - referral opportunity
  if (customer.segment === 'Champions') {
    actions.push({
      priority: 3,
      action: 'REFERRAL_REQUEST',
      channel: 'email',
      message: 'VIP referral program invitation',
      trigger: 'next_newsletter',
      expectedValue: parseFloat(customer.predicted_clv) * 0.5
    });
  }

  // Rule 4: New customers - onboarding
  if (customer.segment === 'New' && parseInt(customer.recency_days) < 14) {
    actions.push({
      priority: 2,
      action: 'ONBOARDING_SEQUENCE',
      channel: 'email',
      message: 'Welcome series email 2 or 3',
      trigger: 'automated',
      expectedValue: parseFloat(customer.predicted_clv) * 0.4
    });
  }

  // Rule 5: Loyal customers - upsell CSA
  if (customer.segment === 'Loyal' && !hasCSA(customerId)) {
    actions.push({
      priority: 3,
      action: 'CSA_UPSELL',
      channel: 'email',
      message: 'CSA benefits and signup nudge',
      trigger: 'next_tuesday',
      expectedValue: 500 // Full CSA value
    });
  }

  // Rule 6: Hibernating - seasonal wake-up
  if (customer.segment === 'Hibernating') {
    actions.push({
      priority: 4,
      action: 'SEASONAL_REACTIVATION',
      channel: 'direct_mail',
      message: 'Spring is coming postcard',
      trigger: 'batch_weekly',
      expectedValue: parseFloat(customer.predicted_clv) * 0.15
    });
  }

  // Sort by priority and expected value
  actions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.expectedValue - a.expectedValue;
  });

  return actions[0] || { action: 'NO_ACTION_NEEDED', priority: 5 };
}

// Get all recommended actions for the day
function getDailyActionQueue() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const intelligenceSheet = ss.getSheetByName('MARKETING_CustomerIntelligence');

  const data = intelligenceSheet.getDataRange().getValues();
  const actionQueue = {
    immediate: [],
    today: [],
    thisWeek: [],
    nextBatch: []
  };

  for (let i = 1; i < data.length; i++) {
    const customerId = data[i][0];
    const action = getNextBestAction(customerId);

    if (action.action !== 'NO_ACTION_NEEDED') {
      const item = {
        customerId,
        email: data[i][1],
        segment: data[i][13],
        ...action
      };

      if (action.trigger === 'immediate') actionQueue.immediate.push(item);
      else if (action.trigger === 'today') actionQueue.today.push(item);
      else if (action.trigger.includes('batch')) actionQueue.thisWeek.push(item);
      else actionQueue.nextBatch.push(item);
    }
  }

  return actionQueue;
}
```

### Optimal Send Time Calculator

```javascript
// SEND TIME OPTIMIZATION - Add to MERGED TOTAL.js

function calculateOptimalSendTime(customerId, channel = 'email') {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const engagementSheet = ss.getSheetByName('MARKETING_Engagement');

  // Default times by channel
  const defaults = {
    email: { dayOfWeek: 2, hour: 9 },  // Tuesday 9am
    sms: { dayOfWeek: 4, hour: 11 }    // Thursday 11am
  };

  if (!engagementSheet) {
    return defaults[channel] || defaults.email;
  }

  const data = engagementSheet.getDataRange().getValues();
  const customerEngagements = data.filter(row =>
    row[0] === customerId &&
    row[3] === 'opened' &&
    row[4] === channel
  );

  // Need at least 5 data points
  if (customerEngagements.length < 5) {
    return defaults[channel] || defaults.email;
  }

  // Analyze engagement patterns
  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);

  customerEngagements.forEach(engagement => {
    const openTime = new Date(engagement[2]);
    hourCounts[openTime.getHours()]++;
    dayCounts[openTime.getDay()]++;
  });

  const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
  const bestDay = dayCounts.indexOf(Math.max(...dayCounts));

  return {
    dayOfWeek: bestDay,
    hour: bestHour,
    confidence: customerEngagements.length / 20, // Confidence increases with data
    dataPoints: customerEngagements.length
  };
}

// Schedule campaign with optimized send times
function scheduleOptimizedCampaign(campaignId, recipients, content, channel) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const scheduleSheet = ss.getSheetByName('MARKETING_SendSchedule') ||
                        ss.insertSheet('MARKETING_SendSchedule');

  const schedule = [];

  recipients.forEach(recipient => {
    const optimalTime = calculateOptimalSendTime(recipient.customerId, channel);
    const sendTime = getNextOccurrence(optimalTime.dayOfWeek, optimalTime.hour);

    schedule.push([
      campaignId,
      recipient.customerId,
      recipient.email || recipient.phone,
      channel,
      sendTime.toISOString(),
      optimalTime.confidence.toFixed(2),
      'pending',
      content.templateId || 'custom'
    ]);
  });

  // Write schedule
  const lastRow = scheduleSheet.getLastRow();
  if (schedule.length > 0) {
    scheduleSheet.getRange(lastRow + 1, 1, schedule.length, schedule[0].length)
                 .setValues(schedule);
  }

  // Create time-based triggers for each unique send time
  const uniqueTimes = [...new Set(schedule.map(s => s[4]))];
  uniqueTimes.forEach(time => {
    ScriptApp.newTrigger('processSendQueue')
             .timeBased()
             .at(new Date(time))
             .create();
  });

  return {
    success: true,
    scheduled: schedule.length,
    uniqueSendTimes: uniqueTimes.length
  };
}

function getNextOccurrence(dayOfWeek, hour) {
  const now = new Date();
  const result = new Date(now);

  const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
  const addDays = daysUntil === 0 && now.getHours() >= hour ? 7 : daysUntil;

  result.setDate(result.getDate() + addDays);
  result.setHours(hour, 0, 0, 0);

  return result;
}
```

---

## COMPONENT 3: MULTI-CHANNEL AUTOMATION ENGINE

### Trigger-Based Automation Rules

```javascript
// AUTOMATION ENGINE - Add to MERGED TOTAL.js

const AUTOMATION_RULES = [
  // New Customer Welcome
  {
    id: 'welcome_series',
    trigger: 'customer_created',
    delay: 0,
    channel: 'email',
    template: 'welcome_email_1',
    conditions: { hasEmail: true },
    nextStep: 'welcome_email_2'
  },
  {
    id: 'welcome_email_2',
    trigger: 'previous_step',
    delay: 3 * 24 * 60, // 3 days in minutes
    channel: 'email',
    template: 'welcome_email_2',
    conditions: { didNotPurchase: true },
    nextStep: 'welcome_email_3'
  },

  // Order Confirmation
  {
    id: 'order_confirmation_sms',
    trigger: 'order_created',
    delay: 0,
    channel: 'sms',
    template: 'order_confirmed',
    conditions: { hasPhone: true, smsOptIn: true }
  },

  // Pickup Reminder
  {
    id: 'pickup_reminder',
    trigger: 'scheduled', // Daily at 9am
    delay: 0,
    channel: 'sms',
    template: 'pickup_today',
    conditions: { hasPickupToday: true }
  },

  // Churn Prevention
  {
    id: 'churn_prevention',
    trigger: 'churn_risk_high',
    delay: 0,
    channel: 'sms',
    template: 'we_miss_you',
    conditions: { churnRisk: '>0.7', clv: '>200' }
  },

  // Win-Back
  {
    id: 'winback_60_day',
    trigger: 'days_since_order',
    delay: 0,
    channel: 'email',
    template: 'winback_offer',
    conditions: { daysSinceOrder: 60, segment: 'At Risk' }
  },

  // CSA Renewal
  {
    id: 'csa_renewal_reminder',
    trigger: 'csa_expiring_soon',
    delay: 0,
    channel: 'email',
    template: 'renew_your_csa',
    conditions: { daysUntilExpiry: 14 }
  },

  // Back in Stock
  {
    id: 'back_in_stock',
    trigger: 'inventory_restored',
    delay: 0,
    channel: 'sms',
    template: 'product_available',
    conditions: { onWaitlist: true }
  }
];

// Process automation trigger
function processAutomationTrigger(triggerType, data) {
  const matchingRules = AUTOMATION_RULES.filter(rule =>
    rule.trigger === triggerType && evaluateConditions(rule.conditions, data)
  );

  const results = [];

  matchingRules.forEach(rule => {
    if (rule.delay > 0) {
      // Schedule for later
      scheduleAutomation(rule, data);
    } else {
      // Execute immediately
      const result = executeAutomation(rule, data);
      results.push(result);
    }
  });

  return results;
}

function executeAutomation(rule, data) {
  const template = getTemplate(rule.template);
  const personalizedContent = personalizeContent(template, data);

  let result;

  switch (rule.channel) {
    case 'email':
      result = sendMarketingEmail(data.email, personalizedContent);
      break;
    case 'sms':
      result = sendSMS({ to: data.phone, message: personalizedContent.body });
      break;
    case 'instagram':
      result = postToInstagram(0, 'IMAGE', personalizedContent);
      break;
  }

  // Log execution
  logAutomationExecution(rule.id, data.customerId, rule.channel, result);

  // Trigger next step if exists
  if (rule.nextStep && result.success) {
    scheduleAutomation(
      AUTOMATION_RULES.find(r => r.id === rule.nextStep),
      data
    );
  }

  return result;
}

function evaluateConditions(conditions, data) {
  if (!conditions) return true;

  for (const [key, value] of Object.entries(conditions)) {
    if (key === 'hasEmail' && value && !data.email) return false;
    if (key === 'hasPhone' && value && !data.phone) return false;
    if (key === 'churnRisk' && !evaluateNumericCondition(data.churnRisk, value)) return false;
    if (key === 'clv' && !evaluateNumericCondition(data.clv, value)) return false;
    if (key === 'segment' && data.segment !== value) return false;
  }

  return true;
}

function evaluateNumericCondition(actual, condition) {
  if (condition.startsWith('>')) {
    return parseFloat(actual) > parseFloat(condition.slice(1));
  } else if (condition.startsWith('<')) {
    return parseFloat(actual) < parseFloat(condition.slice(1));
  } else {
    return parseFloat(actual) === parseFloat(condition);
  }
}
```

---

## COMPONENT 4: ATTRIBUTION & MEASUREMENT

### Multi-Touch Attribution

```javascript
// ATTRIBUTION ENGINE - Add to MERGED TOTAL.js

function trackTouchpoint(customerId, channel, campaignId, action) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const trackingSheet = ss.getSheetByName('MARKETING_Attribution') ||
                        ss.insertSheet('MARKETING_Attribution');

  trackingSheet.appendRow([
    new Date().toISOString(),
    customerId,
    channel,
    campaignId,
    action, // 'click', 'open', 'visit', 'call'
    Utilities.getUuid()
  ]);
}

function calculateAttribution(orderId, orderValue) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const trackingSheet = ss.getSheetByName('MARKETING_Attribution');
  const orderDate = new Date();

  // Get all touchpoints for this customer in last 30 days
  const data = trackingSheet.getDataRange().getValues();
  const thirtyDaysAgo = new Date(orderDate - 30 * 24 * 60 * 60 * 1000);

  const touchpoints = data.filter(row => {
    const touchDate = new Date(row[0]);
    return row[1] === customerId && touchDate > thirtyDaysAgo && touchDate < orderDate;
  });

  if (touchpoints.length === 0) {
    return { channel: 'organic', credit: orderValue };
  }

  // Time-decay attribution (7-day half-life)
  const DECAY_RATE = 0.5;
  let totalWeight = 0;
  const weightedTouchpoints = touchpoints.map(tp => {
    const daysAgo = (orderDate - new Date(tp[0])) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(DECAY_RATE, daysAgo / 7);
    totalWeight += weight;
    return {
      channel: tp[2],
      campaign: tp[3],
      weight: weight
    };
  });

  // Calculate credit per channel
  const channelCredits = {};
  weightedTouchpoints.forEach(tp => {
    const credit = (tp.weight / totalWeight) * orderValue;
    if (!channelCredits[tp.channel]) {
      channelCredits[tp.channel] = 0;
    }
    channelCredits[tp.channel] += credit;
  });

  // Store attribution
  const attributionSheet = ss.getSheetByName('MARKETING_AttributionResults') ||
                           ss.insertSheet('MARKETING_AttributionResults');

  Object.entries(channelCredits).forEach(([channel, credit]) => {
    attributionSheet.appendRow([
      orderId,
      orderDate.toISOString(),
      orderValue,
      channel,
      credit.toFixed(2),
      (credit / orderValue * 100).toFixed(1) + '%'
    ]);
  });

  return channelCredits;
}

// Generate attribution report
function generateAttributionReport(startDate, endDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const resultsSheet = ss.getSheetByName('MARKETING_AttributionResults');

  const data = resultsSheet.getDataRange().getValues();
  const filteredData = data.filter(row => {
    const date = new Date(row[1]);
    return date >= startDate && date <= endDate;
  });

  const summary = {};
  let totalRevenue = 0;

  filteredData.forEach(row => {
    const channel = row[3];
    const credit = parseFloat(row[4]);
    totalRevenue += credit;

    if (!summary[channel]) {
      summary[channel] = {
        revenue: 0,
        orders: 0
      };
    }
    summary[channel].revenue += credit;
    summary[channel].orders++;
  });

  // Calculate percentages and sort
  const report = Object.entries(summary).map(([channel, data]) => ({
    channel,
    revenue: data.revenue.toFixed(2),
    orders: data.orders,
    percentage: (data.revenue / totalRevenue * 100).toFixed(1) + '%',
    avgOrderValue: (data.revenue / data.orders).toFixed(2)
  })).sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));

  return {
    period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
    totalRevenue: totalRevenue.toFixed(2),
    channels: report
  };
}
```

---

## COMPONENT 5: UNIFIED MARKETING COMMAND CENTER

### Dashboard Requirements

The Marketing Command Center should display:

1. **Real-Time Metrics**
   - Followers across all Instagram accounts
   - Email list size and growth
   - SMS subscriber count
   - Website traffic (today)

2. **Customer Intelligence**
   - Segment breakdown (Champions, Loyal, At Risk, etc.)
   - Total predicted CLV
   - Churn risk summary
   - Today's action queue

3. **Channel Performance**
   - Revenue by channel (attributed)
   - Best performing campaigns
   - Send time heatmap
   - Engagement trends

4. **Quick Actions**
   - Post to Instagram (all accounts)
   - Send SMS blast
   - Trigger email campaign
   - Run CLV analysis

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [x] Create customer intelligence sheet structure
- [ ] Build CLV calculation function
- [ ] Build churn risk scoring
- [ ] Implement RFM segmentation

### Phase 2: Instagram Direct (Week 3)
- [ ] Set up Meta Developer App
- [ ] Connect all 3 Instagram accounts
- [ ] Get and store access tokens
- [ ] Build posting functions
- [ ] Set up token auto-refresh

### Phase 3: Intelligence Engine (Week 4)
- [ ] Build Next Best Action engine
- [ ] Implement optimal send time calculator
- [ ] Create automation rule system
- [ ] Build action queue generator

### Phase 4: Attribution (Week 5)
- [ ] Implement touchpoint tracking
- [ ] Build time-decay attribution model
- [ ] Create attribution report generator
- [ ] Add tracking to all channels

### Phase 5: Dashboard (Week 6)
- [ ] Update Marketing Command Center UI
- [ ] Add real-time intelligence display
- [ ] Build quick action buttons
- [ ] Create performance reports

---

## REQUIRED GOOGLE SHEETS

```
Tiny Seed OS Master Spreadsheet
├── MARKETING_CustomerIntelligence
│   └── Customer ID, Email, Recency, Frequency, Monetary, RFM, CLV, Segment
├── MARKETING_Engagement
│   └── Customer ID, Timestamp, Action, Channel, Campaign ID
├── MARKETING_Attribution
│   └── Timestamp, Customer ID, Channel, Campaign, Action
├── MARKETING_AttributionResults
│   └── Order ID, Date, Value, Channel, Credit, Percentage
├── MARKETING_SendSchedule
│   └── Campaign ID, Customer ID, Contact, Channel, Send Time, Status
├── MARKETING_AutomationLog
│   └── Rule ID, Customer ID, Channel, Result, Timestamp
├── MARKETING_InstagramPosts
│   └── Account, Media Type, Caption, Media ID, Timestamp, Engagement
├── MARKETING_NeighborSignups (already created)
│   └── Timestamp, Name, Email, ZIP, Neighborhood, Source, Campaign
└── MARKETING_SocialConnections (already exists)
    └── Platform, Connected, API Key, Followers
```

---

## COST COMPARISON

### Current (with Ayrshare)
| Item | Annual Cost |
|------|-------------|
| Ayrshare Premium (3 accounts) | $1,200 |
| No predictive analytics | - |
| Limited attribution | - |
| **Total** | **$1,200+** |

### New System (Direct Integration)
| Item | Annual Cost |
|------|-------------|
| Instagram Graph API | $0 |
| Google Sheets | $0 |
| Apps Script | $0 |
| Twilio SMS (existing) | ~$200 |
| **Total** | **~$200** |

### Annual Savings: **$1,000+**
### Plus: Predictive intelligence, full attribution, complete data ownership

---

## NEXT IMMEDIATE STEPS

1. **Owner Action Required:** Set up Meta Developer App
   - Go to developers.facebook.com
   - Create Business App
   - Add Instagram Graph API product

2. **Owner Action Required:** Complete A2P 10DLC registration for Twilio
   - Critical for SMS deliverability
   - Without this, messages will be blocked

3. **I Will Build:**
   - Customer Intelligence calculation functions
   - Next Best Action engine
   - Attribution tracking system
   - Updated Marketing Command Center

---

*This is the blueprint for the most intelligent, cost-effective marketing system possible for a small farm business. Let's build it.*
