/*
 * One-time template converter.
 *
 * The source template (template/DangerousGoodsNote.docx, the NCB Hazcheck DGN
 * form) fills via Word MERGEFIELDs and a «TableStart:CargoDetails» region.
 * This script rewrites those complex fields into docxtemplater tags, keeping the
 * exact form layout, fonts and headers/footers, and writes:
 *
 *     template/opendgd-dgd-template.docx
 *
 * which the render library (src/render.mjs) fills. Scalar MERGEFIELDs become
 * {FieldName}; the cargo region becomes a {#cargo} ... {/cargo} table-row loop.
 *
 * Run: node scripts/convert-template.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORM = path.join(HERE, '..', '..', '..', 'spec', 'form');
const SRC = path.join(FORM, 'DangerousGoodsNote.docx');
const OUT = path.join(FORM, 'opendgd-dgd-template.docx');

// MERGEFIELD name -> docxtemplater tag. Cargo table region -> row loop over `cargo`.
function tagFor(name) {
  if (name.startsWith('TableStart:')) return '{#cargo}';
  if (name.startsWith('TableEnd:')) return '{/cargo}';
  return '{' + name + '}';
}
function firstRpr(fieldXml) {
  const m = fieldXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return m ? m[0] : '';
}
function nameFromInstr(instrXml) {
  const parts = (instrXml.match(/<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/g) || [])
    .map((s) => s.replace(/<[^>]+>/g, ''));
  const m = parts.join('').match(/MERGEFIELD\s+"?([A-Za-z0-9_:.]+)"?/);
  return m ? m[1] : null;
}
function runWith(rpr, text) {
  return '<w:r>' + rpr + '<w:t xml:space="preserve">' + text + '</w:t></w:r>';
}

function transform(xml) {
  // simple fields: <w:fldSimple w:instr=" MERGEFIELD Name ">...</w:fldSimple>
  xml = xml.replace(/<w:fldSimple\b[^>]*w:instr="([^"]*)"[^>]*>([\s\S]*?)<\/w:fldSimple>/g, (full, instr, body) => {
    const m = instr.match(/MERGEFIELD\s+"?([A-Za-z0-9_:.]+)"?/);
    if (!m) return full;
    return runWith(firstRpr(body), tagFor(m[1]));
  });
  // complex fields: <w:r>...fldChar begin...</w:r> ... <w:r>...fldChar end...</w:r>
  const re = new RegExp(
    '<w:r\\b[^>]*>(?:(?!<\\/w:r>)[\\s\\S])*?<w:fldChar\\b[^>]*w:fldCharType="begin"[^>]*\\/>(?:(?!<\\/w:r>)[\\s\\S])*?<\\/w:r>' +
    '([\\s\\S]*?)' +
    '<w:r\\b[^>]*>(?:(?!<\\/w:r>)[\\s\\S])*?<w:fldChar\\b[^>]*w:fldCharType="end"[^>]*\\/>(?:(?!<\\/w:r>)[\\s\\S])*?<\\/w:r>',
    'g'
  );
  xml = xml.replace(re, (full, middle) => {
    const name = nameFromInstr(middle);
    if (!name) return full; // leave non-MERGEFIELD fields (PAGE, etc.) untouched
    return runWith(firstRpr(full), tagFor(name));
  });
  return xml;
}

const zip = new PizZip(fs.readFileSync(SRC));
const converted = [];
Object.keys(zip.files).forEach((name) => {
  if (!/word\/(document|header\d*|footer\d*)\.xml$/.test(name)) return;
  const before = zip.file(name).asText();
  const after = transform(before);
  if (after !== before) {
    zip.file(name, after);
    const tags = (after.match(/\{[#/]?[A-Za-z0-9_:.]+\}/g) || []);
    converted.push([name, [...new Set(tags)]]);
  }
});

fs.writeFileSync(OUT, zip.generate({ type: 'nodebuffer' }));
console.log('Wrote', path.relative(process.cwd(), OUT));
converted.forEach(([n, tags]) => console.log('  ' + n + ': ' + tags.join(' ')));
