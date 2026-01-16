# High-Value Address Targeting Algorithm

**Prepared by:** Social Media Claude
**Date:** 2026-01-16
**For:** Tiny Seed Farm Direct Mail Marketing

---

## Overview

This document outlines a scoring algorithm to identify and prioritize households most likely to become Tiny Seed Farm customers. The goal: maximize direct mail ROI by targeting the right people.

---

## Target Customer Profile

### Primary Persona: "The Conscious Consumer"

| Attribute | Description |
|-----------|-------------|
| Age | 30-55 |
| Income | $75,000+ household |
| Housing | Homeowner, single-family |
| Location | Within 15 miles of farm |
| Values | Health, sustainability, local |
| Behavior | Shops farmers markets, buys organic |

### Secondary Persona: "The New Neighbor"

| Attribute | Description |
|-----------|-------------|
| Status | Moved within last 6 months |
| Housing | New construction or recent purchase |
| Spending | $9,000-$12,000 on new home needs |
| Mindset | Establishing new routines, open to discovery |

---

## Scoring Algorithm

### Formula

```
HIGH-VALUE SCORE (0-100) =
  (Income_Factor × 25) +
  (Proximity_Factor × 20) +
  (New_Mover_Factor × 25) +
  (Housing_Factor × 15) +
  (Food_Interest_Factor × 15)
```

### Factor Definitions

#### 1. Income Factor (0-25 points)

| Median Household Income | Points |
|------------------------|--------|
| $150,000+ | 25 |
| $100,000-$149,999 | 20 |
| $75,000-$99,999 | 15 |
| $50,000-$74,999 | 10 |
| Under $50,000 | 5 |

**Data Source:** Census Bureau ACS data by ZIP code or tract

#### 2. Proximity Factor (0-20 points)

| Distance from Farm | Points |
|-------------------|--------|
| 0-3 miles | 20 |
| 3-5 miles | 18 |
| 5-10 miles | 15 |
| 10-15 miles | 10 |
| 15-20 miles | 5 |
| 20+ miles | 0 |

**Data Source:** ZIP code centroid distance calculation

#### 3. New Mover Factor (0-25 points)

| Move Status | Points |
|-------------|--------|
| Moved within 30 days | 25 |
| Moved 1-3 months ago | 22 |
| Moved 3-6 months ago | 18 |
| Moved 6-12 months ago | 12 |
| Moved 1-2 years ago | 5 |
| No recent move | 0 |

**Data Source:** USPS NCOALink, new mover lists, deed records

#### 4. Housing Factor (0-15 points)

| Housing Type | Points |
|--------------|--------|
| New construction (< 2 years) | 15 |
| Single-family, owned | 12 |
| Townhouse, owned | 10 |
| Condo, owned | 8 |
| Apartment, rented | 3 |

**Data Source:** Property records, Zillow data

#### 5. Food Interest Factor (0-15 points)

| Indicator | Points |
|-----------|--------|
| Previous farm/CSA customer | 15 |
| Farmers market visitor | 12 |
| Organic grocery shopper | 10 |
| Health food store nearby | 8 |
| General interest indicators | 5 |

**Data Source:** Customer database, surveys, modeled data

---

## Priority Tiers

### Tier 1: HOT (Score 70-100)

**Action:** Mail immediately, follow up with second touch

- New movers in affluent neighborhoods within 5 miles
- Previous farmers market customers not yet in CSA
- Households near Whole Foods/health food stores

**Expected Response Rate:** 5-8%

### Tier 2: WARM (Score 50-69)

**Action:** Include in standard campaigns

- Established homeowners in target demographics
- Moderate income, close proximity
- Areas with farmers market presence

**Expected Response Rate:** 3-5%

### Tier 3: COOL (Score 30-49)

**Action:** Test in small batches

- More distant neighborhoods
- Lower income but food-conscious areas
- Rental-heavy areas near target demographics

**Expected Response Rate:** 1-3%

### Tier 4: SKIP (Score 0-29)

**Action:** Do not mail

- Too far from farm
- Demographics don't match
- Low probability of conversion

---

## Data Sources for Implementation

### Free/Low-Cost Sources

| Source | Data Available | Cost | How to Access |
|--------|----------------|------|---------------|
| **USPS EDDM Tool** | Route demographics, household count | Free | eddm.usps.com |
| **Census Bureau** | Income, age, housing by ZIP/tract | Free | data.census.gov |
| **Zillow Research** | Home values, market trends | Free | zillow.com/research/data |
| **County Assessor** | Property records, sale dates | Free | County website |
| **Google Maps** | Distance calculations | Free | Manual or API |

### Paid Sources

| Source | Data Available | Cost | Best For |
|--------|----------------|------|----------|
| **LeadsPlease** | New mover lists | $0.05-0.10/name | New homeowner targeting |
| **InfoUSA** | Demographic lists | $0.08-0.15/name | Income/age targeting |
| **Melissa Data** | Address verification | $0.01/record | List cleaning |
| **Experian** | Consumer behavior | $0.15-0.25/name | Psychographic targeting |

### DIY Data Collection

| Method | Data Collected | Effort |
|--------|----------------|--------|
| Farmers market signup sheet | Email, ZIP, interests | Low |
| Website popup | ZIP code, email | Low |
| Customer survey | Demographics, preferences | Medium |
| Local realtor partnership | New buyers in area | Medium |
| Driving new neighborhoods | Identify new construction | Medium |

---

## Pittsburgh-Specific Target Areas

### Tier 1 Neighborhoods (Mail First)

Based on income, proximity to typical farm locations, and food culture:

| Neighborhood | Why Target |
|--------------|------------|
| Squirrel Hill | High income, food-conscious, family-oriented |
| Shadyside | Affluent, young professionals, health-focused |
| Fox Chapel | Highest income, large families |
| Sewickley | Affluent suburb, community-oriented |
| Mt. Lebanon | High income families, good schools |
| Upper St. Clair | Affluent families |

### Tier 2 Neighborhoods (Secondary)

| Neighborhood | Why Target |
|--------------|------------|
| Highland Park | Educated, environmentally conscious |
| Point Breeze | High income, older established |
| Lawrenceville | Young professionals, foodie culture |
| East Liberty | Gentrifying, Whole Foods location |
| Regent Square | Families, community-focused |

### New Construction Areas to Monitor

| Area | Type | Notes |
|------|------|-------|
| Bakery Square | Condos/apartments | Tech workers, young professionals |
| East Liberty | Mixed development | Gentrification, new residents |
| Strip District | Lofts/condos | Young professionals |
| Cranberry Township | Suburban homes | Young families |
| South Fayette | New subdivisions | Growing families |

---

## Implementation Steps

### Phase 1: Quick Start (Week 1)

1. **Use USPS EDDM Tool** to identify mail routes in Tier 1 neighborhoods
2. **Select 3-5 routes** (1,000-2,000 households)
3. **Mail EDDM postcards** - no list needed, just select routes

### Phase 2: Targeted Lists (Week 2-4)

1. **Purchase new mover list** from LeadsPlease or similar
   - Filter: Moved in last 6 months
   - Filter: Within 15 miles of farm
   - Filter: Home value $300K+
2. **Cross-reference** with target ZIP codes
3. **Mail personalized postcards** with names

### Phase 3: Scoring Implementation (Month 2+)

1. **Build spreadsheet** with scoring algorithm
2. **Import** purchased list data
3. **Add** Census income data by ZIP
4. **Calculate** distance from farm
5. **Score and rank** all addresses
6. **Mail by tier** - start with Tier 1

### Phase 4: Refinement (Ongoing)

1. **Track responses** by source/neighborhood
2. **Identify** highest-converting segments
3. **Adjust weights** in algorithm based on results
4. **Build custom audience** from winners

---

## Sample Scoring Worksheet

| Address | Income (25) | Proximity (20) | New Mover (25) | Housing (15) | Food (15) | **TOTAL** |
|---------|-------------|----------------|----------------|--------------|-----------|-----------|
| 123 Squirrel Hill | 20 | 18 | 22 | 12 | 10 | **82** |
| 456 Fox Chapel | 25 | 15 | 0 | 15 | 8 | **63** |
| 789 Lawrenceville | 15 | 20 | 25 | 8 | 12 | **80** |
| 321 Cranberry | 20 | 5 | 22 | 15 | 5 | **67** |

---

## Expected Outcomes

| Tier | Households | Response Rate | Responses | Conversions (30%) | Revenue |
|------|------------|---------------|-----------|-------------------|---------|
| Tier 1 (500) | 500 | 6% | 30 | 9 | $4,500 |
| Tier 2 (1,000) | 1,000 | 3% | 30 | 9 | $4,500 |
| Tier 3 (500) | 500 | 2% | 10 | 3 | $1,500 |
| **TOTAL** | **2,000** | **3.5%** | **70** | **21** | **$10,500** |

**Campaign Cost:** ~$1,200
**ROI:** 8.75x

---

*Algorithm ready for implementation. See DIRECT_MAIL_CAMPAIGN_PLAN.md for execution details.*
