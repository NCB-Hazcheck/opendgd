# OpenDGD Specification, v0.1 (Draft)

> An open, machine-readable format for Dangerous Goods Declarations under the IMDG Code.
> Published by **NCB Hazcheck**, a National Cargo Bureau company.

**Status:** Draft for public review · **Version:** 0.1 · **Regulatory scope:** IMDG Code (sea)

---

## 1. Why OpenDGD exists

Every year, millions of dangerous goods move by sea. Each consignment needs a **Dangerous Goods
Declaration (DGD)**, in practice the IMO/UN *Multimodal Dangerous Goods Form* (IMDG Code 5.4.5), in
which the shipper certifies what the goods are, how they are classified, packed, marked and labelled.

The *form* is standardised. The **data behind it is not.** Shippers, forwarders, carriers, terminals
and validators each hold the same declaration in a different shape: a PDF, a spreadsheet cell, a
bespoke EDI segment, a screen-scrape. The goods description in box 14, the single most safety-critical
field, is free text, composed differently by every system. The result is re-keying, transcription
error, and declarations that can't be checked automatically.

**OpenDGD standardises the data and the rendering**, so that:

1. A declaration can be exchanged as one **JSON document** that validates against a public schema.
2. Any conforming system composes the **same box-14 goods description** from that data (§4).
3. The declaration can be **validated** and **rendered to the IMO form** by any implementation.

OpenDGD is deliberately small and pragmatic. It is drawn from a production IMDG DGD generator and
generalised into an open format that any vendor, carrier or authority can adopt without licensing a
commercial engine.

## 2. Design principles

- **Structured over rendered.** Producers supply *structured line data*; text is *composed*, not typed.
  A `descriptionOverride` escape hatch exists for legacy wording.
- **The form is the anchor.** Every field maps to a numbered box of the IMO Multimodal DG Form.
- **SI and ISO by default.** Masses in kilograms, capacity in litres, temperatures in Celsius, dates in
  ISO 8601, countries in ISO 3166, container size-types in ISO 6346. No locale ambiguity.
- **Extensible, not sprawling.** v0.1 is IMDG/sea only. `regulation` and `modeOfTransport` are shaped so
  ADR, RID, 49 CFR and IATA can be added without breaking changes. Vendor data rides in `extensions`.
- **Open by construction.** The schema, rendering algorithm and conformance suite are openly licensed
  (§8). Validation *depth* is where implementations compete.

## 3. The data model

The canonical definition is [`opendgd.schema.json`](opendgd.schema.json) (JSON Schema 2020-12). This
section is a human summary.

A declaration is one JSON object:

```
OpenDGD Declaration
├─ openDgdVersion            "0.1"
├─ documentType             IMO_MULTIMODAL_DANGEROUS_GOODS_FORM
├─ documentReference        the DGD's own id
├─ issueDate
├─ regulation               { code: IMDG, edition: "42-24" }
└─ consignment
   ├─ parties               shipper (req.), consignee, carrier, forwarder, notify
   ├─ references            transport document no., shipper's & forwarder's refs   (boxes 2, 4, 5)
   ├─ transport             vessel, voyage, sailing date, ports, destination        (boxes 10 to 13)
   ├─ cargoTransportUnit    container id, seals, size/type, tare, total gross        (boxes 15 to 19)
   ├─ dangerousGoods[]      the DG lines                                             (box 14)
   ├─ nonDangerousGoods[]   optional
   └─ certificates          packing cert (20), receiving receipt (21), shipper decl. (22), haulier
```

### 3.1 Box mapping

| Form box | OpenDGD path |
|----------|--------------|
| 1 Shipper/Consignor | `consignment.parties.shipper` |
| 2 Transport document no. | `consignment.references.transportDocumentNumber` |
| 4 Shipper's reference | `consignment.references.shippersReference` |
| 5 Freight forwarder's reference | `consignment.references.freightForwardersReference` |
| 6 Consignee | `consignment.parties.consignee` |
| 7 Carrier | `consignment.parties.carrier` |
| 9 Additional handling information | `consignment.additionalHandlingInformation` |
| 10 Voyage number | `consignment.transport.voyageNumber` |
| 11 Vessel / Port of loading | `consignment.transport.vessel` / `.portOfLoading` |
| 12 Port of discharge / Sailing date | `consignment.transport.portOfDischarge` / `.sailingDate` |
| 13 Destination | `consignment.transport.destination` |
| 14 Marks; packages; description of goods; gross/net/cube | `consignment.dangerousGoods[]` |
| 15 Container id / vehicle reg | `consignment.cargoTransportUnit.identificationNumber` |
| 16 Seal number(s) | `consignment.cargoTransportUnit.sealNumbers` |
| 17 Container/vehicle size & type | `consignment.cargoTransportUnit.sizeType` |
| 18 Tare mass (kg) | `consignment.cargoTransportUnit.tareMassKg` |
| 19 Total gross mass incl. tare (kg) | `consignment.cargoTransportUnit.totalGrossMassKg` |
| 20 Container/vehicle packing certificate | `consignment.certificates.containerPackingCertificate` |
| 21 Receiving organisation receipt | `consignment.certificates.receivingOrganisationReceipt` |
| 22 Shipper's declaration | `consignment.certificates.shipperDeclaration` |

### 3.2 The dangerous goods line

Mandatory on every line: `unNumber`, `properShippingName`, `class`. The IMDG Code requires that a
declaration specify **UN number, proper shipping name, hazard class, packing group (where assigned)
and marine-pollutant status**, OpenDGD makes each of these a first-class field rather than free text.

Everything else on the line is conditional and mirrors what the IMDG Code asks for a given entry:

- **Weights & capacity**, `weights.grossMassKg` / `netMassKg` / `netExplosiveContentKg` /
  `capacityLitres`, and `cubeM3`.
- **Packaging**, `packaging` (number & kind of packages, IMDG outer/inner codes).
- **Qualifiers**, `qualifiers.*` booleans (WASTE, HOT, SAMPLE, STABILIZED, MOLTEN, SOLUTION, MIXTURE,
  EMPTY UNCLEANED, SALVAGE, LIMITED/EXCEPTED QUANTITY, RQ, COOLANT, CONDITIONER).
- **Conditional data**, `flashpoint`, `temperatureControl`, `emergencySchedule` (EmS), `radioactive`
  (Class 7, TI, CSI, category, activity), `fumigation` (UN 3359), `carbonOfOrganicOrigin`,
  `fireworkClassificationCode`, `endOfHoldingTime` (T75), `competentAuthorityApproval` (DSIT),
  `segregationGroups`, `specialProvisionNotes`, `emergencyContact`, `additionalInformation`.

A validator's job (Extended tier) is to enforce *which* of these are required for a given substance;
the schema itself only enforces shape and the three always-mandatory fields.

## 4. Rendering box 14

Because box 14 is free text, OpenDGD defines a **canonical rendering algorithm** so that structured
data always produces identical goods descriptions. It is normative and lives in
[`rendering.md`](rendering.md). Summary:

- Segments are evaluated in a fixed order and concatenated with declared separators.
- The sentence terminates in a full stop; marks and the package line sit above it in the cell.
- A `descriptionOverride` bypasses composition entirely.

Example (`examples/acetone-un1090.json`):

```
UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.
```

### 4.1 The rendered document is part of the standard

The end product of OpenDGD is not only the JSON, it is the completed **IMO
Multimodal Dangerous Goods Form**. The form template in [`form/`](form/) and the
box-14 algorithm together define that document, so a given declaration produces
the **same form on every conforming implementation**, and the same PDF.

The template (`form/opendgd-dgd-template.docx`) is the NCB Hazcheck DGN form with
its Word merge fields expressed as fill tags. A conforming renderer maps the
declaration onto those fields (parties, transport, CTU, the box-14 lines composed
per §4, and the signatures) and fills the template to produce the DOCX; the PDF is
produced from the DOCX by LibreOffice. The reference renderer and render service
live in [`../tools/render-dgd`](../tools/render-dgd).

## 5. The API

The reference API is defined in [`openapi.yaml`](openapi.yaml). The surface is small: check the
document, then get the form back.

- `GET /schema`, fetch the JSON Schema.
- `POST /declarations/conformance`, does the document conform to the OpenDGD standard? (structure and
  required fields). Not a regulatory check of whether the goods are safe to ship, that is a validator's
  job (e.g. Hazcheck Validate).
- `POST /declarations/docx`, the completed IMO form as an editable Word document.
- `POST /declarations/pdf`, the completed IMO form as a PDF.

The reference render service is [`../tools/render-dgd`](../tools/render-dgd). Because the form template
and the rendering algorithm are part of the standard, the DOCX and PDF are the same on every
conforming implementation.

## 6. Conformance

- A **conforming document** validates against `opendgd.schema.json`.
- A **conforming renderer** reproduces every expected box-14 string in the conformance suite
  (`spec/conformance/`, planned for v0.1 final).
- A **conforming server** implements `schema`, `conformance`, `docx` and `pdf` with the
  request/response shapes in `openapi.yaml`.
- A **conforming form** is the completed IMO Multimodal Dangerous Goods Form produced by filling the
  template in `form/` with the mapped fields, box 14 composed per §4. The same declaration yields the
  same document everywhere.

Regulatory validators are *not* required to agree beyond the IMDG Code itself; they publish their
edition and rule coverage.

## 7. Versioning

`openDgdVersion` is `MAJOR.MINOR`. Additive, backward-compatible changes bump MINOR. Breaking changes
bump MAJOR and ship a migration note. `regulation.edition` tracks the IMDG amendment independently, so
a single OpenDGD version spans multiple IMDG amendments.

## 8. Licensing

- **Specification text, schema and rendering algorithm:** CC BY 4.0.
- **Reference code, examples and conformance suite:** Apache-2.0.

See [`../LICENSE`](../LICENSE) and [`../GOVERNANCE.md`](../GOVERNANCE.md).

## 9. Relationship to existing standards

OpenDGD does not replace the IMDG Code, the IMO form, or EDI standards (UN/EDIFACT IFTMIN/IFTDGN, the
DCSA data standards). It is a **modern, openly-licensed JSON representation** of the declaration that
maps cleanly onto the IMO form and is intended to be convertible to/from those EDI formats. Where the
IMDG Code and this document disagree, **the IMDG Code governs.**
