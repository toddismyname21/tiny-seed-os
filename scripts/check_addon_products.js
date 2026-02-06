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
  // Get products from add-ons collection
  console.log('Checking add-on products...\n');

  // First get the collection
  const collections = await shopifyRequest('custom_collections.json?limit=50');
  const addonsCollection = collections.custom_collections.find(c =>
    c.handle.includes('add-on') || c.title.toLowerCase().includes('add-on')
  );

  if (addonsCollection) {
    console.log('Found collection:', addonsCollection.title);
    console.log('ID:', addonsCollection.id);
    console.log('');
  }

  // Get all products and filter for add-ons
  const products = await shopifyRequest('products.json?limit=250');

  console.log('Products with "bread", "cheese", "coffee", "mushroom" in title or that look like add-ons:\n');

  const keywords = ['bread', 'cheese', 'coffee', 'mushroom', 'add-on', 'addon', 'goat rodeo', 'allegro', 'commonplace'];

  products.products.forEach(p => {
    const titleLower = p.title.toLowerCase();
    const isAddon = keywords.some(k => titleLower.includes(k));

    if (isAddon) {
      console.log(`ID: ${p.id}`);
      console.log(`Title: ${p.title}`);
      console.log(`Handle: ${p.handle}`);
      console.log(`Status: ${p.status}`);
      console.log('---');
    }
  });
}

main().catch(console.error);
