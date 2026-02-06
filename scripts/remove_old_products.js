#!/usr/bin/env node
/**
 * REMOVE OLD PRODUCTS FROM COLLECTIONS
 * Archives/unpublishes outdated products
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
          if (body) {
            const result = JSON.parse(body);
            resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result, statusCode: res.statusCode });
          } else {
            resolve({ success: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, raw: body, statusCode: res.statusCode });
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
  console.log('  FIND AND REMOVE OLD 2024 PRODUCTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Step 1: Get all products
    console.log('Fetching products...');
    const productsResult = await shopifyRequest('GET', 'products.json?limit=250');

    if (!productsResult.success) {
      console.error('Failed to fetch products:', productsResult);
      return;
    }

    const products = productsResult.data.products;
    console.log(`Found ${products.length} products`);

    // Step 2: Find 2024 products
    const oldProducts = products.filter(p =>
      p.title.includes('2024') ||
      (p.title.includes('Summer') && p.title.includes('Flower') && parseFloat(p.variants[0]?.price) < 10)
    );

    console.log('');
    console.log('Found old/suspicious products:');
    oldProducts.forEach(p => {
      console.log(`  - ID: ${p.id}, Title: "${p.title}", Price: $${p.variants[0]?.price}`);
    });

    if (oldProducts.length === 0) {
      console.log('No old products found.');
      return;
    }

    // Step 3: Unpublish old products
    console.log('');
    console.log('Unpublishing old products...');

    for (const product of oldProducts) {
      console.log(`  Unpublishing: ${product.title} (ID: ${product.id})`);

      const result = await shopifyRequest('PUT', `products/${product.id}.json`, {
        product: {
          id: product.id,
          status: 'archived'
        }
      });

      if (result.success) {
        console.log(`    ✓ Archived successfully`);
      } else {
        console.log(`    ✗ Failed: ${JSON.stringify(result)}`);
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DONE');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
