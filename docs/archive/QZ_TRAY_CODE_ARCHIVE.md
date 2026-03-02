# QZ Tray Code Archive

**Removed from:** `labels.html`
**Date removed:** 2026-03-02
**Reason:** The farm uses the BarTender/Seagull driver with the TSC TTP-247 thermal printer. QZ Tray was unused complexity that added confusion to the print workflow. The current setup generates a PDF at exact label dimensions (4"x1" field tray, 1"x4" pot tag) and prints via the system print dialog with the TTP-247 selected.

**Can be restored if needed.** The code below was the complete QZ Tray integration that provided:
- Auto-detection of QZ Tray on page load
- Direct-to-printer printing (no browser print dialog)
- Printer selection dropdown
- Label alignment offset adjustment (X/Y in points)
- Test label printing
- Setup wizard with installation instructions
- Fallback to PDF if QZ Tray was not available

If the farm ever switches to QZ Tray for direct printing, this code can be re-added to `labels.html`.

---

## Removed: QZ Tray Script Tag (was line 11)

```html
<script src="https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js" async></script>
```

## Removed: QZ Tray CSS Styles (was lines 1025-1052)

```css
/* QZ Tray Printer Status & Settings */
.qz-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.qz-status-badge.connected { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.qz-status-badge.disconnected { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
.qz-status-badge.connecting { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
.qz-status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

.printer-settings-panel {
    background: var(--bg-light);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem;
    margin-top: 0.5rem;
}
.printer-settings-panel label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px; }
.printer-settings-panel select { width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-size: 0.85rem; }
.printer-link { display: inline-block; font-size: 0.8rem; color: var(--primary); cursor: pointer; margin-top: 6px; }
.printer-link:hover { text-decoration: underline; }
```

## Removed: Printer Settings HTML Panel (was lines 1238-1257)

```html
<!-- Printer Settings (thermal labels) -->
<div class="panel-section" id="printerSettingsSection" style="display: none;">
    <h3 class="panel-title"><i class="fas fa-print"></i> Thermal Printer</h3>
    <div class="printer-settings-panel">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span class="qz-status-badge disconnected" id="qzStatusBadge" onclick="QZPrint.connect().catch(function(e){showToast(e.message)})">
                <span class="qz-status-dot"></span>
                <span id="qzStatusText">Not Connected</span>
            </span>
        </div>
        <div id="printerSelectGroup" style="display: none;">
            <label>Printer</label>
            <select class="form-control" id="qzPrinterSelect" onchange="QZPrint.selectPrinter(this.value)"></select>
        </div>
        <div style="margin-top: 8px; display: flex; gap: 12px; flex-wrap: wrap;">
            <span class="printer-link" onclick="showSetupWizard()"><i class="fas fa-question-circle"></i> Setup Guide</span>
            <span class="printer-link" onclick="showFormatAdjust()"><i class="fas fa-sliders-h"></i> Adjust Alignment</span>
        </div>
    </div>
</div>
```

## Removed: QZPrint IIFE Module (was lines 2673-2832)

```javascript
// ============ QZ TRAY DIRECT PRINTING MODULE ============
var QZPrint = (function() {
    var _connected = false, _printer = null, _printers = [], _connecting = false, _initialized = false;

    function _fmtKey(lt) { return 'qzFmt_' + (lt || 'default'); }
    function getFormatSettings(lt) {
        try { var s = localStorage.getItem(_fmtKey(lt)); if (s) return JSON.parse(s); } catch(e) {}
        return { offsetX: 0, offsetY: 0 };
    }
    function saveFormatSettings(lt, settings) {
        try { localStorage.setItem(_fmtKey(lt), JSON.stringify(settings)); } catch(e) {}
    }
    function getSavedPrinter() { try { return localStorage.getItem('qzPrinter') || null; } catch(e) { return null; } }
    function savePrinter(name) { try { localStorage.setItem('qzPrinter', name); } catch(e) {} }

    function isAvailable() { return typeof qz !== 'undefined' && typeof qz.websocket !== 'undefined'; }
    function isConnected() { return _connected && isAvailable() && qz.websocket.isActive(); }

    function connect() { /* ... full connect logic ... */ }
    function disconnect() { /* ... */ }
    function findPrinters() { /* ... */ }
    function selectPrinter(name) { _printer = name; savePrinter(name); }
    function printPDF(pdfBase64, widthIn, heightIn, labelType) { /* ... */ }
    function printTestLabel(labelType) { /* ... */ }
    function _updateStatus(status) { /* ... */ }
    function _updatePrinterDropdown() { /* ... */ }

    return {
        connect, disconnect, isConnected, isAvailable,
        findPrinters, selectPrinter,
        getPrinters, getPrinter,
        printPDF, printTestLabel,
        getFormatSettings, saveFormatSettings
    };
})();
```

## Removed: PDF Builders for QZ Tray (was lines 2834-2924)

```javascript
// ============ PDF BUILDERS (return Promise<base64>) ============
function buildFieldTrayPDF(labelsToprint) { /* ... returns base64 PDF ... */ }
function buildPotTagPDF(labelsToprint) { /* ... returns base64 PDF ... */ }
```

## Removed: Setup Wizard & Format Adjustment (was lines 2926-2998)

```javascript
// ============ SETUP WIZARD & FORMAT ADJUSTMENT ============
function showSetupWizard() { /* ... QZ Tray installation guide modal ... */ }
function showFormatAdjust() { /* ... X/Y offset sliders modal ... */ }
function saveFmtSettings() { /* ... save offset to localStorage ... */ }
function saveFmtAndTest() { /* ... save then print test label via QZ Tray ... */ }
```

## Removed: executePrintViaQZTray (was lines 3016-3075)

```javascript
// QZ Tray direct print -- generates PDF then sends to thermal printer, no browser dialog
function executePrintViaQZTray() { /* ... */ }
```

## Removed: QZ Tray-aware openPrintPreview Override (was lines 3881-3961)

Replaced with a simpler version that shows label count + TTP-247 troubleshooting guide (no QZ Tray connected/disconnected logic).

## Removed: QZ Tray Initialization IIFE (was lines 3962-3982)

```javascript
// ============ QZ TRAY INITIALIZATION ============
(function() {
    // Show/hide printer settings panel when switching to thermal label types
    var _origSwitch = switchLabelType;
    switchLabelType = function(type) {
        _origSwitch(type);
        var panel = document.getElementById('printerSettingsSection');
        if (panel) panel.style.display = (type === 'potTag' || type === 'fieldTray') ? 'block' : 'none';
    };

    // Auto-connect to QZ Tray silently on page load
    if (typeof qz !== 'undefined') {
        setTimeout(function() {
            QZPrint.connect().then(function() {
                console.log('[QZ Tray] Connected. Printer:', QZPrint.getPrinter());
            }).catch(function() {
                console.log('[QZ Tray] Not running -- PDF fallback active');
            });
        }, 1500);
    }
})();
```
