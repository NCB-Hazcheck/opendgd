/*
 * opendgd.org static site generator.
 * Renders the standard's Markdown into real pages, wraps the hand-authored
 * fragments in a shared shell, and copies the spec artefacts for download.
 * No framework, no runtime: output is plain HTML/CSS/JS in ./dist.
 * Design: NCB Hazcheck system — Outfit type, maritime navy + Hazcheck red.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(HERE, 'src');
const ASSETS = path.join(HERE, 'assets');
const DIST = path.join(HERE, 'dist');
const GH = 'https://github.com/NCB-Hazcheck/opendgd';

// Deployment base. Empty for a root domain (opendgd.org); "/opendgd" when
// hosted at a GitHub Pages project subpath. Set via the BASE env var.
const BASE = (process.env.BASE || '').replace(/\/$/, '');
const SITE = (process.env.SITE || 'https://opendgd.org').replace(/\/$/, '');
const DOMAIN = process.env.DOMAIN || ''; // when set, writes a CNAME file
// Prefix every root-relative href/src/data-url with BASE.
const withBase = (html) => (BASE ? html.replace(/(href|src|data-url)="\/(?!\/)/g, `$1="${BASE}/`) : html);

const read = (p) => fs.readFileSync(p, 'utf8');
const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });
const mkdir = (p) => fs.mkdirSync(p, { recursive: true });
function write(rel, content) {
  const out = path.join(DIST, rel);
  mkdir(path.dirname(out));
  fs.writeFileSync(out, content);
}
function copy(from, toRel) {
  const to = path.join(DIST, toRel);
  mkdir(path.dirname(to));
  fs.copyFileSync(from, to);
}
function copyDir(from, toRel) {
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    if (fs.statSync(src).isDirectory()) copyDir(src, path.join(toRel, name));
    else copy(src, path.join(toRel, name));
  }
}

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='7' y='7' width='18' height='18' rx='2' transform='rotate(45 16 16)' fill='%23D91F12'/></svg>";

const NAV = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/spec/', label: 'Spec', key: 'spec', lead: true },
  { href: '/guide/', label: 'Guide', key: 'guide' },
  { href: '/api/', label: 'API', key: 'api' },
  { href: '/playground/', label: 'Playground', key: 'playground' },
];

/* Announcement bar: v1.0 release notice + follow-on-GitHub link. */
const ANNOUNCE = `<div class="announce">
    <div class="announce-inner">
      <span class="announce-msg">OpenDGD v1.0 is here — get spec updates and new NCB Hazcheck tools.</span>
      <a class="announce-link" href="${GH}" target="_blank" rel="noopener">Watch on GitHub for updates →</a>
    </div>
  </div>`;

function navHtml(active) {
  const links = NAV
    .map((n) => `<a href="${n.href}" class="navlink${n.lead ? ' lead' : ''}${n.key === active ? ' active' : ''}">${n.label}</a>`)
    .join('\n        ');
  return `${ANNOUNCE}
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/">
        <span class="diamond" aria-hidden="true">◆</span>
        <span class="nm">OpenDGD</span>
        <small><b>by NCB</b> Hazcheck</small>
      </a>
      <nav class="nav">
        ${links}
        <a class="gh navlink" href="${GH}" target="_blank" rel="noopener">GitHub&nbsp;↗</a>
        <button class="theme-toggle" id="tt" type="button" aria-label="Toggle colour theme">☾</button>
      </nav>
    </div>
  </header>`;
}

const FOOTER = `<footer class="site">
    <div class="wrap">
      <div class="foot-top">
        <div>
          <div class="foot-brand"><span class="diamond" aria-hidden="true">◆</span><span class="nm">OpenDGD</span></div>
          <p class="foot-lede">An open standard for IMDG dangerous goods declarations.</p>
          <a class="foot-logo" href="https://hazcheck.com" target="_blank" rel="noopener"><img src="/assets/img/ncb-hazcheck-lockup-white.png" alt="NCB Hazcheck, a National Cargo Bureau company"></a>
        </div>
        <div class="foot-col">
          <div class="h">Standard</div>
          <nav>
            <a href="/spec/">Specification</a>
            <a href="/opendgd.schema.json">JSON Schema</a>
            <a href="/spec/rendering/">Rendering algorithm</a>
          </nav>
        </div>
        <div class="foot-col">
          <div class="h">Build</div>
          <nav>
            <a href="/api/">Reference API</a>
            <a href="/playground/">Playground</a>
            <a href="/examples/">Examples</a>
          </nav>
        </div>
        <div class="foot-col">
          <div class="h">Project</div>
          <nav>
            <a href="/about/">About and governance</a>
            <a href="https://hazcheck.com" target="_blank" rel="noopener">Hazcheck ↗</a>
            <a href="${GH}" target="_blank" rel="noopener">GitHub ↗</a>
            <a href="${GH}/discussions" target="_blank" rel="noopener">Questions or feedback ↗</a>
          </nav>
        </div>
      </div>
      <div class="foot-legal">
        <span>© 2026 NCB Hazcheck · Spec CC BY 4.0 · Code Apache 2.0</span>
        <span class="links"><a href="https://opendgd.org">opendgd.org</a><a href="https://hazcheck.com" target="_blank" rel="noopener">hazcheck.com</a><a href="https://natcargo.org" target="_blank" rel="noopener">natcargo.org</a></span>
      </div>
    </div>
  </footer>`;

/* Pre-paint theme: set data-theme before first paint to avoid a flash. */
const THEME_PREPAINT = `<script>
  (function () {
    try {
      var s = localStorage.getItem('opendgd-theme');
      var t = s || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  })();
</script>`;

/* Runtime: theme toggle (persisted). */
const SITE_SCRIPT = `<script>
  (function () {
    var root = document.documentElement;
    var tt = document.getElementById('tt');
    function cur() { return root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
    function glyph() { if (tt) tt.textContent = cur() === 'dark' ? '☀' : '☾'; }
    glyph();
    if (tt) tt.addEventListener('click', function () {
      var next = cur() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('opendgd-theme', next); } catch (e) {}
      glyph();
    });
  })();
</script>`;

function page({ title, description, active, body, head = '', bodyEnd = '' }) {
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="icon" href="${FAVICON}">
${THEME_PREPAINT}
<link rel="stylesheet" href="/assets/site.css">
${head}
</head>
<body>
${navHtml(active)}
<main>
${body}
</main>
${FOOTER}
${SITE_SCRIPT}
${bodyEnd}
</body>
</html>
`;
  return withBase(doc);
}

/* ---- markdown helpers ---- */
function rewriteMdLinks(md) {
  return md
    .replace(/\]\(opendgd\.schema\.json\)/g, '](/opendgd.schema.json)')
    .replace(/\]\(\.\/rendering\.md\)/g, '](/spec/rendering/)')
    .replace(/\]\(rendering\.md\)/g, '](/spec/rendering/)')
    .replace(/\]\(SPEC\.md\)/g, '](/spec/)')
    .replace(/\]\(openapi\.yaml\)/g, '](/api/)')
    .replace(/\]\(\.\.\/LICENSE\)/g, `](${GH}/blob/main/LICENSE)`)
    .replace(/\]\(\.\.\/GOVERNANCE\.md\)/g, '](/about/)')
    .replace(/\]\(\.\.\/CONTRIBUTING\.md\)/g, `](${GH}/blob/main/CONTRIBUTING.md)`)
    .replace(/\]\(\.\.\/examples\/([a-z0-9-]+\.json)\)/g, `](${GH}/blob/main/examples/$1)`)
    .replace(/\]\(\.\.\/tools\/render-dgd\)/g, `](${GH}/tree/main/tools/render-dgd)`)
    .replace(/\]\(form\/\)/g, `](${GH}/tree/main/spec/form)`);
}

// Add stable ids to h2/h3 and collect a table of contents.
function addHeadingIds(html) {
  const toc = [];
  const seen = Object.create(null);
  const slug = (s) => {
    let base = s.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    if (!base) base = 'section';
    if (seen[base] != null) { seen[base]++; base = `${base}-${seen[base]}`; } else seen[base] = 0;
    return base;
  };
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = slug(text);
    toc.push({ level: +lvl, id, text });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

const DOC_TOC_SCRIPT = `<script>
  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.doc-toc nav a'));
    if (!links.length) return;
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    function onScroll() {
      var active = 0;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= 140) active = i;
      }
      links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();
</script>`;

function mdDocPage({ file, route, title, description, active, eyebrow, toc = true }) {
  const md = rewriteMdLinks(read(file));
  const parsed = marked.parse(md);
  const { html, toc: items } = addHeadingIds(parsed);
  const eyebrowHtml = eyebrow ? `<p class="doc-eyebrow">${eyebrow}</p>\n` : '';
  let body;
  if (toc && items.length) {
    const tocLinks = items
      .map((t) => `<a href="#${t.id}"${t.level === 3 ? ' class="lv3"' : ''}>${t.text}</a>`)
      .join('\n        ');
    body = `<div class="docpage">
  <aside class="doc-toc">
    <div class="h">On this page</div>
    <nav>
        ${tocLinks}
    </nav>
    <div class="links">
      <a href="/opendgd.schema.json" target="_blank" rel="noopener">opendgd.schema.json ↗</a>
      <a href="${GH}" target="_blank" rel="noopener">GitHub repository ↗</a>
    </div>
  </aside>
  <article class="prose">
${eyebrowHtml}${html}
  </article>
</div>`;
  } else {
    body = `<div class="docpage narrow"><article class="prose">
${eyebrowHtml}${html}
</article></div>`;
  }
  write(path.join(route, 'index.html'), page({
    title, description, active, body,
    bodyEnd: toc && items.length ? DOC_TOC_SCRIPT : '',
  }));
}

/* ---- examples page ---- */
function examplesPage() {
  const dir = path.join(ROOT, 'examples');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const captions = {
    'acetone-un1090.json': 'A single flammable-liquid line (UN 1090, ACETONE, Class 3).',
    'lithium-battery-un3480.json': 'A Class 9 lithium battery line exercising the special-provision path.',
    'radioactive-un2915.json': 'A Class 7 line with radionuclide, activity, category, transport index and a competent-authority approval.',
  };
  const cards = files
    .map((f) => {
      const json = read(path.join(dir, f));
      copy(path.join(dir, f), path.join('examples', f));
      return `<div class="group">
        <h4>${f}<span class="hint"><a href="/examples/${f}">download</a></span></h4>
        <div style="padding:16px"><p style="color:var(--ink-3);font-size:13.5px;margin:0 0 12px">${captions[f] || ''}</p>
        <pre style="font-family:var(--mono);font-size:11.5px;line-height:1.65;color:var(--code-ink);overflow-x:auto;margin:0;white-space:pre">${json
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre></div>
      </div>`;
    })
    .join('\n');
  const body = `<section class="band flush"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Examples</p><h2>Worked declarations.</h2>
    <p class="sub">Complete OpenDGD documents you can download, validate against the schema, or paste into the playground.</p></div>
    <div class="examples-grid">${cards}</div>
  </div></section>`;
  write('examples/index.html', page({ title: 'OpenDGD Examples', description: 'Worked OpenDGD declaration documents.', active: '', body }));
}

/* ---------- build ---------- */
rmrf(DIST);
mkdir(DIST);

// assets
copy(path.join(ASSETS, 'site.css'), 'assets/site.css');
copy(path.join(ASSETS, 'playground.js'), 'assets/playground.js');
copy(path.join(ASSETS, 'home.js'), 'assets/home.js');
copyDir(path.join(ASSETS, 'fonts'), 'assets/fonts');
copyDir(path.join(ASSETS, 'img'), 'assets/img');

// spec artefacts for download / API viewer
copy(path.join(ROOT, 'spec', 'openapi.yaml'), 'openapi.yaml');
copy(path.join(ROOT, 'spec', 'opendgd.schema.json'), 'opendgd.schema.json');

// home
write('index.html', page({
  title: 'OpenDGD: One open format for Dangerous Goods Declarations',
  description: 'OpenDGD is a free, open standard for the data behind an IMDG dangerous goods declaration, from NCB Hazcheck.',
  active: 'home',
  body: read(path.join(SRC, 'home.html')),
  bodyEnd: `<script src="/assets/home.js" defer></script>`,
}));

// playground (full document builder)
write('playground/index.html', page({
  title: 'OpenDGD Playground: build a dangerous goods declaration',
  description: 'Build a full IMDG dangerous goods declaration in your browser and export the IMDG form as a PDF.',
  active: 'playground',
  body: read(path.join(SRC, 'playground.html')),
  bodyEnd: `<script src="/assets/playground.js" defer></script>`,
}));

// api
write('api/index.html', page({
  title: 'OpenDGD API reference',
  description: 'Render, validate and export OpenDGD declarations over HTTP.',
  active: 'api',
  body: read(path.join(SRC, 'api.html')),
}));

// about
write('about/index.html', page({
  title: 'About OpenDGD',
  description: 'OpenDGD is published and stewarded by NCB Hazcheck, a National Cargo Bureau company.',
  active: 'about',
  body: read(path.join(SRC, 'about.html')),
}));

// spec + rendering + guide (from Markdown)
mdDocPage({
  file: path.join(ROOT, 'spec', 'SPEC.md'),
  route: 'spec',
  title: 'OpenDGD Specification',
  description: 'The OpenDGD specification: a machine-readable format for IMDG dangerous goods declarations.',
  active: 'spec',
  eyebrow: 'Specification · v1.0',
  toc: true,
});
mdDocPage({
  file: path.join(ROOT, 'spec', 'rendering.md'),
  route: 'spec/rendering',
  title: 'OpenDGD: Box 14 rendering algorithm',
  description: 'The canonical algorithm for composing the box 14 goods description.',
  active: 'spec',
  eyebrow: 'Specification · rendering',
  toc: true,
});
mdDocPage({
  file: path.join(ROOT, 'spec', 'USER-GUIDE.md'),
  route: 'guide',
  title: 'OpenDGD user guide',
  description: 'Produce a dangerous goods declaration end to end, in the playground or over the API.',
  active: 'guide',
  eyebrow: 'User guide',
  toc: false,
});

// examples
examplesPage();

// hosting files
if (DOMAIN) write('CNAME', DOMAIN + '\n');
write('.nojekyll', '');
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}${BASE}/sitemap.txt\n`);
write('sitemap.txt', ['/', '/spec/', '/spec/rendering/', '/guide/', '/api/', '/playground/', '/about/', '/examples/']
  .map((p) => SITE + BASE + p).join('\n') + '\n');

console.log(`Built site to ${path.relative(process.cwd(), DIST)}  (base="${BASE || '/'}", site=${SITE}${DOMAIN ? ', cname=' + DOMAIN : ''})`);
