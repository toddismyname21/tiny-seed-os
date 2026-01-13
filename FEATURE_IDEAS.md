# Tiny Seed OS - Feature Ideas Backlog

## Priority Features (User Defined)

### Soil Management System
- **Soil Test Tracker** - Store current and archived soil tests by field/bed
- **Albrecht Method Integration** - Soil balancing calculations using Albrecht/Base Cation Saturation Ratio (BCSR) method
- **Steve Solomon References** - Incorporate guidance from Steve Solomon's fertility approach
- **Soil Amendment Calculator** - Calculate amendment recommendations based on:
  - Most recent soil test results
  - Target crop nutrient requirements
  - Field/bed history

### Crop Nutrient Profiles
- **Nutrient Requirement Database** - Build profiles for all crops including:
  - N-P-K requirements
  - Micronutrient needs
  - pH preferences
  - Heavy vs light feeder classification
  - Calcium/magnesium sensitivity

### AI-Powered Identification
- **Photo-Based Pest ID** - Upload photos for AI identification of:
  - Insect pests
  - Beneficial insects
  - Unknown bugs
- **Photo-Based Disease ID** - Upload photos to identify:
  - Fungal diseases
  - Bacterial issues
  - Nutrient deficiencies
  - Viral symptoms

---

## Production Features (from PASA Workbook Analysis)

### Seedling Production
- Seeding Calculator - Auto-calculate seed amounts based on germination rates
- Germination Tracking - Log germination dates/rates by variety
- Hardening Off Scheduler - Track days to harden off, alerts when ready
- Seed Inventory - Track packets, quantities, germination test dates, storage

### Crop Planning
- Pre-Season Planning Dashboard - Checklist of planning tasks
- In-Season Adjustments - Track succession additions/cancellations
- Post-Season Review - Performance notes by variety for next year

### Tillage & Field Prep
- Bed Prep Checklist - Log tillage, amendments, bed forming by field
- Equipment Maintenance Log - Track service dates, hours, repairs

### Irrigation
- Irrigation Zone Map - Visual map of zones, emitter types, GPH rates
- Watering Log - Track irrigation events, duration, crop needs
- System Maintenance - Track filter cleanings, line repairs, winterization

### Weed Management
- Weed Pressure Tracker - Log problem weeds by field/bed
- Cultivation Log - Track cultivation passes, methods, timing

### Pest & Disease Management
- Scouting Log - Record pest observations with photos, severity ratings
- Treatment Tracker - Log spray applications, materials, rates, REI
- Beneficial Insect Releases - Track biocontrol introductions

---

## Already Built

- [x] Master Dashboard (index.html)
- [x] Quick Plant Wizard (succession.html)
- [x] Visual Calendar (calendar.html)
- [x] Greenhouse Tracker (greenhouse.html)
- [x] Field Map (field-map.html)
- [x] Sowing Sheets (sowing-sheets.html)
- [x] Harvest Planning (harvest.html)
- [x] Mobile Crew View (mobile.html)
- [x] Task Manager (tasks.html)
- [x] Weather Dashboard (weather.html)
- [x] Inventory Tracker (inventory.html)

---

## Notes

- Focus on production features before harvest/sales side
- All features should integrate with existing Google Sheets backend
- Mobile-friendly interfaces for field use
- Offline capability where possible
