# bundle-search unified-search — Response Shape

How to read the unified-search response and map fields to package card UI.

**Status:** FLY + STAY confirmed working in Postman (2026-07-01).

---

## Top-Level Structure

```
{
  "body": {
    "componentResponses": [
      { "type": "STAY", ... },   // index 0 — hotel results
      { "type": "FLY",  ... }    // index 1 — flight results
    ],
    "proposals": [...]           // pre-paired hotel+flight bundles
  }
}
```

There are three sections to understand: **STAY**, **FLY**, and **proposals**. The `proposals` array is what drives the package cards — each proposal links one hotel to one flight at a combined discounted price.

---

## STAY — Hotel Results

**Path:** `body.componentResponses[0].stayResponse.stayItems[]`

Each `stayItem` is one hotel with its available room rates.

### Hotel identity and display fields

```
stayItem
  .itemKey                                       ← unique hotel key (used to match proposals)
  .itemContent
    .propertyName                                ← hotel name
    .starRating                                  ← 1–5 stars
    .guestRating                                 ← guest score (e.g. 8.4)
    .thumbnailUrl                                ← card hero image
    .address { city, stateCode, countryCode }
    .amenityInfo.amenitySummary[]                ← pool, wifi, etc.
  .stayRateSummary
    .isFreeCancelableAvailable                   ← true = show "Free Cancellation" badge
  .stayRequestOption
    .isAllInclusive                              ← true = show "All-Inclusive" badge
```

### Pricing fields

**Path:** `stayItem.roomPriceContainers[0].standalonePriceOption`

```
standalonePriceOption
  .priceKey                                      ← price identifier (used to match proposals)
  .price
    .payment
      .total.charge.amount                       ← TOTAL the customer pays (base + taxes)
    .priceSummary
      .totalBase.amount                          ← room cost before tax
      .totalTaxesAndFees.amount                  ← taxes + fees
      .taxesFees.fees[]
        .code: "Postpaid Mandatory Fees"         ← resort fees paid at hotel on checkout
        .amount                                  ← NOT included in total.charge — collected on site
  .price.strikeThrough.charge.amount             ← crossed-out "was" price
  .displayPrice
    .nightlyRate
      .averageRate.charge.amount                 ← per-night price to show on card
      .strikeThroughRate.charge.amount           ← crossed-out per-night price
  .priceDeal
    .dealProgramName                             ← "Package_Deals" or "Value_Deal"
    .savingsPercentage                           ← e.g. 20 → show "20% off" badge
  .isPayAtHotel                                  ← true = customer pays at checkout, not now
```

### Example — Riu Cancun (from us-013 response)

| Field | Value |
|-------|-------|
| Hotel name | Riu Cancun |
| Stars | 4 |
| Guest rating | 8.0 |
| Pay now total | $1,806.07 |
| Base rate | $1,334.48 |
| Taxes + fees | $471.59 |
| Resort fee (at hotel) | $28.70 |
| Strikethrough total | $2,343.38 |
| Nightly rate | $190.64 |
| Nightly strikethrough | $239.12 |
| Deal | Package_Deals, 20% savings |

---

## FLY — Flight Results

**Path:** `body.componentResponses[1].flyResponse.flyItems[0]`

The response returns one flight itinerary by default (the top result). Multiple options may appear in `flyItems[]`.

### Flight identity fields

```
flyItem
  .itemKey                                       ← unique flight key
  .slices[]                                      ← outbound [0] and return [1]
    .segments[]                                  ← each leg of that direction
      .origin.code                               ← departure airport (e.g. "LGA")
      .destination.code                          ← arrival airport (e.g. "ORD")
      .departDateTime                            ← ISO timestamp
      .arrivalDateTime
      .carrier.name                              ← airline name
      .carrier.code                              ← IATA code (e.g. "UA")
      .flightNumber
      .cabinClass
```

### Pricing fields

**Path:** `flyItem.priceContainer[0].standalonePriceOption`

```
standalonePriceOption
  .price
    .payment
      .total.charge.amount                       ← total for ALL passengers (e.g. 2 adults)
    .priceSummary
      .totalBase.amount                          ← base airfare (all passengers)
      .totalTaxesAndFees.amount                  ← taxes and carrier fees
  .price.strikeThrough.charge.amount             ← "was" price (may equal total if no discount)
```

### Summary — lowest available flight price

```
flyResponse.summary.search.itineraries.lowestTotalPrice.amount
```

This is the cheapest flight price across **all** returned itineraries — use it for the "Flights from $X" teaser on a destination card.

### Example — United LGA→CUN (from us-013 response)

| Field | Value |
|-------|-------|
| Route (outbound) | LGA → ORD → CUN |
| Route (return) | CUN → IAH → LGA |
| Depart | Aug 15, 2026 |
| Return | Aug 22, 2026 |
| Carrier | United Airlines (UA) |
| Total (2 adults) | $1,033.26 |
| Base fare | $616.50 |
| Taxes + fees | $416.76 |
| Lowest price in response | $818.00 |

---

## Proposals — Pre-Paired Hotel + Flight Bundles

**Path:** `body.proposals[]`

Each proposal is a server-generated pairing of one hotel with one flight at a combined price that is cheaper than buying them separately. This is what drives the package search results grid.

```
proposal
  .price
    .payment
      .total.charge.amount                       ← combined hotel + flight bundle price
    .strikeThrough.charge.amount                 ← combined "was" price
  .componentReferences[]
    .type                                        ← "STAY" or "FLY"
    .itemKey                                     ← matches stayItem.itemKey or flyItem.itemKey
    .priceKey                                    ← matches standalonePriceOption.priceKey
```

To look up hotel details for a proposal:
1. Get `componentReferences[].itemKey` where `type == "STAY"`
2. Find the `stayItem` in `stayItems[]` where `stayItem.itemKey` matches
3. Get the `priceKey` from the proposal to fetch the correct room rate

### Savings calculation

Bundle savings = (standalone hotel total + standalone flight total) − bundle proposal total

Example:
- Riu Cancun standalone: $1,806.07
- United flight standalone: $1,033.26
- Bundle proposal total: $2,624.07
- **Savings: ~$215**

### Example proposals (from us-013 response)

| Proposal | Hotel | Bundle Price | Strikethrough |
|----------|-------|-------------|---------------|
| 0 | Riu Cancun | $2,624.07 | $3,376.64 |
| 1 | InterContinental Presidente | $1,980.49 | $3,453.02 |
| 4 | Grand Fiesta Americana Coral Beach | $4,888.01 | — |

---

## Card Field Mapping

Use this table to wire up a `PackageCard` component:

| Card field | Response path |
|-----------|---------------|
| Hotel name | `stayItem.itemContent.propertyName` |
| Hotel image | `stayItem.itemContent.thumbnailUrl` |
| Star rating | `stayItem.itemContent.starRating` |
| Guest rating | `stayItem.itemContent.guestRating` |
| Free cancellation | `stayItem.stayRateSummary.isFreeCancelableAvailable` |
| All-inclusive | `stayItem.stayRequestOption.isAllInclusive` |
| Nightly rate | `standalonePriceOption.displayPrice.nightlyRate.averageRate.charge.amount` |
| Nightly strikethrough | `standalonePriceOption.displayPrice.nightlyRate.strikeThroughRate.charge.amount` |
| Deal badge label | `standalonePriceOption.priceDeal.dealProgramName` |
| Savings percentage | `standalonePriceOption.priceDeal.savingsPercentage` |
| Hotel total (standalone) | `standalonePriceOption.price.payment.total.charge.amount` |
| Flight total (standalone) | `flyItem.priceContainer[0].standalonePriceOption.price.payment.total.charge.amount` |
| **Bundle total (package)** | `proposals[n].price.payment.total.charge.amount` |
| Bundle strikethrough | `proposals[n].price.strikeThrough.charge.amount` |
| Flight route outbound | `flyItem.slices[0].segments[].origin.code` → `destination.code` |
| Flight carrier | `flyItem.slices[0].segments[0].carrier.name` |
| Lowest flight price | `flyResponse.summary.search.itineraries.lowestTotalPrice.amount` |

---

## Important Notes

- **Resort fees** (`Postpaid Mandatory Fees`) are separate from the total. Show them as "Excludes $X resort fee paid at hotel" in fine print.
- **`isPayAtHotel: true`** means the hotel total is the pay-now amount, but resort fees come on top at checkout.
- **Proposals are the source of truth for bundle pricing** — never add hotel + flight standalone prices to compute a bundle price, use `proposals[].price.payment.total.charge.amount`.
- **Flight price is per-party (all passengers combined)**, not per-person. Divide by traveler count to show per-person price.
- `priceKey` from the proposal must be passed during checkout to book the correct rate — save it alongside the hotel and flight `itemKey`.
