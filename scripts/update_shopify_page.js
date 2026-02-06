#!/usr/bin/env node
/**
 * SHOPIFY PAGE UPDATER - Standalone Script
 * ========================================
 *
 * Run this script directly with Node.js to update the "Where to Find Us" page
 * on the Tiny Seed Farm Shopify store.
 *
 * Usage: node update_shopify_page.js
 *
 * Created: 2026-02-04
 * Purpose: Fix incorrect Lawrenceville market location (was Arsenal Park, should be Bay 41)
 */

const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  ACCESS_TOKEN: 'process.env.SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01'
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE CONTENT
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_CONTENT = `
<div class="where-to-find-us">

  <!-- About Our Farm -->
  <section class="farm-section" style="margin-bottom: 40px;">
    <div style="padding: 25px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; border-left: 4px solid #22c55e;">
      <h2 style="color: #166534; margin: 0 0 15px 0;">Our Farm Home</h2>
      <p style="margin: 0 0 10px 0; font-size: 16px; color: #15803d;">
        <strong>Tiny Seed Farm at Kretschmann Family Organic Farm</strong><br>
        257 Zeigler Rd, Rochester, PA 15074
      </p>
      <p style="margin: 0; color: #166534;">
        We're proud to continue the legacy of the Kretschmann family, bringing organic vegetables to the Pittsburgh community for decades to come.
      </p>
    </div>
  </section>

  <!-- Farmers Markets Section -->
  <section class="markets-section" style="margin-bottom: 40px;">
    <h2 style="color: #2d5a27; border-bottom: 2px solid #2d5a27; padding-bottom: 10px; margin-bottom: 25px;">Farmers Markets</h2>

    <!-- Lawrenceville -->
    <div class="market-location" style="margin-bottom: 30px; padding: 20px; background: #f8faf7; border-radius: 8px;">
      <h3 style="color: #2d5a27; margin-top: 0;">Lawrenceville Farmers Market</h3>
      <p style="margin: 10px 0;">
        <strong>Location:</strong>
        <a href="https://maps.google.com/?q=115+41st+Street+Pittsburgh+PA" target="_blank" rel="noopener" style="color: #2d5a27;">
          Bay 41, 115 41st Street, Pittsburgh, PA
        </a>
      </p>
      <p style="margin: 10px 0;"><strong>Days:</strong> Tuesdays, 3-7pm</p>
      <p style="margin: 10px 0;"><strong>Season:</strong> May 20 - November 25</p>
    </div>

    <!-- Bloomfield -->
    <div class="market-location" style="margin-bottom: 30px; padding: 20px; background: #f8faf7; border-radius: 8px;">
      <h3 style="color: #2d5a27; margin-top: 0;">Bloomfield Saturday Market</h3>
      <p style="margin: 10px 0;">
        <strong>Location:</strong>
        <a href="https://maps.google.com/?q=5050+Liberty+Avenue+Pittsburgh+PA" target="_blank" rel="noopener" style="color: #2d5a27;">
          5050 Liberty Avenue, Pittsburgh, PA
        </a>
      </p>
      <p style="margin: 10px 0;"><strong>Days:</strong> Saturdays, 9am-1pm</p>
      <p style="margin: 10px 0;"><strong>Season:</strong> May 3 - November 22</p>
      <p style="margin: 10px 0; color: #166534;"><em>Free off-street parking available</em></p>
    </div>

    <!-- Sewickley -->
    <div class="market-location" style="margin-bottom: 30px; padding: 20px; background: #f8faf7; border-radius: 8px;">
      <h3 style="color: #2d5a27; margin-top: 0;">Sewickley Farmers Market</h3>
      <p style="margin: 10px 0;">
        <strong>Location:</strong>
        <a href="https://maps.google.com/?q=200+Walnut+St+Sewickley+PA+15143" target="_blank" rel="noopener" style="color: #2d5a27;">
          St. James Church parking lot, 200 Walnut St, Sewickley, PA 15143
        </a>
      </p>
      <p style="margin: 10px 0;"><strong>Days:</strong> Saturdays</p>
      <p style="margin: 10px 0;">
        <strong>More Info:</strong>
        <a href="https://facebook.com/groups/550407619181678" target="_blank" rel="noopener" style="color: #2d5a27;">
          Facebook Group
        </a>
      </p>
    </div>
  </section>

  <!-- CSA Pickup Locations Section -->
  <section class="csa-section" style="margin-bottom: 40px;">
    <h2 style="color: #2d5a27; border-bottom: 2px solid #2d5a27; padding-bottom: 10px; margin-bottom: 25px;">CSA Pickup Locations</h2>

    <p style="margin-bottom: 20px; color: #555;">Pick up your CSA share at one of our convenient retail partner locations or at the farm:</p>

    <div style="padding: 20px; background: #f8faf7; border-radius: 8px;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Rochester</strong> - Kretschmann Family Organic Farm (Our Home Farm!)
        </li>
        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Allison Park</strong> - St. Paul's
        </li>
        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Allison Park</strong> - Simon's Produce Stand
        </li>
        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Oakmont</strong> - Today's Organic Market
        </li>
        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Highland Park</strong> - Bryant St. Market
        </li>
        <li style="padding: 12px 0;">
          <strong>North Side</strong> - Mayfly Market
        </li>
      </ul>
    </div>
  </section>

  <!-- CSA Member Community Stops Section -->
  <section class="community-stops-section" style="margin-bottom: 40px;">
    <h2 style="color: #2d5a27; border-bottom: 2px solid #2d5a27; padding-bottom: 10px; margin-bottom: 25px;">CSA Member Community Stops</h2>

    <p style="margin-bottom: 20px; color: #555;">
      Community stops are hosted by CSA members in their neighborhood. Pick up your share from a fellow member's porch on delivery day!
    </p>

    <div style="padding: 20px; background: #f8faf7; border-radius: 8px;">
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Mt. Lebanon</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Squirrel Hill</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Zelienople</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">North Park</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Fox Chapel</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Cranberry</span>
      </div>
      <p style="margin-top: 15px; font-size: 13px; color: #666;">
        <em>When you sign up for a CSA share, you'll receive the specific pickup address for your community stop.</em>
      </p>
    </div>
  </section>

  <!-- New Pickup Location CTA -->
  <section class="new-location-cta" style="margin-bottom: 20px;">
    <div style="padding: 25px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h3 style="color: #92400e; margin: 0 0 10px 0;">Want a CSA stop closer to you?</h3>
      <p style="margin: 0; color: #78350f;">
        If you can gather 15 members in your area, we can add a new pickup location!
        <a href="mailto:todd@tinyseedfarmpgh.com" style="color: #92400e; font-weight: bold;">
          Email todd@tinyseedfarmpgh.com
        </a> to start a group.
      </p>
    </div>
  </section>

</div>

<style>
  .where-to-find-us a:hover {
    text-decoration: underline;
  }

  @media (max-width: 600px) {
    .where-to-find-us .market-location,
    .where-to-find-us section > div {
      padding: 15px;
    }

    .where-to-find-us h2 {
      font-size: 1.3em;
    }

    .where-to-find-us h3 {
      font-size: 1.1em;
    }
  }
</style>
`;

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: result, statusCode: res.statusCode });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}`, details: result });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function getPages() {
  console.log('Fetching existing pages...');
  return shopifyRequest('GET', 'pages.json');
}

async function updatePage(pageId, updates) {
  console.log(`Updating page ID ${pageId}...`);
  return shopifyRequest('PUT', `pages/${pageId}.json`, { page: updates });
}

async function createPage(pageData) {
  console.log('Creating new page...');
  return shopifyRequest('POST', 'pages.json', { page: pageData });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SHOPIFY "WHERE TO FIND US" PAGE UPDATER');
  console.log('  Tiny Seed Farm - tiny-seed-farmers-market.myshopify.com');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Purpose: Fix incorrect Lawrenceville market location');
  console.log('         Was: Arsenal Park (WRONG)');
  console.log('         Now: Bay 41, 115 41st Street, Pittsburgh, PA (CORRECT)');
  console.log('');

  try {
    // Step 1: Get all pages
    const pagesResult = await getPages();

    if (!pagesResult.success) {
      console.error('ERROR: Failed to fetch pages');
      console.error(pagesResult);
      process.exit(1);
    }

    const pages = pagesResult.data.pages;
    console.log(`Found ${pages.length} pages in store:`);
    pages.forEach(p => {
      console.log(`  - ID: ${p.id}, Title: "${p.title}", Handle: "${p.handle}"`);
    });
    console.log('');

    // Step 2: Find "Where to Find Us" page
    const searchTerms = ['where to find us', 'where-to-find-us', 'find us', 'locations', 'markets'];
    let existingPage = null;

    for (const term of searchTerms) {
      existingPage = pages.find(p =>
        p.title.toLowerCase().includes(term) ||
        p.handle.toLowerCase().includes(term.replace(/ /g, '-'))
      );
      if (existingPage) {
        console.log(`Found matching page: "${existingPage.title}" (ID: ${existingPage.id})`);
        break;
      }
    }

    // Step 3: Update or Create
    let result;

    if (existingPage) {
      console.log('');
      console.log('Updating existing page with correct information...');

      result = await updatePage(existingPage.id, {
        title: 'Where to Find Us',
        body_html: PAGE_CONTENT,
        published: true
      });

      if (result.success) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SUCCESS! Page updated.');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`View the updated page at:`);
        console.log(`https://${CONFIG.STORE_NAME}.myshopify.com/pages/${result.data.page.handle}`);
        console.log('');
      } else {
        console.error('');
        console.error('ERROR: Failed to update page');
        console.error(result);
        process.exit(1);
      }

    } else {
      console.log('');
      console.log('No existing "Where to Find Us" page found.');
      console.log('Creating new page...');

      result = await createPage({
        title: 'Where to Find Us',
        handle: 'where-to-find-us',
        body_html: PAGE_CONTENT,
        published: true
      });

      if (result.success) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  SUCCESS! Page created.');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`View the new page at:`);
        console.log(`https://${CONFIG.STORE_NAME}.myshopify.com/pages/${result.data.page.handle}`);
        console.log('');
      } else {
        console.error('');
        console.error('ERROR: Failed to create page');
        console.error(result);
        process.exit(1);
      }
    }

    // Summary of correct information
    console.log('');
    console.log('CORRECT MARKET INFORMATION NOW ON PAGE:');
    console.log('────────────────────────────────────────');
    console.log('');
    console.log('1. Lawrenceville Farmers Market');
    console.log('   Location: Bay 41, 115 41st Street, Pittsburgh, PA');
    console.log('   Days: Tuesdays, 3-7pm');
    console.log('   Season: May 20 - November 25');
    console.log('');
    console.log('2. Bloomfield Saturday Market');
    console.log('   Location: 5050 Liberty Avenue, Pittsburgh, PA');
    console.log('   Days: Saturdays, 9am-1pm');
    console.log('   Season: May 3 - November 22');
    console.log('   Free off-street parking available');
    console.log('');
    console.log('3. Sewickley Farmers Market');
    console.log('   Location: St. James Church parking lot, 200 Walnut St, Sewickley, PA 15143');
    console.log('   Days: Saturdays');
    console.log('   Facebook: facebook.com/groups/550407619181678');
    console.log('');
    console.log('CSA Pickup Locations:');
    console.log('  - Rochester (Kretschmann Family Organic Farm)');
    console.log('  - Allison Park (St. Paul\'s)');
    console.log('  - Allison Park (Simon\'s Produce Stand)');
    console.log('  - Oakmont (Today\'s Organic Market)');
    console.log('  - Highland Park (Bryant St. Market)');
    console.log('  - North Side (Mayfly Market)');
    console.log('');
    console.log('Home Delivery Areas:');
    console.log('  Mt. Lebanon, Squirrel Hill, Zelienople, North Park, Fox Chapel, Cranberry');
    console.log('');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main();
