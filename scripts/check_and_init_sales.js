#!/usr/bin/env node
/**
 * Check existing sales sheets and initialize if needed
 * Follows redirects for Google Apps Script
 */

const https = require('https');
const url = require('url');

const API_URL = 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';

function fetchWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl, redirectsLeft) => {
      const parsedUrl = new URL(currentUrl);

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      https.get(options, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          makeRequest(res.headers.location, redirectsLeft - 1);
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data.substring(0, 500) });
          }
        });
      }).on('error', reject);
    };

    makeRequest(targetUrl, maxRedirects);
  });
}

function callAPI(action) {
  console.log(`\nCalling: ${action}...`);
  return fetchWithRedirects(`${API_URL}?action=${action}`);
}

async function main() {
  console.log('=== Sales System Setup ===');

  // Step 1: Check sheet status
  console.log('\n--- Step 1: Checking existing sheets ---');
  const status = await callAPI('getSalesSheetStatus');
  if (status.success !== undefined) {
    console.log('Sheet status:', JSON.stringify(status, null, 2));
  } else if (status.raw) {
    console.log('Response:', status.raw);
  } else {
    console.log('Result:', status);
  }

  // Step 2: Initialize sheets
  console.log('\n--- Step 2: Initializing sheets ---');
  const initResult = await callAPI('initializeSalesSheets');
  if (initResult.success !== undefined) {
    console.log('Created:', initResult.created || 0, 'sheets');
    console.log('Skipped:', initResult.skipped || 0, 'sheets (already exist)');
    if (initResult.errors?.length) console.log('Errors:', initResult.errors);
  } else {
    console.log('Result:', JSON.stringify(initResult, null, 2));
  }

  // Step 3: Sync from Shopify
  console.log('\n--- Step 3: Syncing from Shopify ---');
  const syncResult = await callAPI('syncShopifyToSheets');
  if (syncResult.success) {
    console.log('✓ Orders imported:', syncResult.orders?.imported || 0);
    console.log('✓ Customers imported:', syncResult.customers?.imported || 0);
    console.log('✓ CSA Members:', syncResult.csaMembers?.imported || 0);
  } else {
    console.log('Sync result:', JSON.stringify(syncResult, null, 2));
  }

  console.log('\n=== Setup Complete ===');
  console.log('Visit https://app.tinyseedfarm.com/web_app/sales.html');
}

main().catch(err => {
  console.error('Error:', err.message);
});
