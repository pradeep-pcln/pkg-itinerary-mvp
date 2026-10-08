import { useEffect, useState } from 'react'
import type { NormalizedPackage } from '../types'

export interface SearchParams {
  originAirport: string
  originMetroCode: string
  destinationAirport: string
  destinationCityId: string
  destinationCityName: string
  departDate: string
  returnDate: string
  travelers: number
}

const CACHE_TTL_MS = 55 * 60 * 1000
const CANCUN_CITY_ID = '3000061781'
const CANCUN_CACHE_TTL_MS = 6 * 60 * 60 * 1000

function cacheTtl(params: SearchParams) {
  return params.destinationCityId === CANCUN_CITY_ID
    ? CANCUN_CACHE_TTL_MS
    : CACHE_TTL_MS
}

interface CacheData {
  packages: NormalizedPackage[]
  timestamp: number
}

function cacheKey(params: SearchParams) {
  return `pkg_cache_v6_${JSON.stringify(params)}`
}

function readCache(params: SearchParams): CacheData | null {
  try {
    const raw = localStorage.getItem(cacheKey(params))
    if (!raw) return null
    const data: CacheData = JSON.parse(raw)
    if (Date.now() - data.timestamp > cacheTtl(params)) return null
    return data
  } catch {
    return null
  }
}

function writeCache(params: SearchParams, packages: NormalizedPackage[]) {
  try {
    localStorage.setItem(cacheKey(params), JSON.stringify({ packages, timestamp: Date.now() }))
  } catch {}
}

export async function prefetchPackages(params: SearchParams): Promise<void> {
  if (readCache(params)) return
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/packages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.packages?.length) writeCache(params, data.packages)
  } catch {}
}

export function clearPackageCache(params?: SearchParams) {
  if (params) {
    localStorage.removeItem(cacheKey(params))
  } else {
    // Clear all v6 cache entries
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith('pkg_cache_v6_')) localStorage.removeItem(k)
    }
  }
}

export function usePackages(searchParams: SearchParams | null) {
  const initCached = searchParams ? readCache(searchParams) : null
  const [packages, setPackages] = useState<NormalizedPackage[]>(initCached?.packages ?? [])
  const [loading, setLoading] = useState(searchParams !== null && initCached === null)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(initCached !== null)

  // Stable serialized key — effect re-runs whenever search params actually change
  const paramsKey = searchParams ? JSON.stringify(searchParams) : null

  useEffect(() => {
    if (!searchParams) return

    const hit = readCache(searchParams)
    if (hit) {
      setPackages(hit.packages)
      setFromCache(true)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setFromCache(false)
      setError(null)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/packages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(searchParams),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(err.error ?? 'Failed to fetch packages')
        }
        const data = await res.json()
        const pkgs: NormalizedPackage[] = data.packages ?? []
        if (!cancelled) {
          writeCache(searchParams, pkgs)
          setPackages(pkgs)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  return { packages, loading, error, fromCache, searchParams }
}
