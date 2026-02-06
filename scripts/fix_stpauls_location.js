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
  console.log('Fetching CSA pickup locations page...');
  const pages = await shopifyRequest('GET', 'pages.json?handle=csa-pickup-locations');

  if (!pages.pages?.[0]) {
    console.log('Page not found');
    return;
  }

  const page = pages.pages[0];
  let html = page.body_html;

  // Save current HTML to analyze
  require('fs').writeFileSync('/tmp/locations_page.html', html);
  console.log('Saved current HTML to /tmp/locations_page.html');

  // Find St. Paul's current position
  const stPaulsIndex = html.indexOf("St. Paul's");
  if (stPaulsIndex > -1) {
    console.log('\nSt. Paul\'s found at index:', stPaulsIndex);
    console.log('Context around St. Paul\'s:');
    console.log(html.substring(Math.max(0, stPaulsIndex - 200), stPaulsIndex + 200));
  }

  // Find section headers
  console.log('\n--- Section Headers ---');
  const headers = html.match(/<h[23][^>]*>[^<]*<\/h[23]>/gi) || [];
  headers.forEach(h => console.log(h));
}

main().catch(console.error);
