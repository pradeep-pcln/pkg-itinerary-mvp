# bundle-search unified-search API

Two-step flow to get hotel+flight package results.

**Status:** STAY-only confirmed working in Postman (2026-07-01). FLY component pending.

---

## Endpoints

| Step | Method | URL |
|------|--------|-----|
| 1. CreateRequestCache | POST | `https://api.priceline.com/bundle/usp/cache/v1/request` |
| 2. unified-search | POST | `https://api.priceline.com/bundle/search/v1/unified-search` |

Both are production endpoints — no auth header required when calling from server-side on Priceline network.

Session keys expire in ~60 minutes. Always call step 1 first to get a fresh key.

---

## Step 1 — CreateRequestCache

Sets up the flight search parameters. The FLY component config lives here; unified-search reads it via the session key.

**Key rules:**
- `clientType: "PACKAGE_QL"` is required
- FLY slices have **only** `departDateTimes` — no origins/destinations in slices
- Origins/destinations go in `flyBundleAttributes.bundleLocation` on the component
- STAY destination uses `city.cityId` (not airport code) in `flyBundleAttributes`
- Timestamps are **midnight UTC** in epoch seconds
- STAY in the cache uses `stayAssociation.deriveFromComponentIndex` to inherit location/dates/occupants from FLY

### EWR → CUN, Aug 15–22 2026, 2 adults

```json
{
  "header": {
    "context": {
      "appc": "DESKTOP",
      "appv": "node",
      "rguid": "vibe-postman-crc-001",
      "cguid": "22222222-2222-2222-2222-222222222222",
      "plf": "PCLN",
      "gpcd": "PCLN",
      "transId": "vibe-postman-crc-001",
      "referral": { "id": "DIRECT", "sourceId": "DT" }
    },
    "sla": { "maxTimeout": "20s" },
    "pointOfSale": {
      "countryCode": "US",
      "languageCode": "EN",
      "currencyCode": "USD",
      "locale": "en-us"
    }
  },
  "body": {
    "searchComponentRequest": {
      "timestamp": { "seconds": "1786752000" },
      "clientType": "PACKAGE_QL",
      "requestTypeInfo": { "requestType": "BUNDLE_REQUEST" },
      "componentRequest": [
        {
          "type": "FLY",
          "key": "FLY-1",
          "index": 1,
          "platformFlyRequest": {
            "flyRequest": {
              "flyQuery": {
                "passengers": [
                  { "id": 1, "type": "ADULT" },
                  { "id": 2, "type": "ADULT" }
                ],
                "tripQuery": {
                  "id": 1,
                  "itineraryTypes": ["FLY_RETAIL", "FLY_FUSED"],
                  "priority": 1,
                  "slices": [
                    { "id": 1, "departDateTimes": [{ "seconds": "1786752000" }] },
                    { "id": 2, "departDateTimes": [{ "seconds": "1787356800" }] }
                  ],
                  "requestOption": {
                    "cabinClass": { "name": "ECONOMY", "type": "PREFERRED_CABIN_CLASS" }
                  },
                  "sortOption": {
                    "sortOptionTypes": ["LOWEST_PRICE", "UNIQUE_SLICE"]
                  }
                }
              },
              "step": { "reservedStep": "SEARCH" }
            },
            "flyBundleAttributes": {
              "bundleLocation": {
                "origin": { "area": { "airport": { "airportCode": "EWR" } } },
                "destination": { "area": { "city": { "cityId": "3000061781" } } }
              }
            }
          }
        },
        {
          "type": "STAY",
          "key": "STAY-1",
          "index": 2,
          "platformStayRequest": {
            "stayRequest": {
              "stayQuery": {
                "roomInfo": { "count": 1 },
                "staySearchRequestOption": {
                  "stayPagination": { "pageSize": 30, "offset": 1 }
                }
              },
              "step": { "reservedStep": "SEARCH" }
            },
            "stayBundleAttributes": {
              "stayAssociation": {
                "location": { "deriveFromComponentIndex": 1 },
                "checkIn": { "deriveFromComponentIndex": 1 },
                "checkOut": { "deriveFromComponentIndex": 1 },
                "occupants": { "deriveFromComponentIndex": 1 }
              }
            }
          }
        }
      ]
    }
  }
}
```

**Response:** `body.sessionKey` — use this in step 2.

---

## Step 2 — unified-search

Fetches results for all components. The session key binds this call to the flight config from step 1.

**Key rules:**
- `isPivot: true` is required on the STAY component
- STAY location uses `area.airport.airportCode` (airport code, not city ID)
- Keep the STAY request minimal — extra fields like `stayResponseOptions` or `stayFilterOptions` cause `PROCESSOR_ERROR`
- Timestamps are the same midnight UTC seconds as step 1
- `session.key` must come from a fresh CRC response (TTL ~60 min)

### Working STAY-only request (confirmed 2026-07-01)

```json
{
  "header": {
    "context": {
      "appc": "DESKTOP",
      "appv": "node",
      "rguid": "vibe-postman-us-004",
      "cguid": "22222222-2222-2222-2222-222222222222",
      "plf": "PCLN",
      "gpcd": "PCLN",
      "transId": "vibe-postman-us-004",
      "ua": "node",
      "referral": { "id": "DIRECT", "sourceId": "DT" },
      "visitId": "vibe-postman-us-004"
    },
    "sla": { "maxTimeout": "20s" },
    "pointOfSale": {
      "countryCode": "US",
      "languageCode": "EN",
      "currencyCode": "USD",
      "locale": "en-us"
    }
  },
  "body": {
    "componentRequests": [
      {
        "isPivot": true,
        "type": "STAY",
        "key": "STAY-1",
        "index": 1,
        "platformStayRequest": {
          "stayRequest": {
            "stayQuery": {
              "checkIn": { "seconds": "1786752000" },
              "checkOut": { "seconds": "1787356800" },
              "occupants": [
                { "id": 1, "type": "ADULT" },
                { "id": 2, "type": "ADULT" }
              ],
              "roomInfo": { "count": 1 },
              "location": { "area": { "airport": { "airportCode": "CUN" } } }
            },
            "step": { "reservedStep": "SEARCH" }
          }
        }
      }
    ],
    "session": { "key": "<SESSION_KEY_FROM_CRC>" },
    "requestType": "BUNDLE_REQUEST"
  }
}
```

**Result:** 30+ Cancun hotels in `body.componentResults[0].platformStayResult.stayResult.stayItems[]`

---

## Key Reference Values

| Field | Value |
|-------|-------|
| Origin airport | `EWR` |
| Destination airport | `CUN` |
| Destination city ID | `3000061781` |
| Depart timestamp (Aug 15 2026 midnight UTC) | `1786752000` |
| Return timestamp (Aug 22 2026 midnight UTC) | `1787356800` |
| Travelers | 2 adults |

---

## Response Shape — STAY component

```
body.componentResults[]
  .platformStayResult.stayResult.stayItems[]
    .stay.hotel
      .hotelId
      .name
      .starRating
      .guestRating
      .heroImage.url
      .address { city, stateCode, countryCode }
    .stay.stayRate
      .stayPriceComponents[0]
        .pricing.price.amount  ← price per night
        .pricing.totalPrice.amount  ← total stay price
```

---

## Known Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `PROCESSOR_ERROR_UNABLE_TO_PROCESS_REQUEST` | Extra fields in STAY query (stayResponseOptions, stayFilterOptions, stayFilterInput) | Strip to bare minimum fields only |
| `Either Airport or City must be present` | Missing `location` in STAY stayQuery | Add `location: { area: { airport: { airportCode: "CUN" } } }` |
| `Unsupported Location Type: area { city { city_id } }` | Using `city.cityId` in unified-search STAY location | Use `airport.airportCode` instead for STAY location |
| `Unsupported Location Type: city_id` in CRC | Using wrong location format in CRC FLY destination | Use `area.city.cityId` format (not `area.airport`) |
| FLY slices rejected | Slices had origins/destinations inside them | Remove origins/destinations from slices — only `departDateTimes` |
| Session key expired | TTL is ~60 min | Call CreateRequestCache again to get a fresh session key |
