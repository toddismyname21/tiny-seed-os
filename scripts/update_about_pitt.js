#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

const PAGE_ID = 98281848985;

const ABOUT_CONTENT = `
<div style="max-width: 720px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.7;">

  <!-- Headline -->
  <h1 style="font-size: 28px; color: #166534; margin: 0 0 24px 0; font-weight: 600;">
    Hi, I'm Todd.
  </h1>

  <!-- The Story -->
  <p style="font-size: 17px; margin-bottom: 20px;">
    I fell in love with Pittsburgh during my time at the University of Pittsburgh. After graduating, I knew I wanted to stay and build something meaningful here.
  </p>

  <p style="font-size: 17px; margin-bottom: 20px;">
    I started Tiny Seed Farm with my friend and fellow farmer Dave Slebodnik. We had a simple goal: grow real food for real people in our community.
  </p>

  <p style="font-size: 17px; margin-bottom: 20px;">
    After that first season, I continued building the farm on my own. What started as 15 CSA members has grown to <strong>over 100 families</strong> who trust us to put fresh, organic vegetables on their tables every week.
  </p>

  <!-- Why I Farm -->
  <h2 style="font-size: 22px; color: #166534; margin: 32px 0 16px 0; font-weight: 600;">
    Why I Farm
  </h2>

  <p style="font-size: 17px; margin-bottom: 20px;">
    I believe everyone deserves access to fresh, locally-grown food. I spent years learning from local farmers and put everything I had into making this work.
  </p>

  <p style="font-size: 17px; margin-bottom: 20px;">
    Tiny Seed Farm is the result—a way to serve my community and make real food accessible to the people who need it.
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
  console.log('PROPOSED ABOUT PAGE CONTENT:');
  console.log('============================');
  console.log('');
  console.log('Hi, I\'m Todd.');
  console.log('');
  console.log('I fell in love with Pittsburgh during my time at the University of Pittsburgh.');
  console.log('After graduating, I knew I wanted to stay and build something meaningful here.');
  console.log('');
  console.log('I started Tiny Seed Farm with my friend and fellow farmer Dave Slebodnik.');
  console.log('We had a simple goal: grow real food for real people in our community.');
  console.log('');
  console.log('After that first season, I continued building the farm on my own.');
  console.log('What started as 15 CSA members has grown to over 100 families.');
  console.log('');
  console.log('[...rest of page includes Why I Farm, Kretschmann legacy, What We Grow, CTA...]');
  console.log('');
  console.log('============================');
  console.log('');

  // Following the new rules - get confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Deploy this to Shopify? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('Deploying...');
      const result = await shopifyRequest('PUT', `pages/${PAGE_ID}.json`, {
        page: {
          title: 'About Tiny Seed Farm | Todd Wilson | Pittsburgh Organic Farm',
          body_html: ABOUT_CONTENT,
          published_at: new Date().toISOString(),
          published: true
        }
      });

      if (result.success) {
        console.log('✓ Done!');
        console.log('  URL: https://tinyseedfarm.com/pages/about-tiny-seed-farm-pittsburgh?v=5');
      } else {
        console.error('Failed:', result);
      }
    } else {
      console.log('Cancelled. No changes made.');
    }
    rl.close();
  });
}

main().catch(console.error);
