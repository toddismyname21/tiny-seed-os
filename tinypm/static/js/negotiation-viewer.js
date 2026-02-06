/**
 * TinyPM Negotiation Viewer
 * =========================
 * Real-time visualization of agent-to-agent negotiations.
 *
 * Features:
 * - Thread timeline view showing proposal/bid flow
 * - Consensus highlighting with audit hash display
 * - Live WebSocket updates
 * - Audit trail with full message history
 * - Cost/complexity visualization
 *
 * Based on:
 * - Google A2A Protocol visualization patterns
 * - TinyPM Design System (Wizard/Mad Scientist theme)
 *
 * Usage:
 *     <div id="negotiation-viewer"></div>
 *     <script>
 *         const viewer = new NegotiationViewer('#negotiation-viewer');
 *         viewer.connect('ws://localhost:8000/ws/negotiations');
 *     </script>
 *
 * Created: 2026-02-04
 * Team: Multi-Agent Architecture
 */

class NegotiationViewer {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    static CONFIG = {
        colors: {
            architect: '#A855F7',      // Purple for Architects (UX)
            alchemist: '#34D399',      // Emerald for Alchemists (Backend)
            governor: '#F59E0B',       // Gold for Governor (PM)
            consensus: '#22C55E',      // Green for consensus
            escalation: '#EF4444',     // Red for escalation
            reject: '#6B7280',         // Gray for rejection
            background: '#1A1A2E',
            card: '#252540',
            text: '#F8FAFC',
            textMuted: '#94A3B8'
        },
        costColors: {
            low: '#22C55E',
            medium: '#FBBF24',
            high: '#F97316',
            prohibitive: '#EF4444'
        },
        animationDuration: 300,
        pollInterval: 5000  // If not using WebSocket
    };

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================
    constructor(selector, options = {}) {
        this.container = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;

        if (!this.container) {
            throw new Error(`NegotiationViewer: Container not found: ${selector}`);
        }

        this.options = { ...NegotiationViewer.CONFIG, ...options };
        this.negotiations = new Map();  // thread_id -> negotiation data
        this.selectedThread = null;
        this.ws = null;
        this.isConnected = false;

        this._init();
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    _init() {
        this._injectStyles();
        this._render();
        this._bindEvents();
        console.log('[NegotiationViewer] Initialized');
    }

    _render() {
        this.container.innerHTML = `
            <div class="negotiation-viewer">
                <div class="nv-header">
                    <div class="nv-title">
                        <span class="nv-icon"></span>
                        <h2>Agent Negotiations</h2>
                    </div>
                    <div class="nv-status">
                        <span class="connection-indicator ${this.isConnected ? 'connected' : ''}"></span>
                        <span class="status-text">${this.isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>

                <div class="nv-content">
                    <div class="nv-sidebar">
                        <div class="nv-channels-header">
                            <span>Active Channels</span>
                            <button class="nv-refresh-btn" title="Refresh">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                                </svg>
                            </button>
                        </div>
                        <div class="nv-channels-list"></div>
                        <div class="nv-stats"></div>
                    </div>

                    <div class="nv-main">
                        <div class="nv-empty-state">
                            <div class="empty-icon"></div>
                            <p>Select a negotiation channel to view details</p>
                        </div>
                        <div class="nv-thread-view" style="display: none;">
                            <div class="nv-thread-header"></div>
                            <div class="nv-timeline"></div>
                            <div class="nv-consensus-panel"></div>
                        </div>
                    </div>

                    <div class="nv-detail-panel">
                        <div class="nv-detail-header">
                            <span>Message Details</span>
                            <button class="nv-close-detail">&times;</button>
                        </div>
                        <div class="nv-detail-content"></div>
                    </div>
                </div>
            </div>
        `;
    }

    _bindEvents() {
        // Refresh button
        const refreshBtn = this.container.querySelector('.nv-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Close detail panel
        const closeDetail = this.container.querySelector('.nv-close-detail');
        if (closeDetail) {
            closeDetail.addEventListener('click', () => this._hideDetailPanel());
        }

        // Channel selection (delegated)
        const channelsList = this.container.querySelector('.nv-channels-list');
        if (channelsList) {
            channelsList.addEventListener('click', (e) => {
                const channel = e.target.closest('.nv-channel-item');
                if (channel) {
                    const threadId = channel.dataset.threadId;
                    this.selectThread(threadId);
                }
            });
        }

        // Message selection (delegated)
        const timeline = this.container.querySelector('.nv-timeline');
        if (timeline) {
            timeline.addEventListener('click', (e) => {
                const message = e.target.closest('.nv-message');
                if (message) {
                    const msgId = message.dataset.messageId;
                    this._showMessageDetail(msgId);
                }
            });
        }
    }

    // =========================================================================
    // WEBSOCKET CONNECTION
    // =========================================================================
    connect(wsUrl) {
        if (this.ws) {
            this.ws.close();
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                this._updateConnectionStatus(true);
                console.log('[NegotiationViewer] WebSocket connected');
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this._updateConnectionStatus(false);
                console.log('[NegotiationViewer] WebSocket disconnected');

                // Attempt reconnect after 5 seconds
                setTimeout(() => this.connect(wsUrl), 5000);
            };

            this.ws.onerror = (error) => {
                console.error('[NegotiationViewer] WebSocket error:', error);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._handleWebSocketMessage(data);
                } catch (e) {
                    console.error('[NegotiationViewer] Failed to parse message:', e);
                }
            };
        } catch (e) {
            console.error('[NegotiationViewer] Failed to connect:', e);
        }
    }

    _handleWebSocketMessage(data) {
        const { type, payload } = data;

        switch (type) {
            case 'negotiations':
                this._updateNegotiations(payload);
                break;
            case 'message':
                this._handleNewMessage(payload);
                break;
            case 'consensus':
                this._handleConsensus(payload);
                break;
            case 'escalation':
                this._handleEscalation(payload);
                break;
            case 'statistics':
                this._updateStatistics(payload);
                break;
            default:
                console.log('[NegotiationViewer] Unknown message type:', type);
        }
    }

    _updateConnectionStatus(connected) {
        const indicator = this.container.querySelector('.connection-indicator');
        const text = this.container.querySelector('.status-text');

        if (indicator) {
            indicator.classList.toggle('connected', connected);
        }
        if (text) {
            text.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    // =========================================================================
    // DATA MANAGEMENT
    // =========================================================================
    _updateNegotiations(data) {
        if (data.channels) {
            Object.entries(data.channels).forEach(([threadId, channel]) => {
                this.negotiations.set(threadId, channel);
            });
        }

        this._renderChannelsList();

        if (data.statistics) {
            this._updateStatistics(data.statistics);
        }

        // Refresh current view if a thread is selected
        if (this.selectedThread) {
            const negotiation = this.negotiations.get(this.selectedThread);
            if (negotiation) {
                this._renderThreadView(negotiation);
            }
        }
    }

    _handleNewMessage(message) {
        const threadId = message.thread_id;
        const negotiation = this.negotiations.get(threadId);

        if (negotiation) {
            if (!negotiation.messages) {
                negotiation.messages = [];
            }
            negotiation.messages.push(message);
            negotiation.current_round = message.round_number;

            // Re-render if this is the selected thread
            if (this.selectedThread === threadId) {
                this._renderThreadView(negotiation);
                this._scrollToLatestMessage();
            }

            // Update channel status in sidebar
            this._updateChannelItem(threadId, negotiation);

            // Show notification
            this._showNotification(`New ${message.type} from ${message.sender_role}`, 'info');
        }
    }

    _handleConsensus(consensus) {
        const threadId = consensus.thread_id;
        const negotiation = this.negotiations.get(threadId);

        if (negotiation) {
            negotiation.consensus = consensus;
            negotiation.status = 'consensus_reached';

            if (this.selectedThread === threadId) {
                this._renderThreadView(negotiation);
                this._renderConsensusPanel(consensus);
            }

            this._updateChannelItem(threadId, negotiation);
            this._showNotification('Consensus Reached!', 'success');
        }
    }

    _handleEscalation(message) {
        const threadId = message.thread_id;
        const negotiation = this.negotiations.get(threadId);

        if (negotiation) {
            negotiation.status = 'escalated';

            if (this.selectedThread === threadId) {
                this._renderThreadView(negotiation);
            }

            this._updateChannelItem(threadId, negotiation);
            this._showNotification('Negotiation Escalated to Governor', 'warning');
        }
    }

    // =========================================================================
    // RENDERING
    // =========================================================================
    _renderChannelsList() {
        const list = this.container.querySelector('.nv-channels-list');
        if (!list) return;

        const channels = Array.from(this.negotiations.values())
            .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

        list.innerHTML = channels.length === 0
            ? '<div class="nv-no-channels">No active negotiations</div>'
            : channels.map(channel => this._renderChannelItem(channel)).join('');
    }

    _renderChannelItem(channel) {
        const statusClass = this._getStatusClass(channel.status);
        const isSelected = this.selectedThread === channel.thread_id;

        return `
            <div class="nv-channel-item ${statusClass} ${isSelected ? 'selected' : ''}"
                 data-thread-id="${channel.thread_id}">
                <div class="channel-participants">
                    <span class="participant architect" title="Architect">
                        ${this._escapeHtml(channel.architect?.name || 'Architect')}
                    </span>
                    <span class="vs">vs</span>
                    <span class="participant alchemist" title="Alchemist">
                        ${this._escapeHtml(channel.alchemist?.name || 'Alchemist')}
                    </span>
                </div>
                <div class="channel-meta">
                    <span class="channel-status">${this._formatStatus(channel.status)}</span>
                    <span class="channel-round">Round ${channel.current_round || 0}</span>
                </div>
                <div class="channel-progress">
                    <div class="progress-bar" style="width: ${(channel.current_round || 0) * 20}%"></div>
                </div>
            </div>
        `;
    }

    _updateChannelItem(threadId, channel) {
        const item = this.container.querySelector(`.nv-channel-item[data-thread-id="${threadId}"]`);
        if (item) {
            const newItem = document.createElement('div');
            newItem.innerHTML = this._renderChannelItem(channel);
            item.replaceWith(newItem.firstElementChild);
        } else {
            this._renderChannelsList();
        }
    }

    selectThread(threadId) {
        this.selectedThread = threadId;
        const negotiation = this.negotiations.get(threadId);

        // Update sidebar selection
        this.container.querySelectorAll('.nv-channel-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.threadId === threadId);
        });

        // Show thread view
        const emptyState = this.container.querySelector('.nv-empty-state');
        const threadView = this.container.querySelector('.nv-thread-view');

        if (emptyState) emptyState.style.display = 'none';
        if (threadView) threadView.style.display = 'flex';

        if (negotiation) {
            this._renderThreadView(negotiation);
        }
    }

    _renderThreadView(negotiation) {
        this._renderThreadHeader(negotiation);
        this._renderTimeline(negotiation);

        if (negotiation.consensus) {
            this._renderConsensusPanel(negotiation.consensus);
        }
    }

    _renderThreadHeader(negotiation) {
        const header = this.container.querySelector('.nv-thread-header');
        if (!header) return;

        const duration = negotiation.elapsed_seconds || 0;

        header.innerHTML = `
            <div class="thread-title">
                <span class="thread-id">#${negotiation.thread_id.substring(0, 8)}</span>
                <span class="thread-status ${this._getStatusClass(negotiation.status)}">
                    ${this._formatStatus(negotiation.status)}
                </span>
            </div>
            <div class="thread-meta">
                <div class="meta-item">
                    <span class="meta-label">Architect</span>
                    <span class="meta-value architect">${this._escapeHtml(negotiation.architect?.name || 'Unknown')}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Alchemist</span>
                    <span class="meta-value alchemist">${this._escapeHtml(negotiation.alchemist?.name || 'Unknown')}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Round</span>
                    <span class="meta-value">${negotiation.current_round || 0} / 5</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Duration</span>
                    <span class="meta-value">${this._formatDuration(duration)}</span>
                </div>
            </div>
        `;
    }

    _renderTimeline(negotiation) {
        const timeline = this.container.querySelector('.nv-timeline');
        if (!timeline) return;

        const messages = negotiation.messages || [];

        timeline.innerHTML = messages.length === 0
            ? '<div class="nv-no-messages">No messages yet</div>'
            : messages.map((msg, idx) => this._renderMessage(msg, idx, messages.length)).join('');
    }

    _renderMessage(message, index, total) {
        const roleClass = message.sender_role || 'unknown';
        const typeClass = message.type || 'unknown';
        const isLast = index === total - 1;

        return `
            <div class="nv-message ${roleClass} ${typeClass} ${isLast ? 'latest' : ''}"
                 data-message-id="${message.message_id}">
                <div class="message-connector">
                    <div class="connector-line ${index === 0 ? 'first' : ''}"></div>
                    <div class="connector-dot ${roleClass}"></div>
                    <div class="connector-line ${isLast ? 'last' : ''}"></div>
                </div>
                <div class="message-card">
                    <div class="message-header">
                        <span class="message-role">${this._formatRole(message.sender_role)}</span>
                        <span class="message-type ${typeClass}">${this._formatType(message.type)}</span>
                        <span class="message-round">R${message.round_number || 0}</span>
                    </div>
                    <div class="message-content">
                        ${this._renderMessageContent(message)}
                    </div>
                    <div class="message-footer">
                        <span class="message-time">${this._formatTime(message.timestamp)}</span>
                        ${message.references_message_id
                            ? `<span class="message-ref">Re: ${message.references_message_id.substring(0, 8)}</span>`
                            : ''}
                    </div>
                </div>
            </div>
        `;
    }

    _renderMessageContent(message) {
        const content = message.content || {};

        if (message.type === 'propose' || message.type === 'counter') {
            const proposal = message.proposal || {};
            return `
                <div class="proposal-summary">
                    <p class="proposal-description">${this._escapeHtml(proposal.description || content.summary || 'No description')}</p>
                    ${proposal.ui_components?.length ? `
                        <div class="proposal-components">
                            ${proposal.ui_components.map(c => `
                                <span class="component-tag">${this._escapeHtml(c.type)}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${proposal.priority ? `
                        <div class="proposal-priority">
                            <span class="priority-label">Priority:</span>
                            <span class="priority-value">${proposal.priority}/10</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        if (message.type === 'bid') {
            const bid = message.bid || {};
            return `
                <div class="bid-summary">
                    <div class="bid-metrics">
                        <div class="metric">
                            <span class="metric-label">Cost</span>
                            <span class="metric-value cost-${bid.technical_cost || 'unknown'}">
                                ${(bid.technical_cost || 'unknown').toUpperCase()}
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Latency</span>
                            <span class="metric-value">${bid.latency_impact_ms || 0}ms</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Complexity</span>
                            <span class="metric-value">${bid.complexity_score || 0}/10</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Feasibility</span>
                            <span class="metric-value">${Math.round((bid.feasibility_score || 0) * 100)}%</span>
                        </div>
                    </div>
                    ${bid.justification ? `
                        <p class="bid-justification">${this._escapeHtml(bid.justification)}</p>
                    ` : ''}
                    ${bid.counter_proposal ? `
                        <div class="bid-counter-indicator">
                            <span>Includes counter-proposal</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        if (message.type === 'accept') {
            return `
                <div class="accept-summary">
                    <span class="accept-icon"></span>
                    <span>Accepted proposal</span>
                </div>
            `;
        }

        if (message.type === 'reject') {
            return `
                <div class="reject-summary">
                    <span class="reject-icon"></span>
                    <span>Rejected: ${this._escapeHtml(content.reason || 'No reason provided')}</span>
                </div>
            `;
        }

        if (message.type === 'escalate') {
            return `
                <div class="escalate-summary">
                    <span class="escalate-icon"></span>
                    <span>Escalated to Governor</span>
                    <p class="escalate-reason">${this._escapeHtml(content.reason || 'Unable to reach consensus')}</p>
                </div>
            `;
        }

        return `<pre>${JSON.stringify(content, null, 2)}</pre>`;
    }

    _renderConsensusPanel(consensus) {
        const panel = this.container.querySelector('.nv-consensus-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="consensus-card">
                <div class="consensus-header">
                    <span class="consensus-icon"></span>
                    <h3>Consensus Reached</h3>
                </div>
                <div class="consensus-content">
                    <div class="consensus-stat">
                        <span class="stat-label">Total Rounds</span>
                        <span class="stat-value">${consensus.total_rounds || 0}</span>
                    </div>
                    <div class="consensus-stat">
                        <span class="stat-label">Duration</span>
                        <span class="stat-value">${this._formatDuration(consensus.negotiation_duration_seconds || 0)}</span>
                    </div>
                    <div class="consensus-stat">
                        <span class="stat-label">Concessions</span>
                        <span class="stat-value">${consensus.concessions?.length || 0}</span>
                    </div>
                    <div class="consensus-stat">
                        <span class="stat-label">Validated</span>
                        <span class="stat-value ${consensus.seed_vault_validated ? 'validated' : 'not-validated'}">
                            ${consensus.seed_vault_validated ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
                <div class="consensus-agreement">
                    <h4>Final Agreement</h4>
                    <p>${this._escapeHtml(consensus.final_agreement?.description || 'No description')}</p>
                </div>
                <div class="consensus-audit">
                    <span class="audit-label">Audit Hash:</span>
                    <code class="audit-hash">${consensus.audit_hash || 'N/A'}</code>
                </div>
            </div>
        `;
    }

    _updateStatistics(stats) {
        const statsPanel = this.container.querySelector('.nv-stats');
        if (!statsPanel) return;

        statsPanel.innerHTML = `
            <div class="stats-header">Statistics</div>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${stats.total || 0}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.active || 0}</span>
                    <span class="stat-label">Active</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value success">${stats.consensus_reached || 0}</span>
                    <span class="stat-label">Consensus</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value warning">${stats.escalated || 0}</span>
                    <span class="stat-label">Escalated</span>
                </div>
            </div>
            ${stats.consensus_rate !== undefined ? `
                <div class="stats-rate">
                    <span class="rate-label">Consensus Rate</span>
                    <div class="rate-bar">
                        <div class="rate-fill" style="width: ${stats.consensus_rate}%"></div>
                    </div>
                    <span class="rate-value">${stats.consensus_rate}%</span>
                </div>
            ` : ''}
        `;
    }

    // =========================================================================
    // DETAIL PANEL
    // =========================================================================
    _showMessageDetail(messageId) {
        const negotiation = this.negotiations.get(this.selectedThread);
        if (!negotiation) return;

        const message = (negotiation.messages || []).find(m => m.message_id === messageId);
        if (!message) return;

        const panel = this.container.querySelector('.nv-detail-panel');
        const content = this.container.querySelector('.nv-detail-content');

        if (content) {
            content.innerHTML = `
                <div class="detail-section">
                    <h4>Message ID</h4>
                    <code>${message.message_id}</code>
                </div>
                <div class="detail-section">
                    <h4>Type</h4>
                    <span class="detail-type ${message.type}">${this._formatType(message.type)}</span>
                </div>
                <div class="detail-section">
                    <h4>Sender</h4>
                    <span class="detail-sender ${message.sender_role}">
                        ${this._formatRole(message.sender_role)}: ${message.sender}
                    </span>
                </div>
                <div class="detail-section">
                    <h4>Timestamp</h4>
                    <span>${new Date(message.timestamp).toLocaleString()}</span>
                </div>
                ${message.proposal ? `
                    <div class="detail-section">
                        <h4>Proposal</h4>
                        <pre>${JSON.stringify(message.proposal, null, 2)}</pre>
                    </div>
                ` : ''}
                ${message.bid ? `
                    <div class="detail-section">
                        <h4>Bid</h4>
                        <pre>${JSON.stringify(message.bid, null, 2)}</pre>
                    </div>
                ` : ''}
                ${message.seed_vault_rules_cited?.length ? `
                    <div class="detail-section">
                        <h4>Seed Vault Rules Cited</h4>
                        <ul>
                            ${message.seed_vault_rules_cited.map(r => `<li>${this._escapeHtml(r)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        }

        if (panel) {
            panel.classList.add('visible');
        }
    }

    _hideDetailPanel() {
        const panel = this.container.querySelector('.nv-detail-panel');
        if (panel) {
            panel.classList.remove('visible');
        }
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================
    refresh() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'refresh' }));
        }
    }

    addNegotiation(negotiation) {
        this.negotiations.set(negotiation.thread_id, negotiation);
        this._renderChannelsList();
    }

    _scrollToLatestMessage() {
        const timeline = this.container.querySelector('.nv-timeline');
        if (timeline) {
            timeline.scrollTop = timeline.scrollHeight;
        }
    }

    _showNotification(message, type = 'info') {
        console.log(`[NegotiationViewer] ${type.toUpperCase()}: ${message}`);
        // Could add toast notification here
    }

    _formatStatus(status) {
        const statusMap = {
            open: 'Open',
            awaiting_bid: 'Awaiting Bid',
            awaiting_response: 'Awaiting Response',
            consensus_reached: 'Consensus',
            escalated: 'Escalated',
            rejected: 'Rejected',
            timed_out: 'Timed Out',
            closed: 'Closed'
        };
        return statusMap[status] || status || 'Unknown';
    }

    _getStatusClass(status) {
        const classMap = {
            open: 'status-active',
            awaiting_bid: 'status-active',
            awaiting_response: 'status-active',
            consensus_reached: 'status-success',
            escalated: 'status-warning',
            rejected: 'status-error',
            timed_out: 'status-error',
            closed: 'status-closed'
        };
        return classMap[status] || '';
    }

    _formatRole(role) {
        const roleMap = {
            architect: 'Architect',
            alchemist: 'Alchemist',
            governor: 'Governor'
        };
        return roleMap[role] || role || 'Unknown';
    }

    _formatType(type) {
        const typeMap = {
            propose: 'Proposal',
            bid: 'Bid',
            counter: 'Counter',
            accept: 'Accept',
            reject: 'Reject',
            escalate: 'Escalate',
            clarify: 'Clarify'
        };
        return typeMap[type] || type || 'Unknown';
    }

    _formatDuration(seconds) {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    }

    _formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // =========================================================================
    // STYLES
    // =========================================================================
    _injectStyles() {
        if (document.getElementById('negotiation-viewer-styles')) return;

        const { colors, costColors } = this.options;

        const styles = document.createElement('style');
        styles.id = 'negotiation-viewer-styles';
        styles.textContent = `
            /* Container */
            .negotiation-viewer {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 500px;
                background: ${colors.background};
                border-radius: 12px;
                overflow: hidden;
                font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                color: ${colors.text};
            }

            /* Header */
            .nv-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: ${colors.card};
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .nv-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .nv-title h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .nv-icon::after {
                content: '';
                display: block;
                width: 24px;
                height: 24px;
                background: linear-gradient(135deg, ${colors.architect}, ${colors.alchemist});
                border-radius: 6px;
            }

            .nv-status {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: ${colors.textMuted};
            }

            .connection-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #6B7280;
            }

            .connection-indicator.connected {
                background: ${colors.consensus};
                box-shadow: 0 0 8px ${colors.consensus};
            }

            /* Content Layout */
            .nv-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            /* Sidebar */
            .nv-sidebar {
                width: 280px;
                background: ${colors.card};
                border-right: 1px solid rgba(255,255,255,0.1);
                display: flex;
                flex-direction: column;
            }

            .nv-channels-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: ${colors.textMuted};
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .nv-refresh-btn {
                background: none;
                border: none;
                color: ${colors.textMuted};
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .nv-refresh-btn:hover {
                background: rgba(255,255,255,0.1);
                color: ${colors.text};
            }

            .nv-channels-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }

            .nv-no-channels {
                padding: 20px;
                text-align: center;
                color: ${colors.textMuted};
                font-size: 13px;
            }

            /* Channel Item */
            .nv-channel-item {
                padding: 12px;
                margin-bottom: 8px;
                background: rgba(255,255,255,0.03);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }

            .nv-channel-item:hover {
                background: rgba(255,255,255,0.06);
            }

            .nv-channel-item.selected {
                background: rgba(99, 102, 241, 0.15);
                border-color: rgba(99, 102, 241, 0.3);
            }

            .channel-participants {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .participant {
                font-size: 12px;
                font-weight: 500;
            }

            .participant.architect { color: ${colors.architect}; }
            .participant.alchemist { color: ${colors.alchemist}; }

            .vs {
                color: ${colors.textMuted};
                font-size: 10px;
            }

            .channel-meta {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: ${colors.textMuted};
                margin-bottom: 6px;
            }

            .channel-status { text-transform: capitalize; }

            .channel-progress {
                height: 3px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                overflow: hidden;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, ${colors.architect}, ${colors.alchemist});
                border-radius: 2px;
                transition: width 0.3s ease;
            }

            .status-active .channel-status { color: ${colors.architect}; }
            .status-success .channel-status { color: ${colors.consensus}; }
            .status-warning .channel-status { color: ${colors.governor}; }
            .status-error .channel-status { color: ${colors.escalation}; }

            /* Stats Panel */
            .nv-stats {
                padding: 16px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .stats-header {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: ${colors.textMuted};
                margin-bottom: 12px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }

            .stat-item {
                text-align: center;
            }

            .stat-item .stat-value {
                display: block;
                font-size: 20px;
                font-weight: 600;
                color: ${colors.text};
            }

            .stat-item .stat-value.success { color: ${colors.consensus}; }
            .stat-item .stat-value.warning { color: ${colors.governor}; }

            .stat-item .stat-label {
                font-size: 10px;
                color: ${colors.textMuted};
                text-transform: uppercase;
            }

            .stats-rate {
                margin-top: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .rate-label {
                font-size: 11px;
                color: ${colors.textMuted};
            }

            .rate-bar {
                flex: 1;
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .rate-fill {
                height: 100%;
                background: ${colors.consensus};
                border-radius: 3px;
            }

            .rate-value {
                font-size: 12px;
                font-weight: 600;
                color: ${colors.consensus};
            }

            /* Main Panel */
            .nv-main {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .nv-empty-state {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: ${colors.textMuted};
            }

            .empty-icon::after {
                content: '';
                display: block;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(52,211,153,0.2));
                border-radius: 50%;
                margin-bottom: 16px;
            }

            .nv-thread-view {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            /* Thread Header */
            .nv-thread-header {
                padding: 16px 20px;
                background: rgba(255,255,255,0.02);
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .thread-title {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            .thread-id {
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                color: ${colors.textMuted};
            }

            .thread-status {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .thread-status.status-success {
                background: rgba(34,197,94,0.15);
                color: ${colors.consensus};
            }

            .thread-status.status-active {
                background: rgba(168,85,247,0.15);
                color: ${colors.architect};
            }

            .thread-status.status-warning {
                background: rgba(245,158,11,0.15);
                color: ${colors.governor};
            }

            .thread-status.status-error {
                background: rgba(239,68,68,0.15);
                color: ${colors.escalation};
            }

            .thread-meta {
                display: flex;
                gap: 24px;
            }

            .meta-item {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .meta-label {
                font-size: 10px;
                color: ${colors.textMuted};
                text-transform: uppercase;
            }

            .meta-value {
                font-size: 13px;
                font-weight: 500;
            }

            .meta-value.architect { color: ${colors.architect}; }
            .meta-value.alchemist { color: ${colors.alchemist}; }

            /* Timeline */
            .nv-timeline {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            .nv-no-messages {
                text-align: center;
                color: ${colors.textMuted};
                padding: 40px;
            }

            /* Message */
            .nv-message {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
            }

            .message-connector {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 24px;
            }

            .connector-line {
                flex: 1;
                width: 2px;
                background: rgba(255,255,255,0.1);
            }

            .connector-line.first { visibility: hidden; }
            .connector-line.last { visibility: hidden; }

            .connector-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${colors.textMuted};
                flex-shrink: 0;
            }

            .connector-dot.architect { background: ${colors.architect}; }
            .connector-dot.alchemist { background: ${colors.alchemist}; }
            .connector-dot.governor { background: ${colors.governor}; }

            .message-card {
                flex: 1;
                background: ${colors.card};
                border-radius: 10px;
                padding: 14px 16px;
                border: 1px solid rgba(255,255,255,0.05);
                transition: all 0.2s;
            }

            .nv-message.latest .message-card {
                border-color: rgba(99,102,241,0.3);
            }

            .message-card:hover {
                border-color: rgba(255,255,255,0.1);
            }

            .message-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .message-role {
                font-size: 12px;
                font-weight: 600;
            }

            .nv-message.architect .message-role { color: ${colors.architect}; }
            .nv-message.alchemist .message-role { color: ${colors.alchemist}; }
            .nv-message.governor .message-role { color: ${colors.governor}; }

            .message-type {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .message-type.propose { background: rgba(168,85,247,0.2); color: ${colors.architect}; }
            .message-type.bid { background: rgba(52,211,153,0.2); color: ${colors.alchemist}; }
            .message-type.counter { background: rgba(245,158,11,0.2); color: ${colors.governor}; }
            .message-type.accept { background: rgba(34,197,94,0.2); color: ${colors.consensus}; }
            .message-type.reject { background: rgba(239,68,68,0.2); color: ${colors.escalation}; }
            .message-type.escalate { background: rgba(239,68,68,0.2); color: ${colors.escalation}; }

            .message-round {
                font-size: 11px;
                color: ${colors.textMuted};
                margin-left: auto;
            }

            .message-content {
                font-size: 13px;
                line-height: 1.5;
            }

            .message-footer {
                display: flex;
                gap: 12px;
                margin-top: 10px;
                font-size: 11px;
                color: ${colors.textMuted};
            }

            /* Proposal Summary */
            .proposal-description {
                margin: 0 0 10px;
                color: ${colors.text};
            }

            .proposal-components {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-bottom: 8px;
            }

            .component-tag {
                padding: 2px 8px;
                background: rgba(168,85,247,0.1);
                border-radius: 4px;
                font-size: 11px;
                color: ${colors.architect};
            }

            .proposal-priority {
                font-size: 12px;
                color: ${colors.textMuted};
            }

            /* Bid Summary */
            .bid-metrics {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 10px;
            }

            .metric {
                text-align: center;
            }

            .metric-label {
                display: block;
                font-size: 10px;
                color: ${colors.textMuted};
                margin-bottom: 4px;
            }

            .metric-value {
                font-size: 14px;
                font-weight: 600;
            }

            .metric-value.cost-low { color: ${costColors.low}; }
            .metric-value.cost-medium { color: ${costColors.medium}; }
            .metric-value.cost-high { color: ${costColors.high}; }
            .metric-value.cost-prohibitive { color: ${costColors.prohibitive}; }

            .bid-justification {
                margin: 0;
                font-style: italic;
                color: ${colors.textMuted};
            }

            .bid-counter-indicator {
                margin-top: 10px;
                padding: 6px 10px;
                background: rgba(245,158,11,0.1);
                border-radius: 4px;
                font-size: 11px;
                color: ${colors.governor};
            }

            /* Accept/Reject/Escalate Summaries */
            .accept-summary, .reject-summary, .escalate-summary {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .accept-icon::after { content: ''; color: ${colors.consensus}; }
            .reject-icon::after { content: ''; color: ${colors.escalation}; }
            .escalate-icon::after { content: ''; color: ${colors.governor}; }

            .escalate-reason {
                margin: 8px 0 0;
                font-size: 12px;
                color: ${colors.textMuted};
            }

            /* Consensus Panel */
            .nv-consensus-panel {
                padding: 16px 20px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .consensus-card {
                background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(52,211,153,0.1));
                border: 1px solid rgba(34,197,94,0.3);
                border-radius: 12px;
                padding: 16px;
            }

            .consensus-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }

            .consensus-icon::after {
                content: '';
                color: ${colors.consensus};
            }

            .consensus-header h3 {
                margin: 0;
                font-size: 16px;
                color: ${colors.consensus};
            }

            .consensus-content {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 16px;
            }

            .consensus-stat {
                text-align: center;
            }

            .consensus-stat .stat-label {
                display: block;
                font-size: 10px;
                color: ${colors.textMuted};
                margin-bottom: 4px;
            }

            .consensus-stat .stat-value {
                font-size: 18px;
                font-weight: 600;
                color: ${colors.text};
            }

            .consensus-stat .stat-value.validated { color: ${colors.consensus}; }
            .consensus-stat .stat-value.not-validated { color: ${colors.escalation}; }

            .consensus-agreement {
                margin-bottom: 12px;
            }

            .consensus-agreement h4 {
                margin: 0 0 8px;
                font-size: 12px;
                font-weight: 600;
                color: ${colors.textMuted};
            }

            .consensus-agreement p {
                margin: 0;
                font-size: 13px;
            }

            .consensus-audit {
                display: flex;
                align-items: center;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .audit-label {
                font-size: 11px;
                color: ${colors.textMuted};
            }

            .audit-hash {
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                color: ${colors.architect};
                background: rgba(168,85,247,0.1);
                padding: 4px 8px;
                border-radius: 4px;
                word-break: break-all;
            }

            /* Detail Panel */
            .nv-detail-panel {
                width: 0;
                background: ${colors.card};
                border-left: 1px solid rgba(255,255,255,0.1);
                overflow: hidden;
                transition: width 0.3s ease;
            }

            .nv-detail-panel.visible {
                width: 320px;
            }

            .nv-detail-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .nv-detail-header span {
                font-size: 14px;
                font-weight: 600;
            }

            .nv-close-detail {
                background: none;
                border: none;
                color: ${colors.textMuted};
                font-size: 20px;
                cursor: pointer;
            }

            .nv-detail-content {
                padding: 16px;
                overflow-y: auto;
                max-height: calc(100% - 60px);
            }

            .detail-section {
                margin-bottom: 16px;
            }

            .detail-section h4 {
                margin: 0 0 8px;
                font-size: 11px;
                font-weight: 600;
                color: ${colors.textMuted};
                text-transform: uppercase;
            }

            .detail-section code {
                display: block;
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                background: rgba(0,0,0,0.2);
                padding: 8px;
                border-radius: 4px;
                word-break: break-all;
            }

            .detail-section pre {
                margin: 0;
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                background: rgba(0,0,0,0.2);
                padding: 12px;
                border-radius: 4px;
                overflow-x: auto;
                max-height: 200px;
            }

            .detail-type {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .detail-sender {
                font-size: 13px;
            }

            .detail-sender.architect { color: ${colors.architect}; }
            .detail-sender.alchemist { color: ${colors.alchemist}; }
            .detail-sender.governor { color: ${colors.governor}; }

            /* Responsive */
            @media (max-width: 900px) {
                .nv-sidebar {
                    width: 220px;
                }

                .nv-detail-panel.visible {
                    width: 260px;
                }
            }

            @media (max-width: 700px) {
                .nv-content {
                    flex-direction: column;
                }

                .nv-sidebar {
                    width: 100%;
                    max-height: 200px;
                    border-right: none;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }

                .nv-detail-panel {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    z-index: 10;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Export for use
window.NegotiationViewer = NegotiationViewer;

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('negotiation-viewer');
    if (container) {
        window.negotiationViewer = new NegotiationViewer(container);
    }
});
