/**
 * TinyPM Empty States Module
 * ==========================
 * Beautiful empty state components that appear when there's no data.
 * Helps new users get started with friendly messages and quick actions.
 *
 * Usage:
 *   import { EmptyStates } from './empty-states.js';
 *   EmptyStates.render('tasks', container);
 *
 * Created: 2026-01-30
 */

const EmptyStates = {
    /**
     * Available empty state configurations
     */
    states: {
        dashboard: {
            icon: '&#127793;',
            title: 'Welcome to Your Life Organizer!',
            subtitle: 'Let\'s get started. What would you like to do first?',
            actions: [
                { icon: '&#128221;', label: 'Create a Task', action: 'createTask', primary: true },
                { icon: '&#128193;', label: 'Start a Project', action: 'startProject' },
                { icon: '&#128064;', label: 'See Sample Data', action: 'loadSampleData' }
            ],
            showTips: true
        },
        tasks: {
            icon: '&#9989;',
            title: 'No Tasks Yet',
            subtitle: 'Tasks help you track what needs to get done. Create your first one!',
            actions: [
                { icon: '&#10133;', label: 'Create First Task', action: 'createTask', primary: true }
            ]
        },
        projects: {
            icon: '&#128193;',
            title: 'No Projects Yet',
            subtitle: 'Projects are where you track the things you care about - wine, books, meals, anything!',
            actions: [
                { icon: '&#127863;', label: 'Wine Journal', action: 'templateWine' },
                { icon: '&#127869;', label: 'Dinner Log', action: 'templateDinner' },
                { icon: '&#128218;', label: 'Book Tracker', action: 'templateBooks' },
                { icon: '&#10024;', label: 'Custom', action: 'templateCustom' }
            ],
            showTemplateGallery: true
        },
        nudges: {
            icon: '&#128276;',
            title: 'No Nudges Right Now',
            subtitle: 'When I notice something important, I\'ll gently remind you here.',
            actions: []
        },
        activity: {
            icon: '&#128200;',
            title: 'No Activity Yet',
            subtitle: 'As you use TinyPM, your activity will appear here.',
            actions: []
        },
        inbox: {
            icon: '&#128231;',
            title: 'Inbox Zero!',
            subtitle: 'You\'re all caught up. Enjoy the peace!',
            actions: [],
            celebration: true
        }
    },

    /**
     * Get the styles for empty states
     */
    getStyles() {
        return `
            <style>
                .empty-state {
                    text-align: center;
                    padding: 48px 24px;
                    max-width: 480px;
                    margin: 0 auto;
                }

                .empty-state.celebration {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05));
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: 16px;
                }

                .empty-state-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    font-size: 36px;
                    animation: float 3s ease-in-out infinite;
                }

                .celebration .empty-state-icon {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2));
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }

                .empty-state-title {
                    font-size: 22px;
                    font-weight: 700;
                    color: #f0f0f5;
                    margin-bottom: 12px;
                }

                .empty-state-subtitle {
                    font-size: 15px;
                    color: #a0a4b8;
                    line-height: 1.6;
                    margin-bottom: 32px;
                }

                .empty-state-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    justify-content: center;
                }

                .empty-state-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    background: #1e2130;
                    border: 1px solid #2a2d3e;
                    border-radius: 10px;
                    color: #a0a4b8;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                }

                .empty-state-action:hover {
                    background: #252839;
                    border-color: #6366f1;
                    color: #f0f0f5;
                    transform: translateY(-2px);
                }

                .empty-state-action.primary {
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    border-color: transparent;
                    color: white;
                }

                .empty-state-action.primary:hover {
                    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
                }

                .empty-state-action-icon {
                    font-size: 18px;
                }

                .empty-state-tips {
                    margin-top: 40px;
                    padding-top: 24px;
                    border-top: 1px solid #2a2d3e;
                }

                .empty-state-tips-title {
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #6b6f82;
                    margin-bottom: 16px;
                }

                .empty-state-tip {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    text-align: left;
                    padding: 12px;
                    background: #1a1d27;
                    border-radius: 10px;
                    margin-bottom: 10px;
                }

                .empty-state-tip-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(99, 102, 241, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                }

                .empty-state-tip-text {
                    font-size: 13px;
                    color: #a0a4b8;
                    line-height: 1.5;
                }

                .empty-state-tip-text strong {
                    color: #f0f0f5;
                }

                /* Template Gallery */
                .template-gallery {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                    gap: 10px;
                    margin-top: 20px;
                }

                .template-mini-card {
                    background: #1e2130;
                    border: 1px solid #2a2d3e;
                    border-radius: 10px;
                    padding: 14px 10px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .template-mini-card:hover {
                    border-color: #6366f1;
                    background: #252839;
                    transform: translateY(-2px);
                }

                .template-mini-icon {
                    font-size: 24px;
                    margin-bottom: 6px;
                }

                .template-mini-name {
                    font-size: 11px;
                    font-weight: 600;
                    color: #a0a4b8;
                }
            </style>
        `;
    },

    /**
     * Render an empty state into a container
     * @param {string} type - The type of empty state
     * @param {HTMLElement} container - The container element
     * @param {object} customActions - Optional custom action handlers
     */
    render(type, container, customActions = {}) {
        const state = this.states[type];
        if (!state) {
            console.error('[EmptyStates] Unknown state type:', type);
            return;
        }

        // Build actions HTML
        let actionsHTML = '';
        if (state.actions && state.actions.length > 0) {
            actionsHTML = state.actions.map(action => `
                <button class="empty-state-action ${action.primary ? 'primary' : ''}"
                        data-action="${action.action}">
                    <span class="empty-state-action-icon">${action.icon}</span>
                    ${action.label}
                </button>
            `).join('');
        }

        // Build tips HTML
        let tipsHTML = '';
        if (state.showTips) {
            tipsHTML = `
                <div class="empty-state-tips">
                    <div class="empty-state-tips-title">Quick Tips</div>
                    <div class="empty-state-tip">
                        <div class="empty-state-tip-icon">&#129504;</div>
                        <div class="empty-state-tip-text">
                            <strong>Your Life</strong> is always learning about you in the background.
                        </div>
                    </div>
                    <div class="empty-state-tip">
                        <div class="empty-state-tip-icon">&#128193;</div>
                        <div class="empty-state-tip-text">
                            <strong>Projects</strong> are tools you create - wine journals, fitness logs, anything!
                        </div>
                    </div>
                    <div class="empty-state-tip">
                        <div class="empty-state-tip-icon">&#128172;</div>
                        <div class="empty-state-tip-text">
                            <strong>Chat with me</strong> anytime using the chat button in the corner.
                        </div>
                    </div>
                </div>
            `;
        }

        // Build template gallery HTML
        let templateHTML = '';
        if (state.showTemplateGallery) {
            templateHTML = `
                <div class="template-gallery">
                    <div class="template-mini-card" data-action="templateWine">
                        <div class="template-mini-icon">&#127863;</div>
                        <div class="template-mini-name">Wine</div>
                    </div>
                    <div class="template-mini-card" data-action="templateDinner">
                        <div class="template-mini-icon">&#127869;</div>
                        <div class="template-mini-name">Dinner</div>
                    </div>
                    <div class="template-mini-card" data-action="templateBooks">
                        <div class="template-mini-icon">&#128218;</div>
                        <div class="template-mini-name">Books</div>
                    </div>
                    <div class="template-mini-card" data-action="templateFitness">
                        <div class="template-mini-icon">&#128170;</div>
                        <div class="template-mini-name">Fitness</div>
                    </div>
                    <div class="template-mini-card" data-action="templateGratitude">
                        <div class="template-mini-icon">&#128591;</div>
                        <div class="template-mini-name">Gratitude</div>
                    </div>
                    <div class="template-mini-card" data-action="templateGarden">
                        <div class="template-mini-icon">&#127793;</div>
                        <div class="template-mini-name">Garden</div>
                    </div>
                    <div class="template-mini-card" data-action="templateLivestock">
                        <div class="template-mini-icon">&#128020;</div>
                        <div class="template-mini-name">Livestock</div>
                    </div>
                    <div class="template-mini-card" data-action="templateCustom">
                        <div class="template-mini-icon">&#10024;</div>
                        <div class="template-mini-name">Custom</div>
                    </div>
                </div>
            `;
        }

        // Render the empty state
        container.innerHTML = `
            ${this.getStyles()}
            <div class="empty-state ${state.celebration ? 'celebration' : ''}">
                <div class="empty-state-icon">${state.icon}</div>
                <h3 class="empty-state-title">${state.title}</h3>
                <p class="empty-state-subtitle">${state.subtitle}</p>
                <div class="empty-state-actions">
                    ${actionsHTML}
                </div>
                ${templateHTML}
                ${tipsHTML}
            </div>
        `;

        // Attach action handlers
        const actionButtons = container.querySelectorAll('[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (customActions[action]) {
                    customActions[action]();
                } else {
                    this.handleAction(action);
                }
            });
        });
    },

    /**
     * Default action handlers
     */
    handleAction(action) {
        console.log('[EmptyStates] Action triggered:', action);

        switch (action) {
            case 'createTask':
                // Trigger create task modal/flow
                if (window.openNewTaskModal) {
                    window.openNewTaskModal();
                } else {
                    this.showToast('Create task functionality will be connected here');
                }
                break;

            case 'startProject':
                // Open template gallery
                if (window.openProjectTemplates) {
                    window.openProjectTemplates();
                } else {
                    this.showToast('Project templates will open here');
                }
                break;

            case 'loadSampleData':
                localStorage.setItem('tinypm_show_sample_data', 'true');
                window.location.reload();
                break;

            case 'templateWine':
            case 'templateDinner':
            case 'templateBooks':
            case 'templateFitness':
            case 'templateGratitude':
            case 'templateGarden':
            case 'templateLivestock':
            case 'templateCustom':
                const templateType = action.replace('template', '').toLowerCase();
                this.createFromTemplate(templateType);
                break;

            default:
                console.log('[EmptyStates] Unknown action:', action);
        }
    },

    /**
     * Create a project from a template
     */
    createFromTemplate(templateType) {
        const templates = {
            wine: { name: 'Wine Journal', icon: '&#127863;', fields: ['Wine Name', 'Winery', 'Year', 'Rating', 'Notes'] },
            dinner: { name: 'Dinner Log', icon: '&#127869;', fields: ['Restaurant', 'Date', 'Dishes', 'Rating', 'Notes'] },
            books: { name: 'Book Tracker', icon: '&#128218;', fields: ['Title', 'Author', 'Started', 'Finished', 'Rating', 'Notes'] },
            fitness: { name: 'Fitness Log', icon: '&#128170;', fields: ['Workout Type', 'Duration', 'Intensity', 'Notes'] },
            gratitude: { name: 'Gratitude Journal', icon: '&#128591;', fields: ['Date', 'Three Things I\'m Grateful For'] },
            garden: { name: 'Garden Log', icon: '&#127793;', fields: ['Plant', 'Location', 'Planted Date', 'Status', 'Notes'] },
            livestock: { name: 'Livestock Tracker', icon: '&#128020;', fields: ['Animal', 'ID', 'Birth Date', 'Health Status', 'Notes'] },
            custom: { name: 'Custom Project', icon: '&#10024;', fields: [] }
        };

        const template = templates[templateType];
        if (template) {
            localStorage.setItem('tinypm_new_project_template', JSON.stringify(template));
            this.showToast(`Creating ${template.name}...`);

            // Trigger project creation flow
            if (window.createProjectFromTemplate) {
                window.createProjectFromTemplate(template);
            }
        }
    },

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
    }
};

// Export for use
window.EmptyStates = EmptyStates;
