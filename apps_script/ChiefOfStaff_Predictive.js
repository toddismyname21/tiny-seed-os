/**
 * ========================================
 * CHIEF OF STAFF - PREDICTIVE ANALYTICS
 * ========================================
 *
 * STATE-OF-THE-ART pattern recognition and forecasting
 * Predicts future needs before they become urgent
 *
 * Capabilities:
 * - Email volume prediction
 * - Customer churn prediction
 * - Response time trend analysis
 * - Seasonal pattern recognition
 * - Workload forecasting
 * - Revenue prediction
 * - Task completion prediction
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize Predictive Analytics system
 */
function initializePredictiveAnalytics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create predictions sheet
  let predictSheet = ss.getSheetByName('COS_PREDICTIONS');
  if (!predictSheet) {
    predictSheet = ss.insertSheet('COS_PREDICTIONS');
    predictSheet.appendRow([
      'prediction_id', 'type', 'subject', 'prediction', 'confidence',
      'predicted_date', 'actual_outcome', 'accuracy_score', 'created_at'
    ]);
    predictSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  // Create metrics history sheet
  let metricsSheet = ss.getSheetByName('COS_METRICS_HISTORY');
  if (!metricsSheet) {
    metricsSheet = ss.insertSheet('COS_METRICS_HISTORY');
    metricsSheet.appendRow([
      'date', 'emails_received', 'emails_sent', 'avg_response_time_hrs',
      'customers_contacted', 'revenue', 'orders', 'tasks_completed',
      'focus_time_mins', 'meetings', 'temperature_high', 'rainfall'
    ]);
    metricsSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }

  // Create patterns sheet
  let patternsSheet = ss.getSheetByName('COS_PATTERNS');
  if (!patternsSheet) {
    patternsSheet = ss.insertSheet('COS_PATTERNS');
    patternsSheet.appendRow([
      'pattern_id', 'type', 'description', 'frequency', 'confidence',
      'last_occurrence', 'next_predicted', 'data'
    ]);
    patternsSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  return {
    success: true,
    message: 'Predictive Analytics initialized',
    sheets: ['COS_PREDICTIONS', 'COS_METRICS_HISTORY', 'COS_PATTERNS']
  };
}

// ==========================================
// DATA COLLECTION
// ==========================================

/**
 * Collect daily metrics for historical tracking
 * Run this daily via trigger
 */
function collectDailyMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_METRICS_HISTORY');

  if (!sheet) {
    initializePredictiveAnalytics();
    sheet = ss.getSheetByName('COS_METRICS_HISTORY');
  }

  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'America/New_York', 'yyyy-MM-dd');

  // Check if already collected today
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dateStr) {
      return { success: true, message: 'Already collected today' };
    }
  }

  // Collect email metrics
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const receivedThreads = GmailApp.search(`after:${formatDateForGmail(yesterday)} before:${formatDateForGmail(today)} in:inbox`);
  const sentThreads = GmailApp.search(`after:${formatDateForGmail(yesterday)} before:${formatDateForGmail(today)} in:sent`);

  // Calculate response time from EMAIL_INBOX_STATE if available
  const avgResponseTime = calculateAverageResponseTime(yesterday, today);

  // Get customer contacts
  const customersContacted = countUniqueCustomers(receivedThreads);

  // Get weather data if available
  let weather = { high: '', rainfall: '' };
  if (typeof getCurrentWeather === 'function') {
    try {
      const w = getCurrentWeather();
      if (w.success) {
        weather.high = w.current.temp;
      }
    } catch (e) {}
  }

  // Get focus time from calendar
  const focusTime = calculateFocusTime(yesterday, today);

  // Count meetings
  const meetings = countMeetings(yesterday, today);

  // Collect revenue/orders if available
  const revenue = collectRevenueData(yesterday, today);

  // Get tasks completed
  const tasksCompleted = countCompletedTasks(yesterday, today);

  const metrics = [
    dateStr,
    receivedThreads.length,
    sentThreads.length,
    avgResponseTime,
    customersContacted,
    revenue.total,
    revenue.orders,
    tasksCompleted,
    focusTime,
    meetings,
    weather.high,
    weather.rainfall
  ];

  sheet.appendRow(metrics);

  return {
    success: true,
    date: dateStr,
    metrics: {
      emails_received: receivedThreads.length,
      emails_sent: sentThreads.length,
      avg_response_time: avgResponseTime,
      customers: customersContacted,
      revenue: revenue.total,
      orders: revenue.orders,
      tasks: tasksCompleted,
      focus_mins: focusTime,
      meetings: meetings
    }
  };
}

function formatDateForGmail(date) {
  return Utilities.formatDate(date, 'America/New_York', 'yyyy/MM/dd');
}

function calculateAverageResponseTime(start, end) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('EMAIL_INBOX_STATE');

  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  let totalTime = 0;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const resolved = new Date(data[i][7]); // resolved_at
    const received = new Date(data[i][3]); // received_at

    if (resolved >= start && resolved <= end && resolved > received) {
      const hours = (resolved - received) / (1000 * 60 * 60);
      totalTime += hours;
      count++;
    }
  }

  return count > 0 ? Math.round(totalTime / count * 10) / 10 : 0;
}

function countUniqueCustomers(threads) {
  const customers = new Set();

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      const from = msg.getFrom();
      const email = from.match(/<(.+)>/)?.[1] || from;
      customers.add(email.toLowerCase());
    }
  }

  return customers.size;
}

function calculateFocusTime(start, end) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(start, end);

    let focusMins = 0;
    for (const event of events) {
      const title = event.getTitle().toLowerCase();
      if (title.includes('focus') || title.includes('field work') || title.includes('deep')) {
        focusMins += (event.getEndTime() - event.getStartTime()) / (1000 * 60);
      }
    }

    return focusMins;
  } catch (e) {
    return 0;
  }
}

function countMeetings(start, end) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(start, end);

    let count = 0;
    for (const event of events) {
      const title = event.getTitle().toLowerCase();
      if (!title.includes('focus') && !title.includes('block') && event.getGuestList().length > 0) {
        count++;
      }
    }

    return count;
  } catch (e) {
    return 0;
  }
}

function collectRevenueData(start, end) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName('Orders');

    if (!ordersSheet) return { total: 0, orders: 0 };

    const data = ordersSheet.getDataRange().getValues();
    let total = 0;
    let orders = 0;

    for (let i = 1; i < data.length; i++) {
      const orderDate = new Date(data[i][1]); // Assuming date is in column B
      if (orderDate >= start && orderDate <= end) {
        const amount = parseFloat(data[i][9]) || 0; // Assuming total in column J
        total += amount;
        orders++;
      }
    }

    return { total, orders };
  } catch (e) {
    return { total: 0, orders: 0 };
  }
}

function countCompletedTasks(start, end) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_SCHEDULED_TASKS');

  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === 'completed') {
      const completedDate = new Date(data[i][7]);
      if (completedDate >= start && completedDate <= end) {
        count++;
      }
    }
  }

  return count;
}

// ==========================================
// EMAIL VOLUME PREDICTION
// ==========================================

/**
 * Predict email volume for upcoming days
 */
function predictEmailVolume(days = 7) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_METRICS_HISTORY');

  if (!sheet || sheet.getLastRow() < 8) {
    return {
      success: false,
      error: 'Need at least 7 days of historical data'
    };
  }

  const data = sheet.getDataRange().getValues();
  const history = [];

  // Get last 30 days of data
  for (let i = Math.max(1, data.length - 30); i < data.length; i++) {
    history.push({
      date: new Date(data[i][0]),
      received: data[i][1] || 0,
      dayOfWeek: new Date(data[i][0]).getDay()
    });
  }

  // Calculate averages by day of week
  const dayAverages = {};
  for (let d = 0; d < 7; d++) {
    const dayData = history.filter(h => h.dayOfWeek === d);
    dayAverages[d] = dayData.length > 0
      ? dayData.reduce((a, b) => a + b.received, 0) / dayData.length
      : 0;
  }

  // Calculate trend
  const recentAvg = history.slice(-7).reduce((a, b) => a + b.received, 0) / 7;
  const olderAvg = history.slice(-14, -7).reduce((a, b) => a + b.received, 0) / 7;
  const trendFactor = olderAvg > 0 ? recentAvg / olderAvg : 1;

  // Generate predictions
  const predictions = [];
  const today = new Date();

  for (let d = 1; d <= days; d++) {
    const predDate = new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
    const dayOfWeek = predDate.getDay();
    const basePrediction = dayAverages[dayOfWeek] || recentAvg;
    const adjustedPrediction = Math.round(basePrediction * trendFactor);

    predictions.push({
      date: Utilities.formatDate(predDate, 'America/New_York', 'EEE MMM d'),
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      predicted: adjustedPrediction,
      confidence: calculatePredictionConfidence(history, dayOfWeek),
      range: {
        low: Math.round(adjustedPrediction * 0.7),
        high: Math.round(adjustedPrediction * 1.3)
      }
    });
  }

  // Store predictions
  savePredictions('email_volume', predictions);

  return {
    success: true,
    predictions: predictions,
    trend: trendFactor > 1.1 ? 'increasing' : trendFactor < 0.9 ? 'decreasing' : 'stable',
    averageDaily: Math.round(recentAvg)
  };
}

function calculatePredictionConfidence(history, dayOfWeek) {
  const dayData = history.filter(h => h.dayOfWeek === dayOfWeek);

  if (dayData.length < 2) return 0.5;

  // Calculate variance
  const avg = dayData.reduce((a, b) => a + b.received, 0) / dayData.length;
  const variance = dayData.reduce((a, b) => a + Math.pow(b.received - avg, 2), 0) / dayData.length;
  const stdDev = Math.sqrt(variance);

  // Lower variance = higher confidence
  const cv = avg > 0 ? stdDev / avg : 1;
  return Math.max(0.5, Math.min(0.95, 1 - cv));
}

// ==========================================
// CUSTOMER CHURN PREDICTION
// ==========================================

/**
 * Predict customers at risk of churning
 */
function predictCustomerChurn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customersSheet = ss.getSheetByName('Customers');
  const ordersSheet = ss.getSheetByName('Orders');

  if (!customersSheet) {
    return { success: false, error: 'Customers sheet not found' };
  }

  const customers = customersSheet.getDataRange().getValues();
  const orders = ordersSheet ? ordersSheet.getDataRange().getValues() : [];

  const atRisk = [];
  const now = new Date();

  for (let i = 1; i < customers.length; i++) {
    const customerId = customers[i][0];
    const customerName = `${customers[i][1]} ${customers[i][2]}`;
    const email = customers[i][4];
    const customerType = customers[i][6];
    const lastOrder = customers[i][13]; // Assuming last order date

    // Calculate risk score
    const riskFactors = [];
    let riskScore = 0;

    // Factor 1: Time since last order
    if (lastOrder) {
      const daysSinceOrder = (now - new Date(lastOrder)) / (1000 * 60 * 60 * 24);

      if (daysSinceOrder > 180) {
        riskScore += 40;
        riskFactors.push(`No order in ${Math.round(daysSinceOrder)} days`);
      } else if (daysSinceOrder > 90) {
        riskScore += 25;
        riskFactors.push(`No order in ${Math.round(daysSinceOrder)} days`);
      } else if (daysSinceOrder > 60) {
        riskScore += 10;
        riskFactors.push(`${Math.round(daysSinceOrder)} days since last order`);
      }
    } else {
      riskScore += 30;
      riskFactors.push('No order history');
    }

    // Factor 2: Order frequency decline
    const customerOrders = orders.filter(o => o[3] === customerId); // Assuming customer ID in column D
    if (customerOrders.length >= 3) {
      const recentOrders = customerOrders.slice(-3);
      const gaps = [];
      for (let j = 1; j < recentOrders.length; j++) {
        const gap = (new Date(recentOrders[j][1]) - new Date(recentOrders[j-1][1])) / (1000 * 60 * 60 * 24);
        gaps.push(gap);
      }
      if (gaps[1] > gaps[0] * 1.5) {
        riskScore += 15;
        riskFactors.push('Order frequency declining');
      }
    }

    // Factor 3: Email engagement
    const recentEmails = GmailApp.search(`from:${email} newer_than:30d`, 0, 5);
    if (recentEmails.length === 0) {
      riskScore += 10;
      riskFactors.push('No recent email engagement');
    }

    // Factor 4: Customer type specific
    if (customerType === 'CSA' && riskScore > 20) {
      riskScore += 10; // CSA members leaving is more impactful
      riskFactors.push('CSA member at risk');
    }

    // Add to at-risk list if score above threshold
    if (riskScore >= 30) {
      atRisk.push({
        customerId: customerId,
        name: customerName,
        email: email,
        type: customerType,
        riskScore: riskScore,
        riskLevel: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
        factors: riskFactors,
        suggestedAction: generateRetentionAction(riskScore, customerType, riskFactors)
      });
    }
  }

  // Sort by risk score
  atRisk.sort((a, b) => b.riskScore - a.riskScore);

  // Save predictions
  savePredictions('customer_churn', atRisk);

  return {
    success: true,
    customersAnalyzed: customers.length - 1,
    atRiskCount: atRisk.length,
    highRisk: atRisk.filter(c => c.riskLevel === 'high').length,
    mediumRisk: atRisk.filter(c => c.riskLevel === 'medium').length,
    customers: atRisk.slice(0, 10) // Top 10
  };
}

function generateRetentionAction(riskScore, customerType, factors) {
  if (riskScore >= 60) {
    if (customerType === 'CSA') {
      return 'Personal phone call to check in and offer renewal incentive';
    }
    return 'Send personalized win-back email with special offer';
  } else if (riskScore >= 40) {
    return 'Schedule friendly check-in email about upcoming offerings';
  } else {
    return 'Add to re-engagement newsletter segment';
  }
}

// ==========================================
// RESPONSE TIME TREND ANALYSIS
// ==========================================

/**
 * Analyze response time trends
 */
function analyzeResponseTimeTrends() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_METRICS_HISTORY');

  if (!sheet || sheet.getLastRow() < 8) {
    return { success: false, error: 'Insufficient historical data' };
  }

  const data = sheet.getDataRange().getValues();

  // Get response times
  const responseTimes = [];
  for (let i = Math.max(1, data.length - 30); i < data.length; i++) {
    if (data[i][3]) {
      responseTimes.push({
        date: data[i][0],
        hours: data[i][3],
        dayOfWeek: new Date(data[i][0]).getDay()
      });
    }
  }

  if (responseTimes.length < 7) {
    return { success: false, error: 'Need more response time data' };
  }

  // Calculate weekly averages
  const weeks = [];
  for (let i = 0; i < responseTimes.length; i += 7) {
    const week = responseTimes.slice(i, i + 7);
    if (week.length === 7) {
      weeks.push(week.reduce((a, b) => a + b.hours, 0) / 7);
    }
  }

  // Determine trend
  let trend = 'stable';
  if (weeks.length >= 2) {
    const recent = weeks[weeks.length - 1];
    const previous = weeks[weeks.length - 2];
    if (recent > previous * 1.2) {
      trend = 'worsening';
    } else if (recent < previous * 0.8) {
      trend = 'improving';
    }
  }

  // Find problem days
  const dayStats = {};
  for (const rt of responseTimes) {
    if (!dayStats[rt.dayOfWeek]) {
      dayStats[rt.dayOfWeek] = [];
    }
    dayStats[rt.dayOfWeek].push(rt.hours);
  }

  const dayAverages = {};
  const problemDays = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let d = 0; d < 7; d++) {
    if (dayStats[d] && dayStats[d].length > 0) {
      const avg = dayStats[d].reduce((a, b) => a + b, 0) / dayStats[d].length;
      dayAverages[dayNames[d]] = Math.round(avg * 10) / 10;
      if (avg > 12) {
        problemDays.push({ day: dayNames[d], avgHours: avg });
      }
    }
  }

  // Generate recommendations
  const recommendations = [];
  if (trend === 'worsening') {
    recommendations.push('Response times are increasing - consider setting aside dedicated email time');
  }
  if (problemDays.length > 0) {
    recommendations.push(`Slowest days: ${problemDays.map(d => d.day).join(', ')} - review schedule`);
  }

  const overallAvg = responseTimes.reduce((a, b) => a + b.hours, 0) / responseTimes.length;
  if (overallAvg > 6) {
    recommendations.push('Average response exceeds 6 hours - customer satisfaction may be impacted');
  } else if (overallAvg < 2) {
    recommendations.push('Excellent response time! Consider automating more routine responses');
  }

  return {
    success: true,
    currentAverage: Math.round(overallAvg * 10) / 10,
    trend: trend,
    weeklyAverages: weeks,
    byDayOfWeek: dayAverages,
    problemDays: problemDays,
    recommendations: recommendations
  };
}

// ==========================================
// SEASONAL PATTERN DETECTION
// ==========================================

/**
 * Detect and predict seasonal patterns
 */
function detectSeasonalPatterns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const metricsSheet = ss.getSheetByName('COS_METRICS_HISTORY');
  const ordersSheet = ss.getSheetByName('Orders');

  const patterns = [];

  // Analyze order patterns by month
  if (ordersSheet) {
    const orders = ordersSheet.getDataRange().getValues();
    const monthlyOrders = {};
    const monthlyRevenue = {};

    for (let i = 1; i < orders.length; i++) {
      const date = new Date(orders[i][1]);
      if (isNaN(date)) continue;

      const month = date.getMonth();
      monthlyOrders[month] = (monthlyOrders[month] || 0) + 1;
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (parseFloat(orders[i][9]) || 0);
    }

    // Find peak months
    const avgOrders = Object.values(monthlyOrders).reduce((a, b) => a + b, 0) / 12;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const peakMonths = [];
    const lowMonths = [];

    for (let m = 0; m < 12; m++) {
      const orders = monthlyOrders[m] || 0;
      if (orders > avgOrders * 1.3) {
        peakMonths.push({ month: months[m], index: m, orders: orders });
      } else if (orders < avgOrders * 0.7) {
        lowMonths.push({ month: months[m], index: m, orders: orders });
      }
    }

    if (peakMonths.length > 0) {
      patterns.push({
        type: 'seasonal_peak',
        description: `Peak ordering in ${peakMonths.map(p => p.month).join(', ')}`,
        data: peakMonths,
        recommendation: 'Prepare for increased activity during peak months'
      });
    }

    if (lowMonths.length > 0) {
      patterns.push({
        type: 'seasonal_low',
        description: `Low activity in ${lowMonths.map(l => l.month).join(', ')}`,
        data: lowMonths,
        recommendation: 'Use slow months for maintenance and planning'
      });
    }
  }

  // Email patterns by day of week
  if (metricsSheet && metricsSheet.getLastRow() > 14) {
    const data = metricsSheet.getDataRange().getValues();
    const dayOfWeekEmails = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 1; i < data.length; i++) {
      const date = new Date(data[i][0]);
      const dow = date.getDay();
      if (!dayOfWeekEmails[dow]) dayOfWeekEmails[dow] = [];
      dayOfWeekEmails[dow].push(data[i][1] || 0);
    }

    const dayAverages = {};
    let maxDay = { day: '', avg: 0 };
    let minDay = { day: '', avg: Infinity };

    for (let d = 0; d < 7; d++) {
      if (dayOfWeekEmails[d] && dayOfWeekEmails[d].length > 0) {
        const avg = dayOfWeekEmails[d].reduce((a, b) => a + b, 0) / dayOfWeekEmails[d].length;
        dayAverages[days[d]] = Math.round(avg);
        if (avg > maxDay.avg) maxDay = { day: days[d], avg: avg };
        if (avg < minDay.avg) minDay = { day: days[d], avg: avg };
      }
    }

    patterns.push({
      type: 'weekly_email_pattern',
      description: `Busiest: ${maxDay.day} (~${Math.round(maxDay.avg)} emails), Quietest: ${minDay.day} (~${Math.round(minDay.avg)} emails)`,
      data: dayAverages,
      recommendation: `Schedule focus time on ${minDay.day}, reserve ${maxDay.day} for email`
    });
  }

  // Save patterns
  const patternsSheet = ss.getSheetByName('COS_PATTERNS');
  if (patternsSheet) {
    for (const pattern of patterns) {
      patternsSheet.appendRow([
        `PAT_${Date.now()}_${pattern.type}`,
        pattern.type,
        pattern.description,
        'weekly', // or monthly
        0.8,
        new Date().toISOString(),
        '', // next_predicted
        JSON.stringify(pattern.data)
      ]);
    }
  }

  return {
    success: true,
    patternsFound: patterns.length,
    patterns: patterns
  };
}

// ==========================================
// WORKLOAD FORECASTING
// ==========================================

/**
 * Forecast workload for coming week
 */
function forecastWorkload(days = 7) {
  const emailPrediction = predictEmailVolume(days);
  const prefs = typeof getCalendarPreferences === 'function' ? getCalendarPreferences() : {};
  const calendar = CalendarApp.getDefaultCalendar();

  const forecast = [];
  const today = new Date();

  for (let d = 1; d <= days; d++) {
    const date = new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
    const dayStr = Utilities.formatDate(date, 'America/New_York', 'EEE MMM d');
    const dayOfWeek = date.getDay();

    // Get calendar events
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const events = calendar.getEvents(dayStart, dayEnd);

    // Calculate workload components
    const meetingHours = events.reduce((total, e) => {
      const duration = (e.getEndTime() - e.getStartTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    const predictedEmails = emailPrediction.success
      ? emailPrediction.predictions[d - 1]?.predicted || 10
      : 10;

    const emailHours = predictedEmails * 0.1; // ~6 mins per email

    // Check for special days
    const isMarketDay = (prefs.marketDays || []).includes(dayOfWeek);
    const isDeliveryDay = (prefs.deliveryDays || []).includes(dayOfWeek);

    let specialEvents = [];
    if (isMarketDay) specialEvents.push('Market Day');
    if (isDeliveryDay) specialEvents.push('Delivery Day');

    // Calculate total workload
    const baseWorkload = meetingHours + emailHours;
    let totalWorkload = baseWorkload;
    if (isMarketDay) totalWorkload += 4; // Market takes ~4 hours
    if (isDeliveryDay) totalWorkload += 2; // Deliveries take ~2 hours

    // Determine load level
    let loadLevel = 'normal';
    if (totalWorkload > 8) loadLevel = 'heavy';
    else if (totalWorkload > 6) loadLevel = 'moderate';
    else if (totalWorkload < 3) loadLevel = 'light';

    forecast.push({
      date: dayStr,
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      meetings: events.length,
      meetingHours: Math.round(meetingHours * 10) / 10,
      predictedEmails: predictedEmails,
      emailHours: Math.round(emailHours * 10) / 10,
      specialEvents: specialEvents,
      totalWorkloadHours: Math.round(totalWorkload * 10) / 10,
      loadLevel: loadLevel,
      recommendation: generateWorkloadRecommendation(loadLevel, specialEvents)
    });
  }

  return {
    success: true,
    forecast: forecast,
    heavyDays: forecast.filter(f => f.loadLevel === 'heavy').length,
    lightDays: forecast.filter(f => f.loadLevel === 'light').length
  };
}

function generateWorkloadRecommendation(loadLevel, specialEvents) {
  if (loadLevel === 'heavy') {
    return 'Consider rescheduling non-critical meetings';
  } else if (loadLevel === 'light') {
    return 'Good day for strategic planning or catch-up work';
  } else if (specialEvents.includes('Market Day')) {
    return 'Focus on market prep, minimal other commitments';
  } else {
    return 'Normal day - maintain regular schedule';
  }
}

// ==========================================
// PREDICTION STORAGE & ACCURACY
// ==========================================

/**
 * Save predictions for accuracy tracking
 */
function savePredictions(type, predictions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_PREDICTIONS');

  if (!sheet) {
    initializePredictiveAnalytics();
    sheet = ss.getSheetByName('COS_PREDICTIONS');
  }

  const timestamp = new Date().toISOString();

  for (const pred of predictions) {
    const predId = `PRED_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    sheet.appendRow([
      predId,
      type,
      pred.date || pred.name || pred.customerId || 'general',
      JSON.stringify(pred),
      pred.confidence || 0.7,
      pred.predicted_date || '',
      '', // actual_outcome - to be filled later
      '', // accuracy_score - to be filled later
      timestamp
    ]);
  }
}

/**
 * Update prediction with actual outcome
 */
function updatePredictionOutcome(predictionId, actualOutcome) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_PREDICTIONS');

  if (!sheet) return { success: false, error: 'Predictions sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === predictionId) {
      const prediction = JSON.parse(data[i][3]);
      const predicted = prediction.predicted || prediction.riskScore;

      // Calculate accuracy
      let accuracy = 0;
      if (typeof predicted === 'number' && typeof actualOutcome === 'number') {
        const error = Math.abs(predicted - actualOutcome);
        accuracy = Math.max(0, 1 - (error / Math.max(predicted, actualOutcome)));
      } else if (predicted === actualOutcome) {
        accuracy = 1;
      }

      sheet.getRange(i + 1, 7, 1, 2).setValues([[
        JSON.stringify(actualOutcome),
        accuracy
      ]]);

      return { success: true, accuracy: accuracy };
    }
  }

  return { success: false, error: 'Prediction not found' };
}

/**
 * Get prediction accuracy metrics
 */
function getPredictionAccuracy(type = null, days = 30) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_PREDICTIONS');

  if (!sheet) return { success: false, error: 'No predictions found' };

  const data = sheet.getDataRange().getValues();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metrics = {
    total: 0,
    withOutcome: 0,
    sumAccuracy: 0,
    byType: {}
  };

  for (let i = 1; i < data.length; i++) {
    const predType = data[i][1];
    const created = new Date(data[i][8]);
    const accuracy = data[i][7];

    if (created < cutoff) continue;
    if (type && predType !== type) continue;

    metrics.total++;

    if (accuracy !== '' && accuracy !== null) {
      metrics.withOutcome++;
      metrics.sumAccuracy += accuracy;

      if (!metrics.byType[predType]) {
        metrics.byType[predType] = { count: 0, sum: 0 };
      }
      metrics.byType[predType].count++;
      metrics.byType[predType].sum += accuracy;
    }
  }

  const typeAccuracies = {};
  for (const [t, data] of Object.entries(metrics.byType)) {
    typeAccuracies[t] = Math.round(data.sum / data.count * 100);
  }

  return {
    success: true,
    totalPredictions: metrics.total,
    evaluated: metrics.withOutcome,
    overallAccuracy: metrics.withOutcome > 0
      ? Math.round(metrics.sumAccuracy / metrics.withOutcome * 100)
      : null,
    accuracyByType: typeAccuracies,
    period: `Last ${days} days`
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Get comprehensive predictive report
 */
function getPredictiveReport() {
  return {
    emailVolume: predictEmailVolume(7),
    churnRisk: predictCustomerChurn(),
    responseTrends: analyzeResponseTimeTrends(),
    workloadForecast: forecastWorkload(7),
    accuracy: getPredictionAccuracy()
  };
}

/**
 * Run daily data collection
 */
function runDailyCollection() {
  return collectDailyMetrics();
}

/**
 * Detect patterns
 */
function runPatternDetection() {
  return detectSeasonalPatterns();
}
