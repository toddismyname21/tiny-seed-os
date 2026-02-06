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

  // Log what we're working with to understand the structure
  console.log('\nSearching for St. Paul\'s in the HTML...');

  // Find and remove St. Paul's from wherever it currently is
  // It might be in a partner stores section or elsewhere

  // Pattern to match St. Paul's entry (could be various formats)
  const stPaulsPatterns = [
    // Match a full card/div containing St. Paul's
    /<div[^>]*>[\s\S]*?St\. Paul's UMC[\s\S]*?<\/div>\s*<\/div>/gi,
    /<div[^>]*>[\s\S]*?Allison Park - St\. Paul's[\s\S]*?<\/div>\s*<\/div>/gi,
  ];

  // First, let's see what sections exist
  const hasCommunityStops = html.includes('Neighborhood Community Stops') || html.includes('Community Stops');
  const hasPartnerStores = html.includes('Partner Stores') || html.includes('Partner Store');

  console.log('Has Community Stops section:', hasCommunityStops);
  console.log('Has Partner Stores section:', hasPartnerStores);

  // The St. Paul's entry we want to add to Community Stops
  const stPaulsEntry = `
    <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 24px;">⛪</div>
        <div style="flex: 1;">
          <strong style="color: #166534; font-size: 1.05rem;">Allison Park - St. Paul's UMC</strong>
          <p style="margin: 6px 0 0 0; color: #666; font-size: 0.9rem;">1965 Ferguson Road, Allison Park, PA 15101</p>
          <p style="margin: 4px 0 0 0; color: #16a34a; font-size: 0.85rem; font-weight: 500;">Wed 4-6pm</p>
        </div>
      </div>
    </div>`;

  // Remove any existing St. Paul's entries (could be in partner stores or elsewhere)
  // Look for various possible patterns

  // Pattern 1: Full card with St. Paul's
  html = html.replace(/<div[^>]*style="[^"]*background:\s*white[^"]*"[^>]*>[\s\S]*?St\. Paul's[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');

  // Pattern 2: Simpler removal if it's in a list
  html = html.replace(/<div[^>]*>[\s\S]{0,200}St\. Paul's UMC[\s\S]{0,300}<\/div>\s*<\/div>/gi, '');

  // Now find where to insert St. Paul's in the Community Stops section
  // Look for the section header and add after the first few entries

  // Find the Neighborhood Community Stops section
  const communityStopsMatch = html.match(/(Neighborhood Community Stops|Community Stops)[\s\S]*?(<div[^>]*style="[^"]*background:\s*white)/i);

  if (communityStopsMatch) {
    // Insert St. Paul's as the first entry after the section header
    const insertPoint = html.indexOf(communityStopsMatch[2], html.indexOf(communityStopsMatch[1]));
    if (insertPoint > -1) {
      html = html.slice(0, insertPoint) + stPaulsEntry + html.slice(insertPoint);
      console.log('✓ Inserted St. Paul\'s into Community Stops section');
    }
  } else {
    console.log('Could not find Community Stops section, searching for alternative insertion point...');

    // Try to find any location cards and insert before them
    const firstLocationCard = html.indexOf('<div style="background: white; border: 2px solid');
    if (firstLocationCard > -1) {
      // Find section that looks like community stops
      const sections = html.match(/(<h[23][^>]*>[\s\S]*?<\/h[23]>)/gi) || [];
      console.log('Found sections:', sections.map(s => s.substring(0, 50)));
    }
  }

  // Update the page
  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log('\n✓ Updated locations page - St. Paul\'s moved to Community Stops');
}

main().catch(console.error);
