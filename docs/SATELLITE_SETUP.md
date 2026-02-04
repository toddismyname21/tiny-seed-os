# Satellite Integration Setup Guide
## Tiny Seed Farm OS - NDVI Monitoring

---

## Quick Start (5 minutes)

### Step 1: Get Agromonitoring API Key (Free)

1. Go to https://agromonitoring.com
2. Click "Sign Up" (free tier covers up to 1,000 hectares)
3. After registration, go to your Dashboard
4. Copy your API key from the "API Keys" section

### Step 2: Configure API Key in Tiny Seed OS

**Option A: Via API Call**
```bash
curl -X POST "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec" \
  -H "Content-Type: application/json" \
  -d '{"action":"setAgromonitoringApiKey","apiKey":"YOUR_API_KEY_HERE"}'
```

**Option B: Via Apps Script Editor**
1. Open Google Apps Script: https://script.google.com
2. Open the Tiny Seed OS project
3. Go to Project Settings (gear icon)
4. Under "Script Properties", add:
   - Property: `AGROMONITORING_API_KEY`
   - Value: Your API key

### Step 3: Initialize Satellite Sheets

```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=initializeSatelliteSheets"
```

This creates:
- `SATELLITE_FIELDS` - Registered field polygons
- `SATELLITE_READINGS` - NDVI/NDMI history

### Step 4: Sync Field Boundaries

```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=syncFieldPolygons"
```

This registers all fields from `REF_Fields` with Agromonitoring.

**Note:** Fields need GPS coordinates in the `Coordinates` column of REF_Fields sheet. Format: `[[lon1,lat1],[lon2,lat2],[lon3,lat3],[lon1,lat1]]`

### Step 5: Setup Daily Fetch Trigger

```bash
curl "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=setupSatelliteTrigger"
```

This creates a daily trigger at 6 AM to fetch new satellite data.

---

## Using the Satellite Features

### Satellite Map
Navigate to: `https://app.tinyseedfarm.com/web_app/satellite-map.html`

Features:
- Interactive map with NDVI color overlay
- Toggle between NDVI, NDMI (water stress), True Color
- Click fields to see details and historical charts
- Date picker for historical imagery

### Smart Scouting
When satellite data detects problems (NDVI drop >15%, low vegetation health, water stress), the system automatically:
1. Creates a scouting task in the Unified Task System
2. Generates GPS waypoints for the problem areas
3. Adds alert to the Proactive Alerts panel

### NDVI Interpretation

| NDVI Value | Color | Meaning |
|------------|-------|---------|
| < 0.3 | Red | Stressed vegetation - needs immediate attention |
| 0.3 - 0.5 | Yellow | Moderate health - monitor closely |
| > 0.5 | Green | Healthy vegetation |

### Alert Types

| Alert | Trigger | Action |
|-------|---------|--------|
| NDVI_DROP | >15% drop in 7 days | Scout for pest/disease/drought |
| LOW_NDVI | NDVI < 0.3 | Check crop health |
| WATER_STRESS | NDMI < 0 | Increase irrigation |
| RAPID_DECLINE | >5% loss per day | Urgent investigation |

---

## API Reference

### Fetch NDVI Data
```bash
# Get latest NDVI for all fields
curl "...?action=fetchAllFieldsNDVI"

# Get NDVI history for specific field
curl "...?action=fetchNDVIHistory&polygonId=POLYGON_ID&startDate=2026-01-01&endDate=2026-02-01"
```

### Problem Detection
```bash
# Detect problems for a field
curl "...?action=detectProblems&fieldId=FIELD_ID"

# Get all current problems across farm
curl "...?action=getAllFieldProblems"
```

### Scouting
```bash
# Generate scouting waypoints
curl "...?action=generateScoutingWaypoints&fieldId=FIELD_ID"

# Generate scouting tasks for all problem fields
curl "...?action=generateScoutingTasks"
```

---

## Troubleshooting

### "No satellite data available"
- Satellite revisit time is 3-5 days
- Cloud cover may prevent imagery
- Check that field polygons are synced: `?action=getSatelliteFields`

### "API key invalid"
- Verify key at https://agromonitoring.com/dashboard
- Re-set using `setAgromonitoringApiKey` endpoint

### "Field not found"
- Ensure field exists in `REF_Fields` sheet
- Ensure field has GPS coordinates
- Run `syncFieldPolygons` to register with API

---

## Cost

| Tier | Hectares | Price |
|------|----------|-------|
| Free | Up to 1,000 | $0/month |
| Starter | Up to 5,000 | $29/month |
| Professional | Up to 25,000 | $99/month |

Tiny Seed Farm (~50 acres = ~20 hectares) fits well within the free tier.

---

*Setup guide created 2026-02-04*
