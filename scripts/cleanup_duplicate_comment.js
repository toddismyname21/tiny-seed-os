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

  // Remove duplicate Partner Stores comment
  html = html.replace(/<!-- Partner Stores -->\s*\n\s*<!-- Partner Stores -->/g, '<!-- Partner Stores -->');

  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log('✓ Cleaned up duplicate comment');
}

main().catch(console.error);
