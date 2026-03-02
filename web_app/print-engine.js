/**
 * TinySeedPrint — Shared Print Engine for Tiny Seed OS
 *
 * Standardizes ALL printing: labels (jsPDF), sheets (jsPDF), dashboards (@media print).
 * Lazy-loads jsPDF and qrcode only when needed.
 * Preview modal is in-page (never blocked by popup blocker).
 */
(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // LABEL FORMAT REGISTRY (72pt = 1 inch)
    // ═══════════════════════════════════════════════════════════════
    var LABEL_FORMATS = {
        fieldTray:      { w: 288, h: 72,  orient: 'landscape', desc: '4" x 1" thermal' },
        potTag:         { w: 72,  h: 288, orient: 'portrait',  desc: '1" x 4" pot tag' },
        seedPacket:     { w: 144, h: 216, orient: 'portrait',  desc: '2" x 3" seed label' },
        marketSign:     { w: 612, h: 792, orient: 'portrait',  desc: '8.5" x 11" (6 signs)' },
        csaLabel:       { w: 288, h: 216, orient: 'landscape', desc: '4" x 3" CSA label' },
        wholesaleLabel: { w: 288, h: 144, orient: 'landscape', desc: '4" x 2" wholesale' },
        bedMarker:      { w: 288, h: 432, orient: 'portrait',  desc: '4" x 6" bed sign' },
        letterFull:     { w: 612, h: 792, orient: 'portrait',  desc: '8.5" x 11" full page' }
    };

    // CDN URLs for lazy-loaded libraries
    var CDN = {
        jspdf:  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
        qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'
    };

    // Library cache
    var _libs = {};

    // ═══════════════════════════════════════════════════════════════
    // LAZY LOADING
    // ═══════════════════════════════════════════════════════════════
    function _ensureLib(name) {
        return new Promise(function(resolve, reject) {
            // Already cached
            if (_libs[name]) { resolve(_libs[name]); return; }

            // Check if loaded by another script tag
            if (name === 'jspdf' && window.jspdf) {
                _libs.jspdf = window.jspdf;
                resolve(window.jspdf);
                return;
            }
            if (name === 'qrcode' && window.QRCode) {
                _libs.qrcode = window.QRCode;
                resolve(window.QRCode);
                return;
            }

            var url = CDN[name];
            if (!url) { reject(new Error('Unknown library: ' + name)); return; }

            var script = document.createElement('script');
            script.src = url;
            script.onload = function() {
                if (name === 'jspdf') _libs.jspdf = window.jspdf;
                else if (name === 'qrcode') _libs.qrcode = window.QRCode;
                resolve(_libs[name]);
            };
            script.onerror = function() {
                reject(new Error('Failed to load ' + name + ' library. Check your internet connection and try again.'));
            };
            document.head.appendChild(script);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // QR CODE GENERATION
    // ═══════════════════════════════════════════════════════════════
    function qr(data, options) {
        options = options || {};
        var size = options.size || 150;
        var margin = options.margin !== undefined ? options.margin : 0;
        var errorCorrection = options.errorCorrection || 'M';

        return _ensureLib('qrcode').then(function(QRCode) {
            if (options.format === 'canvas') {
                var canvas = document.createElement('canvas');
                return new Promise(function(resolve, reject) {
                    QRCode.toCanvas(canvas, String(data), {
                        width: size, margin: margin, errorCorrectionLevel: errorCorrection
                    }, function(err) {
                        if (err) reject(err); else resolve(canvas);
                    });
                });
            }
            // Default: data URL for jsPDF addImage
            return new Promise(function(resolve, reject) {
                var canvas = document.createElement('canvas');
                QRCode.toCanvas(canvas, String(data), {
                    width: size, margin: margin, errorCorrectionLevel: errorCorrection
                }, function(err) {
                    if (err) reject(err); else resolve(canvas.toDataURL('image/png'));
                });
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // LABEL RENDERERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Field Tray label: 4" x 1" landscape
     * Layout: QR left | Crop/Variety/Batch/Dates center | Tray info right
     */
    function _renderFieldTray(doc, label, qrImg, fmt) {
        var W = fmt.w, H = fmt.h;

        // QR code on left
        var qrSz = 61;
        if (qrImg) {
            doc.addImage(qrImg, 'PNG', 6, (H - qrSz) / 2, qrSz, qrSz);
        }

        var tx = 75; // text start after QR + gap
        var rx = W - 6; // right edge

        // Crop - bold 13pt
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(label.crop || '', tx, 17);

        // Variety - 9pt
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 51, 51);
        doc.text(label.variety || '', tx, 29);

        // Batch - 7pt monospace
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(85, 85, 85);
        var batchText = (label.batchNumber || label.batchId || '');
        if (label.trayNumber) batchText += ' T' + label.trayNumber;
        doc.text(batchText, tx, 40);

        // Dates - 7pt
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(68, 68, 68);
        var ds = 'Sow: ' + _fmtDate(label.seedDate || label.sowDate);
        ds += '  ->  TP: ' + _fmtDate(label.transplantDate);
        if (label.field) ds += '  @  ' + label.field;
        doc.text(ds, tx, 51);

        // Right column - tray info
        var tsd = _fmtTraySize(label.cellsPerTray, label.paperpotSpacing);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(tsd, rx, 19, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(68, 68, 68);
        var trayStr = 'Tray ' + (label.trayNumber || '') + '/' + (label.trays || '');
        doc.text(trayStr, rx, 33, { align: 'right' });

        if (label.field) {
            doc.setFontSize(7);
            doc.setTextColor(85, 85, 85);
            doc.text(label.field, rx, 45, { align: 'right' });
        }
    }

    /**
     * Pot Tag label: 1" x 4.5" portrait
     * Layout: Crop/Variety top | Farm name with lines | Sow date | Batch | QR | Soil marker bottom
     */
    function _renderPotTag(doc, label, qrImg, fmt) {
        var W = fmt.w, H = fmt.h;
        var cx = W / 2;
        var y = 14;

        // Crop - bold 11pt, centered, may wrap
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        var cropLines = doc.splitTextToSize(label.crop || '', 62);
        doc.text(cropLines, cx, y, { align: 'center' });
        y += cropLines.length * 13 + 3;

        // Variety - 8pt
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 51, 51);
        var varLines = doc.splitTextToSize(label.variety || '', 62);
        doc.text(varLines, cx, y, { align: 'center' });
        y += varLines.length * 10 + 8;

        // Farm name between lines
        doc.setDrawColor(153, 153, 153);
        doc.setLineWidth(0.5);
        doc.line(5, y, W - 5, y);
        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(85, 85, 85);
        doc.text('TINY SEED FARM', cx, y, { align: 'center' });
        y += 6;
        doc.line(5, y, W - 5, y);
        y += 12;

        // Sow date - 7pt
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(68, 68, 68);
        doc.text('Sown: ' + _fmtDate(label.seedDate || label.sowDate), cx, y, { align: 'center' });
        y += 11;

        // Batch - 6pt mono
        doc.setFont('courier', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(102, 102, 102);
        doc.text(label.batchNumber || label.batchId || '', cx, y, { align: 'center' });
        y += 14;

        // QR code - centered
        var qrSz = 50;
        if (qrImg) {
            doc.addImage(qrImg, 'PNG', (W - qrSz) / 2, y, qrSz, qrSz);
        }

        // Soil marker at bottom
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(5, H - 14, W - 5, H - 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(187, 187, 187);
        doc.text('insert in soil', cx, H - 6, { align: 'center' });
    }

    /**
     * Seed Packet label: 2" x 3" portrait
     * Layout: Crop/Variety | Lot info | Supplier | QR code
     */
    function _renderSeedPacket(doc, label, qrImg, fmt) {
        var W = fmt.w, H = fmt.h;
        var cx = W / 2;
        var y = 16;

        // Crop - bold 14pt
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        var cropLines = doc.splitTextToSize(label.crop || '', W - 20);
        doc.text(cropLines, cx, y, { align: 'center' });
        y += cropLines.length * 16 + 4;

        // Variety - 10pt
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        var varLines = doc.splitTextToSize(label.variety || '', W - 20);
        doc.text(varLines, cx, y, { align: 'center' });
        y += varLines.length * 12 + 8;

        // Separator
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(10, y, W - 10, y);
        y += 10;

        // Lot number
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(68, 68, 68);
        doc.text('Lot: ' + (label.seedLotId || label.lotNumber || label.batchNumber || ''), cx, y, { align: 'center' });
        y += 12;

        // Supplier
        if (label.supplier) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(label.supplier, cx, y, { align: 'center' });
            y += 10;
        }

        // Organic badge
        if (label.organic) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(34, 139, 34);
            doc.text('ORGANIC', cx, y, { align: 'center' });
            y += 10;
        }

        // Germ rate + expiration
        var info = [];
        if (label.germRate) info.push('Germ: ' + label.germRate + '%');
        if (label.expiration) info.push('Exp: ' + _fmtDate(label.expiration));
        if (info.length) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(120, 120, 120);
            doc.text(info.join('  |  '), cx, y, { align: 'center' });
            y += 12;
        }

        // QR code
        var qrSz = 55;
        if (qrImg) {
            doc.addImage(qrImg, 'PNG', (W - qrSz) / 2, y, qrSz, qrSz);
        }

        // Farm name at bottom
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(170, 170, 170);
        doc.text('TINY SEED FARM', cx, H - 6, { align: 'center' });
    }

    /**
     * Market Sign: 8.5" x 11" letter page, 6 signs per page (2×3 grid)
     * Each sign is ~4" x 5" with crop name, variety, price, category color
     */
    function _renderMarketSigns(doc, signs, qrImgs, fmt) {
        var W = fmt.w, H = fmt.h;
        var cols = 2, rows = 3;
        var cellW = (W - 36) / cols;  // 36pt total margin
        var cellH = (H - 36) / rows;
        var mx = 18, my = 18; // page margins

        for (var i = 0; i < signs.length; i++) {
            var pageIdx = Math.floor(i / 6);
            var posOnPage = i % 6;
            if (posOnPage === 0 && i > 0) doc.addPage([W, H], 'portrait');

            var col = posOnPage % cols;
            var row = Math.floor(posOnPage / cols);
            var x = mx + col * cellW;
            var y = my + row * cellH;

            var sign = signs[i];
            var catColor = _categoryColor(sign.category);

            // Card background
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(1);
            doc.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 4, 4, 'FD');

            // Category color stripe at top
            doc.setFillColor(catColor.r, catColor.g, catColor.b);
            doc.rect(x + 2, y + 2, cellW - 4, 8, 'F');

            // Crop name - large bold
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            var cropLines = doc.splitTextToSize(sign.crop || '', cellW - 20);
            doc.text(cropLines, x + cellW / 2, y + 30, { align: 'center' });

            // Variety
            var varY = y + 30 + cropLines.length * 24 + 4;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.setTextColor(80, 80, 80);
            doc.text(sign.variety || '', x + cellW / 2, varY, { align: 'center' });

            // Price
            if (sign.price) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(28);
                doc.setTextColor(0, 0, 0);
                doc.text(sign.price, x + cellW / 2, y + cellH - 30, { align: 'center' });
            }

            // Unit (per bunch, per lb, each)
            if (sign.unit) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(120, 120, 120);
                doc.text(sign.unit, x + cellW / 2, y + cellH - 16, { align: 'center' });
            }
        }
    }

    /**
     * CSA Label: 4" x 3" landscape
     * Layout: Customer name, items list, pickup info
     */
    function _renderCSALabel(doc, label, qrImg, fmt) {
        var W = fmt.w, H = fmt.h;
        var y = 14;

        // Customer name - large bold
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(label.customerName || 'CSA Member', 10, y);
        y += 20;

        // Separator
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(10, y, W - 10, y);
        y += 12;

        // Items list
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        var items = label.items || [];
        for (var i = 0; i < items.length && y < H - 40; i++) {
            var item = items[i];
            var text = (item.quantity || '') + ' ' + (item.product || item.name || '');
            doc.text(text, 14, y);
            y += 12;
        }

        // Pickup info at bottom
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(label.pickupLocation || '', 10, H - 20);
        doc.setFont('helvetica', 'normal');
        doc.text(label.pickupDate || '', 10, H - 10);

        // QR on right side
        if (qrImg) {
            doc.addImage(qrImg, 'PNG', W - 60, 10, 50, 50);
        }
    }

    /**
     * Wholesale Label: 4" x 2" landscape
     * Layout: Customer/order info + items
     */
    function _renderWholesaleLabel(doc, label, qrImg, fmt) {
        var W = fmt.w, H = fmt.h;

        // Customer name
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(label.customerName || '', 10, 18);

        // Order ID
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Order: ' + (label.orderId || ''), 10, 28);

        // Items
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        var items = label.items || [];
        var y = 42;
        for (var i = 0; i < items.length && y < H - 10; i++) {
            doc.text((items[i].quantity || '') + 'x ' + (items[i].product || items[i].name || ''), 10, y);
            y += 11;
        }

        // QR on right
        if (qrImg) {
            doc.addImage(qrImg, 'PNG', W - 55, 8, 45, 45);
        }

        // Date at bottom right
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(label.date || _today(), W - 10, H - 6, { align: 'right' });
    }

    /**
     * Bed Marker: 4" x 6" portrait
     * Layout: Bed ID large, crop/variety, planting info, QR
     */
    function _renderBedMarker(doc, label, qrImg, fmt) {
        var W = fmt.w, H = fmt.h;
        var cx = W / 2;

        // Bed ID - very large
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.text(label.bedId || label.bed || '', cx, 50, { align: 'center' });

        // Crop
        doc.setFontSize(20);
        doc.text(label.crop || '', cx, 90, { align: 'center' });

        // Variety
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text(label.variety || '', cx, 115, { align: 'center' });

        // Planting info
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        var info = [];
        if (label.plantDate) info.push('Planted: ' + _fmtDate(label.plantDate));
        if (label.spacing) info.push('Spacing: ' + label.spacing);
        if (label.rows) info.push('Rows: ' + label.rows);
        if (info.length) {
            doc.text(info.join('  |  '), cx, 140, { align: 'center' });
        }

        // QR code centered
        var qrSz = 80;
        if (qrImg) {
            doc.addImage(qrImg, 'PNG', (W - qrSz) / 2, 170, qrSz, qrSz);
        }

        // Farm name at bottom
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('TINY SEED FARM', cx, H - 15, { align: 'center' });
    }

    // Renderer dispatch
    var _renderers = {
        fieldTray: _renderFieldTray,
        potTag: _renderPotTag,
        seedPacket: _renderSeedPacket,
        marketSign: null, // special: multi-per-page
        csaLabel: _renderCSALabel,
        wholesaleLabel: _renderWholesaleLabel,
        bedMarker: _renderBedMarker
    };

    // ═══════════════════════════════════════════════════════════════
    // LABEL PDF GENERATION
    // ═══════════════════════════════════════════════════════════════
    function _generateLabelPDF(format, data, onProgress) {
        var fmt = LABEL_FORMATS[format];
        if (!fmt) return Promise.reject(new Error('Unknown label format: ' + format));

        return _ensureLib('jspdf').then(function(jspdf) {
            // Generate QR codes in chunks
            var CHUNK = 50;
            var qrImages = [];

            function genChunk(startIdx) {
                var chunk = data.slice(startIdx, startIdx + CHUNK);
                var promises = chunk.map(function(item) {
                    var qrData = item.qrData || item.batchNumber || item.batchId || item.seedLotId || '';
                    if (!qrData) return Promise.resolve(null);
                    return qr(qrData, { size: 164, margin: 0 }).catch(function() { return null; });
                });
                return Promise.all(promises).then(function(results) {
                    qrImages = qrImages.concat(results);
                    if (onProgress) onProgress(Math.min(startIdx + CHUNK, data.length), data.length);
                    if (startIdx + CHUNK < data.length) {
                        // Yield to UI thread
                        return new Promise(function(r) { setTimeout(r, 0); }).then(function() {
                            return genChunk(startIdx + CHUNK);
                        });
                    }
                });
            }

            return genChunk(0).then(function() {
                // Special case: market signs (multiple per page)
                if (format === 'marketSign') {
                    var doc = new jspdf.jsPDF({ unit: 'pt', format: [fmt.w, fmt.h], orientation: fmt.orient });
                    _renderMarketSigns(doc, data, qrImages, fmt);
                    return doc.output('blob');
                }

                // Standard: one label per page
                var doc = new jspdf.jsPDF({
                    unit: 'pt',
                    format: [Math.min(fmt.w, fmt.h), Math.max(fmt.w, fmt.h)],
                    orientation: fmt.orient
                });

                var renderer = _renderers[format];
                if (!renderer) return Promise.reject(new Error('No renderer for format: ' + format));

                data.forEach(function(label, i) {
                    if (i > 0) {
                        doc.addPage(
                            [Math.min(fmt.w, fmt.h), Math.max(fmt.w, fmt.h)],
                            fmt.orient
                        );
                    }
                    renderer(doc, label, qrImages[i], fmt);
                });

                return doc.output('blob');
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SHEET (STRUCTURED DOCUMENT) PDF GENERATION
    // ═══════════════════════════════════════════════════════════════
    function _generateSheetPDF(options) {
        return _ensureLib('jspdf').then(function(jspdf) {
            var orient = options.orientation || 'portrait';
            var doc = new jspdf.jsPDF({ unit: 'pt', format: 'letter', orientation: orient });
            var W = orient === 'landscape' ? 792 : 612;
            var H = orient === 'landscape' ? 612 : 792;
            var mx = 36, my = 36;
            var contentW = W - mx * 2;
            var y = my;
            var pageNum = 1;

            function newPage() {
                doc.addPage('letter', orient);
                pageNum++;
                y = my;
                _drawHeader();
            }

            function checkPage(needed) {
                if (y + needed > H - 50) { // 50pt for footer
                    _drawFooter();
                    newPage();
                }
            }

            function _drawHeader() {
                // Title
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(options.title || 'Report', mx, y);
                y += 16;

                // Subtitle
                if (options.subtitle) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text(options.subtitle, mx, y);
                    y += 14;
                }

                // Line
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.line(mx, y, W - mx, y);
                y += 12;
            }

            function _drawFooter() {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text('Tiny Seed Farm — ' + _today(), mx, H - 15);
                doc.text('Page ' + pageNum, W - mx, H - 15, { align: 'right' });
            }

            // Start
            _drawHeader();

            // Columns + rows (table)
            if (options.columns && options.rows) {
                var cols = options.columns;
                var rows = options.rows;

                // Auto-calculate column widths if not provided
                var totalSpecifiedWidth = 0;
                var unspecifiedCols = 0;
                cols.forEach(function(c) {
                    if (c.width) totalSpecifiedWidth += c.width;
                    else unspecifiedCols++;
                });
                var remainingW = contentW - totalSpecifiedWidth;
                var autoW = unspecifiedCols > 0 ? remainingW / unspecifiedCols : 0;
                cols.forEach(function(c) { if (!c.width) c.width = autoW; });

                // Group rows if needed
                var groups = [];
                if (options.groupBy) {
                    var groupMap = {};
                    rows.forEach(function(r) {
                        var key = r[options.groupBy] || 'Other';
                        if (!groupMap[key]) groupMap[key] = [];
                        groupMap[key].push(r);
                    });
                    Object.keys(groupMap).forEach(function(k) {
                        groups.push({ title: k, rows: groupMap[k] });
                    });
                } else {
                    groups.push({ title: null, rows: rows });
                }

                groups.forEach(function(group) {
                    // Group header
                    if (group.title) {
                        checkPage(30);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(11);
                        doc.setTextColor(0, 0, 0);
                        doc.text(group.title, mx, y);
                        y += 16;
                    }

                    // Table header
                    checkPage(20);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(mx, y - 10, contentW, 14, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(60, 60, 60);
                    var hx = mx;
                    cols.forEach(function(c) {
                        doc.text(c.label || c.key || '', hx + 3, y);
                        hx += c.width;
                    });
                    y += 8;

                    // Table rows
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(30, 30, 30);

                    group.rows.forEach(function(row) {
                        checkPage(14);
                        var rx = mx;
                        cols.forEach(function(c) {
                            var val = String(row[c.key] != null ? row[c.key] : '');
                            // Truncate if too wide
                            var maxChars = Math.floor(c.width / 4.5);
                            if (val.length > maxChars) val = val.substring(0, maxChars - 1) + '…';
                            doc.text(val, rx + 3, y);
                            rx += c.width;
                        });
                        y += 12;

                        // Light row separator
                        doc.setDrawColor(230, 230, 230);
                        doc.setLineWidth(0.2);
                        doc.line(mx, y - 4, W - mx, y - 4);
                    });

                    y += 8; // gap between groups
                });
            }

            // Additional sections (free-form text)
            if (options.sections) {
                options.sections.forEach(function(section) {
                    checkPage(30);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    doc.text(section.title || '', mx, y);
                    y += 14;

                    if (section.text) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(60, 60, 60);
                        var lines = doc.splitTextToSize(section.text, contentW);
                        lines.forEach(function(line) {
                            checkPage(12);
                            doc.text(line, mx, y);
                            y += 10;
                        });
                    }
                    y += 8;
                });
            }

            _drawFooter();
            return doc.output('blob');
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PREVIEW MODAL
    // ═══════════════════════════════════════════════════════════════
    var _previewUrl = null;

    function _showPreview(pdfBlob, options) {
        options = options || {};

        // Clean up previous blob URL
        if (_previewUrl) { URL.revokeObjectURL(_previewUrl); }
        _previewUrl = URL.createObjectURL(pdfBlob);

        var modal = document.getElementById('ts-print-preview');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ts-print-preview';
            modal.innerHTML =
                '<style>' +
                '#ts-print-preview { position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:none;flex-direction:column;background:rgba(0,0,0,0.85); }' +
                '#ts-print-preview.open { display:flex; }' +
                '.ts-pp-header { display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#1a1a2e;border-bottom:1px solid rgba(255,255,255,0.1); }' +
                '.ts-pp-title { color:#fff;font-size:1rem;font-weight:700;font-family:Inter,system-ui,sans-serif; }' +
                '.ts-pp-actions { display:flex;gap:8px; }' +
                '.ts-pp-btn { padding:8px 16px;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;min-height:40px;font-family:Inter,system-ui,sans-serif; }' +
                '.ts-pp-print { background:#22c55e;color:#fff; }' +
                '.ts-pp-print:hover { background:#16a34a; }' +
                '.ts-pp-dl { background:rgba(255,255,255,0.1);color:#fff; }' +
                '.ts-pp-dl:hover { background:rgba(255,255,255,0.2); }' +
                '.ts-pp-close { background:transparent;color:#aaa;font-size:1.5rem;padding:4px 12px;min-height:40px; }' +
                '.ts-pp-close:hover { color:#fff; }' +
                '.ts-pp-frame { flex:1;border:none;background:#333; }' +
                '</style>' +
                '<div class="ts-pp-header">' +
                    '<span class="ts-pp-title" id="ts-pp-title">Print Preview</span>' +
                    '<div class="ts-pp-actions">' +
                        '<button class="ts-pp-btn ts-pp-print" id="ts-pp-print-btn"><i class="fas fa-print" style="margin-right:6px"></i>Print</button>' +
                        '<button class="ts-pp-btn ts-pp-dl" id="ts-pp-dl-btn"><i class="fas fa-download" style="margin-right:6px"></i>Download PDF</button>' +
                        '<button class="ts-pp-btn ts-pp-close" id="ts-pp-close-btn">&times;</button>' +
                    '</div>' +
                '</div>' +
                '<iframe class="ts-pp-frame" id="ts-pp-frame"></iframe>';
            document.body.appendChild(modal);

            // Event: close
            document.getElementById('ts-pp-close-btn').addEventListener('click', _closePreview);
            // Event: Escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.classList.contains('open')) {
                    _closePreview();
                    e.preventDefault();
                }
            });
        }

        document.getElementById('ts-pp-title').textContent = options.title || 'Print Preview';
        document.getElementById('ts-pp-frame').src = _previewUrl;

        // Print button
        document.getElementById('ts-pp-print-btn').onclick = function() {
            var frame = document.getElementById('ts-pp-frame');
            try {
                frame.contentWindow.print();
            } catch (e) {
                // Cross-origin fallback: open in new tab
                window.open(_previewUrl, '_blank');
            }
        };

        // Download button
        document.getElementById('ts-pp-dl-btn').onclick = function() {
            _download(pdfBlob, options.filename || 'document.pdf');
        };

        modal.classList.add('open');
    }

    function _closePreview() {
        var modal = document.getElementById('ts-print-preview');
        if (modal) modal.classList.remove('open');
        if (_previewUrl) { URL.revokeObjectURL(_previewUrl); _previewUrl = null; }
    }

    // ═══════════════════════════════════════════════════════════════
    // DOWNLOAD
    // ═══════════════════════════════════════════════════════════════
    function _download(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    // ═══════════════════════════════════════════════════════════════
    // REPORT (DASHBOARD @MEDIA PRINT)
    // ═══════════════════════════════════════════════════════════════
    var _reportStyleInjected = false;

    function _injectReportCSS(options) {
        if (_reportStyleInjected) return;

        var orient = (options && options.orientation) || 'portrait';
        var extraHide = (options && options.hideSelectors) ? ', ' + options.hideSelectors.join(', ') : '';

        var css =
            '@media print {' +
            '  @page { margin: 0.5in; size: ' + orient + '; }' +
            '  body { background:white !important; color:black !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; font-family:Inter,Arial,sans-serif; }' +
            '  .header, .sidebar, nav, .gh-header, .gh-tabs, .keyboard-help, .toast, .modal-overlay, .undo-toast,' +
            '  .sync-indicator, .action-bar, .zoom-controls, .tooltip, .drag-tooltip,' +
            '  [class*="back-btn"], .ts-print-no-print, .no-print, .screen-only, button, .btn, .quick-actions, .table-toolbar' + extraHide +
            '  { display:none !important; }' +
            '  .main-content, .main-container, .main-panel, .gh-main { max-width:100% !important; padding:0 !important; margin:0 !important; overflow:visible !important; }' +
            '  .card, .stat-card, .task-card, [class*="-card"] { background:white !important; border:1px solid #ddd !important; box-shadow:none !important; break-inside:avoid; }' +
            '  table { border-collapse:collapse; width:100%; }' +
            '  th, td { border:1px solid #ddd !important; padding:6px 8px !important; }' +
            '  th { background:#f5f5f5 !important; color:black !important; }' +
            '  a { color:black !important; text-decoration:underline; }' +
            '  .form-section, .planting-card, .task-group, .report-section, tr { break-inside:avoid; }' +
            '  h1, h2, h3 { color:black !important; }' +
            '  .stat-card .stat-value, .stat-card .stat-label, .stat-card .stat-sub { color:black !important; }' +
            '}';

        var style = document.createElement('style');
        style.id = 'ts-print-report-css';
        style.textContent = css;
        document.head.appendChild(style);
        _reportStyleInjected = true;
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════
    function _fmtDate(dateString) {
        if (!dateString) return 'TBD';
        var dt = new Date(dateString);
        if (isNaN(dt.getTime())) return dateString;
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function _fmtTraySize(cellsPerTray, paperpotSpacing) {
        if (!cellsPerTray) return '';
        if (cellsPerTray === 264 && paperpotSpacing) {
            return '264-' + paperpotSpacing;
        }
        return cellsPerTray + '-cell';
    }

    function _today() {
        return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function _dateStamp() {
        return new Date().toISOString().split('T')[0];
    }

    function _categoryColor(cat) {
        var c = (cat || '').toLowerCase();
        if (c.indexOf('herb') >= 0) return { r: 34, g: 139, b: 34 };
        if (c.indexOf('green') >= 0) return { r: 46, g: 125, b: 50 };
        if (c.indexOf('root') >= 0) return { r: 139, g: 90, b: 43 };
        if (c.indexOf('fruit') >= 0) return { r: 200, g: 50, b: 50 };
        if (c.indexOf('flower') >= 0 || c.indexOf('floral') >= 0) return { r: 186, g: 85, b: 211 };
        if (c.indexOf('brassica') >= 0) return { r: 0, g: 100, b: 0 };
        return { r: 60, g: 60, b: 60 }; // default gray
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════
    window.TinySeedPrint = {

        /**
         * Print labels at exact dimensions
         * @param {Object} options - { format, data, preview, onProgress, qrDataFn }
         */
        label: function(options) {
            if (!options || !options.format) {
                return Promise.reject(new Error('TinySeedPrint.label: format is required'));
            }
            if (!options.data || !options.data.length) {
                return Promise.reject(new Error('TinySeedPrint.label: data array is required'));
            }
            var format = options.format;
            var data = options.data;

            return _generateLabelPDF(format, data, options.onProgress).then(function(blob) {
                if (options.preview === false) {
                    // Direct open in new tab
                    var url = URL.createObjectURL(blob);
                    var w = window.open(url, '_blank');
                    if (!w) _download(blob, format + '-labels-' + _dateStamp() + '.pdf');
                } else {
                    _showPreview(blob, {
                        title: data.length + ' ' + (LABEL_FORMATS[format] ? LABEL_FORMATS[format].desc : format) + ' label' + (data.length !== 1 ? 's' : ''),
                        filename: format + '-labels-' + _dateStamp() + '.pdf'
                    });
                }
                return blob;
            }).catch(function(err) {
                console.error('TinySeedPrint.label error:', err);
                throw err;
            });
        },

        /**
         * Print structured sheet/report as PDF
         * @param {Object} options - { title, subtitle, columns, rows, groupBy, sections, orientation, preview }
         */
        sheet: function(options) {
            options = options || {};
            return _generateSheetPDF(options).then(function(blob) {
                if (options.preview === false) {
                    var url = URL.createObjectURL(blob);
                    var w = window.open(url, '_blank');
                    if (!w) _download(blob, (options.title || 'sheet') + '-' + _dateStamp() + '.pdf');
                } else {
                    _showPreview(blob, {
                        title: options.title || 'Print Sheet',
                        filename: (options.title || 'sheet').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-' + _dateStamp() + '.pdf'
                    });
                }
                return blob;
            }).catch(function(err) {
                console.error('TinySeedPrint.sheet error:', err);
                throw err;
            });
        },

        /**
         * Dashboard/report printing via @media print CSS
         * @param {Object} options - { title, orientation, hideSelectors, beforePrint, afterPrint }
         */
        report: function(options) {
            options = options || {};
            _injectReportCSS(options);

            if (options.beforePrint) {
                try { options.beforePrint(); } catch(e) { console.error('beforePrint error:', e); }
            }

            window.print();

            if (options.afterPrint) {
                // afterprint event fires when dialog closes
                window.addEventListener('afterprint', function handler() {
                    window.removeEventListener('afterprint', handler);
                    try { options.afterPrint(); } catch(e) { console.error('afterPrint error:', e); }
                }, { once: true });
            }
        },

        /**
         * Generate QR code as data URL or canvas
         * @param {String} data - Content to encode
         * @param {Object} options - { size, format, errorCorrection, margin }
         * @returns {Promise<String|Canvas>}
         */
        qr: qr,

        /**
         * Show PDF in preview modal
         * @param {Blob} blob - PDF blob
         * @param {Object} options - { title, filename }
         */
        preview: function(blob, options) {
            _showPreview(blob, options);
        },

        /**
         * Download PDF directly
         * @param {Blob} blob - PDF blob
         * @param {String} filename
         */
        download: function(blob, filename) {
            _download(blob, filename);
        },

        /**
         * Direct print labels to thermal printer via QZ Tray (if available)
         * Falls back to preview if QZ Tray not connected
         * @param {Object} options - { format, data, onProgress }
         * @returns {Promise}
         */
        directPrint: function(options) {
            if (!options || !options.format || !options.data || !options.data.length) {
                return Promise.reject(new Error('TinySeedPrint.directPrint: format and data required'));
            }
            var format = options.format;
            var fmt = LABEL_FORMATS[format];
            if (!fmt) return Promise.reject(new Error('Unknown format: ' + format));

            // Check if QZPrint is available and connected (defined in labels.html or globally)
            if (typeof QZPrint !== 'undefined' && QZPrint.isConnected && QZPrint.isConnected()) {
                // Generate PDF blob, convert to base64, send to QZ Tray
                return _generateLabelPDF(format, options.data, options.onProgress).then(function(blob) {
                    return new Promise(function(resolve, reject) {
                        var reader = new FileReader();
                        reader.onload = function() {
                            var base64 = reader.result.split(',')[1];
                            var widthIn = fmt.w / 72;
                            var heightIn = fmt.h / 72;
                            QZPrint.printPDF(base64, widthIn, heightIn, format).then(function() {
                                resolve(blob);
                            }).catch(reject);
                        };
                        reader.onerror = function() { reject(new Error('Failed to read PDF')); };
                        reader.readAsDataURL(blob);
                    });
                });
            }

            // Fallback: show preview modal
            return this.label(options);
        },

        /**
         * Close the preview modal
         */
        closePreview: _closePreview,

        /**
         * Get available label formats
         */
        formats: LABEL_FORMATS,

        /**
         * Configuration
         */
        config: {
            farmName: 'Tiny Seed Farm',
            baseTrackingUrl: 'https://toddismyname21.github.io/tiny-seed-os/'
        }
    };

})();
