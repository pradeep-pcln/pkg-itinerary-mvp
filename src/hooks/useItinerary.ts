import { useEffect, useRef, useState } from 'react'
import type { AiDay, ShapeChoice } from '../lib/itinerary'
import type { NormalizedPackage } from '../types'

interface FetchState {
  key: string
  aiDays: AiDay[] | null
  loading: boolean
  error: string | null
}

const sessionCache = new Map<string, AiDay[]>()

function cacheKey(pkg: NormalizedPackage, shape: ShapeChoice): string {
  const month = pkg.departDate.slice(0, 7)
  return `${pkg.destination}|${pkg.hotelName.toLowerCase().trim()}|${pkg.nights}|${pkg.allInclusive}|${month}|${shape.style}|${shape.days.join(',')}`
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

export function useItinerary(pkg: NormalizedPackage | null, shape: ShapeChoice | null) {
  const key = pkg && shape ? cacheKey(pkg, shape) : null
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
        if (cancelled) return
        sessionCache.set(requestKey, days)
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
