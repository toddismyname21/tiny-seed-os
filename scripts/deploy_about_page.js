#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const PAGE_ID = 98281848985;

// UX Research Summary:
// - Lead with authentic founder story (builds trust)
// - Show growth metrics (social proof: 15 → 100+ members)
// - Keep it simple, mobile-friendly, scannable
// - Include photos
// - Clear CTA to join CSA
// - 3-5 sentence paragraphs max
// - Natural colors, clean design

const ABOUT_CONTENT = `
<div style="max-width: 720px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.7;">

  <!-- Hero Image -->
  <div style="margin-bottom: 32px; border-radius: 12px; overflow: hidden;">
    <img src="https://cdn.shopify.com/s/files/1/0555/3986/3797/files/farm-field-rows.jpg?v=1707000000"
         alt="Tiny Seed Farm fields"
         style="width: 100%; height: auto; display: block;"
         onerror="this.style.display='none'">
  </div>

  <!-- Headline -->
  <h1 style="font-size: 28px; color: #166534; margin: 0 0 24px 0; font-weight: 600;">
    Hi, I'm Todd.
  </h1>

  <!-- The Story -->
  <p style="font-size: 17px; margin-bottom: 20px;">
    I started Tiny Seed Farm with my friend and fellow farmer Dave Slebodnik. We had a simple goal: grow real food for real people in our community.
  </p>

  <p style="font-size: 17px; margin-bottom: 20px;">
    After that first season, I continued building the farm on my own. What started as 15 CSA members has grown to <strong>over 100 families</strong> who trust us to put fresh, organic vegetables on their tables every week.
  </p>

  <!-- Photo of Farm Work -->
  <div style="margin: 32px 0; border-radius: 8px; overflow: hidden;">
    <img src="https://cdn.shopify.com/s/files/1/0555/3986/3797/files/harvest-basket.jpg?v=1707000001"
         alt="Fresh harvest from Tiny Seed Farm"
         style="width: 100%; height: auto; display: block;"
         onerror="this.style.display='none'">
  </div>

  <!-- Why I Farm -->
  <h2 style="font-size: 22px; color: #166534; margin: 32px 0 16px 0; font-weight: 600;">
    Why I Farm
  </h2>

  <p style="font-size: 17px; margin-bottom: 20px;">
    Years ago, I witnessed someone being denied access to food by someone in power. That moment changed everything for me. I decided to build something where food production serves the people who need it most.
  </p>

  <p style="font-size: 17px; margin-bottom: 20px;">
    I spent a decade learning from local farmers, changed my major to business, and put everything I had into making this work. Tiny Seed Farm is the result.
  </p>

  <!-- The Partnership -->
  <h2 style="font-size: 22px; color: #166534; margin: 32px 0 16px 0; font-weight: 600;">
    Continuing a Legacy
  </h2>

  <p style="font-size: 17px; margin-bottom: 20px;">
    Today, Tiny Seed Farm operates at the historic <strong>Kretschmann Family Organic Farm</strong> in Rochester, PA. The Kretschmanns are aging out of farming, and we're honored to continue their legacy—bringing organic vegetables to Pittsburgh for decades to come.
  </p>

  <div style="background: #f0fdf4; padding: 20px 24px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 24px 0;">
    <p style="margin: 0; font-size: 16px; color: #166534;">
      <strong>Our Farm</strong><br>
      257 Zeigler Rd, Rochester, PA 15074
    </p>
  </div>

  <!-- What We Grow -->
  <h2 style="font-size: 22px; color: #166534; margin: 32px 0 16px 0; font-weight: 600;">
    What We Grow
  </h2>

  <p style="font-size: 17px; margin-bottom: 16px;">
    We grow over 50 varieties of vegetables, plus mushrooms and cut flowers through our <strong>Tiny Seed Fleurs</strong> line. Everything is grown using organic practices—no synthetic pesticides, no shortcuts.
  </p>

  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0;">
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Leafy Greens</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Tomatoes</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Root Vegetables</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Squash</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Peppers</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Herbs</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Mushrooms</span>
    <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Cut Flowers</span>
  </div>

  <!-- CTA -->
  <div style="text-align: center; padding: 40px 24px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; margin: 40px 0 32px 0;">
    <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 20px;">Join 100+ Pittsburgh families</h3>
    <p style="color: #555; margin: 0 0 20px 0; font-size: 16px;">Get fresh, local vegetables delivered to your neighborhood every week.</p>
    <a href="/collections/tiny-seed-farm-csa" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
      View CSA Options
    </a>
  </div>

  <!-- Contact -->
  <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 8px;">
    <p style="font-size: 15px; color: #666; margin: 0;">
      <strong>Questions?</strong> Email me at <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534;">todd@tinyseedfarmpgh.com</a>
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
          const result = JSON.parse(body);
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Deploying About page...');

  const result = await shopifyRequest('PUT', `pages/${PAGE_ID}.json`, {
    page: {
      title: 'About Tiny Seed Farm | Todd Wilson | Pittsburgh Organic Farm',
      body_html: ABOUT_CONTENT,
      published: true
    }
  });

  if (result.success) {
    console.log('✓ About page updated successfully');
    console.log('  URL: https://tinyseedfarm.com/pages/about-tiny-seed-farm-pittsburgh');
  } else {
    console.error('Failed:', result);
  }
}

main().catch(console.error);
