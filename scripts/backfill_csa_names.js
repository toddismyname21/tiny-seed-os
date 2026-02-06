#!/usr/bin/env node
/**
 * Backfill customer names into CSA_Members records
 * Joins CSA_Members with SALES_Customers to populate missing names
 */

const https = require('https');

const API_URL = 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';

function fetchWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl, redirectsLeft) => {
      const parsedUrl = new URL(currentUrl);
      https.get({
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: { 'Accept': 'application/json' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
          return makeRequest(res.headers.location, redirectsLeft - 1);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve({ raw: data.substring(0, 500) }); }
        });
      }).on('error', reject);
    };
    makeRequest(targetUrl, maxRedirects);
  });
}

async function main() {
  console.log('Backfilling CSA member names from customers...\n');

  const result = await fetchWithRedirects(`${API_URL}?action=backfillCSAMemberNames`);

  if (result.success) {
    console.log('✓ Backfill complete!');
    console.log('  Updated:', result.updated || 0, 'records');
    console.log('  Already had names:', result.skipped || 0, 'records');
    console.log('  Errors:', result.errors || 0);

    // Show sample of what was updated
    if (result.details && result.details.length > 0) {
      const updated = result.details.filter(d => d.name);
      const errors = result.details.filter(d => d.error);

      if (updated.length > 0) {
        console.log('\n  Sample updates:');
        updated.slice(0, 5).forEach(d => {
          console.log(`    Row ${d.row}: ${d.name} (${d.source})`);
        });
      }

      if (errors.length > 0) {
        console.log('\n  Sample errors:');
        errors.slice(0, 5).forEach(d => {
          console.log(`    Row ${d.row}: ${d.customerId} - ${d.error}`);
        });
      }
    }
  } else {
    console.log('Result:', JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
