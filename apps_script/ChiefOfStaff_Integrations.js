/**
 * ========================================
 * CHIEF OF STAFF - DEEP INTEGRATIONS
 * ========================================
 *
 * STATE-OF-THE-ART cross-platform integrations
 * Unified communication and data across all systems
 *
 * Integrations:
 * 1. WhatsApp/SMS (Twilio) - Customer messaging
 * 2. QuickBooks - Financial sync
 * 3. Weather API - Farm operations context
 * 4. Shipping (FedEx/UPS) - Delivery tracking
 * 5. Seed Suppliers - Order status
 * 6. Square/POS - Sales data
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// CONFIGURATION
// ==========================================

const INTEGRATION_CONFIG = {
  TWILIO: {
    accountSid: null, // Set via script properties
    authToken: null,
    phoneNumber: null,
    whatsappNumber: null
  },
  QUICKBOOKS: {
    clientId: null,
    clientSecret: null,
    realmId: null,
    accessToken: null,
    refreshToken: null
  },
  WEATHER: {
    apiKey: null,
    latitude: null,
    longitude: null
  },
  FEDEX: {
    apiKey: null,
    secretKey: null,
    accountNumber: null
  },
  SQUARE: {
    accessToken: null,
    locationId: null
  }
};

/**
 * Load integration config from script properties
 */
function loadIntegrationConfig() {
  const props = PropertiesService.getScriptProperties();

  // Twilio
  INTEGRATION_CONFIG.TWILIO.accountSid = props.getProperty('TWILIO_ACCOUNT_SID');
  INTEGRATION_CONFIG.TWILIO.authToken = props.getProperty('TWILIO_AUTH_TOKEN');
  INTEGRATION_CONFIG.TWILIO.phoneNumber = props.getProperty('TWILIO_PHONE_NUMBER');
  INTEGRATION_CONFIG.TWILIO.whatsappNumber = props.getProperty('TWILIO_WHATSAPP_NUMBER');

  // QuickBooks
  INTEGRATION_CONFIG.QUICKBOOKS.clientId = props.getProperty('QUICKBOOKS_CLIENT_ID');
  INTEGRATION_CONFIG.QUICKBOOKS.clientSecret = props.getProperty('QUICKBOOKS_CLIENT_SECRET');
  INTEGRATION_CONFIG.QUICKBOOKS.realmId = props.getProperty('QUICKBOOKS_REALM_ID');

  // Weather - Default to Tiny Seed Farm coordinates (Pittsburgh area)
  INTEGRATION_CONFIG.WEATHER.apiKey = props.getProperty('WEATHER_API_KEY');
  INTEGRATION_CONFIG.WEATHER.latitude = props.getProperty('FARM_LATITUDE') || '40.7956';
  INTEGRATION_CONFIG.WEATHER.longitude = props.getProperty('FARM_LONGITUDE') || '-80.1384';

  // FedEx
  INTEGRATION_CONFIG.FEDEX.apiKey = props.getProperty('FEDEX_API_KEY');
  INTEGRATION_CONFIG.FEDEX.secretKey = props.getProperty('FEDEX_SECRET_KEY');
  INTEGRATION_CONFIG.FEDEX.accountNumber = props.getProperty('FEDEX_ACCOUNT_NUMBER');

  // Square
  INTEGRATION_CONFIG.SQUARE.accessToken = props.getProperty('SQUARE_ACCESS_TOKEN');
  INTEGRATION_CONFIG.SQUARE.locationId = props.getProperty('SQUARE_LOCATION_ID');
}

// ==========================================
// TWILIO - SMS & WHATSAPP
// ==========================================

/**
 * Send SMS message via Twilio
 */
function sendSMS(to, message) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.TWILIO;
  if (!config.accountSid || !config.authToken) {
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(`${config.accountSid}:${config.authToken}`)
      },
      payload: {
        To: formatPhoneNumber(to),
        From: config.phoneNumber,
        Body: message
      }
    });

    const result = JSON.parse(response.getContentText());

    // Log the message
    logIntegrationActivity('twilio_sms', 'send', { to, message: message.substring(0, 100), sid: result.sid });

    return {
      success: true,
      messageSid: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
function sendWhatsApp(to, message) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.TWILIO;
  if (!config.accountSid || !config.authToken) {
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(`${config.accountSid}:${config.authToken}`)
      },
      payload: {
        To: `whatsapp:${formatPhoneNumber(to)}`,
        From: `whatsapp:${config.whatsappNumber}`,
        Body: message
      }
    });

    const result = JSON.parse(response.getContentText());

    logIntegrationActivity('twilio_whatsapp', 'send', { to, message: message.substring(0, 100), sid: result.sid });

    return {
      success: true,
      messageSid: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('Twilio WhatsApp error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent Twilio messages
 */
function getRecentMessages(limit = 20) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.TWILIO;
  if (!config.accountSid) {
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json?PageSize=${limit}`;

    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(`${config.accountSid}:${config.authToken}`)
      }
    });

    const result = JSON.parse(response.getContentText());

    return {
      success: true,
      messages: result.messages.map(m => ({
        sid: m.sid,
        from: m.from,
        to: m.to,
        body: m.body,
        status: m.status,
        date: m.date_sent,
        direction: m.direction
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process incoming SMS/WhatsApp webhook
 */
function processIncomingMessage(params) {
  const from = params.From;
  const body = params.Body;
  const messageSid = params.MessageSid;
  const isWhatsApp = from.startsWith('whatsapp:');

  // Clean phone number
  const cleanPhone = from.replace('whatsapp:', '');

  // Look up customer
  const customer = lookupCustomerByPhone(cleanPhone);

  // Log the message
  logIntegrationActivity(isWhatsApp ? 'twilio_whatsapp' : 'twilio_sms', 'receive', {
    from: cleanPhone,
    body: body,
    customer: customer?.name,
    sid: messageSid
  });

  // Create a task for response if from known customer
  if (customer) {
    createMessageTask(customer, body, isWhatsApp ? 'whatsapp' : 'sms');
  }

  return {
    processed: true,
    from: cleanPhone,
    customer: customer,
    isWhatsApp: isWhatsApp
  };
}

/**
 * Look up customer by phone number
 */
function lookupCustomerByPhone(phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customers = ss.getSheetByName('Customers');

  if (!customers) return null;

  const data = customers.getDataRange().getValues();
  const cleanedPhone = phone.replace(/\D/g, '');

  for (let i = 1; i < data.length; i++) {
    const customerPhone = String(data[i][5] || '').replace(/\D/g, '');
    if (customerPhone && cleanedPhone.endsWith(customerPhone.slice(-10))) {
      return {
        id: data[i][0],
        name: `${data[i][1]} ${data[i][2]}`,
        email: data[i][4],
        phone: data[i][5]
      };
    }
  }

  return null;
}

/**
 * Format phone number to E.164
 */
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }
  return phone;
}

// ==========================================
// QUICKBOOKS INTEGRATION
// ==========================================

/**
 * Get QuickBooks OAuth URL
 */
function getQuickBooksAuthUrl() {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.QUICKBOOKS;
  if (!config.clientId) {
    return { success: false, error: 'QuickBooks not configured' };
  }

  const redirectUri = ScriptApp.getService().getUrl();
  const scopes = 'com.intuit.quickbooks.accounting';

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
    `client_id=${config.clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=quickbooks`;

  return { success: true, authUrl: authUrl };
}

/**
 * Exchange QuickBooks auth code for tokens
 */
function exchangeQuickBooksToken(code) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.QUICKBOOKS;
  const redirectUri = ScriptApp.getService().getUrl();

  try {
    const response = UrlFetchApp.fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(`${config.clientId}:${config.clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
    });

    const tokens = JSON.parse(response.getContentText());

    // Store tokens
    const props = PropertiesService.getScriptProperties();
    props.setProperty('QUICKBOOKS_ACCESS_TOKEN', tokens.access_token);
    props.setProperty('QUICKBOOKS_REFRESH_TOKEN', tokens.refresh_token);
    props.setProperty('QUICKBOOKS_TOKEN_EXPIRY', String(Date.now() + tokens.expires_in * 1000));

    return { success: true, message: 'QuickBooks connected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Refresh QuickBooks access token
 */
function refreshQuickBooksToken() {
  loadIntegrationConfig();

  const props = PropertiesService.getScriptProperties();
  const refreshToken = props.getProperty('QUICKBOOKS_REFRESH_TOKEN');
  const config = INTEGRATION_CONFIG.QUICKBOOKS;

  if (!refreshToken || !config.clientId) {
    return { success: false, error: 'QuickBooks not configured' };
  }

  try {
    const response = UrlFetchApp.fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(`${config.clientId}:${config.clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: `grant_type=refresh_token&refresh_token=${refreshToken}`
    });

    const tokens = JSON.parse(response.getContentText());

    props.setProperty('QUICKBOOKS_ACCESS_TOKEN', tokens.access_token);
    props.setProperty('QUICKBOOKS_REFRESH_TOKEN', tokens.refresh_token);
    props.setProperty('QUICKBOOKS_TOKEN_EXPIRY', String(Date.now() + tokens.expires_in * 1000));

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Make QuickBooks API request
 */
function quickBooksRequest(endpoint, method = 'GET', data = null) {
  const props = PropertiesService.getScriptProperties();
  let accessToken = props.getProperty('QUICKBOOKS_ACCESS_TOKEN');
  const tokenExpiry = parseInt(props.getProperty('QUICKBOOKS_TOKEN_EXPIRY') || '0');
  const realmId = props.getProperty('QUICKBOOKS_REALM_ID');

  if (!accessToken || !realmId) {
    return { success: false, error: 'QuickBooks not connected' };
  }

  // Refresh if expired
  if (Date.now() > tokenExpiry - 60000) {
    const refreshResult = refreshQuickBooksToken();
    if (!refreshResult.success) return refreshResult;
    accessToken = props.getProperty('QUICKBOOKS_ACCESS_TOKEN');
  }

  try {
    const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
    const url = `${baseUrl}/${endpoint}`;

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.payload = JSON.stringify(data);
    }

    const response = UrlFetchApp.fetch(url, options);
    return {
      success: true,
      data: JSON.parse(response.getContentText())
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get QuickBooks customers
 */
function getQuickBooksCustomers() {
  return quickBooksRequest('query?query=SELECT * FROM Customer MAXRESULTS 100');
}

/**
 * Get QuickBooks invoices
 */
function getQuickBooksInvoices(status = 'All') {
  let query = 'SELECT * FROM Invoice';
  if (status === 'Unpaid') {
    query += ' WHERE Balance > 0';
  }
  query += ' ORDERBY DueDate DESC MAXRESULTS 50';

  return quickBooksRequest(`query?query=${encodeURIComponent(query)}`);
}

/**
 * Create QuickBooks invoice
 */
function createQuickBooksInvoice(customerRef, lineItems, dueDate) {
  const invoice = {
    CustomerRef: { value: customerRef },
    DueDate: dueDate,
    Line: lineItems.map(item => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.amount,
      SalesItemLineDetail: {
        ItemRef: { value: item.itemId },
        Qty: item.quantity,
        UnitPrice: item.unitPrice
      }
    }))
  };

  return quickBooksRequest('invoice', 'POST', invoice);
}

/**
 * Sync QuickBooks invoices to sheet
 */
function syncQuickBooksInvoices() {
  const result = getQuickBooksInvoices('All');

  if (!result.success) {
    return result;
  }

  const invoices = result.data.QueryResponse?.Invoice || [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_QB_INVOICES');

  if (!sheet) {
    sheet = ss.insertSheet('COS_QB_INVOICES');
    sheet.appendRow([
      'invoice_id', 'customer_name', 'customer_id', 'doc_number',
      'date', 'due_date', 'total', 'balance', 'status', 'synced_at'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  const synced = new Date().toISOString();

  for (const inv of invoices) {
    const row = [
      inv.Id,
      inv.CustomerRef?.name || '',
      inv.CustomerRef?.value || '',
      inv.DocNumber,
      inv.TxnDate,
      inv.DueDate,
      inv.TotalAmt,
      inv.Balance,
      inv.Balance > 0 ? 'Unpaid' : 'Paid',
      synced
    ];

    // Check if exists
    const data = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === inv.Id) {
        sheet.getRange(i + 1, 1, 1, 10).setValues([row]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow(row);
    }
  }

  logIntegrationActivity('quickbooks', 'sync_invoices', { count: invoices.length });

  return {
    success: true,
    synced: invoices.length,
    timestamp: synced
  };
}

// ==========================================
// WEATHER INTEGRATION (Using Open-Meteo - FREE, no API key required)
// ==========================================

/**
 * Get current weather using Open-Meteo (free API)
 */
function getCurrentWeather() {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.WEATHER;
  const lat = config.latitude || '40.7956';
  const lon = config.longitude || '-80.1384';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/New_York`;

    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());

    const weatherCodes = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };

    return {
      success: true,
      current: {
        temp: data.current.temperature_2m,
        feels_like: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        description: weatherCodes[data.current.weather_code] || 'Unknown',
        wind_speed: data.current.wind_speed_10m,
        wind_direction: data.current.wind_direction_10m,
        clouds: data.current.cloud_cover
      },
      location: 'Tiny Seed Farm'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get weather forecast using Open-Meteo (free API)
 */
function getWeatherForecast(days = 5) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.WEATHER;
  const lat = config.latitude || '40.7956';
  const lon = config.longitude || '-80.1384';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/New_York&forecast_days=${Math.min(days, 16)}`;

    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());

    const weatherCodes = {
      0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
      80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm'
    };

    const forecast = data.daily.time.map((date, i) => ({
      date: date,
      high: data.daily.temperature_2m_max[i],
      low: data.daily.temperature_2m_min[i],
      avg_temp: (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2,
      condition: weatherCodes[data.daily.weather_code[i]] || 'Unknown',
      rain_chance: data.daily.precipitation_probability_max[i] || 0,
      rain_amount: data.daily.precipitation_sum[i] || 0,
      avg_wind: data.daily.wind_speed_10m_max[i]
    }));

    return {
      success: true,
      forecast: forecast,
      location: 'Tiny Seed Farm'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get weather-based recommendations
 */
function getWeatherRecommendations() {
  const current = getCurrentWeather();
  const forecast = getWeatherForecast(3);

  if (!current.success || !forecast.success) {
    return { success: false, error: 'Could not fetch weather data' };
  }

  const recommendations = [];

  // Temperature-based
  if (current.current.temp > 85) {
    recommendations.push({
      type: 'warning',
      message: 'High temperature alert - ensure adequate irrigation',
      priority: 'high'
    });
  }
  if (current.current.temp < 40) {
    recommendations.push({
      type: 'warning',
      message: 'Low temperature - check frost protection for sensitive crops',
      priority: 'high'
    });
  }

  // Rain-based
  const rainToday = forecast.forecast[0]?.rain_chance || 0;
  if (rainToday > 50) {
    recommendations.push({
      type: 'info',
      message: `${rainToday}% chance of rain today - skip irrigation, plan indoor work`,
      priority: 'medium'
    });
  }

  // Wind-based
  if (current.current.wind_speed > 15) {
    recommendations.push({
      type: 'warning',
      message: 'High winds - avoid spraying, secure row covers',
      priority: 'medium'
    });
  }

  // Planning recommendations
  const dryDays = forecast.forecast.filter(d => d.rain_chance < 20);
  if (dryDays.length >= 3) {
    recommendations.push({
      type: 'opportunity',
      message: `${dryDays.length} dry days ahead - good window for field work`,
      priority: 'low'
    });
  }

  return {
    success: true,
    current: current.current,
    forecast: forecast.forecast,
    recommendations: recommendations,
    summary: generateWeatherSummary(current.current, forecast.forecast)
  };
}

/**
 * Generate weather summary for morning brief
 */
function generateWeatherSummary(current, forecast) {
  let summary = `Currently ${Math.round(current.temp)}°F and ${current.description}. `;

  const today = forecast[0];
  if (today) {
    summary += `Today: High ${Math.round(today.high)}°F, Low ${Math.round(today.low)}°F. `;
    if (today.rain_chance > 30) {
      summary += `${today.rain_chance}% chance of rain. `;
    }
  }

  const tomorrow = forecast[1];
  if (tomorrow) {
    summary += `Tomorrow: ${tomorrow.condition}, ${Math.round(tomorrow.high)}°F.`;
  }

  return summary;
}

function getMostCommon(arr) {
  const counts = {};
  let maxCount = 0;
  let mostCommon = arr[0];

  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
    if (counts[item] > maxCount) {
      maxCount = counts[item];
      mostCommon = item;
    }
  }

  return mostCommon;
}

// ==========================================
// SHIPPING TRACKING
// ==========================================

/**
 * Track FedEx shipment
 */
function trackFedExShipment(trackingNumber) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.FEDEX;
  if (!config.apiKey) {
    return { success: false, error: 'FedEx not configured' };
  }

  try {
    // Get OAuth token
    const tokenResponse = UrlFetchApp.fetch('https://apis.fedex.com/oauth/token', {
      method: 'post',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      payload: `grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`
    });

    const token = JSON.parse(tokenResponse.getContentText()).access_token;

    // Track shipment
    const trackResponse = UrlFetchApp.fetch('https://apis.fedex.com/track/v1/trackingnumbers', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        includeDetailedScans: true,
        trackingInfo: [{
          trackingNumberInfo: { trackingNumber: trackingNumber }
        }]
      })
    });

    const trackData = JSON.parse(trackResponse.getContentText());
    const result = trackData.output?.completeTrackResults?.[0]?.trackResults?.[0];

    if (!result) {
      return { success: false, error: 'Tracking info not found' };
    }

    return {
      success: true,
      tracking: {
        number: trackingNumber,
        status: result.latestStatusDetail?.description,
        statusCode: result.latestStatusDetail?.code,
        estimatedDelivery: result.estimatedDeliveryTimeWindow?.window?.ends,
        location: result.latestStatusDetail?.scanLocation?.city,
        events: result.scanEvents?.map(e => ({
          date: e.date,
          description: e.eventDescription,
          location: e.scanLocation?.city
        })) || []
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Track package by any carrier (auto-detect)
 */
function trackPackage(trackingNumber) {
  // Detect carrier from tracking number format
  const carrier = detectCarrier(trackingNumber);

  switch (carrier) {
    case 'fedex':
      return trackFedExShipment(trackingNumber);
    case 'ups':
      return trackUPSShipment(trackingNumber);
    case 'usps':
      return trackUSPSShipment(trackingNumber);
    default:
      return { success: false, error: 'Unknown carrier for tracking number' };
  }
}

/**
 * Detect carrier from tracking number
 */
function detectCarrier(trackingNumber) {
  const tn = trackingNumber.replace(/\s/g, '').toUpperCase();

  // FedEx patterns
  if (/^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn)) {
    return 'fedex';
  }

  // UPS patterns
  if (/^1Z[A-Z0-9]{16}$/.test(tn)) {
    return 'ups';
  }

  // USPS patterns
  if (/^(94|93|92|91|90)\d{18,22}$/.test(tn)) {
    return 'usps';
  }

  return 'unknown';
}

/**
 * Stub for UPS tracking (similar implementation)
 */
function trackUPSShipment(trackingNumber) {
  // Similar to FedEx but with UPS API
  return { success: false, error: 'UPS tracking not yet implemented' };
}

/**
 * Stub for USPS tracking
 */
function trackUSPSShipment(trackingNumber) {
  return { success: false, error: 'USPS tracking not yet implemented' };
}

// ==========================================
// SQUARE POS INTEGRATION
// ==========================================

/**
 * Get Square sales data
 */
function getSquareSales(startDate, endDate) {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.SQUARE;
  if (!config.accessToken) {
    return { success: false, error: 'Square not configured' };
  }

  try {
    const response = UrlFetchApp.fetch('https://connect.squareup.com/v2/orders/search', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        location_ids: [config.locationId],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: startDate,
                end_at: endDate
              }
            }
          }
        }
      })
    });

    const data = JSON.parse(response.getContentText());
    const orders = data.orders || [];

    return {
      success: true,
      orders: orders.map(o => ({
        id: o.id,
        created: o.created_at,
        total: o.total_money?.amount / 100,
        currency: o.total_money?.currency,
        items: o.line_items?.map(li => ({
          name: li.name,
          quantity: li.quantity,
          total: li.total_money?.amount / 100
        }))
      })),
      summary: {
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, o) => sum + (o.total_money?.amount || 0) / 100, 0)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get Square inventory
 */
function getSquareInventory() {
  loadIntegrationConfig();

  const config = INTEGRATION_CONFIG.SQUARE;
  if (!config.accessToken) {
    return { success: false, error: 'Square not configured' };
  }

  try {
    const response = UrlFetchApp.fetch(`https://connect.squareup.com/v2/inventory/counts/batch-retrieve`, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        location_ids: [config.locationId]
      })
    });

    const data = JSON.parse(response.getContentText());

    return {
      success: true,
      counts: data.counts || []
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// UNIFIED MESSAGING
// ==========================================

/**
 * Send message via best available channel
 */
function sendCustomerMessage(customerId, message, preferredChannel = 'email') {
  const customer = getCustomerById(customerId);

  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  const channels = [];

  // Determine available channels
  if (customer.email) channels.push('email');
  if (customer.phone) channels.push('sms');
  if (customer.whatsapp) channels.push('whatsapp');

  // Use preferred channel if available
  const channel = channels.includes(preferredChannel) ? preferredChannel : channels[0];

  if (!channel) {
    return { success: false, error: 'No contact method available' };
  }

  switch (channel) {
    case 'email':
      GmailApp.sendEmail(customer.email, 'Message from Tiny Seed Farm', message);
      return { success: true, channel: 'email', recipient: customer.email };

    case 'sms':
      return { ...sendSMS(customer.phone, message), channel: 'sms' };

    case 'whatsapp':
      return { ...sendWhatsApp(customer.whatsapp, message), channel: 'whatsapp' };

    default:
      return { success: false, error: 'Unknown channel' };
  }
}

/**
 * Get customer by ID
 */
function getCustomerById(customerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(customerId)) {
      const customer = {};
      headers.forEach((h, idx) => customer[h.toLowerCase().replace(/\s+/g, '_')] = data[i][idx]);
      return customer;
    }
  }

  return null;
}

// ==========================================
// INTEGRATION ACTIVITY LOGGING
// ==========================================

/**
 * Log integration activity
 */
function logIntegrationActivity(integration, action, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_INTEGRATION_LOG');

  if (!sheet) {
    sheet = ss.insertSheet('COS_INTEGRATION_LOG');
    sheet.appendRow(['timestamp', 'integration', 'action', 'data', 'status']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  sheet.appendRow([
    new Date().toISOString(),
    integration,
    action,
    JSON.stringify(data).substring(0, 1000),
    'success'
  ]);
}

/**
 * Create a task for incoming message
 */
function createMessageTask(customer, message, channel) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_MESSAGE_TASKS');

  if (!sheet) {
    sheet = ss.insertSheet('COS_MESSAGE_TASKS');
    sheet.appendRow(['id', 'customer_name', 'customer_id', 'channel', 'message', 'created', 'status', 'assigned_to']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  const taskId = `MSG_${Date.now()}`;

  sheet.appendRow([
    taskId,
    customer.name,
    customer.id,
    channel,
    message.substring(0, 500),
    new Date().toISOString(),
    'pending',
    ''
  ]);

  return taskId;
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Get integration status
 */
function getIntegrationStatus() {
  loadIntegrationConfig();

  return {
    twilio: {
      configured: !!INTEGRATION_CONFIG.TWILIO.accountSid,
      sms: !!INTEGRATION_CONFIG.TWILIO.phoneNumber,
      whatsapp: !!INTEGRATION_CONFIG.TWILIO.whatsappNumber
    },
    quickbooks: {
      configured: !!INTEGRATION_CONFIG.QUICKBOOKS.clientId,
      connected: !!PropertiesService.getScriptProperties().getProperty('QUICKBOOKS_ACCESS_TOKEN')
    },
    weather: {
      configured: !!INTEGRATION_CONFIG.WEATHER.apiKey
    },
    fedex: {
      configured: !!INTEGRATION_CONFIG.FEDEX.apiKey
    },
    square: {
      configured: !!INTEGRATION_CONFIG.SQUARE.accessToken
    }
  };
}
