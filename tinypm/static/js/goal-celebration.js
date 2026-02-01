/**
 * TinyPM Goal Celebration Module
 * ==============================
 * Celebrates when the user completes their first goal.
 * Creates a memorable moment to build engagement.
 *
 * Usage:
 *   import { GoalCelebration } from './goal-celebration.js';
 *   GoalCelebration.celebrate(goalTitle);
 *
 * Created: 2026-01-30
 */

const GoalCelebration = {
    /**
     * Check if the completed task is the first goal from onboarding
     */
    isFirstGoal(task) {
        return task.is_first_goal === true || task.source === 'onboarding';
    },

    /**
     * Trigger celebration for completing first goal
     */
    celebrate(goalTitle, options = {}) {
        // Check if already celebrated
        if (localStorage.getItem('tinypm_first_goal_celebrated')) {
            return false;
        }

        // Create celebration overlay
        this.showCelebration(goalTitle, options);

        // Mark as celebrated
        localStorage.setItem('tinypm_first_goal_celebrated', new Date().toISOString());

        // Update profile
        try {
            const profile = JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
            profile.first_goal_completed = true;
            profile.first_goal_completed_at = new Date().toISOString();
            localStorage.setItem('tinypm_user_profile', JSON.stringify(profile));
        } catch (e) {
            console.error('[GoalCelebration] Failed to update profile:', e);
        }

        return true;
    },

    /**
     * Show the celebration overlay
     */
    showCelebration(goalTitle, options = {}) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'goal-celebration-overlay';
        overlay.innerHTML = `
            <style>
                #goal-celebration-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.5s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .celebration-content {
                    text-align: center;
                    max-width: 480px;
                    padding: 40px;
                    animation: scaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .celebration-icon {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 32px;
                    font-size: 56px;
                    box-shadow: 0 0 60px rgba(34, 197, 94, 0.5);
                    animation: pulse 1.5s ease infinite;
                }

                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 60px rgba(34, 197, 94, 0.5); }
                    50% { box-shadow: 0 0 80px rgba(34, 197, 94, 0.7); }
                }

                .celebration-title {
                    font-size: 36px;
                    font-weight: 800;
                    color: #f0f0f5;
                    margin-bottom: 16px;
                    background: linear-gradient(135deg, #22c55e, #4ade80);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .celebration-subtitle {
                    font-size: 18px;
                    color: #a0a4b8;
                    margin-bottom: 24px;
                    line-height: 1.6;
                }

                .celebration-goal {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.15));
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 32px;
                }

                .celebration-goal-label {
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #22c55e;
                    margin-bottom: 8px;
                }

                .celebration-goal-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: #f0f0f5;
                }

                .celebration-stats {
                    display: flex;
                    justify-content: center;
                    gap: 32px;
                    margin-bottom: 32px;
                }

                .celebration-stat {
                    text-align: center;
                }

                .celebration-stat-value {
                    font-size: 28px;
                    font-weight: 800;
                    color: #22c55e;
                }

                .celebration-stat-label {
                    font-size: 12px;
                    color: #6b6f82;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .celebration-message {
                    font-size: 16px;
                    color: #a0a4b8;
                    line-height: 1.6;
                    margin-bottom: 32px;
                }

                .celebration-message strong {
                    color: #22c55e;
                }

                .celebration-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }

                .celebration-btn {
                    padding: 14px 28px;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    font-family: inherit;
                }

                .celebration-btn-primary {
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                }

                .celebration-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
                }

                .celebration-btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #a0a4b8;
                }

                .celebration-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: #f0f0f5;
                }

                /* Confetti */
                .confetti {
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    opacity: 0;
                    animation: confetti-fall 3s ease forwards;
                    z-index: 10001;
                }

                @keyframes confetti-fall {
                    0% {
                        opacity: 1;
                        transform: translateY(-100px) rotate(0deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(100vh) rotate(720deg);
                    }
                }

                @media (max-width: 600px) {
                    .celebration-content {
                        padding: 24px;
                    }

                    .celebration-title {
                        font-size: 28px;
                    }

                    .celebration-icon {
                        width: 100px;
                        height: 100px;
                        font-size: 44px;
                    }

                    .celebration-buttons {
                        flex-direction: column;
                    }
                }
            </style>

            <div class="celebration-content">
                <div class="celebration-icon">&#127881;</div>
                <h1 class="celebration-title">Goal Completed!</h1>
                <p class="celebration-subtitle">
                    You did it! You completed your first goal.
                </p>

                <div class="celebration-goal">
                    <div class="celebration-goal-label">Your Goal</div>
                    <div class="celebration-goal-text">${this.escapeHtml(goalTitle)}</div>
                </div>

                <div class="celebration-stats">
                    <div class="celebration-stat">
                        <div class="celebration-stat-value">1</div>
                        <div class="celebration-stat-label">Goal Done</div>
                    </div>
                    <div class="celebration-stat">
                        <div class="celebration-stat-value" id="days-count">-</div>
                        <div class="celebration-stat-label">Days Active</div>
                    </div>
                </div>

                <p class="celebration-message">
                    This is just the beginning. <strong>The Great Orchestrator</strong> is learning
                    from your success and getting smarter every day. Ready for your next goal?
                </p>

                <div class="celebration-buttons">
                    <button class="celebration-btn celebration-btn-primary" onclick="GoalCelebration.setNextGoal()">
                        Set Next Goal
                    </button>
                    <button class="celebration-btn celebration-btn-secondary" onclick="GoalCelebration.close()">
                        Keep Going
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Calculate days active
        try {
            const profile = JSON.parse(localStorage.getItem('tinypm_user_profile') || '{}');
            const createdAt = new Date(profile.created_at);
            const now = new Date();
            const days = Math.max(1, Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24)));
            document.getElementById('days-count').textContent = days;
        } catch (e) {
            document.getElementById('days-count').textContent = '1';
        }

        // Spawn confetti
        this.spawnConfetti();
    },

    /**
     * Spawn confetti particles
     */
    spawnConfetti() {
        const colors = ['#22c55e', '#6366f1', '#a855f7', '#eab308', '#ef4444', '#3b82f6'];
        const shapes = ['square', 'circle'];

        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';

                const color = colors[Math.floor(Math.random() * colors.length)];
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                const left = Math.random() * 100;
                const delay = Math.random() * 0.5;
                const duration = 2 + Math.random() * 2;

                confetti.style.cssText = `
                    left: ${left}%;
                    top: -10px;
                    background: ${color};
                    border-radius: ${shape === 'circle' ? '50%' : '2px'};
                    animation-delay: ${delay}s;
                    animation-duration: ${duration}s;
                `;

                document.body.appendChild(confetti);

                // Remove after animation
                setTimeout(() => confetti.remove(), (delay + duration) * 1000);
            }, i * 30);
        }
    },

    /**
     * Close the celebration
     */
    close() {
        const overlay = document.getElementById('goal-celebration-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => overlay.remove(), 300);
        }
    },

    /**
     * Open set next goal flow
     */
    setNextGoal() {
        this.close();

        // Trigger new goal modal/flow
        if (window.openNewTaskModal) {
            window.openNewTaskModal({ isGoal: true });
        } else {
            // Show simple prompt
            const goal = prompt('What\'s your next goal?');
            if (goal && goal.trim()) {
                this.createGoalTask(goal.trim());
            }
        }
    },

    /**
     * Create a goal task
     */
    createGoalTask(title) {
        try {
            const tasks = JSON.parse(localStorage.getItem('tinypm_tasks') || '[]');
            const newTask = {
                id: this.generateUUID(),
                title: title,
                description: 'Your next goal. Let\'s make it happen!',
                status: 'pending',
                priority: 'high',
                created_at: new Date().toISOString(),
                is_goal: true
            };
            tasks.push(newTask);
            localStorage.setItem('tinypm_tasks', JSON.stringify(tasks));

            this.showToast('New goal created! Let\'s do this.');

            // Reload tasks if function exists
            if (window.loadTasks) {
                window.loadTasks();
            }
        } catch (e) {
            console.error('[GoalCelebration] Failed to create task:', e);
        }
    },

    /**
     * Show toast notification
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 20px;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            border-radius: 10px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            z-index: 10002;
            box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
            animation: toastIn 0.3s ease;
        `;
        toast.innerHTML = `
            <style>
                @keyframes toastIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            </style>
            ${message}
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Generate UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// Export for use
window.GoalCelebration = GoalCelebration;
