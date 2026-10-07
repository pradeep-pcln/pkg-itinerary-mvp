import { useEffect, useState } from 'react'
import type { ActivityImageResult, AiDay } from '../lib/itinerary'

const EMPTY_IMAGES: Map<string, ActivityImageResult> = new Map()
const NO_IMAGE: ActivityImageResult = { imageUrl: null, attribution: null }
const imageCache = new Map<string, ActivityImageResult>()

function uniqueTitles(aiDays: AiDay[]): string[] {
  const seen = new Set<string>()
  const titles: string[] = []
  for (const day of aiDays) {
    for (const item of day.items) {
      const title = item.title.trim()
      if (!title || seen.has(title)) continue
      seen.add(title)
      titles.push(title)
    }
  }
  return titles
}

function withBase(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  const base = import.meta.env.BASE_URL
  if (url.startsWith(base)) return url
  return `${base}${url.replace(/^\//, '')}`
}

async function fetchActivityImage(title: string, destination: string): Promise<ActivityImageResult> {
  try {
    const params = new URLSearchParams({ name: title, destination })
    const res = await fetch(`${import.meta.env.BASE_URL}api/activity-image?${params}`)
    if (!res.ok) return NO_IMAGE
    const data = await res.json()
    const imageUrl = typeof data.imageUrl === 'string' && data.imageUrl ? withBase(data.imageUrl) : null
    const mapsUrl = data.attribution?.googleMapsUrl
    const attribution = typeof mapsUrl === 'string' && mapsUrl
      ? { placeName: typeof data.attribution.placeName === 'string' ? data.attribution.placeName : '', googleMapsUrl: mapsUrl }
      : null
    return { imageUrl, attribution }
  } catch {
    return NO_IMAGE
  }
}

export function useActivityImages(aiDays: AiDay[] | null, destination: string): Map<string, ActivityImageResult> {
  const [images, setImages] = useState<Map<string, ActivityImageResult>>(EMPTY_IMAGES)

  useEffect(() => {
    if (!aiDays || aiDays.length === 0 || !destination) {
      setImages(EMPTY_IMAGES)
      return
    }

    const titles = uniqueTitles(aiDays)
    if (titles.length === 0) {
      setImages(EMPTY_IMAGES)
      return
    }

    let cancelled = false
    const cached = new Map<string, ActivityImageResult>()
    const missing: string[] = []
    for (const title of titles) {
      const hit = imageCache.get(`${destination}|${title}`)
      if (hit) cached.set(title, hit)
      else missing.push(title)
    }

    if (missing.length === 0) {
      setImages(cached)
      return
    }
    if (cached.size > 0) setImages(cached)

    Promise.all(missing.map(async (title) => {
      const result = await fetchActivityImage(title, destination)
      imageCache.set(`${destination}|${title}`, result)
      return [title, result] as const
    })).then((entries) => {
      if (cancelled) return
      const next = new Map(cached)
      for (const [title, result] of entries) next.set(title, result)
      setImages(next)
    })

    return () => { cancelled = true }
  }, [aiDays, destination])

  return images
}
