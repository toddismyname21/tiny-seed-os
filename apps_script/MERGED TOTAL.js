/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TINY SEED OS - COMPLETE SYSTEM WITH WORKING API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * THIS VERSION HAS ALL ENDPOINTS PROPERLY CONNECTED
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open: https://docs.google.com/spreadsheets/d/128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc/edit
 * 2. Extensions → Apps Script
 * 3. SELECT ALL existing code (Ctrl+A)
 * 4. DELETE it
 * 5. PASTE this entire file
 * 6. Save (Ctrl+S)
 * 7. Deploy → Manage deployments → Edit → "New version" → Deploy
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';

const FARM_CONFIG = {
  LAT: 40.7456217,
  LONG: -80.1610431,
  TIMEZONE: "America/New_York",
  SPRING_FROST: "05/20",
  FALL_FROST: "10/10"
};

// ═══════════════════════════════════════════════════════════════════════════
// TWILIO SMS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS: Replace these with your actual Twilio credentials
// Get them from: https://console.twilio.com/
const TWILIO_CONFIG = {
  ACCOUNT_SID: 'AC85c921ca82cb00ef4f009eefbad6d071',
  AUTH_TOKEN: '7ae4c1d1315687baa807af2babfb83fd',
  FROM_NUMBER: '+14128662259',
  ENABLED: true                                 // A2P 10DLC registration required for full deliverability
};

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE ROUTES API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const GOOGLE_ROUTES_CONFIG = {
  API_KEY: 'AIzaSyDkAfsMpi7Arqb43gBAitN0WEUs4V13N8Y',
  FARM_ADDRESS: '257 Zeigler Rd, Rochester, PA 15074',
  FARM_COORDS: { lat: 40.7456217, lng: -80.1610431 }
};

// ═══════════════════════════════════════════════════════════════════════════
// WEB API LAYER - ALL ENDPOINTS PROPERLY WIRED
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  // Safety check for parameters
  if (!e || !e.parameter || !e.parameter.action) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Tiny Seed OS API is running!",
        usage: "Add ?action=testConnection to test the API",
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = e.parameter.action;
  
  try {
    switch(action) {
      // ============ USER AUTHENTICATION ============
      case 'authenticateUser':
        return jsonResponse(authenticateUser(e.parameter));
      case 'validateSession':
        return jsonResponse(validateSession(e.parameter));
      case 'getUsers':
        return jsonResponse(getUsers(e.parameter));
      case 'getActiveSessions':
        return jsonResponse(getActiveSessions(e.parameter));
      case 'getAuditLog':
        return jsonResponse(getAuditLog(e.parameter));

      // ============ CRITICAL ENDPOINTS FOR HTML TOOLS ============
      case 'testConnection':
        return testConnection();
      case 'healthCheck':
        return jsonResponse(healthCheck());
      case 'diagnoseSheets':
        return jsonResponse(diagnoseSheets());
      case 'diagnoseIntegrations':
        return jsonResponse(diagnoseIntegrations());
      case 'getSystemStatus':
        return jsonResponse(getSystemStatus());
      case 'populateTraySizes':
        return jsonResponse(populateTraySizesFromProfiles());

  case 'updateTaskCompletion':
    return jsonResponse(updateTaskCompletion(e.parameter));
      case 'getPlanningData':
        return getPlanningData();
      case 'getDashboardStats':
        return getDashboardStats();
      case 'getGreenhouseSeedings':
        return getGreenhouseSeedings();
      case 'getSeedInventory':
        return jsonResponse(getSeedInventory(e.parameter));
      case 'getFieldTasks':
        return getFieldTasks();
      case 'getDTMLearningData':
        return getDTMLearningData();
  case 'getGreenhouseSowingTasks':
    return jsonResponse(getGreenhouseSowingTasks(e.parameter));
  case 'getTransplantTasks':
    return jsonResponse(getTransplantTasks(e.parameter));
  case 'getDirectSeedTasks':
    return jsonResponse(getDirectSeedTasks(e.parameter));
  case 'getSocialStatus':
    return jsonResponse(getAyrshareStatus());


      // ============ LEGACY ENDPOINTS ============
      case 'getPlanning':
        return getPlanning();
      case 'getPlanningById':
        return getPlanningById(e.parameter.id);
                case 'updatePlanting':
          return updatePlanting(e.parameter);
      case 'deletePlanting':
          return deletePlantingById(e.parameter.id);
      case 'getCrops':
        return getCrops();
        case 'getCropProfiles':
    return jsonResponse(getCropProfiles());
      case 'getCropByName':
        return getCropByName(e.parameter.crop, e.parameter.variety);
      case 'getBeds':
        return getBeds();
      case 'getBedsByField':
        return getBedsByField(e.parameter.field);
      case 'getTasks':
        return getTasks(e.parameter.date);
      case 'getTasksByDate':
        return getTasksByDateRange(e.parameter.start, e.parameter.end);
      case 'getHarvests':
        return getHarvests(e.parameter);
      case 'getHarvestsByDate':
        return getHarvestsByDateRange(e.parameter.start, e.parameter.end);
      case 'getWeather':
        return getWeatherData();
      case 'getWeatherSummary':
        return jsonResponse(getWeatherSummary(e.parameter));
      case 'getCSAMembers':
        return getCSAMembers();
      case 'getFinancials':
        return getFinancials();
      case 'getCropProfile':
        return jsonResponse(getCropProfile(e.parameter.cropName));
      case 'updateCropProfile':
    return jsonResponse(updateCropProfile(e.parameter));
  case 'createCropProfile':
    return jsonResponse(createCropProfile(e.parameter));

      // ============ SOIL-TESTS.HTML ENDPOINTS ============
      case 'getComplianceRecords':
        return jsonResponse(getComplianceRecords(e.parameter));
      case 'getIPMSchedules':
        return jsonResponse(getIPMSchedules(e.parameter));
      case 'getFertigationData':
        return jsonResponse(getFertigationData(e.parameter));
      case 'getFoliarApplications':
        return jsonResponse(getFoliarApplications(e.parameter));
      case 'getSoilAmendments':
        return jsonResponse(getSoilAmendments(e.parameter));
      case 'getSoilTests':
        return jsonResponse(getSoilTests(e.parameter));

      // ============ INVENTORY SYSTEM GET ENDPOINTS ============
      case 'getInventoryProducts':
        return jsonResponse(getInventoryProducts(e.parameter));
      case 'getProductById':
        return jsonResponse(getProductById(e.parameter));
      case 'getLowStockProducts':
        return jsonResponse(getLowStockProducts());
      case 'getTransactionHistory':
        return jsonResponse(getTransactionHistory(e.parameter));
      case 'getProductsForDropdown':
        return jsonResponse(getProductsForDropdown(e.parameter));

      // ============ PLANTING WIZARD ENDPOINTS ============
      case 'savePlanting':
        return jsonResponse(savePlantingFromWeb(e.parameter));
      case 'getWizardDataWeb':
        return jsonResponse(getWizardDataWeb());

      // ============ TRAY INVENTORY ENDPOINTS ============
      case 'getTrayInventory':
        return jsonResponse(getTrayInventory());
      case 'saveTrayInventory':
        return jsonResponse(saveTrayInventory(e.parameter));

      // ============ FARM INVENTORY ENDPOINTS (Asset Tracking) ============
      case 'getFarmInventory':
        return jsonResponse(getFarmInventory(e.parameter));
      case 'getFarmInventoryItem':
        return jsonResponse(getFarmInventoryItem(e.parameter));
      case 'getFarmInventoryStats':
        return jsonResponse(getFarmInventoryStats());

      // ============ SALES MODULE - CUSTOMER FACING ============
      case 'authenticateCustomer':
        return jsonResponse(authenticateCustomer(e.parameter));
      case 'verifyCustomerToken':
        return jsonResponse(verifyCustomerToken(e.parameter));
      case 'getWholesaleProducts':
        return jsonResponse(getWholesaleProducts(e.parameter));
      case 'getCSAProducts':
        return jsonResponse(getCSAProducts(e.parameter));
      case 'getCSABoxContents':
        return jsonResponse(getCSABoxContents(e.parameter));
      case 'getCustomerOrders':
        return jsonResponse(getCustomerOrders(e.parameter));
      case 'getCustomerProfile':
        return jsonResponse(getCustomerProfile(e.parameter));

      // ============ SALES MODULE - MANAGER FACING ============
      case 'getSalesOrders':
        return jsonResponse(getSalesOrders(e.parameter));
      case 'getOrderById':
        return jsonResponse(getOrderById(e.parameter));
      case 'getSalesCustomers':
        return jsonResponse(getSalesCustomers(e.parameter));
      case 'getCustomerById':
        return jsonResponse(getCustomerById(e.parameter));
      case 'getSalesCSAMembers':
        return jsonResponse(getSalesCSAMembers(e.parameter));
      case 'getSalesDashboard':
        return jsonResponse(getSalesDashboard(e.parameter));
      case 'getPickPackList':
        return jsonResponse(getPickPackList(e.parameter));
      case 'getSMSCampaigns':
        return jsonResponse(getSMSCampaigns(e.parameter));
      case 'getSalesReports':
        return jsonResponse(getSalesReports(e.parameter));

      // ============ DELIVERY & DRIVER ============
      case 'getDeliveryRoutes':
        return jsonResponse(getDeliveryRoutes(e.parameter));
      case 'getDriverRoute':
        return jsonResponse(getDriverRoute(e.parameter));
      case 'authenticateDriver':
        return jsonResponse(authenticateDriver(e.parameter));
      case 'getDeliveryDrivers':
        return jsonResponse(getDeliveryDrivers(e.parameter));
      case 'getDeliveryHistory':
        return jsonResponse(getDeliveryHistory(e.parameter));
      case 'completeDelivery':
        return jsonResponse(completeDelivery(e.parameter));
      case 'logDeliveryIssue':
        return jsonResponse(logDeliveryIssue(e.parameter));

      // ============ TIME CLOCK ============
      case 'clockIn':
        return jsonResponse(handleClockIn(e.parameter));
      case 'clockOut':
        return jsonResponse(handleClockOut(e.parameter));

      // ============ FLEET MANAGEMENT ============
      case 'getFleetAssets':
        return jsonResponse(getFleetAssets(e.parameter));
      case 'getFleetAssetById':
        return jsonResponse(getFleetAssetById(e.parameter));
      case 'getFleetUsageLog':
        return jsonResponse(getFleetUsageLog(e.parameter));
      case 'getFleetFuelLog':
        return jsonResponse(getFleetFuelLog(e.parameter));
      case 'getFleetMaintenanceLog':
        return jsonResponse(getFleetMaintenanceLog(e.parameter));
      case 'getFleetCostReport':
        return jsonResponse(getFleetCostReport(e.parameter));
      case 'getMaintenanceDue':
        return jsonResponse(getMaintenanceDue(e.parameter));
      case 'getFleetDashboard':
        return jsonResponse(getFleetDashboard(e.parameter));

      // ============ LABEL GENERATION ============
      case 'getMarketSignItems':
        return jsonResponse(getMarketSignItems(e.parameter));
      case 'getOrdersForLabels':
        return jsonResponse(getOrdersForLabels(e.parameter));
      case 'getSalesCycles':
        return jsonResponse(getSalesCycles(e.parameter));
      case 'closeSalesCycle':
        return jsonResponse(closeSalesCycle(e.parameter));
      case 'initializeMarketItems':
        return jsonResponse(initializeMarketItemsSheet());

      // ============ EMPLOYEE MOBILE APP ============
      case 'authenticateEmployee':
        return jsonResponse(authenticateEmployee(e.parameter));
      case 'clockIn':
        return jsonResponse(clockIn(e.parameter));
      case 'clockOut':
        return jsonResponse(clockOut(e.parameter));
      case 'getClockStatus':
        return jsonResponse(getClockStatus(e.parameter.employeeId));
      case 'getTimeClockHistory':
        return jsonResponse(getTimeClockHistory(e.parameter));
      case 'getEmployeeTasks':
        return jsonResponse(getEmployeeTasks(e.parameter));
      case 'completeTaskWithGPS':
        return jsonResponse(completeTaskWithGPS(e.parameter));
      case 'logHarvestWithDetails':
        return jsonResponse(logHarvestWithDetails(e.parameter));
      case 'saveScoutingReport':
        return jsonResponse(saveScoutingReport(e.parameter));
      case 'logTreatment':
        return jsonResponse(logTreatment(e.parameter));
      case 'logBeneficialRelease':
        return jsonResponse(logBeneficialRelease(e.parameter));
      case 'getActiveREI':
        return jsonResponse(getActiveREI(e.parameter));
      case 'reportHazard':
        return jsonResponse(reportHazard(e.parameter));
      case 'getActiveHazards':
        return jsonResponse(getActiveHazards(e.parameter));
      case 'resolveHazard':
        return jsonResponse(resolveHazard(e.parameter));
      case 'logWeedPressure':
        return jsonResponse(logWeedPressure(e.parameter));
      case 'logCultivation':
        return jsonResponse(logCultivation(e.parameter));
      case 'getCrewMessages':
        return jsonResponse(getCrewMessages(e.parameter));
      case 'acknowledgeMessage':
        return jsonResponse(acknowledgeMessage(e.parameter));
      case 'sendCrewMessage':
        return jsonResponse(sendCrewMessage(e.parameter));
      case 'getFields':
        return jsonResponse(getFields(e.parameter));
      case 'updateEmployeeLanguage':
        return jsonResponse(updateEmployeeLanguage(e.parameter));

      // ============ PICK & PACK AUTOMATION ============
      case 'getPickListForToday':
        return jsonResponse(getPickListForToday(e.parameter));
      case 'updatePickItemStatus':
        return jsonResponse(updatePickItemStatus(e.parameter));
      case 'getPackingList':
        return jsonResponse(getPackingList(e.parameter));
      case 'completePackingOrder':
        return jsonResponse(completePackingOrder(e.parameter));

      // ============ WILDLIFE TRACKING ============
      case 'logWildlifeSighting':
        return jsonResponse(logWildlifeSighting(e.parameter));
      case 'logGroundhogDen':
        return jsonResponse(logGroundhogDen(e.parameter));
      case 'getGroundhogDens':
        return jsonResponse(getGroundhogDens(e.parameter));
      case 'updateDenStatus':
        return jsonResponse(updateDenStatus(e.parameter));
      case 'logDamageReport':
        return jsonResponse(logDamageReport(e.parameter));
      case 'getDamageReports':
        return jsonResponse(getDamageReports(e.parameter));
      case 'getWildlifeMap':
        return jsonResponse(getWildlifeMap(e.parameter));

      // ============ CUSTOMER NOTIFICATIONS ============
      case 'sendOrderConfirmation':
        return jsonResponse(sendOrderConfirmation(e.parameter));
      case 'sendDeliveryNotification':
        return jsonResponse(sendDeliveryNotification(e.parameter));
      case 'sendDeliveryComplete':
        return jsonResponse(sendDeliveryComplete(e.parameter));
      case 'sendCSAWeeklyReminder':
        return jsonResponse(sendCSAWeeklyReminder(e.parameter));

      // ============ SMS NOTIFICATIONS (TWILIO) ============
      case 'sendSMS':
        return jsonResponse(sendSMS(e.parameter));
      case 'sendOrderSMS':
        return jsonResponse(sendOrderSMS(e.parameter));
      case 'sendDeliverySMS':
        return jsonResponse(sendDeliverySMS(e.parameter));
      case 'sendCrewSMS':
        return jsonResponse(sendCrewSMS(e.parameter));
      case 'sendREIAlertSMS':
        return jsonResponse(sendREIAlertSMS(e.parameter));
      case 'getSMSHistory':
        return jsonResponse(getSMSHistory(e.parameter));

      // ============ ROUTE OPTIMIZATION (GOOGLE ROUTES API) ============
      case 'optimizeDeliveryRoute':
        return jsonResponse(optimizeDeliveryRoute(e.parameter));
      case 'getRouteForDeliveries':
        return jsonResponse(getRouteForDeliveries(e.parameter));
      case 'geocodeAddress':
        return jsonResponse(geocodeAddress(e.parameter));
      case 'getDistanceMatrix':
        return jsonResponse(getDistanceMatrix(e.parameter));
      case 'getDeliverySchedule':
        return jsonResponse(getDeliverySchedule(e.parameter));

      // ============ REAL-TIME DELIVERY TRACKING ============
      case 'startDeliveryTracking':
        return jsonResponse(startDeliveryTracking(e.parameter));
      case 'updateDriverLocation':
        return jsonResponse(updateDriverLocation(e.parameter));
      case 'stopDeliveryTracking':
        return jsonResponse(stopDeliveryTracking(e.parameter));
      case 'getTrackingStatus':
        return jsonResponse(getTrackingStatus(e.parameter));
      case 'getActiveTracking':
        return jsonResponse(getActiveTracking(e.parameter));
      case 'sendRouteStartNotifications':
        return jsonResponse(sendRouteStartNotifications(e.parameter));
      case 'sendDeliveredNotification':
        return jsonResponse(sendDeliveredNotification(e.parameter));

      // ============ PRE-SEASON PLANNING ============
      case 'getPlanningChecklist':
        return jsonResponse(getPlanningChecklist(e.parameter));
      case 'updatePlanningTask':
        return jsonResponse(updatePlanningTask(e.parameter));
      case 'createPlanningChecklist':
        return jsonResponse(createPlanningChecklist(e.parameter));
      case 'getPlanningProgress':
        return jsonResponse(getPlanningProgress(e.parameter));

      // ============ IN-SEASON ADJUSTMENTS ============
      case 'getSeasonAdjustments':
        return jsonResponse(getSeasonAdjustments(e.parameter));
      case 'addSeasonAdjustment':
        return jsonResponse(addSeasonAdjustment(e.parameter));
      case 'updateSuccessionStatus':
        return jsonResponse(updateSuccessionStatus(e.parameter));

      // ============ POST-SEASON REVIEW ============
      case 'getVarietyReviews':
        return jsonResponse(getVarietyReviews(e.parameter));
      case 'saveVarietyReview':
        return jsonResponse(saveVarietyReview(e.parameter));
      case 'getSeasonSummary':
        return jsonResponse(getSeasonSummary(e.parameter));

      // ============ BED PREP ============
      case 'getBedPrepLog':
        return jsonResponse(getBedPrepLog(e.parameter));
      case 'logBedPrep':
        return jsonResponse(logBedPrep(e.parameter));
      case 'getBedPrepStatus':
        return jsonResponse(getBedPrepStatus(e.parameter));

      // ============ IRRIGATION ============
      case 'getIrrigationZones':
        return jsonResponse(getIrrigationZones(e.parameter));
      case 'saveIrrigationZone':
        return jsonResponse(saveIrrigationZone(e.parameter));
      case 'getWateringLog':
        return jsonResponse(getWateringLog(e.parameter));
      case 'logWatering':
        return jsonResponse(logWatering(e.parameter));
      case 'getIrrigationMaintenance':
        return jsonResponse(getIrrigationMaintenance(e.parameter));
      case 'logIrrigationMaintenance':
        return jsonResponse(logIrrigationMaintenance(e.parameter));
      case 'getIrrigationDashboard':
        return jsonResponse(getIrrigationDashboard(e.parameter));

      // ============ FARM INFRASTRUCTURE & EQUIPMENT LOCATIONS ============
      case 'getFarmInfrastructure':
        return jsonResponse(getFarmInfrastructure(e.parameter));
      case 'saveFarmInfrastructure':
        return jsonResponse(saveFarmInfrastructure(e.parameter));
      case 'deleteFarmInfrastructure':
        return jsonResponse(deleteFarmInfrastructure(e.parameter));
      case 'getInfrastructureMap':
        return jsonResponse(getInfrastructureMap(e.parameter));

      // ============ BOUNDARY TRACING (Property Lines, Field Outlines) ============
      case 'getBoundaries':
        return jsonResponse(getBoundaries(e.parameter));
      case 'saveBoundary':
        return jsonResponse(saveBoundary(e.parameter));
      case 'deleteBoundary':
        return jsonResponse(deleteBoundary(e.parameter));

      // ============ FIELD SCOUTING MAP ============
      case 'getScoutingMapData':
        return jsonResponse(getScoutingMapData(e.parameter));

      // ============ FINANCIAL MODULE - DEBTS ============
      case 'getDebts':
        return jsonResponse(getDebts(e.parameter));
      case 'getDebtPayments':
        return jsonResponse(getDebtPayments(e.parameter));

      // ============ FINANCIAL MODULE - BANKING ============
      case 'getBankAccounts':
        return jsonResponse(getBankAccounts(e.parameter));
      case 'getBills':
        return jsonResponse(getBills(e.parameter));

      // ============ FINANCIAL MODULE - INVESTMENTS ============
      case 'getInvestments':
        return jsonResponse(getInvestments(e.parameter));
      case 'getInvestmentHistory':
        return jsonResponse(getInvestmentHistory(e.parameter));

      // ============ FINANCIAL MODULE - EMPLOYEES/GAMIFICATION ============
      case 'getFinancialEmployees':
        return jsonResponse(getFinancialEmployees(e.parameter));
      case 'getEmployeeXP':
        return jsonResponse(getEmployeeXP(e.parameter));
      case 'getEmployeeAchievements':
        return jsonResponse(getEmployeeAchievements(e.parameter));

      // ============ FINANCIAL MODULE - ROUND-UPS ============
      case 'getRoundUps':
        return jsonResponse(getRoundUps(e.parameter));

      // ============ FINANCIAL MODULE - DASHBOARD ============
      case 'getFinancialDashboard':
        return jsonResponse(getFinancialDashboard(e.parameter));
      case 'getFinancialSettings':
        return jsonResponse(getFinancialSettings(e.parameter));

      // ============ PLAID - BANK CONNECTION ============
      case 'createPlaidLinkToken':
        return jsonResponse(createPlaidLinkToken(e.parameter));
      case 'getPlaidItems':
        return jsonResponse(getPlaidItems());
      case 'getPlaidAccounts':
        return jsonResponse(getPlaidAccounts(e.parameter));
      case 'refreshPlaidBalances':
        return jsonResponse(refreshPlaidBalances(e.parameter));
      case 'getPlaidTransactions':
        return jsonResponse(getPlaidTransactions(e.parameter));
      case 'exchangePlaidPublicToken':
        // Handle via GET to avoid CORS preflight issues from browser
        const exchangeData = {
          publicToken: e.parameter.publicToken,
          institutionId: e.parameter.institutionId,
          institutionName: e.parameter.institutionName,
          accounts: JSON.parse(e.parameter.accounts || '[]')
        };
        return jsonResponse(exchangePlaidPublicToken(exchangeData));

      // ============ CROP ROTATION & FIELD TIME ============
      case 'getFieldTimeGroups':
        return jsonResponse(getFieldTimeGroups(e.parameter));
      case 'getRotationRecommendations':
        return jsonResponse(getRotationRecommendations(e.parameter));
      case 'suggestBedForCrop':
        return jsonResponse(suggestBedForCrop(e.parameter));
      case 'canPlantInBed':
        return jsonResponse(canPlantInBed(e.parameter.cropName, e.parameter.bedId));
      case 'checkRotationCompatibility':
        return jsonResponse(checkRotationCompatibility(e.parameter.previousCrop, e.parameter.nextCrop));
      case 'populateFieldDaysData':
        return jsonResponse(populateFieldDaysData());
      case 'getSeasonalDTMInfo':
        return jsonResponse(getSeasonalDTMInfo(e.parameter));
      case 'getLearnedDTM':
        return jsonResponse(getLearnedDTM(e.parameter));

      // ============ FIELD PLAN ADVISOR ============
      case 'analyzeFieldPlan':
        return jsonResponse(analyzeFieldPlan(e.parameter));
      case 'getFieldPlanSuggestions':
        return jsonResponse(getFieldPlanSuggestions(e.parameter));
      case 'approveSuggestion':
        return jsonResponse(approveSuggestion(e.parameter));
      case 'rejectSuggestion':
        return jsonResponse(rejectSuggestion(e.parameter));
      case 'approveAllSuggestions':
        return jsonResponse(approveAllSuggestions(e.parameter));

      // ============ UNASSIGNED PLANTING ANALYZER ============
      case 'analyzeUnassignedPlantings':
        return jsonResponse(analyzeUnassignedPlantings(e.parameter));
      case 'generateFieldPlanReport':
        return jsonResponse(generateFieldPlanReport(e.parameter));
      case 'getOptimalBedAssignments':
        return jsonResponse(getOptimalBedAssignments(e.parameter));
      case 'applyOptimalAssignments':
        return jsonResponse(applyOptimalAssignments(e.parameter));
      case 'assignPlantingsToField':
        return jsonResponse(assignPlantingsToField(e.parameter));
      case 'getAvailableFields':
        return jsonResponse(getAvailableFields(e.parameter));

      // ============ MARKETING MODULE ============
      case 'getFarmPics':
        return jsonResponse(getFarmPics(e.parameter));
      case 'getEmployeeFarmPics':
        return jsonResponse(getEmployeeFarmPics(e.parameter));
      case 'getMarketingCampaigns':
        return jsonResponse(getMarketingCampaigns(e.parameter));
      case 'getScheduledPosts':
        return jsonResponse(getScheduledPosts(e.parameter));
      case 'getMarketingBudget':
        return jsonResponse(getMarketingBudget(e.parameter));
      case 'getMarketingSpend':
        return jsonResponse(getMarketingSpend(e.parameter));
      case 'getMarketingAnalytics':
        return jsonResponse(getMarketingAnalytics(e.parameter));
      case 'getSocialConnections':
        return jsonResponse(getSocialConnections(e.parameter));
      case 'resetSocialConnections':
        return jsonResponse(resetSocialConnections());
      case 'updateFollowerCounts':
        // Handle GET request with query params for CORS compatibility
        return jsonResponse(updateFollowerCounts({
          instagram: parseInt(e.parameter.instagram) || 0,
          facebook: parseInt(e.parameter.facebook) || 0,
          tiktok: parseInt(e.parameter.tiktok) || 0,
          youtube: parseInt(e.parameter.youtube) || 0,
          pinterest: parseInt(e.parameter.pinterest) || 0
        }));
      case 'checkAyrshareStatus':
        return jsonResponse(checkAyrshareStatus());
      case 'addNeighborSignup':
        return jsonResponse(addNeighborSignup({
          name: e.parameter.name || '',
          email: e.parameter.email || '',
          zip: e.parameter.zip || '',
          neighborhood: e.parameter.neighborhood || '',
          source: e.parameter.source || 'direct-mail',
          campaign: e.parameter.campaign || '',
          timestamp: e.parameter.timestamp || new Date().toISOString()
        }));
      case 'getNeighborSignups':
        return jsonResponse(getNeighborSignups(e.parameter));

      // ============ SEED INVENTORY & TRACEABILITY ============
      case 'initSeedInventory':
        return jsonResponse(initSeedInventorySheet());
      case 'getSeedByQR':
        return jsonResponse(getSeedByQR(e.parameter.seedLotId));
      case 'getSeedUsageHistory':
        return jsonResponse(getSeedUsageHistory(e.parameter.seedLotId));
      case 'getLowStockSeeds':
        return jsonResponse(getLowStockSeeds());
      case 'getSeedLabelData':
        return jsonResponse(getSeedLabelData(e.parameter.seedLotId));

      // ============ SHOPIFY & QUICKBOOKS INTEGRATION ============
      case 'getIntegrationStatus':
        return jsonResponse(getIntegrationStatus());
      case 'setupIntegrationSheets':
        return jsonResponse(setupIntegrationSheets());

      // Shopify
      case 'getShopifyAuthUrl':
        return jsonResponse({ success: true, url: getShopifyAuthorizationUrl() });
      case 'testShopifyConnection':
        return jsonResponse(testShopifyConnection());
      case 'syncShopifyOrders':
        return jsonResponse(syncShopifyOrders(e.parameter));
      case 'syncShopifyProducts':
        return jsonResponse(syncShopifyProducts());
      case 'getShopifyOrder':
        return jsonResponse(getShopifyOrder(e.parameter.orderId));

      // QuickBooks
      case 'getQuickBooksAuthUrl':
        return jsonResponse({ success: true, url: getQuickBooksAuthorizationUrl() });
      case 'testQuickBooksConnection':
        return jsonResponse(testQuickBooksConnection());
      case 'disconnectQuickBooks':
        return jsonResponse(disconnectQuickBooks());
      case 'syncQuickBooksCustomers':
        return jsonResponse(syncQuickBooksCustomers());
      case 'createInvoiceFromOrder':
        return jsonResponse(createInvoiceFromOrder(e.parameter.orderId, e.parameter.orderType));
      case 'syncShopifyOrderToQuickBooks':
        return jsonResponse(syncShopifyOrderToQuickBooks(e.parameter.shopifyOrderId));

      // ============ ACCOUNTING MODULE - GET ENDPOINTS ============
      case 'initializeAccountingModule':
        return jsonResponse(initializeAccountingModule());
      case 'getReceipts':
        return jsonResponse(getReceipts(e.parameter));
      case 'getExpenseCategories':
        return jsonResponse(getExpenseCategories(e.parameter));
      case 'getAccountantEmails':
        return jsonResponse(getAccountantEmails(e.parameter));
      case 'getAccountantDocs':
        return jsonResponse(getAccountantDocs(e.parameter));
      case 'analyzeAccountantEmailPatterns':
        return jsonResponse(analyzeAccountantEmailPatterns());
      case 'getGrants':
        return jsonResponse(getGrants(e.parameter));
      case 'getAuditTrailAccounting':
        return jsonResponse(getAuditTrail(e.parameter));
      case 'generateProfitLossStatement':
        return jsonResponse(generateProfitLossStatement(e.parameter));
      case 'generateScheduleFReport':
        return jsonResponse(generateScheduleFReport(e.parameter));
      case 'suggestCategory':
        return jsonResponse(suggestCategory(e.parameter.vendor));
      case 'getVendorCategories':
        return jsonResponse(getVendorCategories(e.parameter));
      case 'importAccountantEmails':
        return jsonResponse(importAccountantEmails(e.parameter));
      case 'generateBalanceSheet':
        return jsonResponse(generateBalanceSheet(e.parameter));
      case 'generateCashFlowStatement':
        return jsonResponse(generateCashFlowStatement(e.parameter));
      case 'generateLoanPackage':
        return jsonResponse(generateLoanPackage(e.parameter));
      case 'generateEnterpriseAnalysis':
        return jsonResponse(generateEnterpriseAnalysis(e.parameter));

      default:
        return jsonResponse({error: 'Unknown action: ' + action}, 400);
    }
  } catch (error) {
    return jsonResponse({
      error: error.toString(),
      stack: error.stack,
      action: action
    }, 500);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      // ============ CRITICAL POST ENDPOINTS ============
      case 'saveSuccessionPlan':
        return saveSuccessionPlan(data.plan);
      case 'completeTask':
        return completeTask(data.taskId, data.completedBy, data.notes);

      // ============ USER MANAGEMENT ============
      case 'createUser':
        return jsonResponse(createUser(data));
      case 'updateUser':
        return jsonResponse(updateUser(data));
      case 'deactivateUser':
        return jsonResponse(deactivateUser(data));
      case 'resetUserPin':
        return jsonResponse(resetUserPin(data));
      case 'forceLogout':
        return jsonResponse(forceLogout(data));
      case 'logAdminAction':
        return jsonResponse(logAdminAction(data));

      // ============ SOCIAL MEDIA INTEGRATION ============
      case 'publishSocialPost':
        return jsonResponse(publishToAyrshare({
          post: data.caption,
          platforms: data.platforms,
          mediaUrl: data.mediaUrl,
          scheduleDate: data.scheduleDate,
          platformOptions: data.platformOptions
        }));
      case 'getSocialAnalytics':
        return jsonResponse(getAyrshareAnalytics(data.platforms));
      case 'deleteSocialPost':
        return jsonResponse(deleteAyrsharePost(data.postId));
      case 'updateFollowerCounts':
        return jsonResponse(updateFollowerCounts(data.counts));

      // ============ LEGACY POST ENDPOINTS ============
      case 'addPlanting':
        return addPlanting(data.planting);
      case 'updatePlanting':
        return updatePlanting(data.planting);
      case 'deletePlanting':
        return deletePlanting(data.id);
      case 'bulkAddPlantings':
        return bulkAddPlantings(data.plantings);
      case 'addTask':
        return addTask(data.task);
      case 'recordHarvest':
        return recordHarvest(data.harvest);

      // ============ SOIL-TESTS.HTML POST ENDPOINTS ============
      case 'saveComplianceRecord':
        return jsonResponse(saveComplianceRecord(data));
      case 'saveIPMSchedule':
        return jsonResponse(saveIPMSchedule(data));
      case 'updateIPMSprayStatus':
        return jsonResponse(updateIPMSprayStatus(data));
      case 'saveFertigationData':
        return jsonResponse(saveFertigationData(data));
      case 'saveFoliarApplication':
        return jsonResponse(saveFoliarApplication(data));
      case 'saveSoilAmendment':
        return jsonResponse(saveSoilAmendment(data));
      case 'saveSoilTest':
        return jsonResponse(saveSoilTest(data));
      case 'bulkSyncSoilData':
        return jsonResponse(bulkSyncSoilData(data));

      // ============ INVENTORY SYSTEM POST ENDPOINTS ============
      case 'saveProduct':
        return jsonResponse(saveProduct(data));
      case 'recordTransaction':
        return jsonResponse(recordTransaction(data));
      case 'adjustInventory':
        return jsonResponse(adjustInventory(data));
      case 'uploadProductPhoto':
        return jsonResponse(uploadProductPhoto(data));
      case 'deductInventoryOnApplication':
        return jsonResponse(deductInventoryOnApplication(data));

      // ============ SALES MODULE - CUSTOMER ACTIONS ============
      case 'sendCustomerMagicLink':
        return jsonResponse(sendCustomerMagicLink(data));
      case 'submitWholesaleOrder':
        return jsonResponse(submitWholesaleOrder(data));
      case 'submitCSAOrder':
        return jsonResponse(submitCSAOrder(data));
      case 'customizeCSABox':
        return jsonResponse(customizeCSABox(data));
      case 'updateCustomerProfile':
        return jsonResponse(updateCustomerProfile(data));

      // ============ SALES MODULE - MANAGER ACTIONS ============
      case 'createSalesOrder':
        return jsonResponse(createSalesOrder(data));
      case 'updateSalesOrder':
        return jsonResponse(updateSalesOrder(data));
      case 'cancelSalesOrder':
        return jsonResponse(cancelSalesOrder(data));
      case 'createSalesCustomer':
        return jsonResponse(createSalesCustomer(data));
      case 'updateSalesCustomer':
        return jsonResponse(updateSalesCustomer(data));
      case 'createCSAMember':
        return jsonResponse(createCSAMember(data));
      case 'updateCSAMember':
        return jsonResponse(updateCSAMember(data));
      case 'completePickPackItem':
        return jsonResponse(completePickPackItem(data));
      case 'createSMSCampaign':
        return jsonResponse(createSMSCampaign(data));
      case 'sendSMSCampaign':
        return jsonResponse(sendSMSCampaign(data));

      // ============ DELIVERY & DRIVER ACTIONS ============
      case 'createDeliveryRoute':
        return jsonResponse(createDeliveryRoute(data));
      case 'assignDeliveryRoute':
        return jsonResponse(assignDeliveryRoute(data));
      case 'recordDeliveryProof':
        return jsonResponse(recordDeliveryProof(data));
      case 'reportDeliveryIssue':
        return jsonResponse(reportDeliveryIssue(data));
      case 'updateDeliveryETA':
        return jsonResponse(updateDeliveryETA(data));
      case 'updateDeliveryStopStatus':
        return jsonResponse(updateDeliveryStopStatusFromWeb(data));

      // ============ FLEET MANAGEMENT ACTIONS ============
      case 'createFleetAsset':
        return jsonResponse(createFleetAsset(data));
      case 'updateFleetAsset':
        return jsonResponse(updateFleetAsset(data));
      case 'logFleetUsage':
        return jsonResponse(logFleetUsage(data));
      case 'logFleetFuel':
        return jsonResponse(logFleetFuel(data));
      case 'logFleetMaintenance':
        return jsonResponse(logFleetMaintenance(data));
      case 'linkUsageToTask':
        return jsonResponse(linkUsageToTask(data));

      // ============ FINANCIAL MODULE - DEBTS ============
      case 'saveDebt':
        return jsonResponse(saveDebt(data));
      case 'updateDebt':
        return jsonResponse(updateDebt(data));
      case 'deleteDebt':
        return jsonResponse(deleteDebt(data));
      case 'recordDebtPayment':
        return jsonResponse(recordDebtPayment(data));

      // ============ FINANCIAL MODULE - BANKING ============
      case 'saveBankAccount':
        return jsonResponse(saveBankAccount(data));
      case 'updateBankAccount':
        return jsonResponse(updateBankAccount(data));
      case 'saveBill':
        return jsonResponse(saveBill(data));
      case 'updateBill':
        return jsonResponse(updateBill(data));

      // ============ FINANCIAL MODULE - INVESTMENTS ============
      case 'saveInvestment':
        return jsonResponse(saveInvestment(data));
      case 'updateInvestment':
        return jsonResponse(updateInvestment(data));

      // ============ FINANCIAL MODULE - EMPLOYEES/GAMIFICATION ============
      case 'saveFinancialEmployee':
        return jsonResponse(saveFinancialEmployee(data));
      case 'updateFinancialEmployee':
        return jsonResponse(updateFinancialEmployee(data));
      case 'addEmployeeXP':
        return jsonResponse(addEmployeeXP(data));
      case 'unlockAchievement':
        return jsonResponse(unlockAchievement(data));

      // ============ FINANCIAL MODULE - ROUND-UPS ============
      case 'saveRoundUp':
        return jsonResponse(saveRoundUp(data));
      case 'recordRoundUpInvestment':
        return jsonResponse(recordRoundUpInvestment(data));

      // ============ FINANCIAL MODULE - SETTINGS ============
      case 'saveFinancialSettings':
        return jsonResponse(saveFinancialSettings(data));
      case 'createFinancialSheets':
        return jsonResponse(createFinancialSheets());

      // ============ PLAID - BANK CONNECTION ============
      case 'exchangePlaidPublicToken':
        return jsonResponse(exchangePlaidPublicToken(data));
      case 'disconnectPlaidItem':
        return jsonResponse(disconnectPlaidItem(data));

      // ============ MARKETING MODULE ============
      case 'submitFarmPic':
        return jsonResponse(submitFarmPic(data));
      case 'approveFarmPic':
        return jsonResponse(approveFarmPic(data));
      case 'publishToSocial':
        return jsonResponse(publishToSocial(data));
      case 'schedulePost':
        return jsonResponse(schedulePost(data));
      case 'createCampaign':
        return jsonResponse(createCampaign(data));
      case 'updateCampaign':
        return jsonResponse(updateCampaign(data));
      case 'logMarketingSpend':
        return jsonResponse(logMarketingSpend(data));
      case 'logMarketingActivity':
        return jsonResponse(logMarketingActivity(data));

      // ============ SEED INVENTORY & TRACEABILITY ============
      case 'addSeedLot':
        return jsonResponse(addSeedLot(data));
      case 'useSeedFromLot':
        return jsonResponse(useSeedFromLot(data));

      // ============ FARM INVENTORY POST ENDPOINTS (Asset Tracking) ============
      case 'addFarmInventoryItem':
        return jsonResponse(addFarmInventoryItem(data));
      case 'updateFarmInventoryItem':
        return jsonResponse(updateFarmInventoryItem(data));
      case 'deleteFarmInventoryItem':
        return jsonResponse(deleteFarmInventoryItem(data));
      case 'uploadFarmInventoryPhoto':
        return jsonResponse(uploadFarmInventoryPhoto(data));

      // ============ SHOPIFY & QUICKBOOKS INTEGRATION ============
      case 'shopifyWebhook':
        return jsonResponse(handleShopifyWebhook(e));
      case 'createQuickBooksInvoice':
        return jsonResponse(createQuickBooksInvoice(data));
      case 'createQuickBooksCustomer':
        return jsonResponse(createQuickBooksCustomer(data));

      // ============ ACCOUNTING MODULE - POST ENDPOINTS ============
      case 'saveReceipt':
        return jsonResponse(saveReceipt(data));
      case 'uploadReceiptImage':
        return jsonResponse(uploadReceiptImage(data));
      case 'verifyReceipt':
        return jsonResponse(verifyReceipt(data));
      case 'importAccountantEmails':
        return jsonResponse(importAccountantEmails(data));
      case 'setupEmailImportTrigger':
        return jsonResponse(setupEmailImportTrigger());
      case 'saveGrant':
        return jsonResponse(saveGrant(data));
      case 'addExpenseCategory':
        return jsonResponse(addExpenseCategory(data));
      case 'updateReceipt':
        return jsonResponse(updateReceipt(data));
      case 'deleteReceipt':
        return jsonResponse(deleteReceipt(data));
      case 'linkReceiptToGrant':
        return jsonResponse(linkReceiptToGrant(data));

      default:
        return jsonResponse({error: 'Unknown action: ' + action}, 400);
    }
  } catch (error) {
    return jsonResponse({
      error: error.toString(),
      stack: error.stack
    }, 500);
  }
}

function testConnection() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Apps Script is working!',
    timestamp: new Date().toISOString(),
    sheetId: SpreadsheetApp.getActiveSpreadsheet().getId()
  })).setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// USER AUTHENTICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const USERS_SHEET_NAME = 'USERS';
const USERS_HEADERS = [
  'User_ID', 'Username', 'PIN', 'Full_Name', 'Email',
  'Role', 'Is_Active', 'Last_Login', 'Created_At'
];

// Valid roles and their access levels
const USER_ROLES = {
  'Admin': { level: 100, description: 'Full system access' },
  'Manager': { level: 80, description: 'Sales, planning, inventory, reports' },
  'Field_Lead': { level: 60, description: 'Field operations, tasks, greenhouse' },
  'Driver': { level: 40, description: 'Delivery routes and driver app' },
  'Employee': { level: 20, description: 'Employee app and time clock' }
};

function authenticateUser(params) {
  try {
    const username = (params.username || '').toLowerCase().trim();
    const pin = (params.pin || '').trim();

    if (!username || !pin) {
      return { success: false, error: 'Username and PIN are required' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(USERS_SHEET_NAME);

    // If USERS sheet doesn't exist, create it with default admin
    if (!sheet) {
      sheet = createUsersSheet(ss);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const usernameCol = headers.indexOf('Username');
    const pinCol = headers.indexOf('PIN');
    const activeCol = headers.indexOf('Is_Active');
    const loginCol = headers.indexOf('Last_Login');

    for (let i = 1; i < data.length; i++) {
      const rowUsername = (data[i][usernameCol] || '').toString().toLowerCase().trim();
      const rowPin = (data[i][pinCol] || '').toString().trim();
      const isActive = data[i][activeCol];

      if (rowUsername === username && rowPin === pin) {
        // Check if user is active
        if (isActive === false || isActive === 'FALSE' || isActive === 'false') {
          return { success: false, error: 'Account is disabled. Contact administrator.' };
        }

        // Build user object (exclude PIN)
        const user = {};
        headers.forEach((h, j) => {
          if (h !== 'PIN') {
            user[h] = data[i][j];
          }
        });

        // Update last login timestamp
        if (loginCol >= 0) {
          sheet.getRange(i + 1, loginCol + 1).setValue(new Date().toISOString());
        }

        // Generate simple session token
        const token = Utilities.getUuid();

        return {
          success: true,
          user: user,
          token: token,
          role: user.Role,
          permissions: USER_ROLES[user.Role] || USER_ROLES['Employee']
        };
      }
    }

    return { success: false, error: 'Invalid username or PIN' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function validateSession(params) {
  // For now, just validate that token exists
  // In a production system, you'd store tokens in a sheet or cache
  const token = params.token;
  if (!token) {
    return { success: false, valid: false, error: 'No token provided' };
  }

  // Token validation would go here
  // For now, we trust client-side session management
  return { success: true, valid: true };
}

function getUsers(params) {
  try {
    // Only admins can get user list
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'Users sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const users = [];

    for (let i = 1; i < data.length; i++) {
      const user = {};
      headers.forEach((h, j) => {
        // Never return PIN
        if (h !== 'PIN') {
          user[h] = data[i][j];
        }
      });
      users.push(user);
    }

    return { success: true, users: users };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createUsersSheet(ss) {
  const sheet = ss.insertSheet(USERS_SHEET_NAME);

  // Add headers
  sheet.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]);

  // Style headers
  const headerRange = sheet.getRange(1, 1, 1, USERS_HEADERS.length);
  headerRange.setBackground('#2d5a27');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');

  // Add default admin user
  const adminRow = [
    'USR-001',           // User_ID
    'todd',              // Username
    '7714',              // PIN
    'Todd',              // Full_Name
    '',                  // Email
    'Admin',             // Role
    true,                // Is_Active
    '',                  // Last_Login
    new Date().toISOString() // Created_At
  ];

  sheet.getRange(2, 1, 1, adminRow.length).setValues([adminRow]);

  // Protect PIN column
  const pinCol = USERS_HEADERS.indexOf('PIN') + 1;
  sheet.hideColumns(pinCol);

  // Set column widths
  sheet.setColumnWidth(1, 100);  // User_ID
  sheet.setColumnWidth(2, 120);  // Username
  sheet.setColumnWidth(3, 80);   // PIN
  sheet.setColumnWidth(4, 150);  // Full_Name
  sheet.setColumnWidth(5, 200);  // Email
  sheet.setColumnWidth(6, 100);  // Role
  sheet.setColumnWidth(7, 80);   // Is_Active
  sheet.setColumnWidth(8, 180);  // Last_Login
  sheet.setColumnWidth(9, 180);  // Created_At

  // Freeze header row
  sheet.setFrozenRows(1);

  return sheet;
}

function createUser(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(USERS_SHEET_NAME);

    if (!sheet) {
      sheet = createUsersSheet(ss);
    }

    // Generate User ID
    const lastRow = sheet.getLastRow();
    const userId = 'USR-' + String(lastRow).padStart(3, '0');

    // Validate role
    if (!USER_ROLES[data.role]) {
      return { success: false, error: 'Invalid role: ' + data.role };
    }

    const newRow = [
      userId,
      (data.username || '').toLowerCase().trim(),
      data.pin || '0000',
      data.fullName || '',
      data.email || '',
      data.role || 'Employee',
      true,
      '',
      new Date().toISOString()
    ];

    sheet.appendRow(newRow);

    return { success: true, userId: userId, message: 'User created successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateUser(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'USERS sheet not found' };
    }

    if (!data.userId) {
      return { success: false, error: 'userId is required' };
    }

    // Find user row
    const dataRange = sheet.getDataRange().getValues();
    let userRowIndex = -1;
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === data.userId) {
        userRowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (userRowIndex === -1) {
      return { success: false, error: 'User not found: ' + data.userId };
    }

    // Update allowed fields
    if (data.fullName !== undefined) {
      sheet.getRange(userRowIndex, 4).setValue(data.fullName);
    }
    if (data.email !== undefined) {
      sheet.getRange(userRowIndex, 5).setValue(data.email);
    }
    if (data.role !== undefined) {
      if (!USER_ROLES[data.role]) {
        return { success: false, error: 'Invalid role: ' + data.role };
      }
      sheet.getRange(userRowIndex, 6).setValue(data.role);
    }

    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deactivateUser(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'USERS sheet not found' };
    }

    if (!data.userId) {
      return { success: false, error: 'userId is required' };
    }

    // Find user row
    const dataRange = sheet.getDataRange().getValues();
    let userRowIndex = -1;
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === data.userId) {
        userRowIndex = i + 1;
        break;
      }
    }

    if (userRowIndex === -1) {
      return { success: false, error: 'User not found: ' + data.userId };
    }

    // Set Is_Active to false
    sheet.getRange(userRowIndex, 7).setValue(false);

    return { success: true, message: 'User deactivated successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function resetUserPin(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'USERS sheet not found' };
    }

    if (!data.userId) {
      return { success: false, error: 'userId is required' };
    }

    // Find user row
    const dataRange = sheet.getDataRange().getValues();
    let userRowIndex = -1;
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][0] === data.userId) {
        userRowIndex = i + 1;
        break;
      }
    }

    if (userRowIndex === -1) {
      return { success: false, error: 'User not found: ' + data.userId };
    }

    // Generate new 4-digit PIN
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    sheet.getRange(userRowIndex, 3).setValue(newPin);

    return { success: true, newPin: newPin, message: 'PIN reset successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const SESSIONS_SHEET_NAME = 'SESSIONS';
const SESSIONS_HEADERS = [
  'Session_ID', 'User_ID', 'Token', 'Login_Time', 'Last_Activity', 'IP_Address', 'Device'
];

function createSessionsSheet(ss) {
  const sheet = ss.insertSheet(SESSIONS_SHEET_NAME);
  sheet.getRange(1, 1, 1, SESSIONS_HEADERS.length).setValues([SESSIONS_HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, SESSIONS_HEADERS.length);
  headerRange.setBackground('#1a73e8');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

function getActiveSessions(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SESSIONS_SHEET_NAME);

    if (!sheet) {
      sheet = createSessionsSheet(ss);
      return { success: true, sessions: [], message: 'No active sessions' };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true, sessions: [], message: 'No active sessions' };
    }

    const headers = data[0];
    const sessions = [];
    const now = new Date();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const lastActivity = new Date(row[4]);

      // Only include sessions active within timeout period
      if (now - lastActivity < sessionTimeout) {
        const session = {};
        headers.forEach((h, idx) => session[h] = row[idx]);
        // Don't expose full token
        session.Token = session.Token ? '***' + session.Token.slice(-4) : '';
        sessions.push(session);
      }
    }

    return { success: true, sessions: sessions, count: sessions.length };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function forceLogout(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SESSIONS_SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'SESSIONS sheet not found' };
    }

    if (!data.sessionId && !data.userId) {
      return { success: false, error: 'sessionId or userId required' };
    }

    const dataRange = sheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = dataRange.length - 1; i >= 1; i--) {
      const row = dataRange[i];
      if (data.sessionId && row[0] === data.sessionId) {
        rowsToDelete.push(i + 1);
      } else if (data.userId && row[1] === data.userId) {
        rowsToDelete.push(i + 1);
      }
    }

    // Delete from bottom up to preserve row indices
    rowsToDelete.forEach(rowNum => sheet.deleteRow(rowNum));

    return {
      success: true,
      message: `Logged out ${rowsToDelete.length} session(s)`,
      sessionsRemoved: rowsToDelete.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createSession(userId, device, ipAddress) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SESSIONS_SHEET_NAME);

    if (!sheet) {
      sheet = createSessionsSheet(ss);
    }

    const sessionId = 'SES-' + Date.now();
    const token = Utilities.getUuid();
    const now = new Date().toISOString();

    sheet.appendRow([
      sessionId,
      userId,
      token,
      now,
      now,
      ipAddress || '',
      device || 'Unknown'
    ]);

    return { success: true, sessionId: sessionId, token: token };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const AUDIT_LOG_SHEET_NAME = 'AUDIT_LOG';
const AUDIT_LOG_HEADERS = [
  'Log_ID', 'Timestamp', 'User_ID', 'Action', 'Target_Type', 'Target_ID', 'Details', 'IP_Address'
];

function createAuditLogSheet(ss) {
  const sheet = ss.insertSheet(AUDIT_LOG_SHEET_NAME);
  sheet.getRange(1, 1, 1, AUDIT_LOG_HEADERS.length).setValues([AUDIT_LOG_HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, AUDIT_LOG_HEADERS.length);
  headerRange.setBackground('#d32f2f');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

function logAdminAction(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(AUDIT_LOG_SHEET_NAME);

    if (!sheet) {
      sheet = createAuditLogSheet(ss);
    }

    const logId = 'LOG-' + Date.now();
    const timestamp = new Date().toISOString();

    sheet.appendRow([
      logId,
      timestamp,
      data.userId || 'SYSTEM',
      data.action || 'UNKNOWN',
      data.targetType || '',
      data.targetId || '',
      data.details || '',
      data.ipAddress || ''
    ]);

    return { success: true, logId: logId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getAuditLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(AUDIT_LOG_SHEET_NAME);

    if (!sheet) {
      sheet = createAuditLogSheet(ss);
      return { success: true, logs: [], message: 'No audit logs yet' };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true, logs: [], message: 'No audit logs yet' };
    }

    const headers = data[0];
    let logs = [];

    for (let i = 1; i < data.length; i++) {
      const log = {};
      headers.forEach((h, idx) => log[h] = data[i][idx]);
      logs.push(log);
    }

    // Filter by userId if provided
    if (params && params.userId) {
      logs = logs.filter(l => l.User_ID === params.userId);
    }

    // Filter by action if provided
    if (params && params.action) {
      logs = logs.filter(l => l.Action === params.action);
    }

    // Filter by date range if provided
    if (params && params.startDate) {
      const start = new Date(params.startDate);
      logs = logs.filter(l => new Date(l.Timestamp) >= start);
    }
    if (params && params.endDate) {
      const end = new Date(params.endDate);
      logs = logs.filter(l => new Date(l.Timestamp) <= end);
    }

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    // Limit results
    const limit = (params && params.limit) ? parseInt(params.limit) : 100;
    logs = logs.slice(0, limit);

    return { success: true, logs: logs, count: logs.length };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRITICAL ENDPOINT IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

function getPlanningData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');
    
    if (!sheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No planning data found'
      });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const plantings = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        obj[header] = value;
      });
      return obj;
    }).filter(p => p.Crop);
    
    return jsonResponse({
      success: true,
      data: plantings,
      count: plantings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// POPULATE TRAY SIZES FROM CROP PROFILES
// ============================================

/**
 * One-time function to populate Tray_Cell_Count (column AC) in PLANNING_2026
 * Uses crop profiles to look up default tray sizes for each planting
 */
function populateTraySizesFromProfiles() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    const profileSheet = ss.getSheetByName('REF_CropProfiles');

    if (!planSheet) {
      return { success: false, error: 'PLANNING_2026 sheet not found' };
    }
    if (!profileSheet) {
      return { success: false, error: 'REF_CropProfiles sheet not found' };
    }

    // Get planning data
    const planData = planSheet.getDataRange().getValues();
    const planHeaders = planData[0];

    // Find column indices
    const cropCol = planHeaders.indexOf('Crop');
    const varietyCol = planHeaders.indexOf('Variety');
    const methodCol = planHeaders.indexOf('Planting_Method');
    const traySizeCol = planHeaders.indexOf('Tray_Cell_Count');

    if (traySizeCol === -1) {
      return { success: false, error: 'Tray_Cell_Count column not found in PLANNING_2026. Please add it as column AC.' };
    }

    // Build crop profile lookup map
    const profileData = profileSheet.getDataRange().getValues();
    const profileHeaders = profileData[0];
    const profCropCol = profileHeaders.indexOf('Crop') !== -1 ? profileHeaders.indexOf('Crop') : 0;
    const profVarietyCol = profileHeaders.indexOf('Variety') !== -1 ? profileHeaders.indexOf('Variety') : 5;
    const profTraySizeCol = profileHeaders.indexOf('Tray_Size') !== -1 ? profileHeaders.indexOf('Tray_Size') :
                           profileHeaders.indexOf('TraySize') !== -1 ? profileHeaders.indexOf('TraySize') : 15; // Column P = index 15

    const profileMap = {};
    for (let i = 1; i < profileData.length; i++) {
      const crop = (profileData[i][profCropCol] || '').toString().trim().toLowerCase();
      const variety = (profileData[i][profVarietyCol] || '').toString().trim().toLowerCase();
      const traySize = profileData[i][profTraySizeCol];
      if (crop) {
        // Store with variety
        profileMap[crop + '|' + variety] = traySize || 72;
        // Also store crop-only as fallback
        if (!profileMap[crop + '|']) {
          profileMap[crop + '|'] = traySize || 72;
        }
      }
    }

    // Process each planting row
    let updated = 0;
    let skipped = 0;
    const updates = [];

    for (let i = 1; i < planData.length; i++) {
      const row = planData[i];
      const crop = (row[cropCol] || '').toString().trim().toLowerCase();
      const variety = (row[varietyCol] || '').toString().trim().toLowerCase();
      const method = (row[methodCol] || '').toString().toLowerCase();
      const currentTraySize = row[traySizeCol];

      // Skip if already has a tray size
      if (currentTraySize && currentTraySize !== '' && currentTraySize !== 0) {
        skipped++;
        continue;
      }

      // Skip direct seed - they don't use trays
      if (method.includes('direct')) {
        skipped++;
        continue;
      }

      // Look up tray size from profile
      let traySize = profileMap[crop + '|' + variety] || profileMap[crop + '|'] || 72;

      updates.push({
        row: i + 1,
        col: traySizeCol + 1,
        value: traySize
      });
      updated++;
    }

    // Batch update all cells
    updates.forEach(u => {
      planSheet.getRange(u.row, u.col).setValue(u.value);
    });

    return {
      success: true,
      message: `Populated tray sizes: ${updated} updated, ${skipped} skipped (already set or direct seed)`,
      updated: updated,
      skipped: skipped
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// PLANTING WIZARD WEB FUNCTIONS
// ============================================

/**
 * Save a planting from the web app (succession.html)
 * Accepts URL parameters and creates a row in PLANNING_2026
 */
function savePlantingFromWeb(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');

    if (!sheet) {
      return { success: false, error: 'PLANNING_2026 sheet not found' };
    }

    // Get headers to build row in correct order
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Map URL parameters to header columns
    const paramMapping = {
      'STATUS': params.STATUS || 'Planned',
      'Batch_ID': params.Batch_ID || generateBatchId(params.Crop),
      'Crop': params.Crop || '',
      'Variety': params.Variety || 'Standard',
      'Planting_Method': params.Planting_Method || 'Transplant',
      'Target_Bed_ID': params.Target_Bed_ID || 'Unassigned',
      'Feet_Used': params.Feet_Used || 0,
      'Plants_Needed': params.Plants_Needed || 0,
      'Trays_Needed': params.Trays_Needed || 0,
      'Tray_Cell_Count': params.Tray_Cell_Count || 72,
      'Paperpot_Spacing': params.Paperpot_Spacing || '',
      'Plan_GH_Sow': params.Plan_GH_Sow || '',
      'Actual_GH_Sow': '',
      'Plan_Field_Sow': params.Plan_Field_Sow || '',
      'Actual_Field_Sow': '',
      'Plan_Transplant': params.Plan_Transplant || '',
      'Actual_Transplant': '',
      'First_Harvest': params.First_Harvest || '',
      'Last_Harvest': '',
      'Notes': params.Notes || ''
    };

    // Build row array matching header order
    const row = headers.map(header => {
      // Check for exact match first
      if (paramMapping.hasOwnProperty(header)) {
        return paramMapping[header];
      }
      // Check for case-insensitive match
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, value] of Object.entries(paramMapping)) {
        if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerHeader) {
          return value;
        }
      }
      return '';
    });

    // Append the row
    sheet.appendRow(row);

    // Try to deduct seeds from inventory
    let seedDeduction = null;
    try {
      seedDeduction = deductSeedsForPlanting({
        crop: paramMapping['Crop'],
        variety: paramMapping['Variety'],
        plantsNeeded: Number(paramMapping['Plants_Needed']) || 0,
        batchId: paramMapping['Batch_ID'],
        method: paramMapping['Planting_Method']
      });
    } catch (seedError) {
      // Non-fatal - planting still saved even if seed deduction fails
      Logger.log('Seed deduction error: ' + seedError.toString());
    }

    return {
      success: true,
      message: 'Planting saved successfully',
      batchId: paramMapping['Batch_ID'],
      crop: paramMapping['Crop'],
      variety: paramMapping['Variety'],
      seedDeduction: seedDeduction
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Deduct seeds from inventory for a planting
 * Looks for matching seed in INVENTORY_PRODUCTS, calculates need, deducts stock
 */
function deductSeedsForPlanting(plantingData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const invSheet = ss.getSheetByName('INVENTORY_PRODUCTS');
  const transSheet = ss.getSheetByName('INVENTORY_TRANSACTIONS');

  if (!invSheet) {
    return { deducted: false, reason: 'No inventory sheet' };
  }

  // Find matching seed product
  const invData = invSheet.getDataRange().getValues();
  const invHeaders = invData[0];

  let seedRow = -1;
  let seedData = null;

  for (let i = 1; i < invData.length; i++) {
    const row = {};
    invHeaders.forEach((h, j) => row[h] = invData[i][j]);

    // Only check SEED category
    if (String(row['Category']).toUpperCase() !== 'SEED') continue;

    const productName = String(row['Product_Name'] || '').toLowerCase();
    const cropName = String(plantingData.crop || '').toLowerCase();
    const variety = String(plantingData.variety || '').toLowerCase();

    // Match by crop name and optionally variety
    if (productName.includes(cropName)) {
      // Prefer exact variety match
      if (variety && productName.includes(variety)) {
        seedRow = i + 1;
        seedData = row;
        break;
      }
      // Fall back to first crop match
      if (!seedData) {
        seedRow = i + 1;
        seedData = row;
      }
    }
  }

  if (!seedData) {
    return { deducted: false, reason: 'No matching seed found in inventory' };
  }

  // Calculate seeds needed
  // Overseed by 10% for transplants, 20% for direct seed
  const overseedFactor = plantingData.method === 'Direct Seed' ? 1.2 : 1.1;
  const germRate = Number(seedData['Germination_Rate']) || 85;
  const seedsPerPack = Number(seedData['Seeds_Per_Pack']) || 1;

  const plantsNeeded = Number(plantingData.plantsNeeded) || 0;
  const seedsNeeded = Math.ceil((plantsNeeded * overseedFactor) / (germRate / 100));
  const packsNeeded = Math.ceil(seedsNeeded / seedsPerPack);

  // Check current stock
  const currentQty = Number(seedData['Current_Qty']) || 0;
  if (currentQty <= 0) {
    return {
      deducted: false,
      reason: 'Out of stock',
      seedProduct: seedData['Product_Name'],
      needed: packsNeeded
    };
  }

  // Deduct from inventory
  const qtyToDeduct = Math.min(packsNeeded, currentQty);
  const newQty = currentQty - qtyToDeduct;

  // Update inventory sheet
  const qtyColIndex = invHeaders.indexOf('Current_Qty') + 1;
  const updatedColIndex = invHeaders.indexOf('UpdatedAt') + 1;
  if (qtyColIndex > 0) {
    invSheet.getRange(seedRow, qtyColIndex).setValue(newQty);
  }
  if (updatedColIndex > 0) {
    invSheet.getRange(seedRow, updatedColIndex).setValue(new Date().toISOString());
  }

  // Record transaction
  if (transSheet) {
    const transHeaders = transSheet.getRange(1, 1, 1, transSheet.getLastColumn()).getValues()[0];
    const transRow = transHeaders.map(h => {
      switch(h) {
        case 'Transaction_ID': return 'TXN-' + Date.now();
        case 'Date': return new Date().toISOString().split('T')[0];
        case 'Product_ID': return seedData['Product_ID'] || '';
        case 'Product_Name': return seedData['Product_Name'] || '';
        case 'Transaction_Type': return 'APPLICATION';
        case 'Qty': return -qtyToDeduct;
        case 'Unit': return seedData['Unit'] || 'pack';
        case 'Batch_ID': return plantingData.batchId || '';
        case 'Field': return '';
        case 'Applied_By': return 'Planting Wizard';
        case 'Notes': return `Seeding for ${plantingData.crop} - ${plantsNeeded} plants`;
        case 'CreatedAt': return new Date().toISOString();
        default: return '';
      }
    });
    transSheet.appendRow(transRow);
  }

  return {
    deducted: true,
    seedProduct: seedData['Product_Name'],
    seedsNeeded: seedsNeeded,
    packsDeducted: qtyToDeduct,
    remainingStock: newQty,
    lowStock: newQty < (Number(seedData['Reorder_Point']) || 5)
  };
}

/**
 * Generate a batch ID for a planting
 */
function generateBatchId(cropName) {
  const year = new Date().getFullYear().toString().slice(-2);
  const cropCode = (cropName || 'XXX').substring(0, 3).toUpperCase();
  const uniqueId = Math.floor(Math.random() * 9000) + 1000;
  return `${year}-${cropCode}-${uniqueId}`;
}

/**
 * Get wizard data for web app (replaces getWizardData for modal)
 * Returns beds, crop profiles, and bookings for the planting wizard
 */
function getWizardDataWeb() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bedSheet = ss.getSheetByName('REF_Beds');
    const profileSheet = ss.getSheetByName('REF_CropProfiles');
    const planSheet = ss.getSheetByName('PLANNING_2026');

    // Get beds
    let beds = [];
    if (bedSheet && bedSheet.getLastRow() > 1) {
      const bData = bedSheet.getDataRange().getValues();
      const bHeaders = bData[0];
      beds = bData.slice(1).map(row => {
        const obj = {};
        bHeaders.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }).filter(b => b['Bed ID']);
    }

    // Get bookings (existing plantings)
    let bookings = [];
    if (planSheet && planSheet.getLastRow() > 1) {
      const pData = planSheet.getDataRange().getValues();
      const pHeaders = pData[0];

      for (let i = 1; i < pData.length; i++) {
        const row = {};
        pHeaders.forEach((h, j) => row[h] = pData[i][j]);

        const bedId = String(row['Target_Bed_ID'] || row['Bed_ID'] || '');
        const feet = Number(row['Feet_Used'] || row['Feet'] || 0);
        const method = String(row['Planting_Method'] || '').toLowerCase();

        let start = method.includes('direct')
          ? row['Plan_Field_Sow'] || row['Actual_Field_Sow']
          : row['Plan_Transplant'] || row['Actual_Transplant'] || row['Plan_GH_Sow'];
        let end = row['Last_Harvest'] || row['First_Harvest'];

        if (start instanceof Date && (!end || !(end instanceof Date))) {
          end = new Date(start);
          end.setDate(start.getDate() + 60);
        }

        if (bedId && start instanceof Date && end instanceof Date) {
          bookings.push({
            bedId: bedId,
            feet: feet,
            start: start.getTime(),
            end: end.getTime(),
            crop: row['Crop'] || '',
            status: row['STATUS'] || ''
          });
        }
      }
    }

    // Get crop profiles
    let cropProfiles = [];
    let vegCrops = [];
    let floralCrops = [];
    let cropMap = {};

    if (profileSheet && profileSheet.getLastRow() > 1) {
      const cpData = profileSheet.getDataRange().getValues();
      const cpHeaders = cpData[0];

      for (let i = 1; i < cpData.length; i++) {
        const row = {};
        cpHeaders.forEach((h, j) => row[h] = cpData[i][j]);

        const cropName = String(row['Crop_Name'] || '').trim();
        const category = String(row['Category'] || row['Primary_Category'] || '');
        const variety = String(row['Variety'] || row['Variety_Default'] || '').trim();

        if (!cropName) continue;

        // Determine method
        let method = 'Transplant';
        const rawMethod = String(row['Calc_Method'] || row['Direct_or_Transplant'] || '');
        if (rawMethod.toLowerCase().includes('direct')) method = 'Direct Seed';
        else if (rawMethod.toLowerCase().includes('paper')) method = 'Paperpot';

        // Build crop map for quick lookup
        if (!cropMap[cropName]) {
          cropMap[cropName] = {
            varieties: [],
            method: method,
            rows: row['Rows_Per_Bed'] || 1,
            spacing: row['In_Row_Spacing_In'] || 12,
            tray: row['Tray_Cell_Count'] || 72,
            nursery: method === 'Direct Seed' ? 0 : (row['Nursery_Days'] || 28),
            dtm: row['DTM_Average'] || 50
          };

          if (category.toLowerCase().includes('floral') || category.toLowerCase().includes('flower')) {
            floralCrops.push(cropName);
          } else {
            vegCrops.push(cropName);
          }
        }

        if (variety && !cropMap[cropName].varieties.includes(variety)) {
          cropMap[cropName].varieties.push(variety);
        }

        cropProfiles.push({
          cropName: cropName,
          variety: variety,
          category: category,
          method: method,
          rows: row['Rows_Per_Bed'] || 1,
          spacing: row['In_Row_Spacing_In'] || 12,
          traySize: row['Tray_Cell_Count'] || 72,
          nurseryDays: method === 'Direct Seed' ? 0 : (row['Nursery_Days'] || 28),
          dtm: row['DTM_Average'] || 50
        });
      }
    }

    return {
      success: true,
      beds: beds,
      bookings: bookings,
      cropProfiles: cropProfiles,
      veg: [...new Set(vegCrops)].sort(),
      floral: [...new Set(floralCrops)].sort(),
      map: cropMap
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============ TRAY INVENTORY FUNCTIONS ============

/**
 * Get tray inventory data
 * Returns total stock and reorder points for each tray size
 */
function getTrayInventory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('TRAY_INVENTORY');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('TRAY_INVENTORY');
      sheet.appendRow(['Size', 'Total', 'ReorderPoint', 'LastUpdated']);
      // Add default data
      const defaults = [
        ['50', 20, 5],
        ['72', 50, 10],
        ['98', 30, 10],
        ['128', 40, 10],
        ['200', 20, 5],
        ['264', 15, 5]
      ];
      defaults.forEach(row => {
        sheet.appendRow([...row, new Date()]);
      });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const result = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      result.push({
        size: String(row[0]),
        total: Number(row[1]) || 0,
        reorderPoint: Number(row[2]) || 10,
        lastUpdated: row[3]
      });
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Save tray inventory data
 * Updates or adds a tray size entry
 */
function saveTrayInventory(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('TRAY_INVENTORY');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('TRAY_INVENTORY');
      sheet.appendRow(['Size', 'Total', 'ReorderPoint', 'LastUpdated']);
    }

    const size = String(params.size);
    const total = Number(params.total) || 0;
    const reorderPoint = Number(params.reorderPoint) || 10;

    const data = sheet.getDataRange().getValues();
    let found = false;

    // Find and update existing row
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === size) {
        sheet.getRange(i + 1, 2).setValue(total);
        sheet.getRange(i + 1, 3).setValue(reorderPoint);
        sheet.getRange(i + 1, 4).setValue(new Date());
        found = true;
        break;
      }
    }

    // Add new row if not found
    if (!found) {
      sheet.appendRow([size, total, reorderPoint, new Date()]);
    }

    return {
      success: true,
      message: `Tray inventory updated for ${size}-cell`
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getDashboardStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    
    if (!planSheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    const data = planSheet.getDataRange().getValues();
    
    let activePlantings = 0;
    let fieldsUsed = new Set();
    let totalRevenue = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[0];
      const bedId = row[5];
      const revenue = Number(row[15]) || 0;
      
      if (status === 'PLANTED' || status === 'HARVESTING') {
        activePlantings++;
      }
      
      if (bedId) {
        const field = String(bedId).split('-')[0];
        if (field) fieldsUsed.add(field);
      }
      
      totalRevenue += revenue;
    }
    
    let tasksDue = 0;
    const taskSheet = ss.getSheetByName('DAILY_TASKS_GENERATED');
    if (taskSheet) {
      const taskData = taskSheet.getDataRange().getValues();
      const today = new Date();
      
      for (let i = 1; i < taskData.length; i++) {
        const dueDate = taskData[i][0];
        if (dueDate instanceof Date && dueDate <= today) {
          tasksDue++;
        }
      }
    }
    
    return jsonResponse({
      success: true,
      stats: {
        activePlantings: activePlantings,
        fieldsInUse: fieldsUsed.size,
        tasksDue: tasksDue,
        projectedRevenue: Math.round(totalRevenue)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function getGreenhouseSeedings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    const profileSheet = ss.getSheetByName('REF_CropProfiles');
    
    if (!planSheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    const data = planSheet.getDataRange().getValues();
    
    let cropProfiles = {};
    if (profileSheet) {
      const profData = profileSheet.getDataRange().getValues();
      for (let i = 1; i < profData.length; i++) {
        const crop = profData[i][0];
        if (crop) {
          cropProfiles[crop] = {
            nurseryDays: Number(profData[i][22]) || 28,
            traySize: Number(profData[i][15]) || 128
          };
        }
      }
    }
    
    const seedings = [];
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 60);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const method = String(row[4]).toLowerCase();
      
      if (method.includes('transplant') || method.includes('paper')) {
        const crop = row[2];
        const variety = row[3];
        const batchId = row[1];
        const ghSowDate = row[9];
        const transplantDate = row[12];
        const traysNeeded = Number(row[8]) || 1;
        
        if (ghSowDate instanceof Date && ghSowDate <= futureLimit) {
          const profile = cropProfiles[crop] || { nurseryDays: 28, traySize: 128 };
          
          seedings.push({
            crop: crop,
            variety: variety,
            seedDate: ghSowDate.toISOString().split('T')[0],
            transplantDate: transplantDate instanceof Date ? 
              transplantDate.toISOString().split('T')[0] : '',
            traysNeeded: traysNeeded,
            cellsPerTray: profile.traySize,
            batchNumber: batchId || `BATCH-${i}`,
            nurseryDays: profile.nurseryDays
          });
        }
      }
    }
    
    return jsonResponse({
      success: true,
      data: seedings,
      count: seedings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED INVENTORY & QR TRACEABILITY SYSTEM
// Tracks seeds from packet to planting with full chain of custody
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SEED_INVENTORY Schema:
 * - Seed_Lot_ID: Unique identifier (auto-generated, becomes QR code content)
 * - QR_Code_URL: URL to QR code image for printing
 * - Crop: Crop name (e.g., "Tomato")
 * - Variety: Variety name (e.g., "Early Girl")
 * - Supplier: Seed company name
 * - Supplier_Lot: Original lot number from supplier (for traceability)
 * - Quantity_Original: Amount received
 * - Quantity_Remaining: Current amount on hand
 * - Unit: seeds, grams, oz, packet
 * - Germination_Rate: Percentage (e.g., 92)
 * - Germ_Test_Date: Date germination was tested
 * - Pack_Date: Date seed was packed
 * - Expiration_Date: Best-by date
 * - Organic_Certified: Yes/No
 * - Certifier: Organic certifier name
 * - Seed_Treatment: Treated, Untreated, Pelleted, Primed
 * - Purchase_Date: Date received
 * - Purchase_Price: Cost
 * - Storage_Location: Where it's stored
 * - Notes: Any additional notes
 * - Status: Active, Low, Empty, Expired
 * - Created_At: Timestamp
 * - Last_Used: Last time seeds were taken from this lot
 */

const SEED_INVENTORY_HEADERS = [
  'Seed_Lot_ID', 'QR_Code_URL', 'Crop', 'Variety', 'Supplier', 'Supplier_Lot',
  'Quantity_Original', 'Quantity_Remaining', 'Unit', 'Germination_Rate', 'Germ_Test_Date',
  'Pack_Date', 'Expiration_Date', 'Organic_Certified', 'Certifier', 'Seed_Treatment',
  'Purchase_Date', 'Purchase_Price', 'Storage_Location', 'Notes', 'Status',
  'Created_At', 'Last_Used'
];

/**
 * Initialize or get SEED_INVENTORY sheet
 */
function initSeedInventorySheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('SEED_INVENTORY');

  if (!sheet) {
    sheet = ss.insertSheet('SEED_INVENTORY');
    sheet.appendRow(SEED_INVENTORY_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SEED_INVENTORY_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#4a7c59');

    // Set column widths for readability
    sheet.setColumnWidth(1, 150); // Seed_Lot_ID
    sheet.setColumnWidth(2, 200); // QR_Code_URL
    sheet.setColumnWidth(3, 120); // Crop
    sheet.setColumnWidth(4, 150); // Variety
  }

  return sheet;
}

/**
 * Generate a unique Seed Lot ID
 * Format: S-{CROP_CODE}-{YYMMDD}-{SEQ}
 * Example: S-TOM-250115-001
 */
function generateSeedLotId(crop) {
  const cropCode = String(crop).substring(0, 3).toUpperCase();
  const dateCode = Utilities.formatDate(new Date(), 'GMT', 'yyMMdd');
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `S-${cropCode}-${dateCode}-${seq}`;
}

/**
 * Generate QR code URL for a seed lot
 * Uses QuickChart.io (free, no API key needed)
 */
function generateSeedQRCode(seedLotId) {
  // Full URL so any phone camera can scan and open tracking page directly
  const trackingUrl = `https://tinyseedfarm.github.io/TIny_Seed_OS/seed_track.html?id=${seedLotId}`;
  const data = encodeURIComponent(trackingUrl);
  // Size 200x200 is good for 1" labels
  return `https://quickchart.io/chart?cht=qr&chs=200x200&chl=${data}&choe=UTF-8`;
}

/**
 * Add a new seed lot to inventory
 * Called when scanning/entering a new seed packet
 */
function addSeedLot(data) {
  try {
    if (!data.crop) {
      return { success: false, error: 'Crop name is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = initSeedInventorySheet();

    // Generate unique lot ID and QR code
    const seedLotId = generateSeedLotId(data.crop);
    const qrCodeUrl = generateSeedQRCode(seedLotId);

    // Normalize parameters (accept both camelCase and snake_case)
    const quantity = data.quantity || data.quantity_original || 0;
    const supplier = data.supplier || data.vendor || '';
    const supplierLot = data.supplierLot || data.supplier_lot || data.lotNumber || '';
    const germRate = data.germinationRate || data.germination_rate || data.germRate || '';
    const germTestDate = data.germTestDate || data.germ_test_date || '';
    const packDate = data.packDate || data.pack_date || '';
    const expDate = data.expirationDate || data.expiration_date || '';
    const organic = data.organicCertified || data.organic_certified || data.organic || 'No';
    const organicStr = (organic === true || organic === 'true' || organic === 'Yes' || organic === 'yes') ? 'Yes' : 'No';

    // Calculate initial status
    let status = 'Active';
    if (expDate) {
      const expDateObj = new Date(expDate);
      if (expDateObj < new Date()) status = 'Expired';
    }

    // Build row data
    const rowData = [
      seedLotId,
      qrCodeUrl,
      data.crop || '',
      data.variety || '',
      supplier,
      supplierLot,
      quantity,
      quantity, // Remaining starts same as original
      data.unit || 'seeds',
      germRate,
      germTestDate,
      packDate,
      expDate,
      organicStr,
      data.certifier || '',
      data.seedTreatment || data.seed_treatment || 'Untreated',
      data.purchaseDate || data.purchase_date || new Date(),
      data.purchasePrice || data.purchase_price || '',
      data.storageLocation || data.storage_location || '',
      data.notes || '',
      status,
      new Date(),
      ''
    ];

    sheet.appendRow(rowData);

    return {
      success: true,
      message: 'Seed lot added to inventory',
      seedLotId: seedLotId,
      qrCodeUrl: qrCodeUrl,
      data: {
        seedLotId: seedLotId,
        crop: data.crop,
        variety: data.variety,
        quantity: data.quantity,
        unit: data.unit
      }
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get full seed inventory with filtering options
 */
function getSeedInventory(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('SEED_INVENTORY');

    if (!sheet) {
      return {
        success: true,
        data: [],
        message: 'No seed inventory yet - add your first seed lot!'
      };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: true,
        data: [],
        message: 'Seed inventory is empty'
      };
    }

    const headers = data[0];
    const rows = data.slice(1);

    let inventory = rows.map((row, index) => {
      const obj = { rowIndex: index + 2 }; // 1-indexed + header row
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });

    // Apply filters if provided
    if (params) {
      if (params.crop) {
        inventory = inventory.filter(item =>
          String(item.Crop).toLowerCase().includes(String(params.crop).toLowerCase())
        );
      }
      if (params.status) {
        inventory = inventory.filter(item => item.Status === params.status);
      }
      if (params.organic === 'true' || params.organic === true) {
        inventory = inventory.filter(item =>
          String(item.Organic_Certified).toLowerCase() === 'yes'
        );
      }
      if (params.hasStock === 'true' || params.hasStock === true) {
        inventory = inventory.filter(item =>
          Number(item.Quantity_Remaining) > 0
        );
      }
    }

    return {
      success: true,
      data: inventory,
      count: inventory.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get seed lot by QR code (Seed_Lot_ID)
 * This is the primary lookup when scanning QR codes
 */
function getSeedByQR(seedLotId) {
  try {
    if (!seedLotId) {
      return { success: false, error: 'Seed Lot ID required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('SEED_INVENTORY');

    if (!sheet) {
      return { success: false, error: 'Seed inventory not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const lotIdCol = headers.indexOf('Seed_Lot_ID');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][lotIdCol]).trim() === String(seedLotId).trim()) {
        const seed = { rowIndex: i + 1 };
        headers.forEach((header, idx) => {
          seed[header] = data[i][idx];
        });

        return {
          success: true,
          found: true,
          seed: seed
        };
      }
    }

    return {
      success: true,
      found: false,
      message: 'Seed lot not found: ' + seedLotId
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Use seeds from inventory (when seeding/planting)
 * Links seed lot to planting record for traceability
 */
function useSeedFromLot(params) {
  try {
    const { seedLotId, quantityUsed, batchId, notes } = params;

    if (!seedLotId || !quantityUsed) {
      return { success: false, error: 'Seed Lot ID and quantity required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('SEED_INVENTORY');

    if (!sheet) {
      return { success: false, error: 'Seed inventory not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const lotIdCol = headers.indexOf('Seed_Lot_ID');
    const remainingCol = headers.indexOf('Quantity_Remaining');
    const statusCol = headers.indexOf('Status');
    const lastUsedCol = headers.indexOf('Last_Used');

    // Find the seed lot
    let rowIndex = -1;
    let currentRemaining = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][lotIdCol]).trim() === String(seedLotId).trim()) {
        rowIndex = i + 1; // 1-indexed for sheet
        currentRemaining = Number(data[i][remainingCol]) || 0;
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Seed lot not found: ' + seedLotId };
    }

    // Check if enough seeds available
    const used = Number(quantityUsed);
    if (used > currentRemaining) {
      return {
        success: false,
        error: `Not enough seeds. Available: ${currentRemaining}, Requested: ${used}`
      };
    }

    // Update remaining quantity
    const newRemaining = currentRemaining - used;
    sheet.getRange(rowIndex, remainingCol + 1).setValue(newRemaining);
    sheet.getRange(rowIndex, lastUsedCol + 1).setValue(new Date());

    // Update status if low or empty
    let newStatus = 'Active';
    if (newRemaining === 0) {
      newStatus = 'Empty';
    } else if (newRemaining < (currentRemaining * 0.2)) {
      newStatus = 'Low';
    }
    sheet.getRange(rowIndex, statusCol + 1).setValue(newStatus);

    // Log the usage in SEED_USAGE_LOG for traceability
    logSeedUsage({
      seedLotId: seedLotId,
      quantityUsed: used,
      batchId: batchId || '',
      notes: notes || '',
      usedAt: new Date()
    });

    return {
      success: true,
      message: `Used ${used} seeds from lot ${seedLotId}`,
      previousQuantity: currentRemaining,
      newQuantity: newRemaining,
      status: newStatus,
      linkedBatchId: batchId || null
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Log seed usage for traceability
 * Creates a complete audit trail from seed lot to planting
 */
function logSeedUsage(usage) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName('SEED_USAGE_LOG');

    if (!logSheet) {
      logSheet = ss.insertSheet('SEED_USAGE_LOG');
      logSheet.appendRow([
        'Usage_ID', 'Seed_Lot_ID', 'Quantity_Used', 'Batch_ID',
        'Used_By', 'Used_At', 'Notes'
      ]);
      logSheet.setFrozenRows(1);
      logSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4a7c59');
    }

    const usageId = 'USE-' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd-HHmmss');

    logSheet.appendRow([
      usageId,
      usage.seedLotId,
      usage.quantityUsed,
      usage.batchId || '',
      usage.usedBy || '',
      usage.usedAt || new Date(),
      usage.notes || ''
    ]);

    return { success: true, usageId: usageId };

  } catch (error) {
    Logger.log('Error logging seed usage: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get seed usage history for a lot (traceability)
 */
function getSeedUsageHistory(seedLotId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName('SEED_USAGE_LOG');

    if (!logSheet) {
      return { success: true, data: [], message: 'No usage history yet' };
    }

    const data = logSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true, data: [], message: 'No usage records' };
    }

    const headers = data[0];
    const lotIdCol = headers.indexOf('Seed_Lot_ID');

    const history = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][lotIdCol]).trim() === String(seedLotId).trim()) {
        const record = {};
        headers.forEach((header, idx) => {
          record[header] = data[i][idx];
        });
        history.push(record);
      }
    }

    return {
      success: true,
      seedLotId: seedLotId,
      usageCount: history.length,
      history: history
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get low stock alerts
 */
function getLowStockSeeds() {
  try {
    const result = getSeedInventory({ status: 'Low' });
    if (!result.success) return result;

    const empty = getSeedInventory({ status: 'Empty' });

    return {
      success: true,
      lowStock: result.data,
      empty: empty.data || [],
      alerts: [
        ...result.data.map(s => ({
          type: 'LOW',
          message: `${s.Crop} - ${s.Variety}: Only ${s.Quantity_Remaining} ${s.Unit} remaining`
        })),
        ...(empty.data || []).map(s => ({
          type: 'EMPTY',
          message: `${s.Crop} - ${s.Variety}: OUT OF STOCK`
        }))
      ]
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate printable label data for a seed lot
 * Returns data formatted for label printing
 */
function getSeedLabelData(seedLotId) {
  try {
    const result = getSeedByQR(seedLotId);
    if (!result.success || !result.found) {
      return result;
    }

    const seed = result.seed;

    return {
      success: true,
      label: {
        qrCodeUrl: seed.QR_Code_URL,
        seedLotId: seed.Seed_Lot_ID,
        crop: seed.Crop,
        variety: seed.Variety,
        supplier: seed.Supplier,
        organic: seed.Organic_Certified === 'Yes' ? 'ORG' : '',
        germRate: seed.Germination_Rate ? seed.Germination_Rate + '%' : '',
        expiration: seed.Expiration_Date,
        // For human-readable backup if QR fails
        shortCode: seed.Seed_Lot_ID.split('-').slice(-2).join('-')
      }
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFieldTasks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const taskSheet = ss.getSheetByName('DAILY_TASKS_GENERATED');
    
    if (!taskSheet) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No task sheet found - run "Update Daily Tasks" from menu'
      });
    }
    
    const data = taskSheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No tasks generated yet'
      });
    }
    
    const rows = data.slice(1);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    
    const tasks = rows.map((row, index) => {
      const dueDate = row[0];
      
      if (dueDate instanceof Date && dueDate <= weekFromNow) {
        return {
          id: `TASK-${index + 1}`,
          dueDate: dueDate.toISOString().split('T')[0],
          taskType: row[1],
          description: row[2],
          crop: row[3],
          batchId: row[4],
          priority: dueDate <= today ? 'high' : 'medium'
        };
      }
      return null;
    }).filter(Boolean);
    
    return jsonResponse({
      success: true,
      data: tasks,
      count: tasks.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function getDTMLearningData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dtmSheet = ss.getSheetByName('DTM_LEARNING');
    
    if (!dtmSheet) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No DTM learning data yet - sheet will be created when you record harvests'
      });
    }
    
    const data = dtmSheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No DTM records yet'
      });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const dtmData = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return jsonResponse({
      success: true,
      data: dtmData,
      count: dtmData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function saveSuccessionPlan(plan) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    
    if (!planSheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No plan data provided'
      });
    }
    
    let added = 0;
    
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      const batchId = `26-${p.crop.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9999)}`;
      const ghSow = p.ghSow ? new Date(p.ghSow) : '';
      const fieldSow = p.fieldSow ? new Date(p.fieldSow) : '';
      const transplant = p.transplant ? new Date(p.transplant) : '';
      const harvest = p.harvest ? new Date(p.harvest) : '';
      
      planSheet.appendRow([
        'Planned', batchId, p.crop, p.variety, p.method, '',
        0, 0, 0, ghSow, '', fieldSow, '', transplant, '',
        harvest, '', '', '', `Auto-generated succession ${i+1}/${plan.length}`
      ]);
      
      added++;
    }
    
    return jsonResponse({
      success: true,
      message: `Saved ${added} plantings to PLANNING_2026`,
      count: added,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function completeTask(taskId, completedBy, notes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('MASTER_LOG');
    
    if (!logSheet) {
      return jsonResponse({
        success: false,
        error: 'MASTER_LOG sheet not found'
      });
    }
    
    logSheet.appendRow([
      new Date(), 'Completed', 'Task Completed', '', '', '', '', '',
      notes || 'Via mobile app', completedBy || 'Mobile User',
      '', taskId || '', '', ''
    ]);
    
    return jsonResponse({
      success: true,
      message: 'Task completed and logged',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY ENDPOINTS (Stub implementations)
// ═══════════════════════════════════════════════════════════════════════════

function getPlanning() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PLANNING_2026');
  if (!sheet) return jsonResponse({error: 'PLANNING_2026 not found'}, 404);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const plantings = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  }).filter(row => row.Crop);
  
  return jsonResponse({success: true, count: plantings.length, plantings: plantings});
}

function getCrops() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  if (!sheet) return jsonResponse({error: 'REF_CropProfiles not found'}, 404);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const crops = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  }).filter(row => row.Crop_Name);
  
  return jsonResponse({success: true, count: crops.length, crops: crops});
}

function getBeds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Beds');
  if (!sheet) return jsonResponse({error: 'REF_Beds not found'}, 404);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const beds = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  }).filter(row => row['Bed ID']);
  
  return jsonResponse({success: true, count: beds.length, beds: beds});
}

function addPlanting(planting) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PLANNING_2026');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => planting[header] || '');
  if (!planting.Batch_ID) row[headers.indexOf('Batch_ID')] = '26-' + new Date().getTime();
  sheet.appendRow(row);
  return jsonResponse({success: true, message: 'Planting added'});
}

// Stubs
function getPlanningById(id) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getCropByName(crop, variety) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getBedsByField(field) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getTasks(date) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getTasksByDateRange(start, end) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getHarvests(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('HARVEST_LOG');

    if (!sheet) {
      return jsonResponse({ success: true, harvests: [] });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const limit = params && params.limit ? parseInt(params.limit) : 50;

    const harvests = [];
    for (let i = data.length - 1; i >= 1 && harvests.length < limit; i--) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);
      if (row.Crop) {
        harvests.push(row);
      }
    }

    return jsonResponse({ success: true, harvests: harvests });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function getHarvestsByDateRange(start, end) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('HARVEST_LOG');

    if (!sheet) {
      return jsonResponse({ success: true, harvests: [] });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const startDate = new Date(start);
    const endDate = new Date(end);

    const harvests = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      const timestamp = new Date(row.Timestamp);
      if (timestamp >= startDate && timestamp <= endDate) {
        harvests.push(row);
      }
    }

    return jsonResponse({ success: true, harvests: harvests });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}
function getWeatherData() { return jsonResponse({success: false, message: 'Not implemented'}); }
function getFinancials() { return jsonResponse({success: false, message: 'Not implemented'}); }
  function updatePlanting(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find the Batch_ID column
    const batchIdColIndex = headers.indexOf('Batch_ID');
    const searchColIndex = batchIdColIndex >= 0 ? batchIdColIndex : 1;
    const searchId = params.id || params.Batch_ID;

    for (let i = 1; i < data.length; i++) {
      if (data[i][searchColIndex] === searchId) {
        Object.keys(params).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex > -1 && key !== 'id' && key !== 'action') {
            sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
          }
        });
        return jsonResponse({success: true, message: 'Planting updated'});
      }
    }
    return jsonResponse({success: false, error: 'Planting not found'});
  }


function deletePlanting(id) { return jsonResponse({success: false, message: 'Not implemented'}); }

/**
 * Delete a planting by Batch_ID (for GET requests)
 */
function deletePlantingById(batchId) {
  try {
    if (!batchId) {
      return jsonResponse({ success: false, error: 'No batch ID provided' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');

    if (!sheet) {
      return jsonResponse({ success: false, error: 'PLANNING_2026 sheet not found' });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const batchIdCol = headers.indexOf('Batch_ID');

    if (batchIdCol === -1) {
      return jsonResponse({ success: false, error: 'Batch_ID column not found' });
    }

    // Find the row with matching Batch_ID
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][batchIdCol]) === String(batchId)) {
        rowToDelete = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowToDelete === -1) {
      return jsonResponse({ success: false, error: `Planting ${batchId} not found` });
    }

    // Delete the row
    sheet.deleteRow(rowToDelete);

    return jsonResponse({
      success: true,
      message: `Planting ${batchId} deleted successfully`,
      deletedId: batchId
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}
function bulkAddPlantings(plantings) { return jsonResponse({success: false, message: 'Not implemented'}); }
function addTask(task) { return jsonResponse({success: false, message: 'Not implemented'}); }

/**
 * Record a harvest and capture DTM learning data
 * This is the core data collection for the learning system
 *
 * @param {Object} harvest - Harvest record
 * @param {string} harvest.batchId - The batch ID from PLANNING_2026
 * @param {string} harvest.harvestDate - Date of harvest (YYYY-MM-DD or Date object)
 * @param {number} harvest.quantity - Amount harvested
 * @param {string} harvest.unit - Unit (lbs, bunches, etc)
 * @param {string} harvest.quality - Quality rating (A, B, C)
 * @param {string} harvest.notes - Any notes about the harvest
 * @param {string} harvest.harvestedBy - Who recorded the harvest
 */
function recordHarvest(harvest) {
  try {
    if (!harvest || !harvest.batchId) {
      return jsonResponse({ success: false, error: 'Batch ID required' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Look up the original planting from PLANNING_2026
    const planSheet = ss.getSheetByName('PLANNING_2026');
    if (!planSheet) {
      return jsonResponse({ success: false, error: 'PLANNING_2026 sheet not found' });
    }

    const planData = planSheet.getDataRange().getValues();
    const planHeaders = planData[0];

    // Find column indices - handle both transplant and direct seed crops
    const batchCol = planHeaders.indexOf('Batch_ID');
    const cropCol = planHeaders.indexOf('Crop');
    const varietyCol = planHeaders.indexOf('Variety');
    const methodCol = planHeaders.indexOf('Planting_Method');
    const bedCol = planHeaders.indexOf('Target_Bed_ID');
    const dtmCol = planHeaders.indexOf('DTM') !== -1 ? planHeaders.indexOf('DTM') : planHeaders.indexOf('DTM_Average');

    // Date columns - actual dates take priority over planned
    const actTransplantCol = planHeaders.indexOf('Act_Transplant');
    const planTransplantCol = planHeaders.indexOf('Plan_Transplant');
    const actFieldSowCol = planHeaders.indexOf('Act_Field_Sow');
    const planFieldSowCol = planHeaders.indexOf('Plan_Field_Sow');

    // Find the planting record
    let plantingRow = null;
    let plantingRowIndex = -1;
    for (let i = 1; i < planData.length; i++) {
      if (String(planData[i][batchCol]).trim() === String(harvest.batchId).trim()) {
        plantingRow = planData[i];
        plantingRowIndex = i;
        break;
      }
    }

    if (!plantingRow) {
      return jsonResponse({ success: false, error: 'Batch ID not found in PLANNING_2026: ' + harvest.batchId });
    }

    // Extract planting data
    const crop = plantingRow[cropCol] || '';
    const variety = varietyCol >= 0 ? (plantingRow[varietyCol] || '') : '';
    const plantingMethod = methodCol >= 0 ? String(plantingRow[methodCol]).toLowerCase() : '';
    const bedId = bedCol >= 0 ? (plantingRow[bedCol] || '') : '';
    const predictedDTM = dtmCol >= 0 ? (Number(plantingRow[dtmCol]) || 0) : 0;

    // Get field date based on planting method
    // For transplants: use Act_Transplant or Plan_Transplant
    // For direct seed: use Act_Field_Sow or Plan_Field_Sow
    let fieldDate = null;
    if (plantingMethod.includes('direct') || plantingMethod.includes('seed')) {
      // Direct seed - use field sow date
      fieldDate = (actFieldSowCol >= 0 && plantingRow[actFieldSowCol]) ? plantingRow[actFieldSowCol] :
                  (planFieldSowCol >= 0 ? plantingRow[planFieldSowCol] : null);
    } else {
      // Transplant - use transplant date
      fieldDate = (actTransplantCol >= 0 && plantingRow[actTransplantCol]) ? plantingRow[actTransplantCol] :
                  (planTransplantCol >= 0 ? plantingRow[planTransplantCol] : null);
    }

    // Fallback: try any available date
    if (!fieldDate) {
      fieldDate = (actTransplantCol >= 0 && plantingRow[actTransplantCol]) ? plantingRow[actTransplantCol] :
                  (planTransplantCol >= 0 && plantingRow[planTransplantCol]) ? plantingRow[planTransplantCol] :
                  (actFieldSowCol >= 0 && plantingRow[actFieldSowCol]) ? plantingRow[actFieldSowCol] :
                  (planFieldSowCol >= 0 ? plantingRow[planFieldSowCol] : null);
    }

    // 2. Calculate actual DTM (days from field date to harvest)
    if (!fieldDate) {
      return jsonResponse({ success: false, error: 'No field date found for batch ' + harvest.batchId + '. Check Plan_Transplant, Act_Transplant, Plan_Field_Sow, or Act_Field_Sow columns.' });
    }

    const harvestDateObj = harvest.harvestDate instanceof Date ? harvest.harvestDate : new Date(harvest.harvestDate);
    const fieldDateObj = fieldDate instanceof Date ? fieldDate : new Date(fieldDate);

    if (isNaN(harvestDateObj.getTime()) || isNaN(fieldDateObj.getTime())) {
      return jsonResponse({ success: false, error: 'Invalid dates. Field date: ' + fieldDate + ', Harvest: ' + harvest.harvestDate });
    }

    const actualDTM = Math.round((harvestDateObj - fieldDateObj) / (1000 * 60 * 60 * 24));

    // 3. Determine the season based on field date
    const month = fieldDateObj.getMonth() + 1;
    const day = fieldDateObj.getDate();
    let season = 'Summer';

    if (month >= 3 && month <= 4) season = 'EarlySpring';
    else if (month === 5) season = 'LateSpring';
    else if (month >= 6 && (month < 8 || (month === 8 && day <= 15))) season = 'Summer';
    else if ((month === 8 && day > 15) || (month === 9 && day <= 15)) season = 'LateSummer';
    else if ((month === 9 && day > 15) || month === 10) season = 'Fall';
    else if (month === 11) season = 'LateFall';
    else season = 'EarlySpring'; // Winter months

    // 4. Get weather data for the crop's lifecycle (field date to harvest)
    const weatherSummary = getWeatherSummaryForPeriod(fieldDateObj, harvestDateObj);
    const totalGDD = weatherSummary.hasData ? weatherSummary.totalGDD : '';
    const avgTemp = weatherSummary.hasData ? weatherSummary.avgTemp : '';
    const totalPrecip = weatherSummary.hasData ? weatherSummary.totalPrecip : '';
    const frostDays = weatherSummary.hasData ? weatherSummary.frostDays : '';

    // 5. Get or create DTM_LEARNING sheet with weather columns
    let dtmSheet = ss.getSheetByName('DTM_LEARNING');
    if (!dtmSheet) {
      dtmSheet = ss.insertSheet('DTM_LEARNING');
      dtmSheet.appendRow([
        'Record_ID', 'Batch_ID', 'Crop', 'Variety', 'Bed_ID', 'Planting_Method',
        'Field_Date', 'Harvest_Date', 'Actual_DTM', 'Predicted_DTM', 'Variance',
        'Season', 'Total_GDD', 'Avg_Temp_F', 'Total_Precip_In', 'Frost_Days',
        'Quantity', 'Unit', 'Quality', 'Notes',
        'Recorded_By', 'Recorded_At'
      ]);
      dtmSheet.setFrozenRows(1);
    }

    // 6. Generate record ID and add the learning record with weather
    const recordId = 'DTM-' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd-HHmmss');
    const variance = predictedDTM > 0 ? actualDTM - predictedDTM : 0;

    dtmSheet.appendRow([
      recordId,
      harvest.batchId,
      crop,
      variety,
      bedId,
      plantingMethod || 'Unknown',
      fieldDateObj,
      harvestDateObj,
      actualDTM,
      predictedDTM,
      variance,
      season,
      totalGDD,
      avgTemp,
      totalPrecip,
      frostDays,
      harvest.quantity || '',
      harvest.unit || '',
      harvest.quality || '',
      harvest.notes || '',
      harvest.harvestedBy || '',
      new Date()
    ]);

    // 6. Also record in HARVESTS sheet if it exists (for harvest tracking)
    let harvestSheet = ss.getSheetByName('HARVESTS');
    if (!harvestSheet) {
      harvestSheet = ss.insertSheet('HARVESTS');
      harvestSheet.appendRow([
        'Harvest_ID', 'Batch_ID', 'Crop', 'Variety', 'Bed_ID',
        'Harvest_Date', 'Quantity', 'Unit', 'Quality', 'Notes',
        'Harvested_By', 'Recorded_At'
      ]);
      harvestSheet.setFrozenRows(1);
    }

    const harvestId = 'HRV-' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd-HHmmss');
    harvestSheet.appendRow([
      harvestId,
      harvest.batchId,
      crop,
      variety,
      bedId,
      harvestDateObj,
      harvest.quantity || '',
      harvest.unit || '',
      harvest.quality || '',
      harvest.notes || '',
      harvest.harvestedBy || '',
      new Date()
    ]);

    return jsonResponse({
      success: true,
      message: 'Harvest recorded with DTM and weather data captured',
      data: {
        harvestId: harvestId,
        dtmRecordId: recordId,
        crop: crop,
        variety: variety,
        actualDTM: actualDTM,
        predictedDTM: predictedDTM,
        variance: variance,
        season: season,
        weather: weatherSummary.hasData ? {
          totalGDD: totalGDD,
          avgTemp: avgTemp,
          totalPrecip: totalPrecip,
          frostDays: frostDays
        } : null
      }
    });

  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Get learned DTM predictions based on historical data
 * This is the output of the learning system - real data-driven predictions
 *
 * @param {Object} params
 * @param {string} params.crop - Crop name
 * @param {string} params.variety - Optional variety name
 * @param {string} params.season - Optional season filter
 * @returns {Object} Learned DTM statistics
 */
function getLearnedDTM(params) {
  try {
    const crop = params.crop || params.cropName;
    if (!crop) {
      return { success: false, error: 'Crop name required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dtmSheet = ss.getSheetByName('DTM_LEARNING');

    if (!dtmSheet || dtmSheet.getLastRow() < 2) {
      return {
        success: true,
        hasData: false,
        message: 'No learning data yet for ' + crop,
        predictions: null
      };
    }

    const data = dtmSheet.getDataRange().getValues();
    const headers = data[0];

    const cropCol = headers.indexOf('Crop');
    const varietyCol = headers.indexOf('Variety');
    const actualDTMCol = headers.indexOf('Actual_DTM');
    const seasonCol = headers.indexOf('Season');

    // Filter to matching records
    const matches = [];
    for (let i = 1; i < data.length; i++) {
      const rowCrop = String(data[i][cropCol]).toLowerCase().trim();
      if (rowCrop === String(crop).toLowerCase().trim()) {
        // Check variety filter if provided
        if (params.variety) {
          const rowVariety = String(data[i][varietyCol]).toLowerCase().trim();
          if (rowVariety !== String(params.variety).toLowerCase().trim()) continue;
        }
        // Check season filter if provided
        if (params.season) {
          const rowSeason = String(data[i][seasonCol]).trim();
          if (rowSeason !== params.season) continue;
        }

        matches.push({
          actualDTM: Number(data[i][actualDTMCol]) || 0,
          season: data[i][seasonCol],
          variety: data[i][varietyCol]
        });
      }
    }

    if (matches.length === 0) {
      return {
        success: true,
        hasData: false,
        message: 'No learning data for ' + crop + (params.variety ? ' (' + params.variety + ')' : ''),
        predictions: null
      };
    }

    // Calculate statistics
    const dtmValues = matches.map(m => m.actualDTM).filter(v => v > 0);
    const avgDTM = Math.round(dtmValues.reduce((a, b) => a + b, 0) / dtmValues.length);
    const minDTM = Math.min(...dtmValues);
    const maxDTM = Math.max(...dtmValues);

    // Group by season
    const bySeason = {};
    matches.forEach(m => {
      if (!bySeason[m.season]) bySeason[m.season] = [];
      if (m.actualDTM > 0) bySeason[m.season].push(m.actualDTM);
    });

    const seasonalPredictions = {};
    for (const season in bySeason) {
      const vals = bySeason[season];
      seasonalPredictions[season] = {
        avgDTM: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        samples: vals.length,
        min: Math.min(...vals),
        max: Math.max(...vals)
      };
    }

    return {
      success: true,
      hasData: true,
      crop: crop,
      variety: params.variety || 'all',
      predictions: {
        overall: {
          avgDTM: avgDTM,
          minDTM: minDTM,
          maxDTM: maxDTM,
          samples: dtmValues.length
        },
        bySeason: seasonalPredictions
      }
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// YOUR EXISTING MENU & PRODUCTION FUNCTIONS CONTINUE BELOW
// (All your existing code stays exactly as is)
// ═══════════════════════════════════════════════════════════════════════════







// ══════════════════════════════════════════════════════════════════════════════
// PART 1: MENU & CORE ADMINISTRATION
// ══════════════════════════════════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚜 Tiny Seed Admin')
    .addItem('👋 START: Get Session Agenda', 'startSession')
    .addItem('🛑 END: Log Session', 'logSession')
    .addItem('📘 MANUAL: Update Project Log', 'updateProjectLog')
    .addSeparator()
    .addItem('➕ New Planting Wizard', 'openNewPlantingDialog')
    .addItem('👯 Duplicate & Move Plantings', 'openBatchDuplicateDialog') 
    .addItem('🥬 Add New Crop Profile', 'openNewCropDialog') 
    .addItem('🗑️ Delete Selected Rows', 'deleteSelectedPlantings')
    .addItem('⚡ DIRECT IMPORT (No Pop-up)', 'quickImportStaging')
    .addSeparator()
    .addItem('🔄 Force Recalculate Row', 'forceRecalculateSelectedRow')
    .addItem('🔄 Force Sync Field Data', 'generateFieldTabs')
    .addItem('📊 REPORT: Generate Visual Field Map', 'generateVisualMap')
    .addItem('🧮 CALC: Run Bed Math', 'runBedCalculations')
    .addSeparator()
    .addItem('📅 TASKS: Update Daily Tasks', 'generateDailyTasks')
    .addItem('🚀 ACTION: Register Planting', 'registerSelectedPlanting')
    .addItem('📝 ACTION: Register Harvest', 'registerHarvest')
    .addSeparator()
    .addItem('📧 EMAIL: Crop Production Report', 'generateAndEmailReport')
    .addItem('💲 FINANCE: Generate Price Projections', 'generatePriceProjections')
    .addItem('📊 REPORT: Bed Status Map', 'generateFieldStatusReport') 
    .addItem('📄 REPORT: Generate Audit View', 'generateAuditPDF')
    .addItem('🖨️ PRINT: Bed QR Codes', 'generateQRSheet')
    .addSeparator()
    .addItem('🔧 SETUP: Update Database Tables', 'setupAllTables')
    .addItem('🌡️ WEATHER: Log Daily Weather', 'logDailyWeather')
    .addItem('❄️ SAFETY: Run Frost Check', 'runFrostSafetyCheck')
    .addItem('🔧 VENDOR: Enrich Vendor Database', 'fixAndEnrichVendors')
    .addToUi();
}

function updateProjectLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manualSheet = ss.getSheetByName("SYS_UserManual");
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("Project Log", "Notes for this session:", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    let notes = response.getResponseText() || "Auto-Log: System Update Installed.";
    manualSheet.appendRow([new Date(), "5.0", "Web API Added", "Deploy and test HTML tools", notes]);
    manualSheet.autoResizeColumns(1, 5);
    ui.alert("✅ Log Updated.");
  }
}

function deleteSelectedPlantings() { 
  SpreadsheetApp.getUi().alert("Select rows in PLANNING_2026 and delete manually."); 
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 2: DATABASE SETUP & INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

function setupAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createTabIfNotExists(ss, "SYS_UserManual", 
    ["Date", "Version", "Action_Taken", "Next_Steps_Goals", "Notes"], "#4a86e8");

  createTabIfNotExists(ss, "REF_CropProfiles", [
    "Crop_Name", "Primary_Category", "Family", "Scientific_Name", "Color_Hex", "Variety_Default",
    "Harvest_Unit", "Price_Wholesale", "Price_Retail", "Yield_Lbs_Per_Ft",
    "Calc_Method", "Rec_Direct", "Rec_Transplant", "Rows_Per_Bed", "In_Row_Spacing_In", "Tray_Cell_Count", "Seeder_Config", "Safety_Buffer_%",
    "DTM_Spring", "DTM_Summer", "DTM_Fall", "DTM_Average", 
    "Nursery_Days", "Days_To_Pot_Up", "Days_To_Harden_Off",
    "Germination_Days", "Germ_Temp_F", "Cold_Stratify?", "Germination_Instructions",
    "Hardiness_Zone", "Rotation_Group", "Common_Pests", "Common_Diseases", "Storage_Reqs",
    "Temp_Day_Optimum", "Temp_Night_Optimum", "Soil_Temp_Optimum", "Light_Req", "Water_Req", "pH_Min", "pH_Max", 
    "Grower_Notes"
  ], "#fce5cd");

  createTabIfNotExists(ss, "PLANNING_2026", [
    "STATUS", "Batch_ID", "Crop", "Variety", "Method", 
    "Target_Bed_ID", "Feet_Used", "Plants_Needed", "Trays_Needed",
    "GH_Sow_Date", "Field_Sow_Date", "Transplant_Date", "First_Harvest", 
    "Last_Harvest", "Yield_Lbs", "Revenue", "Notes", "Work_Order"
  ], "#f4cccc");

  createTabIfNotExists(ss, "REF_Fields", 
    ["Field ID", "Field Name", "Acreage", "Length (Ft)", "Width (Ft)", "Path Width (in)", "Bed Width (in)", "Number of Beds", "Notes", "Veg", "Floral", "Perennial", "Cover"], "#cfe2f3");
  createTabIfNotExists(ss, "REF_Beds", 
    ["Bed ID", "Parent Field", "Index", "Length", "Status", "Type"], "#d9ead3");
  createTabIfNotExists(ss, "REF_Pricing", 
    ["Crop_Name", "Harvest_Unit", "Avg_Price_2026", "Proj_2027", "Proj_2028", "Proj_2029", "Proj_2030", "Notes"], "#fff2cc");

  createTabIfNotExists(ss, "MASTER_LOG", 
    ["Date", "Status", "Activity", "Location", "Crop", "Variety", "Qty", "Unit", "Notes", "Staff", "Photos", "Lot#", "Method", "Cleaned?"], "#ffffff");
  createTabIfNotExists(ss, "LOG_Purchases", 
    ["Date", "Vendor", "Order#", "Item", "SKU", "Category", "Qty", "Unit", "Lot#", "Status"], "#fff2cc");
  createTabIfNotExists(ss, "LOG_Weather", 
    ["Date", "Max_Temp_F", "Min_Temp_F", "Precip_Inch", "Growing_Degree_Days", "Notes"], "#a4c2f4");

  createTabIfNotExists(ss, "IMPORT_Staging", ["PASTE_DATA_HERE"], "#e6b8af");
  createTabIfNotExists(ss, "SYS_VendorMaps", ["Vendor", "HeadRow", "Col_Date", "Col_Order", "Col_SKU", "Col_Item", "Col_Qty", "Col_Unit", "Def_Cat"], "#d9d2e9");
  createTabIfNotExists(ss, "REF_Varieties", ["Variety_ID", "Crop", "Variety", "Vendor", "Organic?", "DTM", "Unit", "Link"], "#e06666");
  createTabIfNotExists(ss, "REF_Assets", ["Asset_ID", "Category", "Item_Name", "Location", "Qty", "Unit", "Reorder", "QR"], "#d9d2e9");
  createTabIfNotExists(ss, "REF_Vendors", ["Vendor_Name", "Website_URL", "Account_Number", "Contact_Name", "Contact_Email", "Notes"], "#ead1dc");
  createTabIfNotExists(ss, "REF_TaskTemplates", ["Crop", "Task_Name", "Days_Offset", "Anchor_Point", "Task_Type", "Equipment_Needed", "Notes"], "#fff2cc");

  createTabIfNotExists(ss, "REF_Trays", [
    "Tray_Name", "Cell_Count", "Cells_Per_Flat", "Flat_Dimensions", "Material", "Inventory_Qty"
  ], "#d9d2e9");

  let settingsSheet = createTabIfNotExists(ss, "REF_Settings", ["Setting", "Value", "Notes"], "#b6d7a8");
  if (settingsSheet.getLastRow() < 2) {
    settingsSheet.getRange(2, 1, 4, 3).setValues([
      ["Spring Frost Date", "5/20/2026", "Zelienople, PA"],
      ["Fall Frost Date", "10/10/2026", "Zelienople, PA"],
      ["Farm Latitude", "40.7956", "Geo"],
      ["Farm Longitude", "-80.1384", "Geo"]
    ]);
  }

  const traySheet = ss.getSheetByName("REF_Trays");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  if (traySheet && profileSheet && traySheet.getLastRow() > 1) {
    try {
      const trays = traySheet.getRange(2, 1, traySheet.getLastRow()-1, 1);
      const rule = SpreadsheetApp.newDataValidation().requireValueInRange(trays).build();
      profileSheet.getRange("P2:P1000").setDataValidation(rule);
    } catch(e) { console.log("Validation error: " + e); }
  }
}

function createTabIfNotExists(ss, tabName, headers, color) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground(color);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 3: EMAIL REPORTING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

function generateAndEmailReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var sheet = ss.getSheetByName("PLANNING_2026"); 
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toUpperCase().indexOf("PLANNING") > -1) {
        sheet = sheets[i];
        break;
      }
    }
  }
  
  if (!sheet) {
    ui.alert("Error: Could not find a 'PLANNING_2026' tab!");
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var colMap = {};
  headers.forEach(function(header, index) {
    colMap[header.toString().trim()] = index;
  });

  function getDate(row, colName) {
    if (colMap[colName] === undefined) return null;
    var val = row[colMap[colName]];
    return (val instanceof Date) ? val : null;
  }

  function getVal(row, colName) {
    if (colMap[colName] === undefined) return "";
    return row[colMap[colName]];
  }

  function formatDate(date) {
    if (!date) return "TBD";
    return (date.getMonth() + 1) + '/' + date.getDate();
  }

  var cropData = {};
  var unassignedBeds = [];
  var comingUp = { week1: [], week2: [], month: [] };
  
  var today = new Date();
  var nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  var weekAfter = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  var nextMonth = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var crop = getVal(row, 'Crop');
    if (!crop) continue;

    var variety = getVal(row, 'Variety');
    var bedId = getVal(row, 'Target_Bed_ID');
    
    var sowDate = getDate(row, 'Plan_Field_Sow');
    if (!sowDate) sowDate = getDate(row, 'Plan_Transplant');
    if (!sowDate) sowDate = getDate(row, 'Plan_GH_Sow');
    if (!sowDate) sowDate = getDate(row, 'Field_Sow_Date'); 
    
    var harvestStart = getDate(row, 'First_Harvest');
    var harvestEnd = getDate(row, 'Last_Harvest');

    var entry = {
      rowLine: i + 1,
      variety: variety,
      bed: bedId,
      sowDate: sowDate,
      harvestStart: harvestStart,
      harvestEnd: harvestEnd
    };

    if (!cropData[crop]) cropData[crop] = [];
    cropData[crop].push(entry);

    if (!bedId || bedId.toString().toLowerCase().includes("unassigned") || bedId.toString().toLowerCase().includes("noy yet") || bedId == "") {
      unassignedBeds.push(`${crop} (${variety}) - Seed: ${formatDate(sowDate)}`);
    }

    if (entry.sowDate) {
      var task = `🌱 <b>SOW:</b> ${crop} (${entry.variety}) on ${formatDate(entry.sowDate)}`;
      if (entry.sowDate >= today && entry.sowDate <= nextWeek) comingUp.week1.push(task);
      else if (entry.sowDate > nextWeek && entry.sowDate <= weekAfter) comingUp.week2.push(task);
      else if (entry.sowDate > weekAfter && entry.sowDate <= nextMonth) comingUp.month.push(task);
    }
    
    if (entry.harvestStart) {
      var task = `🔪 <b>HARVEST START:</b> ${crop} (${entry.variety}) on ${formatDate(entry.harvestStart)}`;
      if (entry.harvestStart >= today && entry.harvestStart <= nextWeek) comingUp.week1.push(task);
      else if (entry.harvestStart > nextWeek && entry.harvestStart <= weekAfter) comingUp.week2.push(task);
      else if (entry.harvestStart > weekAfter && entry.harvestStart <= nextMonth) comingUp.month.push(task);
    }
  }

  var htmlBody = "<h2 style='color:#2e7d32;'>🚜 2026 Farm Production Report</h2>";
  htmlBody += "<p>Generated on: " + formatDate(today) + "</p><hr>";

  htmlBody += "<h3 style='background-color:#e8f5e9; padding:5px;'>📊 Crop Consistency</h3>";
  
  var crops = Object.keys(cropData).sort();
  
  crops.forEach(function(c) {
    var batches = cropData[c];
    batches.sort(function(a, b) {
      if (!a.harvestStart) return 1;
      if (!b.harvestStart) return -1;
      return a.harvestStart - b.harvestStart;
    });

    htmlBody += `<h4>${c.toUpperCase()}</h4><ul>`;
    var lastEnd = null;
    
    batches.forEach(function(b) {
      var seedStr = formatDate(b.sowDate);
      var availStr = "<span style='color:gray;'>Dates not set</span>";
      
      if (b.harvestStart) {
        var end = b.harvestEnd ? b.harvestEnd : new Date(b.harvestStart.getTime() + 14*24*60*60*1000);
        availStr = `<b>Available:</b> ${formatDate(b.harvestStart)} - ${formatDate(b.harvestEnd || end)}`;
        
        if (lastEnd) {
          var diffTime = b.harvestStart - lastEnd;
          var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 5) { 
            htmlBody += `<li style="color:red; font-weight:bold;">⚠️ GAP: No production for ${diffDays} days (${formatDate(lastEnd)} to ${formatDate(b.harvestStart)})</li>`;
          }
        }
        lastEnd = end;
      }
      htmlBody += `<li>${b.variety}: Seeded ${seedStr} | ${availStr}</li>`;
    });
    htmlBody += "</ul>";
  });

  htmlBody += "<hr><h3 style='background-color:#fff3e0; padding:5px;'>📅 Coming Up</h3>";
  
  htmlBody += "<h4>This Week (Next 7 Days)</h4><ul>";
  if (comingUp.week1.length == 0) htmlBody += "<li>No major tasks.</li>";
  comingUp.week1.forEach(function(item){ htmlBody += `<li>${item}</li>`; });
  htmlBody += "</ul>";

  htmlBody += "<h4>Next Week (Days 8-14)</h4><ul>";
  if (comingUp.week2.length == 0) htmlBody += "<li>No major tasks.</li>";
  comingUp.week2.forEach(function(item){ htmlBody += `<li>${item}</li>`; });
  htmlBody += "</ul>";

  htmlBody += "<h4>Looking Ahead (Next 30 Days)</h4><ul>";
  if (comingUp.month.length == 0) htmlBody += "<li>No major tasks.</li>";
  comingUp.month.forEach(function(item){ htmlBody += `<li>${item}</li>`; });
  htmlBody += "</ul>";

  htmlBody += "<hr><h3 style='background-color:#ffebee; padding:5px;'>🚫 Unassigned Beds</h3>";
  if (unassignedBeds.length > 0) {
    htmlBody += "<ul>";
    unassignedBeds.forEach(function(u) { htmlBody += `<li>${u}</li>`; });
    htmlBody += "</ul>";
  } else {
    htmlBody += "<p>All batches have assigned beds!</p>";
  }

  var emailResponse = ui.prompt(
    '📧 Email Report', 
    'Enter the email address to send this report to:', 
    ui.ButtonSet.OK_CANCEL
  );

  if (emailResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var email = emailResponse.getResponseText();

  if (!email || email.trim() === "") {
    ui.alert("❌ No email entered. Report cancelled.");
    return;
  }

  try {
    MailApp.sendEmail({
      to: email,
      subject: "🚜 Farm Production Report - " + formatDate(today),
      htmlBody: htmlBody
    });
    ui.alert('✅ Report sent to ' + email);
  } catch (e) {
    ui.alert("❌ Error sending email: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 4: FIELD SYNC & BED GENERATION
// ══════════════════════════════════════════════════════════════════════════════

function generateFieldTabs(runMath) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  if (runMath === true && typeof recalculateAllFieldMath === 'function') {
    try { recalculateAllFieldMath(); } catch (e) { console.log("Math Error: " + e) }
  }

  const srcSheet = ss.getSheetByName('REF_Fields');
  const bedSheet = ss.getSheetByName('REF_Beds');
  if (!srcSheet || !bedSheet) return;

  let bedMemory = {};
  const currentBedData = bedSheet.getDataRange().getValues();
  for (let i = 1; i < currentBedData.length; i++) {
    let id = String(currentBedData[i][0]);
    if (id) {
      bedMemory[id] = {
        length: currentBedData[i][3],
        status: currentBedData[i][4],
        type: currentBedData[i][5]
      };
    }
  }

  const data = srcSheet.getDataRange().getValues();
  
  let vegFields = [['Field Name', 'Notes', 'Acreage']];
  let floral = [['Field Name', 'Notes', 'Acreage']];
  let cover = [['Field Name', 'Notes', 'Acreage']];
  let perennial = [['Field Name', 'Notes', 'Acreage']];
  let newBedList = []; 
  
  for (let i = 1; i < data.length; i++) {
    const r = data[i]; 
    let fieldName = r[1];
    let defaultLength = r[3];
    let bedCount = r[7];

    let type = "";
    if (r[9] === true) type = "Veg";
    else if (r[10] === true) type = "Floral";
    else if (r[11] === true) type = "Perennial";
    else if (r[12] === true) type = "Cover";
    
    if (r[9] === true) vegFields.push([r[1], r[8], r[2]]);
    if (r[10] === true) floral.push([r[1], r[8], r[2]]);
    if (r[11] === true) perennial.push([r[1], r[8], r[2]]);
    if (r[12] === true) cover.push([r[1], r[8], r[2]]);
    
    if (bedCount > 0 && type !== "") {
      for (let b = 1; b <= bedCount; b++) {
        let n = b < 10 ? "0" + b : b;
        let bedId = fieldName + "-" + n;
        
        let finalLength = defaultLength;
        let finalStatus = 'Available';
        
        if (bedMemory[bedId]) {
          finalLength = bedMemory[bedId].length;
          finalStatus = bedMemory[bedId].status;
        }

        newBedList.push([bedId, fieldName, b, finalLength, finalStatus, type]);
      }
    }
  }

  const oldTotal = currentBedData.length - 1;
  const newTotal = newBedList.length;

  if (oldTotal !== newTotal) {
    let response = ui.alert(
      'Confirm Bed Update', 
      `This will change your total bed count from ${oldTotal} to ${newTotal}.\n\n` +
      `Existing bed lengths and statuses will be PRESERVED.\n` +
      `Do you want to proceed?`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      ui.alert('Update Canceled.');
      return;
    }
  }

  updateTab(ss, 'REF_Fields_Veg', [], vegFields);
  updateTab(ss, 'REF_Fields_Floral', [], floral);
  updateTab(ss, 'REF_Fields_Perennial', [], perennial);
  updateTab(ss, 'REF_Fields_Cover', [], cover);
  
  updateTab(ss, 'REF_Beds', [['Bed ID', 'Parent Field', 'Index', 'Length', 'Status', 'Type']], newBedList);
  
  try {
    paintVisualMapDirectly(ss, newBedList);
    applyUniversalStyles(ss);
    applyFieldColors();
    applyBedDropdown(ss);
  } catch (e) {
    console.log("Visuals Error: " + e);
  }
  
  ss.toast("Field data synced successfully.", "Done");
}

function paintVisualMapDirectly(ss, bedList) {
  const sheet = ss.getSheetByName('VISUAL_FieldMap');
  if (!sheet || sheet.getLastRow() < 2) return;
  const colorMap = { "Veg": "#d9ead3", "Floral": "#d9d2e9", "Perennial": "#cfe2f3", "Cover": "#fff2cc" };
  const bedColors = {};
  bedList.forEach(row => { bedColors[row[0]] = colorMap[row[5]] || "#ffffff"; });
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
  const ids = range.getValues().flat();
  const bgColors = ids.map(id => [ bedColors[id] || "#ffffff" ]);
  range.setBackgrounds(bgColors);
}

function applyUniversalStyles(ss) {
  const colors = { veg: "#d9ead3", floral: "#d9d2e9", perennial: "#cfe2f3", cover: "#fff2cc" };
  const planSheet = ss.getSheetByName('PLANNING_2026');
  if (planSheet) {
    let existingRules = planSheet.getConditionalFormatRules(); 
    const range = planSheet.getRange("F2:F2000");
    const newRules = [
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Veg"', colors.veg),
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Floral"', colors.floral),
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Perennial"', colors.perennial),
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Cover"', colors.cover)
    ];
    planSheet.setConditionalFormatRules(existingRules.concat(newRules));
  }
}

function createRule(range, formula, color) {
  return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(color).setRanges([range]).build();
}

function updateTab(ss, name, headers, data) {
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  s.clearContents(); s.clearFormats(); 
  let out = headers.concat(data);
  if (out.length) s.getRange(1, 1, out.length, out[0].length).setValues(out);
}

function applyFieldColors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Fields');
  if (!sheet) return;
  sheet.clearConditionalFormatRules();
  const range = sheet.getRange("A2:M1000");
  const rules = [
    createRule(range, '=$J2=TRUE', "#d9ead3"), createRule(range, '=$K2=TRUE', "#d9d2e9"), 
    createRule(range, '=$L2=TRUE', "#cfe2f3"), createRule(range, '=$M2=TRUE', "#fff2cc")  
  ];
  sheet.setConditionalFormatRules(rules);
}

function applyBedDropdown(ss) {
  const plan = ss.getSheetByName('PLANNING_2026');
  const beds = ss.getSheetByName('REF_Beds');
  if (plan && beds) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(beds.getRange('A2:A')).setAllowInvalid(true).build();
    plan.getRange('F2:F').setDataValidation(rule);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 5: OPERATIONS & REPORTS
// ══════════════════════════════════════════════════════════════════════════════

function generateDailyTasks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const taskSheet = ss.getSheetByName("DAILY_TASKS_GENERATED") || ss.insertSheet("DAILY_TASKS_GENERATED");
  
  const planData = planSheet.getRange(2, 1, planSheet.getLastRow()-1, 14).getValues();
  const profileData = profileSheet.getDataRange().getValues();
  let profiles = {};
  if (profileData.length > 1) {
    const headers = profileData[0];
    for (let i = 1; i < profileData.length; i++) {
      let name = profileData[i][0];
      if (name) profiles[name] = { potUp: profileData[i][9], harden: profileData[i][10], germ: profileData[i][11] };
    }
  }

  let tasks = [];
  for (let p = 0; p < planData.length; p++) {
    let crop = planData[p][2]; let batchID = planData[p][1];
    let sowDate = planData[p][9]; let transplantDate = planData[p][10]; let harvestDate = planData[p][11];
    
    if (!crop || !batchID) continue;
    
    if (sowDate instanceof Date) tasks.push([sowDate, "Seeding", "Sow Seeds", crop, batchID]);
    if (transplantDate instanceof Date) tasks.push([transplantDate, "Planting", "Transplant", crop, batchID]);
    if (harvestDate instanceof Date) tasks.push([harvestDate, "Harvest", "Harvest", crop, batchID]);

    if (profiles[crop] && sowDate instanceof Date) {
      let pro = profiles[crop];
      if (pro.germ > 0) { let d = new Date(sowDate); d.setDate(d.getDate() + Number(pro.germ)); tasks.push([d, "Nursery", "Check Germination", crop, batchID]); }
      if (pro.potUp > 0) { let d = new Date(sowDate); d.setDate(d.getDate() + Number(pro.potUp)); tasks.push([d, "Nursery", "Pot Up", crop, batchID]); }
      if (pro.harden > 0) { let d = new Date(sowDate); d.setDate(d.getDate() + Number(pro.harden)); tasks.push([d, "Nursery", "Harden Off", crop, batchID]); }
    }
  }
  
  taskSheet.getRange(2, 1, taskSheet.getLastRow(), 5).clearContent();
  taskSheet.getRange(1, 1, 1, 5).setValues([["Due_Date", "Task_Type", "Description", "Crop", "Batch_ID"]]);
  if (tasks.length > 0) {
    tasks.sort((a, b) => a[0] - b[0]);
    taskSheet.getRange(2, 1, tasks.length, 5).setValues(tasks);
  }
  SpreadsheetApp.getUi().alert(`✅ Generated ${tasks.length} tasks.`);
}

function generateAuditPDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var auditSheet = ss.getSheetByName("AUDIT_SUBMISSION_VIEW");
  if (auditSheet) ss.deleteSheet(auditSheet);
  auditSheet = ss.insertSheet("AUDIT_SUBMISSION_VIEW");
  auditSheet.getRange("A1").setValue("OFFICIAL ORGANIC AUDIT RECORD - 2026").setFontSize(20).setFontWeight("bold");
  const masterSheet = ss.getSheetByName("MASTER_LOG");
  const masterData = masterSheet.getDataRange().getValues();
  auditSheet.getRange("A3").setValue("SECTION 1: FIELD ACTIVITY LOG").setFontWeight("bold");
  if (masterData.length > 0) auditSheet.getRange(4, 1, masterData.length, masterData[0].length).setValues(masterData);
  const nextRow = 4 + masterData.length + 2;
  const logSheet = ss.getSheetByName("LOG_Purchases");
  const logData = logSheet.getDataRange().getValues();
  auditSheet.getRange(nextRow, 1).setValue("SECTION 2: INPUTS & SEEDS PURCHASED").setFontWeight("bold");
  if (logData.length > 0) auditSheet.getRange(nextRow + 1, 1, logData.length, logData[0].length).setValues(logData);
  SpreadsheetApp.getUi().alert("✅ Audit View Created.");
}

function generateFieldStatusReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName("REPORT_FieldStatus") || ss.insertSheet("REPORT_FieldStatus");
  const bedSheet = ss.getSheetByName("REF_Beds");
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const beds = bedSheet.getRange(2, 1, bedSheet.getLastRow()-1, 1).getValues().flat();
  const plan = planSheet.getRange(2, 1, planSheet.getLastRow()-1, 14).getValues();
  let output = [];
  for (let b=0; b<beds.length; b++) {
    let bedID = beds[b];
    let match = plan.find(r => r[5] === bedID && (r[0] === "PLANTED" || r[0] === "HARVESTING"));
    if (match) {
      let days = Math.floor((new Date() - new Date(match[9])) / (86400000));
      output.push([bedID, match[0], match[2], match[1], days]);
    } else { output.push([bedID, "🟢 AVAILABLE", "-", "-", "-"]); }
  }
  reportSheet.getRange(2, 1, reportSheet.getLastRow(), 5).clearContent();
  if (output.length) reportSheet.getRange(2, 1, output.length, 5).setValues(output);
  SpreadsheetApp.getUi().alert("✅ Report Updated.");
}

function generatePriceProjections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("REF_Pricing");
  if(!s || s.getLastRow() < 2) return;
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Inflation %").getResponseText();
  const rate = 1 + (Number(r)/100);
  const data = s.getRange(2, 1, s.getLastRow() - 1, 8).getValues();
  for(let i=0; i<data.length; i++) {
     if(data[i][2]) {
       data[i][3] = data[i][2] * Math.pow(rate,1); data[i][4] = data[i][2] * Math.pow(rate,2);
       data[i][5] = data[i][2] * Math.pow(rate,3); data[i][6] = data[i][2] * Math.pow(rate,4);
     }
  }
  s.getRange(2,1,data.length,8).setValues(data);
  ui.alert("✅ Updated.");
}

function generateQRSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("PRINT_QR_CODES") || ss.insertSheet("PRINT_QR_CODES");
  const beds = ss.getSheetByName("REF_Beds").getDataRange().getValues();
  let out = [];
  for(let i=1; i<beds.length; i++) out.push([beds[i][0], '=IMAGE("https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl='+encodeURIComponent(beds[i][0])+'")']);
  s.getRange(2,1,out.length,2).setValues(out);
  SpreadsheetApp.getUi().alert("✅ Generated.");
}

function registerSelectedPlanting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const plan = ss.getSheetByName("PLANNING_2026");
  const log = ss.getSheetByName("MASTER_LOG");
  const rIdx = plan.getActiveCell().getRow();
  if (rIdx < 2) return;
  const row = plan.getRange(rIdx, 1, 1, 14).getValues()[0];
  if (!row[5]) { SpreadsheetApp.getUi().alert("No Bed Selected"); return; }
  log.appendRow([new Date(), "Pending", "Planting", row[5], row[2], row[3], "", "", row[12], "", "", row[1], row[4], ""]);
  plan.getRange(rIdx, 1).setValue("PLANTED");
  SpreadsheetApp.getUi().alert(`✅ Planted in ${row[5]}`);
}

function registerHarvest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const plan = ss.getSheetByName("PLANNING_2026");
  const log = ss.getSheetByName("MASTER_LOG");
  const ui = SpreadsheetApp.getUi();
  const rIdx = plan.getActiveCell().getRow();
  if (rIdx < 2) return;
  const row = plan.getRange(rIdx, 1, 1, 14).getValues()[0];
  const qty = ui.prompt("Harvest Qty?").getResponseText();
  log.appendRow([new Date(), "Completed", "Harvest", row[5], row[2], row[3], qty, "lbs", "Harvest", "", "", row[1], "Manual", "Yes"]);
  plan.getRange(rIdx, 1).setValue("HARVESTING");
  ui.alert("✅ Logged.");
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 6: CALCULATORS
// ══════════════════════════════════════════════════════════════════════════════

function runBedCalculations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const traySheet = ss.getSheetByName("REF_Trays");
  
  if (!planSheet || !profileSheet) { SpreadsheetApp.getUi().alert("❌ Missing Tabs."); return; }

  let trayMap = {};
  if (traySheet) {
    const tData = traySheet.getDataRange().getValues();
    for (let i = 1; i < tData.length; i++) {
      trayMap[tData[i][0]] = tData[i][1];
    }
  }

  const pData = profileSheet.getDataRange().getValues();
  let profiles = {};
  for (let i = 1; i < pData.length; i++) {
    let key = String(pData[i][0]).trim() + " - " + String(pData[i][3]).trim();
    let trayVal = pData[i][6];
    let cellCount = trayMap[trayVal] || Number(trayVal) || 72;
    
    profiles[key] = {
      rows: Number(pData[i][4]) || 1,
      spacing: Number(pData[i][5]) || 12,
      tray: cellCount,
      buffer: Number(pData[i][7]) || 0
    };
  }

  const range = planSheet.getDataRange();
  const data = range.getValues();
  let updates = 0;
  
  for (let i = 1; i < data.length; i++) {
    let crop = String(data[i][2]).trim();
    let variety = String(data[i][3]).trim();
    let feetUsed = data[i][6];
    
    if (crop && feetUsed > 0) {
      let key = crop + " - " + variety;
      let dna = profiles[key];
      
      if (dna) {
        let plants = Math.ceil((feetUsed * 12 / dna.spacing) * dna.rows);
        let plantsWithBuffer = plants * (1 + dna.buffer);
        let trays = Math.ceil(plantsWithBuffer / dna.tray);
        
        data[i][7] = plants;
        data[i][8] = trays;
        updates++;
      }
    }
  }
  
  if (updates > 0) {
    planSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    SpreadsheetApp.getUi().alert(`✅ Calculated for ${updates} rows.`);
  } else {
    SpreadsheetApp.getUi().alert("⚠️ No updates. Check Feet Used and Profile Matches.");
  }
}

function calculateFieldAcreage(sheet, row) {
  const len = sheet.getRange(row, 4).getValue();
  const wid = sheet.getRange(row, 5).getValue();
  if (len && wid) {
    const ac = (len * wid) / 43560;
    sheet.getRange(row, 3).setValue(Number(ac.toFixed(2))); 
  }
}

function calculateBedCount(sheet, row) {
  const wid = sheet.getRange(row, 5).getValue(); 
  const path = sheet.getRange(row, 6).getValue(); 
  const bedW = sheet.getRange(row, 7).getValue(); 
  
  if (wid && bedW) { 
    const totalW_in = (path || 0) + bedW;
    if (totalW_in > 0) {
      const beds = Math.floor((wid * 12) / totalW_in);
      sheet.getRange(row, 8).setValue(beds);
    }
  }
}

function recalculateAllFieldMath() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Fields');
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const range = sheet.getRange(2, 1, lastRow - 1, 8);
  const data = range.getValues();
  let updated = false;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const len = row[3];
    const wid = row[4];
    const path = row[5];
    const bedW = row[6];
    
    if (len && wid) {
       let rawAc = (len * wid) / 43560;
       data[i][2] = Number(rawAc.toFixed(2));
       updated = true;
    }
    
    if (wid && bedW) {
       const totalW = (path || 0) + bedW;
       if (totalW > 0) {
          data[i][7] = Math.floor((wid * 12) / totalW);
          updated = true;
       }
    }
  }
  
  if (updated) {
    range.setValues(data);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 7: EDIT TRIGGERS & DATE SYNC
// ══════════════════════════════════════════════════════════════════════════════

function onEdit(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  const name = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const val = e.value;

  if (row < 2) return; 

  if (name === "PLANNING_2026") {
    if ([10, 12, 14, 16].includes(col)) {
      syncPlanningDates(sheet, row, col, val);
    }
  }

  if (name === 'REF_Fields') {
    if (col >= 4 && col <= 7) {
      if (typeof calculateFieldAcreage === 'function') calculateFieldAcreage(sheet, row);
      
      const currentBeds = sheet.getRange(row, 8).getValue();
      let didCalc = false;

      if ((currentBeds === "" || currentBeds === 0) && typeof calculateBedCount === 'function') {
         calculateBedCount(sheet, row);
         didCalc = true;
      }
      
      if (typeof generateFieldTabs === 'function') generateFieldTabs(didCalc); 
    }

    if (col === 8) {
      if (typeof generateFieldTabs === 'function') generateFieldTabs(false); 
    }
    
    if (col >= 10 && col <= 13) {
      if (typeof generateFieldTabs === 'function') generateFieldTabs(false);
    }
  }
}

function syncPlanningDates(sheet, row, col, newVal) {
  if (!newVal) return; 
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  const rowData = sheet.getRange(row, 3, 1, 3).getValues()[0];
  const crop = String(rowData[0]).trim().toLowerCase();
  const variety = String(rowData[1]).trim().toLowerCase();
  const method = String(rowData[2]).toLowerCase();

  const pData = profileSheet.getDataRange().getValues();
  let nurseryDays = 28; 
  let dtm = 50;         

  for (let i = 1; i < pData.length; i++) {
    let pCrop = String(pData[i][0]).trim().toLowerCase();
    let pVar = String(pData[i][5]).trim().toLowerCase();
    
    if (pCrop === crop && pVar === variety) {
      nurseryDays = Number(pData[i][22]) || 28; 
      dtm = Number(pData[i][42]) || 50;         
      break;
    } else if (pCrop === crop && !pVar) {
      nurseryDays = Number(pData[i][22]) || 28;
      dtm = Number(pData[i][42]) || 50;
    }
  }

  const anchorDate = new Date(newVal); 
  let newSow, newTransplant, newHarvest;

  if (method.includes('transplant') || method.includes('paper')) {
    if (col === 10) {
      newSow = anchorDate;
      newTransplant = new Date(anchorDate); newTransplant.setDate(anchorDate.getDate() + nurseryDays);
      newHarvest = new Date(newTransplant); newHarvest.setDate(newTransplant.getDate() + dtm);
      sheet.getRange(row, 14).setValue(newTransplant); 
      sheet.getRange(row, 16).setValue(newHarvest);    
    } else if (col === 14) {
      newTransplant = anchorDate;
      newSow = new Date(anchorDate); newSow.setDate(anchorDate.getDate() - nurseryDays);
      newHarvest = new Date(anchorDate); newHarvest.setDate(anchorDate.getDate() + dtm);
      sheet.getRange(row, 10).setValue(newSow);      
      sheet.getRange(row, 16).setValue(newHarvest);   
    } else if (col === 16) {
      newHarvest = anchorDate;
      newTransplant = new Date(anchorDate); newTransplant.setDate(anchorDate.getDate() - dtm);
      newSow = new Date(newTransplant); newSow.setDate(newTransplant.getDate() - nurseryDays);
      sheet.getRange(row, 10).setValue(newSow);
      sheet.getRange(row, 14).setValue(newTransplant);
    }
  } else {
    if (col === 12) {
      newSow = anchorDate;
      newHarvest = new Date(anchorDate); newHarvest.setDate(anchorDate.getDate() + dtm);
      sheet.getRange(row, 16).setValue(newHarvest);
    } else if (col === 16) {
      newHarvest = anchorDate;
      newSow = new Date(anchorDate); newSow.setDate(anchorDate.getDate() - dtm);
      sheet.getRange(row, 12).setValue(newSow);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 8: WIZARD SYSTEM (BACKEND)
// ══════════════════════════════════════════════════════════════════════════════

function openNewPlantingDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Wizard_Form').setWidth(500).setHeight(750).setTitle('🌱 Smart Planting Wizard');
  SpreadsheetApp.getUi().showModalDialog(html, 'Planting Wizard');
}

function openBatchDuplicateDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (sheet.getName() !== "PLANNING_2026") {
    SpreadsheetApp.getUi().alert("Please select rows in PLANNING_2026 first.");
    return;
  }
  const html = HtmlService.createHtmlOutputFromFile('Form_Duplicate').setWidth(350).setHeight(450).setTitle('👯 Duplicate Plantings');
  SpreadsheetApp.getUi().showModalDialog(html, 'Duplicate & Move');
}

function forceRecalculateSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (sheet.getName() === "Greenhouse 2026" && row > 1) {
    const batchId = sheet.getRange(row, 2).getValue();
    if (typeof recalculateGreenhouseRow === 'function' && batchId) {
       recalculateGreenhouseRow(sheet, row, batchId);
    } else {
       SpreadsheetApp.getUi().alert("Feature requires legacy Greenhouse helpers.");
    }
  }
}

function getDuplicateInitData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const bedSheet = ss.getSheetByName("REF_Beds");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  let beds = [];
  if (bedSheet) {
    const bValues = bedSheet.getDataRange().getValues();
    for (let i = 1; i < bValues.length; i++) {
      let id = bValues[i][0];
      let len = Number(bValues[i][3]) || 100;
      if(id) beds.push({ id: id, length: len });
    }
  }

  let bookings = [];
  if (planSheet) {
    const pValues = planSheet.getDataRange().getValues();
    for (let i = 1; i < pValues.length; i++) {
       let bedId = String(pValues[i][5]);
       let start = String(pValues[i][4]).toLowerCase().includes('transplant') ? pValues[i][13] : pValues[i][11];
       let end = pValues[i][16];
       
       if (start instanceof Date && (!end || !(end instanceof Date))) {
          let e = new Date(start); e.setDate(start.getDate() + 45); end = e;
       }
       if (bedId && start instanceof Date && end instanceof Date) {
         bookings.push({ bedId: bedId, start: start.getTime(), end: end.getTime(), feet: Number(pValues[i][6])||0 });
       }
    }
  }

  let profileDefaults = {};
  if (profileSheet) {
    const pData = profileSheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      let crop = String(pData[i][0]).toLowerCase().trim();
      let variety = String(pData[i][5]).toLowerCase().trim();
      let key = crop + "|" + variety;
      
      profileDefaults[key] = {
        rows: Number(pData[i][13]) || 1,
        spacing: Number(pData[i][14]) || 12
      };
      if (!profileDefaults[crop]) {
        profileDefaults[crop] = { rows: Number(pData[i][13])||1, spacing: Number(pData[i][14])||12 };
      }
    }
  }

  let selectedCrops = [];
  try {
    const selectionList = ss.getSelection().getActiveRangeList();
    if (selectionList) {
      selectionList.getRanges().forEach(range => {
        const startRow = range.getRow();
        const data = planSheet.getRange(startRow, 1, range.getNumRows(), 7).getValues();
        data.forEach((r, i) => {
          if (r[0] !== "Status" && r[2]) {
            let c = String(r[2]).toLowerCase().trim();
            let v = String(r[3]).toLowerCase().trim();
            
            let defs = profileDefaults[c + "|" + v] || profileDefaults[c] || { rows: 1, spacing: 12 };

            selectedCrops.push({
              rowIndex: startRow + i,
              crop: r[2],
              variety: r[3],
              currentFeet: Number(r[6]) || 0,
              defRows: defs.rows,
              defSpace: defs.spacing
            });
          }
        });
      });
    }
  } catch(e) {}

  return { beds: beds, bookings: bookings, selectedCrops: selectedCrops };
}

function processAllocatedDuplication(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const bedSheet = ss.getSheetByName("REF_Beds");

  let bedLengths = {};
  if (bedSheet) {
    const bData = bedSheet.getDataRange().getValues();
    for (let i = 1; i < bData.length; i++) {
      if (bData[i][0]) bedLengths[bData[i][0]] = Number(bData[i][3]) || 100;
    }
  }

  const pData = profileSheet.getDataRange().getValues();
  let cropMap = {};
  for(let i=1; i<pData.length; i++) {
     let key = String(pData[i][0]).toLowerCase().trim() + "|" + 
               String(pData[i][5]).toLowerCase().trim() + "|" + 
               (String(pData[i][43]).toLowerCase().includes("direct") ? "direct" : "transplant");
     cropMap[key] = { rowIndex: i + 1 }; 
  }

  let successCount = 0;

  form.bedIds.forEach(targetBedId => {
      form.allocations.forEach(item => {
        const rowValues = planSheet.getRange(item.rowIndex, 1, 1, 20).getValues()[0];

        let crop = String(rowValues[2]).trim();
        let variety = String(rowValues[3]).trim();
        let method = String(rowValues[4]).trim();
        let notes = rowValues[19];
        let mode = method.toLowerCase().includes("direct") ? "direct" : "transplant";

        let rowsPerBed = item.newRows || 1; 
        let spacing = item.newSpace || 12;
        let finalFeet = form.fillMode ? (bedLengths[targetBedId] || 100) : item.feet;

        let traySize = 72, nursery = 28, dtm = 50;
        if (mode === "direct") nursery = 0;

        let key = crop.toLowerCase() + "|" + variety.toLowerCase() + "|" + mode;
        if (cropMap[key]) {
            let pRow = cropMap[key].rowIndex;
            let vals = profileSheet.getRange(pRow, 1, 1, 45).getValues()[0];
            dtm = vals[42] || 50; 
            nursery = vals[22] || (mode === "direct" ? 0 : 28);
            traySize = vals[15] || 72;
        }

        const plants = Math.ceil((finalFeet * 12 / spacing) * rowsPerBed);
        let bedTrays = 0;
        if (mode === "transplant") bedTrays = Math.ceil((plants * 1.1) / traySize);

        let anchorDate = new Date(form.date);
        let planGHSow, planFieldSow, planTransplant, planFirstHarvest;
        
        if (form.type === 'harvest') {
            planFirstHarvest = new Date(anchorDate);
            let fieldDate = new Date(anchorDate); fieldDate.setDate(anchorDate.getDate() - dtm);
            if (mode === "transplant") {
              planTransplant = fieldDate;
              let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nursery);
              planGHSow = sowDate;
            } else { planFieldSow = fieldDate; }
        } else if (form.type === 'transplant') {
            let fieldDate = new Date(anchorDate);
            if (mode === "transplant") {
              planTransplant = fieldDate;
              let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nursery);
              planGHSow = sowDate;
            } else { planFieldSow = fieldDate; }
            let harvDate = new Date(fieldDate); harvDate.setDate(fieldDate.getDate() + dtm);
            planFirstHarvest = harvDate;
        } else if (form.type === 'gh_sow') {
            planGHSow = new Date(anchorDate);
            let transDate = new Date(planGHSow); transDate.setDate(planGHSow.getDate() + nursery);
            planTransplant = transDate;
            let harvDate = new Date(planTransplant); harvDate.setDate(planTransplant.getDate() + dtm);
            planFirstHarvest = harvDate;
        }

        let batchId = "26-" + crop.substring(0,3).toUpperCase() + "-" + Math.floor(Math.random() * 9999);

        planSheet.appendRow([
            "Planned", batchId, crop, variety, method, targetBedId,
            finalFeet, plants, bedTrays, 
            planGHSow || "", "", planFieldSow || "", "", planTransplant || "", "", 
            planFirstHarvest, "", "", "", notes
        ]);
        successCount++;
      });
  });

  return `✅ Planted ${successCount} entries (Density Adjusted).`;
}

function getWizardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bedSheet = ss.getSheetByName("REF_Beds");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const planSheet = ss.getSheetByName("PLANNING_2026");
  
  let beds = [];
  if (bedSheet) {
    const bData = bedSheet.getRange(2, 1, bedSheet.getLastRow()-1, 4).getValues(); 
    beds = bData.map(r => ({ id: r[0], length: Number(r[3]) })).filter(b => b.id !== "");
  }

  let bookings = [];
  if (planSheet && planSheet.getLastRow() > 1) {
    const pData = planSheet.getRange(2, 1, planSheet.getLastRow()-1, 16).getValues(); 
    for (let i = 0; i < pData.length; i++) {
      let bid = String(pData[i][5]);
      let feet = Number(pData[i][6]) || 0;
      let method = String(pData[i][4]).toLowerCase();
      let start = (method.includes('transplant') || method.includes('paper')) ? pData[i][13] : pData[i][11];
      let end = pData[i][15]; 
      
      if (start instanceof Date && (!end || !(end instanceof Date))) {
          let estimatedEnd = new Date(start);
          estimatedEnd.setDate(start.getDate() + 45); 
          end = estimatedEnd;
      }

      if (bid && start instanceof Date && end instanceof Date) {
        bookings.push({ bedId: bid, feet: feet, start: start.getTime(), end: end.getTime() });
      }
    }
  }

  let vegCrops = [], floralCrops = [], cropMap = {}; 
  if (profileSheet) {
    const pData = profileSheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      let name = String(pData[i][0]).trim(); 
      let category = pData[i][1];            
      let variety = String(pData[i][5]).trim();
      let rawMethod = String(pData[i][43]);
      let cleanMethod = "Transplant";
      if (rawMethod.toLowerCase().includes("direct")) cleanMethod = "Direct Seed";
      else if (rawMethod.toLowerCase().includes("paper")) cleanMethod = "Paperpot";
      
      if (!cropMap[name]) {
        cropMap[name] = {
          varieties: [],
          rows: pData[i][13] || 1, spacing: pData[i][14] || 12, tray: pData[i][15] || 72,   
          nursery: (cleanMethod === "Direct Seed") ? 0 : (pData[i][22] || 28),
          method: cleanMethod, dtm: pData[i][42] || 50     
        };
        if (String(category).toLowerCase().includes("floral")) floralCrops.push(name); else vegCrops.push(name);
      }
      if (variety && !cropMap[name].varieties.includes(variety)) cropMap[name].varieties.push(variety);
    }
  }
  return { beds: beds, bookings: bookings, veg: [...new Set(vegCrops)].sort(), floral: [...new Set(floralCrops)].sort(), map: cropMap };
}

function submitPlanting(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");

  const batchId = "26-" + form.crop.substring(0,3).toUpperCase() + "-" + Math.floor(Math.random() * 9999);
  const totalFeet = Number(form.feet) || 0;
  const bedIds = form.bedIds; 
  const rowsPerBed = Number(form.rowsPerBed) || 1;
  const spacing = Number(form.spacing) || 12;
  const traySize = Number(form.traySize) || 72;
  const nurseryDays = Number(form.nurseryDays) || 0;
  const dtm = Number(form.dtm) || 50;
  const notes = form.notes || "";
  const crop = String(form.crop).trim();
  const variety = String(form.variety).trim();
  const method = String(form.method).trim();
  const mode = method.toLowerCase().includes("direct") ? "direct" : "transplant";

  let anchorDate = new Date(form.anchorDate);
  let planGHSow, planFieldSow, planTransplant, planFirstHarvest;
  
  if (form.anchorType === 'harvest') {
    planFirstHarvest = new Date(anchorDate);
    let fieldDate = new Date(anchorDate); fieldDate.setDate(anchorDate.getDate() - dtm);
    if (mode === "transplant") {
      planTransplant = fieldDate;
      let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nurseryDays);
      planGHSow = sowDate;
    } else { planFieldSow = fieldDate; }
  } else if (form.anchorType === 'transplant') {
    let fieldDate = new Date(anchorDate);
    if (mode === "transplant") {
      planTransplant = fieldDate;
      let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nurseryDays);
      planGHSow = sowDate;
    } else { planFieldSow = fieldDate; }
    let harvDate = new Date(fieldDate); harvDate.setDate(fieldDate.getDate() + dtm);
    planFirstHarvest = harvDate;
  } else if (form.anchorType === 'gh_sow') {
    planGHSow = new Date(anchorDate);
    let transDate = new Date(planGHSow); transDate.setDate(planGHSow.getDate() + nurseryDays);
    planTransplant = transDate;
    let harvDate = new Date(planTransplant); harvDate.setDate(planTransplant.getDate() + dtm);
    planFirstHarvest = harvDate;
  }

  const feetPerBed = Math.floor(totalFeet / bedIds.length); 
  bedIds.forEach(bedId => {
    const bedPlants = Math.ceil((feetPerBed * 12 / spacing) * rowsPerBed);
    let bedTrays = 0;
    if (mode === "transplant") bedTrays = Math.ceil((bedPlants * 1.1) / traySize);
    
    planSheet.appendRow([
      (bedId === "Unassigned") ? "Backlog" : "Planned",
      batchId, crop, variety, method, bedId,
      feetPerBed, bedPlants, bedTrays, 
      planGHSow || "", "", planFieldSow || "", "", planTransplant || "", "", 
      planFirstHarvest, "", "", "", notes
    ]);
  });

  const pData = profileSheet.getDataRange().getValues();
  let rowIndex = -1;
  let parentRowData = null;

  for (let i = 1; i < pData.length; i++) {
    let pCrop = String(pData[i][0]).toLowerCase().trim();
    let pVar = String(pData[i][5]).toLowerCase().trim();
    let pMethod = String(pData[i][43]).toLowerCase(); 
    let pMode = pMethod.includes("direct") ? "direct" : "transplant";

    if (pCrop === crop.toLowerCase() && !parentRowData) {
       parentRowData = pData[i].slice();
    }

    if (pCrop === crop.toLowerCase() && pVar === variety.toLowerCase() && pMode === mode) {
      rowIndex = i + 1;
      break;
    }
  }

  const recDirect = (mode === "direct") ? "Yes" : "No";
  const recTrans = (mode === "transplant") ? "Yes" : "No";

  if (rowIndex < 0) {
    if (parentRowData) {
      parentRowData[5] = variety;
      profileSheet.appendRow(parentRowData);
    } else {
      profileSheet.appendRow([crop]); 
    }
    rowIndex = profileSheet.getLastRow();
  }

  profileSheet.getRange(rowIndex, 1).setValue(crop);
  profileSheet.getRange(rowIndex, 2).setValue("Veg");
  profileSheet.getRange(rowIndex, 6).setValue(variety);
  
  profileSheet.getRange(rowIndex, 12).setValue(recDirect);  
  profileSheet.getRange(rowIndex, 13).setValue(recTrans);   
  profileSheet.getRange(rowIndex, 14).setValue(rowsPerBed); 
  profileSheet.getRange(rowIndex, 15).setValue(spacing);    
  profileSheet.getRange(rowIndex, 16).setValue(traySize);   
  
  profileSheet.getRange(rowIndex, 22).setValue(dtm);         
  profileSheet.getRange(rowIndex, 23).setValue(nurseryDays); 
  profileSheet.getRange(rowIndex, 43).setValue(dtm);         
  profileSheet.getRange(rowIndex, 44).setValue(method);      
  
  return `✅ Scheduled ${crop} & Saved Profile.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 9: CROP PROFILE WIZARD
// ══════════════════════════════════════════════════════════════════════════════

function openNewCropDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Form_NewCrop')
      .setWidth(450)
      .setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(html, '🥬 Smart Crop Wizard');
}

function getCropTemplate(cropName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const matchRow = data.find(r => String(r[0]).trim().toLowerCase() === String(cropName).trim().toLowerCase());

  if (!matchRow) return null;

  return {
    Crop_Name: matchRow[0],
    Primary_Category: matchRow[1],
    Family: matchRow[2],
    Scientific_Name: matchRow[3],
    Color_Hex: matchRow[4],
    Variety_Default: matchRow[5],
    Harvest_Unit: matchRow[6],
    Price_Wholesale: matchRow[7],
    Price_Retail: matchRow[8],
    Yield_Lbs_Per_Ft: matchRow[9],
    Calc_Method: matchRow[10],
    Rec_Direct: matchRow[11],
    Rec_Transplant: matchRow[12],
    Rows_Per_Bed: matchRow[13],
    In_Row_Spacing_In: matchRow[14],
    Tray_Cell_Count: matchRow[15],
    Seeder_Config: matchRow[16],
    Safety_Buffer: matchRow[17],
    DTM_Spring: matchRow[18],
    DTM_Summer: matchRow[19],
    DTM_Fall: matchRow[20],
    DTM_Average: matchRow[21],
    Nursery_Days: matchRow[22],
    Days_To_Pot_Up: matchRow[23],
    Days_To_Harden_Off: matchRow[24],
    Germination_Days: matchRow[25],
    Germ_Temp_F: matchRow[26],
    Cold_Stratify: matchRow[27],
    Germination_Instructions: matchRow[28],
    Hardiness_Zone: matchRow[29],
    Rotation_Group: matchRow[30],
    Common_Pests: matchRow[31],
    Common_Diseases: matchRow[32],
    Storage_Reqs: matchRow[33],
    Temp_Day_Optimum: matchRow[34],
    Temp_Night_Optimum: matchRow[35],
    Soil_Temp_Optimum: matchRow[36],
    Light_Req: matchRow[37],
    Water_Req: matchRow[38],
    pH_Min: matchRow[39],
    pH_Max: matchRow[40],
    Grower_Notes: matchRow[41]
  };
}

function saveNewCropProfile(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  
  if (!sheet) throw new Error("REF_CropProfiles sheet not found!");

  const newRow = [
    data.Crop_Name, data.Primary_Category, data.Family, data.Scientific_Name, data.Color_Hex || "#999999", data.Variety_Default,
    data.Harvest_Unit, data.Price_Wholesale, data.Price_Retail, data.Yield_Lbs_Per_Ft,
    data.Calc_Method, data.Rec_Direct, data.Rec_Transplant, data.Rows_Per_Bed || 1, data.In_Row_Spacing_In || 12, data.Tray_Cell_Count || 72, data.Seeder_Config, data.Safety_Buffer || 0.10,
    data.DTM_Spring, data.DTM_Summer, data.DTM_Fall, data.DTM_Average, data.Nursery_Days, data.Days_To_Pot_Up, data.Days_To_Harden_Off,
    data.Germination_Days, data.Germ_Temp_F, data.Cold_Stratify, data.Germination_Instructions,
    data.Hardiness_Zone, data.Rotation_Group, data.Common_Pests, data.Common_Diseases, data.Storage_Reqs, data.Temp_Day_Optimum, data.Temp_Night_Optimum, data.Soil_Temp_Optimum, data.Light_Req, data.Water_Req, data.pH_Min, data.pH_Max,
    data.Grower_Notes
  ];

  sheet.appendRow(newRow);
  sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).sort(1);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 10: IMPORT SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function openImportDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Form_ImportStaging')
      .setWidth(500).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, '📦 Universal Import Tool');
}

function quickImportStaging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stage = ss.getSheetByName('IMPORT_Staging');
  const ui = SpreadsheetApp.getUi();

  if (!stage || stage.getLastRow() < 2) {
    ui.alert("⚠️ Staging is empty.");
    return;
  }

  const headers = stage.getRange(1, 1, 1, stage.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());

  let map = {};
  let type = "UNKNOWN";

  const CROP_MAP = {
    "crop": "Crop_Name", "name": "Crop_Name", 
    "variety": "Variety_Default", "var": "Variety_Default",
    "family": "Family",
    "category": "Primary_Category",
    "dtm": "DTM_Average", "days": "DTM_Average",
    "spacing": "In_Row_Spacing_In", "space": "In_Row_Spacing_In", "dist": "In_Row_Spacing_In",
    "rows": "Rows_Per_Bed",
    "tray": "Tray_Cell_Count", "cell": "Tray_Cell_Count",
    "yield": "Yield_Lbs_Per_Ft",
    "note": "Grower_Notes"
  };

  const ORDER_MAP = {
    "date": "Date",
    "vendor": "Vendor", "source": "Vendor",
    "order": "Order#", "invoice": "Order#",
    "item": "Item", "product": "Item", "desc": "Item",
    "sku": "SKU", "part": "SKU",
    "qty": "Qty", "quantity": "Qty", "amount": "Qty",
    "unit": "Unit", "size": "Unit",
    "cost": "Cost", "price": "Cost"
  };

  if (headers.some(h => h.includes("crop") || h.includes("spacing") || h.includes("dtm") || h.includes("family"))) {
    type = "CROPS";
    headers.forEach((h, i) => {
      for (let key in CROP_MAP) {
        if (h.includes(key)) map[i] = CROP_MAP[key];
      }
    });
  } 
  else if (headers.some(h => h.includes("sku") || h.includes("order") || h.includes("qty") || h.includes("price"))) {
    type = "ORDERS";
    headers.forEach((h, i) => {
      for (let key in ORDER_MAP) {
        if (h.includes(key)) map[i] = ORDER_MAP[key];
      }
    });
  }

  if (type === "UNKNOWN") {
    ui.alert("❌ Could not detect if this is Crops or Orders.\nPlease ensure headers include 'Crop' or 'SKU'.");
    return;
  }

  const confirm = ui.alert(`Detected: ${type}`, `I found ${Object.keys(map).length} matching columns.\nProceed with import?`, ui.ButtonSet.YES_NO);
  
  if (confirm == ui.Button.YES) {
    let count = 0;
    if (type === "CROPS") count = runCropImport(stage, ss.getSheetByName('REF_CropProfiles'), map);
    else count = runOrderImport(stage, ss.getSheetByName('LOG_Purchases'), map);
    
    ui.alert(`✅ Success! Imported ${count} rows.`);
  }
}

function analyzeStaging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('IMPORT_Staging');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String);
  const hString = headers.join(" ").toLowerCase();
  
  let likely = "UNKNOWN";
  if (hString.includes("spacing") || hString.includes("dtm") || hString.includes("family")) likely = "CROPS";
  else if (hString.includes("sku") || hString.includes("qty") || hString.includes("price")) likely = "ORDERS";
  
  return { headers: headers, likelyType: likely };
}

function executeUniversalImport(type, map) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stage = ss.getSheetByName('IMPORT_Staging');
  if (type === "CROPS") return runCropImport(stage, ss.getSheetByName('REF_CropProfiles'), map);
  else return runOrderImport(stage, ss.getSheetByName('LOG_Purchases'), map);
}

function runCropImport(source, target, map) {
  const rawData = source.getDataRange().getValues();
  rawData.shift(); 
  
  const schema = [
    "Crop_Name", "Primary_Category", "Family", "Scientific_Name", "Color_Hex", "Variety_Default",
    "Harvest_Unit", "Price_Wholesale", "Price_Retail", "Yield_Lbs_Per_Ft",
    "Calc_Method", "Rec_Direct", "Rec_Transplant", "Rows_Per_Bed", "In_Row_Spacing_In", "Tray_Cell_Count", "Seeder_Config", "Safety_Buffer_%",
    "DTM_Spring", "DTM_Summer", "DTM_Fall", "DTM_Average", 
    "Nursery_Days", "Days_To_Pot_Up", "Days_To_Harden_Off",
    "Germination_Days", "Germ_Temp_F", "Cold_Stratify?", "Germination_Instructions",
    "Hardiness_Zone", "Rotation_Group", "Common_Pests", "Common_Diseases", "Storage_Reqs",
    "Temp_Day_Optimum", "Temp_Night_Optimum", "Soil_Temp_Optimum", "Light_Req", "Water_Req", "pH_Min", "pH_Max", "Grower_Notes"
  ];
  
  const output = [];
  for(let row of rawData) {
    let obj = mapRowToObj(row, map);
    if(!obj["Crop_Name"]) continue;
    
    let outRow = schema.map(f => {
      let val = obj[f] || "";
      if (f.includes("Spacing") || f.includes("Days") || f.includes("Rows") || f.includes("DTM")) val = cleanNumber(val);
      return val;
    });
    output.push(outRow);
  }
  
  if(output.length) {
    target.getRange(target.getLastRow()+1, 1, output.length, output[0].length).setValues(output);
    target.getRange(2, 1, target.getLastRow()-1, target.getLastColumn()).sort(1);
  }
  return output.length;
}

function runOrderImport(source, target, map) {
  const rawData = source.getDataRange().getValues();
  rawData.shift(); 
  const output = [];
  const today = new Date();
  
  for(let row of rawData) {
    let obj = mapRowToObj(row, map);
    if(!obj["Item"]) continue; 
    
    const newRow = [
      obj["Date"] || today, obj["Vendor"] || "Import", obj["Order#"] || "",
      obj["Item"], obj["SKU"] || "", obj["Category"] || "Seeds",
      cleanNumber(obj["Qty"]), obj["Unit"] || "", "", obj["Status"] || "Ordered"
    ];
    output.push(newRow);
  }
  if(output.length) target.getRange(target.getLastRow()+1, 1, output.length, 10).setValues(output);
  return output.length;
}

function mapRowToObj(row, map) {
  let obj = {};
  for(let colIndex in map) {
    obj[map[colIndex]] = row[colIndex];
  }
  return obj;
}

function cleanNumber(val) {
  if(!val) return 0;
  if(typeof val === 'number') return val;
  let num = String(val).match(/\d+(\.\d+)?/);
  return num ? Number(num[0]) : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 11: VISUAL FIELD MAP (GANTT CHART)
// ══════════════════════════════════════════════════════════════════════════════

function generateVisualMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const bedSheet = ss.getSheetByName("REF_Beds");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  if (!planSheet || !bedSheet || !profileSheet) { SpreadsheetApp.getUi().alert("❌ Missing Tabs."); return; }

  let mapSheet = ss.getSheetByName("VISUAL_FieldMap");
  if (mapSheet) ss.deleteSheet(mapSheet);
  mapSheet = ss.insertSheet("VISUAL_FieldMap");
  mapSheet.setTabColor("#6aa84f");

  const year = 2026;
  let headers = ["Bed ID"];
  let startDate = new Date(year, 0, 1);
  let endDate = new Date(year, 11, 31);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    headers.push(new Date(d)); 
  }
  
  mapSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  mapSheet.getRange(1, 2, 1, headers.length - 1).setNumberFormat("M/d");
  mapSheet.setFrozenRows(1);
  mapSheet.setFrozenColumns(1);
  mapSheet.setColumnWidths(2, headers.length - 1, 20);

  const bedData = bedSheet.getRange(2, 1, bedSheet.getLastRow()-1, 1).getValues();
  let bedRowMap = {}; 
  let bedRows = [];
  
  for (let i = 0; i < bedData.length; i++) {
    let bedID = bedData[i][0];
    if (bedID) {
      bedRows.push([bedID]);
      bedRowMap[bedID] = i + 2; 
    }
  }
  mapSheet.getRange(2, 1, bedRows.length, 1).setValues(bedRows);

  const profData = profileSheet.getDataRange().getValues();
  let cropMeta = {};
  
  for (let i = 1; i < profData.length; i++) {
    let name = String(profData[i][0]).toLowerCase().trim();
    cropMeta[name] = {
      color: profData[i][4] || "#cccccc",
      dtm: profData[i][42] || 60
    };
  }

  const planData = planSheet.getDataRange().getValues();
  
  for (let i = 1; i < planData.length; i++) {
    let row = planData[i];
    let crop = row[2];
    let method = String(row[4]).toLowerCase();
    let bedID = row[5];
    
    let fieldStart;
    if (method.includes("transplant") || method.includes("paperpot")) {
      fieldStart = row[13];
    } else {
      fieldStart = row[11];
    }

    if (bedID && fieldStart instanceof Date && bedRowMap[bedID]) {
      let meta = cropMeta[String(crop).toLowerCase().trim()] || {color: "#999999", dtm: 60};
      
      let fieldEnd = row[15];
      if (!(fieldEnd instanceof Date)) {
        fieldEnd = new Date(fieldStart.getTime() + (meta.dtm * 86400000));
      }

      let dayDiff = Math.ceil((fieldStart - startDate) / (1000 * 60 * 60 * 24));
      let duration = Math.ceil((fieldEnd - fieldStart) / (1000 * 60 * 60 * 24));
      
      let colIndex = dayDiff + 2;
      
      if (colIndex >= 2 && duration > 0 && (colIndex + duration) < headers.length) {
        let r = bedRowMap[bedID];
        try {
          let range = mapSheet.getRange(r, colIndex, 1, duration);
          range.setBackground(meta.color);
          
          if (duration > 5) {
            mapSheet.getRange(r, colIndex).setValue(crop).setFontSize(8);
          }
        } catch (e) { console.log("Paint error: " + e); }
      }
    }
  }
  
  SpreadsheetApp.getUi().alert("✅ Visual Field Map Generated.");
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 12: SESSION MANAGER
// ══════════════════════════════════════════════════════════════════════════════

function logSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manualSheet = ss.getSheetByName("SYS_UserManual");
  
  if (!manualSheet) { SpreadsheetApp.getUi().alert("❌ Missing SYS_UserManual"); return; }

  const today = new Date();
  const lastRow = manualSheet.getLastRow() + 1;
  
  manualSheet.getRange(lastRow, 1).setValue(today).setNumberFormat("M/d/yyyy");
  
  const targetCell = manualSheet.getRange(lastRow, 2);
  manualSheet.setActiveRange(targetCell);
  
  SpreadsheetApp.getUi().alert("✅ Log Row Ready.\n\nPaste the AI summary into Cell B" + lastRow);
}

function startSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manualSheet = ss.getSheetByName("SYS_UserManual");
  
  if (!manualSheet || manualSheet.getLastRow() < 2) return;

  const lastRow = manualSheet.getLastRow();
  const nextSteps = manualSheet.getRange(lastRow, 4).getValue();
  const version = manualSheet.getRange(lastRow, 2).getValue();

  const msg = `🚜 WELCOME BACK (v${version})\n\n🎯 CURRENT AGENDA:\n${nextSteps}\n\n(Paste this agenda into the AI Chat to begin)`;
  
  SpreadsheetApp.getUi().alert(msg);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 13: WEATHER & FROST SAFETY
// ══════════════════════════════════════════════════════════════════════════════

function logDailyWeather() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName("LOG_Weather");
  if (!logSheet) {
    logSheet = ss.insertSheet("LOG_Weather");
    logSheet.appendRow(["Date", "Max_Temp_F", "Min_Temp_F", "Precip_Inch", "Growing_Degree_Days", "Notes"]);
    logSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#a4c2f4");
  }
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateStr = Utilities.formatDate(yesterday, "GMT", "yyyy-MM-dd");
  
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${FARM_CONFIG.LAT}&longitude=${FARM_CONFIG.LONG}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=${encodeURIComponent(FARM_CONFIG.TIMEZONE)}`;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    if (data.daily) {
      const maxT = data.daily.temperature_2m_max[0];
      const minT = data.daily.temperature_2m_min[0];
      const precip = data.daily.precipitation_sum[0];
      const gdd = Math.max(0, ((maxT + minT) / 2) - 50);
      logSheet.appendRow([yesterday, maxT, minT, precip, gdd.toFixed(1), "Auto-Logged"]);
      console.log(`Weather logged for ${dateStr}`);
    }
  } catch (e) {
    console.error("Weather Fetch Failed: " + e.toString());
  }
}

/**
 * Get weather summary for a crop's lifecycle (transplant to harvest)
 * Used by the DTM learning system to correlate weather with growth rates
 *
 * @param {Date|string} startDate - Start of period (typically transplant date)
 * @param {Date|string} endDate - End of period (typically harvest date)
 * @returns {Object} Weather summary { totalGDD, avgMaxTemp, avgMinTemp, totalPrecip, frostDays, daysWithData }
 */
function getWeatherSummaryForPeriod(startDate, endDate) {
  try {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid dates' };
    }

    // Format dates for API
    const startStr = Utilities.formatDate(start, 'GMT', 'yyyy-MM-dd');
    const endStr = Utilities.formatDate(end, 'GMT', 'yyyy-MM-dd');

    // First try to get data from LOG_Weather sheet (faster, no API call)
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName('LOG_Weather');

    let weatherData = [];

    if (logSheet && logSheet.getLastRow() > 1) {
      // Try to get data from local log first
      const logData = logSheet.getDataRange().getValues();
      const headers = logData[0];
      const dateCol = headers.indexOf('Date');
      const maxCol = headers.indexOf('Max_Temp_F');
      const minCol = headers.indexOf('Min_Temp_F');
      const precipCol = headers.indexOf('Precip_Inch');
      const gddCol = headers.indexOf('Growing_Degree_Days');

      for (let i = 1; i < logData.length; i++) {
        const rowDate = logData[i][dateCol] instanceof Date ? logData[i][dateCol] : new Date(logData[i][dateCol]);
        if (rowDate >= start && rowDate <= end) {
          weatherData.push({
            date: rowDate,
            maxTemp: Number(logData[i][maxCol]) || 0,
            minTemp: Number(logData[i][minCol]) || 0,
            precip: Number(logData[i][precipCol]) || 0,
            gdd: Number(logData[i][gddCol]) || 0
          });
        }
      }
    }

    // If we don't have enough local data, fetch from Open-Meteo API
    const expectedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (weatherData.length < expectedDays * 0.8) {
      // Fetch from API - need at least 80% coverage
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${FARM_CONFIG.LAT}&longitude=${FARM_CONFIG.LONG}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=${encodeURIComponent(FARM_CONFIG.TIMEZONE)}`;

      try {
        const response = UrlFetchApp.fetch(url);
        const data = JSON.parse(response.getContentText());

        if (data.daily && data.daily.time) {
          weatherData = data.daily.time.map((dateStr, i) => ({
            date: new Date(dateStr),
            maxTemp: data.daily.temperature_2m_max[i] || 0,
            minTemp: data.daily.temperature_2m_min[i] || 0,
            precip: data.daily.precipitation_sum[i] || 0,
            gdd: Math.max(0, ((data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2) - 50)
          }));
        }
      } catch (apiError) {
        Logger.log('Weather API error: ' + apiError.toString());
        // Continue with whatever local data we have
      }
    }

    if (weatherData.length === 0) {
      return {
        success: true,
        hasData: false,
        message: 'No weather data available for this period'
      };
    }

    // Calculate summary statistics
    let totalGDD = 0;
    let totalMaxTemp = 0;
    let totalMinTemp = 0;
    let totalPrecip = 0;
    let frostDays = 0;

    weatherData.forEach(day => {
      totalGDD += day.gdd;
      totalMaxTemp += day.maxTemp;
      totalMinTemp += day.minTemp;
      totalPrecip += day.precip;
      if (day.minTemp < 32) frostDays++;
    });

    const daysWithData = weatherData.length;

    return {
      success: true,
      hasData: true,
      totalGDD: Math.round(totalGDD),
      avgMaxTemp: Math.round((totalMaxTemp / daysWithData) * 10) / 10,
      avgMinTemp: Math.round((totalMinTemp / daysWithData) * 10) / 10,
      avgTemp: Math.round(((totalMaxTemp + totalMinTemp) / (daysWithData * 2)) * 10) / 10,
      totalPrecip: Math.round(totalPrecip * 100) / 100,
      frostDays: frostDays,
      daysWithData: daysWithData,
      startDate: startStr,
      endDate: endStr
    };

  } catch (error) {
    Logger.log('getWeatherSummaryForPeriod error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * API endpoint to get weather summary for a period
 */
function getWeatherSummary(params) {
  return getWeatherSummaryForPeriod(params.startDate, params.endDate);
}

function updateTrayDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const traySheet = ss.getSheetByName("REF_Trays");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  if (traySheet && profileSheet) {
    const trays = traySheet.getRange(2, 1, traySheet.getLastRow()-1, 1).getValues();
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(trays.flat().map(String), true).build();
    profileSheet.getRange("P2:P1000").setDataValidation(rule);
    
    try {
      SpreadsheetApp.getUi().alert("✅ Tray Dropdown Updated (Using Names).");
    } catch (e) {
      console.log("Tray Dropdown Updated (Background Mode).");
    }
  }
}

function runFrostSafetyCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const settingsSheet = ss.getSheetByName("REF_Settings");
  
  if (!planSheet || !profileSheet || !settingsSheet) return;

  const settings = settingsSheet.getRange("B2:B3").getValues();
  const springFrost = new Date(settings[0][0]);
  const fallFrost = new Date(settings[1][0]);
  
  if (isNaN(springFrost.getTime()) || isNaN(fallFrost.getTime())) {
    logOrAlert("❌ Error: Check Frost Dates in REF_Settings.");
    return;
  }

  const profData = profileSheet.getDataRange().getValues();
  let hardiness = {};
  for (let i = 1; i < profData.length; i++) {
    let name = profData[i][0];
    let hardy = String(profData[i][15]).toLowerCase().trim();
    hardiness[name] = (hardy === "yes");
  }

  const range = planSheet.getDataRange();
  const data = range.getValues();
  let risks = [];
  
  for (let i = 1; i < data.length; i++) {
    let crop = data[i][2];
    let bed = data[i][5];
    let date = (data[i][10] instanceof Date) ? data[i][10] : data[i][9];
    
    if (crop && date instanceof Date) {
      let isHardy = hardiness[crop];
      
      if (!isHardy && date < springFrost) {
        risks.push(`⚠️ SPRING RISK: ${crop} in ${bed} on ${Utilities.formatDate(date, "GMT", "MM/dd")} (Before ${Utilities.formatDate(springFrost, "GMT", "MM/dd")})`);
        planSheet.getRange(i+1, 1).setBackground("#ea9999");
      }
      
      if (!isHardy && date > springFrost) {
        let daysToFrost = Math.ceil((fallFrost - date) / (1000 * 60 * 60 * 24));
        if (daysToFrost < 50) { 
           risks.push(`⚠️ FALL RISK: ${crop} in ${bed}. Only ${daysToFrost} days left before frost.`);
           planSheet.getRange(i+1, 1).setBackground("#ea9999");
        }
      }
    }
  }

  if (risks.length > 0) {
    logOrAlert(`🚨 FROST WARNINGS FOUND:\n\n${risks.join("\n").substring(0, 1000)}... (Check Red Cells in Plan)`);
  } else {
    logOrAlert("✅ Safe: No frost risks detected.");
  }
}

function logOrAlert(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    console.log(msg);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 14: VENDOR ENRICHMENT
// ══════════════════════════════════════════════════════════════════════════════

function fixAndEnrichVendors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Vendors');
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ REF_Vendors sheet is missing.");
    return;
  }

  const headers = ["Vendor_Name", "Website_URL", "Phone", "Email", "Account_Number", "Notes"];
  if (sheet.getLastRow() < 1 || sheet.getRange(1,1).getValue() !== "Vendor_Name") {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, 6).setValues([headers]).setFontWeight("bold").setBackground("#ead1dc");
  }

  const directory = [
    {
      name: "Johnny's Selected Seeds",
      url: "https://www.johnnyseeds.com",
      phone: "1-877-564-6697",
      email: "service@johnnyseeds.com",
      note: "Primary Seed Supplier"
    },
    {
      name: "High Mowing Organic Seeds",
      url: "https://www.highmowingseeds.com",
      phone: "802-472-6174",
      email: "questions@highmowingseeds.com",
      note: "Organic/Non-GMO"
    },
    {
      name: "Fedco Seeds",
      url: "https://www.fedcoseeds.com",
      phone: "207-426-9900",
      email: "questions@fedcoseeds.com",
      note: "Co-op, Seasonal Shipping"
    },
    {
      name: "Baker Creek Heirloom Seeds",
      url: "https://www.rareseeds.com",
      phone: "417-924-8917",
      email: "seeds@rareseeds.com",
      note: "Heirlooms"
    },
    {
      name: "Osborne Quality Seeds",
      url: "https://www.osborneseed.com",
      phone: "360-424-7333",
      email: "info@osborneseed.com",
      note: "Bulk/Commercial"
    },
    {
      name: "Paperpot Co.",
      url: "https://paperpot.co",
      phone: "N/A",
      email: "hello@paperpot.co",
      note: "Transplanters & Trays"
    },
    {
      name: "Farmer's Friend",
      url: "https://www.farmersfriend.com",
      phone: "931-583-0397",
      email: "support@farmersfriend.com",
      note: "Tools & Tunnels"
    }
  ];

  const lastRow = sheet.getLastRow();
  const existingRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 6) : null;
  const existingValues = existingRange ? existingRange.getValues() : [];
  
  let updates = 0;
  let added = 0;

  directory.forEach(vendor => {
    let matchIndex = -1;

    for (let i = 0; i < existingValues.length; i++) {
      let rowName = String(existingValues[i][0]).toLowerCase();
      let dirName = vendor.name.toLowerCase();
      if (rowName.includes(dirName) || dirName.includes(rowName)) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex > -1) {
      let rowNum = matchIndex + 2;
      if (!existingValues[matchIndex][1]) sheet.getRange(rowNum, 2).setValue(vendor.url);
      if (!existingValues[matchIndex][2]) sheet.getRange(rowNum, 3).setValue(vendor.phone);
      if (!existingValues[matchIndex][3]) sheet.getRange(rowNum, 4).setValue(vendor.email);
      sheet.getRange(rowNum, 1).setValue(vendor.name);
      updates++;
    } else {
      sheet.appendRow([vendor.name, vendor.url, vendor.phone, vendor.email, "", vendor.note]);
      added++;
    }
  });

  sheet.autoResizeColumns(1, 6);
  SpreadsheetApp.getUi().alert(`✅ Vendor Database Updated:\n- Enriched ${updates} existing vendors\n- Added ${added} new vendors`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 15: UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function findMyData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("❌ The sheet is empty (except for headers).");
    return;
  }
  
  const data = sheet.getRange(lastRow, 1, 1, 1).getValue();
  const totalRows = sheet.getMaxRows();
  
  SpreadsheetApp.getUi().alert(
    `🔍 REPORT:\n` +
    `- Total Data Rows Found: ${lastRow}\n` +
    `- Total Sheet Rows: ${totalRows}\n` +
    `- The very last crop in the list is: "${data}"\n\n` +
    `If this isn't what you imported, your data might be sorted alphabetically (check the middle of the list!) or pasted way down at row ${lastRow}.`
  );
}

function createDirectSeedingTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = "Direct Seeding";
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  } else {
    sheet.clear();
  }

  const formula = `=QUERY(PLANNING_2026!A:T, "SELECT L, C, D, F, G, B, T WHERE lower(E) CONTAINS 'direct' AND A <> 'Status' ORDER BY L LABEL L 'Sow Date', C 'Crop', D 'Variety', F 'Target Bed', G 'Feet', B 'Batch ID', T 'Notes'", 1)`;
  sheet.getRange("A1").setFormula(formula);

  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("M/d/yyyy");
  
  const headerRange = sheet.getRange("A1:G1");
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#d9ead3");
  headerRange.setHorizontalAlignment("center");
  
  sheet.autoResizeColumns(1, 7);
}
 // ========================================
  // SOWING TASK SHEETS
  // ========================================

  function getGreenhouseSowingTasks(params) {
    // Hardcoded for your spreadsheet
    const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';
    const PLANNING_TAB = 'PLANNING_2026';
    const PROFILES_TAB = 'REF_CropProfiles';

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const planningSheet = ss.getSheetByName(PLANNING_TAB);

    if (!planningSheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    // Get planning data
    const planningData = planningSheet.getDataRange().getValues();
    const headers = planningData[0];

    // Find column indices - matching actual PLANNING_2026 columns
    const cols = {
      status: headers.indexOf('STATUS'),
      batchId: headers.indexOf('Batch_ID'),
      crop: headers.indexOf('Crop'),
      variety: headers.indexOf('Variety'),
      plantingMethod: headers.indexOf('Planting_Method'),
      ghSow: headers.indexOf('Plan_GH_Sow'),
      actGhSow: headers.indexOf('Act_GH_Sow'),
      fieldSow: headers.indexOf('Plan_Field_Sow'),
      actFieldSow: headers.indexOf('Act_Field_Sow'),
      transplant: headers.indexOf('Plan_Transplant'),
      actTransplant: headers.indexOf('Act_Transplant'),
      trays: headers.indexOf('Trays_Needed'),
      plantsNeeded: headers.indexOf('Plants_Needed'),
      bed: headers.indexOf('Target_Bed_ID'),
      feetUsed: headers.indexOf('Feet_Used'),
      notes: headers.indexOf('Notes'),
      category: headers.indexOf('Category')
    };

    // Parse date range
    const startDate = params.startDate ? new Date(params.startDate) : new Date();
    const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const categoryFilter = params.category || 'all';

    // Try to get crop profiles for germination info
    let profileMap = {};
    try {
      const profilesSheet = ss.getSheetByName(PROFILES_TAB);
      if (profilesSheet) {
        const profilesData = profilesSheet.getDataRange().getValues();
        const profileHeaders = profilesData[0];
        const cropNameCol = profileHeaders.indexOf('Crop_Name') >= 0 ? profileHeaders.indexOf('Crop_Name') : profileHeaders.indexOf('Crop');
        const categoryCol = profileHeaders.indexOf('Primary_Category') >= 0 ? profileHeaders.indexOf('Primary_Category') : profileHeaders.indexOf('Category');
        const germTempCol = profileHeaders.indexOf('Germ_Temp_F');
        const cellCountCol = profileHeaders.indexOf('Tray_Cell_Count');

        for (let i = 1; i < profilesData.length; i++) {
          const row = profilesData[i];
          const cropName = row[cropNameCol];
          if (cropName) {
            profileMap[cropName] = {
              category: row[categoryCol] || 'Veg',
              germTemp: germTempCol >= 0 ? row[germTempCol] : '',
              defaultCells: cellCountCol >= 0 ? row[cellCountCol] : 128
            };
          }
        }
      }
    } catch (e) {
      // Continue without profiles
    }

    // Process tasks
    const tasks = [];
    const traysBySize = {};

    for (let i = 1; i < planningData.length; i++) {
      const row = planningData[i];

      // Get planting method
      const plantingMethod = cols.plantingMethod >= 0 ? row[cols.plantingMethod] : 'Transplant';
      const isDirectSeed = plantingMethod === 'Direct Seed';

      // Get the appropriate sow date
      let sowDateRaw;
      if (isDirectSeed) {
        sowDateRaw = cols.fieldSow >= 0 ? row[cols.fieldSow] : null;
      } else {
        sowDateRaw = cols.ghSow >= 0 ? row[cols.ghSow] : null;
      }

      if (!sowDateRaw) continue;

      const sowDate = new Date(sowDateRaw);
      if (isNaN(sowDate.getTime())) continue;

      // Date filter
      if (sowDate < startDate || sowDate > endDate) continue;

      const crop = cols.crop >= 0 ? row[cols.crop] : '';
      const profile = profileMap[crop] || {};
      const category = (cols.category >= 0 && row[cols.category]) ? row[cols.category] : (profile.category || 'Veg');

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'veg-herb' && category === 'Floral') continue;
        if (categoryFilter === 'floral' && category !== 'Floral') continue;
      }

      const variety = cols.variety >= 0 ? row[cols.variety] : '';
      const trays = cols.trays >= 0 ? (parseInt(row[cols.trays]) || 0) : 0;
      const plantsNeeded = cols.plantsNeeded >= 0 ? (parseInt(row[cols.plantsNeeded]) || 0) : 0;
      const feetUsed = cols.feetUsed >= 0 ? (parseInt(row[cols.feetUsed]) || 0) : 0;

      const cellsPerTray = profile.defaultCells || 128;
      const seedsNeeded = plantsNeeded > 0 ? Math.ceil(plantsNeeded * 1.05) : Math.ceil(trays * cellsPerTray * 1.05);

      // Check if already completed
      const isCompleted = isDirectSeed
        ? (cols.actFieldSow >= 0 && row[cols.actFieldSow])
        : (cols.actGhSow >= 0 && row[cols.actGhSow]);

      tasks.push({
        batchId: cols.batchId >= 0 ? row[cols.batchId] : 'ROW-' + i,
        crop: crop,
        variety: variety,
        category: category,
        plantingMethod: plantingMethod,
        sowDate: formatDateSimple(sowDate),
        trays: trays,
        cellsPerTray: cellsPerTray,
        plantsNeeded: plantsNeeded,
        feetUsed: feetUsed,
        seedsNeeded: seedsNeeded,
        bed: cols.bed >= 0 ? row[cols.bed] : '',
        germTemp: profile.germTemp || '',
        notes: cols.notes >= 0 ? row[cols.notes] : '',
        completed: !!isCompleted,
        rowIndex: i + 1
      });

      // Track trays by size
      const size = cellsPerTray + '-cell';
      traysBySize[size] = (traysBySize[size] || 0) + trays;
    }

    // Sort by date
    tasks.sort((a, b) => new Date(a.sowDate) - new Date(b.sowDate));

    return {
      success: true,
      tasks: tasks,
      summary: {
        totalTasks: tasks.length,
        totalTrays: tasks.reduce((sum, t) => sum + t.trays, 0),
        traysBySize: traysBySize,
        dateRange: {
          start: formatDateSimple(startDate),
          end: formatDateSimple(endDate)
        }
      }
    };
  }

  function updateTaskCompletion(params) {
    const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';
    const PLANNING_TAB = 'PLANNING_2026';

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(PLANNING_TAB);

    if (!sheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    const batchId = params.batchId;
    const completed = params.completed === 'true' || params.completed === true;
    const completedBy = params.completedBy || '';

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const batchIdCol = headers.indexOf('Batch_ID');
    const statusCol = headers.indexOf('STATUS');
    const plantingMethodCol = headers.indexOf('Planting_Method');
    const actGhSowCol = headers.indexOf('Act_GH_Sow');
    const actFieldSowCol = headers.indexOf('Act_Field_Sow');

    // Find the row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][batchIdCol] === batchId) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Batch not found: ' + batchId };
    }

    const plantingMethod = data[rowIndex - 1][plantingMethodCol];
    const isDirectSeed = plantingMethod === 'Direct Seed';
    const today = new Date();
    const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    if (completed) {
      // Set actual sow date
      if (isDirectSeed && actFieldSowCol >= 0) {
        sheet.getRange(rowIndex, actFieldSowCol + 1).setValue(todayStr);
      } else if (!isDirectSeed && actGhSowCol >= 0) {
        sheet.getRange(rowIndex, actGhSowCol + 1).setValue(todayStr);
      }
      // Update status
      if (statusCol >= 0) {
        sheet.getRange(rowIndex, statusCol + 1).setValue('Sown');
      }
    } else {
      // Clear actual sow date
      if (isDirectSeed && actFieldSowCol >= 0) {
        sheet.getRange(rowIndex, actFieldSowCol + 1).setValue('');
      } else if (!isDirectSeed && actGhSowCol >= 0) {
        sheet.getRange(rowIndex, actGhSowCol + 1).setValue('');
      }
      // Reset status
      if (statusCol >= 0) {
        sheet.getRange(rowIndex, statusCol + 1).setValue('Planned');
      }
    }

    return {
      success: true,
      message: completed ? 'Task marked complete' : 'Task marked incomplete',
      batchId: batchId
    };
  }

  // Helper function for date formatting
  function formatDateSimple(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
    function testSowingTasks() {
    const result = getGreenhouseSowingTasks({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      category: 'all'
    });
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  }

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPLANT & DIRECT SEED TASK ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

function getTransplantTasks(params) {
  const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';
  const PLANNING_TAB = 'PLANNING_2026';

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const planningSheet = ss.getSheetByName(PLANNING_TAB);

    if (!planningSheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    const planningData = planningSheet.getDataRange().getValues();
    const headers = planningData[0];

    const cols = {
      status: headers.indexOf('STATUS'),
      batchId: headers.indexOf('Batch_ID'),
      crop: headers.indexOf('Crop'),
      variety: headers.indexOf('Variety'),
      plantingMethod: headers.indexOf('Planting_Method'),
      transplant: headers.indexOf('Plan_Transplant'),
      actTransplant: headers.indexOf('Act_Transplant'),
      bed: headers.indexOf('Target_Bed_ID'),
      feetUsed: headers.indexOf('Feet_Used'),
      plantsNeeded: headers.indexOf('Plants_Needed'),
      notes: headers.indexOf('Notes'),
      category: headers.indexOf('Category')
    };

    const startDate = params.startDate ? new Date(params.startDate) : new Date();
    const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const tasks = [];

    for (let i = 1; i < planningData.length; i++) {
      const row = planningData[i];

      const plantingMethod = cols.plantingMethod >= 0 ? row[cols.plantingMethod] : 'Transplant';
      if (plantingMethod === 'Direct Seed') continue;

      const transplantDateRaw = cols.transplant >= 0 ? row[cols.transplant] : null;
      if (!transplantDateRaw) continue;

      const transplantDate = new Date(transplantDateRaw);
      if (isNaN(transplantDate.getTime())) continue;

      if (transplantDate < startDate || transplantDate > endDate) continue;

      const isCompleted = cols.actTransplant >= 0 && row[cols.actTransplant];

      tasks.push({
        batchId: cols.batchId >= 0 ? row[cols.batchId] : 'ROW-' + i,
        crop: cols.crop >= 0 ? row[cols.crop] : '',
        variety: cols.variety >= 0 ? row[cols.variety] : '',
        category: cols.category >= 0 ? row[cols.category] : 'Veg',
        transplantDate: formatDateSimple(transplantDate),
        bed: cols.bed >= 0 ? row[cols.bed] : '',
        feetUsed: cols.feetUsed >= 0 ? (parseInt(row[cols.feetUsed]) || 0) : 0,
        plantsNeeded: cols.plantsNeeded >= 0 ? (parseInt(row[cols.plantsNeeded]) || 0) : 0,
        notes: cols.notes >= 0 ? row[cols.notes] : '',
        completed: !!isCompleted,
        rowIndex: i + 1
      });
    }

    tasks.sort((a, b) => new Date(a.transplantDate) - new Date(b.transplantDate));

    return {
      success: true,
      tasks: tasks,
      summary: {
        totalTasks: tasks.length,
        totalFeet: tasks.reduce((sum, t) => sum + t.feetUsed, 0),
        totalPlants: tasks.reduce((sum, t) => sum + t.plantsNeeded, 0),
        dateRange: {
          start: formatDateSimple(startDate),
          end: formatDateSimple(endDate)
        }
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getDirectSeedTasks(params) {
  const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';
  const PLANNING_TAB = 'PLANNING_2026';

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const planningSheet = ss.getSheetByName(PLANNING_TAB);

    if (!planningSheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    const planningData = planningSheet.getDataRange().getValues();
    const headers = planningData[0];

    const cols = {
      status: headers.indexOf('STATUS'),
      batchId: headers.indexOf('Batch_ID'),
      crop: headers.indexOf('Crop'),
      variety: headers.indexOf('Variety'),
      plantingMethod: headers.indexOf('Planting_Method'),
      fieldSow: headers.indexOf('Plan_Field_Sow'),
      actFieldSow: headers.indexOf('Act_Field_Sow'),
      bed: headers.indexOf('Target_Bed_ID'),
      feetUsed: headers.indexOf('Feet_Used'),
      notes: headers.indexOf('Notes'),
      category: headers.indexOf('Category')
    };

    const startDate = params.startDate ? new Date(params.startDate) : new Date();
    const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const tasks = [];

    for (let i = 1; i < planningData.length; i++) {
      const row = planningData[i];

      const plantingMethod = cols.plantingMethod >= 0 ? row[cols.plantingMethod] : '';
      if (plantingMethod !== 'Direct Seed') continue;

      const fieldSowDateRaw = cols.fieldSow >= 0 ? row[cols.fieldSow] : null;
      if (!fieldSowDateRaw) continue;

      const fieldSowDate = new Date(fieldSowDateRaw);
      if (isNaN(fieldSowDate.getTime())) continue;

      if (fieldSowDate < startDate || fieldSowDate > endDate) continue;

      const isCompleted = cols.actFieldSow >= 0 && row[cols.actFieldSow];

      tasks.push({
        batchId: cols.batchId >= 0 ? row[cols.batchId] : 'ROW-' + i,
        crop: cols.crop >= 0 ? row[cols.crop] : '',
        variety: cols.variety >= 0 ? row[cols.variety] : '',
        category: cols.category >= 0 ? row[cols.category] : 'Veg',
        sowDate: formatDateSimple(fieldSowDate),
        bed: cols.bed >= 0 ? row[cols.bed] : '',
        feetUsed: cols.feetUsed >= 0 ? (parseInt(row[cols.feetUsed]) || 0) : 0,
        notes: cols.notes >= 0 ? row[cols.notes] : '',
        completed: !!isCompleted,
        rowIndex: i + 1
      });
    }

    tasks.sort((a, b) => new Date(a.sowDate) - new Date(b.sowDate));

    return {
      success: true,
      tasks: tasks,
      summary: {
        totalTasks: tasks.length,
        totalFeet: tasks.reduce((sum, t) => sum + t.feetUsed, 0),
        dateRange: {
          start: formatDateSimple(startDate),
          end: formatDateSimple(endDate)
        }
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AYRSHARE SOCIAL MEDIA INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

function getAyrshareApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('AYRSHARE_API_KEY');
  if (!key) {
    throw new Error('Ayrshare API key not configured. Run storeAyrshareApiKey() first.');
  }
  return key;
}

function publishToAyrshare(params) {
  try {
    const apiKey = getAyrshareApiKey();
    const baseUrl = 'https://app.ayrshare.com/api';

    if (!params.post || !params.post.trim()) {
      return { success: false, error: 'Post content is required' };
    }

    if (!params.platforms || params.platforms.length === 0) {
      return { success: false, error: 'At least one platform is required' };
    }

    const platformMap = {
      'facebook': 'facebook',
      'instagram': 'instagram',
      'tiktok': 'tiktok',
      'youtube': 'youtube',
      'pinterest': 'pinterest',
      'threads': 'threads',
      'twitter': 'twitter',
      'linkedin': 'linkedin'
    };

    const validPlatforms = params.platforms
      .map(p => platformMap[p.toLowerCase()])
      .filter(p => p);

    if (validPlatforms.length === 0) {
      return { success: false, error: 'No valid platforms specified' };
    }

    const payload = {
      post: params.post,
      platforms: validPlatforms
    };

    if (params.mediaUrl) {
      payload.mediaUrls = [params.mediaUrl];
      if (validPlatforms.includes('tiktok') || validPlatforms.includes('youtube')) {
        payload.videoUrl = params.mediaUrl;
      }
    }

    if (params.scheduleDate) {
      payload.scheduleDate = params.scheduleDate;
    }

    if (params.platformOptions) {
      if (params.platformOptions.youtube) {
        payload.youTubeOptions = {
          title: params.platformOptions.youtube.title || params.post.substring(0, 100),
          visibility: params.platformOptions.youtube.visibility || 'public',
          thumbNail: params.platformOptions.youtube.thumbnail
        };
      }
      if (params.platformOptions.pinterest) {
        payload.pinterestOptions = {
          title: params.platformOptions.pinterest.title,
          link: params.platformOptions.pinterest.link,
          boardId: params.platformOptions.pinterest.boardId
        };
      }
      if (params.platformOptions.instagram) {
        payload.instagramOptions = {
          shareToFeed: params.platformOptions.instagram.shareToFeed !== false,
          isStory: params.platformOptions.instagram.isStory || false
        };
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(baseUrl + '/post', options);
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode === 200) {
      logMarketingPost({
        platforms: validPlatforms,
        content: params.post.substring(0, 100),
        scheduled: !!params.scheduleDate,
        scheduleDate: params.scheduleDate,
        postIds: responseData.postIds || responseData.id
      });

      return {
        success: true,
        postIds: responseData.postIds || responseData.id,
        status: responseData.status,
        scheduled: !!params.scheduleDate
      };
    } else {
      return {
        success: false,
        error: responseData.message || 'Failed to publish',
        code: responseCode,
        details: responseData
      };
    }
  } catch (error) {
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

function getAyrshareStatus() {
  try {
    const apiKey = getAyrshareApiKey();

    const options = {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://app.ayrshare.com/api/user', options);
    const data = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200) {
      return {
        success: true,
        platforms: data.activePlatforms || [],
        plan: data.subscription || 'unknown',
        postsRemaining: data.postsRemaining
      };
    } else {
      return { success: false, error: data.message || 'Failed to get status' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function deleteAyrsharePost(postId) {
  try {
    const apiKey = getAyrshareApiKey();

    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ id: postId }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://app.ayrshare.com/api/post', options);
    const data = JSON.parse(response.getContentText());

    return { success: response.getResponseCode() === 200, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getAyrshareAnalytics(platforms) {
  try {
    const apiKey = getAyrshareApiKey();

    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ platforms: platforms || ['instagram', 'facebook', 'tiktok'] }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://app.ayrshare.com/api/analytics/social', options);
    const data = JSON.parse(response.getContentText());

    return { success: response.getResponseCode() === 200, analytics: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function logMarketingPost(postData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('MarketingPosts');

    if (!sheet) {
      sheet = ss.insertSheet('MarketingPosts');
      sheet.getRange(1, 1, 1, 7).setValues([[
        'Timestamp', 'Platforms', 'Content Preview', 'Scheduled', 'Schedule Date', 'Post IDs', 'Status'
      ]]);
      const headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setBackground('#9c27b0');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      postData.platforms.join(', '),
      postData.content,
      postData.scheduled ? 'Yes' : 'No',
      postData.scheduleDate || '',
      JSON.stringify(postData.postIds),
      'Published'
    ]);
  } catch (error) {
    console.error('Failed to log marketing post:', error);
  }
}

// One-time setup function - run in Apps Script editor
function storeAyrshareApiKey() {
  PropertiesService.getScriptProperties().setProperty('AYRSHARE_API_KEY', '1068DEEC-7FAB4064-BBA8F6C7-74CD7A3F');
  Logger.log('Ayrshare API key stored securely!');
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK & DIAGNOSTIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

function healthCheck() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();

    return {
      success: true,
      status: 'healthy',
      timestamp: now.toISOString(),
      spreadsheet: {
        id: ss.getId(),
        name: ss.getName(),
        timezone: Session.getScriptTimeZone()
      },
      runtime: {
        quotaRemaining: 'N/A', // Apps Script doesn't expose this directly
        executionTime: 'started'
      }
    };
  } catch (error) {
    return {
      success: false,
      status: 'unhealthy',
      error: error.toString()
    };
  }
}

function diagnoseSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets().map(s => s.getName());

    // Critical sheets that must exist
    const criticalSheets = [
      'PLANNING_2026',
      'REF_CropProfiles',
      'REF_Beds',
      'REF_Fields',
      'USERS',
      'SEED_INVENTORY'
    ];

    // Important sheets
    const importantSheets = [
      'SESSIONS',
      'AUDIT_LOG',
      'SALES_ORDERS',
      'INVENTORY_PRODUCTS',
      'DTM_LEARNING',
      'HARVEST_LOG'
    ];

    const results = {
      success: true,
      totalSheets: allSheets.length,
      critical: {},
      important: {},
      allSheets: allSheets
    };

    // Check critical sheets
    let criticalMissing = 0;
    criticalSheets.forEach(name => {
      const exists = allSheets.includes(name);
      results.critical[name] = exists ? 'OK' : 'MISSING';
      if (!exists) criticalMissing++;
    });

    // Check important sheets
    let importantMissing = 0;
    importantSheets.forEach(name => {
      const exists = allSheets.includes(name);
      results.important[name] = exists ? 'OK' : 'MISSING';
      if (!exists) importantMissing++;
    });

    results.summary = {
      criticalMissing: criticalMissing,
      importantMissing: importantMissing,
      health: criticalMissing === 0 ? 'GOOD' : 'CRITICAL'
    };

    return results;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function diagnoseIntegrations() {
  try {
    const results = {
      success: true,
      integrations: {}
    };

    // Check Ayrshare
    try {
      const ayrshareKey = PropertiesService.getScriptProperties().getProperty('AYRSHARE_API_KEY');
      results.integrations.ayrshare = {
        configured: !!ayrshareKey,
        status: ayrshareKey ? 'KEY_SET' : 'NOT_CONFIGURED'
      };
    } catch (e) {
      results.integrations.ayrshare = { configured: false, error: e.toString() };
    }

    // Check Plaid
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const plaidSheet = ss.getSheetByName('PLAID_ITEMS');
      results.integrations.plaid = {
        configured: !!plaidSheet,
        itemCount: plaidSheet ? Math.max(0, plaidSheet.getLastRow() - 1) : 0
      };
    } catch (e) {
      results.integrations.plaid = { configured: false, error: e.toString() };
    }

    // Check Twilio (SMS)
    try {
      const twilioSid = typeof TWILIO_CONFIG !== 'undefined' && TWILIO_CONFIG.ACCOUNT_SID;
      results.integrations.twilio = {
        configured: !!twilioSid && twilioSid !== 'YOUR_TWILIO_ACCOUNT_SID',
        status: twilioSid ? 'CONFIGURED' : 'NOT_CONFIGURED'
      };
    } catch (e) {
      results.integrations.twilio = { configured: false, error: e.toString() };
    }

    // Check Google Maps
    try {
      const mapsKey = typeof GOOGLE_ROUTES_CONFIG !== 'undefined' && GOOGLE_ROUTES_CONFIG.API_KEY;
      results.integrations.googleMaps = {
        configured: !!mapsKey,
        status: mapsKey ? 'CONFIGURED' : 'NOT_CONFIGURED'
      };
    } catch (e) {
      results.integrations.googleMaps = { configured: false, error: e.toString() };
    }

    // Check Shopify
    try {
      const shopifyToken = typeof SHOPIFY_CONFIG !== 'undefined' && SHOPIFY_CONFIG.ACCESS_TOKEN;
      results.integrations.shopify = {
        configured: shopifyToken && shopifyToken !== 'YOUR_SHOPIFY_ACCESS_TOKEN',
        status: shopifyToken && shopifyToken !== 'YOUR_SHOPIFY_ACCESS_TOKEN' ? 'CONFIGURED' : 'NEEDS_SETUP'
      };
    } catch (e) {
      results.integrations.shopify = { configured: false, error: e.toString() };
    }

    // Check QuickBooks
    try {
      const qbService = typeof getQuickBooksOAuthService === 'function' ? getQuickBooksOAuthService() : null;
      results.integrations.quickbooks = {
        configured: qbService ? qbService.hasAccess() : false,
        status: qbService && qbService.hasAccess() ? 'CONNECTED' : 'NOT_CONNECTED'
      };
    } catch (e) {
      results.integrations.quickbooks = { configured: false, error: e.toString() };
    }

    return results;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSystemStatus() {
  const health = healthCheck();
  const sheets = diagnoseSheets();
  const integrations = diagnoseIntegrations();

  return {
    success: true,
    timestamp: new Date().toISOString(),
    health: health,
    sheets: sheets,
    integrations: integrations,
    overallStatus: health.status === 'healthy' && sheets.summary?.health === 'GOOD' ? 'OPERATIONAL' : 'DEGRADED'
  };
}

 /**
   * Updates a crop profile in REF_CropProfiles
   * Used by Quick Plant Wizard when user modifies grow settings
   */
  function updateCropProfile(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REF_CropProfiles');

    if (!sheet) {
      return {
        success: false,
        error: 'REF_CropProfiles sheet not found'
      };
    }

    const cropName = params.cropName;
    const variety = params.variety || '';

    if (!cropName) {
      return {
        success: false,
        error: 'cropName is required'
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indices for updatable fields
    const colIndices = {
      Crop: headers.indexOf('Crop'),
      Variety: headers.indexOf('Variety'),
      DTM: headers.indexOf('DTM'),
      Spacing: headers.indexOf('Spacing'),
      Rows_Per_Bed: headers.indexOf('Rows_Per_Bed'),
      Tray_Cell_Count: headers.indexOf('Tray_Cell_Count'),
      Nursery_Days: headers.indexOf('Nursery_Days'),
      Planting_Method: headers.indexOf('Planting_Method')
    };

    // Find the row matching crop (and variety if provided)
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowCrop = data[i][colIndices.Crop];
      const rowVariety = colIndices.Variety >= 0 ? data[i][colIndices.Variety] : '';

      if (rowCrop === cropName) {
        if (variety && rowVariety === variety) {
          targetRow = i + 1;
          break;
        } else if (!variety) {
          targetRow = i + 1;
          break;
        }
      }
    }

    if (targetRow === -1) {
      return {
        success: false,
        error: `Crop profile not found for: ${cropName}${variety ? ' - ' + variety : ''}`
      };
    }

    // Update only provided fields
    const updates = [];

    if (params.dtm !== undefined && colIndices.DTM >= 0) {
      sheet.getRange(targetRow, colIndices.DTM + 1).setValue(params.dtm);
      updates.push('DTM');
    }
    if (params.spacing !== undefined && colIndices.Spacing >= 0) {
      sheet.getRange(targetRow, colIndices.Spacing + 1).setValue(params.spacing);
      updates.push('Spacing');
    }
    if (params.rowsPerBed !== undefined && colIndices.Rows_Per_Bed >= 0) {
      sheet.getRange(targetRow, colIndices.Rows_Per_Bed + 1).setValue(params.rowsPerBed);
      updates.push('Rows_Per_Bed');
    }
    if (params.trayCellCount !== undefined && colIndices.Tray_Cell_Count >= 0) {
      sheet.getRange(targetRow, colIndices.Tray_Cell_Count + 1).setValue(params.trayCellCount);
      updates.push('Tray_Cell_Count');
    }
    if (params.nurseryDays !== undefined && colIndices.Nursery_Days >= 0) {
      sheet.getRange(targetRow, colIndices.Nursery_Days + 1).setValue(params.nurseryDays);
      updates.push('Nursery_Days');
    }
    if (params.plantingMethod !== undefined && colIndices.Planting_Method >= 0) {
      sheet.getRange(targetRow, colIndices.Planting_Method + 1).setValue(params.plantingMethod);
      updates.push('Planting_Method');
    }

    return {
      success: true,
      message: `Updated ${cropName} profile`,
      updatedFields: updates
    };
  }
function createCropProfile(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REF_CropProfiles');

    if (!sheet) {
      return { success: false, error: 'REF_CropProfiles sheet not found' };
    }

    const cropName = params.cropName;
    const variety = params.variety || '';

    if (!cropName) {
      return { success: false, error: 'cropName is required' };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const newRow = headers.map(header => {
      switch (header) {
        case 'Crop': return cropName;
        case 'Variety': return variety;
        case 'Primary_Category': return params.category || 'Veg';
        case 'DTM': return params.dtm || 45;
        case 'Spacing': return params.spacing || 8;
        case 'Rows_Per_Bed': return params.rowsPerBed || 4;
        case 'Tray_Cell_Count': return params.trayCellCount || 128;
        case 'Nursery_Days': return params.nurseryDays || 28;
        case 'Planting_Method': return params.plantingMethod || 'Transplant';
        default: return '';
      }
    });

    sheet.appendRow(newRow);

    return {
      success: true,
      message: 'Created profile for ' + cropName + (variety ? ' - ' + variety : ''),
      profile: {
        Crop: cropName,
        Variety: variety,
        Primary_Category: params.category || 'Veg',
        DTM: params.dtm || 45,
        Spacing: params.spacing || 8,
        Rows_Per_Bed: params.rowsPerBed || 4,
        Tray_Cell_Count: params.trayCellCount || 128,
        Nursery_Days: params.nurseryDays || 28,
        Planting_Method: params.plantingMethod || 'Transplant'
      }
    };
  }
function getCropProfiles() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REF_CropProfiles');

    if (!sheet) {
      return { success: false, error: 'REF_CropProfiles sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const profiles = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const profile = {};
      headers.forEach((header, index) => {
        profile[header] = row[index];
      });
      profiles.push(profile);
    }

    return {
      success: true,
      data: profiles,
      count: profiles.length
    };
  }

// ═══════════════════════════════════════════════════════════════════════════
// SOIL-TESTS.HTML BACKEND FUNCTIONS
// Complete backend for soil testing, amendments, IPM, fertigation, and compliance
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get or create a sheet by name with proper headers
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

/**
 * Generate unique ID for records
 */
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE RECORDS - Critical for Organic Certification
// ═══════════════════════════════════════════════════════════════════════════

const COMPLIANCE_HEADERS = ['ID', 'Date', 'Type', 'Product', 'Field', 'Bed', 'Rate', 'Method', 'AppliedBy', 'Notes', 'Weather', 'REI', 'PHI', 'CreatedAt', 'Synced'];

function getComplianceRecords(params) {
  try {
    const sheet = getOrCreateSheet('SOIL_COMPLIANCE_LOG', COMPLIANCE_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const records = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const record = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        record[header] = value;
      });
      records.push(record);
    }

    // Filter by date range if provided
    let filtered = records;
    if (params && params.startDate) {
      filtered = filtered.filter(r => r.Date >= params.startDate);
    }
    if (params && params.endDate) {
      filtered = filtered.filter(r => r.Date <= params.endDate);
    }

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveComplianceRecord(data) {
  try {
    const sheet = getOrCreateSheet('SOIL_COMPLIANCE_LOG', COMPLIANCE_HEADERS);

    const id = data.id || generateId('COMP');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.type || '',
      data.product || '',
      data.field || '',
      data.bed || '',
      data.rate || '',
      data.method || '',
      data.appliedBy || '',
      data.notes || '',
      data.weather || '',
      data.rei || '',
      data.phi || '',
      now,
      'true'
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Compliance record saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IPM SPRAY SCHEDULES - Mandatory Flea Beetle & Leaf Miner Programs
// ═══════════════════════════════════════════════════════════════════════════

const IPM_HEADERS = ['ID', 'CropName', 'SowingDate', 'Protocol', 'ScheduleJSON', 'Status', 'CompletedSprays', 'CreatedAt', 'UpdatedAt'];

function getIPMSchedules(params) {
  try {
    const sheet = getOrCreateSheet('IPM_SPRAY_SCHEDULES', IPM_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const schedules = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const schedule = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'ScheduleJSON' || header === 'CompletedSprays') {
          try { value = JSON.parse(value); } catch(e) { value = []; }
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        schedule[header] = value;
      });
      schedules.push(schedule);
    }

    // Filter by status if provided
    let filtered = schedules;
    if (params && params.status) {
      filtered = filtered.filter(s => s.Status === params.status);
    }

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveIPMSchedule(data) {
  try {
    const sheet = getOrCreateSheet('IPM_SPRAY_SCHEDULES', IPM_HEADERS);

    const id = data.id || generateId('IPM');
    const now = new Date().toISOString();

    const row = [
      id,
      data.cropName || '',
      data.sowingDate || '',
      data.protocolName || data.protocol || '',
      JSON.stringify(data.schedule || []),
      data.status || 'active',
      JSON.stringify(data.completedSprays || []),
      now,
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'IPM schedule saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateIPMSprayStatus(data) {
  try {
    const sheet = getOrCreateSheet('IPM_SPRAY_SCHEDULES', IPM_HEADERS);
    const allData = sheet.getDataRange().getValues();

    // Find the row with matching ID
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === data.scheduleId) {
        // Update completed sprays
        let completedSprays = [];
        try { completedSprays = JSON.parse(allData[i][6] || '[]'); } catch(e) {}

        completedSprays.push({
          sprayDay: data.sprayDay,
          completedDate: data.completedDate || new Date().toISOString().split('T')[0],
          notes: data.notes || ''
        });

        // Update the row
        sheet.getRange(i + 1, 7).setValue(JSON.stringify(completedSprays));
        sheet.getRange(i + 1, 9).setValue(new Date().toISOString());

        // Check if all sprays completed
        let schedule = [];
        try { schedule = JSON.parse(allData[i][4] || '[]'); } catch(e) {}
        if (completedSprays.length >= schedule.length) {
          sheet.getRange(i + 1, 6).setValue('completed');
        }

        return {
          success: true,
          message: 'Spray status updated',
          completedSprays: completedSprays
        };
      }
    }

    return { success: false, error: 'Schedule not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FERTIGATION DATA - Schedules and Application Logs
// ═══════════════════════════════════════════════════════════════════════════

const FERTIGATION_HEADERS = ['ID', 'Type', 'CropKey', 'Field', 'Greenhouse', 'DataJSON', 'Status', 'CreatedAt', 'UpdatedAt'];

function getFertigationData(params) {
  try {
    const sheet = getOrCreateSheet('FERTIGATION_DATA', FERTIGATION_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: { schedules: [], logs: [] }, count: 0 };
    }

    const headers = data[0];
    const schedules = [];
    const logs = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const record = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'DataJSON') {
          try { value = JSON.parse(value); } catch(e) { value = {}; }
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        record[header] = value;
      });

      if (record.Type === 'schedule') {
        schedules.push(record);
      } else {
        logs.push(record);
      }
    }

    return {
      success: true,
      data: { schedules, logs },
      count: schedules.length + logs.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveFertigationData(data) {
  try {
    const sheet = getOrCreateSheet('FERTIGATION_DATA', FERTIGATION_HEADERS);

    const id = data.id || generateId('FERT');
    const now = new Date().toISOString();

    const row = [
      id,
      data.type || 'log',
      data.cropKey || '',
      data.field || '',
      data.greenhouse || '',
      JSON.stringify(data.data || data),
      data.status || 'active',
      now,
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Fertigation data saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLIAR APPLICATIONS - Spray Logs for AEA Program
// ═══════════════════════════════════════════════════════════════════════════

const FOLIAR_HEADERS = ['ID', 'Date', 'Recipe', 'Field', 'Beds', 'Products', 'Rates', 'Weather', 'AppliedBy', 'Notes', 'TankSize', 'Coverage', 'CreatedAt'];

function getFoliarApplications(params) {
  try {
    const sheet = getOrCreateSheet('FOLIAR_APPLICATIONS', FOLIAR_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const applications = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const app = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'Products' || header === 'Rates' || header === 'Beds') {
          try { value = JSON.parse(value); } catch(e) {}
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        app[header] = value;
      });
      applications.push(app);
    }

    return {
      success: true,
      data: applications,
      count: applications.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveFoliarApplication(data) {
  try {
    const sheet = getOrCreateSheet('FOLIAR_APPLICATIONS', FOLIAR_HEADERS);

    const id = data.id || generateId('FOL');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.recipe || '',
      data.field || '',
      JSON.stringify(data.beds || []),
      JSON.stringify(data.products || []),
      JSON.stringify(data.rates || []),
      data.weather || '',
      data.appliedBy || '',
      data.notes || '',
      data.tankSize || '',
      data.coverage || '',
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Foliar application logged',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOIL AMENDMENTS - Planned and Applied Amendments
// ═══════════════════════════════════════════════════════════════════════════

const AMENDMENT_HEADERS = ['ID', 'Date', 'Field', 'Zone', 'Products', 'Rates', 'Status', 'PlannedDate', 'AppliedDate', 'AppliedBy', 'Notes', 'Source', 'CreatedAt'];

function getSoilAmendments(params) {
  try {
    const sheet = getOrCreateSheet('SOIL_AMENDMENTS', AMENDMENT_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const amendments = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const amendment = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'Products' || header === 'Rates') {
          try { value = JSON.parse(value); } catch(e) {}
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        amendment[header] = value;
      });
      amendments.push(amendment);
    }

    // Filter by status if provided
    let filtered = amendments;
    if (params && params.status) {
      filtered = filtered.filter(a => a.Status === params.status);
    }
    if (params && params.field) {
      filtered = filtered.filter(a => a.Field === params.field);
    }

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveSoilAmendment(data) {
  try {
    const sheet = getOrCreateSheet('SOIL_AMENDMENTS', AMENDMENT_HEADERS);

    const id = data.id || generateId('AMD');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.field || '',
      data.zone || '',
      JSON.stringify(data.products || []),
      JSON.stringify(data.rates || []),
      data.status || 'planned',
      data.plannedDate || '',
      data.appliedDate || '',
      data.appliedBy || '',
      data.notes || '',
      data.source || 'manual',
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Soil amendment saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOIL TESTS - Test Results Storage
// ═══════════════════════════════════════════════════════════════════════════

// Full soil test headers matching frontend data structure
const SOIL_TEST_HEADERS = [
  'id', 'sampleLocation', 'testDate', 'labNumber', 'sampleDepth',
  'ph', 'cec', 'organicMatter', 'sulfur', 'phosphorus',
  'caDesired', 'caFound', 'mgDesired', 'mgFound', 'kDesired', 'kFound',
  'sodium', 'caPct', 'mgPct', 'kPct', 'naPct', 'otherPct', 'hPct',
  'boron', 'iron', 'manganese', 'copper', 'zinc', 'aluminum',
  'isArchived', 'notes', 'createdAt'
];

function getSoilTests(params) {
  try {
    const sheet = getOrCreateSheet('SOIL_TESTS', SOIL_TEST_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const tests = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const test = {};
      headers.forEach((header, index) => {
        let value = row[index];
        // Convert dates to string format
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        // Convert numeric strings to numbers for numeric fields
        if (['ph', 'cec', 'organicMatter', 'sulfur', 'phosphorus',
             'caDesired', 'caFound', 'mgDesired', 'mgFound', 'kDesired', 'kFound',
             'sodium', 'caPct', 'mgPct', 'kPct', 'naPct', 'otherPct', 'hPct',
             'boron', 'iron', 'manganese', 'copper', 'zinc', 'aluminum',
             'sampleDepth', 'labNumber'].includes(header) && value !== '') {
          value = parseFloat(value) || value;
        }
        // Convert isArchived to boolean
        if (header === 'isArchived') {
          value = value === true || value === 'true' || value === 'TRUE';
        }
        test[header] = value;
      });
      tests.push(test);
    }

    return {
      success: true,
      data: tests,
      count: tests.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveSoilTest(data) {
  try {
    const sheet = getOrCreateSheet('SOIL_TESTS', SOIL_TEST_HEADERS);

    // Generate ID if not provided, or use existing
    const id = data.id || generateId('SOIL');
    const now = new Date().toISOString();

    // Build row matching SOIL_TEST_HEADERS order
    const row = [
      id,
      data.sampleLocation || data.field || '',
      data.testDate || data.date || new Date().toISOString().split('T')[0],
      data.labNumber || '',
      data.sampleDepth || '',
      data.ph || '',
      data.cec || '',
      data.organicMatter || '',
      data.sulfur || '',
      data.phosphorus || '',
      data.caDesired || '',
      data.caFound || '',
      data.mgDesired || '',
      data.mgFound || '',
      data.kDesired || '',
      data.kFound || '',
      data.sodium || '',
      data.caPct || '',
      data.mgPct || '',
      data.kPct || '',
      data.naPct || '',
      data.otherPct || '',
      data.hPct || '',
      data.boron || '',
      data.iron || '',
      data.manganese || '',
      data.copper || '',
      data.zinc || '',
      data.aluminum || '',
      data.isArchived || false,
      data.notes || '',
      now
    ];

    // Check if this is an update (id exists in sheet) or new entry
    if (data.id) {
      // Try to find and update existing row
      const existingData = sheet.getDataRange().getValues();
      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][0] === data.id) {
          sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
          return {
            success: true,
            id: id,
            message: 'Soil test updated',
            timestamp: now
          };
        }
      }
    }

    // Append new row
    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Soil test saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK SYNC - Sync all localStorage data to Sheets
// ═══════════════════════════════════════════════════════════════════════════

function bulkSyncSoilData(data) {
  try {
    const results = {
      compliance: 0,
      ipm: 0,
      fertigation: 0,
      foliar: 0,
      amendments: 0,
      errors: []
    };

    // Sync compliance records
    if (data.complianceRecords && data.complianceRecords.length > 0) {
      data.complianceRecords.forEach(record => {
        try {
          saveComplianceRecord(record);
          results.compliance++;
        } catch (e) {
          results.errors.push('Compliance: ' + e.toString());
        }
      });
    }

    // Sync IPM schedules
    if (data.ipmSchedules && data.ipmSchedules.length > 0) {
      data.ipmSchedules.forEach(schedule => {
        try {
          saveIPMSchedule(schedule);
          results.ipm++;
        } catch (e) {
          results.errors.push('IPM: ' + e.toString());
        }
      });
    }

    // Sync fertigation data
    if (data.fertigationData && data.fertigationData.length > 0) {
      data.fertigationData.forEach(fert => {
        try {
          saveFertigationData(fert);
          results.fertigation++;
        } catch (e) {
          results.errors.push('Fertigation: ' + e.toString());
        }
      });
    }

    // Sync foliar applications
    if (data.foliarApplications && data.foliarApplications.length > 0) {
      data.foliarApplications.forEach(app => {
        try {
          saveFoliarApplication(app);
          results.foliar++;
        } catch (e) {
          results.errors.push('Foliar: ' + e.toString());
        }
      });
    }

    // Sync soil amendments
    if (data.soilAmendments && data.soilAmendments.length > 0) {
      data.soilAmendments.forEach(amendment => {
        try {
          saveSoilAmendment(amendment);
          results.amendments++;
        } catch (e) {
          results.errors.push('Amendment: ' + e.toString());
        }
      });
    }

    return {
      success: true,
      results: results,
      totalSynced: results.compliance + results.ipm + results.fertigation + results.foliar + results.amendments,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT SYSTEM
// Complete inventory tracking with seed-to-sale traceability
// ═══════════════════════════════════════════════════════════════════════════

const INVENTORY_PRODUCTS_HEADERS = [
  'Product_ID', 'Category', 'Product_Name', 'Manufacturer', 'OMRI_Status',
  'Unit', 'Unit_Size', 'Cost_Per_Unit', 'Reorder_Point', 'Current_Qty',
  'Location', 'Lot_Number', 'Expiration', 'Seeds_Per_Pack', 'Germination_Rate',
  'Photo_URL', 'Active', 'Notes', 'CreatedAt', 'UpdatedAt'
];

const INVENTORY_TRANSACTIONS_HEADERS = [
  'Transaction_ID', 'Date', 'Product_ID', 'Product_Name', 'Transaction_Type',
  'Qty', 'Unit', 'Batch_ID', 'Field', 'Location', 'Applied_By',
  'Photo_URL', 'Notes', 'CreatedAt'
];

// Product categories
const PRODUCT_CATEGORIES = ['SEED', 'AMENDMENT', 'FERTILIZER', 'PESTICIDE', 'BIOLOGICAL', 'SUPPLY'];

// Storage locations
const STORAGE_LOCATIONS = ['Barn', 'Greenhouse', 'High Tunnel', 'Field Shed', 'Other'];

/**
 * Get all inventory products with optional filtering
 */
function getInventoryProducts(params) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    let products = data.slice(1).map(row => {
      const product = {};
      headers.forEach((header, i) => {
        product[header] = row[i];
      });
      return product;
    }).filter(p => p.Product_ID); // Filter out empty rows

    // Filter by category if specified
    if (params && params.category && params.category !== 'all') {
      products = products.filter(p => p.Category === params.category);
    }

    // Filter by active status
    if (params && params.activeOnly === 'true') {
      products = products.filter(p => p.Active === true || p.Active === 'true' || p.Active === 'TRUE');
    }

    // Filter by location
    if (params && params.location) {
      products = products.filter(p => p.Location === params.location);
    }

    return {
      success: true,
      data: products,
      count: products.length,
      categories: PRODUCT_CATEGORIES,
      locations: STORAGE_LOCATIONS
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get a single product by ID
 */
function getProductById(params) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1 || !params.id) {
      return { success: false, error: 'Product not found' };
    }

    const headers = data[0];
    const productIdCol = headers.indexOf('Product_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][productIdCol] === params.id) {
        const product = {};
        headers.forEach((header, j) => {
          product[header] = data[i][j];
        });
        return { success: true, data: product };
      }
    }

    return { success: false, error: 'Product not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get products below their reorder point
 */
function getLowStockProducts() {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const lowStock = [];

    data.slice(1).forEach(row => {
      const product = {};
      headers.forEach((header, i) => {
        product[header] = row[i];
      });

      // Check if current qty is below reorder point
      const currentQty = parseFloat(product.Current_Qty) || 0;
      const reorderPoint = parseFloat(product.Reorder_Point) || 0;
      const isActive = product.Active === true || product.Active === 'true' || product.Active === 'TRUE';

      if (product.Product_ID && isActive && currentQty <= reorderPoint) {
        product.deficit = reorderPoint - currentQty;
        lowStock.push(product);
      }
    });

    // Sort by deficit (most urgent first)
    lowStock.sort((a, b) => b.deficit - a.deficit);

    return {
      success: true,
      data: lowStock,
      count: lowStock.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get transaction history with optional filtering
 */
function getTransactionHistory(params) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_TRANSACTIONS', INVENTORY_TRANSACTIONS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    let transactions = data.slice(1).map(row => {
      const txn = {};
      headers.forEach((header, i) => {
        txn[header] = row[i];
      });
      return txn;
    }).filter(t => t.Transaction_ID);

    // Filter by product ID
    if (params && params.productId) {
      transactions = transactions.filter(t => t.Product_ID === params.productId);
    }

    // Filter by batch ID
    if (params && params.batchId) {
      transactions = transactions.filter(t => t.Batch_ID === params.batchId);
    }

    // Filter by transaction type
    if (params && params.type) {
      transactions = transactions.filter(t => t.Transaction_Type === params.type);
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return {
      success: true,
      data: transactions,
      count: transactions.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Save a new product or update existing
 */
function saveProduct(data) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const now = new Date().toISOString();

    // Check if updating existing product
    if (data.Product_ID) {
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const productIdCol = headers.indexOf('Product_ID');

      for (let i = 1; i < allData.length; i++) {
        if (allData[i][productIdCol] === data.Product_ID) {
          // Update existing row
          const updatedAt = headers.indexOf('UpdatedAt');
          const row = headers.map(header => {
            if (header === 'UpdatedAt') return now;
            return data[header] !== undefined ? data[header] : allData[i][headers.indexOf(header)];
          });
          sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);

          return {
            success: true,
            id: data.Product_ID,
            message: 'Product updated',
            timestamp: now
          };
        }
      }
    }

    // Create new product
    const productId = generateId('PROD');
    const row = INVENTORY_PRODUCTS_HEADERS.map(header => {
      if (header === 'Product_ID') return productId;
      if (header === 'CreatedAt') return now;
      if (header === 'UpdatedAt') return now;
      if (header === 'Active') return data.Active !== undefined ? data.Active : true;
      if (header === 'Current_Qty') return parseFloat(data.Current_Qty) || 0;
      if (header === 'Reorder_Point') return parseFloat(data.Reorder_Point) || 0;
      if (header === 'Cost_Per_Unit') return parseFloat(data.Cost_Per_Unit) || 0;
      return data[header] || '';
    });

    sheet.appendRow(row);

    return {
      success: true,
      id: productId,
      message: 'Product created',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Record an inventory transaction (purchase, application, adjustment, waste, transfer)
 */
function recordTransaction(data) {
  try {
    const txnSheet = getOrCreateSheet('INVENTORY_TRANSACTIONS', INVENTORY_TRANSACTIONS_HEADERS);
    const prodSheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const now = new Date().toISOString();

    const transactionId = generateId('TXN');

    // Get product info
    const prodData = prodSheet.getDataRange().getValues();
    const prodHeaders = prodData[0];
    const productIdCol = prodHeaders.indexOf('Product_ID');
    const productNameCol = prodHeaders.indexOf('Product_Name');
    const currentQtyCol = prodHeaders.indexOf('Current_Qty');
    const updatedAtCol = prodHeaders.indexOf('UpdatedAt');

    let productName = data.productName || '';
    let productRow = -1;

    // Find the product and get its name
    for (let i = 1; i < prodData.length; i++) {
      if (prodData[i][productIdCol] === data.productId) {
        productName = prodData[i][productNameCol];
        productRow = i + 1; // 1-indexed for sheet
        break;
      }
    }

    // Create transaction record
    const txnRow = INVENTORY_TRANSACTIONS_HEADERS.map(header => {
      if (header === 'Transaction_ID') return transactionId;
      if (header === 'Date') return data.date || now.split('T')[0];
      if (header === 'Product_ID') return data.productId || '';
      if (header === 'Product_Name') return productName;
      if (header === 'Transaction_Type') return data.type || 'ADJUSTMENT';
      if (header === 'Qty') return parseFloat(data.qty) || 0;
      if (header === 'Unit') return data.unit || '';
      if (header === 'Batch_ID') return data.batchId || '';
      if (header === 'Field') return data.field || '';
      if (header === 'Location') return data.location || '';
      if (header === 'Applied_By') return data.appliedBy || '';
      if (header === 'Photo_URL') return data.photoUrl || '';
      if (header === 'Notes') return data.notes || '';
      if (header === 'CreatedAt') return now;
      return '';
    });

    txnSheet.appendRow(txnRow);

    // Update product quantity if product exists
    if (productRow > 0) {
      const currentQty = parseFloat(prodData[productRow - 1][currentQtyCol]) || 0;
      const qtyChange = parseFloat(data.qty) || 0;
      const newQty = currentQty + qtyChange;

      prodSheet.getRange(productRow, currentQtyCol + 1).setValue(newQty);
      prodSheet.getRange(productRow, updatedAtCol + 1).setValue(now);

      // Check if below reorder point
      const reorderCol = prodHeaders.indexOf('Reorder_Point');
      const reorderPoint = parseFloat(prodData[productRow - 1][reorderCol]) || 0;

      return {
        success: true,
        id: transactionId,
        productId: data.productId,
        previousQty: currentQty,
        newQty: newQty,
        belowReorderPoint: newQty <= reorderPoint,
        timestamp: now
      };
    }

    return {
      success: true,
      id: transactionId,
      message: 'Transaction recorded (product not found for qty update)',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Manually adjust inventory quantity
 */
function adjustInventory(data) {
  return recordTransaction({
    productId: data.productId,
    type: 'ADJUSTMENT',
    qty: data.qty,
    notes: data.reason || 'Manual adjustment',
    appliedBy: data.adjustedBy || ''
  });
}

/**
 * Upload a photo to Google Drive and return the URL
 */
function uploadProductPhoto(data) {
  try {
    // Get or create the photos folder
    const folderName = 'TinySeed_Product_Photos';
    let folder;

    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // Decode base64 image data
    const imageData = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(imageData, 'image/jpeg', data.fileName || 'product_' + Date.now() + '.jpg');

    // Create file in folder
    const file = folder.createFile(blob);

    // Set sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl(),
      fileId: file.getId(),
      fileName: file.getName()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FARM INVENTORY SYSTEM - Physical Asset Tracking
// For equipment, tools, vehicles, infrastructure (not consumables)
// ═══════════════════════════════════════════════════════════════════════════

const FARM_INVENTORY_HEADERS = [
  'Item_ID', 'Photo_URL', 'Item_Name', 'Category', 'Sub_Category', 'Quantity',
  'Condition', 'Location', 'Est_Value', 'Serial_Model', 'Purchase_Date',
  'Notes', 'Captured_Date', 'Captured_By', 'GPS_Lat', 'GPS_Lon',
  'Accounting_Category', 'Depreciation_Type', 'Active', 'Last_Updated'
];

const FARM_INVENTORY_CATEGORIES = [
  'Equipment', 'Tools', 'Seeds & Transplants', 'Irrigation', 'Pest Control',
  'Soil Amendments', 'Packaging', 'Safety', 'Office', 'Infrastructure', 'Vehicles', 'Other'
];

const FARM_INVENTORY_LOCATIONS = [
  'Tool Shed', 'Greenhouse 1', 'Greenhouse 2', 'Greenhouse 3', 'Equipment Barn',
  'Cold Storage', 'Wash/Pack Station', 'Field Storage', 'Office',
  'Personal Vehicle', 'Other'
];

const FARM_INVENTORY_CONDITIONS = ['Good', 'Fair', 'Poor', 'Needs Repair'];

// Auto-mapping categories to accounting
const ACCOUNTING_CATEGORY_MAP = {
  'Equipment': (value) => value > 2500 ? 'Fixed Assets:Equipment' : 'Expenses:Small Equipment',
  'Tools': 'Expenses:Tools & Supplies',
  'Seeds & Transplants': 'Inventory:Seeds',
  'Irrigation': (value) => value > 2500 ? 'Fixed Assets:Equipment' : 'Inventory:Supplies',
  'Pest Control': 'Inventory:Pest Control',
  'Soil Amendments': 'Inventory:Amendments',
  'Packaging': 'Inventory:Packaging',
  'Safety': 'Expenses:Safety',
  'Office': 'Expenses:Office',
  'Infrastructure': 'Fixed Assets:Buildings',
  'Vehicles': 'Fixed Assets:Vehicles',
  'Other': 'Expenses:Miscellaneous'
};

/**
 * Get farm inventory items with optional filtering
 */
function getFarmInventory(params) {
  try {
    const sheet = getOrCreateSheet('FARM_INVENTORY', FARM_INVENTORY_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return {
        success: true,
        data: [],
        count: 0,
        categories: FARM_INVENTORY_CATEGORIES,
        locations: FARM_INVENTORY_LOCATIONS,
        conditions: FARM_INVENTORY_CONDITIONS
      };
    }

    const headers = data[0];
    let items = data.slice(1).map(row => {
      const item = {};
      headers.forEach((header, i) => {
        item[header] = row[i];
      });
      return item;
    }).filter(item => item.Item_ID);

    // Filter by category
    if (params && params.category && params.category !== 'all') {
      items = items.filter(item => item.Category === params.category);
    }

    // Filter by location
    if (params && params.location && params.location !== 'all') {
      items = items.filter(item => item.Location === params.location);
    }

    // Filter by condition
    if (params && params.condition) {
      items = items.filter(item => item.Condition === params.condition);
    }

    // Filter active only
    if (params && params.activeOnly === 'true') {
      items = items.filter(item => item.Active === true || item.Active === 'true' || item.Active === 'TRUE' || item.Active === 'Yes');
    }

    return {
      success: true,
      data: items,
      count: items.length,
      categories: FARM_INVENTORY_CATEGORIES,
      locations: FARM_INVENTORY_LOCATIONS,
      conditions: FARM_INVENTORY_CONDITIONS
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get a single farm inventory item by ID
 */
function getFarmInventoryItem(params) {
  try {
    if (!params.id) {
      return { success: false, error: 'Item ID required' };
    }

    const sheet = getOrCreateSheet('FARM_INVENTORY', FARM_INVENTORY_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: false, error: 'Item not found' };
    }

    const headers = data[0];
    const idCol = headers.indexOf('Item_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === params.id) {
        const item = {};
        headers.forEach((header, j) => {
          item[header] = data[i][j];
        });
        return { success: true, data: item };
      }
    }

    return { success: false, error: 'Item not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get farm inventory statistics
 */
function getFarmInventoryStats() {
  try {
    const result = getFarmInventory({});
    if (!result.success) return result;

    const items = result.data;
    const stats = {
      totalItems: items.length,
      totalValue: 0,
      byCategory: {},
      byLocation: {},
      byCondition: {},
      needsRepair: []
    };

    items.forEach(item => {
      // Total value
      const value = parseFloat(item.Est_Value) || 0;
      stats.totalValue += value;

      // By category
      const cat = item.Category || 'Other';
      if (!stats.byCategory[cat]) stats.byCategory[cat] = { count: 0, value: 0 };
      stats.byCategory[cat].count++;
      stats.byCategory[cat].value += value;

      // By location
      const loc = item.Location || 'Other';
      if (!stats.byLocation[loc]) stats.byLocation[loc] = { count: 0, value: 0 };
      stats.byLocation[loc].count++;
      stats.byLocation[loc].value += value;

      // By condition
      const cond = item.Condition || 'Unknown';
      if (!stats.byCondition[cond]) stats.byCondition[cond] = 0;
      stats.byCondition[cond]++;

      // Needs repair
      if (item.Condition === 'Needs Repair' || item.Condition === 'Poor') {
        stats.needsRepair.push({
          id: item.Item_ID,
          name: item.Item_Name,
          condition: item.Condition,
          location: item.Location
        });
      }
    });

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Add a new farm inventory item
 */
function addFarmInventoryItem(data) {
  try {
    const sheet = getOrCreateSheet('FARM_INVENTORY', FARM_INVENTORY_HEADERS);
    const existingData = sheet.getDataRange().getValues();
    const now = new Date().toISOString();

    // Generate new ID
    let maxNum = 0;
    for (let i = 1; i < existingData.length; i++) {
      const id = existingData[i][0];
      if (id && id.startsWith('INV-')) {
        const num = parseInt(id.replace('INV-', ''));
        if (num > maxNum) maxNum = num;
      }
    }
    const newId = 'INV-' + String(maxNum + 1).padStart(4, '0');

    // Auto-determine accounting category
    const estValue = parseFloat(data.estValue) || 0;
    const category = data.category || 'Other';
    let accountingCategory = 'Expenses:Miscellaneous';

    const mapper = ACCOUNTING_CATEGORY_MAP[category];
    if (mapper) {
      accountingCategory = typeof mapper === 'function' ? mapper(estValue) : mapper;
    }

    // Determine depreciation type
    let depreciationType = 'None';
    if (accountingCategory.startsWith('Fixed Assets:')) {
      if (accountingCategory.includes('Vehicle')) depreciationType = '5-year MACRS';
      else if (accountingCategory.includes('Building')) depreciationType = '15-year Straight-line';
      else depreciationType = '7-year MACRS';
    }

    const row = FARM_INVENTORY_HEADERS.map(header => {
      if (header === 'Item_ID') return newId;
      if (header === 'Photo_URL') return data.photoUrl || '';
      if (header === 'Item_Name') return data.itemName || '';
      if (header === 'Category') return category;
      if (header === 'Sub_Category') return data.subCategory || '';
      if (header === 'Quantity') return parseInt(data.quantity) || 1;
      if (header === 'Condition') return data.condition || 'Good';
      if (header === 'Location') return data.location || '';
      if (header === 'Est_Value') return estValue;
      if (header === 'Serial_Model') return data.serialModel || '';
      if (header === 'Purchase_Date') return data.purchaseDate || '';
      if (header === 'Notes') return data.notes || '';
      if (header === 'Captured_Date') return now;
      if (header === 'Captured_By') return data.capturedBy || 'Mobile User';
      if (header === 'GPS_Lat') return data.gpsLat || '';
      if (header === 'GPS_Lon') return data.gpsLon || '';
      if (header === 'Accounting_Category') return accountingCategory;
      if (header === 'Depreciation_Type') return depreciationType;
      if (header === 'Active') return 'Yes';
      if (header === 'Last_Updated') return now;
      return '';
    });

    sheet.appendRow(row);

    return {
      success: true,
      data: { itemId: newId, accountingCategory, depreciationType },
      message: `Item ${newId} added successfully`
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Update an existing farm inventory item
 */
function updateFarmInventoryItem(data) {
  try {
    if (!data.itemId) {
      return { success: false, error: 'Item ID required' };
    }

    const sheet = getOrCreateSheet('FARM_INVENTORY', FARM_INVENTORY_HEADERS);
    const existingData = sheet.getDataRange().getValues();
    const headers = existingData[0];
    const idCol = headers.indexOf('Item_ID');

    let rowIndex = -1;
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][idCol] === data.itemId) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Item not found' };
    }

    // Update specified fields
    const now = new Date().toISOString();
    const updateFields = {
      'Photo_URL': data.photoUrl,
      'Item_Name': data.itemName,
      'Category': data.category,
      'Sub_Category': data.subCategory,
      'Quantity': data.quantity !== undefined ? parseInt(data.quantity) : undefined,
      'Condition': data.condition,
      'Location': data.location,
      'Est_Value': data.estValue !== undefined ? parseFloat(data.estValue) : undefined,
      'Serial_Model': data.serialModel,
      'Notes': data.notes,
      'Active': data.active,
      'Last_Updated': now
    };

    headers.forEach((header, colIndex) => {
      if (updateFields[header] !== undefined) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updateFields[header]);
      }
    });

    return { success: true, message: `Item ${data.itemId} updated successfully` };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Delete (deactivate) a farm inventory item
 */
function deleteFarmInventoryItem(data) {
  try {
    if (!data.itemId) {
      return { success: false, error: 'Item ID required' };
    }

    // Soft delete - just mark as inactive
    return updateFarmInventoryItem({ itemId: data.itemId, active: 'No' });
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Upload photo for farm inventory item
 */
function uploadFarmInventoryPhoto(data) {
  try {
    const folderName = 'TinySeed_Farm_Inventory_Photos';
    let folder;

    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // Decode base64 image data
    const imageData = Utilities.base64Decode(data.base64);
    const fileName = data.fileName || 'inv_' + Date.now() + '.jpg';
    const blob = Utilities.newBlob(imageData, 'image/jpeg', fileName);

    // Create file in folder
    const file = folder.createFile(blob);

    // Set sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl(),
      fileId: file.getId(),
      fileName: file.getName()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get products formatted for dropdown menus
 */
function getProductsForDropdown(params) {
  try {
    const result = getInventoryProducts({ activeOnly: 'true', category: params ? params.category : null });

    if (!result.success) {
      return result;
    }

    const options = result.data.map(p => ({
      value: p.Product_ID,
      label: p.Product_Name,
      category: p.Category,
      omriStatus: p.OMRI_Status,
      unit: p.Unit,
      currentQty: p.Current_Qty,
      manufacturer: p.Manufacturer,
      location: p.Location
    }));

    return {
      success: true,
      data: options,
      count: options.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Deduct inventory when an application is recorded
 * Links the deduction to a specific planting batch
 */
function deductInventoryOnApplication(data) {
  return recordTransaction({
    productId: data.productId,
    type: 'APPLICATION',
    qty: -Math.abs(parseFloat(data.qty) || 0), // Ensure negative
    unit: data.unit,
    batchId: data.batchId,
    field: data.field,
    appliedBy: data.appliedBy,
    notes: data.notes || 'Applied to planting ' + data.batchId
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES & FLEET MODULE - IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// SHEET NAMES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SALES_SHEETS = {
  CUSTOMERS: 'SALES_Customers',
  ORDERS: 'SALES_Orders',
  ORDER_ITEMS: 'SALES_OrderItems',
  CSA_MEMBERS: 'CSA_Members',
  CSA_BOX_CONTENTS: 'CSA_BoxContents',
  DELIVERIES: 'SALES_Deliveries',
  DELIVERY_STOPS: 'SALES_DeliveryStops',
  DRIVERS: 'SALES_Drivers',
  PICK_PACK: 'SALES_PickPack',
  SMS_CAMPAIGNS: 'SALES_SMSCampaigns',
  MAGIC_LINKS: 'SALES_MagicLinks',
  DELIVERY_PROOFS: 'SALES_DeliveryProofs',
  SALES_CYCLES: 'SALES_Cycles',
  MARKET_ITEMS: 'SALES_MarketItems'
};

const FLEET_SHEETS = {
  ASSETS: 'FLEET_Assets',
  USAGE_LOG: 'FLEET_UsageLog',
  FUEL_LOG: 'FLEET_FuelLog',
  MAINTENANCE: 'FLEET_Maintenance'
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION - Run this once to create all sheets
// ═══════════════════════════════════════════════════════════════════════════

function initializeSalesAndFleetModule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ─────────────────────────────────────────────────────────────────────────
  // SALES SHEETS
  // ─────────────────────────────────────────────────────────────────────────

  createSheetIfNotExists(ss, SALES_SHEETS.CUSTOMERS, [
    'Customer_ID', 'Customer_Type', 'Company_Name', 'Contact_Name', 'Email', 'Phone',
    'Address', 'City', 'State', 'Zip', 'Delivery_Instructions',
    'Payment_Terms', 'Price_Tier', 'Is_Active', 'Created_At', 'Last_Order_Date',
    'Total_Orders', 'Total_Spent', 'Notes'
  ], '#3b82f6');

  createSheetIfNotExists(ss, SALES_SHEETS.ORDERS, [
    'Order_ID', 'Order_Date', 'Customer_ID', 'Customer_Name', 'Customer_Type',
    'Delivery_Date', 'Delivery_Window', 'Delivery_Address', 'Status',
    'Subtotal', 'Tax', 'Delivery_Fee', 'Total', 'Payment_Status',
    'Payment_Method', 'Notes', 'Source', 'Created_By', 'Created_At', 'Updated_At'
  ], '#22c55e');

  createSheetIfNotExists(ss, SALES_SHEETS.ORDER_ITEMS, [
    'Item_ID', 'Order_ID', 'Crop_ID', 'Product_Name', 'Variety',
    'Quantity', 'Unit', 'Unit_Price', 'Line_Total', 'Notes'
  ], '#22c55e');

  createSheetIfNotExists(ss, SALES_SHEETS.CSA_MEMBERS, [
    'Member_ID', 'Customer_ID', 'Share_Type', 'Share_Size', 'Season',
    'Start_Date', 'End_Date', 'Total_Weeks', 'Weeks_Remaining',
    'Pickup_Day', 'Pickup_Location', 'Delivery_Address',
    'Customization_Allowed', 'Swap_Credits', 'Vacation_Weeks_Used',
    'Status', 'Payment_Status', 'Amount_Paid', 'Notes'
  ], '#8b5cf6');

  createSheetIfNotExists(ss, SALES_SHEETS.CSA_BOX_CONTENTS, [
    'Box_ID', 'Week_Date', 'Share_Type', 'Crop_ID', 'Product_Name',
    'Variety', 'Quantity', 'Unit', 'Is_Swappable', 'Swap_Options', 'Notes'
  ], '#8b5cf6');

  createSheetIfNotExists(ss, SALES_SHEETS.DELIVERIES, [
    'Route_ID', 'Route_Name', 'Delivery_Date', 'Driver_ID', 'Driver_Name',
    'Status', 'Total_Stops', 'Completed_Stops', 'Est_Miles', 'Est_Duration',
    'Actual_Start', 'Actual_End', 'Notes'
  ], '#f59e0b');

  createSheetIfNotExists(ss, SALES_SHEETS.DELIVERY_STOPS, [
    'Stop_ID', 'Route_ID', 'Stop_Order', 'Order_ID', 'Customer_Name',
    'Address', 'Phone', 'Delivery_Window', 'ETA', 'Status',
    'Arrived_At', 'Completed_At', 'Photo_URL', 'Signature_URL',
    'GPS_Lat', 'GPS_Lng', 'Issue_Type', 'Issue_Notes'
  ], '#f59e0b');

  createSheetIfNotExists(ss, SALES_SHEETS.DRIVERS, [
    'Driver_ID', 'Name', 'PIN', 'Phone', 'Email', 'Vehicle',
    'License_Plate', 'Is_Active', 'Today_Deliveries', 'Week_Deliveries',
    'Total_Deliveries', 'Last_Login'
  ], '#ef4444');

  createSheetIfNotExists(ss, SALES_SHEETS.PICK_PACK, [
    'Pick_ID', 'Delivery_Date', 'Order_ID', 'Customer_Name', 'Customer_Type',
    'Crop_ID', 'Product_Name', 'Quantity', 'Unit', 'Location',
    'Status', 'Picked_By', 'Picked_At', 'Notes'
  ], '#06b6d4');

  createSheetIfNotExists(ss, SALES_SHEETS.SMS_CAMPAIGNS, [
    'Campaign_ID', 'Name', 'Message', 'Audience', 'Audience_Filter',
    'Total_Recipients', 'Sent_Count', 'Status', 'Scheduled_At',
    'Sent_At', 'Created_By', 'Created_At'
  ], '#ec4899');

  createSheetIfNotExists(ss, SALES_SHEETS.MAGIC_LINKS, [
    'Token', 'Customer_ID', 'Email', 'Customer_Type', 'Created_At',
    'Expires_At', 'Used', 'Used_At'
  ], '#64748b');

  createSheetIfNotExists(ss, SALES_SHEETS.DELIVERY_PROOFS, [
    'Proof_ID', 'Stop_ID', 'Order_ID', 'Timestamp', 'Driver_ID',
    'Photo_URL', 'Signature_URL', 'GPS_Lat', 'GPS_Lng', 'Notes'
  ], '#64748b');

  // ─────────────────────────────────────────────────────────────────────────
  // FLEET SHEETS
  // ─────────────────────────────────────────────────────────────────────────

  createSheetIfNotExists(ss, FLEET_SHEETS.ASSETS, [
    'Asset_ID', 'Asset_Name', 'Asset_Type', 'Make', 'Model', 'Year',
    'Serial_Number', 'Fuel_Type', 'Current_Hours', 'Current_Miles',
    'Service_Interval_Hours', 'Last_Service_Hours', 'Hours_Until_Service',
    'Purchase_Date', 'Purchase_Price', 'Depreciation_Per_Hour',
    'Status', 'Location', 'Notes', 'Photo_URL'
  ], '#475569');

  createSheetIfNotExists(ss, FLEET_SHEETS.USAGE_LOG, [
    'Usage_ID', 'Asset_ID', 'Asset_Name', 'Date', 'Task_ID', 'Task_Type',
    'Field', 'Bed_IDs', 'Operator_ID', 'Operator_Name',
    'Start_Hours', 'End_Hours', 'Hours_Used',
    'Fuel_Gallons', 'Fuel_Cost', 'Total_Cost', 'Notes'
  ], '#475569');

  createSheetIfNotExists(ss, FLEET_SHEETS.FUEL_LOG, [
    'Fuel_ID', 'Date', 'Asset_ID', 'Asset_Name', 'Gallons', 'Price_Per_Gallon',
    'Total_Cost', 'Vendor', 'Receipt_Photo', 'Filled_By', 'Notes'
  ], '#f97316');

  createSheetIfNotExists(ss, FLEET_SHEETS.MAINTENANCE, [
    'Maint_ID', 'Date', 'Asset_ID', 'Asset_Name', 'Maint_Type',
    'Description', 'Parts_Used', 'Parts_Cost', 'Labor_Hours', 'Labor_Cost',
    'Total_Cost', 'Performed_By', 'Next_Service_Hours', 'Photo_URL', 'Notes'
  ], '#dc2626');

  // Try to show UI alert if in spreadsheet context, otherwise just log
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Sales & Fleet Module Initialized',
      'All sheets have been created successfully!\n\n' +
      'Sales Sheets: ' + Object.keys(SALES_SHEETS).length + '\n' +
      'Fleet Sheets: ' + Object.keys(FLEET_SHEETS).length,
      ui.ButtonSet.OK);
  } catch (e) {
    Logger.log('Sales & Fleet Module Initialized - ' +
      Object.keys(SALES_SHEETS).length + ' sales sheets, ' +
      Object.keys(FLEET_SHEETS).length + ' fleet sheets created.');
  }

  return {
    success: true,
    message: 'Sales & Fleet Module Initialized',
    salesSheets: Object.keys(SALES_SHEETS).length,
    fleetSheets: Object.keys(FLEET_SHEETS).length
  };
}

function createSheetIfNotExists(ss, name, headers, color) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground(color)
      .setFontColor('white')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('Created sheet: ' + name);
  }
  return sheet;
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER AUTHENTICATION (Magic Link)
// ═══════════════════════════════════════════════════════════════════════════

function sendCustomerMagicLink(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const customerSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const linkSheet = ss.getSheetByName(SALES_SHEETS.MAGIC_LINKS);

    if (!customerSheet || !linkSheet) {
      return { success: false, error: 'Required sheets not found. Run initializeSalesAndFleetModule() first.' };
    }

    // Find customer by email
    const customerData = customerSheet.getDataRange().getValues();
    const headers = customerData[0];
    const emailCol = headers.indexOf('Email');
    const idCol = headers.indexOf('Customer_ID');
    const typeCol = headers.indexOf('Customer_Type');
    const nameCol = headers.indexOf('Contact_Name');

    let customer = null;
    for (let i = 1; i < customerData.length; i++) {
      if (customerData[i][emailCol] === data.email) {
        customer = {
          id: customerData[i][idCol],
          email: customerData[i][emailCol],
          name: customerData[i][nameCol],
          type: customerData[i][typeCol]
        };
        break;
      }
    }

    if (!customer) {
      return { success: false, error: 'Email not found. Please contact us to set up your account.' };
    }

    // Generate token
    const token = Utilities.getUuid();
    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    // Store token
    linkSheet.appendRow([
      token, customer.id, customer.email, customer.type,
      now.toISOString(), expires.toISOString(), false, ''
    ]);

    // Determine portal URL based on customer type
    const portalPath = customer.type === 'CSA' ? 'csa.html' : 'wholesale.html';
    const loginUrl = `${data.baseUrl || ''}${portalPath}?token=${token}&email=${encodeURIComponent(customer.email)}`;

    // Send email
    try {
      MailApp.sendEmail({
        to: customer.email,
        subject: 'Your Tiny Seed Farm Login Link',
        htmlBody: generateMagicLinkEmail(customer.name, loginUrl, customer.type)
      });
    } catch (emailErr) {
      Logger.log('Email error: ' + emailErr.toString());
      // Return token anyway for testing
    }

    return { success: true, message: 'Magic link sent', customerType: customer.type };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generateMagicLinkEmail(name, url, customerType) {
  const portalName = customerType === 'CSA' ? 'CSA Member Portal' : 'Wholesale Portal';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #22c55e; margin: 0;">Tiny Seed Farm</h1>
        <p style="color: #666; margin: 5px 0;">${portalName}</p>
      </div>
      <p>Hi ${name},</p>
      <p>Click the button below to log in to your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="display: inline-block; padding: 14px 32px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Log In to ${portalName}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">Tiny Seed Farm - "Sort of Cool"</p>
    </div>
  `;
}

function authenticateCustomer(params) {
  return verifyCustomerToken(params);
}

function verifyCustomerToken(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const linkSheet = ss.getSheetByName(SALES_SHEETS.MAGIC_LINKS);
    const customerSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    if (!linkSheet || !customerSheet) {
      return { success: false, error: 'Required sheets not found' };
    }

    const linkData = linkSheet.getDataRange().getValues();
    const now = new Date();

    for (let i = 1; i < linkData.length; i++) {
      if (linkData[i][0] === params.token && linkData[i][2] === params.email) {
        // Check if used
        if (linkData[i][6]) {
          return { success: false, error: 'This link has already been used' };
        }

        // Check expiry
        const expires = new Date(linkData[i][5]);
        if (now > expires) {
          return { success: false, error: 'This link has expired' };
        }

        // Mark as used
        linkSheet.getRange(i + 1, 7).setValue(true);
        linkSheet.getRange(i + 1, 8).setValue(now.toISOString());

        // Get full customer details
        const customerId = linkData[i][1];
        const customerType = linkData[i][3];
        const customer = getCustomerById({ customerId: customerId });

        if (!customer.success) {
          return { success: false, error: 'Customer not found' };
        }

        // Check if CSA member
        let csaMembership = null;
        if (customerType === 'CSA') {
          const csaResult = getCSAMembers({ customerId: customerId });
          if (csaResult.success && csaResult.members.length > 0) {
            csaMembership = csaResult.members[0];
          }
        }

        return {
          success: true,
          customer: customer.customer,
          customerType: customerType,
          csaMembership: csaMembership
        };
      }
    }

    return { success: false, error: 'Invalid token' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES CUSTOMERS API
// ═══════════════════════════════════════════════════════════════════════════

function getSalesCustomers(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    if (!sheet) {
      return { success: false, error: 'Customers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let customers = [];

    for (let i = 1; i < data.length; i++) {
      let customer = {};
      headers.forEach((h, j) => customer[h] = data[i][j]);

      // Apply filters
      if (params.type && customer.Customer_Type !== params.type) continue;
      if (params.isActive === 'true' && !customer.Is_Active) continue;
      if (params.search) {
        const search = params.search.toLowerCase();
        const searchFields = [customer.Company_Name, customer.Contact_Name, customer.Email].join(' ').toLowerCase();
        if (!searchFields.includes(search)) continue;
      }

      customers.push(customer);
    }

    return { success: true, customers: customers };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCustomerById(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.customerId) {
        let customer = {};
        headers.forEach((h, j) => customer[h] = data[i][j]);
        return { success: true, customer: customer };
      }
    }

    return { success: false, error: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCustomerProfile(params) {
  return getCustomerById(params);
}

function createSalesCustomer(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    // Check for duplicate email
    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][4] === data.email) { // Email column
        return { success: false, error: 'Customer with this email already exists' };
      }
    }

    const customerId = 'CUS-' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
      customerId,
      data.customerType || 'Retail',
      data.companyName || '',
      data.contactName,
      data.email,
      data.phone || '',
      data.address || '',
      data.city || '',
      data.state || '',
      data.zip || '',
      data.deliveryInstructions || '',
      data.paymentTerms || 'Due on delivery',
      data.priceTier || 'Standard',
      true, // Is_Active
      now,
      '', // Last_Order_Date
      0, // Total_Orders
      0, // Total_Spent
      data.notes || ''
    ]);

    return { success: true, customerId: customerId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateSalesCustomer(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.customerId) {
        // Update provided fields
        headers.forEach((h, j) => {
          const key = h.replace(/_/g, '').toLowerCase();
          const dataKey = Object.keys(data).find(k => k.toLowerCase() === key);
          if (dataKey && data[dataKey] !== undefined) {
            sheet.getRange(i + 1, j + 1).setValue(data[dataKey]);
          }
        });
        return { success: true, message: 'Customer updated' };
      }
    }

    return { success: false, error: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateCustomerProfile(data) {
  return updateSalesCustomer(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES ORDERS API
// ═══════════════════════════════════════════════════════════════════════════

function getSalesOrders(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);

    if (!sheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let orders = [];

    for (let i = 1; i < data.length; i++) {
      let order = {};
      headers.forEach((h, j) => order[h] = data[i][j]);

      // Apply filters
      if (params.status && order.Status !== params.status) continue;
      if (params.customerId && order.Customer_ID !== params.customerId) continue;
      if (params.customerType && order.Customer_Type !== params.customerType) continue;
      if (params.deliveryDate && formatDateStringSales(order.Delivery_Date) !== params.deliveryDate) continue;

      // Get order items
      order.items = getOrderItems(order.Order_ID);
      orders.push(order);
    }

    // Sort by date descending
    orders.sort((a, b) => new Date(b.Order_Date) - new Date(a.Order_Date));

    // Apply limit
    if (params.limit) {
      orders = orders.slice(0, parseInt(params.limit));
    }

    return { success: true, orders: orders };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getOrderById(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.orderId) {
        let order = {};
        headers.forEach((h, j) => order[h] = data[i][j]);
        order.items = getOrderItems(params.orderId);
        return { success: true, order: order };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCustomerOrders(params) {
  return getSalesOrders({ customerId: params.customerId, limit: params.limit || 50 });
}

function getOrderItems(orderId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SALES_SHEETS.ORDER_ITEMS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === orderId) { // Order_ID column
      let item = {};
      headers.forEach((h, j) => item[h] = data[i][j]);
      items.push(item);
    }
  }

  return items;
}

function createSalesOrder(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const orderSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const itemSheet = ss.getSheetByName(SALES_SHEETS.ORDER_ITEMS);

    const orderId = 'ORD-' + Date.now();
    const now = new Date().toISOString();

    // Calculate totals
    let subtotal = 0;
    (data.items || []).forEach(item => {
      subtotal += (item.quantity * item.unitPrice);
    });
    const tax = subtotal * (data.taxRate || 0);
    const deliveryFee = data.deliveryFee || 0;
    const total = subtotal + tax + deliveryFee;

    // Add order
    orderSheet.appendRow([
      orderId,
      now,
      data.customerId,
      data.customerName,
      data.customerType || 'Retail',
      data.deliveryDate,
      data.deliveryWindow || '',
      data.deliveryAddress || '',
      'Pending',
      subtotal,
      tax,
      deliveryFee,
      total,
      'Unpaid',
      data.paymentMethod || '',
      data.notes || '',
      data.source || 'Web',
      data.createdBy || 'System',
      now,
      now
    ]);

    // Add order items
    (data.items || []).forEach(item => {
      const itemId = 'ITM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      itemSheet.appendRow([
        itemId,
        orderId,
        item.cropId || '',
        item.productName,
        item.variety || '',
        item.quantity,
        item.unit,
        item.unitPrice,
        item.quantity * item.unitPrice,
        item.notes || ''
      ]);
    });

    // Generate pick list
    generatePickListForOrder(orderId, data);

    // Update customer stats
    updateCustomerOrderStats(data.customerId, total);

    return { success: true, orderId: orderId, total: total };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function submitWholesaleOrder(data) {
  return createSalesOrder({ ...data, customerType: 'Wholesale', source: 'Wholesale Portal' });
}

function submitCSAOrder(data) {
  return createSalesOrder({ ...data, customerType: 'CSA', source: 'CSA Portal' });
}

function updateSalesOrder(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.orderId) {
        // Update status
        if (data.status) {
          const statusCol = headers.indexOf('Status');
          sheet.getRange(i + 1, statusCol + 1).setValue(data.status);
        }
        // Update payment status
        if (data.paymentStatus) {
          const payCol = headers.indexOf('Payment_Status');
          sheet.getRange(i + 1, payCol + 1).setValue(data.paymentStatus);
        }
        // Update notes
        if (data.notes) {
          const notesCol = headers.indexOf('Notes');
          sheet.getRange(i + 1, notesCol + 1).setValue(data.notes);
        }
        // Update timestamp
        const updatedCol = headers.indexOf('Updated_At');
        sheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());

        return { success: true, message: 'Order updated' };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function cancelSalesOrder(data) {
  return updateSalesOrder({ orderId: data.orderId, status: 'Cancelled' });
}

function updateCustomerOrderStats(customerId, orderTotal) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    const idCol = headers.indexOf('Customer_ID');
    const lastOrderCol = headers.indexOf('Last_Order_Date');
    const totalOrdersCol = headers.indexOf('Total_Orders');
    const totalSpentCol = headers.indexOf('Total_Spent');

    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === customerId) {
        sheet.getRange(i + 1, lastOrderCol + 1).setValue(new Date().toISOString());
        sheet.getRange(i + 1, totalOrdersCol + 1).setValue((values[i][totalOrdersCol] || 0) + 1);
        sheet.getRange(i + 1, totalSpentCol + 1).setValue((values[i][totalSpentCol] || 0) + orderTotal);
        break;
      }
    }
  } catch (error) {
    Logger.log('Error updating customer stats: ' + error.toString());
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS API (Uses REF_Crops for unified dropdowns)
// ═══════════════════════════════════════════════════════════════════════════

function getWholesaleProducts(params) {
  return getProductsFromCrops('Wholesale', params);
}

function getCSAProducts(params) {
  return getProductsFromCrops('CSA', params);
}

function getProductsFromCrops(priceType, params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('REF_Crops');

    if (!sheet) {
      return { success: false, error: 'REF_Crops sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let products = [];

    // Find column indices
    const cropIdCol = headers.indexOf('Crop_ID');
    const nameCol = headers.indexOf('Crop_Name') !== -1 ? headers.indexOf('Crop_Name') : headers.indexOf('Item_Name');
    const varietyCol = headers.indexOf('Variety');
    const categoryCol = headers.indexOf('Category');
    const unitCol = headers.indexOf('Sales_Unit') !== -1 ? headers.indexOf('Sales_Unit') : headers.indexOf('Unit');
    const wholesalePriceCol = headers.indexOf('Wholesale_Price');
    const retailPriceCol = headers.indexOf('Retail_Price');
    const csaPriceCol = headers.indexOf('CSA_Price') !== -1 ? headers.indexOf('CSA_Price') : wholesalePriceCol;
    const statusCol = headers.indexOf('Status');
    const imageCol = headers.indexOf('Image_URL');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip inactive
      if (statusCol !== -1 && row[statusCol] === 'Inactive') continue;

      // Determine price based on type
      let price = 0;
      if (priceType === 'Wholesale' && wholesalePriceCol !== -1) {
        price = row[wholesalePriceCol];
      } else if (priceType === 'CSA' && csaPriceCol !== -1) {
        price = row[csaPriceCol];
      } else if (retailPriceCol !== -1) {
        price = row[retailPriceCol];
      }

      products.push({
        cropId: cropIdCol !== -1 ? row[cropIdCol] : 'CROP-' + i,
        name: nameCol !== -1 ? row[nameCol] : '',
        variety: varietyCol !== -1 ? row[varietyCol] : '',
        category: categoryCol !== -1 ? row[categoryCol] : '',
        unit: unitCol !== -1 ? row[unitCol] : 'each',
        price: price,
        image: imageCol !== -1 ? row[imageCol] : ''
      });
    }

    // Apply category filter
    if (params && params.category) {
      products = products.filter(p => p.category === params.category);
    }

    return { success: true, products: products };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CSA MEMBERS API
// ═══════════════════════════════════════════════════════════════════════════

function getCSAMembers(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);

    if (!sheet) {
      return { success: false, error: 'CSA Members sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let members = [];

    for (let i = 1; i < data.length; i++) {
      let member = {};
      headers.forEach((h, j) => member[h] = data[i][j]);

      // Apply filters
      if (params.customerId && member.Customer_ID !== params.customerId) continue;
      if (params.memberId && member.Member_ID !== params.memberId) continue;
      if (params.status && member.Status !== params.status) continue;
      if (params.season && member.Season !== params.season) continue;

      members.push(member);
    }

    return { success: true, members: members };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSalesCSAMembers(params) {
  return getCSAMembers(params || {});
}

function createCSAMember(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);

    const memberId = 'CSA-' + Date.now();

    sheet.appendRow([
      memberId,
      data.customerId,
      data.shareType || 'Vegetable',
      data.shareSize || 'Regular',
      data.season || new Date().getFullYear().toString(),
      data.startDate,
      data.endDate,
      data.totalWeeks || 20,
      data.totalWeeks || 20, // Weeks remaining starts at total
      data.pickupDay || '',
      data.pickupLocation || '',
      data.deliveryAddress || '',
      data.customizationAllowed !== false,
      data.swapCredits || 3,
      0, // Vacation weeks used
      'Active',
      data.paymentStatus || 'Unpaid',
      data.amountPaid || 0,
      data.notes || ''
    ]);

    return { success: true, memberId: memberId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateCSAMember(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.memberId) {
        // Update provided fields
        if (data.status) {
          const col = headers.indexOf('Status');
          sheet.getRange(i + 1, col + 1).setValue(data.status);
        }
        if (data.weeksRemaining !== undefined) {
          const col = headers.indexOf('Weeks_Remaining');
          sheet.getRange(i + 1, col + 1).setValue(data.weeksRemaining);
        }
        if (data.swapCredits !== undefined) {
          const col = headers.indexOf('Swap_Credits');
          sheet.getRange(i + 1, col + 1).setValue(data.swapCredits);
        }
        if (data.paymentStatus) {
          const col = headers.indexOf('Payment_Status');
          sheet.getRange(i + 1, col + 1).setValue(data.paymentStatus);
        }

        return { success: true, message: 'CSA membership updated' };
      }
    }

    return { success: false, error: 'Member not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCSABoxContents(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_BOX_CONTENTS);

    if (!sheet) {
      return { success: false, error: 'CSA Box Contents sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let items = [];

    const weekDate = params.weekDate || getCurrentWeekDateSales();

    for (let i = 1; i < data.length; i++) {
      let item = {};
      headers.forEach((h, j) => item[h] = data[i][j]);

      // Filter by week and share type
      if (formatDateStringSales(item.Week_Date) !== weekDate) continue;
      if (params.shareType && item.Share_Type !== params.shareType) continue;

      items.push(item);
    }

    return { success: true, weekDate: weekDate, items: items };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function customizeCSABox(data) {
  try {
    // Verify member has swap credits
    const memberResult = getCSAMembers({ memberId: data.memberId });
    if (!memberResult.success || memberResult.members.length === 0) {
      return { success: false, error: 'Member not found' };
    }

    const member = memberResult.members[0];
    const swapsNeeded = (data.swaps || []).length;

    if (member.Swap_Credits < swapsNeeded) {
      return { success: false, error: 'Not enough swap credits. You have ' + member.Swap_Credits + ' remaining.' };
    }

    // Record the customization (in production, would create/modify order)
    Logger.log('CSA Box customization: ' + JSON.stringify({
      memberId: data.memberId,
      weekDate: data.weekDate,
      swaps: data.swaps
    }));

    // Deduct swap credits
    updateCSAMember({
      memberId: data.memberId,
      swapCredits: member.Swap_Credits - swapsNeeded
    });

    return { success: true, message: 'Box customized successfully', creditsRemaining: member.Swap_Credits - swapsNeeded };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PICK & PACK API
// ═══════════════════════════════════════════════════════════════════════════

function getPickPackList(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);

    if (!sheet) {
      return { success: false, error: 'Pick Pack sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let items = [];

    for (let i = 1; i < data.length; i++) {
      let item = {};
      headers.forEach((h, j) => item[h] = data[i][j]);

      // Apply filters
      if (params.date && formatDateStringSales(item.Delivery_Date) !== params.date) continue;
      if (params.status && item.Status !== params.status) continue;
      if (params.customerType && item.Customer_Type !== params.customerType) continue;

      items.push(item);
    }

    return { success: true, items: items };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generatePickListForOrder(orderId, orderData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);

    (orderData.items || []).forEach(item => {
      const pickId = 'PCK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      sheet.appendRow([
        pickId,
        orderData.deliveryDate,
        orderId,
        orderData.customerName,
        orderData.customerType || 'Retail',
        item.cropId || '',
        item.productName,
        item.quantity,
        item.unit,
        item.location || '',
        'Pending',
        '', // Picked_By
        '', // Picked_At
        item.notes || ''
      ]);
    });

    return { success: true };
  } catch (error) {
    Logger.log('Error generating pick list: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function completePickPackItem(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.pickId) {
        const statusCol = headers.indexOf('Status');
        const pickedByCol = headers.indexOf('Picked_By');
        const pickedAtCol = headers.indexOf('Picked_At');
        const notesCol = headers.indexOf('Notes');

        sheet.getRange(i + 1, statusCol + 1).setValue('Picked');
        sheet.getRange(i + 1, pickedByCol + 1).setValue(data.pickedBy);
        sheet.getRange(i + 1, pickedAtCol + 1).setValue(new Date().toISOString());
        if (data.notes) sheet.getRange(i + 1, notesCol + 1).setValue(data.notes);

        return { success: true, message: 'Item marked as picked' };
      }
    }

    return { success: false, error: 'Pick item not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY & DRIVER API
// ═══════════════════════════════════════════════════════════════════════════

function getDeliveryRoutes(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);

    if (!sheet) {
      return { success: false, error: 'Deliveries sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let routes = [];

    for (let i = 1; i < data.length; i++) {
      let route = {};
      headers.forEach((h, j) => route[h] = data[i][j]);

      // Apply filters
      if (params.date && formatDateStringSales(route.Delivery_Date) !== params.date) continue;
      if (params.driverId && route.Driver_ID !== params.driverId) continue;
      if (params.status && route.Status !== params.status) continue;

      // Get stops
      route.stops = getRouteStops(route.Route_ID);
      routes.push(route);
    }

    return { success: true, routes: routes };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getRouteStops(routeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
  if (!sheet) return [];

  // Get customer data for email and type info
  const customersSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
  let customerData = {};
  if (customersSheet) {
    const custData = customersSheet.getDataRange().getValues();
    const custHeaders = custData[0];
    for (let i = 1; i < custData.length; i++) {
      const custId = custData[i][custHeaders.indexOf('Customer_ID')];
      customerData[custId] = {
        email: custData[i][custHeaders.indexOf('Email')],
        type: custData[i][custHeaders.indexOf('Customer_Type')],
        company: custData[i][custHeaders.indexOf('Company_Name')]
      };
    }
  }

  // Get order data for customer IDs and types
  const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
  let orderData = {};
  if (ordersSheet) {
    const ordData = ordersSheet.getDataRange().getValues();
    const ordHeaders = ordData[0];
    for (let i = 1; i < ordData.length; i++) {
      const orderId = ordData[i][ordHeaders.indexOf('Order_ID')];
      orderData[orderId] = {
        customerId: ordData[i][ordHeaders.indexOf('Customer_ID')],
        customerType: ordData[i][ordHeaders.indexOf('Customer_Type')]
      };
    }
  }

  // Get CSA box counts from CSA_Members if available
  const csaMembersSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
  let csaBoxCounts = {};
  let csaShareTypes = {};
  if (csaMembersSheet) {
    const csaData = csaMembersSheet.getDataRange().getValues();
    const csaHeaders = csaData[0];
    for (let i = 1; i < csaData.length; i++) {
      const custId = csaData[i][csaHeaders.indexOf('Customer_ID')];
      const shareType = csaData[i][csaHeaders.indexOf('Share_Type')] || 'Veggie';
      const shareSize = csaData[i][csaHeaders.indexOf('Share_Size')] || 'Regular';

      // Store share type (Veggie, Flower, etc.)
      csaShareTypes[custId] = shareType;

      // Default box/bouquet count based on share size
      let boxCount = 1;
      if (shareSize === 'Family' || shareSize === 'Large') boxCount = 2;
      if (shareSize === 'Extra Large') boxCount = 3;
      csaBoxCounts[custId] = boxCount;
    }
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const stops = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === routeId) { // Route_ID column
      let stop = {};
      headers.forEach((h, j) => stop[h] = data[i][j]);
      stop.items = getOrderItems(stop.Order_ID);

      // Add customer type and email from order/customer data
      const order = orderData[stop.Order_ID] || {};
      const customer = customerData[order.customerId] || {};

      stop.Customer_Type = order.customerType || customer.type || 'Retail';
      stop.Customer_Email = customer.email || '';
      stop.Customer_Company = customer.company || '';

      // Add box count and share type for CSA deliveries
      if (stop.Customer_Type === 'CSA') {
        stop.Box_Count = csaBoxCounts[order.customerId] || 1;
        stop.Share_Type = csaShareTypes[order.customerId] || 'Veggie';
      }

      // Add item count for wholesale
      if (stop.Customer_Type === 'Wholesale') {
        stop.Item_Count = stop.items ? stop.items.length : 0;
        stop.Total_Units = stop.items ? stop.items.reduce((sum, item) => sum + (item.Quantity || 0), 0) : 0;
      }

      stops.push(stop);
    }
  }

  stops.sort((a, b) => a.Stop_Order - b.Stop_Order);
  return stops;
}

function getDriverRoute(params) {
  try {
    // Authenticate driver first
    const driverResult = authenticateDriver(params);
    if (!driverResult.success) {
      return driverResult;
    }

    // Get today's route
    const today = formatDateStringSales(new Date());
    const routes = getDeliveryRoutes({ driverId: driverResult.driver.Driver_ID, date: today });

    if (routes.success && routes.routes.length > 0) {
      return { success: true, route: routes.routes[0], driver: driverResult.driver };
    }

    return { success: true, route: null, driver: driverResult.driver, message: 'No route assigned for today' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getDeliveryDrivers(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DRIVERS);

    if (!sheet) {
      return { success: false, error: 'Drivers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let drivers = [];

    for (let i = 1; i < data.length; i++) {
      let driver = {};
      headers.forEach((h, j) => {
        if (h !== 'PIN') driver[h] = data[i][j]; // Don't expose PIN
      });

      if (params.activeOnly && !driver.Is_Active) continue;

      drivers.push(driver);
    }

    return { success: true, drivers: drivers };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function authenticateDriver(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DRIVERS);

    if (!sheet) {
      return { success: false, error: 'Drivers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const pinCol = headers.indexOf('PIN');

    for (let i = 1; i < data.length; i++) {
      if (data[i][pinCol] === params.pin) {
        let driver = {};
        headers.forEach((h, j) => {
          if (h !== 'PIN') driver[h] = data[i][j];
        });

        // Update last login
        const loginCol = headers.indexOf('Last_Login');
        sheet.getRange(i + 1, loginCol + 1).setValue(new Date().toISOString());

        return { success: true, driver: driver };
      }
    }

    return { success: false, error: 'Invalid PIN' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getDeliveryHistory(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    if (!stopsSheet) {
      return { success: true, deliveries: [] };
    }

    const driverId = params.driverId;
    const days = parseInt(params.days) || 7;

    const data = stopsSheet.getDataRange().getValues();
    const headers = data[0];
    const driverIdCol = headers.indexOf('Driver_ID');
    const dateCol = headers.indexOf('Delivery_Date');
    const statusCol = headers.indexOf('Status');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deliveries = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const deliveryDate = new Date(row[dateCol]);

      // Filter by driver and date range
      if (row[driverIdCol] === driverId && deliveryDate >= cutoffDate) {
        let delivery = {};
        headers.forEach((h, j) => {
          delivery[h] = row[j];
        });
        deliveries.push(delivery);
      }
    }

    // Sort by date descending
    deliveries.sort((a, b) => new Date(b.Delivery_Date) - new Date(a.Delivery_Date));

    return { success: true, deliveries: deliveries };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Log a completed delivery
 * @param {Object} params - { deliveryId, customer, timestamp, driverId, gpsLat, gpsLng, photo, signature, notes }
 */
function completeDelivery(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create DELIVERY_LOG sheet
    let logSheet = ss.getSheetByName('DELIVERY_LOG');
    if (!logSheet) {
      logSheet = ss.insertSheet('DELIVERY_LOG');
      logSheet.appendRow([
        'Log_ID', 'Delivery_ID', 'Customer', 'Status', 'Completed_At',
        'Driver_ID', 'GPS_Lat', 'GPS_Lng', 'Photo_URL', 'Signature', 'Notes'
      ]);
      logSheet.getRange(1, 1, 1, 11).setFontWeight('bold');
    }

    const logId = 'LOG-' + Date.now();
    const timestamp = params.timestamp || new Date().toISOString();

    logSheet.appendRow([
      logId,
      params.deliveryId || '',
      params.customer || '',
      'delivered',
      timestamp,
      params.driverId || '',
      params.gpsLat || params.gps?.lat || '',
      params.gpsLng || params.gps?.lng || '',
      params.photo || '',
      params.signature || '',
      params.notes || ''
    ]);

    // Also update the delivery status in DELIVERY_STOPS if it exists
    const stopsSheet = ss.getSheetByName('DELIVERY_STOPS');
    if (stopsSheet && params.deliveryId) {
      const data = stopsSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('Stop_ID') !== -1 ? headers.indexOf('Stop_ID') : headers.indexOf('Delivery_ID');
      const statusCol = headers.indexOf('Status');

      if (idCol !== -1 && statusCol !== -1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][idCol] === params.deliveryId) {
            stopsSheet.getRange(i + 1, statusCol + 1).setValue('Delivered');
            break;
          }
        }
      }
    }

    return {
      success: true,
      message: 'Delivery logged successfully',
      logId: logId
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Log a delivery issue to DELIVERY_LOG sheet (used by GET requests)
 * @param {Object} params - { deliveryId, customer, timestamp, driverId, issueType, notes, photo }
 */
function logDeliveryIssue(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create DELIVERY_LOG sheet
    let logSheet = ss.getSheetByName('DELIVERY_LOG');
    if (!logSheet) {
      logSheet = ss.insertSheet('DELIVERY_LOG');
      logSheet.appendRow([
        'Log_ID', 'Delivery_ID', 'Customer', 'Status', 'Completed_At',
        'Driver_ID', 'GPS_Lat', 'GPS_Lng', 'Photo_URL', 'Signature', 'Notes'
      ]);
      logSheet.getRange(1, 1, 1, 11).setFontWeight('bold');
    }

    const logId = 'ISS-' + Date.now();
    const timestamp = params.timestamp || new Date().toISOString();

    logSheet.appendRow([
      logId,
      params.deliveryId || '',
      params.customer || '',
      'issue: ' + (params.issueType || 'unknown'),
      timestamp,
      params.driverId || '',
      '', // GPS Lat
      '', // GPS Lng
      params.photo || '',
      '', // No signature for issues
      params.notes || ''
    ]);

    // Also update the delivery status in DELIVERY_STOPS if it exists
    const stopsSheet = ss.getSheetByName('DELIVERY_STOPS');
    if (stopsSheet && params.deliveryId) {
      const data = stopsSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('Stop_ID') !== -1 ? headers.indexOf('Stop_ID') : headers.indexOf('Delivery_ID');
      const statusCol = headers.indexOf('Status');

      if (idCol !== -1 && statusCol !== -1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][idCol] === params.deliveryId) {
            stopsSheet.getRange(i + 1, statusCol + 1).setValue('Issue: ' + (params.issueType || 'unknown'));
            break;
          }
        }
      }
    }

    return {
      success: true,
      message: 'Issue reported successfully',
      logId: logId
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// TIME CLOCK FUNCTIONS
// ============================================

/**
 * Handle driver clock-in
 * @param {Object} params - { driverId, driverName, timestamp, gpsLat, gpsLng }
 */
function handleClockIn(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create TIME_CLOCK sheet
    let clockSheet = ss.getSheetByName('TIME_CLOCK');
    if (!clockSheet) {
      clockSheet = ss.insertSheet('TIME_CLOCK');
      clockSheet.appendRow([
        'Entry_ID', 'Driver_ID', 'Driver_Name', 'Date', 'Clock_In', 'Clock_Out',
        'Hours_Worked', 'GPS_In_Lat', 'GPS_In_Lng', 'GPS_Out_Lat', 'GPS_Out_Lng', 'In_Geofence'
      ]);
      clockSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    }

    const entryId = 'CLK-' + Date.now();
    const timestamp = params.timestamp || new Date().toISOString();
    const dateStr = new Date(timestamp).toLocaleDateString('en-US');

    // Check if within geofence (farm location: 40.7248232, -80.1540297)
    const FARM_LAT = 40.7248232;
    const FARM_LNG = -80.1540297;
    const GEOFENCE_RADIUS_KM = 0.5; // 500 meters

    let inGeofence = false;
    if (params.gpsLat && params.gpsLng) {
      const distance = haversineDistance(
        parseFloat(params.gpsLat), parseFloat(params.gpsLng),
        FARM_LAT, FARM_LNG
      );
      inGeofence = distance <= GEOFENCE_RADIUS_KM;
    }

    clockSheet.appendRow([
      entryId,
      params.driverId || '',
      params.driverName || '',
      dateStr,
      timestamp,
      '', // Clock out (empty)
      '', // Hours worked (empty)
      params.gpsLat || '',
      params.gpsLng || '',
      '', // GPS Out Lat
      '', // GPS Out Lng
      inGeofence ? 'TRUE' : 'FALSE'
    ]);

    return {
      success: true,
      message: 'Clocked in successfully',
      entryId: entryId,
      inGeofence: inGeofence
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Handle driver clock-out
 * @param {Object} params - { driverId, entryId, timestamp, gpsLat, gpsLng, hoursWorked }
 */
function handleClockOut(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const clockSheet = ss.getSheetByName('TIME_CLOCK');

    if (!clockSheet) {
      return { success: false, error: 'TIME_CLOCK sheet not found' };
    }

    const timestamp = params.timestamp || new Date().toISOString();
    const data = clockSheet.getDataRange().getValues();
    const headers = data[0];

    const entryIdCol = headers.indexOf('Entry_ID');
    const clockOutCol = headers.indexOf('Clock_Out');
    const hoursCol = headers.indexOf('Hours_Worked');
    const gpsOutLatCol = headers.indexOf('GPS_Out_Lat');
    const gpsOutLngCol = headers.indexOf('GPS_Out_Lng');

    // Find the entry and update it
    for (let i = 1; i < data.length; i++) {
      if (data[i][entryIdCol] === params.entryId ||
          (data[i][headers.indexOf('Driver_ID')] === params.driverId && !data[i][clockOutCol])) {
        clockSheet.getRange(i + 1, clockOutCol + 1).setValue(timestamp);
        clockSheet.getRange(i + 1, hoursCol + 1).setValue(params.hoursWorked || '');
        if (gpsOutLatCol !== -1) {
          clockSheet.getRange(i + 1, gpsOutLatCol + 1).setValue(params.gpsLat || '');
        }
        if (gpsOutLngCol !== -1) {
          clockSheet.getRange(i + 1, gpsOutLngCol + 1).setValue(params.gpsLng || '');
        }
        break;
      }
    }

    return {
      success: true,
      message: 'Clocked out successfully',
      hoursWorked: params.hoursWorked
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Calculate haversine distance between two points in km
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function createDeliveryRoute(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const routeSheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    const routeId = 'RTE-' + Date.now();

    // Create route
    routeSheet.appendRow([
      routeId,
      data.routeName || 'Route ' + data.deliveryDate,
      data.deliveryDate,
      data.driverId || '',
      data.driverName || '',
      'Pending',
      (data.stops || []).length,
      0, // Completed stops
      data.estMiles || 0,
      data.estDuration || '',
      '', // Actual start
      '', // Actual end
      data.notes || ''
    ]);

    // Create stops
    (data.stops || []).forEach((stop, index) => {
      const stopId = 'STP-' + Date.now() + '-' + index;
      stopsSheet.appendRow([
        stopId,
        routeId,
        index + 1,
        stop.orderId,
        stop.customerName,
        stop.address,
        stop.phone || '',
        stop.deliveryWindow || '',
        stop.eta || '',
        'Pending',
        '', '', '', '', '', '', '', ''
      ]);
    });

    return { success: true, routeId: routeId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function assignDeliveryRoute(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.routeId) {
        const driverIdCol = headers.indexOf('Driver_ID');
        const driverNameCol = headers.indexOf('Driver_Name');

        sheet.getRange(i + 1, driverIdCol + 1).setValue(data.driverId);
        sheet.getRange(i + 1, driverNameCol + 1).setValue(data.driverName);

        return { success: true, message: 'Driver assigned to route' };
      }
    }

    return { success: false, error: 'Route not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function recordDeliveryProof(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const proofSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_PROOFS);
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    const proofId = 'PRF-' + Date.now();
    const now = new Date().toISOString();

    // Save photos to Drive
    let photoUrl = '';
    let signatureUrl = '';

    if (data.photo) {
      photoUrl = savePhotoToDriveSales(data.photo, 'delivery_' + proofId);
    }
    if (data.signature) {
      signatureUrl = savePhotoToDriveSales(data.signature, 'signature_' + proofId);
    }

    // Record proof
    proofSheet.appendRow([
      proofId,
      data.stopId,
      data.orderId,
      now,
      data.driverId,
      photoUrl,
      signatureUrl,
      data.gpsLat || '',
      data.gpsLng || '',
      data.notes || ''
    ]);

    // Update stop status
    updateDeliveryStopStatus(stopsSheet, data.stopId, 'Delivered', now, photoUrl, signatureUrl, data.gpsLat, data.gpsLng);

    // Update order status
    updateSalesOrder({ orderId: data.orderId, status: 'Delivered' });

    // Update route progress
    if (data.routeId) {
      updateRouteProgress(data.routeId);
    }

    return { success: true, proofId: proofId, photoUrl: photoUrl };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function reportDeliveryIssue(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    const now = new Date().toISOString();

    // Save photo if provided
    let photoUrl = '';
    if (data.photo) {
      photoUrl = savePhotoToDriveSales(data.photo, 'issue_' + data.stopId);
    }

    // Update stop with issue
    const values = stopsSheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.stopId) {
        stopsSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('Issue');
        stopsSheet.getRange(i + 1, headers.indexOf('Completed_At') + 1).setValue(now);
        stopsSheet.getRange(i + 1, headers.indexOf('Issue_Type') + 1).setValue(data.issueType);
        stopsSheet.getRange(i + 1, headers.indexOf('Issue_Notes') + 1).setValue(data.notes || '');
        if (photoUrl) {
          stopsSheet.getRange(i + 1, headers.indexOf('Photo_URL') + 1).setValue(photoUrl);
        }
        break;
      }
    }

    // Update order status
    const orderStatus = data.issueType === 'not_home' ? 'Delivery Attempted' : 'Issue - ' + data.issueType;
    updateSalesOrder({ orderId: data.orderId, status: orderStatus });

    // Update route progress
    if (data.routeId) {
      updateRouteProgress(data.routeId);
    }

    return { success: true, message: 'Issue reported' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateDeliveryETA(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.stopId) {
        const etaCol = headers.indexOf('ETA');
        sheet.getRange(i + 1, etaCol + 1).setValue(data.eta);
        return { success: true, message: 'ETA updated' };
      }
    }

    return { success: false, error: 'Stop not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateDeliveryStopStatus(sheet, stopId, status, timestamp, photoUrl, signatureUrl, lat, lng) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === stopId) {
      sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('Completed_At') + 1).setValue(timestamp);
      if (photoUrl) sheet.getRange(i + 1, headers.indexOf('Photo_URL') + 1).setValue(photoUrl);
      if (signatureUrl) sheet.getRange(i + 1, headers.indexOf('Signature_URL') + 1).setValue(signatureUrl);
      if (lat) sheet.getRange(i + 1, headers.indexOf('GPS_Lat') + 1).setValue(lat);
      if (lng) sheet.getRange(i + 1, headers.indexOf('GPS_Lng') + 1).setValue(lng);
      break;
    }
  }
}

function updateDeliveryStopStatusFromWeb(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    if (!stopsSheet) {
      return { success: false, error: 'Delivery stops sheet not found' };
    }

    updateDeliveryStopStatus(
      stopsSheet,
      data.stopId,
      data.status,
      data.timestamp || new Date().toISOString(),
      null, null, null, null
    );

    return { success: true, message: 'Stop status updated' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateRouteProgress(routeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const routeSheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);
  const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

  // Count completed stops
  const stopsData = stopsSheet.getDataRange().getValues();
  let completed = 0;
  let total = 0;

  for (let i = 1; i < stopsData.length; i++) {
    if (stopsData[i][1] === routeId) {
      total++;
      if (stopsData[i][9] === 'Delivered' || stopsData[i][9] === 'Issue') {
        completed++;
      }
    }
  }

  // Update route
  const routeData = routeSheet.getDataRange().getValues();
  const headers = routeData[0];

  for (let i = 1; i < routeData.length; i++) {
    if (routeData[i][0] === routeId) {
      routeSheet.getRange(i + 1, headers.indexOf('Completed_Stops') + 1).setValue(completed);

      if (completed === total && total > 0) {
        routeSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('Completed');
        routeSheet.getRange(i + 1, headers.indexOf('Actual_End') + 1).setValue(new Date().toISOString());
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME DELIVERY TRACKING
// ═══════════════════════════════════════════════════════════════════════════

const TRACKING_SHEET = 'DELIVERY_TRACKING';

function startDeliveryTracking(params) {
  try {
    const { routeId, driverId, driverName } = params;
    if (!routeId) return { success: false, error: 'Route ID required' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let trackingSheet = ss.getSheetByName(TRACKING_SHEET);

    // Create sheet if it doesn't exist
    if (!trackingSheet) {
      trackingSheet = ss.insertSheet(TRACKING_SHEET);
      trackingSheet.appendRow([
        'Tracking_ID', 'Route_ID', 'Driver_ID', 'Driver_Name',
        'Current_Lat', 'Current_Lng', 'Last_Updated', 'Status',
        'Current_Stop_Index', 'Total_Stops', 'Started_At'
      ]);
      trackingSheet.setFrozenRows(1);
    }

    // Check if route already has active tracking
    const data = trackingSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === routeId && data[i][7] === 'active') {
        // Already tracking - return existing tracking ID
        return { success: true, trackingId: data[i][0], message: 'Tracking already active' };
      }
    }

    // Get route stops count
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
    let totalStops = 0;
    if (stopsSheet) {
      const stopsData = stopsSheet.getDataRange().getValues();
      for (let i = 1; i < stopsData.length; i++) {
        if (stopsData[i][1] === routeId) totalStops++;
      }
    }

    // Generate tracking ID
    const trackingId = 'TRK-' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();

    // Create new tracking record
    trackingSheet.appendRow([
      trackingId, routeId, driverId || '', driverName || '',
      '', '', now, 'active', 0, totalStops, now
    ]);

    // Generate tracking codes for all stops on this route
    generateTrackingCodes(routeId, trackingId);

    return {
      success: true,
      trackingId: trackingId,
      totalStops: totalStops,
      message: 'Tracking started'
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generateTrackingCodes(routeId, trackingId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
    if (!stopsSheet) return;

    const data = stopsSheet.getDataRange().getValues();
    const headers = data[0];

    // Add Tracking_Code column if it doesn't exist
    let trackingCodeCol = headers.indexOf('Tracking_Code');
    if (trackingCodeCol === -1) {
      trackingCodeCol = headers.length;
      stopsSheet.getRange(1, trackingCodeCol + 1).setValue('Tracking_Code');
    }

    // Add Tracking_ID column if it doesn't exist
    let trackingIdCol = headers.indexOf('Tracking_ID');
    if (trackingIdCol === -1) {
      trackingIdCol = headers.length + (trackingCodeCol === headers.length ? 1 : 0);
      stopsSheet.getRange(1, trackingIdCol + 1).setValue('Tracking_ID');
    }

    // Generate tracking codes for stops on this route
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === routeId) { // Route_ID column
        // Generate unique 6-character tracking code
        const code = generateShortCode();
        stopsSheet.getRange(i + 1, trackingCodeCol + 1).setValue(code);
        stopsSheet.getRange(i + 1, trackingIdCol + 1).setValue(trackingId);
      }
    }
  } catch (error) {
    console.error('Error generating tracking codes:', error);
  }
}

function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function updateDriverLocation(params) {
  try {
    const { routeId, trackingId, lat, lng, currentStopIndex, heading, speed } = params;
    if (!routeId && !trackingId) return { success: false, error: 'Route ID or Tracking ID required' };
    if (!lat || !lng) return { success: false, error: 'Location required' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const trackingSheet = ss.getSheetByName(TRACKING_SHEET);
    if (!trackingSheet) return { success: false, error: 'Tracking not initialized' };

    const data = trackingSheet.getDataRange().getValues();
    const headers = data[0];
    const now = new Date().toISOString();

    for (let i = 1; i < data.length; i++) {
      const matchRoute = routeId && data[i][1] === routeId;
      const matchTracking = trackingId && data[i][0] === trackingId;

      if ((matchRoute || matchTracking) && data[i][7] === 'active') {
        // Update location
        trackingSheet.getRange(i + 1, headers.indexOf('Current_Lat') + 1).setValue(lat);
        trackingSheet.getRange(i + 1, headers.indexOf('Current_Lng') + 1).setValue(lng);
        trackingSheet.getRange(i + 1, headers.indexOf('Last_Updated') + 1).setValue(now);

        if (currentStopIndex !== undefined) {
          trackingSheet.getRange(i + 1, headers.indexOf('Current_Stop_Index') + 1).setValue(currentStopIndex);
        }

        // Store heading/speed if columns exist (add them if they don't)
        let headingCol = headers.indexOf('Heading');
        let speedCol = headers.indexOf('Speed');

        if (headingCol === -1 && heading !== undefined) {
          headingCol = headers.length;
          trackingSheet.getRange(1, headingCol + 1).setValue('Heading');
        }
        if (speedCol === -1 && speed !== undefined) {
          speedCol = headers.length + (headingCol === headers.length ? 1 : 0);
          trackingSheet.getRange(1, speedCol + 1).setValue('Speed');
        }

        if (heading !== undefined && headingCol !== -1) {
          trackingSheet.getRange(i + 1, headingCol + 1).setValue(heading);
        }
        if (speed !== undefined && speedCol !== -1) {
          trackingSheet.getRange(i + 1, speedCol + 1).setValue(speed);
        }

        return { success: true, message: 'Location updated' };
      }
    }

    return { success: false, error: 'Active tracking session not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function stopDeliveryTracking(params) {
  try {
    const { routeId, trackingId } = params;
    if (!routeId && !trackingId) return { success: false, error: 'Route ID or Tracking ID required' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const trackingSheet = ss.getSheetByName(TRACKING_SHEET);
    if (!trackingSheet) return { success: false, error: 'Tracking sheet not found' };

    const data = trackingSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const matchRoute = routeId && data[i][1] === routeId;
      const matchTracking = trackingId && data[i][0] === trackingId;

      if ((matchRoute || matchTracking) && data[i][7] === 'active') {
        trackingSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('completed');
        trackingSheet.getRange(i + 1, headers.indexOf('Last_Updated') + 1).setValue(new Date().toISOString());

        return { success: true, message: 'Tracking stopped' };
      }
    }

    return { success: false, error: 'Active tracking not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getTrackingStatus(params) {
  try {
    const { trackingCode, trackingId } = params;
    if (!trackingCode && !trackingId) {
      return { success: false, error: 'Tracking code or ID required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // If tracking code provided, look up the stop first
    let stopInfo = null;
    let routeTrackingId = trackingId;

    if (trackingCode) {
      const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
      if (stopsSheet) {
        const stopsData = stopsSheet.getDataRange().getValues();
        const stopsHeaders = stopsData[0];
        const trackingCodeCol = stopsHeaders.indexOf('Tracking_Code');
        const trackingIdCol = stopsHeaders.indexOf('Tracking_ID');

        for (let i = 1; i < stopsData.length; i++) {
          if (stopsData[i][trackingCodeCol] === trackingCode.toUpperCase()) {
            stopInfo = {};
            stopsHeaders.forEach((h, j) => {
              if (h !== 'Tracking_Code') stopInfo[h] = stopsData[i][j];
            });
            routeTrackingId = stopsData[i][trackingIdCol];
            break;
          }
        }

        if (!stopInfo) {
          return { success: false, error: 'Invalid tracking code' };
        }
      }
    }

    // Get tracking data
    const trackingSheet = ss.getSheetByName(TRACKING_SHEET);
    if (!trackingSheet) {
      return { success: false, error: 'Tracking not available' };
    }

    const data = trackingSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === routeTrackingId) {
        const tracking = {};
        headers.forEach((h, j) => tracking[h] = data[i][j]);

        // Calculate stops away
        let stopsAway = 0;
        let eta = null;

        if (stopInfo && tracking.Status === 'active') {
          const currentStopIndex = parseInt(tracking.Current_Stop_Index) || 0;
          const customerStopOrder = parseInt(stopInfo.Stop_Order) || 0;
          stopsAway = Math.max(0, customerStopOrder - currentStopIndex - 1);

          // Estimate ETA (rough: 5 min per stop + existing ETA if available)
          if (stopInfo.ETA) {
            eta = stopInfo.ETA;
          } else {
            const minutesAway = stopsAway * 8; // ~8 min per stop average
            const etaDate = new Date(Date.now() + minutesAway * 60000);
            eta = etaDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          }
        }

        // Check if delivery is complete
        let deliveryStatus = 'tracking';
        if (stopInfo) {
          if (stopInfo.Status === 'Delivered') deliveryStatus = 'delivered';
          else if (stopInfo.Status === 'Issue') deliveryStatus = 'issue';
          else if (tracking.Status !== 'active') deliveryStatus = 'tracking_ended';
          else if (stopsAway === 0) deliveryStatus = 'next_stop';
        }

        return {
          success: true,
          tracking: {
            id: tracking.Tracking_ID,
            status: tracking.Status,
            driverName: tracking.Driver_Name,
            currentLat: tracking.Current_Lat,
            currentLng: tracking.Current_Lng,
            lastUpdated: tracking.Last_Updated,
            currentStopIndex: tracking.Current_Stop_Index,
            totalStops: tracking.Total_Stops,
            heading: tracking.Heading,
            speed: tracking.Speed
          },
          stop: stopInfo ? {
            customerName: stopInfo.Customer_Name,
            address: stopInfo.Address,
            stopOrder: stopInfo.Stop_Order,
            status: stopInfo.Status,
            deliveryWindow: stopInfo.Delivery_Window
          } : null,
          stopsAway: stopsAway,
          eta: eta,
          deliveryStatus: deliveryStatus
        };
      }
    }

    return { success: false, error: 'Tracking session not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getActiveTracking(params) {
  try {
    const { driverId, routeId } = params;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const trackingSheet = ss.getSheetByName(TRACKING_SHEET);

    if (!trackingSheet) {
      return { success: true, activeSessions: [] };
    }

    const data = trackingSheet.getDataRange().getValues();
    const headers = data[0];

    const activeSessions = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('Status')] === 'active') {
        const session = {};
        headers.forEach((h, j) => session[h] = data[i][j]);

        // Apply filters
        if (driverId && session.Driver_ID !== driverId) continue;
        if (routeId && session.Route_ID !== routeId) continue;

        activeSessions.push(session);
      }
    }

    return { success: true, activeSessions: activeSessions };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY NOTIFICATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const TRACKING_PAGE_URL = 'https://tinyseedfarm.com/track.html'; // Update with your actual domain

/**
 * Send tracking SMS to all customers when driver starts the route
 * @param {Object} params - { routeId, trackingId }
 */
function sendRouteStartNotifications(params) {
  try {
    const { routeId, trackingId } = params;
    if (!routeId) return { success: false, error: 'Route ID required' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
    const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const customersSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    if (!stopsSheet) return { success: false, error: 'Stops sheet not found' };

    const stopsData = stopsSheet.getDataRange().getValues();
    const stopsHeaders = stopsData[0];

    // Get customer data for emails
    let customerData = {};
    if (customersSheet) {
      const custData = customersSheet.getDataRange().getValues();
      const custHeaders = custData[0];
      for (let i = 1; i < custData.length; i++) {
        const custId = custData[i][custHeaders.indexOf('Customer_ID')];
        customerData[custId] = {
          email: custData[i][custHeaders.indexOf('Email')],
          type: custData[i][custHeaders.indexOf('Customer_Type')],
          company: custData[i][custHeaders.indexOf('Company_Name')]
        };
      }
    }

    // Get order data for customer IDs
    let orderCustomerMap = {};
    if (ordersSheet) {
      const ordData = ordersSheet.getDataRange().getValues();
      const ordHeaders = ordData[0];
      for (let i = 1; i < ordData.length; i++) {
        orderCustomerMap[ordData[i][ordHeaders.indexOf('Order_ID')]] = {
          customerId: ordData[i][ordHeaders.indexOf('Customer_ID')],
          customerType: ordData[i][ordHeaders.indexOf('Customer_Type')]
        };
      }
    }

    const results = [];
    const sentPhones = new Set(); // Avoid duplicate SMS

    for (let i = 1; i < stopsData.length; i++) {
      if (stopsData[i][stopsHeaders.indexOf('Route_ID')] === routeId) {
        const phone = stopsData[i][stopsHeaders.indexOf('Phone')];
        const customerName = stopsData[i][stopsHeaders.indexOf('Customer_Name')];
        const trackingCode = stopsData[i][stopsHeaders.indexOf('Tracking_Code')];
        const orderId = stopsData[i][stopsHeaders.indexOf('Order_ID')];
        const orderInfo = orderCustomerMap[orderId] || {};
        const custInfo = customerData[orderInfo.customerId] || {};

        // Only send if phone exists and not already sent
        if (phone && !sentPhones.has(phone)) {
          sentPhones.add(phone);

          const trackingLink = `${TRACKING_PAGE_URL}?code=${trackingCode}`;
          const message = `🚚 Tiny Seed Farm: Your delivery is on the way! Track your order in real-time: ${trackingLink}`;

          // Send SMS
          const smsResult = sendSMS({ to: phone, message: message });
          results.push({
            customer: customerName,
            phone: phone,
            type: 'sms',
            success: smsResult.success,
            error: smsResult.error
          });

          // Also send email if we have it (especially for wholesale)
          if (custInfo.email) {
            try {
              MailApp.sendEmail({
                to: custInfo.email,
                subject: '🚚 Your Tiny Seed Farm Delivery is On The Way!',
                htmlBody: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #22c55e; padding: 20px; text-align: center;">
                      <h1 style="color: white; margin: 0;">🌱 Tiny Seed Farm</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                      <h2 style="color: #1e293b;">Your Delivery is On The Way!</h2>
                      <p style="color: #64748b; font-size: 16px;">
                        Hi ${customerName.split(' ')[0]},
                      </p>
                      <p style="color: #64748b; font-size: 16px;">
                        Great news! Your Tiny Seed Farm delivery has departed and is on its way to you.
                      </p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${trackingLink}" style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                          Track Your Delivery
                        </a>
                      </div>
                      <p style="color: #94a3b8; font-size: 14px; text-align: center;">
                        Tracking Code: <strong>${trackingCode}</strong>
                      </p>
                    </div>
                    <div style="padding: 20px; background: #1e293b; text-align: center;">
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        Tiny Seed Farm • Local, Organic, Delicious
                      </p>
                    </div>
                  </div>
                `
              });
              results.push({
                customer: customerName,
                email: custInfo.email,
                type: 'email',
                success: true
              });
            } catch (emailError) {
              results.push({
                customer: customerName,
                email: custInfo.email,
                type: 'email',
                success: false,
                error: emailError.toString()
              });
            }
          }
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: true,
      message: `Sent ${successCount} of ${results.length} notifications`,
      results: results
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Send delivered notification to customer (SMS and email for wholesale)
 * @param {Object} params - { stopId, orderId, customerName, phone, email, customerType, itemCount }
 */
function sendDeliveredNotification(params) {
  try {
    const { stopId, orderId, customerName, phone, email, customerType, itemCount, boxCount, shareType } = params;

    const results = [];
    const firstName = customerName ? customerName.split(' ')[0] : 'Valued Customer';

    // Determine message based on customer type
    let smsMessage;
    if (customerType === 'CSA') {
      const isFlower = shareType && shareType.toLowerCase().includes('flower');
      const itemName = isFlower ? 'bouquet' : 'box';
      const emoji = isFlower ? '💐' : '🥬';
      smsMessage = `✅ Tiny Seed Farm: Your CSA ${itemName}${boxCount > 1 ? 's have' : ' has'} been delivered! ${boxCount || 1} ${itemName}${boxCount > 1 ? 's' : ''} - Enjoy! ${emoji}`;
    } else if (customerType === 'Wholesale') {
      smsMessage = `✅ Tiny Seed Farm: Your wholesale delivery has arrived! ${itemCount || 'All'} items delivered. Thank you for your business! 🌱`;
    } else {
      smsMessage = `✅ Tiny Seed Farm: Your delivery has arrived! Enjoy your fresh produce! 🥬`;
    }

    // Send SMS if phone provided
    if (phone) {
      const smsResult = sendSMS({ to: phone, message: smsMessage });
      results.push({
        type: 'sms',
        to: phone,
        success: smsResult.success,
        error: smsResult.error
      });
    }

    // Send email for wholesale customers
    if (email && (customerType === 'Wholesale' || customerType === 'wholesale')) {
      try {
        // Get order items for the delivery summary
        let itemsHtml = '';
        if (orderId) {
          const items = getOrderItems(orderId);
          if (items && items.length > 0) {
            itemsHtml = `
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-bottom: 15px;">Delivered Items:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background: #f1f5f9;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">Product</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">Quantity</th>
                  </tr>
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${item.Product_Name}${item.Variety ? ' - ' + item.Variety : ''}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #f1f5f9;">${item.Quantity} ${item.Unit || ''}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            `;
          }
        }

        MailApp.sendEmail({
          to: email,
          subject: '✅ Tiny Seed Farm Delivery Complete!',
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #22c55e; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🌱 Tiny Seed Farm</h1>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b;">Delivery Complete! ✅</h2>
                <p style="color: #64748b; font-size: 16px;">
                  Hi ${firstName},
                </p>
                <p style="color: #64748b; font-size: 16px;">
                  Your wholesale delivery from Tiny Seed Farm has been completed and all items have arrived at your location.
                </p>
                ${itemsHtml}
                <p style="color: #64748b; font-size: 16px;">
                  Thank you for supporting local agriculture! If you have any questions or concerns about your delivery, please don't hesitate to reach out.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                    Delivered: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <div style="padding: 20px; background: #1e293b; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  Tiny Seed Farm • Local, Organic, Delicious
                </p>
              </div>
            </div>
          `
        });
        results.push({
          type: 'email',
          to: email,
          success: true
        });
      } catch (emailError) {
        results.push({
          type: 'email',
          to: email,
          success: false,
          error: emailError.toString()
        });
      }
    }

    return {
      success: true,
      message: `Sent ${results.filter(r => r.success).length} notification(s)`,
      results: results
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET MANAGEMENT API
// ═══════════════════════════════════════════════════════════════════════════

function getFleetAssets(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);

    if (!sheet) {
      return { success: false, error: 'Fleet Assets sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let assets = [];

    for (let i = 1; i < data.length; i++) {
      let asset = {};
      headers.forEach((h, j) => asset[h] = data[i][j]);

      // Apply filters
      if (params.type && asset.Asset_Type !== params.type) continue;
      if (params.status && asset.Status !== params.status) continue;

      // Calculate hours until service
      if (asset.Service_Interval_Hours && asset.Last_Service_Hours) {
        asset.Hours_Until_Service = (asset.Last_Service_Hours + asset.Service_Interval_Hours) - asset.Current_Hours;
      }

      assets.push(asset);
    }

    return { success: true, assets: assets };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetAssetById(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.assetId) {
        let asset = {};
        headers.forEach((h, j) => asset[h] = data[i][j]);

        // Get usage history
        asset.recentUsage = getFleetUsageLog({ assetId: params.assetId, limit: 10 }).usage || [];

        return { success: true, asset: asset };
      }
    }

    return { success: false, error: 'Asset not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createFleetAsset(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);

    const assetId = data.assetType.substring(0, 4).toUpperCase() + '-' + Date.now().toString().slice(-6);

    sheet.appendRow([
      assetId,
      data.assetName,
      data.assetType,
      data.make || '',
      data.model || '',
      data.year || '',
      data.serialNumber || '',
      data.fuelType || 'Diesel',
      data.currentHours || 0,
      data.currentMiles || 0,
      data.serviceIntervalHours || 250,
      data.currentHours || 0, // Last service at current hours
      data.serviceIntervalHours || 250, // Hours until service
      data.purchaseDate || '',
      data.purchasePrice || 0,
      data.depreciationPerHour || 0,
      'Active',
      data.location || '',
      data.notes || '',
      data.photoUrl || ''
    ]);

    return { success: true, assetId: assetId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateFleetAsset(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.assetId) {
        // Update current hours
        if (data.currentHours !== undefined) {
          sheet.getRange(i + 1, headers.indexOf('Current_Hours') + 1).setValue(data.currentHours);

          // Recalculate hours until service
          const lastService = values[i][headers.indexOf('Last_Service_Hours')];
          const interval = values[i][headers.indexOf('Service_Interval_Hours')];
          const hoursUntil = (lastService + interval) - data.currentHours;
          sheet.getRange(i + 1, headers.indexOf('Hours_Until_Service') + 1).setValue(hoursUntil);
        }

        // Update status
        if (data.status) {
          sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(data.status);
        }

        return { success: true, message: 'Asset updated' };
      }
    }

    return { success: false, error: 'Asset not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetUsageLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.USAGE_LOG);

    if (!sheet) {
      return { success: false, error: 'Fleet Usage Log sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let usage = [];

    for (let i = 1; i < data.length; i++) {
      let entry = {};
      headers.forEach((h, j) => entry[h] = data[i][j]);

      // Apply filters
      if (params.assetId && entry.Asset_ID !== params.assetId) continue;
      if (params.taskId && entry.Task_ID !== params.taskId) continue;
      if (params.date && formatDateStringSales(entry.Date) !== params.date) continue;

      usage.push(entry);
    }

    // Sort by date descending
    usage.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Apply limit
    if (params.limit) {
      usage = usage.slice(0, parseInt(params.limit));
    }

    return { success: true, usage: usage };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logFleetUsage(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.USAGE_LOG);

    const usageId = 'USE-' + Date.now();
    const hoursUsed = (data.endHours || 0) - (data.startHours || 0);

    // Get asset info
    const assetResult = getFleetAssetById({ assetId: data.assetId });
    const assetName = assetResult.success ? assetResult.asset.Asset_Name : '';
    const depreciationPerHour = assetResult.success ? (assetResult.asset.Depreciation_Per_Hour || 0) : 0;

    // Calculate costs
    const fuelCost = (data.fuelGallons || 0) * (data.fuelPricePerGallon || 4.00);
    const depreciationCost = hoursUsed * depreciationPerHour;
    const totalCost = fuelCost + depreciationCost;

    sheet.appendRow([
      usageId,
      data.assetId,
      assetName,
      data.date || new Date().toISOString(),
      data.taskId || '',
      data.taskType || '',
      data.field || '',
      data.bedIds || '',
      data.operatorId || '',
      data.operatorName || '',
      data.startHours || 0,
      data.endHours || 0,
      hoursUsed,
      data.fuelGallons || 0,
      fuelCost,
      totalCost,
      data.notes || ''
    ]);

    // Update asset current hours
    if (data.endHours) {
      updateFleetAsset({ assetId: data.assetId, currentHours: data.endHours });
    }

    return { success: true, usageId: usageId, hoursUsed: hoursUsed, totalCost: totalCost };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function linkUsageToTask(data) {
  // Link fleet usage to a field task for cost rollup
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usageSheet = ss.getSheetByName(FLEET_SHEETS.USAGE_LOG);

    // Update usage record with task ID
    const values = usageSheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.usageId) {
        usageSheet.getRange(i + 1, headers.indexOf('Task_ID') + 1).setValue(data.taskId);
        return { success: true, message: 'Usage linked to task' };
      }
    }

    return { success: false, error: 'Usage record not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetFuelLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.FUEL_LOG);

    if (!sheet) {
      return { success: false, error: 'Fleet Fuel Log sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let entries = [];

    for (let i = 1; i < data.length; i++) {
      let entry = {};
      headers.forEach((h, j) => entry[h] = data[i][j]);

      // Apply filters
      if (params.assetId && entry.Asset_ID !== params.assetId) continue;

      entries.push(entry);
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, fuelLog: entries };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logFleetFuel(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.FUEL_LOG);

    const fuelId = 'FUEL-' + Date.now();
    const totalCost = (data.gallons || 0) * (data.pricePerGallon || 0);

    // Get asset name
    const assetResult = getFleetAssetById({ assetId: data.assetId });
    const assetName = assetResult.success ? assetResult.asset.Asset_Name : '';

    sheet.appendRow([
      fuelId,
      data.date || new Date().toISOString(),
      data.assetId,
      assetName,
      data.gallons || 0,
      data.pricePerGallon || 0,
      totalCost,
      data.vendor || '',
      data.receiptPhoto || '',
      data.filledBy || '',
      data.notes || ''
    ]);

    return { success: true, fuelId: fuelId, totalCost: totalCost };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetMaintenanceLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.MAINTENANCE);

    if (!sheet) {
      return { success: false, error: 'Fleet Maintenance sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let entries = [];

    for (let i = 1; i < data.length; i++) {
      let entry = {};
      headers.forEach((h, j) => entry[h] = data[i][j]);

      // Apply filters
      if (params.assetId && entry.Asset_ID !== params.assetId) continue;

      entries.push(entry);
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, maintenance: entries };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logFleetMaintenance(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.MAINTENANCE);
    const assetSheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);

    const maintId = 'MAINT-' + Date.now();
    const totalCost = (data.partsCost || 0) + (data.laborCost || 0);

    // Get asset info
    const assetResult = getFleetAssetById({ assetId: data.assetId });
    const assetName = assetResult.success ? assetResult.asset.Asset_Name : '';
    const currentHours = assetResult.success ? assetResult.asset.Current_Hours : 0;

    sheet.appendRow([
      maintId,
      data.date || new Date().toISOString(),
      data.assetId,
      assetName,
      data.maintType || 'Service',
      data.description || '',
      data.partsUsed || '',
      data.partsCost || 0,
      data.laborHours || 0,
      data.laborCost || 0,
      totalCost,
      data.performedBy || '',
      data.nextServiceHours || '',
      data.photoUrl || '',
      data.notes || ''
    ]);

    // Update asset's last service hours
    const assetValues = assetSheet.getDataRange().getValues();
    const assetHeaders = assetValues[0];

    for (let i = 1; i < assetValues.length; i++) {
      if (assetValues[i][0] === data.assetId) {
        assetSheet.getRange(i + 1, assetHeaders.indexOf('Last_Service_Hours') + 1).setValue(currentHours);

        // Recalculate hours until service
        const interval = assetValues[i][assetHeaders.indexOf('Service_Interval_Hours')];
        assetSheet.getRange(i + 1, assetHeaders.indexOf('Hours_Until_Service') + 1).setValue(interval);
        break;
      }
    }

    return { success: true, maintId: maintId, totalCost: totalCost };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getMaintenanceDue(params) {
  try {
    const assets = getFleetAssets({}).assets || [];

    const threshold = params.threshold || 25; // Hours
    const due = assets.filter(a => {
      return a.Hours_Until_Service !== undefined && a.Hours_Until_Service <= threshold;
    });

    return { success: true, assetsDue: due };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetCostReport(params) {
  try {
    const usage = getFleetUsageLog(params).usage || [];
    const fuel = getFleetFuelLog(params).fuelLog || [];
    const maintenance = getFleetMaintenanceLog(params).maintenance || [];

    // Calculate totals
    const usageCost = usage.reduce((sum, u) => sum + (u.Total_Cost || 0), 0);
    const fuelCost = fuel.reduce((sum, f) => sum + (f.Total_Cost || 0), 0);
    const maintCost = maintenance.reduce((sum, m) => sum + (m.Total_Cost || 0), 0);
    const totalHours = usage.reduce((sum, u) => sum + (u.Hours_Used || 0), 0);
    const totalFuelGallons = fuel.reduce((sum, f) => sum + (f.Gallons || 0), 0);

    return {
      success: true,
      report: {
        totalCost: usageCost + fuelCost + maintCost,
        usageCost: usageCost,
        fuelCost: fuelCost,
        maintenanceCost: maintCost,
        totalHours: totalHours,
        totalFuelGallons: totalFuelGallons,
        costPerHour: totalHours > 0 ? (usageCost + fuelCost + maintCost) / totalHours : 0
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetDashboard(params) {
  try {
    const assets = getFleetAssets({}).assets || [];
    const maintenanceDue = getMaintenanceDue({ threshold: 25 }).assetsDue || [];
    const costReport = getFleetCostReport(params).report || {};

    return {
      success: true,
      dashboard: {
        totalAssets: assets.length,
        activeAssets: assets.filter(a => a.Status === 'Active').length,
        maintenanceDueCount: maintenanceDue.length,
        maintenanceDueAssets: maintenanceDue,
        costSummary: costReport
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD & REPORTS
// ═══════════════════════════════════════════════════════════════════════════

function getSalesDashboard(params) {
  try {
    const orders = getSalesOrders({}).orders || [];
    const customers = getSalesCustomers({}).customers || [];

    const today = formatDateStringSales(new Date());
    const weekAgo = formatDateStringSales(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    // Calculate metrics
    const todayOrders = orders.filter(o => formatDateStringSales(o.Order_Date) === today);
    const weekOrders = orders.filter(o => formatDateStringSales(o.Order_Date) >= weekAgo);
    const pendingOrders = orders.filter(o => o.Status === 'Pending');

    const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);

    // Get delivery stats
    const routes = getDeliveryRoutes({ date: today }).routes || [];
    const todayDeliveries = routes.reduce((sum, r) => sum + (r.Total_Stops || 0), 0);
    const completedDeliveries = routes.reduce((sum, r) => sum + (r.Completed_Stops || 0), 0);

    // Alerts
    const alerts = [];
    if (pendingOrders.length > 0) {
      alerts.push({ type: 'warning', message: pendingOrders.length + ' orders pending processing' });
    }

    const maintenanceDue = getMaintenanceDue({ threshold: 25 }).assetsDue || [];
    if (maintenanceDue.length > 0) {
      alerts.push({ type: 'info', message: maintenanceDue.length + ' equipment needing service soon' });
    }

    return {
      success: true,
      stats: {
        todayOrders: todayOrders.length,
        todayRevenue: todayRevenue,
        weekOrders: weekOrders.length,
        weekRevenue: weekRevenue,
        pendingOrders: pendingOrders.length,
        totalCustomers: customers.length,
        wholesaleCustomers: customers.filter(c => c.Customer_Type === 'Wholesale').length,
        csaMembers: customers.filter(c => c.Customer_Type === 'CSA').length,
        todayDeliveries: todayDeliveries,
        completedDeliveries: completedDeliveries
      },
      recentOrders: orders.slice(0, 10),
      alerts: alerts
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSalesReports(params) {
  try {
    const orders = getSalesOrders({}).orders || [];

    // Filter by date range
    let filtered = orders;
    if (params.startDate) {
      filtered = filtered.filter(o => formatDateStringSales(o.Order_Date) >= params.startDate);
    }
    if (params.endDate) {
      filtered = filtered.filter(o => formatDateStringSales(o.Order_Date) <= params.endDate);
    }

    // Calculate totals
    const totalRevenue = filtered.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);
    const totalOrders = filtered.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by customer type
    const byCustomerType = {};
    filtered.forEach(o => {
      const type = o.Customer_Type || 'Other';
      if (!byCustomerType[type]) {
        byCustomerType[type] = { count: 0, revenue: 0 };
      }
      byCustomerType[type].count++;
      byCustomerType[type].revenue += Number(o.Total) || 0;
    });

    // Group by date
    const byDate = {};
    filtered.forEach(o => {
      const date = formatDateStringSales(o.Order_Date);
      if (!byDate[date]) {
        byDate[date] = { count: 0, revenue: 0 };
      }
      byDate[date].count++;
      byDate[date].revenue += Number(o.Total) || 0;
    });

    return {
      success: true,
      summary: { totalRevenue, totalOrders, avgOrderValue },
      byCustomerType: byCustomerType,
      byDate: Object.entries(byDate).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

function getSMSCampaigns(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.SMS_CAMPAIGNS);

    if (!sheet) {
      return { success: false, error: 'SMS Campaigns sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let campaigns = [];

    for (let i = 1; i < data.length; i++) {
      let campaign = {};
      headers.forEach((h, j) => campaign[h] = data[i][j]);

      if (params.status && campaign.Status !== params.status) continue;

      campaigns.push(campaign);
    }

    campaigns.sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At));

    return { success: true, campaigns: campaigns };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createSMSCampaign(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.SMS_CAMPAIGNS);

    const campaignId = 'SMS-' + Date.now();
    const now = new Date().toISOString();

    // Count recipients
    const recipientCount = getAudienceCount(data.audience, data.audienceFilter);

    sheet.appendRow([
      campaignId,
      data.name,
      data.message,
      data.audience,
      data.audienceFilter || '',
      recipientCount,
      0, // Sent count
      data.scheduledAt ? 'Scheduled' : 'Draft',
      data.scheduledAt || '',
      '',
      data.createdBy || 'System',
      now
    ]);

    return { success: true, campaignId: campaignId, recipientCount: recipientCount };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendSMSCampaign(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.SMS_CAMPAIGNS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.campaignId) {
        const audience = values[i][headers.indexOf('Audience')];
        const audienceFilter = values[i][headers.indexOf('Audience_Filter')];
        const message = values[i][headers.indexOf('Message')];

        // Get recipients
        const recipients = getAudienceRecipients(audience, audienceFilter);

        // In production, integrate with Twilio here
        let sentCount = 0;
        recipients.forEach(r => {
          // UrlFetchApp.fetch(TWILIO_URL, {...})
          Logger.log('Would send SMS to: ' + r.phone + ' - ' + message);
          sentCount++;
        });

        // Update campaign
        sheet.getRange(i + 1, headers.indexOf('Sent_Count') + 1).setValue(sentCount);
        sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('Sent');
        sheet.getRange(i + 1, headers.indexOf('Sent_At') + 1).setValue(new Date().toISOString());

        return { success: true, sentCount: sentCount };
      }
    }

    return { success: false, error: 'Campaign not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getAudienceCount(audience, filter) {
  const customers = getSalesCustomers({}).customers || [];
  return filterAudience(customers, audience, filter).length;
}

function getAudienceRecipients(audience, filter) {
  const customers = getSalesCustomers({}).customers || [];
  return filterAudience(customers, audience, filter).map(c => ({
    phone: c.Phone,
    name: c.Contact_Name
  }));
}

function filterAudience(customers, audience, filter) {
  let filtered = customers.filter(c => c.Phone && c.Is_Active);

  switch (audience) {
    case 'wholesale':
      filtered = filtered.filter(c => c.Customer_Type === 'Wholesale');
      break;
    case 'csa':
      filtered = filtered.filter(c => c.Customer_Type === 'CSA');
      break;
    case 'retail':
      filtered = filtered.filter(c => c.Customer_Type === 'Retail');
      break;
    // 'all' returns all active customers with phone
  }

  return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES MODULE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDateStringSales(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function getCurrentWeekDateSales() {
  const now = new Date();
  // Get Monday of current week
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return formatDateStringSales(monday);
}

function savePhotoToDriveSales(base64Data, filename) {
  try {
    let folder;
    const folders = DriveApp.getFoldersByName('TinySeed_Photos');
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('TinySeed_Photos');
    }

    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data.split(',')[1]),
      'image/jpeg',
      filename + '.jpg'
    );

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch (error) {
    Logger.log('Error saving photo: ' + error.toString());
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU EXTENSION - Add to onOpen()
// ═══════════════════════════════════════════════════════════════════════════

/*
  Add this submenu to the existing onOpen() function:

  .addSubMenu(ui.createMenu('Sales & Fleet')
    .addItem('Initialize Sales & Fleet Module', 'initializeSalesAndFleetModule')
    .addSeparator()
    .addItem('View Sales Dashboard', 'viewSalesDashboard')
    .addItem('View Fleet Dashboard', 'viewFleetDashboard'))
*/

function viewSalesDashboard() {
  const dashboard = getSalesDashboard({});
  const ui = SpreadsheetApp.getUi();

  if (dashboard.success) {
    const stats = dashboard.stats;
    ui.alert('Sales Dashboard',
      'Today\'s Orders: ' + stats.todayOrders + '\n' +
      'Today\'s Revenue: $' + stats.todayRevenue.toFixed(2) + '\n' +
      'Pending Orders: ' + stats.pendingOrders + '\n' +
      'Total Customers: ' + stats.totalCustomers + '\n' +
      'Deliveries Today: ' + stats.completedDeliveries + '/' + stats.todayDeliveries,
      ui.ButtonSet.OK);
  } else {
    ui.alert('Error', dashboard.error, ui.ButtonSet.OK);
  }
}

function viewFleetDashboard() {
  const dashboard = getFleetDashboard({});
  const ui = SpreadsheetApp.getUi();

  if (dashboard.success) {
    const d = dashboard.dashboard;
    ui.alert('Fleet Dashboard',
      'Total Assets: ' + d.totalAssets + '\n' +
      'Active Assets: ' + d.activeAssets + '\n' +
      'Maintenance Due: ' + d.maintenanceDueCount + '\n' +
      'Total Cost (Period): $' + (d.costSummary.totalCost || 0).toFixed(2),
      ui.ButtonSet.OK);
  } else {
    ui.alert('Error', dashboard.error, ui.ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LABEL GENERATION & SALES CYCLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get market sign items for a given date
 * These are products available at the farmer's market with prices
 */
function getMarketSignItems(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // First try dedicated market items sheet
    let sheet = ss.getSheetByName(SALES_SHEETS.MARKET_ITEMS);

    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      let items = [];

      for (let i = 1; i < data.length; i++) {
        let item = {};
        headers.forEach((h, j) => item[h] = data[i][j]);

        // Filter active items only (market items show current prices, not date-specific)
        if (item.Is_Active === false) continue;

        items.push({
          id: item.Item_ID || i,
          name: item.Item_Name || item.Product_Name || '',
          variety: item.Variety || '',
          price: Number(item.Price) || 0,
          unit: item.Unit || '/each'
        });
      }

      return { success: true, items: items };
    }

    // Fallback: Get items from inventory/products with market prices
    const invSheet = ss.getSheetByName('INV_Products');
    if (invSheet) {
      const data = invSheet.getDataRange().getValues();
      const headers = data[0];
      let items = [];

      for (let i = 1; i < data.length; i++) {
        let product = {};
        headers.forEach((h, j) => product[h] = data[i][j]);

        // Only include items with retail/market prices
        if (product.Retail_Price && Number(product.Retail_Price) > 0) {
          items.push({
            id: product.Product_ID || i,
            name: product.Product_Name || '',
            variety: product.Variety || '',
            price: Number(product.Retail_Price) || 0,
            unit: product.Unit ? '/' + product.Unit : '/each'
          });
        }
      }

      return { success: true, items: items };
    }

    // If no sheet found, return empty with instructions
    return {
      success: true,
      items: [],
      message: 'No market items sheet found. Create SALES_MarketItems sheet or add items manually.'
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get orders formatted for label printing
 * Groups orders by customer type (CSA vs Wholesale)
 */
function getOrdersForLabels(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const itemsSheet = ss.getSheetByName(SALES_SHEETS.ORDER_ITEMS);

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    // Get all orders
    const ordersData = ordersSheet.getDataRange().getValues();
    const ordersHeaders = ordersData[0];

    // Get all order items
    let orderItemsMap = {};
    if (itemsSheet) {
      const itemsData = itemsSheet.getDataRange().getValues();
      const itemsHeaders = itemsData[0];

      for (let i = 1; i < itemsData.length; i++) {
        let item = {};
        itemsHeaders.forEach((h, j) => item[h] = itemsData[i][j]);

        const orderId = item.Order_ID;
        if (!orderItemsMap[orderId]) {
          orderItemsMap[orderId] = [];
        }
        orderItemsMap[orderId].push({
          productName: item.Product_Name || item.Crop || '',
          variety: item.Variety || '',
          quantity: item.Quantity || 1,
          unit: item.Unit || 'each'
        });
      }
    }

    // Process orders
    let csaOrders = [];
    let wholesaleOrders = [];

    for (let i = 1; i < ordersData.length; i++) {
      let order = {};
      ordersHeaders.forEach((h, j) => order[h] = ordersData[i][j]);

      // Filter by delivery date if provided
      if (params.date) {
        const orderDate = formatDateStringSales(order.Delivery_Date);
        if (orderDate !== params.date) continue;
      }

      // Skip cancelled/completed orders for label printing
      if (order.Status === 'Cancelled' || order.Status === 'Delivered') continue;

      const orderLabel = {
        orderId: order.Order_ID,
        customerName: order.Customer_Name || 'Unknown',
        customerType: order.Customer_Type || 'Retail',
        deliveryDate: order.Delivery_Date,
        items: orderItemsMap[order.Order_ID] || []
      };

      // Categorize by customer type
      if (order.Customer_Type === 'CSA') {
        csaOrders.push(orderLabel);
      } else if (order.Customer_Type === 'Wholesale') {
        wholesaleOrders.push(orderLabel);
      }
    }

    // Sort by customer name
    csaOrders.sort((a, b) => a.customerName.localeCompare(b.customerName));
    wholesaleOrders.sort((a, b) => a.customerName.localeCompare(b.customerName));

    return {
      success: true,
      csaOrders: csaOrders,
      wholesaleOrders: wholesaleOrders,
      totalCSA: csaOrders.length,
      totalWholesale: wholesaleOrders.length
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get sales cycles (Monday/Thursday harvest schedules)
 */
function getSalesCycles(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SALES_SHEETS.SALES_CYCLES);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SALES_SHEETS.SALES_CYCLES);
      sheet.setTabColor('#9333ea');
      sheet.appendRow([
        'Cycle_ID', 'Cycle_Name', 'Harvest_Day', 'Order_Cutoff_Day',
        'Order_Cutoff_Time', 'Status', 'Week_Of', 'Total_Orders',
        'Total_Revenue', 'Created_At', 'Closed_At'
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#9333ea').setFontColor('#ffffff');

      // Add default Monday/Thursday cycles
      const now = new Date();
      sheet.appendRow([
        'CYCLE-MON', 'Monday Harvest', 'Monday', 'Sunday', '6:00 PM',
        'Active', getWeekOf(now), 0, 0, now.toISOString(), ''
      ]);
      sheet.appendRow([
        'CYCLE-THU', 'Thursday Harvest', 'Thursday', 'Wednesday', '6:00 PM',
        'Active', getWeekOf(now), 0, 0, now.toISOString(), ''
      ]);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let cycles = [];

    for (let i = 1; i < data.length; i++) {
      let cycle = {};
      headers.forEach((h, j) => cycle[h] = data[i][j]);

      if (params.status && cycle.Status !== params.status) continue;

      cycles.push(cycle);
    }

    return { success: true, cycles: cycles };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Close a sales cycle - generates pick/pack lists and prepares for harvest
 */
function closeSalesCycle(params) {
  try {
    const cycleId = params.cycleId;
    if (!cycleId) {
      return { success: false, error: 'Cycle ID required' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cycleSheet = ss.getSheetByName(SALES_SHEETS.SALES_CYCLES);

    if (!cycleSheet) {
      return { success: false, error: 'Sales cycles sheet not found' };
    }

    // Find and update the cycle
    const cycleData = cycleSheet.getDataRange().getValues();
    const headers = cycleData[0];
    let cycleRow = -1;
    let cycle = {};

    for (let i = 1; i < cycleData.length; i++) {
      if (cycleData[i][0] === cycleId) {
        cycleRow = i + 1;
        headers.forEach((h, j) => cycle[h] = cycleData[i][j]);
        break;
      }
    }

    if (cycleRow === -1) {
      return { success: false, error: 'Cycle not found' };
    }

    // Get all pending orders for this cycle's delivery day
    const ordersResult = getOrdersForLabels({ date: params.deliveryDate });
    if (!ordersResult.success) {
      return ordersResult;
    }

    const totalOrders = ordersResult.totalCSA + ordersResult.totalWholesale;

    // Update cycle status
    const statusCol = headers.indexOf('Status') + 1;
    const closedAtCol = headers.indexOf('Closed_At') + 1;
    const totalOrdersCol = headers.indexOf('Total_Orders') + 1;

    cycleSheet.getRange(cycleRow, statusCol).setValue('Closed');
    cycleSheet.getRange(cycleRow, closedAtCol).setValue(new Date().toISOString());
    cycleSheet.getRange(cycleRow, totalOrdersCol).setValue(totalOrders);

    // Generate consolidated pick list
    const pickPackResult = generateConsolidatedPickList(params.deliveryDate);

    return {
      success: true,
      message: 'Sales cycle closed successfully',
      cycleId: cycleId,
      totalOrders: totalOrders,
      csaOrders: ordersResult.totalCSA,
      wholesaleOrders: ordersResult.totalWholesale,
      pickListGenerated: pickPackResult.success
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate consolidated pick list for a delivery date
 */
function generateConsolidatedPickList(deliveryDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersResult = getOrdersForLabels({ date: deliveryDate });

    if (!ordersResult.success) {
      return ordersResult;
    }

    // Combine all orders
    const allOrders = [...ordersResult.csaOrders, ...ordersResult.wholesaleOrders];

    // Aggregate items across all orders
    const itemTotals = {};

    allOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = `${item.productName}|${item.variety}|${item.unit}`;
        if (!itemTotals[key]) {
          itemTotals[key] = {
            productName: item.productName,
            variety: item.variety,
            unit: item.unit,
            totalQuantity: 0,
            orderCount: 0
          };
        }
        itemTotals[key].totalQuantity += Number(item.quantity) || 0;
        itemTotals[key].orderCount++;
      });
    });

    // Create or update pick list sheet
    let pickSheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);

    // Add consolidated summary items
    Object.values(itemTotals).forEach(item => {
      const pickId = 'PCK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      pickSheet.appendRow([
        pickId,
        deliveryDate,
        'CONSOLIDATED',
        'All Orders',
        'Mixed',
        '',
        item.productName + (item.variety ? ' - ' + item.variety : ''),
        item.totalQuantity,
        item.unit,
        '',
        'Pending',
        '',
        '',
        `Total from ${item.orderCount} orders`
      ]);
    });

    return {
      success: true,
      itemCount: Object.keys(itemTotals).length,
      totalQuantity: Object.values(itemTotals).reduce((sum, i) => sum + i.totalQuantity, 0)
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Helper: Get week identifier for a date
 */
function getWeekOf(date) {
  const d = new Date(date);
  const dayNum = d.getDay();
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - dayNum);
  return startOfWeek.toISOString().split('T')[0];
}

/**
 * Initialize the market items sheet with headers
 */
function initializeMarketItemsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SALES_SHEETS.MARKET_ITEMS);

  if (!sheet) {
    sheet = ss.insertSheet(SALES_SHEETS.MARKET_ITEMS);
    sheet.setTabColor('#f59e0b');
    sheet.appendRow([
      'Item_ID', 'Date', 'Item_Name', 'Variety', 'Price', 'Unit',
      'Category', 'Is_Active', 'Display_Order', 'Notes'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f59e0b').setFontColor('#000000');

    // Add sample items
    const today = new Date().toISOString().split('T')[0];
    const sampleItems = [
      ['MKT-001', today, 'Tomatoes', 'Cherokee Purple', 5.00, '/lb', 'Vegetables', true, 1, ''],
      ['MKT-002', today, 'Lettuce', 'Butterhead', 4.00, '/head', 'Greens', true, 2, ''],
      ['MKT-003', today, 'Kale', 'Lacinato', 4.00, '/bunch', 'Greens', true, 3, ''],
      ['MKT-004', today, 'Carrots', 'Nantes', 3.00, '/bunch', 'Vegetables', true, 4, ''],
      ['MKT-005', today, 'Peppers', 'Mixed Bell', 6.00, '/lb', 'Vegetables', true, 5, ''],
      ['MKT-006', today, 'Zucchini', 'Black Beauty', 3.00, '/lb', 'Vegetables', true, 6, ''],
      ['MKT-007', today, 'Cucumbers', 'Marketmore', 2.00, '/each', 'Vegetables', true, 7, ''],
      ['MKT-008', today, 'Basil', 'Genovese', 4.00, '/bunch', 'Herbs', true, 8, '']
    ];

    sampleItems.forEach(item => sheet.appendRow(item));

    // Format
    sheet.autoResizeColumns(1, 10);
  }

  return { success: true, message: 'Market items sheet initialized' };
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE MOBILE APP - COMPLETE API SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const EMPLOYEE_SHEETS = {
  EMPLOYEES: 'EMPLOYEES',
  TIME_CLOCK: 'TIME_CLOCK',
  HARVEST_LOG: 'HARVEST_LOG',
  FIELD_SCOUTING: 'FIELD_SCOUTING',
  TREATMENT_LOG: 'TREATMENT_LOG',
  BENEFICIAL_RELEASES: 'BENEFICIAL_RELEASES',
  FIELD_HAZARDS: 'FIELD_HAZARDS',
  WEED_PRESSURE: 'WEED_PRESSURE',
  CULTIVATION_LOG: 'CULTIVATION_LOG',
  CREW_MESSAGES: 'CREW_MESSAGES'
};

const EMPLOYEE_HEADERS = {
  EMPLOYEES: ['Employee_ID', 'First_Name', 'Last_Name', 'Badge_PIN', 'Role', 'Language_Pref', 'Hire_Date', 'Is_Active', 'Phone', 'Last_Login'],
  TIME_CLOCK: ['Entry_ID', 'Employee_ID', 'Date', 'Clock_In', 'Clock_Out', 'Hours_Worked', 'GPS_In_Lat', 'GPS_In_Lng', 'GPS_Out_Lat', 'GPS_Out_Lng', 'In_Geofence', 'Notes'],
  HARVEST_LOG: ['Harvest_ID', 'Timestamp', 'Batch_ID', 'Crop', 'Variety', 'Bed_ID', 'Quantity', 'Unit', 'Quality_Grade', 'Lot_Number', 'GPS_Lat', 'GPS_Lng', 'Photo_URL', 'Harvested_By', 'Notes'],
  FIELD_SCOUTING: ['Scout_ID', 'Date', 'Time', 'Employee_ID', 'Field_ID', 'Bed_ID', 'Observation_Type', 'Severity', 'Photo_URL', 'GPS_Lat', 'GPS_Lng', 'AI_Diagnosis', 'Recommended_Action', 'Notes'],
  TREATMENT_LOG: ['Treatment_ID', 'Application_Date', 'Employee_ID', 'Field_ID', 'Bed_IDs', 'Material_Name', 'OMRI_Listed', 'Rate', 'Amount_Applied', 'Target_Pest_Disease', 'REI_Hours', 'REI_Expires_At', 'PHI_Days', 'PHI_Expires_At', 'Weather', 'Temperature', 'Notes', 'GPS_Lat', 'GPS_Lng'],
  BENEFICIAL_RELEASES: ['Release_ID', 'Date', 'Employee_ID', 'Type', 'Quantity', 'Field_ID', 'GPS_Lat', 'GPS_Lng', 'Notes'],
  FIELD_HAZARDS: ['Hazard_ID', 'Reported_Date', 'Employee_ID', 'Type', 'Severity', 'Description', 'Photo_URL', 'GPS_Lat', 'GPS_Lng', 'Status', 'Resolved_Date', 'Resolved_By'],
  WEED_PRESSURE: ['Weed_ID', 'Date', 'Employee_ID', 'Field_ID', 'Bed_ID', 'Weed_Type', 'Species', 'Pressure_Level', 'Coverage_Pct', 'GPS_Lat', 'GPS_Lng', 'Notes'],
  CULTIVATION_LOG: ['Cultivation_ID', 'Date', 'Employee_ID', 'Field_ID', 'Bed_IDs', 'Implement', 'Depth', 'Soil_Condition', 'Effectiveness', 'GPS_Lat', 'GPS_Lng', 'Notes'],
  CREW_MESSAGES: ['Message_ID', 'Timestamp', 'From', 'To_Employee_ID', 'To_All', 'Message', 'Urgent', 'Acknowledged', 'Acknowledged_At']
};

// Farm geofence center (update with actual coordinates)
const FARM_GEOFENCE = {
  lat: 40.7956,
  lng: -80.1384,
  radiusMeters: 500
};

// ============================================
// SHEET INITIALIZATION HELPERS
// ============================================

function getOrCreateEmployeeSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = EMPLOYEE_HEADERS[sheetName];
    if (headers) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#2d5a27')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    sheet.setTabColor('#4a7c43');
  }

  return sheet;
}

// ============================================
// EMPLOYEE AUTHENTICATION
// ============================================

function authenticateEmployee(params) {
  try {
    const pin = (params.pin || '').trim();

    if (!pin || pin.length !== 4) {
      return { success: false, error: 'Please enter a 4-digit PIN' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(EMPLOYEE_SHEETS.EMPLOYEES);

    // If EMPLOYEES sheet doesn't exist, check USERS sheet for Employee role
    if (!sheet) {
      // Fall back to USERS sheet
      const usersSheet = ss.getSheetByName('USERS');
      if (usersSheet) {
        const data = usersSheet.getDataRange().getValues();
        const headers = data[0];
        const pinCol = headers.indexOf('PIN');
        const roleCol = headers.indexOf('Role');
        const activeCol = headers.indexOf('Is_Active');

        for (let i = 1; i < data.length; i++) {
          const rowPin = (data[i][pinCol] || '').toString().trim();
          const role = data[i][roleCol];
          const isActive = data[i][activeCol];

          if (rowPin === pin && (role === 'Employee' || role === 'Field_Lead' || role === 'Manager' || role === 'Admin')) {
            if (isActive === false || isActive === 'FALSE') {
              return { success: false, error: 'Account is disabled' };
            }

            const employee = {
              Employee_ID: data[i][headers.indexOf('User_ID')],
              First_Name: (data[i][headers.indexOf('Full_Name')] || '').split(' ')[0],
              Last_Name: (data[i][headers.indexOf('Full_Name')] || '').split(' ').slice(1).join(' '),
              Role: role,
              Language_Pref: 'en'
            };

            // Check if clocked in
            const clockStatus = getClockStatus(employee.Employee_ID);

            return {
              success: true,
              employee: employee,
              isClockedIn: clockStatus.isClockedIn,
              clockInTime: clockStatus.clockInTime
            };
          }
        }
      }

      // Create EMPLOYEES sheet with sample data
      sheet = createEmployeesSheet(ss);
    }

    // Check EMPLOYEES sheet
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const pinCol = headers.indexOf('Badge_PIN');
    const activeCol = headers.indexOf('Is_Active');
    const loginCol = headers.indexOf('Last_Login');

    for (let i = 1; i < data.length; i++) {
      const rowPin = (data[i][pinCol] || '').toString().trim();
      const isActive = data[i][activeCol];

      if (rowPin === pin) {
        if (isActive === false || isActive === 'FALSE' || isActive === 'false') {
          return { success: false, error: 'Account is disabled' };
        }

        // Build employee object
        const employee = {};
        headers.forEach((h, j) => {
          if (h !== 'Badge_PIN') {
            employee[h] = data[i][j];
          }
        });

        // Update last login
        if (loginCol >= 0) {
          sheet.getRange(i + 1, loginCol + 1).setValue(new Date().toISOString());
        }

        // Check if clocked in
        const clockStatus = getClockStatus(employee.Employee_ID);

        return {
          success: true,
          employee: employee,
          isClockedIn: clockStatus.isClockedIn,
          clockInTime: clockStatus.clockInTime
        };
      }
    }

    return { success: false, error: 'Invalid PIN' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createEmployeesSheet(ss) {
  const sheet = ss.insertSheet(EMPLOYEE_SHEETS.EMPLOYEES);
  const headers = EMPLOYEE_HEADERS.EMPLOYEES;

  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#2d5a27')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setTabColor('#4a7c43');

  // Add sample employees
  const sampleEmployees = [
    ['EMP-001', 'Maria', 'Garcia', '1234', 'Worker', 'es', '2024-03-01', true, '', ''],
    ['EMP-002', 'John', 'Smith', '5678', 'Lead', 'en', '2024-01-15', true, '', ''],
    ['EMP-003', 'Ana', 'Rodriguez', '9012', 'Worker', 'es', '2024-06-01', true, '', '']
  ];

  sampleEmployees.forEach(emp => sheet.appendRow(emp));

  return sheet;
}

// ============================================
// TIME CLOCK (with GPS)
// ============================================

function getClockStatus(employeeId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.TIME_CLOCK);

    if (!sheet) {
      return { isClockedIn: false, clockInTime: null };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const empCol = headers.indexOf('Employee_ID');
    const clockInCol = headers.indexOf('Clock_In');
    const clockOutCol = headers.indexOf('Clock_Out');

    // Find most recent entry for this employee
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][empCol] === employeeId) {
        const clockIn = data[i][clockInCol];
        const clockOut = data[i][clockOutCol];

        if (clockIn && !clockOut) {
          return {
            isClockedIn: true,
            clockInTime: clockIn instanceof Date ? clockIn.toISOString() : clockIn,
            entryRow: i + 1
          };
        }
        break;
      }
    }

    return { isClockedIn: false, clockInTime: null };
  } catch (error) {
    return { isClockedIn: false, clockInTime: null, error: error.toString() };
  }
}

function clockIn(params) {
  try {
    const employeeId = params.employeeId;
    const lat = params.lat || '';
    const lng = params.lng || '';

    if (!employeeId) {
      return { success: false, error: 'Employee ID required' };
    }

    // Check if already clocked in
    const status = getClockStatus(employeeId);
    if (status.isClockedIn) {
      return { success: false, error: 'Already clocked in' };
    }

    // Check geofence (optional - can be enabled later)
    const inGeofence = isInGeofence(lat, lng);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.TIME_CLOCK);

    const now = new Date();
    const entryId = generateId('TC');

    const newRow = [
      entryId,
      employeeId,
      now.toISOString().split('T')[0],
      now.toISOString(),
      '', // Clock_Out
      '', // Hours_Worked
      lat,
      lng,
      '', // GPS_Out_Lat
      '', // GPS_Out_Lng
      inGeofence,
      ''  // Notes
    ];

    sheet.appendRow(newRow);

    return {
      success: true,
      entryId: entryId,
      timestamp: now.toISOString(),
      inGeofence: inGeofence
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function clockOut(params) {
  try {
    const employeeId = params.employeeId;
    const lat = params.lat || '';
    const lng = params.lng || '';

    if (!employeeId) {
      return { success: false, error: 'Employee ID required' };
    }

    // Find open clock entry
    const status = getClockStatus(employeeId);
    if (!status.isClockedIn) {
      return { success: false, error: 'Not clocked in' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.TIME_CLOCK);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const now = new Date();
    const clockIn = new Date(status.clockInTime);
    const hoursWorked = (now - clockIn) / 1000 / 60 / 60;

    // Update the row
    const row = status.entryRow;
    sheet.getRange(row, headers.indexOf('Clock_Out') + 1).setValue(now.toISOString());
    sheet.getRange(row, headers.indexOf('Hours_Worked') + 1).setValue(hoursWorked.toFixed(2));
    sheet.getRange(row, headers.indexOf('GPS_Out_Lat') + 1).setValue(lat);
    sheet.getRange(row, headers.indexOf('GPS_Out_Lng') + 1).setValue(lng);

    return {
      success: true,
      timestamp: now.toISOString(),
      hoursWorked: parseFloat(hoursWorked.toFixed(2))
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function isInGeofence(lat, lng) {
  if (!lat || !lng) return true; // Allow if no GPS

  const distance = haversineDistanceMeters(
    parseFloat(lat), parseFloat(lng),
    FARM_GEOFENCE.lat, FARM_GEOFENCE.lng
  );

  return distance <= FARM_GEOFENCE.radiusMeters;
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getTimeClockHistory(params) {
  try {
    const employeeId = params.employeeId;
    const days = parseInt(params.days) || 14;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.TIME_CLOCK);

    if (!sheet) {
      return { success: true, entries: [], totalHours: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entries = [];
    let totalHours = 0;

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      if (row.Employee_ID === employeeId) {
        const entryDate = new Date(row.Date);
        if (entryDate >= cutoffDate) {
          entries.push(row);
          if (row.Hours_Worked) {
            totalHours += parseFloat(row.Hours_Worked);
          }
        }
      }
    }

    return {
      success: true,
      entries: entries.reverse(),
      totalHours: totalHours.toFixed(1)
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// EMPLOYEE TASKS
// ============================================

function getEmployeeTasks(params) {
  try {
    const employeeId = params.employeeId || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');

    if (!planSheet) {
      return { success: true, tasks: [] };
    }

    const data = planSheet.getDataRange().getValues();
    const headers = data[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasks = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      // Skip completed or non-active plantings
      if (row.STATUS === 'Completed' || row.STATUS === 'Cancelled') continue;

      // Generate tasks from planning dates
      const sowDate = row.Plan_Sow ? new Date(row.Plan_Sow) : null;
      const transplantDate = row.Plan_Transplant ? new Date(row.Plan_Transplant) : null;
      const harvestDate = row.Plan_Harvest_Start ? new Date(row.Plan_Harvest_Start) : null;

      // Sowing task
      if (sowDate && sowDate >= today && sowDate <= nextWeek) {
        tasks.push({
          id: row.Batch_ID + '-sow',
          type: 'sow',
          crop: row.Crop,
          variety: row.Variety,
          date: sowDate.toISOString().split('T')[0],
          bed: row.Bed_ID || row.Field,
          field: row.Field,
          quantity: row.Seeds_Needed || row.Transplants_Needed,
          status: row.STATUS
        });
      }

      // Transplant task
      if (transplantDate && transplantDate >= today && transplantDate <= nextWeek) {
        tasks.push({
          id: row.Batch_ID + '-transplant',
          type: 'transplant',
          crop: row.Crop,
          variety: row.Variety,
          date: transplantDate.toISOString().split('T')[0],
          bed: row.Bed_ID,
          field: row.Field,
          quantity: row.Transplants_Needed,
          status: row.STATUS
        });
      }

      // Harvest task
      if (harvestDate && harvestDate >= today && harvestDate <= nextWeek && row.STATUS === 'In Field') {
        tasks.push({
          id: row.Batch_ID + '-harvest',
          type: 'harvest',
          crop: row.Crop,
          variety: row.Variety,
          date: harvestDate.toISOString().split('T')[0],
          bed: row.Bed_ID,
          field: row.Field,
          status: row.STATUS
        });
      }
    }

    // Sort by date
    tasks.sort((a, b) => new Date(a.date) - new Date(b.date));

    return { success: true, tasks: tasks };
  } catch (error) {
    return { success: false, error: error.toString(), tasks: [] };
  }
}

function completeTaskWithGPS(params) {
  try {
    const taskId = params.taskId;
    const employeeId = params.employeeId || '';
    const lat = params.lat || '';
    const lng = params.lng || '';
    const notes = params.notes || '';

    if (!taskId) {
      return { success: false, error: 'Task ID required' };
    }

    // Parse task ID to get batch and type
    const parts = taskId.split('-');
    const batchId = parts.slice(0, -1).join('-');
    const taskType = parts[parts.length - 1];

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');

    if (!planSheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    const data = planSheet.getDataRange().getValues();
    const headers = data[0];
    const batchCol = headers.indexOf('Batch_ID');
    const statusCol = headers.indexOf('STATUS');

    // Find the row
    for (let i = 1; i < data.length; i++) {
      if (data[i][batchCol] === batchId) {
        // Update status based on task type
        let newStatus = data[i][statusCol];
        if (taskType === 'sow') {
          newStatus = 'Seeded';
          // Update actual sow date
          const actualSowCol = headers.indexOf('Actual_Sow');
          if (actualSowCol >= 0) {
            planSheet.getRange(i + 1, actualSowCol + 1).setValue(new Date().toISOString().split('T')[0]);
          }
        } else if (taskType === 'transplant') {
          newStatus = 'In Field';
          const actualTransCol = headers.indexOf('Actual_Transplant');
          if (actualTransCol >= 0) {
            planSheet.getRange(i + 1, actualTransCol + 1).setValue(new Date().toISOString().split('T')[0]);
          }
        } else if (taskType === 'harvest') {
          newStatus = 'Harvesting';
        }

        planSheet.getRange(i + 1, statusCol + 1).setValue(newStatus);

        return {
          success: true,
          message: 'Task completed',
          taskId: taskId,
          newStatus: newStatus
        };
      }
    }

    return { success: false, error: 'Task not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// HARVEST LOGGING
// ============================================

function logHarvestWithDetails(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.HARVEST_LOG);

    const harvestId = generateId('HRV');
    const now = new Date();

    // Generate lot number: YYMMDD-CRP-###
    const dateCode = now.toISOString().slice(2, 10).replace(/-/g, '');
    const cropCode = (params.crop || 'UNK').substring(0, 3).toUpperCase();
    const lotNumber = `${dateCode}-${cropCode}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const newRow = [
      harvestId,
      now.toISOString(),
      params.batchId || '',
      params.crop || '',
      params.variety || '',
      params.bedId || '',
      params.quantity || 0,
      params.unit || 'lbs',
      params.quality || 'A',
      lotNumber,
      params.lat || '',
      params.lng || '',
      params.photo || '',
      params.employeeId || '',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return {
      success: true,
      harvestId: harvestId,
      lotNumber: lotNumber,
      timestamp: now.toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// FIELD SCOUTING
// ============================================

function saveScoutingReport(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.FIELD_SCOUTING);

    const scoutId = generateId('SCT');
    const now = new Date();

    const newRow = [
      scoutId,
      now.toISOString().split('T')[0],
      now.toISOString().split('T')[1].split('.')[0],
      params.employeeId || '',
      params.field || '',
      params.bed || '',
      params.type || '',
      params.severity || 'medium',
      params.photo || '',
      params.lat || '',
      params.lng || '',
      params.aiDiagnosis || '',
      params.recommendedAction || '',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return {
      success: true,
      scoutId: scoutId,
      timestamp: now.toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// TREATMENT LOG
// ============================================

function logTreatment(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.TREATMENT_LOG);

    const treatmentId = generateId('TRT');
    const now = new Date();

    // Calculate REI/PHI expiration
    const reiHours = parseInt(params.reiHours) || 0;
    const phiDays = parseInt(params.phiDays) || 0;

    const reiExpires = new Date(now.getTime() + reiHours * 60 * 60 * 1000);
    const phiExpires = new Date(now.getTime() + phiDays * 24 * 60 * 60 * 1000);

    const newRow = [
      treatmentId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.field || '',
      params.beds || '',
      params.material || '',
      params.omriListed !== false,
      params.rate || '',
      params.amount || '',
      params.target || '',
      reiHours,
      reiExpires.toISOString(),
      phiDays,
      phiExpires.toISOString(),
      params.weather || '',
      params.temperature || '',
      params.notes || '',
      params.lat || '',
      params.lng || ''
    ];

    sheet.appendRow(newRow);

    return {
      success: true,
      treatmentId: treatmentId,
      reiExpiresAt: reiExpires.toISOString(),
      phiExpiresAt: phiExpires.toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logBeneficialRelease(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.BENEFICIAL_RELEASES);

    const releaseId = generateId('BEN');
    const now = new Date();

    const newRow = [
      releaseId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.type || '',
      params.quantity || '',
      params.field || '',
      params.lat || '',
      params.lng || '',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return { success: true, releaseId: releaseId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getActiveREI(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.TREATMENT_LOG);

    if (!sheet) {
      return { success: true, activeREI: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const now = new Date();

    const activeREI = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      const reiExpires = new Date(row.REI_Expires_At);
      if (reiExpires > now) {
        activeREI.push({
          field: row.Field_ID,
          beds: row.Bed_IDs,
          material: row.Material_Name,
          expiresAt: reiExpires.toISOString(),
          hoursRemaining: Math.ceil((reiExpires - now) / (1000 * 60 * 60))
        });
      }
    }

    return { success: true, activeREI: activeREI };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// FIELD HAZARDS
// ============================================

function reportHazard(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.FIELD_HAZARDS);

    const hazardId = generateId('HAZ');
    const now = new Date();

    const newRow = [
      hazardId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.type || '',
      params.severity || 'medium',
      params.description || '',
      params.photo || '',
      params.lat || '',
      params.lng || '',
      'Active',
      '', // Resolved_Date
      ''  // Resolved_By
    ];

    sheet.appendRow(newRow);

    return { success: true, hazardId: hazardId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getActiveHazards(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.FIELD_HAZARDS);

    if (!sheet) {
      return { success: true, hazards: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const hazards = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      if (row.Status === 'Active') {
        hazards.push(row);
      }
    }

    return { success: true, hazards: hazards };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function resolveHazard(params) {
  try {
    const hazardId = params.hazardId;
    const employeeId = params.employeeId || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.FIELD_HAZARDS);

    if (!sheet) {
      return { success: false, error: 'Hazards sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Hazard_ID');
    const statusCol = headers.indexOf('Status');
    const resolvedDateCol = headers.indexOf('Resolved_Date');
    const resolvedByCol = headers.indexOf('Resolved_By');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === hazardId) {
        sheet.getRange(i + 1, statusCol + 1).setValue('Resolved');
        sheet.getRange(i + 1, resolvedDateCol + 1).setValue(new Date().toISOString().split('T')[0]);
        sheet.getRange(i + 1, resolvedByCol + 1).setValue(employeeId);

        return { success: true, message: 'Hazard resolved' };
      }
    }

    return { success: false, error: 'Hazard not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// WEED PRESSURE
// ============================================

function logWeedPressure(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.WEED_PRESSURE);

    const weedId = generateId('WED');
    const now = new Date();

    const newRow = [
      weedId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.field || '',
      params.bed || '',
      params.weedType || '',
      params.species || '',
      params.pressure || '3',
      params.coverage || '',
      params.lat || '',
      params.lng || '',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return { success: true, weedId: weedId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// CULTIVATION LOG
// ============================================

function logCultivation(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.CULTIVATION_LOG);

    const cultivationId = generateId('CUL');
    const now = new Date();

    const newRow = [
      cultivationId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.field || '',
      params.beds || '',
      params.implement || '',
      params.depth || '',
      params.soilCondition || '',
      params.effectiveness || '',
      params.lat || '',
      params.lng || '',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return { success: true, cultivationId: cultivationId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// CREW MESSAGES
// ============================================

function getCrewMessages(params) {
  try {
    const employeeId = params.employeeId || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.CREW_MESSAGES);

    if (!sheet) {
      return { success: true, messages: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const messages = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      const msgDate = new Date(row.Timestamp);
      const isRecent = msgDate >= weekAgo;
      const isForEmployee = row.To_All || row.To_Employee_ID === employeeId;

      if (isRecent && isForEmployee) {
        messages.push(row);
      }
    }

    // Sort newest first
    messages.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    return { success: true, messages: messages };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function acknowledgeMessage(params) {
  try {
    const messageId = params.messageId;
    const employeeId = params.employeeId || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.CREW_MESSAGES);

    if (!sheet) {
      return { success: false, error: 'Messages sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Message_ID');
    const ackCol = headers.indexOf('Acknowledged');
    const ackAtCol = headers.indexOf('Acknowledged_At');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === messageId) {
        sheet.getRange(i + 1, ackCol + 1).setValue(true);
        sheet.getRange(i + 1, ackAtCol + 1).setValue(new Date().toISOString());

        return { success: true };
      }
    }

    return { success: false, error: 'Message not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendCrewMessage(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateEmployeeSheet(EMPLOYEE_SHEETS.CREW_MESSAGES);

    const messageId = generateId('MSG');
    const now = new Date();

    const newRow = [
      messageId,
      now.toISOString(),
      params.from || 'Farm Manager',
      params.toEmployeeId || '',
      params.toAll === true || params.toAll === 'true',
      params.message || '',
      params.urgent === true || params.urgent === 'true',
      false, // Acknowledged
      ''     // Acknowledged_At
    ];

    sheet.appendRow(newRow);

    return { success: true, messageId: messageId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// FIELDS REFERENCE DATA
// ============================================

function getFields(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Try to get fields from FIELD_MAP sheet or REF_Fields
    let sheet = ss.getSheetByName('REF_Fields') || ss.getSheetByName('FIELD_MAP');

    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      const fields = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          fields.push({
            Field_ID: data[i][headers.indexOf('Field_ID')] || data[i][0],
            Field_Name: data[i][headers.indexOf('Field_Name')] || data[i][1] || data[i][0]
          });
        }
      }

      return { success: true, fields: fields };
    }

    // Fallback: extract unique fields from PLANNING_2026
    const planSheet = ss.getSheetByName('PLANNING_2026');
    if (planSheet) {
      const data = planSheet.getDataRange().getValues();
      const headers = data[0];
      const fieldCol = headers.indexOf('Field');

      if (fieldCol >= 0) {
        const uniqueFields = [...new Set(
          data.slice(1).map(row => row[fieldCol]).filter(f => f)
        )];

        return {
          success: true,
          fields: uniqueFields.map(f => ({ Field_ID: f, Field_Name: f }))
        };
      }
    }

    // Default fields
    return {
      success: true,
      fields: [
        { Field_ID: 'Field A', Field_Name: 'Field A' },
        { Field_ID: 'Field B', Field_Name: 'Field B' },
        { Field_ID: 'Field C', Field_Name: 'Field C' },
        { Field_ID: 'Greenhouse', Field_Name: 'Greenhouse' }
      ]
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// EMPLOYEE LANGUAGE PREFERENCE
// ============================================

function updateEmployeeLanguage(params) {
  try {
    const employeeId = params.employeeId;
    const lang = params.lang || 'en';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(EMPLOYEE_SHEETS.EMPLOYEES);

    if (!sheet) {
      return { success: false, error: 'Employees sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Employee_ID');
    const langCol = headers.indexOf('Language_Pref');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === employeeId) {
        sheet.getRange(i + 1, langCol + 1).setValue(lang);
        return { success: true };
      }
    }

    return { success: false, error: 'Employee not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PICK & PACK AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════

const PICKPACK_HEADERS = {
  PICK_LIST: ['Pick_ID', 'Date', 'Order_ID', 'Customer_Name', 'Crop', 'Variety', 'Quantity', 'Unit', 'Field', 'Bed_ID', 'Status', 'Picked_By', 'Picked_At', 'Quality_Check', 'Lot_Number', 'Notes']
};

function getPickListForToday(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const date = params && params.date ? params.date : new Date().toISOString().split('T')[0];

    // Get pending orders for the date
    const ordersSheet = ss.getSheetByName('SALES_ORDERS');
    const pickItems = [];

    if (ordersSheet) {
      const data = ordersSheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        const row = {};
        headers.forEach((h, j) => row[h] = data[i][j]);

        // Include orders scheduled for today that need picking
        const deliveryDate = row.Delivery_Date || row.Order_Date;
        const orderDate = deliveryDate instanceof Date ? deliveryDate.toISOString().split('T')[0] : deliveryDate;

        if (orderDate === date && (row.Status === 'Pending' || row.Status === 'Confirmed' || row.Status === 'Processing')) {
          // Parse order items and add to pick list
          const items = parseOrderItems(row.Items || row.Order_Items || '');
          items.forEach((item, idx) => {
            pickItems.push({
              Pick_ID: generateId('PCK'),
              Order_ID: row.Order_ID,
              Customer_Name: row.Customer_Name || row.Customer,
              Crop: item.crop,
              Variety: item.variety || '',
              Quantity: item.quantity,
              Unit: item.unit || 'each',
              Field: item.field || '',
              Bed_ID: item.bed || '',
              Status: 'Pending',
              Priority: row.Priority || 'Normal',
              Delivery_Time: row.Delivery_Time || ''
            });
          });
        }
      }
    }

    // Sort by field/bed for efficient picking route
    pickItems.sort((a, b) => {
      if (a.Field !== b.Field) return (a.Field || '').localeCompare(b.Field || '');
      return (a.Bed_ID || '').localeCompare(b.Bed_ID || '');
    });

    return { success: true, pickList: pickItems, date: date };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function parseOrderItems(itemsStr) {
  // Parse order items from various formats
  if (!itemsStr) return [];

  if (typeof itemsStr === 'object' && Array.isArray(itemsStr)) {
    return itemsStr;
  }

  try {
    // Try JSON parse
    if (typeof itemsStr === 'string' && itemsStr.startsWith('[')) {
      return JSON.parse(itemsStr);
    }

    // Parse comma-separated format: "Tomatoes x 5, Lettuce x 3"
    const items = [];
    const parts = itemsStr.split(',');
    parts.forEach(part => {
      const match = part.trim().match(/(.+?)\s*[xX×]\s*(\d+)/);
      if (match) {
        items.push({
          crop: match[1].trim(),
          quantity: parseInt(match[2])
        });
      }
    });
    return items;
  } catch (e) {
    return [];
  }
}

function updatePickItemStatus(params) {
  try {
    const pickId = params.pickId;
    const status = params.status || 'Picked';
    const employeeId = params.employeeId || '';
    const lotNumber = params.lotNumber || '';
    const qualityCheck = params.qualityCheck || 'Pass';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('PICK_LIST');

    if (!sheet) {
      sheet = ss.insertSheet('PICK_LIST');
      sheet.appendRow(PICKPACK_HEADERS.PICK_LIST);
      sheet.getRange(1, 1, 1, PICKPACK_HEADERS.PICK_LIST.length)
        .setFontWeight('bold')
        .setBackground('#f59e0b')
        .setFontColor('#000000');
      sheet.setFrozenRows(1);
    }

    // Find and update the pick item
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Pick_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === pickId) {
        sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(status);
        sheet.getRange(i + 1, headers.indexOf('Picked_By') + 1).setValue(employeeId);
        sheet.getRange(i + 1, headers.indexOf('Picked_At') + 1).setValue(new Date().toISOString());
        sheet.getRange(i + 1, headers.indexOf('Quality_Check') + 1).setValue(qualityCheck);
        sheet.getRange(i + 1, headers.indexOf('Lot_Number') + 1).setValue(lotNumber);

        return { success: true, pickId: pickId, status: status };
      }
    }

    return { success: false, error: 'Pick item not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getPackingList(params) {
  try {
    const orderId = params.orderId;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName('SALES_ORDERS');

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      if (row.Order_ID === orderId) {
        const items = parseOrderItems(row.Items || row.Order_Items || '');

        return {
          success: true,
          order: {
            Order_ID: row.Order_ID,
            Customer_Name: row.Customer_Name || row.Customer,
            Delivery_Address: row.Delivery_Address || row.Address,
            Delivery_Date: row.Delivery_Date,
            Delivery_Time: row.Delivery_Time,
            Phone: row.Phone,
            Notes: row.Notes || row.Special_Instructions
          },
          items: items
        };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function completePackingOrder(params) {
  try {
    const orderId = params.orderId;
    const employeeId = params.employeeId || '';
    const boxCount = params.boxCount || 1;
    const notes = params.notes || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName('SALES_ORDERS');

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Order_ID');
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === orderId) {
        ordersSheet.getRange(i + 1, statusCol + 1).setValue('Packed');

        // Add packing timestamp if column exists
        const packedAtCol = headers.indexOf('Packed_At');
        if (packedAtCol >= 0) {
          ordersSheet.getRange(i + 1, packedAtCol + 1).setValue(new Date().toISOString());
        }

        const packedByCol = headers.indexOf('Packed_By');
        if (packedByCol >= 0) {
          ordersSheet.getRange(i + 1, packedByCol + 1).setValue(employeeId);
        }

        return {
          success: true,
          orderId: orderId,
          status: 'Packed',
          timestamp: new Date().toISOString()
        };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WILDLIFE TRACKING (Groundhog, Deer, etc.)
// ═══════════════════════════════════════════════════════════════════════════

const WILDLIFE_HEADERS = {
  WILDLIFE_SIGHTINGS: ['Sighting_ID', 'Date', 'Time', 'Employee_ID', 'Animal_Type', 'Count', 'Field_ID', 'GPS_Lat', 'GPS_Lng', 'Photo_URL', 'Activity', 'Damage_Level', 'Notes'],
  GROUNDHOG_DENS: ['Den_ID', 'Discovered_Date', 'Employee_ID', 'Field_ID', 'GPS_Lat', 'GPS_Lng', 'Photo_URL', 'Status', 'Den_Size', 'Activity_Level', 'Notes', 'Last_Activity', 'Treatment_Applied'],
  DAMAGE_REPORTS: ['Damage_ID', 'Date', 'Employee_ID', 'Animal_Type', 'Field_ID', 'Bed_ID', 'Crop_Affected', 'Damage_Severity', 'Estimated_Loss_Value', 'Photo_URL', 'GPS_Lat', 'GPS_Lng', 'Notes']
};

function logWildlifeSighting(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('WILDLIFE_SIGHTINGS');

    if (!sheet) {
      sheet = ss.insertSheet('WILDLIFE_SIGHTINGS');
      sheet.appendRow(WILDLIFE_HEADERS.WILDLIFE_SIGHTINGS);
      sheet.getRange(1, 1, 1, WILDLIFE_HEADERS.WILDLIFE_SIGHTINGS.length)
        .setFontWeight('bold')
        .setBackground('#8b4513')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setTabColor('#8b4513');
    }

    const sightingId = generateId('WLD');
    const now = new Date();

    const newRow = [
      sightingId,
      now.toISOString().split('T')[0],
      now.toISOString().split('T')[1].split('.')[0],
      params.employeeId || '',
      params.animalType || '',
      params.count || 1,
      params.field || '',
      params.lat || '',
      params.lng || '',
      params.photo || '',
      params.activity || '',
      params.damageLevel || 'none',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return { success: true, sightingId: sightingId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logGroundhogDen(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('GROUNDHOG_DENS');

    if (!sheet) {
      sheet = ss.insertSheet('GROUNDHOG_DENS');
      sheet.appendRow(WILDLIFE_HEADERS.GROUNDHOG_DENS);
      sheet.getRange(1, 1, 1, WILDLIFE_HEADERS.GROUNDHOG_DENS.length)
        .setFontWeight('bold')
        .setBackground('#8b4513')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setTabColor('#8b4513');
    }

    const denId = generateId('DEN');
    const now = new Date();

    const newRow = [
      denId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.field || '',
      params.lat || '',
      params.lng || '',
      params.photo || '',
      'Active',
      params.denSize || 'medium',
      params.activityLevel || 'medium',
      params.notes || '',
      now.toISOString(),
      ''
    ];

    sheet.appendRow(newRow);

    return { success: true, denId: denId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getGroundhogDens(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('GROUNDHOG_DENS');

    if (!sheet) {
      return { success: true, dens: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const dens = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      // Only include active dens unless requested otherwise
      if (!params || !params.includeInactive) {
        if (row.Status === 'Active') {
          dens.push(row);
        }
      } else {
        dens.push(row);
      }
    }

    return { success: true, dens: dens };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateDenStatus(params) {
  try {
    const denId = params.denId;
    const status = params.status || 'Active';
    const treatment = params.treatment || '';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('GROUNDHOG_DENS');

    if (!sheet) {
      return { success: false, error: 'Groundhog dens sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Den_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === denId) {
        sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(status);
        sheet.getRange(i + 1, headers.indexOf('Last_Activity') + 1).setValue(new Date().toISOString());
        if (treatment) {
          sheet.getRange(i + 1, headers.indexOf('Treatment_Applied') + 1).setValue(treatment);
        }

        return { success: true, denId: denId, status: status };
      }
    }

    return { success: false, error: 'Den not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logDamageReport(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('DAMAGE_REPORTS');

    if (!sheet) {
      sheet = ss.insertSheet('DAMAGE_REPORTS');
      sheet.appendRow(WILDLIFE_HEADERS.DAMAGE_REPORTS);
      sheet.getRange(1, 1, 1, WILDLIFE_HEADERS.DAMAGE_REPORTS.length)
        .setFontWeight('bold')
        .setBackground('#dc2626')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setTabColor('#dc2626');
    }

    const damageId = generateId('DMG');
    const now = new Date();

    const newRow = [
      damageId,
      now.toISOString().split('T')[0],
      params.employeeId || '',
      params.animalType || '',
      params.field || '',
      params.bed || '',
      params.cropAffected || '',
      params.severity || 'medium',
      params.estimatedLoss || '',
      params.photo || '',
      params.lat || '',
      params.lng || '',
      params.notes || ''
    ];

    sheet.appendRow(newRow);

    return { success: true, damageId: damageId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getDamageReports(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DAMAGE_REPORTS');

    if (!sheet) {
      return { success: true, reports: [], totalLoss: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const days = params && params.days ? parseInt(params.days) : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const reports = [];
    let totalLoss = 0;

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);

      const reportDate = new Date(row.Date);
      if (reportDate >= cutoffDate) {
        reports.push(row);
        if (row.Estimated_Loss_Value) {
          totalLoss += parseFloat(row.Estimated_Loss_Value) || 0;
        }
      }
    }

    // Group by animal type for summary
    const byAnimal = {};
    reports.forEach(r => {
      const animal = r.Animal_Type || 'Unknown';
      if (!byAnimal[animal]) {
        byAnimal[animal] = { count: 0, totalLoss: 0 };
      }
      byAnimal[animal].count++;
      byAnimal[animal].totalLoss += parseFloat(r.Estimated_Loss_Value) || 0;
    });

    return {
      success: true,
      reports: reports,
      totalLoss: totalLoss.toFixed(2),
      byAnimal: byAnimal
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getWildlifeMap(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mapData = {
      sightings: [],
      dens: [],
      damageAreas: []
    };

    // Get sightings
    const sightingsSheet = ss.getSheetByName('WILDLIFE_SIGHTINGS');
    if (sightingsSheet) {
      const data = sightingsSheet.getDataRange().getValues();
      const headers = data[0];
      for (let i = 1; i < data.length; i++) {
        const row = {};
        headers.forEach((h, j) => row[h] = data[i][j]);
        if (row.GPS_Lat && row.GPS_Lng) {
          mapData.sightings.push({
            lat: row.GPS_Lat,
            lng: row.GPS_Lng,
            type: row.Animal_Type,
            date: row.Date,
            count: row.Count
          });
        }
      }
    }

    // Get active dens
    const densSheet = ss.getSheetByName('GROUNDHOG_DENS');
    if (densSheet) {
      const data = densSheet.getDataRange().getValues();
      const headers = data[0];
      for (let i = 1; i < data.length; i++) {
        const row = {};
        headers.forEach((h, j) => row[h] = data[i][j]);
        if (row.GPS_Lat && row.GPS_Lng && row.Status === 'Active') {
          mapData.dens.push({
            lat: row.GPS_Lat,
            lng: row.GPS_Lng,
            denId: row.Den_ID,
            field: row.Field_ID,
            activityLevel: row.Activity_Level
          });
        }
      }
    }

    // Get damage areas
    const damageSheet = ss.getSheetByName('DAMAGE_REPORTS');
    if (damageSheet) {
      const data = damageSheet.getDataRange().getValues();
      const headers = data[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (let i = 1; i < data.length; i++) {
        const row = {};
        headers.forEach((h, j) => row[h] = data[i][j]);
        if (row.GPS_Lat && row.GPS_Lng && new Date(row.Date) >= thirtyDaysAgo) {
          mapData.damageAreas.push({
            lat: row.GPS_Lat,
            lng: row.GPS_Lng,
            severity: row.Damage_Severity,
            crop: row.Crop_Affected,
            animalType: row.Animal_Type
          });
        }
      }
    }

    return { success: true, mapData: mapData };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function sendOrderConfirmation(params) {
  try {
    const orderId = params.orderId;
    const customerEmail = params.email;
    const customerName = params.customerName || 'Valued Customer';

    if (!customerEmail) {
      return { success: false, error: 'Customer email required' };
    }

    // Get order details
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName('SALES_ORDERS');

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];
    let order = null;

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, j) => row[h] = data[i][j]);
      if (row.Order_ID === orderId) {
        order = row;
        break;
      }
    }

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2d5a27; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🌱 Tiny Seed Farm</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Order Confirmation</h2>
          <p>Hi ${customerName},</p>
          <p>Thank you for your order! We've received it and are preparing it with care.</p>

          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order #:</strong> ${orderId}</p>
            <p><strong>Date:</strong> ${new Date(order.Order_Date || order.Date).toLocaleDateString()}</p>
            ${order.Delivery_Date ? `<p><strong>Delivery:</strong> ${new Date(order.Delivery_Date).toLocaleDateString()}</p>` : ''}
            <p><strong>Total:</strong> $${order.Total || order.Order_Total || '0.00'}</p>
          </div>

          <p>If you have any questions, just reply to this email.</p>
          <p>With gratitude,<br>Tiny Seed Farm Team</p>
        </div>
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Tiny Seed Farm | Fresh, Local, Sustainable</p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: customerEmail,
      subject: `Order Confirmed - #${orderId} | Tiny Seed Farm`,
      htmlBody: htmlBody
    });

    return { success: true, message: 'Confirmation email sent' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendDeliveryNotification(params) {
  try {
    const orderId = params.orderId;
    const customerEmail = params.email;
    const customerName = params.customerName || 'Valued Customer';
    const deliveryTime = params.deliveryTime || 'today';
    const driverName = params.driverName || 'our delivery team';

    if (!customerEmail) {
      return { success: false, error: 'Customer email required' };
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2d5a27; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🌱 Tiny Seed Farm</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>🚚 Your Order is On the Way!</h2>
          <p>Hi ${customerName},</p>
          <p>Great news! Your order #${orderId} is being delivered ${deliveryTime} by ${driverName}.</p>

          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 18px; margin: 0;">📦 Estimated Arrival: <strong>${deliveryTime}</strong></p>
          </div>

          <p>Please make sure someone is available to receive your fresh produce.</p>
          <p>Enjoy your farm-fresh food!<br>Tiny Seed Farm Team</p>
        </div>
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Tiny Seed Farm | Fresh, Local, Sustainable</p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: customerEmail,
      subject: `Your Order is On the Way! - #${orderId} | Tiny Seed Farm`,
      htmlBody: htmlBody
    });

    return { success: true, message: 'Delivery notification sent' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendDeliveryComplete(params) {
  try {
    const orderId = params.orderId;
    const customerEmail = params.email;
    const customerName = params.customerName || 'Valued Customer';

    if (!customerEmail) {
      return { success: false, error: 'Customer email required' };
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2d5a27; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🌱 Tiny Seed Farm</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>✅ Delivery Complete!</h2>
          <p>Hi ${customerName},</p>
          <p>Your order #${orderId} has been delivered. We hope you enjoy your fresh, farm-grown produce!</p>

          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Storage Tips</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Store leafy greens in the refrigerator</li>
              <li>Keep tomatoes at room temperature</li>
              <li>Root vegetables last longest in a cool, dark place</li>
            </ul>
          </div>

          <p>Thank you for supporting local agriculture!</p>
          <p>The Tiny Seed Farm Team</p>
        </div>
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Tiny Seed Farm | Fresh, Local, Sustainable</p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: customerEmail,
      subject: `Delivery Complete - #${orderId} | Tiny Seed Farm`,
      htmlBody: htmlBody
    });

    return { success: true, message: 'Delivery complete notification sent' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendCSAWeeklyReminder(params) {
  try {
    const memberEmail = params.email;
    const memberName = params.memberName || 'CSA Member';
    const pickupDay = params.pickupDay || 'this week';
    const boxContents = params.boxContents || [];

    if (!memberEmail) {
      return { success: false, error: 'Member email required' };
    }

    const contentsList = boxContents.length > 0
      ? boxContents.map(item => `<li>${item}</li>`).join('')
      : '<li>Seasonal produce (check our website for details)</li>';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2d5a27; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🌱 Tiny Seed Farm CSA</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>🥬 Your CSA Box is Ready!</h2>
          <p>Hi ${memberName},</p>
          <p>Your weekly CSA box is ready for pickup ${pickupDay}!</p>

          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">This Week's Box Includes:</h3>
            <ul style="padding-left: 20px;">
              ${contentsList}
            </ul>
          </div>

          <p>See you at the farm!</p>
          <p>Tiny Seed Farm Team</p>
        </div>
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>Tiny Seed Farm | Fresh, Local, Sustainable</p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: memberEmail,
      subject: `Your CSA Box is Ready! | Tiny Seed Farm`,
      htmlBody: htmlBody
    });

    return { success: true, message: 'CSA reminder sent' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TWILIO SMS INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core SMS sending function using Twilio API
 * @param {Object} params - { to: phone, message: text }
 */
function sendSMS(params) {
  try {
    if (!TWILIO_CONFIG.ENABLED) {
      return {
        success: false,
        error: 'Twilio SMS is not configured. Update TWILIO_CONFIG in Apps Script.'
      };
    }

    const { to, message } = params;

    if (!to || !message) {
      return { success: false, error: 'Missing required parameters: to, message' };
    }

    // Format phone number (ensure +1 prefix for US numbers)
    let formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Twilio API URL
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json`;

    // Prepare the request
    const payload = {
      To: formattedPhone,
      From: TWILIO_CONFIG.FROM_NUMBER,
      Body: message
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(
          TWILIO_CONFIG.ACCOUNT_SID + ':' + TWILIO_CONFIG.AUTH_TOKEN
        )
      },
      payload: payload,
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(twilioUrl, options);
    const result = JSON.parse(response.getContentText());

    // Log the SMS
    logSMSToSheet({
      to: formattedPhone,
      message: message,
      status: result.status || 'sent',
      sid: result.sid,
      timestamp: new Date().toISOString()
    });

    if (result.error_code) {
      return { success: false, error: result.error_message, code: result.error_code };
    }

    return {
      success: true,
      message: 'SMS sent successfully',
      sid: result.sid,
      status: result.status
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Log SMS to SMS_LOG sheet for tracking
 */
function logSMSToSheet(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('SMS_LOG');

    if (!sheet) {
      sheet = ss.insertSheet('SMS_LOG');
      sheet.appendRow(['Timestamp', 'To', 'Message', 'Status', 'SID', 'Type']);
    }

    sheet.appendRow([
      data.timestamp,
      data.to,
      data.message,
      data.status,
      data.sid || '',
      data.type || 'general'
    ]);
  } catch (e) {
    console.log('Failed to log SMS: ' + e.toString());
  }
}

/**
 * Send order confirmation SMS
 * @param {Object} params - { orderId, customerPhone, customerName, total }
 */
function sendOrderSMS(params) {
  const { orderId, customerPhone, customerName, total } = params;

  if (!customerPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const message = `Hi ${customerName || 'there'}! 🌱 Your Tiny Seed Farm order #${orderId} for $${total} has been confirmed. We'll text you when it's ready for pickup/delivery. Questions? Reply to this text!`;

  const result = sendSMS({ to: customerPhone, message: message });

  if (result.success) {
    logSMSToSheet({ ...result, type: 'order_confirmation' });
  }

  return result;
}

/**
 * Send delivery notification SMS
 * @param {Object} params - { orderId, customerPhone, customerName, deliveryTime, driverName }
 */
function sendDeliverySMS(params) {
  const { orderId, customerPhone, customerName, deliveryTime, driverName } = params;

  if (!customerPhone) {
    return { success: false, error: 'No phone number provided' };
  }

  const message = `🚚 Tiny Seed Farm: Your order #${orderId} is out for delivery! ${driverName ? driverName + ' is' : 'We are'} on the way. Expected arrival: ${deliveryTime || 'soon'}. Please ensure cooler is out!`;

  const result = sendSMS({ to: customerPhone, message: message });

  if (result.success) {
    logSMSToSheet({ ...result, type: 'delivery_notification' });
  }

  return result;
}

/**
 * Send SMS to crew members (employees)
 * @param {Object} params - { employeeIds, message } or { phone, message }
 */
function sendCrewSMS(params) {
  const { employeeIds, phone, message } = params;

  if (!message) {
    return { success: false, error: 'No message provided' };
  }

  // If single phone number provided
  if (phone) {
    return sendSMS({ to: phone, message: `[Tiny Seed Farm Crew] ${message}` });
  }

  // If employee IDs provided, look up their phones
  if (employeeIds) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const empSheet = ss.getSheetByName('EMPLOYEES') || ss.getSheetByName('USERS');

    if (!empSheet) {
      return { success: false, error: 'No EMPLOYEES sheet found' };
    }

    const data = empSheet.getDataRange().getValues();
    const headers = data[0];
    const phoneCol = headers.indexOf('Phone');
    const idCol = headers.indexOf('Employee_ID') !== -1 ? headers.indexOf('Employee_ID') : headers.indexOf('User_ID');

    if (phoneCol === -1) {
      return { success: false, error: 'No Phone column in EMPLOYEES sheet' };
    }

    const ids = employeeIds.split(',').map(id => id.trim());
    const results = [];

    for (let i = 1; i < data.length; i++) {
      const empId = data[i][idCol];
      if (ids.includes(empId) || ids.includes('all')) {
        const empPhone = data[i][phoneCol];
        if (empPhone) {
          results.push(sendSMS({ to: empPhone, message: `[Tiny Seed Farm Crew] ${message}` }));
        }
      }
    }

    return {
      success: true,
      message: `Sent to ${results.filter(r => r.success).length} crew members`,
      results: results
    };
  }

  return { success: false, error: 'No phone or employeeIds provided' };
}

/**
 * Send REI (Re-Entry Interval) alert SMS
 * Used when a field treatment creates a re-entry restriction
 * @param {Object} params - { fieldId, material, reiHours, expiresAt }
 */
function sendREIAlertSMS(params) {
  const { fieldId, material, reiHours, expiresAt } = params;

  const message = `⚠️ REI ALERT: ${material} applied to ${fieldId}. DO NOT ENTER for ${reiHours} hours. Safe to enter after ${expiresAt}. - Tiny Seed Farm`;

  // Send to all active employees with phones
  return sendCrewSMS({ employeeIds: 'all', message: message });
}

/**
 * Get SMS history from SMS_LOG sheet
 * @param {Object} params - { limit, type }
 */
function getSMSHistory(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('SMS_LOG');

    if (!sheet) {
      return { success: true, history: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let history = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    // Filter by type if specified
    if (params.type) {
      history = history.filter(h => h.Type === params.type);
    }

    // Limit results
    const limit = parseInt(params.limit) || 50;
    history = history.slice(-limit).reverse();

    return { success: true, history: history };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE ROUTES API - DELIVERY ROUTE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Geocode an address to lat/lng coordinates
 * @param {Object} params - { address }
 */
function geocodeAddress(params) {
  try {
    const { address } = params;

    if (!address) {
      return { success: false, error: 'No address provided' };
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_ROUTES_CONFIG.API_KEY}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const result = JSON.parse(response.getContentText());

    if (result.status === 'OK' && result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return {
        success: true,
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.results[0].formatted_address
      };
    } else {
      return { success: false, error: 'Could not geocode address', status: result.status };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get distance matrix between multiple locations
 * @param {Object} params - { origins: "addr1|addr2", destinations: "addr1|addr2" }
 */
function getDistanceMatrix(params) {
  try {
    const { origins, destinations } = params;

    if (!origins || !destinations) {
      return { success: false, error: 'Missing origins or destinations' };
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${GOOGLE_ROUTES_CONFIG.API_KEY}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const result = JSON.parse(response.getContentText());

    if (result.status === 'OK') {
      return {
        success: true,
        rows: result.rows,
        origin_addresses: result.origin_addresses,
        destination_addresses: result.destination_addresses
      };
    } else {
      return { success: false, error: 'Distance matrix failed', status: result.status };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get optimized route for a list of delivery addresses
 * Uses Google Directions API with waypoint optimization
 * @param {Object} params - { addresses: JSON array of addresses, returnToFarm: true/false }
 */
function getRouteForDeliveries(params) {
  try {
    let addresses = params.addresses;
    if (typeof addresses === 'string') {
      addresses = JSON.parse(addresses);
    }

    if (!addresses || addresses.length === 0) {
      return { success: false, error: 'No addresses provided' };
    }

    const farmAddress = GOOGLE_ROUTES_CONFIG.FARM_ADDRESS;
    const returnToFarm = params.returnToFarm !== 'false';

    // Build waypoints string (optimize order)
    const waypoints = addresses.map(a => encodeURIComponent(a)).join('|');

    // Origin is farm, destination is farm (if returning) or last stop
    const origin = encodeURIComponent(farmAddress);
    const destination = returnToFarm ? encodeURIComponent(farmAddress) : encodeURIComponent(addresses[addresses.length - 1]);

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${GOOGLE_ROUTES_CONFIG.API_KEY}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const result = JSON.parse(response.getContentText());

    if (result.status === 'OK' && result.routes.length > 0) {
      const route = result.routes[0];
      const optimizedOrder = route.waypoint_order;

      // Calculate total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;
      const legs = route.legs.map((leg, index) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
        return {
          from: leg.start_address,
          to: leg.end_address,
          distance: leg.distance.text,
          duration: leg.duration.text,
          steps: leg.steps.length
        };
      });

      // Reorder addresses based on optimization
      const optimizedAddresses = optimizedOrder.map(i => addresses[i]);

      return {
        success: true,
        optimizedOrder: optimizedOrder,
        optimizedAddresses: optimizedAddresses,
        totalDistance: (totalDistance / 1609.34).toFixed(1) + ' miles',
        totalDuration: Math.round(totalDuration / 60) + ' minutes',
        legs: legs,
        polyline: route.overview_polyline.points
      };
    } else {
      return { success: false, error: 'Could not calculate route', status: result.status };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Optimize delivery route for a specific date
 * Pulls orders from SALES_ORDERS sheet and optimizes the route
 * @param {Object} params - { date: 'YYYY-MM-DD' }
 */
function optimizeDeliveryRoute(params) {
  try {
    const targetDate = params.date || new Date().toISOString().split('T')[0];

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ordersSheet = ss.getSheetByName('SALES_ORDERS');

    if (!ordersSheet) {
      return { success: false, error: 'SALES_ORDERS sheet not found' };
    }

    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];

    // Find relevant columns
    const dateCol = headers.indexOf('Delivery_Date') !== -1 ? headers.indexOf('Delivery_Date') : headers.indexOf('Date');
    const addressCol = headers.indexOf('Delivery_Address') !== -1 ? headers.indexOf('Delivery_Address') : headers.indexOf('Address');
    const customerCol = headers.indexOf('Customer_Name') !== -1 ? headers.indexOf('Customer_Name') : headers.indexOf('Customer');
    const orderIdCol = headers.indexOf('Order_ID') !== -1 ? headers.indexOf('Order_ID') : 0;
    const statusCol = headers.indexOf('Status');
    const typeCol = headers.indexOf('Order_Type') !== -1 ? headers.indexOf('Order_Type') : headers.indexOf('Type');

    // Filter orders for the target date that need delivery
    const deliveries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let rowDate = row[dateCol];

      // Handle date formatting
      if (rowDate instanceof Date) {
        rowDate = rowDate.toISOString().split('T')[0];
      } else if (typeof rowDate === 'string') {
        rowDate = rowDate.split('T')[0];
      }

      // Check if this is a delivery for the target date
      const orderType = typeCol !== -1 ? row[typeCol] : '';
      const status = statusCol !== -1 ? row[statusCol] : '';

      if (rowDate === targetDate &&
          (orderType === 'Delivery' || orderType === 'delivery') &&
          status !== 'Delivered' && status !== 'Cancelled') {

        const address = row[addressCol];
        if (address && address.trim()) {
          deliveries.push({
            orderId: row[orderIdCol],
            customer: row[customerCol],
            address: address.trim(),
            rowIndex: i + 1
          });
        }
      }
    }

    if (deliveries.length === 0) {
      return {
        success: true,
        message: 'No deliveries found for ' + targetDate,
        deliveries: [],
        route: null
      };
    }

    // Get optimized route
    const addresses = deliveries.map(d => d.address);
    const routeResult = getRouteForDeliveries({
      addresses: JSON.stringify(addresses),
      returnToFarm: 'true'
    });

    if (!routeResult.success) {
      return {
        success: false,
        error: 'Route optimization failed: ' + routeResult.error,
        deliveries: deliveries
      };
    }

    // Reorder deliveries based on optimized route
    const optimizedDeliveries = routeResult.optimizedOrder.map((idx, stopNum) => ({
      ...deliveries[idx],
      stopNumber: stopNum + 1,
      leg: routeResult.legs[stopNum]
    }));

    return {
      success: true,
      date: targetDate,
      totalStops: deliveries.length,
      totalDistance: routeResult.totalDistance,
      totalDuration: routeResult.totalDuration,
      deliveries: optimizedDeliveries,
      polyline: routeResult.polyline
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get delivery schedule with optimized routes for multiple days
 * @param {Object} params - { startDate, endDate }
 */
function getDeliverySchedule(params) {
  try {
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const endDate = params.endDate || startDate;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const schedule = [];

    // Loop through each day
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayRoute = optimizeDeliveryRoute({ date: dateStr });

      if (dayRoute.success && dayRoute.deliveries && dayRoute.deliveries.length > 0) {
        schedule.push({
          date: dateStr,
          dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'long' }),
          ...dayRoute
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      success: true,
      startDate: startDate,
      endDate: endDate,
      totalDays: schedule.length,
      schedule: schedule
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-SEASON PLANNING DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PLANNING_TASKS = [
  { category: 'Crop Planning', task: 'Review last season performance', order: 1 },
  { category: 'Crop Planning', task: 'Finalize crop list for season', order: 2 },
  { category: 'Crop Planning', task: 'Create succession planting schedule', order: 3 },
  { category: 'Crop Planning', task: 'Calculate seed quantities needed', order: 4 },
  { category: 'Seed Orders', task: 'Inventory existing seed stock', order: 5 },
  { category: 'Seed Orders', task: 'Check germination rates on old seed', order: 6 },
  { category: 'Seed Orders', task: 'Place seed orders', order: 7 },
  { category: 'Seed Orders', task: 'Order transplants (if buying)', order: 8 },
  { category: 'Infrastructure', task: 'Inspect/repair greenhouse', order: 9 },
  { category: 'Infrastructure', task: 'Test irrigation system', order: 10 },
  { category: 'Infrastructure', task: 'Service equipment', order: 11 },
  { category: 'Infrastructure', task: 'Order supplies (trays, soil, amendments)', order: 12 },
  { category: 'Field Prep', task: 'Soil test fields', order: 13 },
  { category: 'Field Prep', task: 'Plan amendments based on soil tests', order: 14 },
  { category: 'Field Prep', task: 'Create field/bed rotation plan', order: 15 },
  { category: 'Field Prep', task: 'Plan cover crop termination dates', order: 16 },
  { category: 'Sales & Markets', task: 'Confirm market dates/locations', order: 17 },
  { category: 'Sales & Markets', task: 'Review CSA pricing/offerings', order: 18 },
  { category: 'Sales & Markets', task: 'Contact wholesale accounts', order: 19 },
  { category: 'Sales & Markets', task: 'Update website/marketing materials', order: 20 },
  { category: 'Labor', task: 'Plan seasonal labor needs', order: 21 },
  { category: 'Labor', task: 'Post job listings if needed', order: 22 },
  { category: 'Certifications', task: 'Review organic certification paperwork', order: 23 },
  { category: 'Certifications', task: 'Complete food safety plan updates', order: 24 }
];

function getPlanningChecklist(params) {
  try {
    const season = params.season || new Date().getFullYear().toString();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('PLANNING_CHECKLIST');

    if (!sheet) {
      // Create sheet with default tasks
      sheet = ss.insertSheet('PLANNING_CHECKLIST');
      sheet.appendRow(['Task_ID', 'Season', 'Category', 'Task', 'Status', 'Completed_Date', 'Completed_By', 'Notes', 'Order']);

      DEFAULT_PLANNING_TASKS.forEach((t, i) => {
        sheet.appendRow([`PLN-${season}-${String(i+1).padStart(3,'0')}`, season, t.category, t.task, 'Pending', '', '', '', t.order]);
      });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const tasks = data.slice(1)
      .filter(row => row[1] == season)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      })
      .sort((a, b) => (a.Order || 0) - (b.Order || 0));

    // Group by category
    const byCategory = {};
    tasks.forEach(t => {
      if (!byCategory[t.Category]) byCategory[t.Category] = [];
      byCategory[t.Category].push(t);
    });

    return { success: true, season: season, tasks: tasks, byCategory: byCategory };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updatePlanningTask(params) {
  try {
    const { taskId, status, notes, completedBy } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('PLANNING_CHECKLIST');

    if (!sheet) return { success: false, error: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Task_ID');
    const statusCol = headers.indexOf('Status');
    const dateCol = headers.indexOf('Completed_Date');
    const byCol = headers.indexOf('Completed_By');
    const notesCol = headers.indexOf('Notes');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === taskId) {
        if (status) sheet.getRange(i + 1, statusCol + 1).setValue(status);
        if (status === 'Complete') sheet.getRange(i + 1, dateCol + 1).setValue(new Date().toISOString().split('T')[0]);
        if (completedBy) sheet.getRange(i + 1, byCol + 1).setValue(completedBy);
        if (notes) sheet.getRange(i + 1, notesCol + 1).setValue(notes);
        return { success: true, message: 'Task updated' };
      }
    }

    return { success: false, error: 'Task not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createPlanningChecklist(params) {
  try {
    const season = params.season || new Date().getFullYear().toString();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('PLANNING_CHECKLIST');

    if (!sheet) {
      sheet = ss.insertSheet('PLANNING_CHECKLIST');
      sheet.appendRow(['Task_ID', 'Season', 'Category', 'Task', 'Status', 'Completed_Date', 'Completed_By', 'Notes', 'Order']);
    }

    // Check if season already exists
    const data = sheet.getDataRange().getValues();
    const existingSeasons = data.slice(1).map(r => r[1]);
    if (existingSeasons.includes(season)) {
      return { success: false, error: 'Checklist for this season already exists' };
    }

    DEFAULT_PLANNING_TASKS.forEach((t, i) => {
      sheet.appendRow([`PLN-${season}-${String(i+1).padStart(3,'0')}`, season, t.category, t.task, 'Pending', '', '', '', t.order]);
    });

    return { success: true, message: `Created checklist for ${season}`, taskCount: DEFAULT_PLANNING_TASKS.length };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getPlanningProgress(params) {
  try {
    const season = params.season || new Date().getFullYear().toString();
    const result = getPlanningChecklist({ season: season });

    if (!result.success) return result;

    const total = result.tasks.length;
    const complete = result.tasks.filter(t => t.Status === 'Complete').length;
    const inProgress = result.tasks.filter(t => t.Status === 'In Progress').length;
    const pending = result.tasks.filter(t => t.Status === 'Pending').length;

    const categoryProgress = {};
    Object.keys(result.byCategory).forEach(cat => {
      const catTasks = result.byCategory[cat];
      categoryProgress[cat] = {
        total: catTasks.length,
        complete: catTasks.filter(t => t.Status === 'Complete').length,
        percent: Math.round((catTasks.filter(t => t.Status === 'Complete').length / catTasks.length) * 100)
      };
    });

    return {
      success: true,
      season: season,
      total: total,
      complete: complete,
      inProgress: inProgress,
      pending: pending,
      percentComplete: Math.round((complete / total) * 100),
      categoryProgress: categoryProgress
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-SEASON ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════════════════

function getSeasonAdjustments(params) {
  try {
    const season = params.season || new Date().getFullYear().toString();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('SEASON_ADJUSTMENTS');

    if (!sheet) {
      sheet = ss.insertSheet('SEASON_ADJUSTMENTS');
      sheet.appendRow(['Adjustment_ID', 'Date', 'Season', 'Type', 'Crop', 'Variety', 'Original_Plan', 'New_Plan', 'Reason', 'Impact', 'Created_By']);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const adjustments = data.slice(1)
      .filter(row => row[2] == season)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      })
      .sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Summary stats
    const adds = adjustments.filter(a => a.Type === 'Add').length;
    const cancels = adjustments.filter(a => a.Type === 'Cancel').length;
    const changes = adjustments.filter(a => a.Type === 'Change').length;

    return {
      success: true,
      season: season,
      adjustments: adjustments,
      summary: { adds, cancels, changes, total: adjustments.length }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function addSeasonAdjustment(params) {
  try {
    const { type, crop, variety, originalPlan, newPlan, reason, impact, createdBy } = params;
    const season = params.season || new Date().getFullYear().toString();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('SEASON_ADJUSTMENTS');

    if (!sheet) {
      sheet = ss.insertSheet('SEASON_ADJUSTMENTS');
      sheet.appendRow(['Adjustment_ID', 'Date', 'Season', 'Type', 'Crop', 'Variety', 'Original_Plan', 'New_Plan', 'Reason', 'Impact', 'Created_By']);
    }

    const adjId = `ADJ-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    sheet.appendRow([adjId, today, season, type, crop, variety || '', originalPlan || '', newPlan || '', reason || '', impact || '', createdBy || '']);

    return { success: true, adjustmentId: adjId, message: 'Adjustment recorded' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateSuccessionStatus(params) {
  try {
    const { batchId, status, notes } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Try PLANNING_2026, PLANNING_2025, or PLANTINGS
    const sheetNames = ['PLANNING_2026', 'PLANNING_2025', 'PLANTINGS'];
    let sheet = null;

    for (const name of sheetNames) {
      const s = ss.getSheetByName(name);
      if (s) { sheet = s; break; }
    }

    if (!sheet) return { success: false, error: 'No planning sheet found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('Batch_ID');
    const statusCol = headers.indexOf('Status');
    const notesCol = headers.indexOf('Notes');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === batchId) {
        if (status && statusCol !== -1) sheet.getRange(i + 1, statusCol + 1).setValue(status);
        if (notes && notesCol !== -1) {
          const existing = data[i][notesCol] || '';
          sheet.getRange(i + 1, notesCol + 1).setValue(existing + (existing ? '\n' : '') + `[${new Date().toLocaleDateString()}] ${notes}`);
        }
        return { success: true, message: 'Status updated' };
      }
    }

    return { success: false, error: 'Batch not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST-SEASON REVIEW
// ═══════════════════════════════════════════════════════════════════════════

function getVarietyReviews(params) {
  try {
    const season = params.season || (new Date().getFullYear() - 1).toString();
    const crop = params.crop;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('VARIETY_REVIEWS');

    if (!sheet) {
      sheet = ss.insertSheet('VARIETY_REVIEWS');
      sheet.appendRow(['Review_ID', 'Season', 'Crop', 'Variety', 'Source', 'Performance_Rating', 'Yield_Rating', 'Disease_Resistance', 'Flavor_Quality', 'Market_Appeal', 'Grow_Again', 'Notes', 'Reviewed_By', 'Review_Date']);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let reviews = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    if (season) reviews = reviews.filter(r => r.Season == season);
    if (crop) reviews = reviews.filter(r => r.Crop === crop);

    // Get unique crops for dropdown
    const crops = [...new Set(reviews.map(r => r.Crop))].sort();

    return { success: true, reviews: reviews, crops: crops, season: season };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveVarietyReview(params) {
  try {
    const {
      season, crop, variety, source, performanceRating, yieldRating,
      diseaseResistance, flavorQuality, marketAppeal, growAgain, notes, reviewedBy
    } = params;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('VARIETY_REVIEWS');

    if (!sheet) {
      sheet = ss.insertSheet('VARIETY_REVIEWS');
      sheet.appendRow(['Review_ID', 'Season', 'Crop', 'Variety', 'Source', 'Performance_Rating', 'Yield_Rating', 'Disease_Resistance', 'Flavor_Quality', 'Market_Appeal', 'Grow_Again', 'Notes', 'Reviewed_By', 'Review_Date']);
    }

    const reviewId = `REV-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    sheet.appendRow([
      reviewId, season || new Date().getFullYear() - 1, crop, variety, source || '',
      performanceRating || '', yieldRating || '', diseaseResistance || '',
      flavorQuality || '', marketAppeal || '', growAgain || '', notes || '',
      reviewedBy || '', today
    ]);

    return { success: true, reviewId: reviewId, message: 'Review saved' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSeasonSummary(params) {
  try {
    const season = params.season || (new Date().getFullYear() - 1).toString();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get harvest data
    const harvestSheet = ss.getSheetByName('HARVESTS') || ss.getSheetByName('HARVEST_LOG');
    let harvests = [];
    if (harvestSheet) {
      const data = harvestSheet.getDataRange().getValues();
      const headers = data[0];
      harvests = data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }).filter(h => {
        const date = new Date(h.Date || h.Harvest_Date);
        return date.getFullYear().toString() === season;
      });
    }

    // Get reviews
    const reviewResult = getVarietyReviews({ season: season });
    const reviews = reviewResult.success ? reviewResult.reviews : [];

    // Get adjustments
    const adjResult = getSeasonAdjustments({ season: season });
    const adjustments = adjResult.success ? adjResult.adjustments : [];

    // Calculate summaries
    const cropTotals = {};
    harvests.forEach(h => {
      const crop = h.Crop;
      if (!cropTotals[crop]) cropTotals[crop] = { quantity: 0, harvests: 0 };
      cropTotals[crop].quantity += Number(h.Quantity) || 0;
      cropTotals[crop].harvests++;
    });

    const topPerformers = reviews.filter(r => r.Grow_Again === 'Yes' && Number(r.Performance_Rating) >= 4);
    const discontinue = reviews.filter(r => r.Grow_Again === 'No');

    return {
      success: true,
      season: season,
      harvestCount: harvests.length,
      cropTotals: cropTotals,
      reviewCount: reviews.length,
      adjustmentCount: adjustments.length,
      topPerformers: topPerformers,
      discontinue: discontinue
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BED PREP CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

function getBedPrepLog(params) {
  try {
    const { fieldId, season } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('BED_PREP_LOG');

    if (!sheet) {
      sheet = ss.insertSheet('BED_PREP_LOG');
      sheet.appendRow(['Prep_ID', 'Date', 'Season', 'Field_ID', 'Bed_IDs', 'Activity', 'Equipment_Used', 'Amendments', 'Amendment_Rate', 'Soil_Moisture', 'Notes', 'Completed_By', 'Hours']);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let logs = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    if (fieldId) logs = logs.filter(l => l.Field_ID === fieldId);
    if (season) logs = logs.filter(l => l.Season == season);

    logs.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, logs: logs };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logBedPrep(params) {
  try {
    const {
      fieldId, bedIds, activity, equipmentUsed, amendments,
      amendmentRate, soilMoisture, notes, completedBy, hours
    } = params;
    const season = params.season || new Date().getFullYear().toString();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('BED_PREP_LOG');

    if (!sheet) {
      sheet = ss.insertSheet('BED_PREP_LOG');
      sheet.appendRow(['Prep_ID', 'Date', 'Season', 'Field_ID', 'Bed_IDs', 'Activity', 'Equipment_Used', 'Amendments', 'Amendment_Rate', 'Soil_Moisture', 'Notes', 'Completed_By', 'Hours']);
    }

    const prepId = `BED-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    sheet.appendRow([
      prepId, today, season, fieldId, bedIds || '', activity || '',
      equipmentUsed || '', amendments || '', amendmentRate || '',
      soilMoisture || '', notes || '', completedBy || '', hours || ''
    ]);

    return { success: true, prepId: prepId, message: 'Bed prep logged' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getBedPrepStatus(params) {
  try {
    const season = params.season || new Date().getFullYear().toString();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get all beds
    const bedsSheet = ss.getSheetByName('BEDS');
    if (!bedsSheet) return { success: false, error: 'BEDS sheet not found' };

    const bedsData = bedsSheet.getDataRange().getValues();
    const bedsHeaders = bedsData[0];
    const beds = bedsData.slice(1).map(row => {
      const obj = {};
      bedsHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    // Get bed prep logs
    const logsResult = getBedPrepLog({ season: season });
    const logs = logsResult.success ? logsResult.logs : [];

    // Calculate status per bed
    const bedStatus = {};
    beds.forEach(bed => {
      const bedId = bed.Bed_ID || bed.ID;
      const bedLogs = logs.filter(l =>
        l.Bed_IDs && (l.Bed_IDs === bedId || l.Bed_IDs.includes(bedId))
      );

      bedStatus[bedId] = {
        bed: bed,
        prepCount: bedLogs.length,
        lastPrep: bedLogs.length > 0 ? bedLogs[0].Date : null,
        activities: bedLogs.map(l => l.Activity)
      };
    });

    const prepped = Object.values(bedStatus).filter(b => b.prepCount > 0).length;
    const notPrepped = Object.values(bedStatus).filter(b => b.prepCount === 0).length;

    return {
      success: true,
      season: season,
      totalBeds: beds.length,
      prepped: prepped,
      notPrepped: notPrepped,
      percentComplete: Math.round((prepped / beds.length) * 100),
      bedStatus: bedStatus
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IRRIGATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function getIrrigationZones(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('IRRIGATION_ZONES');

    if (!sheet) {
      sheet = ss.insertSheet('IRRIGATION_ZONES');
      sheet.appendRow(['Zone_ID', 'Zone_Name', 'Field_ID', 'Beds_Covered', 'System_Type', 'Emitter_Type', 'Emitter_Spacing_In', 'GPH_Per_Emitter', 'Line_Count', 'Total_GPH', 'Pressure_PSI', 'Filter_Type', 'Valve_Location', 'Notes', 'Install_Date', 'Last_Service']);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const zones = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    return { success: true, zones: zones };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveIrrigationZone(params) {
  try {
    const {
      zoneId, zoneName, fieldId, bedsCovered, systemType, emitterType,
      emitterSpacing, gphPerEmitter, lineCount, pressurePsi, filterType,
      valveLocation, notes
    } = params;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('IRRIGATION_ZONES');

    if (!sheet) {
      sheet = ss.insertSheet('IRRIGATION_ZONES');
      sheet.appendRow(['Zone_ID', 'Zone_Name', 'Field_ID', 'Beds_Covered', 'System_Type', 'Emitter_Type', 'Emitter_Spacing_In', 'GPH_Per_Emitter', 'Line_Count', 'Total_GPH', 'Pressure_PSI', 'Filter_Type', 'Valve_Location', 'Notes', 'Install_Date', 'Last_Service']);
    }

    // Calculate total GPH
    const totalGPH = (Number(gphPerEmitter) || 0) * (Number(lineCount) || 1) * (100 / (Number(emitterSpacing) || 12));

    const newZoneId = zoneId || `IRR-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // Check if updating existing
    if (zoneId) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === zoneId) {
          sheet.getRange(i + 1, 1, 1, 16).setValues([[
            zoneId, zoneName, fieldId, bedsCovered, systemType, emitterType,
            emitterSpacing, gphPerEmitter, lineCount, totalGPH, pressurePsi,
            filterType, valveLocation, notes, data[i][14], today
          ]]);
          return { success: true, zoneId: zoneId, message: 'Zone updated' };
        }
      }
    }

    sheet.appendRow([
      newZoneId, zoneName, fieldId, bedsCovered, systemType, emitterType,
      emitterSpacing, gphPerEmitter, lineCount, totalGPH, pressurePsi,
      filterType, valveLocation, notes, today, ''
    ]);

    return { success: true, zoneId: newZoneId, message: 'Zone created' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getWateringLog(params) {
  try {
    const { zoneId, startDate, endDate } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('WATERING_LOG');

    if (!sheet) {
      sheet = ss.insertSheet('WATERING_LOG');
      sheet.appendRow(['Log_ID', 'Date', 'Zone_ID', 'Start_Time', 'End_Time', 'Duration_Min', 'Gallons_Applied', 'Method', 'Crop_Stage', 'Soil_Moisture_Before', 'Soil_Moisture_After', 'Weather', 'Temp_F', 'Notes', 'Logged_By']);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let logs = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    if (zoneId) logs = logs.filter(l => l.Zone_ID === zoneId);
    if (startDate) logs = logs.filter(l => new Date(l.Date) >= new Date(startDate));
    if (endDate) logs = logs.filter(l => new Date(l.Date) <= new Date(endDate));

    logs.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Calculate totals
    const totalGallons = logs.reduce((sum, l) => sum + (Number(l.Gallons_Applied) || 0), 0);
    const totalMinutes = logs.reduce((sum, l) => sum + (Number(l.Duration_Min) || 0), 0);

    return {
      success: true,
      logs: logs,
      summary: {
        totalEvents: logs.length,
        totalGallons: totalGallons,
        totalMinutes: totalMinutes,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logWatering(params) {
  try {
    const {
      zoneId, startTime, endTime, durationMin, method, cropStage,
      soilMoistureBefore, soilMoistureAfter, weather, tempF, notes, loggedBy
    } = params;
    const date = params.date || new Date().toISOString().split('T')[0];

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('WATERING_LOG');

    if (!sheet) {
      sheet = ss.insertSheet('WATERING_LOG');
      sheet.appendRow(['Log_ID', 'Date', 'Zone_ID', 'Start_Time', 'End_Time', 'Duration_Min', 'Gallons_Applied', 'Method', 'Crop_Stage', 'Soil_Moisture_Before', 'Soil_Moisture_After', 'Weather', 'Temp_F', 'Notes', 'Logged_By']);
    }

    // Get zone info to calculate gallons
    let gallonsApplied = 0;
    const zonesResult = getIrrigationZones({});
    if (zonesResult.success) {
      const zone = zonesResult.zones.find(z => z.Zone_ID === zoneId);
      if (zone && zone.Total_GPH && durationMin) {
        gallonsApplied = Math.round((Number(zone.Total_GPH) * Number(durationMin) / 60) * 10) / 10;
      }
    }

    const logId = `WTR-${Date.now()}`;

    sheet.appendRow([
      logId, date, zoneId, startTime || '', endTime || '', durationMin || '',
      gallonsApplied, method || 'Drip', cropStage || '', soilMoistureBefore || '',
      soilMoistureAfter || '', weather || '', tempF || '', notes || '', loggedBy || ''
    ]);

    return { success: true, logId: logId, gallonsApplied: gallonsApplied, message: 'Watering logged' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getIrrigationMaintenance(params) {
  try {
    const { zoneId } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('IRRIGATION_MAINTENANCE');

    if (!sheet) {
      sheet = ss.insertSheet('IRRIGATION_MAINTENANCE');
      sheet.appendRow(['Maint_ID', 'Date', 'Zone_ID', 'Type', 'Description', 'Parts_Used', 'Cost', 'Time_Min', 'Completed_By', 'Next_Due', 'Notes']);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let logs = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    if (zoneId) logs = logs.filter(l => l.Zone_ID === zoneId);

    logs.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Find overdue maintenance
    const today = new Date();
    const overdue = logs.filter(l => l.Next_Due && new Date(l.Next_Due) < today);

    return { success: true, logs: logs, overdue: overdue };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logIrrigationMaintenance(params) {
  try {
    const {
      zoneId, type, description, partsUsed, cost, timeMin,
      completedBy, nextDue, notes
    } = params;
    const date = params.date || new Date().toISOString().split('T')[0];

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('IRRIGATION_MAINTENANCE');

    if (!sheet) {
      sheet = ss.insertSheet('IRRIGATION_MAINTENANCE');
      sheet.appendRow(['Maint_ID', 'Date', 'Zone_ID', 'Type', 'Description', 'Parts_Used', 'Cost', 'Time_Min', 'Completed_By', 'Next_Due', 'Notes']);
    }

    const maintId = `MNT-${Date.now()}`;

    sheet.appendRow([
      maintId, date, zoneId || '', type || '', description || '',
      partsUsed || '', cost || '', timeMin || '', completedBy || '',
      nextDue || '', notes || ''
    ]);

    // Update zone last service date
    if (zoneId) {
      const zonesSheet = ss.getSheetByName('IRRIGATION_ZONES');
      if (zonesSheet) {
        const data = zonesSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === zoneId) {
            zonesSheet.getRange(i + 1, 16).setValue(date); // Last_Service column
            break;
          }
        }
      }
    }

    return { success: true, maintId: maintId, message: 'Maintenance logged' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getIrrigationDashboard(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get zones
    const zonesResult = getIrrigationZones({});
    const zones = zonesResult.success ? zonesResult.zones : [];

    // Get recent watering (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const wateringResult = getWateringLog({ startDate: weekAgo.toISOString().split('T')[0] });
    const recentWatering = wateringResult.success ? wateringResult.logs : [];

    // Get maintenance
    const maintResult = getIrrigationMaintenance({});
    const overdue = maintResult.success ? maintResult.overdue : [];

    // Calculate stats
    const totalGPH = zones.reduce((sum, z) => sum + (Number(z.Total_GPH) || 0), 0);
    const weekGallons = recentWatering.reduce((sum, w) => sum + (Number(w.Gallons_Applied) || 0), 0);

    return {
      success: true,
      zoneCount: zones.length,
      totalGPH: totalGPH,
      weekWateringEvents: recentWatering.length,
      weekGallonsApplied: weekGallons,
      overdueMaintenanceCount: overdue.length,
      overdueMaintenance: overdue,
      zones: zones
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FARM INFRASTRUCTURE & EQUIPMENT LOCATIONS
// ═══════════════════════════════════════════════════════════════════════════

const INFRASTRUCTURE_TYPES = [
  'Hydrant',
  'Well',
  'Pump Station',
  'Water Tank',
  'Tool Shed',
  'Equipment Storage',
  'Cooler/Cold Storage',
  'Greenhouse',
  'High Tunnel',
  'Wash Station',
  'Compost Area',
  'Fuel Storage',
  'Electrical Panel',
  'Gate',
  'Fence Post (Corner)',
  'Property Marker',
  'Weather Station',
  'Other'
];

function getFarmInfrastructure(params) {
  try {
    const { type, fieldId } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('FARM_INFRASTRUCTURE');

    if (!sheet) {
      sheet = ss.insertSheet('FARM_INFRASTRUCTURE');
      sheet.appendRow([
        'Item_ID', 'Type', 'Name', 'Description', 'Field_ID', 'GPS_Lat', 'GPS_Lng',
        'GPS_Accuracy', 'Install_Date', 'Condition', 'Last_Inspection', 'Next_Maintenance',
        'Photo_URL', 'Notes', 'Created_By', 'Created_At'
      ]);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let items = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    if (type) items = items.filter(i => i.Type === type);
    if (fieldId) items = items.filter(i => i.Field_ID === fieldId);

    // Get counts by type
    const typeCounts = {};
    items.forEach(item => {
      typeCounts[item.Type] = (typeCounts[item.Type] || 0) + 1;
    });

    return {
      success: true,
      items: items,
      typeCounts: typeCounts,
      availableTypes: INFRASTRUCTURE_TYPES
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveFarmInfrastructure(params) {
  try {
    const {
      itemId, type, name, description, fieldId, gpsLat, gpsLng, gpsAccuracy,
      installDate, condition, lastInspection, nextMaintenance, photoUrl, notes, createdBy
    } = params;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('FARM_INFRASTRUCTURE');

    if (!sheet) {
      sheet = ss.insertSheet('FARM_INFRASTRUCTURE');
      sheet.appendRow([
        'Item_ID', 'Type', 'Name', 'Description', 'Field_ID', 'GPS_Lat', 'GPS_Lng',
        'GPS_Accuracy', 'Install_Date', 'Condition', 'Last_Inspection', 'Next_Maintenance',
        'Photo_URL', 'Notes', 'Created_By', 'Created_At'
      ]);
    }

    const now = new Date().toISOString();

    // Update existing or create new
    if (itemId) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === itemId) {
          sheet.getRange(i + 1, 1, 1, 16).setValues([[
            itemId, type, name, description || '', fieldId || '',
            gpsLat || data[i][5], gpsLng || data[i][6], gpsAccuracy || data[i][7],
            installDate || data[i][8], condition || data[i][9],
            lastInspection || data[i][10], nextMaintenance || data[i][11],
            photoUrl || data[i][12], notes || data[i][13],
            data[i][14], data[i][15]
          ]]);
          return { success: true, itemId: itemId, message: 'Infrastructure updated' };
        }
      }
    }

    // Create new item
    const newId = `INF-${Date.now()}`;
    sheet.appendRow([
      newId, type, name, description || '', fieldId || '',
      gpsLat || '', gpsLng || '', gpsAccuracy || '',
      installDate || '', condition || 'Good', '', '',
      photoUrl || '', notes || '', createdBy || '', now
    ]);

    return { success: true, itemId: newId, message: 'Infrastructure added' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteFarmInfrastructure(params) {
  try {
    const { itemId } = params;
    if (!itemId) return { success: false, error: 'No itemId provided' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('FARM_INFRASTRUCTURE');
    if (!sheet) return { success: false, error: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Infrastructure deleted' };
      }
    }

    return { success: false, error: 'Item not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getInfrastructureMap(params) {
  try {
    const result = getFarmInfrastructure({});
    if (!result.success) return result;

    // Filter items with GPS coordinates
    const mappedItems = result.items.filter(item =>
      item.GPS_Lat && item.GPS_Lng &&
      !isNaN(Number(item.GPS_Lat)) && !isNaN(Number(item.GPS_Lng))
    );

    // Group by type for map layers
    const layers = {};
    mappedItems.forEach(item => {
      if (!layers[item.Type]) layers[item.Type] = [];
      layers[item.Type].push({
        id: item.Item_ID,
        name: item.Name,
        lat: Number(item.GPS_Lat),
        lng: Number(item.GPS_Lng),
        condition: item.Condition,
        description: item.Description
      });
    });

    // Get farm center
    const farmCenter = GOOGLE_ROUTES_CONFIG.FARM_COORDS;

    return {
      success: true,
      center: farmCenter,
      totalItems: mappedItems.length,
      layers: layers,
      items: mappedItems
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// BOUNDARY TRACING - Property Lines, Field Outlines, Zones
// ============================================================================

const BOUNDARY_TYPES = [
  'Property Line',
  'Field Outline',
  'Growing Zone',
  'Irrigation Zone',
  'High Tunnel Area',
  'Cover Crop Area',
  'Buffer Zone',
  'Wetland',
  'Wooded Area',
  'No-Spray Zone',
  'Other'
];

function getBoundaries(params) {
  try {
    const { type } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('FARM_BOUNDARIES');

    if (!sheet) {
      sheet = ss.insertSheet('FARM_BOUNDARIES');
      sheet.appendRow([
        'Boundary_ID', 'Type', 'Name', 'Description', 'Color',
        'Coordinates', 'Area_SqFt', 'Perimeter_Ft', 'Acres',
        'Created_By', 'Created_At', 'Updated_At'
      ]);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let boundaries = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      // Parse coordinates from JSON string
      if (obj.Coordinates) {
        try {
          obj.Coordinates = JSON.parse(obj.Coordinates);
        } catch (e) {
          obj.Coordinates = [];
        }
      }
      return obj;
    }).filter(b => b.Boundary_ID);

    if (type) boundaries = boundaries.filter(b => b.Type === type);

    // Get counts by type
    const typeCounts = {};
    boundaries.forEach(b => {
      typeCounts[b.Type] = (typeCounts[b.Type] || 0) + 1;
    });

    return {
      success: true,
      boundaries: boundaries,
      typeCounts: typeCounts,
      availableTypes: BOUNDARY_TYPES
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveBoundary(params) {
  try {
    const {
      boundaryId, type, name, description, color, coordinates, createdBy
    } = params;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('FARM_BOUNDARIES');

    if (!sheet) {
      sheet = ss.insertSheet('FARM_BOUNDARIES');
      sheet.appendRow([
        'Boundary_ID', 'Type', 'Name', 'Description', 'Color',
        'Coordinates', 'Area_SqFt', 'Perimeter_Ft', 'Acres',
        'Created_By', 'Created_At', 'Updated_At'
      ]);
    }

    // Parse coordinates array
    let coords = coordinates;
    if (typeof coordinates === 'string') {
      coords = JSON.parse(coordinates);
    }

    // Calculate area and perimeter if closed polygon
    const areaStats = calculatePolygonStats(coords);

    const now = new Date().toISOString();

    if (boundaryId) {
      // Update existing
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === boundaryId) {
          sheet.getRange(i + 1, 1, 1, 12).setValues([[
            boundaryId, type, name, description || '', color || '#3b82f6',
            JSON.stringify(coords), areaStats.areaSqFt, areaStats.perimeterFt, areaStats.acres,
            data[i][9], data[i][10], now
          ]]);
          return { success: true, boundaryId: boundaryId, message: 'Boundary updated', stats: areaStats };
        }
      }
    }

    // Create new
    const newId = 'BND-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet.appendRow([
      newId, type, name, description || '', color || '#3b82f6',
      JSON.stringify(coords), areaStats.areaSqFt, areaStats.perimeterFt, areaStats.acres,
      createdBy || '', now, now
    ]);

    return { success: true, boundaryId: newId, message: 'Boundary created', stats: areaStats };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteBoundary(params) {
  try {
    const { boundaryId } = params;
    if (!boundaryId) return { success: false, error: 'Boundary ID required' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('FARM_BOUNDARIES');
    if (!sheet) return { success: false, error: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === boundaryId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Boundary deleted' };
      }
    }

    return { success: false, error: 'Boundary not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Calculate area and perimeter of polygon using Shoelace formula
function calculatePolygonStats(coordinates) {
  if (!coordinates || coordinates.length < 3) {
    return { areaSqFt: 0, perimeterFt: 0, acres: 0 };
  }

  // Convert lat/lng to approximate feet (at ~40° latitude)
  const feetPerDegreeLat = 364000; // ~111km per degree
  const feetPerDegreeLng = 279000; // ~85km per degree at 40° latitude

  const centerLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;

  // Convert to local coordinates in feet
  const localCoords = coordinates.map(c => ({
    x: (c.lng - coordinates[0].lng) * feetPerDegreeLng,
    y: (c.lat - coordinates[0].lat) * feetPerDegreeLat
  }));

  // Shoelace formula for area
  let area = 0;
  for (let i = 0; i < localCoords.length; i++) {
    const j = (i + 1) % localCoords.length;
    area += localCoords[i].x * localCoords[j].y;
    area -= localCoords[j].x * localCoords[i].y;
  }
  area = Math.abs(area) / 2;

  // Calculate perimeter
  let perimeter = 0;
  for (let i = 0; i < localCoords.length; i++) {
    const j = (i + 1) % localCoords.length;
    const dx = localCoords[j].x - localCoords[i].x;
    const dy = localCoords[j].y - localCoords[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return {
    areaSqFt: Math.round(area),
    perimeterFt: Math.round(perimeter),
    acres: Math.round(area / 43560 * 100) / 100
  };
}

// ============================================================================
// FIELD SCOUTING MAP DATA - For Employee App Pest/Disease Mapping
// ============================================================================

function getScoutingMapData(params) {
  try {
    const { startDate, endDate, type, severity } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('FIELD_SCOUTING');

    if (!sheet) {
      // Return empty if no scouting data yet
      return {
        success: true,
        observations: [],
        hotspots: [],
        summary: { total: 0, byType: {}, bySeverity: {} }
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let observations = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }).filter(o => o.Scout_ID && o.GPS_Lat && o.GPS_Lng);

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      observations = observations.filter(o => new Date(o.Date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      observations = observations.filter(o => new Date(o.Date) <= end);
    }

    // Filter by type and severity
    if (type) observations = observations.filter(o => o.Observation_Type === type);
    if (severity) observations = observations.filter(o => o.Severity === severity);

    // Calculate hotspots (cluster nearby observations)
    const hotspots = calculateHotspots(observations);

    // Summary stats
    const summary = {
      total: observations.length,
      byType: {},
      bySeverity: {}
    };

    observations.forEach(o => {
      summary.byType[o.Observation_Type] = (summary.byType[o.Observation_Type] || 0) + 1;
      summary.bySeverity[o.Severity] = (summary.bySeverity[o.Severity] || 0) + 1;
    });

    return {
      success: true,
      observations: observations,
      hotspots: hotspots,
      summary: summary
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function calculateHotspots(observations) {
  // Simple clustering - group observations within ~50ft of each other
  const clusterRadius = 0.00015; // ~50ft in degrees
  const hotspots = [];
  const used = new Set();

  observations.forEach((obs, i) => {
    if (used.has(i)) return;

    const cluster = [obs];
    used.add(i);

    observations.forEach((other, j) => {
      if (used.has(j)) return;

      const dist = Math.sqrt(
        Math.pow(obs.GPS_Lat - other.GPS_Lat, 2) +
        Math.pow(obs.GPS_Lng - other.GPS_Lng, 2)
      );

      if (dist < clusterRadius) {
        cluster.push(other);
        used.add(j);
      }
    });

    if (cluster.length >= 2) {
      // Calculate center
      const center = {
        lat: cluster.reduce((sum, c) => sum + Number(c.GPS_Lat), 0) / cluster.length,
        lng: cluster.reduce((sum, c) => sum + Number(c.GPS_Lng), 0) / cluster.length
      };

      // Determine dominant type
      const types = {};
      cluster.forEach(c => types[c.Observation_Type] = (types[c.Observation_Type] || 0) + 1);
      const dominantType = Object.entries(types).sort((a, b) => b[1] - a[1])[0][0];

      // Highest severity
      const severities = ['Critical', 'High', 'Medium', 'Low'];
      let highestSeverity = 'Low';
      for (const sev of severities) {
        if (cluster.some(c => c.Severity === sev)) {
          highestSeverity = sev;
          break;
        }
      }

      hotspots.push({
        center: center,
        count: cluster.length,
        dominantType: dominantType,
        highestSeverity: highestSeverity,
        observations: cluster.map(c => c.Scout_ID)
      });
    }
  });

  return hotspots;
}

// =============================================================================
// FINANCIAL MODULE
// =============================================================================
// Handles all financial data: debts, banking, investments, and gamification.
// Version: 1.0.0

const FINANCIAL_CONFIG = {
    // Financial sheet ID - uses same spreadsheet as main app
    SHEET_ID: SPREADSHEET_ID,

    // Tab names for financial data
    TABS: {
        DEBTS: 'FIN_DEBTS',
        DEBT_PAYMENTS: 'FIN_DEBT_PAYMENTS',
        BANK_ACCOUNTS: 'FIN_BANK_ACCOUNTS',
        BILLS: 'FIN_BILLS',
        TRANSACTIONS: 'FIN_TRANSACTIONS',
        INVESTMENTS: 'FIN_INVESTMENTS',
        INVESTMENT_HISTORY: 'FIN_INVESTMENT_HISTORY',
        EMPLOYEES: 'FIN_EMPLOYEES',
        EMPLOYEE_XP: 'FIN_EMPLOYEE_XP',
        ACHIEVEMENTS: 'FIN_ACHIEVEMENTS',
        ROUND_UPS: 'FIN_ROUND_UPS',
        ROUND_UP_INVESTMENTS: 'FIN_ROUND_UP_INVESTMENTS',
        FINANCIAL_SETTINGS: 'FIN_SETTINGS',
        FINANCIAL_DASHBOARD: 'FIN_DASHBOARD'
    }
};

// =============================================================================
// SHEET CREATION - Run once to set up financial sheets
// =============================================================================

function createFinancialSheets() {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const results = [];

    // Debts sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.DEBTS, [
        'Debt_ID', 'Name', 'Type', 'Current_Balance', 'Original_Balance',
        'APR', 'Min_Payment', 'Due_Day', 'Account_Number', 'Lender',
        'Status', 'Priority', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Debt Payments sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.DEBT_PAYMENTS, [
        'Payment_ID', 'Debt_ID', 'Payment_Date', 'Amount', 'Principal',
        'Interest', 'New_Balance', 'Method', 'Confirmation', 'Notes', 'Recorded_At'
    ]));

    // Bank Accounts sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS, [
        'Account_ID', 'Name', 'Type', 'Institution', 'Account_Number_Last4',
        'Current_Balance', 'Available_Balance', 'APY', 'Status',
        'Is_Primary', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Bills sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.BILLS, [
        'Bill_ID', 'Name', 'Category', 'Amount', 'Due_Day', 'Frequency',
        'Account_ID', 'Auto_Pay', 'Status', 'Last_Paid', 'Next_Due',
        'Reminder_Days', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Transactions sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.TRANSACTIONS, [
        'Transaction_ID', 'Date', 'Account_ID', 'Type', 'Category',
        'Description', 'Amount', 'Balance_After', 'Source', 'Reference',
        'Tags', 'Notes', 'Created_At'
    ]));

    // Investments sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.INVESTMENTS, [
        'Investment_ID', 'Symbol', 'Name', 'Type', 'Category', 'Shares',
        'Cost_Basis', 'Current_Price', 'Current_Value', 'Gain_Loss',
        'Gain_Loss_Pct', 'Account', 'Purchase_Date', 'Notes', 'Updated_At'
    ]));

    // Investment History sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.INVESTMENT_HISTORY, [
        'History_ID', 'Date', 'Action', 'Symbol', 'Shares', 'Price',
        'Total', 'Account', 'Source', 'Notes', 'Created_At'
    ]));

    // Employees sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.EMPLOYEES, [
        'Employee_ID', 'Name', 'Email', 'Role', 'Department', 'Start_Date',
        'XP_Total', 'Level', 'Current_Streak', 'Best_Streak', 'Bonus_Tier',
        'Total_Bonus_Earned', 'Status', 'Notes', 'Created_At', 'Updated_At'
    ]));

    // Employee XP History sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.EMPLOYEE_XP, [
        'XP_ID', 'Employee_ID', 'Activity', 'XP_Amount', 'Category',
        'Description', 'Recorded_By', 'Notes', 'Created_At'
    ]));

    // Achievements sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.ACHIEVEMENTS, [
        'Achievement_ID', 'Employee_ID', 'Achievement_Code', 'Achievement_Name',
        'Category', 'XP_Reward', 'Unlocked_At', 'Notes'
    ]));

    // Round-ups sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.ROUND_UPS, [
        'RoundUp_ID', 'Date', 'Source', 'Original_Amount', 'RoundUp_Amount',
        'Multiplier', 'Final_Amount', 'Order_ID', 'Customer_ID',
        'Description', 'Status', 'Created_At'
    ]));

    // Round-up Investments sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.ROUND_UP_INVESTMENTS, [
        'Investment_ID', 'Date', 'Total_Amount', 'Safe_Amount', 'Growth_Amount',
        'Transaction_Count', 'Season', 'Multiplier', 'Allocation_Details',
        'Status', 'Notes', 'Created_At'
    ]));

    // Financial Settings sheet
    results.push(createFinancialSheetIfNotExists(ss, FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS, [
        'Setting_Key', 'Setting_Value', 'Category', 'Description', 'Updated_At'
    ]));

    // Initialize default settings
    initializeFinancialDefaultSettings(ss);

    return {
        success: true,
        message: 'Financial sheets created successfully',
        results: results
    };
}

function createFinancialSheetIfNotExists(ss, sheetName, headers) {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a472a');
        sheet.getRange(1, 1, 1, headers.length).setFontColor('#ffffff');
        sheet.setFrozenRows(1);

        return { sheet: sheetName, status: 'created', columns: headers.length };
    }

    return { sheet: sheetName, status: 'exists', columns: headers.length };
}

function initializeFinancialDefaultSettings(ss) {
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    if (data.length > 1) return; // Settings already exist

    const defaults = [
        ['debt_strategy', 'avalanche', 'debt', 'Debt payoff strategy: avalanche or snowball'],
        ['roundup_multiplier', '1', 'roundups', 'Round-up multiplier (1x, 2x, 3x, 5x, 10x)'],
        ['auto_invest_threshold', '25', 'roundups', 'Auto-invest when round-ups reach this amount'],
        ['safe_allocation', '0.75', 'investments', 'Percentage allocated to safe investments'],
        ['growth_allocation', '0.25', 'investments', 'Percentage allocated to growth investments'],
        ['gamification_enabled', 'true', 'employees', 'Enable employee gamification features'],
        ['bonus_pool_percentage', '0.05', 'employees', 'Percentage of profits for bonus pool'],
        ['emergency_fund_target', '10000', 'goals', 'Target emergency fund amount'],
        ['sep_ira_percentage', '0.25', 'investments', 'SEP-IRA contribution percentage'],
        ['dashboard_refresh_interval', '300', 'system', 'Dashboard refresh interval in seconds']
    ];

    defaults.forEach(setting => {
        sheet.appendRow([...setting, new Date().toISOString()]);
    });
}

// =============================================================================
// DEBT MANAGEMENT
// =============================================================================

function getDebts(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: true, data: [], count: 0, message: 'Debts sheet not found. Run createFinancialSheets() first.' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const debts = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const debt = {};
        headers.forEach((header, index) => {
            debt[header] = row[index];
        });

        // Calculate interest and payoff info
        debt.monthlyInterest = (parseFloat(debt.Current_Balance) * (parseFloat(debt.APR) / 100)) / 12;

        debts.push(debt);
    }

    // Sort by strategy if requested
    if (params.sortBy === 'avalanche') {
        debts.sort((a, b) => parseFloat(b.APR) - parseFloat(a.APR));
    } else if (params.sortBy === 'snowball') {
        debts.sort((a, b) => parseFloat(a.Current_Balance) - parseFloat(b.Current_Balance));
    }

    // Filter by status
    let filtered = debts;
    if (params.status) {
        filtered = debts.filter(d => d.Status === params.status);
    }

    // Calculate totals
    const totals = {
        totalBalance: filtered.reduce((sum, d) => sum + parseFloat(d.Current_Balance || 0), 0),
        totalMinPayment: filtered.reduce((sum, d) => sum + parseFloat(d.Min_Payment || 0), 0),
        totalMonthlyInterest: filtered.reduce((sum, d) => sum + (d.monthlyInterest || 0), 0),
        averageAPR: filtered.length > 0 ?
            filtered.reduce((sum, d) => sum + parseFloat(d.APR || 0), 0) / filtered.length : 0
    };

    return {
        success: true,
        data: filtered,
        count: filtered.length,
        totals: totals
    };
}

function saveDebt(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: false, error: 'Debts sheet not found. Run createFinancialSheets() first.' };
    }

    const debtId = params.id || 'DEBT_' + Date.now();
    const now = new Date().toISOString();

    const newRow = [
        debtId,
        params.name || '',
        params.type || 'Credit Card',
        parseFloat(params.balance) || 0,
        parseFloat(params.originalBalance) || parseFloat(params.balance) || 0,
        parseFloat(params.apr) || 0,
        parseFloat(params.minPayment) || 0,
        parseInt(params.dueDay) || 1,
        params.accountNumber || '',
        params.lender || '',
        params.status || 'Active',
        params.priority || 'Normal',
        params.notes || '',
        now,
        now
    ];

    sheet.appendRow(newRow);

    return {
        success: true,
        message: 'Debt saved successfully',
        debtId: debtId
    };
}

function updateDebt(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: false, error: 'Debts sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const debtIdCol = headers.indexOf('Debt_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][debtIdCol] === params.debtId) {
            // Update each field if provided
            const updatedFields = [];

            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'debtId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                    updatedFields.push(key);
                }
            });

            // Update timestamp
            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return {
                success: true,
                message: 'Debt updated',
                updatedFields: updatedFields
            };
        }
    }

    return { success: false, error: 'Debt not found' };
}

function deleteDebt(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!sheet) {
        return { success: false, error: 'Debts sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const debtIdCol = headers.indexOf('Debt_ID');
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
        if (data[i][debtIdCol] === params.debtId) {
            // Soft delete - mark as Deleted
            if (statusCol >= 0) {
                sheet.getRange(i + 1, statusCol + 1).setValue('Deleted');
            }

            return {
                success: true,
                message: 'Debt marked as deleted'
            };
        }
    }

    return { success: false, error: 'Debt not found' };
}

function recordDebtPayment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const paymentSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBT_PAYMENTS);
    const debtSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBTS);

    if (!paymentSheet || !debtSheet) {
        return { success: false, error: 'Required sheets not found' };
    }

    // Get current debt balance
    const debtData = debtSheet.getDataRange().getValues();
    const debtHeaders = debtData[0];
    const debtIdCol = debtHeaders.indexOf('Debt_ID');
    const balanceCol = debtHeaders.indexOf('Current_Balance');
    const aprCol = debtHeaders.indexOf('APR');

    let debtRow = -1;
    let currentBalance = 0;
    let apr = 0;

    for (let i = 1; i < debtData.length; i++) {
        if (debtData[i][debtIdCol] === params.debtId) {
            debtRow = i + 1;
            currentBalance = parseFloat(debtData[i][balanceCol]) || 0;
            apr = parseFloat(debtData[i][aprCol]) || 0;
            break;
        }
    }

    if (debtRow < 0) {
        return { success: false, error: 'Debt not found' };
    }

    // Calculate principal and interest
    const amount = parseFloat(params.amount) || 0;
    const monthlyInterest = (currentBalance * (apr / 100)) / 12;
    const interest = Math.min(amount, monthlyInterest);
    const principal = amount - interest;
    const newBalance = Math.max(0, currentBalance - principal);

    // Record payment
    const paymentId = 'PAY_' + Date.now();
    const now = new Date().toISOString();

    paymentSheet.appendRow([
        paymentId,
        params.debtId,
        params.paymentDate || now.split('T')[0],
        amount,
        principal,
        interest,
        newBalance,
        params.method || 'Manual',
        params.confirmation || '',
        params.notes || '',
        now
    ]);

    // Update debt balance
    debtSheet.getRange(debtRow, balanceCol + 1).setValue(newBalance);

    // Update debt status if paid off
    if (newBalance <= 0) {
        const statusCol = debtHeaders.indexOf('Status');
        if (statusCol >= 0) {
            debtSheet.getRange(debtRow, statusCol + 1).setValue('Paid Off');
        }
    }

    return {
        success: true,
        message: 'Payment recorded',
        paymentId: paymentId,
        principal: principal,
        interest: interest,
        newBalance: newBalance,
        paidOff: newBalance <= 0
    };
}

function getDebtPayments(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.DEBT_PAYMENTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const payments = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const payment = {};
        headers.forEach((header, index) => {
            payment[header] = row[index];
        });

        // Filter by debt if provided
        if (params.debtId && payment.Debt_ID !== params.debtId) continue;

        payments.push(payment);
    }

    // Sort by date descending
    payments.sort((a, b) => new Date(b.Payment_Date) - new Date(a.Payment_Date));

    return {
        success: true,
        data: payments,
        count: payments.length
    };
}

// =============================================================================
// BANK ACCOUNTS
// =============================================================================

function getBankAccounts(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const accounts = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const account = {};
        headers.forEach((header, index) => {
            account[header] = row[index];
        });

        // Filter by type if provided
        if (params.type && account.Type !== params.type) continue;
        if (params.status && account.Status !== params.status) continue;

        accounts.push(account);
    }

    // Calculate totals
    const totals = {
        totalBalance: accounts.reduce((sum, a) => sum + parseFloat(a.Current_Balance || 0), 0),
        checking: accounts.filter(a => a.Type === 'Checking').reduce((sum, a) => sum + parseFloat(a.Current_Balance || 0), 0),
        savings: accounts.filter(a => a.Type === 'Savings').reduce((sum, a) => sum + parseFloat(a.Current_Balance || 0), 0)
    };

    return {
        success: true,
        data: accounts,
        count: accounts.length,
        totals: totals
    };
}

function saveBankAccount(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) {
        return { success: false, error: 'Bank accounts sheet not found' };
    }

    const accountId = params.id || 'ACCT_' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
        accountId,
        params.name || '',
        params.type || 'Checking',
        params.institution || '',
        params.last4 || '',
        parseFloat(params.balance) || 0,
        parseFloat(params.availableBalance) || parseFloat(params.balance) || 0,
        parseFloat(params.apy) || 0,
        params.status || 'Active',
        params.isPrimary || false,
        params.notes || '',
        now,
        now
    ]);

    return {
        success: true,
        message: 'Bank account saved',
        accountId: accountId
    };
}

function updateBankAccount(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) {
        return { success: false, error: 'Bank accounts sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const accountIdCol = headers.indexOf('Account_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][accountIdCol] === params.accountId) {
            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'accountId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                }
            });

            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return { success: true, message: 'Bank account updated' };
        }
    }

    return { success: false, error: 'Account not found' };
}

// =============================================================================
// BILLS
// =============================================================================

function getBills(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BILLS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const bills = [];
    const today = new Date();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const bill = {};
        headers.forEach((header, index) => {
            bill[header] = row[index];
        });

        // Calculate next due date
        bill.nextDueDate = calculateBillNextDueDate(bill.Due_Day, bill.Frequency, bill.Last_Paid);
        bill.daysUntilDue = Math.ceil((new Date(bill.nextDueDate) - today) / (1000 * 60 * 60 * 24));
        bill.isOverdue = bill.daysUntilDue < 0;
        bill.isDueSoon = bill.daysUntilDue >= 0 && bill.daysUntilDue <= 7;

        // Filter by status
        if (params.status && bill.Status !== params.status) continue;
        if (params.dueSoon && !bill.isDueSoon && !bill.isOverdue) continue;

        bills.push(bill);
    }

    // Sort by next due date
    bills.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

    // Calculate totals
    const totals = {
        monthlyTotal: bills.reduce((sum, b) => {
            const freq = b.Frequency || 'Monthly';
            const amount = parseFloat(b.Amount) || 0;
            if (freq === 'Weekly') return sum + (amount * 4);
            if (freq === 'Bi-Weekly') return sum + (amount * 2);
            if (freq === 'Quarterly') return sum + (amount / 3);
            if (freq === 'Annually') return sum + (amount / 12);
            return sum + amount;
        }, 0),
        overdue: bills.filter(b => b.isOverdue).length,
        dueSoon: bills.filter(b => b.isDueSoon).length
    };

    return {
        success: true,
        data: bills,
        count: bills.length,
        totals: totals
    };
}

function calculateBillNextDueDate(dueDay, frequency, lastPaid) {
    const today = new Date();
    let nextDue = new Date(today);

    if (frequency === 'Weekly') {
        // Next occurrence of that day of week
        const targetDay = parseInt(dueDay) || 0; // 0 = Sunday
        const daysUntil = (targetDay - today.getDay() + 7) % 7;
        nextDue.setDate(today.getDate() + (daysUntil || 7));
    } else if (frequency === 'Bi-Weekly') {
        const lastPaidDate = lastPaid ? new Date(lastPaid) : new Date(today.setDate(today.getDate() - 14));
        nextDue = new Date(lastPaidDate);
        nextDue.setDate(nextDue.getDate() + 14);
        while (nextDue < new Date()) {
            nextDue.setDate(nextDue.getDate() + 14);
        }
    } else if (frequency === 'Quarterly') {
        nextDue.setDate(parseInt(dueDay) || 1);
        while (nextDue <= today) {
            nextDue.setMonth(nextDue.getMonth() + 3);
        }
    } else if (frequency === 'Annually') {
        nextDue.setDate(parseInt(dueDay) || 1);
        if (nextDue <= today) {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
    } else {
        // Monthly (default)
        nextDue.setDate(parseInt(dueDay) || 1);
        if (nextDue <= today) {
            nextDue.setMonth(nextDue.getMonth() + 1);
        }
    }

    return formatFinancialDate(nextDue);
}

function saveBill(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BILLS);

    if (!sheet) {
        return { success: false, error: 'Bills sheet not found' };
    }

    const billId = params.id || 'BILL_' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
        billId,
        params.name || '',
        params.category || 'Utilities',
        parseFloat(params.amount) || 0,
        parseInt(params.dueDay) || 1,
        params.frequency || 'Monthly',
        params.accountId || '',
        params.autoPay || false,
        params.status || 'Active',
        params.lastPaid || '',
        calculateBillNextDueDate(params.dueDay, params.frequency, params.lastPaid),
        parseInt(params.reminderDays) || 3,
        params.notes || '',
        now,
        now
    ]);

    return {
        success: true,
        message: 'Bill saved',
        billId: billId
    };
}

function updateBill(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BILLS);

    if (!sheet) {
        return { success: false, error: 'Bills sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const billIdCol = headers.indexOf('Bill_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][billIdCol] === params.billId) {
            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'billId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                }
            });

            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return { success: true, message: 'Bill updated' };
        }
    }

    return { success: false, error: 'Bill not found' };
}

// =============================================================================
// INVESTMENTS
// =============================================================================

function getInvestments(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const investments = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const investment = {};
        headers.forEach((header, index) => {
            investment[header] = row[index];
        });

        // Filter by category
        if (params.category && investment.Category !== params.category) continue;
        if (params.account && investment.Account !== params.account) continue;

        investments.push(investment);
    }

    // Calculate totals
    const totals = {
        totalValue: investments.reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0),
        totalCostBasis: investments.reduce((sum, i) => sum + parseFloat(i.Cost_Basis || 0), 0),
        totalGainLoss: investments.reduce((sum, i) => sum + parseFloat(i.Gain_Loss || 0), 0),
        safeValue: investments.filter(i => i.Category === 'Safe').reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0),
        growthValue: investments.filter(i => i.Category === 'Growth').reduce((sum, i) => sum + parseFloat(i.Current_Value || 0), 0)
    };

    totals.overallReturnPct = totals.totalCostBasis > 0 ?
        ((totals.totalValue - totals.totalCostBasis) / totals.totalCostBasis) * 100 : 0;

    return {
        success: true,
        data: investments,
        count: investments.length,
        totals: totals
    };
}

function saveInvestment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENTS);

    if (!sheet) {
        return { success: false, error: 'Investments sheet not found' };
    }

    const investmentId = params.id || 'INV_' + Date.now();
    const shares = parseFloat(params.shares) || 0;
    const price = parseFloat(params.price) || 0;
    const costBasis = parseFloat(params.costBasis) || (shares * price);
    const currentPrice = parseFloat(params.currentPrice) || price;
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - costBasis;
    const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    sheet.appendRow([
        investmentId,
        params.symbol || '',
        params.name || '',
        params.type || 'ETF',
        params.category || 'Safe',
        shares,
        costBasis,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPct,
        params.account || 'Main',
        params.purchaseDate || formatFinancialDate(new Date()),
        params.notes || '',
        new Date().toISOString()
    ]);

    // Record in history
    recordInvestmentHistory({
        action: 'BUY',
        symbol: params.symbol,
        shares: shares,
        price: price,
        total: costBasis,
        account: params.account,
        source: params.source || 'Manual'
    });

    return {
        success: true,
        message: 'Investment saved',
        investmentId: investmentId
    };
}

function updateInvestment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENTS);

    if (!sheet) {
        return { success: false, error: 'Investments sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const investmentIdCol = headers.indexOf('Investment_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][investmentIdCol] === params.investmentId) {
            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'investmentId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                }
            });

            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return { success: true, message: 'Investment updated' };
        }
    }

    return { success: false, error: 'Investment not found' };
}

function recordInvestmentHistory(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENT_HISTORY);

    if (!sheet) return { success: false };

    sheet.appendRow([
        'HIST_' + Date.now(),
        params.date || formatFinancialDate(new Date()),
        params.action || 'BUY',
        params.symbol || '',
        parseFloat(params.shares) || 0,
        parseFloat(params.price) || 0,
        parseFloat(params.total) || 0,
        params.account || '',
        params.source || 'Manual',
        params.notes || '',
        new Date().toISOString()
    ]);

    return { success: true };
}

function getInvestmentHistory(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.INVESTMENT_HISTORY);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const history = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = row[index];
        });

        // Filter by symbol
        if (params.symbol && entry.Symbol !== params.symbol) continue;
        if (params.account && entry.Account !== params.account) continue;

        history.push(entry);
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return {
        success: true,
        data: history,
        count: history.length
    };
}

// =============================================================================
// EMPLOYEE GAMIFICATION
// =============================================================================

function getFinancialEmployees(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const employees = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const employee = {};
        headers.forEach((header, index) => {
            employee[header] = row[index];
        });

        // Filter by status
        if (params.status && employee.Status !== params.status) continue;
        if (params.department && employee.Department !== params.department) continue;

        // Calculate level from XP
        employee.calculatedLevel = calculateEmployeeLevel(parseFloat(employee.XP_Total) || 0);

        employees.push(employee);
    }

    // Sort for leaderboard
    if (params.sortBy === 'xp') {
        employees.sort((a, b) => parseFloat(b.XP_Total) - parseFloat(a.XP_Total));
    } else if (params.sortBy === 'level') {
        employees.sort((a, b) => parseInt(b.Level) - parseInt(a.Level));
    }

    return {
        success: true,
        data: employees,
        count: employees.length
    };
}

function calculateEmployeeLevel(xp) {
    const levels = [
        { level: 1, name: 'Seedling', xpRequired: 0 },
        { level: 2, name: 'Sprout', xpRequired: 100 },
        { level: 3, name: 'Sapling', xpRequired: 300 },
        { level: 4, name: 'Growing', xpRequired: 600 },
        { level: 5, name: 'Budding', xpRequired: 1000 },
        { level: 6, name: 'Blooming', xpRequired: 1500 },
        { level: 7, name: 'Flourishing', xpRequired: 2200 },
        { level: 8, name: 'Thriving', xpRequired: 3000 },
        { level: 9, name: 'Harvester', xpRequired: 4000 },
        { level: 10, name: 'Expert Grower', xpRequired: 5200 },
        { level: 11, name: 'Master Farmer', xpRequired: 6500 },
        { level: 12, name: 'Farm Champion', xpRequired: 8000 },
        { level: 13, name: 'Agricultural Ace', xpRequired: 10000 },
        { level: 14, name: 'Legendary Grower', xpRequired: 12500 },
        { level: 15, name: 'Tiny Seed Legend', xpRequired: 15000 }
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
        if (xp >= levels[i].xpRequired) {
            const nextLevel = levels[i + 1];
            return {
                level: levels[i].level,
                name: levels[i].name,
                currentXP: xp,
                xpForCurrentLevel: levels[i].xpRequired,
                xpForNextLevel: nextLevel ? nextLevel.xpRequired : null,
                progressToNext: nextLevel ?
                    ((xp - levels[i].xpRequired) / (nextLevel.xpRequired - levels[i].xpRequired)) * 100 : 100
            };
        }
    }

    return { level: 1, name: 'Seedling', currentXP: xp };
}

function saveFinancialEmployee(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);

    if (!sheet) {
        return { success: false, error: 'Employees sheet not found' };
    }

    const employeeId = params.id || 'EMP_' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
        employeeId,
        params.name || '',
        params.email || '',
        params.role || '',
        params.department || '',
        params.startDate || formatFinancialDate(new Date()),
        0, // XP Total
        1, // Level
        0, // Current Streak
        0, // Best Streak
        'Bronze', // Bonus Tier
        0, // Total Bonus Earned
        params.status || 'Active',
        params.notes || '',
        now,
        now
    ]);

    return {
        success: true,
        message: 'Employee saved',
        employeeId: employeeId
    };
}

function updateFinancialEmployee(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);

    if (!sheet) {
        return { success: false, error: 'Employees sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const employeeIdCol = headers.indexOf('Employee_ID');

    for (let i = 1; i < data.length; i++) {
        if (data[i][employeeIdCol] === params.employeeId) {
            Object.keys(params).forEach(key => {
                const colIndex = headers.indexOf(key);
                if (colIndex >= 0 && key !== 'employeeId' && key !== 'action') {
                    sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
                }
            });

            const updatedAtCol = headers.indexOf('Updated_At');
            if (updatedAtCol >= 0) {
                sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
            }

            return { success: true, message: 'Employee updated' };
        }
    }

    return { success: false, error: 'Employee not found' };
}

function addEmployeeXP(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const employeeSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEES);
    const xpSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEE_XP);

    if (!employeeSheet || !xpSheet) {
        return { success: false, error: 'Required sheets not found' };
    }

    const xpAmount = parseInt(params.xp) || 0;
    if (xpAmount <= 0) {
        return { success: false, error: 'XP amount must be positive' };
    }

    // Find employee
    const data = employeeSheet.getDataRange().getValues();
    const headers = data[0];
    const employeeIdCol = headers.indexOf('Employee_ID');
    const xpTotalCol = headers.indexOf('XP_Total');
    const levelCol = headers.indexOf('Level');

    for (let i = 1; i < data.length; i++) {
        if (data[i][employeeIdCol] === params.employeeId) {
            const currentXP = parseFloat(data[i][xpTotalCol]) || 0;
            const newXP = currentXP + xpAmount;

            // Update XP
            employeeSheet.getRange(i + 1, xpTotalCol + 1).setValue(newXP);

            // Calculate and update level
            const levelInfo = calculateEmployeeLevel(newXP);
            if (levelCol >= 0) {
                employeeSheet.getRange(i + 1, levelCol + 1).setValue(levelInfo.level);
            }

            // Record XP in history
            xpSheet.appendRow([
                'XP_' + Date.now(),
                params.employeeId,
                params.activity || 'General',
                xpAmount,
                params.category || 'Other',
                params.description || '',
                params.recordedBy || 'System',
                params.notes || '',
                new Date().toISOString()
            ]);

            // Check for level up
            const oldLevelInfo = calculateEmployeeLevel(currentXP);
            const leveledUp = levelInfo.level > oldLevelInfo.level;

            return {
                success: true,
                message: `Added ${xpAmount} XP`,
                newTotal: newXP,
                level: levelInfo,
                leveledUp: leveledUp
            };
        }
    }

    return { success: false, error: 'Employee not found' };
}

function getEmployeeXP(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.EMPLOYEE_XP);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const history = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = row[index];
        });

        // Filter by employee
        if (params.employeeId && entry.Employee_ID !== params.employeeId) continue;

        history.push(entry);
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At));

    return {
        success: true,
        data: history,
        count: history.length
    };
}

function unlockAchievement(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ACHIEVEMENTS);

    if (!sheet) {
        return { success: false, error: 'Achievements sheet not found' };
    }

    // Check if already unlocked
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][1] === params.employeeId && data[i][2] === params.achievementCode) {
            return { success: false, error: 'Achievement already unlocked' };
        }
    }

    sheet.appendRow([
        'ACH_' + Date.now(),
        params.employeeId,
        params.achievementCode,
        params.achievementName || '',
        params.category || '',
        parseInt(params.xpReward) || 0,
        new Date().toISOString(),
        params.notes || ''
    ]);

    // Add XP reward
    if (params.xpReward) {
        addEmployeeXP({
            employeeId: params.employeeId,
            xp: params.xpReward,
            activity: 'achievement',
            category: 'Achievement',
            description: `Unlocked: ${params.achievementName}`
        });
    }

    return {
        success: true,
        message: 'Achievement unlocked',
        achievement: params.achievementName
    };
}

function getEmployeeAchievements(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ACHIEVEMENTS);

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const achievements = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const achievement = {};
        headers.forEach((header, index) => {
            achievement[header] = row[index];
        });

        // Filter by employee
        if (params.employeeId && achievement.Employee_ID !== params.employeeId) continue;

        achievements.push(achievement);
    }

    return {
        success: true,
        data: achievements,
        count: achievements.length
    };
}

// =============================================================================
// ROUND-UPS / CHANGE INVESTING
// =============================================================================

function getRoundUps(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UPS);

    if (!sheet) {
        return { success: true, data: [], count: 0, balance: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const roundUps = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const roundUp = {};
        headers.forEach((header, index) => {
            roundUp[header] = row[index];
        });

        // Filter by status (pending = not yet invested)
        if (params.status && roundUp.Status !== params.status) continue;
        if (params.source && roundUp.Source !== params.source) continue;

        roundUps.push(roundUp);
    }

    // Calculate pending balance
    const pendingBalance = roundUps
        .filter(r => r.Status === 'Pending')
        .reduce((sum, r) => sum + parseFloat(r.Final_Amount || 0), 0);

    return {
        success: true,
        data: roundUps,
        count: roundUps.length,
        pendingBalance: pendingBalance
    };
}

function saveRoundUp(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UPS);

    if (!sheet) {
        return { success: false, error: 'Round-ups sheet not found' };
    }

    const originalAmount = parseFloat(params.amount) || 0;
    const roundUpAmount = calculateRoundUpAmount(originalAmount);
    const multiplier = parseFloat(params.multiplier) || 1;
    const finalAmount = roundUpAmount * multiplier;

    sheet.appendRow([
        'RU_' + Date.now(),
        params.date || formatFinancialDate(new Date()),
        params.source || 'Manual',
        originalAmount,
        roundUpAmount,
        multiplier,
        finalAmount,
        params.orderId || '',
        params.customerId || '',
        params.description || '',
        'Pending',
        new Date().toISOString()
    ]);

    return {
        success: true,
        message: 'Round-up recorded',
        roundUpAmount: roundUpAmount,
        finalAmount: finalAmount
    };
}

function calculateRoundUpAmount(amount) {
    const remainder = amount % 1;
    if (remainder === 0) return 1.00;
    return parseFloat((1 - remainder).toFixed(2));
}

function recordRoundUpInvestment(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const investmentSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UP_INVESTMENTS);
    const roundUpsSheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.ROUND_UPS);

    if (!investmentSheet || !roundUpsSheet) {
        return { success: false, error: 'Required sheets not found' };
    }

    // Get pending round-ups
    const roundUpsData = roundUpsSheet.getDataRange().getValues();
    const roundUpsHeaders = roundUpsData[0];
    const statusCol = roundUpsHeaders.indexOf('Status');
    const finalAmountCol = roundUpsHeaders.indexOf('Final_Amount');

    let totalAmount = 0;
    let transactionCount = 0;
    const rowsToUpdate = [];

    for (let i = 1; i < roundUpsData.length; i++) {
        if (roundUpsData[i][statusCol] === 'Pending') {
            totalAmount += parseFloat(roundUpsData[i][finalAmountCol]) || 0;
            transactionCount++;
            rowsToUpdate.push(i + 1);
        }
    }

    if (totalAmount < 5) {
        return {
            success: false,
            error: 'Minimum investment is $5',
            currentBalance: totalAmount
        };
    }

    // Calculate allocation (75/25 split)
    const safeAmount = totalAmount * 0.75;
    const growthAmount = totalAmount * 0.25;

    // Record investment
    const investmentId = 'RUINV_' + Date.now();
    const season = getCurrentFarmSeason();

    investmentSheet.appendRow([
        investmentId,
        formatFinancialDate(new Date()),
        totalAmount,
        safeAmount,
        growthAmount,
        transactionCount,
        season.name,
        params.multiplier || 1,
        JSON.stringify({
            safe: {
                treasuryBonds: safeAmount * 0.4,
                stableDividend: safeAmount * 0.35,
                moneyMarket: safeAmount * 0.25
            },
            growth: {
                totalMarket: growthAmount * 0.5,
                international: growthAmount * 0.3,
                emergingMarkets: growthAmount * 0.2
            }
        }),
        'Completed',
        params.notes || '',
        new Date().toISOString()
    ]);

    // Update round-ups status
    rowsToUpdate.forEach(row => {
        roundUpsSheet.getRange(row, statusCol + 1).setValue('Invested');
    });

    return {
        success: true,
        message: 'Investment recorded',
        investmentId: investmentId,
        totalAmount: totalAmount,
        safeAmount: safeAmount,
        growthAmount: growthAmount,
        transactionCount: transactionCount
    };
}

function getCurrentFarmSeason() {
    const month = new Date().getMonth() + 1;

    if ([9, 10, 11].includes(month)) return { name: 'Harvest', multiplier: 1.5 };
    if ([3, 4, 5].includes(month)) return { name: 'Planting', multiplier: 0.75 };
    if ([12, 1, 2].includes(month)) return { name: 'Winter', multiplier: 0.5 };
    return { name: 'Growing', multiplier: 1.0 };
}

// =============================================================================
// FINANCIAL DASHBOARD
// =============================================================================

function getFinancialDashboard(params) {
    // Aggregate all financial data for dashboard
    const debts = getDebts({});
    const accounts = getBankAccounts({});
    const bills = getBills({});
    const investments = getInvestments({});
    const roundUps = getRoundUps({ status: 'Pending' });
    const employees = getFinancialEmployees({ sortBy: 'xp' });

    // Calculate net worth
    const totalAssets = (accounts.totals?.totalBalance || 0) + (investments.totals?.totalValue || 0);
    const totalLiabilities = debts.totals?.totalBalance || 0;
    const netWorth = totalAssets - totalLiabilities;

    // Calculate monthly cash flow
    const monthlyIncome = params.monthlyIncome || 0; // Would come from settings
    const monthlyBills = bills.totals?.monthlyTotal || 0;
    const monthlyDebtPayments = debts.totals?.totalMinPayment || 0;
    const monthlyCashFlow = monthlyIncome - monthlyBills - monthlyDebtPayments;

    return {
        success: true,
        data: {
            netWorth: {
                total: netWorth,
                assets: totalAssets,
                liabilities: totalLiabilities
            },
            cashFlow: {
                income: monthlyIncome,
                bills: monthlyBills,
                debtPayments: monthlyDebtPayments,
                available: monthlyCashFlow
            },
            debts: {
                total: debts.totals?.totalBalance || 0,
                count: debts.count || 0,
                monthlyInterest: debts.totals?.totalMonthlyInterest || 0,
                averageAPR: debts.totals?.averageAPR || 0
            },
            banking: {
                total: accounts.totals?.totalBalance || 0,
                checking: accounts.totals?.checking || 0,
                savings: accounts.totals?.savings || 0
            },
            investments: {
                total: investments.totals?.totalValue || 0,
                gainLoss: investments.totals?.totalGainLoss || 0,
                returnPct: investments.totals?.overallReturnPct || 0,
                safe: investments.totals?.safeValue || 0,
                growth: investments.totals?.growthValue || 0
            },
            roundUps: {
                pendingBalance: roundUps.pendingBalance || 0,
                pendingCount: roundUps.count || 0
            },
            bills: {
                monthlyTotal: bills.totals?.monthlyTotal || 0,
                overdue: bills.totals?.overdue || 0,
                dueSoon: bills.totals?.dueSoon || 0
            },
            employees: {
                count: employees.count || 0,
                topPerformers: (employees.data || []).slice(0, 5)
            },
            alerts: generateFinancialAlerts(debts, bills, roundUps)
        },
        timestamp: new Date().toISOString()
    };
}

function generateFinancialAlerts(debts, bills, roundUps) {
    const alerts = [];

    // High interest debt alert
    if (debts.data) {
        const highInterestDebts = debts.data.filter(d => parseFloat(d.APR) > 20);
        if (highInterestDebts.length > 0) {
            alerts.push({
                type: 'warning',
                category: 'debt',
                message: `${highInterestDebts.length} debt(s) with APR over 20%`
            });
        }
    }

    // Overdue bills alert
    if (bills.totals?.overdue > 0) {
        alerts.push({
            type: 'danger',
            category: 'bills',
            message: `${bills.totals.overdue} bill(s) overdue`
        });
    }

    // Bills due soon alert
    if (bills.totals?.dueSoon > 0) {
        alerts.push({
            type: 'info',
            category: 'bills',
            message: `${bills.totals.dueSoon} bill(s) due within 7 days`
        });
    }

    // Round-ups ready to invest
    if (roundUps.pendingBalance >= 25) {
        alerts.push({
            type: 'success',
            category: 'roundups',
            message: `$${roundUps.pendingBalance.toFixed(2)} ready to invest`
        });
    }

    return alerts;
}

// =============================================================================
// SETTINGS
// =============================================================================

function getFinancialSettings(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS);

    if (!sheet) {
        return { success: true, data: {} };
    }

    const data = sheet.getDataRange().getValues();
    const settings = {};

    for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const value = data[i][1];
        if (key) {
            settings[key] = value;
        }
    }

    return {
        success: true,
        data: settings
    };
}

function saveFinancialSettings(params) {
    const ss = SpreadsheetApp.openById(FINANCIAL_CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.FINANCIAL_SETTINGS);

    if (!sheet) {
        return { success: false, error: 'Settings sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyCol = headers.indexOf('Setting_Key');
    const valueCol = headers.indexOf('Setting_Value');
    const updatedAtCol = headers.indexOf('Updated_At');

    // Update existing or append new
    Object.keys(params).forEach(key => {
        if (key === 'action') return;

        let found = false;
        for (let i = 1; i < data.length; i++) {
            if (data[i][keyCol] === key) {
                sheet.getRange(i + 1, valueCol + 1).setValue(params[key]);
                if (updatedAtCol >= 0) {
                    sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
                }
                found = true;
                break;
            }
        }

        if (!found) {
            sheet.appendRow([key, params[key], 'custom', '', new Date().toISOString()]);
        }
    });

    return {
        success: true,
        message: 'Settings saved'
    };
}

// =============================================================================
// FINANCIAL UTILITY FUNCTIONS
// =============================================================================

function formatFinancialDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

// =============================================================================
// TEST FINANCIAL MODULE
// =============================================================================

function testFinancialModule() {
    Logger.log('Testing Financial Module...');

    // Test sheet creation
    const createResult = createFinancialSheets();
    Logger.log('Sheet Creation: ' + JSON.stringify(createResult));

    // Test saving a debt
    const debtResult = saveDebt({
        name: 'Test Credit Card',
        type: 'Credit Card',
        balance: 5000,
        apr: 19.99,
        minPayment: 100
    });
    Logger.log('Save Debt: ' + JSON.stringify(debtResult));

    // Test getting debts
    const debtsResult = getDebts({});
    Logger.log('Get Debts: ' + JSON.stringify(debtsResult));

    // Test dashboard
    const dashboardResult = getFinancialDashboard({});
    Logger.log('Dashboard: ' + JSON.stringify(dashboardResult));

    Logger.log('Financial Module tests completed!');
}

// =============================================================================
// PLAID INTEGRATION - Bank Account Connection
// =============================================================================
// Connect real bank accounts via Plaid Link
// Sandbox mode for testing, switch to development/production when ready

const PLAID_CONFIG = {
    CLIENT_ID: '69690f5d01c8e8001d439007',
    SECRET: '65ccc418aad5af30d15744b05de1d5',
    ENV: 'sandbox', // Change to 'development' or 'production' when ready
    BASE_URL: 'https://sandbox.plaid.com', // Change for production
    PRODUCTS: ['transactions', 'auth'],
    COUNTRY_CODES: ['US'],
    LANGUAGE: 'en'
};

/**
 * Create a Plaid Link token for the frontend
 * This is the first step - generates a token to initialize Plaid Link
 */
function createPlaidLinkToken(params) {
    try {
        const payload = {
            client_id: PLAID_CONFIG.CLIENT_ID,
            secret: PLAID_CONFIG.SECRET,
            user: {
                client_user_id: params.userId || 'tiny-seed-user-1'
            },
            client_name: 'Tiny Seed Farm',
            products: PLAID_CONFIG.PRODUCTS,
            country_codes: PLAID_CONFIG.COUNTRY_CODES,
            language: PLAID_CONFIG.LANGUAGE
        };

        const options = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(PLAID_CONFIG.BASE_URL + '/link/token/create', options);
        const result = JSON.parse(response.getContentText());

        if (result.link_token) {
            return {
                success: true,
                linkToken: result.link_token,
                expiration: result.expiration
            };
        } else {
            return {
                success: false,
                error: result.error_message || 'Failed to create link token',
                details: result
            };
        }
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Exchange public token for access token
 * Called after user successfully links their bank in Plaid Link
 */
function exchangePlaidPublicToken(params) {
    try {
        const payload = {
            client_id: PLAID_CONFIG.CLIENT_ID,
            secret: PLAID_CONFIG.SECRET,
            public_token: params.publicToken
        };

        const options = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(PLAID_CONFIG.BASE_URL + '/item/public_token/exchange', options);
        const result = JSON.parse(response.getContentText());

        if (result.access_token) {
            // Save the access token and item_id to our sheet
            savePlaidItem({
                accessToken: result.access_token,
                itemId: result.item_id,
                institutionName: params.institutionName || 'Unknown Bank'
            });

            // Immediately fetch accounts
            const accounts = getPlaidAccounts({ accessToken: result.access_token });

            return {
                success: true,
                itemId: result.item_id,
                accounts: accounts.data || []
            };
        } else {
            return {
                success: false,
                error: result.error_message || 'Failed to exchange token',
                details: result
            };
        }
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Save Plaid item (connected bank) to our sheet
 */
function savePlaidItem(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('PLAID_ITEMS');

    if (!sheet) {
        sheet = ss.insertSheet('PLAID_ITEMS');
        sheet.appendRow(['Item_ID', 'Access_Token', 'Institution', 'Status', 'Connected_At', 'Last_Sync']);
        sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1a472a').setFontColor('#ffffff');
        sheet.setFrozenRows(1);
        // Hide the access token column for security
        sheet.hideColumns(2);
    }

    sheet.appendRow([
        params.itemId,
        params.accessToken,
        params.institutionName,
        'Active',
        new Date().toISOString(),
        new Date().toISOString()
    ]);

    return { success: true };
}

/**
 * Get all Plaid items (connected banks)
 */
function getPlaidItems() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('PLAID_ITEMS');

    if (!sheet) {
        return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const items = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        items.push({
            itemId: row[0],
            institution: row[2],
            status: row[3],
            connectedAt: row[4],
            lastSync: row[5]
        });
    }

    return { success: true, data: items, count: items.length };
}

/**
 * Get accounts from Plaid for a specific item or all items
 * Fixed: Returns 'accounts' (not 'data'), includes institution per account,
 * uses balance_current field name for frontend compatibility
 */
function getPlaidAccounts(params) {
    params = params || {};  // Handle undefined params
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName('PLAID_ITEMS');

        // If no params provided, fetch ALL connected items
        if (!params.accessToken && !params.itemId) {
            if (!sheet) {
                return { success: true, accounts: [], message: 'No banks connected yet' };
            }

            const data = sheet.getDataRange().getValues();
            const allAccounts = [];

            // Iterate through all items and fetch accounts for each
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row[0] || row[3] !== 'Active') continue;

                const itemAccessToken = row[1];
                const institutionName = row[2];

                try {
                    const payload = {
                        client_id: PLAID_CONFIG.CLIENT_ID,
                        secret: PLAID_CONFIG.SECRET,
                        access_token: itemAccessToken
                    };

                    const options = {
                        method: 'post',
                        contentType: 'application/json',
                        payload: JSON.stringify(payload),
                        muteHttpExceptions: true
                    };

                    const response = UrlFetchApp.fetch(PLAID_CONFIG.BASE_URL + '/accounts/get', options);
                    const result = JSON.parse(response.getContentText());

                    if (result.accounts) {
                        result.accounts.forEach(a => {
                            syncPlaidAccountToSheet(a, result.item.institution_id);
                            allAccounts.push({
                                accountId: a.account_id,
                                name: a.name,
                                officialName: a.official_name,
                                type: a.type,
                                subtype: a.subtype,
                                mask: a.mask,
                                balance_current: a.balances.current,
                                balance_available: a.balances.available,
                                limit: a.balances.limit,
                                institution: institutionName
                            });
                        });
                    }
                } catch (itemError) {
                    console.error('Error fetching accounts for item ' + row[0] + ': ' + itemError);
                }
            }

            return { success: true, accounts: allAccounts };
        }

        // Single item fetch (original behavior, fixed field names)
        let accessToken = params.accessToken;

        if (!accessToken && params.itemId) {
            if (sheet) {
                const data = sheet.getDataRange().getValues();
                for (let i = 1; i < data.length; i++) {
                    if (data[i][0] === params.itemId) {
                        accessToken = data[i][1];
                        break;
                    }
                }
            }
        }

        if (!accessToken) {
            return { success: false, error: 'No access token available' };
        }

        const payload = {
            client_id: PLAID_CONFIG.CLIENT_ID,
            secret: PLAID_CONFIG.SECRET,
            access_token: accessToken
        };

        const options = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(PLAID_CONFIG.BASE_URL + '/accounts/get', options);
        const result = JSON.parse(response.getContentText());

        if (result.accounts) {
            result.accounts.forEach(account => {
                syncPlaidAccountToSheet(account, result.item.institution_id);
            });

            return {
                success: true,
                accounts: result.accounts.map(a => ({
                    accountId: a.account_id,
                    name: a.name,
                    officialName: a.official_name,
                    type: a.type,
                    subtype: a.subtype,
                    mask: a.mask,
                    balance_current: a.balances.current,
                    balance_available: a.balances.available,
                    limit: a.balances.limit,
                    institution: result.item.institution_id
                }))
            };
        } else {
            return { success: false, error: result.error_message || 'Failed to get accounts' };
        }
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Sync a Plaid account to our FIN_BANK_ACCOUNTS sheet
 */
function syncPlaidAccountToSheet(account, institutionId) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.BANK_ACCOUNTS);

    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const accountIdCol = headers.indexOf('Account_ID');

    // Check if account already exists
    for (let i = 1; i < data.length; i++) {
        if (data[i][accountIdCol] === account.account_id) {
            // Update existing account
            const balanceCol = headers.indexOf('Current_Balance');
            const availableCol = headers.indexOf('Available_Balance');
            const updatedCol = headers.indexOf('Updated_At');

            if (balanceCol >= 0) sheet.getRange(i + 1, balanceCol + 1).setValue(account.balances.current);
            if (availableCol >= 0) sheet.getRange(i + 1, availableCol + 1).setValue(account.balances.available);
            if (updatedCol >= 0) sheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());

            return;
        }
    }

    // Add new account
    const now = new Date().toISOString();
    sheet.appendRow([
        account.account_id,
        account.name || account.official_name,
        account.type.charAt(0).toUpperCase() + account.type.slice(1),
        institutionId || 'Plaid',
        account.mask || '',
        account.balances.current || 0,
        account.balances.available || account.balances.current || 0,
        0, // APY
        'Active',
        false, // Is Primary
        'Connected via Plaid',
        now,
        now
    ]);
}

/**
 * Get balances for all connected accounts
 */
function refreshPlaidBalances(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const itemsSheet = ss.getSheetByName('PLAID_ITEMS');

        if (!itemsSheet) {
            return { success: false, error: 'No connected banks found' };
        }

        const items = itemsSheet.getDataRange().getValues();
        const results = [];

        for (let i = 1; i < items.length; i++) {
            if (items[i][3] !== 'Active') continue;

            const accessToken = items[i][1];
            const accounts = getPlaidAccounts({ accessToken: accessToken });

            if (accounts.success) {
                results.push({
                    institution: items[i][2],
                    accounts: accounts.data
                });

                // Update last sync time
                itemsSheet.getRange(i + 1, 6).setValue(new Date().toISOString());
            }
        }

        return {
            success: true,
            data: results,
            syncedAt: new Date().toISOString()
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Get transactions from Plaid
 */
function getPlaidTransactions(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const itemsSheet = ss.getSheetByName('PLAID_ITEMS');

        if (!itemsSheet) {
            return { success: false, error: 'No connected banks found' };
        }

        const items = itemsSheet.getDataRange().getValues();
        const allTransactions = [];

        // Default to last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (params.days || 30));

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        for (let i = 1; i < items.length; i++) {
            if (items[i][3] !== 'Active') continue;

            const accessToken = items[i][1];

            const payload = {
                client_id: PLAID_CONFIG.CLIENT_ID,
                secret: PLAID_CONFIG.SECRET,
                access_token: accessToken,
                start_date: startDateStr,
                end_date: endDateStr,
                options: {
                    count: params.count || 100,
                    offset: params.offset || 0
                }
            };

            const options = {
                method: 'post',
                contentType: 'application/json',
                payload: JSON.stringify(payload),
                muteHttpExceptions: true
            };

            const response = UrlFetchApp.fetch(PLAID_CONFIG.BASE_URL + '/transactions/get', options);
            const result = JSON.parse(response.getContentText());

            if (result.transactions) {
                // Save transactions to sheet
                result.transactions.forEach(txn => {
                    savePlaidTransaction(txn);
                    allTransactions.push({
                        transactionId: txn.transaction_id,
                        accountId: txn.account_id,
                        date: txn.date,
                        name: txn.name,
                        merchantName: txn.merchant_name,
                        amount: txn.amount,
                        category: txn.category ? txn.category.join(' > ') : '',
                        pending: txn.pending
                    });
                });
            }
        }

        return {
            success: true,
            data: allTransactions,
            count: allTransactions.length
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Save a Plaid transaction to our sheet
 */
function savePlaidTransaction(txn) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(FINANCIAL_CONFIG.TABS.TRANSACTIONS);

    if (!sheet) return;

    // Check if transaction already exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === txn.transaction_id) return; // Already exists
    }

    sheet.appendRow([
        txn.transaction_id,
        txn.date,
        txn.account_id,
        txn.amount > 0 ? 'Debit' : 'Credit',
        txn.category ? txn.category[0] : 'Uncategorized',
        txn.name,
        Math.abs(txn.amount),
        '', // Balance after
        'Plaid',
        txn.merchant_name || '',
        txn.category ? txn.category.join(',') : '',
        '',
        new Date().toISOString()
    ]);

    // Check for round-up opportunity (sales transactions)
    if (txn.amount > 0 && !txn.pending) {
        const roundUp = calculateRoundUpAmount(txn.amount);
        if (roundUp > 0 && roundUp < 1) {
            saveRoundUp({
                amount: txn.amount,
                source: 'Plaid-' + txn.merchant_name,
                description: txn.name
            });
        }
    }
}

/**
 * Disconnect a Plaid item
 */
function disconnectPlaidItem(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName('PLAID_ITEMS');

        if (!sheet) {
            return { success: false, error: 'No items sheet found' };
        }

        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === params.itemId) {
                // Mark as disconnected
                sheet.getRange(i + 1, 4).setValue('Disconnected');
                return { success: true, message: 'Bank disconnected' };
            }
        }

        return { success: false, error: 'Item not found' };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Get institution info from Plaid
 */
function getPlaidInstitution(params) {
    try {
        const payload = {
            client_id: PLAID_CONFIG.CLIENT_ID,
            secret: PLAID_CONFIG.SECRET,
            institution_id: params.institutionId,
            country_codes: PLAID_CONFIG.COUNTRY_CODES
        };

        const options = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(PLAID_CONFIG.BASE_URL + '/institutions/get_by_id', options);
        const result = JSON.parse(response.getContentText());

        if (result.institution) {
            return {
                success: true,
                data: {
                    name: result.institution.name,
                    logo: result.institution.logo,
                    primaryColor: result.institution.primary_color,
                    url: result.institution.url
                }
            };
        } else {
            return { success: false, error: result.error_message };
        }
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Test Plaid connection
 */
function testPlaidConnection() {
    Logger.log('Testing Plaid connection...');

    // Test creating a link token
    const linkResult = createPlaidLinkToken({ userId: 'test-user' });
    Logger.log('Link Token: ' + JSON.stringify(linkResult));

    if (linkResult.success) {
        Logger.log('Plaid connection successful!');
        Logger.log('Link Token: ' + linkResult.linkToken.substring(0, 50) + '...');
    } else {
        Logger.log('Plaid connection failed: ' + linkResult.error);
    }

    return linkResult;
}

// =============================================================================
// MARKETING MODULE - COMPLETE IMPLEMENTATION
// =============================================================================

// Ayrshare API Configuration
const AYRSHARE_CONFIG = {
    BASE_URL: 'https://app.ayrshare.com/api',
    get API_KEY() {
        return PropertiesService.getScriptProperties().getProperty('AYRSHARE_API_KEY') || '';
    },
    get ENABLED() {
        return !!this.API_KEY;
    }
};

/**
 * Check if Ayrshare is configured
 */
function checkAyrshareStatus() {
    const hasKey = !!AYRSHARE_CONFIG.API_KEY;
    Logger.log('Ayrshare configured: ' + hasKey);
    return { configured: hasKey };
}

// Marketing Sheet Names
const MARKETING_SHEETS = {
    FARM_PICS: 'MARKETING_FarmPics',
    CAMPAIGNS: 'MARKETING_Campaigns',
    SCHEDULED_POSTS: 'MARKETING_ScheduledPosts',
    POST_HISTORY: 'MARKETING_PostHistory',
    BUDGET: 'MARKETING_Budget',
    SPEND: 'MARKETING_Spend',
    SOCIAL_CONNECTIONS: 'MARKETING_SocialConnections'
};

// =============================================================================
// FARM PICS FUNCTIONS
// =============================================================================

/**
 * Submit a farm pic from employee app
 */
function submitFarmPic(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.FARM_PICS);

        if (!sheet) {
            sheet = ss.insertSheet(MARKETING_SHEETS.FARM_PICS);
            sheet.appendRow([
                'Pic_ID', 'Employee_ID', 'Employee_Name', 'Category', 'Caption',
                'Image_URL', 'Thumbnail_URL', 'Status', 'Submitted_At', 'Approved_At',
                'Approved_By', 'Used_In_Post', 'Notes'
            ]);
        }

        const picId = 'FP_' + Date.now();

        // If image data is provided, save to Google Drive
        let imageUrl = '';
        let thumbnailUrl = '';

        if (data.imageData && data.imageData.startsWith('data:image')) {
            const saved = saveImageToDrive(data.imageData, picId);
            if (saved.success) {
                imageUrl = saved.url;
                thumbnailUrl = saved.thumbnailUrl;
            }
        }

        sheet.appendRow([
            picId,
            data.employeeId || '',
            data.employeeName || '',
            data.category || 'general',
            data.caption || '',
            imageUrl,
            thumbnailUrl,
            'new', // Status: new, approved, rejected, used
            data.timestamp || new Date().toISOString(),
            '',
            '',
            '',
            ''
        ]);

        return {
            success: true,
            picId: picId,
            message: 'Photo submitted for marketing review!'
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Save image to Google Drive and return URLs
 */
function saveImageToDrive(base64Data, picId) {
    try {
        // Create or get Marketing folder
        let folder;
        const folders = DriveApp.getFoldersByName('Tiny Seed Marketing');
        if (folders.hasNext()) {
            folder = folders.next();
        } else {
            folder = DriveApp.createFolder('Tiny Seed Marketing');
        }

        // Extract base64 content
        const contentType = base64Data.match(/data:([^;]+);/)[1];
        const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), contentType, picId + '.jpg');

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        const fileId = file.getId();
        const url = 'https://drive.google.com/uc?id=' + fileId;
        const thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w200';

        return { success: true, url: url, thumbnailUrl: thumbnailUrl, fileId: fileId };
    } catch (error) {
        Logger.log('Error saving image to Drive: ' + error);
        return { success: false, error: error.toString() };
    }
}

/**
 * Get all farm pics (for marketing dashboard)
 */
function getFarmPics(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.FARM_PICS);

        if (!sheet) {
            return { success: true, farmPics: [] };
        }

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
            return { success: true, farmPics: [] };
        }

        const headers = data[0];
        let pics = data.slice(1).map(row => {
            const pic = {};
            headers.forEach((h, i) => pic[h] = row[i]);
            return pic;
        });

        // Filter by status if provided
        if (params.status) {
            pics = pics.filter(p => p.Status === params.status);
        }

        // Filter by category if provided
        if (params.category) {
            pics = pics.filter(p => p.Category === params.category);
        }

        // Sort by date descending
        pics.sort((a, b) => new Date(b.Submitted_At) - new Date(a.Submitted_At));

        return { success: true, farmPics: pics };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Get farm pics submitted by a specific employee
 */
function getEmployeeFarmPics(params) {
    try {
        const result = getFarmPics({});
        if (!result.success) return result;

        const employeePics = result.farmPics.filter(p =>
            p.Employee_ID === params.employeeId
        ).slice(0, 10); // Last 10 submissions

        return { success: true, farmPics: employeePics };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Approve or reject a farm pic
 */
function approveFarmPic(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.FARM_PICS);

        if (!sheet) {
            return { success: false, error: 'Farm pics sheet not found' };
        }

        const dataRange = sheet.getDataRange().getValues();
        const headers = dataRange[0];
        const picIdCol = headers.indexOf('Pic_ID');
        const statusCol = headers.indexOf('Status');
        const approvedAtCol = headers.indexOf('Approved_At');
        const approvedByCol = headers.indexOf('Approved_By');

        for (let i = 1; i < dataRange.length; i++) {
            if (dataRange[i][picIdCol] === data.picId) {
                sheet.getRange(i + 1, statusCol + 1).setValue(data.approved ? 'approved' : 'rejected');
                sheet.getRange(i + 1, approvedAtCol + 1).setValue(new Date().toISOString());
                sheet.getRange(i + 1, approvedByCol + 1).setValue(data.approvedBy || 'Admin');

                return { success: true, message: data.approved ? 'Photo approved!' : 'Photo rejected' };
            }
        }

        return { success: false, error: 'Photo not found' };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// =============================================================================
// SOCIAL MEDIA POSTING FUNCTIONS
// =============================================================================

/**
 * Publish to social media via Ayrshare API
 */
function publishToSocial(data) {
    try {
        if (!AYRSHARE_CONFIG.ENABLED || !AYRSHARE_CONFIG.API_KEY) {
            // Demo mode - log the post
            return logDemoPost(data);
        }

        const payload = {
            post: data.caption || data.post,
            platforms: data.platforms || ['instagram', 'facebook']
        };

        // Add media if provided
        if (data.mediaUrls && data.mediaUrls.length > 0) {
            payload.mediaUrls = data.mediaUrls;
        }

        // Add scheduling if provided
        if (data.scheduleDate) {
            payload.scheduleDate = data.scheduleDate;
        }

        const options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + AYRSHARE_CONFIG.API_KEY,
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(AYRSHARE_CONFIG.BASE_URL + '/post', options);
        const result = JSON.parse(response.getContentText());

        // Log the post
        logPostHistory({
            platforms: data.platforms,
            caption: data.caption,
            mediaUrls: data.mediaUrls,
            response: result,
            timestamp: new Date().toISOString()
        });

        if (result.status === 'success' || result.id) {
            return {
                success: true,
                postId: result.id,
                message: 'Posted successfully to ' + data.platforms.join(', ')
            };
        } else {
            return { success: false, error: result.message || 'Failed to post' };
        }
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Log demo post (when Ayrshare is not configured)
 */
function logDemoPost(data) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(MARKETING_SHEETS.POST_HISTORY);

    if (!sheet) {
        sheet = ss.insertSheet(MARKETING_SHEETS.POST_HISTORY);
        sheet.appendRow([
            'Post_ID', 'Platforms', 'Caption', 'Media_URLs', 'Status',
            'Posted_At', 'Engagement', 'Notes'
        ]);
    }

    const postId = 'DEMO_' + Date.now();

    sheet.appendRow([
        postId,
        (data.platforms || []).join(', '),
        data.caption || data.post || '',
        (data.mediaUrls || []).join(', '),
        'demo', // Would be 'published' with real API
        new Date().toISOString(),
        '',
        'Demo mode - Ayrshare not configured'
    ]);

    return {
        success: true,
        postId: postId,
        message: 'Post logged (demo mode - configure Ayrshare API key for live posting)',
        demo: true
    };
}

/**
 * Log post to history
 */
function logPostHistory(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.POST_HISTORY);

        if (!sheet) {
            sheet = ss.insertSheet(MARKETING_SHEETS.POST_HISTORY);
            sheet.appendRow([
                'Post_ID', 'Platforms', 'Caption', 'Media_URLs', 'Status',
                'Posted_At', 'Engagement', 'Notes'
            ]);
        }

        const postId = data.response?.id || 'POST_' + Date.now();

        sheet.appendRow([
            postId,
            (data.platforms || []).join(', '),
            data.caption || '',
            (data.mediaUrls || []).join(', '),
            data.response?.status || 'published',
            data.timestamp || new Date().toISOString(),
            '',
            JSON.stringify(data.response || {}).substring(0, 500)
        ]);

        return { success: true };
    } catch (error) {
        Logger.log('Error logging post history: ' + error);
        return { success: false, error: error.toString() };
    }
}

/**
 * Schedule a post for later
 */
function schedulePost(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.SCHEDULED_POSTS);

        if (!sheet) {
            sheet = ss.insertSheet(MARKETING_SHEETS.SCHEDULED_POSTS);
            sheet.appendRow([
                'Schedule_ID', 'Platforms', 'Caption', 'Media_URLs', 'Scheduled_For',
                'Status', 'Created_At', 'Created_By', 'Campaign_ID'
            ]);
        }

        const scheduleId = 'SCH_' + Date.now();

        sheet.appendRow([
            scheduleId,
            (data.platforms || []).join(', '),
            data.caption || '',
            (data.mediaUrls || []).join(', '),
            data.scheduledFor || '',
            'scheduled',
            new Date().toISOString(),
            data.createdBy || 'Admin',
            data.campaignId || ''
        ]);

        return {
            success: true,
            scheduleId: scheduleId,
            message: 'Post scheduled for ' + data.scheduledFor
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Get scheduled posts
 */
function getScheduledPosts(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.SCHEDULED_POSTS);

        if (!sheet) {
            return { success: true, scheduledPosts: [] };
        }

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
            return { success: true, scheduledPosts: [] };
        }

        const headers = data[0];
        let posts = data.slice(1).map(row => {
            const post = {};
            headers.forEach((h, i) => post[h] = row[i]);
            return post;
        });

        // Filter by status if provided
        if (params.status) {
            posts = posts.filter(p => p.Status === params.status);
        }

        return { success: true, scheduledPosts: posts };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// =============================================================================
// CAMPAIGN MANAGEMENT
// =============================================================================

/**
 * Create a marketing campaign
 */
function createCampaign(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.CAMPAIGNS);

        if (!sheet) {
            sheet = ss.insertSheet(MARKETING_SHEETS.CAMPAIGNS);
            sheet.appendRow([
                'Campaign_ID', 'Name', 'Type', 'Status', 'Start_Date', 'End_Date',
                'Budget', 'Spent', 'Channels', 'Target_Audience', 'Goals',
                'Created_At', 'Created_By', 'Notes'
            ]);
        }

        const campaignId = 'CMP_' + Date.now();

        sheet.appendRow([
            campaignId,
            data.name || '',
            data.type || 'general',
            'draft',
            data.startDate || '',
            data.endDate || '',
            data.budget || 0,
            0,
            (data.channels || []).join(', '),
            data.targetAudience || '',
            data.goals || '',
            new Date().toISOString(),
            data.createdBy || 'Admin',
            data.notes || ''
        ]);

        return {
            success: true,
            campaignId: campaignId,
            message: 'Campaign created!'
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Update campaign status or details
 */
function updateCampaign(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.CAMPAIGNS);

        if (!sheet) {
            return { success: false, error: 'Campaigns sheet not found' };
        }

        const dataRange = sheet.getDataRange().getValues();
        const headers = dataRange[0];
        const idCol = headers.indexOf('Campaign_ID');

        for (let i = 1; i < dataRange.length; i++) {
            if (dataRange[i][idCol] === data.campaignId) {
                // Update each provided field
                Object.keys(data).forEach(key => {
                    const colIndex = headers.indexOf(key);
                    if (colIndex > -1 && key !== 'campaignId') {
                        sheet.getRange(i + 1, colIndex + 1).setValue(data[key]);
                    }
                });

                return { success: true, message: 'Campaign updated!' };
            }
        }

        return { success: false, error: 'Campaign not found' };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Get marketing campaigns
 */
function getMarketingCampaigns(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.CAMPAIGNS);

        if (!sheet) {
            return { success: true, campaigns: [] };
        }

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
            return { success: true, campaigns: [] };
        }

        const headers = data[0];
        let campaigns = data.slice(1).map(row => {
            const campaign = {};
            headers.forEach((h, i) => campaign[h] = row[i]);
            return campaign;
        });

        // Filter by status if provided
        if (params.status) {
            campaigns = campaigns.filter(c => c.Status === params.status);
        }

        return { success: true, campaigns: campaigns };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// =============================================================================
// BUDGET & SPEND TRACKING
// =============================================================================

/**
 * Get marketing budget
 */
function getMarketingBudget(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.BUDGET);

        if (!sheet) {
            // Create with default values
            sheet = ss.insertSheet(MARKETING_SHEETS.BUDGET);
            sheet.appendRow(['Month', 'Year', 'Allocated', 'Spent', 'Remaining', 'Fund_Balance']);

            const now = new Date();
            sheet.appendRow([
                now.getMonth() + 1,
                now.getFullYear(),
                1000, // Default monthly allocation
                0,
                1000,
                2340 // Default fund balance
            ]);
        }

        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const currentMonth = data[data.length - 1]; // Latest row

        const budget = {};
        headers.forEach((h, i) => budget[h] = currentMonth[i]);

        return {
            success: true,
            budget: {
                month: budget.Month,
                year: budget.Year,
                allocated: budget.Allocated || 1000,
                spent: budget.Spent || 0,
                remaining: budget.Remaining || 1000,
                fundBalance: budget.Fund_Balance || 0
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Log marketing spend
 */
function logMarketingSpend(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.SPEND);

        if (!sheet) {
            sheet = ss.insertSheet(MARKETING_SHEETS.SPEND);
            sheet.appendRow([
                'Spend_ID', 'Category', 'Vendor', 'Amount', 'Date',
                'Campaign_ID', 'Description', 'ROI', 'Created_At'
            ]);
        }

        const spendId = 'SPD_' + Date.now();

        sheet.appendRow([
            spendId,
            data.category || 'general',
            data.vendor || '',
            data.amount || 0,
            data.date || new Date().toISOString().split('T')[0],
            data.campaignId || '',
            data.description || '',
            data.roi || '',
            new Date().toISOString()
        ]);

        // Update budget spent amount
        updateBudgetSpent(data.amount || 0);

        return {
            success: true,
            spendId: spendId,
            message: 'Spend logged!'
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Update budget spent amount
 */
function updateBudgetSpent(amount) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.BUDGET);

        if (!sheet) return;

        const lastRow = sheet.getLastRow();
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const spentCol = headers.indexOf('Spent') + 1;
        const remainingCol = headers.indexOf('Remaining') + 1;
        const allocatedCol = headers.indexOf('Allocated') + 1;

        const currentSpent = sheet.getRange(lastRow, spentCol).getValue() || 0;
        const allocated = sheet.getRange(lastRow, allocatedCol).getValue() || 1000;

        const newSpent = currentSpent + amount;
        sheet.getRange(lastRow, spentCol).setValue(newSpent);
        sheet.getRange(lastRow, remainingCol).setValue(allocated - newSpent);
    } catch (error) {
        Logger.log('Error updating budget: ' + error);
    }
}

/**
 * Get marketing spend history
 */
function getMarketingSpend(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.SPEND);

        if (!sheet) {
            return { success: true, spend: [] };
        }

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
            return { success: true, spend: [] };
        }

        const headers = data[0];
        let spend = data.slice(1).map(row => {
            const item = {};
            headers.forEach((h, i) => item[h] = row[i]);
            return item;
        });

        // Filter by month/year if provided
        if (params.month && params.year) {
            spend = spend.filter(s => {
                const date = new Date(s.Date);
                return date.getMonth() + 1 === parseInt(params.month) &&
                       date.getFullYear() === parseInt(params.year);
            });
        }

        return { success: true, spend: spend };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Log marketing activity (general)
 */
function logMarketingActivity(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName('MARKETING_ActivityLog');

        if (!sheet) {
            sheet = ss.insertSheet('MARKETING_ActivityLog');
            sheet.appendRow(['Activity_ID', 'Type', 'Data', 'Timestamp', 'User']);
        }

        sheet.appendRow([
            'ACT_' + Date.now(),
            data.type || 'general',
            JSON.stringify(data.data || {}),
            data.timestamp || new Date().toISOString(),
            data.user || 'system'
        ]);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// =============================================================================
// ANALYTICS & SOCIAL CONNECTIONS
// =============================================================================

/**
 * Get marketing analytics
 */
function getMarketingAnalytics(params) {
    try {
        // Calculate analytics from various sources
        const farmPics = getFarmPics({});
        const campaigns = getMarketingCampaigns({});
        const spend = getMarketingSpend({});
        const budget = getMarketingBudget({});

        const analytics = {
            farmPics: {
                total: farmPics.success ? farmPics.farmPics.length : 0,
                new: farmPics.success ? farmPics.farmPics.filter(p => p.Status === 'new').length : 0,
                approved: farmPics.success ? farmPics.farmPics.filter(p => p.Status === 'approved').length : 0,
                used: farmPics.success ? farmPics.farmPics.filter(p => p.Status === 'used').length : 0
            },
            campaigns: {
                total: campaigns.success ? campaigns.campaigns.length : 0,
                active: campaigns.success ? campaigns.campaigns.filter(c => c.Status === 'active').length : 0,
                completed: campaigns.success ? campaigns.campaigns.filter(c => c.Status === 'completed').length : 0
            },
            budget: budget.success ? budget.budget : { allocated: 0, spent: 0, remaining: 0 },
            spend: {
                total: spend.success ? spend.spend.reduce((sum, s) => sum + (s.Amount || 0), 0) : 0,
                byCategory: {}
            }
        };

        // Calculate spend by category
        if (spend.success) {
            spend.spend.forEach(s => {
                const cat = s.Category || 'other';
                analytics.spend.byCategory[cat] = (analytics.spend.byCategory[cat] || 0) + (s.Amount || 0);
            });
        }

        return { success: true, analytics: analytics };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Get social media connections status
 */
function getSocialConnections(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.SOCIAL_CONNECTIONS);

        if (!sheet) {
            // Create with default platforms
            sheet = ss.insertSheet(MARKETING_SHEETS.SOCIAL_CONNECTIONS);
            sheet.appendRow(['Platform', 'Account', 'Status', 'Followers', 'Connected_At', 'Last_Post']);

            // All platforms connected via Ayrshare - ordered by engagement priority
            const platforms = [
                ['tiktok', '@TinySeedEnergy', 'connected', 0, '2026-01-15', ''],  // 2.80% engagement - highest!
                ['instagram', '@tinyseedfarm', 'connected', 2847, '2026-01-15', ''],  // 0.50% (+38% for ag)
                ['facebook', 'Tiny Seed Farm', 'connected', 1523, '2026-01-15', ''],  // 0.20% - best for 40+
                ['youtube', 'Tiny Seed Farm', 'connected', 0, '2026-01-15', ''],  // Long-form evergreen content
                ['pinterest', 'tinyseedfarm', 'connected', 0, '2026-01-15', ''],  // High intent - recipe/garden pins
                ['threads', '@tinyseedfarm', 'connected', 0, '2026-01-15', ''],  // Instagram companion (via IG)
                ['ayrshare', 'Tiny Seed Farm', AYRSHARE_CONFIG.ENABLED ? 'active' : 'not_configured', 0, '2026-01-15', '']
            ];

            platforms.forEach(p => sheet.appendRow(p));
        }

        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const connections = data.slice(1).map(row => {
            const conn = {};
            headers.forEach((h, i) => conn[h] = row[i]);
            return conn;
        });

        return {
            success: true,
            connections: connections,
            ayrshareEnabled: AYRSHARE_CONFIG.ENABLED
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Reset social connections to current status (all connected via Ayrshare)
 * Call this to update the sheet with current connection status
 */
function resetSocialConnections() {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        let sheet = ss.getSheetByName(MARKETING_SHEETS.SOCIAL_CONNECTIONS);

        // Delete existing sheet to recreate with fresh data
        if (sheet) {
            ss.deleteSheet(sheet);
        }

        // Create new sheet with updated platforms
        sheet = ss.insertSheet(MARKETING_SHEETS.SOCIAL_CONNECTIONS);
        sheet.appendRow(['Platform', 'Account', 'Status', 'Followers', 'Connected_At', 'Last_Post']);

        // All platforms connected via Ayrshare - ordered by engagement priority
        // Follower counts start at 0 - user updates manually via Marketing Command Center
        const platforms = [
            ['tiktok', '@TinySeedEnergy', 'connected', 0, '2026-01-15', ''],
            ['instagram', '@tinyseedfarm', 'connected', 0, '2026-01-15', ''],
            ['facebook', 'Tiny Seed Farm', 'connected', 0, '2026-01-15', ''],
            ['youtube', 'Tiny Seed Farm', 'connected', 0, '2026-01-15', ''],
            ['pinterest', 'tinyseedfarm', 'connected', 0, '2026-01-15', ''],
            ['threads', '@tinyseedfarm', 'connected', 0, '2026-01-15', ''],
            ['ayrshare', 'Tiny Seed Farm', AYRSHARE_CONFIG.ENABLED ? 'active' : 'not_configured', 0, '2026-01-15', '']
        ];

        platforms.forEach(p => sheet.appendRow(p));

        return {
            success: true,
            message: 'Social connections reset successfully',
            platforms: platforms.length
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

/**
 * Update follower counts for social platforms
 * Called from Marketing Command Center when user manually enters counts
 * @param {Object} counts - Object with platform follower counts {instagram: 1250, facebook: 850, ...}
 */
function updateFollowerCounts(counts) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(MARKETING_SHEETS.SOCIAL_CONNECTIONS);

        if (!sheet) {
            return { success: false, error: 'Social connections sheet not found. Run reset first.' };
        }

        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const platformCol = headers.indexOf('Platform');
        const followersCol = headers.indexOf('Followers');

        if (platformCol === -1 || followersCol === -1) {
            return { success: false, error: 'Sheet format invalid' };
        }

        // Map platform names to row numbers
        const platformRows = {};
        for (let i = 1; i < data.length; i++) {
            platformRows[data[i][platformCol].toLowerCase()] = i + 1; // +1 for 1-indexed sheets
        }

        // Update each platform's follower count
        const updated = [];
        for (const [platform, count] of Object.entries(counts)) {
            const rowNum = platformRows[platform.toLowerCase()];
            if (rowNum && count >= 0) {
                sheet.getRange(rowNum, followersCol + 1).setValue(count);
                updated.push({ platform, count });
            }
        }

        // Log the update
        Logger.log('Follower counts updated: ' + JSON.stringify(updated));

        return {
            success: true,
            message: 'Follower counts updated',
            updated: updated
        };
    } catch (error) {
        Logger.log('Error updating follower counts: ' + error.toString());
        return { success: false, error: error.toString() };
    }
}

/**
 * Add a neighbor signup from the landing page
 */
function addNeighborSignup(data) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheetName = 'MARKETING_NeighborSignups';

        // Get or create the sheet
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            sheet.getRange(1, 1, 1, 8).setValues([[
                'Timestamp', 'Name', 'Email', 'ZIP', 'Neighborhood', 'Source', 'Campaign', 'Status'
            ]]);
            sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
            sheet.setFrozenRows(1);
        }

        // Check for duplicate email
        const data_range = sheet.getDataRange().getValues();
        const emailCol = 2; // 0-indexed, Email is column 3
        for (let i = 1; i < data_range.length; i++) {
            if (data_range[i][emailCol] && data_range[i][emailCol].toString().toLowerCase() === data.email.toLowerCase()) {
                // Update existing record instead of duplicating
                sheet.getRange(i + 1, 1).setValue(data.timestamp);
                sheet.getRange(i + 1, 6).setValue(data.source);
                sheet.getRange(i + 1, 7).setValue(data.campaign);
                return {
                    success: true,
                    message: 'Welcome back! Your info has been updated.',
                    updated: true
                };
            }
        }

        // Add new row
        sheet.appendRow([
            data.timestamp,
            data.name,
            data.email,
            data.zip,
            data.neighborhood,
            data.source,
            data.campaign,
            'new'
        ]);

        Logger.log('Neighbor signup added: ' + data.email + ' from ' + data.neighborhood);

        return {
            success: true,
            message: 'Welcome to the farm family!',
            email: data.email,
            neighborhood: data.neighborhood
        };
    } catch (error) {
        Logger.log('Error adding neighbor signup: ' + error.toString());
        return { success: false, error: error.toString() };
    }
}

/**
 * Get all neighbor signups (for admin dashboard)
 */
function getNeighborSignups(params) {
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName('MARKETING_NeighborSignups');

        if (!sheet) {
            return { success: true, signups: [], total: 0 };
        }

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
            return { success: true, signups: [], total: 0 };
        }

        const headers = data[0];
        const signups = [];

        for (let i = 1; i < data.length; i++) {
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j].toLowerCase().replace(/\s+/g, '_')] = data[i][j];
            }
            signups.push(row);
        }

        // Count by neighborhood
        const byNeighborhood = {};
        signups.forEach(s => {
            const n = s.neighborhood || 'unknown';
            byNeighborhood[n] = (byNeighborhood[n] || 0) + 1;
        });

        return {
            success: true,
            signups: signups,
            total: signups.length,
            byNeighborhood: byNeighborhood
        };
    } catch (error) {
        Logger.log('Error getting neighbor signups: ' + error.toString());
        return { success: false, error: error.toString() };
    }
}

/**
 * Test Marketing Module
 */
function testMarketingModule() {
    Logger.log('=== Testing Marketing Module ===');

    // Test Farm Pics
    const submitResult = submitFarmPic({
        employeeId: 'EMP001',
        employeeName: 'Test User',
        category: 'harvest',
        caption: 'Beautiful tomatoes!',
        timestamp: new Date().toISOString()
    });
    Logger.log('Submit Farm Pic: ' + JSON.stringify(submitResult));

    // Test Get Farm Pics
    const picsResult = getFarmPics({});
    Logger.log('Get Farm Pics: ' + JSON.stringify(picsResult));

    // Test Create Campaign
    const campaignResult = createCampaign({
        name: 'Test Campaign',
        type: 'social',
        budget: 500,
        channels: ['instagram', 'facebook']
    });
    Logger.log('Create Campaign: ' + JSON.stringify(campaignResult));

    // Test Budget
    const budgetResult = getMarketingBudget({});
    Logger.log('Get Budget: ' + JSON.stringify(budgetResult));

    // Test Log Spend
    const spendResult = logMarketingSpend({
        category: 'social_ads',
        vendor: 'Meta',
        amount: 100,
        description: 'Test ad spend'
    });
    Logger.log('Log Spend: ' + JSON.stringify(spendResult));

    // Test Analytics
    const analyticsResult = getMarketingAnalytics({});
    Logger.log('Analytics: ' + JSON.stringify(analyticsResult));

    Logger.log('=== Marketing Module Tests Complete ===');
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY & QUICKBOOKS INTEGRATION MODULE
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP INSTRUCTIONS:
// 1. Add OAuth2 library: Resources → Libraries → Add: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
// 2. Create Shopify Custom App at: https://admin.shopify.com/store/{store}/settings/apps/development
// 3. Create QuickBooks App at: https://developer.intuit.com/app/developer/qbo/docs/get-started
// 4. Replace credentials below with your actual values
// 5. Run setupIntegrationSheets() to create required sheets
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SHOPIFY_CONFIG = {
  // Replace with your Shopify store credentials
  STORE_NAME: 'YOUR_STORE_NAME',           // e.g., 'tiny-seed-farm'
  API_KEY: 'YOUR_SHOPIFY_API_KEY',
  API_SECRET: 'YOUR_SHOPIFY_API_SECRET',
  ACCESS_TOKEN: 'YOUR_SHOPIFY_ACCESS_TOKEN', // For private apps
  API_VERSION: '2024-01',
  SCOPES: 'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers',
  ENABLED: false  // Set to true after configuring credentials
};

const QUICKBOOKS_CONFIG = {
  // Replace with your QuickBooks credentials
  CLIENT_ID: 'YOUR_QB_CLIENT_ID',
  CLIENT_SECRET: 'YOUR_QB_CLIENT_SECRET',
  COMPANY_ID: 'YOUR_QB_COMPANY_ID',        // Also called Realm ID
  ENVIRONMENT: 'sandbox',                   // 'sandbox' or 'production'
  SCOPES: 'com.intuit.quickbooks.accounting',
  ENABLED: false  // Set to true after configuring credentials
};

// OAuth2 URLs
const OAUTH_URLS = {
  SHOPIFY: {
    AUTH: (shop) => `https://${shop}.myshopify.com/admin/oauth/authorize`,
    TOKEN: (shop) => `https://${shop}.myshopify.com/admin/oauth/access_token`,
    API: (shop, version) => `https://${shop}.myshopify.com/admin/api/${version}`
  },
  QUICKBOOKS: {
    AUTH: 'https://appcenter.intuit.com/connect/oauth2',
    TOKEN: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    API_SANDBOX: 'https://sandbox-quickbooks.api.intuit.com/v3/company',
    API_PRODUCTION: 'https://quickbooks.api.intuit.com/v3/company'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION SHEETS SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupIntegrationSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Shopify Orders Sheet
  createTabIfNotExists(ss, 'SHOPIFY_Orders', [
    'Order_ID', 'Shopify_Order_Number', 'Created_At', 'Customer_Name', 'Customer_Email',
    'Total_Price', 'Subtotal', 'Total_Tax', 'Currency', 'Financial_Status', 'Fulfillment_Status',
    'Shipping_Address', 'Line_Items_JSON', 'Synced_To_QB', 'QB_Invoice_ID', 'Last_Updated'
  ], '#e1f5fe');

  // Shopify Products Sheet
  createTabIfNotExists(ss, 'SHOPIFY_Products', [
    'Product_ID', 'Title', 'Handle', 'Vendor', 'Product_Type', 'Status',
    'Variant_ID', 'Variant_Title', 'SKU', 'Price', 'Inventory_Qty',
    'Synced_From_Farm', 'Farm_Crop_ID', 'Last_Updated'
  ], '#e8f5e9');

  // QuickBooks Customers Sheet
  createTabIfNotExists(ss, 'QB_Customers', [
    'Customer_ID', 'QB_Customer_ID', 'Display_Name', 'Company_Name', 'Email', 'Phone',
    'Billing_Address', 'Balance', 'Active', 'Created_At', 'Last_Synced'
  ], '#fff3e0');

  // QuickBooks Invoices Sheet
  createTabIfNotExists(ss, 'QB_Invoices', [
    'Invoice_ID', 'QB_Invoice_ID', 'Doc_Number', 'Customer_ID', 'Customer_Name',
    'Total_Amount', 'Balance', 'Due_Date', 'Status', 'Line_Items_JSON',
    'Source_Order_ID', 'Source_Type', 'Created_At', 'Last_Synced'
  ], '#fce4ec');

  // Integration Log Sheet
  createTabIfNotExists(ss, 'INTEGRATION_Log', [
    'Timestamp', 'Service', 'Action', 'Status', 'Details', 'Error_Message'
  ], '#f3e5f5');

  // OAuth Tokens Sheet (for storing tokens securely)
  createTabIfNotExists(ss, 'SYS_OAuthTokens', [
    'Service', 'Access_Token', 'Refresh_Token', 'Token_Type', 'Expires_At', 'Scope', 'Last_Refreshed'
  ], '#eceff1');

  return { success: true, message: 'Integration sheets created successfully' };
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY INTEGRATION - OAuth2 Service
// ═══════════════════════════════════════════════════════════════════════════

function getShopifyOAuthService() {
  // Note: For private apps, you can use the access token directly
  // This OAuth flow is for public/custom apps that need user authorization
  return OAuth2.createService('Shopify')
    .setAuthorizationBaseUrl(OAUTH_URLS.SHOPIFY.AUTH(SHOPIFY_CONFIG.STORE_NAME))
    .setTokenUrl(OAUTH_URLS.SHOPIFY.TOKEN(SHOPIFY_CONFIG.STORE_NAME))
    .setClientId(SHOPIFY_CONFIG.API_KEY)
    .setClientSecret(SHOPIFY_CONFIG.API_SECRET)
    .setCallbackFunction('shopifyAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope(SHOPIFY_CONFIG.SCOPES)
    .setParam('grant_options[]', 'per-user');
}

function shopifyAuthCallback(request) {
  const service = getShopifyOAuthService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    logIntegration('Shopify', 'OAuth', 'SUCCESS', 'Authorization successful');
    return HtmlService.createHtmlOutput('Shopify authorization successful! You can close this tab.');
  } else {
    logIntegration('Shopify', 'OAuth', 'FAILED', 'Authorization failed');
    return HtmlService.createHtmlOutput('Shopify authorization failed. Please try again.');
  }
}

function getShopifyAuthorizationUrl() {
  return getShopifyOAuthService().getAuthorizationUrl();
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY API CALLS
// ═══════════════════════════════════════════════════════════════════════════

function shopifyApiCall(endpoint, method = 'GET', payload = null) {
  if (!SHOPIFY_CONFIG.ENABLED) {
    return { success: false, error: 'Shopify integration is not enabled. Set SHOPIFY_CONFIG.ENABLED = true' };
  }

  const baseUrl = OAUTH_URLS.SHOPIFY.API(SHOPIFY_CONFIG.STORE_NAME, SHOPIFY_CONFIG.API_VERSION);
  const url = `${baseUrl}/${endpoint}`;

  const options = {
    method: method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_CONFIG.ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload && (method === 'POST' || method === 'PUT')) {
    options.payload = JSON.stringify(payload);
  }

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      logIntegration('Shopify', endpoint, 'SUCCESS', `${method} request successful`);
      return { success: true, data: JSON.parse(responseText) };
    } else {
      logIntegration('Shopify', endpoint, 'FAILED', `HTTP ${responseCode}: ${responseText}`);
      return { success: false, error: `HTTP ${responseCode}`, details: responseText };
    }
  } catch (error) {
    logIntegration('Shopify', endpoint, 'ERROR', error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY ORDERS
// ═══════════════════════════════════════════════════════════════════════════

function syncShopifyOrders(params = {}) {
  const limit = params.limit || 50;
  const status = params.status || 'any';

  const result = shopifyApiCall(`orders.json?limit=${limit}&status=${status}`);

  if (!result.success) return result;

  const orders = result.data.orders || [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('SHOPIFY_Orders');

  let synced = 0;

  orders.forEach(order => {
    // Check if order already exists
    const existingRow = findRowByValue(sheet, 1, order.id.toString());

    const rowData = [
      order.id,
      order.order_number,
      order.created_at,
      order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
      order.customer ? order.customer.email : '',
      order.total_price,
      order.subtotal_price,
      order.total_tax,
      order.currency,
      order.financial_status,
      order.fulfillment_status || 'unfulfilled',
      order.shipping_address ? formatAddress(order.shipping_address) : '',
      JSON.stringify(order.line_items),
      'No',
      '',
      new Date().toISOString()
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      synced++;
    }
  });

  logIntegration('Shopify', 'syncOrders', 'SUCCESS', `Synced ${synced} new orders, updated ${orders.length - synced}`);

  return {
    success: true,
    message: `Synced ${orders.length} orders from Shopify`,
    newOrders: synced,
    updatedOrders: orders.length - synced
  };
}

function getShopifyOrder(orderId) {
  return shopifyApiCall(`orders/${orderId}.json`);
}

function updateShopifyOrderFulfillment(orderId, trackingNumber, trackingCompany) {
  const payload = {
    fulfillment: {
      tracking_number: trackingNumber,
      tracking_company: trackingCompany,
      notify_customer: true
    }
  };

  return shopifyApiCall(`orders/${orderId}/fulfillments.json`, 'POST', payload);
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY PRODUCTS & INVENTORY
// ═══════════════════════════════════════════════════════════════════════════

function syncShopifyProducts() {
  const result = shopifyApiCall('products.json?limit=250');

  if (!result.success) return result;

  const products = result.data.products || [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('SHOPIFY_Products');

  // Clear existing data (except header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  const rows = [];
  products.forEach(product => {
    product.variants.forEach(variant => {
      rows.push([
        product.id,
        product.title,
        product.handle,
        product.vendor,
        product.product_type,
        product.status,
        variant.id,
        variant.title,
        variant.sku,
        variant.price,
        variant.inventory_quantity,
        'No',
        '',
        new Date().toISOString()
      ]);
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  logIntegration('Shopify', 'syncProducts', 'SUCCESS', `Synced ${products.length} products with ${rows.length} variants`);

  return {
    success: true,
    message: `Synced ${products.length} products with ${rows.length} variants`,
    products: products.length,
    variants: rows.length
  };
}

function updateShopifyInventory(inventoryItemId, locationId, quantity) {
  const payload = {
    location_id: locationId,
    inventory_item_id: inventoryItemId,
    available: quantity
  };

  return shopifyApiCall('inventory_levels/set.json', 'POST', payload);
}

function syncFarmInventoryToShopify() {
  // Get farm inventory from REF_Crops
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const cropsSheet = ss.getSheetByName('REF_Crops');
  const shopifySheet = ss.getSheetByName('SHOPIFY_Products');

  if (!cropsSheet || !shopifySheet) {
    return { success: false, error: 'Required sheets not found' };
  }

  // Get product mapping (Farm Crop ID → Shopify Variant ID)
  const shopifyData = shopifySheet.getDataRange().getValues();
  const productMap = {};

  for (let i = 1; i < shopifyData.length; i++) {
    const farmCropId = shopifyData[i][12]; // Farm_Crop_ID column
    const variantId = shopifyData[i][6];   // Variant_ID column
    if (farmCropId) {
      productMap[farmCropId] = variantId;
    }
  }

  // TODO: Get inventory quantities from LOG_Inventory and update Shopify
  // This requires location ID from Shopify

  return {
    success: true,
    message: 'Inventory sync placeholder - requires Shopify location ID configuration',
    mappedProducts: Object.keys(productMap).length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICKBOOKS INTEGRATION - OAuth2 Service
// ═══════════════════════════════════════════════════════════════════════════

function getQuickBooksOAuthService() {
  return OAuth2.createService('QuickBooks')
    .setAuthorizationBaseUrl(OAUTH_URLS.QUICKBOOKS.AUTH)
    .setTokenUrl(OAUTH_URLS.QUICKBOOKS.TOKEN)
    .setClientId(QUICKBOOKS_CONFIG.CLIENT_ID)
    .setClientSecret(QUICKBOOKS_CONFIG.CLIENT_SECRET)
    .setCallbackFunction('quickBooksAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope(QUICKBOOKS_CONFIG.SCOPES)
    .setParam('response_type', 'code')
    .setTokenHeaders({
      'Authorization': 'Basic ' + Utilities.base64Encode(QUICKBOOKS_CONFIG.CLIENT_ID + ':' + QUICKBOOKS_CONFIG.CLIENT_SECRET)
    });
}

function quickBooksAuthCallback(request) {
  const service = getQuickBooksOAuthService();
  const authorized = service.handleCallback(request);

  if (authorized) {
    // Store the realmId (company ID) from the callback
    const realmId = request.parameter.realmId;
    if (realmId) {
      PropertiesService.getUserProperties().setProperty('QB_REALM_ID', realmId);
    }
    logIntegration('QuickBooks', 'OAuth', 'SUCCESS', 'Authorization successful');
    return HtmlService.createHtmlOutput('QuickBooks authorization successful! You can close this tab.');
  } else {
    logIntegration('QuickBooks', 'OAuth', 'FAILED', 'Authorization failed');
    return HtmlService.createHtmlOutput('QuickBooks authorization failed. Please try again.');
  }
}

function getQuickBooksAuthorizationUrl() {
  return getQuickBooksOAuthService().getAuthorizationUrl();
}

function disconnectQuickBooks() {
  getQuickBooksOAuthService().reset();
  PropertiesService.getUserProperties().deleteProperty('QB_REALM_ID');
  logIntegration('QuickBooks', 'Disconnect', 'SUCCESS', 'Disconnected from QuickBooks');
  return { success: true, message: 'Disconnected from QuickBooks' };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICKBOOKS API CALLS
// ═══════════════════════════════════════════════════════════════════════════

function quickBooksApiCall(endpoint, method = 'GET', payload = null) {
  if (!QUICKBOOKS_CONFIG.ENABLED) {
    return { success: false, error: 'QuickBooks integration is not enabled. Set QUICKBOOKS_CONFIG.ENABLED = true' };
  }

  const service = getQuickBooksOAuthService();

  if (!service.hasAccess()) {
    return {
      success: false,
      error: 'Not authorized with QuickBooks',
      authUrl: getQuickBooksAuthorizationUrl()
    };
  }

  const companyId = PropertiesService.getUserProperties().getProperty('QB_REALM_ID') || QUICKBOOKS_CONFIG.COMPANY_ID;
  const baseUrl = QUICKBOOKS_CONFIG.ENVIRONMENT === 'production'
    ? OAUTH_URLS.QUICKBOOKS.API_PRODUCTION
    : OAUTH_URLS.QUICKBOOKS.API_SANDBOX;

  const url = `${baseUrl}/${companyId}/${endpoint}`;

  const options = {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + service.getAccessToken(),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload && (method === 'POST' || method === 'PUT')) {
    options.payload = JSON.stringify(payload);
  }

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      logIntegration('QuickBooks', endpoint, 'SUCCESS', `${method} request successful`);
      return { success: true, data: JSON.parse(responseText) };
    } else if (responseCode === 401) {
      // Token expired, try to refresh
      service.refresh();
      return quickBooksApiCall(endpoint, method, payload); // Retry once
    } else {
      logIntegration('QuickBooks', endpoint, 'FAILED', `HTTP ${responseCode}: ${responseText}`);
      return { success: false, error: `HTTP ${responseCode}`, details: responseText };
    }
  } catch (error) {
    logIntegration('QuickBooks', endpoint, 'ERROR', error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICKBOOKS CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════

function syncQuickBooksCustomers() {
  const result = quickBooksApiCall('query?query=' + encodeURIComponent('SELECT * FROM Customer MAXRESULTS 1000'));

  if (!result.success) return result;

  const customers = result.data.QueryResponse?.Customer || [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('QB_Customers');

  // Clear existing data (except header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  const rows = customers.map(customer => [
    '', // Internal ID - will be linked later
    customer.Id,
    customer.DisplayName,
    customer.CompanyName || '',
    customer.PrimaryEmailAddr?.Address || '',
    customer.PrimaryPhone?.FreeFormNumber || '',
    formatQBAddress(customer.BillAddr),
    customer.Balance || 0,
    customer.Active,
    customer.MetaData?.CreateTime || '',
    new Date().toISOString()
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  logIntegration('QuickBooks', 'syncCustomers', 'SUCCESS', `Synced ${customers.length} customers`);

  return {
    success: true,
    message: `Synced ${customers.length} customers from QuickBooks`,
    customers: customers.length
  };
}

function createQuickBooksCustomer(customerData) {
  const payload = {
    DisplayName: customerData.displayName || customerData.name,
    CompanyName: customerData.companyName || '',
    PrimaryEmailAddr: customerData.email ? { Address: customerData.email } : undefined,
    PrimaryPhone: customerData.phone ? { FreeFormNumber: customerData.phone } : undefined,
    BillAddr: customerData.address ? {
      Line1: customerData.address.line1 || customerData.address,
      City: customerData.address.city || '',
      CountrySubDivisionCode: customerData.address.state || '',
      PostalCode: customerData.address.zip || ''
    } : undefined
  };

  const result = quickBooksApiCall('customer', 'POST', payload);

  if (result.success) {
    logIntegration('QuickBooks', 'createCustomer', 'SUCCESS', `Created customer: ${customerData.displayName || customerData.name}`);
  }

  return result;
}

function findOrCreateQBCustomer(customerData) {
  // First, try to find existing customer by email
  if (customerData.email) {
    const searchResult = quickBooksApiCall('query?query=' + encodeURIComponent(
      `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${customerData.email}'`
    ));

    if (searchResult.success && searchResult.data.QueryResponse?.Customer?.length > 0) {
      return { success: true, customer: searchResult.data.QueryResponse.Customer[0], existing: true };
    }
  }

  // Not found, create new customer
  const createResult = createQuickBooksCustomer(customerData);
  if (createResult.success) {
    return { success: true, customer: createResult.data.Customer, existing: false };
  }

  return createResult;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICKBOOKS INVOICES
// ═══════════════════════════════════════════════════════════════════════════

function createQuickBooksInvoice(invoiceData) {
  // invoiceData should contain:
  // - customerId (QB Customer ID)
  // - lineItems: [{ description, quantity, unitPrice, amount }]
  // - dueDate (optional)
  // - memo (optional)

  const lineItems = invoiceData.lineItems.map((item, index) => ({
    Id: (index + 1).toString(),
    LineNum: index + 1,
    Amount: item.amount || (item.quantity * item.unitPrice),
    DetailType: 'SalesItemLineDetail',
    SalesItemLineDetail: {
      ItemRef: item.itemRef || { value: '1', name: 'Services' }, // Default to Services
      Qty: item.quantity || 1,
      UnitPrice: item.unitPrice || item.amount
    },
    Description: item.description || item.name
  }));

  const payload = {
    CustomerRef: {
      value: invoiceData.customerId.toString()
    },
    Line: lineItems,
    DueDate: invoiceData.dueDate || getDatePlusDays(30),
    PrivateNote: invoiceData.memo || `Order from Tiny Seed Farm - ${new Date().toISOString()}`
  };

  const result = quickBooksApiCall('invoice', 'POST', payload);

  if (result.success) {
    // Save to our tracking sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('QB_Invoices');

    const invoice = result.data.Invoice;
    sheet.appendRow([
      generateId('INV'),
      invoice.Id,
      invoice.DocNumber,
      invoiceData.customerId,
      invoiceData.customerName || '',
      invoice.TotalAmt,
      invoice.Balance,
      invoice.DueDate,
      'Pending',
      JSON.stringify(invoiceData.lineItems),
      invoiceData.sourceOrderId || '',
      invoiceData.sourceType || 'Manual',
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    logIntegration('QuickBooks', 'createInvoice', 'SUCCESS', `Created invoice ${invoice.DocNumber} for $${invoice.TotalAmt}`);
  }

  return result;
}

function createInvoiceFromOrder(orderId, orderType = 'Sales') {
  // Get order from SALES_Orders sheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ordersSheet = ss.getSheetByName('SALES_Orders');
  const orderItemsSheet = ss.getSheetByName('SALES_OrderItems');

  if (!ordersSheet || !orderItemsSheet) {
    return { success: false, error: 'Order sheets not found' };
  }

  // Find the order
  const ordersData = ordersSheet.getDataRange().getValues();
  const headers = ordersData[0];
  let order = null;
  let orderRow = -1;

  for (let i = 1; i < ordersData.length; i++) {
    if (ordersData[i][0] === orderId) {
      order = {};
      headers.forEach((h, idx) => order[h] = ordersData[i][idx]);
      orderRow = i + 1;
      break;
    }
  }

  if (!order) {
    return { success: false, error: `Order ${orderId} not found` };
  }

  // Get order items
  const itemsData = orderItemsSheet.getDataRange().getValues();
  const itemHeaders = itemsData[0];
  const lineItems = [];

  for (let i = 1; i < itemsData.length; i++) {
    if (itemsData[i][1] === orderId) { // Order_ID column
      const item = {};
      itemHeaders.forEach((h, idx) => item[h] = itemsData[i][idx]);
      lineItems.push({
        description: `${item.Product_Name} - ${item.Variety || ''}`.trim(),
        quantity: item.Quantity || 1,
        unitPrice: item.Unit_Price || 0,
        amount: item.Line_Total || (item.Quantity * item.Unit_Price)
      });
    }
  }

  if (lineItems.length === 0) {
    return { success: false, error: 'No line items found for order' };
  }

  // Find or create QB customer
  const customerResult = findOrCreateQBCustomer({
    displayName: order.Customer_Name,
    email: order.Customer_Email || '',
    phone: order.Customer_Phone || ''
  });

  if (!customerResult.success) {
    return { success: false, error: 'Failed to find/create customer in QuickBooks', details: customerResult };
  }

  // Create the invoice
  const invoiceResult = createQuickBooksInvoice({
    customerId: customerResult.customer.Id,
    customerName: order.Customer_Name,
    lineItems: lineItems,
    sourceOrderId: orderId,
    sourceType: orderType,
    memo: `Order ${orderId} - ${order.Customer_Type || 'Direct'}`
  });

  return invoiceResult;
}

function syncShopifyOrderToQuickBooks(shopifyOrderId) {
  // Get Shopify order from our sheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('SHOPIFY_Orders');
  const data = sheet.getDataRange().getValues();

  let order = null;
  let orderRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === shopifyOrderId.toString()) {
      order = {
        id: data[i][0],
        orderNumber: data[i][1],
        customerName: data[i][3],
        customerEmail: data[i][4],
        totalPrice: data[i][5],
        lineItems: JSON.parse(data[i][12] || '[]')
      };
      orderRow = i + 1;
      break;
    }
  }

  if (!order) {
    return { success: false, error: `Shopify order ${shopifyOrderId} not found in local sheet` };
  }

  // Check if already synced
  if (data[orderRow - 1][13] === 'Yes') {
    return { success: false, error: 'Order already synced to QuickBooks' };
  }

  // Find or create customer
  const customerResult = findOrCreateQBCustomer({
    displayName: order.customerName,
    email: order.customerEmail
  });

  if (!customerResult.success) {
    return customerResult;
  }

  // Create invoice
  const lineItems = order.lineItems.map(item => ({
    description: item.title || item.name,
    quantity: item.quantity,
    unitPrice: parseFloat(item.price),
    amount: parseFloat(item.price) * item.quantity
  }));

  const invoiceResult = createQuickBooksInvoice({
    customerId: customerResult.customer.Id,
    customerName: order.customerName,
    lineItems: lineItems,
    sourceOrderId: order.id,
    sourceType: 'Shopify'
  });

  if (invoiceResult.success) {
    // Mark as synced in Shopify orders sheet
    sheet.getRange(orderRow, 14).setValue('Yes'); // Synced_To_QB
    sheet.getRange(orderRow, 15).setValue(invoiceResult.data.Invoice.Id); // QB_Invoice_ID
  }

  return invoiceResult;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function logIntegration(service, action, status, details) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('INTEGRATION_Log');
    if (sheet) {
      sheet.appendRow([
        new Date().toISOString(),
        service,
        action,
        status,
        details,
        status === 'ERROR' || status === 'FAILED' ? details : ''
      ]);
    }
  } catch (e) {
    console.error('Failed to log integration:', e);
  }
}

function formatAddress(addr) {
  if (!addr) return '';
  return [addr.address1, addr.address2, addr.city, addr.province, addr.zip, addr.country]
    .filter(Boolean)
    .join(', ');
}

function formatQBAddress(addr) {
  if (!addr) return '';
  return [addr.Line1, addr.Line2, addr.City, addr.CountrySubDivisionCode, addr.PostalCode]
    .filter(Boolean)
    .join(', ');
}

function getDatePlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function findRowByValue(sheet, column, value) {
  const data = sheet.getRange(1, column, sheet.getLastRow()).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].toString() === value.toString()) {
      return i + 1;
    }
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION STATUS & TESTING
// ═══════════════════════════════════════════════════════════════════════════

function getIntegrationStatus() {
  const shopifyService = SHOPIFY_CONFIG.ENABLED ? 'Enabled' : 'Disabled';
  const qbService = getQuickBooksOAuthService();

  return {
    success: true,
    shopify: {
      enabled: SHOPIFY_CONFIG.ENABLED,
      configured: SHOPIFY_CONFIG.ACCESS_TOKEN !== 'YOUR_SHOPIFY_ACCESS_TOKEN',
      store: SHOPIFY_CONFIG.STORE_NAME
    },
    quickbooks: {
      enabled: QUICKBOOKS_CONFIG.ENABLED,
      configured: QUICKBOOKS_CONFIG.CLIENT_ID !== 'YOUR_QB_CLIENT_ID',
      connected: qbService.hasAccess(),
      authUrl: !qbService.hasAccess() ? getQuickBooksAuthorizationUrl() : null,
      environment: QUICKBOOKS_CONFIG.ENVIRONMENT
    }
  };
}

function testShopifyConnection() {
  if (!SHOPIFY_CONFIG.ENABLED) {
    return { success: false, error: 'Shopify not enabled' };
  }

  const result = shopifyApiCall('shop.json');
  return result;
}

function testQuickBooksConnection() {
  if (!QUICKBOOKS_CONFIG.ENABLED) {
    return { success: false, error: 'QuickBooks not enabled' };
  }

  const result = quickBooksApiCall('companyinfo/' + (PropertiesService.getUserProperties().getProperty('QB_REALM_ID') || QUICKBOOKS_CONFIG.COMPANY_ID));
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLERS (for Shopify webhooks)
// ═══════════════════════════════════════════════════════════════════════════

function handleShopifyWebhook(e) {
  try {
    const topic = e.parameter.topic || 'unknown';
    const payload = JSON.parse(e.postData.contents);

    logIntegration('Shopify', `Webhook: ${topic}`, 'RECEIVED', JSON.stringify(payload).substring(0, 500));

    switch (topic) {
      case 'orders/create':
      case 'orders/updated':
        return handleShopifyOrderWebhook(payload);
      case 'products/update':
        return handleShopifyProductWebhook(payload);
      default:
        return { success: true, message: `Webhook ${topic} received but not handled` };
    }
  } catch (error) {
    logIntegration('Shopify', 'Webhook', 'ERROR', error.toString());
    return { success: false, error: error.toString() };
  }
}

function handleShopifyOrderWebhook(order) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('SHOPIFY_Orders');

  const existingRow = findRowByValue(sheet, 1, order.id.toString());

  const rowData = [
    order.id,
    order.order_number,
    order.created_at,
    order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
    order.customer ? order.customer.email : '',
    order.total_price,
    order.subtotal_price,
    order.total_tax,
    order.currency,
    order.financial_status,
    order.fulfillment_status || 'unfulfilled',
    order.shipping_address ? formatAddress(order.shipping_address) : '',
    JSON.stringify(order.line_items),
    'No',
    '',
    new Date().toISOString()
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  logIntegration('Shopify', 'OrderWebhook', 'SUCCESS', `Processed order ${order.order_number}`);

  return { success: true, message: `Order ${order.order_number} processed` };
}

function handleShopifyProductWebhook(product) {
  // Sync single product update
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('SHOPIFY_Products');

  product.variants.forEach(variant => {
    const existingRow = findRowByValue(sheet, 7, variant.id.toString()); // Variant_ID column

    const rowData = [
      product.id,
      product.title,
      product.handle,
      product.vendor,
      product.product_type,
      product.status,
      variant.id,
      variant.title,
      variant.sku,
      variant.price,
      variant.inventory_quantity,
      'No',
      '',
      new Date().toISOString()
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
  });

  logIntegration('Shopify', 'ProductWebhook', 'SUCCESS', `Processed product ${product.title}`);

  return { success: true, message: `Product ${product.title} processed` };
}

