#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const COLLECTION_ID = 184896487557;

// Add-on product IDs
const ADDON_PRODUCTS = [
  8272845537433,  // Mushroom Biweekly
  8276223033497,  // Mushroom Weekly
  8273222762649,  // Bread Biweekly
  8273205133465,  // Bread Weekly
  8273219453081,  // Cheese Biweekly
  8273213784217,  // Cheese Weekly
  8273224859801,  // Coffee Biweekly
  8273228464281   // Coffee Weekly
];

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
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(body), status: res.statusCode });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  // First, check the current smart collection rules
  console.log('Checking smart collection rules...\n');
  const collection = await shopifyRequest('GET', `smart_collections/${COLLECTION_ID}.json`);
  console.log('Rules:', JSON.stringify(collection.data.smart_collection.rules, null, 2));

  // Add the "csa-addon" tag to all add-on products so they match the rules
  console.log('\nAdding "csa-addon" tag to products...\n');

  for (const productId of ADDON_PRODUCTS) {
    // Get current product
    const product = await shopifyRequest('GET', `products/${productId}.json`);
    const currentTags = product.data.product.tags || '';

    // Add csa-addon tag if not present
    const tagArray = currentTags.split(',').map(t => t.trim()).filter(t => t);
    if (!tagArray.includes('csa-addon')) {
      tagArray.push('csa-addon');
    }
    // Also add specific type tags
    const title = product.data.product.title.toLowerCase();
    if (title.includes('mushroom') && !tagArray.includes('mushroom')) tagArray.push('mushroom');
    if (title.includes('bread') && !tagArray.includes('bread')) tagArray.push('bread');
    if (title.includes('cheese') && !tagArray.includes('cheese')) tagArray.push('cheese');
    if (title.includes('coffee') && !tagArray.includes('coffee')) tagArray.push('coffee');

    const newTags = tagArray.join(', ');

    const result = await shopifyRequest('PUT', `products/${productId}.json`, {
      product: { id: productId, tags: newTags }
    });

    if (result.success) {
      console.log(`✓ ${product.data.product.title}`);
      console.log(`  Tags: ${newTags}`);
    } else {
      console.log(`✗ Failed: ${product.data.product.title}`);
    }
  }

  // Update the smart collection rules to include tag "csa-addon"
  console.log('\nUpdating collection rules to match "csa-addon" tag...\n');

  const updateResult = await shopifyRequest('PUT', `smart_collections/${COLLECTION_ID}.json`, {
    smart_collection: {
      id: COLLECTION_ID,
      rules: [
        {
          column: 'tag',
          relation: 'equals',
          condition: 'csa-addon'
        }
      ]
    }
  });

  if (updateResult.success) {
    console.log('✓ Collection rules updated!');
  } else {
    console.log('✗ Failed to update rules:', updateResult.data);
  }

  console.log('\nDone! Check: https://tinyseedfarm.com/collections/goat-rodeo-cheese');
}

main().catch(console.error);
