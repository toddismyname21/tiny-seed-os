#!/usr/bin/env node
/**
 * UPDATE ABOUT PAGE WITH TODD'S REAL STORY
 */

const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const PAGE_ID = 98281848985;

const ABOUT_CONTENT = `
<div class="about-page" style="max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif; line-height: 1.8;">

  <!-- Hero -->
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #166534; font-size: 32px; margin-bottom: 15px;">About Tiny Seed Farm</h1>
    <p style="font-size: 18px; color: #555;">Making fresh, local food accessible to all</p>
  </div>

  <!-- Todd's Story -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Our Story</h2>

    <p style="color: #333; margin-bottom: 18px;">
      My name is Todd, and I became a farmer to make a tangible difference in my community around food access.
    </p>

    <p style="color: #333; margin-bottom: 18px;">
      When I was a student working in a restaurant, I witnessed a traumatic event where someone in authority used their power to deny another person's access to food. After feeling helpless to change that outcome, I became motivated to find ways for food production to serve those who need it most.
    </p>

    <p style="color: #333; margin-bottom: 18px;">
      I changed my undergraduate major to Business and began learning how to farm from local mentors. I've devoted the last decade of my life to learning the practical aspects of food production and building the tools necessary to fulfill this much-needed service in my community.
    </p>
  </section>

  <!-- The Kretschmann Partnership -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Continuing a Legacy</h2>

    <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; border-left: 4px solid #22c55e; margin-bottom: 20px;">
      <p style="margin: 0; color: #166534; font-size: 17px;">
        <strong>Tiny Seed Farm at Kretschmann Family Organic Farm</strong><br>
        <span style="color: #333;">257 Zeigler Rd, Rochester, PA 15074</span>
      </p>
    </div>

    <p style="color: #333; margin-bottom: 18px;">
      We've partnered with the Kretschmann Farm in Beaver County, PA, whose owner is aging out of farming. Together, we're continuing the legacy of the Kretschmann Family Organic Farm by merging it with our small, future-oriented farm business.
    </p>

    <p style="color: #333; margin-bottom: 18px;">
      Tiny Seed will adopt methods that worked for the Kretschmanns, while also staying agile and responsive to our community and market demand.
    </p>
  </section>

  <!-- What We Do -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">What We Grow</h2>

    <p style="color: #333; margin-bottom: 18px;">
      Tiny Seed Farm serves the Pittsburgh area with:
    </p>

    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
      <span style="background: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 25px; font-weight: 500;">Fresh Produce</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 25px; font-weight: 500;">Mushrooms</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 25px; font-weight: 500;">Cut Flowers</span>
      <span style="background: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 25px; font-weight: 500;">Salad Greens</span>
    </div>

    <p style="color: #333;">
      You can find us at local farmers markets and through our CSA (Community Supported Agriculture) program, which provides the most stable foundation for our farm while delivering fresh, weekly produce to families across Pittsburgh.
    </p>
  </section>

  <!-- Our Mission -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Our Mission</h2>

    <div style="background: #fef3c7; padding: 25px; border-radius: 12px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #78350f; font-size: 17px; font-style: italic;">
        "I hope to expand my service to the greater Pittsburgh area and to Appalachia as a whole—making fresh, locally-grown food accessible to communities that need it most."
      </p>
      <p style="margin: 15px 0 0 0; color: #92400e; font-weight: 600;">— Todd Wilson, Founder</p>
    </div>
  </section>

  <!-- Contact -->
  <section style="margin-bottom: 40px;">
    <h2 style="color: #166534; font-size: 24px; border-bottom: 2px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px;">Get In Touch</h2>

    <p style="color: #333; margin-bottom: 15px;">
      Questions about our CSA, wholesale orders, or farmers market schedule?
    </p>

    <p style="color: #333;">
      <strong>Email:</strong> <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #166534; font-weight: 600;">todd@tinyseedfarmpgh.com</a>
    </p>
  </section>

  <!-- CTA -->
  <div style="text-align: center; padding: 35px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px;">
    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 22px;">Ready to taste the difference?</h3>
    <p style="color: #555; margin: 0 0 20px 0;">Join our CSA and get fresh, local produce delivered to your neighborhood.</p>
    <a href="/collections/tiny-seed-farm-csa" style="display: inline-block; background: #22c55e; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
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
  console.log('  UPDATE ABOUT PAGE WITH TODD\'S REAL STORY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    console.log('Updating page...');

    const result = await shopifyRequest('PUT', `pages/${PAGE_ID}.json`, {
      page: {
        title: 'About Tiny Seed Farm | Pittsburgh Organic Farm | Todd Wilson',
        body_html: ABOUT_CONTENT,
        published: true
      }
    });

    if (result.success) {
      console.log('');
      console.log('SUCCESS! About page now tells Todd\'s real story:');
      console.log('  - First-generation farmer motivated by food access');
      console.log('  - Decade of experience');
      console.log('  - Continuing Kretschmann Family Organic Farm legacy');
      console.log('  - 257 Zeigler Rd, Rochester, PA');
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
