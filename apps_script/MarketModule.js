/**
 * FARMERS MARKET MODULE
 * Smart, prescriptive market management with demand forecasting
 *
 * Features:
 * - GDD-integrated harvest planning
 * - Weather-based demand prediction
 * - Real-time market sales tracking
 * - Settlement and reconciliation
 * - Post-market learning
 *
 * Created: 2026-01-21
 */

// ============================================================================
// SHEET CONFIGURATION
// ============================================================================

const MARKET_SHEETS = {
  LOCATIONS: 'MARKET_Locations',
  SESSIONS: 'MARKET_Sessions',
  HARVEST_PLAN: 'MARKET_HarvestPlan',
  INVENTORY: 'MARKET_Inventory',
  TRANSACTIONS: 'MARKET_Transactions',
  SETTLEMENT: 'MARKET_Settlement',
  DEMAND_HISTORY: 'MARKET_DemandHistory'
};

const MARKET_COLORS = {
  LOCATIONS: '#4a86e8',      // Blue
  SESSIONS: '#6aa84f',       // Green
  HARVEST_PLAN: '#e69138',   // Orange
  INVENTORY: '#8e7cc3',      // Purple
  TRANSACTIONS: '#c27ba0',   // Pink
  SETTLEMENT: '#76a5af',     // Teal
  DEMAND_HISTORY: '#f1c232'  // Yellow
};

// Default market locations for Tiny Seed Farm
// shopifyLocationName must match EXACTLY what you name the location in Shopify
const DEFAULT_MARKETS = [
  {
    id: 'MKT-SEW',
    name: 'Sewickley Farmers Market',
    shopifyLocationName: 'Sewickley Farmers Market',  // Must match Shopify location name
    dayOfWeek: 'Saturday',
    startTime: '08:00',
    endTime: '12:00',
    address: 'Sewickley, PA',
    feeType: 'Flat',
    feeAmount: 25,
    weatherSensitivity: 70,
    isActive: true
  },
  {
    id: 'MKT-BLM',
    name: 'Bloomfield Saturday Market',
    shopifyLocationName: 'Bloomfield Saturday Market',  // Must match Shopify location name
    dayOfWeek: 'Saturday',
    startTime: '09:00',
    endTime: '13:00',
    address: 'Bloomfield, Pittsburgh, PA',
    feeType: 'Percentage',
    feeAmount: 5,
    weatherSensitivity: 75,
    isActive: true
  },
  {
    id: 'MKT-SQH',
    name: 'Squirrel Hill Farmers Market',
    shopifyLocationName: 'Squirrel Hill Farmers Market',  // Must match Shopify location name
    dayOfWeek: 'Sunday',
    startTime: '09:00',
    endTime: '13:00',
    address: 'Squirrel Hill, Pittsburgh, PA',
    feeType: 'Flat',
    feeAmount: 25,
    weatherSensitivity: 70,
    isActive: true
  },
  {
    id: 'MKT-LAW',
    name: 'Lawrenceville Farmers Market',
    shopifyLocationName: 'Lawrenceville Farmers Market',  // Must match Shopify location name
    dayOfWeek: 'Tuesday',
    startTime: '15:30',
    endTime: '19:00',
    address: 'Lawrenceville, Pittsburgh, PA',
    feeType: 'Flat',
    feeAmount: 20,
    weatherSensitivity: 65,
    isActive: true
  }
];

// Weather impact factors for demand prediction
const WEATHER_IMPACT_FACTORS = {
  RAIN_PROB_HIGH: -0.25,      // >50% rain probability
  RAIN_PROB_MEDIUM: -0.10,    // 30-50% rain probability
  TEMP_COLD: -0.15,           // Below 50°F
  TEMP_HOT: -0.10,            // Above 85°F
  TEMP_PERFECT: 0.10,         // 65-78°F and sunny
  HOLIDAY_WEEKEND: 0.20       // Holiday boost
};

// Demand prediction weights
const DEMAND_WEIGHTS = {
  HISTORICAL_BASE: 0.40,
  RECENT_TREND: 0.25,
  WEATHER_IMPACT: 0.20,
  SEASONAL_INDEX: 0.10,
  EVENT_BOOST: 0.05
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all market module sheets
 */
function initMarketModule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];

  // Create MARKET_Locations
  results.push(createMarketLocationsSheet(ss));

  // Create MARKET_Sessions
  results.push(createMarketSessionsSheet(ss));

  // Create MARKET_HarvestPlan
  results.push(createMarketHarvestPlanSheet(ss));

  // Create MARKET_Inventory
  results.push(createMarketInventorySheet(ss));

  // Create MARKET_Transactions
  results.push(createMarketTransactionsSheet(ss));

  // Create MARKET_Settlement
  results.push(createMarketSettlementSheet(ss));

  // Create MARKET_DemandHistory
  results.push(createMarketDemandHistorySheet(ss));

  // Populate default market locations
  populateDefaultMarkets(ss);

  return {
    success: true,
    message: 'Market module initialized',
    sheets: results
  };
}

/**
 * Create MARKET_Locations sheet
 */
function createMarketLocationsSheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.LOCATIONS);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.LOCATIONS);
    sheet.setTabColor(MARKET_COLORS.LOCATIONS);

    const headers = [
      'Location_ID',
      'Name',
      'Shopify_Location_Name',  // Must match Shopify POS location exactly
      'Day_Of_Week',
      'Start_Time',
      'End_Time',
      'Address',
      'GPS_Lat',
      'GPS_Lng',
      'Fee_Type',
      'Fee_Amount',
      'Avg_Customers',
      'Avg_Revenue',
      'Best_Sellers',
      'Weather_Sensitivity',
      'Is_Active',
      'Notes',
      'Created_At',
      'Updated_At'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4a86e8')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.LOCATIONS, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.LOCATIONS, status: 'exists' };
}

/**
 * Create MARKET_Sessions sheet
 */
function createMarketSessionsSheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.SESSIONS);
    sheet.setTabColor(MARKET_COLORS.SESSIONS);

    const headers = [
      'Session_ID',
      'Location_ID',
      'Location_Name',
      'Market_Date',
      'Day_Of_Week',
      'Status',
      'Weather_Forecast',
      'Weather_Impact',
      'Predicted_Revenue',
      'Predicted_Customers',
      'Actual_Revenue',
      'Actual_Customers',
      'Items_Brought',
      'Items_Sold',
      'Items_Returned',
      'Sell_Through_Rate',
      'Started_At',
      'Ended_At',
      'Staff',
      'Notes',
      'Created_At',
      'Updated_At'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#6aa84f')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.SESSIONS, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.SESSIONS, status: 'exists' };
}

/**
 * Create MARKET_HarvestPlan sheet
 */
function createMarketHarvestPlanSheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.HARVEST_PLAN);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.HARVEST_PLAN);
    sheet.setTabColor(MARKET_COLORS.HARVEST_PLAN);

    const headers = [
      'Plan_ID',
      'Session_ID',
      'Crop_ID',
      'Product_Name',
      'Variety',
      'Category',
      'Predicted_Demand',
      'Recommended_Harvest',
      'Harvest_Buffer_Pct',
      'Field_Location',
      'Bed_Numbers',
      'GDD_Status',
      'GDD_Current',
      'GDD_Target',
      'Days_To_Optimal',
      'Actual_Harvested',
      'Harvest_Quality',
      'Harvested_By',
      'Harvested_At',
      'Lot_Number',
      'Status',
      'Price_Each',
      'Unit',
      'Priority_Score',
      'Notes',
      'Created_At'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#e69138')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.HARVEST_PLAN, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.HARVEST_PLAN, status: 'exists' };
}

/**
 * Create MARKET_Inventory sheet
 */
function createMarketInventorySheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.INVENTORY);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.INVENTORY);
    sheet.setTabColor(MARKET_COLORS.INVENTORY);

    const headers = [
      'Inv_ID',
      'Session_ID',
      'Plan_ID',
      'Product_Name',
      'Variety',
      'Category',
      'Starting_Qty',
      'Current_Qty',
      'Sold_Qty',
      'Price',
      'Unit',
      'Revenue',
      'Display_Location',
      'Restock_Alert_Threshold',
      'Is_Low_Stock',
      'Sales_Velocity',
      'Lot_Number',
      'Last_Sale_At',
      'Last_Updated',
      'Notes'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#8e7cc3')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.INVENTORY, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.INVENTORY, status: 'exists' };
}

/**
 * Create MARKET_Transactions sheet
 */
function createMarketTransactionsSheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.TRANSACTIONS);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.TRANSACTIONS);
    sheet.setTabColor(MARKET_COLORS.TRANSACTIONS);

    const headers = [
      'Transaction_ID',
      'Session_ID',
      'Timestamp',
      'Items',
      'Item_Count',
      'Subtotal',
      'Tax',
      'Total',
      'Payment_Method',
      'Customer_Name',
      'Customer_Email',
      'Customer_Phone',
      'Is_New_Customer',
      'Is_CSA_Member',
      'Receipt_Sent',
      'Staff_ID',
      'Staff_Name',
      'Notes'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#c27ba0')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.TRANSACTIONS, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.TRANSACTIONS, status: 'exists' };
}

/**
 * Create MARKET_Settlement sheet
 */
function createMarketSettlementSheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.SETTLEMENT);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.SETTLEMENT);
    sheet.setTabColor(MARKET_COLORS.SETTLEMENT);

    const headers = [
      'Settlement_ID',
      'Session_ID',
      'Location_Name',
      'Market_Date',
      'Gross_Sales',
      'Market_Fee',
      'Card_Processing_Fees',
      'Net_Revenue',
      'Cash_Collected',
      'Card_Collected',
      'Venmo_Collected',
      'SNAP_Collected',
      'Check_Collected',
      'Other_Collected',
      'Starting_Cash',
      'Ending_Cash',
      'Cash_Variance',
      'Items_Brought',
      'Items_Sold',
      'Items_Returned',
      'Sell_Through_Rate',
      'Avg_Transaction',
      'Transaction_Count',
      'Customer_Count',
      'Revenue_Per_Customer',
      'Prediction_Accuracy',
      'Reconciled_By',
      'Reconciled_At',
      'Status',
      'Notes'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#76a5af')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.SETTLEMENT, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.SETTLEMENT, status: 'exists' };
}

/**
 * Create MARKET_DemandHistory sheet for ML training data
 */
function createMarketDemandHistorySheet(ss) {
  let sheet = ss.getSheetByName(MARKET_SHEETS.DEMAND_HISTORY);

  if (!sheet) {
    sheet = ss.insertSheet(MARKET_SHEETS.DEMAND_HISTORY);
    sheet.setTabColor(MARKET_COLORS.DEMAND_HISTORY);

    const headers = [
      'History_ID',
      'Location_ID',
      'Location_Name',
      'Product_Name',
      'Variety',
      'Category',
      'Market_Date',
      'Day_Of_Week',
      'Week_Of_Year',
      'Month',
      'Year',
      'Weather_Temp_High',
      'Weather_Temp_Low',
      'Weather_Precip_Prob',
      'Weather_Conditions',
      'Qty_Brought',
      'Qty_Sold',
      'Qty_Returned',
      'Price',
      'Revenue',
      'Sell_Through_Rate',
      'Time_To_Sellout_Min',
      'Is_Holiday_Weekend',
      'Notes'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#f1c232')
      .setFontColor('#000000')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    return { sheet: MARKET_SHEETS.DEMAND_HISTORY, status: 'created' };
  }

  return { sheet: MARKET_SHEETS.DEMAND_HISTORY, status: 'exists' };
}

/**
 * Populate default market locations
 */
function populateDefaultMarkets(ss) {
  const sheet = ss.getSheetByName(MARKET_SHEETS.LOCATIONS);
  if (!sheet) return;

  const existingData = sheet.getDataRange().getValues();
  if (existingData.length > 1) return; // Already has data

  const now = new Date().toISOString();
  const rows = DEFAULT_MARKETS.map(m => [
    m.id,
    m.name,
    m.shopifyLocationName || m.name,  // Shopify location name
    m.dayOfWeek,
    m.startTime,
    m.endTime,
    m.address,
    '', // GPS_Lat
    '', // GPS_Lng
    m.feeType,
    m.feeAmount,
    0, // Avg_Customers
    0, // Avg_Revenue
    '', // Best_Sellers
    m.weatherSensitivity,
    m.isActive,
    '', // Notes
    now,
    now
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new market session for planning
 */
function createMarketSession(params) {
  const { locationId, marketDate } = params;

  if (!locationId || !marketDate) {
    return { success: false, error: 'locationId and marketDate are required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const locationsSheet = ss.getSheetByName(MARKET_SHEETS.LOCATIONS);
  const sessionsSheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);

  if (!locationsSheet || !sessionsSheet) {
    return { success: false, error: 'Market module not initialized. Run initMarketModule() first.' };
  }

  // Get location details
  const location = getMarketLocationById(locationId);
  if (!location) {
    return { success: false, error: `Location not found: ${locationId}` };
  }

  // Check for existing session
  const existingSession = findExistingSession(locationId, marketDate);
  if (existingSession) {
    return {
      success: false,
      error: 'Session already exists for this market and date',
      existingSessionId: existingSession.sessionId
    };
  }

  // Get weather forecast
  const weather = fetchWeatherForDate(marketDate);
  const weatherImpact = calculateWeatherImpact(weather);

  // Generate session ID
  const dateStr = marketDate.replace(/-/g, '');
  const locCode = locationId.replace('MKT-', '');
  const sessionId = `MS-${dateStr}-${locCode}`;

  // Calculate predictions based on historical data
  const predictions = calculateSessionPredictions(locationId, marketDate, weather);

  const now = new Date().toISOString();
  const date = new Date(marketDate);
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

  const newRow = [
    sessionId,
    locationId,
    location.name,
    marketDate,
    dayOfWeek,
    'Planning', // Status
    JSON.stringify(weather),
    weatherImpact,
    predictions.revenue,
    predictions.customers,
    '', // Actual_Revenue
    '', // Actual_Customers
    '', // Items_Brought
    '', // Items_Sold
    '', // Items_Returned
    '', // Sell_Through_Rate
    '', // Started_At
    '', // Ended_At
    '', // Staff
    '', // Notes
    now,
    now
  ];

  sessionsSheet.appendRow(newRow);

  return {
    success: true,
    sessionId: sessionId,
    location: location.name,
    date: marketDate,
    weather: weather,
    weatherImpact: weatherImpact,
    predictions: predictions,
    status: 'Planning'
  };
}

/**
 * Get market location by ID
 */
function getMarketLocationById(locationId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.LOCATIONS);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === locationId) {
      const location = {};
      headers.forEach((h, idx) => {
        location[h.toLowerCase().replace(/_/g, '')] = data[i][idx];
      });
      return {
        id: data[i][0],
        name: data[i][1],
        shopifyLocationName: data[i][2],  // Shopify POS location name
        dayOfWeek: data[i][3],
        startTime: data[i][4],
        endTime: data[i][5],
        address: data[i][6],
        feeType: data[i][9],
        feeAmount: data[i][10],
        avgCustomers: data[i][11] || 0,
        avgRevenue: data[i][12] || 0,
        weatherSensitivity: data[i][14] || 50,
        isActive: data[i][15]
      };
    }
  }
  return null;
}

/**
 * Get Shopify location name for a market location
 */
function getShopifyLocationName(locationId) {
  const location = getMarketLocationById(locationId);
  return location?.shopifyLocationName || location?.name || '';
}

/**
 * Find existing session for location and date
 */
function findExistingSession(locationId, marketDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowLocationId = data[i][1];
    const rowDate = data[i][3];

    // Compare dates
    const rowDateStr = rowDate instanceof Date ?
      rowDate.toISOString().split('T')[0] :
      String(rowDate);

    if (rowLocationId === locationId && rowDateStr === marketDate) {
      return { sessionId: data[i][0], status: data[i][5] };
    }
  }
  return null;
}

/**
 * Get upcoming market sessions (next 14 days)
 */
function getUpcomingMarkets(params) {
  const days = params?.days || 14;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get all active locations
  const locations = getActiveMarketLocations();
  if (!locations.length) {
    return { success: true, markets: [], message: 'No active market locations' };
  }

  const upcoming = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For each day in the range
  for (let d = 0; d < days; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + d);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][checkDate.getDay()];
    const dateStr = checkDate.toISOString().split('T')[0];

    // Check which markets are on this day
    for (const loc of locations) {
      if (loc.dayOfWeek === dayName) {
        // Check if session exists
        const existingSession = findExistingSession(loc.id, dateStr);

        // Get weather forecast
        const weather = d < 16 ? fetchWeatherForDate(dateStr) : null;

        upcoming.push({
          date: dateStr,
          dayOfWeek: dayName,
          location: loc,
          sessionExists: !!existingSession,
          sessionId: existingSession?.sessionId || null,
          status: existingSession?.status || 'Not Created',
          weather: weather,
          weatherImpact: weather ? calculateWeatherImpact(weather) : 'Unknown',
          daysAway: d
        });
      }
    }
  }

  return {
    success: true,
    count: upcoming.length,
    markets: upcoming.sort((a, b) => new Date(a.date) - new Date(b.date))
  };
}

/**
 * Get all active market locations
 */
function getActiveMarketLocations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.LOCATIONS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const locations = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][14] === true || data[i][14] === 'TRUE') {
      locations.push({
        id: data[i][0],
        name: data[i][1],
        dayOfWeek: data[i][2],
        startTime: data[i][3],
        endTime: data[i][4],
        address: data[i][5],
        feeType: data[i][8],
        feeAmount: data[i][9],
        avgCustomers: data[i][10] || 0,
        avgRevenue: data[i][11] || 0,
        weatherSensitivity: data[i][13] || 50
      });
    }
  }

  return locations;
}

/**
 * Get full market session details
 */
function getMarketSession(params) {
  const sessionId = params?.sessionId;
  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);
  if (!sheet) {
    return { success: false, error: 'Sessions sheet not found' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      const session = {};
      headers.forEach((h, idx) => {
        let value = data[i][idx];
        // Parse JSON fields
        if (['Weather_Forecast', 'Staff'].includes(h) && value) {
          try { value = JSON.parse(value); } catch (e) {}
        }
        session[h] = value;
      });

      // Get related data
      session.harvestPlan = getSessionHarvestPlan(sessionId);
      session.inventory = getSessionInventory(sessionId);
      session.transactions = getSessionTransactions(sessionId);
      session.settlement = getSessionSettlement(sessionId);

      return { success: true, session };
    }
  }

  return { success: false, error: `Session not found: ${sessionId}` };
}

/**
 * Update market session status
 */
function updateMarketSessionStatus(params) {
  const { sessionId, status, notes } = params;

  if (!sessionId || !status) {
    return { success: false, error: 'sessionId and status are required' };
  }

  const validStatuses = ['Planning', 'Harvesting', 'Packed', 'AtMarket', 'Complete', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);
  if (!sheet) {
    return { success: false, error: 'Sessions sheet not found' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Status') + 1;
  const updatedAtCol = headers.indexOf('Updated_At') + 1;
  const startedAtCol = headers.indexOf('Started_At') + 1;
  const endedAtCol = headers.indexOf('Ended_At') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      const now = new Date().toISOString();

      sheet.getRange(i + 1, statusCol).setValue(status);
      sheet.getRange(i + 1, updatedAtCol).setValue(now);

      // Set timestamps for specific status changes
      if (status === 'AtMarket' && !data[i][startedAtCol - 1]) {
        sheet.getRange(i + 1, startedAtCol).setValue(now);
      }
      if (status === 'Complete' && !data[i][endedAtCol - 1]) {
        sheet.getRange(i + 1, endedAtCol).setValue(now);
      }

      return {
        success: true,
        sessionId,
        newStatus: status,
        updatedAt: now
      };
    }
  }

  return { success: false, error: `Session not found: ${sessionId}` };
}

// ============================================================================
// WEATHER INTEGRATION
// ============================================================================

/**
 * Fetch weather forecast for a specific date
 * Uses Open-Meteo API (free, no key required)
 */
function fetchWeatherForDate(dateStr) {
  try {
    // Tiny Seed Farm coordinates (Rochester, PA area)
    const lat = 40.7020;
    const lng = -80.2887;

    const today = new Date();
    const targetDate = new Date(dateStr);
    const daysAhead = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));

    // Only fetch if within forecast range (16 days)
    if (daysAhead > 16 || daysAhead < 0) {
      return {
        available: false,
        message: 'Date outside forecast range',
        date: dateStr
      };
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=16`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());

    if (!data.daily) {
      return { available: false, error: 'No forecast data' };
    }

    // Find the index for our target date
    const dateIndex = data.daily.time.indexOf(dateStr);
    if (dateIndex === -1) {
      return { available: false, error: 'Date not in forecast' };
    }

    const weatherCode = data.daily.weathercode[dateIndex];
    const conditions = getWeatherConditionText(weatherCode);

    return {
      available: true,
      date: dateStr,
      high: Math.round(data.daily.temperature_2m_max[dateIndex]),
      low: Math.round(data.daily.temperature_2m_min[dateIndex]),
      precipProbability: data.daily.precipitation_probability_max[dateIndex],
      precipAmount: data.daily.precipitation_sum[dateIndex],
      weatherCode: weatherCode,
      conditions: conditions
    };
  } catch (e) {
    Logger.log('Weather fetch error: ' + e.toString());
    return { available: false, error: e.toString() };
  }
}

/**
 * Convert weather code to text description
 */
function getWeatherConditionText(code) {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail'
  };
  return codes[code] || 'Unknown';
}

/**
 * Calculate weather impact on market demand
 */
function calculateWeatherImpact(weather) {
  if (!weather || !weather.available) {
    return 'Unknown';
  }

  let impact = 0;

  // Rain probability impact
  if (weather.precipProbability > 50) {
    impact += WEATHER_IMPACT_FACTORS.RAIN_PROB_HIGH;
  } else if (weather.precipProbability > 30) {
    impact += WEATHER_IMPACT_FACTORS.RAIN_PROB_MEDIUM;
  }

  // Temperature impact
  if (weather.high < 50) {
    impact += WEATHER_IMPACT_FACTORS.TEMP_COLD;
  } else if (weather.high > 85) {
    impact += WEATHER_IMPACT_FACTORS.TEMP_HOT;
  } else if (weather.high >= 65 && weather.high <= 78 && weather.precipProbability < 20) {
    impact += WEATHER_IMPACT_FACTORS.TEMP_PERFECT;
  }

  // Determine impact category
  if (impact >= 0.05) return 'Excellent';
  if (impact >= -0.05) return 'Good';
  if (impact >= -0.15) return 'Fair';
  return 'Poor';
}

// ============================================================================
// DEMAND PREDICTION
// ============================================================================

/**
 * Calculate session predictions based on historical data and weather
 */
function calculateSessionPredictions(locationId, marketDate, weather) {
  // Get historical averages for this location
  const location = getMarketLocationById(locationId);

  // Start with historical averages or defaults
  let baseRevenue = location?.avgRevenue || 500;
  let baseCustomers = location?.avgCustomers || 40;

  // Apply weather impact
  if (weather && weather.available) {
    const impact = calculateWeatherImpactFactor(weather);
    baseRevenue = Math.round(baseRevenue * (1 + impact));
    baseCustomers = Math.round(baseCustomers * (1 + impact));
  }

  // Check for holiday weekend
  const date = new Date(marketDate);
  const isHoliday = isHolidayWeekend(date);
  if (isHoliday) {
    baseRevenue = Math.round(baseRevenue * (1 + WEATHER_IMPACT_FACTORS.HOLIDAY_WEEKEND));
    baseCustomers = Math.round(baseCustomers * (1 + WEATHER_IMPACT_FACTORS.HOLIDAY_WEEKEND));
  }

  return {
    revenue: baseRevenue,
    customers: baseCustomers,
    avgTransaction: baseCustomers > 0 ? Math.round(baseRevenue / baseCustomers * 100) / 100 : 0,
    isHolidayWeekend: isHoliday,
    weatherAdjusted: weather?.available || false
  };
}

/**
 * Calculate numeric weather impact factor
 */
function calculateWeatherImpactFactor(weather) {
  if (!weather || !weather.available) return 0;

  let impact = 0;

  if (weather.precipProbability > 50) {
    impact += WEATHER_IMPACT_FACTORS.RAIN_PROB_HIGH;
  } else if (weather.precipProbability > 30) {
    impact += WEATHER_IMPACT_FACTORS.RAIN_PROB_MEDIUM;
  }

  if (weather.high < 50) {
    impact += WEATHER_IMPACT_FACTORS.TEMP_COLD;
  } else if (weather.high > 85) {
    impact += WEATHER_IMPACT_FACTORS.TEMP_HOT;
  } else if (weather.high >= 65 && weather.high <= 78 && weather.precipProbability < 20) {
    impact += WEATHER_IMPACT_FACTORS.TEMP_PERFECT;
  }

  return impact;
}

/**
 * Check if date is a holiday weekend
 */
function isHolidayWeekend(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Memorial Day (last Monday of May)
  if (month === 5 && dayOfWeek === 1 && day > 24) return true;

  // July 4th weekend
  if (month === 7 && day >= 2 && day <= 6) return true;

  // Labor Day (first Monday of September)
  if (month === 9 && dayOfWeek === 1 && day <= 7) return true;

  return false;
}

/**
 * Calculate demand prediction for a specific product
 */
function calculateDemandPrediction(params) {
  const { locationId, productName, marketDate } = params;

  if (!locationId || !productName || !marketDate) {
    return { success: false, error: 'locationId, productName, and marketDate are required' };
  }

  // Get historical data for this product/location
  const history = getProductDemandHistory(locationId, productName);

  // Get weather forecast
  const weather = fetchWeatherForDate(marketDate);
  const weatherFactor = calculateWeatherImpactFactor(weather);

  // Calculate base demand from history
  let baseDemand = 0;
  if (history.length > 0) {
    // Average of historical sales
    const avgSold = history.reduce((sum, h) => sum + h.qtySold, 0) / history.length;
    baseDemand = avgSold;

    // Apply recent trend (last 4 markets)
    const recent = history.slice(0, 4);
    if (recent.length >= 2) {
      const recentAvg = recent.reduce((sum, h) => sum + h.qtySold, 0) / recent.length;
      const trend = (recentAvg - avgSold) / avgSold;
      baseDemand = avgSold + (trend * avgSold * DEMAND_WEIGHTS.RECENT_TREND);
    }
  } else {
    // No history - use default
    baseDemand = 20;
  }

  // Apply weather adjustment
  const weatherAdjustedDemand = baseDemand * (1 + weatherFactor * DEMAND_WEIGHTS.WEATHER_IMPACT);

  // Apply seasonal index (placeholder - could be expanded)
  const date = new Date(marketDate);
  const month = date.getMonth();
  const seasonalIndex = getSeasonalIndex(productName, month);
  const finalDemand = weatherAdjustedDemand * seasonalIndex;

  // Calculate harvest recommendation (demand + buffer)
  const harvestBuffer = 0.15; // 15% buffer
  const recommendedHarvest = Math.ceil(finalDemand * (1 + harvestBuffer));

  return {
    success: true,
    product: productName,
    location: locationId,
    date: marketDate,
    prediction: {
      baseDemand: Math.round(baseDemand),
      weatherAdjustment: Math.round(weatherFactor * 100) + '%',
      seasonalIndex: seasonalIndex,
      predictedDemand: Math.round(finalDemand),
      recommendedHarvest: recommendedHarvest,
      confidence: history.length >= 4 ? 'High' : history.length >= 2 ? 'Medium' : 'Low'
    },
    weather: weather,
    historyCount: history.length
  };
}

/**
 * Get historical demand data for a product at a location
 */
function getProductDemandHistory(locationId, productName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.DEMAND_HISTORY);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const history = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === locationId && data[i][3] === productName) {
      history.push({
        date: data[i][6],
        qtySold: data[i][16] || 0,
        qtyBrought: data[i][15] || 0,
        price: data[i][18] || 0,
        revenue: data[i][19] || 0,
        sellThrough: data[i][20] || 0,
        weather: {
          high: data[i][11],
          precipProb: data[i][13]
        }
      });
    }
  }

  // Sort by date descending (most recent first)
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  return history;
}

/**
 * Get seasonal index for a product
 * Returns multiplier based on typical seasonal demand
 */
function getSeasonalIndex(productName, month) {
  // Simplified seasonal patterns
  const summerCrops = ['Tomatoes', 'Peppers', 'Cucumbers', 'Squash', 'Corn', 'Melons'];
  const springFallCrops = ['Lettuce', 'Spinach', 'Kale', 'Chard', 'Broccoli', 'Carrots', 'Beets'];

  const isSummer = month >= 5 && month <= 8; // June-September
  const isSpringFall = (month >= 3 && month <= 5) || (month >= 8 && month <= 10);

  const productLower = productName.toLowerCase();

  for (const crop of summerCrops) {
    if (productLower.includes(crop.toLowerCase())) {
      return isSummer ? 1.2 : 0.8;
    }
  }

  for (const crop of springFallCrops) {
    if (productLower.includes(crop.toLowerCase())) {
      return isSpringFall ? 1.15 : 0.9;
    }
  }

  return 1.0; // Default - no seasonal adjustment
}

// ============================================================================
// HELPER FUNCTIONS FOR SESSION DATA
// ============================================================================

function getSessionHarvestPlan(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.HARVEST_PLAN);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const plans = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId) {
      const plan = {};
      headers.forEach((h, idx) => plan[h] = data[i][idx]);
      plans.push(plan);
    }
  }

  return plans;
}

function getSessionInventory(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.INVENTORY);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId) {
      const item = {};
      headers.forEach((h, idx) => item[h] = data[i][idx]);
      items.push(item);
    }
  }

  return items;
}

function getSessionTransactions(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.TRANSACTIONS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const txns = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId) {
      const txn = {};
      headers.forEach((h, idx) => {
        let value = data[i][idx];
        if (h === 'Items' && value) {
          try { value = JSON.parse(value); } catch (e) {}
        }
        txn[h] = value;
      });
      txns.push(txn);
    }
  }

  return txns;
}

function getSessionSettlement(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.SETTLEMENT);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId) {
      const settlement = {};
      headers.forEach((h, idx) => settlement[h] = data[i][idx]);
      return settlement;
    }
  }

  return null;
}

// ============================================================================
// MARKET DASHBOARD API
// ============================================================================

/**
 * Get market dashboard data for current/specified session
 */
function getMarketDashboard(params) {
  const sessionId = params?.sessionId;

  if (sessionId) {
    // Get specific session dashboard
    return getSessionDashboard(sessionId);
  }

  // Get overview dashboard
  const upcoming = getUpcomingMarkets({ days: 7 });
  const recentSessions = getRecentMarketSessions(5);

  // Calculate totals
  let totalRevenue = 0;
  let totalTransactions = 0;
  recentSessions.forEach(s => {
    totalRevenue += s.actualRevenue || 0;
    totalTransactions += s.transactionCount || 0;
  });

  return {
    success: true,
    overview: {
      upcomingCount: upcoming.count,
      recentSessionCount: recentSessions.length,
      recentRevenue: totalRevenue,
      recentTransactions: totalTransactions
    },
    upcoming: upcoming.markets,
    recent: recentSessions
  };
}

/**
 * Get dashboard for a specific session
 */
function getSessionDashboard(sessionId) {
  const sessionResult = getMarketSession({ sessionId });
  if (!sessionResult.success) return sessionResult;

  const session = sessionResult.session;
  const transactions = session.transactions || [];
  const inventory = session.inventory || [];

  // Calculate real-time stats
  const totalSales = transactions.reduce((sum, t) => sum + (t.Total || 0), 0);
  const transactionCount = transactions.length;
  const itemsSold = inventory.reduce((sum, i) => sum + (i.Sold_Qty || 0), 0);
  const itemsBrought = inventory.reduce((sum, i) => sum + (i.Starting_Qty || 0), 0);

  // Payment method breakdown
  const paymentBreakdown = {
    cash: 0,
    card: 0,
    venmo: 0,
    snap: 0,
    other: 0
  };

  transactions.forEach(t => {
    const method = (t.Payment_Method || '').toLowerCase();
    const amount = t.Total || 0;
    if (method.includes('cash')) paymentBreakdown.cash += amount;
    else if (method.includes('card')) paymentBreakdown.card += amount;
    else if (method.includes('venmo')) paymentBreakdown.venmo += amount;
    else if (method.includes('snap')) paymentBreakdown.snap += amount;
    else paymentBreakdown.other += amount;
  });

  // Best sellers
  const salesByProduct = {};
  inventory.forEach(i => {
    salesByProduct[i.Product_Name] = {
      name: i.Product_Name,
      sold: i.Sold_Qty || 0,
      revenue: i.Revenue || 0,
      remaining: i.Current_Qty || 0
    };
  });
  const bestSellers = Object.values(salesByProduct)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Low stock alerts
  const lowStock = inventory.filter(i =>
    i.Is_Low_Stock || (i.Current_Qty <= (i.Restock_Alert_Threshold || 5) && i.Current_Qty > 0)
  );

  return {
    success: true,
    sessionId: sessionId,
    status: session.Status,
    location: session.Location_Name,
    date: session.Market_Date,
    stats: {
      totalSales: totalSales,
      transactionCount: transactionCount,
      avgTransaction: transactionCount > 0 ? Math.round(totalSales / transactionCount * 100) / 100 : 0,
      itemsSold: itemsSold,
      itemsBrought: itemsBrought,
      sellThroughRate: itemsBrought > 0 ? Math.round(itemsSold / itemsBrought * 100) : 0
    },
    paymentBreakdown: paymentBreakdown,
    bestSellers: bestSellers,
    lowStockAlerts: lowStock,
    prediction: {
      revenue: session.Predicted_Revenue,
      customers: session.Predicted_Customers,
      vsActual: session.Predicted_Revenue ?
        Math.round((totalSales / session.Predicted_Revenue) * 100) + '%' : 'N/A'
    },
    weather: session.Weather_Forecast
  };
}

/**
 * Get recent market sessions
 */
function getRecentMarketSessions(count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sessions = [];

  for (let i = 1; i < data.length; i++) {
    const session = {};
    headers.forEach((h, idx) => session[h.replace(/_/g, '').toLowerCase()] = data[i][idx]);

    // Only include completed or recent sessions
    if (session.status === 'Complete' || session.status === 'AtMarket') {
      sessions.push({
        sessionId: data[i][0],
        location: data[i][2],
        date: data[i][3],
        status: data[i][5],
        predictedRevenue: data[i][8] || 0,
        actualRevenue: data[i][10] || 0,
        actualCustomers: data[i][11] || 0,
        sellThroughRate: data[i][15] || 0
      });
    }
  }

  // Sort by date descending and take top N
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  return sessions.slice(0, count);
}

// ============================================================================
// HARVEST PLAN GENERATOR (GDD Integration)
// ============================================================================

/**
 * Generate smart harvest plan for a market session
 * THE KEY FUNCTION - Prescriptive harvest list using GDD predictions
 */
function generateMarketHarvestPlan(params) {
  const { sessionId, regenerate } = params;

  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionResult = getMarketSession({ sessionId });

  if (!sessionResult.success) {
    return sessionResult;
  }

  const session = sessionResult.session;
  const marketDate = session.Market_Date;
  const locationId = session.Location_ID;

  // Check if harvest plan already exists
  const existingPlan = session.harvestPlan || [];
  if (existingPlan.length > 0 && !regenerate) {
    return {
      success: true,
      message: 'Harvest plan already exists. Use regenerate=true to recreate.',
      sessionId: sessionId,
      items: existingPlan
    };
  }

  // Get GDD-ready crops from SmartSuccessionPlanner
  const gddReadyCrops = getGDDHarvestReadiness(marketDate);

  // Get market items catalog
  const marketItems = getMarketItemsCatalog();

  // Get weather for demand adjustment
  const weather = fetchWeatherForDate(marketDate);
  const weatherFactor = calculateWeatherImpactFactor(weather);

  // Generate harvest recommendations
  const harvestPlan = [];
  const harvestSheet = ss.getSheetByName(MARKET_SHEETS.HARVEST_PLAN);

  if (!harvestSheet) {
    return { success: false, error: 'Harvest plan sheet not found. Run initMarketModule().' };
  }

  const now = new Date().toISOString();
  let planNumber = 1;

  for (const crop of gddReadyCrops) {
    // Find matching market item for pricing
    const marketItem = findMatchingMarketItem(crop.crop, marketItems);

    // Calculate demand prediction
    const demandResult = calculateDemandPrediction({
      locationId: locationId,
      productName: crop.crop,
      marketDate: marketDate
    });

    const predictedDemand = demandResult.success ?
      demandResult.prediction.predictedDemand : 20;
    const recommendedHarvest = demandResult.success ?
      demandResult.prediction.recommendedHarvest : Math.ceil(predictedDemand * 1.15);

    // Calculate priority score
    const priorityScore = calculateHarvestPriority(crop, marketItem, predictedDemand);

    const planId = `HP-${sessionId}-${String(planNumber).padStart(3, '0')}`;

    const planRow = {
      planId: planId,
      sessionId: sessionId,
      cropId: crop.cropId || '',
      productName: crop.crop,
      variety: crop.variety || '',
      category: crop.category || 'Vegetable',
      predictedDemand: predictedDemand,
      recommendedHarvest: recommendedHarvest,
      harvestBufferPct: 15,
      fieldLocation: crop.field || '',
      bedNumbers: crop.beds || '',
      gddStatus: crop.gddStatus,
      gddCurrent: crop.gddCurrent || 0,
      gddTarget: crop.gddTarget || 0,
      daysToOptimal: crop.daysToOptimal || 0,
      actualHarvested: '',
      harvestQuality: '',
      harvestedBy: '',
      harvestedAt: '',
      lotNumber: '',
      status: 'Pending',
      priceEach: marketItem?.price || 0,
      unit: marketItem?.unit || 'each',
      priorityScore: priorityScore,
      notes: generateHarvestNotes(crop, weather),
      createdAt: now
    };

    // Add to sheet
    harvestSheet.appendRow([
      planRow.planId,
      planRow.sessionId,
      planRow.cropId,
      planRow.productName,
      planRow.variety,
      planRow.category,
      planRow.predictedDemand,
      planRow.recommendedHarvest,
      planRow.harvestBufferPct,
      planRow.fieldLocation,
      planRow.bedNumbers,
      planRow.gddStatus,
      planRow.gddCurrent,
      planRow.gddTarget,
      planRow.daysToOptimal,
      planRow.actualHarvested,
      planRow.harvestQuality,
      planRow.harvestedBy,
      planRow.harvestedAt,
      planRow.lotNumber,
      planRow.status,
      planRow.priceEach,
      planRow.unit,
      planRow.priorityScore,
      planRow.notes,
      planRow.createdAt
    ]);

    harvestPlan.push(planRow);
    planNumber++;
  }

  // Sort by priority
  harvestPlan.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    success: true,
    sessionId: sessionId,
    marketDate: marketDate,
    location: session.Location_Name,
    weather: weather,
    itemCount: harvestPlan.length,
    items: harvestPlan,
    summary: generateHarvestSummary(harvestPlan)
  };
}

/**
 * Get GDD-based harvest readiness from SmartSuccessionPlanner
 */
function getGDDHarvestReadiness(marketDate) {
  const readyCrops = [];

  try {
    // Try to use SmartSuccessionPlanner functions if available
    if (typeof getHarvestForecast === 'function') {
      const forecast = getHarvestForecast({ targetDate: marketDate });
      if (forecast.success) {
        return forecast.crops.map(c => ({
          crop: c.crop,
          variety: c.variety,
          field: c.field,
          beds: c.beds,
          gddStatus: c.readinessStatus,
          gddCurrent: c.gddAccumulated,
          gddTarget: c.gddRequired,
          daysToOptimal: c.daysToReady,
          category: c.category
        }));
      }
    }
  } catch (e) {
    Logger.log('GDD forecast not available: ' + e.toString());
  }

  // Fallback: Check FieldMaster for planted crops
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fieldMaster = ss.getSheetByName('FieldMaster');

  if (fieldMaster) {
    const data = fieldMaster.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const crop = row[headers.indexOf('Crop')] || row[headers.indexOf('crop')];
      const variety = row[headers.indexOf('Variety')] || row[headers.indexOf('variety')] || '';
      const status = row[headers.indexOf('Status')] || row[headers.indexOf('status')] || '';

      // Only include crops that are growing/active
      if (crop && (status === '' || status === 'Active' || status === 'Growing')) {
        readyCrops.push({
          crop: crop,
          variety: variety,
          field: row[headers.indexOf('Field')] || row[headers.indexOf('field')] || '',
          beds: row[headers.indexOf('Beds')] || row[headers.indexOf('beds')] || '',
          gddStatus: 'Ready',
          gddCurrent: 0,
          gddTarget: 0,
          daysToOptimal: 0,
          category: getCropCategory(crop)
        });
      }
    }
  }

  // If still no crops, return sample based on common market items
  if (readyCrops.length === 0) {
    const commonCrops = [
      { crop: 'Tomatoes', category: 'Vegetable' },
      { crop: 'Peppers', category: 'Vegetable' },
      { crop: 'Lettuce', category: 'Leafy Greens' },
      { crop: 'Kale', category: 'Leafy Greens' },
      { crop: 'Cucumbers', category: 'Vegetable' },
      { crop: 'Squash', category: 'Vegetable' },
      { crop: 'Carrots', category: 'Root Vegetable' },
      { crop: 'Beets', category: 'Root Vegetable' }
    ];

    return commonCrops.map(c => ({
      ...c,
      variety: '',
      field: '',
      beds: '',
      gddStatus: 'Ready',
      gddCurrent: 0,
      gddTarget: 0,
      daysToOptimal: 0
    }));
  }

  return readyCrops;
}

/**
 * Get market items catalog (from SALES_MarketItems)
 */
function getMarketItemsCatalog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('SALES_MarketItems');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    items.push({
      name: data[i][headers.indexOf('Name')] || data[i][0],
      price: data[i][headers.indexOf('Price')] || data[i][headers.indexOf('price')] || 0,
      unit: data[i][headers.indexOf('Unit')] || data[i][headers.indexOf('unit')] || 'each',
      category: data[i][headers.indexOf('Category')] || data[i][headers.indexOf('category')] || ''
    });
  }

  return items;
}

/**
 * Find matching market item for a crop
 */
function findMatchingMarketItem(cropName, marketItems) {
  const cropLower = cropName.toLowerCase();

  for (const item of marketItems) {
    if (item.name.toLowerCase().includes(cropLower) ||
        cropLower.includes(item.name.toLowerCase())) {
      return item;
    }
  }

  return null;
}

/**
 * Calculate harvest priority score
 */
function calculateHarvestPriority(crop, marketItem, predictedDemand) {
  let score = 50; // Base score

  // GDD readiness - ready crops get priority
  if (crop.gddStatus === 'Ready') score += 30;
  else if (crop.gddStatus === 'Harvest Soon') score += 20;
  else if (crop.gddStatus === 'Overdue') score += 25; // Still high priority

  // High demand items
  if (predictedDemand > 30) score += 15;
  else if (predictedDemand > 15) score += 8;

  // High-value items
  if (marketItem && marketItem.price > 5) score += 10;

  // Perishability factor
  const perishable = ['Lettuce', 'Spinach', 'Herbs', 'Microgreens'];
  if (perishable.some(p => crop.crop.toLowerCase().includes(p.toLowerCase()))) {
    score += 5; // Harvest closer to market
  }

  return Math.min(100, score);
}

/**
 * Generate harvest notes based on conditions
 */
function generateHarvestNotes(crop, weather) {
  const notes = [];

  if (crop.gddStatus === 'Overdue') {
    notes.push('OVERDUE - Harvest immediately to prevent quality loss');
  }

  if (weather && weather.available) {
    if (weather.high > 85) {
      notes.push('Hot day - harvest early morning');
    }
    if (weather.precipProbability > 50) {
      notes.push('Rain expected - harvest early');
    }
  }

  if (crop.daysToOptimal && crop.daysToOptimal > 3) {
    notes.push(`May be slightly early - optimal in ${crop.daysToOptimal} days`);
  }

  return notes.join('. ');
}

/**
 * Generate harvest plan summary
 */
function generateHarvestSummary(harvestPlan) {
  const summary = {
    totalItems: harvestPlan.length,
    totalUnits: harvestPlan.reduce((sum, p) => sum + p.recommendedHarvest, 0),
    byCategory: {},
    highPriority: harvestPlan.filter(p => p.priorityScore >= 80).length,
    estimatedRevenue: harvestPlan.reduce((sum, p) =>
      sum + (p.predictedDemand * p.priceEach), 0)
  };

  harvestPlan.forEach(p => {
    if (!summary.byCategory[p.category]) {
      summary.byCategory[p.category] = { items: 0, units: 0 };
    }
    summary.byCategory[p.category].items++;
    summary.byCategory[p.category].units += p.recommendedHarvest;
  });

  return summary;
}

/**
 * Get crop category
 */
function getCropCategory(cropName) {
  const categories = {
    'Leafy Greens': ['Lettuce', 'Spinach', 'Kale', 'Chard', 'Arugula', 'Mizuna'],
    'Root Vegetable': ['Carrots', 'Beets', 'Radishes', 'Turnips', 'Parsnips'],
    'Fruit Vegetable': ['Tomatoes', 'Peppers', 'Cucumbers', 'Squash', 'Eggplant'],
    'Brassica': ['Broccoli', 'Cabbage', 'Cauliflower', 'Brussels'],
    'Allium': ['Onions', 'Garlic', 'Leeks', 'Scallions'],
    'Herbs': ['Basil', 'Cilantro', 'Parsley', 'Dill', 'Mint'],
    'Flowers': ['Sunflowers', 'Zinnias', 'Dahlias', 'Rudbeckia']
  };

  for (const [category, crops] of Object.entries(categories)) {
    if (crops.some(c => cropName.toLowerCase().includes(c.toLowerCase()))) {
      return category;
    }
  }

  return 'Vegetable';
}

// ============================================================================
// QUICK SALE FUNCTIONS
// ============================================================================

/**
 * Record a market transaction (full details)
 */
function recordMarketSale(params) {
  const { sessionId, items, paymentMethod, customerName, customerEmail, customerPhone, staffName, notes } = params;

  if (!sessionId || !items || !paymentMethod) {
    return { success: false, error: 'sessionId, items, and paymentMethod are required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txnSheet = ss.getSheetByName(MARKET_SHEETS.TRANSACTIONS);
  const invSheet = ss.getSheetByName(MARKET_SHEETS.INVENTORY);

  if (!txnSheet || !invSheet) {
    return { success: false, error: 'Transaction or Inventory sheet not found' };
  }

  // Parse items if string
  let itemList = typeof items === 'string' ? JSON.parse(items) : items;

  // Calculate totals
  let subtotal = 0;
  itemList.forEach(item => {
    subtotal += (item.price || 0) * (item.qty || 1);
  });

  const tax = 0; // Farm products typically tax-exempt
  const total = subtotal + tax;

  // Generate transaction ID
  const now = new Date();
  const timestamp = now.toISOString();
  const txnId = `TXN-${sessionId}-${now.getTime().toString(36).toUpperCase()}`;

  // Record transaction
  txnSheet.appendRow([
    txnId,
    sessionId,
    timestamp,
    JSON.stringify(itemList),
    itemList.length,
    subtotal,
    tax,
    total,
    paymentMethod,
    customerName || '',
    customerEmail || '',
    customerPhone || '',
    false, // Is_New_Customer - could be enhanced
    false, // Is_CSA_Member - could check CSA list
    false, // Receipt_Sent
    '', // Staff_ID
    staffName || '',
    notes || ''
  ]);

  // Update inventory
  updateMarketInventory(sessionId, itemList, invSheet);

  return {
    success: true,
    transactionId: txnId,
    sessionId: sessionId,
    items: itemList,
    subtotal: subtotal,
    tax: tax,
    total: total,
    paymentMethod: paymentMethod,
    timestamp: timestamp
  };
}

/**
 * Record a quick sale (minimal data for fast checkout)
 */
function recordQuickSale(params) {
  const { sessionId, productName, qty, price, paymentMethod } = params;

  if (!sessionId || !productName || !paymentMethod) {
    return { success: false, error: 'sessionId, productName, and paymentMethod are required' };
  }

  const quantity = parseInt(qty) || 1;
  const itemPrice = parseFloat(price) || 0;

  const items = [{
    name: productName,
    qty: quantity,
    price: itemPrice
  }];

  return recordMarketSale({
    sessionId,
    items,
    paymentMethod,
    staffName: 'Quick Sale'
  });
}

/**
 * Update market inventory after sale
 */
function updateMarketInventory(sessionId, items, invSheet) {
  if (!invSheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    invSheet = ss.getSheetByName(MARKET_SHEETS.INVENTORY);
  }

  if (!invSheet) return;

  const data = invSheet.getDataRange().getValues();
  const headers = data[0];

  const currentQtyCol = headers.indexOf('Current_Qty') + 1;
  const soldQtyCol = headers.indexOf('Sold_Qty') + 1;
  const revenueCol = headers.indexOf('Revenue') + 1;
  const lastSaleCol = headers.indexOf('Last_Sale_At') + 1;
  const isLowStockCol = headers.indexOf('Is_Low_Stock') + 1;
  const lastUpdatedCol = headers.indexOf('Last_Updated') + 1;

  const now = new Date().toISOString();

  for (const item of items) {
    const itemName = item.name.toLowerCase();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === sessionId) {
        const productName = (data[i][3] || '').toLowerCase();

        if (productName.includes(itemName) || itemName.includes(productName)) {
          const rowNum = i + 1;
          const currentQty = data[i][headers.indexOf('Current_Qty')] || 0;
          const soldQty = data[i][headers.indexOf('Sold_Qty')] || 0;
          const revenue = data[i][headers.indexOf('Revenue')] || 0;
          const threshold = data[i][headers.indexOf('Restock_Alert_Threshold')] || 5;

          const newCurrentQty = Math.max(0, currentQty - item.qty);
          const newSoldQty = soldQty + item.qty;
          const newRevenue = revenue + (item.price * item.qty);
          const isLowStock = newCurrentQty <= threshold;

          invSheet.getRange(rowNum, currentQtyCol).setValue(newCurrentQty);
          invSheet.getRange(rowNum, soldQtyCol).setValue(newSoldQty);
          invSheet.getRange(rowNum, revenueCol).setValue(newRevenue);
          invSheet.getRange(rowNum, lastSaleCol).setValue(now);
          invSheet.getRange(rowNum, isLowStockCol).setValue(isLowStock);
          invSheet.getRange(rowNum, lastUpdatedCol).setValue(now);

          break;
        }
      }
    }
  }
}

/**
 * Get current market inventory status
 */
function getMarketInventoryStatus(params) {
  const sessionId = params?.sessionId;

  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  const inventory = getSessionInventory(sessionId);

  // Calculate velocities and alerts
  const enrichedInventory = inventory.map(item => {
    const startQty = item.Starting_Qty || 0;
    const currentQty = item.Current_Qty || 0;
    const soldQty = item.Sold_Qty || 0;

    return {
      ...item,
      percentSold: startQty > 0 ? Math.round(soldQty / startQty * 100) : 0,
      remainingPercent: startQty > 0 ? Math.round(currentQty / startQty * 100) : 0,
      isLowStock: item.Is_Low_Stock || currentQty <= (item.Restock_Alert_Threshold || 5),
      isSoldOut: currentQty === 0
    };
  });

  const lowStockItems = enrichedInventory.filter(i => i.isLowStock && !i.isSoldOut);
  const soldOutItems = enrichedInventory.filter(i => i.isSoldOut);

  return {
    success: true,
    sessionId: sessionId,
    totalItems: enrichedInventory.length,
    lowStockCount: lowStockItems.length,
    soldOutCount: soldOutItems.length,
    items: enrichedInventory,
    alerts: {
      lowStock: lowStockItems.map(i => i.Product_Name),
      soldOut: soldOutItems.map(i => i.Product_Name)
    }
  };
}

// ============================================================================
// SETTLEMENT & RECONCILIATION
// ============================================================================

/**
 * Initiate end-of-market settlement
 */
function initiateSettlement(params) {
  const sessionId = params?.sessionId;

  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionResult = getMarketSession({ sessionId });

  if (!sessionResult.success) {
    return sessionResult;
  }

  const session = sessionResult.session;
  const transactions = session.transactions || [];
  const inventory = session.inventory || [];

  // Calculate payment totals
  const paymentTotals = {
    cash: 0,
    card: 0,
    venmo: 0,
    snap: 0,
    check: 0,
    other: 0
  };

  let grossSales = 0;

  transactions.forEach(t => {
    const method = (t.Payment_Method || '').toLowerCase();
    const amount = t.Total || 0;
    grossSales += amount;

    if (method.includes('cash')) paymentTotals.cash += amount;
    else if (method.includes('card') || method.includes('credit') || method.includes('debit')) paymentTotals.card += amount;
    else if (method.includes('venmo')) paymentTotals.venmo += amount;
    else if (method.includes('snap') || method.includes('ebt')) paymentTotals.snap += amount;
    else if (method.includes('check')) paymentTotals.check += amount;
    else paymentTotals.other += amount;
  });

  // Get market location for fees
  const location = getMarketLocationById(session.Location_ID);
  let marketFee = 0;

  if (location) {
    if (location.feeType === 'Flat') {
      marketFee = location.feeAmount || 0;
    } else if (location.feeType === 'Percentage') {
      marketFee = grossSales * ((location.feeAmount || 0) / 100);
    }
  }

  // Card processing fee estimate (2.9% + $0.30 per transaction)
  const cardTransactions = transactions.filter(t =>
    (t.Payment_Method || '').toLowerCase().includes('card'));
  const cardProcessingFees = (paymentTotals.card * 0.029) + (cardTransactions.length * 0.30);

  // Inventory summary
  const itemsBrought = inventory.reduce((sum, i) => sum + (i.Starting_Qty || 0), 0);
  const itemsSold = inventory.reduce((sum, i) => sum + (i.Sold_Qty || 0), 0);
  const itemsReturned = itemsBrought - itemsSold;

  // Create settlement record
  const settlementSheet = ss.getSheetByName(MARKET_SHEETS.SETTLEMENT);
  const now = new Date().toISOString();
  const settlementId = `SET-${sessionId}`;

  const settlementRow = [
    settlementId,
    sessionId,
    session.Location_Name,
    session.Market_Date,
    grossSales,
    marketFee,
    cardProcessingFees,
    grossSales - marketFee - cardProcessingFees, // Net revenue
    paymentTotals.cash,
    paymentTotals.card,
    paymentTotals.venmo,
    paymentTotals.snap,
    paymentTotals.check,
    paymentTotals.other,
    '', // Starting_Cash - user enters
    '', // Ending_Cash - user enters
    '', // Cash_Variance - calculated on complete
    itemsBrought,
    itemsSold,
    itemsReturned,
    itemsBrought > 0 ? Math.round(itemsSold / itemsBrought * 100) : 0,
    transactions.length > 0 ? Math.round(grossSales / transactions.length * 100) / 100 : 0,
    transactions.length,
    '', // Customer_Count - could be calculated
    '', // Revenue_Per_Customer
    session.Predicted_Revenue > 0 ?
      Math.round((grossSales / session.Predicted_Revenue) * 100) : 0,
    '', // Reconciled_By
    '', // Reconciled_At
    'Pending', // Status
    '' // Notes
  ];

  // Check if settlement exists
  const existingData = settlementSheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][1] === sessionId) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    // Update existing
    settlementSheet.getRange(existingRow, 1, 1, settlementRow.length).setValues([settlementRow]);
  } else {
    // Create new
    settlementSheet.appendRow(settlementRow);
  }

  return {
    success: true,
    settlementId: settlementId,
    sessionId: sessionId,
    status: 'Pending',
    grossSales: grossSales,
    fees: {
      marketFee: Math.round(marketFee * 100) / 100,
      cardProcessing: Math.round(cardProcessingFees * 100) / 100
    },
    netRevenue: Math.round((grossSales - marketFee - cardProcessingFees) * 100) / 100,
    paymentBreakdown: paymentTotals,
    inventory: {
      brought: itemsBrought,
      sold: itemsSold,
      returned: itemsReturned,
      sellThrough: itemsBrought > 0 ? Math.round(itemsSold / itemsBrought * 100) + '%' : 'N/A'
    },
    transactionCount: transactions.length,
    prediction: {
      predicted: session.Predicted_Revenue,
      actual: grossSales,
      accuracy: session.Predicted_Revenue > 0 ?
        Math.round((grossSales / session.Predicted_Revenue) * 100) + '%' : 'N/A'
    },
    instructions: 'Enter starting_cash and ending_cash, then call completeSettlement()'
  };
}

/**
 * Complete settlement with cash reconciliation
 */
function completeSettlement(params) {
  const { sessionId, startingCash, endingCash, reconciledBy, notes } = params;

  if (!sessionId || startingCash === undefined || endingCash === undefined) {
    return { success: false, error: 'sessionId, startingCash, and endingCash are required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settlementSheet = ss.getSheetByName(MARKET_SHEETS.SETTLEMENT);

  if (!settlementSheet) {
    return { success: false, error: 'Settlement sheet not found' };
  }

  const data = settlementSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId) {
      const rowNum = i + 1;
      const cashCollected = data[i][headers.indexOf('Cash_Collected')] || 0;

      const startCash = parseFloat(startingCash);
      const endCash = parseFloat(endingCash);
      const expectedEndingCash = startCash + cashCollected;
      const variance = endCash - expectedEndingCash;

      const now = new Date().toISOString();

      // Update settlement row
      settlementSheet.getRange(rowNum, headers.indexOf('Starting_Cash') + 1).setValue(startCash);
      settlementSheet.getRange(rowNum, headers.indexOf('Ending_Cash') + 1).setValue(endCash);
      settlementSheet.getRange(rowNum, headers.indexOf('Cash_Variance') + 1).setValue(variance);
      settlementSheet.getRange(rowNum, headers.indexOf('Reconciled_By') + 1).setValue(reconciledBy || '');
      settlementSheet.getRange(rowNum, headers.indexOf('Reconciled_At') + 1).setValue(now);
      settlementSheet.getRange(rowNum, headers.indexOf('Status') + 1).setValue('Complete');

      if (notes) {
        settlementSheet.getRange(rowNum, headers.indexOf('Notes') + 1).setValue(notes);
      }

      // Update session status
      updateMarketSessionStatus({ sessionId, status: 'Complete' });

      // Record to demand history for learning
      learnFromMarket(sessionId);

      return {
        success: true,
        sessionId: sessionId,
        status: 'Complete',
        cashReconciliation: {
          starting: startCash,
          collected: cashCollected,
          expected: expectedEndingCash,
          actual: endCash,
          variance: variance,
          varianceStatus: variance === 0 ? 'Perfect' :
            (Math.abs(variance) <= 5 ? 'Within tolerance' : 'Needs review')
        },
        completedAt: now,
        reconciledBy: reconciledBy
      };
    }
  }

  return { success: false, error: `Settlement not found for session: ${sessionId}` };
}

// ============================================================================
// LEARNING ENGINE
// ============================================================================

/**
 * Record market data to demand history for future predictions
 */
function learnFromMarket(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionResult = getMarketSession({ sessionId });

  if (!sessionResult.success) return;

  const session = sessionResult.session;
  const inventory = session.inventory || [];
  const historySheet = ss.getSheetByName(MARKET_SHEETS.DEMAND_HISTORY);

  if (!historySheet) return;

  const marketDate = new Date(session.Market_Date);
  const weather = session.Weather_Forecast;
  let weatherData = {};

  try {
    weatherData = typeof weather === 'string' ? JSON.parse(weather) : weather;
  } catch (e) {}

  const now = new Date().toISOString();

  for (const item of inventory) {
    const historyId = `DH-${sessionId}-${item.Product_Name.replace(/\s+/g, '-')}`;

    const historyRow = [
      historyId,
      session.Location_ID,
      session.Location_Name,
      item.Product_Name,
      item.Variety || '',
      item.Category || '',
      session.Market_Date,
      session.Day_Of_Week,
      getWeekOfYear(marketDate),
      marketDate.getMonth() + 1,
      marketDate.getFullYear(),
      weatherData.high || '',
      weatherData.low || '',
      weatherData.precipProbability || '',
      weatherData.conditions || '',
      item.Starting_Qty || 0,
      item.Sold_Qty || 0,
      (item.Starting_Qty || 0) - (item.Sold_Qty || 0),
      item.Price || 0,
      item.Revenue || 0,
      item.Starting_Qty > 0 ?
        Math.round((item.Sold_Qty / item.Starting_Qty) * 100) : 0,
      '', // Time_To_Sellout_Min
      isHolidayWeekend(marketDate),
      ''
    ];

    historySheet.appendRow(historyRow);
  }

  // Update location averages
  updateLocationAverages(session.Location_ID);

  Logger.log(`Learning complete: ${inventory.length} items recorded for ${sessionId}`);
}

/**
 * Get week of year
 */
function getWeekOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

/**
 * Update location averages based on historical data
 */
function updateLocationAverages(locationId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionsSheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);
  const locationsSheet = ss.getSheetByName(MARKET_SHEETS.LOCATIONS);

  if (!sessionsSheet || !locationsSheet) return;

  // Get all completed sessions for this location
  const sessionData = sessionsSheet.getDataRange().getValues();
  const sessionHeaders = sessionData[0];

  let totalRevenue = 0;
  let totalCustomers = 0;
  let sessionCount = 0;

  for (let i = 1; i < sessionData.length; i++) {
    if (sessionData[i][1] === locationId && sessionData[i][5] === 'Complete') {
      totalRevenue += sessionData[i][sessionHeaders.indexOf('Actual_Revenue')] || 0;
      totalCustomers += sessionData[i][sessionHeaders.indexOf('Actual_Customers')] || 0;
      sessionCount++;
    }
  }

  if (sessionCount === 0) return;

  const avgRevenue = Math.round(totalRevenue / sessionCount);
  const avgCustomers = Math.round(totalCustomers / sessionCount);

  // Update location
  const locationData = locationsSheet.getDataRange().getValues();
  const locationHeaders = locationData[0];

  for (let i = 1; i < locationData.length; i++) {
    if (locationData[i][0] === locationId) {
      const rowNum = i + 1;
      locationsSheet.getRange(rowNum, locationHeaders.indexOf('Avg_Revenue') + 1).setValue(avgRevenue);
      locationsSheet.getRange(rowNum, locationHeaders.indexOf('Avg_Customers') + 1).setValue(avgCustomers);
      locationsSheet.getRange(rowNum, locationHeaders.indexOf('Updated_At') + 1).setValue(new Date().toISOString());
      break;
    }
  }
}

/**
 * Get market performance analytics
 */
function getMarketPerformanceAnalytics(params) {
  const locationId = params?.locationId;
  const dateRange = params?.dateRange || 90; // days

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const historySheet = ss.getSheetByName(MARKET_SHEETS.DEMAND_HISTORY);
  const sessionsSheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);

  if (!historySheet || !sessionsSheet) {
    return { success: false, error: 'Required sheets not found' };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dateRange);

  // Get session analytics
  const sessionData = sessionsSheet.getDataRange().getValues();
  const sessionHeaders = sessionData[0];

  const sessions = [];
  for (let i = 1; i < sessionData.length; i++) {
    const sessionDate = new Date(sessionData[i][3]);
    if (sessionDate >= cutoffDate) {
      if (!locationId || sessionData[i][1] === locationId) {
        if (sessionData[i][5] === 'Complete') {
          sessions.push({
            date: sessionData[i][3],
            location: sessionData[i][2],
            predicted: sessionData[i][8] || 0,
            actual: sessionData[i][10] || 0,
            sellThrough: sessionData[i][15] || 0
          });
        }
      }
    }
  }

  // Calculate analytics
  const totalRevenue = sessions.reduce((sum, s) => sum + s.actual, 0);
  const avgRevenue = sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0;

  const predictionErrors = sessions.map(s =>
    s.predicted > 0 ? Math.abs(s.actual - s.predicted) / s.predicted : 0);
  const avgPredictionError = predictionErrors.length > 0 ?
    Math.round(predictionErrors.reduce((a, b) => a + b, 0) / predictionErrors.length * 100) : 0;

  const avgSellThrough = sessions.length > 0 ?
    Math.round(sessions.reduce((sum, s) => sum + s.sellThrough, 0) / sessions.length) : 0;

  // Get product analytics
  const historyData = historySheet.getDataRange().getValues();
  const historyHeaders = historyData[0];

  const productSales = {};
  for (let i = 1; i < historyData.length; i++) {
    const historyDate = new Date(historyData[i][6]);
    if (historyDate >= cutoffDate) {
      if (!locationId || historyData[i][1] === locationId) {
        const product = historyData[i][3];
        if (!productSales[product]) {
          productSales[product] = { sold: 0, revenue: 0, sessions: 0 };
        }
        productSales[product].sold += historyData[i][16] || 0;
        productSales[product].revenue += historyData[i][19] || 0;
        productSales[product].sessions++;
      }
    }
  }

  const topProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    success: true,
    dateRange: dateRange,
    locationId: locationId || 'All',
    summary: {
      sessionCount: sessions.length,
      totalRevenue: totalRevenue,
      avgRevenuePerMarket: avgRevenue,
      avgSellThroughRate: avgSellThrough + '%',
      predictionAccuracy: (100 - avgPredictionError) + '%'
    },
    topProducts: topProducts,
    recentSessions: sessions.slice(0, 10)
  };
}

// ============================================================================
// MARKET MORNING BRIEF
// ============================================================================

/**
 * Get market-specific morning brief for upcoming markets
 */
function getMarketMorningBrief() {
  const upcoming = getUpcomingMarkets({ days: 7 });

  if (upcoming.markets.length === 0) {
    return {
      success: true,
      message: 'No markets scheduled in the next 7 days',
      markets: []
    };
  }

  const briefs = upcoming.markets.map(market => {
    const brief = {
      date: market.date,
      location: market.location.name,
      dayOfWeek: market.dayOfWeek,
      daysAway: market.daysAway,
      status: market.status,
      weather: market.weather,
      weatherImpact: market.weatherImpact,
      alerts: []
    };

    // Add weather alerts
    if (market.weather && market.weather.available) {
      if (market.weather.precipProbability > 50) {
        brief.alerts.push({
          type: 'weather',
          severity: 'warning',
          message: `${market.weather.precipProbability}% chance of rain - expect lower traffic`
        });
      }
      if (market.weather.high < 50) {
        brief.alerts.push({
          type: 'weather',
          severity: 'warning',
          message: `Cold day (${market.weather.high}°F) - dress warmly`
        });
      }
      if (market.weather.high > 85) {
        brief.alerts.push({
          type: 'weather',
          severity: 'warning',
          message: `Hot day (${market.weather.high}°F) - bring shade, ice, extra water`
        });
      }
    }

    // Add session alerts
    if (market.daysAway <= 2 && market.status === 'Not Created') {
      brief.alerts.push({
        type: 'action',
        severity: 'urgent',
        message: 'Session not created - harvest plan not generated!'
      });
    }

    if (market.status === 'Planning' && market.daysAway <= 1) {
      brief.alerts.push({
        type: 'action',
        severity: 'warning',
        message: 'Still in planning - generate harvest plan today'
      });
    }

    return brief;
  });

  // Next market summary
  const nextMarket = briefs[0];

  return {
    success: true,
    nextMarket: {
      location: nextMarket.location,
      date: nextMarket.date,
      daysAway: nextMarket.daysAway,
      weather: nextMarket.weather,
      recommendation: getMarketRecommendation(nextMarket)
    },
    upcomingCount: briefs.length,
    markets: briefs,
    urgentActions: briefs.flatMap(b =>
      b.alerts.filter(a => a.severity === 'urgent')
        .map(a => `${b.location} (${b.date}): ${a.message}`)
    )
  };
}

/**
 * Generate recommendation for a market
 */
function getMarketRecommendation(market) {
  const recommendations = [];

  if (market.weatherImpact === 'Poor') {
    recommendations.push('Reduce quantities by 25% due to poor weather');
  } else if (market.weatherImpact === 'Excellent') {
    recommendations.push('Increase quantities - great market conditions!');
  }

  if (market.status === 'Not Created') {
    recommendations.push('Create session and generate harvest plan');
  }

  if (market.daysAway === 0) {
    recommendations.push('Market day! Start early harvest for quality');
  } else if (market.daysAway === 1) {
    recommendations.push('Harvest today for tomorrow\'s market');
  }

  return recommendations.length > 0 ? recommendations : ['Standard prep - no special actions needed'];
}

// ============================================================================
// SHOPIFY POS INTEGRATION
// ============================================================================

/**
 * Sync Shopify POS sales for a market session
 * Pulls orders from Shopify that were made during the market time window
 */
function syncShopifyMarketSales(params) {
  const { sessionId, forceResync } = params;

  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  const sessionResult = getMarketSession({ sessionId });
  if (!sessionResult.success) {
    return sessionResult;
  }

  const session = sessionResult.session;
  const location = getMarketLocationById(session.Location_ID);

  if (!location) {
    return { success: false, error: 'Market location not found' };
  }

  // Build time window for the market
  const marketDate = new Date(session.Market_Date);
  const [startHour, startMin] = (location.startTime || '08:00').split(':').map(Number);
  const [endHour, endMin] = (location.endTime || '14:00').split(':').map(Number);

  const startTime = new Date(marketDate);
  startTime.setHours(startHour, startMin, 0, 0);

  const endTime = new Date(marketDate);
  endTime.setHours(endHour + 2, endMin, 0, 0); // Add 2 hours buffer for cleanup sales

  // Get Shopify location name for this market
  const shopifyLocationName = getShopifyLocationName(session.Location_ID);

  // Get Shopify orders from SHOPIFY_Orders sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shopifySheet = ss.getSheetByName('SHOPIFY_Orders');

  if (!shopifySheet) {
    return { success: false, error: 'SHOPIFY_Orders sheet not found. Run syncShopifyOrders() first.' };
  }

  const shopifyData = shopifySheet.getDataRange().getValues();
  const headers = shopifyData[0];

  const createdAtCol = headers.indexOf('created_at');
  const orderIdCol = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
  const customerCol = headers.indexOf('customer_name') !== -1 ? headers.indexOf('customer_name') : 3;
  const emailCol = headers.indexOf('customer_email') !== -1 ? headers.indexOf('customer_email') : 4;
  const totalCol = headers.indexOf('total_price') !== -1 ? headers.indexOf('total_price') : 5;
  const itemsCol = headers.indexOf('line_items') !== -1 ? headers.indexOf('line_items') : 12;
  const financialCol = headers.indexOf('financial_status') !== -1 ? headers.indexOf('financial_status') : 9;
  const locationCol = headers.indexOf('location_name') !== -1 ? headers.indexOf('location_name') : headers.indexOf('location');
  const sourceCol = headers.indexOf('source_name') !== -1 ? headers.indexOf('source_name') : -1;

  // Find orders within the market time window AND matching location
  const marketOrders = [];

  for (let i = 1; i < shopifyData.length; i++) {
    const row = shopifyData[i];
    const orderDate = new Date(row[createdAtCol] || row[2]);

    if (orderDate >= startTime && orderDate <= endTime) {
      const total = parseFloat(row[totalCol]) || 0;
      const financialStatus = row[financialCol];
      const orderLocation = locationCol >= 0 ? row[locationCol] : '';
      const orderSource = sourceCol >= 0 ? row[sourceCol] : '';

      // Filter by location if we have Shopify location configured
      // Also check if it's a POS order (source = 'pos')
      const locationMatches = !shopifyLocationName ||
                              orderLocation === shopifyLocationName ||
                              orderLocation.toLowerCase().includes(shopifyLocationName.toLowerCase());

      const isPosOrder = orderSource === 'pos' || orderSource === 'POS' || !orderSource;

      // Only include paid orders from matching location
      if ((financialStatus === 'paid' || financialStatus === 'partially_paid') &&
          locationMatches && isPosOrder) {
        let lineItems = [];
        try {
          lineItems = JSON.parse(row[itemsCol] || '[]');
        } catch (e) {}

        marketOrders.push({
          orderId: row[orderIdCol],
          timestamp: orderDate.toISOString(),
          customer: row[customerCol] || '',
          email: row[emailCol] || '',
          total: total,
          items: lineItems,
          paymentMethod: 'Shopify POS',
          location: orderLocation
        });
      }
    }
  }

  if (marketOrders.length === 0) {
    return {
      success: true,
      message: 'No Shopify orders found for this market session time window',
      sessionId: sessionId,
      timeWindow: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      ordersFound: 0
    };
  }

  // Convert Shopify orders to market transactions
  const txnSheet = ss.getSheetByName(MARKET_SHEETS.TRANSACTIONS);
  if (!txnSheet) {
    return { success: false, error: 'Market Transactions sheet not found' };
  }

  let synced = 0;
  let skipped = 0;

  for (const order of marketOrders) {
    // Check if already synced (by Shopify order ID in notes)
    const existingData = txnSheet.getDataRange().getValues();
    const alreadySynced = existingData.some(row =>
      row[1] === sessionId && (row[17] || '').includes(order.orderId));

    if (alreadySynced && !forceResync) {
      skipped++;
      continue;
    }

    // Convert line items to our format
    const items = order.items.map(item => ({
      name: item.name || item.title,
      qty: item.quantity || 1,
      price: parseFloat(item.price) || 0
    }));

    const txnId = `TXN-${sessionId}-SHOP-${order.orderId}`;

    txnSheet.appendRow([
      txnId,
      sessionId,
      order.timestamp,
      JSON.stringify(items),
      items.length,
      order.total,
      0, // tax (already included in Shopify total)
      order.total,
      'Shopify POS',
      order.customer,
      order.email,
      '',
      false,
      false,
      false,
      '',
      'Shopify Sync',
      `Shopify Order: ${order.orderId}`
    ]);

    synced++;
  }

  // Update session with totals
  updateSessionFromShopify(sessionId);

  return {
    success: true,
    sessionId: sessionId,
    timeWindow: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    },
    ordersFound: marketOrders.length,
    synced: synced,
    skipped: skipped,
    totalRevenue: marketOrders.reduce((sum, o) => sum + o.total, 0)
  };
}

/**
 * Update market session stats from synced transactions
 */
function updateSessionFromShopify(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionsSheet = ss.getSheetByName(MARKET_SHEETS.SESSIONS);
  const txnSheet = ss.getSheetByName(MARKET_SHEETS.TRANSACTIONS);

  if (!sessionsSheet || !txnSheet) return;

  // Calculate totals from transactions
  const txnData = txnSheet.getDataRange().getValues();
  let totalRevenue = 0;
  let transactionCount = 0;

  for (let i = 1; i < txnData.length; i++) {
    if (txnData[i][1] === sessionId) {
      totalRevenue += parseFloat(txnData[i][7]) || 0;
      transactionCount++;
    }
  }

  // Update session
  const sessionData = sessionsSheet.getDataRange().getValues();
  const headers = sessionData[0];

  for (let i = 1; i < sessionData.length; i++) {
    if (sessionData[i][0] === sessionId) {
      const rowNum = i + 1;
      sessionsSheet.getRange(rowNum, headers.indexOf('Actual_Revenue') + 1).setValue(totalRevenue);
      sessionsSheet.getRange(rowNum, headers.indexOf('Actual_Customers') + 1).setValue(transactionCount);
      sessionsSheet.getRange(rowNum, headers.indexOf('Updated_At') + 1).setValue(new Date().toISOString());
      break;
    }
  }
}

/**
 * Get Shopify-ready market report
 * Combines harvest plan with Shopify sales data
 */
function getShopifyMarketReport(params) {
  const sessionId = params?.sessionId;

  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  // First sync latest Shopify data
  const syncResult = syncShopifyMarketSales({ sessionId });

  // Get full session data
  const sessionResult = getMarketSession({ sessionId });
  if (!sessionResult.success) return sessionResult;

  const session = sessionResult.session;

  // Compare harvest plan vs actual sales
  const harvestPlan = session.harvestPlan || [];
  const transactions = session.transactions || [];

  // Aggregate sales by product
  const salesByProduct = {};
  transactions.forEach(txn => {
    let items = txn.Items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }

    (items || []).forEach(item => {
      const name = item.name?.toLowerCase() || '';
      if (!salesByProduct[name]) {
        salesByProduct[name] = { qty: 0, revenue: 0 };
      }
      salesByProduct[name].qty += item.qty || 1;
      salesByProduct[name].revenue += (item.qty || 1) * (item.price || 0);
    });
  });

  // Match harvest plan items to sales
  const comparison = harvestPlan.map(plan => {
    const planName = plan.Product_Name?.toLowerCase() || '';
    const sales = salesByProduct[planName] || { qty: 0, revenue: 0 };

    return {
      product: plan.Product_Name,
      predicted: plan.Predicted_Demand,
      harvested: plan.Actual_Harvested || plan.Recommended_Harvest,
      sold: sales.qty,
      revenue: sales.revenue,
      accuracy: plan.Predicted_Demand > 0 ?
        Math.round((sales.qty / plan.Predicted_Demand) * 100) : 0
    };
  });

  return {
    success: true,
    sessionId: sessionId,
    location: session.Location_Name,
    date: session.Market_Date,
    shopifySync: syncResult,
    totals: {
      predicted: session.Predicted_Revenue,
      actual: session.Actual_Revenue || 0,
      transactions: transactions.length
    },
    productComparison: comparison
  };
}

// ============================================================================
// PICK/PACK INTEGRATION
// ============================================================================

/**
 * Sync market harvest plan to Pick/Pack system
 */
function syncMarketToPickPack(params) {
  const sessionId = params?.sessionId;

  if (!sessionId) {
    return { success: false, error: 'sessionId is required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionResult = getMarketSession({ sessionId });

  if (!sessionResult.success) {
    return sessionResult;
  }

  const session = sessionResult.session;
  const harvestPlan = session.harvestPlan || [];

  if (harvestPlan.length === 0) {
    return { success: false, error: 'No harvest plan exists. Generate one first.' };
  }

  const pickPackSheet = ss.getSheetByName('SALES_PickPack');
  if (!pickPackSheet) {
    return { success: false, error: 'SALES_PickPack sheet not found' };
  }

  const now = new Date().toISOString();
  const orderId = `MARKET-${sessionId}`;

  // Create pick/pack records for each harvest item
  const records = [];

  for (const item of harvestPlan) {
    const record = {
      orderId: orderId,
      product: item.Product_Name,
      variety: item.Variety || '',
      quantity: item.Recommended_Harvest,
      unit: item.Unit,
      priority: item.Priority_Score >= 80 ? 'High' : item.Priority_Score >= 50 ? 'Medium' : 'Low',
      status: 'Pending',
      field: item.Field_Location,
      notes: `Market: ${session.Location_Name} on ${session.Market_Date}. ${item.Notes || ''}`,
      createdAt: now
    };

    // Append to pick/pack sheet
    pickPackSheet.appendRow([
      orderId,
      record.product,
      record.variety,
      record.quantity,
      record.unit,
      record.priority,
      record.status,
      record.field,
      record.notes,
      now
    ]);

    records.push(record);
  }

  return {
    success: true,
    sessionId: sessionId,
    orderId: orderId,
    recordCount: records.length,
    records: records,
    message: `Synced ${records.length} items to Pick/Pack system`
  };
}

// ============================================================================
// MODULE EXPORTS (for reference in MERGED TOTAL.js)
// ============================================================================

/*
 * Add these endpoints to doGet in MERGED TOTAL.js:
 *
 * case 'initMarketModule':
 *   return jsonResponse(initMarketModule());
 * case 'createMarketSession':
 *   return jsonResponse(createMarketSession(e.parameter));
 * case 'getMarketSession':
 *   return jsonResponse(getMarketSession(e.parameter));
 * case 'getUpcomingMarkets':
 *   return jsonResponse(getUpcomingMarkets(e.parameter));
 * case 'updateMarketSessionStatus':
 *   return jsonResponse(updateMarketSessionStatus(e.parameter));
 * case 'getMarketDashboard':
 *   return jsonResponse(getMarketDashboard(e.parameter));
 * case 'calculateDemandPrediction':
 *   return jsonResponse(calculateDemandPrediction(e.parameter));
 * case 'getActiveMarketLocations':
 *   return jsonResponse({ success: true, locations: getActiveMarketLocations() });
 * case 'generateMarketHarvestPlan':
 *   return jsonResponse(generateMarketHarvestPlan(e.parameter));
 * case 'recordMarketSale':
 *   return jsonResponse(recordMarketSale(e.parameter));
 * case 'recordQuickSale':
 *   return jsonResponse(recordQuickSale(e.parameter));
 * case 'getMarketInventoryStatus':
 *   return jsonResponse(getMarketInventoryStatus(e.parameter));
 * case 'initiateSettlement':
 *   return jsonResponse(initiateSettlement(e.parameter));
 * case 'completeSettlement':
 *   return jsonResponse(completeSettlement(e.parameter));
 * case 'getMarketPerformanceAnalytics':
 *   return jsonResponse(getMarketPerformanceAnalytics(e.parameter));
 * case 'getMarketMorningBrief':
 *   return jsonResponse(getMarketMorningBrief());
 * case 'syncMarketToPickPack':
 *   return jsonResponse(syncMarketToPickPack(e.parameter));
 */
