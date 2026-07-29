/*
 * Stamp a diagonal text watermark (classic Word WordArt-in-header style) into a
 * rendered DOCX. Used by the hosted service so demo downloads are visibly not
 * transport documents; the library and CLI stay unwatermarked for real
 * implementations. LibreOffice carries the shape through DOCX -> PDF.
 */
import PizZip from 'pizzip';

const SHAPETYPE = `<v:shapetype xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype>`;

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function watermarkParagraph(text, id) {
  const shape = `<v:shape xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" id="OpenDgdWatermark${id}" o:spid="_x0000_s20${40 + id}" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:527.85pt;height:131.95pt;rotation:315;z-index:-251656192;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f" fillcolor="silver" stroked="f"><v:fill opacity=".5"/><v:textpath style="font-family:&quot;Arial&quot;;font-size:1pt" string="${xmlEscape(text)}"/></v:shape>`;
  return `<w:p><w:pPr><w:rPr><w:noProof/></w:rPr></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:pict>${SHAPETYPE}${shape}</w:pict></w:r></w:p>`;
}

/** Insert a diagonal `text` watermark into every header of a DOCX (Uint8Array in/out). */
export function applyWatermark(docxBytes, text) {
  if (!text) return docxBytes;
  const zip = new PizZip(docxBytes);
  let id = 0;
  for (const name of Object.keys(zip.files).filter((f) => /^word\/header\d+\.xml$/.test(f))) {
    const xml = zip.file(name).asText();
    const opened = xml.match(/<w:hdr[^>]*>/);
    if (!opened) continue;
    id += 1;
    zip.file(name, xml.replace(opened[0], opened[0] + watermarkParagraph(text, id)));
  }
  return zip.generate({ type: 'uint8array', compression: 'DEFLATE' });
}
