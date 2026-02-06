#!/usr/bin/env node
/**
 * FIX HOME DELIVERY PAGE
 * Updates the CSA Home Delivery page with correct information
 *
 * The Home Delivery option is ACTUAL direct-to-door delivery,
 * NOT community stop pickup.
 */

const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

// Page ID from the store listing (csa-home-delivery-pittsburgh)
const PAGE_ID = 116588544153;

const HOME_DELIVERY_CONTENT = `
<div class="home-delivery-page" style="max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif;">

  <!-- Hero Section -->
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 40px 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
    <h1 style="margin: 0 0 15px 0; font-size: 28px;">Home Delivery</h1>
    <p style="margin: 0; font-size: 18px; opacity: 0.95;">
      Fresh organic vegetables delivered directly to your door
    </p>
  </div>

  <!-- How It Works -->
  <div style="margin-bottom: 35px;">
    <h2 style="color: #166534; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #22c55e;">How Home Delivery Works</h2>

    <div style="display: grid; gap: 20px;">
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
        <strong style="color: #166534;">1. Subscribe to Home Delivery</strong>
        <p style="margin: 10px 0 0 0; color: #333;">Add our Home Delivery option to your CSA share at checkout.</p>
      </div>

      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
        <strong style="color: #166534;">2. We Deliver to Your Door</strong>
        <p style="margin: 10px 0 0 0; color: #333;">Your farm-fresh box arrives at your home on your scheduled delivery day.</p>
      </div>

      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
        <strong style="color: #166534;">3. Enjoy Fresh Produce</strong>
        <p style="margin: 10px 0 0 0; color: #333;">No pickup required. Your vegetables are waiting at your doorstep.</p>
      </div>
    </div>
  </div>

  <!-- Delivery Areas -->
  <div style="margin-bottom: 35px;">
    <h2 style="color: #166534; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #22c55e;">Delivery Areas</h2>

    <p style="margin-bottom: 15px; color: #555;">We deliver directly to homes in these Pittsburgh-area neighborhoods:</p>

    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">Mt. Lebanon</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">Squirrel Hill</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">Fox Chapel</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">Shadyside</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">East Liberty</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">Highland Park</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">North Hills</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 25px; font-size: 15px; font-weight: 500;">Cranberry</span>
    </div>

    <p style="font-size: 14px; color: #666; font-style: italic;">
      Don't see your area? Contact us - we're expanding our delivery routes!
    </p>
  </div>

  <!-- Pricing -->
  <div style="margin-bottom: 35px;">
    <h2 style="color: #166534; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #22c55e;">Pricing</h2>

    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 16px;">
        <strong>Home Delivery Add-on:</strong> Added to your CSA share subscription
      </p>
      <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
        See our <a href="/collections/from-our-fields-to-your-door" style="color: #92400e; font-weight: 600;">Home Delivery collection</a> for current pricing and options.
      </p>
    </div>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 30px; background: #f8fafc; border-radius: 12px;">
    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 20px;">Ready to get started?</h3>
    <a href="/collections/tiny-seed-farm-csa" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
      Browse CSA Shares
    </a>
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: result, statusCode: res.statusCode });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}`, details: result });
          }
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
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FIX HOME DELIVERY PAGE');
  console.log('  Updating to show ACTUAL home delivery service');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    console.log(`Updating page ID ${PAGE_ID}...`);

    const result = await shopifyRequest('PUT', `pages/${PAGE_ID}.json`, {
      page: {
        title: 'Home Delivery | Farm Fresh to Your Door | Tiny Seed Farm',
        body_html: HOME_DELIVERY_CONTENT,
        published: true
      }
    });

    if (result.success) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  SUCCESS! Home Delivery page updated');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('View at: https://tinyseedfarm.com/pages/csa-home-delivery-pittsburgh');
    } else {
      console.error('FAILED:', result);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
