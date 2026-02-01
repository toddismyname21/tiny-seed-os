/**
 * TinyPM Connection Nudge Module
 * ==============================
 * Subtle nudges to encourage users to connect Google
 * after they've completed onboarding but haven't connected yet.
 *
 * Usage:
 *   import { ConnectionNudge } from './connection-nudge.js';
 *   ConnectionNudge.checkAndShow();
 *
 * Created: 2026-01-30
 */

const ConnectionNudge = {
    /**
     * Nudge configurations
     */
    nudges: {
        google: {
            id: 'google-connect',
            title: 'Connect Google for Smarter Assistance',
            message: 'I can help you manage your calendar and inbox. Connect Google to unlock these features.',
            icon: 'G',
            iconBg: 'linear-gradient(135deg, #4285F4, #EA4335)',
            benefits: [
                'See your calendar events',
                'Get meeting reminders',
                'Help manage your inbox'
            ],
            primaryAction: 'Connect Google',
            dismissAction: 'Maybe Later',
            dismissDuration: 7, // Days before showing again
            showAfterActions: 3 // Show after user has done N actions
        }
    },

    /**
     * Initialize and inject styles
     */
    init() {
        if (document.getElementById('connection-nudge-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'connection-nudge-styles';
        styles.textContent = `
            .connection-nudge-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1e2130, #252839);
                border-bottom: 1px solid #2a2d3e;
                padding: 16px 20px;
                z-index: 900;
                display: flex;
                align-items: center;
                gap: 16px;
                transform: translateY(-100%);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .connection-nudge-banner.show {
                transform: translateY(0);
            }

            .nudge-icon {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 800;
                color: white;
                flex-shrink: 0;
            }

            .nudge-content {
                flex: 1;
                min-width: 0;
            }

            .nudge-title {
                font-size: 15px;
                font-weight: 700;
                color: #f0f0f5;
                margin-bottom: 4px;
            }

            .nudge-message {
                font-size: 13px;
                color: #a0a4b8;
                line-height: 1.4;
            }

            .nudge-benefits {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: #6b6f82;
                margin-top: 6px;
            }

            .nudge-benefit {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .nudge-benefit::before {
                content: '\\2713';
                color: #22c55e;
            }

            .nudge-actions {
                display: flex;
                gap: 10px;
                flex-shrink: 0;
            }

            .nudge-btn {
                padding: 10px 18px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                font-family: inherit;
            }

            .nudge-btn-primary {
                background: linear-gradient(135deg, #4285F4, #3367D6);
                color: white;
            }

            .nudge-btn-primary:hover {
                box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
                transform: translateY(-1px);
            }

            .nudge-btn-dismiss {
                background: none;
                color: #6b6f82;
                padding: 10px;
            }

            .nudge-btn-dismiss:hover {
                color: #a0a4b8;
            }

            .nudge-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: #6b6f82;
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
                line-height: 1;
            }

            .nudge-close:hover {
                color: #a0a4b8;
            }

            /* Subtle inline nudge for settings/dashboard */
            .inline-nudge {
                background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(52, 168, 83, 0.1));
                border: 1px solid rgba(66, 133, 244, 0.2);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 14px;
                margin: 16px 0;
            }

            .inline-nudge-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: linear-gradient(135deg, #4285F4, #EA4335);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: 800;
                color: white;
                flex-shrink: 0;
            }

            .inline-nudge-content {
                flex: 1;
            }

            .inline-nudge-title {
                font-size: 14px;
                font-weight: 600;
                color: #f0f0f5;
                margin-bottom: 2px;
            }

            .inline-nudge-message {
                font-size: 12px;
                color: #a0a4b8;
            }

            .inline-nudge-btn {
                padding: 8px 14px;
                border-radius: 6px;
                background: #4285F4;
                color: white;
                font-size: 12px;
                font-weight: 600;
                border: none;
                cursor: pointer;
                transition: all 0.2s;
            }

            .inline-nudge-btn:hover {
                background: #3367D6;
            }

            @media (max-width: 768px) {
                .connection-nudge-banner {
                    flex-wrap: wrap;
                    padding: 14px 16px;
                }

                .nudge-benefits {
                    display: none;
                }

                .nudge-actions {
                    width: 100%;
                    margin-top: 12px;
                }

                .nudge-btn {
                    flex: 1;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(styles);
    },

    /**
     * Check if nudge should be shown and show it
     */
    checkAndShow() {
        this.init();

        // Get user profile
        const profile = this.getProfile();

        // Don't show if already connected
        if (profile.google_connected) {
            return false;
        }

        // Don't show if onboarding not completed
        if (!profile.onboarding_completed) {
            return false;
        }

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem('tinypm_google_nudge_dismissed');
        if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < this.nudges.google.dismissDuration) {
                return false;
            }
        }

        // Check action count threshold
        const actionCount = parseInt(localStorage.getItem('tinypm_action_count') || '0');
        if (actionCount < this.nudges.google.showAfterActions) {
            return false;
        }

        // Show the nudge
        this.showBanner('google');
        return true;
    },

    /**
     * Show the banner nudge
     */
    showBanner(type) {
        const nudge = this.nudges[type];
        if (!nudge) return;

        // Remove existing banner if present
        const existing = document.getElementById('connection-nudge-banner');
        if (existing) existing.remove();

        // Create banner
        const banner = document.createElement('div');
        banner.id = 'connection-nudge-banner';
        banner.className = 'connection-nudge-banner';
        banner.innerHTML = `
            <button class="nudge-close" onclick="ConnectionNudge.dismiss('${type}')">&times;</button>
            <div class="nudge-icon" style="background: ${nudge.iconBg}">${nudge.icon}</div>
            <div class="nudge-content">
                <div class="nudge-title">${nudge.title}</div>
                <div class="nudge-message">${nudge.message}</div>
                <div class="nudge-benefits">
                    ${nudge.benefits.map(b => `<span class="nudge-benefit">${b}</span>`).join('')}
                </div>
            </div>
            <div class="nudge-actions">
                <button class="nudge-btn nudge-btn-primary" onclick="ConnectionNudge.connect('${type}')">
                    ${nudge.primaryAction}
                </button>
                <button class="nudge-btn nudge-btn-dismiss" onclick="ConnectionNudge.dismiss('${type}')">
                    ${nudge.dismissAction}
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(() => {
            banner.classList.add('show');
        });

        // Adjust page content
        document.body.style.paddingTop = '80px';
    },

    /**
     * Show inline nudge (for embedding in pages)
     */
    showInline(container, type = 'google') {
        this.init();

        const profile = this.getProfile();
        if (profile.google_connected) {
            return false;
        }

        const nudge = this.nudges[type];
        const html = `
            <div class="inline-nudge">
                <div class="inline-nudge-icon">${nudge.icon}</div>
                <div class="inline-nudge-content">
                    <div class="inline-nudge-title">Connect Google</div>
                    <div class="inline-nudge-message">Sync your calendar and inbox for smarter assistance</div>
                </div>
                <button class="inline-nudge-btn" onclick="ConnectionNudge.connect('${type}')">
                    Connect
                </button>
            </div>
        `;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (container) {
            container.insertAdjacentHTML('beforeend', html);
            return true;
        }

        return false;
    },

    /**
     * Handle connect action
     */
    connect(type) {
        this.dismiss(type, false);

        // Trigger OAuth flow
        if (type === 'google') {
            if (window.tinypmAuth && window.tinypmAuth.signInWithGoogle) {
                window.tinypmAuth.signInWithGoogle();
            } else {
                // Fallback - redirect to auth page
                window.location.href = '/auth.html?connect=google';
            }
        }
    },

    /**
     * Dismiss the nudge
     */
    dismiss(type, remember = true) {
        // Hide banner
        const banner = document.getElementById('connection-nudge-banner');
        if (banner) {
            banner.classList.remove('show');
            document.body.style.paddingTop = '';
            setTimeout(() => banner.remove(), 400);
        }

        // Remember dismissal
        if (remember) {
            localStorage.setItem(`tinypm_${type}_nudge_dismissed`, new Date().toISOString());
        }
    },

    /**
     * Track user actions (for threshold calculation)
     */
    trackAction() {
        const count = parseInt(localStorage.getItem('tinypm_action_count') || '0');
        localStorage.setItem('tinypm_action_count', (count + 1).toString());
    },

    /**
     * Get user profile from localStorage
     */
    getProfile() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
        } catch (e) {
            return {};
        }
    },

    /**
     * Mark Google as connected
     */
    markConnected(type = 'google') {
        const profile = this.getProfile();
        profile[`${type}_connected`] = true;
        localStorage.setItem('tinypm_user_profile', JSON.stringify(profile));
        this.dismiss(type, false);
    }
};

// Export for use
window.ConnectionNudge = ConnectionNudge;

// Auto-check on page load (with delay to not interfere with page load)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        ConnectionNudge.checkAndShow();
    }, 2000);
});
