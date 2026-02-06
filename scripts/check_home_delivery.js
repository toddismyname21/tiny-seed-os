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
  // Check home delivery page
  console.log('=== HOME DELIVERY PAGE ===\n');
  const pages = await shopifyRequest('pages.json?handle=csa-home-delivery-pittsburgh');
  if (pages.pages?.[0]) {
    const page = pages.pages[0];
    console.log('ID:', page.id);
    console.log('Title:', page.title);
    console.log('Handle:', page.handle);
    console.log('\nBody preview:');
    console.log(page.body_html?.substring(0, 500) + '...');
  }

  // Check home delivery collection
  console.log('\n\n=== HOME DELIVERY COLLECTION ===\n');
  const collections = await shopifyRequest('custom_collections.json?handle=from-our-fields-to-your-door');
  if (collections.custom_collections?.[0]) {
    const col = collections.custom_collections[0];
    console.log('ID:', col.id);
    console.log('Title:', col.title);
  }

  // Check home delivery products
  console.log('\n\n=== HOME DELIVERY PRODUCTS ===\n');
  const products = await shopifyRequest('products.json?limit=250');
  products.products.forEach(p => {
    if (p.title.toLowerCase().includes('delivery') || p.title.toLowerCase().includes('home')) {
      console.log(`${p.id} | ${p.title} | ${p.status}`);
    }
  });
}

main().catch(console.error);
