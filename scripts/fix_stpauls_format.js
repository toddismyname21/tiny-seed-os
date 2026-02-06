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

  // Remove the incorrectly formatted St. Paul's entry we just added
  html = html.replace(/<div style="display: grid; gap: 12px;">\s*<div style="background: #f0fdf4[^>]*>[\s\S]*?St\. Paul's UMC[\s\S]*?<\/div>\s*<\/div>/gi, '');
  html = html.replace(/<div style="background: #f0fdf4[^>]*>\s*<strong>Allison Park - St\. Paul's UMC<\/strong>[^<]*<\/div>/gi, '');

  // St. Paul's entry as a pill/badge to match the other community stops
  const stPaulsPill = `<span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Allison Park (St. Paul's UMC)</span>
        `;

  // Find the Community Stops flex container and add St. Paul's
  const flexContainerStart = '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
  const communityStopsHeaderIndex = html.indexOf('Neighborhood Community Stops');

  if (communityStopsHeaderIndex > -1) {
    // Find the flex container after the header
    const afterHeader = html.substring(communityStopsHeaderIndex);
    const flexIndex = afterHeader.indexOf(flexContainerStart);

    if (flexIndex > -1) {
      const insertIndex = communityStopsHeaderIndex + flexIndex + flexContainerStart.length;

      // Check if St. Paul's pill already exists
      if (!html.includes("Allison Park (St. Paul's UMC)")) {
        html = html.slice(0, insertIndex) + '\n        ' + stPaulsPill + html.slice(insertIndex);
        console.log('✓ Added St. Paul\'s as a neighborhood pill');
      } else {
        console.log('St. Paul\'s pill already exists');
      }
    }
  }

  // Update the page
  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log('✓ Page updated!');

  // Show the section now
  const updatedPages = await shopifyRequest('GET', 'pages.json?handle=csa-pickup-locations');
  const updatedHtml = updatedPages.pages[0].body_html;
  const startIdx = updatedHtml.indexOf('Neighborhood Community Stops');
  const endIdx = updatedHtml.indexOf('🚚 Home Delivery');
  console.log('\nUpdated Community Stops section:');
  console.log(updatedHtml.substring(startIdx, endIdx));
}

main().catch(console.error);
