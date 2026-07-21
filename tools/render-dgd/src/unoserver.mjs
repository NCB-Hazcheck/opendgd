/*
 * DOCX -> PDF conversion.
 *
 * Production: POST the DOCX to a LibreOffice unoserver (the same one NCB Hazcheck
 * runs in-cluster), set UNOSERVER_URL, e.g. http://unoserver-service:3000.
 * Local dev: if UNOSERVER_URL is unset, shell out to a local `soffice`.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const UNOSERVER_URL = process.env.UNOSERVER_URL || '';

export async function docxToPdf(docxBytes) {
  if (UNOSERVER_URL) return viaUnoServer(docxBytes, UNOSERVER_URL);
  return viaSoffice(docxBytes);
}

export const pdfBackend = () => (UNOSERVER_URL ? 'unoserver:' + UNOSERVER_URL : 'soffice');

async function viaUnoServer(docxBytes, base) {
  const form = new FormData();
  const blob = new Blob([docxBytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  form.append('file', blob, 'declaration.docx');
  const res = await fetch(base.replace(/\/$/, '') + '/convert/pdf', { method: 'POST', body: form });
  if (!res.ok) throw new Error('unoserver returned ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

async function viaSoffice(docxBytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opendgd-'));
  const inPath = path.join(dir, 'declaration.docx');
  fs.writeFileSync(inPath, docxBytes);
  await new Promise((resolve, reject) => {
    const p = spawn('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', dir, inPath], { stdio: 'ignore' });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('soffice exited ' + code))));
  });
  const pdf = fs.readFileSync(path.join(dir, 'declaration.pdf'));
  fs.rmSync(dir, { recursive: true, force: true });
  return pdf;
}
