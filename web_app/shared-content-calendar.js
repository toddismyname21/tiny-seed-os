/**
 * SHARED CONTENT CALENDAR SYSTEM
 * Unified calendar that works across Marketing Command Center and SEO Dashboard
 * Content types: SOCIAL, BLOG, GBP, EMAIL
 * Content pillars from 52-week SEO strategy
 *
 * Created: 2026-02-12
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Shared content pillars aligned with 52-week SEO strategy
const SHARED_CONTENT_PILLARS = {
    'CSA_EDUCATION': {
        name: 'CSA Education',
        color: '#22c55e',
        icon: 'fa-graduation-cap',
        description: 'How CSAs work, benefits, what to expect'
    },
    'PITTSBURGH_LOCAL': {
        name: 'Pittsburgh Local',
        color: '#4361ee',
        icon: 'fa-map-marker-alt',
        description: 'Neighborhood-specific content, local food scene'
    },
    'SEASONAL_HARVEST': {
        name: 'Seasonal/Harvest',
        color: '#f4a261',
        icon: 'fa-leaf',
        description: "What's growing, what's in the box"
    },
    'RECIPES_TIPS': {
        name: 'Recipes & Tips',
        color: '#e76f51',
        icon: 'fa-utensils',
        description: 'Using CSA vegetables, storage tips'
    },
    'BEHIND_FARM': {
        name: 'Behind the Farm',
        color: '#9b59b6',
        icon: 'fa-tractor',
        description: 'Meet the team, farming practices, sustainability'
    },
    'FOOD_SAFETY': {
        name: 'Food Safety/Quality',
        color: '#1abc9c',
        icon: 'fa-shield-alt',
        description: 'Organic certification, traceability, trust'
    }
};

// Content types for cross-platform content strategy
const SHARED_CONTENT_TYPES = {
    'SOCIAL': {
        name: 'Social Media',
        color: '#E1306C',
        icon: 'fa-share-alt',
        platforms: ['instagram', 'facebook', 'tiktok', 'threads']
    },
    'BLOG': {
        name: 'Blog Post',
        color: '#3b82f6',
        icon: 'fa-blog',
        platforms: ['website']
    },
    'GBP': {
        name: 'Google Business',
        color: '#4285f4',
        icon: 'fa-google',
        platforms: ['gbp']
    },
    'EMAIL': {
        name: 'Email',
        color: '#8b5cf6',
        icon: 'fa-envelope',
        platforms: ['mailchimp', 'email']
    }
};

// Shared calendar data cache
let sharedCalendarData = [];
let sharedCalendarStats = null;

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get API URL - compatible with both MCC and SEO Dashboard
 */
function getSharedCalendarAPIURL() {
    // Check for global API_URL (MCC style)
    if (typeof API_URL !== 'undefined') return API_URL;
    // Check for TINY_SEED_API (api-config.js style)
    if (typeof TINY_SEED_API !== 'undefined') return TINY_SEED_API.MAIN_API;
    // Fallback
    return 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';
}

/**
 * Show toast notification - compatible with both dashboards
 */
function sharedCalendarToast(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Fallback toast implementation
        const toast = document.createElement('div');
        toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; padding: 1rem 1.5rem; border-radius: 8px; color: white; z-index: 10000; font-size: 0.9rem; background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

/**
 * Load shared content calendar entries
 * @param {Object} params - Filter parameters (startDate, endDate, contentType, pillar, status)
 */
async function loadSharedContentCalendar(params = {}) {
    try {
        const queryParams = new URLSearchParams({
            action: 'getSharedContentCalendar',
            ...params
        });

        const response = await fetch(`${getSharedCalendarAPIURL()}?${queryParams}`);
        const result = await response.json();

        if (result.success) {
            sharedCalendarData = result.entries || [];
            sharedCalendarStats = result.stats || null;
            return { success: true, entries: sharedCalendarData, stats: result.stats };
        } else {
            console.error('Failed to load shared calendar:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error loading shared calendar:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save a shared content calendar entry
 * @param {Object} entry - The entry to save
 */
async function saveSharedContentEntry(entry) {
    try {
        const response = await fetch(getSharedCalendarAPIURL(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'saveSharedContentEntry',
                ...entry
            })
        });

        const result = await response.json();

        if (result.success) {
            sharedCalendarToast('Content entry saved!', 'success');
            await loadSharedContentCalendar();
            return { success: true, entryId: result.entryId };
        } else {
            sharedCalendarToast('Failed to save: ' + (result.error || 'Unknown error'), 'error');
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error saving shared content entry:', error);
        sharedCalendarToast('Error saving entry', 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Delete a shared content calendar entry
 * @param {string} entryId - The ID of the entry to delete
 */
async function deleteSharedContentEntry(entryId) {
    if (!confirm('Are you sure you want to delete this content entry?')) {
        return { success: false };
    }

    try {
        const response = await fetch(getSharedCalendarAPIURL(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'deleteSharedContentEntry',
                entryId: entryId
            })
        });

        const result = await response.json();

        if (result.success) {
            sharedCalendarToast('Entry deleted!', 'success');
            await loadSharedContentCalendar();
            return { success: true };
        } else {
            sharedCalendarToast('Failed to delete: ' + (result.error || 'Unknown error'), 'error');
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error deleting shared content entry:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get the 52-week content calendar template
 */
async function get52WeekTemplate() {
    try {
        const response = await fetch(`${getSharedCalendarAPIURL()}?action=get52WeekCalendarTemplate`);
        const result = await response.json();

        if (result.success) {
            return { success: true, template: result.template, pillars: result.pillars };
        } else {
            console.error('Failed to get 52-week template:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error getting 52-week template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Import 52-week calendar template into the system
 * @param {number} year - The year to import for
 */
async function import52WeekCalendar(year = new Date().getFullYear()) {
    if (!confirm(`Import the 52-week content calendar for ${year}? This will create entries for the entire year based on the SEO content strategy.`)) {
        return { success: false };
    }

    sharedCalendarToast('Importing 52-week calendar... This may take a moment.', 'info');

    try {
        const response = await fetch(getSharedCalendarAPIURL(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'importFrom52WeekTemplate',
                year: year
            })
        });

        const result = await response.json();

        if (result.success) {
            sharedCalendarToast(`Imported ${result.imported} entries for ${year}!`, 'success');
            await loadSharedContentCalendar();
            return { success: true, imported: result.imported };
        } else {
            sharedCalendarToast('Failed to import: ' + (result.error || 'Unknown error'), 'error');
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error importing 52-week calendar:', error);
        sharedCalendarToast('Error importing calendar', 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get shared calendar statistics
 * @param {Object} params - Filter parameters (month, year)
 */
async function getSharedCalendarStats(params = {}) {
    try {
        const queryParams = new URLSearchParams({
            action: 'getContentCalendarStats',
            ...params
        });

        const response = await fetch(`${getSharedCalendarAPIURL()}?${queryParams}`);
        const result = await response.json();

        if (result.success) {
            return { success: true, stats: result.stats };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error getting shared calendar stats:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk update content status
 * @param {Array} entryIds - Array of entry IDs to update
 * @param {string} status - New status
 */
async function bulkUpdateContentStatus(entryIds, status) {
    try {
        const response = await fetch(getSharedCalendarAPIURL(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'bulkUpdateContentStatus',
                entryIds: entryIds,
                status: status
            })
        });

        const result = await response.json();

        if (result.success) {
            sharedCalendarToast(`Updated ${result.updated} entries to "${status}"!`, 'success');
            await loadSharedContentCalendar();
            return { success: true, updated: result.updated };
        } else {
            sharedCalendarToast('Failed to update: ' + (result.error || 'Unknown error'), 'error');
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error bulk updating status:', error);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render content type badge for calendar entries
 */
function renderContentTypeBadge(contentType) {
    const type = SHARED_CONTENT_TYPES[contentType] || SHARED_CONTENT_TYPES['SOCIAL'];
    return `<span class="content-type-badge" style="background: ${type.color}20; color: ${type.color}; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">
        <i class="fas ${type.icon}"></i> ${type.name}
    </span>`;
}

/**
 * Render content pillar badge for calendar entries
 */
function renderSharedPillarBadge(pillar) {
    const pillarInfo = SHARED_CONTENT_PILLARS[pillar] || { name: pillar, color: '#666', icon: 'fa-tag' };
    return `<span class="content-pillar-badge" style="background: ${pillarInfo.color}20; color: ${pillarInfo.color}; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600;" title="${pillarInfo.description || ''}">
        <i class="fas ${pillarInfo.icon}"></i> ${pillarInfo.name}
    </span>`;
}

/**
 * Render SEO keywords for an entry
 */
function renderSEOKeywords(keywords) {
    if (!keywords || keywords.length === 0) return '';
    const keywordList = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
    return `<div class="seo-keywords" style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.25rem;">
        ${keywordList.slice(0, 3).map(kw => `<span style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.6rem;">${kw}</span>`).join('')}
        ${keywordList.length > 3 ? `<span style="color: var(--text-secondary); font-size: 0.6rem;">+${keywordList.length - 3} more</span>` : ''}
    </div>`;
}

/**
 * Get current week number of the year
 */
function getCurrentWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 604800000; // milliseconds in a week
    return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
}

/**
 * Get color for status
 */
function getStatusColor(status) {
    const colors = {
        'planned': '#64748b',
        'drafting': '#f59e0b',
        'ready': '#3b82f6',
        'scheduled': '#8b5cf6',
        'published': '#22c55e'
    };
    return colors[status] || '#64748b';
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Open modal to add/edit shared content entry
 */
function openSharedContentEntryModal(entry = null) {
    const isEdit = !!entry;

    // Build options for content types
    const contentTypeOptions = Object.entries(SHARED_CONTENT_TYPES).map(([key, type]) =>
        `<option value="${key}" ${(entry?.Content_Type || entry?.contentType) === key ? 'selected' : ''}>${type.name}</option>`
    ).join('');

    // Build options for content pillars
    const pillarOptions = Object.entries(SHARED_CONTENT_PILLARS).map(([key, pillar]) =>
        `<option value="${key}" ${(entry?.Content_Pillar || entry?.contentPillar) === key ? 'selected' : ''}>${pillar.name}</option>`
    ).join('');

    const modalHtml = `
        <div class="modal-overlay active" id="sharedContentEntryModal" onclick="if(event.target === this) closeSharedContentEntryModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: var(--bg-card, #16213e); border-radius: 16px; padding: 2rem; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border, rgba(255,255,255,0.1));">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; color: var(--text-primary, #edf2f4);"><i class="fas fa-calendar-plus" style="color: var(--primary, #22c55e);"></i> ${isEdit ? 'Edit' : 'Add'} Content Entry</h3>
                    <button onclick="closeSharedContentEntryModal()" style="background: none; border: none; color: var(--text-secondary, #8d99ae); font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>

                <form id="sharedContentEntryForm" onsubmit="submitSharedContentEntry(event)">
                    ${isEdit ? `<input type="hidden" name="entryId" value="${entry.Entry_ID || entry.entryId || ''}">` : ''}

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Week Number</label>
                            <input type="number" name="weekNumber" min="1" max="52" value="${entry?.Week_Number || entry?.weekNumber || getCurrentWeekNumber()}"
                                style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Date</label>
                            <input type="date" name="date" value="${entry?.Date || entry?.date || new Date().toISOString().split('T')[0]}"
                                style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Content Type</label>
                            <select name="contentType" style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                                ${contentTypeOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Content Pillar</label>
                            <select name="contentPillar" style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                                ${pillarOptions}
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Title</label>
                        <input type="text" name="title" value="${entry?.Title || entry?.title || ''}" placeholder="Content title..."
                            style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Description</label>
                        <textarea name="description" rows="3" placeholder="Content description, outline, or notes..."
                            style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4); resize: vertical;">${entry?.Description || entry?.description || ''}</textarea>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">SEO Keywords (comma-separated)</label>
                        <input type="text" name="seoKeywords" value="${entry?.SEO_Keywords || entry?.seoKeywords || ''}" placeholder="farm pittsburgh, CSA near me, organic vegetables..."
                            style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Target Platform</label>
                            <select name="targetPlatform" style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                                <option value="instagram" ${(entry?.Target_Platform || entry?.targetPlatform) === 'instagram' ? 'selected' : ''}>Instagram</option>
                                <option value="facebook" ${(entry?.Target_Platform || entry?.targetPlatform) === 'facebook' ? 'selected' : ''}>Facebook</option>
                                <option value="gbp" ${(entry?.Target_Platform || entry?.targetPlatform) === 'gbp' ? 'selected' : ''}>Google Business</option>
                                <option value="website" ${(entry?.Target_Platform || entry?.targetPlatform) === 'website' ? 'selected' : ''}>Website/Blog</option>
                                <option value="email" ${(entry?.Target_Platform || entry?.targetPlatform) === 'email' ? 'selected' : ''}>Email</option>
                                <option value="multiple" ${(entry?.Target_Platform || entry?.targetPlatform) === 'multiple' ? 'selected' : ''}>Multiple</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Status</label>
                            <select name="status" style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                                <option value="planned" ${(entry?.Status || entry?.status) === 'planned' ? 'selected' : ''}>Planned</option>
                                <option value="drafting" ${(entry?.Status || entry?.status) === 'drafting' ? 'selected' : ''}>Drafting</option>
                                <option value="ready" ${(entry?.Status || entry?.status) === 'ready' ? 'selected' : ''}>Ready</option>
                                <option value="scheduled" ${(entry?.Status || entry?.status) === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="published" ${(entry?.Status || entry?.status) === 'published' ? 'selected' : ''}>Published</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                        <button type="button" onclick="closeSharedContentEntryModal()" style="padding: 0.75rem 1.5rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4); cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, var(--primary, #22c55e), var(--info, #4361ee)); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'} Entry</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById('sharedContentEntryModal');
    if (existingModal) existingModal.remove();

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Close the shared content entry modal
 */
function closeSharedContentEntryModal() {
    const modal = document.getElementById('sharedContentEntryModal');
    if (modal) modal.remove();
}

/**
 * Submit the shared content entry form
 */
async function submitSharedContentEntry(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const entry = {
        entryId: formData.get('entryId') || null,
        weekNumber: parseInt(formData.get('weekNumber')) || getCurrentWeekNumber(),
        date: formData.get('date') || new Date().toISOString().split('T')[0],
        contentType: formData.get('contentType') || 'SOCIAL',
        contentPillar: formData.get('contentPillar') || 'SEASONAL_HARVEST',
        title: formData.get('title') || '',
        description: formData.get('description') || '',
        seoKeywords: formData.get('seoKeywords') || '',
        targetPlatform: formData.get('targetPlatform') || 'instagram',
        status: formData.get('status') || 'planned'
    };

    const result = await saveSharedContentEntry(entry);

    if (result.success) {
        closeSharedContentEntryModal();
        // Trigger calendar reload if the function exists
        if (typeof loadContentCalendar === 'function') {
            await loadContentCalendar();
        }
        if (typeof renderSEOContentCalendar === 'function') {
            await renderSEOContentCalendar();
        }
    }
}

/**
 * Open the 52-week calendar import modal
 */
function open52WeekImportModal() {
    const currentYear = new Date().getFullYear();

    const modalHtml = `
        <div class="modal-overlay active" id="import52WeekModal" onclick="if(event.target === this) close52WeekImportModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: var(--bg-card, #16213e); border-radius: 16px; padding: 2rem; max-width: 500px; width: 90%; border: 1px solid var(--border, rgba(255,255,255,0.1));">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; color: var(--text-primary, #edf2f4);"><i class="fas fa-calendar-alt" style="color: var(--success, #22c55e);"></i> Import 52-Week Calendar</h3>
                    <button onclick="close52WeekImportModal()" style="background: none; border: none; color: var(--text-secondary, #8d99ae); font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>

                <div style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary, #8d99ae);">
                        This will import the SEO-optimized 52-week content calendar with:
                    </p>
                    <ul style="margin: 0.75rem 0 0 1rem; font-size: 0.85rem; color: var(--text-secondary, #8d99ae);">
                        <li>48 weeks of blog post topics</li>
                        <li>Social media themes for each week</li>
                        <li>SEO keywords per content piece</li>
                        <li>6 content pillars aligned with strategy</li>
                    </ul>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary, #8d99ae); font-size: 0.85rem;">Import for Year</label>
                    <select id="import52WeekYear" style="width: 100%; padding: 0.75rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4);">
                        <option value="${currentYear}">${currentYear}</option>
                        <option value="${currentYear + 1}">${currentYear + 1}</option>
                    </select>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="close52WeekImportModal()" style="padding: 0.75rem 1.5rem; background: var(--bg-light, #0f3460); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 8px; color: var(--text-primary, #edf2f4); cursor: pointer;">Cancel</button>
                    <button onclick="execute52WeekImport()" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, var(--success, #22c55e), var(--purple, #9b59b6)); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-download"></i> Import Calendar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById('import52WeekModal');
    if (existingModal) existingModal.remove();

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Close the 52-week import modal
 */
function close52WeekImportModal() {
    const modal = document.getElementById('import52WeekModal');
    if (modal) modal.remove();
}

/**
 * Execute the 52-week calendar import
 */
async function execute52WeekImport() {
    const yearSelect = document.getElementById('import52WeekYear');
    const year = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();

    close52WeekImportModal();

    const result = await import52WeekCalendar(year);

    if (result.success) {
        // Trigger calendar reload if the function exists
        if (typeof loadContentCalendar === 'function') {
            await loadContentCalendar();
        }
        if (typeof renderSEOContentCalendar === 'function') {
            await renderSEOContentCalendar();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CALENDAR RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render a shared content calendar entry as a card
 */
function renderSharedCalendarEntryCard(entry) {
    const contentType = SHARED_CONTENT_TYPES[entry.Content_Type] || SHARED_CONTENT_TYPES['SOCIAL'];
    const pillar = SHARED_CONTENT_PILLARS[entry.Content_Pillar] || { name: entry.Content_Pillar, color: '#666', icon: 'fa-tag' };
    const statusColor = getStatusColor(entry.Status);

    return `
        <div class="shared-calendar-entry" data-entry-id="${entry.Entry_ID}" style="background: var(--bg-light, #0f3460); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; border-left: 3px solid ${pillar.color};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    ${renderContentTypeBadge(entry.Content_Type)}
                    ${renderSharedPillarBadge(entry.Content_Pillar)}
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">${entry.Status || 'planned'}</span>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                    <button onclick="openSharedContentEntryModal(${JSON.stringify(entry).replace(/"/g, '&quot;')})" style="background: none; border: none; color: var(--text-secondary, #8d99ae); cursor: pointer; padding: 0.25rem;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteSharedContentEntry('${entry.Entry_ID}')" style="background: none; border: none; color: var(--danger, #ef4444); cursor: pointer; padding: 0.25rem;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="font-weight: 600; color: var(--text-primary, #edf2f4); margin-bottom: 0.25rem;">${entry.Title || 'Untitled'}</div>
            ${entry.Description ? `<div style="font-size: 0.85rem; color: var(--text-secondary, #8d99ae); margin-bottom: 0.5rem;">${entry.Description.substring(0, 100)}${entry.Description.length > 100 ? '...' : ''}</div>` : ''}
            ${renderSEOKeywords(entry.SEO_Keywords)}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary, #8d99ae);">
                <span><i class="fas fa-calendar"></i> Week ${entry.Week_Number} | ${entry.Date || 'No date'}</span>
                <span><i class="fas fa-bullseye"></i> ${entry.Target_Platform || 'Not set'}</span>
            </div>
        </div>
    `;
}

/**
 * Render the shared calendar pillar legend
 */
function renderPillarLegend() {
    return `
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 1rem; font-size: 0.75rem;">
            <span style="font-weight: 600; color: var(--text-secondary, #8d99ae);">Content Pillars:</span>
            ${Object.entries(SHARED_CONTENT_PILLARS).map(([key, pillar]) =>
                `<span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 8px; height: 8px; background: ${pillar.color}; border-radius: 50%;"></span> ${pillar.name}</span>`
            ).join('')}
        </div>
    `;
}

/**
 * Render the shared calendar content type legend
 */
function renderContentTypeLegend() {
    return `
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 1rem; font-size: 0.75rem;">
            <span style="font-weight: 600; color: var(--text-secondary, #8d99ae);">Content Types:</span>
            ${Object.entries(SHARED_CONTENT_TYPES).map(([key, type]) =>
                `<span style="display: flex; align-items: center; gap: 0.25rem;"><i class="fas ${type.icon}" style="color: ${type.color};"></i> ${type.name}</span>`
            ).join('')}
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUIRED API WRAPPER FUNCTIONS
// Per MCC/SEO Dashboard spec requirements
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get shared calendar data - wrapper alias for loadSharedContentCalendar
 * Required by spec for unified calendar access
 * @param {Object} params - Filter parameters (startDate, endDate, contentType, pillar, status)
 */
async function getSharedCalendar(params = {}) {
    return await loadSharedContentCalendar(params);
}

/**
 * Update a shared calendar item - wrapper alias for saveSharedContentEntry
 * Required by spec for unified calendar updates
 * Handles both create (no entryId) and update (with entryId)
 * @param {Object} entryData - Entry data to save/update
 */
async function updateSharedCalendarItem(entryData) {
    return await saveSharedContentEntry(entryData);
}

// Log that the shared calendar system is loaded
console.log('[SHARED_CONTENT_CALENDAR] System loaded. Available functions: getSharedCalendar, updateSharedCalendarItem, loadSharedContentCalendar, saveSharedContentEntry, import52WeekCalendar, openSharedContentEntryModal');
