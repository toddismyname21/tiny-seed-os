/**
 * TinyPM Micro-Animations Module
 * ==============================
 * JavaScript helpers for triggering delightful animations and celebrations.
 * Works in tandem with micro-animations.css
 *
 * Usage:
 *   import { TinyAnimations } from './micro-animations.js';
 *   TinyAnimations.completeTask(taskElement, { confetti: true });
 *
 * Created: 2026-02-03
 * Team: Micro-animations & Delight
 */

const TinyAnimations = {
    // ============================================
    // CONFIGURATION
    // ============================================

    config: {
        soundEnabled: false, // User can enable in settings
        confettiEnabled: true,
        reducedMotion: false,
        celebrationThreshold: 5, // Celebrate every N tasks completed
        tasksCompletedToday: 0,
    },

    // Sound effects (optional - URLs to sound files)
    sounds: {
        complete: null, // '/sounds/complete.mp3'
        success: null,  // '/sounds/success.mp3'
        pop: null,      // '/sounds/pop.mp3'
        whoosh: null,   // '/sounds/whoosh.mp3'
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        // Check for reduced motion preference
        this.config.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Listen for preference changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.config.reducedMotion = e.matches;
        });

        // Load user preferences
        this.loadPreferences();

        console.log('[TinyAnimations] Initialized', {
            reducedMotion: this.config.reducedMotion,
            soundEnabled: this.config.soundEnabled
        });
    },

    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('tinypm_animation_prefs') || '{}');
            if (prefs.soundEnabled !== undefined) this.config.soundEnabled = prefs.soundEnabled;
            if (prefs.confettiEnabled !== undefined) this.config.confettiEnabled = prefs.confettiEnabled;
        } catch (e) {
            console.warn('[TinyAnimations] Could not load preferences');
        }
    },

    savePreferences() {
        try {
            localStorage.setItem('tinypm_animation_prefs', JSON.stringify({
                soundEnabled: this.config.soundEnabled,
                confettiEnabled: this.config.confettiEnabled
            }));
        } catch (e) {
            console.warn('[TinyAnimations] Could not save preferences');
        }
    },

    // ============================================
    // TASK COMPLETION ANIMATIONS
    // ============================================

    /**
     * Animate task completion with optional celebration
     * @param {HTMLElement} taskElement - The task card element
     * @param {Object} options - Animation options
     */
    completeTask(taskElement, options = {}) {
        if (this.config.reducedMotion) {
            taskElement.classList.add('completed');
            return;
        }

        const {
            confetti = false,
            sound = true,
            removeAfter = true,
            celebrateImportant = false,
        } = options;

        // Find checkbox and animate it
        const checkbox = taskElement.querySelector('.task-checkbox');
        if (checkbox) {
            checkbox.classList.add('completing');
            setTimeout(() => {
                checkbox.classList.remove('completing');
                checkbox.classList.add('completed');
            }, 200);
        }

        // Glow effect on the card
        taskElement.classList.add('completing');

        // Play sound
        if (sound && this.config.soundEnabled) {
            this.playSound('complete');
        }

        // After glow, slide out if needed
        setTimeout(() => {
            taskElement.classList.remove('completing');

            if (removeAfter) {
                taskElement.classList.add('completed-exit');
                setTimeout(() => {
                    // Dispatch event before removal
                    taskElement.dispatchEvent(new CustomEvent('animationComplete', {
                        detail: { type: 'taskComplete' }
                    }));
                }, 400);
            }
        }, 500);

        // Track completions and maybe celebrate
        this.config.tasksCompletedToday++;

        // Confetti for important tasks or milestones
        if (confetti || celebrateImportant ||
            this.config.tasksCompletedToday % this.config.celebrationThreshold === 0) {
            if (this.config.confettiEnabled) {
                this.spawnConfetti({
                    count: celebrateImportant ? 80 : 40,
                    origin: this.getElementCenter(taskElement)
                });
            }
        }

        return this;
    },

    /**
     * Animate the checkbox specifically (for external checkbox components)
     * @param {HTMLElement} checkbox - The checkbox element
     * @param {boolean} checked - New checked state
     */
    animateCheckbox(checkbox, checked) {
        if (this.config.reducedMotion) {
            checkbox.classList.toggle('completed', checked);
            return;
        }

        if (checked) {
            checkbox.classList.add('completing');
            setTimeout(() => {
                checkbox.classList.remove('completing');
                checkbox.classList.add('completed');
            }, 200);
        } else {
            checkbox.classList.remove('completed');
        }
    },

    // ============================================
    // PROGRESS BAR ANIMATIONS
    // ============================================

    /**
     * Animate progress bar fill
     * @param {HTMLElement} progressBar - The progress bar container
     * @param {number} percentage - Target percentage (0-100)
     * @param {Object} options - Animation options
     */
    updateProgress(progressBar, percentage, options = {}) {
        const fill = progressBar.querySelector('.progress-bar-fill');
        if (!fill) return;

        const { animate = true, checkMilestones = true } = options;
        const previousWidth = parseFloat(fill.style.width) || 0;

        fill.style.width = `${percentage}%`;

        if (animate && !this.config.reducedMotion) {
            fill.classList.add('animate-fill');
            setTimeout(() => fill.classList.remove('animate-fill'), 500);
        }

        // Check for milestones (25%, 50%, 75%, 100%)
        if (checkMilestones) {
            const milestones = [25, 50, 75, 100];
            milestones.forEach(milestone => {
                if (previousWidth < milestone && percentage >= milestone) {
                    this.triggerMilestone(progressBar, milestone);
                }
            });
        }

        // 100% completion celebration
        if (percentage >= 100 && previousWidth < 100) {
            progressBar.classList.add('complete');
            if (this.config.confettiEnabled) {
                this.spawnConfetti({
                    count: 60,
                    origin: this.getElementCenter(progressBar)
                });
            }
            if (this.config.soundEnabled) {
                this.playSound('success');
            }
        }

        return this;
    },

    /**
     * Trigger milestone animation
     */
    triggerMilestone(progressBar, percentage) {
        const milestone = progressBar.querySelector(`.progress-milestone[data-milestone="${percentage}"]`);
        if (milestone) {
            milestone.classList.add('reached');
        }

        // Show toast for major milestones
        if (percentage === 50 || percentage === 100) {
            this.showToast({
                message: percentage === 100 ? 'Project completed!' : 'Halfway there!',
                type: percentage === 100 ? 'success' : 'info',
                duration: 3000
            });
        }
    },

    // ============================================
    // CARD ANIMATIONS
    // ============================================

    /**
     * Animate a new card entering
     * @param {HTMLElement} card - The card element
     */
    enterCard(card) {
        if (this.config.reducedMotion) return;

        card.classList.add('entering');
        setTimeout(() => card.classList.remove('entering'), 400);

        return this;
    },

    /**
     * Animate card deletion
     * @param {HTMLElement} card - The card element
     * @param {Function} onComplete - Callback after animation
     */
    deleteCard(card, onComplete) {
        if (this.config.reducedMotion) {
            if (onComplete) onComplete();
            return;
        }

        card.classList.add('deleting');
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 300);

        return this;
    },

    /**
     * Setup drag and drop animations for a list
     * @param {HTMLElement} container - The list container
     */
    setupDragDrop(container) {
        let draggedItem = null;
        let placeholder = null;

        container.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.task-card');
            if (!draggedItem) return;

            draggedItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';

            // Create placeholder
            placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
        });

        container.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem.classList.add('just-dropped');
                setTimeout(() => draggedItem.classList.remove('just-dropped'), 300);
            }
            if (placeholder && placeholder.parentNode) {
                placeholder.remove();
            }
            draggedItem = null;
            placeholder = null;
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY);

            if (placeholder) {
                placeholder.classList.add('active');
                if (afterElement) {
                    container.insertBefore(placeholder, afterElement);
                } else {
                    container.appendChild(placeholder);
                }
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem || !placeholder) return;

            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement) {
                container.insertBefore(draggedItem, afterElement);
            } else {
                container.appendChild(draggedItem);
            }

            if (this.config.soundEnabled) {
                this.playSound('pop');
            }
        });

        return this;
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    // ============================================
    // CONFETTI SYSTEM
    // ============================================

    /**
     * Spawn confetti particles
     * @param {Object} options - Confetti options
     */
    spawnConfetti(options = {}) {
        if (this.config.reducedMotion || !this.config.confettiEnabled) return;

        const {
            count = 50,
            origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            spread = 360,
            startVelocity = 30,
            colors = ['#22c55e', '#6366f1', '#a855f7', '#eab308', '#ef4444', '#3b82f6']
        } = options;

        const shapes = ['square', 'circle', 'strip'];

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                const color = colors[Math.floor(Math.random() * colors.length)];

                particle.className = `confetti-particle ${shape}`;
                particle.style.cssText = `
                    left: ${origin.x + (Math.random() - 0.5) * 100}px;
                    top: ${origin.y}px;
                    background: ${color};
                    --fall-duration: ${2 + Math.random() * 2}s;
                    --rotation: ${Math.random() * 1080}deg;
                    animation-delay: ${Math.random() * 0.3}s;
                `;

                document.body.appendChild(particle);

                // Remove after animation
                setTimeout(() => particle.remove(), 4000);
            }, i * 20);
        }

        return this;
    },

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     */
    showToast(options = {}) {
        const {
            message = '',
            type = 'info', // success, error, warning, info
            duration = 3000,
            action = null,
            actionLabel = 'Action'
        } = options;

        const colors = {
            success: 'linear-gradient(135deg, #22c55e, #16a34a)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            warning: 'linear-gradient(135deg, #eab308, #ca8a04)',
            info: 'linear-gradient(135deg, #6366f1, #4f46e5)'
        };

        const icons = {
            success: '&#10003;',
            error: '&#10005;',
            warning: '&#9888;',
            info: '&#8505;'
        };

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 20px;
            background: ${colors[type]};
            border-radius: 10px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            z-index: 10002;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            max-width: 400px;
        `;

        toast.innerHTML = `
            <span style="font-size: 18px;">${icons[type]}</span>
            <span style="flex: 1;">${message}</span>
            ${action ? `<button class="toast-action" style="background: rgba(255,255,255,0.2); border: none; padding: 4px 10px; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">${actionLabel}</button>` : ''}
            <div class="toast-progress" style="--duration: ${duration}ms;"></div>
        `;

        document.body.appendChild(toast);

        // Handle action click
        if (action) {
            toast.querySelector('.toast-action').addEventListener('click', () => {
                action();
                this.dismissToast(toast);
            });
        }

        // Auto dismiss
        setTimeout(() => this.dismissToast(toast), duration);

        return toast;
    },

    dismissToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add('exit');
        setTimeout(() => toast.remove(), 200);
    },

    // ============================================
    // LOADING STATES
    // ============================================

    /**
     * Create a skeleton loading state
     * @param {HTMLElement} container - Container to show skeleton in
     * @param {string} type - Type of skeleton (card, list, text)
     */
    showSkeleton(container, type = 'card') {
        const skeletons = {
            card: `
                <div class="skeleton-card skeleton">
                    <div class="skeleton-text short skeleton"></div>
                    <div class="skeleton-text medium skeleton"></div>
                    <div class="skeleton-text skeleton"></div>
                </div>
            `,
            list: `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${[1,2,3].map(() => `
                        <div class="skeleton-card skeleton" style="display: flex; gap: 12px; padding: 12px;">
                            <div class="skeleton-avatar skeleton"></div>
                            <div style="flex: 1;">
                                <div class="skeleton-text short skeleton"></div>
                                <div class="skeleton-text skeleton"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `,
            text: `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div class="skeleton-text skeleton"></div>
                    <div class="skeleton-text medium skeleton"></div>
                    <div class="skeleton-text short skeleton"></div>
                </div>
            `
        };

        container.innerHTML = skeletons[type] || skeletons.card;
        return this;
    },

    /**
     * Show loading with rotating messages
     * @param {HTMLElement} container - Container element
     * @param {Array} messages - Array of messages to rotate through
     */
    showLoadingWithMessages(container, messages = ['Loading...', 'Almost there...', 'Fetching your data...']) {
        let index = 0;

        const messageEl = document.createElement('div');
        messageEl.className = 'loading-message';
        messageEl.style.cssText = 'text-align: center; color: var(--text-secondary); margin-top: 16px;';
        messageEl.textContent = messages[0];

        container.appendChild(messageEl);

        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            messageEl.style.animation = 'none';
            messageEl.offsetHeight; // Trigger reflow
            messageEl.style.animation = '';
            messageEl.textContent = messages[index];
        }, 2000);

        // Return cleanup function
        return () => {
            clearInterval(interval);
            messageEl.remove();
        };
    },

    // ============================================
    // TAB TRANSITIONS
    // ============================================

    /**
     * Animate tab transition
     * @param {HTMLElement} fromTab - Current tab content
     * @param {HTMLElement} toTab - New tab content
     * @param {string} direction - 'left' or 'right'
     */
    transitionTabs(fromTab, toTab, direction = 'right') {
        if (this.config.reducedMotion) {
            fromTab.classList.remove('active');
            toTab.classList.add('active');
            return;
        }

        // Exit current tab
        fromTab.classList.add(direction === 'right' ? 'exit-left' : 'exit-right');
        fromTab.classList.remove('active');

        // Enter new tab
        toTab.classList.add(direction === 'right' ? 'enter-right' : 'enter-left');

        setTimeout(() => {
            toTab.classList.add('active');
            toTab.classList.remove('enter-right', 'enter-left');
            fromTab.classList.remove('exit-left', 'exit-right');
        }, 50);

        return this;
    },

    /**
     * Animate tab indicator
     * @param {HTMLElement} indicator - The indicator element
     * @param {HTMLElement} targetTab - The target tab button
     */
    moveTabIndicator(indicator, targetTab) {
        const rect = targetTab.getBoundingClientRect();
        const parentRect = targetTab.parentElement.getBoundingClientRect();

        indicator.style.left = `${rect.left - parentRect.left}px`;
        indicator.style.width = `${rect.width}px`;

        return this;
    },

    // ============================================
    // BUTTON FEEDBACK
    // ============================================

    /**
     * Flash success on a button
     * @param {HTMLElement} button - The button element
     */
    buttonSuccess(button) {
        if (this.config.reducedMotion) return;

        button.classList.add('success-flash');
        setTimeout(() => button.classList.remove('success-flash'), 500);

        if (this.config.soundEnabled) {
            this.playSound('success');
        }

        return this;
    },

    /**
     * Shake button for error
     * @param {HTMLElement} button - The button element
     */
    buttonError(button) {
        if (this.config.reducedMotion) return;

        button.classList.add('error-shake');
        setTimeout(() => button.classList.remove('error-shake'), 500);

        return this;
    },

    /**
     * Add ripple effect to element
     * @param {HTMLElement} element - The element to add ripple to
     * @param {MouseEvent} event - The click event
     */
    ripple(element, event) {
        if (this.config.reducedMotion) return;

        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');

        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.className = 'ripple';
        ripple.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
        `;

        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);

        return this;
    },

    // ============================================
    // SOUND EFFECTS
    // ============================================

    /**
     * Play a sound effect
     * @param {string} name - Sound name (complete, success, pop, whoosh)
     */
    playSound(name) {
        if (!this.config.soundEnabled || !this.sounds[name]) return;

        try {
            const audio = new Audio(this.sounds[name]);
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore autoplay errors
        } catch (e) {
            console.warn('[TinyAnimations] Could not play sound:', name);
        }
    },

    /**
     * Enable/disable sounds
     * @param {boolean} enabled - Whether sounds are enabled
     */
    setSoundEnabled(enabled) {
        this.config.soundEnabled = enabled;
        this.savePreferences();
    },

    // ============================================
    // CELEBRATION SYSTEM
    // ============================================

    /**
     * Show full celebration overlay (for major achievements)
     * @param {Object} options - Celebration options
     */
    celebrate(options = {}) {
        const {
            title = 'Achievement Unlocked!',
            subtitle = 'Great job!',
            icon = '&#127881;', // Party popper emoji
            confetti = true,
            duration = 3000,
            onClose = null
        } = options;

        if (this.config.reducedMotion) {
            if (onClose) setTimeout(onClose, 100);
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'celebration-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        overlay.innerHTML = `
            <div class="celebration-content" style="text-align: center; max-width: 400px; padding: 40px;">
                <div class="celebration-icon" style="font-size: 80px; margin-bottom: 24px;">${icon}</div>
                <h2 style="font-size: 28px; font-weight: 700; color: #f0f0f5; margin-bottom: 12px;">${title}</h2>
                <p style="font-size: 16px; color: #a0a4b8;">${subtitle}</p>
            </div>
        `;

        document.body.appendChild(overlay);

        // Spawn confetti
        if (confetti && this.config.confettiEnabled) {
            setTimeout(() => this.spawnConfetti({ count: 100 }), 200);
        }

        // Play sound
        if (this.config.soundEnabled) {
            this.playSound('success');
        }

        // Auto close
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                overlay.remove();
                if (onClose) onClose();
            }, 300);
        }, duration);

        // Click to close
        overlay.addEventListener('click', () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                overlay.remove();
                if (onClose) onClose();
            }, 300);
        });

        return overlay;
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Get center coordinates of an element
     * @param {HTMLElement} element - The element
     */
    getElementCenter(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    },

    /**
     * Add stagger animation to children
     * @param {HTMLElement} container - Container with children to animate
     */
    staggerChildren(container) {
        if (this.config.reducedMotion) return;
        container.classList.add('stagger-children');
    },

    /**
     * Pulse element to draw attention
     * @param {HTMLElement} element - Element to pulse
     */
    pulseAttention(element) {
        if (this.config.reducedMotion) return;

        element.classList.add('pulse-attention');
        setTimeout(() => element.classList.remove('pulse-attention'), 2000);

        return this;
    },

    /**
     * Wiggle element for emphasis
     * @param {HTMLElement} element - Element to wiggle
     */
    wiggle(element) {
        if (this.config.reducedMotion) return;

        element.classList.add('wiggle');
        setTimeout(() => element.classList.remove('wiggle'), 500);

        return this;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TinyAnimations.init());
    } else {
        TinyAnimations.init();
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.TinyAnimations = TinyAnimations;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TinyAnimations;
}
