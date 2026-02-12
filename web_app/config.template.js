/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TINY SEED OS - CONFIGURATION TEMPLATE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * INSTRUCTIONS:
 * 1. Copy this file to config.js (which is gitignored)
 * 2. Fill in your actual API keys
 * 3. Include config.js BEFORE api-config.js in your HTML files
 *
 * SECURITY:
 * - NEVER commit config.js to git
 * - config.js is listed in .gitignore
 * - Rotate any keys that may have been exposed
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

window.TINY_SEED_CONFIG = {
    // ═══════════════════════════════════════════════════════════════════════════
    // GOOGLE MAPS API KEY
    // ═══════════════════════════════════════════════════════════════════════════
    // Get from: https://console.cloud.google.com/apis/credentials
    // Required APIs: Maps JavaScript API
    // Recommended restrictions: HTTP referrers (your domains only)
    GOOGLE_MAPS_API_KEY: 'YOUR_NEW_GOOGLE_MAPS_API_KEY_HERE',

    // ═══════════════════════════════════════════════════════════════════════════
    // FUTURE API KEYS (add as needed)
    // ═══════════════════════════════════════════════════════════════════════════
    // OPENAI_API_KEY: 'sk-...',
    // ANTHROPIC_API_KEY: 'sk-ant-...',
    // AGROMONITORING_API_KEY: '...',
};

console.log('Tiny Seed OS Config loaded');
