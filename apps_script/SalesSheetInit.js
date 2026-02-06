/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SALES SHEET INITIALIZATION MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Creates all required sheets for the Sales module with proper headers.
 * Run this once to set up the data structure for sales.html dashboard.
 *
 * Usage: Run initializeSalesSheets() from the Apps Script editor.
 *
 * Note: This is a dedicated initialization file that can be run independently.
 * The main MERGED TOTAL.js also has initializeSalesAndFleetModule() which
 * does similar work but this provides a focused, testable module.
 *
 * @author Backend_Claude
 * @created 2026-02-04
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SALES_INIT_SPREADSHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';

// Sheet names - must match SALES_SHEETS in MERGED TOTAL.js
const SALES_INIT_SHEETS = {
  CUSTOMERS: 'SALES_Customers',
  ORDERS: 'SALES_Orders',
  ORDER_ITEMS: 'SALES_OrderItems',
  CSA_MEMBERS: 'CSA_Members',
  CSA_BOX_CONTENTS: 'CSA_BoxContents',
  CSA_PICKUP_LOCATIONS: 'CSA_Pickup_Locations',
  CSA_PRODUCTS: 'CSA_Products',
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

// ═══════════════════════════════════════════════════════════════════════════
// SHEET HEADER DEFINITIONS
// These MUST match what the backend functions expect in MERGED TOTAL.js
// ═══════════════════════════════════════════════════════════════════════════

const SALES_SHEET_DEFINITIONS = {
  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMERS - Customer master data
  // Used by: getSalesCustomers, getCustomerById, createSalesCustomer
  // ─────────────────────────────────────────────────────────────────────────
  CUSTOMERS: {
    name: SALES_INIT_SHEETS.CUSTOMERS,
    color: '#3b82f6', // Blue
    headers: [
      'Customer_ID',          // CUS-{timestamp} - Primary key
      'Customer_Type',        // CSA, Wholesale, Retail, Market
      'Company_Name',         // Business name (for wholesale)
      'Contact_Name',         // Primary contact name
      'Email',                // Email address (unique)
      'Phone',                // Phone number
      'Address',              // Street address
      'City',                 // City
      'State',                // State
      'Zip',                  // Zip code
      'Delivery_Instructions',// Special delivery notes
      'Payment_Terms',        // Net 30, COD, Prepaid, etc.
      'Price_Tier',           // Standard, Wholesale, Premium
      'Is_Active',            // TRUE/FALSE
      'Created_At',           // ISO timestamp
      'Last_Order_Date',      // ISO timestamp
      'Total_Orders',         // Count of orders
      'Total_Spent',          // Sum of order totals
      'Notes'                 // General notes
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ORDERS - Sales orders header data
  // Used by: getSalesOrders, getOrderById, createSalesOrder
  // ─────────────────────────────────────────────────────────────────────────
  ORDERS: {
    name: SALES_INIT_SHEETS.ORDERS,
    color: '#22c55e', // Green
    headers: [
      'Order_ID',             // ORD-{timestamp} - Primary key
      'Order_Date',           // ISO timestamp when order was placed
      'Customer_ID',          // Foreign key to SALES_Customers
      'Customer_Name',        // Denormalized for quick display
      'Customer_Type',        // CSA, Wholesale, Retail, Market
      'Delivery_Date',        // Requested delivery date
      'Delivery_Window',      // Morning, Afternoon, Evening, etc.
      'Delivery_Address',     // Full delivery address
      'Status',               // Pending, Confirmed, Harvesting, Packing, Out for Delivery, Delivered, Cancelled
      'Subtotal',             // Sum of line items before tax/fees
      'Tax',                  // Calculated tax amount
      'Delivery_Fee',         // Delivery fee
      'Total',                // Final total
      'Payment_Status',       // Unpaid, Paid, Partial, Refunded
      'Payment_Method',       // Card, Cash, Check, Invoice
      'Notes',                // Order notes
      'Source',               // Web, Phone, Market, Shopify
      'Created_By',           // User who created the order
      'Created_At',           // ISO timestamp
      'Updated_At'            // ISO timestamp of last update
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ORDER_ITEMS - Line items for orders
  // Used by: getOrderItems, createSalesOrder
  // ─────────────────────────────────────────────────────────────────────────
  ORDER_ITEMS: {
    name: SALES_INIT_SHEETS.ORDER_ITEMS,
    color: '#22c55e', // Green (same as orders)
    headers: [
      'Item_ID',              // ITM-{timestamp}-{random} - Primary key
      'Order_ID',             // Foreign key to SALES_Orders
      'Crop_ID',              // Foreign key to Crops (optional)
      'Product_Name',         // Product name
      'Variety',              // Product variety
      'Quantity',             // Quantity ordered
      'Unit',                 // lb, bunch, each, case, etc.
      'Unit_Price',           // Price per unit
      'Line_Total',           // Quantity * Unit_Price
      'Notes'                 // Item-specific notes
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CSA_MEMBERS - CSA membership records
  // Used by: getCSAMembers, getCSAMemberProfile, createCSAMember
  // ─────────────────────────────────────────────────────────────────────────
  CSA_MEMBERS: {
    name: SALES_INIT_SHEETS.CSA_MEMBERS,
    color: '#8b5cf6', // Purple
    headers: [
      'Member_ID',            // MEM-{timestamp} - Primary key
      'Customer_ID',          // Foreign key to SALES_Customers
      'Share_Type',           // Vegetable, Flower, Combo
      'Share_Size',           // Small, Medium, Large, Family
      'Season',               // Spring 2026, Summer 2026, etc.
      'Start_Date',           // First pickup date
      'End_Date',             // Last pickup date
      'Total_Weeks',          // Total weeks in subscription
      'Weeks_Remaining',      // Weeks left
      'Pickup_Day',           // Monday, Thursday, Saturday
      'Pickup_Location',      // Location name or "Delivery"
      'Delivery_Address',     // If home delivery
      'Customization_Allowed',// TRUE/FALSE
      'Swap_Credits',         // Available swap credits
      'Vacation_Weeks_Used',  // Vacation holds used
      'Vacation_Weeks_Max',   // Max vacation holds allowed
      'Status',               // Active, Paused, Completed, Cancelled
      'Payment_Status',       // Paid, Partial, Unpaid
      'Amount_Paid',          // Total paid so far
      'Frequency',            // Weekly, Bi-Weekly
      'Veg_Code',             // Vegetable preference code
      'Floral_Code',          // Floral preference code
      'Preferences',          // JSON or comma-separated preferences
      'Is_Onboarded',         // TRUE/FALSE
      'Last_Pickup_Date',     // Date of last pickup
      'Next_Pickup_Date',     // Date of next pickup
      'Shopify_Order_ID',     // Linked Shopify order
      'Created_Date',         // ISO timestamp
      'Last_Modified',        // ISO timestamp
      'Notes'                 // Member notes
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CSA_BOX_CONTENTS - Weekly box content plans
  // Used by: getWeeklyBoxContents, updateBoxContents
  // ─────────────────────────────────────────────────────────────────────────
  CSA_BOX_CONTENTS: {
    name: SALES_INIT_SHEETS.CSA_BOX_CONTENTS,
    color: '#8b5cf6', // Purple
    headers: [
      'Box_ID',               // BOX-{timestamp} - Primary key
      'Week_Date',            // Monday of the week
      'Share_Type',           // Vegetable, Flower, Combo
      'Crop_ID',              // Foreign key to Crops
      'Product_Name',         // Product name
      'Variety',              // Variety name
      'Quantity',             // Quantity per box
      'Unit',                 // Unit of measure
      'Is_Swappable',         // TRUE/FALSE - can member swap this
      'Swap_Options',         // Comma-separated crop IDs for swaps
      'Notes'                 // Notes about the item
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CSA_PICKUP_LOCATIONS - Pickup/delivery locations
  // Used by: getCSAPickupLocations
  // ─────────────────────────────────────────────────────────────────────────
  CSA_PICKUP_LOCATIONS: {
    name: SALES_INIT_SHEETS.CSA_PICKUP_LOCATIONS,
    color: '#8b5cf6', // Purple
    headers: [
      'Location_ID',          // LOC-{number} - Primary key
      'Location_Name',        // Display name
      'Address',              // Street address
      'City',                 // City
      'Day',                  // Monday, Thursday, Saturday
      'Time_Start',           // Pickup window start (HH:MM)
      'Time_End',             // Pickup window end (HH:MM)
      'Is_Delivery_Zone',     // TRUE if home delivery zone
      'Max_Capacity',         // Max members for this location
      'Current_Members',      // Current member count
      'Host_Name',            // Contact name
      'Host_Phone',           // Contact phone
      'Notes',                // Location notes
      'Is_Active'             // TRUE/FALSE
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CSA_PRODUCTS - CSA subscription products (Shopify linked)
  // Used by: getCSAProducts, syncCSAProducts
  // ─────────────────────────────────────────────────────────────────────────
  CSA_PRODUCTS: {
    name: SALES_INIT_SHEETS.CSA_PRODUCTS,
    color: '#8b5cf6', // Purple
    headers: [
      'Product_ID',           // CSAP-{number} - Primary key
      'Product_Name',         // Display name
      'Shopify_Product_ID',   // Linked Shopify product
      'Category',             // Vegetable, Flower, Combo
      'Size',                 // Small, Medium, Large, Family
      'Season',               // Spring 2026, etc.
      'Frequency',            // Weekly, Bi-Weekly
      'Price',                // Subscription price
      'Veg_Code',             // Vegetable share code
      'Floral_Code',          // Floral share code
      'Start_Date',           // Season start
      'End_Date',             // Season end
      'Total_Weeks',          // Weeks in season
      'Max_Members',          // Capacity limit
      'Current_Members',      // Current enrollment
      'Is_Active',            // TRUE/FALSE
      'Description'           // Product description
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DELIVERIES - Delivery route headers
  // Used by: getDeliveries, createDeliveryRoute
  // ─────────────────────────────────────────────────────────────────────────
  DELIVERIES: {
    name: SALES_INIT_SHEETS.DELIVERIES,
    color: '#f59e0b', // Amber
    headers: [
      'Route_ID',             // RTE-{timestamp} - Primary key
      'Route_Name',           // Display name for route
      'Delivery_Date',        // Date of delivery
      'Driver_ID',            // Foreign key to SALES_Drivers
      'Driver_Name',          // Denormalized driver name
      'Status',               // Planning, Ready, In Progress, Complete
      'Total_Stops',          // Number of stops on route
      'Completed_Stops',      // Stops completed
      'Est_Miles',            // Estimated miles
      'Est_Duration',         // Estimated duration (minutes)
      'Actual_Start',         // Actual start time
      'Actual_End',           // Actual end time
      'Notes'                 // Route notes
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DELIVERY_STOPS - Individual stops on delivery routes
  // Used by: getDeliveryStops, updateDeliveryStop
  // ─────────────────────────────────────────────────────────────────────────
  DELIVERY_STOPS: {
    name: SALES_INIT_SHEETS.DELIVERY_STOPS,
    color: '#f59e0b', // Amber
    headers: [
      'Stop_ID',              // STP-{timestamp} - Primary key
      'Route_ID',             // Foreign key to SALES_Deliveries
      'Stop_Order',           // Sequence number in route
      'Order_ID',             // Foreign key to SALES_Orders
      'Customer_Name',        // Customer name
      'Address',              // Delivery address
      'Phone',                // Contact phone
      'Delivery_Window',      // Requested window
      'ETA',                  // Estimated arrival time
      'Status',               // Pending, Arrived, Delivered, Failed
      'Arrived_At',           // Actual arrival time
      'Completed_At',         // Completion time
      'Photo_URL',            // Proof of delivery photo
      'Signature_URL',        // Customer signature
      'GPS_Lat',              // GPS latitude
      'GPS_Lng',              // GPS longitude
      'Issue_Type',           // None, Not Home, Refused, Damaged
      'Issue_Notes'           // Details about issues
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVERS - Driver information
  // Used by: getDrivers, getDriverById
  // ─────────────────────────────────────────────────────────────────────────
  DRIVERS: {
    name: SALES_INIT_SHEETS.DRIVERS,
    color: '#ef4444', // Red
    headers: [
      'Driver_ID',            // DRV-{number} - Primary key
      'Name',                 // Driver name
      'PIN',                  // Login PIN for driver app
      'Phone',                // Phone number
      'Email',                // Email address
      'Vehicle',              // Vehicle description
      'License_Plate',        // License plate number
      'Is_Active',            // TRUE/FALSE
      'Today_Deliveries',     // Count for today
      'Week_Deliveries',      // Count for this week
      'Total_Deliveries',     // All-time count
      'Last_Login'            // Last app login time
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PICK_PACK - Harvest/packing list items
  // Used by: getPickPackList, updatePickPackStatus
  // ─────────────────────────────────────────────────────────────────────────
  PICK_PACK: {
    name: SALES_INIT_SHEETS.PICK_PACK,
    color: '#06b6d4', // Cyan
    headers: [
      'Pick_ID',              // PCK-{timestamp} - Primary key
      'Delivery_Date',        // Harvest/delivery date
      'Order_ID',             // Foreign key to SALES_Orders
      'Customer_Name',        // Customer name
      'Customer_Type',        // CSA, Wholesale, Retail
      'Crop_ID',              // Foreign key to Crops
      'Product_Name',         // Product name
      'Quantity',             // Quantity to pick
      'Unit',                 // Unit of measure
      'Location',             // Field location
      'Status',               // Pending, Picking, Picked, Packed
      'Picked_By',            // Who picked it
      'Picked_At',            // When picked
      'Notes'                 // Picking notes
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SMS_CAMPAIGNS - SMS marketing campaigns
  // Used by: getSMSCampaigns, createSMSCampaign
  // ─────────────────────────────────────────────────────────────────────────
  SMS_CAMPAIGNS: {
    name: SALES_INIT_SHEETS.SMS_CAMPAIGNS,
    color: '#ec4899', // Pink
    headers: [
      'Campaign_ID',          // SMS-{timestamp} - Primary key
      'Name',                 // Campaign name
      'Message',              // SMS message text
      'Audience',             // All, CSA, Wholesale, Retail
      'Audience_Filter',      // Additional filter criteria
      'Total_Recipients',     // Total recipients
      'Sent_Count',           // Messages sent
      'Status',               // Draft, Scheduled, Sending, Sent
      'Scheduled_At',         // Scheduled send time
      'Sent_At',              // Actual send time
      'Created_By',           // User who created
      'Created_At'            // Creation timestamp
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAGIC_LINKS - Customer authentication tokens
  // Used by: sendCustomerMagicLink, validateMagicLink
  // ─────────────────────────────────────────────────────────────────────────
  MAGIC_LINKS: {
    name: SALES_INIT_SHEETS.MAGIC_LINKS,
    color: '#64748b', // Slate
    headers: [
      'Token',                // UUID token - Primary key
      'Customer_ID',          // Foreign key to SALES_Customers
      'Email',                // Customer email
      'Customer_Type',        // CSA, Wholesale, Retail
      'Created_At',           // When token was created
      'Expires_At',           // When token expires (15 min)
      'Used',                 // TRUE/FALSE
      'Used_At'               // When token was used
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DELIVERY_PROOFS - Proof of delivery records
  // Used by: saveDeliveryProof
  // ─────────────────────────────────────────────────────────────────────────
  DELIVERY_PROOFS: {
    name: SALES_INIT_SHEETS.DELIVERY_PROOFS,
    color: '#64748b', // Slate
    headers: [
      'Proof_ID',             // PRF-{timestamp} - Primary key
      'Stop_ID',              // Foreign key to SALES_DeliveryStops
      'Order_ID',             // Foreign key to SALES_Orders
      'Timestamp',            // When proof was captured
      'Driver_ID',            // Who captured proof
      'Photo_URL',            // Photo URL
      'Signature_URL',        // Signature URL
      'GPS_Lat',              // GPS latitude
      'GPS_Lng',              // GPS longitude
      'Notes'                 // Delivery notes
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALES_CYCLES - Monday/Thursday harvest cycles
  // Used by: getSalesCycles, closeSalesCycle
  // ─────────────────────────────────────────────────────────────────────────
  SALES_CYCLES: {
    name: SALES_INIT_SHEETS.SALES_CYCLES,
    color: '#9333ea', // Purple (different shade)
    headers: [
      'Cycle_ID',             // CYC-{timestamp} - Primary key
      'Cycle_Name',           // Display name (e.g., "Monday Harvest - Week 12")
      'Harvest_Day',          // Monday, Thursday
      'Order_Cutoff_Day',     // Day orders close (e.g., Friday for Monday)
      'Order_Cutoff_Time',    // Time orders close (e.g., 12:00 PM)
      'Status',               // Open, Closed, Harvesting, Complete
      'Week_Of',              // Monday date of the week
      'Total_Orders',         // Order count for this cycle
      'Total_Revenue',        // Revenue for this cycle
      'Created_At',           // When cycle was created
      'Closed_At'             // When cycle was closed
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MARKET_ITEMS - Farmer's market product listings
  // Used by: getMarketSignItems, updateMarketItem
  // ─────────────────────────────────────────────────────────────────────────
  MARKET_ITEMS: {
    name: SALES_INIT_SHEETS.MARKET_ITEMS,
    color: '#f59e0b', // Amber
    headers: [
      'Item_ID',              // MKT-{timestamp} - Primary key
      'Date',                 // Market date
      'Item_Name',            // Product name
      'Variety',              // Product variety
      'Price',                // Price per unit
      'Unit',                 // Unit (lb, bunch, each)
      'Category',             // Vegetables, Greens, Flowers, etc.
      'Is_Active',            // TRUE/FALSE
      'Display_Order',        // Sort order on market sign
      'Notes'                 // Product notes
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize all sales-related sheets
 * Run this once to set up the data structure
 * Safe to run multiple times - won't overwrite existing sheets
 *
 * @returns {Object} Result object with success status and details
 */
function initializeSalesSheets() {
  const startTime = new Date();
  const results = {
    success: true,
    created: [],
    skipped: [],
    errors: []
  };

  try {
    const ss = SpreadsheetApp.openById(SALES_INIT_SPREADSHEET_ID);
    Logger.log('Opening spreadsheet: ' + ss.getName());

    // Create each sheet defined in SALES_SHEET_DEFINITIONS
    for (const [key, definition] of Object.entries(SALES_SHEET_DEFINITIONS)) {
      try {
        const result = createSalesSheetIfNotExists(ss, definition);
        if (result.created) {
          results.created.push(definition.name);
        } else {
          results.skipped.push(definition.name);
        }
      } catch (sheetError) {
        results.errors.push({
          sheet: definition.name,
          error: sheetError.toString()
        });
        Logger.log('Error creating ' + definition.name + ': ' + sheetError.toString());
      }
    }

    // Log summary
    const duration = (new Date() - startTime) / 1000;
    Logger.log('═══════════════════════════════════════════════════════════════');
    Logger.log('SALES SHEET INITIALIZATION COMPLETE');
    Logger.log('Duration: ' + duration + ' seconds');
    Logger.log('Created: ' + results.created.length + ' sheets');
    Logger.log('Skipped: ' + results.skipped.length + ' sheets (already exist)');
    Logger.log('Errors: ' + results.errors.length);
    Logger.log('═══════════════════════════════════════════════════════════════');

    if (results.created.length > 0) {
      Logger.log('Created sheets: ' + results.created.join(', '));
    }
    if (results.skipped.length > 0) {
      Logger.log('Skipped sheets: ' + results.skipped.join(', '));
    }
    if (results.errors.length > 0) {
      Logger.log('Errors: ' + JSON.stringify(results.errors));
      results.success = false;
    }

    // Try to show UI alert if in spreadsheet context
    try {
      const ui = SpreadsheetApp.getUi();
      const message =
        'Created: ' + results.created.length + ' sheets\n' +
        'Skipped: ' + results.skipped.length + ' sheets (already existed)\n' +
        'Errors: ' + results.errors.length;

      ui.alert('Sales Sheets Initialization', message, ui.ButtonSet.OK);
    } catch (uiError) {
      // Running from script editor or API - just log
    }

    return results;

  } catch (error) {
    Logger.log('FATAL ERROR: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      created: results.created,
      skipped: results.skipped,
      errors: results.errors
    };
  }
}

/**
 * Create a single sheet if it doesn't exist
 *
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {Object} definition - Sheet definition with name, headers, color
 * @returns {Object} Result with created flag
 */
function createSalesSheetIfNotExists(ss, definition) {
  const { name, headers, color } = definition;

  let sheet = ss.getSheetByName(name);

  if (sheet) {
    Logger.log('Sheet already exists: ' + name);
    return { created: false, sheet: sheet };
  }

  // Create the sheet
  sheet = ss.insertSheet(name);
  Logger.log('Created sheet: ' + name);

  // Add headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // Style headers
  headerRange
    .setBackground(color)
    .setFontColor('white')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // Freeze header row
  sheet.setFrozenRows(1);

  // Set tab color
  sheet.setTabColor(color);

  // Auto-resize columns for readability
  try {
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  } catch (resizeError) {
    // Auto-resize might fail on new sheets, ignore
  }

  return { created: true, sheet: sheet };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get status of all sales sheets
 * Useful for debugging/verification
 *
 * @returns {Object} Status of each sheet
 */
function getSalesSheetStatus() {
  const ss = SpreadsheetApp.openById(SALES_INIT_SPREADSHEET_ID);
  const status = {};

  for (const [key, definition] of Object.entries(SALES_SHEET_DEFINITIONS)) {
    const sheet = ss.getSheetByName(definition.name);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      status[definition.name] = {
        exists: true,
        rowCount: lastRow > 0 ? lastRow - 1 : 0, // Subtract header row
        columnCount: sheet.getLastColumn(),
        expectedColumns: definition.headers.length
      };
    } else {
      status[definition.name] = {
        exists: false,
        rowCount: 0,
        columnCount: 0,
        expectedColumns: definition.headers.length
      };
    }
  }

  Logger.log('Sales Sheet Status:');
  Logger.log(JSON.stringify(status, null, 2));
  return status;
}

/**
 * Delete all sales sheets (use with caution!)
 * Only for development/testing - will DELETE DATA
 *
 * @param {boolean} confirm - Must be true to proceed
 * @returns {Object} Result of operation
 */
function deleteAllSalesSheets(confirm) {
  if (confirm !== true) {
    return {
      success: false,
      error: 'Must pass confirm=true to delete sheets. This will DELETE ALL DATA!'
    };
  }

  const ss = SpreadsheetApp.openById(SALES_INIT_SPREADSHEET_ID);
  const deleted = [];
  const notFound = [];

  for (const [key, definition] of Object.entries(SALES_SHEET_DEFINITIONS)) {
    const sheet = ss.getSheetByName(definition.name);
    if (sheet) {
      ss.deleteSheet(sheet);
      deleted.push(definition.name);
      Logger.log('Deleted sheet: ' + definition.name);
    } else {
      notFound.push(definition.name);
    }
  }

  return {
    success: true,
    deleted: deleted,
    notFound: notFound
  };
}

/**
 * Verify sheet headers match expected definition
 *
 * @param {string} sheetName - Name of sheet to verify
 * @returns {Object} Verification result
 */
function verifySalesSheetHeaders(sheetName) {
  const ss = SpreadsheetApp.openById(SALES_INIT_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Sheet not found: ' + sheetName };
  }

  // Find the definition
  let definition = null;
  for (const [key, def] of Object.entries(SALES_SHEET_DEFINITIONS)) {
    if (def.name === sheetName) {
      definition = def;
      break;
    }
  }

  if (!definition) {
    return { success: false, error: 'No definition found for: ' + sheetName };
  }

  // Get actual headers
  const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const expectedHeaders = definition.headers;

  const mismatches = [];
  const missing = [];
  const extra = [];

  // Check each expected header
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (actualHeaders[i] !== expectedHeaders[i]) {
      mismatches.push({
        index: i,
        expected: expectedHeaders[i],
        actual: actualHeaders[i] || '(missing)'
      });
    }
  }

  // Check for extra columns
  if (actualHeaders.length > expectedHeaders.length) {
    for (let i = expectedHeaders.length; i < actualHeaders.length; i++) {
      extra.push(actualHeaders[i]);
    }
  }

  // Check for missing columns
  if (actualHeaders.length < expectedHeaders.length) {
    for (let i = actualHeaders.length; i < expectedHeaders.length; i++) {
      missing.push(expectedHeaders[i]);
    }
  }

  const isValid = mismatches.length === 0 && missing.length === 0;

  return {
    success: true,
    isValid: isValid,
    sheetName: sheetName,
    expectedColumnCount: expectedHeaders.length,
    actualColumnCount: actualHeaders.length,
    mismatches: mismatches,
    missing: missing,
    extra: extra
  };
}
