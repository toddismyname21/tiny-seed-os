/**
 * TinyPM Guided Tour Module
 * =========================
 * A tooltip-based walkthrough system for first-time dashboard visitors.
 * Shows key features and helps users understand the interface.
 *
 * Usage:
 *   import { GuidedTour } from './guided-tour.js';
 *   const tour = new GuidedTour();
 *   tour.start();
 *
 * Created: 2026-01-30
 */

class GuidedTour {
    constructor(options = {}) {
        this.steps = options.steps || this.getDefaultSteps();
        this.currentStep = 0;
        this.overlay = null;
        this.tooltip = null;
        this.onComplete = options.onComplete || null;
        this.onSkip = options.onSkip || null;
    }

    /**
     * Default tour steps for TinyPM dashboard
     */
    getDefaultSteps() {
        return [
            {
                target: '.header',
                title: 'Welcome to Your Dashboard!',
                content: 'This is your command center. Everything you need to manage your life and projects is right here.',
                position: 'bottom'
            },
            {
                target: '#task-list, .task-list',
                title: 'Your Tasks',
                content: 'All your tasks appear here. Click any task to see details, or use the filters to find what you need.',
                position: 'right',
                fallback: '.main'
            },
            {
                target: '.project-card, #projects-section',
                title: 'Your Projects',
                content: 'Projects are where you track the things you care about - wine journals, fitness logs, anything! Create, use, and delete them anytime.',
                position: 'left',
                fallback: '.main'
            },
            {
                target: '.agent-btn, .chat-panel, #pm-chat-btn',
                title: 'Meet Your AI Agents',
                content: 'These are your AI helpers. The PM Orchestrator coordinates everything. Builder creates features. Chat with them anytime!',
                position: 'top',
                fallback: '.header-actions'
            },
            {
                target: '.nudge-card, #nudges-section',
                title: 'Smart Nudges',
                content: 'I\'ll gently remind you about important things. Nudges help you stay on track without being overwhelming.',
                position: 'left',
                fallback: '.main'
            },
            {
                target: '.btn-primary, [data-action="new-task"]',
                title: 'Create Something New',
                content: 'Ready to get started? Click here to create your first task, or explore the templates to start a new project.',
                position: 'bottom',
                fallback: '.header-actions'
            }
        ];
    }

    /**
     * Start the guided tour
     */
    start() {
        // Check if tour should run
        const showTour = localStorage.getItem('tinypm_show_tour');
        const tourCompleted = localStorage.getItem('tinypm_tour_completed');

        if (!showTour || tourCompleted) {
            console.log('[GuidedTour] Tour already completed or not requested');
            return false;
        }

        this.currentStep = 0;
        this.createOverlay();
        this.showStep(0);
        return true;
    }

    /**
     * Create the overlay element
     */
    createOverlay() {
        // Remove existing overlay if present
        this.destroy();

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.innerHTML = `
            <style>
                .tour-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.75);
                    z-index: 9998;
                    transition: opacity 0.3s;
                }

                .tour-spotlight {
                    position: absolute;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    z-index: 9999;
                }

                .tour-tooltip {
                    position: fixed;
                    background: linear-gradient(135deg, #1e2130, #252839);
                    border: 2px solid #6366f1;
                    border-radius: 12px;
                    padding: 20px 24px;
                    max-width: 360px;
                    z-index: 10000;
                    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
                    animation: tooltipIn 0.3s ease;
                }

                @keyframes tooltipIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .tour-tooltip-arrow {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: #1e2130;
                    border: 2px solid #6366f1;
                    transform: rotate(45deg);
                }

                .tour-tooltip-arrow.top { bottom: -7px; left: 50%; margin-left: -6px; border-top: none; border-left: none; }
                .tour-tooltip-arrow.bottom { top: -7px; left: 50%; margin-left: -6px; border-bottom: none; border-right: none; }
                .tour-tooltip-arrow.left { right: -7px; top: 50%; margin-top: -6px; border-left: none; border-bottom: none; }
                .tour-tooltip-arrow.right { left: -7px; top: 50%; margin-top: -6px; border-right: none; border-top: none; }

                .tour-tooltip h4 {
                    font-size: 18px;
                    font-weight: 700;
                    color: #6366f1;
                    margin: 0 0 10px 0;
                }

                .tour-tooltip p {
                    font-size: 14px;
                    color: #a0a4b8;
                    line-height: 1.6;
                    margin: 0 0 20px 0;
                }

                .tour-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .tour-step-indicator {
                    font-size: 12px;
                    color: #6b6f82;
                }

                .tour-buttons {
                    display: flex;
                    gap: 8px;
                }

                .tour-btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    font-family: inherit;
                }

                .tour-btn-skip {
                    background: none;
                    color: #6b6f82;
                }

                .tour-btn-skip:hover {
                    color: #a0a4b8;
                }

                .tour-btn-next {
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    color: white;
                }

                .tour-btn-next:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }

                .tour-btn-prev {
                    background: rgba(255, 255, 255, 0.1);
                    color: #a0a4b8;
                }

                .tour-btn-prev:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            </style>
        `;
        document.body.appendChild(this.overlay);
    }

    /**
     * Show a specific tour step
     */
    showStep(index) {
        if (index >= this.steps.length) {
            this.complete();
            return;
        }

        if (index < 0) {
            index = 0;
        }

        this.currentStep = index;
        const step = this.steps[index];

        // Find target element
        let target = document.querySelector(step.target);
        if (!target && step.fallback) {
            target = document.querySelector(step.fallback);
        }

        // If no target found, skip to next step
        if (!target) {
            console.log('[GuidedTour] Target not found:', step.target);
            this.showStep(index + 1);
            return;
        }

        // Remove existing tooltip
        if (this.tooltip) {
            this.tooltip.remove();
        }

        // Get target position
        const rect = target.getBoundingClientRect();

        // Create spotlight effect on overlay
        this.overlay.style.background = 'transparent';

        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.innerHTML = `
            <div class="tour-tooltip-arrow ${step.position}"></div>
            <h4>${step.title}</h4>
            <p>${step.content}</p>
            <div class="tour-nav">
                <span class="tour-step-indicator">Step ${index + 1} of ${this.steps.length}</span>
                <div class="tour-buttons">
                    <button class="tour-btn tour-btn-skip" onclick="window.guidedTour.skip()">Skip Tour</button>
                    ${index > 0 ? '<button class="tour-btn tour-btn-prev" onclick="window.guidedTour.prev()">Back</button>' : ''}
                    <button class="tour-btn tour-btn-next" onclick="window.guidedTour.next()">
                        ${index === this.steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.tooltip);

        // Position tooltip
        this.positionTooltip(rect, step.position);

        // Add highlight to target
        target.style.position = 'relative';
        target.style.zIndex = '9999';
        target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)';
        target.style.borderRadius = '8px';

        // Store reference for cleanup
        this.currentTarget = target;
    }

    /**
     * Position the tooltip relative to target
     */
    positionTooltip(targetRect, position) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const padding = 16;
        let top, left;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - padding;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + padding;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - padding;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + padding;
                break;
            default:
                top = targetRect.bottom + padding;
                left = targetRect.left;
        }

        // Keep tooltip in viewport
        if (left < padding) left = padding;
        if (left + tooltipRect.width > window.innerWidth - padding) {
            left = window.innerWidth - tooltipRect.width - padding;
        }
        if (top < padding) top = padding;
        if (top + tooltipRect.height > window.innerHeight - padding) {
            top = window.innerHeight - tooltipRect.height - padding;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    /**
     * Go to next step
     */
    next() {
        this.cleanupTarget();
        this.showStep(this.currentStep + 1);
    }

    /**
     * Go to previous step
     */
    prev() {
        this.cleanupTarget();
        this.showStep(this.currentStep - 1);
    }

    /**
     * Skip the tour
     */
    skip() {
        this.cleanupTarget();
        this.destroy();
        localStorage.removeItem('tinypm_show_tour');

        if (this.onSkip) {
            this.onSkip();
        }

        // Show toast notification
        this.showToast('Tour skipped. You can restart it from Settings anytime.');
    }

    /**
     * Complete the tour
     */
    complete() {
        this.cleanupTarget();
        this.destroy();
        localStorage.setItem('tinypm_tour_completed', 'true');
        localStorage.removeItem('tinypm_show_tour');

        // Update profile if possible
        try {
            const profile = JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
            profile.tour_completed = true;
            localStorage.setItem('tinypm_user_profile', JSON.stringify(profile));
        } catch (e) {
            console.error('[GuidedTour] Failed to update profile:', e);
        }

        if (this.onComplete) {
            this.onComplete();
        }

        // Show celebration toast
        this.showToast('Tour complete! You\'re all set to start organizing your life.');
    }

    /**
     * Cleanup target element styles
     */
    cleanupTarget() {
        if (this.currentTarget) {
            this.currentTarget.style.position = '';
            this.currentTarget.style.zIndex = '';
            this.currentTarget.style.boxShadow = '';
            this.currentTarget.style.borderRadius = '';
            this.currentTarget = null;
        }
    }

    /**
     * Destroy the tour
     */
    destroy() {
        this.cleanupTarget();

        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * Show a toast notification
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 20px;
            background: linear-gradient(135deg, #1e2130, #252839);
            border: 1px solid #6366f1;
            border-radius: 10px;
            color: #f0f0f5;
            font-size: 14px;
            z-index: 10001;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            animation: toastIn 0.3s ease, toastOut 0.3s ease 4.7s;
        `;
        toast.innerHTML = `
            <style>
                @keyframes toastIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes toastOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100px); opacity: 0; } }
            </style>
            ${message}
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
}

// Export singleton instance
window.guidedTour = new GuidedTour();
window.GuidedTour = GuidedTour;

// Auto-start if needed (after page load)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (localStorage.getItem('tinypm_show_tour') === 'true') {
            window.guidedTour.start();
        }
    }, 1000); // Give the page time to render
});
