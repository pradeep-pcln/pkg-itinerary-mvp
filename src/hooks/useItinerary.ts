import { useEffect, useRef, useState } from 'react'
import { TRIP_STYLES } from '../lib/itinerary'
import type { AiDay, ShapeChoice, TripStyle } from '../lib/itinerary'
import type { NormalizedPackage } from '../types'

interface FetchState {
  key: string
  aiDays: AiDay[] | null
  loading: boolean
  error: string | null
}

const sessionCache = new Map<string, AiDay[]>()
const NO_PLANS: AiDay[] = []
const planListeners = new Set<() => void>()

function notifyPlanListeners() {
  for (const listener of planListeners) listener()
}

export function subscribeItineraryPlans(onStoreChange: () => void) {
  planListeners.add(onStoreChange)
  return () => { planListeners.delete(onStoreChange) }
}

const NO_PLAN = { style: null as TripStyle | null, days: NO_PLANS }
const planSnapshots = new Map<string, { style: TripStyle | null; days: AiDay[] }>()

function styleFromCacheKey(key: string, prefix: string): TripStyle | null {
  const rest = key.slice(prefix.length)
  const nonceAt = rest.lastIndexOf('|')
  const daysAt = rest.lastIndexOf('|', nonceAt - 1)
  if (daysAt < 0) return null
  const style = rest.slice(0, daysAt)
  return (TRIP_STYLES as readonly string[]).includes(style) ? style as TripStyle : null
}

export function cachedItineraryPlan(pkg: NormalizedPackage): { style: TripStyle | null; days: AiDay[] } {
  const prefix = packagePrefix(pkg)
  let bestNonce = -1
  let bestKey = ''
  for (const [key, days] of sessionCache) {
    if (!key.startsWith(prefix) || days.length === 0) continue
    const nonce = Number(key.slice(key.lastIndexOf('|') + 1))
    const rank = Number.isFinite(nonce) ? nonce : 0
    if (rank >= bestNonce) {
      bestNonce = rank
      bestKey = key
    }
  }
  if (!bestKey) return NO_PLAN
  const days = sessionCache.get(bestKey) ?? NO_PLANS
  const existing = planSnapshots.get(bestKey)
  if (existing?.days === days) return existing
  const next = { style: styleFromCacheKey(bestKey, prefix), days }
  planSnapshots.set(bestKey, next)
  return next
}

function packagePrefix(pkg: NormalizedPackage): string {
  const month = pkg.departDate.slice(0, 7)
  return `${pkg.destination}|${pkg.hotelName.toLowerCase().trim()}|${pkg.nights}|${pkg.allInclusive}|${month}|`
}

function cacheKey(pkg: NormalizedPackage, shape: ShapeChoice, planNonce: number): string {
  return `${packagePrefix(pkg)}${shape.style}|${shape.days.join(',')}|${planNonce}`
}

export function hasItineraryPlan(pkg: NormalizedPackage, shape: ShapeChoice, planNonce: number): boolean {
  return (sessionCache.get(cacheKey(pkg, shape, planNonce))?.length ?? 0) > 0
}

export function forgetItineraryPlans(pkg: NormalizedPackage) {
  const prefix = packagePrefix(pkg)
  let removed = false
  for (const key of sessionCache.keys()) {
    if (key.startsWith(prefix)) {
      sessionCache.delete(key)
      removed = true
    }
  }
  if (removed) notifyPlanListeners()
}

function requestBody(pkg: NormalizedPackage, shape: ShapeChoice, extra: Record<string, unknown> = {}) {
  return {
    destinationCityId: '3000061781',
    destinationCity: pkg.destinationCityName || cityName(pkg.destination),
    hotelName: pkg.hotelName,
    nights: pkg.nights,
    allInclusive: pkg.allInclusive,
    departDate: pkg.departDate,
    style: shape.style,
    days: shape.days,
    ...extra,
  }
}

function replaceSavedDay(days: AiDay[], day: AiDay): AiDay[] {
  const exists = days.some((entry) => entry.day === day.day)
  const next = exists
    ? days.map((entry) => (entry.day === day.day ? day : entry))
    : [...days, day].sort((a, b) => a.day - b.day)
  return next
}

export function useItinerary(pkg: NormalizedPackage | null, shape: ShapeChoice | null, planNonce = 0) {
  const key = pkg && shape ? cacheKey(pkg, shape, planNonce) : null
  const [fetchState, setFetchState] = useState<FetchState | null>(null)
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null)
  const [regenError, setRegenError] = useState<{ day: number; message: string } | null>(null)
  const [, setVersion] = useState(0)
  const requestId = useRef(0)
  const inFlight = useRef(false)
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    requestId.current += 1
    inFlight.current = false
    setRegeneratingDay(null)
    setRegenError(null)
  }, [key])

  useEffect(() => {
    if (!pkg || !shape || !key || shape.days.length === 0) return
    if (sessionCache.has(key)) return

    const requestKey = key
    let cancelled = false
    setFetchState({ key: requestKey, aiDays: null, loading: true, error: null })

    fetch('/pkg-itinerary-mvp/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody(pkg, shape)),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
        }
        return res.json() as Promise<{ days: AiDay[] }>
      })
      .then(({ days }) => {
        // Keep a plan that finishes after the drawer closes so reopening shows it
        sessionCache.set(requestKey, days)
        notifyPlanListeners()
        if (cancelled) return
        setFetchState({ key: requestKey, aiDays: days, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load itinerary'
        setFetchState({ key: requestKey, aiDays: null, loading: false, error: message })
      })

    return () => { cancelled = true }
  }, [key, pkg, shape])

  async function regenerateDay(day: number) {
    if (!pkg || !shape || !key || inFlight.current) return
    const current = sessionCache.get(key) ?? []

    const id = requestId.current + 1
    requestId.current = id
    inFlight.current = true
    const requestKey = key
    setRegenError(null)
    setRegeneratingDay(day)
    const avoidDays = current
      .filter((entry) => entry.day !== day)
      .map((entry) => ({
        day: entry.day,
        title: entry.title,
        items: entry.items.map((item) => item.title),
      }))

    try {
      const res = await fetch('/pkg-itinerary-mvp/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody(pkg, shape, { regenerateDay: day, avoidDays })),
      })
      const body = await res.json().catch(() => ({})) as { days?: AiDay[]; error?: string }
      const replacement = body.days?.find((entry) => entry.day === day) ?? body.days?.[0]
      if (!res.ok || !replacement) {
        if (requestId.current === id) setRegenError({ day, message: 'Could not write a new plan. Try again.' })
        return
      }
      sessionCache.set(requestKey, replaceSavedDay(current, { ...replacement, day }))
      notifyPlanListeners()
      if (keyRef.current === requestKey) setVersion((version) => version + 1)
    } catch {
      if (requestId.current === id) setRegenError({ day, message: 'Could not write a new plan. Try again.' })
    } finally {
      if (requestId.current === id) {
        inFlight.current = false
        setRegeneratingDay(null)
      }
    }
  }

  if (!pkg || !shape || !key) {
    return { aiDays: null, loading: false, error: null, regeneratingDay: null, regenError: null, regenerateDay }
  }

  const cached = sessionCache.get(key)
  if (cached) {
    return { aiDays: cached, loading: false, error: null, regeneratingDay, regenError, regenerateDay }
  }

  if (shape.days.length === 0) {
    return { aiDays: [], loading: false, error: null, regeneratingDay, regenError, regenerateDay }
  }

  if (!fetchState || fetchState.key !== key) {
    return { aiDays: null, loading: true, error: null, regeneratingDay: null, regenError: null, regenerateDay }
  }

  return {
    aiDays: fetchState.aiDays,
    loading: fetchState.loading,
    error: fetchState.error,
    regeneratingDay,
    regenError,
    regenerateDay,
  }
}

function cityName(destination: string): string {
  return destination.split(',')[0].trim()
}
