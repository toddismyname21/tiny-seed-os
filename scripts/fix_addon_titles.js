#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

// Product ID -> Correct Title
const FIXES = [
  { id: 8272845537433, title: '2026 Mushroom CSA Add-On - Biweekly', handle: '2026-mushroom-csa-add-on-biweekly' },
  { id: 8276223033497, title: '2026 Mushroom CSA Add-On - Weekly', handle: '2026-mushroom-csa-add-on-weekly' },
  { id: 8273222762649, title: '2026 Local Bread CSA Add-On - Biweekly', handle: '2026-local-bread-csa-add-on-biweekly' },
  { id: 8273205133465, title: '2026 Local Bread CSA Add-On - Weekly', handle: '2026-local-bread-csa-add-on-weekly' },
  { id: 8273219453081, title: '2026 Local Cheese CSA Add-On - Biweekly (Goat Rodeo)', handle: '2026-local-cheese-csa-add-on-biweekly' },
  { id: 8273213784217, title: '2026 Local Cheese CSA Add-On - Weekly (Goat Rodeo)', handle: '2026-local-cheese-csa-add-on-weekly' },
  { id: 8273224859801, title: '2026 Local Coffee CSA Add-On - Biweekly (Commonplace)', handle: '2026-local-coffee-csa-add-on-biweekly' },
  { id: 8273228464281, title: '2026 Local Coffee CSA Add-On - Weekly (Commonplace)', handle: '2026-local-coffee-csa-add-on-weekly' }
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
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result });
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Fixing add-on product titles...\n');

  for (const fix of FIXES) {
    console.log(`Fixing: ${fix.title}`);

    const result = await shopifyRequest('PUT', `products/${fix.id}.json`, {
      product: {
        id: fix.id,
        title: fix.title,
        handle: fix.handle
      }
    });

    if (result.success) {
      console.log(`  ✓ Updated to: ${result.data.product.title}`);
    } else {
      console.error(`  ✗ FAILED:`, result.data);
    }
  }

  console.log('\nDone! Check https://tinyseedfarm.com/collections/local-csa-add-ons');
}

main().catch(console.error);
