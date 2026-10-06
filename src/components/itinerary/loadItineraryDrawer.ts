import { lazy } from 'react'

type ItineraryDrawerModule = typeof import('./ItineraryDrawer')

let modulePromise: Promise<ItineraryDrawerModule> | null = null

// Shared by the lazy component and the hover/focus preload so both reuse one request
export function loadItineraryDrawer(): Promise<ItineraryDrawerModule> {
  modulePromise ??= import('./ItineraryDrawer').catch((err: unknown) => {
    modulePromise = null
    throw err
  })
  return modulePromise
}

export const LazyItineraryDrawer = lazy(() =>
  loadItineraryDrawer().then((m) => ({ default: m.ItineraryDrawer })),
)
