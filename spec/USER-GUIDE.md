# OpenDGD user guide: an end-to-end declaration

This walks through producing a Dangerous Goods Declaration (DGD) end to end, twice: once by hand in
the browser playground, and once over the API. Both start from one OpenDGD document and finish with
the completed IMO Multimodal Dangerous Goods Form.

The example throughout is a single flammable-liquid line (UN 1090, ACETONE). All party, vessel and
reference data below is fictional.

---

## Option A: in the playground (no code)

Best when a person is preparing one declaration.

1. **Open the playground** at [opendgd.org/playground](https://opendgd.org/playground/). To start from
   a filled-in example, choose **Load acetone**.
2. **Fill in the consignment.** Enter the parties (shipper, consignee, carrier), the references and
   transport (transport document number, vessel, voyage, sailing date, ports), and the container
   (identification number, seals, size and type, tare mass).
3. **Add each dangerous goods line.** Enter the UN number, proper shipping name, class and packing
   group, the number and kind of packages, the outer packaging code, and the weights. The form reveals
   the fields that apply to the class you enter: a Class 3 line asks for a flashpoint, a Class 7 line
   asks for radionuclide, activity, category and transport index, and so on. Use **Add another
   dangerous goods line** for a multi-line unit.
4. **Sign it.** Fill in the shipper declaration and, if you packed the unit, the packing certificate.
5. **Watch box 14 compose.** As you type, the preview builds the full IMO form and composes the box-14
   goods description with the canonical algorithm. The panel shows a green **well-formed** badge when
   the document has everything the standard requires.
6. **Take the output.** Use **Copy JSON** or **Download .json** to keep the OpenDGD document. That JSON
   is what you feed to the API (Option B) to get the print-ready form.

> The playground's in-browser preview is exactly that, a preview. The print-ready, byte-consistent
> DOCX and PDF come from the render service in Option B (or a conforming validator).

---

## Option B: over the API

Best when a system produces declarations automatically. The surface is three calls plus the schema.

Base URL: `https://api.opendgd.org/v1` (or your own deployment of the render service).

### 1. Hold your declaration as OpenDGD JSON

Any producer can emit this shape; see [`../examples/acetone-un1090.json`](../examples/acetone-un1090.json)
for the full document. Minimally:

```json
{
  "openDgdVersion": "0.1",
  "documentType": "IMO_MULTIMODAL_DANGEROUS_GOODS_FORM",
  "regulation": { "code": "IMDG", "edition": "42-24" },
  "consignment": {
    "parties": { "shipper": { "name": "Example Shipper Ltd" } },
    "cargoTransportUnit": { "identificationNumber": "EXMU 000000-0" },
    "dangerousGoods": [
      { "unNumber": "1090", "properShippingName": "ACETONE", "class": ["3"], "packingGroup": "II",
        "packaging": { "numberOfPackages": 10, "kindOfPackages": "Steel drums", "outerPackagingCode": "1A1" },
        "weights": { "grossMassKg": 2350, "netMassKg": 2000 },
        "flashpoint": { "valueCelsius": -17 } }
    ]
  }
}
```

### 2. Check it conforms to the standard

```bash
curl -X POST https://api.opendgd.org/v1/declarations/conformance \
  -H 'Content-Type: application/json' \
  --data @acetone.json
```

```json
{ "conforms": true, "findings": [] }
```

If `conforms` is `false`, `findings` lists what is wrong and where (a JSON Pointer to the field). This
checks the document against the OpenDGD schema. It does not check whether the goods are correctly
classified or safe to ship, that is regulatory validation, done by a validator such as Hazcheck
Validate.

### 3. Get the form back

Word document:

```bash
curl -X POST https://api.opendgd.org/v1/declarations/docx \
  -H 'Content-Type: application/json' \
  --data @acetone.json \
  -o DangerousGoodsDeclaration.docx
```

PDF:

```bash
curl -X POST https://api.opendgd.org/v1/declarations/pdf \
  -H 'Content-Type: application/json' \
  --data @acetone.json \
  -o DangerousGoodsDeclaration.pdf
```

Box 14 on the returned form reads:

```
UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.
```

Because the form template and the rendering algorithm are part of the standard, the same declaration
produces the same DOCX and the same PDF on every conforming implementation.

### Without a server

You do not need the hosted API. The same render library runs in your own systems (Node or the browser)
and a CLI ships with it:

```bash
opendgd-render acetone.json -o DangerousGoodsDeclaration.pdf
```

See [`../tools/render-dgd`](../tools/render-dgd).
