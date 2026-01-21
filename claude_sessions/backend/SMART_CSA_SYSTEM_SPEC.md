# SMART CSA SYSTEM - Complete Implementation Specification

**Created:** 2026-01-20
**Status:** PRODUCTION-READY SPECIFICATION
**Research Sources:** 5 parallel research agents synthesized

---

## EXECUTIVE SUMMARY

This specification defines a **state-of-the-art CSA management system** that:
- Learns member preferences and builds personalized boxes
- Predicts churn before it happens and triggers interventions
- Automates onboarding with proven 30-day sequences
- Forecasts demand to optimize planting and reduce waste
- Tracks retention with actionable dashboards

**Owner's Vision:** "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME."

---

## TINY SEED FARM 2026 PRODUCT CATALOG

### Vegetable Shares

| Product | Price | Frequency | Season | Items | Weeks | Veg Code |
|---------|-------|-----------|--------|-------|-------|----------|
| Small Summer Weekly | $540 | Weekly | Jun-Oct | 6-9 | 18 | 1 |
| Small Summer Biweekly | $270 | Biweekly | Jun-Oct | 6-9 | 9 | 1 |
| Friends & Family Weekly | $720 | Weekly | Jun-Oct | 7-11 | 18 | 2 |
| Friends & Family Biweekly | $360 | Biweekly | Jun-Oct | 7-11 | 9 | 2 |
| Spring CSA | $150 | Weekly | May | TBD | 4 | 1 |
| Flex CSA | $150-$1000 | Flex | Jun-Dec | Varies | 31 | 1-2 |

### Flower Shares

| Product | Price | Frequency | Season | Stems | Weeks | Floral Code |
|---------|-------|-----------|--------|-------|-------|-------------|
| Full Bloom Weekly | $400 | Weekly | Jun-Oct | 15-20 | 16 | 2 |
| Full Bloom Biweekly | $200 | Biweekly | Jun-Oct | 15-20 | 8 | 2 |
| Petite Bloom Weekly | $300 | Weekly | Jun-Oct | 12-15 | 16 | 1 |
| Petite Bloom Biweekly | $150 | Biweekly | Jun-Oct | 12-15 | 8 | 1 |

### Season Dates (From Owner's Settings)

| Season | Category | Start | End | Weeks |
|--------|----------|-------|-----|-------|
| SPRING | Veg | 05/04/2026 | 05/31/2026 | 4 |
| SUMMER | Veg | 06/01/2026 | 10/03/2026 | 18 |
| BOUQUET | Floral | 06/01/2026 | 09/19/2026 | 16 |
| FLEX | Veg | 06/01/2026 | 12/31/2026 | 31 |

### Pickup Locations (14 Total)

1. Rochester (Kretschmann Family Organic Farm)
2. Allison Park (TBD)
3. Zelionople (CSA CUSTOMER PORCH)
4. Squirrel Hill (CSA CUSTOMER PORCH)
5. Sewickley (SATURDAY FARMER'S MARKET)
6. Oakmont (Today's Organic Market)
7. Mt. Lebanon (CSA CUSTOMER'S PORCH)
8. North Side (Mayfly Market)
9. Fox Chapel (CSA CUSTOMER PORCH)
10. Lawrenceville (TUESDAY FARMER'S MARKET)
11. Highland Park (Bryant St. Market)
12. Cranberry (CSA CUSTOMER PORCH)
13. Bloomfield (SATURDAY FARMER'S MARKET)
14. North Park (CSA CUSTOMER PORCH)

---

## FEATURE 1: PREFERENCE LEARNING SYSTEM

### Rating Scale (Harvie-Style)

```javascript
const PREFERENCE_WEIGHTS = {
  'EVERY_TIME': 5,    // "Include every time!"
  'LIKE_IT': 4,       // "I like it"
  'SOMETIMES': 3,     // "Sometimes" (default)
  'RARELY': 2,        // "Rarely include"
  'NEVER': 0          // "Never include"
};
```

### Data Collection Strategy

**Explicit Feedback:**
- Onboarding preference quiz (60 seconds)
- Post-delivery item ratings
- Profile preference updates

**Implicit Signals:**
- Item kept in box: +0.3 points
- Item swapped out: -0.7 points
- Add-on purchased: +1.0 points
- Recipe clicked: +0.4 points

### Cold Start Solution (New Members)

1. **Quick Category Quiz** (30 seconds):
   - Rate 6 categories: Leafy Greens, Root Veggies, Tomatoes/Peppers, Squash, Alliums, Herbs
   - Options: "Love it!", "It's fine", "Rather not"

2. **Lifestyle Questions** (20 seconds):
   - "How adventurous is your household?"
   - "Any dietary restrictions?"

3. **Visual Picks** (optional):
   - "Pick 3 items you'd love to see"

### Satisfaction Score Formula

```
Box Satisfaction = ((Avg Predicted Rating - 1) / 4) × 100
                 - (Never Items × 15)
                 - (Restriction Violations × 25)
                 + (Every Time Items × 5)
```

---

## FEATURE 2: CHURN PREDICTION & HEALTH SCORING

### Member Health Score (0-100)

```
HEALTH_SCORE = (Pickup_Score × 0.30)
             + (Engagement_Score × 0.25)
             + (Customization_Score × 0.20)
             + (Support_Score × 0.15)
             + (Tenure_Score × 0.10)
```

### Signal Weights

| Signal | Weight | Scoring Logic |
|--------|--------|---------------|
| Pickup Attendance | 30% | All pickups=100, 1 skip=80, 2 skips=60, missed=20 |
| Portal Engagement | 25% | Login <7 days=100, 8-14 days=80, 15-21=60, 22-30=40, 30+=0 |
| Customization | 20% | 3+ of 4 boxes=100, 2 of 4=80, 1 of 4=60, never=10 |
| Support/Complaints | 15% | No complaints=100, resolved=60, unresolved=0 |
| Tenure | 10% | First year=50, Second year=70, Third+=85 |

### Risk Levels

| Score | Level | Action Required |
|-------|-------|-----------------|
| 75-100 | GREEN | Standard engagement |
| 50-74 | YELLOW | Proactive outreach within 7 days |
| 25-49 | ORANGE | Immediate contact within 48 hours |
| 0-24 | RED | Same-day intervention by owner |

### Alert Triggers (Immediate)

1. Health score drops 20+ points in one week
2. Two consecutive missed pickups
3. No portal login in 30+ days
4. Unresolved complaint older than 7 days
5. First-year member in late season with score below 60

---

## FEATURE 3: SMART ONBOARDING (First 30 Days)

### Touchpoint Schedule

| Day | Channel | Purpose |
|-----|---------|---------|
| 0 | Email + SMS | Welcome & Confirmation |
| 1 | Email | Quick Start Guide |
| 2 | SMS | Profile Completion Nudge |
| 3 | Email | Feature Education (Customization) |
| 5 | Email | Social Proof (Member Stories) |
| 7 | Email + SMS | First Pickup Prep |
| 8 | SMS | Post-Pickup Check-in |
| 10 | Email | Recipes Based on Box |
| 14 | Email | Milestone Celebration |
| 21 | Email | Community Invite |
| 30 | Phone/Email | Personal Success Call |

### Activation Definition

Member is "activated" when they complete within 14 days:
1. Profile/preferences completed
2. First customization made
3. First pickup attended
4. Engaged with 2+ communications

**Target Activation Rate:** 60%+

### Welcome Email Key Elements

- Confirm membership details
- Set expectations
- Single CTA: "Complete your taste profile"
- Include welcome video link

---

## FEATURE 4: DEMAND FORECASTING

### Preference-Based Demand Score

```javascript
DemandScore = (Sum of Weighted Preferences / Max Possible)
            × SeasonalMultiplier
            × HistoricalAdjustment
```

### Planting Recommendation Logic

```javascript
plantingMultiplier = max(0.3, min(1.2, demandRatio + 0.1))
recommendedQuantity = ceil(totalMembers × plantingMultiplier)
```

### Inventory-to-Box Allocation (Harvie-Style)

1. Randomize member order (fairness)
2. Multi-pass allocation:
   - First pass: "Every Time" items
   - Subsequent passes: Preference-weighted selection
   - Alternate direction each pass
3. Balance boxes (handle surplus/shortage)

---

## FEATURE 5: RETENTION ANALYTICS

### Key Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Customer Retention | (End - New) / Start × 100 | 75%+ |
| Net Revenue Retention | (Start + Expansion - Churn) / Start × 100 | 100%+ |
| Churn Rate | Lost / Start × 100 | <5% |
| NPS | % Promoters - % Detractors | +30+ |
| LTV | (ARPU × Margin) / Monthly Churn | Varies |

### Owner Dashboard Sections

1. **Executive Summary**: Active members, MRR, NPS, Retention Rate
2. **Trend Charts**: Member growth, revenue, satisfaction over time
3. **Cohort Analysis**: Retention by signup period
4. **Alerts**: Critical (red), Warning (yellow), Positive (green)
5. **Action Items**: Prioritized intervention list

### Alert Priority Matrix

| Alert Type | Priority | Response Time |
|------------|----------|---------------|
| RED member identified | P1 | Same day |
| Score dropped 20+ points | P2 | 24 hours |
| Unresolved complaint 48+ hours | P2 | 24 hours |
| YELLOW member no response | P3 | 7 days |

---

## IMPLEMENTATION ORDER

### Phase 1: Core Parser & Data (Today)
- [ ] Enhanced `parseShopifyShareType()` with all products
- [ ] CSA_Products sheet population
- [ ] Member preference data structure

### Phase 2: Preference Learning (Today)
- [ ] Preference rating storage
- [ ] Onboarding quiz handler
- [ ] Implicit signal tracking
- [ ] Box satisfaction scoring

### Phase 3: Health Scoring (Today)
- [ ] Member health score calculation
- [ ] Risk level classification
- [ ] Alert trigger system

### Phase 4: Onboarding Automation (Next)
- [ ] Email sequence triggers
- [ ] SMS integration (if available)
- [ ] Activation tracking
- [ ] 30-day success tracking

### Phase 5: Dashboard & Reporting (Next)
- [ ] Retention metrics calculation
- [ ] Cohort analysis functions
- [ ] Owner alert system
- [ ] Weekly/monthly report generation

---

## SHEET SCHEMA

### CSA_Preferences Sheet

| Column | Type | Description |
|--------|------|-------------|
| Preference_ID | UUID | Primary key |
| Member_ID | String | FK to CSA_Members |
| Item_ID | String | Crop/variety identifier |
| Rating | Number | 1-5 scale |
| Source | String | 'onboarding', 'explicit', 'implicit' |
| Confidence | Number | 0-1 for inferred ratings |
| Created_Date | Date | When first rated |
| Modified_Date | Date | Last update |

### CSA_Member_Health Sheet

| Column | Type | Description |
|--------|------|-------------|
| Member_ID | String | FK to CSA_Members |
| Health_Score | Number | 0-100 |
| Risk_Level | String | GREEN, YELLOW, ORANGE, RED |
| Pickup_Score | Number | 0-100 |
| Engagement_Score | Number | 0-100 |
| Customization_Score | Number | 0-100 |
| Support_Score | Number | 0-100 |
| Tenure_Score | Number | 0-100 |
| Last_Calculated | Date | Cache timestamp |
| Alert_Status | String | Active alerts |

### CSA_Onboarding_Tracker Sheet

| Column | Type | Description |
|--------|------|-------------|
| Member_ID | String | FK to CSA_Members |
| Signup_Date | Date | When joined |
| Profile_Completed | Boolean | Has preferences |
| Profile_Date | Date | When completed |
| First_Customization | Boolean | Made a swap |
| Customization_Date | Date | When customized |
| First_Pickup | Boolean | Attended pickup |
| Pickup_Date | Date | When picked up |
| Email_Engagement | Number | Count of opens/clicks |
| Activated | Boolean | Met all criteria |
| Activation_Date | Date | When activated |
| Day_30_Call | Boolean | Success call made |

---

## API ENDPOINTS

### GET Endpoints

```
?action=getMemberHealth&memberId=X
?action=getMemberPreferences&memberId=X
?action=getBoxRecommendation&memberId=X&weekDate=Y
?action=getRetentionDashboard
?action=getChurnAlerts
?action=getOnboardingStatus&memberId=X
```

### POST Endpoints

```
{ action: 'updatePreference', memberId, itemId, rating, source }
{ action: 'recordImplicitSignal', memberId, itemId, signalType }
{ action: 'calculateMemberHealth', memberId }
{ action: 'triggerOnboardingEmail', memberId, dayNumber }
{ action: 'recordPickupAttendance', memberId, weekDate, attended }
{ action: 'logSupportInteraction', memberId, type, resolution }
```

---

## SUCCESS METRICS

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Member Retention | ~45% (industry) | 75%+ | Season 1 |
| First-Year Renewal | ~50% (industry) | 70%+ | Season 1 |
| Activation Rate | Unknown | 60%+ | Month 1 |
| NPS Score | Unknown | +40 | Season 1 |
| Churn Rate | Unknown | <5% monthly | Season 1 |

---

*This specification synthesizes research from 5 parallel agents analyzing: Harvie, Local Line, CSAware, SaaS best practices, and subscription industry benchmarks.*
