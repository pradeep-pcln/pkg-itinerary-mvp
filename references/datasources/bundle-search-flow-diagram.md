# Bundle Search Flow — Figma Diagram Guide

Instructions for drawing the hotel + flight bundle search flow as a diagram in Figma.
Use this to onboard anyone new to how the two-step API works, where the data comes from, and the exact pitfalls to avoid.

---

## What to Draw

The diagram has **four sections** arranged left to right:

```
[ 1. Inputs ]  →  [ 2. Step 1: CreateRequestCache ]  →  [ 3. Step 2: unified-search ]  →  [ 4. Response ]
```

Each section is a vertical swimlane. Arrows connect the outputs of one lane to the inputs of the next.

---

## Section 1 — Inputs (leftmost lane)

**Label:** "What the user provides"

Draw a box for each input. These are the raw values that come from the search form:

| Box label | Example value | Notes |
|-----------|--------------|-------|
| Origin Airport Code | `EWR` or `LGA` | IATA code — 3 letters |
| Destination Airport Code | `CUN` | Used only in unified-search STAY |
| Destination City ID | `3000061781` | Used only in CRC FLY component — NOT the airport code |
| Depart Date | `2026-08-15` | Must be converted to midnight UTC epoch seconds |
| Return Date | `2026-08-22` | Must be converted to midnight UTC epoch seconds |
| Number of Adults | `2` | Drives both passengers array and occupants array |

**Draw a red warning box below these inputs:**

> ⚠️ The origin passed to CRC is a **metro area code** (e.g. `"NYC"`), not an airport code.
> The destination passed to CRC is a **city ID** (e.g. `"3000061781"`), not an airport code.
> The destination airport code (`CUN`) is only used in unified-search.

**Draw a conversion note:**

> Dates → `Math.floor(new Date("2026-08-15T00:00:00Z").getTime() / 1000)`
> Aug 15 = `1786752000` / Aug 22 = `1787356800`

---

## Section 2 — Step 1: CreateRequestCache (second lane)

**Label:** "CRC — Sets up flight search session"
**Endpoint:** `POST https://api.priceline.com/bundle/usp/cache/v1/request`
**Returns:** `body.sessionKey` (a string — expires in ~60 min)

Draw two sub-boxes inside this lane: one for FLY config, one for STAY config.

---

### Sub-box A — FLY component in CRC

```
type: "FLY"
key: "FLY-1"
index: 1
```

**flyQuery.tripQuery.slices:**

Draw each slice as a small box:

```
Slice 1 (outbound):
  departDateTimes: [{ seconds: "1786752000" }]
  ← NO origins, NO destinations inside the slice

Slice 2 (return):
  departDateTimes: [{ seconds: "1787356800" }]
  ← NO origins, NO destinations inside the slice
```

**Draw a red warning box:**

> ⚠️ PITFALL: Do NOT put `origins` or `destinations` inside slices.
> If you do, the flight search will fail or return no results.
> Origins and destinations go in `flyBundleAttributes.bundleLocation` instead.

**flyBundleAttributes.bundleLocation:**

```
origin:
  area.airport.metroAreaCode: "NYC"    ← metro area, not airport code (not "EWR" or "LGA")

destination:
  area.city.cityId: "3000061781"       ← city ID, not airport code (not "CUN")
```

**requestOption:**

```
cabinClass: { name: "ECONOMY", type: "PREFERRED_CABIN_CLASS" }
isUseFirefly: true    ← REQUIRED for flight inventory to return results
```

**Draw a red warning box:**

> ⚠️ PITFALL: If `isUseFirefly: true` is missing, the FLY component returns empty.
> This flag routes the request to the FireFly flight inventory system.

---

### Sub-box B — STAY component in CRC

```
type: "STAY"
key: "STAY-1"
index: 2
```

**stayQuery (keep it minimal):**

```
roomInfo: { count: 1 }
staySearchRequestOption:
  stayPagination: { pageSize: 30, offset: 1 }
```

**stayBundleAttributes.stayAssociation:**

```
location:  { deriveFromComponentIndex: 1 }
checkIn:   { deriveFromComponentIndex: 1 }
checkOut:  { deriveFromComponentIndex: 1 }
occupants: { deriveFromComponentIndex: 1 }
```

**Draw a blue info box:**

> ✅ STAY in CRC does NOT need explicit dates or location.
> `deriveFromComponentIndex: 1` copies everything from the FLY component (index 1).
> This is how the hotel knows where and when to search.

---

### CRC Output arrow

Draw a thick arrow from Section 2 to Section 3 labeled:

```
sessionKey: "abc123..."
(expires in ~60 min — always call CRC first to get a fresh key)
```

---

## Section 3 — Step 2: unified-search (third lane)

**Label:** "unified-search — Fetches hotel and flight results"
**Endpoint:** `POST https://api.priceline.com/bundle/search/v1/unified-search`
**Input:** the `sessionKey` from CRC

Draw two sub-boxes: one for STAY, one for FLY.

---

### Sub-box A — STAY component in unified-search

```
isPivot: true          ← REQUIRED — must be true on STAY
type: "STAY"
key: "STAY-1"
index: 1
```

**stayQuery:**

```
checkIn:   { seconds: "1786752000" }
checkOut:  { seconds: "1787356800" }
occupants: [{ id: 1, type: "ADULT" }, { id: 2, type: "ADULT" }]
roomInfo:  { count: 1 }
location:
  area.airport.airportCode: "CUN"    ← destination airport code (NOT city ID here)
```

**Draw a red warning box:**

> ⚠️ PITFALL 1: `isPivot: true` is required on the STAY component or the request fails.
>
> ⚠️ PITFALL 2: Location here uses `airport.airportCode: "CUN"` — not `city.cityId`.
> Using `city.cityId` in unified-search STAY causes: `Unsupported Location Type: area { city { city_id } }`
>
> ⚠️ PITFALL 3: Do NOT add `stayResponseOptions`, `stayFilterOptions`, or `stayFilterInput`
> to the stayQuery. Extra fields cause: `PROCESSOR_ERROR_UNABLE_TO_PROCESS_REQUEST`

---

### Sub-box B — FLY component in unified-search

```
isPivot: false
type: "FLY"
key: "FLY-1"
index: 2
```

**flyQuery.tripQuery.slices:**

```
Slice 1: departDateTimes: [{ seconds: "1786752000" }]   ← same as CRC, no origins/destinations
Slice 2: departDateTimes: [{ seconds: "1787356800" }]
```

**Draw a blue info box:**

> ✅ The FLY config in unified-search is a repeat of the CRC FLY slices.
> The session key links this call to the full flight config (metro area, city ID, FireFly flag)
> that was set up in CRC. You don't need to re-specify `bundleLocation` or `isUseFirefly` here.

---

### Session binding

Draw a box at the bottom of this lane:

```
session: { key: "<sessionKey from CRC>" }
requestType: "BUNDLE_REQUEST"
```

---

## Section 4 — Response (rightmost lane)

**Label:** "Response — Three things to use"

Draw three vertical boxes inside this lane.

---

### Response Box A — STAY results (hotels)

**Path:** `body.componentResponses[0].stayResponse.stayItems[]`

Each hotel has:

```
itemKey                                ← unique ID — needed to match with proposals
itemContent
  .propertyName                        ← hotel name
  .starRating
  .guestRating
  .thumbnailUrl
roomPriceContainers[0]
  .standalonePriceOption
    .priceKey                          ← needed for checkout
    .price.payment.total.charge.amount ← what customer pays
    .displayPrice.nightlyRate
      .averageRate.charge.amount       ← per-night rate for card
      .strikeThroughRate.charge.amount ← crossed-out price
    .priceDeal
      .savingsPercentage               ← e.g. 20 = "20% off"
    .price.priceSummary.taxesFees
      .fees[].code: "Postpaid Mandatory Fees"  ← resort fee — paid at hotel, NOT included in total
```

**Draw a red warning box:**

> ⚠️ Resort fees (Postpaid Mandatory Fees) are separate from the `total.charge.amount`.
> They are collected at the hotel on checkout.
> Always show: "Excludes $X resort fee paid at hotel"

---

### Response Box B — FLY results (flights)

**Path:** `body.componentResponses[1].flyResponse.flyItems[0]`

```
itemKey                                ← unique ID — needed to match with proposals
slices[0]                              ← outbound
  .segments[]
    .origin.code / .destination.code   ← airport codes for each leg
    .carrier.name / .carrier.code
    .departDateTime / .arrivalDateTime
slices[1]                              ← return
  (same structure)
priceContainer[0]
  .standalonePriceOption
    .price.payment.total.charge.amount ← TOTAL for all passengers combined
    .priceSummary
      .totalBase.amount
      .totalTaxesAndFees.amount
```

**Draw a blue info box:**

> ✅ Flight price is for ALL passengers combined (e.g. 2 adults = $1,033.26 total).
> Divide by traveler count to show per-person price.

**Lowest price teaser:**

```
flyResponse.summary.search.itineraries.lowestTotalPrice.amount
← cheapest flight available across all results — use for "Flights from $X"
```

---

### Response Box C — Proposals (bundles)

**Path:** `body.proposals[]`

```
price
  .payment.total.charge.amount         ← combined hotel + flight bundle price
  .strikeThrough.charge.amount         ← combined "was" price
componentReferences[]
  { type: "STAY", itemKey, priceKey }  ← links to the hotel
  { type: "FLY",  itemKey, priceKey }  ← links to the flight
```

**Draw a green info box:**

> ✅ proposals[] is what drives the package card grid.
> Each proposal = one hotel paired with one flight at a discounted bundle price.
> Use `componentReferences[].itemKey` to look up hotel and flight details.
> Use `componentReferences[].priceKey` when sending the user to checkout.

**Draw a savings formula box:**

```
Bundle savings = (hotel standalone total + flight standalone total) − proposal bundle total

Example:
  Riu Cancun standalone:    $1,806.07
  United flight standalone: $1,033.26
                            ---------
  Subtotal:                 $2,839.33
  Bundle price:           − $2,624.07
                            ---------
  Savings:                    ~$215
```

---

## Arrows and Connections to Draw

| From | To | Label |
|------|----|-------|
| Input: Origin Airport | CRC FLY bundleLocation.origin | `metroAreaCode: "NYC"` |
| Input: Destination City ID | CRC FLY bundleLocation.destination | `cityId: "3000061781"` |
| Input: Depart/Return Date | CRC FLY slices + unified-search STAY/FLY | `→ midnight UTC seconds` |
| CRC → | sessionKey | `expires ~60 min` |
| sessionKey → | unified-search session.key | |
| Input: Destination Airport Code | unified-search STAY location | `airportCode: "CUN"` |
| unified-search STAY results → | Response Box A | `stayItems[]` |
| unified-search FLY results → | Response Box B | `flyItems[]` |
| Response A itemKey + Response B itemKey → | Response Box C proposals | `componentReferences match` |
| Proposal priceKey → | Checkout booking | `required for booking` |

---

## Pitfall Summary Box (draw this as a standalone callout panel)

Place this below or beside the diagram as a reference legend.

| # | Where | Pitfall | Fix |
|---|-------|---------|-----|
| 1 | CRC FLY slices | `origins`/`destinations` inside slices | Remove them — only `departDateTimes` in slices |
| 2 | CRC FLY requestOption | Missing `isUseFirefly: true` | Add it — required for FireFly inventory |
| 3 | CRC FLY bundleLocation.origin | Using airport code `"EWR"` | Use metro area code `"NYC"` |
| 4 | CRC FLY bundleLocation.destination | Using airport code `"CUN"` | Use city ID `"3000061781"` |
| 5 | unified-search STAY | Missing `isPivot: true` | Add it — required or request fails |
| 6 | unified-search STAY location | Using `city.cityId` | Use `airport.airportCode: "CUN"` |
| 7 | unified-search STAY query | Extra fields like `stayFilterOptions` | Strip to bare minimum — extras cause PROCESSOR_ERROR |
| 8 | Response pricing | Treating resort fee as included | It's separate — collected at hotel on checkout |
| 9 | Response flight price | Treating as per-person | It's total for all passengers — divide by traveler count |

---

## Figma Layout Tips

- Use **auto-layout frames** for each section (lane) so items stack cleanly.
- Use **connector arrows** (Shift+C in FigJam) between lanes.
- Color code the swimlanes:
  - Section 1 (Inputs): light gray
  - Section 2 (CRC): blue tint
  - Section 3 (unified-search): purple tint
  - Section 4 (Response): green tint
- Color code the callout boxes:
  - Red = pitfall / warning
  - Blue = info / good to know
  - Green = success / what to use for the UI
- Use a **sticky note** style (yellow) for the Pitfall Summary panel.
- Font: use size 12–14 for body, 16–18 bold for section headers, 11 for code snippets in a monospace font.
