# TINY SEED OS - Web Application

## Quick Start

### Option 1: Open Directly in Browser
Simply double-click any HTML file to open it in your browser:
- `index.html` - Main Dashboard
- `labels.html` - Greenhouse Label Generator
- `succession.html` - Succession Planting Wizard
- `calendar.html` - Visual Calendar (Gantt View)

### Option 2: Local Development Server
For best experience, run a local server:

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/web_app
python3 -m http.server 8080
```

Then open: http://localhost:8080

---

## Connecting to Your Google Sheets

### Step 1: Add the API Code to Google Sheets

1. Open your Production Google Sheet
2. Go to **Extensions > Apps Script**
3. Delete any existing code
4. Copy ALL contents from `APPS_SCRIPT_CODE.gs`
5. Paste into the Apps Script editor
6. Click **Save** (Ctrl+S)

### Step 2: Deploy as Web App

1. In Apps Script, click **Deploy > New deployment**
2. Click the gear icon, select **Web app**
3. Configure:
   - Description: "Tiny Seed OS API v1"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. **Authorize** when prompted (click through security warnings)
6. **Copy the Web App URL** - it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

### Step 3: Update HTML Files

Find this line in each HTML file:
```javascript
const API_URL = 'https://script.google.com/macros/s/AKfycbxmiiz.../exec';
```

Replace with YOUR new deployment URL.

### Step 4: Test

1. Open `index.html`
2. Check the status indicator in the top-right
3. It should say "Connected" with a green dot

---

## Files Included

| File | Description |
|------|-------------|
| `index.html` | Master Dashboard - Central hub for all tools |
| `labels.html` | Greenhouse Label Generator - Print tray labels with QR codes |
| `succession.html` | Succession Planner - Create bulk succession plantings |
| `calendar.html` | Visual Calendar - Gantt-style timeline view |
| `APPS_SCRIPT_CODE.gs` | Google Apps Script API code |

---

## Features

### Dashboard (index.html)
- Live statistics (plantings, tasks, harvests)
- Real-time weather from Open-Meteo API
- Quick action buttons
- Recent activity feed
- Tool navigation cards

### Greenhouse Labels (labels.html)
- Filter seedings by date range, crop, status
- Select individual or all seedings
- Auto-generate QR codes for traceability
- Print-optimized layout (4" x 2" labels)
- Batch printing support

### Succession Planner (succession.html)
- Step-by-step wizard interface
- Visual crop selector with DTM info
- Flexible interval settings (days/weeks)
- Auto bed assignment (alternating or sequential)
- Timeline preview
- Save templates for reuse

### Visual Calendar (calendar.html)
- Gantt-style timeline visualization
- Zoom levels: Day / Week / Month
- Filter by crop, field, status
- Today marker line
- Hover tooltips with planting details
- Export functionality

---

## API Endpoints

The Apps Script supports these actions:

| Action | Description |
|--------|-------------|
| `testConnection` | Verify API is working |
| `getPlantings` | Get all plantings from PLANNING_2026 |
| `getSeedings` | Get upcoming seedings for labels |
| `savePlanting` | Create a new planting |
| `saveSuccession` | Save bulk succession plantings |
| `getCropProfiles` | Get crop database |
| `getBeds` | Get bed information |
| `getTasks` | Get generated tasks |
| `generateTasks` | Auto-generate tasks from plantings |
| `logHarvest` | Log a harvest |
| `getInventory` | Get current inventory |
| `getDashboardStats` | Get summary statistics |

---

## Troubleshooting

### "API Offline" status
1. Check your internet connection
2. Verify the API URL is correct in the HTML files
3. Re-deploy the Apps Script as a new version
4. Check Apps Script execution logs for errors

### Labels not generating
1. Ensure seedings are within the selected date range
2. Check that PLANNING_2026 tab exists in your sheet
3. Verify column names match expected format

### Calendar empty
1. Check filter settings in the sidebar
2. Ensure plantings have valid seed/harvest dates
3. Toggle status checkboxes to show/hide different statuses

---

## Support

This system was built for Tiny Seed Farm.
For issues, check the Apps Script execution logs.
