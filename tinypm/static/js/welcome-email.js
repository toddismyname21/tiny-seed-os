/**
 * TinyPM Welcome Email Module
 * ===========================
 * Triggers welcome email on signup completion.
 * Provides email templates and API integration.
 *
 * Usage:
 *   import { WelcomeEmail } from './welcome-email.js';
 *   WelcomeEmail.send(userProfile);
 *
 * Created: 2026-01-30
 */

const WelcomeEmail = {
    /**
     * Email template configuration
     */
    templates: {
        welcome: {
            subject: 'Welcome to TinyPM - Your Life Organizer Awaits!',
            preview: 'Let\'s make this week count.',
        }
    },

    /**
     * Generate welcome email HTML
     */
    generateHTML(profile) {
        const name = profile.name || 'there';
        const firstGoal = profile.first_goal || null;
        const priorities = profile.priorities || [];

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to TinyPM</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f1117;
            color: #f0f0f5;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 32px;
            font-weight: 800;
            color: #6366f1;
            margin-bottom: 8px;
        }
        .tagline {
            font-size: 14px;
            color: #a0a4b8;
        }
        .card {
            background: #1e2130;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
        }
        .greeting {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        .intro {
            font-size: 16px;
            color: #a0a4b8;
            margin-bottom: 24px;
        }
        .highlight-box {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .highlight-title {
            font-size: 14px;
            font-weight: 700;
            color: #6366f1;
            margin-bottom: 8px;
        }
        .highlight-text {
            font-size: 15px;
            color: #f0f0f5;
        }
        .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #f0f0f5;
            margin: 24px 0 16px;
        }
        .tip-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .tip-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #2a2d3e;
        }
        .tip-item:last-child {
            border-bottom: none;
        }
        .tip-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        .tip-text {
            font-size: 14px;
            color: #a0a4b8;
        }
        .tip-text strong {
            color: #f0f0f5;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            margin: 24px 0;
        }
        .footer {
            text-align: center;
            padding: 32px 20px;
            color: #6b6f82;
            font-size: 12px;
        }
        .footer a {
            color: #6366f1;
            text-decoration: none;
        }
        .priorities {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 12px;
        }
        .priority-tag {
            background: rgba(99, 102, 241, 0.15);
            color: #6366f1;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">TinyPM</div>
            <div class="tagline">Your Life Organizer</div>
        </div>

        <div class="card">
            <div class="greeting">Welcome, ${name}!</div>
            <p class="intro">
                I'm excited to be your new Life Organizer. I'm already learning about you
                and getting ready to help you stay on top of what matters most.
            </p>

            ${firstGoal ? `
            <div class="highlight-box">
                <div class="highlight-title">Your First Goal</div>
                <div class="highlight-text">${firstGoal}</div>
            </div>
            <p style="font-size: 14px; color: #a0a4b8;">
                I've already created a task for this. Let's break it down together when you're ready!
            </p>
            ` : ''}

            ${priorities.length > 0 ? `
            <div class="section-title">Your Priorities</div>
            <div class="priorities">
                ${priorities.map(p => `<span class="priority-tag">${p.charAt(0).toUpperCase() + p.slice(1)}</span>`).join('')}
            </div>
            ` : ''}

            <div class="section-title">Quick Start Guide</div>
            <ul class="tip-list">
                <li class="tip-item">
                    <span class="tip-icon">&#128172;</span>
                    <span class="tip-text">
                        <strong>Chat with me anytime.</strong> Click the chat button in the corner to ask questions or give instructions.
                    </span>
                </li>
                <li class="tip-item">
                    <span class="tip-icon">&#128193;</span>
                    <span class="tip-text">
                        <strong>Start a project.</strong> Wine journal, fitness log, book tracker - create anything you want to track.
                    </span>
                </li>
                <li class="tip-item">
                    <span class="tip-icon">&#127919;</span>
                    <span class="tip-text">
                        <strong>Tell me your goals.</strong> I'll help break them down into achievable steps.
                    </span>
                </li>
                <li class="tip-item">
                    <span class="tip-icon">&#128279;</span>
                    <span class="tip-text">
                        <strong>Connect Google (optional).</strong> Let me see your calendar and inbox for smarter assistance.
                    </span>
                </li>
            </ul>

            <div style="text-align: center;">
                <a href="https://your-tinypm-url.com/" class="cta-button">
                    Open My Dashboard
                </a>
            </div>
        </div>

        <div class="card" style="text-align: center;">
            <div style="font-size: 20px; margin-bottom: 12px;">&#128075;</div>
            <p style="font-size: 14px; color: #a0a4b8; margin: 0;">
                Need help? Just reply to this email or chat with me in the app.
                I'm always here to assist!
            </p>
        </div>

        <div class="footer">
            <p>
                You're receiving this because you signed up for TinyPM.
                <br>
                <a href="#">Unsubscribe</a> | <a href="#">Privacy Policy</a>
            </p>
            <p style="margin-top: 16px;">
                Made with care by the TinyPM team
            </p>
        </div>
    </div>
</body>
</html>
        `;
    },

    /**
     * Generate plain text version
     */
    generateText(profile) {
        const name = profile.name || 'there';
        const firstGoal = profile.first_goal || null;

        let text = `Welcome to TinyPM, ${name}!

I'm excited to be your new Life Organizer. I'm already learning about you and getting ready to help you stay on top of what matters most.

`;

        if (firstGoal) {
            text += `YOUR FIRST GOAL
${firstGoal}

I've already created a task for this. Let's break it down together when you're ready!

`;
        }

        text += `QUICK START GUIDE

1. Chat with me anytime. Click the chat button in the corner to ask questions or give instructions.

2. Start a project. Wine journal, fitness log, book tracker - create anything you want to track.

3. Tell me your goals. I'll help break them down into achievable steps.

4. Connect Google (optional). Let me see your calendar and inbox for smarter assistance.

---

Need help? Just reply to this email or chat with me in the app. I'm always here to assist!

Open your dashboard: https://your-tinypm-url.com/

---

You're receiving this because you signed up for TinyPM.
Made with care by the TinyPM team
`;

        return text;
    },

    /**
     * Send welcome email via API
     */
    async send(profile) {
        // Check if email already sent
        if (localStorage.getItem('tinypm_welcome_email_sent')) {
            console.log('[WelcomeEmail] Already sent');
            return { success: false, reason: 'already_sent' };
        }

        // Get email from profile or auth
        const email = profile.email || this.getEmailFromAuth();
        if (!email) {
            console.log('[WelcomeEmail] No email address available');
            return { success: false, reason: 'no_email' };
        }

        try {
            // Generate email content
            const htmlContent = this.generateHTML(profile);
            const textContent = this.generateText(profile);

            // Try to send via server API
            const response = await fetch('/api/email/welcome', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: email,
                    subject: this.templates.welcome.subject,
                    html: htmlContent,
                    text: textContent,
                    profile: {
                        name: profile.name,
                        first_goal: profile.first_goal,
                        priorities: profile.priorities
                    }
                })
            });

            if (response.ok) {
                localStorage.setItem('tinypm_welcome_email_sent', new Date().toISOString());
                console.log('[WelcomeEmail] Sent successfully');
                return { success: true };
            } else {
                // If server endpoint doesn't exist yet, queue for later
                this.queueForLater(email, profile);
                return { success: false, reason: 'api_error', queued: true };
            }
        } catch (error) {
            console.error('[WelcomeEmail] Error:', error);
            // Queue for later if network fails
            this.queueForLater(email, profile);
            return { success: false, reason: 'network_error', queued: true };
        }
    },

    /**
     * Queue email for later sending
     */
    queueForLater(email, profile) {
        const queue = JSON.parse(localStorage.getItem('tinypm_email_queue') || '[]');
        queue.push({
            type: 'welcome',
            email: email,
            profile: profile,
            queued_at: new Date().toISOString()
        });
        localStorage.setItem('tinypm_email_queue', JSON.stringify(queue));
        localStorage.setItem('tinypm_welcome_email_sent', new Date().toISOString());
        console.log('[WelcomeEmail] Queued for later delivery');
    },

    /**
     * Get email from auth state
     */
    getEmailFromAuth() {
        if (window.tinypmAuth && window.tinypmAuth.getCurrentUser) {
            const user = window.tinypmAuth.getCurrentUser();
            return user?.email || null;
        }
        return null;
    },

    /**
     * Process queued emails (called by server sync)
     */
    async processQueue() {
        const queue = JSON.parse(localStorage.getItem('tinypm_email_queue') || '[]');
        if (queue.length === 0) return;

        console.log('[WelcomeEmail] Processing', queue.length, 'queued emails');

        const remaining = [];
        for (const item of queue) {
            try {
                const response = await fetch('/api/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });

                if (!response.ok) {
                    remaining.push(item);
                }
            } catch (e) {
                remaining.push(item);
            }
        }

        localStorage.setItem('tinypm_email_queue', JSON.stringify(remaining));
    },

    /**
     * Preview email in new window (for testing)
     */
    preview(profile) {
        const html = this.generateHTML(profile);
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    }
};

// Export for use
window.WelcomeEmail = WelcomeEmail;
