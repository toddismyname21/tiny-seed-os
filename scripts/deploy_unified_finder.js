#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const COLLECTION_ID = 184897929349;

const WIDGET_HTML = `
<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- Unified CSA Finder Widget -->
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 24px; border-radius: 16px; margin-bottom: 40px;">
    <h2 style="color: #166534; margin: 0 0 8px 0; font-size: 22px; text-align: center;">
      Find Your CSA Option
    </h2>
    <p style="color: #555; margin: 0 0 16px 0; text-align: center; font-size: 0.95rem;">
      Pickup locations OR home delivery - you choose!
    </p>

    <!-- iframe embed -->
    <iframe
      src="https://toddismyname21.github.io/tiny-seed-os/web_app/csa-unified-finder.html"
      width="100%"
      height="620"
      frameborder="0"
      style="border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); background: white;">
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

  <!-- Two Options -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px;">
    <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #22c55e;">
      <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;"><i class="fas fa-store" style="margin-right: 6px;"></i> Pickup Locations</h3>
      <ul style="margin: 0; padding-left: 18px; color: #444; font-size: 0.9rem; line-height: 1.7;">
        <li>15 locations across Pittsburgh</li>
        <li>Farmer's markets & partner stores</li>
        <li>Neighborhood community stops</li>
      </ul>
    </div>
    <div style="background: #eff6ff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6;">
      <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;"><i class="fas fa-truck" style="margin-right: 6px;"></i> Home Delivery</h3>
      <ul style="margin: 0; padding-left: 18px; color: #444; font-size: 0.9rem; line-height: 1.7;">
        <li>Within 7 miles of our route</li>
        <li>Wednesday delivery day</li>
        <li>$5 delivery fee</li>
      </ul>
    </div>
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
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result });
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Deploying unified CSA finder (pickup + delivery)...');

  const result = await shopifyRequest('PUT', `smart_collections/${COLLECTION_ID}.json`, {
    smart_collection: { body_html: WIDGET_HTML }
  });

  if (result.success) {
    console.log('');
    console.log('SUCCESS! Unified finder deployed.');
    console.log('');
    console.log('Features:');
    console.log('  - Tab 1: Pickup Locations (15 spots)');
    console.log('  - Tab 2: Home Delivery Check (API powered)');
    console.log('');
    console.log('View: https://tinyseedfarm.com/collections/tiny-seed-farm-csa');
  } else {
    console.error('FAILED:', result);
  }
}

main().catch(console.error);
