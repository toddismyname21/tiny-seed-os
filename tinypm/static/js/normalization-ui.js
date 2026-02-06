/**
 * ==============================================================================
 * NORMALIZATION UI v1.0 - Smart Input Normalization for TinyPM
 * ==============================================================================
 *
 * Part of Project "Sovereign Seed" Phase 1
 *
 * Features:
 * - Smart input fields showing normalized values in real-time
 * - Multi-format date picker
 * - Currency formatting with equivalence display
 * - Developer dashboard normalization tester
 *
 * Usage:
 *   // Initialize on a currency input
 *   NormalizationUI.enhanceInput(document.getElementById('amount'), 'currency');
 *
 *   // Initialize all inputs with data-normalize attribute
 *   NormalizationUI.initAll();
 *
 *   // Manual normalization
 *   const result = await NormalizationUI.normalize('$1,200', 'currency');
 *
 * Author: PM_Architect Claude
 * Date: 2026-02-04
 */

(function(window) {
    'use strict';

    // ===========================================================================
    // CONSTANTS
    // ===========================================================================

    const API_BASE = window.TINYPM_API_BASE || '/api';

    const VALUE_TYPES = {
        CURRENCY: 'currency',
        DATE: 'date',
        NUMBER: 'number',
        DURATION: 'duration',
        BOOLEAN: 'boolean'
    };

    // ===========================================================================
    // CLIENT-SIDE NORMALIZATION (Mirrors backend for instant feedback)
    // ===========================================================================

    /**
     * Client-side normalizers for instant UI feedback.
     * These mirror the backend logic but are NOT authoritative.
     * Final validation must always go through the backend.
     */
    const ClientNormalizers = {
        /**
         * Normalize currency values
         */
        currency: function(text) {
            if (!text || typeof text !== 'string') return null;

            text = text.trim();
            const original = text;

            // Pattern: $1,234.56 or $1234.56
            let match = text.match(/^\$\s*([\d,]+(?:\.\d{1,2})?)$/);
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                return {
                    original: original,
                    normalized: value.toFixed(2),
                    display: '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    type: 'currency',
                    confidence: 0.95,
                    method: 'usd_standard'
                };
            }

            // Pattern: 1234 dollars
            match = text.match(/^([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|USD)$/i);
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                return {
                    original: original,
                    normalized: value.toFixed(2),
                    display: '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    type: 'currency',
                    confidence: 0.90,
                    method: 'usd_written'
                };
            }

            // Pattern: $1.5k, $2M
            match = text.match(/^\$\s*([\d.]+)\s*(k|m|b|thousand|million|billion)$/i);
            if (match) {
                let value = parseFloat(match[1]);
                const unit = match[2].toLowerCase();
                const multipliers = { k: 1000, thousand: 1000, m: 1000000, million: 1000000, b: 1000000000, billion: 1000000000 };
                value *= multipliers[unit] || 1;
                return {
                    original: original,
                    normalized: value.toFixed(2),
                    display: '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    type: 'currency',
                    confidence: 0.90,
                    method: 'usd_shorthand'
                };
            }

            // Pattern: Just a number (could be currency in context)
            match = text.match(/^([\d,]+(?:\.\d{1,2})?)$/);
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                return {
                    original: original,
                    normalized: value.toFixed(2),
                    display: '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    type: 'currency',
                    confidence: 0.70,
                    method: 'numeric_inferred'
                };
            }

            return null;
        },

        /**
         * Normalize date values
         */
        date: function(text) {
            if (!text || typeof text !== 'string') return null;

            text = text.trim();
            const original = text;

            const monthNames = {
                january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
                april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
                august: 8, aug: 8, september: 9, sept: 9, sep: 9, october: 10, oct: 10,
                november: 11, nov: 11, december: 12, dec: 12
            };

            let year, month, day;

            // ISO: 2026-02-04
            let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (match) {
                year = parseInt(match[1]);
                month = parseInt(match[2]);
                day = parseInt(match[3]);
            }

            // US slash: 02/04/2026
            if (!year) {
                match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                if (match) {
                    month = parseInt(match[1]);
                    day = parseInt(match[2]);
                    year = parseInt(match[3]);
                    if (year < 100) year = year > 50 ? 1900 + year : 2000 + year;
                }
            }

            // Written: February 4, 2026
            if (!year) {
                match = text.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
                if (match) {
                    const monthName = match[1].toLowerCase();
                    month = monthNames[monthName];
                    day = parseInt(match[2]);
                    year = parseInt(match[3]);
                }
            }

            // European: 4 February 2026
            if (!year) {
                match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
                if (match) {
                    day = parseInt(match[1]);
                    const monthName = match[2].toLowerCase();
                    month = monthNames[monthName];
                    year = parseInt(match[3]);
                }
            }

            if (year && month && day) {
                // Validate
                if (month < 1 || month > 12 || day < 1 || day > 31) return null;

                const date = new Date(year, month - 1, day);
                const isoStr = date.toISOString().split('T')[0];

                return {
                    original: original,
                    normalized: isoStr,
                    display: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    type: 'date',
                    confidence: 0.95,
                    method: 'date_parsed'
                };
            }

            return null;
        },

        /**
         * Normalize numeric values
         */
        number: function(text) {
            if (!text || typeof text !== 'string') return null;

            text = text.trim();
            const original = text;

            const wordNumbers = {
                zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
                six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
                eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
                sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
                thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
                eighty: 80, ninety: 90, hundred: 100, thousand: 1000
            };

            // Check for written number
            const textLower = text.toLowerCase();
            if (wordNumbers.hasOwnProperty(textLower)) {
                return {
                    original: original,
                    normalized: wordNumbers[textLower],
                    display: wordNumbers[textLower].toString(),
                    type: 'number',
                    confidence: 0.95,
                    method: 'word_number'
                };
            }

            // Hyphenated: twenty-three
            if (textLower.includes('-')) {
                const parts = textLower.split('-');
                if (parts.length === 2 && wordNumbers.hasOwnProperty(parts[0]) && wordNumbers.hasOwnProperty(parts[1])) {
                    const value = wordNumbers[parts[0]] + wordNumbers[parts[1]];
                    return {
                        original: original,
                        normalized: value,
                        display: value.toString(),
                        type: 'number',
                        confidence: 0.90,
                        method: 'word_number_hyphen'
                    };
                }
            }

            // Integer with commas
            let match = text.match(/^-?([\d,]+)$/);
            if (match) {
                const value = parseInt(match[0].replace(/,/g, ''));
                return {
                    original: original,
                    normalized: value,
                    display: value.toLocaleString(),
                    type: 'number',
                    confidence: 0.95,
                    method: 'integer'
                };
            }

            // Float
            match = text.match(/^-?(\d+(?:\.\d+))$/);
            if (match) {
                const value = parseFloat(match[0]);
                return {
                    original: original,
                    normalized: value,
                    display: value.toString(),
                    type: 'number',
                    confidence: 0.95,
                    method: 'float'
                };
            }

            // Ordinal: 1st, 2nd
            match = text.match(/^(\d+)(?:st|nd|rd|th)$/i);
            if (match) {
                const value = parseInt(match[1]);
                return {
                    original: original,
                    normalized: value,
                    display: value.toString(),
                    type: 'number',
                    confidence: 0.90,
                    method: 'ordinal'
                };
            }

            return null;
        },

        /**
         * Normalize duration values (to minutes)
         */
        duration: function(text) {
            if (!text || typeof text !== 'string') return null;

            text = text.trim().toLowerCase();
            const original = text;

            const units = {
                hour: 60, hours: 60, hr: 60, hrs: 60, h: 60,
                minute: 1, minutes: 1, min: 1, mins: 1, m: 1,
                second: 1/60, seconds: 1/60, sec: 1/60, secs: 1/60, s: 1/60,
                day: 1440, days: 1440, d: 1440,
                week: 10080, weeks: 10080, wk: 10080, w: 10080
            };

            // Combined: 1h 30m
            let match = text.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\s*(?:and\s*)?(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
            if (match) {
                const hours = parseFloat(match[1]);
                const mins = parseFloat(match[3]);
                const total = (hours * 60) + mins;
                return {
                    original: original,
                    normalized: total,
                    display: formatDuration(total),
                    type: 'duration',
                    confidence: 0.95,
                    method: 'combined'
                };
            }

            // Single unit: 2 hours, 30 minutes
            match = text.match(/^(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|h|minute|minutes|min|mins|m|second|seconds|sec|secs|s|day|days|d|week|weeks|wk|w)$/);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2];
                const multiplier = units[unit] || 1;
                const total = value * multiplier;
                return {
                    original: original,
                    normalized: Math.round(total * 100) / 100,
                    display: formatDuration(total),
                    type: 'duration',
                    confidence: 0.95,
                    method: 'single_unit'
                };
            }

            return null;
        },

        /**
         * Normalize boolean values
         */
        boolean: function(text) {
            if (!text || typeof text !== 'string') return null;

            text = text.trim().toLowerCase();
            const original = text;

            const trueValues = ['yes', 'y', 'true', 't', '1', 'confirmed', 'approved', 'received', 'paid', 'complete', 'completed', 'done', 'active', 'enabled', 'on', 'ok', 'okay'];
            const falseValues = ['no', 'n', 'false', 'f', '0', 'denied', 'rejected', 'not received', 'unpaid', 'incomplete', 'pending', 'inactive', 'disabled', 'off'];

            if (trueValues.includes(text)) {
                return {
                    original: original,
                    normalized: true,
                    display: 'Yes',
                    type: 'boolean',
                    confidence: 0.95,
                    method: 'true_keyword'
                };
            }

            if (falseValues.includes(text)) {
                return {
                    original: original,
                    normalized: false,
                    display: 'No',
                    type: 'boolean',
                    confidence: 0.95,
                    method: 'false_keyword'
                };
            }

            return null;
        }
    };

    /**
     * Format duration in minutes to human readable
     */
    function formatDuration(minutes) {
        if (minutes >= 1440) {
            const days = Math.floor(minutes / 1440);
            const remainder = minutes % 1440;
            if (remainder === 0) return days + (days === 1 ? ' day' : ' days');
            return days + 'd ' + formatDuration(remainder);
        }
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            if (mins === 0) return hours + (hours === 1 ? ' hour' : ' hours');
            return hours + 'h ' + mins + 'm';
        }
        return Math.round(minutes) + (minutes === 1 ? ' minute' : ' minutes');
    }

    // ===========================================================================
    // NORMALIZATION UI CLASS
    // ===========================================================================

    const NormalizationUI = {
        /**
         * Initialize all inputs with data-normalize attribute
         */
        initAll: function() {
            const inputs = document.querySelectorAll('[data-normalize]');
            inputs.forEach(input => {
                const type = input.dataset.normalize;
                this.enhanceInput(input, type);
            });
            console.log(`[NormalizationUI] Enhanced ${inputs.length} inputs`);
        },

        /**
         * Enhance an input with normalization display
         *
         * @param {HTMLElement} input - The input element
         * @param {string} type - The normalization type
         */
        enhanceInput: function(input, type) {
            if (!input || input._normalizationEnhanced) return;

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'normalization-wrapper';
            wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';

            // Create hint element
            const hint = document.createElement('div');
            hint.className = 'normalization-hint';
            hint.style.cssText = `
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 12px;
                color: #6b7280;
                pointer-events: none;
                transition: opacity 0.2s;
                opacity: 0;
            `;

            // Wrap input
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            wrapper.appendChild(hint);

            // Adjust input padding
            input.style.paddingRight = '120px';

            // Debounce timer
            let debounceTimer = null;

            // Input handler
            const handleInput = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const value = input.value.trim();

                    if (!value) {
                        hint.style.opacity = '0';
                        hint.textContent = '';
                        return;
                    }

                    // Client-side normalization for instant feedback
                    const normalizer = ClientNormalizers[type];
                    if (normalizer) {
                        const result = normalizer(value);
                        if (result) {
                            hint.textContent = `= ${result.display}`;
                            hint.style.opacity = '1';
                            hint.style.color = result.confidence >= 0.9 ? '#059669' : '#d97706';
                            input._normalizedValue = result;
                        } else {
                            hint.textContent = 'Invalid';
                            hint.style.opacity = '1';
                            hint.style.color = '#dc2626';
                            input._normalizedValue = null;
                        }
                    }
                }, 150);
            };

            input.addEventListener('input', handleInput);
            input.addEventListener('focus', handleInput);
            input.addEventListener('blur', () => {
                // Verify with backend on blur for authoritative validation
                this.verifyWithBackend(input, type);
            });

            input._normalizationEnhanced = true;
            input._normalizationType = type;
        },

        /**
         * Verify normalization with backend (authoritative)
         */
        verifyWithBackend: async function(input, type) {
            const value = input.value.trim();
            if (!value) return;

            try {
                const result = await this.normalize(value, type);
                if (result && input._normalizedValue) {
                    // Compare with client-side result
                    if (result.normalized !== input._normalizedValue.normalized) {
                        console.warn('[NormalizationUI] Client/server mismatch:', {
                            client: input._normalizedValue.normalized,
                            server: result.normalized
                        });
                    }
                    input._normalizedValue = result;
                }
            } catch (err) {
                console.error('[NormalizationUI] Backend verification failed:', err);
            }
        },

        /**
         * Normalize a value (calls backend API)
         *
         * @param {string} text - Text to normalize
         * @param {string} type - Normalization type hint
         * @returns {Promise<Object>} Normalization result
         */
        normalize: async function(text, type) {
            try {
                const response = await fetch(`${API_BASE}/normalize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, hint: type })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                console.error('[NormalizationUI] API error:', err);
                // Fall back to client-side
                const normalizer = ClientNormalizers[type];
                return normalizer ? normalizer(text) : null;
            }
        },

        /**
         * Check if two values are equivalent
         *
         * @param {string} text1 - First value
         * @param {string} text2 - Second value
         * @param {string} type - Value type
         * @returns {Promise<boolean>}
         */
        areEquivalent: async function(text1, text2, type) {
            try {
                const response = await fetch(`${API_BASE}/normalize/equivalent?v1=${encodeURIComponent(text1)}&v2=${encodeURIComponent(text2)}&type=${type}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                return data.equivalent;
            } catch (err) {
                console.error('[NormalizationUI] Equivalence check error:', err);
                // Fall back to client-side comparison
                const normalizer = ClientNormalizers[type];
                if (!normalizer) return false;
                const r1 = normalizer(text1);
                const r2 = normalizer(text2);
                return r1 && r2 && r1.normalized === r2.normalized;
            }
        },

        /**
         * Batch normalize multiple values
         *
         * @param {Array} items - Array of {text, hint} objects
         * @returns {Promise<Array>}
         */
        normalizeBatch: async function(items) {
            try {
                const response = await fetch(`${API_BASE}/normalize/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                console.error('[NormalizationUI] Batch normalize error:', err);
                // Fall back to client-side
                return items.map(item => {
                    const normalizer = ClientNormalizers[item.hint];
                    return {
                        input: item,
                        result: normalizer ? normalizer(item.text) : null
                    };
                });
            }
        },

        /**
         * Get normalization statistics (admin)
         */
        getStats: async function() {
            try {
                const response = await fetch(`${API_BASE}/admin/normalize/stats`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                console.error('[NormalizationUI] Stats error:', err);
                return null;
            }
        },

        /**
         * Get failed normalizations (admin)
         */
        getFailures: async function(limit = 50) {
            try {
                const response = await fetch(`${API_BASE}/admin/normalize/failures?limit=${limit}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                console.error('[NormalizationUI] Failures error:', err);
                return [];
            }
        }
    };

    // ===========================================================================
    // DEVELOPER DASHBOARD COMPONENT
    // ===========================================================================

    const NormalizationTester = {
        /**
         * Initialize the tester UI
         * @param {string} containerId - Container element ID
         */
        init: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = `
                <div class="normalization-tester" style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto;">
                    <h2 style="margin-bottom: 20px;">Normalization Tester</h2>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Input Value</label>
                            <input type="text" id="norm-test-input" placeholder="e.g., $1,200 or Feb 4, 2026"
                                   style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Type Hint</label>
                            <select id="norm-test-type" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                <option value="">Auto-detect</option>
                                <option value="currency">Currency</option>
                                <option value="date">Date</option>
                                <option value="number">Number</option>
                                <option value="duration">Duration</option>
                                <option value="boolean">Boolean</option>
                            </select>
                        </div>
                    </div>

                    <button id="norm-test-btn" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px;">
                        Test Normalization
                    </button>

                    <div id="norm-test-result" style="display: none; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                        <h3 style="margin-top: 0; margin-bottom: 15px;">Result</h3>
                        <div id="norm-test-result-content"></div>
                    </div>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

                    <h3>Equivalence Checker</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Value 1</label>
                            <input type="text" id="norm-equiv-v1" placeholder="$1,200"
                                   style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Value 2</label>
                            <input type="text" id="norm-equiv-v2" placeholder="1200 dollars"
                                   style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Type</label>
                            <select id="norm-equiv-type" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                                <option value="currency">Currency</option>
                                <option value="date">Date</option>
                                <option value="number">Number</option>
                                <option value="duration">Duration</option>
                                <option value="boolean">Boolean</option>
                            </select>
                        </div>
                    </div>

                    <button id="norm-equiv-btn" style="background: #059669; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px;">
                        Check Equivalence
                    </button>

                    <div id="norm-equiv-result" style="display: none; padding: 15px; border-radius: 8px;"></div>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

                    <h3>Statistics</h3>
                    <button id="norm-stats-btn" style="background: #6366f1; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px;">
                        Load Statistics
                    </button>
                    <div id="norm-stats-result" style="display: none;"></div>
                </div>
            `;

            // Bind events
            document.getElementById('norm-test-btn').addEventListener('click', () => this.runTest());
            document.getElementById('norm-equiv-btn').addEventListener('click', () => this.runEquivCheck());
            document.getElementById('norm-stats-btn').addEventListener('click', () => this.loadStats());

            // Enter key support
            document.getElementById('norm-test-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.runTest();
            });
        },

        runTest: async function() {
            const input = document.getElementById('norm-test-input').value;
            const type = document.getElementById('norm-test-type').value || null;
            const resultDiv = document.getElementById('norm-test-result');
            const contentDiv = document.getElementById('norm-test-result-content');

            if (!input.trim()) {
                alert('Please enter a value to normalize');
                return;
            }

            resultDiv.style.display = 'block';
            contentDiv.innerHTML = '<p style="color: #6b7280;">Processing...</p>';

            const result = await NormalizationUI.normalize(input, type);

            if (result) {
                contentDiv.innerHTML = `
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 10px;">
                        <div style="font-weight: 500; color: #6b7280;">Original:</div>
                        <div><code>${escapeHtml(result.original)}</code></div>

                        <div style="font-weight: 500; color: #6b7280;">Normalized:</div>
                        <div><code style="background: #ecfdf5; color: #059669; padding: 2px 6px; border-radius: 4px;">${escapeHtml(String(result.normalized))}</code></div>

                        <div style="font-weight: 500; color: #6b7280;">Display:</div>
                        <div>${result.display || result.normalized}</div>

                        <div style="font-weight: 500; color: #6b7280;">Type:</div>
                        <div><span style="background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${result.type}</span></div>

                        <div style="font-weight: 500; color: #6b7280;">Confidence:</div>
                        <div>
                            <div style="background: #e5e7eb; border-radius: 4px; height: 8px; width: 100px; display: inline-block; vertical-align: middle;">
                                <div style="background: ${result.confidence >= 0.9 ? '#059669' : '#d97706'}; height: 100%; width: ${result.confidence * 100}%; border-radius: 4px;"></div>
                            </div>
                            <span style="margin-left: 8px;">${(result.confidence * 100).toFixed(0)}%</span>
                        </div>

                        <div style="font-weight: 500; color: #6b7280;">Method:</div>
                        <div><code style="font-size: 12px;">${result.method}</code></div>
                    </div>
                `;
            } else {
                contentDiv.innerHTML = `
                    <div style="color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 6px;">
                        <strong>Failed to normalize.</strong> The value could not be recognized as any supported type.
                    </div>
                `;
            }
        },

        runEquivCheck: async function() {
            const v1 = document.getElementById('norm-equiv-v1').value;
            const v2 = document.getElementById('norm-equiv-v2').value;
            const type = document.getElementById('norm-equiv-type').value;
            const resultDiv = document.getElementById('norm-equiv-result');

            if (!v1.trim() || !v2.trim()) {
                alert('Please enter both values');
                return;
            }

            const isEquiv = await NormalizationUI.areEquivalent(v1, v2, type);

            resultDiv.style.display = 'block';
            if (isEquiv) {
                resultDiv.style.background = '#ecfdf5';
                resultDiv.style.color = '#065f46';
                resultDiv.innerHTML = `<strong>EQUIVALENT</strong> - "${v1}" and "${v2}" normalize to the same ${type} value.`;
            } else {
                resultDiv.style.background = '#fef2f2';
                resultDiv.style.color = '#991b1b';
                resultDiv.innerHTML = `<strong>NOT EQUIVALENT</strong> - "${v1}" and "${v2}" normalize to different values.`;
            }
        },

        loadStats: async function() {
            const resultDiv = document.getElementById('norm-stats-result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<p style="color: #6b7280;">Loading statistics...</p>';

            const stats = await NormalizationUI.getStats();

            if (stats) {
                const successRate = (stats.success_rate * 100).toFixed(1);
                resultDiv.innerHTML = `
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center;">
                            <div>
                                <div style="font-size: 24px; font-weight: 600; color: #111827;">${stats.total_normalizations}</div>
                                <div style="font-size: 12px; color: #6b7280;">Total</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 600; color: #059669;">${stats.successful}</div>
                                <div style="font-size: 12px; color: #6b7280;">Successful</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 600; color: #dc2626;">${stats.failed}</div>
                                <div style="font-size: 12px; color: #6b7280;">Failed</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 600; color: #2563eb;">${successRate}%</div>
                                <div style="font-size: 12px; color: #6b7280;">Success Rate</div>
                            </div>
                        </div>

                        <h4 style="margin-top: 20px; margin-bottom: 10px;">By Type</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${Object.entries(stats.by_type || {}).map(([type, count]) => `
                                <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 12px; font-size: 13px;">
                                    ${type}: ${count}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = '<p style="color: #dc2626;">Failed to load statistics</p>';
            }
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===========================================================================
    // EXPORTS
    // ===========================================================================

    window.NormalizationUI = NormalizationUI;
    window.NormalizationTester = NormalizationTester;
    window.ClientNormalizers = ClientNormalizers;

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NormalizationUI.initAll());
    } else {
        NormalizationUI.initAll();
    }

})(window);
