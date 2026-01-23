# INBOX: Backend Claude
## OVERNIGHT CRITICAL ASSIGNMENT - 2026-01-23

**FROM:** PM_Architect (Delegator in Chief)
**PRIORITY:** CRITICAL - OVERNIGHT WORK
**MANDATE:** NO SHORTCUTS. STATE OF THE ART. PRODUCTION READY.

---

## 🚨 OVERNIGHT MISSION: FIX ALL BROKEN API ENDPOINTS

The owner is sleeping. When they wake up, the system must be working.

---

## VERIFIED BROKEN ENDPOINTS (87 TOTAL)

From VERIFIED_SYSTEM_INVENTORY.md - these ALL return HTML errors:

### BATCH 1: Farm Operations (52 endpoints - ALL BROKEN)
```
getCSAMembers              getFinancials
getCropProfile             updateCropProfile
createCropProfile          getMorningBrief
getHarvestPredictions      getDiseaseRisk
getWeatherForecast         getGDDProgress
getPredictiveTasks         getSmartDashboard
getRealtimeAvailability    getProductForecast
getWeeklyAvailability      canFulfillOrder
getSmartRecommendations    getFreshHarvests
initializeAvailability     getChefProfile
getChefOrderHistory        getChefRecommendations
getOptedInChefs            getAllChefs
verifyChefToken            sendChefMagicLink
getRequiredInspections     validatePreHarvestInspection
getPreHarvestInspectionTasks  getComplianceRecords
getIPMSchedules            getFertigationData
getFoliarApplications      getSoilAmendments
getSoilTests               getInventoryProducts
getProductById             getLowStockProducts
getTransactionHistory      getProductsForDropdown
savePlanting               getWizardDataWeb
getTrayInventory           saveTrayInventory
getFarmInventory           getFarmInventoryItem
getFarmInventoryStats      getFuelLog
getEquipmentHealth         getActiveRecommendations
generateRecommendations    getMaintenanceSchedule
```

### BATCH 2: Marketing & Planning (30 endpoints - ALL BROKEN)
```
getSocialActionQueue       getNextBestPost
getContentCalendar         classifyCommentPriority
getEmailQueue              getCSARenewalsNeeded
getReferralStats           getReferralLeaderboard
getCompetitorAlerts        getMarketingAutomationDashboard
getSEOCompetitors          getAIShareOfVoiceMetrics
getVideoAnalytics          getVideoContentStrategy
getSEOMasterDashboard      getPlanning
getPlanningById            updatePlanting
deletePlanting             getCrops
getCropProfiles            getCropByName
getBeds                    getBedsByField
getTasks                   getTasksByDate
getHarvests                getHarvestsByDate
getWeather                 getWeatherSummary
```

---

## FOR EACH BROKEN ENDPOINT:

1. **Check if function exists** in MERGED TOTAL.js
2. **If function doesn't exist** - Find it in a module file
3. **Add route to doGet** if function exists but route doesn't
4. **Test with curl before moving on**

---

## DEPLOYMENT PROCESS

```bash
# Copy to temp deploy directory
cp "/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js" /tmp/apps_script_test/
cd /tmp/apps_script_test
PATH="/opt/homebrew/bin:$PATH" clasp push --force
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp" -d "v###: Fixed X endpoints"
```

---

## MODULE MERGING WARNINGS

⚠️ **SmartLaborIntelligence.js** - DO NOT merge directly. Has duplicate LABOR_CONFIG.
✅ **SmartAvailability.js** - Safe to merge (19 functions)
✅ **ChefCommunications.js** - Safe to merge (26 functions)

---

## SUCCESS CRITERIA

- [ ] Farm operations endpoints return JSON
- [ ] Planning endpoints work for calendar.html
- [ ] No console errors on any page

---

**START NOW. WORK UNTIL DONE.**
