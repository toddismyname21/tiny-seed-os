/**
 * TinyPM Auth Module
 * ==================
 * Handles all Supabase authentication operations.
 *
 * Usage:
 *   import { TinyPMAuth } from './auth.js';
 *   const auth = new TinyPMAuth();
 *   await auth.signIn(email, password);
 *
 * Created: 2026-01-30
 */

// Supabase configuration - loaded from environment or defaults
const SUPABASE_URL = window.TINYPM_CONFIG?.SUPABASE_URL || 'https://bznidonyuztfplqzkmks.supabase.co';
const SUPABASE_ANON_KEY = window.TINYPM_CONFIG?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bmlkb255dXp0ZnBscXprbWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODkyMDYsImV4cCI6MjA4NTM2NTIwNn0.xs7cSFEWUFXB1FIrXG89DiKqfhQqExXmTq2K1eITzNs';

class TinyPMAuth {
    constructor() {
        this._client = null;
        this._user = null;
        this._session = null;
        this._authStateListeners = [];
        this._initialized = false;
    }

    /**
     * Initialize the Supabase client
     * Must be called before any auth operations
     */
    async init() {
        if (this._initialized) return this;

        // Load Supabase JS library if not present
        if (typeof supabase === 'undefined') {
            await this._loadSupabaseScript();
        }

        // Create Supabase client
        this._client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                flowType: 'pkce'  // More secure for web apps
            }
        });

        // Get initial session
        const { data: { session }, error } = await this._client.auth.getSession();
        if (session) {
            this._session = session;
            this._user = session.user;
        }

        // Listen for auth state changes
        this._client.auth.onAuthStateChange((event, session) => {
            this._session = session;
            this._user = session?.user || null;
            this._notifyListeners(event, session);
        });

        this._initialized = true;
        return this;
    }

    /**
     * Load Supabase JS library dynamically
     */
    async _loadSupabaseScript() {
        return new Promise((resolve, reject) => {
            if (typeof supabase !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Supabase JS library'));
            document.head.appendChild(script);
        });
    }

    /**
     * Sign up with email and password
     * @param {string} email
     * @param {string} password
     * @param {object} metadata - Optional user metadata
     * @returns {Promise<{user, session, error}>}
     */
    async signUp(email, password, metadata = {}) {
        if (!this._initialized) await this.init();

        const { data, error } = await this._client.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
                emailRedirectTo: `${window.location.origin}/auth/callback`
            }
        });

        if (error) {
            return { user: null, session: null, error };
        }

        // Create initial profile if signup was immediate (no email confirmation)
        if (data.session) {
            await this._createInitialProfile(data.user.id, metadata);
        }

        return { user: data.user, session: data.session, error: null };
    }

    /**
     * Sign in with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{user, session, error}>}
     */
    async signIn(email, password) {
        if (!this._initialized) await this.init();

        const { data, error } = await this._client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { user: null, session: null, error };
        }

        return { user: data.user, session: data.session, error: null };
    }

    /**
     * Sign in with Google OAuth
     * @returns {Promise<{error}>}
     */
    async signInWithGoogle() {
        if (!this._initialized) await this.init();

        const { data, error } = await this._client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        return { data, error };
    }

    /**
     * Sign in with Apple OAuth
     * @returns {Promise<{error}>}
     */
    async signInWithApple() {
        if (!this._initialized) await this.init();

        const { data, error } = await this._client.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });

        return { data, error };
    }

    /**
     * Sign out the current user
     * @returns {Promise<{error}>}
     */
    async signOut() {
        if (!this._initialized) await this.init();

        const { error } = await this._client.auth.signOut();

        if (!error) {
            this._user = null;
            this._session = null;
        }

        return { error };
    }

    /**
     * Get current user
     * @returns {object|null}
     */
    getCurrentUser() {
        return this._user;
    }

    /**
     * Get current session
     * @returns {object|null}
     */
    getSession() {
        return this._session;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this._session;
    }

    /**
     * Get access token for API calls
     * @returns {string|null}
     */
    getAccessToken() {
        return this._session?.access_token || null;
    }

    /**
     * Send password reset email
     * @param {string} email
     * @returns {Promise<{error}>}
     */
    async resetPassword(email) {
        if (!this._initialized) await this.init();

        const { error } = await this._client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`
        });

        return { error };
    }

    /**
     * Update password (when already authenticated)
     * @param {string} newPassword
     * @returns {Promise<{error}>}
     */
    async updatePassword(newPassword) {
        if (!this._initialized) await this.init();

        const { error } = await this._client.auth.updateUser({
            password: newPassword
        });

        return { error };
    }

    /**
     * Subscribe to auth state changes
     * @param {function} callback - Called with (event, session)
     * @returns {function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        this._authStateListeners.push(callback);

        // Return unsubscribe function
        return () => {
            const idx = this._authStateListeners.indexOf(callback);
            if (idx > -1) {
                this._authStateListeners.splice(idx, 1);
            }
        };
    }

    /**
     * Notify all auth state listeners
     */
    _notifyListeners(event, session) {
        for (const listener of this._authStateListeners) {
            try {
                listener(event, session);
            } catch (e) {
                console.error('[TinyPMAuth] Listener error:', e);
            }
        }
    }

    /**
     * Create initial user profile
     */
    async _createInitialProfile(userId, metadata = {}) {
        try {
            const { error } = await this._client.from('user_profiles').insert({
                id: userId,
                name: metadata.name || null,
                onboarding_completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            if (error && error.code !== '23505') { // Ignore duplicate key error
                console.error('[TinyPMAuth] Profile creation error:', error);
            }
        } catch (e) {
            console.error('[TinyPMAuth] Profile creation error:', e);
        }
    }

    /**
     * Get user profile from database
     * @returns {Promise<{profile, error}>}
     */
    async getProfile() {
        if (!this._initialized) await this.init();
        if (!this._user) return { profile: null, error: new Error('Not authenticated') };

        const { data, error } = await this._client
            .from('user_profiles')
            .select('*')
            .eq('id', this._user.id)
            .single();

        return { profile: data, error };
    }

    /**
     * Update user profile
     * @param {object} updates
     * @returns {Promise<{profile, error}>}
     */
    async updateProfile(updates) {
        if (!this._initialized) await this.init();
        if (!this._user) return { profile: null, error: new Error('Not authenticated') };

        const { data, error } = await this._client
            .from('user_profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', this._user.id)
            .select()
            .single();

        return { profile: data, error };
    }

    /**
     * Check if user has completed onboarding
     * @returns {Promise<boolean>}
     */
    async hasCompletedOnboarding() {
        const { profile, error } = await this.getProfile();
        if (error || !profile) return false;
        return profile.onboarding_completed === true;
    }

    /**
     * Get Supabase client for direct access
     * Use sparingly - prefer using auth methods
     * @returns {SupabaseClient}
     */
    getClient() {
        return this._client;
    }
}

// Export singleton instance
const tinypmAuth = new TinyPMAuth();

// Also export class for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TinyPMAuth, tinypmAuth };
}

// Make available globally
window.TinyPMAuth = TinyPMAuth;
window.tinypmAuth = tinypmAuth;
