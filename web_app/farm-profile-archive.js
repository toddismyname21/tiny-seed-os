// ====== FARM PROFILE & GRANT ARCHIVE SYSTEM ======
// For Tiny Seed Farm Loan Readiness Command Center

const DEFAULT_FARM_PROFILE = {
    farmName: 'Tiny Seed Farm',
    owners: 'Todd Wilson',
    location: '257 Zeigler Rd, Rochester, PA 15074',
    previousAddress: '4312 Middle Rd, Allison Park, PA 15101',
    founded: '',
    acres: '',
    certifications: [],
    mission: '',
    history: '',
    unique: '',
    communityImpact: '',
    crops: [],
    markets: [],
    staffSize: '',
    equipment: '',
    infrastructure: '',
    revenueRange: '',
    growthTrend: '',
    financialMetrics: '',
    achievements: []
};

let farmProfileData = { ...DEFAULT_FARM_PROFILE };
let showingArchive = false;

// ====== FARM PROFILE FUNCTIONS ======

function loadFarmProfile() {
    const saved = localStorage.getItem('tsf_farm_profile');
    if (saved) {
        farmProfileData = { ...DEFAULT_FARM_PROFILE, ...JSON.parse(saved) };
    }
    renderFarmProfile();
    updateTrackRecord();
}

function saveFarmProfileData() {
    localStorage.setItem('tsf_farm_profile', JSON.stringify(farmProfileData));
}

function renderFarmProfile() {
    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '--';
    };
    const setHtml = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = val;
    };

    // Header
    setEl('farmProfileName', farmProfileData.farmName || 'Tiny Seed Farm');
    setHtml('farmProfileLocation', '<i class="fas fa-map-marker-alt"></i> ' + (farmProfileData.location || '257 Zeigler Rd, Rochester, PA 15074'));

    // Basic Info
    setEl('displayFarmName', farmProfileData.farmName || 'Tiny Seed Farm');
    setEl('displayLocation', farmProfileData.location || '257 Zeigler Rd, Rochester, PA 15074');
    setEl('displayFounded', farmProfileData.founded);
    setEl('displayOwners', farmProfileData.owners || 'Todd Wilson');
    setEl('displayAcres', farmProfileData.acres);

    // Certifications
    const certContainer = document.getElementById('displayCertifications');
    if (certContainer) {
        certContainer.innerHTML = farmProfileData.certifications?.length > 0
            ? farmProfileData.certifications.map(c => '<span class="editable-tag"><i class="fas fa-certificate" style="color: var(--success);"></i> ' + c + '</span>').join('')
            : '<span style="color: var(--text-secondary);">No certifications added</span>';
    }

    // Farm Story
    setEl('displayMission', farmProfileData.mission);
    setEl('displayHistory', farmProfileData.history);
    setEl('displayUnique', farmProfileData.unique);
    setEl('displayCommunityImpact', farmProfileData.communityImpact);

    // Crops
    const cropsContainer = document.getElementById('displayCrops');
    if (cropsContainer) {
        cropsContainer.innerHTML = farmProfileData.crops?.length > 0
            ? farmProfileData.crops.map(c => '<span class="editable-tag"><i class="fas fa-seedling" style="color: var(--success);"></i> ' + c + '</span>').join('')
            : '<span style="color: var(--text-secondary);">No crops added</span>';
    }

    // Markets
    const marketsContainer = document.getElementById('displayMarkets');
    if (marketsContainer) {
        marketsContainer.innerHTML = farmProfileData.markets?.length > 0
            ? farmProfileData.markets.map(m => '<span class="editable-tag"><i class="fas fa-store" style="color: var(--gold);"></i> ' + m + '</span>').join('')
            : '<span style="color: var(--text-secondary);">No markets added</span>';
    }

    // Operations
    setEl('displayStaffSize', farmProfileData.staffSize);
    setEl('displayEquipment', farmProfileData.equipment);
    setEl('displayInfrastructure', farmProfileData.infrastructure);

    // Financial
    setEl('displayRevenueRange', farmProfileData.revenueRange);
    setEl('displayGrowthTrend', farmProfileData.growthTrend);
    setEl('displayFinancialMetrics', farmProfileData.financialMetrics);

    // Achievements
    const achievementsContainer = document.getElementById('displayAchievements');
    if (achievementsContainer) {
        achievementsContainer.innerHTML = farmProfileData.achievements?.length > 0
            ? farmProfileData.achievements.map(a => '<div class="achievement-item"><span class="achievement-year">' + a.year + '</span><span class="achievement-text">' + a.text + '</span></div>').join('')
            : '<span style="color: var(--text-secondary);">No achievements added</span>';
    }
}

function updateTrackRecord() {
    // Years in operation
    if (farmProfileData.founded) {
        const years = new Date().getFullYear() - parseInt(farmProfileData.founded);
        const el = document.getElementById('trackYearsInOperation');
        if (el) el.textContent = years;
    }

    // Check if grantsData exists
    if (typeof grantsData === 'undefined') return;

    // Calculate grants stats from archived grants
    const archivedGrants = grantsData.filter(g => g.archived || g.status === 'awarded' || g.status === 'denied');
    const awardedGrants = archivedGrants.filter(g => g.status === 'awarded');

    const el1 = document.getElementById('trackTotalGrantsReceived');
    if (el1) el1.textContent = awardedGrants.length;

    // Total funding from awarded grants
    let totalFunding = 0;
    awardedGrants.forEach(g => {
        const amount = g.archiveData?.finalAmount || g.amount;
        const match = amount?.match(/\$?([\d,]+)/);
        if (match) totalFunding += parseInt(match[1].replace(/,/g, ''));
    });
    const el2 = document.getElementById('trackTotalGrantFunding');
    if (el2) el2.textContent = '$' + totalFunding.toLocaleString();

    // Success rate
    const completedGrants = archivedGrants.filter(g => g.status === 'awarded' || g.status === 'denied');
    if (completedGrants.length > 0) {
        const successRate = Math.round((awardedGrants.length / completedGrants.length) * 100);
        const el3 = document.getElementById('trackGrantSuccessRate');
        if (el3) el3.textContent = successRate + '%';
    }
}

function openEditFarmProfileModal() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('editFarmName', farmProfileData.farmName);
    setVal('editOwners', farmProfileData.owners);
    setVal('editLocation', farmProfileData.location);
    setVal('editFounded', farmProfileData.founded);
    setVal('editAcres', farmProfileData.acres);
    setVal('editCertifications', (farmProfileData.certifications || []).join(', '));
    setVal('editMission', farmProfileData.mission);
    setVal('editHistory', farmProfileData.history);
    setVal('editUnique', farmProfileData.unique);
    setVal('editCommunityImpact', farmProfileData.communityImpact);
    setVal('editCrops', (farmProfileData.crops || []).join(', '));
    setVal('editMarkets', (farmProfileData.markets || []).join(', '));
    setVal('editStaffSize', farmProfileData.staffSize);
    setVal('editEquipment', farmProfileData.equipment);
    setVal('editInfrastructure', farmProfileData.infrastructure);
    setVal('editRevenueRange', farmProfileData.revenueRange);
    setVal('editGrowthTrend', farmProfileData.growthTrend);
    setVal('editFinancialMetrics', farmProfileData.financialMetrics);

    renderAchievementsList();
    document.getElementById('farmProfileModal').classList.add('active');
}

function closeFarmProfileModal() {
    document.getElementById('farmProfileModal').classList.remove('active');
}

function renderAchievementsList() {
    const container = document.getElementById('achievementsList');
    if (!container) return;

    if (!farmProfileData.achievements || farmProfileData.achievements.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No achievements added yet.</p>';
        return;
    }

    container.innerHTML = farmProfileData.achievements.map((a, idx) =>
        '<div class="achievement-item">' +
            '<span class="achievement-year">' + a.year + '</span>' +
            '<span class="achievement-text">' + a.text + '</span>' +
            '<button onclick="removeAchievement(' + idx + ')" style="background:none;border:none;color:var(--danger);cursor:pointer;margin-left:auto;">' +
                '<i class="fas fa-times"></i>' +
            '</button>' +
        '</div>'
    ).join('');
}

function addAchievement() {
    const year = document.getElementById('newAchievementYear').value;
    const text = document.getElementById('newAchievementText').value.trim();

    if (!year || !text) {
        showNotification('Please enter both year and achievement', 'error');
        return;
    }

    if (!farmProfileData.achievements) farmProfileData.achievements = [];
    farmProfileData.achievements.push({ year: parseInt(year), text: text });
    farmProfileData.achievements.sort((a, b) => b.year - a.year);

    document.getElementById('newAchievementYear').value = '';
    document.getElementById('newAchievementText').value = '';
    renderAchievementsList();
}

function removeAchievement(idx) {
    farmProfileData.achievements.splice(idx, 1);
    renderAchievementsList();
}

function saveFarmProfile() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    farmProfileData.farmName = getVal('editFarmName');
    farmProfileData.owners = getVal('editOwners');
    farmProfileData.location = getVal('editLocation');
    farmProfileData.founded = getVal('editFounded');
    farmProfileData.acres = getVal('editAcres');
    farmProfileData.certifications = getVal('editCertifications').split(',').map(c => c.trim()).filter(c => c);
    farmProfileData.mission = getVal('editMission');
    farmProfileData.history = getVal('editHistory');
    farmProfileData.unique = getVal('editUnique');
    farmProfileData.communityImpact = getVal('editCommunityImpact');
    farmProfileData.crops = getVal('editCrops').split(',').map(c => c.trim()).filter(c => c);
    farmProfileData.markets = getVal('editMarkets').split(',').map(m => m.trim()).filter(m => m);
    farmProfileData.staffSize = getVal('editStaffSize');
    farmProfileData.equipment = getVal('editEquipment');
    farmProfileData.infrastructure = getVal('editInfrastructure');
    farmProfileData.revenueRange = getVal('editRevenueRange');
    farmProfileData.growthTrend = getVal('editGrowthTrend');
    farmProfileData.financialMetrics = getVal('editFinancialMetrics');

    saveFarmProfileData();
    renderFarmProfile();
    updateTrackRecord();
    closeFarmProfileModal();
    showNotification('Farm profile saved!', 'success');
}

function exportFarmProfile() {
    showNotification('PDF export coming soon! For now, copy-paste from the profile.', 'info');
}

// ====== GRANT BIO FUNCTIONS ======

function pullFromProfile(field) {
    const grantId = document.getElementById('editGrantId').value;
    if (typeof grantsData === 'undefined') return;
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;

    switch(field) {
        case 'whyGoodFit':
            let fitText = '';
            if (farmProfileData.unique) fitText += farmProfileData.unique + '\n\n';
            if (farmProfileData.mission) fitText += 'Our mission: ' + farmProfileData.mission;
            document.getElementById('grantBioWhyGoodFit').value = fitText.trim();
            break;
        case 'relevantExperience':
            let expText = '';
            if (farmProfileData.history) expText += farmProfileData.history + '\n\n';
            if (farmProfileData.achievements?.length > 0) {
                expText += 'Key achievements:\n';
                farmProfileData.achievements.slice(0, 3).forEach(a => {
                    expText += '- ' + a.year + ': ' + a.text + '\n';
                });
            }
            document.getElementById('grantBioRelevantExperience').value = expText.trim();
            break;
        case 'missionAlignment':
            let alignText = '';
            if (farmProfileData.mission) alignText += farmProfileData.mission + '\n\n';
            if (farmProfileData.communityImpact) alignText += 'Community Impact: ' + farmProfileData.communityImpact;
            document.getElementById('grantBioMissionAlignment').value = alignText.trim();
            break;
    }
    showNotification('Content pulled from Farm Profile', 'success');
}

function markGrantBioSubmitted() {
    const grantId = document.getElementById('editGrantId').value;
    if (typeof grantsData === 'undefined') return;
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;

    if (!grant.grantBio) grant.grantBio = {};
    grant.grantBio.submittedVersion = new Date().toISOString();
    grant.grantBio.whyGoodFit = document.getElementById('grantBioWhyGoodFit')?.value || '';
    grant.grantBio.relevantExperience = document.getElementById('grantBioRelevantExperience')?.value || '';
    grant.grantBio.missionAlignment = document.getElementById('grantBioMissionAlignment')?.value || '';
    grant.grantBio.outcomes = document.getElementById('grantBioOutcomes')?.value || '';
    grant.grantBio.talkingPoints = document.getElementById('grantBioTalkingPoints')?.value || '';

    saveGrants();
    document.getElementById('grantBioSubmittedVersion').textContent = 'Submitted on ' + new Date().toLocaleDateString();
    showNotification('Grant bio marked as submitted', 'success');
}

function renderGrantBio(grantId) {
    if (typeof grantsData === 'undefined') return;
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;

    const bio = grant.grantBio || {};
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('grantBioWhyGoodFit', bio.whyGoodFit);
    setVal('grantBioRelevantExperience', bio.relevantExperience);
    setVal('grantBioMissionAlignment', bio.missionAlignment);
    setVal('grantBioOutcomes', bio.outcomes);
    setVal('grantBioTalkingPoints', bio.talkingPoints);

    const versionEl = document.getElementById('grantBioSubmittedVersion');
    if (versionEl) {
        versionEl.textContent = bio.submittedVersion
            ? 'Submitted on ' + new Date(bio.submittedVersion).toLocaleDateString()
            : 'Not submitted yet';
    }
}

// ====== GRANT ARCHIVE FUNCTIONS ======

function toggleArchiveView() {
    showingArchive = !showingArchive;
    const btn = document.getElementById('archiveToggleBtn');
    const text = document.getElementById('archiveToggleText');
    const historyCard = document.getElementById('grantHistoryCard');

    if (showingArchive) {
        btn?.classList.add('active');
        if (text) text.textContent = 'Hide Archive';
        if (historyCard) historyCard.style.display = 'block';
        renderGrantHistory();
    } else {
        btn?.classList.remove('active');
        if (text) text.textContent = 'Show Archive';
        if (historyCard) historyCard.style.display = 'none';
    }
    renderGrants();
}

function renderGrantHistory() {
    const container = document.getElementById('grantHistoryTimeline');
    const statsEl = document.getElementById('grantHistoryStats');
    if (!container || typeof grantsData === 'undefined') return;

    const archivedGrants = grantsData.filter(g => g.archived || g.status === 'awarded' || g.status === 'denied')
        .sort((a, b) => {
            const dateA = a.archiveData?.decisionDate || a.deadline || '1970-01-01';
            const dateB = b.archiveData?.decisionDate || b.deadline || '1970-01-01';
            return new Date(dateB) - new Date(dateA);
        });

    if (archivedGrants.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No archived grants yet. Grants are automatically archived when marked as Awarded or Denied.</p>';
        if (statsEl) statsEl.textContent = '';
        return;
    }

    // Calculate stats
    const awarded = archivedGrants.filter(g => g.status === 'awarded').length;
    const denied = archivedGrants.filter(g => g.status === 'denied').length;
    let totalAwarded = 0;
    archivedGrants.filter(g => g.status === 'awarded').forEach(g => {
        const match = (g.archiveData?.finalAmount || g.amount)?.match(/\$?([\d,]+)/);
        if (match) totalAwarded += parseInt(match[1].replace(/,/g, ''));
    });

    if (statsEl) {
        statsEl.innerHTML = '<span style="color:var(--success);"><i class="fas fa-trophy"></i> ' + awarded + ' Awarded ($' + totalAwarded.toLocaleString() + ')</span> | <span style="color:var(--danger);"><i class="fas fa-times-circle"></i> ' + denied + ' Denied</span>';
    }

    // Render timeline
    container.innerHTML = archivedGrants.map(grant => {
        const amount = grant.archiveData?.finalAmount || grant.amount || '';
        const date = grant.archiveData?.decisionDate
            ? new Date(grant.archiveData.decisionDate).toLocaleDateString()
            : (grant.deadline ? new Date(grant.deadline).toLocaleDateString() : 'Unknown');
        const lessons = grant.archiveData?.lessonsLearned || '';

        return '<div class="history-item ' + grant.status + '">' +
            '<div class="history-item-header">' +
                '<span class="history-item-name">' + grant.name + '</span>' +
                '<span class="history-item-amount">' + (grant.status === 'awarded' ? amount : '') + '</span>' +
            '</div>' +
            '<div class="history-item-meta">' + grant.source + ' | ' + date + '</div>' +
            (lessons ? '<div class="history-item-outcome"><i class="fas fa-lightbulb" style="color:var(--gold);"></i> ' + lessons + '</div>' : '') +
            '<button class="btn btn-sm btn-secondary" onclick="editGrant(\'' + grant.id + '\')" style="margin-top:0.5rem;"><i class="fas fa-eye"></i> View</button>' +
        '</div>';
    }).join('');
}

function archiveGrant() {
    const grantId = document.getElementById('editGrantId').value;
    if (typeof grantsData === 'undefined') return;
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;

    if (grant.status !== 'awarded' && grant.status !== 'denied') {
        showNotification('Only Awarded or Denied grants can be archived', 'error');
        return;
    }

    grant.archived = true;
    saveArchiveOutcome();
}

function saveArchiveOutcome() {
    const grantId = document.getElementById('editGrantId').value;
    if (typeof grantsData === 'undefined') return;
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;

    grant.archived = true;
    grant.archiveData = {
        status: document.getElementById('archiveOutcomeStatus')?.value || 'awarded',
        finalAmount: document.getElementById('archiveFinalAmount')?.value.trim() || '',
        decisionDate: document.getElementById('archiveDecisionDate')?.value || '',
        feedback: document.getElementById('archiveFeedback')?.value.trim() || '',
        lessonsLearned: document.getElementById('archiveLessonsLearned')?.value.trim() || '',
        wouldApplyAgain: document.getElementById('archiveWouldApplyAgain')?.value || ''
    };

    grant.status = grant.archiveData.status;

    saveGrants();
    renderGrants();
    updateGrantMetrics();
    updateTrackRecord();
    if (showingArchive) renderGrantHistory();
    closeEditGrantModal();
    showNotification('Grant archived successfully', 'success');
}

function renderArchiveTab(grantId) {
    if (typeof grantsData === 'undefined') return;
    const grant = grantsData.find(g => g.id === grantId);
    if (!grant) return;

    const archiveData = grant.archiveData || {};
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('archiveOutcomeStatus', archiveData.status || grant.status || 'awarded');
    setVal('archiveFinalAmount', archiveData.finalAmount || grant.amount);
    setVal('archiveDecisionDate', archiveData.decisionDate);
    setVal('archiveFeedback', archiveData.feedback);
    setVal('archiveLessonsLearned', archiveData.lessonsLearned);
    setVal('archiveWouldApplyAgain', archiveData.wouldApplyAgain);

    // Toggle final amount visibility based on status
    const statusSelect = document.getElementById('archiveOutcomeStatus');
    const amountField = document.getElementById('archiveFinalAmountField');
    if (statusSelect && amountField) {
        statusSelect.onchange = function() {
            amountField.style.display = this.value === 'awarded' ? 'block' : 'none';
        };
        amountField.style.display = statusSelect.value === 'awarded' ? 'block' : 'none';
    }
}

// ====== OVERRIDE EXISTING FUNCTIONS ======

// Store original functions before overriding
const _originalFilterGrants = typeof filterGrants !== 'undefined' ? filterGrants : null;
const _originalRenderGrantCard = typeof renderGrantCard !== 'undefined' ? renderGrantCard : null;
const _originalEditGrant = typeof editGrant !== 'undefined' ? editGrant : null;
const _originalSwitchEditGrantTab = typeof switchEditGrantTab !== 'undefined' ? switchEditGrantTab : null;
const _originalSaveEditedGrant = typeof saveEditedGrant !== 'undefined' ? saveEditedGrant : null;

// Override filterGrants to handle archive filter
if (_originalFilterGrants) {
    filterGrants = function() {
        const grid = document.getElementById('grantsGrid');
        if (!grid || typeof grantsData === 'undefined') return;

        const statusFilter = document.getElementById('grantFilterStatus')?.value || 'all';
        const categoryFilter = document.getElementById('grantFilterCategory')?.value || 'all';

        let filteredGrants = grantsData.filter(grant => {
            if (statusFilter === 'archived') {
                return grant.archived || grant.status === 'awarded' || grant.status === 'denied';
            }
            if (statusFilter === 'active') {
                return !grant.archived && grant.status !== 'awarded' && grant.status !== 'denied';
            }
            if (statusFilter !== 'all' && grant.status !== statusFilter) return false;
            if (categoryFilter !== 'all' && grant.category !== categoryFilter) return false;
            return true;
        });

        if (filteredGrants.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i><p>No grants found.</p><button class="btn btn-primary" onclick="openAddGrantModal()" style="margin-top: 1rem;"><i class="fas fa-plus"></i> Add Grant</button></div>';
            return;
        }

        grid.innerHTML = filteredGrants.map(grant => renderGrantCard(grant)).join('');
    };
}

// Override renderGrantCard to show archive badge
if (_originalRenderGrantCard) {
    renderGrantCard = function(grant) {
        let cardHtml = _originalRenderGrantCard(grant);

        if (grant.archived || grant.status === 'awarded' || grant.status === 'denied') {
            cardHtml = cardHtml.replace('class="grant-card"', 'class="grant-card archived"');
            if (grant.archived) {
                cardHtml = cardHtml.replace('</h3>', '</h3><span class="archive-badge"><i class="fas fa-archive"></i> Archived</span>');
            }
        }

        return cardHtml;
    };
}

// Override editGrant to show archive tab and grant bio
if (_originalEditGrant) {
    editGrant = function(grantId) {
        _originalEditGrant(grantId);

        if (typeof grantsData === 'undefined') return;
        const grant = grantsData.find(g => g.id === grantId);
        if (!grant) return;

        renderGrantBio(grantId);

        const archiveTabBtn = document.getElementById('archiveTabBtn');
        const archiveBtn = document.getElementById('archiveGrantBtn');

        if (grant.status === 'awarded' || grant.status === 'denied') {
            if (archiveTabBtn) archiveTabBtn.style.display = 'flex';
            if (archiveBtn) archiveBtn.style.display = 'inline-flex';
            renderArchiveTab(grantId);
        } else {
            if (archiveTabBtn) archiveTabBtn.style.display = 'none';
            if (archiveBtn) archiveBtn.style.display = 'none';
        }
    };
}

// Override switchEditGrantTab to include new tabs
if (_originalSwitchEditGrantTab) {
    switchEditGrantTab = function(tabName) {
        document.querySelectorAll('.grant-detail-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.grant-detail-content').forEach(content => content.classList.remove('active'));

        const tabButton = document.querySelector('.grant-detail-tab[onclick*="' + tabName + '"]');
        if (tabButton) tabButton.classList.add('active');

        const tabContent = document.getElementById('editGrantTab-' + tabName);
        if (tabContent) tabContent.classList.add('active');
    };
}

// Override saveEditedGrant to save grant bio
if (_originalSaveEditedGrant) {
    saveEditedGrant = function() {
        const grantId = document.getElementById('editGrantId').value;
        if (typeof grantsData !== 'undefined') {
            const grant = grantsData.find(g => g.id === grantId);
            if (grant) {
                if (!grant.grantBio) grant.grantBio = {};
                grant.grantBio.whyGoodFit = document.getElementById('grantBioWhyGoodFit')?.value || '';
                grant.grantBio.relevantExperience = document.getElementById('grantBioRelevantExperience')?.value || '';
                grant.grantBio.missionAlignment = document.getElementById('grantBioMissionAlignment')?.value || '';
                grant.grantBio.outcomes = document.getElementById('grantBioOutcomes')?.value || '';
                grant.grantBio.talkingPoints = document.getElementById('grantBioTalkingPoints')?.value || '';
            }
        }
        _originalSaveEditedGrant();
    };
}

// ====== TAB SWITCHING HELPER ======

function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const navTab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
    if (navTab) navTab.classList.add('active');

    const tabContent = document.getElementById('tab-' + tabName);
    if (tabContent) tabContent.classList.add('active');
}

// ====== INITIALIZATION ======

document.addEventListener('DOMContentLoaded', () => {
    loadFarmProfile();
});

console.log('%c Farm Profile & Grant Archive System Ready', 'color: #2a9d8f; font-weight: bold; font-size: 12px;');
