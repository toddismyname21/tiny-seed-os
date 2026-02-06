#!/usr/bin/env node
/**
 * Setup Shopify Webhooks for Automatic CSA Import
 *
 * This script registers a webhook with Shopify that fires whenever
 * a new order is created. The webhook calls our Apps Script endpoint
 * which processes the order and adds CSA customers to CSA_Members.
 */

const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01',
  // Apps Script webhook endpoint
  WEBHOOK_URL: 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec'
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
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: JSON.parse(body),
            status: res.statusCode
          });
        } catch (e) {
          resolve({ success: false, data: body, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function listWebhooks() {
  console.log('Listing existing webhooks...\n');
  const result = await shopifyRequest('GET', 'webhooks.json');

  if (result.data?.webhooks) {
    if (result.data.webhooks.length === 0) {
      console.log('No webhooks registered.');
    } else {
      result.data.webhooks.forEach(wh => {
        console.log(`- ID: ${wh.id}`);
        console.log(`  Topic: ${wh.topic}`);
        console.log(`  Address: ${wh.address}`);
        console.log(`  Created: ${wh.created_at}\n`);
      });
    }
  }
  return result.data?.webhooks || [];
}

async function createOrderWebhook() {
  console.log('Creating orders/create webhook...');

  const result = await shopifyRequest('POST', 'webhooks.json', {
    webhook: {
      topic: 'orders/create',
      address: `${CONFIG.WEBHOOK_URL}?action=shopifyWebhook&event=orders/create`,
      format: 'json'
    }
  });

  if (result.success) {
    console.log('✓ orders/create webhook created!');
    console.log(`  ID: ${result.data.webhook.id}`);
    console.log(`  Address: ${result.data.webhook.address}`);
  } else {
    console.log('✗ Failed to create webhook');
    console.log('  Error:', JSON.stringify(result.data, null, 2));
  }

  return result;
}

async function createCustomerWebhook() {
  console.log('Creating customers/create webhook...');

  const result = await shopifyRequest('POST', 'webhooks.json', {
    webhook: {
      topic: 'customers/create',
      address: `${CONFIG.WEBHOOK_URL}?action=shopifyWebhook&event=customers/create`,
      format: 'json'
    }
  });

  if (result.success) {
    console.log('✓ customers/create webhook created!');
    console.log(`  ID: ${result.data.webhook.id}`);
  } else {
    console.log('✗ Failed to create webhook');
    console.log('  Error:', JSON.stringify(result.data, null, 2));
  }

  return result;
}

async function deleteWebhook(webhookId) {
  console.log(`Deleting webhook ${webhookId}...`);
  const result = await shopifyRequest('DELETE', `webhooks/${webhookId}.json`);
  if (result.success) {
    console.log('✓ Webhook deleted');
  } else {
    console.log('✗ Failed to delete webhook');
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  switch (command) {
    case 'list':
      await listWebhooks();
      break;

    case 'setup':
      console.log('=== Setting up Shopify Webhooks for Auto CSA Import ===\n');

      // List existing
      const existing = await listWebhooks();

      // Check if order webhook already exists
      const hasOrderWebhook = existing.some(w => w.topic === 'orders/create');
      const hasCustomerWebhook = existing.some(w => w.topic === 'customers/create');

      if (!hasOrderWebhook) {
        await createOrderWebhook();
      } else {
        console.log('✓ orders/create webhook already exists');
      }

      if (!hasCustomerWebhook) {
        await createCustomerWebhook();
      } else {
        console.log('✓ customers/create webhook already exists');
      }

      console.log('\n=== Setup Complete ===');
      console.log('New orders will now automatically sync to your sales dashboard!');
      break;

    case 'delete':
      const webhookId = args[1];
      if (!webhookId) {
        console.log('Usage: node setup_shopify_webhook.js delete <webhook_id>');
        console.log('Run "node setup_shopify_webhook.js list" to see webhook IDs');
        return;
      }
      await deleteWebhook(webhookId);
      break;

    case 'reset':
      console.log('Removing all webhooks and recreating...\n');
      const webhooks = await listWebhooks();
      for (const wh of webhooks) {
        await deleteWebhook(wh.id);
      }
      await createOrderWebhook();
      await createCustomerWebhook();
      break;

    default:
      console.log('Usage:');
      console.log('  node setup_shopify_webhook.js setup   - Create webhooks');
      console.log('  node setup_shopify_webhook.js list    - List webhooks');
      console.log('  node setup_shopify_webhook.js delete <id> - Delete a webhook');
      console.log('  node setup_shopify_webhook.js reset   - Delete all and recreate');
  }
}

main().catch(console.error);
