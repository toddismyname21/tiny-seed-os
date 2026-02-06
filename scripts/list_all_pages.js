#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

function shopifyRequest(method, endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${CONFIG.STORE_NAME}.myshopify.com`,
      port: 443,
      path: `/admin/api/${CONFIG.API_VERSION}/${endpoint}`,
      method: method,
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
  console.log('Fetching all pages...\n');
  const result = await shopifyRequest('GET', 'pages.json?limit=100');

  const aboutPages = result.pages.filter(p =>
    p.title.toLowerCase().includes('about') ||
    p.handle.toLowerCase().includes('about')
  );

  console.log('ABOUT PAGES FOUND:');
  aboutPages.forEach(p => {
    console.log(`  ID: ${p.id}`);
    console.log(`  Title: ${p.title}`);
    console.log(`  Handle: ${p.handle}`);
    console.log(`  URL: https://tinyseedfarm.com/pages/${p.handle}`);
    console.log('');
  });

  // Also check the specific page we updated
  console.log('\nChecking page 98281848985...');
  const pageResult = await shopifyRequest('GET', 'pages/98281848985.json');
  console.log('Page title:', pageResult.page?.title);
  console.log('Page handle:', pageResult.page?.handle);
  console.log('Contains Kretschmann:', pageResult.page?.body_html?.includes('Kretschmann') || false);
  console.log('Contains Rochester:', pageResult.page?.body_html?.includes('Rochester') || false);
  console.log('Contains Matt:', pageResult.page?.body_html?.includes('Matt') || false);
}

main().catch(console.error);
