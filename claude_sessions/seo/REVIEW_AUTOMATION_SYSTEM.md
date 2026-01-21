# REVIEW AUTOMATION SYSTEM
## Systematic Google Review Collection for Tiny Seed Farm

**Goal:** Generate 150+ authentic Google reviews within 12 months
**Target:** 4.9+ star rating across all platforms

---

## REVIEW GENERATION FLOW

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  CSA Member     │────▶│  Happy Customer  │────▶│  Review Request │
│  Completes      │     │  Moment          │     │  Triggered      │
│  Pickup/Delivery│     │  Detected        │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                              ┌────────────────────────────┘
                              ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Review Posted  │◀────│  Follow-up       │◀────│  Email/SMS      │
│  to Google      │     │  (if needed)     │     │  Sent           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## BACKEND FUNCTIONS REFERENCE

### 1. Find Review Candidates
```javascript
// Get CSA members who are good candidates for review requests
getReviewRequestCandidates({
  minPickups: 5,        // Minimum completed pickups
  maxDaysInactive: 30,  // Active within last 30 days
  excludeRequested: true // Don't ask twice
})

// Returns: Array of members with contact info, pickup count, last pickup date
```

### 2. Create Review Request
```javascript
// Log a review request being sent
createReviewRequest({
  memberId: "CSA-2026-001",
  memberName: "John Smith",
  memberEmail: "john@example.com",
  method: "email",  // email, sms, or in_person
  trigger: "milestone_5_pickups"
})

// Returns: Request ID for tracking
```

### 3. Log Received Review
```javascript
// Log when a review is posted
logReview({
  platform: "google",
  reviewerName: "John S.",
  rating: 5,
  reviewText: "Best CSA in Pittsburgh! The vegetables are always fresh...",
  source: "review_request"  // or organic
})

// Automatically analyzes sentiment and detects keywords
```

### 4. Get Review Metrics
```javascript
// Get comprehensive review statistics
getReviewMetrics({
  platform: "all",  // or specific platform
  timeframe: "month"
})

// Returns: total, average rating, sentiment breakdown, conversion rate
```

---

## TRIGGER POINTS FOR REVIEW REQUESTS

### Tier 1: High Conversion Moments (Send Immediately)

| Trigger | Timing | Method | Expected Conversion |
|---------|--------|--------|---------------------|
| First CSA pickup completed | Same day, 6 PM | Email | 15-20% |
| 5th pickup milestone | Next day | Email | 25-30% |
| Positive feedback received | Within 2 hours | Email/SMS | 40-50% |
| Renewed CSA share | Next day | Email | 30-35% |
| Referred a friend | After friend joins | Email | 35-40% |

### Tier 2: Seasonal Opportunities

| Trigger | Timing | Method | Expected Conversion |
|---------|--------|--------|---------------------|
| End of season thank you | Last pickup week | Email | 20-25% |
| Anniversary (1 year member) | On anniversary date | Personal email | 30-35% |
| Holiday/New Year | Early January | Email | 10-15% |

### Tier 3: Recovery Requests

| Trigger | Timing | Method | Expected Conversion |
|---------|--------|--------|---------------------|
| Issue resolved successfully | 24-48 hours after | Personal email | 20-25% |
| Vacation hold returned | First pickup back | In-person | 15-20% |

---

## EMAIL TEMPLATES

### Template 1: First Pickup (Onboarding)
**Subject:** How was your first CSA box? 🥬

```
Hi [NAME],

We hope you enjoyed your first CSA pickup! We'd love to hear how everything looked and tasted.

If you have 60 seconds, would you leave us a quick Google review? It helps other Pittsburgh families find us and supports our small farm more than you know.

👉 Leave a Review: [GOOGLE_REVIEW_LINK]

Thanks for being part of the Tiny Seed family!

- The Tiny Seed Farm Team

P.S. - Questions about anything in your box? Just reply to this email!
```

### Template 2: Milestone (5 Pickups)
**Subject:** You've had 5 weeks of farm-fresh goodness!

```
Hi [NAME],

Five pickups down! By now you've tried our [CURRENT_SEASON] favorites – we hope they've been delicious.

If you're enjoying the CSA experience, would you share that on Google? A quick review helps us grow and reach more Pittsburgh families who want fresh, local produce.

👉 Share Your Experience: [GOOGLE_REVIEW_LINK]

What's been your favorite thing so far? We'd love to know!

- Tiny Seed Farm
```

### Template 3: After Positive Feedback
**Subject:** You made our day! ☀️

```
Hi [NAME],

Your message about [SPECIFIC_FEEDBACK] absolutely made our day! Thank you for taking the time to share that.

Would you be willing to leave that feedback as a Google review? It would mean the world to us and help other Pittsburgh families discover what you've found.

👉 It takes just 60 seconds: [GOOGLE_REVIEW_LINK]

Thank you for being such a wonderful part of our farm community.

With gratitude,
[FARMER_NAME]
```

### Template 4: End of Season
**Subject:** Thank you for an amazing season! 🌻

```
Hi [NAME],

What a season! From the first spring greens to the fall squash, you've been with us for [X] weeks of harvest.

As we wrap up, we have a small ask: Would you leave us a Google review? Sharing your experience helps Pittsburgh families find locally grown food – and keeps small farms like ours thriving.

👉 Share Your Season: [GOOGLE_REVIEW_LINK]

We can't wait to grow for you again next year.

With gratitude,
The Tiny Seed Farm Team
```

### Template 5: Renewal Thank You
**Subject:** Welcome back to the farm family! 🌱

```
Hi [NAME],

We're thrilled you've renewed for another season! Your continued support means everything to a small farm like ours.

If you have a moment, would you share your CSA experience on Google? Honest reviews from members like you help other families make the decision to try local.

👉 Leave a Review: [GOOGLE_REVIEW_LINK]

See you at pickup soon!

- Tiny Seed Farm
```

---

## SMS TEMPLATES (For High-Value Triggers)

### After Positive In-Person Feedback
```
Hi [NAME]! Thanks for the kind words at pickup today 🥬 If you have 60 sec, a Google review would mean the world: [SHORT_LINK] - Tiny Seed Farm
```

### Milestone SMS
```
[NAME], you've had 5 weeks of farm-fresh veggies! Would you share your experience? Quick Google review here: [SHORT_LINK] 🌱
```

---

## PHYSICAL TOUCHPOINTS

### 1. Pickup Location Card
**Size:** Business card size
**Include in every pickup box**

```
┌──────────────────────────────────┐
│  Enjoying your CSA?              │
│                                  │
│  Leave us a quick Google review! │
│  It helps Pittsburgh families    │
│  find fresh, local food.         │
│                                  │
│  [QR CODE TO REVIEW LINK]        │
│                                  │
│  Scan to review in 60 seconds    │
│  tinyseedfarm.com/review         │
└──────────────────────────────────┘
```

### 2. End of Season Thank You Card
**Size:** Postcard size
**Include in last pickup of season**

```
┌──────────────────────────────────────────┐
│  THANK YOU                               │
│  for being part of our farm family       │
│                                          │
│  This season, you enjoyed [X] weeks      │
│  of certified organic produce grown      │
│  right here in Pittsburgh.               │
│                                          │
│  Help us grow! Leave a Google review:    │
│  [QR CODE]                               │
│                                          │
│  See you next season! 🌻                 │
│                                          │
│  - The Tiny Seed Farm Team               │
└──────────────────────────────────────────┘
```

---

## AUTOMATED WORKFLOWS

### Workflow 1: Post-Pickup Sequence

```
DAY 0: Pickup completed
  └── Mark pickup in system

DAY 1 (6:00 PM):
  └── IF first pickup → Send Template 1
  └── IF 5th pickup → Send Template 2
  └── IF 10th pickup → Send milestone email (create Template 6)

DAY 7:
  └── IF no review AND no prior request this month
      └── Send gentle reminder (Template variation)

DAY 14:
  └── Stop sequence (don't over-ask)
```

### Workflow 2: Positive Feedback Response

```
TRIGGER: Positive email/message received
  │
  ├── Immediately: Reply with genuine thanks
  │
  └── 2 hours later:
      └── Send Template 3 (after positive feedback)
```

### Workflow 3: Renewal Celebration

```
TRIGGER: Member renews CSA share
  │
  ├── Day 0: Send renewal confirmation
  │
  └── Day 1: Send Template 5 (renewal thank you)
```

---

## RESPONSE TEMPLATES

### Responding to Positive Reviews

**Template A: Enthusiastic Thanks**
```
Thank you so much, [NAME]! We're thrilled you're loving the CSA. Comments like yours make all those early mornings in the field worth it. See you at pickup! 🥬
```

**Template B: Highlight Specifics**
```
[NAME], thank you for the kind words about our [ITEM MENTIONED]! We put so much love into growing it, and it's wonderful to know it made it to your table in great shape. Thanks for being part of the farm family!
```

**Template C: Community Focus**
```
Thank you, [NAME]! Members like you are what make our Pittsburgh farm community so special. We're grateful you chose to support local agriculture. Can't wait to keep growing for you!
```

### Responding to Constructive Reviews (3-4 stars)

**Template: Acknowledge & Improve**
```
Thank you for your honest feedback, [NAME]. We're always looking to improve, and we appreciate you taking the time to share. [SPECIFIC RESPONSE TO CONCERN]. Please don't hesitate to reach out directly at hello@tinyseedfarm.com – we want to make this right.
```

### Responding to Negative Reviews (1-2 stars)

**Template: Take It Seriously**
```
[NAME], we're truly sorry to hear about your experience. This isn't the standard we hold ourselves to. We'd like to make this right – could you email us at hello@tinyseedfarm.com so we can discuss directly? Your satisfaction matters deeply to us.
```

---

## TRACKING & METRICS

### Weekly Review Dashboard

| Metric | Target | Actual |
|--------|--------|--------|
| New reviews this week | 5 | |
| Review requests sent | 20 | |
| Conversion rate | 25% | |
| Average rating | 4.9+ | |
| Response rate (to reviews) | 100% | |

### Monthly Goals

| Month | Review Target | Cumulative Total |
|-------|---------------|------------------|
| 1 | 15 | 15 |
| 2 | 15 | 30 |
| 3 | 15 | 45 |
| 4 | 12 | 57 |
| 5 | 12 | 69 |
| 6 | 12 | 81 |
| 7 | 15 | 96 |
| 8 | 15 | 111 |
| 9 | 12 | 123 |
| 10 | 10 | 133 |
| 11 | 10 | 143 |
| 12 | 10 | **153** |

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Setup (Week 1)
- [ ] Run `initializeSEOModule()` to create tracking sheets
- [ ] Create direct Google review link (short URL)
- [ ] Set up email templates in email system
- [ ] Design and print review cards

### Phase 2: Seed Reviews (Week 2-3)
- [ ] Identify 15 most loyal/engaged members
- [ ] Send personal emails asking for reviews
- [ ] Target: 10-15 initial reviews

### Phase 3: Automate (Week 4+)
- [ ] Set up post-pickup email triggers
- [ ] Implement milestone notifications
- [ ] Create feedback → review request workflow

### Phase 4: Scale (Ongoing)
- [ ] Monitor conversion rates
- [ ] A/B test email subject lines
- [ ] Refine timing based on data
- [ ] Respond to every review within 24 hours

---

## GOOGLE REVIEW LINK SETUP

### Get Your Direct Review Link

1. Go to Google Business Profile
2. Click "Share review form"
3. Copy the link

**Format:** `https://g.page/r/YOUR_PLACE_ID/review`

### Create Short URL

Use a URL shortener for cards/SMS:
- tinyseedfarm.com/review → redirects to Google review link
- Or use Bitly/TinyURL for tracking

### QR Code Generation

Generate QR codes at:
- qr-code-generator.com
- canva.com (for branded designs)

---

## LEGAL COMPLIANCE

### Do's
- Ask satisfied customers for reviews
- Make it easy with direct links
- Thank reviewers publicly
- Respond to all reviews

### Don'ts
- Never offer incentives for reviews (violates Google TOS)
- Never ask for "5-star" reviews specifically
- Never fake reviews or use review services
- Never delete/hide negative reviews (address them)

### FTC Disclosure
All review requests must be genuine and without incentive. Employees/family should disclose relationship if reviewing.

---

## SUCCESS METRICS

### Short-Term (3 months)
- 40+ Google reviews
- 4.8+ average rating
- 25%+ request-to-review conversion

### Medium-Term (6 months)
- 75+ Google reviews
- 4.9+ average rating
- Appearing in local 3-pack for "CSA Pittsburgh"

### Long-Term (12 months)
- 150+ Google reviews
- Most reviewed farm in Pittsburgh area
- #1 ranking for "farm Pittsburgh"

---

*Last Updated: 2026-01-20*
*Status: READY FOR IMPLEMENTATION*
