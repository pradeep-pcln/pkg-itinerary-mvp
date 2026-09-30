import type { NormalizedPackage } from '../types'

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

export interface ItineraryDay {
  day: number
  title: string
  isPlaceholder: boolean
}

const MIDDLE_DAY_ACTIVITIES = [
  'Beach day',
  'Chichen Itza day trip',
  'Isla Mujeres by ferry',
  'Snorkel the Mesoamerican Reef',
  'Cenote swim & Tulum ruins',
  'Spa & pool day',
]

export function placeholderDays(pkg: NormalizedPackage): ItineraryDay[] {
  const totalDays = pkg.nights + 1
  const city = cityName(pkg.destination)
  return Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1
    if (day === 1) {
      return { day, title: `Arrive in ${city} · check in at ${pkg.hotelName}`, isPlaceholder: true }
    }
    if (day === totalDays) {
      return { day, title: 'Check out · fly home', isPlaceholder: true }
    }
    return { day, title: MIDDLE_DAY_ACTIVITIES[(i - 1) % MIDDLE_DAY_ACTIVITIES.length], isPlaceholder: true }
  })
}

export interface ItineraryHighlight {
  label: string
  isPlaceholder: boolean
}

const HIGHLIGHTS: ItineraryHighlight[] = [
  { label: 'Round-trip flights included', isPlaceholder: true },
  { label: 'Beachfront hotel stay', isPlaceholder: true },
  { label: 'Guided Chichen Itza tour', isPlaceholder: true },
  { label: '24/7 travel support', isPlaceholder: true },
]

export function placeholderHighlights(): ItineraryHighlight[] {
  return HIGHLIGHTS
}

// Middle days of placeholderDays are the "activities"
export function placeholderActivityCount(pkg: NormalizedPackage): number {
  return Math.max(pkg.nights - 1, 0)
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
