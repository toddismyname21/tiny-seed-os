# Tiny Seed OS - Feature Ideas Backlog

## Priority Features (User Defined)

### Soil Management System
- [x] **Soil Test Tracker** - Store current and archived soil tests by field/bed (BUILT)
- [x] **Albrecht Method Integration** - Soil balancing calculations using Albrecht/Base Cation Saturation Ratio (BCSR) method (BUILT)
- [x] **Steve Solomon References** - Incorporate guidance from Steve Solomon's fertility approach (BUILT)
- [x] **Soil Amendment Calculator** - Calculate amendment recommendations based on soil tests (BUILT)
- [x] **Amendments Database** - Comprehensive database of 70+ amendments with NPK, application rates, sources (BUILT)
  - Ohio Earth Food products integrated
  - Advancing Eco Agriculture products integrated
  - Soil Food Web/Dr. Elaine Ingham biological approaches
  - OMRI listing indicators
- **Crop-Based Amendment Adjustments** - Adjust recommendations based on:
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
- [x] Soil Test Tracker (soil-tests.html) - Includes:
  - Logan Labs PDF parsing
  - Amendment Calculator (Albrecht/Solomon method)
  - Comprehensive Amendments Database (70+ products)

---

## Notes

- Focus on production features before harvest/sales side
- All features should integrate with existing Google Sheets backend
- Mobile-friendly interfaces for field use
- Offline capability where possible
