/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHOPIFY PAGE MANAGER - Tiny Seed Farm
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Manages Shopify store pages via the Admin API
 *
 * Created: 2026-02-04
 * Purpose: Update "Where to Find Us" page with correct market information
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SHOPIFY_PAGE_CONFIG = {
  STORE_NAME: 'tiny-seed-farmers-market',
  get ACCESS_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty('SHOPIFY_ACCESS_TOKEN') || '';
  },
  API_VERSION: '2024-01'
};

// ═══════════════════════════════════════════════════════════════════════════
// SHOPIFY PAGE API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make a Shopify Admin API call for page management
 */
function shopifyPageApiCall(endpoint, method = 'GET', payload = null) {
  const baseUrl = `https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/admin/api/${SHOPIFY_PAGE_CONFIG.API_VERSION}`;
  const url = `${baseUrl}/${endpoint}`;

  const options = {
    method: method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_PAGE_CONFIG.ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload && (method === 'POST' || method === 'PUT')) {
    options.payload = JSON.stringify(payload);
  }

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      console.log(`Shopify API Success: ${method} ${endpoint}`);
      return { success: true, data: JSON.parse(responseText) };
    } else {
      console.error(`Shopify API Error: HTTP ${responseCode} - ${responseText}`);
      return { success: false, error: `HTTP ${responseCode}`, details: responseText };
    }
  } catch (error) {
    console.error(`Shopify API Exception: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Get all pages from Shopify store
 */
function getShopifyPages() {
  return shopifyPageApiCall('pages.json');
}

/**
 * Get a specific page by ID
 */
function getShopifyPage(pageId) {
  return shopifyPageApiCall(`pages/${pageId}.json`);
}

/**
 * Find a page by its handle (URL slug)
 */
function findShopifyPageByHandle(handle) {
  const result = getShopifyPages();
  if (!result.success) {
    return result;
  }

  const page = result.data.pages.find(p => p.handle === handle);
  if (page) {
    return { success: true, data: { page: page } };
  }
  return { success: false, error: `Page with handle "${handle}" not found` };
}

/**
 * Find a page by title (partial match)
 */
function findShopifyPageByTitle(titleSearch) {
  const result = getShopifyPages();
  if (!result.success) {
    return result;
  }

  const searchLower = titleSearch.toLowerCase();
  const page = result.data.pages.find(p =>
    p.title.toLowerCase().includes(searchLower)
  );

  if (page) {
    return { success: true, data: { page: page } };
  }
  return { success: false, error: `Page with title containing "${titleSearch}" not found` };
}

/**
 * Update a page by ID
 */
function updateShopifyPage(pageId, updates) {
  return shopifyPageApiCall(`pages/${pageId}.json`, 'PUT', { page: updates });
}

/**
 * Create a new page
 */
function createShopifyPage(pageData) {
  return shopifyPageApiCall('pages.json', 'POST', { page: pageData });
}

// ═══════════════════════════════════════════════════════════════════════════
// WHERE TO FIND US PAGE CONTENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the HTML content for the "Where to Find Us" page
 */
function generateWhereToFindUsContent() {
  return `
<div class="where-to-find-us">

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

    <div style="padding: 20px; background: #f8faf7; border-radius: 8px;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>Rochester</strong> - Kretschmann Family Organic Farm
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

  <!-- Home Delivery Section -->
  <section class="delivery-section" style="margin-bottom: 40px;">
    <h2 style="color: #2d5a27; border-bottom: 2px solid #2d5a27; padding-bottom: 10px; margin-bottom: 25px;">Home Delivery Areas</h2>

    <div style="padding: 20px; background: #f8faf7; border-radius: 8px;">
      <p style="margin: 0 0 15px 0;">We deliver directly to your porch in the following areas:</p>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Mt. Lebanon</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Squirrel Hill</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Zelienople</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">North Park</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Fox Chapel</span>
        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px;">Cranberry</span>
      </div>
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
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN UPDATE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UPDATE THE "WHERE TO FIND US" PAGE
 *
 * Run this function to fix the page with correct market information.
 *
 * This will:
 * 1. Search for existing "Where to Find Us" page
 * 2. If found, update it with correct content
 * 3. If not found, create a new page
 */
function updateWhereToFindUsPage() {
  console.log('Starting "Where to Find Us" page update...');

  // First, list all pages to find the right one
  const pagesResult = getShopifyPages();

  if (!pagesResult.success) {
    console.error('Failed to fetch pages:', pagesResult.error);
    return pagesResult;
  }

  console.log(`Found ${pagesResult.data.pages.length} pages in store`);

  // Log all pages for debugging
  pagesResult.data.pages.forEach(page => {
    console.log(`  - Page ID: ${page.id}, Title: "${page.title}", Handle: "${page.handle}"`);
  });

  // Search for the "Where to Find Us" page (try various possible names)
  const searchTerms = ['where to find us', 'where-to-find-us', 'find us', 'locations', 'markets'];
  let existingPage = null;

  for (const term of searchTerms) {
    existingPage = pagesResult.data.pages.find(p =>
      p.title.toLowerCase().includes(term) ||
      p.handle.toLowerCase().includes(term.replace(/ /g, '-'))
    );
    if (existingPage) {
      console.log(`Found matching page: "${existingPage.title}" (ID: ${existingPage.id})`);
      break;
    }
  }

  const pageContent = generateWhereToFindUsContent();

  if (existingPage) {
    // Update existing page
    console.log(`Updating existing page (ID: ${existingPage.id})...`);

    const updateResult = updateShopifyPage(existingPage.id, {
      title: 'Where to Find Us',
      body_html: pageContent,
      published: true
    });

    if (updateResult.success) {
      console.log('SUCCESS: Page updated successfully!');
      console.log(`View page at: https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/pages/${updateResult.data.page.handle}`);
      return {
        success: true,
        action: 'updated',
        pageId: existingPage.id,
        url: `https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/pages/${updateResult.data.page.handle}`,
        message: 'Where to Find Us page updated with correct market information'
      };
    } else {
      console.error('Failed to update page:', updateResult.error);
      return updateResult;
    }

  } else {
    // Create new page
    console.log('No existing page found. Creating new "Where to Find Us" page...');

    const createResult = createShopifyPage({
      title: 'Where to Find Us',
      handle: 'where-to-find-us',
      body_html: pageContent,
      published: true
    });

    if (createResult.success) {
      console.log('SUCCESS: Page created successfully!');
      console.log(`View page at: https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/pages/${createResult.data.page.handle}`);
      return {
        success: true,
        action: 'created',
        pageId: createResult.data.page.id,
        url: `https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/pages/${createResult.data.page.handle}`,
        message: 'Where to Find Us page created with correct market information'
      };
    } else {
      console.error('Failed to create page:', createResult.error);
      return createResult;
    }
  }
}

/**
 * List all pages in the store (utility function for debugging)
 */
function listAllShopifyPages() {
  const result = getShopifyPages();

  if (!result.success) {
    console.error('Error fetching pages:', result.error);
    return result;
  }

  console.log('=== SHOPIFY STORE PAGES ===');
  result.data.pages.forEach(page => {
    console.log(`
ID: ${page.id}
Title: ${page.title}
Handle: ${page.handle}
Published: ${page.published_at ? 'Yes' : 'No'}
URL: https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/pages/${page.handle}
---`);
  });

  return result;
}

/**
 * Test the Shopify connection
 */
function testShopifyPageConnection() {
  console.log('Testing Shopify connection...');

  const url = `https://${SHOPIFY_PAGE_CONFIG.STORE_NAME}.myshopify.com/admin/api/${SHOPIFY_PAGE_CONFIG.API_VERSION}/shop.json`;

  const options = {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_PAGE_CONFIG.ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      const data = JSON.parse(response.getContentText());
      console.log('SUCCESS: Connected to store:', data.shop.name);
      return { success: true, shop: data.shop };
    } else {
      console.error('Failed with status:', responseCode);
      return { success: false, error: `HTTP ${responseCode}`, details: response.getContentText() };
    }
  } catch (error) {
    console.error('Connection error:', error.toString());
    return { success: false, error: error.toString() };
  }
}
