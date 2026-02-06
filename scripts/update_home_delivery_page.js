#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const PAGE_ID = 116588544153;

const PAGE_HTML = `
<div style="max-width: 700px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- Check Eligibility CTA -->
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 28px; border-radius: 14px; margin-bottom: 28px; text-align: center;">
    <h2 style="margin: 0 0 8px 0; font-size: 22px;">Can we deliver to you?</h2>
    <p style="margin: 0 0 18px 0; opacity: 0.95;">Check if your address is within our Wednesday delivery route.</p>
    <a href="https://toddismyname21.github.io/tiny-seed-os/web_app/delivery-zone-checker.html" target="_blank" style="display: inline-block; background: white; color: #1d4ed8; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem;">
      Check My Address →
    </a>
  </div>

  <!-- How It Works -->
  <div style="margin-bottom: 28px;">
    <h2 style="color: #166534; font-size: 20px; margin-bottom: 16px;">How Home Delivery Works</h2>
    <div style="display: grid; gap: 12px;">
      <div style="display: flex; align-items: flex-start; gap: 14px; padding: 14px; background: #f0fdf4; border-radius: 10px;">
        <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">1</div>
        <div>
          <strong style="color: #166534;">Check your address</strong>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 0.9rem;">We deliver within 7 miles of our Wednesday route.</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 14px; padding: 14px; background: #f0fdf4; border-radius: 10px;">
        <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">2</div>
        <div>
          <strong style="color: #166534;">Add delivery to your CSA</strong>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 0.9rem;">Select home delivery option when you purchase your share.</p>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 14px; padding: 14px; background: #f0fdf4; border-radius: 10px;">
        <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">3</div>
        <div>
          <strong style="color: #166534;">Fresh veggies at your door</strong>
          <p style="margin: 4px 0 0 0; color: #555; font-size: 0.9rem;">We deliver every Wednesday during the season.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Delivery Options -->
  <div style="margin-bottom: 28px;">
    <h2 style="color: #166534; font-size: 20px; margin-bottom: 16px;">Home Delivery Options</h2>
    <div style="border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0; color: #1a1a1a; font-size: 17px;">Weekly Home Delivery</h3>
          <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">$5/week</span>
        </div>
        <p style="margin: 0; color: #666; font-size: 0.9rem;">Add to any weekly CSA share. Delivered every Wednesday.</p>
      </div>
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0; color: #1a1a1a; font-size: 17px;">Biweekly Home Delivery</h3>
          <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">$5/delivery</span>
        </div>
        <p style="margin: 0; color: #666; font-size: 0.9rem;">Add to any biweekly CSA share. Delivered every other Wednesday.</p>
      </div>
    </div>
  </div>

  <!-- Shop Button -->
  <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 14px; margin-bottom: 28px;">
    <p style="color: #166534; margin: 0 0 14px 0; font-size: 1.05rem;">Ready to get started?</p>
    <a href="/collections/tiny-seed-farm-csa" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem;">
      Browse CSA Shares
    </a>
  </div>

  <!-- Delivery Area -->
  <div style="margin-bottom: 24px;">
    <h2 style="color: #166534; font-size: 20px; margin-bottom: 12px;">Delivery Area</h2>
    <p style="color: #555; font-size: 0.95rem; margin-bottom: 14px;">
      We deliver along our Wednesday route through these areas:
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Zelienople</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Cranberry</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Allison Park</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Fox Chapel</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Lawrenceville</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Highland Park</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Squirrel Hill</span>
      <span style="background: #eff6ff; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem;">Mt. Lebanon</span>
    </div>
    <p style="color: #666; font-size: 0.85rem; margin-top: 12px; font-style: italic;">
      Not listed? <a href="https://toddismyname21.github.io/tiny-seed-os/web_app/delivery-zone-checker.html" target="_blank" style="color: #3b82f6;">Check the calculator</a> — we may still reach you!
    </p>
  </div>

  <!-- Contact -->
  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #666; font-size: 0.9rem; margin: 0;">
      Questions? <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534; font-weight: 600;">todd@tinyseedfarmpgh.com</a>
    </p>
  </div>

</div>
`;

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
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(body) });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Updating Home Delivery page...');

  const result = await shopifyRequest('PUT', `pages/${PAGE_ID}.json`, {
    page: {
      id: PAGE_ID,
      body_html: PAGE_HTML
    }
  });

  if (result.success) {
    console.log('✓ Home Delivery page updated!');
    console.log('');
    console.log('View: https://tinyseedfarm.com/pages/csa-home-delivery-pittsburgh');
  } else {
    console.error('Failed:', result.data);
  }
}

main().catch(console.error);
