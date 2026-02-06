#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

function shopifyRequest(method, endpoint) {
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
    req.end();
  });
}

async function main() {
  console.log('=== CUSTOM COLLECTIONS ===');
  const custom = await shopifyRequest('GET', 'custom_collections.json?limit=50');
  custom.custom_collections?.forEach(c => {
    console.log(`  ${c.id} | ${c.handle} | ${c.title}`);
  });

  console.log('');
  console.log('=== SMART COLLECTIONS ===');
  const smart = await shopifyRequest('GET', 'smart_collections.json?limit=50');
  smart.smart_collections?.forEach(c => {
    console.log(`  ${c.id} | ${c.handle} | ${c.title}`);
  });
}

main().catch(console.error);
