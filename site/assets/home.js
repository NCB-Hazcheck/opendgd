/* OpenDGD home page: the "same input, same output" diff tabs and the
   implementations tier tabs. Progressive enhancement — the page renders
   a sensible default without this script. */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---- Hero code-card copy button ---- */
  document.querySelectorAll('[data-copy-pre]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.closest('.codecard') && btn.closest('.codecard').querySelector('pre');
      if (!pre) return;
      var text = pre.innerText;
      var done = function () { var was = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = was; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    });
  });

  /* ---- Diff comparison ---- */
  var DIFF = {
    today: {
      rows: [
        { system: "Shipper's ERP", text: "1090 Acetone cl.3 PGII FP -17 10 drums", note: "Free text, typed by hand. No EmS, packaging code dropped.", ok: false },
        { system: "Forwarder's portal", text: "UN1090 ACETONE 3 / II / 10 x 1A1 / FP -17C", note: "Different order, different separators, no EmS.", ok: false },
        { system: "Carrier's booking", text: "ACETONE UN 1090 CLASS 3 PGII EmS F-E S-D", note: "Flashpoint and packaging missing entirely.", ok: false }
      ],
      summary: "Three readings of one consignment. Someone has to reconcile them by eye, and a dropped flashpoint or EmS is how an undeclared hazard gets aboard."
    },
    opendgd: {
      rows: [
        { system: "Shipper's ERP", text: "UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.", note: "Composed from the same JSON by the canonical algorithm.", ok: true },
        { system: "Forwarder's portal", text: "UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.", note: "Byte-for-byte identical, no mapping layer needed.", ok: true },
        { system: "Carrier's booking", text: "UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.", note: "Machine-checkable against the IMDG Code on arrival.", ok: true }
      ],
      summary: "One declaration, one description, on every system. Nothing to reconcile, and the data underneath can be checked by machine."
    }
  };
  var grid = document.getElementById('diff-grid');
  var summary = document.getElementById('diff-summary');
  var diffTabs = document.getElementById('diff-tabs');
  function renderDiff(mode) {
    var d = DIFF[mode]; if (!d || !grid) return;
    grid.innerHTML = d.rows.map(function (r) {
      return '<div class="diff-card ' + (r.ok ? '' : 'bad') + '">' +
        '<div class="row1"><span class="sys">' + esc(r.system) + '</span>' +
        '<span class="flag ' + (r.ok ? 'ok' : 'no') + '">' + (r.ok ? 'Match' : 'Differs') + '</span></div>' +
        '<p class="txt">' + esc(r.text) + '</p>' +
        '<p class="note">' + esc(r.note) + '</p></div>';
    }).join('');
    if (summary) summary.textContent = d.summary;
  }
  if (diffTabs) {
    diffTabs.querySelectorAll('button[data-diff]').forEach(function (b) {
      b.addEventListener('click', function () {
        diffTabs.querySelectorAll('button[data-diff]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        renderDiff(b.getAttribute('data-diff'));
      });
    });
  }

  /* ---- Implementations tier tabs ---- */
  var tierTabs = document.getElementById('tier-tabs');
  if (tierTabs) {
    var panels = document.querySelectorAll('[data-tier-panel]');
    tierTabs.querySelectorAll('button[data-tier]').forEach(function (b) {
      b.addEventListener('click', function () {
        var tier = b.getAttribute('data-tier');
        tierTabs.querySelectorAll('button[data-tier]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        panels.forEach(function (p) { p.hidden = p.getAttribute('data-tier-panel') !== tier; });
      });
    });
  }
})();
