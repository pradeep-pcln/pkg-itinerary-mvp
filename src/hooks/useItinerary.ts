import { useEffect, useState } from 'react'
import { cityName } from '../lib/itinerary'
import type { AiDay } from '../lib/itinerary'
import type { NormalizedPackage } from '../types'

// Cancun-only until Phase 6 generalizes the search form.
const DESTINATION_CITY_ID = '3000061781'

const sessionCache = new Map<string, AiDay[]>()

function cacheKey(pkg: NormalizedPackage): string {
  const hotel = pkg.hotelName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return `${pkg.destination}|${hotel}|${pkg.nights}|${pkg.allInclusive}|${pkg.departDate.slice(0, 7)}`
}

interface FetchState {
  key: string
  aiDays: AiDay[] | null
  error: string | null
}

export function useItinerary(pkg: NormalizedPackage | null) {
  const key = pkg ? cacheKey(pkg) : null
  const [fetchState, setFetchState] = useState<FetchState | null>(null)

  useEffect(() => {
    if (!pkg || !key || sessionCache.has(key)) return

    let cancelled = false
    const requestKey = key
    const body = {
      destinationCityId: DESTINATION_CITY_ID,
      destinationCity: cityName(pkg.destination),
      hotelName: pkg.hotelName,
      nights: pkg.nights,
      allInclusive: pkg.allInclusive,
      departDate: pkg.departDate,
    }

    async function load() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/itinerary`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({ error: 'invalid_response', days: [] }))
        if (cancelled) return
        const days: AiDay[] = Array.isArray(data.days) ? data.days : []
        if (!res.ok || data.error || days.length === 0) {
          setFetchState({
            key: requestKey,
            aiDays: null,
            error: typeof data.error === 'string' ? data.error : 'generation_failed',
          })
          return
        }
        sessionCache.set(requestKey, days)
        setFetchState({ key: requestKey, aiDays: days, error: null })
      } catch (err) {
        if (!cancelled) {
          setFetchState({
            key: requestKey,
            aiDays: null,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [key, pkg])

  if (!pkg || !key) return { aiDays: null, loading: false, error: null }

  const cached = sessionCache.get(key)
  if (cached) return { aiDays: cached, loading: false, error: null }

  if (fetchState?.key === key) {
    return { aiDays: fetchState.aiDays, loading: false, error: fetchState.error }
  }

  return { aiDays: null, loading: true, error: null }
}
