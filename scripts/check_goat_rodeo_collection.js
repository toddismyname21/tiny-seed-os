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
  // Check smart collection with handle goat-rodeo-cheese
  console.log('Checking goat-rodeo-cheese collection...\n');

  const smartCollections = await shopifyRequest('smart_collections.json?handle=goat-rodeo-cheese');
  console.log('Smart collection:', smartCollections);

  const customCollections = await shopifyRequest('custom_collections.json?handle=goat-rodeo-cheese');
  console.log('Custom collection:', customCollections);

  // Get products in collection 184896487557 (the one we found earlier)
  console.log('\nProducts in collection 184896487557:');
  const products = await shopifyRequest('products.json?collection_id=184896487557&limit=50');
  products.products?.forEach(p => {
    console.log(`  ${p.id} | ${p.title}`);
  });
}

main().catch(console.error);
