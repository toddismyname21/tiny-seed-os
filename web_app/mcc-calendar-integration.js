/**
 * MCC SHARED CONTENT CALENDAR INTEGRATION
 * Provides MCC-specific calendar functions that work with shared-content-calendar.js
 * Content types: SOCIAL, BLOG, GBP, EMAIL - each with visual indicators
 *
 * Required functions per spec:
 * - getSharedCalendar(params) - Retrieve calendar entries
 * - updateSharedCalendarItem(entryData) - Update/create calendar entry
 * - filterSharedCalendar() - Filter calendar by timeframe/type
 *
 * Created: 2026-02-12
 */

// MCC-specific calendar state
let mccCalendarEntries = [];
let mccCalendarFilter = { timeframe: 'thisWeek', contentType: 'all' };

/**
 * Load and render shared calendar entries in MCC Campaigns tab
 */
async function loadMCCSharedCalendar() {
    const container = document.getElementById('sharedCalendarEntries');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
            <p style="margin-top: 0.5rem;">Loading shared calendar...</p>
        </div>
    `;

    try {
        // Build date filters based on timeframe
        const params = buildCalendarDateParams(mccCalendarFilter.timeframe);
        if (mccCalendarFilter.contentType !== 'all') {
            params.contentType = mccCalendarFilter.contentType;
        }

        const result = await loadSharedContentCalendar(params);

        if (result.success) {
            mccCalendarEntries = result.entries || [];
            renderMCCCalendarEntries(mccCalendarEntries);
            updateMCCCalendarStats(mccCalendarEntries);
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle"></i> Error loading calendar: ${result.error || 'Unknown error'}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading MCC shared calendar:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                <i class="fas fa-exclamation-triangle"></i> Error: ${error.message}
            </div>
        `;
    }
}

/**
 * Build date range parameters based on timeframe filter
 */
function buildCalendarDateParams(timeframe) {
    const now = new Date();
    const params = {};

    switch (timeframe) {
        case 'thisWeek':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            params.startDate = weekStart.toISOString().split('T')[0];
            params.endDate = weekEnd.toISOString().split('T')[0];
            break;
        case 'next4Weeks':
            params.startDate = now.toISOString().split('T')[0];
            const fourWeeksOut = new Date(now);
            fourWeeksOut.setDate(now.getDate() + 28);
            params.endDate = fourWeeksOut.toISOString().split('T')[0];
            break;
        case 'thisMonth':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            params.startDate = monthStart.toISOString().split('T')[0];
            params.endDate = monthEnd.toISOString().split('T')[0];
            break;
        case 'thisQuarter':
            const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
            params.startDate = qStart.toISOString().split('T')[0];
            params.endDate = qEnd.toISOString().split('T')[0];
            break;
        case 'all':
        default:
            // No date filter
            break;
    }

    return params;
}

/**
 * Filter shared calendar based on dropdown selections
 * Required by spec
 */
function filterSharedCalendar() {
    const weekFilter = document.getElementById('sharedCalendarWeekFilter');
    const typeFilter = document.getElementById('sharedCalendarTypeFilter');

    mccCalendarFilter.timeframe = weekFilter ? weekFilter.value : 'thisWeek';
    mccCalendarFilter.contentType = typeFilter ? typeFilter.value : 'all';

    loadMCCSharedCalendar();
}

/**
 * Render calendar entries in MCC
 */
function renderMCCCalendarEntries(entries) {
    const container = document.getElementById('sharedCalendarEntries');
    if (!container) return;

    if (!entries || entries.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 1rem; color: var(--warning);"></i>
                <p>No content planned for this period.</p>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-sm" onclick="import52WeekTemplate()" style="background: linear-gradient(135deg, var(--gold), var(--secondary)); color: #000;">
                        <i class="fas fa-file-import"></i> Import 52-Week Calendar
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="openSharedContentEntryModal()">
                        <i class="fas fa-plus"></i> Add Entry
                    </button>
                </div>
            </div>
        `;
        return;
    }

    let html = '';

    entries.forEach(function(entry) {
        const contentType = SHARED_CONTENT_TYPES[entry.Content_Type] || SHARED_CONTENT_TYPES['SOCIAL'];
        const pillar = SHARED_CONTENT_PILLARS[entry.Content_Pillar] || { name: entry.Content_Pillar, color: '#666', icon: 'fa-tag' };
        const statusColor = getStatusColor(entry.Status || 'planned');

        html += `
            <div class="shared-calendar-entry" data-entry-id="${entry.Entry_ID}" style="background: var(--bg-light); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; border-left: 4px solid ${contentType.color}; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='none'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;">
                            ${renderContentTypeBadge(entry.Content_Type)}
                            ${renderSharedPillarBadge(entry.Content_Pillar)}
                            <span style="background: ${statusColor}20; color: ${statusColor}; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">${entry.Status || 'planned'}</span>
                        </div>
                        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem;">${entry.Title || 'Untitled'}</div>
                        ${entry.Description ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.4;">${entry.Description.substring(0, 120)}${entry.Description.length > 120 ? '...' : ''}</div>` : ''}
                        ${renderSEOKeywords(entry.SEO_Keywords)}
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                            <span><i class="fas fa-calendar"></i> Week ${entry.Week_Number || '--'} | ${formatMCCCalendarDate(entry.Date)}</span>
                            <span><i class="fas fa-bullseye"></i> ${entry.Target_Platform || 'instagram'}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <button onclick="openSharedContentEntryModal(${JSON.stringify(entry).replace(/"/g, '&quot;')})" style="background: none; border: none; color: var(--info); cursor: pointer; padding: 0.25rem;" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteSharedContentEntry('${entry.Entry_ID}')" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 0.25rem;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Format calendar date for display
 */
function formatMCCCalendarDate(dateStr) {
    if (!dateStr) return 'No date';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

/**
 * Update calendar stats display
 */
function updateMCCCalendarStats(entries) {
    const total = entries.length;
    const blogs = entries.filter(function(e) { return e.Content_Type === 'BLOG'; }).length;
    const social = entries.filter(function(e) { return e.Content_Type === 'SOCIAL'; }).length;
    const gbp = entries.filter(function(e) { return e.Content_Type === 'GBP'; }).length;
    const email = entries.filter(function(e) { return e.Content_Type === 'EMAIL'; }).length;

    const totalEl = document.getElementById('sharedCalTotal');
    const blogsEl = document.getElementById('sharedCalBlogs');
    const socialEl = document.getElementById('sharedCalSocial');
    const gbpEl = document.getElementById('sharedCalGBP');
    const emailEl = document.getElementById('sharedCalEmail');

    if (totalEl) totalEl.textContent = total;
    if (blogsEl) blogsEl.textContent = blogs;
    if (socialEl) socialEl.textContent = social;
    if (gbpEl) gbpEl.textContent = gbp;
    if (emailEl) emailEl.textContent = email;
}

/**
 * Import 52-week calendar template
 */
function import52WeekTemplate() {
    if (typeof open52WeekImportModal === 'function') {
        open52WeekImportModal();
    } else {
        sharedCalendarToast('Import modal not available', 'error');
    }
}

/**
 * Alias for openSharedContentEntryModal (used in some HTML)
 */
function openAddCalendarEntryModal() {
    if (typeof openSharedContentEntryModal === 'function') {
        openSharedContentEntryModal();
    }
}

/**
 * Update a shared calendar item - Required by spec
 * Wrapper for saveSharedContentEntry that handles updates
 * @param {Object} entryData - Entry data with entryId for update
 */
async function updateSharedCalendarItem(entryData) {
    if (typeof saveSharedContentEntry === 'function') {
        return await saveSharedContentEntry(entryData);
    }
    return { success: false, error: 'saveSharedContentEntry not available' };
}

/**
 * Get shared calendar data - Required by spec
 * Wrapper for loadSharedContentCalendar
 * @param {Object} params - Filter parameters
 */
async function getSharedCalendar(params) {
    if (typeof loadSharedContentCalendar === 'function') {
        return await loadSharedContentCalendar(params || {});
    }
    return { success: false, error: 'loadSharedContentCalendar not available' };
}

// Initialize calendar when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof loadSharedContentCalendar === 'function') {
            loadMCCSharedCalendar();
        }
    }, 1000);
});

// Log that MCC calendar integration is loaded
console.log('[MCC_CALENDAR_INTEGRATION] Loaded. Functions: filterSharedCalendar, getSharedCalendar, updateSharedCalendarItem, loadMCCSharedCalendar');
