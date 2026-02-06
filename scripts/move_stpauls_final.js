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

  // Step 1: Remove St. Paul's from Partner Stores section
  // The entry looks like: <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
  //   <strong>Allison Park - St. Paul's UMC</strong>
  // </div>

  const stPaulsPartnerEntry = /<div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">\s*<strong>Allison Park - St\. Paul's UMC<\/strong>\s*<\/div>/gi;

  if (stPaulsPartnerEntry.test(html)) {
    html = html.replace(stPaulsPartnerEntry, '');
    console.log('✓ Removed St. Paul\'s from Partner Stores section');
  } else {
    console.log('St. Paul\'s entry pattern not found in Partner Stores, checking alternate patterns...');
    // Try another pattern
    html = html.replace(/<div[^>]*>\s*<strong>Allison Park - St\. Paul's UMC<\/strong>\s*<\/div>/gi, '');
  }

  // Step 2: Add St. Paul's to Neighborhood Community Stops section
  // Find the section header and add after it

  const stPaulsNewEntry = `
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Allison Park - St. Paul's UMC</strong> | <span style="color: #666;">1965 Ferguson Road, Allison Park, PA 15101</span>
        </div>`;

  // Find "Neighborhood Community Stops" header and insert after the opening grid div
  const communityStopsHeader = '🏠 Neighborhood Community Stops</h3>';
  const headerIndex = html.indexOf(communityStopsHeader);

  if (headerIndex > -1) {
    // Find the opening grid div after the header
    const afterHeader = html.substring(headerIndex);
    const gridDivMatch = afterHeader.match(/<div style="display: grid; gap: 12px;">/);

    if (gridDivMatch) {
      const insertPoint = headerIndex + afterHeader.indexOf(gridDivMatch[0]) + gridDivMatch[0].length;
      html = html.slice(0, insertPoint) + stPaulsNewEntry + html.slice(insertPoint);
      console.log('✓ Added St. Paul\'s to Neighborhood Community Stops section');
    } else {
      console.log('Could not find grid div after Community Stops header');
    }
  } else {
    console.log('Could not find Neighborhood Community Stops header');
  }

  // Update the page
  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log('\n✓ Page updated successfully!');
  console.log('  St. Paul\'s UMC moved from Partner Stores to Neighborhood Community Stops');
}

main().catch(console.error);
