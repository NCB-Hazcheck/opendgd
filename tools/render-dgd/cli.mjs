#!/usr/bin/env node
/*
 * opendgd-render — turn an OpenDGD document into the IMO Multimodal Dangerous
 * Goods Form.
 *
 *   opendgd-render declaration.json                 # -> declaration.docx
 *   opendgd-render declaration.json -o form.docx
 *   opendgd-render declaration.json -o form.pdf     # DOCX -> PDF (unoserver/soffice)
 *   opendgd-render declaration.json --pdf
 */
import fs from 'fs';
import { renderDocx } from './src/render.mjs';
import { docxToPdf } from './src/unoserver.mjs';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('-'));
const oi = args.indexOf('-o');
const out = oi >= 0 ? args[oi + 1] : null;
const wantPdf = args.includes('--pdf') || (out && out.endsWith('.pdf'));

if (!input) {
  console.error('usage: opendgd-render <declaration.json> [-o out.docx|out.pdf] [--pdf]');
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(input, 'utf8'));
const docx = renderDocx(doc);

if (wantPdf) {
  const pdf = await docxToPdf(docx);
  const o = out && out.endsWith('.pdf') ? out : input.replace(/\.json$/, '') + '.pdf';
  fs.writeFileSync(o, pdf);
  console.error('wrote ' + o + ' (' + pdf.length + ' bytes)');
} else {
  const o = out || input.replace(/\.json$/, '') + '.docx';
  fs.writeFileSync(o, docx);
  console.error('wrote ' + o + ' (' + docx.length + ' bytes)');
}
