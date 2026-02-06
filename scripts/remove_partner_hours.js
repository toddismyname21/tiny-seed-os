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

  if (!pages.pages?.[0]) {
    console.log('Page not found');
    return;
  }

  const page = pages.pages[0];
  let html = page.body_html;

  // Remove hours from partner stores section
  // St. Paul's - remove "Wed 4-6pm"
  html = html.replace(/ \| <span style="color: #16a34a;">Wed 4-6pm<\/span>/g, '');
  // Simon's - remove "Daily"
  html = html.replace(/ \| <span style="color: #16a34a;">Daily<\/span>/g, '');
  // Oakmont - remove "Market Hours"
  html = html.replace(/ \| <span style="color: #16a34a;">Market Hours<\/span>/g, '');
  // Highland Park - remove "Market Hours"
  html = html.replace(/Bryant St\. Market<\/strong> \| <span style="color: #16a34a;">Market Hours<\/span>/g, 'Bryant St. Market</strong>');
  // North Side - remove "Market Hours"
  html = html.replace(/Mayfly Market<\/strong> \| <span style="color: #16a34a;">Market Hours<\/span>/g, 'Mayfly Market</strong>');

  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log("✓ Removed hours from partner stores on locations page");
}

main().catch(console.error);
