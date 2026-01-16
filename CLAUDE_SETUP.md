# Claude Code Setup - Tiny Seed OS

This file contains critical setup information for Claude Code sessions. READ THIS FIRST when starting a new session.

## Quick Reference

### Google Apps Script Deployment
```bash
# IMPORTANT: Set PATH first (node and clasp are in Homebrew)
export PATH="/opt/homebrew/bin:/opt/homebrew/Cellar/node/25.2.1/bin:$PATH"

# To push code to Google Apps Script:
cd /Users/samanthapollack/Documents/TIny_Seed_OS
clasp push

# To pull latest from Google:
clasp pull

# Check login status:
clasp login --status

# Force push (if needed):
clasp push --force
```

### Project IDs & URLs
- **Apps Script Project ID**: `1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec`
- **Apps Script Editor**: https://script.google.com/home/projects/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/edit
- **Web App URL**: https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec
- **Google Sheet**: Connected via SPREADSHEET_ID in Code.gs

### File Structure
```
apps_script/           # Google Apps Script source files
  ├── MERGED TOTAL.js  # Main API router (doGet/doPost)
  ├── CropRotation.js  # Crop rotation & field planning
  └── *.html           # Frontend templates served by Apps Script

web_app/               # Static web files (GitHub Pages)
  └── *.html           # Dashboard pages
```

### After Code Changes
1. Run `/opt/homebrew/bin/clasp push` to upload to Google
2. Go to Apps Script Editor > Deploy > Manage deployments
3. Create NEW deployment (or edit existing) with new version number
4. Test the new deployment URL

### Credentials Location
- **CREDENTIALS_PRIVATE.txt** - Twilio, Google Routes API, Plaid keys (NEVER commit)
- **~/.clasprc.json** - Google OAuth tokens for clasp

### Common Issues
- **"Unknown action" error**: Need to redeploy with new version after code push
- **CORS errors**: Use Apps Script served HTML or text/plain content-type
- **clasp not found**: Use full path `/opt/homebrew/bin/clasp`

### Key API Endpoints (action parameter)
**Planning & Crops:**
- `getPlanning2026` - Get all 2026 plantings
- `analyzeFieldPlan` - Analyze and suggest optimizations
- `generateFieldPlanReport` - Full planning report
- `analyzeUnassignedPlantings` - Group unassigned by field time
- `getOptimalBedAssignments` - Get suggested bed assignments
- `applyOptimalAssignments` - Apply all bed assignments
- `assignPlantingsToField` - Assign selected plantings to a specific field (params: batchIds, targetField, apply)
- `getAvailableFields` - Get list of all fields with bed counts
- `approveSuggestion` - Approve single suggestion
- `approveAllSuggestions` - Approve all pending suggestions

**Crop Rotation:**
- `getFieldTimeGroups` - Get plantings grouped by field duration
- `getRotationRecommendations` - Get rotation advice for a bed
- `suggestBedForCrop` - Find best bed for a crop
- `canPlantInBed` - Check if crop can go in specific bed
- `getSeasonalDTMInfo` - Get seasonal DTM adjustment for crop/date (params: crop, date)
- `getLearnedDTM` - Get DTM predictions from real harvest data (params: crop, variety, season)

**DTM Learning System (with Weather):**
- `recordHarvest` - POST: Record harvest, calculate actual DTM, capture weather over lifecycle (params: batchId, harvestDate, quantity, unit, quality, notes)
- `getDTMLearningData` - Get all learning data from DTM_LEARNING sheet
- `getWeatherSummary` - Get weather stats for date range (params: startDate, endDate) - returns totalGDD, avgTemp, totalPrecip, frostDays

**Other Modules:**
- `getCustomers`, `getOrders`, `getTransactions` - CRM/Finance
- `getFarmPics`, `getMarketingCampaigns` - Marketing

---
Last updated: 2026-01-15
