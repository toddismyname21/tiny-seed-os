#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

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
  const pages = await shopifyRequest('GET', 'pages.json?handle=csa-pickup-locations');
  const page = pages.pages[0];
  let html = page.body_html;

  // Fix Oakmont store name
  html = html.replace(/Oakmont - Farmers Daughter/g, "Oakmont - Today's Organic Market");
  html = html.replace(/Farmers Daughter/g, "Today's Organic Market");

  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log("✓ Fixed Oakmont store: Now shows 'Today's Organic Market'");
}

main().catch(console.error);
