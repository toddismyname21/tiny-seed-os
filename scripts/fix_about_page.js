#!/usr/bin/env node
/**
 * FIX ABOUT PAGE
 * Corrects wrong owner information
 */

const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

// Page ID for "About Tiny Seed Farm"
const PAGE_ID = 98281848985;

const ABOUT_CONTENT = `
<div class="about-page" style="max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif; line-height: 1.7;">

  <!-- Hero -->
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #166534; font-size: 32px; margin-bottom: 15px;">About Tiny Seed Farm</h1>
    <p style="font-size: 18px; color: #555;">Growing organic vegetables for Pittsburgh families</p>
  </div>

  <!-- Our Story -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Our Story</h2>

    <p style="color: #333; margin-bottom: 15px;">
      Tiny Seed Farm is proud to continue the legacy of the Kretschmann Family Organic Farm, one of Pittsburgh's longest-running organic farms. We're committed to bringing fresh, locally-grown organic vegetables to the community for decades to come.
    </p>

    <p style="color: #333; margin-bottom: 15px;">
      Located in Rochester, PA at the historic Kretschmann Family Organic Farm site, we grow over 50 varieties of vegetables and beautiful cut flowers throughout the growing season.
    </p>
  </section>

  <!-- Our Farm -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Our Farm</h2>

    <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; border-left: 4px solid #22c55e;">
      <p style="margin: 0 0 10px 0; font-size: 18px; color: #166534;">
        <strong>Tiny Seed Farm at Kretschmann Family Organic Farm</strong>
      </p>
      <p style="margin: 0; color: #333;">
        257 Zeigler Rd, Rochester, PA 15074
      </p>
    </div>
  </section>

  <!-- How We Grow -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">How We Grow</h2>

    <div style="display: grid; gap: 15px;">
      <div style="background: #fafafa; padding: 20px; border-radius: 8px;">
        <strong style="color: #166534;">100% Organic</strong>
        <p style="margin: 8px 0 0 0; color: #555;">No synthetic pesticides, herbicides, or fertilizers. Just healthy soil and natural growing practices.</p>
      </div>

      <div style="background: #fafafa; padding: 20px; border-radius: 8px;">
        <strong style="color: #166534;">Sustainable Practices</strong>
        <p style="margin: 8px 0 0 0; color: #555;">We build healthy soil through composting, cover cropping, and crop rotation.</p>
      </div>

      <div style="background: #fafafa; padding: 20px; border-radius: 8px;">
        <strong style="color: #166534;">Fresh to You</strong>
        <p style="margin: 8px 0 0 0; color: #555;">From harvest to your table in 24 hours. That's the freshness only a local farm can deliver.</p>
      </div>
    </div>
  </section>

  <!-- What We Grow -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">What We Grow</h2>

    <p style="color: #333; margin-bottom: 15px;">Throughout the season, you'll find:</p>

    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Leafy Greens</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Tomatoes</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Peppers</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Root Vegetables</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Squash</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Herbs</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Microgreens</span>
      <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">Cut Flowers</span>
    </div>
  </section>

  <!-- Contact -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Get In Touch</h2>

    <div style="background: #fef3c7; padding: 25px; border-radius: 12px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 10px 0; color: #92400e;">
        <strong>Questions about CSA shares, delivery, or wholesale?</strong>
      </p>
      <p style="margin: 0; color: #78350f;">
        Email: <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #92400e; font-weight: 600;">todd@tinyseedfarmpgh.com</a>
      </p>
    </div>
  </section>

  <!-- CTA -->
  <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px;">
    <h3 style="color: #166534; margin: 0 0 15px 0;">Ready to taste the difference?</h3>
    <a href="/collections/tiny-seed-farm-csa" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Join Our CSA
    </a>
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
          resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data: result, statusCode: res.statusCode });
        } catch (e) {
          reject(e);
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
  console.log('  FIX ABOUT PAGE - CORRECT OWNER INFO');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('REMOVING incorrect info:');
  console.log('  - Matt and Samantha Pollack (WRONG)');
  console.log('  - Glenshaw, PA (WRONG)');
  console.log('');
  console.log('ADDING correct info:');
  console.log('  - Kretschmann Family Organic Farm legacy');
  console.log('  - 257 Zeigler Rd, Rochester, PA 15074');
  console.log('  - todd@tinyseedfarmpgh.com');
  console.log('');

  try {
    console.log(`Updating page ID ${PAGE_ID}...`);

    const result = await shopifyRequest('PUT', `pages/${PAGE_ID}.json`, {
      page: {
        title: 'About Tiny Seed Farm | Pittsburgh Organic Farm',
        body_html: ABOUT_CONTENT,
        published: true
      }
    });

    if (result.success) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  SUCCESS! About page updated with correct information');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('View at: https://tinyseedfarm.com/pages/about-tiny-seed-farm-pittsburgh');
    } else {
      console.error('FAILED:', result);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
