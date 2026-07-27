# @opendgd/render

Render an OpenDGD document to the **IMO Multimodal Dangerous Goods Form**, as a
DOCX or a PDF. The form template lives in [`spec/form/`](../../spec/form/) and the
box-14 goods description is composed by the canonical algorithm in
[`spec/rendering.md`](../../spec/rendering.md). Both are part of the standard, so
the **same OpenDGD document produces the same form on every implementation**.

Two ways to use it: as a library in your own systems, or as a hosted endpoint.

## Library

```js
import { renderDocx, renderBox14, mapToMergeData } from '@opendgd/render';
import fs from 'fs';

const doc = JSON.parse(fs.readFileSync('declaration.opendgd.json', 'utf8'));
fs.writeFileSync('DangerousGoodsDeclaration.docx', renderDocx(doc)); // Uint8Array
```

`renderDocx` fills the Word template (docxtemplater + pizzip) and runs in Node and
the browser. To turn the DOCX into a PDF, hand it to LibreOffice (see below).

## CLI

```bash
opendgd-render declaration.json                 # -> declaration.docx
opendgd-render declaration.json -o form.docx
opendgd-render declaration.json -o form.pdf     # DOCX -> PDF
opendgd-render declaration.json --pdf
```

## Server (the "get the PDF back" endpoint)

```bash
npm start        # listens on :8080
```

| Method + path | Returns |
|---|---|
| `POST /v1/declarations/conformance` | `{ conforms, findings }` — does it conform to the standard? |
| `POST /v1/declarations/docx` | the IMO form as `.docx` |
| `POST /v1/declarations/pdf` | the IMO form as `.pdf` |
| `GET /v1/schema` | the JSON Schema |
| `GET /healthz` | liveness |

```bash
curl -X POST http://localhost:8080/v1/declarations/pdf \
  -H 'Content-Type: application/json' \
  --data @../../examples/acetone-un1090.json -o DangerousGoodsDeclaration.pdf
```

## DOCX to PDF

PDF conversion is done by a LibreOffice **unoserver**, the same service NCB
Hazcheck runs in-cluster. Point at it with an env var:

```bash
export UNOSERVER_URL=http://unoserver-service:3000   # production
```

If `UNOSERVER_URL` is unset, the tool falls back to a local `soffice` binary
(handy for development on a machine with LibreOffice installed).

## Regenerating the template

`spec/form/opendgd-dgd-template.docx` is generated from the source form
`spec/form/DangerousGoodsNote.docx` by converting its Word MERGEFIELDs into
docxtemplater tags. To regenerate after editing the source form:

```bash
npm run convert-template
```

## Deployment

A container image and Kubernetes manifests live in [`../../Dockerfile`](../../Dockerfile)
and [`../../deploy/`](../../deploy/). Drop the built image tag into
`deploy/deployment.yaml` and apply. The service expects an in-cluster unoserver.
