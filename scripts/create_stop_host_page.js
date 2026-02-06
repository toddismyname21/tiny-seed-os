#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const PAGE_HTML = `
<div style="max-width: 700px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- Hero -->
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 32px; border-radius: 16px; margin-bottom: 28px; text-align: center;">
    <h1 style="margin: 0 0 10px 0; font-size: 26px;">Become a Community Stop Host</h1>
    <p style="margin: 0; font-size: 1.1rem; opacity: 0.95;">Bring fresh farm vegetables to your neighborhood</p>
  </div>

  <!-- Benefit Callout -->
  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
    <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 20px;">🎉 Stop Hosts Get 25% Off!</h2>
    <p style="color: #78350f; margin: 0; font-size: 1rem;">
      As a thank you for hosting, you'll receive <strong>25% off your CSA share</strong> for the season.
    </p>
  </div>

  <!-- What It Means -->
  <div style="margin-bottom: 28px;">
    <h2 style="color: #166534; font-size: 20px; margin-bottom: 14px;">What Does a Stop Host Do?</h2>
    <ul style="margin: 0; padding-left: 20px; color: #444; line-height: 1.9; font-size: 0.95rem;">
      <li>Provide a porch or covered area for weekly CSA box drop-off</li>
      <li>Be available during the pickup window (usually 2-3 hours)</li>
      <li>Help spread the word to neighbors (we need 15+ members per stop)</li>
      <li>That's it! We handle the rest.</li>
    </ul>
  </div>

  <!-- Requirements -->
  <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin-bottom: 28px;">
    <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 17px;">Requirements</h3>
    <ul style="margin: 0; padding-left: 20px; color: #444; line-height: 1.8; font-size: 0.9rem;">
      <li><strong>15+ CSA members</strong> in your area willing to pick up at your location</li>
      <li>Covered porch or area protected from weather</li>
      <li>Available on delivery day (Wednesdays)</li>
      <li>Located within our delivery route area</li>
    </ul>
  </div>

  <!-- Form -->
  <div style="border: 2px solid #e5e7eb; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
    <h2 style="color: #166534; font-size: 20px; margin: 0 0 20px 0;">Request to Become a Stop Host</h2>

    <form action="https://formsubmit.co/todd@tinyseedfarmpgh.com" method="POST" style="display: grid; gap: 16px;">
      <!-- Hidden fields for FormSubmit -->
      <input type="hidden" name="_subject" value="New Community Stop Host Request">
      <input type="hidden" name="_captcha" value="false">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_next" value="https://tinyseedfarm.com/pages/csa-pickup-locations?submitted=true">

      <!-- Name -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Your Name *</label>
        <input type="text" name="name" required style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
      </div>

      <!-- Email -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Email Address *</label>
        <input type="email" name="email" required style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
      </div>

      <!-- Phone -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Phone Number *</label>
        <input type="tel" name="phone" required style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
      </div>

      <!-- Address -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Your Address (Proposed Stop Location) *</label>
        <input type="text" name="address" required placeholder="Street address" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; margin-bottom: 8px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
          <input type="text" name="city" required placeholder="City" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
          <input type="text" name="zip" required placeholder="ZIP" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
        </div>
      </div>

      <!-- Neighborhood -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Neighborhood Name *</label>
        <input type="text" name="neighborhood" required placeholder="e.g., Regent Square, Brookline, etc." style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
      </div>

      <!-- Number of Neighbors -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">How many neighbors could you recruit? *</label>
        <select name="estimated_members" required style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; background: white;">
          <option value="">Select...</option>
          <option value="5-10">5-10 (not quite enough yet)</option>
          <option value="10-15">10-15 (almost there!)</option>
          <option value="15-20">15-20 (perfect!)</option>
          <option value="20+">20+ (amazing!)</option>
        </select>
      </div>

      <!-- Pickup Space -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Describe your pickup space *</label>
        <textarea name="pickup_space" required rows="3" placeholder="e.g., Covered front porch, garage, etc." style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; font-family: inherit;"></textarea>
      </div>

      <!-- Best Day/Time -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">What pickup window works best? *</label>
        <input type="text" name="pickup_window" required placeholder="e.g., Wednesdays 4-7pm" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
      </div>

      <!-- Additional Notes -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Anything else we should know?</label>
        <textarea name="notes" rows="3" placeholder="Optional" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; font-family: inherit;"></textarea>
      </div>

      <!-- Are you a current CSA member? -->
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #333; font-size: 0.9rem;">Are you currently a CSA member? *</label>
        <select name="current_member" required style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; background: white;">
          <option value="">Select...</option>
          <option value="Yes">Yes, I'm a current member</option>
          <option value="No, but interested">No, but I want to join</option>
          <option value="Previously">I was a member previously</option>
        </select>
      </div>

      <!-- Submit -->
      <button type="submit" style="background: #22c55e; color: white; padding: 16px 32px; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 8px;">
        Submit Request →
      </button>
    </form>
  </div>

  <!-- What Happens Next -->
  <div style="background: #eff6ff; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
    <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 17px;">What Happens Next?</h3>
    <ol style="margin: 0; padding-left: 20px; color: #444; line-height: 1.8; font-size: 0.9rem;">
      <li>Todd will review your request within 48 hours</li>
      <li>We'll check if your location fits our delivery route</li>
      <li>If approved, we'll help you spread the word to neighbors</li>
      <li>Once you hit 15 members, you're official!</li>
    </ol>
  </div>

  <!-- Contact -->
  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #666; font-size: 0.9rem; margin: 0;">
      Questions? <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534; font-weight: 600;">todd@tinyseedfarmpgh.com</a> | <a href="tel:717-725-5177" style="color: #166534; font-weight: 600;">717-725-5177</a>
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
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(body), status: res.statusCode });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Creating Stop Host Request page...');

  // Create the new page
  const result = await shopifyRequest('POST', 'pages.json', {
    page: {
      title: 'Become a Community Stop Host | 25% CSA Discount',
      handle: 'become-stop-host',
      body_html: PAGE_HTML,
      published: true
    }
  });

  if (result.success) {
    console.log('✓ Stop Host page created!');
    console.log('  URL: https://tinyseedfarm.com/pages/become-stop-host');
  } else if (result.status === 422) {
    console.log('Page may exist, updating...');
    const pages = await shopifyRequest('GET', 'pages.json?handle=become-stop-host');
    if (pages.data?.pages?.[0]) {
      await shopifyRequest('PUT', `pages/${pages.data.pages[0].id}.json`, {
        page: { body_html: PAGE_HTML }
      });
      console.log('✓ Page updated!');
    }
  }

  // Now update the locations page to link to this
  console.log('\nUpdating locations page button...');
  const locPages = await shopifyRequest('GET', 'pages.json?handle=csa-pickup-locations');
  if (locPages.data?.pages?.[0]) {
    let html = locPages.data.pages[0].body_html;
    // Update the mailto link to go to the new page
    html = html.replace(
      /href="mailto:todd@tinyseedfarmpgh.com\?subject=New%20CSA%20Location%20Request"/g,
      'href="/pages/become-stop-host"'
    );
    await shopifyRequest('PUT', `pages/${locPages.data.pages[0].id}.json`, {
      page: { body_html: html }
    });
    console.log('✓ Locations page button updated!');
  }

  console.log('\nDone!');
}

main().catch(console.error);
