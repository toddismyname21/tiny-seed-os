---
name: soil-tests.html architecture
description: Architecture map of the 14K-line soil-tests.html — 15 tabs, 204 functions, key data flows
type: project
---

soil-tests.html is a 14,357-line, 15-tab agronomic platform (NOT a simple tracker).

**Why:** Understanding its architecture prevents duplicate work and ensures changes don't break existing flows.

**Tabs:** Current Tests, Tissue Tests, Archived, Compare, Amendment Calculator, Plant Doctor, Amendments Database, Field Zones, USDA Organic, Amendment History, Foliar Program, Fertigation, IPM Toolkit, Farm Insights, Inventory

**Key data flows:**
- Soil tests: `getSoilTests` / `saveSoilTest` → Google Sheets + localStorage fallback
- Soil submissions: `getSoilSubmissions` / `saveSoilSubmission` / `updateSoilSubmission` → SOIL_SUBMISSIONS sheet (added 2026-03-16)
- Fields: `getFields` (GET) / `addField` (GET+POST) → REF_Fields + REF_Beds sheets
- Compliance: `getComplianceRecords` / `saveComplianceRecord`
- IPM: `getIPMSchedules` / `saveIPMSchedule`
- Fertigation: `getFertigationData` / `saveFertigationData`
- Foliar: `getFoliarApplications` / `saveFoliarApplication`
- Amendments: `getSoilAmendments` / `saveSoilAmendment`

**Amendment calculator:** Albrecht/Steve Solomon BCSR method, K target lookup by TCEC, 70+ crops, 3 modes (efficient, cost-effective, inventory-based)

**Logan Labs workflow (upgraded 2026-03-16):**
- Submission → backend-persisted (SOIL_SUBMISSIONS sheet)
- Tracker panel on Current Tests tab (pending/shipped/complete)
- Multi-page PDF parsing with confidence scoring
- Bulk field selection (All/Veg/Floral/Perennial)
- Auto-creates Chief of Staff reminder task
- Default test: Mehlich 3

**How to apply:** Read this before modifying soil-tests.html. Check which tab and data flow is affected before making changes.
