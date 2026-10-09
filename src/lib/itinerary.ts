import type { FlightLeg, NormalizedPackage } from '../types'

const CITY_BY_CODE: Record<string, string> = {
  CUN: 'Cancun',
  EWR: 'Newark',
  JFK: 'New York',
  LGA: 'New York',
  LAX: 'Los Angeles',
  ORD: 'Chicago',
  MIA: 'Miami',
  DFW: 'Dallas',
}

export function cityName(code: string): string {
  return CITY_BY_CODE[code] ?? code
}

// Flight epochs and date strings are both treated as UTC so they render as airport-local wall time
const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const LONG_DAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const WHOLE_NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const DAY_MS = 86_400_000

function dateToUtc(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function addDays(date: string, days: number): string {
  return new Date(dateToUtc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function epochToTime(seconds: string): string {
  if (!seconds) return ''
  return TIME_FORMAT.format(new Date(Number(seconds) * 1000))
}

// YYYY-MM-DD → "Mon, Sep 28"
export function formatDate(date: string): string {
  return DAY_FORMAT.format(dateToUtc(date))
}

// YYYY-MM-DD → "Monday, September 28"
export function formatLongDate(date: string): string {
  return LONG_DAY_FORMAT.format(dateToUtc(date))
}

// YYYY-MM-DD → "Sep 28"
export function shortDate(date: string): string {
  return SHORT_DATE_FORMAT.format(dateToUtc(date))
}

export function formatAmount(amount: number): string {
  return WHOLE_NUMBER_FORMAT.format(Math.round(amount))
}

const RC_DATE_TIME = /^(\d{4})-?(\d{2})-?(\d{2})T(\d{2}):(\d{2})/

// rc-availability date-times look like "20260928T12:00"
export function carTime(dateTime: string): string {
  const m = RC_DATE_TIME.exec(dateTime)
  if (!m) return ''
  const [, y, mo, d, h, mi] = m
  return TIME_FORMAT.format(new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))))
}

export function stopsLabel(legs: FlightLeg[]): string {
  const stops = legs.length - 1
  if (stops <= 0) return 'Nonstop'
  const via = legs.slice(1).map((l) => l.origin).join(', ')
  return `${stops} stop${stops > 1 ? 's' : ''} · ${via}`
}

// "Nonstop" or "1 stop"
export function stopsCountLabel(legs: FlightLeg[]): string {
  const stops = legs.length - 1
  if (stops <= 0) return 'Nonstop'
  return `${stops} stop${stops > 1 ? 's' : ''}`
}

// "Nonstop" or "1 stop via MIA"
function stopsViaLabel(legs: FlightLeg[]): string {
  const stops = legs.length - 1
  if (stops <= 0) return 'Nonstop'
  return `${stopsCountLabel(legs)} via ${legs.slice(1).map((l) => l.origin).join(', ')}`
}

export interface Layover {
  airport: string
  durationLabel: string
}

function durationLabel(fromSeconds: string, toSeconds: string): string {
  const minutes = Math.round((Number(toSeconds) - Number(fromSeconds)) / 60)
  if (!fromSeconds || !toSeconds || !Number.isFinite(minutes) || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function layovers(legs: FlightLeg[]): Layover[] {
  return legs.slice(1).map((leg, i) => ({
    airport: leg.origin,
    durationLabel: durationLabel(legs[i].arriveTime, leg.departTime),
  }))
}

const TITLE_SUFFIXES = ['Escape', 'Getaway', 'Retreat'] as const

function hotelStyle(pkg: NormalizedPackage): string {
  if (pkg.allInclusive) return 'All-Inclusive'
  if (pkg.starRating >= 5) return 'Luxury'
  return 'Beach'
}

// dealProgramName arrives as a code such as "Package_Deals"
export function dealLabel(dealName: string): string {
  return dealName.replace(/_/g, ' ')
}

export function tripTitle(pkg: NormalizedPackage): string {
  const suffix = TITLE_SUFFIXES[pkg.proposalIndex % TITLE_SUFFIXES.length]
  return `${cityName(pkg.destination)} ${hotelStyle(pkg)} ${suffix}`
}

export function tripDaysLabel(pkg: NormalizedPackage): string {
  return `${pkg.nights + 1} Days · ${pkg.nights} Nights`
}

export function tripMeta(pkg: NormalizedPackage): string {
  return `${tripDaysLabel(pkg)} · ${cityName(pkg.destination)}`
}

export function travelersLabel(travelers: number): string {
  return `${travelers} traveler${travelers > 1 ? 's' : ''}`
}

export function nightsLabel(nights: number): string {
  return `${nights} night${nights === 1 ? '' : 's'}`
}

// Only the outbound carrier name is resolved server-side; other carriers fall back to their code
function airlineName(pkg: NormalizedPackage, legs: FlightLeg[]): string {
  const carrier = legs[0]?.carrier ?? ''
  return carrier === pkg.outboundLegs[0]?.carrier ? pkg.airline : carrier
}

export interface FlightCard {
  direction: 'Outbound' | 'Return'
  date: string
  from: string
  to: string
  departTime: string
  arriveTime: string
  isNonstop: boolean
  stopsLabel: string
  airline: string
  airlineLogoUrl: string
  layovers: Layover[]
}

export function flightCards(pkg: NormalizedPackage): FlightCard[] {
  const slices: Array<[FlightCard['direction'], string, FlightLeg[]]> = [
    ['Outbound', pkg.departDate, pkg.outboundLegs],
    ['Return', pkg.returnDate, pkg.returnLegs],
  ]
  return slices.flatMap(([direction, date, legs]) => {
    if (legs.length === 0) return []
    const first = legs[0]
    const last = legs[legs.length - 1]
    const airline = airlineName(pkg, legs)
    return [{
      direction,
      date,
      from: first.origin,
      to: last.destination,
      departTime: epochToTime(first.departTime),
      arriveTime: epochToTime(last.arriveTime),
      isNonstop: legs.length === 1,
      stopsLabel: stopsCountLabel(legs),
      airline,
      airlineLogoUrl: airline === pkg.airline ? pkg.airlineLogoUrl : '',
      layovers: layovers(legs),
    }]
  })
}

export type ItineraryItemKind = 'flight' | 'car' | 'hotel' | 'meal' | 'activity'

export interface ActivityAttribution {
  placeName: string
  googleMapsUrl: string
}

export interface ActivityImageResult {
  imageUrl: string | null
  attribution: ActivityAttribution | null
}

export const TRIP_STYLES = ['Relaxed', 'Food & culture', 'Sightseeing', 'Family-friendly', 'Nightlife', 'Balanced'] as const
export type TripStyle = typeof TRIP_STYLES[number]

export interface ShapeChoice {
  style: TripStyle
  days: number[]
}

export interface ItineraryItem {
  kind: ItineraryItemKind
  // Empty when the time isn't known (car and hotel times are search defaults, not real times)
  time: string
  title: string
  description: string
  location?: string
  categoryLabel: string
  isAiSuggested?: boolean
  imageUrl?: string | null
  attribution?: ActivityAttribution | null
}

export interface ItineraryDay {
  day: number
  date: string
  // Short name shown under "Day N" in the tab
  tabLabel: string
  title: string
  description: string
  items: ItineraryItem[]
  // Middle days with no booked travel; Phase 5 fills these with suggestions
  isFreeDay: boolean
}

function flightItem(pkg: NormalizedPackage, legs: FlightLeg[]): ItineraryItem[] {
  if (legs.length === 0) return []
  const first = legs[0]
  const last = legs[legs.length - 1]
  const departTime = epochToTime(first.departTime)
  const arriveTime = epochToTime(last.arriveTime)
  const times = departTime && arriveTime ? `${departTime} – ${arriveTime}` : ''
  const description = [airlineName(pkg, legs), stopsViaLabel(legs), times].filter(Boolean).join(' · ')
  return [{
    kind: 'flight',
    time: departTime,
    title: `${first.origin} → ${last.destination}`,
    description,
    categoryLabel: 'Flight',
  }]
}

function carPickupItem(pkg: NormalizedPackage): ItineraryItem[] {
  if (!pkg.car) return []
  return [{
    kind: 'car',
    time: '',
    title: 'Pick up your rental car',
    description: [pkg.car.vendor, pkg.car.carType].filter(Boolean).join(' · '),
    location: pkg.car.pickupLocation,
    categoryLabel: 'Transportation',
  }]
}

function carReturnItem(pkg: NormalizedPackage): ItineraryItem[] {
  if (!pkg.car) return []
  return [{
    kind: 'car',
    time: '',
    title: 'Return your rental car',
    description: [pkg.car.vendor, pkg.car.carType].filter(Boolean).join(' · '),
    location: pkg.car.returnLocation,
    categoryLabel: 'Transportation',
  }]
}

function hotelDetails(pkg: NormalizedPackage): string {
  return [pkg.starRating > 0 ? `${pkg.starRating}-star` : '', nightsLabel(pkg.nights)].filter(Boolean).join(' · ')
}

function checkInItem(pkg: NormalizedPackage): ItineraryItem {
  return { kind: 'hotel', time: '', title: `Check in at ${pkg.hotelName}`, description: hotelDetails(pkg), categoryLabel: 'Hotel' }
}

function checkOutItem(pkg: NormalizedPackage): ItineraryItem {
  return { kind: 'hotel', time: '', title: `Check out of ${pkg.hotelName}`, description: hotelDetails(pkg), categoryLabel: 'Hotel' }
}

function mealItem(pkg: NormalizedPackage): ItineraryItem[] {
  if (!pkg.allInclusive) return []
  return [{
    kind: 'meal',
    time: '',
    title: `All-inclusive dining at ${pkg.hotelName}`,
    description: 'Meals and drinks are included with your stay',
    categoryLabel: 'Meal',
  }]
}

function flightPhrase(pkg: NormalizedPackage, legs: FlightLeg[]): string {
  if (legs.length === 0) return ''
  const airline = airlineName(pkg, legs)
  return `fly ${legs[0].origin} to ${legs[legs.length - 1].destination}${airline ? ` on ${airline}` : ''}`
}

// Joins clauses as "a, b and c." with the first letter capitalized
function sentence(clauses: string[]): string {
  const parts = clauses.filter(Boolean)
  if (parts.length === 0) return ''
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

function arrivalDescription(pkg: NormalizedPackage): string {
  return sentence([
    flightPhrase(pkg, pkg.outboundLegs),
    pkg.car ? 'pick up your car' : '',
    `check in at ${pkg.hotelName}`,
  ])
}

function departureDescription(pkg: NormalizedPackage): string {
  return sentence([
    `check out of ${pkg.hotelName}`,
    pkg.car ? 'return your car' : '',
    flightPhrase(pkg, pkg.returnLegs),
  ])
}

function freeDayDescription(pkg: NormalizedPackage, openDayCopy: boolean): string {
  const city = pkg.destinationCityName || cityName(pkg.destination)
  if (openDayCopy) return "Nothing's planned yet, and that's okay. Wander at your own pace, or tap Plan day and we'll shape it around your trip."
  return pkg.allInclusive
    ? `Explore ${city} or stay in at ${pkg.hotelName}, with meals and drinks included.`
    : `Nothing is booked, so the day is yours to explore ${city}.`
}

export function buildItineraryDays(pkg: NormalizedPackage, openDayCopy = false): ItineraryDay[] {
  const totalDays = Math.max(pkg.nights, 0) + 1
  const city = pkg.destinationCityName || cityName(pkg.destination)
  const arrivalItems = [...flightItem(pkg, pkg.outboundLegs), ...carPickupItem(pkg), checkInItem(pkg)]
  const departureItems = [checkOutItem(pkg), ...carReturnItem(pkg), ...flightItem(pkg, pkg.returnLegs)]

  return Array.from({ length: totalDays }, (_, i): ItineraryDay => {
    const day = i + 1
    const date = addDays(pkg.departDate, i)
    const isFirst = day === 1
    const isLast = day === totalDays
    if (isFirst && isLast) {
      return {
        day, date, tabLabel: 'Arrival & departure', title: `Arrive in ${city} · fly home`,
        description: `${arrivalDescription(pkg)} ${departureDescription(pkg)}`,
        items: [...arrivalItems, ...departureItems], isFreeDay: false,
      }
    }
    if (isFirst) {
      return { day, date, tabLabel: 'Arrival', title: `Arrive in ${city}`, description: arrivalDescription(pkg), items: arrivalItems, isFreeDay: false }
    }
    if (isLast) {
      return { day, date, tabLabel: 'Departure', title: 'Check out · fly home', description: departureDescription(pkg), items: departureItems, isFreeDay: false }
    }
    return {
      day,
      date,
      tabLabel: openDayCopy ? 'Your day' : 'Free day',
      title: openDayCopy ? `${city.split(',')[0].trim()}, your way` : `Free day in ${city}`,
      description: freeDayDescription(pkg, openDayCopy),
      items: openDayCopy ? [] : mealItem(pkg),
      isFreeDay: true,
    }
  })
}

// Shape returned by POST /api/itinerary. `category` is activity | dining | transport | leisure.
export interface AiItem {
  time: string
  category: string
  title: string
  description: string
}

export interface AiDay {
  day: number
  tabLabel: string
  title: string
  description: string
  items: AiItem[]
}

const AI_KIND: Record<string, ItineraryItemKind> = {
  activity: 'activity',
  dining: 'meal',
  transport: 'car',
  leisure: 'activity',
}

const AI_LABEL: Record<string, string> = {
  activity: 'Activity',
  dining: 'Dining',
  transport: 'Transportation',
  leisure: 'Leisure',
}

function aiItemToItineraryItem(item: AiItem, images: ReadonlyMap<string, ActivityImageResult>): ItineraryItem {
  const image = images.get(item.title)
  return {
    kind: AI_KIND[item.category] ?? 'activity',
    time: item.time,
    title: item.title,
    description: item.description,
    categoryLabel: AI_LABEL[item.category] ?? 'Activity',
    isAiSuggested: true,
    imageUrl: image?.imageUrl ?? null,
    attribution: image?.attribution ?? null,
  }
}

// Replaces free-day placeholders with AI suggestions. Arrival and departure days stay as booked.
export function mergeAiDays(
  staticDays: ItineraryDay[],
  aiDays: AiDay[],
  activityImages: ReadonlyMap<string, ActivityImageResult>,
): ItineraryDay[] {
  const aiByDay = new Map(aiDays.map((day) => [day.day, day]))
  return staticDays.map((day) => {
    if (!day.isFreeDay) return day
    const ai = aiByDay.get(day.day)
    if (!ai) return day
    return {
      ...day,
      tabLabel: ai.tabLabel,
      title: ai.title,
      description: ai.description,
      isFreeDay: false,
      items: ai.items.map((item) => aiItemToItineraryItem(item, activityImages)),
    }
  })
}

export const SHARE_PACKAGE_PARAM = 'pkg'

export function itineraryDaysForShare(
  pkg: NormalizedPackage,
  aiDays: AiDay[] | null,
  activityImages: ReadonlyMap<string, ActivityImageResult>,
): ItineraryDay[] {
  const staticDays = buildItineraryDays(pkg)
  if (!aiDays || aiDays.length === 0) return staticDays
  return mergeAiDays(staticDays, aiDays, activityImages)
}

export function shareUrl(pkg: NormalizedPackage, pageHref: string): string {
  const url = new URL(pageHref)
  url.searchParams.set(SHARE_PACKAGE_PARAM, pkg.hotelItemKey)
  url.hash = ''
  return url.toString()
}

function shareItemLine(item: ItineraryItem): string {
  return item.time ? `${item.time} ${item.title}` : item.title
}

export function shareTripText(pkg: NormalizedPackage, days: ItineraryDay[], pageHref: string): string {
  const perPerson = perPersonPrice(pkg)
  const total = `${pkg.currencySymbol}${formatAmount(pkg.bundleTotal)} total`
  const priceLine = perPerson > 0
    ? `${total} · ${pkg.currencySymbol}${formatAmount(perPerson)} per person`
    : total
  const header = [
    tripTitle(pkg),
    `${shortDate(pkg.departDate)} – ${shortDate(pkg.returnDate)} · ${nightsLabel(pkg.nights)} · ${travelersLabel(pkg.travelers)}`,
    priceLine,
  ]
  const dayBlocks = days.map((day) => [`Day ${day.day} — ${day.title}`, ...day.items.map(shareItemLine)].join('\n'))
  return [...header, '', dayBlocks.join('\n\n'), '', 'Open this package:', shareUrl(pkg, pageHref)].join('\n')
}

export function tripHighlights(pkg: NormalizedPackage): string[] {
  const candidates: Array<[boolean, string]> = [
    [true, pkg.airline ? `Round-trip flights on ${pkg.airline}` : 'Round-trip flights'],
    [pkg.nights > 0, `${nightsLabel(pkg.nights)} at ${pkg.hotelName}`],
    [pkg.car !== null, `Rental car${pkg.car?.vendor ? ` from ${pkg.car.vendor}` : ''}`],
    [pkg.allInclusive, 'All-Inclusive'],
    [pkg.freeCancellation, 'Free hotel cancellation'],
  ]
  return candidates.flatMap(([show, label]) => (show ? [label] : []))
}

export function packageIncludes(pkg: NormalizedPackage): string[] {
  // The flown airport can differ from the searched one (JFK for an EWR search)
  const from = pkg.outboundLegs[0]?.origin || pkg.origin
  const to = pkg.outboundLegs[pkg.outboundLegs.length - 1]?.destination || pkg.destination
  const candidates: Array<[boolean, string]> = [
    [true, `Round-trip flights ${from} ⇄ ${to}`],
    [pkg.nights > 0, `${pkg.nights}-night stay at ${pkg.hotelName}`],
    [pkg.car !== null, `Rental car${pkg.car?.vendor ? ` from ${pkg.car.vendor}` : ''}`],
    [pkg.allInclusive, 'All-inclusive meals & drinks'],
    [pkg.freeCancellation, 'Free hotel cancellation'],
  ]
  return candidates.flatMap(([show, label]) => (show ? [label] : []))
}

// TODO: fixed copy, confirm wording with product
export function packageExcludes(pkg: NormalizedPackage): string[] {
  const candidates: Array<[boolean, string]> = [
    [true, 'Travel insurance'],
    [true, 'Activities & excursions'],
    [!pkg.allInclusive, 'Meals'],
    [pkg.resortFee > 0, `Resort fee of ${pkg.currencySymbol}${formatAmount(pkg.resortFee)}, paid at hotel`],
    [true, 'Gratuities'],
    [true, 'Personal expenses'],
  ]
  return candidates.flatMap(([show, label]) => (show ? [label] : []))
}

export interface TripIncludeItem {
  kind: ItineraryItemKind
  label: string
}

export function tripIncludes(pkg: NormalizedPackage): TripIncludeItem[] {
  const candidates: Array<[boolean, TripIncludeItem]> = [
    [true, { kind: 'flight', label: 'Round-trip flights' }],
    [pkg.nights > 0, { kind: 'hotel', label: `${pkg.nights}-night hotel` }],
    [pkg.car !== null, { kind: 'car', label: 'Rental car' }],
    [pkg.allInclusive, { kind: 'meal', label: 'All-inclusive' }],
  ]
  return candidates.flatMap(([show, item]) => (show ? [item] : []))
}

export interface PriceLine {
  label: string
  amount: number
}

export interface PriceBreakdown {
  // "$1,234 × 2 travelers"; null when there's no per-person price
  perTravelerLine: PriceLine | null
  lines: PriceLine[]
  total: number
  perPerson: number
  savings: number
  // Collected by the hotel at checkout, not part of `total`
  resortFee: number
}

export function priceBreakdown(pkg: NormalizedPackage): PriceBreakdown {
  // The server folds the car price into bundleTotal, so back it out for the flight + hotel line
  const carTotal = pkg.car?.totalPrice ?? 0
  const perPerson = perPersonPrice(pkg)
  const candidates: Array<[boolean, PriceLine]> = [
    [true, { label: 'Flight + Hotel', amount: pkg.bundleTotal - carTotal }],
    [carTotal > 0, { label: 'Rental car', amount: carTotal }],
  ]
  return {
    perTravelerLine: perPerson > 0
      ? { label: `${pkg.currencySymbol}${formatAmount(perPerson)} × ${travelersLabel(pkg.travelers)}`, amount: pkg.bundleTotal }
      : null,
    lines: candidates.flatMap(([show, line]) => (show ? [line] : [])),
    total: pkg.bundleTotal,
    perPerson,
    savings: Math.max(pkg.bundleStrikethrough - pkg.bundleTotal, 0),
    resortFee: pkg.resortFee,
  }
}

export function bookUrl(pkg: NormalizedPackage): string {
  const params = new URLSearchParams({
    origin: pkg.origin,
    destination: pkg.destination,
    'departure-date': pkg.departDate.replace(/-/g, ''),
    'return-date': pkg.returnDate.replace(/-/g, ''),
    'num-adults': String(pkg.travelers),
    // TODO: confirm AHC (air + hotel + car) against QA before shipping
    'package-type-code': pkg.car ? 'AHC' : 'AH',
  })
  return `https://qaa.priceline.com/shop/search/?${params}`
}

export function perPersonPrice(pkg: NormalizedPackage): number {
  return pkg.bundleTotal > 0 ? Math.round(pkg.bundleTotal / Math.max(pkg.travelers, 1)) : 0
}
