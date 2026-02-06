#!/usr/bin/env node
/**
 * Fetch CSA Pickup Locations page content
 */

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
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Fetching pages...\n');

  const result = await shopifyRequest('GET', 'pages.json');

  // Find CSA pickup locations page
  const page = result.pages.find(p =>
    p.handle === 'csa-pickup-locations' ||
    p.title.toLowerCase().includes('csa pickup') ||
    p.title.toLowerCase().includes('pickup locations')
  );

  if (page) {
    console.log(`Found: "${page.title}" (ID: ${page.id}, Handle: ${page.handle})\n`);
    console.log('='.repeat(80));
    console.log('CURRENT CONTENT:');
    console.log('='.repeat(80));
    console.log(page.body_html);
  } else {
    console.log('Page not found. Available pages:');
    result.pages.forEach(p => console.log(`  - ${p.handle}: "${p.title}"`));
  }
}

main().catch(console.error);
