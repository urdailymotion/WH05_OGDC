(function () {
  'use strict';

  function ensureJsPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('Library jsPDF belum termuat. Periksa koneksi internet atau CDN.');
    }
    return window.jspdf.jsPDF;
  }

  function text(value) {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  function number(value) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return n.toLocaleString('id-ID', { maximumFractionDigits: 3 });
  }

  function dateId(value) {
    var valueText = text(value).slice(0, 10);
    var parts = valueText.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : (valueText || '-');
  }

  function safeName(value) {
    return text(value || 'DOKUMEN')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 90) || 'DOKUMEN';
  }

  function pdfResponse(doc, fileName, message) {
    var uri = doc.output('datauristring');
    var comma = uri.indexOf(',');
    return {
      success: true,
      message: message || 'PDF berhasil dibuat.',
      pdfBase64: comma >= 0 ? uri.slice(comma + 1) : uri,
      mimeType: 'application/pdf',
      name: fileName
    };
  }

  function drawCompanyHeader(doc, title, subtitle) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var x = 12;
    var y = 10;
    var width = pageWidth - 24;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.45);
    doc.rect(x, y, width, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(127, 29, 29);
    doc.text('PT PUTRA PERKASA ABADI', x + 5, y + 7);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text('COAL MINING CONTRACTOR & HEAVY EQUIPMENT RENTAL', x + 5, y + 12);
    doc.text('Inventory OGDC - Site BIB, Kalimantan Selatan', x + 5, y + 17);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    var titleLines = doc.splitTextToSize(text(title), width * 0.42);
    doc.text(titleLines, x + width - 5, y + 8, { align: 'right' });

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(text(subtitle), x + width - 5, y + 20, { align: 'right' });
    }

    doc.setTextColor(15, 23, 42);
    return y + 31;
  }

  function drawMeta(doc, rows, startY, columns) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var x = 12;
    var width = pageWidth - 24;
    var colCount = columns || 2;
    var gap = 4;
    var cellWidth = (width - gap * (colCount - 1)) / colCount;
    var y = startY;
    var rowHeight = 10;

    for (var i = 0; i < rows.length; i += colCount) {
      for (var c = 0; c < colCount; c++) {
        var item = rows[i + c];
        if (!item) continue;
        var cx = x + c * (cellWidth + gap);
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cx, y, cellWidth, rowHeight, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(text(item[0]).toUpperCase(), cx + 3, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        var valueLines = doc.splitTextToSize(text(item[1] || '-'), cellWidth - 6);
        doc.text(valueLines.slice(0, 2), cx + 3, y + 7.2);
      }
      y += rowHeight + 3;
    }
    return y;
  }

  function drawTable(doc, headers, rows, widths, startY, options) {
    options = options || {};
    var marginX = options.marginX || 12;
    var pageHeight = doc.internal.pageSize.getHeight();
    var y = startY;
    var headerHeight = options.headerHeight || 8;
    var fontSize = options.fontSize || 7;
    var padding = options.padding || 2;
    var aligns = options.aligns || {};
    var repeatTitle = options.repeatTitle || '';

    function header() {
      var x = marginX;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(12, 117, 173);
      doc.setDrawColor(7, 89, 133);
      for (var i = 0; i < headers.length; i++) {
        doc.rect(x, y, widths[i], headerHeight, 'FD');
        var lines = doc.splitTextToSize(text(headers[i]), widths[i] - padding * 2);
        doc.text(lines.slice(0, 2), x + widths[i] / 2, y + 4.8, { align: 'center' });
        x += widths[i];
      }
      y += headerHeight;
      doc.setTextColor(15, 23, 42);
    }

    function newPage() {
      doc.addPage();
      y = 12;
      if (repeatTitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(repeatTitle, marginX, y);
        y += 6;
      }
      header();
    }

    header();

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var split = [];
      var rowHeight = 7;
      for (var c = 0; c < headers.length; c++) {
        var lines = doc.splitTextToSize(text(row[c]), widths[c] - padding * 2);
        split.push(lines);
        rowHeight = Math.max(rowHeight, lines.length * (fontSize * 0.45 + 1.1) + padding * 2);
      }

      if (y + rowHeight > pageHeight - 18) newPage();

      var x = marginX;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setDrawColor(203, 213, 225);
      if (r % 2 === 1) doc.setFillColor(248, 250, 252);

      for (var cc = 0; cc < headers.length; cc++) {
        doc.rect(x, y, widths[cc], rowHeight, r % 2 === 1 ? 'FD' : 'S');
        var align = aligns[cc] || 'left';
        var tx = align === 'right' ? x + widths[cc] - padding : (align === 'center' ? x + widths[cc] / 2 : x + padding);
        doc.text(split[cc], tx, y + padding + 3.3, { align: align });
        x += widths[cc];
      }
      y += rowHeight;
    }
    return y;
  }

  function drawSignatures(doc, labels, names, startY) {
    var pageHeight = doc.internal.pageSize.getHeight();
    var pageWidth = doc.internal.pageSize.getWidth();
    var y = startY;
    if (y + 35 > pageHeight - 10) {
      doc.addPage();
      y = 18;
    }
    var x = 12;
    var width = pageWidth - 24;
    var cell = width / labels.length;
    doc.setFontSize(7.5);
    for (var i = 0; i < labels.length; i++) {
      var cx = x + i * cell;
      doc.setFont('helvetica', 'bold');
      doc.text(text(labels[i]), cx + cell / 2, y + 3, { align: 'center' });
      doc.setDrawColor(15, 23, 42);
      doc.line(cx + 8, y + 27, cx + cell - 8, y + 27);
      doc.setFont('helvetica', 'normal');
      doc.text(text((names && names[i]) || ''), cx + cell / 2, y + 31, { align: 'center' });
    }
    return y + 36;
  }

  function addFooter(doc) {
    var pages = doc.getNumberOfPages();
    for (var i = 1; i <= pages; i++) {
      doc.setPage(i);
      var width = doc.internal.pageSize.getWidth();
      var height = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Inventory OGDC - Supabase | Halaman ' + i + ' dari ' + pages, width - 12, height - 5, { align: 'right' });
    }
  }

  function createTransaction(type, payload) {
    var JsPDF = ensureJsPdf();
    var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    type = text(type).toUpperCase() === 'OUT' ? 'OUT' : 'IN';
    payload = payload || {};
    var title = type === 'OUT' ? 'MATERIAL REQUEST' : 'MATERIAL RECEIVING';
    var y = drawCompanyHeader(doc, title, 'Dokumen transaksi Inventory OGDC');

    y = drawMeta(doc, [
      ['Tanggal', dateId(payload.date || payload.TRX_DATE)],
      ['Shift', payload.shift || payload.SHIFT || '-'],
      [type === 'OUT' ? 'No WO / BA / Ref' : 'No DO / Surat Jalan', payload.doNumber || payload.DO_NUMBER || '-'],
      ['No FillUp', payload.fillupNo || payload.FILLUP_NO || '-'],
      ['Vendor / Supplier', payload.vendor || payload.VENDOR || '-'],
      ['Penerima / Pengguna', payload.penerima || payload.PENERIMA || '-'],
      ['Sumber / Asal', payload.sumber || payload.SUMBER || '-'],
      ['Tujuan / Lokasi', payload.tujuan || payload.TUJUAN || '-']
    ], y, 2);

    var lines = payload.lines || payload.details || [];
    var rows = [];
    var total = 0;
    for (var i = 0; i < lines.length; i++) {
      var item = lines[i] || {};
      var qty = Number(item.qty !== undefined ? item.qty : item.QTY) || 0;
      total += qty;
      rows.push([
        i + 1,
        item.partNumber || item.patNumber || item.PAT_NUMBER || '',
        item.description || item.MATERIAL_DESCRIPTION || '',
        number(qty),
        item.satuan || item.SATUAN || '',
        item.noLambung || item.NO_LAMBUNG || '',
        text((payload.sumber || payload.SUMBER || '-')) + ' -> ' + text((payload.tujuan || payload.TUJUAN || '-'))
      ]);
    }

    if (!rows.length) rows.push(['-', '-', 'Tidak ada detail material', '0', '-', '-', '-']);
    rows.push(['', '', 'TOTAL', number(total), '', '', '']);

    y = drawTable(doc,
      ['No', 'Material', 'Description', 'Qty', 'Sat.', 'No Lambung', 'Sumber -> Tujuan'],
      rows,
      [9, 25, 53, 16, 15, 28, 30],
      y,
      { fontSize: 6.8, aligns: { 0: 'center', 3: 'right', 4: 'center' }, repeatTitle: title }
    );

    y = drawSignatures(doc,
      [type === 'OUT' ? 'Dikeluarkan Oleh' : 'Diterima Oleh', 'Diketahui Oleh', type === 'OUT' ? 'Diterima Oleh' : 'Diserahkan Oleh'],
      [payload.username || payload.USERNAME || '', 'Supervisor / Security', type === 'OUT' ? (payload.penerima || '') : (payload.vendor || '')],
      y + 8
    );

    addFooter(doc);
    var reference = payload.doNumber || payload.fillupNo || payload.TRX_ID || new Date().toISOString().slice(0, 10);
    return pdfResponse(doc, safeName(title + '_' + reference) + '.pdf', 'PDF ' + title + ' berhasil dibuat.');
  }

  function normalizeIbcRecord(record) {
    record = record || {};
    var items = record.items || record.IBC_ITEMS || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (error) { items = []; }
    }
    if (!Array.isArray(items) && typeof record.IBC_NUMBERS === 'string') {
      try { items = JSON.parse(record.IBC_NUMBERS); } catch (error2) { items = []; }
    }
    return {
      ibcId: record.ibcId || record.IBC_ID || '',
      date: record.date || record.TRX_DATE || '',
      transactionType: record.transactionType || record.TRANSACTION_TYPE || '',
      vendor: record.vendor || record.VENDOR || '',
      noSj: record.noSj || record.NO_SJ || '',
      slocAsal: record.slocAsal || record.SLOC_ASAL || '',
      tujuan: record.tujuan || record.TUJUAN || '',
      condition: record.condition || record.CONDITION || '',
      status: record.status || record.STATUS || '',
      pic: record.pic || record.PIC || '',
      driver: record.driver || record.DRIVER || '',
      vehicleNo: record.vehicleNo || record.VEHICLE_NO || '',
      receivedBy: record.receivedBy || record.RECEIVED_BY || '',
      receivedDate: record.receivedDate || record.RECEIVED_DATE || '',
      notes: record.notes || record.NOTES || '',
      items: items
    };
  }

  function createIbcDelivery(record) {
    var JsPDF = ensureJsPdf();
    var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    var r = normalizeIbcRecord(record);
    var y = drawCompanyHeader(doc, 'DELIVERY NOTE - IBC KOSONG', 'ID Monitoring: ' + (r.ibcId || 'DRAFT'));

    y = drawMeta(doc, [
      ['No Delivery Note', r.noSj || r.ibcId || '-'],
      ['Tanggal', dateId(r.date)],
      ['Vendor / Tujuan', r.vendor || r.tujuan || '-'],
      ['SLOC Asal', r.slocAsal || '-'],
      ['Expedisi / Driver', r.driver || '-'],
      ['Plat Kendaraan', r.vehicleNo || '-'],
      ['Status', r.status || '-'],
      ['Actual Received', dateId(r.receivedDate)]
    ], y, 2);

    var rows = [];
    var total = 0;
    for (var i = 0; i < r.items.length; i++) {
      var item = r.items[i] || {};
      var qty = Number(item.qty || item.QTY || 0) || 0;
      total += qty;
      rows.push([
        i + 1,
        item.modelUnit || item.MODEL_UNIT || 'TRUCK LONGBED',
        item.code || item.CODE || '',
        item.itemName || item.ITEM_NAME || 'IBC KOSONG BEKAS',
        number(qty),
        item.unit || item.UNIT || 'PC',
        item.note || item.NOTE || ''
      ]);
    }
    if (!rows.length) rows.push(['-', '-', '-', 'Tidak ada detail IBC', '0', '-', '-']);
    rows.push(['', '', '', 'TOTAL', number(total), 'PC', r.tujuan || r.vendor || '']);

    y = drawTable(doc,
      ['No', 'Model Unit', 'Kode Barang', 'Nama Barang', 'Qty', 'BUN', 'Catatan'],
      rows,
      [9, 29, 27, 42, 14, 14, 51],
      y,
      { fontSize: 6.6, aligns: { 0: 'center', 4: 'right', 5: 'center' }, repeatTitle: 'DELIVERY NOTE - IBC KOSONG' }
    );

    var pageHeight = doc.internal.pageSize.getHeight();
    if (y + 28 > pageHeight - 12) { doc.addPage(); y = 16; }
    doc.setDrawColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CATATAN', 12, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    var note = r.notes || 'KONDISI DOOR TO DOOR SERVICE - PENGANGKUT MENERIMA BARANG KIRIMAN';
    var noteLines = doc.splitTextToSize(note + '\nJenis Pergerakan: ' + (r.transactionType || '-') + ' | Kondisi: ' + (r.condition || '-'), 182);
    doc.rect(12, y, 186, Math.max(18, noteLines.length * 3.8 + 7));
    doc.text(noteLines, 15, y + 9);
    y += Math.max(18, noteLines.length * 3.8 + 7) + 5;

    drawSignatures(doc,
      ['Tanda Tangan Expedisi', 'Diterima Oleh', 'Diketahui', 'Disetujui'],
      [r.driver || '', r.receivedBy || '', 'Security', ''],
      y
    );

    addFooter(doc);
    return pdfResponse(doc, safeName('DELIVERY_NOTE_IBC_' + (r.noSj || r.ibcId || 'DRAFT')) + '.pdf', 'PDF Delivery Note IBC berhasil dibuat.');
  }

  function createIbcMonitoring(data, filters) {
    var JsPDF = ensureJsPdf();
    var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
    data = data || {};
    filters = filters || {};
    var y = drawCompanyHeader(doc, 'MONITORING IBC KELUAR', 'Inventory OGDC - Supabase');
    var summary = data.summary || {};

    y = drawMeta(doc, [
      ['Periode', (filters.startDate || '-') + ' s.d. ' + (filters.endDate || '-')],
      ['Jenis', filters.transactionType || 'Semua'],
      ['Vendor', filters.vendor || 'Semua'],
      ['Status', filters.status || 'Semua'],
      ['Total Record', summary.totalRecord || 0],
      ['Total Qty', number(summary.totalQty || 0)],
      ['Belum Selesai', number(summary.pendingQty || 0)],
      ['Selesai / Diterima', number(summary.completedQty || 0)]
    ], y, 4);

    var rows = [];
    var source = data.rows || [];
    for (var i = 0; i < source.length; i++) {
      var r = source[i] || {};
      var itemCodes = '';
      var items = r.IBC_ITEMS || [];
      if (Array.isArray(items)) {
        itemCodes = items.map(function (x) { return x.code || ''; }).filter(Boolean).join(', ');
      }
      rows.push([
        i + 1,
        dateId(r.TRX_DATE),
        r.IBC_ID || '',
        r.TRANSACTION_TYPE || '',
        r.VENDOR || r.TUJUAN || '',
        number(r.QTY_IBC || 0),
        itemCodes,
        r.CONDITION || '',
        r.STATUS || '',
        r.PIC || '',
        r.NO_SJ || ''
      ]);
    }
    if (!rows.length) rows.push(['-', '-', '-', 'Tidak ada data sesuai filter', '-', '0', '-', '-', '-', '-', '-']);

    drawTable(doc,
      ['No', 'Tanggal', 'ID', 'Pergerakan', 'Vendor / Tujuan', 'Qty', 'No IBC', 'Kondisi', 'Status', 'PIC', 'No SJ'],
      rows,
      [8, 18, 28, 34, 34, 13, 38, 20, 24, 24, 32],
      y,
      { fontSize: 6.2, aligns: { 0: 'center', 5: 'right' }, repeatTitle: 'MONITORING IBC KELUAR' }
    );

    addFooter(doc);
    return pdfResponse(doc, 'MONITORING_IBC_' + new Date().toISOString().slice(0, 10) + '.pdf', 'PDF monitoring IBC berhasil dibuat.');
  }

  window.OGDC_PDF = Object.freeze({
    createTransaction: createTransaction,
    createIbcDelivery: createIbcDelivery,
    createIbcMonitoring: createIbcMonitoring
  });
})();
