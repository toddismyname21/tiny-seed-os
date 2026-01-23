/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * SMART AVAILABILITY ENGINE - REAL-TIME INVENTORY + FIELD PLAN INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME."
 *
 * This engine connects:
 * - PLANNING_2026: What's planted, where, when
 * - REF_Beds: Bed status and current crops
 * - REF_Crops / REF_CropProfiles: DTM, harvest windows, yields
 * - HARVEST_LOG: What's been harvested (reduces availability)
 * - WHOLESALE_STANDING_ORDERS: What's already committed
 *
 * Created: 2026-01-22
 * Backend Claude - STATE OF THE ART
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const AVAILABILITY_CONFIG = {
  SHEETS: {
    PLANNING: 'PLANNING_2026',
    BEDS: 'REF_Beds',
    CROPS: 'REF_CropProfiles',
    HARVEST_LOG: 'HARVEST_LOG',
    STANDING_ORDERS: 'WHOLESALE_STANDING_ORDERS',
    CUSTOMERS: 'WHOLESALE_CUSTOMERS',
    AVAILABILITY_CACHE: 'AVAILABILITY_CACHE'
  },
  // Cache durations in minutes
  CACHE_DURATION: {
    AVAILABILITY: 15,  // Recalculate every 15 minutes
    FORECAST: 60       // Forecasts good for 1 hour
  },
  // Yield adjustment factors
  YIELD_FACTORS: {
    WEATHER_HOT: 0.85,    // Hot weather reduces yield
    WEATHER_COLD: 0.90,   // Cold weather slows growth
    EARLY_SEASON: 0.80,   // First harvest is smaller
    PEAK_SEASON: 1.0,     // Peak production
    LATE_SEASON: 0.75     // End of season decline
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Initialize availability tracking sheets
 */
function initializeAvailabilityModule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create WHOLESALE_CUSTOMERS if it doesn't exist
  createSheetIfNotExists(ss, AVAILABILITY_CONFIG.SHEETS.CUSTOMERS, [
    'Customer_ID', 'Company_Name', 'Contact_Name', 'Email', 'Phone',
    'Address', 'City', 'State', 'Zip',
    'Customer_Type', 'Price_Tier', 'Payment_Terms',
    'Preferred_Contact', 'SMS_Opted_In', 'Email_Opted_In',
    'First_Order_Date', 'Last_Order_Date', 'Total_Orders', 'Lifetime_Value',
    'Favorite_Products', 'Order_History_JSON',
    'Loyalty_Tier', 'Priority_Score',
    'Notes', 'Tags', 'Status'
  ]);

  // Create HARVEST_LOG if it doesn't exist
  createSheetIfNotExists(ss, AVAILABILITY_CONFIG.SHEETS.HARVEST_LOG, [
    'Harvest_ID', 'Date', 'Crop', 'Variety', 'Bed_ID',
    'Quantity', 'Unit', 'Quality_Grade', 'Harvester',
    'Planting_ID', 'Notes', 'Created_At'
  ]);

  // Create AVAILABILITY_CACHE for performance
  createSheetIfNotExists(ss, AVAILABILITY_CONFIG.SHEETS.AVAILABILITY_CACHE, [
    'Product_Key', 'Product_Name', 'Available_Now', 'Available_This_Week',
    'Available_Next_Week', 'Forecast_4_Weeks', 'Committed_Standing_Orders',
    'Net_Available', 'Last_Calculated', 'Data_JSON'
  ]);

  return { success: true, message: 'Availability module initialized' };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CORE AVAILABILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get real-time availability for all products
 * Considers: planted, growing, ready, harvested, committed
 *
 * @returns {Object} { products: [{ product, available_now, available_this_week, available_next_week, forecast_4_weeks }] }
 */
function getRealtimeAvailability() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const today = new Date();

    // Get all data sources
    const plantings = getActivePlantings(ss);
    const cropProfiles = getCropProfiles(ss);
    const harvestLog = getRecentHarvests(ss, 30); // Last 30 days
    const standingOrders = getActiveStandingOrders(ss);

    // Build availability by product
    const availabilityMap = {};

    for (const planting of plantings) {
      const crop = planting.Crop;
      const variety = planting.Variety || '';
      const productKey = variety ? `${crop} - ${variety}` : crop;

      if (!availabilityMap[productKey]) {
        availabilityMap[productKey] = {
          product: productKey,
          crop: crop,
          variety: variety,
          plantings: [],
          available_now: 0,
          available_this_week: 0,
          available_next_week: 0,
          forecast_4_weeks: 0,
          committed: 0,
          beds: []
        };
      }

      // Get crop profile for DTM and yield
      const profile = findCropProfile(cropProfiles, crop, variety);
      const dtm = profile ? (profile.DTM || profile.Days_To_Maturity || 60) : 60;
      const yieldPerBed = profile ? (profile.Yield_Per_Bed || profile.Yield_Lbs_Per_Ft * 100 || 10) : 10;

      // Calculate harvest date from planting/transplant date
      const plantDate = planting.Direct_Seed_Actual || planting.Transplant_Actual || planting.Direct_Seed_Date || planting.Transplant_Date;
      if (!plantDate) continue;

      const harvestDate = new Date(plantDate);
      harvestDate.setDate(harvestDate.getDate() + dtm);

      const daysUntilHarvest = Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24));
      const estimatedYield = calculateAdjustedYield(yieldPerBed, planting, today);

      // Subtract what's already been harvested from this planting
      const harvested = getHarvestedQuantity(harvestLog, planting);
      const remainingYield = Math.max(0, estimatedYield - harvested);

      // Categorize by timing
      if (daysUntilHarvest <= 0) {
        // Ready now (or overdue)
        availabilityMap[productKey].available_now += remainingYield;
      } else if (daysUntilHarvest <= 7) {
        availabilityMap[productKey].available_this_week += remainingYield;
      } else if (daysUntilHarvest <= 14) {
        availabilityMap[productKey].available_next_week += remainingYield;
      } else if (daysUntilHarvest <= 28) {
        availabilityMap[productKey].forecast_4_weeks += remainingYield;
      }

      availabilityMap[productKey].plantings.push({
        planting_id: planting.Planting_ID || planting.ID,
        bed: planting.Bed_Assignment || planting.Bed,
        harvest_date: harvestDate.toISOString().split('T')[0],
        days_until_harvest: daysUntilHarvest,
        estimated_yield: remainingYield,
        status: planting.Status || 'growing'
      });

      if (planting.Bed_Assignment) {
        availabilityMap[productKey].beds.push(planting.Bed_Assignment);
      }
    }

    // Subtract committed standing orders
    for (const order of standingOrders) {
      const productKey = order.Product_Name;
      if (availabilityMap[productKey]) {
        availabilityMap[productKey].committed += parseFloat(order.Quantity) || 0;
      }
    }

    // Calculate net available
    const products = Object.values(availabilityMap).map(p => ({
      ...p,
      net_available_now: Math.max(0, p.available_now - p.committed),
      total_forecast: p.available_now + p.available_this_week + p.available_next_week + p.forecast_4_weeks
    }));

    // Sort by what's ready now
    products.sort((a, b) => b.available_now - a.available_now);

    return {
      success: true,
      generated: new Date().toISOString(),
      products: products,
      count: products.length,
      summary: {
        products_ready_now: products.filter(p => p.available_now > 0).length,
        total_ready_now_lbs: products.reduce((sum, p) => sum + p.available_now, 0),
        total_committed_lbs: products.reduce((sum, p) => sum + p.committed, 0)
      }
    };
  } catch (error) {
    Logger.log('getRealtimeAvailability error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get availability forecast for a specific product
 * Uses DTM + planting dates + weather adjustments
 *
 * @param {string} productId - Product name or ID
 * @param {number} weeksAhead - Number of weeks to forecast (default 8)
 * @returns {Object} { product, forecast: [{ week, projected_quantity, confidence }] }
 */
function getProductForecast(productId, weeksAhead) {
  try {
    weeksAhead = weeksAhead || 8;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const today = new Date();

    const plantings = getActivePlantings(ss);
    const cropProfiles = getCropProfiles(ss);
    const harvestLog = getRecentHarvests(ss, 60);

    // Find plantings for this product
    const productPlantings = plantings.filter(p => {
      const productKey = p.Variety ? `${p.Crop} - ${p.Variety}` : p.Crop;
      return productKey.toLowerCase().includes(productId.toLowerCase()) ||
             p.Crop.toLowerCase().includes(productId.toLowerCase());
    });

    if (productPlantings.length === 0) {
      return {
        success: true,
        product: productId,
        forecast: [],
        message: 'No plantings found for this product'
      };
    }

    // Build weekly forecast
    const forecast = [];
    for (let week = 0; week <= weeksAhead; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let weeklyTotal = 0;
      let confidence = 1.0;
      const sources = [];

      for (const planting of productPlantings) {
        const profile = findCropProfile(cropProfiles, planting.Crop, planting.Variety);
        const dtm = profile ? (profile.DTM || 60) : 60;
        const harvestWindow = profile ? (profile.Harvest_Window || 14) : 14;
        const yieldPerBed = profile ? (profile.Yield_Per_Bed || 10) : 10;

        const plantDate = planting.Direct_Seed_Actual || planting.Transplant_Actual ||
                         planting.Direct_Seed_Date || planting.Transplant_Date;
        if (!plantDate) continue;

        const harvestStart = new Date(plantDate);
        harvestStart.setDate(harvestStart.getDate() + dtm);
        const harvestEnd = new Date(harvestStart);
        harvestEnd.setDate(harvestEnd.getDate() + harvestWindow);

        // Check if this planting is harvestable during this week
        if (harvestStart <= weekEnd && harvestEnd >= weekStart) {
          const alreadyHarvested = getHarvestedQuantity(harvestLog, planting);
          const adjustedYield = calculateAdjustedYield(yieldPerBed, planting, weekStart);
          const remaining = Math.max(0, adjustedYield - alreadyHarvested);

          // Distribute yield across harvest window weeks
          const daysInWindow = Math.min((weekEnd - harvestStart) / (1000*60*60*24) + 1, 7);
          const weeklyPortion = remaining * (daysInWindow / harvestWindow);

          weeklyTotal += weeklyPortion;
          sources.push({
            planting_id: planting.Planting_ID || planting.ID,
            bed: planting.Bed_Assignment,
            contribution: weeklyPortion
          });
        }
      }

      // Reduce confidence for further-out forecasts
      if (week > 2) confidence = 0.85;
      if (week > 4) confidence = 0.70;
      if (week > 6) confidence = 0.55;

      forecast.push({
        week: week,
        week_of: weekStart.toISOString().split('T')[0],
        projected_quantity: Math.round(weeklyTotal * 10) / 10,
        confidence: confidence,
        sources: sources.length,
        unit: 'lbs'
      });
    }

    return {
      success: true,
      product: productId,
      generated: new Date().toISOString(),
      forecast: forecast,
      total_plantings: productPlantings.length
    };
  } catch (error) {
    Logger.log('getProductForecast error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Check if an order can be fulfilled
 * Considers standing orders, existing commitments
 *
 * @param {Array} items - [{ product, quantity, unit }]
 * @returns {Object} { canFulfill: true/false, shortages: [], alternatives: [] }
 */
function canFulfillOrder(items) {
  try {
    if (!items || !Array.isArray(items)) {
      items = [];
    }

    const availability = getRealtimeAvailability();
    if (!availability.success) {
      return { success: false, error: 'Could not get availability' };
    }

    const availabilityMap = {};
    for (const p of availability.products) {
      availabilityMap[p.product.toLowerCase()] = p;
    }

    const results = [];
    const shortages = [];
    const alternatives = [];
    let canFulfillAll = true;

    for (const item of items) {
      const productKey = (item.product || item.productName || '').toLowerCase();
      const requestedQty = parseFloat(item.quantity) || 0;

      const available = availabilityMap[productKey];

      if (!available) {
        canFulfillAll = false;
        shortages.push({
          product: item.product,
          requested: requestedQty,
          available: 0,
          shortage: requestedQty,
          reason: 'Product not found in current plantings'
        });

        // Find similar products
        const similar = findSimilarProducts(availability.products, item.product);
        if (similar.length > 0) {
          alternatives.push({
            for_product: item.product,
            alternatives: similar
          });
        }
      } else if (available.net_available_now < requestedQty) {
        canFulfillAll = false;
        shortages.push({
          product: item.product,
          requested: requestedQty,
          available: available.net_available_now,
          shortage: requestedQty - available.net_available_now,
          reason: available.available_now < requestedQty ?
                  'Insufficient current harvest' :
                  'Committed to standing orders',
          available_this_week: available.available_this_week,
          available_next_week: available.available_next_week
        });

        // Find alternatives
        const similar = findSimilarProducts(availability.products, item.product)
          .filter(p => p.net_available_now >= requestedQty);
        if (similar.length > 0) {
          alternatives.push({
            for_product: item.product,
            alternatives: similar
          });
        }
      } else {
        results.push({
          product: item.product,
          requested: requestedQty,
          canFulfill: true,
          from_beds: available.beds.slice(0, 3)
        });
      }
    }

    return {
      success: true,
      canFulfill: canFulfillAll,
      items_checked: items.length,
      items_fulfilled: results.length,
      results: results,
      shortages: shortages,
      alternatives: alternatives,
      recommendation: canFulfillAll ?
        'Order can be fulfilled from current availability' :
        shortages.length === items.length ?
          'Cannot fulfill any items - consider alternatives' :
          `Partial fulfillment possible (${results.length}/${items.length} items)`
    };
  } catch (error) {
    Logger.log('canFulfillOrder error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Smart allocation when demand exceeds supply
 * Priority: Standing orders > Loyalty tier > First-come
 *
 * @param {string} product - Product name
 * @param {number} totalAvailable - Total quantity available
 * @param {Array} orders - [{ customerId, customerName, quantity, priority, loyaltyTier }]
 * @returns {Object} Allocation per order
 */
function allocateAvailability(product, totalAvailable, orders) {
  try {
    totalAvailable = parseFloat(totalAvailable) || 0;

    if (!orders || orders.length === 0) {
      return { success: true, allocations: [], remaining: totalAvailable };
    }

    // Score and sort orders by priority
    const scoredOrders = orders.map(order => {
      let score = 0;

      // Standing orders get highest priority
      if (order.isStandingOrder) score += 1000;

      // Loyalty tier scoring
      const tier = (order.loyaltyTier || '').toLowerCase();
      if (tier === 'platinum') score += 100;
      else if (tier === 'gold') score += 75;
      else if (tier === 'silver') score += 50;
      else score += 25; // Regular

      // Custom priority boost
      score += (order.priority || 0) * 10;

      // Order history boost (more orders = higher priority)
      score += Math.min((order.totalOrders || 0), 50);

      return { ...order, allocationScore: score };
    });

    // Sort by score descending
    scoredOrders.sort((a, b) => b.allocationScore - a.allocationScore);

    // Allocate
    let remaining = totalAvailable;
    const allocations = [];

    for (const order of scoredOrders) {
      const requested = parseFloat(order.quantity) || 0;
      const allocated = Math.min(requested, remaining);

      allocations.push({
        customerId: order.customerId,
        customerName: order.customerName,
        requested: requested,
        allocated: allocated,
        fulfilled: allocated >= requested,
        shortage: Math.max(0, requested - allocated),
        priorityScore: order.allocationScore,
        reason: allocated < requested ?
          `Partial allocation (${Math.round(allocated/requested*100)}%)` :
          'Fully allocated'
      });

      remaining -= allocated;
      if (remaining <= 0) break;
    }

    return {
      success: true,
      product: product,
      totalAvailable: totalAvailable,
      totalAllocated: totalAvailable - remaining,
      remaining: remaining,
      allocations: allocations,
      fullyFulfilled: allocations.filter(a => a.fulfilled).length,
      partiallyFulfilled: allocations.filter(a => !a.fulfilled && a.allocated > 0).length,
      unfulfilled: allocations.filter(a => a.allocated === 0).length
    };
  } catch (error) {
    Logger.log('allocateAvailability error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * What should the farmer do today?
 * AI-driven recommendations based on inventory state
 *
 * @returns {Object} { recommendations: [...], urgentActions: [...], metrics: {...} }
 */
function getSmartRecommendations() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const today = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

    const availability = getRealtimeAvailability();
    const standingOrdersDue = getStandingOrdersDue({ date: today.toISOString().split('T')[0] });

    const urgentActions = [];
    const harvestPriority = [];
    const plantingRecommendations = [];
    const customerAlerts = [];

    // 1. URGENT: Products with standing orders due today/tomorrow
    if (standingOrdersDue.success && standingOrdersDue.orders) {
      for (const order of standingOrdersDue.orders) {
        const product = availability.products.find(p =>
          p.product.toLowerCase() === order.Product_Name.toLowerCase()
        );

        if (product) {
          if (product.net_available_now >= order.Quantity) {
            harvestPriority.push({
              action: 'HARVEST',
              priority: 'HIGH',
              product: order.Product_Name,
              quantity: order.Quantity,
              unit: order.Unit || 'lbs',
              reason: `Standing order for ${order.Customer_Name}`,
              dueDate: order.Next_Due_Date
            });
          } else {
            urgentActions.push({
              action: 'SHORTAGE_ALERT',
              priority: 'CRITICAL',
              product: order.Product_Name,
              needed: order.Quantity,
              available: product.net_available_now,
              shortage: order.Quantity - product.net_available_now,
              customer: order.Customer_Name,
              recommendation: `Contact ${order.Customer_Name} about shortage. Available: ${product.net_available_now} ${order.Unit || 'lbs'}`
            });
          }
        }
      }
    }

    // 2. Products ready to harvest but no orders (sell proactively)
    if (availability.success) {
      for (const product of availability.products) {
        if (product.available_now > 10 && product.committed < product.available_now * 0.5) {
          urgentActions.push({
            action: 'PROMOTE',
            priority: 'MEDIUM',
            product: product.product,
            available: product.available_now,
            committed: product.committed,
            uncommitted: product.available_now - product.committed,
            recommendation: `${Math.round(product.available_now - product.committed)} lbs uncommitted - send availability blast to chefs`
          });
        }
      }
    }

    // 3. Products with high demand but low upcoming supply
    if (availability.success) {
      for (const product of availability.products) {
        if (product.committed > 0 && product.total_forecast < product.committed * 2) {
          plantingRecommendations.push({
            action: 'PLANT_MORE',
            priority: 'HIGH',
            product: product.product,
            currentCommitted: product.committed,
            upcomingSupply: product.total_forecast,
            gap: (product.committed * 4) - product.total_forecast,
            recommendation: `Demand exceeds supply - consider succession planting`
          });
        }
      }
    }

    // 4. Overdue harvests
    if (availability.success) {
      for (const product of availability.products) {
        const overduePlantings = product.plantings.filter(p => p.days_until_harvest < -3);
        if (overduePlantings.length > 0) {
          urgentActions.push({
            action: 'OVERDUE_HARVEST',
            priority: 'HIGH',
            product: product.product,
            beds: overduePlantings.map(p => p.bed).filter(Boolean),
            daysOverdue: Math.abs(overduePlantings[0].days_until_harvest),
            recommendation: `Harvest ASAP - quality declining`
          });
        }
      }
    }

    // Sort actions by priority
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    urgentActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    harvestPriority.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Build summary recommendations
    const recommendations = [];

    if (urgentActions.filter(a => a.priority === 'CRITICAL').length > 0) {
      recommendations.push(`🚨 ${urgentActions.filter(a => a.priority === 'CRITICAL').length} CRITICAL actions need immediate attention`);
    }

    if (harvestPriority.length > 0) {
      recommendations.push(`🌱 Harvest ${harvestPriority.length} products today - chefs waiting`);
    }

    if (urgentActions.filter(a => a.action === 'PROMOTE').length > 0) {
      const totalUncommitted = urgentActions
        .filter(a => a.action === 'PROMOTE')
        .reduce((sum, a) => sum + (a.uncommitted || 0), 0);
      recommendations.push(`📣 ${Math.round(totalUncommitted)} lbs ready but uncommitted - send availability to chefs`);
    }

    if (plantingRecommendations.length > 0) {
      recommendations.push(`🌿 ${plantingRecommendations.length} products need succession planting`);
    }

    return {
      success: true,
      generated: new Date().toISOString(),
      dayOfWeek: dayOfWeek,
      recommendations: recommendations,
      urgentActions: urgentActions,
      harvestPriority: harvestPriority,
      plantingRecommendations: plantingRecommendations,
      customerAlerts: customerAlerts,
      metrics: {
        products_tracked: availability.products?.length || 0,
        products_ready: availability.summary?.products_ready_now || 0,
        total_available_lbs: availability.summary?.total_ready_now_lbs || 0,
        total_committed_lbs: availability.summary?.total_committed_lbs || 0,
        standing_orders_due: standingOrdersDue.orders?.length || 0
      }
    };
  } catch (error) {
    Logger.log('getSmartRecommendations error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get weekly availability formatted for chefs
 * Clean, simple format for customer-facing communication
 */
function getWeeklyAvailability() {
  try {
    const availability = getRealtimeAvailability();
    if (!availability.success) {
      return { success: false, error: 'Could not calculate availability' };
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Format for chefs - only show what's actually available
    const available = availability.products
      .filter(p => p.net_available_now > 0 || p.available_this_week > 0)
      .map(p => ({
        product: p.product,
        available_now: Math.round(p.net_available_now),
        coming_this_week: Math.round(p.available_this_week),
        total_available: Math.round(p.net_available_now + p.available_this_week),
        unit: 'lbs'
      }))
      .sort((a, b) => b.total_available - a.total_available);

    // Upcoming (not ready yet but coming soon)
    const upcoming = availability.products
      .filter(p => p.net_available_now === 0 && p.available_this_week === 0 && p.available_next_week > 0)
      .map(p => ({
        product: p.product,
        available_next_week: Math.round(p.available_next_week),
        unit: 'lbs'
      }));

    return {
      success: true,
      week_of: weekStart.toISOString().split('T')[0],
      week_ending: weekEnd.toISOString().split('T')[0],
      generated: new Date().toISOString(),
      available_now: available,
      coming_soon: upcoming,
      total_products: available.length,
      message: `${available.length} products available this week from Tiny Seed Farm`
    };
  } catch (error) {
    Logger.log('getWeeklyAvailability error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get what was freshly harvested today
 */
function getFreshHarvests() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const today = new Date().toISOString().split('T')[0];

    const sheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.HARVEST_LOG);
    if (!sheet) return { success: true, harvests: [], message: 'No harvest log found' };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, harvests: [] };

    const headers = data[0];
    const harvests = data.slice(1)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      })
      .filter(h => {
        const harvestDate = h.Date instanceof Date ?
          h.Date.toISOString().split('T')[0] :
          String(h.Date).split('T')[0];
        return harvestDate === today;
      })
      .map(h => ({
        crop: h.Crop,
        variety: h.Variety,
        quantity: h.Quantity,
        unit: h.Unit || 'lbs',
        quality: h.Quality_Grade,
        bed: h.Bed_ID,
        time: h.Created_At
      }));

    return {
      success: true,
      date: today,
      harvests: harvests,
      total_items: harvests.length,
      total_quantity: harvests.reduce((sum, h) => sum + (parseFloat(h.quantity) || 0), 0)
    };
  } catch (error) {
    Logger.log('getFreshHarvests error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Get active plantings from PLANNING_2026
 */
function getActivePlantings(ss) {
  const sheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.PLANNING);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val instanceof Date) {
          obj[h] = val;
        } else {
          obj[h] = val;
        }
      });
      return obj;
    })
    .filter(p => {
      // Filter to active plantings (not completed/cancelled)
      const status = (p.Status || '').toLowerCase();
      return p.Crop && !status.includes('cancel') && !status.includes('complete');
    });
}

/**
 * Get crop profiles with DTM and yield data
 */
function getCropProfiles(ss) {
  const sheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.CROPS) ||
                ss.getSheetByName('REF_Crops') ||
                ss.getSheetByName('Crops');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

/**
 * Find crop profile by crop and variety
 */
function findCropProfile(profiles, crop, variety) {
  const cropLower = (crop || '').toLowerCase();
  const varietyLower = (variety || '').toLowerCase();

  // Try exact match first
  let match = profiles.find(p =>
    (p.Crop || '').toLowerCase() === cropLower &&
    (p.Variety || '').toLowerCase() === varietyLower
  );

  // Fall back to crop-only match
  if (!match) {
    match = profiles.find(p => (p.Crop || '').toLowerCase() === cropLower);
  }

  return match;
}

/**
 * Get recent harvests from log
 */
function getRecentHarvests(ss, days) {
  const sheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.HARVEST_LOG);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(h => {
      const date = h.Date instanceof Date ? h.Date : new Date(h.Date);
      return date >= cutoff;
    });
}

/**
 * Get quantity already harvested from a specific planting
 */
function getHarvestedQuantity(harvestLog, planting) {
  const plantingId = planting.Planting_ID || planting.ID;
  if (!plantingId) return 0;

  return harvestLog
    .filter(h => h.Planting_ID === plantingId)
    .reduce((sum, h) => sum + (parseFloat(h.Quantity) || 0), 0);
}

/**
 * Get active standing orders
 */
function getActiveStandingOrders(ss) {
  const sheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.STANDING_ORDERS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
    .filter(o => o.Status === 'Active');
}

/**
 * Calculate yield with seasonal adjustments
 */
function calculateAdjustedYield(baseYield, planting, date) {
  let adjustment = 1.0;

  // Seasonal adjustment
  const month = date.getMonth();
  if (month >= 5 && month <= 7) {
    adjustment *= AVAILABILITY_CONFIG.YIELD_FACTORS.PEAK_SEASON;
  } else if (month <= 3 || month >= 10) {
    adjustment *= AVAILABILITY_CONFIG.YIELD_FACTORS.LATE_SEASON;
  }

  // Bed coverage adjustment
  const bedCount = (planting.Bed_Assignment || '').split(',').length;
  adjustment *= bedCount;

  return baseYield * adjustment;
}

/**
 * Find similar products for alternatives
 */
function findSimilarProducts(products, searchProduct) {
  const searchLower = (searchProduct || '').toLowerCase();

  // Extract the main crop name (before any variety indicator)
  const mainCrop = searchLower.split(' - ')[0].split(' ')[0];

  return products
    .filter(p => {
      const productLower = p.product.toLowerCase();
      // Same crop type or similar name
      return productLower.includes(mainCrop) &&
             productLower !== searchLower &&
             p.net_available_now > 0;
    })
    .slice(0, 3)
    .map(p => ({
      product: p.product,
      available: p.net_available_now,
      unit: 'lbs'
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DAILY AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Calculate daily availability - run at 6 AM
 * Caches results for faster API responses
 */
function calculateDailyAvailability() {
  try {
    const availability = getRealtimeAvailability();

    if (!availability.success) {
      Logger.log('calculateDailyAvailability failed: ' + availability.error);
      return;
    }

    // Cache to sheet for faster reads
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let cacheSheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.AVAILABILITY_CACHE);

    if (!cacheSheet) {
      initializeAvailabilityModule();
      cacheSheet = ss.getSheetByName(AVAILABILITY_CONFIG.SHEETS.AVAILABILITY_CACHE);
    }

    // Clear and repopulate
    if (cacheSheet.getLastRow() > 1) {
      cacheSheet.deleteRows(2, cacheSheet.getLastRow() - 1);
    }

    const rows = availability.products.map(p => [
      p.product,
      p.product,
      p.available_now,
      p.available_this_week,
      p.available_next_week,
      p.forecast_4_weeks,
      p.committed,
      p.net_available_now,
      new Date().toISOString(),
      JSON.stringify(p)
    ]);

    if (rows.length > 0) {
      cacheSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    Logger.log('Daily availability calculated: ' + availability.products.length + ' products');
    return { success: true, productsCalculated: availability.products.length };
  } catch (error) {
    Logger.log('calculateDailyAvailability error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Sync harvest logs to update availability
 * Run every 15 minutes
 */
function syncHarvestToAvailability() {
  // Trigger recalculation if recent harvests detected
  const fresh = getFreshHarvests();
  if (fresh.success && fresh.harvests.length > 0) {
    calculateDailyAvailability();
  }
}

/**
 * Set up all availability triggers
 */
function setupAvailabilityTriggers() {
  // Remove existing triggers for these functions
  const triggersToRemove = ['calculateDailyAvailability', 'syncHarvestToAvailability'];
  const triggers = ScriptApp.getProjectTriggers();

  for (const trigger of triggers) {
    if (triggersToRemove.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Daily at 6 AM - Calculate availability
  ScriptApp.newTrigger('calculateDailyAvailability')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  // Every 15 minutes - Sync harvest logs
  ScriptApp.newTrigger('syncHarvestToAvailability')
    .timeBased()
    .everyMinutes(15)
    .create();

  return { success: true, message: 'Availability triggers configured' };
}
