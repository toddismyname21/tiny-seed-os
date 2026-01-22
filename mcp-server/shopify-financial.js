/**
 * SHOPIFY FINANCIAL DATA - Direct API Access
 *
 * Gets Shopify Payments balance, payouts, and Capital loan data.
 * Bypasses Google Apps Script for direct, fast access.
 *
 * Requires environment variables:
 * - SHOPIFY_STORE_NAME: e.g., 'tiny-seed-farmers-market'
 * - SHOPIFY_ACCESS_TOKEN: Admin API access token with read_shopify_payments_payouts scope
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
  }
});

/**
 * Make direct Shopify API request
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

    console.error(`[Shopify Financial] Requesting: ${options.path}`);

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
    req.end();
  });
}

/**
 * Get Shopify Payments balance (pending payouts)
 * Shows money Shopify has collected but not yet deposited
 */
async function getShopifyPaymentsBalance() {
  const config = getConfig();

  if (!config.shopify.accessToken) {
    return {
      success: false,
      error: 'SHOPIFY_ACCESS_TOKEN not configured',
      instructions: 'Set SHOPIFY_ACCESS_TOKEN in mcp-server/.env'
    };
  }

  try {
    const response = await shopifyRequest('/shopify_payments/balance.json', config);

    if (response.errors) {
      return {
        success: false,
        error: 'API Error',
        details: response.errors
      };
    }

    const balanceData = response.balance || [];

    // Format the balance data
    const balances = balanceData.map(b => ({
      currency: b.currency,
      amount: parseFloat(b.amount || 0),
      pending: true,
      source: 'Shopify Payments'
    }));

    const totalPending = balances.reduce((sum, b) => sum + b.amount, 0);

    return {
      success: true,
      balances: balances,
      totalPending: totalPending,
      message: `Shopify Payments pending balance: $${totalPending.toFixed(2)}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get Shopify Payouts history
 * Shows completed payouts from Shopify to bank account
 */
async function getShopifyPayouts(options = {}) {
  const config = getConfig();
  const limit = options.limit || 20;
  const status = options.status || ''; // paid, pending, in_transit, scheduled, canceled

  if (!config.shopify.accessToken) {
    return {
      success: false,
      error: 'SHOPIFY_ACCESS_TOKEN not configured'
    };
  }

  try {
    let endpoint = `/shopify_payments/payouts.json?limit=${limit}`;
    if (status) endpoint += `&status=${status}`;

    const response = await shopifyRequest(endpoint, config);

    if (response.errors) {
      return {
        success: false,
        error: 'API Error',
        details: response.errors
      };
    }

    const payouts = response.payouts || [];

    // Format payouts for dashboard
    const formattedPayouts = payouts.map(p => ({
      id: p.id,
      date: p.date,
      amount: parseFloat(p.amount || 0),
      currency: p.currency,
      status: p.status,
      summary: p.summary // Contains gross, charges, refunds, adjustments
    }));

    // Calculate totals by status
    const totalPaid = formattedPayouts
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = formattedPayouts
      .filter(p => p.status === 'pending' || p.status === 'in_transit' || p.status === 'scheduled')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      success: true,
      payouts: formattedPayouts,
      totalPaid: totalPaid,
      totalPending: totalPending,
      count: payouts.length,
      message: `Found ${payouts.length} payouts. Paid: $${totalPaid.toFixed(2)}, Pending: $${totalPending.toFixed(2)}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get Shopify Capital information (loans/advances)
 * Note: Requires specific Shopify Capital API scopes
 */
async function getShopifyCapital() {
  const config = getConfig();

  if (!config.shopify.accessToken) {
    return {
      success: false,
      error: 'SHOPIFY_ACCESS_TOKEN not configured'
    };
  }

  let offers = [];
  let financings = [];
  let totalOwed = 0;
  let capitalAvailable = false;

  try {
    // Try to get financing offers
    try {
      const offersResponse = await shopifyRequest('/capital/financing_offers.json', config);
      if (offersResponse.financing_offers) {
        offers = offersResponse.financing_offers.map(o => ({
          id: o.id,
          amount: parseFloat(o.amount || 0),
          currency: o.currency,
          status: o.status,
          expiresAt: o.expires_at
        }));
        capitalAvailable = true;
      }
    } catch (e) {
      console.error('[Shopify Capital] Offers endpoint not available:', e.message);
    }

    // Try to get active financings (loans)
    try {
      const financingsResponse = await shopifyRequest('/capital/financings.json', config);
      if (financingsResponse.financings) {
        financings = financingsResponse.financings.map(f => ({
          id: f.id,
          originalAmount: parseFloat(f.amount || 0),
          remainingBalance: parseFloat(f.remaining_balance || 0),
          currency: f.currency,
          status: f.status,
          dailyWithholdingRate: parseFloat(f.daily_withholding_rate || 0),
          startDate: f.start_date,
          type: 'Shopify Capital'
        }));
        capitalAvailable = true;

        // Calculate total owed
        totalOwed = financings.reduce((sum, f) => sum + f.remainingBalance, 0);
      }
    } catch (e) {
      console.error('[Shopify Capital] Financings endpoint not available:', e.message);
    }

    return {
      success: true,
      capitalAvailable: capitalAvailable,
      hasLoans: financings.length > 0,
      offers: offers,
      activeLoans: financings,
      totalOwed: totalOwed,
      message: financings.length > 0
        ? `Shopify Capital: $${totalOwed.toFixed(2)} remaining balance on ${financings.length} loan(s)`
        : capitalAvailable ? 'No active Shopify Capital loans' : 'Shopify Capital not available for this store'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get complete Shopify financial summary
 * Combines balance, payouts, and capital data
 */
async function getShopifyFinancialSummary() {
  console.error('[Shopify Financial] Getting complete financial summary...');

  const [balance, payouts, capital] = await Promise.all([
    getShopifyPaymentsBalance(),
    getShopifyPayouts({ limit: 10 }),
    getShopifyCapital()
  ]);

  return {
    success: true,
    pending: {
      amount: balance.success ? balance.totalPending : 0,
      balances: balance.success ? balance.balances : [],
      error: balance.success ? null : balance.error
    },
    recentPayouts: {
      count: payouts.success ? payouts.count : 0,
      totalPaid: payouts.success ? payouts.totalPaid : 0,
      totalPending: payouts.success ? payouts.totalPending : 0,
      payouts: payouts.success ? payouts.payouts.slice(0, 5) : [],
      error: payouts.success ? null : payouts.error
    },
    capital: {
      available: capital.success ? capital.capitalAvailable : false,
      hasLoans: capital.success ? capital.hasLoans : false,
      totalOwed: capital.success ? capital.totalOwed : 0,
      loans: capital.success ? capital.activeLoans : [],
      offers: capital.success ? capital.offers : [],
      error: capital.success ? null : capital.error
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getShopifyPaymentsBalance,
  getShopifyPayouts,
  getShopifyCapital,
  getShopifyFinancialSummary
};
