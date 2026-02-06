#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const FIXES = [
  { id: 8273224859801, title: '2026 Local Coffee CSA Add-On - Biweekly (Redhawk)' },
  { id: 8273228464281, title: '2026 Local Coffee CSA Add-On - Weekly (Redhawk)' }
];

function shopifyRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${CONFIG.STORE_NAME}.myshopify.com`,
      port: 443,
      path: `/admin/api/${CONFIG.API_VERSION}/${endpoint}`,
      method: method,
      headers: {
        'X-Shopify-Access-Token': CONFIG.ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  for (const fix of FIXES) {
    const result = await shopifyRequest('PUT', `products/${fix.id}.json`, {
      product: { id: fix.id, title: fix.title }
    });
    console.log(`✓ ${fix.title}`);
  }
}

main().catch(console.error);
