# Phased Implementation Plan — pkg-itinerary-mvp

> **Branch:** `vibe/pkg-itinerary-mvp`  
> All phases are built and demoed against the existing Cancun-only search (Phases 1–5) before the search form is generalized in Phase 6.

---

## Phase 1 — Results Screen Redesign ✅
**Real data only · No new backend**

Rebuild `PackageCard` / results grid to match the prototype's visual design using real `@pcln/horizon` components:

- Hero image
- Badges: deal, all-inclusive, free-cancellation
- Review / guest score
- Part icons: flight / hotel / car
- Pricing (nightly rate + bundle total)
- "View Itinerary" + "Book Now" buttons

**Scope:** Pure re-skin of data already returned by `/api/packages`. No new API routes, no AI. Keeps the current Cancun-only search.

---

## Phase 2 — Itinerary Drawer Shell ✅
**Real data only · No AI**

Build the slide-in drawer UI scaffold:

- Header with hotel name + hero image
- Hotel section (star rating, guest rating, amenities)
- Flights & transportation section (outbound / return legs, rental car)
- Price breakdown (flight + hotel + car line items)
- Sticky footer: total price + "Book Now" CTA

**Scope:** Populated entirely from data already normalized in `server.js` (hotel, flight, rental car, pricing fields). Gives a fully functional real drawer as the scaffold that AI content will later slot into.

---

## Phase 3 — AI Itinerary Generation (Backend) ✅
**New endpoint · LLM on server only · In-memory cache**

- `POST /api/itinerary` (and `/pkg-itinerary-mvp/api/itinerary`)
- LLM call happens **server-side only** — never from the client
- Provider key via env var (`OPENAI_API_KEY` + `OPENAI_BASE_URL` for LiteLLM proxy)
- Structured JSON schema output per day: `{ day, tabLabel, title, description, items[] }` where each item has `{ time, category, title, description }` — **no price fields**
- Server-side `validateItineraryResponse()` sanitizes LLM output before it reaches the client
- In-memory cache (`itineraryCache` Map, 24 h TTL) keyed on `destinationCityId | nights | hotelName(normalized) | allInclusive | departMonth`

**Key env vars added:**

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | LiteLLM key (provisioned via `#mlplatform`) |
| `OPENAI_BASE_URL` | LiteLLM proxy root (e.g. `https://guse4-litellmmgmt-nonprod.dqs.pcln.com`) |
| `OPENAI_MODEL` | Model alias the key is authorized for (e.g. `claude-sonnet-4-6`) |

---

## Phase 4 — Activity Images via Google Places API ✅
**New server-side proxy · Key server-side only · Attribution required**

Add images to AI-suggested activities using Google Places:

- `GET /api/activity-image` (and `/pkg-itinerary-mvp/api/activity-image`) — `?name=<activity>&destination=<city>`
- `GET /api/places-photo` (and `/pkg-itinerary-mvp/api/places-photo`) pipes photo bytes; the Places key never leaves the server
- Name-matching strategy: activity title → Places API (New) Text Search → confidence check (a query word longer than 3 characters must appear in the returned place name). Legacy Text Search is not enabled for this key.
- No match, low confidence, or lookup failure returns `{ imageUrl: null, attribution: null }` so Phase 5 can fall back to the hotel hero image
- Attribution payload (`placeName` + Google Maps place URL) is returned for the Phase 5 UI, per Google's Terms of Service
- In-memory cache (`activityImageCache` Map, 24 h TTL) keyed on `destination | normalized activity name` — separate from `itineraryCache`, same lifetime

**Key env var added:**

| Var | Purpose |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Places API key (Text Search + Photo). Server-side only; provisioned in GSM, never committed. |

---

## Phase 5 — Wire AI Content into the Drawer
**Frontend integration · Skeleton loading · AI labels**

- "View Itinerary" click triggers **on-demand** calls to Phase 3 (`/api/itinerary`) and Phase 4 (`/api/activity-image`)
- Real components (hotel section, flight section, price breakdown) render **immediately**
- Day-by-day section shows a **loading skeleton** until AI content resolves
- Day tabs: Arrival / Day 2 … Day N-1 / Departure — populated from the AI response
- Middle days (`isFreeDay: true`) replace the generic "Free day" placeholder with AI-generated timeline items + activity images
- Every AI-sourced item is **clearly labeled "Suggested — not included"** with no price and no booking CTA

---

## Phase 6 — Search Form Generalization / Multi-Destination
**Unlock real search · Remove hardcoded Cancun**

- Wire real form inputs: **From / Destination / Dates / Travelers**
- Build a destination lookup: city name → `{ airportCode, metroCode, cityId, cityName }` needed to replace all hardcoded `'Cancun'` literals in `server.js`
- Deliberately deferred — Phases 1–5 are fully buildable and demo-able against the existing Cancun-only search first

---

## Phase 7 — Cleanup & Polish
**Scope reduction · Deep-link booking · Local saved trips · Security review**

- **Remove** trip-style chips / "# of activities" filter (confirmed out of scope)
- **"Book This Trip"** → deep-link to the real pkg-search checkout URL (see `references/datasources/pkg-search.md`), not an in-app payment flow
- **Saved trips** → `localStorage`-only mock (no account backend required)
- **Security review pass:**
  - Secrets audit (no keys in code or committed `.env`)
  - LLM / Places output sanitization verification
  - Confirm no PII in prompts (hotel name + destination only — no traveler details)
  - General QA / accessibility pass

---

## Status Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Results Screen Redesign | ✅ Complete |
| 2 | Itinerary Drawer Shell | ✅ Complete |
| 3 | AI Itinerary Generation (Backend) | ✅ Complete |
| 4 | Activity Images via Google Places API | ✅ Complete |
| 5 | Wire AI Content into the Drawer | 🔲 Not started |
| 6 | Search Form Generalization | 🔲 Not started |
| 7 | Cleanup & Polish | 🔲 Not started |
