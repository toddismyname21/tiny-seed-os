/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TINY SEED OS - AUTHENTICATION GUARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Include this file in ALL protected HTML pages to enforce authentication.
 *
 * Usage in HTML files:
 * <script src="auth-guard.js"></script>
 * OR for pages in root:
 * <script src="web_app/auth-guard.js"></script>
 *
 * Configuration via data attributes on the script tag:
 * <script src="auth-guard.js"
 *         data-required-role="Manager"
 *         data-login-url="login.html"
 *         data-allow-roles="Admin,Manager,Field_Lead">
 * </script>
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const AUTH_CONFIG = {
        // Session storage keys
        SESSION_KEY: 'tinyseed_session',

        // Session expiry (24 hours in milliseconds)
        SESSION_EXPIRY: 24 * 60 * 60 * 1000,

        // Inactivity timeout (30 minutes in milliseconds)
        INACTIVITY_TIMEOUT: 30 * 60 * 1000,

        // Inactivity check interval (1 minute)
        INACTIVITY_CHECK_INTERVAL: 60 * 1000,

        // Default login URL (relative to current page)
        DEFAULT_LOGIN_URL: 'login.html',

        // Role hierarchy (higher number = more access)
        // NOTE: Driver level 2 but can access Employee features via mode toggle
        ROLE_LEVELS: {
            'Admin': 5,
            'Manager': 4,
            'Field_Lead': 3,
            'Driver': 2,      // Can also access Employee features when in Employee Mode
            'Employee': 1,
            'Customer': 0
        },

        // Role access permissions
        // Updated 2026-01-15 based on owner requirements
        ROLE_PERMISSIONS: {
            'Admin': [
                'all',
                'financials',           // Bank accounts, investments, debt tracking
                'timeclock',            // Owner tracks their hours too
                'bypass_geofence'       // Can clock in from anywhere (working from home)
            ],
            'Manager': [
                'planning',             // View and modify crop plans
                'reports',              // All reports
                'employees',            // Manage staff
                'sales',                // Sales dashboard
                'inventory',            // Inventory management
                'scheduling'            // Task scheduling
                // NO 'financials' - Manager cannot see financial dashboard
            ],
            'Field_Lead': [
                'planning_view',        // View plans only (cannot modify)
                'tasks',                // Execute and manage tasks
                'harvest',              // Log harvests
                'greenhouse',           // Greenhouse operations
                'sowing'                // Sowing operations
                // Cannot create successions or modify bed assignments
            ],
            'Employee': [
                'timeclock',            // Clock in/out
                'tasks',                // View and complete assigned tasks
                'harvest',              // Log harvests
                'greenhouse_seeding',   // Greenhouse seeding work
                'scouting'              // Field scouting/pest reports
            ],
            'Driver': [
                'delivery',             // Delivery routes
                'routes',               // Route management
                'employee_mode'         // Can switch to Employee features
                // When in Employee Mode: gets timeclock, tasks, harvest access
            ],
            'Customer': [
                'ordering',             // Place orders
                'account'               // Manage their account
            ]
        },

        // Roles that can bypass geofence for time clock
        GEOFENCE_BYPASS_ROLES: ['Admin'],

        // Roles that have dual-mode capability (Driver <-> Employee)
        DUAL_MODE_ROLES: ['Driver'],

        // Pages that don't require authentication
        PUBLIC_PAGES: [
            'login.html',
            'api_diagnostic.html'
        ],

        // Pages by minimum role required
        PAGE_PERMISSIONS: {
            // Admin only (sensitive)
            'financial-dashboard.html': 'Admin',
            'wealth-builder.html': 'Admin',

            // Manager+
            'sales.html': 'Manager',
            'marketing-command-center.html': 'Manager',
            'field-planner.html': 'Manager',

            // Field Lead+
            'planning.html': 'Field_Lead',
            'succession.html': 'Field_Lead',
            'greenhouse.html': 'Field_Lead',
            'sowing-sheets.html': 'Field_Lead',
            'bed_assignment_COMPLETE.html': 'Field_Lead',
            'labels.html': 'Field_Lead',

            // All staff
            'index.html': 'Employee',
            'employee.html': 'Employee',
            'mobile.html': 'Employee',
            'calendar.html': 'Employee',

            // Driver only
            'driver.html': 'Driver',

            // Customer portals (handled separately)
            'customer.html': 'Customer',
            'csa.html': 'Customer',
            'wholesale.html': 'Customer'
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SESSION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    const AuthGuard = {
        /**
         * Get current session from localStorage
         */
        getSession() {
            try {
                const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
                if (!sessionData) return null;

                const session = JSON.parse(sessionData);

                // Check if session is expired
                if (session.timestamp && (Date.now() - session.timestamp) > AUTH_CONFIG.SESSION_EXPIRY) {
                    this.clearSession();
                    return null;
                }

                return session;
            } catch (e) {
                console.error('Error reading session:', e);
                this.clearSession();
                return null;
            }
        },

        /**
         * Check if user is authenticated
         */
        isAuthenticated() {
            const session = this.getSession();
            return session !== null && session.userId;
        },

        /**
         * Get current user's role
         */
        getUserRole() {
            const session = this.getSession();
            return session?.role || null;
        },

        /**
         * Get current user's info
         */
        getUser() {
            return this.getSession();
        },

        /**
         * Get role level (for comparison)
         */
        getRoleLevel(role) {
            return AUTH_CONFIG.ROLE_LEVELS[role] || 0;
        },

        /**
         * Check if current user has minimum role level
         */
        hasMinimumRole(requiredRole) {
            const userRole = this.getUserRole();
            if (!userRole) return false;

            const userLevel = this.getRoleLevel(userRole);
            const requiredLevel = this.getRoleLevel(requiredRole);

            return userLevel >= requiredLevel;
        },

        /**
         * Check if current user has specific permission
         */
        hasPermission(permission) {
            const userRole = this.getUserRole();
            if (!userRole) return false;

            const permissions = AUTH_CONFIG.ROLE_PERMISSIONS[userRole] || [];
            return permissions.includes('all') || permissions.includes(permission);
        },

        /**
         * Check if user can bypass geofence for time clock
         * (Admin can clock in from anywhere - working from home, etc.)
         */
        canBypassGeofence() {
            const userRole = this.getUserRole();
            return AUTH_CONFIG.GEOFENCE_BYPASS_ROLES.includes(userRole);
        },

        /**
         * Check if user has dual-mode capability (e.g., Driver can switch to Employee mode)
         */
        hasDualMode() {
            const userRole = this.getUserRole();
            return AUTH_CONFIG.DUAL_MODE_ROLES.includes(userRole);
        },

        /**
         * Get current app mode for dual-mode users (stored in localStorage)
         * Returns 'driver' or 'employee' for Driver role users
         */
        getCurrentMode() {
            const userRole = this.getUserRole();
            if (!this.hasDualMode()) return userRole?.toLowerCase();

            return localStorage.getItem('tinyseed_app_mode') || 'driver';
        },

        /**
         * Set app mode for dual-mode users
         */
        setAppMode(mode) {
            if (this.hasDualMode()) {
                localStorage.setItem('tinyseed_app_mode', mode);
                return true;
            }
            return false;
        },

        /**
         * Toggle between driver and employee mode
         */
        toggleMode() {
            const currentMode = this.getCurrentMode();
            const newMode = currentMode === 'driver' ? 'employee' : 'driver';
            this.setAppMode(newMode);
            return newMode;
        },

        /**
         * Get effective permissions based on current mode
         * (Driver in Employee mode gets Employee permissions)
         */
        getEffectivePermissions() {
            const userRole = this.getUserRole();
            let permissions = [...(AUTH_CONFIG.ROLE_PERMISSIONS[userRole] || [])];

            // If Driver in Employee mode, add Employee permissions
            if (userRole === 'Driver' && this.getCurrentMode() === 'employee') {
                const employeePerms = AUTH_CONFIG.ROLE_PERMISSIONS['Employee'] || [];
                permissions = [...new Set([...permissions, ...employeePerms])];
            }

            return permissions;
        },

        /**
         * Check if user can access a specific role's pages
         */
        canAccessRole(targetRole) {
            return this.hasMinimumRole(targetRole);
        },

        /**
         * Clear session (logout)
         */
        clearSession() {
            localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
            // Also clear any other session keys
            localStorage.removeItem('driver_session');
            localStorage.removeItem('customer_session');
        },

        /**
         * Redirect to login page
         */
        redirectToLogin(returnUrl = null) {
            const loginUrl = this.getLoginUrl();
            const currentPage = window.location.href;

            if (returnUrl || currentPage) {
                const encodedReturn = encodeURIComponent(returnUrl || currentPage);
                window.location.href = `${loginUrl}?return=${encodedReturn}`;
            } else {
                window.location.href = loginUrl;
            }
        },

        /**
         * Get the login URL (handles nested directories)
         */
        getLoginUrl() {
            const path = window.location.pathname;

            // If we're in a subdirectory like /web_app/
            if (path.includes('/web_app/')) {
                return '../login.html';
            }

            return AUTH_CONFIG.DEFAULT_LOGIN_URL;
        },

        /**
         * Get current page name
         */
        getCurrentPage() {
            const path = window.location.pathname;
            return path.split('/').pop() || 'index.html';
        },

        /**
         * Check if current page is public
         */
        isPublicPage() {
            const currentPage = this.getCurrentPage();
            return AUTH_CONFIG.PUBLIC_PAGES.includes(currentPage);
        },

        /**
         * Get required role for current page
         */
        getRequiredRole() {
            const currentPage = this.getCurrentPage();
            return AUTH_CONFIG.PAGE_PERMISSIONS[currentPage] || 'Employee';
        },

        /**
         * Main guard function - call this to protect a page
         */
        protect(options = {}) {
            const {
                requiredRole = null,
                allowRoles = null,
                onUnauthorized = null,
                skipCheck = false
            } = options;

            // Skip check if page is public
            if (this.isPublicPage() || skipCheck) {
                return true;
            }

            // Check if authenticated
            if (!this.isAuthenticated()) {
                console.log('AuthGuard: Not authenticated, redirecting to login');
                this.redirectToLogin();
                return false;
            }

            // Determine required role
            const roleRequired = requiredRole || this.getRequiredRole();
            const userRole = this.getUserRole();

            // Check specific allowed roles if provided
            if (allowRoles && Array.isArray(allowRoles)) {
                if (!allowRoles.includes(userRole)) {
                    console.log(`AuthGuard: Role ${userRole} not in allowed roles: ${allowRoles.join(', ')}`);
                    if (onUnauthorized) {
                        onUnauthorized(userRole, allowRoles);
                    } else {
                        this.showUnauthorized();
                    }
                    return false;
                }
                return true;
            }

            // Check minimum role level
            if (!this.hasMinimumRole(roleRequired)) {
                console.log(`AuthGuard: Role ${userRole} does not meet minimum: ${roleRequired}`);
                if (onUnauthorized) {
                    onUnauthorized(userRole, roleRequired);
                } else {
                    this.showUnauthorized();
                }
                return false;
            }

            return true;
        },

        /**
         * Show unauthorized message
         */
        showUnauthorized() {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #0f172a;
                    color: #f8fafc;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    text-align: center;
                    padding: 20px;
                ">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
                    <h1 style="margin-bottom: 10px; color: #ef4444;">Access Denied</h1>
                    <p style="color: #94a3b8; margin-bottom: 30px;">
                        You don't have permission to access this page.
                    </p>
                    <div style="display: flex; gap: 15px;">
                        <a href="${this.getLoginUrl()}" style="
                            background: #3b82f6;
                            color: white;
                            padding: 12px 24px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 500;
                        ">Login as Different User</a>
                        <a href="javascript:history.back()" style="
                            background: #475569;
                            color: white;
                            padding: 12px 24px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 500;
                        ">Go Back</a>
                    </div>
                </div>
            `;
        },

        /**
         * Create logout button element
         */
        createLogoutButton(containerId = null) {
            const button = document.createElement('button');
            button.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            button.style.cssText = `
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
            `;
            button.onclick = () => {
                this.clearSession();
                window.location.href = this.getLoginUrl();
            };

            if (containerId) {
                const container = document.getElementById(containerId);
                if (container) container.appendChild(button);
            }

            return button;
        },

        /**
         * Display user info badge
         */
        createUserBadge(containerId = null) {
            const user = this.getUser();
            if (!user) return null;

            const badge = document.createElement('div');
            badge.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: #1e293b;
                border-radius: 8px;
                font-size: 14px;
            `;
            badge.innerHTML = `
                <span style="color: #94a3b8;">Logged in as:</span>
                <strong style="color: #f8fafc;">${user.fullName || user.username}</strong>
                <span style="
                    background: #3b82f6;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                ">${user.role}</span>
            `;

            if (containerId) {
                const container = document.getElementById(containerId);
                if (container) container.appendChild(badge);
            }

            return badge;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-PROTECT ON LOAD
    // ═══════════════════════════════════════════════════════════════════════════

    // Get configuration from script tag data attributes
    const scriptTag = document.currentScript;
    const autoProtect = scriptTag?.getAttribute('data-auto-protect') !== 'false';
    const requiredRole = scriptTag?.getAttribute('data-required-role');
    const allowRoles = scriptTag?.getAttribute('data-allow-roles')?.split(',').map(r => r.trim());

    if (autoProtect) {
        // Run protection check when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                AuthGuard.protect({ requiredRole, allowRoles });
            });
        } else {
            AuthGuard.protect({ requiredRole, allowRoles });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INACTIVITY TIMEOUT - PRODUCTION SECURITY
    // ═══════════════════════════════════════════════════════════════════════════

    let lastActivityTime = Date.now();

    // Track user activity
    function updateLastActivity() {
        lastActivityTime = Date.now();
    }

    // Listen for user activity events
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Check for inactivity periodically
    function checkInactivity() {
        if (!AuthGuard.isAuthenticated()) return;

        const inactiveTime = Date.now() - lastActivityTime;

        if (inactiveTime > AUTH_CONFIG.INACTIVITY_TIMEOUT) {
            console.log('Session expired due to inactivity');

            // Clear session
            AuthGuard.clearSession();

            // Redirect to login with reason
            const loginUrl = AuthGuard.getLoginUrl();
            const separator = loginUrl.includes('?') ? '&' : '?';
            window.location.href = loginUrl + separator + 'reason=inactivity';
        }
    }

    // Start inactivity check (only if user is authenticated)
    if (AuthGuard.isAuthenticated()) {
        setInterval(checkInactivity, AUTH_CONFIG.INACTIVITY_CHECK_INTERVAL);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED LOGOUT - Clear all data
    // ═══════════════════════════════════════════════════════════════════════════

    AuthGuard.logout = async function(notifyServer = true) {
        const session = this.getSession();

        // Notify server to invalidate session
        if (notifyServer && session?.token) {
            try {
                const apiUrl = window.TINY_SEED_API?.MAIN_API || 'https://script.google.com/macros/s/AKfycbwS36-nKIb1cc6l7AQmnM24Ynx_yluuN-_ZMZr5VRGK7ZpqqemMvXGArvzKS3TlHYCb/exec';
                await fetch(`${apiUrl}?action=logoutUser&token=${session.token}`);
            } catch (e) {
                console.warn('Could not notify server of logout:', e);
            }
        }

        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear any cached data
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            } catch (e) {
                console.warn('Could not clear caches:', e);
            }
        }

        // Redirect to login
        window.location.href = this.getLoginUrl() + '?reason=logout';
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════════════════

    // Make available globally
    window.AuthGuard = AuthGuard;
    window.AUTH_CONFIG = AUTH_CONFIG;

    console.log('AuthGuard loaded. User:', AuthGuard.getUser()?.fullName || 'Not logged in');

})();
