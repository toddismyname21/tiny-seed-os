/**
 * TinyPM Animated Checkbox Component
 * ===================================
 * A beautiful, animated checkbox that makes completing tasks feel satisfying.
 * Uses SVG for the checkmark draw animation.
 *
 * Usage:
 *   AnimatedCheckbox.create(container, { onComplete: (checked) => {} });
 *   // or
 *   AnimatedCheckbox.upgrade(existingCheckbox);
 *
 * Created: 2026-02-03
 * Team: Micro-animations & Delight
 */

const AnimatedCheckbox = {
    // SVG template for the checkmark
    checkmarkSVG: `
        <svg class="checkmark" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `,

    /**
     * Create a new animated checkbox
     * @param {HTMLElement} container - Container to append checkbox to
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} The checkbox element
     */
    create(container, options = {}) {
        const {
            checked = false,
            disabled = false,
            size = 'medium', // small, medium, large
            color = null, // custom color override
            onComplete = null,
            onChange = null,
            taskId = null,
            ariaLabel = 'Complete task'
        } = options;

        const sizes = {
            small: { box: 18, icon: 10 },
            medium: { box: 22, icon: 12 },
            large: { box: 28, icon: 16 }
        };

        const sizeConfig = sizes[size] || sizes.medium;

        const checkbox = document.createElement('button');
        checkbox.type = 'button';
        checkbox.className = `task-checkbox ${checked ? 'completed' : ''} ${disabled ? 'disabled' : ''}`;
        checkbox.setAttribute('role', 'checkbox');
        checkbox.setAttribute('aria-checked', checked);
        checkbox.setAttribute('aria-label', ariaLabel);
        if (taskId) checkbox.dataset.taskId = taskId;

        checkbox.style.cssText = `
            width: ${sizeConfig.box}px;
            height: ${sizeConfig.box}px;
            ${color ? `--checkbox-color: ${color};` : ''}
        `;

        checkbox.innerHTML = this.checkmarkSVG;

        // Style the checkmark size
        const checkmarkEl = checkbox.querySelector('.checkmark');
        checkmarkEl.style.width = `${sizeConfig.icon}px`;
        checkmarkEl.style.height = `${sizeConfig.icon}px`;

        // Click handler
        if (!disabled) {
            checkbox.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isChecked = checkbox.classList.contains('completed');
                const newState = !isChecked;

                this.toggle(checkbox, newState);

                if (onChange) onChange(newState);
                if (newState && onComplete) {
                    // Delay onComplete to let animation play
                    setTimeout(() => onComplete(newState), 400);
                }
            });
        }

        if (container) {
            container.appendChild(checkbox);
        }

        return checkbox;
    },

    /**
     * Toggle checkbox state with animation
     * @param {HTMLElement} checkbox - The checkbox element
     * @param {boolean} checked - New checked state
     */
    toggle(checkbox, checked) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        checkbox.setAttribute('aria-checked', checked);

        if (reducedMotion) {
            checkbox.classList.toggle('completed', checked);
            return;
        }

        if (checked) {
            // Completing animation
            checkbox.classList.add('completing');

            setTimeout(() => {
                checkbox.classList.remove('completing');
                checkbox.classList.add('completed');

                // Dispatch custom event
                checkbox.dispatchEvent(new CustomEvent('checkboxComplete', {
                    bubbles: true,
                    detail: { checked: true, taskId: checkbox.dataset.taskId }
                }));
            }, 200);
        } else {
            // Unchecking
            checkbox.classList.remove('completed', 'completing');

            checkbox.dispatchEvent(new CustomEvent('checkboxUncomplete', {
                bubbles: true,
                detail: { checked: false, taskId: checkbox.dataset.taskId }
            }));
        }
    },

    /**
     * Upgrade existing checkbox inputs to animated versions
     * @param {HTMLElement} existingInput - The original input checkbox
     * @returns {HTMLElement} The new animated checkbox
     */
    upgrade(existingInput) {
        if (!existingInput || existingInput.type !== 'checkbox') {
            console.warn('[AnimatedCheckbox] Element is not a checkbox input');
            return null;
        }

        const isChecked = existingInput.checked;
        const isDisabled = existingInput.disabled;
        const taskId = existingInput.dataset.taskId || existingInput.id;
        const label = existingInput.getAttribute('aria-label') || 'Complete task';

        // Create animated replacement
        const animated = this.create(null, {
            checked: isChecked,
            disabled: isDisabled,
            taskId: taskId,
            ariaLabel: label,
            onChange: (checked) => {
                existingInput.checked = checked;
                existingInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Hide original but keep for form submission
        existingInput.style.display = 'none';
        existingInput.parentNode.insertBefore(animated, existingInput.nextSibling);

        // Sync if original changes programmatically
        existingInput.addEventListener('change', () => {
            const shouldBeChecked = existingInput.checked;
            const currentlyChecked = animated.classList.contains('completed');

            if (shouldBeChecked !== currentlyChecked) {
                this.toggle(animated, shouldBeChecked);
            }
        });

        return animated;
    },

    /**
     * Upgrade all checkbox inputs in a container
     * @param {HTMLElement} container - Container to search for checkboxes
     */
    upgradeAll(container = document) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"].task-checkbox-input');
        checkboxes.forEach(checkbox => this.upgrade(checkbox));
    },

    /**
     * Add inline styles (call once if not using external CSS)
     */
    injectStyles() {
        if (document.getElementById('animated-checkbox-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'animated-checkbox-styles';
        styles.textContent = `
            .task-checkbox {
                position: relative;
                border: 2px solid var(--border, #2a2d3e);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                background: transparent;
                padding: 0;
            }

            .task-checkbox:hover:not(.disabled) {
                border-color: var(--accent, #6366f1);
                transform: scale(1.05);
            }

            .task-checkbox:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
            }

            .task-checkbox.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .task-checkbox.completing {
                animation: checkbox-pulse 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes checkbox-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            .task-checkbox.completed {
                background: linear-gradient(135deg, var(--checkbox-color, #22c55e), var(--checkbox-color-dark, #16a34a));
                border-color: transparent;
                animation: checkbox-complete 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes checkbox-complete {
                0% { transform: scale(0.8); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            .task-checkbox .checkmark {
                opacity: 0;
                transform: scale(0);
                transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                color: white;
            }

            .task-checkbox.completed .checkmark {
                opacity: 1;
                transform: scale(1);
            }

            .task-checkbox .checkmark path {
                stroke-dasharray: 24;
                stroke-dashoffset: 24;
            }

            .task-checkbox.completed .checkmark path {
                animation: checkmark-draw 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
            }

            @keyframes checkmark-draw {
                0% { stroke-dashoffset: 24; }
                100% { stroke-dashoffset: 0; }
            }

            @media (prefers-reduced-motion: reduce) {
                .task-checkbox,
                .task-checkbox.completing,
                .task-checkbox.completed,
                .task-checkbox .checkmark,
                .task-checkbox.completed .checkmark path {
                    animation: none !important;
                    transition: none !important;
                }

                .task-checkbox.completed .checkmark {
                    opacity: 1;
                    transform: scale(1);
                }

                .task-checkbox.completed .checkmark path {
                    stroke-dashoffset: 0;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Auto-inject styles
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AnimatedCheckbox.injectStyles());
    } else {
        AnimatedCheckbox.injectStyles();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.AnimatedCheckbox = AnimatedCheckbox;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimatedCheckbox;
}
