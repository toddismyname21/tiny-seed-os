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
  // Check current page content in Shopify database
  console.log('Checking page 98281848985 in Shopify database...\n');
  const page = await shopifyRequest('GET', 'pages/98281848985.json');

  console.log('Title:', page.page.title);
  console.log('Handle:', page.page.handle);
  console.log('Updated at:', page.page.updated_at);
  console.log('');
  console.log('Contains "Todd":', page.page.body_html.includes('Todd'));
  console.log('Contains "Dave":', page.page.body_html.includes('Dave'));
  console.log('Contains "Kretschmann":', page.page.body_html.includes('Kretschmann'));
  console.log('Contains "100":', page.page.body_html.includes('100'));
  console.log('Contains "Matt":', page.page.body_html.includes('Matt'));
  console.log('Contains "Samantha":', page.page.body_html.includes('Samantha'));
  console.log('');

  // Try to force cache bust by doing a minor update
  console.log('Forcing cache refresh with minor update...');
  const result = await shopifyRequest('PUT', 'pages/98281848985.json', {
    page: {
      id: 98281848985,
      published_at: new Date().toISOString()
    }
  });
  console.log('Cache bust attempt:', result.page ? 'Success' : 'Failed');
  console.log('New updated_at:', result.page?.updated_at);
}

main().catch(console.error);
