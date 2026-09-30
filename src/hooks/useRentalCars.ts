import { useEffect, useState } from 'react'
import type { NormalizedRentalCar } from '../types'

export interface RentalCarSearchParams {
  pickupLocation: string
  returnLocation: string
  pickupDateTime: string
  returnDateTime: string
  currencyCode?: string
}

export interface RentalCarSearchMeta {
  pickupLocation: string
  returnLocation: string
  pickupDateTime: string
  returnDateTime: string
}

const CACHE_TTL_MS = 55 * 60 * 1000

interface CacheData {
  rentalCars: NormalizedRentalCar[]
  meta: RentalCarSearchMeta | null
  timestamp: number
}

function cacheKey(params: RentalCarSearchParams) {
  return `rc_cache_v1_${JSON.stringify(params)}`
}

function readCache(key: string): CacheData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data: CacheData = JSON.parse(raw)
    if (Date.now() - data.timestamp > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(key: string, rentalCars: NormalizedRentalCar[], meta: RentalCarSearchMeta | null) {
  try {
    localStorage.setItem(key, JSON.stringify({ rentalCars, meta, timestamp: Date.now() }))
  } catch {}
}

export function clearRentalCarCache(params: RentalCarSearchParams) {
  localStorage.removeItem(cacheKey(params))
}

export function useRentalCars(params: RentalCarSearchParams) {
  const key = cacheKey(params)
  const cached = readCache(key)
  const [rentalCars, setRentalCars] = useState<NormalizedRentalCar[]>(cached?.rentalCars ?? [])
  const [meta, setMeta] = useState<RentalCarSearchMeta | null>(cached?.meta ?? null)
  const [loading, setLoading] = useState(cached === null)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(cached !== null)
  const [activeKey, setActiveKey] = useState(key)

  if (key !== activeKey) {
    const hit = readCache(key)
    setActiveKey(key)
    setRentalCars(hit?.rentalCars ?? [])
    setMeta(hit?.meta ?? null)
    setLoading(hit === null)
    setError(null)
    setFromCache(hit !== null)
  }

  useEffect(() => {
    const hit = readCache(key)
    if (hit !== null) {
      setRentalCars(hit.rentalCars)
      setMeta(hit.meta)
      setFromCache(true)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/rental-cars`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(err.error ?? 'Failed to fetch rental cars')
        }
        const data = await res.json()
        const cars: NormalizedRentalCar[] = data.rentalCars ?? []
        const nextMeta: RentalCarSearchMeta | null = data.meta ?? null
        if (!cancelled) {
          writeCache(key, cars, nextMeta)
          setRentalCars(cars)
          setMeta(nextMeta)
          setFromCache(false)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [key])

  return { rentalCars, loading, error, fromCache, meta }
}
