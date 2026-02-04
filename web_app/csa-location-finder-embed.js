/**
 * Tiny Seed Farm - CSA Location Finder Embed Script
 *
 * Add this script to any page (including Shopify) to embed the CSA Location Finder widget.
 *
 * USAGE:
 *
 * 1. Add a container div where you want the widget:
 *    <div id="tiny-seed-csa-finder"></div>
 *
 * 2. Include this script:
 *    <script src="https://toddismyname21.github.io/tiny-seed-os/web_app/csa-location-finder-embed.js"></script>
 *
 * 3. Initialize the widget:
 *    <script>
 *      TinySeedCSAFinder.init({
 *        container: 'tiny-seed-csa-finder',
 *        theme: 'light',           // 'light' or 'dark'
 *        showMap: false,           // true for full map version
 *        primaryColor: '#22c55e'   // optional custom primary color
 *      });
 *    </script>
 *
 * OR use the iframe method:
 *    <iframe
 *      src="https://toddismyname21.github.io/tiny-seed-os/web_app/csa-location-widget.html"
 *      width="100%"
 *      height="500"
 *      frameborder="0"
 *      style="border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
 *    </iframe>
 */

(function() {
  'use strict';

  // CSA Pickup Locations Data - All Community Stops
  const PICKUP_LOCATIONS = [
    // Farm Location
    { id: 'rochester', name: 'Rochester - Kretschmann Farm', address: '257 Zeigler Rd, Rochester, PA 15074', lat: 40.7020, lng: -80.2887, type: 'farm', schedule: 'Farm Hours' },
    // Farmer's Markets
    { id: 'lawrenceville', name: 'Lawrenceville - Tuesday Market', address: '115 41st Street, Pittsburgh', lat: 40.4677, lng: -79.9568, type: 'market', schedule: 'Tue 4-7pm' },
    { id: 'bloomfield', name: 'Bloomfield - Saturday Market', address: '5050 Liberty Ave, Pittsburgh', lat: 40.4614, lng: -79.9479, type: 'market', schedule: 'Sat 9am-2pm' },
    { id: 'sewickley', name: 'Sewickley - Saturday Market', address: '200 Walnut St, Sewickley', lat: 40.5363, lng: -80.1848, type: 'market', schedule: 'Sat 9am-1pm' },
    // Partner Stores
    { id: 'allison-stpauls', name: "Allison Park - St. Paul's", address: "St. Paul's Church, Allison Park", lat: 40.5592, lng: -79.9578, type: 'market', schedule: 'Wed 4-6pm' },
    { id: 'allison-simons', name: "Allison Park - Simon's", address: "Simon's Produce Stand", lat: 40.5545, lng: -79.9502, type: 'market', schedule: 'Daily' },
    { id: 'oakmont', name: "Oakmont - Today's Organic", address: "Today's Organic Market, Oakmont", lat: 40.5202, lng: -79.8424, type: 'market', schedule: 'Market Hours' },
    { id: 'highland-park', name: 'Highland Park - Bryant St.', address: 'Bryant St. Market, Pittsburgh', lat: 40.4789, lng: -79.9192, type: 'market', schedule: 'Market Hours' },
    { id: 'north-side', name: 'North Side - Mayfly Market', address: 'Mayfly Market, Pittsburgh', lat: 40.4545, lng: -80.0158, type: 'market', schedule: 'Market Hours' },
    // CSA Member Community Stops (pickup from member's porch)
    { id: 'mt-lebanon', name: 'Mt. Lebanon - Community Stop', address: 'Mt. Lebanon, Pittsburgh', lat: 40.3898, lng: -80.0312, type: 'community', schedule: 'Weekly Pickup' },
    { id: 'squirrel-hill', name: 'Squirrel Hill - Community Stop', address: 'Squirrel Hill, Pittsburgh', lat: 40.4316, lng: -79.9269, type: 'community', schedule: 'Weekly Pickup' },
    { id: 'fox-chapel', name: 'Fox Chapel - Community Stop', address: 'Fox Chapel, Pittsburgh', lat: 40.5106, lng: -79.9006, type: 'community', schedule: 'Weekly Pickup' },
    { id: 'cranberry', name: 'Cranberry - Community Stop', address: 'Cranberry Township', lat: 40.6864, lng: -80.1018, type: 'community', schedule: 'Weekly Pickup' },
    { id: 'north-park', name: 'North Park - Community Stop', address: 'North Park Area', lat: 40.5789, lng: -80.0148, type: 'community', schedule: 'Weekly Pickup' },
    { id: 'zelienople', name: 'Zelienople - Community Stop', address: 'Zelienople, PA', lat: 40.7948, lng: -80.1398, type: 'community', schedule: 'Weekly Pickup' }
  ];

  // Community Stop areas (CSA member porches - NOT home delivery)
  const COMMUNITY_STOP_ZIPS = {
    '15228': 'Mt. Lebanon', '15234': 'Mt. Lebanon', '15216': 'Mt. Lebanon', '15243': 'Mt. Lebanon',
    '15217': 'Squirrel Hill', '15218': 'Squirrel Hill', '15221': 'Squirrel Hill',
    '15238': 'Fox Chapel', '15044': 'Fox Chapel',
    '16066': 'Cranberry', '16046': 'Cranberry',
    '15237': 'North Park', '15090': 'North Park',
    '16063': 'Zelienople', '16053': 'Zelienople'
  };

  // ZIP to coordinates mapping
  const ZIP_COORDS = {
    '15074': { lat: 40.7020, lng: -80.2887 },
    '15143': { lat: 40.5363, lng: -80.1848 },
    '15139': { lat: 40.5202, lng: -79.8424 },
    '15228': { lat: 40.3898, lng: -80.0312 },
    '15234': { lat: 40.3756, lng: -80.0234 },
    '15216': { lat: 40.3912, lng: -80.0445 },
    '15243': { lat: 40.3734, lng: -80.0567 },
    '15217': { lat: 40.4316, lng: -79.9269 },
    '15218': { lat: 40.4234, lng: -79.8956 },
    '15221': { lat: 40.4378, lng: -79.8623 },
    '15238': { lat: 40.5106, lng: -79.9006 },
    '15044': { lat: 40.5234, lng: -79.8845 },
    '16066': { lat: 40.6864, lng: -80.1018 },
    '16046': { lat: 40.6756, lng: -80.0878 },
    '15237': { lat: 40.5789, lng: -80.0148 },
    '15090': { lat: 40.5912, lng: -80.0345 },
    '16063': { lat: 40.7948, lng: -80.1398 },
    '16053': { lat: 40.7823, lng: -80.1256 },
    '15212': { lat: 40.4545, lng: -80.0158 },
    '15201': { lat: 40.4677, lng: -79.9568 },
    '15206': { lat: 40.4789, lng: -79.9192 },
    '15224': { lat: 40.4614, lng: -79.9479 },
    '15101': { lat: 40.5545, lng: -79.9502 }
  };

  // Calculate distance using Haversine formula
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Find closest locations
  function findClosestLocations(lat, lng) {
    return PICKUP_LOCATIONS.map(loc => ({
      ...loc,
      distance: calculateDistance(lat, lng, loc.lat, loc.lng)
    })).sort((a, b) => a.distance - b.distance);
  }

  // Check if ZIP has a community stop nearby
  function hasCommunityStop(zip) {
    return COMMUNITY_STOP_ZIPS[zip] || null;
  }

  // Widget class
  class CSAFinderWidget {
    constructor(options) {
      this.options = {
        container: 'tiny-seed-csa-finder',
        theme: 'light',
        showMap: false,
        primaryColor: '#22c55e',
        baseUrl: 'https://toddismyname21.github.io/tiny-seed-os/web_app/',
        ...options
      };

      this.container = document.getElementById(this.options.container);
      if (!this.container) {
        console.error('TinySeedCSAFinder: Container not found');
        return;
      }

      this.render();
    }

    render() {
      const primaryColor = this.options.primaryColor;
      const primaryDark = this.adjustColor(primaryColor, -20);

      this.container.innerHTML = `
        <style>
          .tsf-widget { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; }
          .tsf-widget * { box-sizing: border-box; margin: 0; padding: 0; }
          .tsf-header { text-align: center; margin-bottom: 20px; }
          .tsf-header h3 { font-size: 1.25rem; color: #1a1a1a; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .tsf-header p { font-size: 0.9rem; color: #666; margin-top: 6px; }
          .tsf-input-group { display: flex; gap: 10px; margin-bottom: 12px; }
          .tsf-input { flex: 1; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 15px; }
          .tsf-input:focus { outline: none; border-color: ${primaryColor}; }
          .tsf-btn { padding: 12px 20px; background: ${primaryColor}; color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
          .tsf-btn:hover { background: ${primaryDark}; }
          .tsf-btn-full { width: 100%; }
          .tsf-btn-secondary { background: #3b82f6; }
          .tsf-btn-secondary:hover { background: #2563eb; }
          .tsf-zones { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 16px 0; }
          .tsf-zone-tag { background: #e8f5e9; color: #2d5a27; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
          .tsf-results { display: none; }
          .tsf-results.show { display: block; }
          .tsf-banner { padding: 16px; border-radius: 10px; text-align: center; margin-bottom: 16px; color: white; }
          .tsf-banner.delivery { background: linear-gradient(135deg, ${primaryColor}, ${primaryDark}); }
          .tsf-banner.pickup { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
          .tsf-banner h4 { font-size: 1.1rem; margin-bottom: 4px; }
          .tsf-banner p { font-size: 0.9rem; opacity: 0.95; }
          .tsf-list { max-height: 250px; overflow-y: auto; }
          .tsf-location { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #f8faf7; border-radius: 8px; margin-bottom: 8px; }
          .tsf-location:hover { background: #e8f5e9; }
          .tsf-icon { width: 36px; height: 36px; background: ${primaryColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
          .tsf-icon.farm { background: #ea580c; }
          .tsf-icon.community { background: #8b5cf6; }
          .tsf-info { flex: 1; }
          .tsf-name { font-weight: 600; font-size: 0.9rem; }
          .tsf-details { font-size: 0.8rem; color: #666; }
          .tsf-distance { font-size: 0.85rem; color: ${primaryDark}; font-weight: 600; margin-top: 4px; }
          .tsf-cta { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; text-align: center; margin-top: 16px; }
          .tsf-cta p { font-size: 0.85rem; color: #9a3412; margin-bottom: 8px; }
          .tsf-cta a { color: #ea580c; font-weight: 600; text-decoration: none; }
          .tsf-cta a:hover { text-decoration: underline; }
          .tsf-actions { display: flex; gap: 10px; margin-top: 16px; }
          .tsf-actions .tsf-btn { flex: 1; }
          .tsf-loading { text-align: center; padding: 30px; display: none; }
          .tsf-loading.show { display: block; }
          .tsf-spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: ${primaryColor}; border-radius: 50%; animation: tsf-spin 1s linear infinite; }
          @keyframes tsf-spin { to { transform: rotate(360deg); } }
          .tsf-link { text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
          .tsf-link a { color: ${primaryColor}; text-decoration: none; font-size: 0.9rem; }
          .tsf-link a:hover { text-decoration: underline; }
          .tsf-hidden { display: none !important; }
        </style>

        <div class="tsf-widget">
          <div class="tsf-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${primaryColor}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              Find Your CSA Pickup
            </h3>
            <p>Enter your ZIP code to find nearby locations</p>
          </div>

          <div id="tsf-search">
            <div class="tsf-input-group">
              <input type="text" id="tsf-zip" class="tsf-input" placeholder="Enter ZIP code" maxlength="5">
              <button type="button" class="tsf-btn" onclick="window.TinySeedCSAFinder._search()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              </button>
            </div>

            <button type="button" class="tsf-btn tsf-btn-secondary tsf-btn-full" onclick="window.TinySeedCSAFinder._locate()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
              Use My Location
            </button>

            <div class="tsf-zones">
              <span class="tsf-zone-tag">Mt. Lebanon</span>
              <span class="tsf-zone-tag">Squirrel Hill</span>
              <span class="tsf-zone-tag">Fox Chapel</span>
              <span class="tsf-zone-tag">Cranberry</span>
              <span class="tsf-zone-tag">North Park</span>
              <span class="tsf-zone-tag">Zelienople</span>
            </div>
            <p style="text-align: center; font-size: 0.75rem; color: #666;">
              Neighborhood community stops available
            </p>
          </div>

          <div id="tsf-loading" class="tsf-loading">
            <div class="tsf-spinner"></div>
            <p style="margin-top: 8px; color: #666;">Finding locations...</p>
          </div>

          <div id="tsf-results" class="tsf-results">
            <div id="tsf-banner" class="tsf-banner delivery"></div>
            <div id="tsf-list" class="tsf-list"></div>

            <div class="tsf-cta">
              <p><strong>Not near you?</strong> Gather 15 neighbors to start a new location!</p>
              <a href="mailto:todd@tinyseedfarmpgh.com">Email todd@tinyseedfarmpgh.com</a>
            </div>

            <div class="tsf-actions">
              <button class="tsf-btn tsf-btn-secondary" onclick="window.TinySeedCSAFinder._reset()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                New Search
              </button>
              <a href="${this.options.baseUrl}csa-location-finder.html" target="_blank" class="tsf-btn" style="text-decoration: none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>
                View Map
              </a>
            </div>
          </div>

          <div class="tsf-link">
            <a href="${this.options.baseUrl}csa-location-finder.html" target="_blank">
              View Full Interactive Map
            </a>
          </div>
        </div>
      `;

      // Set up event listeners
      const zipInput = document.getElementById('tsf-zip');
      if (zipInput) {
        zipInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.search();
          }
        });
      }
    }

    search() {
      const zip = document.getElementById('tsf-zip').value.trim();
      if (!zip || zip.length !== 5) {
        alert('Please enter a valid 5-digit ZIP code');
        return;
      }

      this.showLoading();

      setTimeout(() => {
        const coords = ZIP_COORDS[zip];
        const deliveryZone = hasCommunityStop(zip);

        if (coords) {
          this.displayResults(coords.lat, coords.lng, deliveryZone);
        } else {
          // Default to Pittsburgh center
          this.displayResults(40.4406, -79.9959, null);
        }
      }, 400);
    }

    locate() {
      if (!navigator.geolocation) {
        alert('Geolocation not supported. Please enter your ZIP code.');
        return;
      }

      this.showLoading();

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.displayResults(pos.coords.latitude, pos.coords.longitude, null);
        },
        (err) => {
          this.hideLoading();
          alert('Could not get your location. Please enter your ZIP code.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    displayResults(lat, lng, communityStop) {
      this.hideLoading();

      const searchEl = document.getElementById('tsf-search');
      const resultsEl = document.getElementById('tsf-results');
      const bannerEl = document.getElementById('tsf-banner');
      const listEl = document.getElementById('tsf-list');

      searchEl.classList.add('tsf-hidden');
      resultsEl.classList.add('show');

      // Update banner
      if (communityStop) {
        bannerEl.className = 'tsf-banner delivery';
        bannerEl.innerHTML = `
          <h4>Community Stop in ${communityStop}!</h4>
          <p>Pick up your share from a neighbor's porch weekly.</p>
        `;
      } else {
        bannerEl.className = 'tsf-banner pickup';
        bannerEl.innerHTML = `
          <h4>Pickup Locations Near You</h4>
          <p>Choose from these convenient spots:</p>
        `;
      }

      // Build list
      const locations = findClosestLocations(lat, lng);
      listEl.innerHTML = '';

      locations.slice(0, 5).forEach(loc => {
        const item = document.createElement('div');
        item.className = 'tsf-location';
        item.innerHTML = `
          <div class="tsf-icon ${loc.type}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <div class="tsf-info">
            <div class="tsf-name">${loc.name}</div>
            <div class="tsf-details">${loc.address} | ${loc.schedule}</div>
            <div class="tsf-distance">${loc.distance.toFixed(1)} miles</div>
          </div>
        `;
        listEl.appendChild(item);
      });
    }

    showLoading() {
      document.getElementById('tsf-search').classList.add('tsf-hidden');
      document.getElementById('tsf-results').classList.remove('show');
      document.getElementById('tsf-loading').classList.add('show');
    }

    hideLoading() {
      document.getElementById('tsf-loading').classList.remove('show');
    }

    reset() {
      document.getElementById('tsf-search').classList.remove('tsf-hidden');
      document.getElementById('tsf-results').classList.remove('show');
      document.getElementById('tsf-zip').value = '';
    }

    // Utility to adjust color brightness
    adjustColor(color, percent) {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
      ).toString(16).slice(1);
    }
  }

  // Global API
  window.TinySeedCSAFinder = {
    instance: null,

    init: function(options) {
      this.instance = new CSAFinderWidget(options);
      return this.instance;
    },

    _search: function() {
      if (this.instance) this.instance.search();
    },

    _locate: function() {
      if (this.instance) this.instance.locate();
    },

    _reset: function() {
      if (this.instance) this.instance.reset();
    }
  };

  // Auto-init if container exists
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('tiny-seed-csa-finder');
    if (container && !window.TinySeedCSAFinder.instance) {
      window.TinySeedCSAFinder.init({});
    }
  });

})();
