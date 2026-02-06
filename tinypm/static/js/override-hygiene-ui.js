/**
 * Override Hygiene UI - Phase 4: Sovereign Seed
 * ===========================================================================
 *
 * Frontend for the Override Hygiene System that prevents canonical knowledge
 * corruption through tiered preference management.
 *
 * Features:
 * - Rule browser showing tier hierarchy
 * - Override editor (can't edit canonical)
 * - Promotion request form
 * - Drift detector dashboard
 * - "Why this rule?" explanation
 *
 * Integration:
 * - Works with /api/overrides/* endpoints
 * - Displays in Forensic Dashboard
 *
 * Created: 2026-02-04
 * Part of: Project "Sovereign Seed" Phase 4
 */

const OverrideHygieneUI = (function() {
    'use strict';

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    const TIER_COLORS = {
        canonical: '#ef4444',   // Red - immutable
        preference: '#f59e0b',  // Amber - user override
        learned: '#22c55e'      // Green - AI pattern
    };

    const TIER_LABELS = {
        canonical: 'Canonical (Immutable)',
        preference: 'User Preference',
        learned: 'Learned Pattern'
    };

    const IMPACT_COLORS = {
        low: '#22c55e',
        medium: '#f59e0b',
        high: '#ef4444'
    };

    // =========================================================================
    // STATE
    // =========================================================================

    let currentUserId = null;
    let hierarchyData = null;
    let refreshInterval = null;

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    function init(options = {}) {
        currentUserId = options.userId || 'default_user';

        // Create UI elements if container provided
        if (options.container) {
            renderDashboard(options.container);
        }

        // Initial load
        loadHierarchy();

        // Auto-refresh if enabled
        if (options.autoRefresh) {
            refreshInterval = setInterval(loadHierarchy, options.refreshInterval || 30000);
        }

        console.log('[OverrideHygiene] UI initialized for user:', currentUserId);
    }

    function destroy() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    // =========================================================================
    // API CALLS
    // =========================================================================

    async function loadHierarchy() {
        try {
            const response = await fetch(`/api/overrides/hierarchy?user_id=${currentUserId}`);
            if (response.ok) {
                hierarchyData = await response.json();
                updateHierarchyDisplay();
                return hierarchyData;
            }
        } catch (error) {
            console.error('[OverrideHygiene] Failed to load hierarchy:', error);
        }
        return null;
    }

    async function loadStats() {
        try {
            const response = await fetch('/api/overrides/stats');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('[OverrideHygiene] Failed to load stats:', error);
        }
        return null;
    }

    async function loadDrifts() {
        try {
            const response = await fetch('/api/overrides/drifts');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('[OverrideHygiene] Failed to load drifts:', error);
        }
        return null;
    }

    async function setPreference(key, value, reason) {
        try {
            const response = await fetch('/api/overrides/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: key,
                    value: value,
                    user_id: currentUserId,
                    reason: reason
                })
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.error && result.error.includes('canonical')) {
                    showCanonicalBlockedAlert(key, result.canonical_value);
                } else {
                    showError('Failed to set preference: ' + (result.error || 'Unknown error'));
                }
                return null;
            }

            showSuccess('Preference saved successfully');
            loadHierarchy();
            return result;

        } catch (error) {
            console.error('[OverrideHygiene] Failed to set preference:', error);
            showError('Network error setting preference');
            return null;
        }
    }

    async function requestPromotion(overrideId, justification, evidence) {
        try {
            const response = await fetch('/api/overrides/promotions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    override_id: overrideId,
                    user_id: currentUserId,
                    justification: justification,
                    evidence: evidence || []
                })
            });

            if (response.ok) {
                const result = await response.json();
                showSuccess('Promotion request submitted for review');
                loadHierarchy();
                return result;
            } else {
                const error = await response.json();
                showError('Failed to request promotion: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('[OverrideHygiene] Failed to request promotion:', error);
            showError('Network error requesting promotion');
        }
        return null;
    }

    async function reviewPromotion(requestId, approved, notes) {
        try {
            const response = await fetch('/api/overrides/promotions/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: requestId,
                    reviewer_id: currentUserId,
                    approved: approved,
                    notes: notes
                })
            });

            if (response.ok) {
                const result = await response.json();
                showSuccess(`Promotion ${approved ? 'approved' : 'rejected'}`);
                loadHierarchy();
                return result;
            }
        } catch (error) {
            console.error('[OverrideHygiene] Failed to review promotion:', error);
        }
        return null;
    }

    async function explainRule(key) {
        try {
            const response = await fetch(`/api/overrides/explain?key=${encodeURIComponent(key)}&user_id=${currentUserId}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('[OverrideHygiene] Failed to explain rule:', error);
        }
        return null;
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================

    function renderDashboard(container) {
        const html = `
            <div class="override-hygiene-dashboard">
                <div class="oh-header">
                    <h3>Override Hygiene</h3>
                    <div class="oh-header-actions">
                        <button class="oh-btn oh-btn-secondary" onclick="OverrideHygieneUI.openRuleBrowser()">
                            Browse Rules
                        </button>
                        <button class="oh-btn oh-btn-secondary" onclick="OverrideHygieneUI.runDriftScan()">
                            Scan Drift
                        </button>
                    </div>
                </div>

                <div class="oh-stats-grid" id="ohStatsGrid">
                    <div class="oh-stat-card">
                        <div class="oh-stat-label">Canonical Rules</div>
                        <div class="oh-stat-value" id="ohCanonicalCount">-</div>
                        <div class="oh-stat-badge" style="background: ${TIER_COLORS.canonical}">Immutable</div>
                    </div>
                    <div class="oh-stat-card">
                        <div class="oh-stat-label">User Preferences</div>
                        <div class="oh-stat-value" id="ohPreferenceCount">-</div>
                        <div class="oh-stat-badge" style="background: ${TIER_COLORS.preference}">Personal</div>
                    </div>
                    <div class="oh-stat-card">
                        <div class="oh-stat-label">Learned Patterns</div>
                        <div class="oh-stat-value" id="ohLearnedCount">-</div>
                        <div class="oh-stat-badge" style="background: ${TIER_COLORS.learned}">AI</div>
                    </div>
                    <div class="oh-stat-card">
                        <div class="oh-stat-label">Pending Promotions</div>
                        <div class="oh-stat-value" id="ohPendingCount">-</div>
                        <div class="oh-stat-badge" style="background: #6366f1">Review</div>
                    </div>
                </div>

                <div class="oh-drift-section" id="ohDriftSection">
                    <h4>Drift Alerts</h4>
                    <div class="oh-drift-list" id="ohDriftList">
                        <div class="oh-empty-state">No drift detected</div>
                    </div>
                </div>
            </div>
        `;

        if (typeof container === 'string') {
            container = document.getElementById(container) || document.querySelector(container);
        }

        if (container) {
            container.innerHTML = html;
        }
    }

    function updateHierarchyDisplay() {
        if (!hierarchyData) return;

        // Update stats
        const summary = hierarchyData.summary || {};
        updateElement('ohCanonicalCount', summary.total_canonical || 0);
        updateElement('ohPreferenceCount', summary.total_preferences || 0);
        updateElement('ohLearnedCount', summary.total_learned || 0);
        updateElement('ohPendingCount', summary.pending_promotions || 0);
    }

    function updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // =========================================================================
    // RULE BROWSER MODAL
    // =========================================================================

    function openRuleBrowser() {
        const modal = createModal('Rule Hierarchy Browser', renderRuleBrowserContent());
        document.body.appendChild(modal);
        loadHierarchyIntoModal();
    }

    function renderRuleBrowserContent() {
        return `
            <div class="oh-rule-browser">
                <div class="oh-browser-controls">
                    <input type="text" id="ohRuleSearch" placeholder="Search rules..."
                           class="oh-search-input" oninput="OverrideHygieneUI.filterRules(this.value)">
                    <select id="ohTierFilter" onchange="OverrideHygieneUI.filterByTier(this.value)">
                        <option value="">All Tiers</option>
                        <option value="canonical">Canonical Only</option>
                        <option value="preference">Preferences Only</option>
                        <option value="learned">Learned Only</option>
                    </select>
                </div>

                <div class="oh-hierarchy-view">
                    <div class="oh-tier-section">
                        <div class="oh-tier-header" style="border-left: 3px solid ${TIER_COLORS.canonical}">
                            <span class="oh-tier-icon">&#128274;</span>
                            TIER 1: CANONICAL (Seed Vault)
                            <span class="oh-tier-count" id="ohBrowserCanonicalCount">0</span>
                        </div>
                        <div class="oh-rules-list" id="ohCanonicalRules"></div>
                    </div>

                    <div class="oh-tier-section">
                        <div class="oh-tier-header" style="border-left: 3px solid ${TIER_COLORS.preference}">
                            <span class="oh-tier-icon">&#128100;</span>
                            TIER 2: USER PREFERENCES
                            <span class="oh-tier-count" id="ohBrowserPreferenceCount">0</span>
                        </div>
                        <div class="oh-rules-list" id="ohPreferenceRules"></div>
                    </div>

                    <div class="oh-tier-section">
                        <div class="oh-tier-header" style="border-left: 3px solid ${TIER_COLORS.learned}">
                            <span class="oh-tier-icon">&#129302;</span>
                            TIER 3: LEARNED PATTERNS
                            <span class="oh-tier-count" id="ohBrowserLearnedCount">0</span>
                        </div>
                        <div class="oh-rules-list" id="ohLearnedRules"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function loadHierarchyIntoModal() {
        if (!hierarchyData) return;

        // Render canonical rules
        const canonicalContainer = document.getElementById('ohCanonicalRules');
        if (canonicalContainer) {
            canonicalContainer.innerHTML = hierarchyData.canonical.map(rule =>
                renderRuleCard(rule, 'canonical')
            ).join('') || '<div class="oh-empty-state">No canonical rules</div>';
            updateElement('ohBrowserCanonicalCount', hierarchyData.canonical.length);
        }

        // Render preferences
        const preferenceContainer = document.getElementById('ohPreferenceRules');
        if (preferenceContainer) {
            preferenceContainer.innerHTML = hierarchyData.preferences.map(rule =>
                renderRuleCard(rule, 'preference')
            ).join('') || '<div class="oh-empty-state">No preferences set</div>';
            updateElement('ohBrowserPreferenceCount', hierarchyData.preferences.length);
        }

        // Render learned patterns
        const learnedContainer = document.getElementById('ohLearnedRules');
        if (learnedContainer) {
            learnedContainer.innerHTML = hierarchyData.learned.map(rule =>
                renderRuleCard(rule, 'learned')
            ).join('') || '<div class="oh-empty-state">No learned patterns</div>';
            updateElement('ohBrowserLearnedCount', hierarchyData.learned.length);
        }
    }

    function renderRuleCard(rule, tier) {
        const isCanonical = tier === 'canonical';
        const actions = isCanonical ? '' : `
            <div class="oh-rule-actions">
                <button class="oh-btn-small" onclick="OverrideHygieneUI.showExplanation('${rule.key}')">
                    Why?
                </button>
                ${tier === 'preference' ? `
                    <button class="oh-btn-small oh-btn-promote" onclick="OverrideHygieneUI.openPromotionForm('${rule.id}', '${rule.key}')">
                        Request Promotion
                    </button>
                ` : ''}
            </div>
        `;

        const confidenceBadge = rule.confidence !== undefined ?
            `<span class="oh-confidence-badge">${Math.round(rule.confidence * 100)}% confidence</span>` : '';

        const valueDisplay = typeof rule.value === 'object' ?
            JSON.stringify(rule.value) : rule.value;

        return `
            <div class="oh-rule-card" data-tier="${tier}" data-key="${rule.key}">
                <div class="oh-rule-key">${rule.key}</div>
                <div class="oh-rule-value">
                    ${isCanonical ? '<span class="oh-lock-icon">&#128274;</span>' : ''}
                    ${valueDisplay || '(no value)'}
                    ${confidenceBadge}
                </div>
                <div class="oh-rule-source">${rule.source || 'Unknown source'}</div>
                ${actions}
            </div>
        `;
    }

    function filterRules(searchText) {
        const cards = document.querySelectorAll('.oh-rule-card');
        cards.forEach(card => {
            const key = card.dataset.key.toLowerCase();
            const matches = key.includes(searchText.toLowerCase());
            card.style.display = matches ? 'block' : 'none';
        });
    }

    function filterByTier(tier) {
        const sections = document.querySelectorAll('.oh-tier-section');
        sections.forEach(section => {
            if (!tier) {
                section.style.display = 'block';
            } else {
                const sectionTier = section.querySelector('.oh-rules-list').id.toLowerCase().replace('oh', '').replace('rules', '');
                section.style.display = sectionTier.includes(tier) ? 'block' : 'none';
            }
        });
    }

    // =========================================================================
    // RULE EXPLANATION
    // =========================================================================

    async function showExplanation(key) {
        const explanation = await explainRule(key);
        if (!explanation) {
            showError('Could not load explanation');
            return;
        }

        const content = `
            <div class="oh-explanation">
                <div class="oh-explain-header">
                    <h4>${key}</h4>
                    <span class="oh-tier-badge" style="background: ${TIER_COLORS[explanation.effective_tier] || '#666'}">
                        ${TIER_LABELS[explanation.effective_tier] || 'Unknown'}
                    </span>
                </div>

                <div class="oh-explain-section">
                    <div class="oh-explain-label">Effective Value</div>
                    <div class="oh-explain-value">${JSON.stringify(explanation.effective_value)}</div>
                </div>

                <div class="oh-explain-section">
                    <div class="oh-explain-label">Source</div>
                    <div class="oh-explain-value">${explanation.source || 'Unknown'}</div>
                </div>

                <div class="oh-explain-section">
                    <div class="oh-explain-label">Resolution Path</div>
                    <div class="oh-resolution-path">
                        ${explanation.resolution_path.map(step => `
                            <div class="oh-resolution-step ${step.status}">
                                <span class="oh-step-tier" style="color: ${TIER_COLORS[step.tier]}">${step.tier}</span>
                                <span class="oh-step-value">${JSON.stringify(step.value)}</span>
                                <span class="oh-step-status">${step.status}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${explanation.overridden_values.length > 0 ? `
                    <div class="oh-explain-section">
                        <div class="oh-explain-label">Overridden Values</div>
                        <div class="oh-overridden-list">
                            ${explanation.overridden_values.map(ov => `
                                <div class="oh-overridden-item">
                                    <span>${ov.tier}: ${JSON.stringify(ov.value)}</span>
                                    <span class="oh-overridden-by">overridden by ${ov.overridden_by}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="oh-explain-footer">
                    ${explanation.can_be_overridden ?
                        '<span class="oh-can-override">This rule can be overridden by preferences</span>' :
                        '<span class="oh-cannot-override">This rule is immutable (canonical)</span>'
                    }
                </div>
            </div>
        `;

        const modal = createModal('Why This Rule?', content);
        document.body.appendChild(modal);
    }

    // =========================================================================
    // PROMOTION REQUEST FORM
    // =========================================================================

    function openPromotionForm(overrideId, ruleKey) {
        const content = `
            <div class="oh-promotion-form">
                <p>Request promotion of this preference to <strong>Canonical</strong> status.</p>
                <p class="oh-warning">This requires human review and approval.</p>

                <div class="oh-form-group">
                    <label>Rule Key</label>
                    <input type="text" value="${ruleKey}" disabled>
                </div>

                <div class="oh-form-group">
                    <label>Justification *</label>
                    <textarea id="ohPromotionJustification" rows="4"
                              placeholder="Why should this become a canonical rule?"></textarea>
                </div>

                <div class="oh-form-group">
                    <label>Evidence (URLs, references)</label>
                    <textarea id="ohPromotionEvidence" rows="2"
                              placeholder="One per line"></textarea>
                </div>

                <div class="oh-form-actions">
                    <button class="oh-btn oh-btn-secondary" onclick="OverrideHygieneUI.closeModal()">
                        Cancel
                    </button>
                    <button class="oh-btn oh-btn-primary" onclick="OverrideHygieneUI.submitPromotion('${overrideId}')">
                        Submit Request
                    </button>
                </div>
            </div>
        `;

        const modal = createModal('Request Promotion', content);
        document.body.appendChild(modal);
    }

    function submitPromotion(overrideId) {
        const justification = document.getElementById('ohPromotionJustification')?.value;
        const evidenceText = document.getElementById('ohPromotionEvidence')?.value || '';

        if (!justification || justification.trim().length < 10) {
            showError('Please provide a justification (at least 10 characters)');
            return;
        }

        const evidence = evidenceText.split('\n').filter(line => line.trim());

        requestPromotion(overrideId, justification, evidence).then(result => {
            if (result) {
                closeModal();
            }
        });
    }

    // =========================================================================
    // DRIFT SCANNING
    // =========================================================================

    async function runDriftScan() {
        try {
            const response = await fetch('/api/overrides/drifts/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                showDriftResults(result.drifts || []);
                return result;
            }
        } catch (error) {
            console.error('[OverrideHygiene] Drift scan failed:', error);
            showError('Drift scan failed');
        }
        return null;
    }

    function showDriftResults(drifts) {
        const container = document.getElementById('ohDriftList');
        if (!container) {
            // Show in modal if no container
            const content = renderDriftList(drifts);
            const modal = createModal('Drift Detection Results', content);
            document.body.appendChild(modal);
            return;
        }

        container.innerHTML = drifts.length > 0 ?
            renderDriftList(drifts) :
            '<div class="oh-empty-state">No drift detected - system is healthy</div>';
    }

    function renderDriftList(drifts) {
        if (drifts.length === 0) {
            return '<div class="oh-empty-state">No drift detected</div>';
        }

        return drifts.map(drift => `
            <div class="oh-drift-card" style="border-left: 3px solid ${IMPACT_COLORS[drift.impact]}">
                <div class="oh-drift-header">
                    <span class="oh-drift-key">${drift.rule_key}</span>
                    <span class="oh-drift-impact" style="color: ${IMPACT_COLORS[drift.impact]}">
                        ${drift.impact.toUpperCase()}
                    </span>
                </div>
                <div class="oh-drift-detail">
                    Expected: <strong>${drift.expected_tier}</strong>,
                    Actual: <strong>${drift.actual_tier}</strong>
                </div>
                <div class="oh-drift-recommendation">
                    ${drift.recommendation}
                </div>
                <div class="oh-drift-meta">
                    Frequency: ${drift.frequency} | Detected: ${formatDate(drift.detected_at)}
                </div>
            </div>
        `).join('');
    }

    // =========================================================================
    // CANONICAL OVERRIDE BLOCKED ALERT
    // =========================================================================

    function showCanonicalBlockedAlert(key, canonicalValue) {
        const content = `
            <div class="oh-blocked-alert">
                <div class="oh-blocked-icon">&#128274;</div>
                <h4>Cannot Override Canonical Rule</h4>
                <p>The rule <strong>${key}</strong> is a canonical rule and cannot be overridden.</p>
                <div class="oh-blocked-value">
                    <div class="oh-explain-label">Canonical Value</div>
                    <div class="oh-explain-value">${JSON.stringify(canonicalValue)}</div>
                </div>
                <p class="oh-blocked-info">
                    If you believe this rule should be changed, you can request a review
                    through the promotion process.
                </p>
                <div class="oh-form-actions">
                    <button class="oh-btn oh-btn-secondary" onclick="OverrideHygieneUI.closeModal()">
                        Understood
                    </button>
                    <button class="oh-btn oh-btn-primary" onclick="OverrideHygieneUI.requestDirectPromotion('${key}')">
                        Request Change
                    </button>
                </div>
            </div>
        `;

        const modal = createModal('Override Blocked', content);
        document.body.appendChild(modal);
    }

    function requestDirectPromotion(key) {
        closeModal();
        openDirectPromotionForm(key);
    }

    function openDirectPromotionForm(key) {
        const content = `
            <div class="oh-promotion-form">
                <p>Request a change to the canonical rule <strong>${key}</strong>.</p>
                <p class="oh-warning">This requires human review and approval.</p>

                <div class="oh-form-group">
                    <label>Proposed New Value *</label>
                    <input type="text" id="ohDirectPromotionValue" placeholder="Enter proposed value">
                </div>

                <div class="oh-form-group">
                    <label>Justification *</label>
                    <textarea id="ohDirectPromotionJustification" rows="4"
                              placeholder="Why should this canonical rule be changed?"></textarea>
                </div>

                <div class="oh-form-group">
                    <label>Evidence (URLs, references)</label>
                    <textarea id="ohDirectPromotionEvidence" rows="2"
                              placeholder="One per line"></textarea>
                </div>

                <div class="oh-form-actions">
                    <button class="oh-btn oh-btn-secondary" onclick="OverrideHygieneUI.closeModal()">
                        Cancel
                    </button>
                    <button class="oh-btn oh-btn-primary" onclick="OverrideHygieneUI.submitDirectPromotion('${key}')">
                        Submit Request
                    </button>
                </div>
            </div>
        `;

        const modal = createModal('Request Canonical Change', content);
        document.body.appendChild(modal);
    }

    async function submitDirectPromotion(key) {
        const value = document.getElementById('ohDirectPromotionValue')?.value;
        const justification = document.getElementById('ohDirectPromotionJustification')?.value;
        const evidenceText = document.getElementById('ohDirectPromotionEvidence')?.value || '';

        if (!value || !justification || justification.trim().length < 10) {
            showError('Please provide a value and justification');
            return;
        }

        const evidence = evidenceText.split('\n').filter(line => line.trim());

        try {
            const response = await fetch('/api/overrides/promotions/direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: key,
                    value: value,
                    user_id: currentUserId,
                    justification: justification,
                    evidence: evidence
                })
            });

            if (response.ok) {
                showSuccess('Change request submitted for review');
                closeModal();
            } else {
                const error = await response.json();
                showError('Failed to submit request: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            showError('Network error');
        }
    }

    // =========================================================================
    // MODAL UTILITIES
    // =========================================================================

    function createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'oh-modal-overlay';
        modal.innerHTML = `
            <div class="oh-modal">
                <div class="oh-modal-header">
                    <h3>${title}</h3>
                    <button class="oh-modal-close" onclick="OverrideHygieneUI.closeModal()">&times;</button>
                </div>
                <div class="oh-modal-content">
                    ${content}
                </div>
            </div>
        `;

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        return modal;
    }

    function closeModal() {
        const modal = document.querySelector('.oh-modal-overlay');
        if (modal) modal.remove();
    }

    // =========================================================================
    // TOAST NOTIFICATIONS
    // =========================================================================

    function showSuccess(message) {
        showToast(message, 'success');
    }

    function showError(message) {
        showToast(message, 'error');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `oh-toast oh-toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================

    function formatDate(isoString) {
        if (!isoString) return 'Unknown';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return isoString;
        }
    }

    // =========================================================================
    // INJECT STYLES
    // =========================================================================

    function injectStyles() {
        if (document.getElementById('override-hygiene-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'override-hygiene-styles';
        styles.textContent = `
            /* Override Hygiene Dashboard */
            .override-hygiene-dashboard {
                background: var(--bg-card, #1e2130);
                border-radius: 10px;
                padding: 16px;
            }

            .oh-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .oh-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .oh-header-actions {
                display: flex;
                gap: 8px;
            }

            /* Stats Grid */
            .oh-stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 16px;
            }

            .oh-stat-card {
                background: var(--bg-secondary, #1a1d27);
                border-radius: 8px;
                padding: 12px;
                text-align: center;
            }

            .oh-stat-label {
                font-size: 11px;
                color: var(--text-muted, #6b6f82);
                margin-bottom: 4px;
            }

            .oh-stat-value {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 4px;
            }

            .oh-stat-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                color: white;
            }

            /* Buttons */
            .oh-btn {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .oh-btn-primary {
                background: #6366f1;
                color: white;
            }

            .oh-btn-primary:hover {
                background: #818cf8;
            }

            .oh-btn-secondary {
                background: var(--bg-hover, #252839);
                color: var(--text-primary, #f0f0f5);
            }

            .oh-btn-secondary:hover {
                background: var(--border, #2a2d3e);
            }

            .oh-btn-small {
                padding: 4px 8px;
                font-size: 11px;
                border-radius: 4px;
                background: var(--bg-hover, #252839);
                color: var(--text-secondary, #a0a4b8);
                border: none;
                cursor: pointer;
            }

            .oh-btn-small:hover {
                background: var(--border, #2a2d3e);
            }

            .oh-btn-promote {
                background: ${TIER_COLORS.canonical}22;
                color: ${TIER_COLORS.canonical};
            }

            /* Drift Section */
            .oh-drift-section {
                background: var(--bg-secondary, #1a1d27);
                border-radius: 8px;
                padding: 12px;
            }

            .oh-drift-section h4 {
                margin: 0 0 12px 0;
                font-size: 13px;
                font-weight: 600;
            }

            .oh-drift-card {
                background: var(--bg-card, #1e2130);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 8px;
            }

            .oh-drift-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .oh-drift-key {
                font-weight: 600;
                font-size: 13px;
            }

            .oh-drift-impact {
                font-weight: 700;
                font-size: 11px;
            }

            .oh-drift-detail {
                font-size: 12px;
                color: var(--text-secondary, #a0a4b8);
                margin-bottom: 4px;
            }

            .oh-drift-recommendation {
                font-size: 12px;
                color: var(--text-muted, #6b6f82);
                font-style: italic;
            }

            .oh-drift-meta {
                font-size: 10px;
                color: var(--text-muted, #6b6f82);
                margin-top: 8px;
            }

            /* Modal */
            .oh-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .oh-modal {
                background: var(--bg-card, #1e2130);
                border-radius: 12px;
                width: 90%;
                max-width: 700px;
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .oh-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border, #2a2d3e);
            }

            .oh-modal-header h3 {
                margin: 0;
                font-size: 18px;
            }

            .oh-modal-close {
                background: none;
                border: none;
                color: var(--text-secondary, #a0a4b8);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }

            .oh-modal-content {
                padding: 20px;
                overflow-y: auto;
            }

            /* Rule Browser */
            .oh-rule-browser {
                min-height: 400px;
            }

            .oh-browser-controls {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
            }

            .oh-search-input {
                flex: 1;
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid var(--border, #2a2d3e);
                background: var(--bg-secondary, #1a1d27);
                color: var(--text-primary, #f0f0f5);
                font-size: 13px;
            }

            .oh-browser-controls select {
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid var(--border, #2a2d3e);
                background: var(--bg-secondary, #1a1d27);
                color: var(--text-primary, #f0f0f5);
                font-size: 13px;
            }

            .oh-tier-section {
                margin-bottom: 16px;
            }

            .oh-tier-header {
                padding: 8px 12px;
                background: var(--bg-secondary, #1a1d27);
                border-radius: 6px;
                font-weight: 600;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .oh-tier-icon {
                font-size: 14px;
            }

            .oh-tier-count {
                margin-left: auto;
                background: var(--bg-card, #1e2130);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
            }

            .oh-rules-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .oh-rule-card {
                background: var(--bg-secondary, #1a1d27);
                border-radius: 6px;
                padding: 12px;
            }

            .oh-rule-key {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 4px;
            }

            .oh-rule-value {
                font-size: 13px;
                color: var(--text-secondary, #a0a4b8);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .oh-lock-icon {
                color: ${TIER_COLORS.canonical};
            }

            .oh-rule-source {
                font-size: 11px;
                color: var(--text-muted, #6b6f82);
                margin-top: 4px;
            }

            .oh-rule-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }

            .oh-confidence-badge {
                background: ${TIER_COLORS.learned}22;
                color: ${TIER_COLORS.learned};
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
            }

            /* Explanation */
            .oh-explanation {
                color: var(--text-primary, #f0f0f5);
            }

            .oh-explain-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .oh-explain-header h4 {
                margin: 0;
                font-size: 16px;
            }

            .oh-tier-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                color: white;
            }

            .oh-explain-section {
                margin-bottom: 16px;
            }

            .oh-explain-label {
                font-size: 11px;
                color: var(--text-muted, #6b6f82);
                text-transform: uppercase;
                margin-bottom: 4px;
            }

            .oh-explain-value {
                font-size: 14px;
                background: var(--bg-secondary, #1a1d27);
                padding: 8px 12px;
                border-radius: 6px;
            }

            .oh-resolution-path {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .oh-resolution-step {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                background: var(--bg-secondary, #1a1d27);
                border-radius: 6px;
            }

            .oh-resolution-step.applied {
                border-left: 3px solid #22c55e;
            }

            .oh-resolution-step.overridden {
                opacity: 0.5;
                text-decoration: line-through;
            }

            .oh-step-tier {
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
            }

            .oh-step-value {
                flex: 1;
            }

            .oh-step-status {
                font-size: 11px;
                color: var(--text-muted, #6b6f82);
            }

            .oh-explain-footer {
                padding-top: 12px;
                border-top: 1px solid var(--border, #2a2d3e);
            }

            .oh-can-override {
                color: ${TIER_COLORS.preference};
            }

            .oh-cannot-override {
                color: ${TIER_COLORS.canonical};
            }

            /* Forms */
            .oh-form-group {
                margin-bottom: 16px;
            }

            .oh-form-group label {
                display: block;
                font-size: 12px;
                color: var(--text-secondary, #a0a4b8);
                margin-bottom: 4px;
            }

            .oh-form-group input,
            .oh-form-group textarea {
                width: 100%;
                padding: 10px 12px;
                border-radius: 6px;
                border: 1px solid var(--border, #2a2d3e);
                background: var(--bg-secondary, #1a1d27);
                color: var(--text-primary, #f0f0f5);
                font-size: 13px;
            }

            .oh-form-group input:disabled {
                opacity: 0.6;
            }

            .oh-form-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 20px;
            }

            .oh-warning {
                color: ${TIER_COLORS.preference};
                font-size: 13px;
                margin: 8px 0;
            }

            /* Blocked Alert */
            .oh-blocked-alert {
                text-align: center;
            }

            .oh-blocked-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }

            .oh-blocked-alert h4 {
                color: ${TIER_COLORS.canonical};
                margin-bottom: 12px;
            }

            .oh-blocked-value {
                background: var(--bg-secondary, #1a1d27);
                border-radius: 8px;
                padding: 12px;
                margin: 16px 0;
                text-align: left;
            }

            .oh-blocked-info {
                font-size: 13px;
                color: var(--text-secondary, #a0a4b8);
            }

            /* Toast */
            .oh-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10001;
                opacity: 0;
                transition: all 0.3s ease;
            }

            .oh-toast-success {
                background: #22c55e;
                color: white;
            }

            .oh-toast-error {
                background: #ef4444;
                color: white;
            }

            .oh-toast-info {
                background: #3b82f6;
                color: white;
            }

            /* Empty State */
            .oh-empty-state {
                text-align: center;
                padding: 20px;
                color: var(--text-muted, #6b6f82);
                font-size: 13px;
            }

            /* Responsive */
            @media (max-width: 600px) {
                .oh-stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .oh-modal {
                    width: 95%;
                    max-height: 90vh;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // Inject styles on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
        injectStyles();
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        init,
        destroy,
        loadHierarchy,
        loadStats,
        loadDrifts,
        setPreference,
        requestPromotion,
        reviewPromotion,
        explainRule,
        openRuleBrowser,
        runDriftScan,
        showExplanation,
        openPromotionForm,
        submitPromotion,
        closeModal,
        filterRules,
        filterByTier,
        requestDirectPromotion
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverrideHygieneUI;
}
