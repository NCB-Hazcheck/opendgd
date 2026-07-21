<div align="center">

# OpenDGD

**One open format for Dangerous Goods Declarations.**

An open, machine-readable standard for creating a Dangerous Goods Declaration (DGD)
under the IMDG Code, the data behind the IMO Multimodal Dangerous Goods Form.

Published by **NCB Hazcheck**, a National Cargo Bureau company.

[opendgd.org](https://opendgd.org) · [Specification](spec/SPEC.md) · [User guide](spec/USER-GUIDE.md) · [JSON Schema](spec/opendgd.schema.json) · [API](spec/openapi.yaml)

**Status:** v0.1, Draft for public review

</div>

---

## The problem

The IMO Multimodal Dangerous Goods Form is standardised. The **data behind it is not**. Every shipper,
forwarder, carrier and terminal holds the same declaration in a different shape, and box 14, the
safety-critical goods description, is free text composed differently by every system. That means
re-keying, transcription errors, and declarations that can't be checked automatically.

## What OpenDGD is

- **A JSON schema** ([`spec/opendgd.schema.json`](spec/opendgd.schema.json)) that describes a complete
  IMDG dangerous goods declaration as structured data.
- **A canonical rendering algorithm** ([`spec/rendering.md`](spec/rendering.md)) so every implementation
  composes an identical box-14 goods description from that data.
- **The form itself** ([`spec/form/`](spec/form/)). The end product of the standard is the completed
  IMO Multimodal Dangerous Goods Form. The template plus the rendering algorithm define the output, so
  the same declaration produces the **same DOCX and the same PDF** on every implementation.
- **A render library and service** ([`tools/render-dgd`](tools/render-dgd)) that fills the form and
  returns the DOCX/PDF, usable as a library in your own systems or as an endpoint you call.

It is drawn from a production IMDG DGD generator and generalised into an openly-licensed format any
vendor, carrier or authority can adopt.

## What it is not

OpenDGD does not replace the IMDG Code or the IMO form, and it is not itself a compliance guarantee.
A **conforming document** is well-formed; whether the goods are *correctly classified and safe to ship*
is the job of a **validator** (e.g. Hazcheck Validate). The standard is open; validation depth is where
implementations compete.

## Repository layout

```
opendgd/
├─ README.md                    you are here
├─ GOVERNANCE.md                who stewards the standard and how it changes
├─ CONTRIBUTING.md              how to propose changes
├─ LICENSE                      CC BY 4.0 (spec) + Apache-2.0 (code)
├─ spec/
│  ├─ SPEC.md                   human-readable specification
│  ├─ USER-GUIDE.md             end-to-end guide (playground and API)
│  ├─ opendgd.schema.json       the standard (JSON Schema 2020-12)
│  ├─ rendering.md              canonical box-14 rendering algorithm
│  ├─ openapi.yaml              reference API
│  └─ form/                     the IMO form template (part of the standard)
├─ examples/                    worked, schema-valid declarations
├─ tools/render-dgd/            render library + CLI + service (fills the form)
├─ deploy/                      Kubernetes manifests for the render service
├─ Dockerfile                   render-service container image
└─ site/                        the opendgd.org website (static generator)
```

## The website

`site/` builds [opendgd.org](https://opendgd.org): a marketing landing page, the specification, user
guide and rendering algorithm rendered from the Markdown in `spec/`, an interactive API reference, and a
**playground** that builds a full IMO Multimodal Dangerous Goods Form live in the browser and emits a
valid OpenDGD document. The print-ready DOCX/PDF comes from the render service (`tools/render-dgd`). It
is a small dependency-light static generator (one dev dependency), output is plain HTML/CSS/JS.

```bash
cd site
npm install
npm run build     # -> site/dist
npm run serve     # build + serve at http://localhost:8788
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Quick look

```jsonc
{
  "openDgdVersion": "0.1",
  "documentType": "IMO_MULTIMODAL_DANGEROUS_GOODS_FORM",
  "regulation": { "code": "IMDG", "edition": "42-24" },
  "consignment": {
    "parties": { "shipper": { "name": "Example Shipper Ltd" } },
    "cargoTransportUnit": { "identificationNumber": "EXMU 000000-0" },
    "dangerousGoods": [
      {
        "unNumber": "1090",
        "properShippingName": "ACETONE",
        "class": ["3"],
        "packingGroup": "II",
        "flashpoint": { "valueCelsius": -17, "cup": "closed" }
      }
    ]
  }
}
```

renders box 14 as:

```
UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.
```

## Contributing

OpenDGD is a public standard. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`GOVERNANCE.md`](GOVERNANCE.md).

## Licence

Specification, schema and rendering algorithm: **CC BY 4.0**. Reference code and examples:
**Apache-2.0**. See [`LICENSE`](LICENSE).
