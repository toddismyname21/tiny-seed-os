/**
 * Lender CRM/Profile System
 * A full relationship management system for lenders
 */

// ==================== DATA STORAGE ====================

const LENDER_CRM_STORAGE_KEY = 'tsf_lender_crm';
const LENDER_FOLLOWUPS_KEY = 'tsf_lender_followups';

// Current state
let lenderCrmData = [];
let currentLenderId = null;
let currentFilter = 'all';
let selectedInteractionType = 'call';

// Default lenders (pre-populated)
const DEFAULT_LENDERS = [
    {
        id: 'horizon-farm-credit',
        orgName: 'Horizon Farm Credit',
        contactName: '',
        role: 'Loan Officer',
        phone: '888-339-3334',
        email: 'info@horizonfc.com',
        website: 'https://horizonfc.com',
        address: '',
        referralSource: 'Farm Credit System',
        firstContactDate: '',
        status: 'warm',
        preferredComm: 'phone',
        bestTime: '',
        personalityNotes: 'Private agricultural lender. FarmStarter Microloan for beginning farmers. Flexible underwriting.',
        photo: null,
        interactions: [],
        loanHistory: [],
        preferences: {
            loanTypes: ['Operating', 'Equipment', 'Real Estate'],
            minLoan: '$5,000',
            maxLoan: '$500,000',
            industries: ['Agriculture', 'Beginning Farmers'],
            dealBreakers: [],
            requirements: 'FarmStarter Microloan available for beginning farmers.',
            competitors: ''
        },
        strategy: {
            approach: '',
            talkingPoints: ['FarmStarter Microloan program', 'Beginning farmer designation'],
            avoidPoints: [],
            nextSteps: ['Schedule initial consultation']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'usda-fsa',
        orgName: 'USDA Farm Service Agency (FSA)',
        contactName: '',
        role: 'Farm Loan Officer',
        phone: '',
        email: '',
        website: 'https://farmers.gov/loans',
        address: '',
        referralSource: 'Federal Program',
        firstContactDate: '',
        status: 'warm',
        preferredComm: 'in-person',
        bestTime: 'Weekdays 8am-4pm',
        personalityNotes: 'Federal loans up to $400K operating, $600K ownership. Beginning farmer priority. No credit score requirement.',
        photo: null,
        interactions: [],
        loanHistory: [],
        preferences: {
            loanTypes: ['Operating', 'Ownership', 'Emergency'],
            minLoan: '$1,000',
            maxLoan: '$600,000',
            industries: ['All Agriculture'],
            dealBreakers: [],
            requirements: 'Must be unable to get commercial credit. Beginning farmer status helps.',
            competitors: 'Works with commercial lenders'
        },
        strategy: {
            approach: 'Emphasize beginning farmer status and inability to get commercial credit at reasonable terms.',
            talkingPoints: ['Beginning farmer status', 'Organic certification', 'Local food focus'],
            avoidPoints: [],
            nextSteps: ['Find local FSA office', 'Schedule appointment']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'pa-next-gen',
        orgName: 'PA Next Generation Farmer Program',
        contactName: '',
        role: 'Program Administrator',
        phone: '',
        email: '',
        website: 'https://dced.pa.gov/programs/next-generation-farmer-loan-program',
        address: '',
        referralSource: 'State Program',
        firstContactDate: '',
        status: 'cold',
        preferredComm: 'email',
        bestTime: '',
        personalityNotes: 'Tax-exempt loans up to $667K. 80-85% of bank rate. Must be PA resident, beginning farmer.',
        photo: null,
        interactions: [],
        loanHistory: [],
        preferences: {
            loanTypes: ['Operating', 'Equipment', 'Real Estate'],
            minLoan: '$10,000',
            maxLoan: '$667,000',
            industries: ['Agriculture - PA Residents'],
            dealBreakers: ['Not a PA resident', 'Not a beginning farmer'],
            requirements: 'Must be PA resident. Must be beginning farmer (less than 10 years primary operator).',
            competitors: 'Works through EDC Finance Corp'
        },
        strategy: {
            approach: 'Apply through EDC Finance Corp. Highlight PA residency and beginning farmer status.',
            talkingPoints: ['PA residency', 'Beginning farmer qualification', 'Tax-exempt interest rates'],
            avoidPoints: [],
            nextSteps: ['Contact EDC Finance Corp']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

// ==================== INITIALIZATION ====================

function initLenderCRM() {
    loadLenderData();
    renderLenderCards();
    updateCRMStats();

    // Set default date for interaction form
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('interactionDate');
    if (dateInput) dateInput.value = today;
}

function loadLenderData() {
    const stored = localStorage.getItem(LENDER_CRM_STORAGE_KEY);
    if (stored) {
        lenderCrmData = JSON.parse(stored);
    } else {
        // Initialize with default lenders
        lenderCrmData = [...DEFAULT_LENDERS];
        saveLenderData();
    }
}

function saveLenderData() {
    localStorage.setItem(LENDER_CRM_STORAGE_KEY, JSON.stringify(lenderCrmData));
    // TODO: Sync to backend when available
}

// ==================== CRM CARD RENDERING ====================

function renderLenderCards() {
    const grid = document.getElementById('lenderCrmGrid');
    const emptyState = document.getElementById('lenderEmptyState');

    if (!grid) return;

    // Filter lenders
    let filteredLenders = lenderCrmData;
    const searchTerm = document.getElementById('lenderSearchInput')?.value?.toLowerCase() || '';

    if (searchTerm) {
        filteredLenders = filteredLenders.filter(l =>
            l.orgName.toLowerCase().includes(searchTerm) ||
            l.contactName?.toLowerCase().includes(searchTerm) ||
            l.email?.toLowerCase().includes(searchTerm)
        );
    }

    if (currentFilter !== 'all') {
        filteredLenders = filteredLenders.filter(l => l.status === currentFilter);
    }

    if (filteredLenders.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = filteredLenders.map(lender => {
        const score = calculateRelationshipScore(lender);
        const lastContact = getLastContactInfo(lender);
        const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

        return `
            <div class="lender-crm-card" onclick="openLenderProfile('${lender.id}')">
                <div class="lender-crm-card-header">
                    <div class="lender-crm-photo">
                        ${lender.photo ? `<img src="${lender.photo}" alt="${lender.orgName}">` : `<i class="fas fa-building"></i>`}
                    </div>
                    <div class="lender-crm-info">
                        <div class="lender-crm-name">${lender.contactName || lender.orgName}</div>
                        <div class="lender-crm-org">${lender.contactName ? lender.orgName : (lender.role || 'Lender')}</div>
                        <div class="lender-crm-contact-info">
                            ${lender.phone ? `<span><i class="fas fa-phone"></i> ${lender.phone}</span>` : ''}
                            ${lender.email ? `<span><i class="fas fa-envelope"></i> ${lender.email}</span>` : ''}
                        </div>
                    </div>
                    <span class="relationship-status ${lender.status}">${formatStatus(lender.status)}</span>
                </div>
                <div class="relationship-score">
                    <span class="relationship-score-label">Score</span>
                    <div class="relationship-score-bar">
                        <div class="relationship-score-fill ${scoreClass}" style="width: ${score}%;"></div>
                    </div>
                    <span class="relationship-score-value">${score}</span>
                </div>
                <div class="lender-crm-footer">
                    <span class="last-contact ${lastContact.class}">
                        <i class="fas fa-clock"></i> ${lastContact.text}
                    </span>
                    <div class="quick-actions">
                        <button class="quick-action-btn" onclick="event.stopPropagation(); quickCall('${lender.id}')" title="Log Call">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="quick-action-btn" onclick="event.stopPropagation(); quickEmail('${lender.id}')" title="Send Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button class="quick-action-btn" onclick="event.stopPropagation(); quickFollowup('${lender.id}')" title="Schedule Follow-up">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatStatus(status) {
    const statusMap = {
        'cold': 'Cold',
        'warm': 'Warm',
        'active': 'Active',
        'partner': 'Partner'
    };
    return statusMap[status] || status;
}

function getLastContactInfo(lender) {
    if (!lender.interactions || lender.interactions.length === 0) {
        return { text: 'No contact yet', class: 'overdue' };
    }

    const lastInteraction = lender.interactions.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    )[0];

    const daysSince = Math.floor((new Date() - new Date(lastInteraction.date)) / (1000 * 60 * 60 * 24));

    if (daysSince <= 7) {
        return { text: `${daysSince === 0 ? 'Today' : daysSince + 'd ago'}`, class: 'recent' };
    } else if (daysSince <= 30) {
        return { text: `${daysSince}d ago`, class: 'stale' };
    } else {
        return { text: `${Math.floor(daysSince / 30)}mo ago`, class: 'overdue' };
    }
}

// ==================== RELATIONSHIP SCORE ====================

function calculateRelationshipScore(lender) {
    let score = 0;

    // Recency (25 points max)
    const recencyScore = calculateRecencyScore(lender);
    score += recencyScore;

    // Interaction count (25 points max)
    const interactionScore = calculateInteractionScore(lender);
    score += interactionScore;

    // Response rate (25 points max)
    const responseScore = calculateResponseScore(lender);
    score += responseScore;

    // Loan history (25 points max)
    const historyScore = calculateHistoryScore(lender);
    score += historyScore;

    return Math.min(100, Math.round(score));
}

function calculateRecencyScore(lender) {
    if (!lender.interactions || lender.interactions.length === 0) return 0;

    const lastInteraction = lender.interactions.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    )[0];

    const daysSince = Math.floor((new Date() - new Date(lastInteraction.date)) / (1000 * 60 * 60 * 24));

    if (daysSince <= 7) return 25;
    if (daysSince <= 14) return 20;
    if (daysSince <= 30) return 15;
    if (daysSince <= 60) return 10;
    if (daysSince <= 90) return 5;
    return 0;
}

function calculateInteractionScore(lender) {
    if (!lender.interactions) return 0;
    const count = lender.interactions.length;

    if (count >= 10) return 25;
    if (count >= 5) return 20;
    if (count >= 3) return 15;
    if (count >= 1) return 10;
    return 0;
}

function calculateResponseScore(lender) {
    // Based on status as a proxy for response
    const statusScores = {
        'partner': 25,
        'active': 20,
        'warm': 15,
        'cold': 5
    };
    return statusScores[lender.status] || 0;
}

function calculateHistoryScore(lender) {
    if (!lender.loanHistory || lender.loanHistory.length === 0) return 0;

    const approved = lender.loanHistory.filter(l => l.status === 'approved').length;
    const total = lender.loanHistory.length;

    if (approved > 0) return 25;
    if (total > 0) return 10;
    return 0;
}

// ==================== CRM STATS ====================

function updateCRMStats() {
    const totalEl = document.getElementById('totalLendersCount');
    const activeEl = document.getElementById('activeRelationshipsCount');
    const followupsEl = document.getElementById('pendingFollowupsCount');
    const avgScoreEl = document.getElementById('avgRelationshipScore');

    if (totalEl) totalEl.textContent = lenderCrmData.length;

    if (activeEl) {
        const active = lenderCrmData.filter(l => l.status === 'active' || l.status === 'partner').length;
        activeEl.textContent = active;
    }

    if (followupsEl) {
        const followups = JSON.parse(localStorage.getItem(LENDER_FOLLOWUPS_KEY) || '[]');
        const pending = followups.filter(f => new Date(f.date) >= new Date()).length;
        followupsEl.textContent = pending;
    }

    if (avgScoreEl) {
        if (lenderCrmData.length > 0) {
            const totalScore = lenderCrmData.reduce((sum, l) => sum + calculateRelationshipScore(l), 0);
            avgScoreEl.textContent = Math.round(totalScore / lenderCrmData.length);
        } else {
            avgScoreEl.textContent = '0';
        }
    }
}

// ==================== FILTERS ====================

function setLenderFilter(filter) {
    currentFilter = filter;

    // Update button states
    document.querySelectorAll('.crm-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderLenderCards();
}

function filterLenders() {
    renderLenderCards();
}

// ==================== LENDER PROFILE MODAL ====================

function openLenderProfile(lenderId) {
    currentLenderId = lenderId;

    const overlay = document.getElementById('lenderProfileOverlay');
    const modal = document.getElementById('lenderProfileModal');

    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');

    // Reset to overview tab
    switchProfileTab('overview');

    if (lenderId) {
        // Load existing lender
        const lender = lenderCrmData.find(l => l.id === lenderId);
        if (lender) {
            populateProfileForm(lender);
        }
    } else {
        // New lender - reset form
        resetProfileForm();
    }
}

function closeLenderProfile() {
    const overlay = document.getElementById('lenderProfileOverlay');
    const modal = document.getElementById('lenderProfileModal');

    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');

    currentLenderId = null;
}

function switchProfileTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update sections
    document.querySelectorAll('.profile-section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${tabName}`);
    });
}

function populateProfileForm(lender) {
    // Basic Info
    setValue('lenderOrgName', lender.orgName);
    setValue('lenderContactName', lender.contactName);
    setValue('lenderRole', lender.role);
    setValue('lenderPhone', lender.phone);
    setValue('lenderEmail', lender.email);
    setValue('lenderWebsite', lender.website);
    setValue('lenderAddress', lender.address);

    // Relationship Context
    setValue('lenderReferralSource', lender.referralSource);
    setValue('lenderFirstContact', lender.firstContactDate);
    setValue('lenderStatus', lender.status);
    setValue('lenderPreferredComm', lender.preferredComm);
    setValue('lenderBestTime', lender.bestTime);
    setValue('lenderPersonalityNotes', lender.personalityNotes);

    // Update header display
    document.getElementById('profileContactName').textContent = lender.contactName || lender.orgName || 'New Contact';
    document.getElementById('profileOrgName').textContent = lender.contactName ? lender.orgName : '';
    document.getElementById('profileRole').textContent = lender.role || '';

    // Photo
    const photoEl = document.getElementById('profilePhoto');
    if (photoEl) {
        if (lender.photo) {
            photoEl.innerHTML = `<img src="${lender.photo}" alt="${lender.orgName}">
                <input type="file" id="photoUploadInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(event)">
                <div class="lender-profile-photo-upload" onclick="document.getElementById('photoUploadInput').click()">
                    <i class="fas fa-camera"></i> Change
                </div>`;
        } else {
            photoEl.innerHTML = `<i class="fas fa-user-tie"></i>
                <input type="file" id="photoUploadInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(event)">
                <div class="lender-profile-photo-upload" onclick="document.getElementById('photoUploadInput').click()">
                    <i class="fas fa-camera"></i> Change
                </div>`;
        }
    }

    // Relationship Score
    updateScoreDisplay(lender);

    // Interactions
    renderInteractionHistory(lender);

    // Loan History
    renderLoanHistory(lender);

    // Preferences
    renderPreferences(lender);

    // Strategy
    renderStrategy(lender);
}

function resetProfileForm() {
    // Clear all inputs
    const inputs = document.querySelectorAll('#lenderProfileModal input, #lenderProfileModal textarea, #lenderProfileModal select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });

    // Reset header
    document.getElementById('profileContactName').textContent = 'New Lender Contact';
    document.getElementById('profileOrgName').textContent = 'Organization';
    document.getElementById('profileRole').textContent = 'Role / Title';

    // Reset photo
    const photoEl = document.getElementById('profilePhoto');
    if (photoEl) {
        photoEl.innerHTML = `<i class="fas fa-user-tie"></i>
            <input type="file" id="photoUploadInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(event)">
            <div class="lender-profile-photo-upload" onclick="document.getElementById('photoUploadInput').click()">
                <i class="fas fa-camera"></i> Change
            </div>`;
    }

    // Reset score
    document.getElementById('overviewScoreFill').style.width = '0%';
    document.getElementById('overviewScoreValue').textContent = '0';
    document.getElementById('scoreRecency').textContent = '0';
    document.getElementById('scoreInteractions').textContent = '0';
    document.getElementById('scoreResponse').textContent = '0';
    document.getElementById('scoreHistory').textContent = '0';

    // Clear lists
    document.getElementById('interactionList').innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No interactions logged yet</p>';
    document.getElementById('loanHistoryList').innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No loan applications on record</p>';

    // Reset date
    const today = new Date().toISOString().split('T')[0];
    setValue('interactionDate', today);
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function updateScoreDisplay(lender) {
    const score = calculateRelationshipScore(lender);
    const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

    const fillEl = document.getElementById('overviewScoreFill');
    const valueEl = document.getElementById('overviewScoreValue');

    if (fillEl) {
        fillEl.style.width = `${score}%`;
        fillEl.className = `relationship-score-fill ${scoreClass}`;
    }
    if (valueEl) valueEl.textContent = score;

    // Update breakdown
    document.getElementById('scoreRecency').textContent = calculateRecencyScore(lender);
    document.getElementById('scoreInteractions').textContent = calculateInteractionScore(lender);
    document.getElementById('scoreResponse').textContent = calculateResponseScore(lender);
    document.getElementById('scoreHistory').textContent = calculateHistoryScore(lender);
}

// ==================== SAVE PROFILE ====================

function saveLenderProfile() {
    const orgName = getValue('lenderOrgName');

    if (!orgName) {
        showCRMToast('Please enter a lender/bank name', 'error');
        return;
    }

    const lenderData = {
        id: currentLenderId || generateId(),
        orgName: orgName,
        contactName: getValue('lenderContactName'),
        role: getValue('lenderRole'),
        phone: getValue('lenderPhone'),
        email: getValue('lenderEmail'),
        website: getValue('lenderWebsite'),
        address: getValue('lenderAddress'),
        referralSource: getValue('lenderReferralSource'),
        firstContactDate: getValue('lenderFirstContact'),
        status: getValue('lenderStatus'),
        preferredComm: getValue('lenderPreferredComm'),
        bestTime: getValue('lenderBestTime'),
        personalityNotes: getValue('lenderPersonalityNotes'),
        photo: getCurrentPhoto(),
        updatedAt: new Date().toISOString()
    };

    if (currentLenderId) {
        // Update existing
        const index = lenderCrmData.findIndex(l => l.id === currentLenderId);
        if (index !== -1) {
            lenderData.interactions = lenderCrmData[index].interactions || [];
            lenderData.loanHistory = lenderCrmData[index].loanHistory || [];
            lenderData.preferences = getPreferencesFromForm(lenderCrmData[index].preferences);
            lenderData.strategy = getStrategyFromForm(lenderCrmData[index].strategy);
            lenderData.createdAt = lenderCrmData[index].createdAt;
            lenderCrmData[index] = lenderData;
        }
    } else {
        // Create new
        lenderData.interactions = [];
        lenderData.loanHistory = [];
        lenderData.preferences = getPreferencesFromForm({});
        lenderData.strategy = getStrategyFromForm({});
        lenderData.createdAt = new Date().toISOString();
        lenderCrmData.push(lenderData);
        currentLenderId = lenderData.id;
    }

    saveLenderData();
    renderLenderCards();
    updateCRMStats();
    showCRMToast('Profile saved successfully!', 'success');
}

function generateId() {
    return 'lender-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getCurrentPhoto() {
    const img = document.querySelector('#profilePhoto img');
    return img ? img.src : null;
}

function getPreferencesFromForm(existing) {
    return {
        loanTypes: existing?.loanTypes || [],
        minLoan: getValue('prefMinLoan'),
        maxLoan: getValue('prefMaxLoan'),
        industries: existing?.industries || [],
        dealBreakers: existing?.dealBreakers || [],
        requirements: getValue('prefRequirements'),
        competitors: getValue('prefCompetitors')
    };
}

function getStrategyFromForm(existing) {
    return {
        approach: getValue('strategyApproach'),
        talkingPoints: existing?.talkingPoints || [],
        avoidPoints: existing?.avoidPoints || [],
        nextSteps: existing?.nextSteps || []
    };
}

// ==================== INTERACTIONS ====================

function selectInteractionType(type) {
    selectedInteractionType = type;
    document.querySelectorAll('.interaction-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

function toggleFollowupDate() {
    const followupSelect = document.getElementById('interactionFollowup');
    const followupGroup = document.getElementById('followupDateGroup');

    if (followupGroup) {
        followupGroup.style.display = followupSelect?.value === 'yes' ? 'block' : 'none';
    }
}

function saveInteraction() {
    if (!currentLenderId) {
        showCRMToast('Please save the lender profile first', 'error');
        return;
    }

    const date = getValue('interactionDate');
    const summary = getValue('interactionSummary');

    if (!date || !summary) {
        showCRMToast('Please enter date and summary', 'error');
        return;
    }

    const interaction = {
        id: 'int-' + Date.now(),
        type: selectedInteractionType,
        date: date,
        summary: summary,
        followupNeeded: getValue('interactionFollowup') === 'yes',
        followupDate: getValue('interactionFollowupDate'),
        createdAt: new Date().toISOString()
    };

    const lender = lenderCrmData.find(l => l.id === currentLenderId);
    if (lender) {
        if (!lender.interactions) lender.interactions = [];
        lender.interactions.unshift(interaction);
        lender.updatedAt = new Date().toISOString();

        saveLenderData();
        renderInteractionHistory(lender);
        updateScoreDisplay(lender);
        renderLenderCards();
        updateCRMStats();

        // Reset form
        setValue('interactionSummary', '');
        setValue('interactionFollowup', 'no');
        setValue('interactionFollowupDate', '');
        toggleFollowupDate();

        showCRMToast('Interaction logged!', 'success');
    }
}

function renderInteractionHistory(lender) {
    const list = document.getElementById('interactionList');
    if (!list) return;

    if (!lender.interactions || lender.interactions.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No interactions logged yet</p>';
        return;
    }

    const typeIcons = {
        call: 'fa-phone',
        email: 'fa-envelope',
        meeting: 'fa-calendar-check',
        note: 'fa-sticky-note'
    };

    const typeLabels = {
        call: 'Phone Call',
        email: 'Email',
        meeting: 'Meeting',
        note: 'Note'
    };

    list.innerHTML = lender.interactions.map(int => `
        <div class="interaction-item ${int.type}">
            <div class="interaction-header">
                <div class="interaction-type ${int.type}">
                    <i class="fas ${typeIcons[int.type] || 'fa-comment'}"></i>
                    <span>${typeLabels[int.type] || int.type}</span>
                </div>
                <span class="interaction-date">${formatDate(int.date)}</span>
            </div>
            <div class="interaction-summary">${escapeHtml(int.summary)}</div>
            ${int.followupNeeded ? `
                <div class="interaction-followup">
                    <i class="fas fa-calendar-alt"></i>
                    Follow-up: ${int.followupDate ? formatDate(int.followupDate) : 'Date not set'}
                </div>
            ` : ''}
            <div class="interaction-actions">
                <button class="interaction-action-btn edit" onclick="editInteraction('${int.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="interaction-action-btn delete" onclick="deleteInteraction('${int.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function deleteInteraction(interactionId) {
    if (!confirm('Delete this interaction?')) return;

    const lender = lenderCrmData.find(l => l.id === currentLenderId);
    if (lender && lender.interactions) {
        lender.interactions = lender.interactions.filter(i => i.id !== interactionId);
        saveLenderData();
        renderInteractionHistory(lender);
        updateScoreDisplay(lender);
        renderLenderCards();
        showCRMToast('Interaction deleted', 'success');
    }
}

function editInteraction(interactionId) {
    // For simplicity, just alert - could expand to full edit modal
    showCRMToast('Edit functionality coming soon', 'warning');
}

// ==================== LOAN HISTORY ====================

function addLoanHistory() {
    document.getElementById('addLoanForm').style.display = 'block';
    // Reset form
    setValue('loanAppDate', '');
    setValue('loanType', 'operating');
    setValue('loanAmount', '');
    setValue('loanStatus', 'pending');
    setValue('loanPositives', '');
    setValue('loanNegatives', '');
}

function cancelLoanHistory() {
    document.getElementById('addLoanForm').style.display = 'none';
}

function saveLoanHistory() {
    if (!currentLenderId) {
        showCRMToast('Please save the lender profile first', 'error');
        return;
    }

    const loanData = {
        id: 'loan-' + Date.now(),
        date: getValue('loanAppDate'),
        type: getValue('loanType'),
        amount: getValue('loanAmount'),
        status: getValue('loanStatus'),
        positives: getValue('loanPositives'),
        negatives: getValue('loanNegatives'),
        createdAt: new Date().toISOString()
    };

    const lender = lenderCrmData.find(l => l.id === currentLenderId);
    if (lender) {
        if (!lender.loanHistory) lender.loanHistory = [];
        lender.loanHistory.unshift(loanData);
        lender.updatedAt = new Date().toISOString();

        saveLenderData();
        renderLoanHistory(lender);
        updateScoreDisplay(lender);
        cancelLoanHistory();
        showCRMToast('Loan application recorded!', 'success');
    }
}

function renderLoanHistory(lender) {
    const list = document.getElementById('loanHistoryList');
    if (!list) return;

    if (!lender.loanHistory || lender.loanHistory.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No loan applications on record</p>';
        return;
    }

    const typeLabels = {
        'operating': 'Operating Loan',
        'equipment': 'Equipment Loan',
        'real-estate': 'Real Estate',
        'line-of-credit': 'Line of Credit',
        'other': 'Other'
    };

    const statusBadges = {
        'pending': '<span class="status-badge in-progress"><i class="fas fa-clock"></i> Pending</span>',
        'approved': '<span class="status-badge approved"><i class="fas fa-check"></i> Approved</span>',
        'denied': '<span class="status-badge denied"><i class="fas fa-times"></i> Denied</span>',
        'withdrawn': '<span class="status-badge not-started"><i class="fas fa-undo"></i> Withdrawn</span>'
    };

    list.innerHTML = lender.loanHistory.map(loan => `
        <div class="loan-history-item">
            <div class="loan-history-header">
                <div class="loan-history-title">
                    <i class="fas fa-file-invoice-dollar"></i>
                    ${typeLabels[loan.type] || loan.type}
                </div>
                <div class="loan-history-amount">${loan.amount || 'Amount not specified'}</div>
            </div>
            <div class="loan-history-details">
                <div class="loan-history-detail">
                    <label>Date</label>
                    <span>${loan.date ? formatDate(loan.date) : 'Not specified'}</span>
                </div>
                <div class="loan-history-detail">
                    <label>Status</label>
                    ${statusBadges[loan.status] || loan.status}
                </div>
            </div>
            ${(loan.positives || loan.negatives) ? `
                <div class="loan-history-feedback">
                    ${loan.positives ? `
                        <h5><i class="fas fa-thumbs-up" style="color: var(--success);"></i> What They Liked</h5>
                        <p>${escapeHtml(loan.positives)}</p>
                    ` : ''}
                    ${loan.negatives ? `
                        <h5 style="margin-top: 0.5rem;"><i class="fas fa-thumbs-down" style="color: var(--danger);"></i> Areas to Improve</h5>
                        <p>${escapeHtml(loan.negatives)}</p>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ==================== PREFERENCES ====================

function renderPreferences(lender) {
    // Loan Types
    renderTagList('prefLoanTypes', lender.preferences?.loanTypes || [], 'loanTypes');

    // Industries
    renderTagList('prefIndustries', lender.preferences?.industries || [], 'industries');

    // Deal Breakers
    renderTagList('prefDealBreakers', lender.preferences?.dealBreakers || [], 'dealBreakers', true);

    // Text fields
    setValue('prefMinLoan', lender.preferences?.minLoan);
    setValue('prefMaxLoan', lender.preferences?.maxLoan);
    setValue('prefRequirements', lender.preferences?.requirements);
    setValue('prefCompetitors', lender.preferences?.competitors);
}

function renderTagList(containerId, tags, tagType, isWarning = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = tags.map(tag => `
        <span class="preference-tag ${isWarning ? 'warning' : 'highlight'}">
            ${escapeHtml(tag)}
            <i class="fas fa-times" style="margin-left: 0.25rem; cursor: pointer;" onclick="removeTag('${tagType}', '${escapeHtml(tag)}')"></i>
        </span>
    `).join('');
}

function handleTagInput(event, tagType) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const value = input.value.trim();

        if (value && currentLenderId) {
            const lender = lenderCrmData.find(l => l.id === currentLenderId);
            if (lender) {
                if (!lender.preferences) lender.preferences = {};
                if (!lender.preferences[tagType]) lender.preferences[tagType] = [];

                if (!lender.preferences[tagType].includes(value)) {
                    lender.preferences[tagType].push(value);
                    saveLenderData();
                    renderPreferences(lender);
                }
            }
        }
        input.value = '';
    }
}

function removeTag(tagType, tag) {
    if (currentLenderId) {
        const lender = lenderCrmData.find(l => l.id === currentLenderId);
        if (lender && lender.preferences && lender.preferences[tagType]) {
            lender.preferences[tagType] = lender.preferences[tagType].filter(t => t !== tag);
            saveLenderData();
            renderPreferences(lender);
        }
    }
}

// ==================== STRATEGY ====================

function renderStrategy(lender) {
    setValue('strategyApproach', lender.strategy?.approach);

    renderPointsList('talkingPointsList', lender.strategy?.talkingPoints || [], 'talking');
    renderPointsList('avoidList', lender.strategy?.avoidPoints || [], 'avoid');
    renderPointsList('nextStepsList', lender.strategy?.nextSteps || [], 'next');
}

function renderPointsList(containerId, points, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (points.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.85rem;">No ${type === 'talking' ? 'talking points' : type === 'avoid' ? 'items' : 'next steps'} added yet</p>`;
        return;
    }

    const listClass = type === 'next' ? 'next-steps-list' : 'talking-points-list';
    const itemClass = type === 'avoid' ? 'avoid' : '';

    container.innerHTML = `<ul class="${listClass}">
        ${points.map((point, index) => `
            <li class="${itemClass}">
                ${escapeHtml(point)}
                <i class="fas fa-times" style="float: right; cursor: pointer; color: var(--text-secondary);" onclick="removePoint('${type}', ${index})"></i>
            </li>
        `).join('')}
    </ul>`;
}

function addTalkingPoint() {
    addStrategyPoint('talking', 'newTalkingPoint', 'talkingPoints');
}

function addAvoidPoint() {
    addStrategyPoint('avoid', 'newAvoidPoint', 'avoidPoints');
}

function addNextStep() {
    addStrategyPoint('next', 'newNextStep', 'nextSteps');
}

function addStrategyPoint(type, inputId, arrayKey) {
    const input = document.getElementById(inputId);
    const value = input?.value?.trim();

    if (value && currentLenderId) {
        const lender = lenderCrmData.find(l => l.id === currentLenderId);
        if (lender) {
            if (!lender.strategy) lender.strategy = {};
            if (!lender.strategy[arrayKey]) lender.strategy[arrayKey] = [];

            lender.strategy[arrayKey].push(value);
            saveLenderData();
            renderStrategy(lender);
        }
    }
    if (input) input.value = '';
}

function removePoint(type, index) {
    if (currentLenderId) {
        const lender = lenderCrmData.find(l => l.id === currentLenderId);
        if (lender && lender.strategy) {
            const arrayKey = type === 'talking' ? 'talkingPoints' : type === 'avoid' ? 'avoidPoints' : 'nextSteps';
            if (lender.strategy[arrayKey]) {
                lender.strategy[arrayKey].splice(index, 1);
                saveLenderData();
                renderStrategy(lender);
            }
        }
    }
}

// ==================== QUICK ACTIONS ====================

function quickCall(lenderId) {
    const lender = lenderCrmData.find(l => l.id === lenderId);
    if (lender && lender.phone) {
        window.location.href = `tel:${lender.phone}`;
    } else {
        openLenderProfile(lenderId);
        switchProfileTab('interactions');
    }
}

function quickEmail(lenderId) {
    const lender = lenderCrmData.find(l => l.id === lenderId);
    if (lender && lender.email) {
        window.location.href = `mailto:${lender.email}`;
    } else {
        showCRMToast('No email address on file', 'warning');
    }
}

function quickFollowup(lenderId) {
    currentLenderId = lenderId;
    openFollowupModal();
}

function scheduleFollowup() {
    openFollowupModal();
}

function openFollowupModal() {
    document.getElementById('followupModalOverlay').classList.add('active');
    document.getElementById('followupModal').classList.add('active');

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setValue('followupDate', tomorrow.toISOString().split('T')[0]);
}

function closeFollowupModal() {
    document.getElementById('followupModalOverlay').classList.remove('active');
    document.getElementById('followupModal').classList.remove('active');
}

function saveFollowup() {
    const date = getValue('followupDate');
    const type = getValue('followupType');
    const notes = getValue('followupNotes');

    if (!date) {
        showCRMToast('Please select a date', 'error');
        return;
    }

    const followups = JSON.parse(localStorage.getItem(LENDER_FOLLOWUPS_KEY) || '[]');
    followups.push({
        id: 'followup-' + Date.now(),
        lenderId: currentLenderId,
        date: date,
        type: type,
        notes: notes,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem(LENDER_FOLLOWUPS_KEY, JSON.stringify(followups));

    closeFollowupModal();
    updateCRMStats();
    showCRMToast('Follow-up scheduled!', 'success');
}

function logQuickCall() {
    switchProfileTab('interactions');
    selectInteractionType('call');
}

function sendEmail() {
    if (currentLenderId) {
        const lender = lenderCrmData.find(l => l.id === currentLenderId);
        if (lender && lender.email) {
            window.location.href = `mailto:${lender.email}`;
        } else {
            showCRMToast('No email address on file', 'warning');
        }
    }
}

function viewChecklist() {
    // Switch to the Checklists tab in the main nav
    const checklistTab = document.querySelector('[data-tab="checklists"]');
    if (checklistTab) {
        checklistTab.click();
    }
    closeLenderProfile();
}

// ==================== PHOTO UPLOAD ====================

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoEl = document.getElementById('profilePhoto');
            if (photoEl) {
                const img = photoEl.querySelector('img') || document.createElement('img');
                img.src = e.target.result;
                if (!photoEl.contains(img)) {
                    photoEl.insertBefore(img, photoEl.firstChild);
                }
                photoEl.querySelector('i.fa-user-tie')?.remove();
            }
        };
        reader.readAsDataURL(file);
    }
}

// ==================== UTILITIES ====================

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showCRMToast(message, type = 'success') {
    const toast = document.getElementById('crmToast');
    const messageEl = document.getElementById('crmToastMessage');

    if (toast && messageEl) {
        messageEl.textContent = message;
        toast.className = `crm-toast ${type}`;

        const icon = toast.querySelector('i');
        if (icon) {
            icon.className = type === 'success' ? 'fas fa-check-circle' :
                            type === 'error' ? 'fas fa-exclamation-circle' :
                            'fas fa-info-circle';
        }

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on a page with the CRM
    if (document.getElementById('lenderCrmGrid')) {
        initLenderCRM();
    }
});

// Also initialize if the contacts tab is clicked
document.addEventListener('click', function(e) {
    if (e.target.closest('[data-tab="contacts"]')) {
        setTimeout(initLenderCRM, 100);
    }
});
