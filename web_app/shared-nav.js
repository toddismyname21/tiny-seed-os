/**
 * Tiny Seed OS — Shared Navigation Bar
 * Auto-injects a minimal top navigation bar into every page.
 *
 * Usage: <script src="shared-nav.js"></script> (before </body>)
 */
(function() {
    'use strict';

    // Don't inject on index.html (it IS the hub)
    var path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('index.html')) return;

    // Page name map (filename → display name)
    var PAGE_NAMES = {
        'chief-of-staff.html': 'Chief of Staff',
        'greenhouse-dashboard.html': 'Greenhouse Manager',
        'seedling-presale-2026.html': 'Seedling Presale',
        'seedling-wholesale-2026.html': 'Seedling Wholesale',
        'seedling-admin.html': 'Seedling Admin',
        'chef-order.html': 'Chef Ordering',
        'csa.html': 'CSA Manager',
        'sales.html': 'Sales Dashboard',
        'admin.html': 'Admin Panel',
        'employee-management.html': 'Employee Management',
        'employee-onboarding.html': 'Employee Onboarding',
        'schedule.html': 'Schedule',
        'task-assignment.html': 'Task Assignment',
        'manager-dashboard.html': 'Manager Dashboard',
        'pm-monitor.html': 'PM Monitor',
        'pm-dashboard.html': 'PM Dashboard',
        'driver.html': 'Delivery Driver',
        'wholesale.html': 'Wholesale',
        'customer.html': 'Customer Portal',
        'financial-dashboard.html': 'Financial Dashboard',
        'accounting.html': 'Accounting',
        'reports-dashboard.html': 'Reports',
        'field-planner.html': 'Field Planner',
        'garage.html': 'Garage & Equipment',
        'food-safety.html': 'Food Safety',
        'labels.html': 'Label Maker',
        'smart-predictions.html': 'Smart Predictions',
        'farmers-market.html': 'Farmers Market',
        'market-sales.html': 'Market Sales',
        'marketing-command-center.html': 'Marketing',
        'loan-readiness.html': 'Loan Readiness',
        'wealth-builder.html': 'Wealth Builder',
        'quick-content.html': 'Quick Content',
        'ai-assistant.html': 'AI Assistant',
        'claude-chat.html': 'Claude Chat',
        'satellite-map.html': 'Satellite Map',
        'seo_dashboard.html': 'SEO Dashboard',
        'neighbor.html': 'Neighbor Network',
        'log-commitment.html': 'Log Commitment',
        'book-import.html': 'Book Import',
        'remote-dashboard.html': 'Remote Dashboard',
        'delivery-zone-checker.html': 'Delivery Zones',
        'command-center.html': 'Command Center'
    };

    // Get current page name
    var filename = path.split('/').pop();
    var pageName = PAGE_NAMES[filename] || filename.replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

    // Create nav element
    var nav = document.createElement('nav');
    nav.id = 'ts-shared-nav';
    nav.setAttribute('aria-label', 'Site navigation');
    nav.innerHTML = '<a href="index.html" class="ts-nav-home" title="Back to App Hub">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L1 7h2v7h4V10h2v4h4V7h2L8 1z"/></svg>' +
        '<span>Tiny Seed OS</span></a>' +
        '<span class="ts-nav-sep">/</span>' +
        '<span class="ts-nav-current">' + pageName + '</span>';

    // Inject styles
    var style = document.createElement('style');
    style.textContent = '#ts-shared-nav{display:flex;align-items:center;gap:var(--ts-space-2,8px);padding:var(--ts-space-2,8px) var(--ts-space-4,16px);background:var(--ts-bg-base,var(--bg-dark,#141211));border-bottom:1px solid var(--ts-border,rgba(255,255,255,0.06));font-family:var(--ts-font-sans,Inter,sans-serif);font-size:var(--ts-text-xs,0.75rem);position:sticky;top:0;z-index:100;}' +
        '.ts-nav-home{display:inline-flex;align-items:center;gap:var(--ts-space-1,4px);color:var(--ts-text-secondary,#5c5749);text-decoration:none;font-weight:500;transition:color var(--ts-dur-fast,120ms);}' +
        '.ts-nav-home:hover{color:var(--ts-primary,#22c55e);}' +
        '.ts-nav-home svg{opacity:0.7;}' +
        '.ts-nav-sep{color:var(--ts-text-secondary,#5c5749);opacity:0.4;}' +
        '.ts-nav-current{color:var(--ts-text,#ece8e1);font-weight:600;}' +
        '@media(max-width:480px){.ts-nav-home span{display:none;}}';

    document.head.appendChild(style);

    // Insert at top of body
    if (document.body.firstChild) {
        document.body.insertBefore(nav, document.body.firstChild);
    } else {
        document.body.appendChild(nav);
    }
})();
