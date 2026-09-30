# Data Source: pkg-search (Package Search)

pkg-search is Priceline's flight+hotel package booking application. You can deep-link into it with a pre-filled search by constructing a GET URL with the right query parameters.

**Repo:** `pcln/pkg-search`

---

## Search URL

```
https://qaa.priceline.com/shop/search/?{params}
```

Use `qaa.priceline.com` for QA/non-prod. This is the only environment mobility-vibes prototypes deploy to.

---

## Query Parameters

| Parameter | Description | Format |
|-----------|-------------|--------|
| `origin` | Origin airport code | `EWR`, `JFK`, `LAX` |
| `destination` | Destination airport code | `MIA`, `ORD`, `DEN` |
| `departure-date` | Outbound date | `YYYYMMDD` — e.g. `20260710` |
| `return-date` | Return date | `YYYYMMDD` — e.g. `20260714` |
| `num-adults` | Number of adult travelers | Integer — e.g. `2` |
| `package-type-code` | Package components | `AH` (air + hotel), `AHC` (+ car) |
| `num-rooms` | Hotel rooms | Integer, defaults to `1` |

### Example URL

```
https://qaa.priceline.com/shop/search/?origin=EWR&destination=MIA&departure-date=20260710&return-date=20260714&num-adults=2&package-type-code=AH
```

---

## Building the URL in TypeScript

```typescript
function pkgSearchUrl(
  originAirport: string,
  destinationAirport: string,
  departDate: string,   // yyyy-MM-dd
  returnDate: string,   // yyyy-MM-dd
  travelers: number,
): string {
  const fmt = (d: string) => d.replace(/-/g, '') // yyyy-MM-dd → YYYYMMDD
  const params = new URLSearchParams({
    origin: originAirport,
    destination: destinationAirport,
    'departure-date': fmt(departDate),
    'return-date': fmt(returnDate),
    'num-adults': String(travelers),
    'package-type-code': 'AH',
  })
  return `https://qaa.priceline.com/shop/search/?${params}`
}
```

### Opening in a new tab

```tsx
<a href={pkgSearchUrl(...)} target="_blank" rel="noopener noreferrer">
  Book this package
</a>
```

---

## Tips

- **Date format is `YYYYMMDD` with no dashes** — the most common mistake is passing `yyyy-MM-dd` directly. Strip the dashes.
- **`package-type-code=AH`** is the default for flight+hotel. Add `C` for car (`AHC`) if needed.
- Always open in a new tab (`target="_blank"`) — sending the user away from the prototype in the same tab breaks the flow.
