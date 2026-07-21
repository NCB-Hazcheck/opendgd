/*
 * opendgd.org static site generator.
 * Renders the standard's Markdown into real pages, wraps the hand-authored
 * fragments in a shared shell, and copies the spec artefacts for download.
 * No framework, no runtime: output is plain HTML/CSS/JS in ./dist.
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

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='7' y='7' width='18' height='18' rx='2' transform='rotate(45 16 16)' fill='%23C8102E'/></svg>";

const NAV = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/spec/', label: 'Spec', key: 'spec' },
  { href: '/guide/', label: 'Guide', key: 'guide' },
  { href: '/api/', label: 'API', key: 'api' },
  { href: '/playground/', label: 'Playground', key: 'playground' },
  { href: '/about/', label: 'About', key: 'about' },
];

function navHtml(active) {
  const links = NAV.slice(1) // Home is the brand link
    .map((n) => `<a href="${n.href}"${n.key === active ? ' class="active"' : ''}>${n.label}</a>`)
    .join('\n        ');
  return `<header class="topbar">
    <div class="wrap topbar-inner">
      <a class="brand" href="/"><span class="diamond" aria-hidden="true"></span> OpenDGD <small>NCB&nbsp;Hazcheck</small></a>
      <nav class="nav">
        ${links}
        <a class="gh" href="${GH}">GitHub&nbsp;↗</a>
        <button class="theme-toggle" id="tt" type="button" aria-label="Toggle colour theme">Theme</button>
      </nav>
    </div>
  </header>`;
}

const FOOTER = `<footer>
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <div class="foot-brand"><span class="diamond" aria-hidden="true"></span> OpenDGD</div>
          <p class="mono" style="font-size:0.72rem;color:var(--ink-3);margin-top:10px;letter-spacing:0.04em;max-width:36ch">An open standard for IMDG dangerous goods declarations, from NCB Hazcheck, a National Cargo Bureau company.</p>
        </div>
        <div class="foot-links">
          <div class="foot-col"><span class="h">Standard</span><a href="/spec/">Specification</a><a href="/opendgd.schema.json">JSON Schema</a><a href="/spec/rendering/">Rendering algorithm</a></div>
          <div class="foot-col"><span class="h">Build</span><a href="/api/">Reference API</a><a href="/playground/">Playground</a><a href="/examples/">Examples</a></div>
          <div class="foot-col"><span class="h">Project</span><a href="/about/">About and governance</a><a href="${GH}">GitHub ↗</a></div>
        </div>
      </div>
      <div class="foot-legal"><span>© 2026 NCB Hazcheck · Spec CC BY 4.0 · Code Apache 2.0</span><span>opendgd.org &nbsp;·&nbsp; opendgd.com</span></div>
    </div>
  </footer>`;

const THEME_SCRIPT = `<script>
  (function () {
    var tt = document.getElementById('tt');
    var root = document.documentElement;
    function cur() { var s = root.getAttribute('data-theme'); return s ? s : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
    if (tt) tt.addEventListener('click', function () { root.setAttribute('data-theme', cur() === 'dark' ? 'light' : 'dark'); });
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
<link rel="stylesheet" href="/assets/site.css">
${head}
</head>
<body>
${navHtml(active)}
<main>
${body}
</main>
${FOOTER}
${THEME_SCRIPT}
${bodyEnd}
</body>
</html>
`;
  return withBase(doc);
}

/* ---- markdown page ---- */
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

function mdPage({ file, route, title, description, active, eyebrow }) {
  const md = rewriteMdLinks(read(file));
  const htmlBody = marked.parse(md);
  const body = `<div class="wrap"><article class="prose">
${eyebrow ? `<p class="doc-eyebrow">${eyebrow}</p>` : ''}
${htmlBody}
</article></div>`;
  write(path.join(route, 'index.html'), page({ title, description, active, body }));
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
      return `<div class="group" style="margin-bottom:20px">
        <h4>${f}<span class="hint"><a href="/examples/${f}" style="color:var(--accent-ink)">download</a></span></h4>
        <div style="padding:14px"><p style="color:var(--ink-2);font-size:0.95rem;margin-bottom:12px">${captions[f] || ''}</p>
        <pre class="code" style="font-size:0.74rem;overflow-x:auto;margin:0">${json
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre></div>
      </div>`;
    })
    .join('\n');
  const body = `<section class="band"><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Examples</p><h2>Worked declarations.</h2>
    <p class="sub">Complete OpenDGD documents you can download, validate against the schema, or paste into the playground.</p></div>
    <div style="margin-top:36px">${cards}</div>
  </div></section>`;
  write('examples/index.html', page({ title: 'OpenDGD Examples', description: 'Worked OpenDGD declaration documents.', active: '', body }));
}

/* ---------- build ---------- */
rmrf(DIST);
mkdir(DIST);

// assets
copy(path.join(ASSETS, 'site.css'), 'assets/site.css');
copy(path.join(ASSETS, 'playground.js'), 'assets/playground.js');

// spec artefacts for download / API viewer
copy(path.join(ROOT, 'spec', 'openapi.yaml'), 'openapi.yaml');
copy(path.join(ROOT, 'spec', 'opendgd.schema.json'), 'opendgd.schema.json');

// home
write('index.html', page({
  title: 'OpenDGD: One open format for Dangerous Goods Declarations',
  description: 'OpenDGD is a free, open standard for the data behind an IMDG dangerous goods declaration, from NCB Hazcheck.',
  active: 'home',
  body: read(path.join(SRC, 'home.html')),
}));

// playground
write('playground/index.html', page({
  title: 'OpenDGD Playground: build a dangerous goods declaration',
  description: 'Build a full IMDG dangerous goods declaration in your browser and export the IMO form as a PDF.',
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

// spec + rendering (from Markdown)
mdPage({
  file: path.join(ROOT, 'spec', 'SPEC.md'),
  route: 'spec',
  title: 'OpenDGD Specification',
  description: 'The OpenDGD specification: a machine-readable format for IMDG dangerous goods declarations.',
  active: 'spec',
  eyebrow: 'Specification · v0.1',
});
mdPage({
  file: path.join(ROOT, 'spec', 'rendering.md'),
  route: 'spec/rendering',
  title: 'OpenDGD: Box 14 rendering algorithm',
  description: 'The canonical algorithm for composing the box 14 goods description.',
  active: 'spec',
  eyebrow: 'Specification · rendering',
});
mdPage({
  file: path.join(ROOT, 'spec', 'USER-GUIDE.md'),
  route: 'guide',
  title: 'OpenDGD user guide',
  description: 'Produce a dangerous goods declaration end to end, in the playground or over the API.',
  active: 'guide',
  eyebrow: 'User guide',
});

// examples
examplesPage();

// hosting files
if (DOMAIN) write('CNAME', DOMAIN + '\n');
write('.nojekyll', '');
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}${BASE}/sitemap.txt\n`);
write('sitemap.txt', ['/', '/spec/', '/spec/rendering/', '/api/', '/playground/', '/about/', '/examples/']
  .map((p) => SITE + BASE + p).join('\n') + '\n');

console.log(`Built site to ${path.relative(process.cwd(), DIST)}  (base="${BASE || '/'}", site=${SITE}${DOMAIN ? ', cname=' + DOMAIN : ''})`);
