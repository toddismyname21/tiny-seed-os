#!/usr/bin/env node
/**
 * FIX CSA COLLECTION - Use iframe embed
 *
 * Shopify blocks script tags in collection descriptions.
 * Using iframe embed instead which Shopify allows.
 */

const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const COLLECTION_ID = 184897929349;

const WIDGET_HTML = `
<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- Location Finder Widget via iframe -->
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 16px; margin-bottom: 40px; text-align: center;">
    <h2 style="color: #166534; margin: 0 0 10px 0; font-size: 24px;">
      Find Your Closest CSA Pickup Location
    </h2>
    <p style="color: #555; margin: 0 0 20px 0;">
      Enter your ZIP code or use your location to find the nearest pickup spot.
    </p>

    <!-- iframe embed -->
    <iframe
      src="https://toddismyname21.github.io/tiny-seed-os/web_app/csa-location-widget.html"
      width="100%"
      height="550"
      frameborder="0"
      style="border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); max-width: 440px; background: white;">
    </iframe>
  </div>

  <!-- CSA Info Section -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #166534; font-size: 22px; margin-bottom: 15px;">2026 CSA Season</h2>
    <p style="font-size: 16px; color: #333; line-height: 1.7;">
      Join over 100 Pittsburgh families who get fresh, organic vegetables from Tiny Seed Farm every week.
      Our CSA shares include seasonal vegetables grown at the historic <strong>Kretschmann Family Organic Farm</strong> in Rochester, PA.
    </p>
  </div>

  <!-- Pickup Info -->
  <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px;">
    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">How CSA Pickup Works</h3>
    <ul style="margin: 0; padding-left: 20px; color: #444; line-height: 1.8;">
      <li><strong>Weekly pickup</strong> at your chosen community stop</li>
      <li><strong>Flexible options</strong> - farmer's markets, partner stores, or neighborhood hosts</li>
      <li><strong>Community stops</strong> - pick up from a neighbor's porch in your area</li>
    </ul>
  </div>

  <!-- Questions -->
  <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions? Email <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534; font-weight: 600;">todd@tinyseedfarmpgh.com</a>
    </p>
  </div>

</div>
`;

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
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result, statusCode: res.statusCode });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Updating CSA collection with iframe widget...');
  console.log('Collection ID:', COLLECTION_ID);
  console.log('');

  const result = await shopifyRequest('PUT', `smart_collections/${COLLECTION_ID}.json`, {
    smart_collection: {
      body_html: WIDGET_HTML
    }
  });

  if (result.success) {
    console.log('SUCCESS! Widget deployed via iframe.');
    console.log('');
    console.log('View at: https://tinyseedfarm.com/collections/tiny-seed-farm-csa');
    console.log('Cache bypass: https://tinyseedfarm.com/collections/tiny-seed-farm-csa?v=' + Date.now());
  } else {
    console.error('FAILED:', result);
  }
}

main().catch(console.error);
