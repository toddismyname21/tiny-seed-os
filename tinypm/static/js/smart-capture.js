/**
 * TinyPM Smart Quick Capture Module
 * ==================================
 * Natural language task entry with real-time AI parsing.
 *
 * Features:
 * - Natural language input parsing
 * - Real-time preview of parsed task
 * - Auto-create after pause
 * - Voice input support
 * - Smart date/time extraction
 *
 * Created: 2026-02-03
 * Team: AI UX & Guided Rituals (Team 3)
 */

const SmartCapture = {
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    config: {
        autoCreateDelay: 1000,    // 1 second pause to auto-create
        minInputLength: 3,        // Minimum characters to start parsing
        debounceDelay: 200,       // Debounce parsing
        animationDuration: 300
    },

    // Date/time patterns
    patterns: {
        // Relative dates
        today: /\b(today)\b/i,
        tomorrow: /\b(tomorrow|tmrw|tmw)\b/i,
        nextWeek: /\b(next week)\b/i,
        dayOfWeek: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i,

        // Specific times
        timeAmPm: /\b(\d{1,2})(:\d{2})?\s*(am|pm)\b/i,
        time24: /\b(\d{1,2}):(\d{2})\b/,
        atTime: /\bat\s+(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i,

        // Priority indicators
        highPriority: /\b(urgent|asap|important|critical|high priority|!)\b/i,
        lowPriority: /\b(low priority|whenever|someday|eventually)\b/i,

        // Time durations
        duration: /\b(for\s+)?(\d+)\s*(hour|hr|minute|min|h|m)s?\b/i,

        // Categories/tags
        hashtag: /#(\w+)/g,
        atMention: /@(\w+)/g,

        // Common action verbs (to identify task start)
        actionVerbs: /\b(call|email|send|write|review|finish|complete|schedule|meet|prepare|buy|get|pick up|remind|follow up)\b/i
    },

    // State
    state: {
        isOpen: false,
        inputValue: '',
        parsedTask: null,
        autoCreateTimer: null,
        isParsing: false,
        isRecording: false,
        recognition: null
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    init() {
        this.injectStyles();
        this.createModal();
        this.setupKeyboardShortcut();
    },

    /**
     * Set up keyboard shortcut (Cmd/Ctrl + K or Q for quick capture)
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K or Cmd/Ctrl + Q
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'q')) {
                e.preventDefault();
                this.toggle();
            }

            // Escape to close
            if (e.key === 'Escape' && this.state.isOpen) {
                this.close();
            }
        });
    },

    // =========================================================================
    // MODAL MANAGEMENT
    // =========================================================================
    open() {
        const modal = document.getElementById('smart-capture-modal');
        if (!modal) return;

        this.state.isOpen = true;
        modal.style.display = 'flex';

        requestAnimationFrame(() => {
            modal.classList.add('visible');
            document.getElementById('smart-capture-input')?.focus();
        });
    },

    close() {
        const modal = document.getElementById('smart-capture-modal');
        if (!modal) return;

        this.state.isOpen = false;
        modal.classList.remove('visible');

        setTimeout(() => {
            modal.style.display = 'none';
            this.reset();
        }, this.config.animationDuration);
    },

    toggle() {
        if (this.state.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    reset() {
        this.state.inputValue = '';
        this.state.parsedTask = null;
        this.clearAutoCreateTimer();

        // Stop any active voice recording
        if (this.state.isRecording) {
            this.stopVoiceInput();
        }

        const input = document.getElementById('smart-capture-input');
        if (input) {
            input.value = '';
            input.classList.remove('interim-result');
        }

        // Hide voice status
        const voiceStatus = document.getElementById('voice-status');
        if (voiceStatus) {
            voiceStatus.classList.remove('visible');
        }

        this.updatePreview(null);
    },

    // =========================================================================
    // INPUT HANDLING
    // =========================================================================
    handleInput(value) {
        this.state.inputValue = value;
        this.clearAutoCreateTimer();

        if (value.length < this.config.minInputLength) {
            this.updatePreview(null);
            return;
        }

        // Debounced parsing
        clearTimeout(this._parseDebounce);
        this._parseDebounce = setTimeout(() => {
            this.parseInput(value);
        }, this.config.debounceDelay);
    },

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.createTask();
        }
    },

    // =========================================================================
    // NATURAL LANGUAGE PARSING
    // =========================================================================
    parseInput(text) {
        this.state.isParsing = true;

        const parsed = {
            title: text,
            dueDate: null,
            dueTime: null,
            priority: 'medium',
            duration: null,
            tags: [],
            mentions: [],
            confidence: 0.5
        };

        // Extract date
        const dateResult = this.extractDate(text);
        if (dateResult) {
            parsed.dueDate = dateResult.date;
            parsed.title = this.removeFromText(parsed.title, dateResult.match);
            parsed.confidence += 0.15;
        }

        // Extract time
        const timeResult = this.extractTime(text);
        if (timeResult) {
            parsed.dueTime = timeResult.time;
            parsed.title = this.removeFromText(parsed.title, timeResult.match);
            parsed.confidence += 0.1;
        }

        // Extract priority
        if (this.patterns.highPriority.test(text)) {
            parsed.priority = 'high';
            parsed.title = parsed.title.replace(this.patterns.highPriority, '').trim();
            parsed.confidence += 0.1;
        } else if (this.patterns.lowPriority.test(text)) {
            parsed.priority = 'low';
            parsed.title = parsed.title.replace(this.patterns.lowPriority, '').trim();
        }

        // Extract duration
        const durationMatch = text.match(this.patterns.duration);
        if (durationMatch) {
            parsed.duration = this.parseDuration(durationMatch);
            parsed.title = this.removeFromText(parsed.title, durationMatch[0]);
        }

        // Extract tags
        const tags = text.match(this.patterns.hashtag);
        if (tags) {
            parsed.tags = tags.map(t => t.replace('#', ''));
            tags.forEach(t => {
                parsed.title = parsed.title.replace(t, '').trim();
            });
        }

        // Extract mentions
        const mentions = text.match(this.patterns.atMention);
        if (mentions) {
            parsed.mentions = mentions.map(m => m.replace('@', ''));
            mentions.forEach(m => {
                parsed.title = parsed.title.replace(m, '').trim();
            });
        }

        // Clean up title
        parsed.title = this.cleanTitle(parsed.title);

        // Boost confidence if we found an action verb
        if (this.patterns.actionVerbs.test(parsed.title)) {
            parsed.confidence += 0.1;
        }

        // Cap confidence at 0.95
        parsed.confidence = Math.min(parsed.confidence, 0.95);

        this.state.parsedTask = parsed;
        this.state.isParsing = false;

        this.updatePreview(parsed);
        this.startAutoCreateTimer();
    },

    /**
     * Extract date from text
     */
    extractDate(text) {
        const today = new Date();

        // Check for "today"
        if (this.patterns.today.test(text)) {
            return {
                date: this.formatDate(today),
                match: text.match(this.patterns.today)[0]
            };
        }

        // Check for "tomorrow"
        if (this.patterns.tomorrow.test(text)) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return {
                date: this.formatDate(tomorrow),
                match: text.match(this.patterns.tomorrow)[0]
            };
        }

        // Check for "next week"
        if (this.patterns.nextWeek.test(text)) {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return {
                date: this.formatDate(nextWeek),
                match: text.match(this.patterns.nextWeek)[0]
            };
        }

        // Check for day of week
        const dayMatch = text.match(this.patterns.dayOfWeek);
        if (dayMatch) {
            const dayName = dayMatch[0].toLowerCase();
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

            let targetDay = days.indexOf(dayName);
            if (targetDay === -1) {
                targetDay = shortDays.indexOf(dayName);
            }

            if (targetDay !== -1) {
                const currentDay = today.getDay();
                let daysUntil = targetDay - currentDay;
                if (daysUntil <= 0) daysUntil += 7; // Next occurrence

                const targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + daysUntil);

                return {
                    date: this.formatDate(targetDate),
                    match: dayMatch[0]
                };
            }
        }

        return null;
    },

    /**
     * Extract time from text
     */
    extractTime(text) {
        // Check for "at X:XX am/pm"
        let match = text.match(this.patterns.atTime);
        if (match) {
            return {
                time: this.normalizeTime(match[1], match[2], match[3]),
                match: match[0]
            };
        }

        // Check for time with am/pm
        match = text.match(this.patterns.timeAmPm);
        if (match) {
            return {
                time: this.normalizeTime(match[1], match[2], match[3]),
                match: match[0]
            };
        }

        return null;
    },

    /**
     * Normalize time to HH:MM format
     */
    normalizeTime(hour, minutes, ampm) {
        let h = parseInt(hour, 10);
        let m = minutes ? parseInt(minutes.replace(':', ''), 10) : 0;

        if (ampm) {
            if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
            if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
        }

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    /**
     * Parse duration string
     */
    parseDuration(match) {
        const amount = parseInt(match[2], 10);
        const unit = match[3].toLowerCase();

        if (unit.startsWith('h')) {
            return amount * 60; // Convert to minutes
        }
        return amount;
    },

    /**
     * Clean up the task title
     */
    cleanTitle(title) {
        return title
            .replace(/\s+/g, ' ')        // Multiple spaces to single
            .replace(/^\s*[-:,]\s*/, '') // Remove leading punctuation
            .replace(/\s*[-:,]\s*$/, '') // Remove trailing punctuation
            .trim();
    },

    /**
     * Remove matched text from string
     */
    removeFromText(text, match) {
        return text.replace(match, ' ').replace(/\s+/g, ' ').trim();
    },

    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    // =========================================================================
    // AUTO-CREATE TIMER
    // =========================================================================
    startAutoCreateTimer() {
        this.clearAutoCreateTimer();

        if (!this.state.parsedTask || !this.state.parsedTask.title) return;

        this.state.autoCreateTimer = setTimeout(() => {
            this.showAutoCreateCountdown();
        }, this.config.autoCreateDelay);
    },

    clearAutoCreateTimer() {
        if (this.state.autoCreateTimer) {
            clearTimeout(this.state.autoCreateTimer);
            this.state.autoCreateTimer = null;
        }
        this.hideAutoCreateCountdown();
    },

    showAutoCreateCountdown() {
        const preview = document.querySelector('.capture-preview');
        if (preview) {
            preview.classList.add('auto-creating');
        }
    },

    hideAutoCreateCountdown() {
        const preview = document.querySelector('.capture-preview');
        if (preview) {
            preview.classList.remove('auto-creating');
        }
    },

    // =========================================================================
    // PREVIEW UI
    // =========================================================================
    updatePreview(parsed) {
        const preview = document.getElementById('capture-preview');
        if (!preview) return;

        if (!parsed || !parsed.title) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <span class="placeholder-icon"></span>
                    <span class="placeholder-text">Start typing to create a task...</span>
                </div>
            `;
            return;
        }

        const confidenceLevel = parsed.confidence >= 0.8 ? 'high' :
                               parsed.confidence >= 0.6 ? 'medium' : 'low';

        preview.innerHTML = `
            <div class="preview-header">
                <span class="preview-label">Parsed Task</span>
                <span class="confidence-badge ${confidenceLevel}">
                    ${Math.round(parsed.confidence * 100)}% confidence
                </span>
            </div>

            <div class="preview-task">
                <div class="task-main">
                    <span class="task-priority-dot ${parsed.priority}"></span>
                    <span class="task-title">${this.escapeHtml(parsed.title)}</span>
                </div>

                <div class="task-metadata">
                    ${parsed.dueDate ? `
                        <span class="meta-item date">
                            <span class="meta-icon"></span>
                            ${this.formatDisplayDate(parsed.dueDate)}
                        </span>
                    ` : ''}
                    ${parsed.dueTime ? `
                        <span class="meta-item time">
                            <span class="meta-icon"></span>
                            ${this.formatDisplayTime(parsed.dueTime)}
                        </span>
                    ` : ''}
                    ${parsed.duration ? `
                        <span class="meta-item duration">
                            <span class="meta-icon"></span>
                            ${parsed.duration} min
                        </span>
                    ` : ''}
                    ${parsed.tags.length > 0 ? `
                        <span class="meta-item tags">
                            ${parsed.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="preview-actions">
                <button class="preview-btn create" onclick="SmartCapture.createTask()">
                    Create
                </button>
                <button class="preview-btn edit" onclick="SmartCapture.editParsed()">
                    Edit
                </button>
            </div>

            <div class="auto-create-bar">
                <div class="auto-create-progress"></div>
            </div>
        `;
    },

    formatDisplayDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateStr === this.formatDate(today)) return 'Today';
        if (dateStr === this.formatDate(tomorrow)) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    },

    formatDisplayTime(timeStr) {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${m} ${ampm}`;
    },

    // =========================================================================
    // TASK CREATION
    // =========================================================================
    createTask() {
        const parsed = this.state.parsedTask;
        if (!parsed || !parsed.title) return;

        const task = {
            id: this.generateUUID(),
            title: parsed.title,
            status: 'pending',
            priority: parsed.priority,
            created_at: new Date().toISOString(),
            source: 'smart_capture'
        };

        if (parsed.dueDate) {
            task.due_date = parsed.dueDate;
        }

        if (parsed.dueTime) {
            task.due_time = parsed.dueTime;
        }

        if (parsed.duration) {
            task.estimated_duration = parsed.duration;
        }

        if (parsed.tags.length > 0) {
            task.tags = parsed.tags;
        }

        // Save task
        const tasks = JSON.parse(localStorage.getItem('tinypm_tasks') || '[]');
        tasks.push(task);
        localStorage.setItem('tinypm_tasks', JSON.stringify(tasks));

        // Show success
        this.showSuccess(parsed.title);

        // Close modal
        this.close();

        // Notify other components
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: task }));
    },

    editParsed() {
        // Would open full task editor with parsed data
        console.log('[SmartCapture] Edit parsed task:', this.state.parsedTask);
        window.dispatchEvent(new CustomEvent('openTaskEditor', {
            detail: this.state.parsedTask
        }));
        this.close();
    },

    showSuccess(title) {
        const toast = document.createElement('div');
        toast.className = 'smart-capture-toast success';
        toast.innerHTML = `
            <span class="toast-icon"></span>
            <span class="toast-text">Created: ${this.escapeHtml(title.substring(0, 30))}${title.length > 30 ? '...' : ''}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // =========================================================================
    // VOICE INPUT
    // =========================================================================

    /**
     * Check if voice input is supported in this browser
     */
    isVoiceSupported() {
        return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    },

    /**
     * Toggle voice input - start if not recording, stop if recording
     */
    toggleVoiceInput() {
        if (this.state.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    },

    /**
     * Start voice recognition
     */
    startVoiceInput() {
        // Check browser support
        if (!this.isVoiceSupported()) {
            this.showVoiceError('not-supported');
            return;
        }

        // If already recording, do nothing
        if (this.state.isRecording) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Configure recognition
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        const input = document.getElementById('smart-capture-input');
        const voiceBtn = document.querySelector('.voice-input-btn');
        const statusIndicator = document.getElementById('voice-status');

        // Update UI to recording state
        this.state.isRecording = true;
        this.state.recognition = recognition;
        voiceBtn?.classList.add('recording');
        this.showVoiceStatus('listening');

        // Handle results
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (input) {
                // Show interim results with visual distinction
                if (interimTranscript) {
                    input.value = interimTranscript;
                    input.classList.add('interim-result');
                    this.showVoiceStatus('processing');
                }

                // When we have final results, update and parse
                if (finalTranscript) {
                    input.value = finalTranscript;
                    input.classList.remove('interim-result');
                    this.handleInput(finalTranscript);
                    this.showVoiceStatus('success');
                }
            }
        };

        // Handle speech start
        recognition.onspeechstart = () => {
            this.showVoiceStatus('hearing');
        };

        // Handle end of recognition
        recognition.onend = () => {
            this.state.isRecording = false;
            this.state.recognition = null;
            voiceBtn?.classList.remove('recording');

            const input = document.getElementById('smart-capture-input');
            input?.classList.remove('interim-result');

            // Hide status after delay if successful
            setTimeout(() => {
                const status = document.getElementById('voice-status');
                if (status && !status.classList.contains('error')) {
                    status.classList.remove('visible');
                }
            }, 1500);
        };

        // Handle errors
        recognition.onerror = (event) => {
            console.error('[SmartCapture] Voice recognition error:', event.error);
            this.state.isRecording = false;
            this.state.recognition = null;
            voiceBtn?.classList.remove('recording');

            const input = document.getElementById('smart-capture-input');
            input?.classList.remove('interim-result');

            this.showVoiceError(event.error);
        };

        // Handle no speech detected
        recognition.onnomatch = () => {
            this.showVoiceError('no-speech');
        };

        // Start recognition
        try {
            recognition.start();
        } catch (e) {
            console.error('[SmartCapture] Failed to start recognition:', e);
            this.state.isRecording = false;
            voiceBtn?.classList.remove('recording');
            this.showVoiceError('start-failed');
        }
    },

    /**
     * Stop voice recognition
     */
    stopVoiceInput() {
        if (this.state.recognition) {
            try {
                this.state.recognition.stop();
            } catch (e) {
                console.error('[SmartCapture] Error stopping recognition:', e);
            }
        }
        this.state.isRecording = false;
        this.state.recognition = null;

        const voiceBtn = document.querySelector('.voice-input-btn');
        voiceBtn?.classList.remove('recording');

        this.showVoiceStatus('stopped');
    },

    /**
     * Show voice status indicator
     */
    showVoiceStatus(status) {
        let statusEl = document.getElementById('voice-status');
        if (!statusEl) return;

        const messages = {
            'listening': 'Listening...',
            'hearing': 'Hearing you...',
            'processing': 'Processing...',
            'success': 'Got it!',
            'stopped': 'Stopped'
        };

        const icons = {
            'listening': '<svg class="status-icon pulse" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>',
            'hearing': '<svg class="status-icon wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>',
            'processing': '<svg class="status-icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="40" stroke-dashoffset="10"/></svg>',
            'success': '<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
            'stopped': '<svg class="status-icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
        };

        statusEl.innerHTML = `${icons[status] || ''}<span>${messages[status] || ''}</span>`;
        statusEl.className = 'voice-status visible ' + status;
    },

    /**
     * Show voice error message
     */
    showVoiceError(errorType) {
        let statusEl = document.getElementById('voice-status');
        if (!statusEl) return;

        const errorMessages = {
            'not-supported': 'Voice input is not supported in this browser. Try Chrome or Safari.',
            'not-allowed': 'Microphone access denied. Please allow microphone access in your browser settings.',
            'no-speech': 'No speech detected. Please try again.',
            'audio-capture': 'No microphone found. Please connect a microphone.',
            'network': 'Network error. Please check your connection.',
            'aborted': 'Voice input was cancelled.',
            'start-failed': 'Could not start voice recognition. Please try again.',
            'service-not-allowed': 'Speech recognition service is not allowed. Please try again later.'
        };

        const message = errorMessages[errorType] || `Voice error: ${errorType}`;

        statusEl.innerHTML = `
            <svg class="status-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${message}</span>
        `;
        statusEl.className = 'voice-status visible error';

        // Hide error after delay
        setTimeout(() => {
            statusEl.classList.remove('visible');
        }, 4000);
    },

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // =========================================================================
    // MODAL CREATION
    // =========================================================================
    createModal() {
        if (document.getElementById('smart-capture-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'smart-capture-modal';
        modal.className = 'smart-capture-modal';
        modal.innerHTML = `
            <div class="capture-backdrop" onclick="SmartCapture.close()"></div>
            <div class="capture-container">
                <div class="capture-header">
                    <div class="capture-title">
                        <span class="capture-icon"></span>
                        <span>Quick Capture</span>
                    </div>
                    <div class="capture-shortcuts">
                        <kbd>Enter</kbd> to create
                        <kbd>Esc</kbd> to close
                    </div>
                </div>

                <div class="capture-input-wrap">
                    <input type="text"
                           id="smart-capture-input"
                           class="capture-input"
                           placeholder='Try: "Call John about the proposal tomorrow at 2pm #work"'
                           autocomplete="off"
                           oninput="SmartCapture.handleInput(this.value)"
                           onkeydown="SmartCapture.handleKeydown(event)">
                    <button class="voice-input-btn" onclick="SmartCapture.toggleVoiceInput()" title="Voice input (click to speak)">
                        <svg class="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                        <svg class="stop-icon" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                    </button>
                    <div id="voice-status" class="voice-status"></div>
                </div>

                <div class="capture-preview" id="capture-preview">
                    <div class="preview-placeholder">
                        <span class="placeholder-icon"></span>
                        <span class="placeholder-text">Start typing to create a task...</span>
                    </div>
                </div>

                <div class="capture-tips">
                    <span class="tip-label">Tips:</span>
                    <span class="tip">"tomorrow" "next week" "friday"</span>
                    <span class="tip">"at 2pm" "urgent" "#tag"</span>
                    <span class="tip voice-tip">Tap mic to speak</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // =========================================================================
    // STYLES
    // =========================================================================
    injectStyles() {
        if (document.getElementById('smart-capture-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'smart-capture-styles';
        styles.textContent = `
            /* Smart Capture Modal */
            .smart-capture-modal {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
            }

            .smart-capture-modal.visible {
                display: flex;
            }

            .capture-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(15, 15, 26, 0.8);
                backdrop-filter: blur(4px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .smart-capture-modal.visible .capture-backdrop {
                opacity: 1;
            }

            .capture-container {
                position: relative;
                width: 100%;
                max-width: 580px;
                background: linear-gradient(135deg, #1e2130 0%, #252839 100%);
                border-radius: 16px;
                border: 1px solid rgba(99, 102, 241, 0.3);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                            0 0 40px rgba(99, 102, 241, 0.15);
                margin: 20px;
                transform: translateY(-20px) scale(0.95);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .smart-capture-modal.visible .capture-container {
                transform: translateY(0) scale(1);
                opacity: 1;
            }

            /* Capture Header */
            .capture-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .capture-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                font-weight: 600;
                color: #f0f0f5;
            }

            .capture-icon::after {
                content: '';
                font-size: 16px;
            }

            .capture-shortcuts {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: #6b6f82;
            }

            .capture-shortcuts kbd {
                padding: 2px 6px;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 4px;
                font-family: inherit;
                font-size: 11px;
            }

            /* Capture Input */
            .capture-input-wrap {
                position: relative;
                padding: 16px 20px;
            }

            .capture-input {
                width: 100%;
                padding: 16px 50px 16px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(99, 102, 241, 0.2);
                border-radius: 12px;
                color: #f0f0f5;
                font-size: 16px;
                font-family: inherit;
                transition: all 0.2s;
            }

            .capture-input:focus {
                outline: none;
                border-color: rgba(99, 102, 241, 0.5);
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
            }

            .capture-input::placeholder {
                color: #6b6f82;
            }

            .voice-input-btn {
                position: absolute;
                right: 28px;
                top: 50%;
                transform: translateY(-50%);
                width: 40px;
                height: 40px;
                background: rgba(99, 102, 241, 0.2);
                border: none;
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .voice-input-btn:hover {
                background: rgba(99, 102, 241, 0.35);
                transform: translateY(-50%) scale(1.05);
            }

            .voice-input-btn:active {
                transform: translateY(-50%) scale(0.95);
            }

            .voice-input-btn .mic-icon {
                width: 20px;
                height: 20px;
                stroke: #a0a4b8;
                transition: all 0.2s;
            }

            .voice-input-btn:hover .mic-icon {
                stroke: #f0f0f5;
            }

            .voice-input-btn .stop-icon {
                width: 16px;
                height: 16px;
                fill: white;
                display: none;
            }

            .voice-input-btn.recording {
                background: #ef4444;
                animation: pulse-record 1.5s ease-in-out infinite;
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
            }

            .voice-input-btn.recording .mic-icon {
                display: none;
            }

            .voice-input-btn.recording .stop-icon {
                display: block;
            }

            @keyframes pulse-record {
                0% {
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
                }
                50% {
                    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                }
            }

            /* Voice Status Indicator */
            .voice-status {
                position: absolute;
                left: 20px;
                bottom: -28px;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #a0a4b8;
                opacity: 0;
                transform: translateY(-5px);
                transition: all 0.2s ease;
                pointer-events: none;
            }

            .voice-status.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .voice-status .status-icon {
                width: 14px;
                height: 14px;
            }

            .voice-status.listening {
                color: #6366f1;
            }

            .voice-status.listening .status-icon.pulse {
                fill: #6366f1;
                animation: status-pulse 1s ease-in-out infinite;
            }

            .voice-status.hearing {
                color: #22c55e;
            }

            .voice-status.hearing .status-icon {
                stroke: #22c55e;
            }

            .voice-status.hearing .status-icon.wave {
                animation: wave-pulse 0.5s ease-in-out infinite alternate;
            }

            .voice-status.processing {
                color: #f59e0b;
            }

            .voice-status.processing .status-icon.spin {
                stroke: #f59e0b;
                animation: spin 1s linear infinite;
            }

            .voice-status.success {
                color: #22c55e;
            }

            .voice-status.success .status-icon {
                stroke: #22c55e;
            }

            .voice-status.error {
                color: #ef4444;
            }

            .voice-status.error .status-icon {
                stroke: #ef4444;
            }

            @keyframes status-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.7; }
            }

            @keyframes wave-pulse {
                0% { transform: scale(1); }
                100% { transform: scale(1.1); }
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Interim result styling */
            .capture-input.interim-result {
                color: #6b6f82;
                font-style: italic;
            }

            /* Capture Preview */
            .capture-preview {
                padding: 0 20px 16px;
                min-height: 100px;
            }

            .preview-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 24px;
                color: #6b6f82;
                text-align: center;
            }

            .placeholder-icon::after {
                content: '';
                font-size: 24px;
                opacity: 0.5;
            }

            .placeholder-text {
                margin-top: 8px;
                font-size: 13px;
            }

            .preview-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .preview-label {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #6b6f82;
            }

            .confidence-badge {
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
            }

            .confidence-badge.high {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
            }

            .confidence-badge.medium {
                background: rgba(99, 102, 241, 0.15);
                color: #6366f1;
            }

            .confidence-badge.low {
                background: rgba(107, 111, 130, 0.15);
                color: #6b6f82;
            }

            .preview-task {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 14px 16px;
                margin-bottom: 12px;
            }

            .task-main {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .task-priority-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .task-priority-dot.high { background: #ef4444; }
            .task-priority-dot.medium { background: #f59e0b; }
            .task-priority-dot.low { background: #22c55e; }

            .task-title {
                font-size: 15px;
                color: #f0f0f5;
                font-weight: 500;
            }

            .task-metadata {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }

            .meta-item {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                color: #a0a4b8;
            }

            .meta-icon::after {
                font-size: 12px;
                opacity: 0.7;
            }

            .meta-item.date .meta-icon::after { content: ''; }
            .meta-item.time .meta-icon::after { content: ''; }
            .meta-item.duration .meta-icon::after { content: ''; }

            .tag {
                padding: 2px 6px;
                background: rgba(99, 102, 241, 0.15);
                border-radius: 4px;
                font-size: 11px;
                color: #6366f1;
            }

            .preview-actions {
                display: flex;
                gap: 10px;
            }

            .preview-btn {
                flex: 1;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                font-family: inherit;
            }

            .preview-btn.create {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .preview-btn.create:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }

            .preview-btn.edit {
                background: rgba(255, 255, 255, 0.08);
                color: #a0a4b8;
            }

            .preview-btn.edit:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #f0f0f5;
            }

            /* Auto-create bar */
            .auto-create-bar {
                height: 3px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                margin-top: 12px;
                overflow: hidden;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .capture-preview.auto-creating .auto-create-bar {
                opacity: 1;
            }

            .auto-create-progress {
                height: 100%;
                background: linear-gradient(90deg, #22c55e, #16a34a);
                width: 0;
                animation: auto-create-fill 1s linear forwards;
            }

            .capture-preview.auto-creating .auto-create-progress {
                animation: auto-create-fill 1s linear forwards;
            }

            @keyframes auto-create-fill {
                from { width: 0; }
                to { width: 100%; }
            }

            /* Capture Tips */
            .capture-tips {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                font-size: 12px;
            }

            .tip-label {
                color: #6b6f82;
                font-weight: 600;
            }

            .tip {
                padding: 3px 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                color: #a0a4b8;
            }

            /* Toast */
            .smart-capture-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 20px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 500;
                color: white;
                z-index: 10001;
                opacity: 0;
                transition: all 0.3s ease;
            }

            .smart-capture-toast.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }

            .smart-capture-toast.success {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
            }

            .toast-icon::after {
                content: '';
                font-size: 16px;
            }

            /* Mobile Responsive */
            /* Voice tip hidden on desktop, shown on mobile */
            .voice-tip {
                display: none;
            }

            @media (max-width: 600px) {
                .smart-capture-modal {
                    padding-top: 10vh;
                }

                .capture-container {
                    margin: 10px;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .capture-shortcuts {
                    display: none;
                }

                /* Show voice tip on mobile, hide text tips */
                .capture-tips {
                    display: flex;
                }

                .capture-tips .tip:not(.voice-tip) {
                    display: none;
                }

                .capture-tips .voice-tip {
                    display: inline-block;
                    background: rgba(99, 102, 241, 0.15);
                    color: #6366f1;
                }

                /* Larger touch target for voice button on mobile */
                .voice-input-btn {
                    width: 44px;
                    height: 44px;
                }

                /* Voice status positioned better for mobile */
                .voice-status {
                    left: 16px;
                    bottom: -32px;
                    font-size: 13px;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Export for use
window.SmartCapture = SmartCapture;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    SmartCapture.init();
});
