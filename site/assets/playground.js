/* OpenDGD playground: full IMO document builder. Box 14 per spec/rendering.md */
(function () {
    var el = function (id) { return document.getElementById(id); };
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function toNum(v) { if (v === '' || v == null) return null; var n = Number(v); return isNaN(n) ? null : n; }

    var CFIELDS = ['s-shipper-name','s-shipper-addr','s-consignee-name','s-consignee-addr','s-carrier-name','s-tdn','s-shipref','s-fwdref','s-voyage','s-vessel','s-sailing','s-pol','s-pod','s-dest','s-ahi','s-ctu','s-seal','s-size','s-tare','s-gross','s-decl-company','s-decl-name','s-decl-place','s-decl-sign','s-pack-company','s-pack-name'];
    function cv(id) { var e = el(id); return e ? (e.value || '').trim() : ''; }

    /* dangerous goods line editor, built from a spec so add/remove is easy */
    var LF = [
      { f: 'un', l: 'UN number', ph: '1090' },
      { f: 'pg', l: 'Packing group', type: 'select', opts: ['', 'I', 'II', 'III'] },
      { f: 'psn', l: 'Proper shipping name', ph: 'ACETONE', w: 3 },
      { f: 'cls', l: 'Primary class', ph: '3' },
      { f: 'sub', l: 'Subsidiary', ph: 'e.g. 6.1' },
      { f: 'tech', l: 'Technical name', ph: 'optional' },
      { f: 'marks', l: 'Shipping marks', ph: 'EXAMPLE LOT 44' },
      { f: 'npk', l: 'No. packages', ph: '10' },
      { f: 'kind', l: 'Kind of packages', ph: 'Steel drums' },
      { f: 'outer', l: 'Outer pkg code', ph: '1A1' },
      { f: 'gross', l: 'Gross kg', ph: '2350' },
      { f: 'net', l: 'Net kg', ph: '2000' },
      { f: 'cube', l: 'Cube m3', ph: '2.4' },
      { f: 'flash', l: 'Flashpoint C', ph: '-17' },
      { f: 'nec', l: 'NEC kg', ph: 'class 1' },
      { f: 'cap', l: 'Capacity L', ph: 'liquids' },
      { f: 'emsf', l: 'EmS fire', ph: 'F-E' },
      { f: 'emss', l: 'EmS spillage', ph: 'S-D' },
      { f: 'controlTemp', l: 'Control temp C', ph: 'self-reactive', showFor: ['4.1', '5.2'] },
      { f: 'emergencyTemp', l: 'Emergency temp C', ph: '', showFor: ['4.1', '5.2'] },
      { f: 'radionuclide', l: 'Radionuclide', ph: 'Cobalt-60', showFor: ['7'] },
      { f: 'radioDesc', l: 'Radioactive description', ph: 'form / special form', showFor: ['7'], w: 2 },
      { f: 'activity', l: 'Activity', ph: '3.7 GBq', showFor: ['7'] },
      { f: 'radioCategory', l: 'Category', type: 'select', opts: ['', 'I-WHITE', 'II-YELLOW', 'III-YELLOW'], showFor: ['7'] },
      { f: 'ti', l: 'Transport Index', ph: '0.5', showFor: ['7'] },
      { f: 'csi', l: 'Criticality Safety Index', ph: 'fissile only', showFor: ['7'] }
    ];
    var LC = [
      { f: 'mp', l: 'Marine pollutant' }, { f: 'lq', l: 'Limited qty' }, { f: 'eq', l: 'Excepted qty' },
      { f: 'waste', l: 'Waste' }, { f: 'sample', l: 'Sample' }
    ];
    function emptyLine() { var o = {}; LF.forEach(function (x) { o[x.f] = ''; }); LC.forEach(function (x) { o[x.f] = false; }); return o; }
    var lines = [emptyLine()];

    function renderLineEditor() {
      var host = el('dglines');
      host.innerHTML = '';
      lines.forEach(function (line, idx) {
        var card = document.createElement('div');
        card.className = 'dgline';
        var pc = (line.cls || '').trim();
        var fields = LF.map(function (x) {
          var w = x.w === 3 ? ' w3' : (x.w === 2 ? ' w2' : '');
          var id = 'l' + idx + '-' + x.f;
          var ctrl;
          if (x.type === 'select') {
            ctrl = '<select data-idx="' + idx + '" data-f="' + x.f + '" id="' + id + '">' +
              x.opts.map(function (o) { return '<option value="' + o + '"' + (line[x.f] === o ? ' selected' : '') + '>' + (o || 'None') + '</option>'; }).join('') + '</select>';
          } else {
            ctrl = '<input data-idx="' + idx + '" data-f="' + x.f + '" id="' + id + '" value="' + esc(line[x.f]) + '" placeholder="' + esc(x.ph || '') + '">';
          }
          var sf = x.showFor ? ' data-showfor="' + x.showFor.join(',') + '"' : '';
          var st = (x.showFor && x.showFor.indexOf(pc) === -1) ? ' style="display:none"' : '';
          return '<div class="fld' + w + '"' + sf + st + '><label for="' + id + '">' + esc(x.l) + '</label>' + ctrl + '</div>';
        }).join('');
        var checks = '<div class="dgchecks">' + LC.map(function (x) {
          return '<label class="chk"><input type="checkbox" data-idx="' + idx + '" data-f="' + x.f + '"' + (line[x.f] ? ' checked' : '') + '> ' + esc(x.l) + '</label>';
        }).join('') + '</div>';
        card.innerHTML =
          '<div class="dgline-head"><span class="ln">Line ' + (idx + 1) + '</span>' +
          (lines.length > 1 ? '<button type="button" data-rm="' + idx + '">Remove</button>' : '<span></span>') +
          '</div><div class="dgline-body">' + fields + checks + '</div>';
        host.appendChild(card);
      });
      host.querySelectorAll('input[data-f], select[data-f]').forEach(function (node) {
        var ev = node.type === 'checkbox' ? 'change' : 'input';
        node.addEventListener(ev, function () {
          var i = +node.getAttribute('data-idx'), f = node.getAttribute('data-f');
          lines[i][f] = node.type === 'checkbox' ? node.checked : node.value;
          if (f === 'cls') updateConditional(i);
          renderOutput();
        });
      });
      host.querySelectorAll('button[data-rm]').forEach(function (b) {
        b.addEventListener('click', function () { lines.splice(+b.getAttribute('data-rm'), 1); renderLineEditor(); renderOutput(); });
      });
    }

    // Light, generic field reveal: show class-7 radioactive fields, self-reactive
    // temperature fields, etc. based on the primary class. Deeper per-substance
    // rules (which fields are actually required) are what a validator does.
    function updateConditional(idx) {
      var host = el('dglines'); var card = host.children[idx]; if (!card) return;
      var cls = (lines[idx].cls || '').trim();
      card.querySelectorAll('.fld[data-showfor]').forEach(function (cell) {
        cell.style.display = cell.getAttribute('data-showfor').split(',').indexOf(cls) !== -1 ? '' : 'none';
      });
    }

    /* canonical box 14 renderer, faithful subset of rendering.md order */
    function classArray(line) {
      var arr = [];
      if (line.cls) arr.push(line.cls.trim());
      (line.sub || '').split(',').forEach(function (s) { s = s.trim(); if (s) arr.push(s); });
      return arr;
    }
    function classText(arr) { if (!arr.length) return ''; return arr.length > 1 ? arr[0] + ' (' + arr.slice(1).join(',') + ')' : arr[0]; }
    function unText(raw) { var m = String(raw || '').match(/(UN|NA)?\s*(\d{3,4})/i); if (!m) return raw ? String(raw).trim() : ''; return ((m[1] && m[1].toUpperCase() === 'NA') ? 'NA' : 'UN') + ' ' + m[2]; }
    function singular(k) { return String(k || '').replace(/s\b/, ''); }

    function renderBox14(line) {
      var segs = [];
      var push = function (t, s) { segs.push({ t: t, s: s || ', ' }); };
      var un = unText(line.un); if (un) push(un);
      var pre = ''; if (line.waste) pre += 'WASTE ';
      if (line.psn) push(pre + line.psn);
      if (line.sample) push('SAMPLE');
      if (line.tech) segs.push({ t: '(' + line.tech + ')', s: ' ' });
      var ct = classText(classArray(line)); if (ct) push('Class ' + ct);
      if (line.pg) push('PG ' + line.pg);
      if (toNum(line.flash) !== null) push('(' + toNum(line.flash) + '°C c.c.)');
      if (line.mp) push('MARINE POLLUTANT');
      if (line.emsf || line.emss) push('EmS ' + (line.emsf || 'F-?') + ',' + (line.emss || 'S-?'));
      if (toNum(line.controlTemp) !== null) push('Control Temperature: ' + toNum(line.controlTemp) + '°C');
      if (toNum(line.emergencyTemp) !== null) push('Emergency Temperature: ' + toNum(line.emergencyTemp) + '°C');
      var radio = '';
      if (line.radionuclide) radio += line.radionuclide;
      if (line.radioDesc) radio += (radio ? ', ' : '') + line.radioDesc;
      if (line.activity || line.radioCategory) radio += (radio ? ', ' : '') + 'Activity: ' + (line.activity || '') + ' Category: ' + (line.radioCategory || '');
      if (toNum(line.ti) !== null) radio += (radio ? ', ' : '') + 'TI: ' + toNum(line.ti);
      if (toNum(line.csi) !== null) radio += (radio ? ', ' : '') + 'CSI: ' + toNum(line.csi);
      if (radio) push(radio);
      if (line.lq) push('Limited Quantity');
      if (line.eq) segs.push({ t: 'Dangerous goods in excepted quantities', s: '. ' });
      if (toNum(line.nec) !== null) push('Net explosive content: ' + toNum(line.nec) + ' kg');
      if (line.outer) { var np = toNum(line.npk); push((np !== null ? np + ' x ' : '') + line.outer + (line.kind ? ' ' + singular(line.kind) : '')); }
      if (toNum(line.cap) !== null) push('Total capacity ' + toNum(line.cap) + ' Litres');
      if (!segs.length) return '';
      var out = ''; for (var i = 0; i < segs.length; i++) out += (i === 0 ? '' : segs[i].s) + segs[i].t;
      return out + '.';
    }

    function buildItem(line) {
      var it = {};
      var un = String(line.un || '').replace(/^(UN|NA)\s*/i, '').replace(/[^0-9]/g, '');
      if (un) it.unNumber = un;
      if (line.psn) it.properShippingName = line.psn;
      if (line.tech) it.technicalName = line.tech;
      var cls = classArray(line); if (cls.length) it.class = cls;
      if (line.pg) it.packingGroup = line.pg;
      if (line.marks) it.marks = line.marks;
      var pkg = {};
      if (toNum(line.npk) !== null) pkg.numberOfPackages = toNum(line.npk);
      if (line.kind) pkg.kindOfPackages = line.kind;
      if (line.outer) pkg.outerPackagingCode = line.outer;
      if (Object.keys(pkg).length) it.packaging = pkg;
      var w = {};
      if (toNum(line.gross) !== null) w.grossMassKg = toNum(line.gross);
      if (toNum(line.net) !== null) w.netMassKg = toNum(line.net);
      if (toNum(line.nec) !== null) w.netExplosiveContentKg = toNum(line.nec);
      if (toNum(line.cap) !== null) w.capacityLitres = toNum(line.cap);
      if (Object.keys(w).length) it.weights = w;
      if (toNum(line.cube) !== null) it.cubeM3 = toNum(line.cube);
      if (line.mp) it.marinePollutant = true;
      if (toNum(line.flash) !== null) it.flashpoint = { valueCelsius: toNum(line.flash), cup: 'closed' };
      var ems = {}; if (line.emsf) ems.fire = line.emsf; if (line.emss) ems.spillage = line.emss;
      if (Object.keys(ems).length) it.emergencySchedule = ems;
      var tc = {};
      if (toNum(line.controlTemp) !== null) tc.controlTemperatureCelsius = toNum(line.controlTemp);
      if (toNum(line.emergencyTemp) !== null) tc.emergencyTemperatureCelsius = toNum(line.emergencyTemp);
      if (Object.keys(tc).length) it.temperatureControl = tc;
      var rad = {};
      if (line.radionuclide) rad.radionuclide = line.radionuclide;
      if (line.radioDesc) rad.description = line.radioDesc;
      if (line.activity) rad.activity = line.activity;
      if (line.radioCategory) rad.category = line.radioCategory;
      if (toNum(line.ti) !== null) rad.transportIndex = toNum(line.ti);
      if (toNum(line.csi) !== null) rad.criticalitySafetyIndex = toNum(line.csi);
      if (Object.keys(rad).length) it.radioactive = rad;
      var q = {};
      if (line.lq) q.isLimitedQuantity = true;
      if (line.eq) q.isExceptedQuantity = true;
      if (line.waste) q.isWaste = true;
      if (line.sample) q.isSample = true;
      if (Object.keys(q).length) it.qualifiers = q;
      return it;
    }

    function computedTotalGross() {
      var provided = toNum(cv('s-gross'));
      if (provided !== null) return provided;
      var sum = 0, any = false;
      lines.forEach(function (l) { var g = toNum(l.gross); if (g !== null) { sum += g; any = true; } });
      var tare = toNum(cv('s-tare')); if (tare !== null) { sum += tare; any = true; }
      return any ? sum : null;
    }

    function buildDoc() {
      var doc = { openDgdVersion: '0.1', documentType: 'IMO_MULTIMODAL_DANGEROUS_GOODS_FORM', regulation: { code: 'IMDG', edition: '42-24' }, consignment: {} };
      var c = doc.consignment;
      var parties = { shipper: {} };
      if (cv('s-shipper-name')) parties.shipper.name = cv('s-shipper-name');
      if (cv('s-shipper-addr')) parties.shipper.address = cv('s-shipper-addr');
      var consignee = {}; if (cv('s-consignee-name')) consignee.name = cv('s-consignee-name'); if (cv('s-consignee-addr')) consignee.address = cv('s-consignee-addr');
      if (Object.keys(consignee).length) parties.consignee = consignee;
      if (cv('s-carrier-name')) parties.carrier = { name: cv('s-carrier-name') };
      c.parties = parties;

      var refs = {};
      if (cv('s-tdn')) refs.transportDocumentNumber = cv('s-tdn');
      if (cv('s-shipref')) refs.shippersReference = cv('s-shipref');
      if (cv('s-fwdref')) refs.freightForwardersReference = cv('s-fwdref');
      if (Object.keys(refs).length) c.references = refs;

      var t = { modeOfTransport: 'sea' };
      if (cv('s-vessel')) t.vessel = cv('s-vessel');
      if (cv('s-voyage')) t.voyageNumber = cv('s-voyage');
      if (cv('s-sailing')) t.sailingDate = cv('s-sailing');
      if (cv('s-pol')) t.portOfLoading = cv('s-pol');
      if (cv('s-pod')) t.portOfDischarge = cv('s-pod');
      if (cv('s-dest')) t.destination = cv('s-dest');
      c.transport = t;
      if (cv('s-ahi')) c.additionalHandlingInformation = cv('s-ahi');

      var ctu = {};
      if (cv('s-ctu')) ctu.identificationNumber = cv('s-ctu');
      if (cv('s-seal')) ctu.sealNumbers = cv('s-seal');
      if (cv('s-size')) ctu.sizeType = cv('s-size');
      if (toNum(cv('s-tare')) !== null) ctu.tareMassKg = toNum(cv('s-tare'));
      var tg = computedTotalGross(); if (tg !== null) ctu.totalGrossMassKg = tg;
      c.cargoTransportUnit = ctu;

      c.dangerousGoods = lines.map(buildItem);

      var certs = {};
      var sd = {};
      if (cv('s-decl-company')) sd.companyName = cv('s-decl-company');
      if (cv('s-decl-name')) sd.declarantName = cv('s-decl-name');
      if (cv('s-decl-place')) sd.placeAndDate = cv('s-decl-place');
      if (cv('s-decl-sign')) sd.signature = cv('s-decl-sign');
      if (Object.keys(sd).length) certs.shipperDeclaration = sd;
      var pc = {};
      if (cv('s-pack-company')) pc.companyName = cv('s-pack-company');
      if (cv('s-pack-name')) pc.declarantName = cv('s-pack-name');
      if (Object.keys(pc).length) certs.containerPackingCertificate = pc;
      if (Object.keys(certs).length) c.certificates = certs;

      return doc;
    }

    function validity(doc) {
      var m = [];
      if (!doc.consignment.parties.shipper.name) m.push('shipper');
      var items = doc.consignment.dangerousGoods;
      if (!items.length) m.push('a DG line');
      items.forEach(function (it, i) {
        var tag = items.length > 1 ? ' (line ' + (i + 1) + ')' : '';
        if (!it.unNumber) m.push('UN number' + tag);
        if (!it.properShippingName) m.push('proper shipping name' + tag);
        if (!it.class || !it.class.length) m.push('class' + tag);
      });
      return m;
    }

    function box(cls, no, label, value) {
      var v = value == null ? '' : String(value);
      return '<div class="b ' + cls + '"><span class="bl"><span class="no">' + no + '</span>' + esc(label) + '</span>' +
        '<span class="bv' + (v ? '' : ' empty') + '">' + (v ? esc(v) : '·') + '</span></div>';
    }

    function renderForm(doc) {
      var c = doc.consignment, p = c.parties || {}, t = c.transport || {}, ctu = c.cargoTransportUnit || {}, certs = c.certificates || {};
      var shipper = [(p.shipper && p.shipper.name) || '', (p.shipper && p.shipper.address) || ''].filter(Boolean).join('\n');
      var consignee = [(p.consignee && p.consignee.name) || '', (p.consignee && p.consignee.address) || ''].filter(Boolean).join('\n');
      var refs = c.references || {};

      var rows = [];
      rows.push('<div class="r" style="grid-template-columns:1fr 1fr">' + box('', '1', 'Shipper / consignor', shipper) + box('', '6', 'Consignee', consignee) + '</div>');
      rows.push('<div class="r" style="grid-template-columns:1fr 1fr 1fr">' + box('', '7', 'Carrier', (p.carrier && p.carrier.name) || '') + box('', '2', 'Transport doc no.', refs.transportDocumentNumber || '') + box('', '4', "Shipper's ref", refs.shippersReference || '') + '</div>');
      if (c.additionalHandlingInformation) rows.push('<div class="r" style="grid-template-columns:1fr">' + box('', '9', 'Additional handling information', c.additionalHandlingInformation) + '</div>');
      rows.push('<div class="r" style="grid-template-columns:1fr 1fr 1fr">' + box('', '10', 'Voyage', t.voyageNumber || '') + box('', '11', 'Vessel', t.vessel || '') + box('', '', 'Sailing date', t.sailingDate || '') + '</div>');
      rows.push('<div class="r b1" style="grid-template-columns:1fr 1fr 1fr">' + box('', '11', 'Port of loading', t.portOfLoading || '') + box('', '12', 'Port of discharge', t.portOfDischarge || '') + box('', '13', 'Destination', t.destination || '') + '</div>');

      /* box 14 */
      var lineRows = c.dangerousGoods.map(function (it, i) {
        var line = lines[i] || {};
        var marks = it.marks || '';
        var pkg = ((it.packaging && it.packaging.numberOfPackages != null ? it.packaging.numberOfPackages + ' ' : '') + (it.packaging && it.packaging.kindOfPackages ? it.packaging.kindOfPackages : '')).trim();
        var sent = renderBox14(line);
        var desc = '<div class="d">' +
          (marks ? '<div class="marks">' + esc(marks) + '</div>' : '') +
          (pkg ? '<div class="pkg">' + esc(pkg) + '</div>' : '') +
          '<div class="sent' + (sent ? '' : ' empty') + '">' + (sent ? esc(sent) : 'UN number, proper shipping name, class …') + '</div></div>';
        var g = it.weights && it.weights.grossMassKg != null ? it.weights.grossMassKg : '';
        var n = it.weights && it.weights.netMassKg != null ? it.weights.netMassKg : '';
        var cu = it.cubeM3 != null ? it.cubeM3 : '';
        return '<div class="ln">' + desc + '<div class="n">' + esc(g) + '</div><div class="n">' + esc(n) + '</div><div class="n">' + esc(cu) + '</div></div>';
      }).join('');
      var box14 = '<div class="r b1" style="grid-template-columns:1fr"><div class="b" style="border-right:none;padding:0">' +
        '<div class="imo-14"><div class="h"><span>14 Shipping marks · number and kind of packages · description of goods</span><span>Gross kg</span><span>Net kg</span><span>Cube</span></div>' +
        lineRows + '</div></div></div>';
      rows.push(box14);

      rows.push('<div class="r" style="grid-template-columns:1.3fr 1fr 1fr 0.8fr 1fr">' +
        box('', '15', 'Container / vehicle id', ctu.identificationNumber || '') +
        box('', '16', 'Seal no(s)', ctu.sealNumbers || '') +
        box('', '17', 'Size & type', ctu.sizeType || '') +
        box('', '18', 'Tare kg', ctu.tareMassKg != null ? ctu.tareMassKg : '') +
        box('', '19', 'Total gross kg', ctu.totalGrossMassKg != null ? ctu.totalGrossMassKg : '') + '</div>');

      var sd = certs.shipperDeclaration || {}, pc = certs.containerPackingCertificate || {};
      var sdText = [sd.companyName, sd.declarantName, sd.placeAndDate, sd.signature].filter(Boolean).join('\n');
      var pcText = [pc.companyName, pc.declarantName].filter(Boolean).join('\n');
      rows.push('<div class="r" style="grid-template-columns:1fr 1fr 1fr;border-bottom:1.5px solid var(--hairline-strong)">' +
        box('', '20', 'Packing certificate', pcText) +
        box('', '21', 'Receiving organisation receipt', '') +
        box('', '22', 'Shipper declaration', sdText) + '</div>');

      return rows.join('');
    }

    function renderOutput() {
      var doc = buildDoc();
      el('imo').innerHTML = renderForm(doc);
      el('o-json').value = JSON.stringify(doc, null, 2);
      var miss = validity(doc);
      var pill = el('o-valid');
      if (!miss.length) { pill.textContent = 'well-formed'; pill.className = 'pill ok'; }
      else { pill.textContent = 'needs: ' + miss.slice(0, 3).join(', ') + (miss.length > 3 ? '…' : ''); pill.className = 'pill bad'; }
    }

    CFIELDS.forEach(function (id) { var e = el(id); if (e) e.addEventListener('input', renderOutput); });
    el('addline').addEventListener('click', function () { lines.push(emptyLine()); renderLineEditor(); renderOutput(); });

    /* examples */
    function setC(map) { CFIELDS.forEach(function (id) { if (el(id)) el(id).value = map[id] != null ? map[id] : ''; }); }
    var EX = {
      acetone: {
        c: { 's-shipper-name': 'Example Shipper Ltd', 's-shipper-addr': '1 Example Way, Felixstowe, IP11 0AA', 's-consignee-name': 'Example Consignee BV', 's-consignee-addr': 'Example Kade 1, Rotterdam', 's-carrier-name': 'Example Container Line', 's-tdn': 'BOL-EXAMPLE-0001', 's-shipref': 'REF-EXAMPLE-0001', 's-voyage': 'V001', 's-vessel': 'MV EXAMPLE', 's-sailing': '2026-07-25', 's-pol': 'Felixstowe', 's-pod': 'Rotterdam', 's-dest': 'Rotterdam', 's-ctu': 'EXMU 000000-0', 's-seal': 'SEAL-0001', 's-size': "40' GP", 's-tare': '3800', 's-gross': '', 's-decl-company': 'Example Shipper Ltd', 's-decl-name': 'A. Example, Shipping Manager', 's-decl-place': 'Felixstowe, 2026-07-21', 's-decl-sign': 'A EXAMPLE', 's-pack-company': 'Example Shipper Ltd', 's-pack-name': 'B. Example, Supervisor' },
        lines: [merge({ un: '1090', pg: 'II', psn: 'ACETONE', cls: '3', marks: 'EXAMPLE LOT 44', npk: '10', kind: 'Steel drums', outer: '1A1', gross: '2350', net: '2000', cube: '2.4', flash: '-17', emsf: 'F-E', emss: 'S-D' })]
      },
      lithium: {
        c: { 's-shipper-name': 'Example Cells GmbH', 's-shipper-addr': 'Example Strasse 5, Hamburg', 's-consignee-name': 'Example Assembly Co', 's-consignee-addr': 'Charleston, SC', 's-carrier-name': 'Example Ocean Line', 's-tdn': 'BOL-EXAMPLE-0002', 's-voyage': 'S001', 's-vessel': 'MV SAMPLE', 's-sailing': '2026-08-02', 's-pol': 'Hamburg', 's-pod': 'Charleston', 's-dest': 'Charleston', 's-ctu': 'EXLU 000000-0', 's-seal': 'SEAL-0002', 's-size': "20' GP", 's-tare': '2200', 's-gross': '', 's-decl-company': 'Example Cells GmbH', 's-decl-name': 'C. Example, DG Safety Adviser', 's-decl-place': 'Hamburg, 2026-07-21', 's-decl-sign': 'C EXAMPLE', 's-pack-company': '', 's-pack-name': '' },
        lines: [
          merge({ un: '3480', psn: 'LITHIUM ION BATTERIES', cls: '9', marks: 'EXAMPLE PALLET 01', npk: '12', kind: 'Fibreboard boxes', outer: '4G', gross: '6500', net: '5400', cube: '18.5', emsf: 'F-A', emss: 'S-I' }),
          merge({ un: '1263', pg: 'III', psn: 'PAINT', cls: '3', marks: 'EXAMPLE TOUCHUP', npk: '4', kind: 'Steel cans', outer: '1A1', gross: '80', net: '60', cube: '0.3', flash: '23', emsf: 'F-E', emss: 'S-E' })
        ]
      },
      radioactive: {
        c: { 's-shipper-name': 'Example Isotopes Ltd', 's-shipper-addr': '1 Example Park, Example City', 's-consignee-name': 'Example Medical Centre', 's-consignee-addr': '2 Example Road, Example City', 's-carrier-name': 'Example Container Line', 's-tdn': 'BOL-EXAMPLE-0003', 's-shipref': '', 's-fwdref': '', 's-voyage': 'V002', 's-vessel': 'MV EXAMPLE', 's-sailing': '2026-07-28', 's-pol': 'Southampton', 's-pod': 'New York', 's-dest': 'New York', 's-ctu': 'EXRU 000000-0', 's-seal': 'SEAL-0003', 's-size': "20' GP", 's-tare': '2100', 's-gross': '', 's-decl-company': 'Example Isotopes Ltd', 's-decl-name': 'D. Example, RPA', 's-decl-place': 'Southampton, 2026-07-21', 's-decl-sign': 'D EXAMPLE', 's-pack-company': '', 's-pack-name': '' },
        lines: [merge({ un: '2915', psn: 'RADIOACTIVE MATERIAL, TYPE A PACKAGE', cls: '7', marks: 'EXAMPLE RA 01', npk: '2', kind: 'Type A packages', gross: '160', net: '40', cube: '0.5', emsf: 'F-I', emss: 'S-S', radionuclide: 'Cobalt-60', radioDesc: 'Sealed source, special form', activity: '3.7 GBq', radioCategory: 'II-YELLOW', ti: '0.5' })]
      }
    };
    function merge(o) { var b = emptyLine(); for (var k in o) b[k] = o[k]; return b; }
    function loadEx(name) {
      if (name === 'clear') { setC({}); lines = [emptyLine()]; renderLineEditor(); renderOutput(); return; }
      var d = EX[name]; if (!d) return;
      setC(d.c); lines = d.lines.map(function (l) { return merge(l); }); renderLineEditor(); renderOutput();
    }
    document.querySelectorAll('.pg-examples button').forEach(function (b) { b.addEventListener('click', function () { loadEx(b.getAttribute('data-ex')); }); });

    /* copy + download */
    function flash() { var c = el('o-copied'); c.classList.add('show'); setTimeout(function () { c.classList.remove('show'); }, 1400); }
    el('o-copy').addEventListener('click', function () {
      var ta = el('o-json');
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(ta.value).then(flash, function () { ta.select(); try { document.execCommand('copy'); } catch (e) {} flash(); }); }
      else { ta.select(); try { document.execCommand('copy'); } catch (e) {} flash(); }
    });
    el('o-download').addEventListener('click', function () {
      var blob = new Blob([el('o-json').value], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'declaration.opendgd.json'; document.body.appendChild(a); a.click();
      document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    });

    /* ---- PDF export: a proper A4 Multimodal Dangerous Goods Form ---- */
    function pf(doc) {
      var c = doc.consignment, p = c.parties || {}, t = c.transport || {}, u = c.cargoTransportUnit || {}, r = c.references || {}, ce = c.certificates || {};
      function party(x) { return x ? [x.name || '', x.address || ''].filter(Boolean).join('\n') : ''; }
      function cell(label, val, extra) { return '<div class="pf-cell ' + (extra || '') + '"><span class="pf-lbl">' + label + '</span><div class="pf-val">' + esc(val == null ? '' : String(val)) + '</div></div>'; }
      function row(cols, tmpl) { return '<div class="pf-row" style="grid-template-columns:' + tmpl + '">' + cols + '</div>'; }
      var sd = ce.shipperDeclaration || {}, pcert = ce.containerPackingCertificate || {}, ro = ce.receivingOrganisationReceipt || {};
      var lns = c.dangerousGoods.map(function (it, i) {
        var line = lines[i] || {};
        var marks = it.marks || '';
        var pkg = ((it.packaging && it.packaging.numberOfPackages != null ? it.packaging.numberOfPackages + ' ' : '') + ((it.packaging && it.packaging.kindOfPackages) || '')).trim();
        var sent = renderBox14(line);
        var g = it.weights && it.weights.grossMassKg != null ? it.weights.grossMassKg : '';
        var n = it.weights && it.weights.netMassKg != null ? it.weights.netMassKg : '';
        var cu = it.cubeM3 != null ? it.cubeM3 : '';
        return '<div class="ln"><div>' + (marks ? '<div class="marks">' + esc(marks) + '</div>' : '') + (pkg ? '<div class="pkg">' + esc(pkg) + '</div>' : '') + '<div class="sent">' + esc(sent) + '</div></div><div>' + esc(g) + '</div><div>' + esc(n) + '</div><div>' + esc(cu) + '</div></div>';
      }).join('');
      var SHIP = 'I hereby declare that the contents of this consignment are fully and accurately described above by the Proper Shipping Name, and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport according to the applicable international and national governmental regulations.';
      var PACK = 'I hereby declare that the goods described above have been packed/loaded into the container/vehicle identified above in accordance with the applicable provisions. To be completed and signed for all container/vehicle loads by the person responsible for packing/loading.';
      var RECV = 'Received the above number of packages/containers/trailers in apparent good order and condition, unless stated hereon.';
      return '<div class="pf">'
        + '<div class="pf-title"><h1>MULTIMODAL DANGEROUS GOODS FORM</h1><div class="sub">This form meets the requirements of SOLAS chapter VII regulation 4 and MARPOL Annex III regulation 4. Rendered by OpenDGD.</div></div>'
        + '<div class="pf-grid">'
        + row(cell('<b>1</b> Shipper / Consignor / Sender', party(p.shipper)) + cell('<b>2</b> Transport document number', r.transportDocumentNumber), '1fr 1fr')
        + row(cell("<b>4</b> Shipper's reference", r.shippersReference) + cell("<b>5</b> Freight forwarder's reference", r.freightForwardersReference), '1fr 1fr')
        + row(cell('<b>6</b> Consignee', party(p.consignee)) + cell('<b>7</b> Carrier', party(p.carrier)), '1fr 1fr')
        + row(cell('<b>9</b> Additional handling information', c.additionalHandlingInformation), '1fr')
        + row(cell('<b>10</b> Voyage No.', t.voyageNumber) + cell('<b>11</b> Vessel', t.vessel) + cell('Sailing date', t.sailingDate), '1fr 1fr 1fr')
        + row(cell('<b>11</b> Place / Port of loading', t.portOfLoading) + cell('<b>12</b> Place / Port of discharge', t.portOfDischarge) + cell('<b>13</b> Destination', t.destination), '1fr 1fr 1fr')
        + '<div class="pf-row" style="grid-template-columns:1fr"><div class="pf-cell pf-14"><div class="h"><div>14 Shipping Marks * Number and kind of packages: description of goods</div><div>Gross Mass (kg)</div><div>Net Mass (kg)</div><div>Cube (m³)</div></div>' + lns + '</div></div>'
        + row(cell('<b>15</b> Container id. No. / vehicle reg. No.', u.identificationNumber) + cell('<b>16</b> Seal number(s)', u.sealNumbers) + cell('<b>17</b> Container / vehicle size and type', u.sizeType) + cell('<b>18</b> Tare mass (kg)', u.tareMassKg != null ? u.tareMassKg : '') + cell('<b>19</b> Total gross mass incl. tare (kg)', u.totalGrossMassKg != null ? u.totalGrossMassKg : ''), '1.5fr 1fr 1.1fr .8fr 1fr')
        + '<div class="pf-row" style="grid-template-columns:1fr"><div class="pf-cell"><span class="pf-lbl"><b>22</b> Shipper / Consignor declaration</span><div class="pf-legal">' + SHIP + '</div><div class="pf-val" style="margin-top:2pt">' + esc([sd.companyName, sd.declarantName].filter(Boolean).join(', ')) + '</div><div class="pf-val">' + esc([sd.placeAndDate, sd.signature].filter(Boolean).join('     ')) + '</div></div></div>'
        + row(
            '<div class="pf-cell pf-sign"><span class="pf-lbl"><b>20</b> Container / Vehicle Packing Certificate</span><div class="pf-legal">' + PACK + '</div><div class="pf-val" style="margin-top:2pt">' + esc([pcert.companyName, pcert.declarantName].filter(Boolean).join(', ')) + '</div></div>'
          + '<div class="pf-cell pf-sign"><span class="pf-lbl"><b>21</b> Receiving Organisation Receipt</span><div class="pf-legal">' + RECV + '</div><div class="pf-val">' + esc(ro.remarks || '') + '</div></div>',
            '1fr 1fr')
        + '</div>'
        + '<div class="pf-foot">* DANGEROUS GOODS: You must specify UN No., Proper Shipping Name, hazard class, Packing Group (where assigned) and marine pollutant, and observe the mandatory requirements.</div>'
        + '<div class="pf-watermark">Preview only, not validated, not valid for transport</div>'
        + '</div>';
    }

    function printFallback() {
      var host = document.getElementById('print-root');
      if (!host) { host = document.createElement('div'); host.id = 'print-root'; document.body.appendChild(host); }
      host.innerHTML = pf(buildDoc());
      window.print();
    }
    // When the render service is on the same origin (the deployed site), these
    // return the real IMO form. On a static host the fetch fails and PDF falls
    // back to the browser print preview.
    function apiDownload(kind, filename) {
      return fetch('/v1/declarations/' + kind, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: el('o-json').value,
      }).then(function (r) { if (!r.ok) throw new Error('render service ' + r.status); return r.blob(); })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
          document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 500);
        });
    }
    var pdfBtn = el('o-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', function () {
      apiDownload('pdf', 'DangerousGoodsDeclaration.pdf').catch(function () { printFallback(); });
    });
    var docxBtn = el('o-docx');
    if (docxBtn) docxBtn.addEventListener('click', function () {
      apiDownload('docx', 'DangerousGoodsDeclaration.docx').catch(function () {
        window.alert('The render service is not reachable from here. It produces the print-ready DOCX and PDF; the button above prints the preview.');
      });
    });

    renderLineEditor();
    loadEx('acetone');
  })();
