/**
 * PAYPAL & VENMO INTEGRATION
 *
 * Connects to PayPal Business API for:
 * - Account balance
 * - Transaction history
 * - Payouts and transfers
 *
 * Venmo Business uses the same PayPal API
 *
 * Required env vars:
 * - PAYPAL_CLIENT_ID
 * - PAYPAL_CLIENT_SECRET
 * - PAYPAL_MODE (sandbox or live)
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// Configuration
const getConfig = () => ({
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  mode: process.env.PAYPAL_MODE || 'live', // 'sandbox' or 'live'
  get baseUrl() {
    return this.mode === 'sandbox'
      ? 'api-m.sandbox.paypal.com'
      : 'api-m.paypal.com';
  }
});

// Cache access token
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get PayPal OAuth2 access token
 */
async function getAccessToken() {
  const config = getConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env');
  }

  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const postData = 'grant_type=client_credentials';

    const options = {
      hostname: config.baseUrl,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            cachedToken = result.access_token;
            // Token expires in expires_in seconds, cache for slightly less
            tokenExpiry = Date.now() + ((result.expires_in - 60) * 1000);
            resolve(result.access_token);
          } else {
            reject(new Error(`PayPal auth failed: ${JSON.stringify(result)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse PayPal response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Make authenticated PayPal API request
 */
async function paypalRequest(endpoint, method = 'GET', body = null) {
  const config = getConfig();
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.baseUrl,
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    console.error(`[PayPal] ${method} ${endpoint}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`PayPal API error ${res.statusCode}: ${data}`));
          } else {
            resolve(data ? JSON.parse(data) : {});
          }
        } catch (e) {
          reject(new Error(`Failed to parse PayPal response: ${data.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Test PayPal connection
 */
async function testPayPalConnection() {
  const config = getConfig();

  if (!config.clientId) {
    return {
      success: false,
      error: 'PayPal not configured',
      instructions: 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in mcp-server/.env'
    };
  }

  try {
    await getAccessToken();
    return {
      success: true,
      mode: config.mode,
      message: `Connected to PayPal (${config.mode} mode)`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get PayPal account balance
 */
async function getPayPalBalance() {
  try {
    // PayPal Reporting API for balance - use current timestamp in ISO format
    const now = new Date().toISOString();
    const response = await paypalRequest(`/v1/reporting/balances?as_of_time=${encodeURIComponent(now)}&currency_code=USD`);

    const balances = response.balances || [];
    let totalAvailable = 0;
    let totalPending = 0;

    balances.forEach(b => {
      if (b.available_balance) {
        totalAvailable += parseFloat(b.available_balance.value) || 0;
      }
      if (b.pending_balance) {
        totalPending += parseFloat(b.pending_balance.value) || 0;
      }
    });

    return {
      success: true,
      available: totalAvailable,
      pending: totalPending,
      total: totalAvailable + totalPending,
      currency: 'USD',
      balances: balances,
      message: `PayPal Balance: $${totalAvailable.toFixed(2)} available, $${totalPending.toFixed(2)} pending`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get PayPal transactions
 */
async function getPayPalTransactions(options = {}) {
  const days = options.days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const endDate = new Date();

  try {
    const endpoint = `/v1/reporting/transactions?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&fields=all&page_size=100`;
    const response = await paypalRequest(endpoint);

    const transactions = response.transaction_details || [];

    // Summarize transactions
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalFees = 0;

    const formattedTxns = transactions.map(txn => {
      const info = txn.transaction_info || {};
      const amount = parseFloat(info.transaction_amount?.value) || 0;
      const fee = parseFloat(info.fee_amount?.value) || 0;

      if (amount > 0) totalIncome += amount;
      if (amount < 0) totalExpenses += Math.abs(amount);
      totalFees += Math.abs(fee);

      return {
        id: info.transaction_id,
        date: info.transaction_initiation_date,
        type: info.transaction_event_code,
        status: info.transaction_status,
        amount: amount,
        fee: fee,
        currency: info.transaction_amount?.currency_code || 'USD',
        payerName: txn.payer_info?.payer_name?.alternate_full_name || '',
        payerEmail: txn.payer_info?.email_address || ''
      };
    });

    return {
      success: true,
      count: transactions.length,
      period: `Last ${days} days`,
      summary: {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        totalFees: totalFees,
        netIncome: totalIncome - totalExpenses - totalFees
      },
      transactions: formattedTxns.slice(0, 20), // Return first 20
      message: `Found ${transactions.length} transactions. Income: $${totalIncome.toFixed(2)}, Fees: $${totalFees.toFixed(2)}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get PayPal financial summary for dashboard
 */
async function getPayPalFinancialSummary() {
  const [balanceResult, transactionsResult] = await Promise.all([
    getPayPalBalance(),
    getPayPalTransactions({ days: 30 })
  ]);

  return {
    success: true,
    balance: {
      available: balanceResult.success ? balanceResult.available : 0,
      pending: balanceResult.success ? balanceResult.pending : 0,
      error: balanceResult.success ? null : balanceResult.error
    },
    transactions: {
      count: transactionsResult.success ? transactionsResult.count : 0,
      summary: transactionsResult.success ? transactionsResult.summary : null,
      recent: transactionsResult.success ? transactionsResult.transactions.slice(0, 5) : [],
      error: transactionsResult.success ? null : transactionsResult.error
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  testPayPalConnection,
  getPayPalBalance,
  getPayPalTransactions,
  getPayPalFinancialSummary,
  getAccessToken
};
