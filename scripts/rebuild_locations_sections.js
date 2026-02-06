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

  // The correct Partner Stores and Community Stops sections
  const partnerStoresSection = `
    <!-- Partner Stores -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #22c55e; font-size: 16px; margin-bottom: 12px;">🥕 Partner Stores</h3>
      <div style="display: grid; gap: 12px;">
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Allison Park - Simon's Produce</strong>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Oakmont - Farmers Daughter</strong>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Highland Park - Bryant St. Market</strong>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>North Side - Mayfly Market</strong>
        </div>
      </div>
    </div>

    <!-- Neighborhood Community Stops -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #8b5cf6; font-size: 16px; margin-bottom: 12px;">🏠 Neighborhood Community Stops</h3>
      <p style="color: #666; font-size: 0.9rem; margin-bottom: 12px;">
        Pick up from a fellow CSA member's porch in your neighborhood
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Allison Park (St. Paul's UMC)</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Mt. Lebanon</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Regent Square</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Squirrel Hill</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Edgewood</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Dormont</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Aspinwall</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Fox Chapel</span>
      </div>
    </div>`;

  // Find where Partner Stores starts and Home Delivery starts
  const partnerStoresStart = html.indexOf('🥕 Partner Stores');
  const homeDeliveryStart = html.indexOf('🚚 Home Delivery');

  if (partnerStoresStart > -1 && homeDeliveryStart > -1) {
    // Find the div that contains Partner Stores (go back to find the opening div)
    let searchBack = partnerStoresStart;
    while (searchBack > 0 && !html.substring(searchBack - 50, searchBack).includes('margin-bottom: 24px')) {
      searchBack--;
    }
    // Find the start of the Partner Stores container div
    const containerStart = html.lastIndexOf('<div style="margin-bottom: 24px;">', partnerStoresStart);

    // Find the start of the Home Delivery container div
    const homeDeliveryContainer = html.lastIndexOf('<div style="margin-bottom: 24px;">', homeDeliveryStart);

    if (containerStart > -1 && homeDeliveryContainer > -1) {
      // Replace everything from Partner Stores container to Home Delivery container
      html = html.slice(0, containerStart) + partnerStoresSection + '\n' + html.slice(homeDeliveryContainer);
      console.log('✓ Rebuilt Partner Stores and Community Stops sections');
    } else {
      console.log('Could not find section boundaries');
      console.log('containerStart:', containerStart);
      console.log('homeDeliveryContainer:', homeDeliveryContainer);
    }
  } else {
    console.log('Could not find Partner Stores or Home Delivery markers');
    console.log('partnerStoresStart:', partnerStoresStart);
    console.log('homeDeliveryStart:', homeDeliveryStart);
  }

  // Update the page
  await shopifyRequest('PUT', `pages/${page.id}.json`, {
    page: { id: page.id, body_html: html }
  });

  console.log('✓ Page updated!');
}

main().catch(console.error);
