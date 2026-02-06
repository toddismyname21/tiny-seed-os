#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

function shopifyRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${CONFIG.STORE_NAME}.myshopify.com`,
      port: 443,
      path: `/admin/api/${CONFIG.API_VERSION}/${endpoint}`,
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': CONFIG.ACCESS_TOKEN }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Get products in the add-ons collection
  const collectionId = 336736649369;

  console.log('Products in Add-Ons Collection (336736649369):\n');

  const collects = await shopifyRequest(`collects.json?collection_id=${collectionId}&limit=50`);

  if (collects.collects && collects.collects.length > 0) {
    for (const collect of collects.collects) {
      const product = await shopifyRequest(`products/${collect.product_id}.json`);
      if (product.product) {
        const p = product.product;
        console.log(`ID: ${p.id}`);
        console.log(`Title: ${p.title}`);
        console.log(`Handle: ${p.handle}`);
        console.log(`Status: ${p.status}`);
        console.log('---');
      }
    }
  } else {
    console.log('No products found in collection via collects.');
  }

  // Also check smart collection for add-ons
  console.log('\n\nChecking smart collection 184896487557 (Goat Rodeo Cheese / Add-Ons):\n');

  // Smart collections use rules, need to get products differently
  const smartProducts = await shopifyRequest('products.json?collection_id=184896487557&limit=50');

  if (smartProducts.products) {
    smartProducts.products.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Title: ${p.title}`);
      console.log(`Handle: ${p.handle}`);
      console.log(`Status: ${p.status}`);
      console.log('---');
    });
  }

  // List ALL active products to see what we have
  console.log('\n\n=== ALL ACTIVE PRODUCTS ===\n');

  const allProducts = await shopifyRequest('products.json?status=active&limit=250');

  allProducts.products.forEach(p => {
    console.log(`${p.id} | ${p.title}`);
  });
}

main().catch(console.error);
