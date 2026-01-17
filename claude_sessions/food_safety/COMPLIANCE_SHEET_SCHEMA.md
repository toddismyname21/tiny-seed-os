# Compliance Sheet Schema
## Food Safety Module - Tiny Seed OS

**Created by:** Food_Safety Claude
**Date:** 2026-01-16

---

## SHEET: COMPLIANCE_WATER_TESTS

| Column | Type | Description |
|--------|------|-------------|
| Test_ID | String | Auto-generated (WT-YYYYMMDD-XXX) |
| Test_Date | Date | Date sample was collected |
| Water_Source | String | Well #1, Well #2, Municipal, etc. |
| Source_Type | String | Pre-Harvest, Harvest, Post-Harvest, Irrigation |
| Sample_Location | String | Description of where sample taken |
| Lab_Name | String | Testing laboratory name |
| E_Coli_Result | Number | CFU/100mL or "ND" for non-detect |
| E_Coli_Pass | Boolean | TRUE if ND or within limits |
| Coliform_Result | Number | Optional - total coliform |
| Other_Tests | String | Any additional tests run |
| Lab_Report_URL | String | Link to lab report PDF |
| Corrective_Action | String | If failed, what action taken |
| Tested_By | String | Employee who collected sample |
| Notes | String | Additional notes |
| Created_Date | DateTime | Record creation timestamp |

**Tab Color:** Blue (#3b82f6)

---

## SHEET: COMPLIANCE_TRAINING

| Column | Type | Description |
|--------|------|-------------|
| Training_ID | String | Auto-generated (TR-YYYYMMDD-XXX) |
| Training_Date | Date | Date of training |
| Training_Type | String | PSA Course, Annual Refresher, New Hire, Topic-Specific |
| Topics_Covered | String | Comma-separated list of topics |
| Trainer_Name | String | Who conducted training |
| Trainer_Certification | String | PSA Certified, etc. |
| Duration_Hours | Number | Length of training in hours |
| Attendees | String | JSON array of {name, employeeId, signature} |
| Attendee_Count | Number | Number of attendees |
| Materials_Used | String | Training materials/handouts |
| Certificate_URL | String | Link to certificate if applicable |
| Notes | String | Additional notes |
| Created_Date | DateTime | Record creation timestamp |

**Tab Color:** Green (#22c55e)

---

## SHEET: COMPLIANCE_CLEANING

| Column | Type | Description |
|--------|------|-------------|
| Cleaning_ID | String | Auto-generated (CL-YYYYMMDD-XXX) |
| Cleaning_Date | Date | Date of cleaning |
| Cleaning_Time | String | Time of cleaning (HH:MM) |
| Location | String | Wash station, Pack house, Cooler, Field equipment |
| Equipment_Cleaned | String | Specific items cleaned |
| Cleaning_Type | String | Pre-shift, Post-shift, Weekly, As-needed |
| Sanitizer_Used | String | Product name |
| Sanitizer_Concentration | String | PPM or dilution ratio |
| Method | String | Spray, Soak, Wipe, etc. |
| Cleaned_By | String | Employee name |
| Verified_By | String | Supervisor verification (if required) |
| Notes | String | Additional notes |
| Created_Date | DateTime | Record creation timestamp |

**Tab Color:** Cyan (#06b6d4)

---

## SHEET: COMPLIANCE_TEMPERATURE

| Column | Type | Description |
|--------|------|-------------|
| Temp_ID | String | Auto-generated (TM-YYYYMMDD-XXX) |
| Reading_Date | Date | Date of reading |
| Reading_Time | String | Time of reading (HH:MM) |
| Location | String | Walk-in Cooler, Delivery Van, Pack Area |
| Target_Temp_F | Number | Target temperature |
| Actual_Temp_F | Number | Recorded temperature |
| In_Range | Boolean | TRUE if within acceptable range |
| Corrective_Action | String | If out of range, action taken |
| Recorded_By | String | Employee name |
| Notes | String | Additional notes |
| Created_Date | DateTime | Record creation timestamp |

**Tab Color:** Orange (#f97316)

---

## SHEET: COMPLIANCE_PREHARVEST

| Column | Type | Description |
|--------|------|-------------|
| Inspection_ID | String | Auto-generated (PH-YYYYMMDD-XXX) |
| Inspection_Date | Date | Date of inspection |
| Field_Block | String | Field/block being inspected |
| Crop | String | Crop being harvested |
| Animal_Intrusion | Boolean | Evidence of animal activity? |
| Animal_Details | String | If yes, describe |
| Flooding_Evidence | Boolean | Signs of flooding? |
| Contamination_Risk | Boolean | Any contamination concerns? |
| Contamination_Details | String | If yes, describe |
| Adjacent_Land_OK | Boolean | No issues with neighboring land? |
| Worker_Health_OK | Boolean | All workers healthy? |
| Equipment_Clean | Boolean | Harvest equipment clean? |
| Harvest_Approved | Boolean | Field approved for harvest? |
| Exclusion_Zone | String | If not approved, area to exclude |
| Inspected_By | String | Employee name |
| Notes | String | Additional notes |
| Created_Date | DateTime | Record creation timestamp |

**Tab Color:** Yellow (#eab308)

---

## SHEET: COMPLIANCE_CORRECTIVE_ACTIONS

| Column | Type | Description |
|--------|------|-------------|
| Action_ID | String | Auto-generated (CA-YYYYMMDD-XXX) |
| Issue_Date | Date | When issue was identified |
| Issue_Category | String | Water, Training, Cleaning, Temp, Field, Other |
| Related_Record_ID | String | Link to original record (e.g., WT-xxx) |
| Issue_Description | String | What was the problem |
| Severity | String | Minor, Major, Critical |
| Immediate_Action | String | What was done immediately |
| Root_Cause | String | Why did this happen |
| Preventive_Measure | String | How to prevent recurrence |
| Responsible_Person | String | Who is accountable |
| Due_Date | Date | When corrective action due |
| Completed_Date | Date | When actually completed |
| Status | String | Open, In Progress, Completed, Verified |
| Verified_By | String | Who verified completion |
| Evidence_URL | String | Link to supporting documentation |
| Notes | String | Additional notes |
| Created_Date | DateTime | Record creation timestamp |

**Tab Color:** Red (#ef4444)

---

## INTEGRATION NOTES

### Linking to Existing Systems:

1. **HARVEST_LOG**: Pre-harvest inspections link via Field_Block + Date
2. **EMPLOYEES**: Training records link via Employee_ID
3. **SEED_INVENTORY**: Lot traceability for 1-up reports

### API Endpoints Needed:

```
Compliance Actions:
- getComplianceWaterTests
- addComplianceWaterTest
- getComplianceTraining
- addComplianceTraining
- addTrainingAttendee
- getComplianceCleaning
- addComplianceCleaning
- getComplianceTemperature
- addComplianceTemperature
- getCompliancePreharvest
- addCompliancePreharvest
- getCorrectiveActions
- addCorrectiveAction
- updateCorrectiveAction

Reports:
- generateComplianceReport (Inspector Report)
- generateTracebackReport (Lot -> Customer)
- getComplianceDashboard
```

---

## SHEET COLORS SUMMARY

| Sheet | Color | Hex |
|-------|-------|-----|
| COMPLIANCE_WATER_TESTS | Blue | #3b82f6 |
| COMPLIANCE_TRAINING | Green | #22c55e |
| COMPLIANCE_CLEANING | Cyan | #06b6d4 |
| COMPLIANCE_TEMPERATURE | Orange | #f97316 |
| COMPLIANCE_PREHARVEST | Yellow | #eab308 |
| COMPLIANCE_CORRECTIVE_ACTIONS | Red | #ef4444 |

---

*Schema designed by Food_Safety Claude*
