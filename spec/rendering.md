# OpenDGD, Canonical Box-14 Rendering Algorithm

**Status:** Draft, v0.1 · **Applies to:** `documentType = IMO_MULTIMODAL_DANGEROUS_GOODS_FORM`, `regulation.code = IMDG`

The value of a shared *data* format is that everyone renders the same *text*. Box 14 of the IMO
Multimodal Dangerous Goods Form ("Number and kind of packages; description of goods") is free text,
and today every system composes it slightly differently. OpenDGD fixes the composition so that a
declaration expressed as structured data (`dangerousGoodsItem`) always produces byte-identical goods
descriptions across conforming implementations.

This document is normative. It is derived from a production IMDG DGD generator and expressed here in
regulation-neutral terms.

## Rules

1. If a line supplies `descriptionOverride`, a renderer **MUST** emit it verbatim and skip everything
   below. The structured fields are then advisory only.
2. Otherwise the renderer composes the description by evaluating the ordered **segments** in the table
   below. Each segment either contributes a fragment or is skipped when its source data is absent.
3. Fragments are concatenated with the segment's declared **separator** placed *before* the fragment,
   except the first emitted fragment, which has no leading separator. The default separator is `", "`.
4. The composed description **MUST** end with a single full stop (`.`).
5. Rendering **MUST** be culture-invariant: decimal points are `.`, no thousands separators, dates as
   noted per segment, temperatures suffixed `°C`.
6. Marks and the "number and kind of packages" line are laid out *above* the composed description in
   the box; they are not part of the composed sentence (see "Cell layout").

## Segment order

Evaluate in this exact order; skip any whose data is absent.

| # | Segment | Source | Emitted fragment (example) | Separator |
|---|---------|--------|----------------------------|-----------|
| 1 | Reportable quantity | `qualifiers.isReportableQuantity` | `RQ` |, (first) |
| 2 | UN number | `unNumber` | `UN 1090` | `, ` |
| 3 | Pre-PSN attributes + PSN | `qualifiers.isWaste`/`isHot`, `properShippingName` | `WASTE ACETONE` / `HOT …` | `, ` |
| 4 | Sample | `qualifiers.isSample` | `SAMPLE` | `, ` |
| 5 | Stabilized | `qualifiers.isStabilized` | `STABILIZED` | `, ` |
| 6 | Molten | `qualifiers.isMolten` | `MOLTEN` | `, ` |
| 7 | Coolant | `qualifiers.isCoolant` | `AS COOLANT` | `, ` |
| 8 | Conditioner | `qualifiers.isConditioner` | `AS CONDITIONER` | `, ` |
| 9 | Temperature controlled | `temperatureControl` present | `TEMPERATURE CONTROLLED` | `, ` |
| 10 | Technical name | `technicalName` | `(xylene)` | ` ` (space) |
| 11 | Solution / mixture | `qualifiers.isSolution`/`isMixture` | `SOLUTION` / `MIXTURE` / `SOLUTION MIXTURE` | ` ` (space) |
| 12 | Class & subsidiary hazards | `class[]` | `Class 3` / `Class 8 (6.1)` | `, ` |
| 13 | Packing group | `packingGroup` | `PG II` | `, ` |
| 14 | Carbon of organic origin | `carbonOfOrganicOrigin` | `Date of production: …, Date of packing …, Temperature …` | `, ` |
| 15 | Empty uncleaned | `qualifiers.isEmptyUncleaned` | `EMPTY UNCLEANED` | `, ` |
| 16 | Flashpoint | `flashpoint` | `(-17°C c.c.)` | `, ` |
| 17 | Marine pollutant | `marinePollutant` | `MARINE POLLUTANT` | `, ` |
| 18 | EmS | `emergencySchedule` | `EmS F-E,S-D` | `, ` |
| 19 | Salvage package | `qualifiers.isSalvagePackage` | `SALVAGE PACKAGE` | `, ` |
| 20 | Salvage pressure receptacle | `qualifiers.isSalvagePressureReceptacle` | `SALVAGE PRESSURE RECEPTACLE` | `, ` |
| 21 | Control temperature | `temperatureControl.controlTemperatureCelsius` | `Control Temperature: 20°C` | `, ` |
| 22 | Emergency temperature | `temperatureControl.emergencyTemperatureCelsius` | `Emergency Temperature: 25°C` | `, ` |
| 23 | Radiological information | `radioactive` | `Cobalt-60, …, Activity: … Category: …, TI: …, CSI: …` | `, ` |
| 24 | Segregation groups | `segregationGroups` | `IMDG Code segregation group - 1 Acids` | `, ` |
| 25 | Limited quantity | `qualifiers.isLimitedQuantity` | `Limited Quantity` | `, ` |
| 26 | Excepted quantity | `qualifiers.isExceptedQuantity` | `Dangerous goods in excepted quantities` | `. ` |
| 27 | Net explosive content | `weights.netExplosiveContentKg` (Class 1) | `Net explosive content: 12 kg` | `, ` |
| 28 | Inner packaging | `packaging.innerPackagingCode` + count | `Inner packaging: 4 x Bottle` | `, ` |
| 29 | Outer packaging | `packaging.outerPackagingCode` + count | `10 x 1A1 Steel drum` | `, ` |
| 30 | End of holding time | `endOfHoldingTime` | `END OF HOLDING TIME: 30/9/2026 (DD/MM/YYYY)` | `, ` |
| 31 | Approval reference | `packagingApprovalReference` | `Approval Ref: GB/12345` | `. ` |
| 32 | Total capacity | `weights.capacityLitres` | `Total capacity 2000 Litres` | `, ` |
| 33 | Emergency contact | `emergencyContact` | `Emergency Contact: …, Emergency Tel: …` | `, ` |
| 34 | Special provision notes | `specialProvisionNotes` | `Transport in accordance with special provision 376` | `. ` |
| 35 | Additional information | `additionalInformation` | free text | `, ` |

**Terminating full stop** is appended after the last emitted segment.

### Appended lines (rendered on their own line under the sentence)

- **Firework classification**, when supplied: `Firework Classification Code: <code>`.
- **Competent authority approval**, when `competentAuthorityApproval` is present, add a separate line:
  `Packaging approved by the competent authority of <value>`.
- **Special alerts**, implementations with substance data MAY append regulatory special-provision
  alerts (`UN <n>: <alert text>`). These are *advisory* and out of scope for a bare renderer.

## Worked example (from `examples/acetone-un1090.json`)

Structured input →

```
UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.
```

Cell layout for box 14 (marks and package line sit above the composed sentence):

```
EXAMPLE LOT 44
10 Steel drums
UN 1090, ACETONE, Class 3, PG II, (-17°C c.c.), EmS F-E,S-D, 10 x 1A1 Steel drum.
```

## Cell layout (informative)

Box 14 stacks, top to bottom, per line:
1. `marks`
2. `<numberOfPackages> <kindOfPackages>`
3. the composed goods description (the sentence above)
4. any appended lines (firework code, competent-authority approval, special alerts)

The `weights.grossMassKg`, `weights.netMassKg` and `cubeM3` populate the adjacent columns of box 14.

## Conformance

An implementation is a **conforming renderer** if, for every declaration in the OpenDGD conformance
test suite (`/spec/conformance/`, planned), it produces the expected box-14 text. The suite is the
normative arbiter where prose and table disagree.
