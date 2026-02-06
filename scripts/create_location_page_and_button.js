#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const CSA_COLLECTION_ID = 184897929349;

// Simple button for collection page
const COLLECTION_HTML = `
<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- 2026 Season Info -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #166534; font-size: 24px; margin-bottom: 15px;">2026 CSA Season</h2>
    <p style="font-size: 16px; color: #333; line-height: 1.7; margin-bottom: 20px;">
      Join over 100 Pittsburgh families who get fresh, organic vegetables from Tiny Seed Farm every week.
      Our CSA shares include seasonal vegetables grown at the historic <strong>Kretschmann Family Organic Farm</strong> in Rochester, PA.
    </p>
  </div>

  <!-- Simple CTA Button -->
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 24px; border-radius: 16px; margin-bottom: 30px; text-align: center;">
    <p style="color: #166534; font-size: 1.1rem; margin: 0 0 16px 0; font-weight: 500;">
      Not sure where to pick up your share?
    </p>
    <a href="/pages/csa-pickup-locations" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem;">
      Find Your Pickup Location →
    </a>
    <p style="color: #666; font-size: 0.85rem; margin-top: 12px;">
      15 pickup spots + home delivery options available
    </p>
  </div>

  <!-- How It Works -->
  <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px;">
    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">How It Works</h3>
    <ol style="margin: 0; padding-left: 20px; color: #444; line-height: 2;">
      <li>Choose your CSA share below</li>
      <li>Select your pickup location at checkout</li>
      <li>Pick up fresh veggies weekly!</li>
    </ol>
  </div>

  <!-- Contact -->
  <div style="text-align: center; padding: 16px; border-top: 1px solid #e5e7eb;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions? Email <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534; font-weight: 600;">todd@tinyseedfarmpgh.com</a>
    </p>
  </div>

</div>
`;

// Full location finder page
const LOCATION_PAGE_HTML = `
<div style="max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">

  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #166534; font-size: 28px; margin-bottom: 10px;">Find Your CSA Pickup Location</h1>
    <p style="color: #555; font-size: 1.1rem;">
      Choose from 15 pickup spots across Pittsburgh or check home delivery availability
    </p>
  </div>

  <!-- Unified Finder Widget -->
  <div style="margin-bottom: 40px;">
    <iframe
      src="https://toddismyname21.github.io/tiny-seed-os/web_app/csa-unified-finder.html"
      width="100%"
      height="650"
      frameborder="0"
      style="border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); background: white;">
    </iframe>
  </div>

  <!-- All Locations List -->
  <div style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #dcfce7;">
      All Pickup Locations
    </h2>

    <!-- Farm -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #ea580c; font-size: 16px; margin-bottom: 12px;">🚜 Farm Pickup</h3>
      <div style="background: #fff7ed; padding: 16px; border-radius: 10px; border-left: 4px solid #ea580c;">
        <strong>Kretschmann Family Organic Farm</strong><br>
        <span style="color: #666;">257 Zeigler Rd, Rochester, PA 15074</span><br>
        <span style="color: #ea580c; font-weight: 500;">Farm Hours</span>
      </div>
    </div>

    <!-- Farmer's Markets -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #3b82f6; font-size: 16px; margin-bottom: 12px;">🏪 Farmer's Markets</h3>
      <div style="display: grid; gap: 12px;">
        <div style="background: #eff6ff; padding: 14px; border-radius: 8px;">
          <strong>Lawrenceville</strong> - Tuesday Market | <span style="color: #3b82f6;">Tue 4-7pm</span>
        </div>
        <div style="background: #eff6ff; padding: 14px; border-radius: 8px;">
          <strong>Bloomfield</strong> - Saturday Market | <span style="color: #3b82f6;">Sat 9am-2pm</span>
        </div>
        <div style="background: #eff6ff; padding: 14px; border-radius: 8px;">
          <strong>Sewickley</strong> - Saturday Market | <span style="color: #3b82f6;">Sat 9am-1pm</span>
        </div>
      </div>
    </div>

    <!-- Partner Stores -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #22c55e; font-size: 16px; margin-bottom: 12px;">🥕 Partner Stores</h3>
      <div style="display: grid; gap: 12px;">
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Allison Park - St. Paul's</strong> | <span style="color: #16a34a;">Wed 4-6pm</span>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Allison Park - Simon's Produce</strong> | <span style="color: #16a34a;">Daily</span>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Oakmont - Today's Organic Market</strong> | <span style="color: #16a34a;">Market Hours</span>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>Highland Park - Bryant St. Market</strong> | <span style="color: #16a34a;">Market Hours</span>
        </div>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 8px;">
          <strong>North Side - Mayfly Market</strong> | <span style="color: #16a34a;">Market Hours</span>
        </div>
      </div>
    </div>

    <!-- Community Stops -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #8b5cf6; font-size: 16px; margin-bottom: 12px;">🏠 Neighborhood Community Stops</h3>
      <p style="color: #666; font-size: 0.9rem; margin-bottom: 12px;">
        Pick up from a fellow CSA member's porch in your neighborhood
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Mt. Lebanon</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Squirrel Hill</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Fox Chapel</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Cranberry</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">North Park</span>
        <span style="background: #f3e8ff; color: #7c3aed; padding: 8px 14px; border-radius: 20px; font-size: 0.9rem;">Zelienople</span>
      </div>
    </div>

    <!-- Home Delivery -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #3b82f6; font-size: 16px; margin-bottom: 12px;">🚚 Home Delivery</h3>
      <div style="background: #eff6ff; padding: 20px; border-radius: 10px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 10px 0;"><strong>Available within 7 miles of our Wednesday route</strong></p>
        <p style="margin: 0; color: #666; font-size: 0.9rem;">
          Use the finder above to check if your address qualifies. $5 delivery fee.
        </p>
      </div>
    </div>
  </div>

  <!-- Start a New Location -->
  <div style="background: #fef3c7; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h3 style="color: #92400e; margin: 0 0 10px 0;">Don't see a location near you?</h3>
    <p style="color: #78350f; margin: 0 0 16px 0;">
      Gather 15 neighbors and we can start a new community stop in your area!
    </p>
    <a href="mailto:todd@tinyseedfarmpgh.com?subject=New%20CSA%20Location%20Request" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Request a New Location
    </a>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px;">
    <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 20px;">Ready to join?</h3>
    <p style="color: #555; margin: 0 0 20px 0;">Browse our CSA shares and sign up today!</p>
    <a href="/collections/tiny-seed-farm-csa" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem;">
      View CSA Shares →
    </a>
  </div>

  <!-- Contact -->
  <div style="text-align: center; padding: 24px; margin-top: 30px; border-top: 1px solid #e5e7eb;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions? Email <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534; font-weight: 600;">todd@tinyseedfarmpgh.com</a> or call <a href="tel:717-725-5177" style="color: #166534; font-weight: 600;">717-725-5177</a>
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
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result, status: res.statusCode });
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('===========================================');
  console.log('  Step 1: Create dedicated location page');
  console.log('===========================================');

  const pageResult = await shopifyRequest('POST', 'pages.json', {
    page: {
      title: 'CSA Pickup Locations | Find Your Nearest Spot',
      handle: 'csa-pickup-locations',
      body_html: LOCATION_PAGE_HTML,
      published: true
    }
  });

  if (pageResult.success) {
    console.log('✓ Location page created!');
    console.log('  URL: https://tinyseedfarm.com/pages/csa-pickup-locations');
  } else if (pageResult.status === 422) {
    console.log('Page may already exist, updating instead...');
    // Find existing page
    const pages = await shopifyRequest('GET', 'pages.json?handle=csa-pickup-locations');
    if (pages.data?.pages?.[0]) {
      const pageId = pages.data.pages[0].id;
      const updateResult = await shopifyRequest('PUT', `pages/${pageId}.json`, {
        page: { body_html: LOCATION_PAGE_HTML }
      });
      if (updateResult.success) {
        console.log('✓ Location page updated!');
      }
    }
  } else {
    console.error('Failed to create page:', pageResult);
  }

  console.log('');
  console.log('===========================================');
  console.log('  Step 2: Update collection with button');
  console.log('===========================================');

  const collectionResult = await shopifyRequest('PUT', `smart_collections/${CSA_COLLECTION_ID}.json`, {
    smart_collection: { body_html: COLLECTION_HTML }
  });

  if (collectionResult.success) {
    console.log('✓ Collection page updated with simple button!');
    console.log('  URL: https://tinyseedfarm.com/collections/tiny-seed-farm-csa');
  } else {
    console.error('Failed to update collection:', collectionResult);
  }

  console.log('');
  console.log('===========================================');
  console.log('  DONE!');
  console.log('===========================================');
  console.log('');
  console.log('Collection page: Simple button → links to location finder');
  console.log('Location page: Full widget + all locations listed');
}

main().catch(console.error);
