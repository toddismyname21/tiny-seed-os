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

  // Check if St. Paul's is already in Community Stops
  const communityStopsSection = html.substring(html.indexOf('Neighborhood Community Stops'));
  const homeDeliverySection = html.indexOf('🚚 Home Delivery');
  const communityStopsContent = html.substring(html.indexOf('Neighborhood Community Stops'), homeDeliverySection);

  console.log('\nCommunity Stops section content:');
  console.log(communityStopsContent.substring(0, 500));

  if (communityStopsContent.includes("St. Paul's")) {
    console.log('\n✓ St. Paul\'s is already in Community Stops section!');
    return;
  }

  // Find the first entry in Community Stops to understand the format
  const stPaulsEntry = `<div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Allison Park - St. Paul's UMC</strong> | <span style="color: #666;">1965 Ferguson Road, Allison Park, PA 15101</span>
        </div>
        `;

  // Insert after "Neighborhood Community Stops</h3>" and any whitespace/divs
  // Look for the pattern and insert St. Paul's as the first community stop

  const insertAfter = '🏠 Neighborhood Community Stops</h3>';
  const insertIndex = html.indexOf(insertAfter);

  if (insertIndex > -1) {
    // Find the next <div after the h3 closing
    const afterH3 = html.substring(insertIndex + insertAfter.length);
    const nextDivMatch = afterH3.match(/^(\s*<div[^>]*>)/);

    if (nextDivMatch) {
      const fullInsertIndex = insertIndex + insertAfter.length + nextDivMatch[0].length;
      html = html.slice(0, fullInsertIndex) + '\n        ' + stPaulsEntry + html.slice(fullInsertIndex);
      console.log('✓ Inserted St. Paul\'s into Community Stops section');
    } else {
      // Just insert right after the header
      const fullInsertIndex = insertIndex + insertAfter.length;
      const wrapperStart = '\n      <div style="display: grid; gap: 12px;">\n        ';
      html = html.slice(0, fullInsertIndex) + wrapperStart + stPaulsEntry + html.slice(fullInsertIndex);
      console.log('✓ Inserted St. Paul\'s with wrapper div');
    }

    // Update the page
    await shopifyRequest('PUT', `pages/${page.id}.json`, {
      page: { id: page.id, body_html: html }
    });

    console.log('✓ Page updated!');
  } else {
    console.log('Could not find Community Stops section header');
  }
}

main().catch(console.error);
