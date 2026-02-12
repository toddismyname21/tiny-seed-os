# Marketing Command Center - User Guide

**Last Updated:** 2026-02-11
**For:** Managers and Marketing Team

---

## Overview

The Marketing Command Center is your all-in-one hub for social media management, content scheduling, campaign tracking, and AI-powered content generation. It connects directly to your social accounts and provides intelligent recommendations for optimal posting.

---

## Getting Started

### Access

1. Go to: `web_app/marketing-command-center.html`
2. You need **Manager** role to access this dashboard
3. Login with your credentials

### Initial Setup Checklist

Before you can post to social media, you need to configure these APIs:

| API | Purpose | Status Check |
|-----|---------|--------------|
| Instagram Graph API | Post to Instagram/Facebook | Settings > Check All APIs |
| Claude or OpenAI API | AI content generation | Settings > API Keys |
| Twilio | SMS campaigns | Settings > API Keys |

---

## Key Features

### 1. Content Calendar (7-Day View)

The content calendar shows your next 7 days of scheduled posts at a glance.

**Color Coding:**
- **Green**: 2+ posts scheduled (good coverage)
- **Yellow**: 1 post scheduled (need more)
- **Red**: No posts scheduled (content gap)

**Actions:**
- Click "Add Content" on empty days to create a post
- Click "Generate Content for Gaps" to have AI create posts for empty days
- View scheduled posts by clicking on a day

### 2. Quick Post (Field Mode)

Perfect for capturing moments in the field:

1. **Upload Photo/Video**: Drag & drop or tap to upload
2. **Write Caption**: Or use AI to generate one
3. **Select Platforms**: Instagram, Facebook, TikTok, etc.
4. **Schedule or Post Now**: Choose when to publish

**Tips:**
- Use the voice note feature to capture thoughts while working
- AI will suggest optimal posting times
- Save drafts for later

### 3. AI Brain Tab

The AI Brain provides intelligent recommendations:

**5-3-2 Content Mix:**
- 50% Curated content (shared posts, customer photos)
- 30% Original content (your farm content)
- 20% Personal content (fun, humanizing posts)

The tracker shows your weekly progress and recommends what type to post next.

**Optimal Posting Times:**
- Based on 9.6M+ posts analyzed
- Wednesday/Thursday are peak days
- 9-11 AM is prime morning time
- 7-9 PM is prime evening time

### 4. Campaign Tracking

Track marketing campaigns across all channels:

- View active campaigns
- See spend vs. budget
- Track conversions
- Monitor reach and engagement

### 5. Analytics Dashboard

- Follower growth across platforms
- Engagement rates
- Top performing posts
- Competitor tracking

---

## How-To Guides

### Schedule a Social Media Post

1. Go to **Quick Post** tab
2. Upload your image/video
3. Write or generate a caption
4. Select platforms (Instagram, Facebook, etc.)
5. Click **Schedule Post** toggle
6. Set date and time
7. Click **SCHEDULE POST**

### Use AI Content Generation

1. Go to **Quick Post** tab
2. Click **Generate AI Caption**
3. AI will create a caption based on:
   - Current season
   - Your posting history
   - Optimal engagement patterns
4. Edit as needed
5. Post or schedule

### Track Content Calendar Gaps

1. Go to **Content Calendar** tab
2. Look for red days (no content)
3. Either:
   - Click "Add Content" to create manually
   - Click "Fill Gaps with AI" for auto-generation
4. Review generated content before publishing

### Update Follower Counts

1. Click the edit icon next to follower stats
2. Enter current counts for each platform
3. Click Save
4. Counts update weekly growth tracking

### Send SMS Campaign

1. Go to **SMS** section
2. Choose recipient list (CSA, VIP, All)
3. Write message or use template
4. Preview cost estimate
5. Click Send Now or Schedule

---

## API Configuration

### Required API Keys

To fully use Marketing Command Center, configure these in Apps Script:

#### Instagram/Facebook (Meta Graph API)

1. Create a Meta Developer account
2. Create an app with Instagram API
3. Get Access Token
4. In Apps Script, run: `configureInstagramAccount()`

#### Claude API (Recommended for AI)

1. Get API key from console.anthropic.com
2. In Apps Script, run: `configureAPIKey('CLAUDE_API_KEY', 'your-key')`

#### OpenAI API (Alternative AI)

1. Get API key from platform.openai.com
2. In Apps Script, run: `configureAPIKey('OPENAI_API_KEY', 'your-key')`

#### Twilio (SMS)

1. Create Twilio account
2. Get Account SID and Auth Token
3. Configure in Apps Script properties

### Checking API Status

1. Go to Settings tab
2. Click "Check All APIs"
3. View status of each integration

---

## Best Practices

### Posting Schedule

| Day | Best Time | Content Type |
|-----|-----------|--------------|
| Monday | 7 PM | Week preview |
| Tuesday | 7 PM, 3 PM | Behind scenes |
| Wednesday | 12 PM, 6 PM | **PEAK DAY** - Original content |
| Thursday | 9 AM | **PEAK DAY** - Product features |
| Friday | Low engagement | Schedule for next week |
| Saturday | Low engagement | Market day content |
| Sunday | 9 PM | Week recap |

### Content Mix (5-3-2 Rule)

- **5 Curated**: Share customer photos, partner content, industry tips
- **3 Original**: Product features, tutorials, behind-the-scenes
- **2 Personal**: Meet the team, bloopers, gratitude posts

### Hashtag Strategy

- Use 3-5 hashtags per post (algorithm optimal in 2026)
- Always include: #TinySeedFarm #FarmFresh #Pittsburgh
- Rotate: #LocalFood #FarmToTable #OrganicFarming #SmallFarm

---

## Troubleshooting

### Posts not publishing

1. Check API status in Settings
2. Verify Instagram token hasn't expired (60-day renewal)
3. Check image meets platform requirements

### AI not generating content

1. Verify Claude or OpenAI API key is set
2. Check Settings > API Status
3. Fallback templates will be used if AI unavailable

### Content calendar not loading

1. Refresh the page
2. Check browser console for errors
3. Verify API URL is correct in api-config.js

---

## Related Dashboards

- **Financial Dashboard**: Marketing budget tracking
- **SEO Dashboard**: Search optimization
- **Sales Dashboard**: Customer data for targeting

---

## Support

For technical issues, check the CHANGE_LOG.md or contact the development team.

For marketing strategy questions, refer to the docs/MARKETING_AUTOMATION_PLAN.md.
