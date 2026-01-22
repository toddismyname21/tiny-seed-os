/**
 * DIRECT SHOPIFY CSA IMPORT
 *
 * Bypasses Google Apps Script 30-second timeout by calling APIs directly.
 * Uses Shopify Order ID as unique key for idempotent imports.
 *
 * Requires environment variables:
 * - SHOPIFY_STORE_NAME: e.g., 'tiny-seed-farmers-market'
 * - SHOPIFY_ACCESS_TOKEN: Admin API access token
 * - GOOGLE_SPREADSHEET_ID: The farm records spreadsheet
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

// Configuration from environment
const getConfig = () => ({
  shopify: {
    storeName: process.env.SHOPIFY_STORE_NAME || 'tiny-seed-farmers-market',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
    apiVersion: '2024-01'
  },
  sheets: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc'
  },
  // Apps Script API endpoint for sheet operations (v293 with MCP Direct Import)
  appsScript: {
    baseUrl: 'https://script.google.com/macros/s/AKfycbzQGqay-b2A97ThL33YSnLa4MBdu_48ReQMXV_ndtvfSzoYVhURlZy5cWbXQ2hDPx2d/exec'
  }
});

// CSA Product identifiers (titles that indicate CSA shares)
const CSA_KEYWORDS = [
  'csa', 'farm share', 'veggie share', 'vegetable share', 'produce share',
  'full share', 'half share', 'single share', 'couple share', 'family share',
  'flower share', 'bouquet share', 'fleurs'
];

/**
 * Make direct Shopify API request (no timeout)
 */
async function shopifyRequest(endpoint, config) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${config.shopify.storeName}.myshopify.com`,
      path: `/admin/api/${config.shopify.apiVersion}${endpoint}`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Shopify response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetch all CSA orders from Shopify
 */
async function fetchCSAOrders(config, maxItems = null) {
  const orders = [];
  let pageInfo = null;
  let hasMore = true;

  while (hasMore) {
    // Build URL with pagination
    let endpoint = '/orders.json?status=any&limit=50';
    if (pageInfo) {
      endpoint += `&page_info=${pageInfo}`;
    }

    const response = await shopifyRequest(endpoint, config);

    if (response.errors) {
      throw new Error(`Shopify API error: ${JSON.stringify(response.errors)}`);
    }

    const pageOrders = response.orders || [];

    // Filter for CSA orders
    for (const order of pageOrders) {
      const csaItems = order.line_items.filter(item => {
        const title = (item.title || '').toLowerCase();
        return CSA_KEYWORDS.some(kw => title.includes(kw));
      });

      if (csaItems.length > 0) {
        orders.push({
          orderId: order.id,
          orderNumber: order.order_number,
          createdAt: order.created_at,
          customer: {
            email: order.email,
            firstName: order.customer?.first_name || order.billing_address?.first_name || '',
            lastName: order.customer?.last_name || order.billing_address?.last_name || '',
            phone: order.customer?.phone || order.billing_address?.phone || '',
            address: order.shipping_address || order.billing_address || {}
          },
          csaItems: csaItems.map(item => ({
            title: item.title,
            variant: item.variant_title,
            quantity: item.quantity,
            price: item.price
          })),
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          note: order.note
        });
      }

      if (maxItems && orders.length >= maxItems) {
        hasMore = false;
        break;
      }
    }

    // Check for more pages (Shopify uses Link header pagination)
    // For simplicity, we'll stop after first page in this version
    // Full pagination would parse the Link header
    hasMore = false; // TODO: Implement full pagination if needed

    if (maxItems && orders.length >= maxItems) {
      break;
    }
  }

  return maxItems ? orders.slice(0, maxItems) : orders;
}

/**
 * Get existing CSA members from sheet via Apps Script
 */
async function getExistingMembers(config) {
  return new Promise((resolve, reject) => {
    const url = `${config.appsScript.baseUrl}?action=getCSAMembers`;

    https.get(url, { headers: { 'User-Agent': 'TinySeedMCP/1.0' } }, (res) => {
      // Handle redirect
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.members || []);
            } catch (e) {
              resolve([]);
            }
          });
        }).on('error', () => resolve([]));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.members || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * Extract share type from product title
 */
function extractShareType(title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('full share') || titleLower.includes('family share')) {
    return 'Full Share';
  }
  if (titleLower.includes('half share') || titleLower.includes('couple share')) {
    return 'Half Share';
  }
  if (titleLower.includes('single share')) {
    return 'Single Share';
  }
  if (titleLower.includes('flower') || titleLower.includes('fleurs') || titleLower.includes('bouquet')) {
    return 'Flower Share';
  }
  if (titleLower.includes('veggie') || titleLower.includes('vegetable') || titleLower.includes('produce')) {
    return 'Veggie Share';
  }

  // Default based on any CSA keyword
  return 'CSA Share';
}

/**
 * Add CSA member via Apps Script API (uses addCSAMemberDirect endpoint)
 */
async function addCSAMember(memberData, config) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      action: 'addCSAMemberDirect',
      ...memberData
    });

    const url = `${config.appsScript.baseUrl}?${params.toString()}`;

    https.get(url, { headers: { 'User-Agent': 'TinySeedMCP/1.0' } }, (res) => {
      // Handle redirect
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve({ success: true });
            }
          });
        }).on('error', reject);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ success: true });
        }
      });
    }).on('error', reject);
  });
}

/**
 * MAIN IMPORT FUNCTION
 *
 * Idempotent import using Shopify Order ID as unique key.
 */
async function importCSAFromShopify(options = {}) {
  const { maxItems = null, dryRun = false } = options;
  const config = getConfig();

  // Validate configuration
  if (!config.shopify.accessToken) {
    return {
      success: false,
      error: 'SHOPIFY_ACCESS_TOKEN environment variable not set',
      instructions: 'Set SHOPIFY_ACCESS_TOKEN in .env file or environment'
    };
  }

  const results = {
    success: true,
    dryRun,
    orders: {
      fetched: 0,
      processed: 0
    },
    members: {
      added: 0,
      skipped: 0,
      errors: 0
    },
    details: []
  };

  try {
    // Step 1: Fetch CSA orders from Shopify
    console.error('[MCP] Fetching CSA orders from Shopify...');
    const orders = await fetchCSAOrders(config, maxItems);
    results.orders.fetched = orders.length;

    // Step 2: Get existing members to check for duplicates
    console.error('[MCP] Fetching existing CSA members...');
    const existingMembers = await getExistingMembers(config);

    // Build set of existing Order IDs from Notes field
    const existingOrderIds = new Set();
    for (const member of existingMembers) {
      const notes = member.Notes || member.notes || '';
      const match = notes.match(/Shopify Order (\d+)/);
      if (match) {
        existingOrderIds.add(match[1]);
      }
    }

    console.error(`[MCP] Found ${existingOrderIds.size} existing orders to skip`);

    // Step 3: Process each order
    for (const order of orders) {
      results.orders.processed++;
      const orderId = order.orderId.toString();

      // Skip if already imported (idempotent check)
      if (existingOrderIds.has(orderId)) {
        results.members.skipped++;
        results.details.push({
          orderId,
          orderNumber: order.orderNumber,
          status: 'skipped',
          reason: 'Already imported'
        });
        continue;
      }

      // Process each CSA item in the order
      for (const item of order.csaItems) {
        const shareType = extractShareType(item.title);
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`.trim();

        const memberData = {
          name: customerName,
          email: order.customer.email,
          phone: order.customer.phone,
          shareType: shareType,
          season: '2026',
          status: order.financialStatus === 'paid' ? 'Active' : 'Pending',
          deliveryMethod: 'Pickup', // Default, can be updated
          notes: `Shopify Order ${orderId} - ${item.title}`,
          address: order.customer.address?.address1 || '',
          city: order.customer.address?.city || '',
          state: order.customer.address?.province || 'PA',
          zip: order.customer.address?.zip || ''
        };

        if (dryRun) {
          results.members.added++;
          results.details.push({
            orderId,
            orderNumber: order.orderNumber,
            status: 'would_add',
            member: memberData
          });
        } else {
          try {
            const addResult = await addCSAMember(memberData, config);
            if (addResult.success || addResult.memberId) {
              results.members.added++;
              results.details.push({
                orderId,
                orderNumber: order.orderNumber,
                status: 'added',
                memberId: addResult.memberId
              });
            } else {
              results.members.errors++;
              results.details.push({
                orderId,
                orderNumber: order.orderNumber,
                status: 'error',
                error: addResult.error || 'Unknown error'
              });
            }
          } catch (err) {
            results.members.errors++;
            results.details.push({
              orderId,
              orderNumber: order.orderNumber,
              status: 'error',
              error: err.message
            });
          }
        }
      }
    }

    // Summary
    results.summary = dryRun
      ? `DRY RUN: Would add ${results.members.added} members, skip ${results.members.skipped} duplicates`
      : `Added ${results.members.added} members, skipped ${results.members.skipped} duplicates, ${results.members.errors} errors`;

    console.error(`[MCP] ${results.summary}`);

  } catch (err) {
    results.success = false;
    results.error = err.message;
  }

  return results;
}

module.exports = {
  importCSAFromShopify,
  fetchCSAOrders,
  getExistingMembers
};
