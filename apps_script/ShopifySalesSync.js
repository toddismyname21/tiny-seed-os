// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY SALES SYNC MODULE
// Syncs Shopify orders and customers to SALES sheets with CSA identification
//
// This module pulls data FROM Shopify INTO Google Sheets:
// - SALES_Orders - All orders
// - SALES_Customers - All customers
// - CSA_Members - CSA subscription orders identified and extracted
//
// Uses UrlFetchApp for HTTP requests (Apps Script's fetch API)
// Handles pagination (Shopify returns max 250 items per request)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CSA Product identifiers (titles that indicate CSA shares)
 * Used to identify which orders should be added to CSA_Members
 */
const CSA_PRODUCT_KEYWORDS = [
  'csa', 'farm share', 'veggie share', 'vegetable share', 'produce share',
  'full share', 'half share', 'single share', 'couple share', 'family share',
  'flower share', 'bouquet share', 'fleurs', 'subscription'
];

/**
 * Add-on product keywords (CSA add-ons like mushrooms, bread, cheese, coffee)
 */
const ADDON_KEYWORDS = [
  'add-on', 'addon', 'mushroom', 'bread', 'cheese', 'coffee', 'egg', 'honey'
];

/**
 * Main sync function - pulls Shopify data into Google Sheets
 *
 * @param {Object} params - Optional parameters
 * @param {number} params.orderLimit - Max orders to fetch (default: 250, max per page)
 * @param {number} params.customerLimit - Max customers to fetch (default: 250)
 * @param {boolean} params.fullSync - If true, clears existing data before sync
 * @param {string} params.since - Only fetch orders created after this date (ISO format)
 * @returns {Object} Sync results with counts
 */
function syncShopifyToSheets(params = {}) {
  const startTime = Date.now();

  // Validate Shopify is configured
  if (!SHOPIFY_CONFIG.ENABLED) {
    return {
      success: false,
      error: 'Shopify integration is not enabled. Configure SHOPIFY_CONFIG first.',
      instructions: 'Call setShopifyCredentials(storeName, accessToken) to configure'
    };
  }

  const results = {
    success: true,
    orders: { imported: 0, updated: 0, errors: 0 },
    customers: { imported: 0, updated: 0, errors: 0 },
    csaMembers: { imported: 0, updated: 0, errors: 0 },
    addOns: { imported: 0 },
    executionTime: 0,
    timestamp: new Date().toISOString()
  };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Step 1: Sync Orders
    Logger.log('[ShopifySync] Starting order sync...');
    const orderResult = syncShopifyOrdersToSalesSheet(ss, params);
    results.orders = orderResult;

    // Step 2: Sync Customers
    Logger.log('[ShopifySync] Starting customer sync...');
    const customerResult = syncShopifyCustomersToSalesSheet(ss, params);
    results.customers = customerResult;

    // Step 3: Identify and create CSA memberships from orders
    Logger.log('[ShopifySync] Identifying CSA subscriptions...');
    const csaResult = identifyAndCreateCSAMembers(ss, params);
    results.csaMembers = csaResult;

    // Log the integration
    logIntegration('Shopify', 'syncShopifyToSheets', 'SUCCESS',
      `Orders: ${results.orders.imported} new, ${results.orders.updated} updated | ` +
      `Customers: ${results.customers.imported} new | ` +
      `CSA Members: ${results.csaMembers.imported} new`);

  } catch (error) {
    results.success = false;
    results.error = error.toString();
    logIntegration('Shopify', 'syncShopifyToSheets', 'ERROR', error.toString());
  }

  results.executionTime = Date.now() - startTime;
  return results;
}

/**
 * Sync Shopify orders to SALES_Orders sheet
 */
function syncShopifyOrdersToSalesSheet(ss, params = {}) {
  const result = { imported: 0, updated: 0, errors: 0, details: [] };

  // Get or create SALES_Orders sheet
  let sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SALES_SHEETS.ORDERS);
    sheet.appendRow([
      'Order_ID', 'Shopify_Order_ID', 'Order_Number', 'Customer_ID', 'Customer_Name',
      'Customer_Email', 'Customer_Phone', 'Order_Date', 'Order_Type', 'Status',
      'Financial_Status', 'Fulfillment_Status', 'Subtotal', 'Tax', 'Shipping',
      'Total', 'Currency', 'Discount_Amount', 'Discount_Code', 'Payment_Method',
      'Shipping_Address', 'Shipping_City', 'Shipping_State', 'Shipping_Zip',
      'Line_Items_JSON', 'Tags', 'Note', 'Source', 'Location_ID',
      'Created_At', 'Last_Synced'
    ]);
    sheet.getRange(1, 1, 1, 31).setFontWeight('bold').setBackground('#e8f5e9');
    sheet.setFrozenRows(1);
  }

  // Get existing Shopify Order IDs to check for duplicates
  const existingData = sheet.getDataRange().getValues();
  const existingShopifyIds = new Set();
  const shopifyIdCol = existingData[0].indexOf('Shopify_Order_ID');
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][shopifyIdCol]) {
      existingShopifyIds.add(existingData[i][shopifyIdCol].toString());
    }
  }

  // Fetch orders from Shopify with pagination
  const allOrders = fetchAllShopifyOrders(params);

  if (!allOrders.success) {
    result.errors++;
    result.details.push({ error: allOrders.error });
    return result;
  }

  // Process each order
  const newRows = [];
  const now = new Date().toISOString();

  for (const order of allOrders.orders) {
    const shopifyId = order.id.toString();

    // Check if order already exists
    if (existingShopifyIds.has(shopifyId)) {
      // Update existing - find row and update
      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][shopifyIdCol]?.toString() === shopifyId) {
          const rowNum = i + 1;
          const updatedRow = buildOrderRow(order, existingData[i][0], now); // Keep existing Order_ID
          sheet.getRange(rowNum, 1, 1, updatedRow.length).setValues([updatedRow]);
          result.updated++;
          break;
        }
      }
    } else {
      // New order
      const orderId = `ORD-${Date.now()}-${result.imported + 1}`;
      newRows.push(buildOrderRow(order, orderId, now));
      result.imported++;
    }
  }

  // Batch append new rows
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  return result;
}

/**
 * Build a row for the SALES_Orders sheet from a Shopify order
 */
function buildOrderRow(order, orderId, timestamp) {
  const customer = order.customer || {};
  const shippingAddr = order.shipping_address || order.billing_address || {};

  // Determine order type based on line items
  let orderType = 'Standard';
  const lineItemTitles = (order.line_items || []).map(li => (li.title || '').toLowerCase()).join(' ');
  if (CSA_PRODUCT_KEYWORDS.some(kw => lineItemTitles.includes(kw))) {
    orderType = 'CSA';
  } else if (order.source_name === 'pos') {
    orderType = 'Market';
  }

  return [
    orderId,
    order.id,
    order.order_number || order.name,
    customer.id ? `CUST-SHOP-${customer.id}` : '',
    customer.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : 'Guest',
    customer.email || order.email || '',
    customer.phone || shippingAddr.phone || '',
    order.created_at,
    orderType,
    order.cancelled_at ? 'Cancelled' : (order.closed_at ? 'Closed' : 'Open'),
    order.financial_status || 'pending',
    order.fulfillment_status || 'unfulfilled',
    order.subtotal_price || 0,
    order.total_tax || 0,
    order.total_shipping_price_set?.shop_money?.amount || 0,
    order.total_price || 0,
    order.currency || 'USD',
    order.total_discounts || 0,
    (order.discount_codes || []).map(d => d.code).join(', '),
    order.payment_gateway_names ? order.payment_gateway_names.join(', ') : '',
    shippingAddr.address1 || '',
    shippingAddr.city || '',
    shippingAddr.province || shippingAddr.province_code || '',
    shippingAddr.zip || '',
    JSON.stringify(order.line_items || []),
    order.tags || '',
    order.note || '',
    order.source_name || 'web',
    order.location_id || '',
    order.created_at,
    timestamp
  ];
}

/**
 * Fetch all orders from Shopify with pagination
 */
function fetchAllShopifyOrders(params = {}) {
  const allOrders = [];
  let pageInfo = null;
  let pageCount = 0;
  const maxPages = params.maxPages || 20; // Safety limit
  const since = params.since || '';

  do {
    let endpoint = 'orders.json?limit=250&status=any';
    if (since) {
      endpoint += `&created_at_min=${since}`;
    }
    if (pageInfo) {
      endpoint += `&page_info=${pageInfo}`;
    }

    const result = shopifyApiCall(endpoint);

    if (!result.success) {
      return { success: false, error: result.error, orders: allOrders };
    }

    const orders = result.data.orders || [];
    allOrders.push(...orders);

    // Get pagination info from Link header (returned in result by shopifyApiCall)
    pageInfo = result.pageInfo || null;
    pageCount++;

    Logger.log(`[ShopifySync] Fetched page ${pageCount}: ${orders.length} orders (total: ${allOrders.length})`);

  } while (pageInfo && pageCount < maxPages);

  return { success: true, orders: allOrders, pagesProcessed: pageCount };
}

/**
 * Sync Shopify customers to SALES_Customers sheet
 */
function syncShopifyCustomersToSalesSheet(ss, params = {}) {
  const result = { imported: 0, updated: 0, errors: 0 };

  // Get or create SALES_Customers sheet
  let sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
  if (!sheet) {
    sheet = ss.insertSheet(SALES_SHEETS.CUSTOMERS);
    sheet.appendRow([
      'Customer_ID', 'Customer_Type', 'Name', 'Contact_Name', 'Email', 'Phone',
      'Address', 'City', 'State', 'Zip', 'Delivery_Notes', 'Payment_Terms',
      'Sales_Channel', 'Active', 'Created_Date', 'Last_Modified',
      'Total_Orders', 'Total_Spent', 'Notes', 'Shopify_ID', 'Tags',
      'Accepts_Marketing', 'Last_Synced'
    ]);
    sheet.getRange(1, 1, 1, 23).setFontWeight('bold').setBackground('#e8f5e9');
    sheet.setFrozenRows(1);
  }

  // Get existing Shopify IDs
  const existingData = sheet.getDataRange().getValues();
  const existingShopifyIds = new Set();
  const shopifyIdCol = existingData[0].indexOf('Shopify_ID');
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][shopifyIdCol]) {
      existingShopifyIds.add(existingData[i][shopifyIdCol].toString());
    }
  }

  // Fetch all customers from Shopify with pagination
  const allCustomers = fetchAllShopifyCustomers(params);

  if (!allCustomers.success) {
    result.errors++;
    return result;
  }

  const newRows = [];
  const now = new Date().toISOString();

  for (const customer of allCustomers.customers) {
    const shopifyId = customer.id.toString();

    if (existingShopifyIds.has(shopifyId)) {
      result.updated++;
      // Could update existing here if needed
    } else {
      const customerId = `CUST-SHOP-${customer.id}`;
      const defaultAddr = customer.default_address || {};

      // Determine customer type based on tags and order history
      let customerType = 'Retail';
      const tags = (customer.tags || '').toLowerCase();
      if (tags.includes('csa') || tags.includes('member')) {
        customerType = 'CSA';
      } else if (tags.includes('wholesale') || tags.includes('restaurant') || tags.includes('chef')) {
        customerType = 'Wholesale';
      }

      newRows.push([
        customerId,
        customerType,
        `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        customer.email || '',
        customer.phone || defaultAddr.phone || '',
        defaultAddr.address1 || '',
        defaultAddr.city || '',
        defaultAddr.province || defaultAddr.province_code || '',
        defaultAddr.zip || '',
        '', // Delivery notes
        'Prepaid', // Default payment terms
        'Shopify', // Sales channel
        true, // Active
        customer.created_at,
        now,
        customer.orders_count || 0,
        customer.total_spent || 0,
        customer.note || '',
        shopifyId,
        customer.tags || '',
        customer.accepts_marketing ? 'Yes' : 'No',
        now
      ]);
      result.imported++;
    }
  }

  // Batch append new rows
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  return result;
}

/**
 * Fetch all customers from Shopify with pagination
 */
function fetchAllShopifyCustomers(params = {}) {
  const allCustomers = [];
  let pageInfo = null;
  let pageCount = 0;
  const maxPages = params.maxPages || 20;

  do {
    let endpoint = 'customers.json?limit=250';
    if (pageInfo) {
      endpoint += `&page_info=${pageInfo}`;
    }

    const result = shopifyApiCall(endpoint);

    if (!result.success) {
      return { success: false, error: result.error, customers: allCustomers };
    }

    const customers = result.data.customers || [];
    allCustomers.push(...customers);

    pageInfo = result.pageInfo || null;
    pageCount++;

    Logger.log(`[ShopifySync] Fetched page ${pageCount}: ${customers.length} customers (total: ${allCustomers.length})`);

  } while (pageInfo && pageCount < maxPages);

  return { success: true, customers: allCustomers, pagesProcessed: pageCount };
}

/**
 * Identify CSA orders and create CSA_Members entries
 */
function identifyAndCreateCSAMembers(ss, params = {}) {
  const result = { imported: 0, updated: 0, skipped: 0, errors: 0, details: [] };

  // Get the orders sheet
  const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
  if (!ordersSheet) {
    result.errors++;
    result.details.push({ error: 'SALES_Orders sheet not found' });
    return result;
  }

  // Get or create CSA_Members sheet
  let csaSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
  if (!csaSheet) {
    csaSheet = ss.insertSheet(SALES_SHEETS.CSA_MEMBERS);
    csaSheet.appendRow([
      'Member_ID', 'Customer_ID', 'Customer_Name', 'Email', 'Phone',
      'Share_Type', 'Share_Size', 'Season',
      'Start_Date', 'End_Date', 'Total_Weeks', 'Weeks_Remaining',
      'Pickup_Day', 'Pickup_Location', 'Delivery_Address',
      'Customization_Allowed', 'Swap_Credits', 'Vacation_Weeks_Used', 'Vacation_Weeks_Max',
      'Status', 'Payment_Status', 'Amount_Paid', 'Frequency', 'Biweekly_Week',
      'Veg_Code', 'Floral_Code', 'Preferences', 'Is_Onboarded',
      'Participation_Confirmed', 'Confirmed_At',
      'Last_Pickup_Date', 'Next_Pickup_Date', 'Shopify_Order_ID',
      'Created_Date', 'Last_Modified', 'Notes'
    ]);
    csaSheet.getRange(1, 1, 1, 33).setFontWeight('bold').setBackground('#fff3e0');
    csaSheet.setFrozenRows(1);
  }

  // Ensure Customer_Name, Email, Phone columns exist (for existing sheets)
  const existingHeaders = csaSheet.getRange(1, 1, 1, csaSheet.getLastColumn()).getValues()[0];
  if (!existingHeaders.includes('Customer_Name')) {
    // Add missing columns after Customer_ID
    const custIdIdx = existingHeaders.indexOf('Customer_ID');
    if (custIdIdx >= 0) {
      csaSheet.insertColumnAfter(custIdIdx + 1);
      csaSheet.insertColumnAfter(custIdIdx + 2);
      csaSheet.insertColumnAfter(custIdIdx + 3);
      csaSheet.getRange(1, custIdIdx + 2).setValue('Customer_Name');
      csaSheet.getRange(1, custIdIdx + 3).setValue('Email');
      csaSheet.getRange(1, custIdIdx + 4).setValue('Phone');
    }
  }

  // Get existing Shopify Order IDs in CSA_Members
  const csaData = csaSheet.getDataRange().getValues();
  const csaHeaders = csaData[0];
  const shopifyOrderCol = csaHeaders.indexOf('Shopify_Order_ID');
  const existingOrderIds = new Set();
  for (let i = 1; i < csaData.length; i++) {
    if (csaData[i][shopifyOrderCol]) {
      existingOrderIds.add(csaData[i][shopifyOrderCol].toString());
    }
  }

  // Read orders and find CSA orders
  const orderData = ordersSheet.getDataRange().getValues();
  const orderHeaders = orderData[0];
  const orderTypeCol = orderHeaders.indexOf('Order_Type');
  const shopifyIdCol = orderHeaders.indexOf('Shopify_Order_ID');
  const customerIdCol = orderHeaders.indexOf('Customer_ID');
  const customerNameCol = orderHeaders.indexOf('Customer_Name');
  const customerEmailCol = orderHeaders.indexOf('Customer_Email');
  const customerPhoneCol = orderHeaders.indexOf('Customer_Phone');
  const lineItemsCol = orderHeaders.indexOf('Line_Items_JSON');
  const financialStatusCol = orderHeaders.indexOf('Financial_Status');
  const totalCol = orderHeaders.indexOf('Total');
  const orderDateCol = orderHeaders.indexOf('Order_Date');
  const noteCol = orderHeaders.indexOf('Note');
  const shippingAddressCol = orderHeaders.indexOf('Shipping_Address');

  const newCSARows = [];
  const now = new Date();
  const nowStr = now.toISOString();

  for (let i = 1; i < orderData.length; i++) {
    const row = orderData[i];

    // Skip if not a CSA order type
    if (row[orderTypeCol] !== 'CSA') continue;

    const shopifyOrderId = row[shopifyIdCol]?.toString();

    // Skip if already processed
    if (existingOrderIds.has(shopifyOrderId)) {
      result.skipped++;
      continue;
    }

    // Parse line items to determine share type and size
    let lineItems = [];
    try {
      lineItems = JSON.parse(row[lineItemsCol] || '[]');
    } catch (e) {
      result.errors++;
      continue;
    }

    // Process each CSA line item (an order might have multiple shares)
    for (const item of lineItems) {
      const title = (item.title || '').toLowerCase();

      // Check if this is a CSA product
      if (!CSA_PRODUCT_KEYWORDS.some(kw => title.includes(kw))) continue;

      // Determine share type and size from title
      const shareInfo = extractShareTypeAndSize(item.title, item.variant_title);

      const memberId = `CSA-${Date.now()}-${result.imported + 1}`;

      // Determine frequency from title
      let frequency = 'Weekly';
      if (title.includes('biweekly') || title.includes('bi-weekly') || title.includes('every other')) {
        frequency = 'Biweekly';
      } else if (title.includes('monthly')) {
        frequency = 'Monthly';
      }

      // Default CSA season dates (2026 season)
      const seasonYear = now.getFullYear();
      const startDate = new Date(seasonYear, 4, 1); // May 1
      const endDate = new Date(seasonYear, 10, 15); // November 15
      const totalWeeks = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));

      newCSARows.push([
        memberId,
        row[customerIdCol] || '',
        row[customerNameCol] || '', // Customer_Name
        row[customerEmailCol] || '', // Email
        row[customerPhoneCol] || '', // Phone
        shareInfo.type,
        shareInfo.size,
        `${seasonYear}`,
        startDate,
        endDate,
        totalWeeks,
        totalWeeks, // Weeks remaining = total at start
        '', // Pickup day - to be filled in
        '', // Pickup location - to be filled in
        row[shippingAddressCol] || '', // Delivery address from order
        true, // Customization allowed
        3, // Default swap credits
        0, // Vacation weeks used
        4, // Max vacation weeks
        row[financialStatusCol] === 'paid' ? 'Active' : 'Pending',
        row[financialStatusCol] === 'paid' ? 'Paid' : 'Pending',
        parseFloat(item.price || 0) * (item.quantity || 1),
        frequency,
        0, // Veg code
        0, // Floral code
        '', // Preferences
        false, // Is onboarded
        '', // Last pickup date
        '', // Next pickup date
        shopifyOrderId,
        row[orderDateCol] || nowStr,
        nowStr,
        `Imported from Shopify - ${item.title}`
      ]);

      result.imported++;
    }
  }

  // Batch append new CSA members
  if (newCSARows.length > 0) {
    csaSheet.getRange(csaSheet.getLastRow() + 1, 1, newCSARows.length, newCSARows[0].length).setValues(newCSARows);
  }

  return result;
}

/**
 * Extract share type and size from product title
 */
function extractShareTypeAndSize(title, variantTitle) {
  const combined = `${title || ''} ${variantTitle || ''}`.toLowerCase();

  // Determine share type
  let type = 'Vegetable';
  if (combined.includes('flower') || combined.includes('floral') || combined.includes('fleurs') || combined.includes('bouquet')) {
    type = 'Flower';
  } else if (combined.includes('fruit')) {
    type = 'Fruit';
  } else if (combined.includes('egg')) {
    type = 'Egg';
  } else if (combined.includes('mushroom')) {
    type = 'Mushroom Add-On';
  } else if (combined.includes('bread')) {
    type = 'Bread Add-On';
  } else if (combined.includes('cheese')) {
    type = 'Cheese Add-On';
  } else if (combined.includes('coffee')) {
    type = 'Coffee Add-On';
  }

  // Determine share size
  let size = 'Regular';
  if (combined.includes('full') || combined.includes('family') || combined.includes('large')) {
    size = 'Full';
  } else if (combined.includes('half') || combined.includes('couple') || combined.includes('medium')) {
    size = 'Half';
  } else if (combined.includes('single') || combined.includes('small') || combined.includes('petite')) {
    size = 'Single';
  }

  return { type, size };
}

/**
 * Get sync status - shows when last sync happened and counts
 */
function getShopifySyncStatus() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const customersSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const csaSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);

    return {
      success: true,
      sheets: {
        orders: {
          exists: !!ordersSheet,
          count: ordersSheet ? Math.max(0, ordersSheet.getLastRow() - 1) : 0
        },
        customers: {
          exists: !!customersSheet,
          count: customersSheet ? Math.max(0, customersSheet.getLastRow() - 1) : 0
        },
        csaMembers: {
          exists: !!csaSheet,
          count: csaSheet ? Math.max(0, csaSheet.getLastRow() - 1) : 0
        }
      },
      shopifyEnabled: SHOPIFY_CONFIG.ENABLED,
      storeName: SHOPIFY_CONFIG.STORE_NAME
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick sync - only fetches orders from last 7 days
 */
function quickSyncShopify() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return syncShopifyToSheets({
    since: sevenDaysAgo.toISOString()
  });
}

/**
 * Full sync - fetches all historical data
 */
function fullSyncShopify() {
  return syncShopifyToSheets({
    maxPages: 100 // Allow more pages for full sync
  });
}

/**
 * Backfill customer names into CSA_Members records
 * Joins CSA_Members with SALES_Customers and SALES_Orders to populate missing Customer_Name, Email, Phone
 *
 * @returns {Object} Results with updated, skipped, and error counts
 */
function backfillCSAMemberNames() {
  const result = { success: true, updated: 0, skipped: 0, errors: 0, details: [] };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get CSA_Members sheet
    const csaSheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    if (!csaSheet) {
      return { success: false, error: 'CSA_Members sheet not found' };
    }

    // Get SALES_Customers sheet
    const customersSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    // Get SALES_Orders sheet (has original customer names from Shopify)
    const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);

    // Also try SHOPIFY_Orders as fallback (might have the original Shopify data)
    const shopifyOrdersSheet = ss.getSheetByName('SHOPIFY_Orders');

    // Build a lookup map from SALES_Customers: Customer_ID -> {Name, Email, Phone}
    const customerLookup = {};
    const emailToCustomer = {};

    if (customersSheet) {
      const customerData = customersSheet.getDataRange().getValues();
      const customerHeaders = customerData[0];
      const custIdCol = customerHeaders.indexOf('Customer_ID');
      // Try both 'Name' and 'Contact_Name' columns
      let custNameCol = customerHeaders.indexOf('Name');
      if (custNameCol < 0) custNameCol = customerHeaders.indexOf('Contact_Name');
      if (custNameCol < 0) custNameCol = customerHeaders.indexOf('Company_Name');
      const custEmailCol = customerHeaders.indexOf('Email');
      const custPhoneCol = customerHeaders.indexOf('Phone');

      for (let i = 1; i < customerData.length; i++) {
        const row = customerData[i];
        const customerId = row[custIdCol];
        const name = custNameCol >= 0 ? (row[custNameCol] || '') : '';
        const email = custEmailCol >= 0 ? (row[custEmailCol] || '') : '';
        const phone = custPhoneCol >= 0 ? (row[custPhoneCol] || '') : '';

        if (customerId) {
          customerLookup[customerId] = { name, email, phone };
        }
        if (email) {
          emailToCustomer[email.toLowerCase()] = { name, email, phone };
        }
      }
      Logger.log(`[Backfill] Built customer lookup with ${Object.keys(customerLookup).length} entries`);
    }

    // Build lookup from SALES_Orders: Shopify_Order_ID -> {CustomerName, Email, Phone}
    const orderLookup = {};
    if (ordersSheet) {
      const orderData = ordersSheet.getDataRange().getValues();
      const orderHeaders = orderData[0];
      const shopifyIdCol = orderHeaders.indexOf('Shopify_Order_ID');
      const orderCustNameCol = orderHeaders.indexOf('Customer_Name');
      const orderEmailCol = orderHeaders.indexOf('Customer_Email');
      const orderPhoneCol = orderHeaders.indexOf('Customer_Phone');

      for (let i = 1; i < orderData.length; i++) {
        const row = orderData[i];
        const shopifyId = row[shopifyIdCol]?.toString();
        if (shopifyId) {
          orderLookup[shopifyId] = {
            name: orderCustNameCol >= 0 ? (row[orderCustNameCol] || '') : '',
            email: orderEmailCol >= 0 ? (row[orderEmailCol] || '') : '',
            phone: orderPhoneCol >= 0 ? (row[orderPhoneCol] || '') : ''
          };
        }
      }
      Logger.log(`[Backfill] Built order lookup with ${Object.keys(orderLookup).length} entries`);
    }

    // Also build lookup from SHOPIFY_Orders (legacy format with original Shopify data)
    if (shopifyOrdersSheet) {
      const shopifyData = shopifyOrdersSheet.getDataRange().getValues();
      const shopifyHeaders = shopifyData[0];
      // Try various possible column names for order ID and customer info
      const sOrderIdCol = shopifyHeaders.indexOf('Shopify_Order_ID') >= 0 ?
        shopifyHeaders.indexOf('Shopify_Order_ID') :
        shopifyHeaders.indexOf('Order_ID');
      const sOrderNumCol = shopifyHeaders.indexOf('Shopify_Order_Number');
      const sCustNameCol = shopifyHeaders.indexOf('Customer_Name') >= 0 ?
        shopifyHeaders.indexOf('Customer_Name') :
        shopifyHeaders.indexOf('Customer');
      const sCustEmailCol = shopifyHeaders.indexOf('Customer_Email') >= 0 ?
        shopifyHeaders.indexOf('Customer_Email') :
        shopifyHeaders.indexOf('Email');

      for (let i = 1; i < shopifyData.length; i++) {
        const row = shopifyData[i];
        // Try order ID first, then order number
        let key = sOrderIdCol >= 0 ? row[sOrderIdCol]?.toString() : '';
        if (!key && sOrderNumCol >= 0) key = row[sOrderNumCol]?.toString();

        if (key && !orderLookup[key]) {
          const name = sCustNameCol >= 0 ? (row[sCustNameCol] || '') : '';
          const email = sCustEmailCol >= 0 ? (row[sCustEmailCol] || '') : '';
          if (name) {
            orderLookup[key] = { name, email, phone: '' };
          }
        }
      }
      Logger.log(`[Backfill] After SHOPIFY_Orders: ${Object.keys(orderLookup).length} entries`);
    }

    // Get CSA_Members data
    const csaData = csaSheet.getDataRange().getValues();
    const csaHeaders = csaData[0];
    const memberCustIdCol = csaHeaders.indexOf('Customer_ID');
    const memberNameCol = csaHeaders.indexOf('Customer_Name');
    const memberEmailCol = csaHeaders.indexOf('Email');
    const memberPhoneCol = csaHeaders.indexOf('Phone');
    const memberNotesCol = csaHeaders.indexOf('Notes');
    const shopifyOrderIdCol = csaHeaders.indexOf('Shopify_Order_ID');

    if (memberCustIdCol < 0) {
      return { success: false, error: 'Customer_ID column not found in CSA_Members' };
    }

    // Process each CSA member row
    for (let i = 1; i < csaData.length; i++) {
      const row = csaData[i];
      const customerId = row[memberCustIdCol];
      const currentName = memberNameCol >= 0 ? row[memberNameCol] : '';

      // Skip if already has a name (not empty, not "CSA Member")
      if (currentName && currentName !== 'CSA Member' && currentName.trim() !== '') {
        result.skipped++;
        continue;
      }

      let foundName = '';
      let foundEmail = '';
      let foundPhone = '';
      let source = '';

      // Strategy 1: Look up by Customer_ID in SALES_Customers
      if (customerLookup[customerId] && customerLookup[customerId].name) {
        foundName = customerLookup[customerId].name;
        foundEmail = customerLookup[customerId].email;
        foundPhone = customerLookup[customerId].phone;
        source = 'customer_id';
      }

      // Strategy 2: Look up by Shopify Order ID in SALES_Orders
      if (!foundName) {
        const shopifyOrderId = shopifyOrderIdCol >= 0 ? row[shopifyOrderIdCol]?.toString() : '';
        // Also try extracting from Notes field (often contains "Shopify Order 123456")
        const notes = memberNotesCol >= 0 ? (row[memberNotesCol] || '') : '';
        const orderMatch = notes.match(/Shopify Order\s+(\d+)/i);
        const orderIdToCheck = shopifyOrderId || (orderMatch ? orderMatch[1] : '');

        if (orderIdToCheck && orderLookup[orderIdToCheck] && orderLookup[orderIdToCheck].name) {
          foundName = orderLookup[orderIdToCheck].name;
          foundEmail = orderLookup[orderIdToCheck].email || foundEmail;
          foundPhone = orderLookup[orderIdToCheck].phone || foundPhone;
          source = 'order_lookup';
        }
      }

      // Strategy 3: Look up by email in SALES_Customers
      if (!foundName) {
        const memberEmail = memberEmailCol >= 0 ? row[memberEmailCol] : '';
        if (memberEmail && emailToCustomer[memberEmail.toLowerCase()]) {
          foundName = emailToCustomer[memberEmail.toLowerCase()].name;
          foundEmail = emailToCustomer[memberEmail.toLowerCase()].email;
          foundPhone = emailToCustomer[memberEmail.toLowerCase()].phone;
          source = 'email_match';
        }
      }

      if (foundName) {
        // Update the CSA member row
        const rowNum = i + 1;
        if (memberNameCol >= 0) {
          csaSheet.getRange(rowNum, memberNameCol + 1).setValue(foundName);
        }
        if (memberEmailCol >= 0 && !row[memberEmailCol] && foundEmail) {
          csaSheet.getRange(rowNum, memberEmailCol + 1).setValue(foundEmail);
        }
        if (memberPhoneCol >= 0 && !row[memberPhoneCol] && foundPhone) {
          csaSheet.getRange(rowNum, memberPhoneCol + 1).setValue(foundPhone);
        }

        result.updated++;
        result.details.push({ row: rowNum, name: foundName, source: source });
      } else {
        result.errors++;
        result.details.push({ row: i + 1, customerId: customerId, error: 'Customer not found' });
      }
    }

    Logger.log(`[Backfill] Complete: ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);

  } catch (error) {
    result.success = false;
    result.error = error.toString();
    Logger.log(`[Backfill] Error: ${error.toString()}`);
  }

  return result;
}

/**
 * Assign Week A/B to all CSA members
 * - Weekly orders get "BOTH" (they appear in both Week A and Week B)
 * - Biweekly orders get alternating A/B to balance the groups
 *
 * @returns {Object} Results with assignment counts
 */
function assignCSAWeeks() {
  const result = {
    success: true,
    weeklyAssigned: 0,
    biweeklyA: 0,
    biweeklyB: 0,
    alreadyAssigned: 0,
    errors: 0,
    details: []
  };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);

    if (!sheet) {
      return { success: false, error: 'CSA_Members sheet not found' };
    }

    let data = sheet.getDataRange().getValues();
    let headers = data[0];

    // Find column indices
    const freqCol = headers.indexOf('Frequency');
    let weekCol = headers.indexOf('Biweekly_Week');
    const nameCol = headers.indexOf('Customer_Name');
    const statusCol = headers.indexOf('Status');

    // Create Biweekly_Week column if it doesn't exist
    if (weekCol < 0) {
      Logger.log('[AssignWeeks] Creating Biweekly_Week column');
      const lastCol = sheet.getLastColumn();
      sheet.getRange(1, lastCol + 1).setValue('Biweekly_Week');
      // Refresh data
      data = sheet.getDataRange().getValues();
      headers = data[0];
      weekCol = headers.indexOf('Biweekly_Week');
      result.details.push({ action: 'Created Biweekly_Week column at position ' + (weekCol + 1) });
    }

    if (freqCol < 0) {
      // No Frequency column - assume all are weekly
      Logger.log('[AssignWeeks] No Frequency column found, treating all as weekly');
    }

    Logger.log(`[AssignWeeks] Starting week assignment for ${data.length - 1} members`);

    // First pass: count existing biweekly assignments to balance
    let existingA = 0;
    let existingB = 0;

    for (let i = 1; i < data.length; i++) {
      const freq = freqCol >= 0 ? (data[i][freqCol] || '').toString().toLowerCase() : 'weekly';
      const week = (data[i][weekCol] || '').toString().toUpperCase();

      if (freq === 'biweekly' || freq === 'bi-weekly') {
        if (week === 'A') existingA++;
        else if (week === 'B') existingB++;
      }
    }

    Logger.log(`[AssignWeeks] Existing biweekly: A=${existingA}, B=${existingB}`);

    // Track assignments for balancing
    let assignToA = existingA <= existingB;

    // Second pass: assign weeks
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1; // Sheet row number (1-indexed)
      // If no Frequency column, default to 'weekly'
      const freq = freqCol >= 0 ? (row[freqCol] || 'weekly').toString().toLowerCase() : 'weekly';
      const currentWeek = (row[weekCol] || '').toString().toUpperCase();
      const name = nameCol >= 0 ? (row[nameCol] || 'Unknown') : 'Unknown';
      const status = statusCol >= 0 ? (row[statusCol] || '').toString().toLowerCase() : '';

      // Skip inactive members
      if (status === 'cancelled' || status === 'expired' || status === 'inactive') {
        continue;
      }

      try {
        if (freq === 'weekly') {
          // Weekly orders appear in BOTH weeks
          if (currentWeek !== 'BOTH') {
            sheet.getRange(rowNum, weekCol + 1).setValue('BOTH');
            result.weeklyAssigned++;
            result.details.push({ row: rowNum, name: name, assigned: 'BOTH', reason: 'weekly' });
          } else {
            result.alreadyAssigned++;
          }
        } else if (freq === 'biweekly' || freq === 'bi-weekly') {
          // Biweekly orders get A or B
          if (!currentWeek || currentWeek === '' || currentWeek === 'BOTH') {
            const assignedWeek = assignToA ? 'A' : 'B';
            sheet.getRange(rowNum, weekCol + 1).setValue(assignedWeek);

            if (assignToA) {
              result.biweeklyA++;
            } else {
              result.biweeklyB++;
            }

            result.details.push({ row: rowNum, name: name, assigned: assignedWeek, reason: 'biweekly' });

            // Alternate for next assignment
            assignToA = !assignToA;
          } else {
            result.alreadyAssigned++;
          }
        } else {
          // Unknown frequency - treat as weekly (BOTH)
          if (!currentWeek || currentWeek === '') {
            sheet.getRange(rowNum, weekCol + 1).setValue('BOTH');
            result.weeklyAssigned++;
            result.details.push({ row: rowNum, name: name, assigned: 'BOTH', reason: 'unknown-freq-defaulted' });
          }
        }
      } catch (rowError) {
        result.errors++;
        result.details.push({ row: rowNum, error: rowError.toString() });
      }
    }

    Logger.log(`[AssignWeeks] Complete: Weekly=${result.weeklyAssigned}, Biweekly A=${result.biweeklyA}, B=${result.biweeklyB}, Already assigned=${result.alreadyAssigned}`);

  } catch (error) {
    result.success = false;
    result.error = error.toString();
    Logger.log(`[AssignWeeks] Error: ${error.toString()}`);
  }

  return result;
}
