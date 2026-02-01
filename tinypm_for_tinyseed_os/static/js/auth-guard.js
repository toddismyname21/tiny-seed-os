/**
 * TinyPM Auth Guard - PRODUCTION VERSION
 * =======================================
 * Route protection and authentication state management with:
 * - Session checking on every page load
 * - Automatic redirect to /auth if not authenticated
 * - User context storage in localStorage
 * - Token refresh handling
 * - API request authentication
 *
 * Created: 2026-01-30
 * Updated: 2026-01-30 (Security & Multi-Tenancy Team)
 *
 * Usage:
 *   // Add to any protected page
 *   <script src="/static/js/auth.js"></script>
 *   <script src="/static/js/auth-guard.js"></script>
 *
 *   // Protect a page
 *   await authGuard.protect();
 *
 *   // Make authenticated API calls
 *   const response = await authGuard.fetch('/api/tasks');
 */

// User context storage key
const USER_CONTEXT_KEY = 'tinypm_user_context';
const SESSION_CHECK_KEY = 'tinypm_last_session_check';
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class AuthGuard {
    constructor(options = {}) {
        this.options = {
            authPage: '/auth',
            onboardingPage: '/onboarding',
            dashboardPage: '/',
            requireOnboarding: true,
            sessionCheckInterval: SESSION_CHECK_INTERVAL,
            ...options
        };

        this._initialized = false;
        this._sessionCheckTimer = null;
    }

    /**
     * Initialize auth guard
     * Checks authentication state and sets up session monitoring
     */
    async init() {
        if (this._initialized) return;

        // Wait for auth to initialize
        await tinypmAuth.init();

        // Set up auth state change listener
        tinypmAuth.onAuthStateChange((event, session) => {
            this._handleAuthStateChange(event, session);
        });

        // Start periodic session checks
        this._startSessionMonitoring();

        this._initialized = true;
        return this;
    }

    /**
     * Handle auth state changes
     */
    _handleAuthStateChange(event, session) {
        console.log('[AuthGuard] Auth state changed:', event);

        if (event === 'SIGNED_OUT') {
            // Clear user context
            this.clearUserContext();

            // Redirect to auth if on protected page
            const currentPath = window.location.pathname;
            if (currentPath !== this.options.authPage &&
                currentPath !== '/auth/callback') {
                window.location.href = this.options.authPage;
            }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Update stored user context
            if (session?.user) {
                this._updateUserContext(session.user, session.access_token);
            }
        }
    }

    /**
     * Start periodic session monitoring
     */
    _startSessionMonitoring() {
        // Check session every 5 minutes
        this._sessionCheckTimer = setInterval(() => {
            this._checkSession();
        }, this.options.sessionCheckInterval);

        // Also check on visibility change (tab becomes active)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this._checkSession();
            }
        });
    }

    /**
     * Check if session is still valid
     */
    async _checkSession() {
        try {
            const session = tinypmAuth.getSession();
            if (!session) return;

            // Check if token is about to expire (within 5 minutes)
            const expiresAt = session.expires_at;
            if (expiresAt) {
                const now = Math.floor(Date.now() / 1000);
                const timeUntilExpiry = expiresAt - now;

                if (timeUntilExpiry < 300) { // Less than 5 minutes
                    console.log('[AuthGuard] Token expiring soon, refreshing...');
                    await tinypmAuth._client.auth.refreshSession();
                }
            }

            // Verify with server
            const response = await this.fetch('/api/auth/verify');
            if (!response.ok) {
                console.log('[AuthGuard] Session verification failed, signing out');
                await this.signOut();
            }
        } catch (error) {
            console.error('[AuthGuard] Session check error:', error);
        }

        // Update last check time
        localStorage.setItem(SESSION_CHECK_KEY, Date.now().toString());
    }

    /**
     * Update stored user context
     */
    _updateUserContext(user, accessToken) {
        const context = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatarUrl: user.user_metadata?.avatar_url || '',
            role: user.role || 'authenticated',
            accessToken: accessToken,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(context));
        console.log('[AuthGuard] User context updated');
    }

    /**
     * Get stored user context
     * @returns {object|null}
     */
    getUserContext() {
        try {
            const stored = localStorage.getItem(USER_CONTEXT_KEY);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (e) {
            console.error('[AuthGuard] Error reading user context:', e);
            return null;
        }
    }

    /**
     * Clear stored user context
     */
    clearUserContext() {
        localStorage.removeItem(USER_CONTEXT_KEY);
        localStorage.removeItem(SESSION_CHECK_KEY);
        console.log('[AuthGuard] User context cleared');
    }

    /**
     * Protect a page - redirect if not authenticated
     * Call this at the top of every protected page
     *
     * @param {object} options
     * @returns {Promise<{authenticated: boolean, user: object, profile: object}>}
     */
    async protect(options = {}) {
        await this.init();

        const opts = { ...this.options, ...options };
        const currentPath = window.location.pathname;

        // Skip protection for auth-related pages
        if (currentPath === opts.authPage || currentPath === '/auth/callback') {
            return { authenticated: false, user: null, profile: null };
        }

        // Check authentication
        const isAuthenticated = tinypmAuth.isAuthenticated();

        if (!isAuthenticated) {
            // Clear any stale context
            this.clearUserContext();

            // Save intended destination
            sessionStorage.setItem('tinypm_redirect_after_auth', currentPath);

            // Redirect to auth page
            console.log('[AuthGuard] Not authenticated, redirecting to auth');
            window.location.href = opts.authPage;
            return { authenticated: false, user: null, profile: null };
        }

        const user = tinypmAuth.getCurrentUser();
        const session = tinypmAuth.getSession();

        // Update stored context
        if (user && session) {
            this._updateUserContext(user, session.access_token);
        }

        // Check onboarding status if required
        if (opts.requireOnboarding) {
            const { profile } = await tinypmAuth.getProfile();

            if (!profile || !profile.onboarding_completed) {
                // Redirect to onboarding if not on onboarding page
                if (currentPath !== opts.onboardingPage) {
                    console.log('[AuthGuard] Onboarding not complete, redirecting');
                    window.location.href = opts.onboardingPage;
                    return { authenticated: true, user, profile };
                }
            }

            return { authenticated: true, user, profile };
        }

        return { authenticated: true, user, profile: null };
    }

    /**
     * Check auth status for auth page
     * If already authenticated, redirect to dashboard
     */
    async checkAuthPage() {
        await this.init();

        if (tinypmAuth.isAuthenticated()) {
            const { profile } = await tinypmAuth.getProfile();

            // Check for saved redirect destination
            const redirectTo = sessionStorage.getItem('tinypm_redirect_after_auth');
            sessionStorage.removeItem('tinypm_redirect_after_auth');

            if (redirectTo && redirectTo !== this.options.authPage) {
                window.location.href = redirectTo;
                return { redirect: true, to: redirectTo };
            }

            // Check onboarding status
            if (!profile || !profile.onboarding_completed) {
                window.location.href = this.options.onboardingPage;
                return { redirect: true, to: this.options.onboardingPage };
            }

            // Go to dashboard
            window.location.href = this.options.dashboardPage;
            return { redirect: true, to: this.options.dashboardPage };
        }

        return { redirect: false };
    }

    /**
     * Handle OAuth callback
     * Called on /auth/callback route
     */
    async handleCallback() {
        await this.init();

        // The Supabase client automatically handles the callback
        // when detectSessionInUrl is enabled

        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check auth state
        if (tinypmAuth.isAuthenticated()) {
            const user = tinypmAuth.getCurrentUser();
            const session = tinypmAuth.getSession();

            // Update stored context
            if (user && session) {
                this._updateUserContext(user, session.access_token);
            }

            // Create profile if it doesn't exist (for OAuth signups)
            const { profile } = await tinypmAuth.getProfile();
            if (!profile) {
                await tinypmAuth._createInitialProfile(user.id, {
                    name: user.user_metadata?.full_name || user.user_metadata?.name
                });
            }

            // Check for saved redirect destination
            const redirectTo = sessionStorage.getItem('tinypm_redirect_after_auth');
            sessionStorage.removeItem('tinypm_redirect_after_auth');

            if (redirectTo && redirectTo !== this.options.authPage) {
                window.location.href = redirectTo;
                return;
            }

            // Check onboarding status
            const { profile: updatedProfile } = await tinypmAuth.getProfile();
            if (!updatedProfile || !updatedProfile.onboarding_completed) {
                window.location.href = this.options.onboardingPage;
                return;
            }

            window.location.href = this.options.dashboardPage;
        } else {
            // Auth failed, go back to login
            window.location.href = this.options.authPage + '?error=oauth_failed';
        }
    }

    /**
     * Sign out and redirect to auth page
     */
    async signOut() {
        // Clear context first
        this.clearUserContext();

        // Stop session monitoring
        if (this._sessionCheckTimer) {
            clearInterval(this._sessionCheckTimer);
        }

        // Sign out from Supabase
        await tinypmAuth.signOut();

        // Redirect to auth page
        window.location.href = this.options.authPage;
    }

    /**
     * Get authentication header for API calls
     * @returns {object}
     */
    getAuthHeader() {
        const token = tinypmAuth.getAccessToken();
        if (!token) return {};

        return {
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Get current user ID
     * @returns {string|null}
     */
    getCurrentUserId() {
        const context = this.getUserContext();
        return context?.id || tinypmAuth.getCurrentUser()?.id || null;
    }

    /**
     * Make authenticated API request
     * Automatically includes auth headers and handles auth errors
     *
     * @param {string} url - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle auth errors
            if (response.status === 401) {
                console.log('[AuthGuard] API returned 401, checking session...');

                // Try to refresh the session
                const refreshed = await tinypmAuth._client?.auth.refreshSession();
                if (refreshed?.data?.session) {
                    // Retry with new token
                    headers['Authorization'] = `Bearer ${refreshed.data.session.access_token}`;
                    return fetch(url, { ...options, headers });
                } else {
                    // Session truly expired, sign out
                    await this.signOut();
                }
            }

            return response;
        } catch (error) {
            console.error('[AuthGuard] Fetch error:', error);
            throw error;
        }
    }

    /**
     * Make authenticated API request and parse JSON response
     *
     * @param {string} url - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<object>}
     */
    async fetchJSON(url, options = {}) {
        const response = await this.fetch(url, options);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `API error: ${response.status}`);
        }
        return response.json();
    }

    /**
     * POST JSON to an authenticated endpoint
     *
     * @param {string} url - API endpoint
     * @param {object} data - Data to send
     * @returns {Promise<object>}
     */
    async postJSON(url, data) {
        return this.fetchJSON(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// Export singleton instance
const authGuard = new AuthGuard();

// Make available globally
window.AuthGuard = AuthGuard;
window.authGuard = authGuard;

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authGuard.init());
} else {
    authGuard.init();
}
