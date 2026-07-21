/*
 * OpenDGD render service.
 *
 * The endpoint standard users call to get the document back. Same input on any
 * conforming server produces the same form, because the template (spec/form/)
 * and the box-14 rendering algorithm (spec/rendering.md) are part of the standard.
 *
 *   POST /v1/declarations/conformance -> { conforms, findings }   (does it conform to the standard?)
 *   POST /v1/declarations/docx        -> the IMO form as .docx
 *   POST /v1/declarations/pdf         -> the IMO form as .pdf     (via unoserver)
 *   GET  /v1/schema                   -> the JSON Schema
 *   GET  /healthz
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { renderDocx } from './src/render.mjs';
import { docxToPdf, pdfBackend } from './src/unoserver.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'spec', 'opendgd.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const PORT = process.env.PORT || 8080;

// When SITE_DIR is set, this one process also serves the static website, so the
// site and its /v1 API share an origin (the playground can call /v1 directly).
const SITE_DIR = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : '';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.yaml': 'text/yaml', '.yml': 'text/yaml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.map': 'application/json',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel.endsWith('/')) rel += 'index.html';
  const full = path.normalize(path.join(SITE_DIR, rel));
  if (!full.startsWith(SITE_DIR)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(full, (err, data) => {
    if (err) {
      fs.readFile(path.join(full, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<h1>404</h1>'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' }); res.end(data);
  });
}

const readBody = (req) => new Promise((resolve, reject) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => resolve(b)); req.on('error', reject);
});
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
const json = (res, code, obj) => { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const findings = () => (validate.errors || []).map((e) => ({ severity: 'error', jsonPointer: e.instancePath || '/', message: e.message, code: 'OPENDGD-SCHEMA' }));

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = req.url.split('?')[0];
  try {
    if (req.method === 'GET' && url === '/healthz') return json(res, 200, { ok: true, pdf: pdfBackend() });
    if (req.method === 'GET' && (url === '/v1/schema' || url === '/schema')) return json(res, 200, schema);
    if (req.method === 'GET' && SITE_DIR) return serveStatic(res, url);
    if (req.method !== 'POST') { res.writeHead(404); return res.end('not found'); }

    const doc = JSON.parse(await readBody(req));

    if (url.endsWith('/declarations/conformance')) {
      return json(res, 200, { conforms: validate(doc), findings: findings() });
    }
    if (!validate(doc)) return json(res, 400, { conforms: false, findings: findings() });

    if (url.endsWith('/declarations/docx')) {
      cors(res);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="DangerousGoodsDeclaration.docx"',
      });
      return res.end(renderDocx(doc));
    }
    if (url.endsWith('/declarations/pdf')) {
      const pdf = await docxToPdf(renderDocx(doc));
      cors(res);
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="DangerousGoodsDeclaration.pdf"' });
      return res.end(pdf);
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    json(res, 500, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, () => console.log('OpenDGD render service on :' + PORT + ' (pdf backend: ' + pdfBackend() + ')'));
