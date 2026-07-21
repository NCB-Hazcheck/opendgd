/*
 * @opendgd/render — fill the IMO Multimodal Dangerous Goods Form from an
 * OpenDGD document. Runs in Node and the browser (docxtemplater + pizzip).
 *
 *   import { renderDocx, renderBox14, mapToMergeData } from './render.mjs';
 *   const docxBuffer = renderDocx(openDgdDocument);   // -> Uint8Array (.docx)
 *
 * The DOCX is the NCB Hazcheck DGN form with the same layout, fonts and
 * headers/footers; box 14 is composed by the canonical algorithm in
 * spec/rendering.md. Convert the DOCX to PDF with LibreOffice (see server.mjs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The form template is part of the standard (spec/form/). Override with OPENDGD_TEMPLATE.
const TEMPLATE = process.env.OPENDGD_TEMPLATE ||
  path.join(HERE, '..', '..', '..', 'spec', 'form', 'opendgd-dgd-template.docx');

/* ---------- canonical box-14 rendering (spec/rendering.md) ---------- */
const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
const normUn = (raw) => {
  const m = String(raw || '').match(/(UN|NA)?\s*(\d{3,4})/i);
  if (!m) return raw ? String(raw).trim() : '';
  return ((m[1] && m[1].toUpperCase() === 'NA') ? 'NA' : 'UN') + ' ' + m[2];
};
const classText = (arr) => {
  if (!arr || !arr.length) return '';
  return arr.length > 1 ? arr[0] + ' (' + arr.slice(1).join(',') + ')' : arr[0];
};
const singular = (k) => String(k || '').replace(/s\b/, '');

export function renderBox14(item) {
  const q = item.qualifiers || {};
  const segs = [];
  const push = (t, s = ', ') => segs.push({ t, s });

  if (q.isReportableQuantity) push('RQ');
  const un = normUn(item.unNumber);
  if (un) push(un);
  let pre = '';
  if (q.isWaste) pre += 'WASTE ';
  if (q.isHot) pre += 'HOT ';
  if (item.properShippingName) push(pre + item.properShippingName);
  if (q.isSample) push('SAMPLE');
  if (q.isStabilized) push('STABILIZED');
  if (q.isMolten) push('MOLTEN');
  if (q.isCoolant) push('AS COOLANT');
  if (q.isConditioner) push('AS CONDITIONER');
  if (item.temperatureControl) push('TEMPERATURE CONTROLLED');
  if (item.technicalName) push('(' + item.technicalName + ')', ' ');
  if (q.isSolution && q.isMixture) push('SOLUTION MIXTURE', ' ');
  else if (q.isSolution) push('SOLUTION', ' ');
  else if (q.isMixture) push('MIXTURE', ' ');
  const ct = classText(item.class);
  if (ct) push('Class ' + ct);
  if (item.packingGroup) push('PG ' + item.packingGroup);
  const carbon = item.carbonOfOrganicOrigin;
  if (carbon && (carbon.dateOfProduction || carbon.dateOfPacking)) {
    push('Date of production: ' + (carbon.dateOfProduction || '') + ', Date of packing: ' + (carbon.dateOfPacking || '') +
      (carbon.temperatureOnDateOfPackingCelsius != null ? ', Temperature at packing: ' + carbon.temperatureOnDateOfPackingCelsius + '°C' : ''));
  }
  if (q.isEmptyUncleaned) push('EMPTY UNCLEANED');
  if (item.flashpoint && item.flashpoint.valueCelsius != null) {
    push('(' + item.flashpoint.valueCelsius + '°C' + (item.flashpoint.cup === 'open' ? ' o.c.' : ' c.c.') + ')');
  }
  if (item.marinePollutant) push('MARINE POLLUTANT');
  const ems = item.emergencySchedule;
  if (ems && (ems.fire || ems.spillage)) push('EmS ' + (ems.fire || 'F-?') + ',' + (ems.spillage || 'S-?'));
  if (q.isSalvagePackage) push('SALVAGE PACKAGE');
  if (q.isSalvagePressureReceptacle) push('SALVAGE PRESSURE RECEPTACLE');
  const tc = item.temperatureControl || {};
  if (num(tc.controlTemperatureCelsius) !== null) push('Control Temperature: ' + tc.controlTemperatureCelsius + '°C');
  if (num(tc.emergencyTemperatureCelsius) !== null) push('Emergency Temperature: ' + tc.emergencyTemperatureCelsius + '°C');
  const rad = item.radioactive;
  if (rad) {
    let s = '';
    if (rad.radionuclide) s += rad.radionuclide;
    if (rad.description) s += (s ? ', ' : '') + rad.description;
    if (rad.activity || rad.category) s += (s ? ', ' : '') + 'Activity: ' + (rad.activity || '') + ' Category: ' + (rad.category || '');
    if (rad.transportIndex != null) s += (s ? ', ' : '') + 'TI: ' + rad.transportIndex;
    if (rad.criticalitySafetyIndex != null) s += (s ? ', ' : '') + 'CSI: ' + rad.criticalitySafetyIndex;
    if (s) push(s);
  }
  if (item.segregationGroups && item.segregationGroups.length) push('IMDG Code segregation group ' + item.segregationGroups.join(', '));
  if (q.isLimitedQuantity) push('Limited Quantity');
  if (q.isExceptedQuantity) push('Dangerous goods in excepted quantities', '. ');
  const w = item.weights || {};
  if (num(w.netExplosiveContentKg) !== null) push('Net explosive content: ' + w.netExplosiveContentKg + ' kg');
  const pkg = item.packaging || {};
  if (pkg.innerPackagingCode) push('Inner packaging: ' + (pkg.numberOfInnerPackages != null ? pkg.numberOfInnerPackages + ' x ' : '') + pkg.innerPackagingCode);
  if (pkg.outerPackagingCode) push((pkg.numberOfPackages != null ? pkg.numberOfPackages + ' x ' : '') + pkg.outerPackagingCode + (pkg.kindOfPackages ? ' ' + singular(pkg.kindOfPackages) : ''));
  if (item.endOfHoldingTime) {
    const d = new Date(item.endOfHoldingTime + 'T00:00:00Z');
    if (!isNaN(d)) push('END OF HOLDING TIME: ' + d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear() + ' (DD/MM/YYYY)');
  }
  if (item.packagingApprovalReference) push('Approval Ref: ' + item.packagingApprovalReference, '. ');
  if (num(w.capacityLitres) !== null) push('Total capacity ' + w.capacityLitres + ' Litres');
  const ec = item.emergencyContact;
  if (ec && (ec.name || ec.telephone)) {
    push([ec.name ? 'Emergency Contact: ' + ec.name : '', ec.telephone ? 'Emergency Tel: ' + ec.telephone : ''].filter(Boolean).join(', '));
  }
  (item.specialProvisionNotes || []).forEach((sp) => {
    push(/^\d+$/.test(String(sp).trim()) ? 'Transport in accordance with special provision ' + sp : String(sp), '. ');
  });
  if (item.additionalInformation) push(item.additionalInformation);

  if (!segs.length) return '';
  let out = '';
  for (let i = 0; i < segs.length; i++) out += (i === 0 ? '' : segs[i].s) + segs[i].t;
  out += '.';

  // appended lines (own line under the sentence)
  if (item.competentAuthorityApproval) out += '\nPackaging approved by the competent authority of ' + item.competentAuthorityApproval;
  if (item.fireworkClassificationCode) out += '\nFirework Classification Code: ' + item.fireworkClassificationCode;
  return out;
}

/* ---------- OpenDGD -> merge data ---------- */
const partyText = (x) => (x ? [x.name || '', x.address || ''].filter(Boolean).join('\n') : '');
const str = (v) => (v === null || v === undefined ? '' : String(v));

function cargoDetailsText(item) {
  const pkg = item.packaging || {};
  const marks = item.marks || '';
  const pkgLine = ((pkg.numberOfPackages != null ? pkg.numberOfPackages + ' ' : '') + (pkg.kindOfPackages || '')).trim();
  return [marks, pkgLine, renderBox14(item)].filter(Boolean).join('\n');
}

export function mapToMergeData(doc) {
  const c = doc.consignment || {};
  const p = c.parties || {};
  const t = c.transport || {};
  const u = c.cargoTransportUnit || {};
  const r = c.references || {};
  const ce = c.certificates || {};
  const sd = ce.shipperDeclaration || {};
  const pcert = ce.containerPackingCertificate || {};
  const haul = ce.haulier || {};
  const ro = ce.receivingOrganisationReceipt || {};

  const dg = c.dangerousGoods || [];
  const cargo = dg.map((it) => ({
    Details: cargoDetailsText(it),
    GrossMass: str(it.weights && it.weights.grossMassKg),
    NetMass: str(it.weights && it.weights.netMassKg),
    Cube: str(it.cubeM3),
  }));
  (c.nonDangerousGoods || []).forEach((it) => cargo.push({
    Details: str(it.description), GrossMass: str(it.grossMassKg), NetMass: str(it.netMassKg), Cube: str(it.cubeM3),
  }));

  let totalGross = u.totalGrossMassKg;
  if (totalGross == null) {
    let sum = 0, any = false;
    dg.forEach((it) => { const g = num(it.weights && it.weights.grossMassKg); if (g !== null) { sum += g; any = true; } });
    const tare = num(u.tareMassKg); if (tare !== null) { sum += tare; any = true; }
    totalGross = any ? sum : '';
  }
  const sailing = t.sailingDate ? String(t.sailingDate).replace(/-/g, '/') : '';

  return {
    ShippingAddress: partyText(p.shipper),
    TransportDocumentNumber: str(r.transportDocumentNumber),
    ShippersReference: str(r.shippersReference),
    FreightForwardersReference: str(r.freightForwardersReference),
    Consignee: partyText(p.consignee),
    Carrier: partyText(p.carrier),
    TransportMode: t.shipType === 'passenger' ? 'Cargo and Passenger' : 'Cargo Only',
    AdditionalHandlingInformation: str(c.additionalHandlingInformation),
    VoyageNumber: str(t.voyageNumber),
    Vessel: str(t.vessel),
    SailingDate: sailing,
    PortOfLoading: str(t.portOfLoading),
    PortOfDischarge: str(t.portOfDischarge),
    Destination: str(t.destination),
    ContainerIdNumber: str(u.identificationNumber),
    SealNumbers: str(u.sealNumbers),
    ContainerSizeType: str(u.sizeType),
    TareMass: str(u.tareMassKg),
    TotalGross: str(totalGross),
    ReceivingOrganisationRemarks: str(ro.remarks),
    PackerCompanyName: str(pcert.companyName),
    PackerDeclarantName: str(pcert.declarantName),
    PackerPlaceAndDate: str(pcert.placeAndDate),
    PackerDeclarantSignature: str(pcert.signature),
    HauliersName: str(haul.name),
    HauliersVehicleRegNo: str(haul.vehicleRegistration),
    HauliersSignatureAndDate: str(haul.signatureAndDate),
    HauliersDriversSignature: str(haul.driversSignature),
    ShippersCompanyName: str(sd.companyName),
    ShippersDeclarantName: str(sd.declarantName),
    ShippersPlaceAndDate: str(sd.placeAndDate),
    ShippersSignatureOfDeclarant: str(sd.signature),
    AdditionalDetails: str(c.additionalCargoNotes),
    OtherDetails: '',
    cargo,
  };
}

/* ---------- fill the template ---------- */
let TEMPLATE_BYTES = null; // allow the browser build to inject bytes
export function setTemplateBytes(bytes) { TEMPLATE_BYTES = bytes; }

export function renderDocx(doc, options = {}) {
  const bytes = options.templateBytes || TEMPLATE_BYTES || fs.readFileSync(TEMPLATE);
  const zip = new PizZip(bytes);
  const dt = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  dt.render(mapToMergeData(doc));
  return dt.getZip().generate({ type: options.browser ? 'uint8array' : 'nodebuffer' });
}
