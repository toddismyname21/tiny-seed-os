/**
 * TinyPM Sample Data Module
 * =========================
 * Pre-built sample data to show new users what TinyPM can do.
 * Demonstrates projects, tasks, and the Life Organizer in action.
 *
 * Usage:
 *   import { SampleData } from './sample-data.js';
 *   SampleData.load();
 *
 * Created: 2026-01-30
 */

const SampleData = {
    /**
     * Sample Wine Journal entries
     */
    wineJournal: [
        {
            id: 'wine-1',
            name: 'Barolo Riserva',
            winery: 'Marchesi di Barolo',
            year: 2018,
            region: 'Piedmont, Italy',
            rating: 5,
            notes: 'Absolutely stunning. Deep ruby color, complex aromas of dried roses, tar, and truffle. Perfect with the braised short ribs.',
            price: '$65',
            date: '2026-01-15',
            photo: null,
            pairing: 'Braised short ribs'
        },
        {
            id: 'wine-2',
            name: 'Pinot Noir',
            winery: 'Willamette Valley Vineyards',
            year: 2020,
            region: 'Oregon, USA',
            rating: 4,
            notes: 'Light and fruity, great everyday wine. Cherry and strawberry notes with a hint of earth.',
            price: '$28',
            date: '2026-01-10',
            photo: null,
            pairing: 'Salmon'
        },
        {
            id: 'wine-3',
            name: 'Sancerre',
            winery: 'Domaine Vacheron',
            year: 2022,
            region: 'Loire Valley, France',
            rating: 5,
            notes: 'Crisp and mineral-driven. Perfect summer wine. The flinty finish is incredible.',
            price: '$35',
            date: '2026-01-05',
            photo: null,
            pairing: 'Oysters'
        },
        {
            id: 'wine-4',
            name: 'Malbec',
            winery: 'Catena Zapata',
            year: 2019,
            region: 'Mendoza, Argentina',
            rating: 4,
            notes: 'Bold and velvety. Dark fruit flavors with hints of chocolate. Great value.',
            price: '$22',
            date: '2025-12-28',
            photo: null,
            pairing: 'Grilled steak'
        }
    ],

    /**
     * Sample Dinner Log entries
     */
    dinnerLog: [
        {
            id: 'dinner-1',
            restaurant: 'Morcilla',
            date: '2026-01-20',
            location: 'Pittsburgh, PA',
            cuisine: 'Spanish',
            dishes: ['Patatas bravas', 'Bone marrow', 'Grilled octopus', 'Churros con chocolate'],
            rating: 5,
            notes: 'Outstanding Spanish small plates. The bone marrow was life-changing. Definitely need to come back for the paella.',
            price: '$$$',
            photo: null
        },
        {
            id: 'dinner-2',
            restaurant: 'Apteka',
            date: '2026-01-12',
            location: 'Pittsburgh, PA',
            cuisine: 'Eastern European Vegan',
            dishes: ['Pierogi', 'Beet soup', 'Mushroom pate'],
            rating: 4,
            notes: 'Creative vegan takes on Polish classics. The pierogi were surprisingly good.',
            price: '$$',
            photo: null
        }
    ],

    /**
     * Sample tasks
     */
    tasks: [
        {
            id: 'task-sample-1',
            title: 'Try the new wine bar on Butler Street',
            description: 'Heard great things about their natural wine selection.',
            status: 'pending',
            priority: 'low',
            created_at: '2026-01-28T10:00:00Z',
            source: 'sample',
            category: 'life'
        },
        {
            id: 'task-sample-2',
            title: 'Plan dinner for Sarah\'s birthday',
            description: 'She mentioned loving the octopus at Morcilla - could be a good option.',
            status: 'pending',
            priority: 'high',
            created_at: '2026-01-27T14:00:00Z',
            due_date: '2026-02-05',
            source: 'sample',
            category: 'life'
        },
        {
            id: 'task-sample-3',
            title: 'Review the Barolo I bought',
            description: 'Had it with dinner, need to log tasting notes while I remember.',
            status: 'done',
            priority: 'medium',
            created_at: '2026-01-15T09:00:00Z',
            completed_at: '2026-01-15T21:00:00Z',
            source: 'sample',
            category: 'life'
        }
    ],

    /**
     * Sample Life Organizer insights
     */
    insights: [
        {
            id: 'insight-1',
            type: 'pattern',
            title: 'Wine Preference Detected',
            message: 'You seem to love Italian reds, especially from Piedmont. Should I remember this for recommendations?',
            created_at: '2026-01-20T10:00:00Z',
            actionable: true
        },
        {
            id: 'insight-2',
            type: 'reminder',
            title: 'Sarah\'s Birthday Coming Up',
            message: 'February 5th is Sarah\'s birthday. Based on your dinner log, she might love a reservation at Morcilla.',
            created_at: '2026-01-25T09:00:00Z',
            actionable: true
        },
        {
            id: 'insight-3',
            type: 'suggestion',
            title: 'Wine Restocking',
            message: 'Your wine journal shows you\'re running low on Pinot Noir. Willamette Valley Vineyards is having a sale.',
            created_at: '2026-01-22T15:00:00Z',
            actionable: true
        }
    ],

    /**
     * Sample nudges
     */
    nudges: [
        {
            id: 'nudge-1',
            type: 'reminder',
            title: 'Time to log today\'s wine?',
            message: 'You haven\'t added to your Wine Journal in 3 days.',
            priority: 'low',
            created_at: '2026-01-28T19:00:00Z',
            dismissible: true
        },
        {
            id: 'nudge-2',
            type: 'suggestion',
            title: 'Complete your profile',
            message: 'Connect Google to sync your calendar and get smarter reminders.',
            priority: 'medium',
            created_at: '2026-01-28T10:00:00Z',
            dismissible: true
        }
    ],

    /**
     * Load sample data into localStorage
     */
    load() {
        console.log('[SampleData] Loading sample data...');

        // Store wine journal
        localStorage.setItem('tinypm_sample_wine_journal', JSON.stringify(this.wineJournal));

        // Store dinner log
        localStorage.setItem('tinypm_sample_dinner_log', JSON.stringify(this.dinnerLog));

        // Add sample tasks to existing tasks
        const existingTasks = JSON.parse(localStorage.getItem('tinypm_tasks') || '[]');
        const nonSampleTasks = existingTasks.filter(t => t.source !== 'sample');
        const allTasks = [...nonSampleTasks, ...this.tasks];
        localStorage.setItem('tinypm_tasks', JSON.stringify(allTasks));

        // Store insights
        localStorage.setItem('tinypm_sample_insights', JSON.stringify(this.insights));

        // Store nudges
        localStorage.setItem('tinypm_sample_nudges', JSON.stringify(this.nudges));

        // Set sample data flag
        localStorage.setItem('tinypm_sample_data_loaded', 'true');

        console.log('[SampleData] Sample data loaded successfully');

        // Show notification
        this.showToast('Sample data loaded! Explore to see what TinyPM can do.');

        return true;
    },

    /**
     * Clear sample data
     */
    clear() {
        console.log('[SampleData] Clearing sample data...');

        localStorage.removeItem('tinypm_sample_wine_journal');
        localStorage.removeItem('tinypm_sample_dinner_log');
        localStorage.removeItem('tinypm_sample_insights');
        localStorage.removeItem('tinypm_sample_nudges');
        localStorage.removeItem('tinypm_sample_data_loaded');

        // Remove sample tasks
        const existingTasks = JSON.parse(localStorage.getItem('tinypm_tasks') || '[]');
        const nonSampleTasks = existingTasks.filter(t => t.source !== 'sample');
        localStorage.setItem('tinypm_tasks', JSON.stringify(nonSampleTasks));

        console.log('[SampleData] Sample data cleared');
        return true;
    },

    /**
     * Check if sample data is loaded
     */
    isLoaded() {
        return localStorage.getItem('tinypm_sample_data_loaded') === 'true';
    },

    /**
     * Get sample wine journal
     */
    getWineJournal() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_sample_wine_journal') || '[]');
        } catch (e) {
            return [];
        }
    },

    /**
     * Get sample dinner log
     */
    getDinnerLog() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_sample_dinner_log') || '[]');
        } catch (e) {
            return [];
        }
    },

    /**
     * Get sample insights
     */
    getInsights() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_sample_insights') || '[]');
        } catch (e) {
            return [];
        }
    },

    /**
     * Get sample nudges
     */
    getNudges() {
        try {
            return JSON.parse(localStorage.getItem('tinypm_sample_nudges') || '[]');
        } catch (e) {
            return [];
        }
    },

    /**
     * Render sample wine journal HTML
     */
    renderWineJournal() {
        const wines = this.getWineJournal();
        if (wines.length === 0) return '';

        return `
            <div class="sample-project">
                <div class="sample-project-header">
                    <span class="sample-project-icon">&#127863;</span>
                    <div class="sample-project-info">
                        <div class="sample-project-title">Wine Journal</div>
                        <div class="sample-project-count">${wines.length} entries</div>
                    </div>
                    <span class="sample-badge">Sample</span>
                </div>
                <div class="sample-entries">
                    ${wines.slice(0, 3).map(wine => `
                        <div class="sample-entry">
                            <div class="sample-entry-main">
                                <div class="sample-entry-title">${wine.name} ${wine.year}</div>
                                <div class="sample-entry-subtitle">${wine.winery} - ${wine.region}</div>
                            </div>
                            <div class="sample-entry-rating">${'&#9733;'.repeat(wine.rating)}${'&#9734;'.repeat(5 - wine.rating)}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="sample-action-btn" onclick="SampleData.clear(); location.reload();">
                    Clear Sample Data
                </button>
            </div>
        `;
    },

    /**
     * Get styles for sample data rendering
     */
    getStyles() {
        return `
            <style>
                .sample-project {
                    background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1));
                    border: 1px solid rgba(168, 85, 247, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .sample-project-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .sample-project-icon {
                    font-size: 32px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(168, 85, 247, 0.2);
                    border-radius: 12px;
                }

                .sample-project-info {
                    flex: 1;
                }

                .sample-project-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #f0f0f5;
                }

                .sample-project-count {
                    font-size: 12px;
                    color: #a0a4b8;
                }

                .sample-badge {
                    background: rgba(168, 85, 247, 0.2);
                    color: #a855f7;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    padding: 4px 10px;
                    border-radius: 20px;
                }

                .sample-entries {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 16px;
                }

                .sample-entry {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                }

                .sample-entry-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #f0f0f5;
                }

                .sample-entry-subtitle {
                    font-size: 12px;
                    color: #6b6f82;
                }

                .sample-entry-rating {
                    font-size: 12px;
                    color: #eab308;
                }

                .sample-action-btn {
                    width: 100%;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #a0a4b8;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .sample-action-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: #f0f0f5;
                }
            </style>
        `;
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
            background: linear-gradient(135deg, #a855f7, #6366f1);
            border-radius: 10px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
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
        }, 4000);
    }
};

// Export for use
window.SampleData = SampleData;

// Auto-load if requested via URL param or localStorage
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldLoad = urlParams.get('sample') === 'true' ||
                       localStorage.getItem('tinypm_show_sample_data') === 'true';

    if (shouldLoad && !SampleData.isLoaded()) {
        SampleData.load();
        // Clean up the URL
        if (urlParams.get('sample')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
});
