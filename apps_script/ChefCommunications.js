/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * CHEF COMMUNICATIONS ENGINE - PROACTIVE CUSTOMER ENGAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Automated and personalized communication with wholesale customers (chefs)
 *
 * Features:
 * - Weekly availability blasts (SMS + Email)
 * - Standing order shortage notifications
 * - Fresh harvest alerts for premium products
 * - Personalized recommendations based on order history
 *
 * Created: 2026-01-22
 * Backend Claude - STATE OF THE ART
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const CHEF_COMM_CONFIG = {
  FARM_NAME: 'Tiny Seed Farm',
  FARM_PHONE: '+14128662259',
  FARM_EMAIL: 'orders@tinyseedfarm.com',
  ORDER_URL: 'https://tinyseedfarm.com/wholesale',
  SHEETS: {
    CUSTOMERS: 'WHOLESALE_CUSTOMERS',
    COMM_LOG: 'CHEF_COMM_LOG',
    PREFERENCES: 'CHEF_PREFERENCES'
  },
  SMS_CHAR_LIMIT: 160,
  // Product categories for recommendations
  CATEGORIES: {
    GREENS: ['lettuce', 'spinach', 'arugula', 'kale', 'chard', 'mesclun'],
    HERBS: ['basil', 'cilantro', 'parsley', 'dill', 'mint', 'oregano'],
    TOMATOES: ['tomato', 'cherry tomato', 'heirloom tomato'],
    ROOTS: ['carrot', 'beet', 'radish', 'turnip'],
    ALLIUMS: ['onion', 'garlic', 'leek', 'scallion']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Initialize chef communications sheets
 */
function initializeChefCommunications() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Communication log
  createSheetIfNotExists(ss, CHEF_COMM_CONFIG.SHEETS.COMM_LOG, [
    'Comm_ID', 'Timestamp', 'Customer_ID', 'Customer_Name',
    'Channel', 'Type', 'Subject', 'Message_Preview',
    'Status', 'Response', 'Error'
  ]);

  // Chef preferences
  createSheetIfNotExists(ss, CHEF_COMM_CONFIG.SHEETS.PREFERENCES, [
    'Customer_ID', 'Favorite_Products', 'Avoid_Products',
    'Preferred_Channel', 'Best_Contact_Time',
    'Weekly_Availability_OptIn', 'Fresh_Harvest_Alerts_OptIn',
    'Order_Reminder_OptIn', 'Last_Updated'
  ]);

  return { success: true, message: 'Chef communications module initialized' };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WEEKLY AVAILABILITY BLAST
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Send weekly availability to all opted-in chefs
 * SMS: Short list of what's fresh
 * Email: Full availability with details
 */
function sendWeeklyAvailabilityBlast() {
  try {
    const availability = getWeeklyAvailability();
    if (!availability.success || availability.available_now.length === 0) {
      Logger.log('No availability to send');
      return { success: true, message: 'No products available this week', sent: 0 };
    }

    const customers = getOptedInChefs('weekly_availability');
    const results = {
      sms_sent: 0,
      email_sent: 0,
      errors: []
    };

    for (const customer of customers) {
      try {
        // Send SMS if opted in and has phone
        if (customer.SMS_Opted_In && customer.Phone) {
          const smsResult = sendWeeklyAvailabilitySMS(customer, availability);
          if (smsResult.success) results.sms_sent++;
          else results.errors.push({ customer: customer.Customer_ID, channel: 'SMS', error: smsResult.error });
        }

        // Send email if opted in and has email
        if (customer.Email_Opted_In && customer.Email) {
          const emailResult = sendWeeklyAvailabilityEmail(customer, availability);
          if (emailResult.success) results.email_sent++;
          else results.errors.push({ customer: customer.Customer_ID, channel: 'Email', error: emailResult.error });
        }

        // Log communication
        logChefCommunication(customer.Customer_ID, customer.Company_Name || customer.Contact_Name,
          'BLAST', 'Weekly Availability', 'Weekly availability blast sent');

      } catch (e) {
        results.errors.push({ customer: customer.Customer_ID, error: e.toString() });
      }
    }

    return {
      success: true,
      week_of: availability.week_of,
      products_available: availability.total_products,
      customers_notified: customers.length,
      sms_sent: results.sms_sent,
      email_sent: results.email_sent,
      errors: results.errors
    };
  } catch (error) {
    Logger.log('sendWeeklyAvailabilityBlast error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send SMS version of weekly availability
 */
function sendWeeklyAvailabilitySMS(customer, availability) {
  try {
    // Build short SMS message
    const topProducts = availability.available_now
      .slice(0, 5)
      .map(p => `${p.product}: ${p.total_available}lb`)
      .join(', ');

    const message = `🌱 ${CHEF_COMM_CONFIG.FARM_NAME} Fresh This Week:\n${topProducts}\n\nFull list + order: ${CHEF_COMM_CONFIG.ORDER_URL}\nReply STOP to opt out`;

    // Use existing Twilio send function
    const result = sendSMS(customer.Phone, message);
    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Send email version of weekly availability
 */
function sendWeeklyAvailabilityEmail(customer, availability) {
  try {
    const subject = `🌱 Fresh This Week from ${CHEF_COMM_CONFIG.FARM_NAME}`;

    // Build product table
    let productTable = '<table style="border-collapse: collapse; width: 100%;">';
    productTable += '<tr style="background: #4a7c59; color: white;"><th style="padding: 10px; text-align: left;">Product</th><th style="padding: 10px; text-align: right;">Available Now</th><th style="padding: 10px; text-align: right;">Coming This Week</th></tr>';

    for (const product of availability.available_now) {
      productTable += `<tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px;">${product.product}</td>
        <td style="padding: 10px; text-align: right;">${product.available_now} ${product.unit}</td>
        <td style="padding: 10px; text-align: right;">${product.coming_this_week} ${product.unit}</td>
      </tr>`;
    }
    productTable += '</table>';

    // Coming soon section
    let comingSoon = '';
    if (availability.coming_soon && availability.coming_soon.length > 0) {
      comingSoon = '<h3 style="color: #4a7c59;">Coming Next Week</h3><ul>';
      for (const product of availability.coming_soon.slice(0, 5)) {
        comingSoon += `<li>${product.product} - ~${product.available_next_week} ${product.unit}</li>`;
      }
      comingSoon += '</ul>';
    }

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4a7c59; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🌱 ${CHEF_COMM_CONFIG.FARM_NAME}</h1>
          <p style="margin: 5px 0;">Fresh Availability - Week of ${availability.week_of}</p>
        </div>

        <div style="padding: 20px;">
          <p>Hi ${customer.Contact_Name || 'Chef'},</p>

          <p>Here's what's fresh and ready for you this week:</p>

          ${productTable}

          ${comingSoon}

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>Ready to Order?</strong><br>
            <a href="${CHEF_COMM_CONFIG.ORDER_URL}" style="color: #4a7c59;">Place your order online</a>
            or reply to this email with your needs.
          </div>

          <p>Questions? Just reply to this email or call us at ${CHEF_COMM_CONFIG.FARM_PHONE}</p>

          <p>Fresh regards,<br>
          <strong>Tiny Seed Farm</strong></p>
        </div>

        <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          You're receiving this because you opted in to weekly availability updates.<br>
          <a href="${CHEF_COMM_CONFIG.ORDER_URL}/preferences">Update preferences</a> |
          <a href="${CHEF_COMM_CONFIG.ORDER_URL}/unsubscribe">Unsubscribe</a>
        </div>
      </div>
    `;

    GmailApp.sendEmail(customer.Email, subject, 'View in HTML', { htmlBody: body });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SHORTAGE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Notify chef of shortage on their standing order
 * @param {string} customerId - Customer ID
 * @param {string} product - Product name
 * @param {string} reason - Why there's a shortage
 * @param {Array} alternatives - Alternative products available
 */
function notifyStandingOrderShortage(customerId, product, reason, alternatives) {
  try {
    const customer = getChefProfile(customerId);
    if (!customer.success) {
      return { success: false, error: 'Customer not found' };
    }

    const chef = customer.customer;
    const results = { sms: null, email: null };

    // SMS notification
    if (chef.SMS_Opted_In && chef.Phone) {
      const altText = alternatives && alternatives.length > 0 ?
        `Alternatives: ${alternatives.slice(0, 2).map(a => a.product).join(', ')}` :
        'Contact us for alternatives';

      const smsMessage = `⚠️ ${CHEF_COMM_CONFIG.FARM_NAME}: We're short on ${product} for your order. ${reason}. ${altText}. Reply or call ${CHEF_COMM_CONFIG.FARM_PHONE}`;

      results.sms = sendSMS(chef.Phone, smsMessage);
    }

    // Email notification
    if (chef.Email) {
      const subject = `⚠️ Standing Order Update - ${product} Shortage`;

      let alternativesHtml = '';
      if (alternatives && alternatives.length > 0) {
        alternativesHtml = '<h3>Available Alternatives</h3><ul>';
        for (const alt of alternatives) {
          alternativesHtml += `<li><strong>${alt.product}</strong> - ${alt.available} ${alt.unit || 'lbs'} available</li>`;
        }
        alternativesHtml += '</ul>';
      }

      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f0ad4e; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">⚠️ Standing Order Update</h2>
          </div>

          <div style="padding: 20px;">
            <p>Hi ${chef.Contact_Name || 'Chef'},</p>

            <p>We wanted to give you a heads up about your standing order:</p>

            <div style="background: #fff3cd; border: 1px solid #f0ad4e; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Product:</strong> ${product}<br>
              <strong>Issue:</strong> ${reason}
            </div>

            ${alternativesHtml}

            <p><strong>What would you like to do?</strong></p>
            <ul>
              <li>Reply to this email with your preference</li>
              <li>Call us at ${CHEF_COMM_CONFIG.FARM_PHONE}</li>
              <li>We'll include what we have unless you tell us otherwise</li>
            </ul>

            <p>We apologize for any inconvenience and appreciate your understanding. Farm life sometimes has its surprises!</p>

            <p>Best,<br>
            <strong>Tiny Seed Farm</strong></p>
          </div>
        </div>
      `;

      try {
        GmailApp.sendEmail(chef.Email, subject, 'View in HTML', { htmlBody: body });
        results.email = { success: true };
      } catch (e) {
        results.email = { success: false, error: e.toString() };
      }
    }

    // Log communication
    logChefCommunication(customerId, chef.Company_Name || chef.Contact_Name,
      'SHORTAGE', `${product} Shortage`, `Shortage notification: ${reason}`);

    return {
      success: true,
      customerId: customerId,
      product: product,
      notifications: results
    };
  } catch (error) {
    Logger.log('notifyStandingOrderShortage error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// FRESH HARVEST ALERTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Send "just harvested" alerts for premium products
 * To chefs who have ordered this before
 *
 * @param {string} product - Product just harvested
 * @param {number} quantity - Quantity available
 */
function sendFreshHarvestAlert(product, quantity) {
  try {
    // Find chefs who have ordered this product before and opted in to alerts
    const interestedChefs = getChefsInterestedIn(product);

    if (interestedChefs.length === 0) {
      return { success: true, message: 'No opted-in chefs interested in this product', sent: 0 };
    }

    const results = { sms_sent: 0, email_sent: 0, errors: [] };

    for (const chef of interestedChefs) {
      try {
        // SMS alert
        if (chef.SMS_Opted_In && chef.Phone) {
          const message = `🌿 JUST PICKED: ${product} - ${quantity} lbs fresh today from ${CHEF_COMM_CONFIG.FARM_NAME}! First come, first served. Reply YES to reserve or call ${CHEF_COMM_CONFIG.FARM_PHONE}`;

          const smsResult = sendSMS(chef.Phone, message);
          if (smsResult.success) results.sms_sent++;
        }

        // Email alert
        if (chef.Email) {
          const subject = `🌿 Just Harvested: ${product} - Fresh Today!`;

          const body = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #4a7c59, #6b9b7a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🌿 Just Picked!</h1>
              </div>

              <div style="padding: 25px; background: white; border: 1px solid #ddd;">
                <h2 style="color: #4a7c59; margin-top: 0;">${product}</h2>

                <p style="font-size: 24px; color: #333; margin: 20px 0;">
                  <strong>${quantity} lbs</strong> available
                </p>

                <p>Hi ${chef.Contact_Name || 'Chef'},</p>

                <p>We just harvested fresh <strong>${product}</strong> and thought of you since you've ordered it before.</p>

                <p>This won't last long - first come, first served!</p>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="mailto:${CHEF_COMM_CONFIG.FARM_EMAIL}?subject=Reserve ${product}&body=I'd like to reserve __ lbs of ${product}"
                     style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Reserve Now →
                  </a>
                </div>

                <p style="color: #666; font-size: 14px;">
                  Or reply to this email or call ${CHEF_COMM_CONFIG.FARM_PHONE}
                </p>
              </div>

              <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px;">
                You're receiving this because you've ordered ${product} before.<br>
                <a href="${CHEF_COMM_CONFIG.ORDER_URL}/preferences">Update alert preferences</a>
              </div>
            </div>
          `;

          try {
            GmailApp.sendEmail(chef.Email, subject, 'View in HTML', { htmlBody: body });
            results.email_sent++;
          } catch (e) {
            results.errors.push({ customer: chef.Customer_ID, error: e.toString() });
          }
        }

        // Log
        logChefCommunication(chef.Customer_ID, chef.Company_Name || chef.Contact_Name,
          'FRESH_ALERT', product, `Fresh harvest alert: ${quantity} lbs`);

      } catch (e) {
        results.errors.push({ customer: chef.Customer_ID, error: e.toString() });
      }
    }

    return {
      success: true,
      product: product,
      quantity: quantity,
      chefs_notified: interestedChefs.length,
      sms_sent: results.sms_sent,
      email_sent: results.email_sent,
      errors: results.errors
    };
  } catch (error) {
    Logger.log('sendFreshHarvestAlert error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PERSONALIZED RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Send personalized recommendations based on order history
 * "Based on your orders, you might like..."
 *
 * @param {string} customerId - Customer ID
 */
function sendPersonalizedRecommendations(customerId) {
  try {
    const profileResult = getChefProfile(customerId);
    if (!profileResult.success) {
      return { success: false, error: 'Customer not found' };
    }

    const chef = profileResult.customer;
    const recommendations = generateChefRecommendations(customerId);

    if (!recommendations.success || recommendations.recommendations.length === 0) {
      return { success: true, message: 'No recommendations to send' };
    }

    const results = { sms: null, email: null };

    // SMS (brief)
    if (chef.SMS_Opted_In && chef.Phone) {
      const topRecs = recommendations.recommendations
        .slice(0, 3)
        .map(r => r.product)
        .join(', ');

      const message = `💡 ${CHEF_COMM_CONFIG.FARM_NAME}: Based on your orders, try: ${topRecs}. Available now! ${CHEF_COMM_CONFIG.ORDER_URL}`;

      results.sms = sendSMS(chef.Phone, message);
    }

    // Email (detailed)
    if (chef.Email) {
      const subject = `💡 Picked for You, ${chef.Contact_Name || 'Chef'}`;

      let recsHtml = '';
      for (const rec of recommendations.recommendations) {
        recsHtml += `
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3 style="color: #4a7c59; margin: 0 0 10px 0;">${rec.product}</h3>
            <p style="margin: 0; color: #666;">${rec.reason}</p>
            <p style="margin: 10px 0 0 0;"><strong>${rec.available} lbs available</strong></p>
          </div>
        `;
      }

      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4a7c59; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">💡 Picked for You</h1>
          </div>

          <div style="padding: 20px;">
            <p>Hi ${chef.Contact_Name || 'Chef'},</p>

            <p>Based on what you've loved ordering from us, we think you might enjoy these:</p>

            ${recsHtml}

            <div style="text-align: center; margin: 25px 0;">
              <a href="${CHEF_COMM_CONFIG.ORDER_URL}"
                 style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                View All Availability →
              </a>
            </div>

            <p>Happy cooking!<br>
            <strong>Tiny Seed Farm</strong></p>
          </div>
        </div>
      `;

      try {
        GmailApp.sendEmail(chef.Email, subject, 'View in HTML', { htmlBody: body });
        results.email = { success: true };
      } catch (e) {
        results.email = { success: false, error: e.toString() };
      }
    }

    logChefCommunication(customerId, chef.Company_Name || chef.Contact_Name,
      'RECOMMENDATION', 'Personalized Recommendations', `${recommendations.recommendations.length} products recommended`);

    return {
      success: true,
      customerId: customerId,
      recommendations_sent: recommendations.recommendations.length,
      notifications: results
    };
  } catch (error) {
    Logger.log('sendPersonalizedRecommendations error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate personalized recommendations for a chef
 */
function generateChefRecommendations(customerId) {
  try {
    const profileResult = getChefProfile(customerId);
    if (!profileResult.success) {
      return { success: false, recommendations: [] };
    }

    const chef = profileResult.customer;
    const availability = getRealtimeAvailability();

    if (!availability.success) {
      return { success: false, recommendations: [] };
    }

    const recommendations = [];

    // Parse favorite products
    const favorites = (chef.Favorite_Products || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

    // Parse order history to find categories they like
    let orderHistory = [];
    try {
      orderHistory = JSON.parse(chef.Order_History_JSON || '[]');
    } catch (e) {
      orderHistory = [];
    }

    // Build category preference from order history
    const categoryScores = {};
    for (const order of orderHistory) {
      const product = (order.product || '').toLowerCase();
      for (const [category, keywords] of Object.entries(CHEF_COMM_CONFIG.CATEGORIES)) {
        if (keywords.some(k => product.includes(k))) {
          categoryScores[category] = (categoryScores[category] || 0) + 1;
        }
      }
    }

    // Find available products in their preferred categories
    for (const product of availability.products) {
      if (product.net_available_now <= 0) continue;

      const productLower = product.product.toLowerCase();
      let score = 0;
      let reason = '';

      // Boost if it's a favorite
      if (favorites.some(f => productLower.includes(f))) {
        score += 100;
        reason = "One of your favorites";
      }

      // Boost if it's in a category they order often
      for (const [category, keywords] of Object.entries(CHEF_COMM_CONFIG.CATEGORIES)) {
        if (keywords.some(k => productLower.includes(k))) {
          score += (categoryScores[category] || 0) * 10;
          if (!reason && categoryScores[category] > 2) {
            reason = `You often order ${category.toLowerCase()}`;
          }
        }
      }

      // Only recommend if there's a reason
      if (score > 0 && reason) {
        recommendations.push({
          product: product.product,
          available: product.net_available_now,
          score: score,
          reason: reason
        });
      }
    }

    // Sort by score and take top 5
    recommendations.sort((a, b) => b.score - a.score);

    return {
      success: true,
      customerId: customerId,
      recommendations: recommendations.slice(0, 5)
    };
  } catch (error) {
    Logger.log('generateChefRecommendations error: ' + error.toString());
    return { success: false, error: error.toString(), recommendations: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CHEF PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get chef profile by ID
 */
function getChefProfile(customerId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS) ||
                  ss.getSheetByName('Customers') ||
                  ss.getSheetByName('CUSTOMERS');

    if (!sheet) return { success: false, error: 'Customers sheet not found' };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, error: 'No customers found' };

    const headers = data[0];
    const customerIdCol = headers.findIndex(h =>
      h === 'Customer_ID' || h === 'CustomerID' || h === 'ID'
    );

    for (let i = 1; i < data.length; i++) {
      if (data[i][customerIdCol] === customerId) {
        const customer = {};
        headers.forEach((h, idx) => customer[h] = data[i][idx]);
        return { success: true, customer: customer };
      }
    }

    return { success: false, error: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get chef order history
 */
function getChefOrderHistory(customerId) {
  try {
    const profile = getChefProfile(customerId);
    if (!profile.success) return profile;

    let history = [];
    try {
      history = JSON.parse(profile.customer.Order_History_JSON || '[]');
    } catch (e) {
      history = [];
    }

    return {
      success: true,
      customerId: customerId,
      customerName: profile.customer.Company_Name || profile.customer.Contact_Name,
      orders: history,
      totalOrders: profile.customer.Total_Orders || history.length,
      lifetimeValue: profile.customer.Lifetime_Value || 0,
      firstOrderDate: profile.customer.First_Order_Date,
      lastOrderDate: profile.customer.Last_Order_Date
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Update chef preferences
 */
function updateChefPreferences(customerId, preferences) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);
    if (!sheet) return { success: false, error: 'Customers sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const customerIdCol = headers.findIndex(h => h === 'Customer_ID' || h === 'CustomerID');
    const smsOptCol = headers.findIndex(h => h === 'SMS_Opted_In');
    const emailOptCol = headers.findIndex(h => h === 'Email_Opted_In');
    const favoritesCol = headers.findIndex(h => h === 'Favorite_Products');
    const notesCol = headers.findIndex(h => h === 'Notes');

    for (let i = 1; i < data.length; i++) {
      if (data[i][customerIdCol] === customerId) {
        if (preferences.smsOptIn !== undefined && smsOptCol !== -1) {
          sheet.getRange(i + 1, smsOptCol + 1).setValue(preferences.smsOptIn ? 'Yes' : 'No');
        }
        if (preferences.emailOptIn !== undefined && emailOptCol !== -1) {
          sheet.getRange(i + 1, emailOptCol + 1).setValue(preferences.emailOptIn ? 'Yes' : 'No');
        }
        if (preferences.favoriteProducts && favoritesCol !== -1) {
          sheet.getRange(i + 1, favoritesCol + 1).setValue(preferences.favoriteProducts);
        }

        return { success: true, message: 'Preferences updated' };
      }
    }

    return { success: false, error: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get all opted-in chefs for a specific communication type
 */
function getOptedInChefs(commType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS) ||
                  ss.getSheetByName('Customers');

    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0];
    const customers = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    // Filter for wholesale customers who are opted in
    return customers.filter(c => {
      const isWholesale = (c.Customer_Type || '').toLowerCase() === 'wholesale' ||
                          (c.Type || '').toLowerCase() === 'wholesale';
      const status = (c.Status || 'Active').toLowerCase();
      const hasContact = c.Phone || c.Email;

      return isWholesale && status === 'active' && hasContact &&
             (c.SMS_Opted_In === 'Yes' || c.SMS_Opted_In === true ||
              c.Email_Opted_In === 'Yes' || c.Email_Opted_In === true);
    });
  } catch (error) {
    Logger.log('getOptedInChefs error: ' + error.toString());
    return [];
  }
}

/**
 * Get chefs who are interested in a specific product (have ordered it before)
 */
function getChefsInterestedIn(product) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0];
    const productLower = product.toLowerCase();

    return data.slice(1)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      })
      .filter(c => {
        // Check if wholesale and active
        const isWholesale = (c.Customer_Type || '').toLowerCase() === 'wholesale';
        if (!isWholesale) return false;

        // Check if they've ordered this product
        const favorites = (c.Favorite_Products || '').toLowerCase();
        let orderHistory = [];
        try {
          orderHistory = JSON.parse(c.Order_History_JSON || '[]');
        } catch (e) {}

        const hasOrdered = favorites.includes(productLower) ||
                          orderHistory.some(o => (o.product || '').toLowerCase().includes(productLower));

        // Must have contact info and be opted in to alerts
        const hasContactAndOptIn = (c.SMS_Opted_In === 'Yes' && c.Phone) ||
                                   (c.Email_Opted_In === 'Yes' && c.Email);

        return hasOrdered && hasContactAndOptIn;
      });
  } catch (error) {
    Logger.log('getChefsInterestedIn error: ' + error.toString());
    return [];
  }
}

/**
 * Log chef communication
 */
function logChefCommunication(customerId, customerName, channel, type, preview) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.COMM_LOG);

    if (!sheet) {
      initializeChefCommunications();
      sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.COMM_LOG);
    }

    if (!sheet) return;

    const commId = 'COMM_' + Date.now();
    sheet.appendRow([
      commId,
      new Date().toISOString(),
      customerId,
      customerName,
      channel,
      type,
      type,
      preview.substring(0, 100),
      'Sent',
      '',
      ''
    ]);
  } catch (error) {
    Logger.log('logChefCommunication error: ' + error.toString());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Set up chef communication triggers
 */
function setupChefCommunicationTriggers() {
  // Remove existing
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'sendWeeklyAvailabilityBlast') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Monday at 7 AM - Send weekly availability
  ScriptApp.newTrigger('sendWeeklyAvailabilityBlast')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .create();

  return { success: true, message: 'Chef communication triggers configured' };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CHEF INVITATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate a magic link token for passwordless authentication
 */
function generateMagicToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Invite a chef to the ordering platform
 * Creates account + sends magic link via email AND SMS
 *
 * @param {Object} chefData - { email, company_name, contact_name, phone, address, city, state, zip }
 * @returns {Object} { success, customerId, inviteUrl }
 */
function inviteChef(chefData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);

    if (!sheet) {
      // Create the sheet if it doesn't exist
      initializeAvailabilityModule();
      sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);
    }

    if (!sheet) {
      return { success: false, error: 'Could not create customers sheet' };
    }

    // Check if chef already exists
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('Email');

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] && data[i][emailCol].toLowerCase() === chefData.email.toLowerCase()) {
        // Chef exists - just send a new magic link
        return sendChefMagicLink(data[i][headers.indexOf('Customer_ID')]);
      }
    }

    // Generate new customer ID and magic token
    const customerId = 'CHEF_' + Date.now();
    const magicToken = generateMagicToken();
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

    // Create the chef record
    const newRow = [
      customerId,                                    // Customer_ID
      chefData.company_name || '',                   // Company_Name
      chefData.contact_name || '',                   // Contact_Name
      chefData.email,                                // Email
      chefData.phone || '',                          // Phone
      chefData.address || '',                        // Address
      chefData.city || '',                           // City
      chefData.state || '',                          // State
      chefData.zip || '',                            // Zip
      'Wholesale',                                   // Customer_Type
      'Standard',                                    // Price_Tier
      'Net 30',                                      // Payment_Terms
      chefData.phone ? 'SMS' : 'Email',             // Preferred_Contact
      chefData.phone ? 'Yes' : 'No',                 // SMS_Opted_In
      'Yes',                                         // Email_Opted_In
      '',                                            // First_Order_Date
      '',                                            // Last_Order_Date
      0,                                             // Total_Orders
      0,                                             // Lifetime_Value
      '',                                            // Favorite_Products
      '[]',                                          // Order_History_JSON
      'Bronze',                                      // Loyalty_Tier
      0,                                             // Priority_Score
      'Invited via system',                          // Notes
      'new,invited',                                 // Tags
      'Invited'                                      // Status
    ];

    // Add magic token columns if they don't exist
    let magicTokenCol = headers.indexOf('Magic_Token');
    let tokenExpiresCol = headers.indexOf('Token_Expires');

    if (magicTokenCol === -1) {
      // Add Magic_Token column
      magicTokenCol = headers.length;
      sheet.getRange(1, magicTokenCol + 1).setValue('Magic_Token');
    }

    if (tokenExpiresCol === -1) {
      // Add Token_Expires column
      tokenExpiresCol = headers.length + (magicTokenCol === headers.length ? 1 : 0);
      sheet.getRange(1, tokenExpiresCol + 1).setValue('Token_Expires');
    }

    // Append the new row
    sheet.appendRow(newRow);

    // Set the magic token and expiration
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, magicTokenCol + 1).setValue(magicToken);
    sheet.getRange(lastRow, tokenExpiresCol + 1).setValue(tokenExpires.toISOString());

    // Build the invitation URL
    const inviteUrl = `https://toddismyname21.github.io/tiny-seed-os/web_app/chef-order.html?token=${magicToken}`;

    // Send invitation email
    const emailResult = sendChefInvitationEmail(chefData, inviteUrl);

    // Send invitation SMS if phone provided
    let smsResult = { success: false, message: 'No phone provided' };
    if (chefData.phone) {
      smsResult = sendChefInvitationSMS(chefData, inviteUrl);
    }

    // Log the invitation
    logChefCommunication(customerId, chefData.company_name || chefData.contact_name,
      'INVITE', 'Chef Invitation', `Invited to platform`);

    return {
      success: true,
      customerId: customerId,
      inviteUrl: inviteUrl,
      email_sent: emailResult.success,
      sms_sent: smsResult.success,
      message: `Chef ${chefData.contact_name || chefData.company_name} invited successfully`
    };
  } catch (error) {
    Logger.log('inviteChef error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send magic link to existing chef
 *
 * @param {string} customerId - Customer ID
 * @returns {Object} { success, inviteUrl }
 */
function sendChefMagicLink(customerId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);

    if (!sheet) {
      return { success: false, error: 'Customers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const customerIdCol = headers.indexOf('Customer_ID');

    // Find the customer
    let rowIndex = -1;
    let customer = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][customerIdCol] === customerId) {
        rowIndex = i;
        customer = {};
        headers.forEach((h, idx) => customer[h] = data[i][idx]);
        break;
      }
    }

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Generate new magic token
    const magicToken = generateMagicToken();
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7);

    // Update token in sheet
    let magicTokenCol = headers.indexOf('Magic_Token');
    let tokenExpiresCol = headers.indexOf('Token_Expires');

    if (magicTokenCol === -1) {
      magicTokenCol = headers.length;
      sheet.getRange(1, magicTokenCol + 1).setValue('Magic_Token');
    }

    if (tokenExpiresCol === -1) {
      tokenExpiresCol = magicTokenCol + 1;
      sheet.getRange(1, tokenExpiresCol + 1).setValue('Token_Expires');
    }

    sheet.getRange(rowIndex + 1, magicTokenCol + 1).setValue(magicToken);
    sheet.getRange(rowIndex + 1, tokenExpiresCol + 1).setValue(tokenExpires.toISOString());

    const inviteUrl = `https://toddismyname21.github.io/tiny-seed-os/web_app/chef-order.html?token=${magicToken}`;

    // Send email
    const chefData = {
      email: customer.Email,
      contact_name: customer.Contact_Name,
      company_name: customer.Company_Name,
      phone: customer.Phone
    };

    const emailResult = sendChefLoginEmail(chefData, inviteUrl);

    // Send SMS if phone exists
    let smsResult = { success: false };
    if (customer.Phone) {
      smsResult = sendChefLoginSMS(chefData, inviteUrl);
    }

    return {
      success: true,
      customerId: customerId,
      inviteUrl: inviteUrl,
      email_sent: emailResult.success,
      sms_sent: smsResult.success
    };
  } catch (error) {
    Logger.log('sendChefMagicLink error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Verify a magic link token
 *
 * @param {string} token - Magic token
 * @returns {Object} { valid, customerId, customer }
 */
function verifyChefToken(token) {
  try {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);

    if (!sheet) {
      return { valid: false, error: 'Customers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const magicTokenCol = headers.indexOf('Magic_Token');
    const tokenExpiresCol = headers.indexOf('Token_Expires');

    if (magicTokenCol === -1) {
      return { valid: false, error: 'Magic token system not configured' };
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][magicTokenCol] === token) {
        // Check expiration
        const expires = data[i][tokenExpiresCol];
        if (expires) {
          const expiresDate = new Date(expires);
          if (expiresDate < new Date()) {
            return { valid: false, error: 'Token expired' };
          }
        }

        // Build customer object
        const customer = {};
        headers.forEach((h, idx) => {
          if (h !== 'Magic_Token' && h !== 'Token_Expires') {
            customer[h] = data[i][idx];
          }
        });

        // Update status to Active if it was Invited
        const statusCol = headers.indexOf('Status');
        if (statusCol !== -1 && data[i][statusCol] === 'Invited') {
          sheet.getRange(i + 1, statusCol + 1).setValue('Active');
        }

        return {
          valid: true,
          customerId: customer.Customer_ID,
          customer: customer
        };
      }
    }

    return { valid: false, error: 'Invalid token' };
  } catch (error) {
    Logger.log('verifyChefToken error: ' + error.toString());
    return { valid: false, error: error.toString() };
  }
}

/**
 * Bulk invite multiple chefs
 *
 * @param {Array} chefList - [{ email, company_name, contact_name, phone }, ...]
 * @returns {Object} { success, results, summary }
 */
function bulkInviteChefs(chefList) {
  try {
    if (!chefList || !Array.isArray(chefList)) {
      return { success: false, error: 'Invalid chef list' };
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const chef of chefList) {
      if (!chef.email) {
        results.push({ email: chef.email, success: false, error: 'No email provided' });
        failCount++;
        continue;
      }

      const result = inviteChef(chef);
      results.push({
        email: chef.email,
        company: chef.company_name,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay to avoid rate limiting
      Utilities.sleep(500);
    }

    return {
      success: true,
      total: chefList.length,
      succeeded: successCount,
      failed: failCount,
      results: results
    };
  } catch (error) {
    Logger.log('bulkInviteChefs error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send chef invitation email (new chef)
 */
function sendChefInvitationEmail(chefData, inviteUrl) {
  try {
    const subject = `🌱 You're Invited - Order Fresh from Tiny Seed Farm`;

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf9;">
        <div style="background: linear-gradient(135deg, #22c55e, #15803d); color: white; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px;">🌱 Tiny Seed Farm</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Fresh to Your Kitchen</p>
        </div>

        <div style="padding: 40px; background: white;">
          <h2 style="color: #1c1917; margin-top: 0;">Hi ${chefData.contact_name || 'Chef'},</h2>

          <p style="font-size: 16px; line-height: 1.6; color: #44403c;">
            You've been invited to order fresh, organic produce directly from <strong>Tiny Seed Farm</strong>.
          </p>

          <div style="background: #f5f5f4; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <span style="font-size: 24px; margin-right: 15px;">🌿</span>
              <span style="font-size: 16px; color: #1c1917;"><strong>See what's fresh</strong> - Updated daily from our fields</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <span style="font-size: 24px; margin-right: 15px;">📱</span>
              <span style="font-size: 16px; color: #1c1917;"><strong>Order in seconds</strong> - Mobile-friendly, reorder with one tap</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 15px;">🚚</span>
              <span style="font-size: 16px; color: #1c1917;"><strong>Reliable delivery</strong> - Direct to your kitchen</span>
            </div>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${inviteUrl}"
               style="background: #22c55e; color: white; padding: 18px 40px; text-decoration: none;
                      border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block;
                      box-shadow: 0 4px 6px rgba(34, 197, 94, 0.25);">
              Start Ordering →
            </a>
          </div>

          <p style="font-size: 14px; color: #78716c; text-align: center;">
            Or copy this link: <br>
            <code style="background: #f5f5f4; padding: 5px 10px; border-radius: 4px; word-break: break-all;">${inviteUrl}</code>
          </p>

          <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 30px 0;">

          <p style="font-size: 14px; color: #78716c; text-align: center;">
            Questions? Reply to this email or call us at ${CHEF_COMM_CONFIG.FARM_PHONE}
          </p>

          <p style="font-size: 16px; color: #1c1917; text-align: center; margin-top: 30px;">
            Looking forward to feeding your kitchen!<br>
            <strong>- Todd, Tiny Seed Farm</strong>
          </p>
        </div>

        <div style="background: #f5f5f4; padding: 20px; text-align: center; font-size: 12px; color: #78716c;">
          Tiny Seed Farm | Pittsburgh, PA<br>
          This link expires in 7 days
        </div>
      </div>
    `;

    GmailApp.sendEmail(chefData.email, subject, 'View in HTML', { htmlBody: body });
    return { success: true };
  } catch (error) {
    Logger.log('sendChefInvitationEmail error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send chef invitation SMS (new chef)
 */
function sendChefInvitationSMS(chefData, inviteUrl) {
  try {
    const message = `🌱 Hi ${chefData.contact_name || 'Chef'}! You're invited to order fresh produce from Tiny Seed Farm. Start here: ${inviteUrl} -Todd`;

    return sendSMS(chefData.phone, message);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Send chef login email (existing chef, new magic link)
 */
function sendChefLoginEmail(chefData, inviteUrl) {
  try {
    const subject = `🌱 Your Login Link - Tiny Seed Farm`;

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">🌱 Tiny Seed Farm</h1>
        </div>

        <div style="padding: 30px; background: white; border: 1px solid #e7e5e4; border-top: none;">
          <p style="font-size: 16px;">Hi ${chefData.contact_name || 'Chef'},</p>

          <p style="font-size: 16px;">Here's your login link:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}"
               style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none;
                      border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Open Ordering Portal →
            </a>
          </div>

          <p style="font-size: 14px; color: #78716c; text-align: center;">
            Link expires in 7 days. Need a new one? Just reply to this email.
          </p>
        </div>

        <div style="background: #f5f5f4; padding: 15px; text-align: center; font-size: 12px; color: #78716c; border-radius: 0 0 12px 12px;">
          Tiny Seed Farm | ${CHEF_COMM_CONFIG.FARM_PHONE}
        </div>
      </div>
    `;

    GmailApp.sendEmail(chefData.email, subject, 'View in HTML', { htmlBody: body });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Send chef login SMS (existing chef)
 */
function sendChefLoginSMS(chefData, inviteUrl) {
  try {
    const message = `🌱 Your Tiny Seed Farm login: ${inviteUrl}`;
    return sendSMS(chefData.phone, message);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get all wholesale customers (chefs) with status
 */
function getAllChefs() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHEF_COMM_CONFIG.SHEETS.CUSTOMERS);

    if (!sheet) {
      return { success: true, chefs: [] };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, chefs: [] };

    const headers = data[0];
    const chefs = data.slice(1)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          if (h !== 'Magic_Token') { // Don't expose tokens
            obj[h] = row[i];
          }
        });
        return obj;
      })
      .filter(c => (c.Customer_Type || '').toLowerCase() === 'wholesale');

    return {
      success: true,
      total: chefs.length,
      active: chefs.filter(c => c.Status === 'Active').length,
      invited: chefs.filter(c => c.Status === 'Invited').length,
      chefs: chefs
    };
  } catch (error) {
    Logger.log('getAllChefs error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}
