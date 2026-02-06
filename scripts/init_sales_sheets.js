#!/usr/bin/env node
/**
 * Initialize Sales Sheets and trigger first Shopify sync
 */

const https = require('https');

const API_URL = 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';

function callAPI(action) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);

    https.get(url.toString(), (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Initializing Sales System ===\n');

  // Step 1: Initialize sheets
  console.log('1. Initializing Google Sheets...');
  const initResult = await callAPI('initializeSalesSheets');
  console.log('   Result:', initResult.success ? '✓ Sheets created' : initResult.error || 'Check Apps Script logs');

  // Step 2: Sync from Shopify
  console.log('\n2. Syncing data from Shopify...');
  const syncResult = await callAPI('syncShopifyToSheets');
  if (syncResult.success) {
    console.log('   ✓ Orders imported:', syncResult.orders?.imported || 0);
    console.log('   ✓ Customers imported:', syncResult.customers?.imported || 0);
    console.log('   ✓ CSA Members identified:', syncResult.csaMembers?.imported || 0);
  } else {
    console.log('   Error:', syncResult.error || 'Check Apps Script logs');
  }

  // Step 3: Get sync status
  console.log('\n3. Current data status:');
  const status = await callAPI('getShopifySyncStatus');
  if (status.success) {
    console.log('   Orders:', status.orders || 0);
    console.log('   Customers:', status.customers || 0);
    console.log('   CSA Members:', status.csaMembers || 0);
  }

  console.log('\n=== Setup Complete ===');
  console.log('Visit https://app.tinyseedfarm.com/web_app/sales.html to see your data!');
}

main().catch(console.error);
