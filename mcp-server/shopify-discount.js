/**
 * SHOPIFY DISCOUNT CODE CREATOR
 *
 * Creates discount codes via Shopify Admin API
 * Used for the NEIGHBOR direct mail campaign
 *
 * Requires environment variables:
 * - SHOPIFY_STORE_NAME: e.g., 'tiny-seed-farmers-market'
 * - SHOPIFY_ACCESS_TOKEN: Admin API access token with write_price_rules scope
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Load .env if not already loaded
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && !process.env.SHOPIFY_ACCESS_TOKEN) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// Configuration
const getConfig = () => ({
  storeName: process.env.SHOPIFY_STORE_NAME || 'tiny-seed-farmers-market',
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
  apiVersion: '2024-01'
});

/**
 * Make Shopify API request
 */
async function shopifyRequest(endpoint, method = 'GET', body = null) {
  const config = getConfig();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${config.storeName}.myshopify.com`,
      path: `/admin/api/${config.apiVersion}${endpoint}`,
      method: method,
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Shopify API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Shopify response: ${data.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Get all collections to find CSA product collections
 */
async function getCollections() {
  try {
    const smartCollections = await shopifyRequest('/smart_collections.json?limit=250');
    const customCollections = await shopifyRequest('/custom_collections.json?limit=250');

    return {
      success: true,
      smartCollections: smartCollections.smart_collections || [],
      customCollections: customCollections.custom_collections || [],
      all: [
        ...(smartCollections.smart_collections || []),
        ...(customCollections.custom_collections || [])
      ]
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all products to find CSA products
 */
async function getProducts() {
  try {
    const result = await shopifyRequest('/products.json?limit=250');
    return {
      success: true,
      products: result.products || []
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a Price Rule (the discount logic)
 */
async function createPriceRule(options) {
  const {
    title,
    valueType = 'fixed_amount', // 'fixed_amount' or 'percentage'
    value, // negative number for discount (e.g., -30.00)
    customerSelection = 'all',
    targetType = 'line_item', // 'line_item' or 'shipping_line'
    targetSelection = 'all', // 'all' or 'entitled'
    allocationMethod = 'across', // 'across' or 'each'
    oncePerCustomer = true,
    usageLimit = null,
    startsAt = new Date().toISOString(),
    endsAt = null,
    prerequisiteSubtotalRange = null, // { greater_than_or_equal_to: "300.00" }
    entitledProductIds = null, // array of product IDs
    entitledCollectionIds = null // array of collection IDs
  } = options;

  const priceRule = {
    price_rule: {
      title,
      value_type: valueType,
      value: value.toString(),
      customer_selection: customerSelection,
      target_type: targetType,
      target_selection: targetSelection,
      allocation_method: allocationMethod,
      once_per_customer: oncePerCustomer,
      starts_at: startsAt
    }
  };

  if (usageLimit) priceRule.price_rule.usage_limit = usageLimit;
  if (endsAt) priceRule.price_rule.ends_at = endsAt;
  if (prerequisiteSubtotalRange) priceRule.price_rule.prerequisite_subtotal_range = prerequisiteSubtotalRange;
  if (entitledProductIds) {
    priceRule.price_rule.entitled_product_ids = entitledProductIds;
    priceRule.price_rule.target_selection = 'entitled';
  }
  if (entitledCollectionIds) {
    priceRule.price_rule.entitled_collection_ids = entitledCollectionIds;
    priceRule.price_rule.target_selection = 'entitled';
  }

  try {
    const result = await shopifyRequest('/price_rules.json', 'POST', priceRule);
    return { success: true, priceRule: result.price_rule };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a Discount Code for a Price Rule
 */
async function createDiscountCode(priceRuleId, code) {
  try {
    const result = await shopifyRequest(
      `/price_rules/${priceRuleId}/discount_codes.json`,
      'POST',
      { discount_code: { code } }
    );
    return { success: true, discountCode: result.discount_code };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * List existing discount codes
 */
async function listDiscountCodes() {
  try {
    const priceRules = await shopifyRequest('/price_rules.json?limit=250');
    const discounts = [];

    for (const rule of (priceRules.price_rules || [])) {
      const codes = await shopifyRequest(`/price_rules/${rule.id}/discount_codes.json`);
      discounts.push({
        priceRule: rule,
        codes: codes.discount_codes || []
      });
    }

    return { success: true, discounts };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a price rule (and its discount codes)
 */
async function deletePriceRule(priceRuleId) {
  try {
    await shopifyRequest(`/price_rules/${priceRuleId}.json`, 'DELETE');
    return { success: true, deleted: priceRuleId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * CREATE THE NEIGHBOR CAMPAIGN DISCOUNTS
 *
 * Creates three discount codes for the direct mail campaign:
 * - NEIGHBOR-VEG-FULL: $30 off Veggie CSA $600+
 * - NEIGHBOR-VEG-HALF: $15 off Veggie CSA $300+
 * - NEIGHBOR-FLORAL: $20 off Floral CSA
 */
async function createNeighborDiscounts(options = {}) {
  const {
    endsAt = '2026-03-31T23:59:59-05:00',
    dryRun = false
  } = options;

  const results = {
    success: true,
    created: [],
    errors: [],
    dryRun
  };

  // First, get products to find CSA items
  const productsResult = await getProducts();
  if (!productsResult.success) {
    return { success: false, error: `Failed to get products: ${productsResult.error}` };
  }

  // Find CSA products by title
  const veggieFullProducts = [];
  const veggieHalfProducts = [];
  const floralProducts = [];

  for (const product of productsResult.products) {
    const title = product.title.toLowerCase();
    const isCSA = title.includes('csa') || title.includes('share') || title.includes('subscription');

    if (isCSA) {
      // Check price to categorize
      const price = parseFloat(product.variants?.[0]?.price || 0);

      if (title.includes('floral') || title.includes('flower') || title.includes('bouquet')) {
        floralProducts.push(product.id);
      } else if (price >= 600 || title.includes('full')) {
        veggieFullProducts.push(product.id);
      } else if (price >= 300 || title.includes('half')) {
        veggieHalfProducts.push(product.id);
      }
    }
  }

  console.log(`Found CSA products:`);
  console.log(`  Veggie Full ($600+): ${veggieFullProducts.length} products`);
  console.log(`  Veggie Half ($300+): ${veggieHalfProducts.length} products`);
  console.log(`  Floral: ${floralProducts.length} products`);

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      wouldCreate: [
        { code: 'NEIGHBOR-VEG-FULL', discount: '$30 off', products: veggieFullProducts.length, minPurchase: '$600' },
        { code: 'NEIGHBOR-VEG-HALF', discount: '$15 off', products: veggieHalfProducts.length, minPurchase: '$300' },
        { code: 'NEIGHBOR-FLORAL', discount: '$20 off', products: floralProducts.length, minPurchase: 'None' }
      ],
      products: productsResult.products.filter(p => {
        const t = p.title.toLowerCase();
        return t.includes('csa') || t.includes('share');
      }).map(p => ({ id: p.id, title: p.title, price: p.variants?.[0]?.price }))
    };
  }

  // Create NEIGHBOR-VEG-FULL: $30 off, minimum $600
  if (veggieFullProducts.length > 0) {
    try {
      const rule = await createPriceRule({
        title: 'NEIGHBOR Veggie Full - $30 Off Direct Mail Campaign',
        valueType: 'fixed_amount',
        value: -30,
        oncePerCustomer: true,
        endsAt,
        prerequisiteSubtotalRange: { greater_than_or_equal_to: '600.00' },
        entitledProductIds: veggieFullProducts
      });

      if (rule.success) {
        const code = await createDiscountCode(rule.priceRule.id, 'NEIGHBOR-VEG-FULL');
        results.created.push({
          code: 'NEIGHBOR-VEG-FULL',
          priceRuleId: rule.priceRule.id,
          discount: '$30 off',
          minPurchase: '$600',
          products: veggieFullProducts.length
        });
      } else {
        results.errors.push({ code: 'NEIGHBOR-VEG-FULL', error: rule.error });
      }
    } catch (e) {
      results.errors.push({ code: 'NEIGHBOR-VEG-FULL', error: e.message });
    }
  }

  // Create NEIGHBOR-VEG-HALF: $15 off, minimum $300
  if (veggieHalfProducts.length > 0) {
    try {
      const rule = await createPriceRule({
        title: 'NEIGHBOR Veggie Half - $15 Off Direct Mail Campaign',
        valueType: 'fixed_amount',
        value: -15,
        oncePerCustomer: true,
        endsAt,
        prerequisiteSubtotalRange: { greater_than_or_equal_to: '300.00' },
        entitledProductIds: veggieHalfProducts
      });

      if (rule.success) {
        const code = await createDiscountCode(rule.priceRule.id, 'NEIGHBOR-VEG-HALF');
        results.created.push({
          code: 'NEIGHBOR-VEG-HALF',
          priceRuleId: rule.priceRule.id,
          discount: '$15 off',
          minPurchase: '$300',
          products: veggieHalfProducts.length
        });
      } else {
        results.errors.push({ code: 'NEIGHBOR-VEG-HALF', error: rule.error });
      }
    } catch (e) {
      results.errors.push({ code: 'NEIGHBOR-VEG-HALF', error: e.message });
    }
  }

  // Create NEIGHBOR-FLORAL: $20 off, no minimum
  if (floralProducts.length > 0) {
    try {
      const rule = await createPriceRule({
        title: 'NEIGHBOR Floral - $20 Off Direct Mail Campaign',
        valueType: 'fixed_amount',
        value: -20,
        oncePerCustomer: true,
        endsAt,
        entitledProductIds: floralProducts
      });

      if (rule.success) {
        const code = await createDiscountCode(rule.priceRule.id, 'NEIGHBOR-FLORAL');
        results.created.push({
          code: 'NEIGHBOR-FLORAL',
          priceRuleId: rule.priceRule.id,
          discount: '$20 off',
          minPurchase: 'None',
          products: floralProducts.length
        });
      } else {
        results.errors.push({ code: 'NEIGHBOR-FLORAL', error: rule.error });
      }
    } catch (e) {
      results.errors.push({ code: 'NEIGHBOR-FLORAL', error: e.message });
    }
  }

  // Also create a simple NEIGHBOR code that works on all CSA products ($15 off as baseline)
  const allCSAProducts = [...new Set([...veggieFullProducts, ...veggieHalfProducts, ...floralProducts])];
  if (allCSAProducts.length > 0) {
    try {
      const rule = await createPriceRule({
        title: 'NEIGHBOR - Direct Mail Campaign (All CSA)',
        valueType: 'fixed_amount',
        value: -15, // Base discount
        oncePerCustomer: true,
        endsAt,
        entitledProductIds: allCSAProducts
      });

      if (rule.success) {
        const code = await createDiscountCode(rule.priceRule.id, 'NEIGHBOR');
        results.created.push({
          code: 'NEIGHBOR',
          priceRuleId: rule.priceRule.id,
          discount: '$15 off (base)',
          note: 'Customers can use specific codes for bigger savings',
          products: allCSAProducts.length
        });
      } else {
        results.errors.push({ code: 'NEIGHBOR', error: rule.error });
      }
    } catch (e) {
      results.errors.push({ code: 'NEIGHBOR', error: e.message });
    }
  }

  results.success = results.errors.length === 0;
  return results;
}

module.exports = {
  getCollections,
  getProducts,
  createPriceRule,
  createDiscountCode,
  listDiscountCodes,
  deletePriceRule,
  createNeighborDiscounts
};
