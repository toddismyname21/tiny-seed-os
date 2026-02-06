#!/usr/bin/env node
/**
 * ADD LOCATION FINDER WIDGET TO CSA COLLECTION
 *
 * Embeds the CSA Location Finder widget on the CSA collection page.
 * The widget is now deployed to GitHub Pages.
 */

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
  console.log('=======================================================');
  console.log('  STEP 1: Finding CSA Collection');
  console.log('=======================================================');

  // First, list collections to find the CSA one
  const collections = await shopifyRequest('GET', 'custom_collections.json');

  if (!collections.success) {
    console.error('Failed to get collections:', collections);
    return;
  }

  const csaCollection = collections.data.custom_collections.find(c =>
    c.handle === 'tiny-seed-farm-csa' || c.title.toLowerCase().includes('csa')
  );

  if (!csaCollection) {
    // Try smart collections
    const smartCollections = await shopifyRequest('GET', 'smart_collections.json');
    const smartCSA = smartCollections.data?.smart_collections?.find(c =>
      c.handle === 'tiny-seed-farm-csa' || c.title.toLowerCase().includes('csa')
    );

    if (smartCSA) {
      console.log('Found smart collection:', smartCSA.title, '(ID:', smartCSA.id, ')');
      await updateCollection('smart_collections', smartCSA.id);
    } else {
      console.log('Available collections:');
      collections.data.custom_collections.forEach(c => console.log(`  - ${c.title} (${c.handle})`));
      console.error('CSA collection not found!');
    }
    return;
  }

  console.log('Found collection:', csaCollection.title, '(ID:', csaCollection.id, ')');
  await updateCollection('custom_collections', csaCollection.id);
}

async function updateCollection(type, collectionId) {
  console.log('');
  console.log('=======================================================');
  console.log('  STEP 2: Current Collection Content');
  console.log('=======================================================');

  const current = await shopifyRequest('GET', `${type}/${collectionId}.json`);
  const collectionKey = type === 'custom_collections' ? 'custom_collection' : 'smart_collection';
  const currentBody = current.data?.[collectionKey]?.body_html || '';

  console.log('Current description preview:');
  console.log(currentBody.substring(0, 200) + '...');

  // Check if widget is already embedded
  if (currentBody.includes('tiny-seed-csa-finder') || currentBody.includes('toddismyname21.github.io')) {
    console.log('');
    console.log('Widget already embedded! Checking if it needs updating...');
  }

  console.log('');
  console.log('=======================================================');
  console.log('  STEP 3: New Content with Location Finder Widget');
  console.log('=======================================================');

  const WIDGET_HTML = `
<div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- Location Finder Widget -->
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 16px; margin-bottom: 40px; text-align: center;">
    <h2 style="color: #166534; margin: 0 0 10px 0; font-size: 24px;">
      Find Your Closest CSA Pickup Location
    </h2>
    <p style="color: #555; margin: 0 0 20px 0;">
      Enter your address or use your current location to find the nearest pickup spot.
    </p>

    <!-- Embedded Widget Container -->
    <div id="tiny-seed-csa-finder" style="max-width: 420px; margin: 0 auto;"></div>

    <script src="https://toddismyname21.github.io/tiny-seed-os/web_app/csa-location-finder-embed.js"></script>
    <script>
      if (typeof TinySeedCSAFinder !== 'undefined') {
        TinySeedCSAFinder.init({ container: 'tiny-seed-csa-finder', theme: 'light', primaryColor: '#22c55e' });
      }
    </script>
  </div>

  <!-- CSA Info Section -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #166534; font-size: 22px; margin-bottom: 15px;">2026 CSA Season</h2>
    <p style="font-size: 16px; color: #333; line-height: 1.7;">
      Join over 100 Pittsburgh families who get fresh, organic vegetables from Tiny Seed Farm every week.
      Our CSA shares include seasonal vegetables grown at the historic Kretschmann Family Organic Farm in Rochester, PA.
    </p>
  </div>

  <!-- Pickup Info -->
  <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px;">
    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">How Pickup Works</h3>
    <ul style="margin: 0; padding-left: 20px; color: #444; line-height: 1.8;">
      <li><strong>Weekly pickup</strong> at your chosen location</li>
      <li><strong>Flexible options</strong> - market stands, partner stores, or community stops</li>
      <li><strong>Home delivery</strong> available in select areas</li>
    </ul>
  </div>

</div>
`;

  console.log('New HTML includes:');
  console.log('  - Location Finder widget embed');
  console.log('  - 2026 CSA Season info');
  console.log('  - Pickup instructions');
  console.log('');

  // Get user confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Deploy this widget to the CSA collection page? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('');
      console.log('Deploying...');

      const updatePayload = {};
      updatePayload[collectionKey] = {
        body_html: WIDGET_HTML
      };

      const result = await shopifyRequest('PUT', `${type}/${collectionId}.json`, updatePayload);

      if (result.success) {
        console.log('');
        console.log('=======================================================');
        console.log('  SUCCESS! Widget deployed to CSA collection');
        console.log('=======================================================');
        console.log('');
        console.log('View at: https://tinyseedfarm.com/collections/tiny-seed-farm-csa?v=' + Date.now());
        console.log('');
        console.log('Note: Shopify caches pages for 2-5 minutes.');
        console.log('Add ?v=X to URL to bypass cache for verification.');
      } else {
        console.error('FAILED:', result);
      }
    } else {
      console.log('Cancelled. No changes made.');
    }
    rl.close();
  });
}

main().catch(console.error);
