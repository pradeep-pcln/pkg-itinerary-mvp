import { useEffect, useState } from 'react'
import type { NormalizedFlight, NormalizedPackage } from '../types'

const SEARCH_PARAMS = {
  originAirport: 'EWR',
  originMetroCode: 'NYC',
  destinationAirport: 'CUN',
  destinationCityId: '3000061781',
  departDate: '2026-10-15',
  returnDate: '2026-10-22',
  travelers: 2,
}

const CACHE_KEY = `pkg_cache_v2_${JSON.stringify(SEARCH_PARAMS)}`
const CACHE_TTL_MS = 55 * 60 * 1000

interface CacheData {
  packages: NormalizedPackage[]
  flyItems: NormalizedFlight[]
  timestamp: number
}

function readCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data: CacheData = JSON.parse(raw)
    if (Date.now() - data.timestamp > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(packages: NormalizedPackage[], flyItems: NormalizedFlight[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ packages, flyItems, timestamp: Date.now() }))
  } catch {}
}

export function clearPackageCache() {
  localStorage.removeItem(CACHE_KEY)
}

export function usePackages() {
  const cached = readCache()
  const [packages, setPackages] = useState<NormalizedPackage[]>(cached?.packages ?? [])
  const [flyItems, setFlyItems] = useState<NormalizedFlight[]>(cached?.flyItems ?? [])
  const [loading, setLoading] = useState(cached === null)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(cached !== null)

  useEffect(() => {
    if (cached !== null) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/packages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(SEARCH_PARAMS),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(err.error ?? 'Failed to fetch packages')
        }
        const data = await res.json()
        const pkgs: NormalizedPackage[] = data.packages ?? []
        const flights: NormalizedFlight[] = data.flyItems ?? []
        if (!cancelled) {
          writeCache(pkgs, flights)
          setPackages(pkgs)
          setFlyItems(flights)
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
  }, [])

  return { packages, flyItems, loading, error, fromCache, searchParams: SEARCH_PARAMS }
}
