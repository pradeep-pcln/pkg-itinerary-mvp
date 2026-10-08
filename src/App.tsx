import { Button, Heading, P, Span, Spinner } from '@pcln/horizon'
import { Suspense, useEffect, useState } from 'react'
import { GlobalHeader, GlobalFooter } from './components/GlobalHeader'
import { FilterSidebar, DEFAULT_FILTERS, applyFilters } from './components/FilterSidebar'
import type { Filters } from './components/FilterSidebar'
import { PackageCard, PackageCardSkeleton } from './components/PackageCard'
import { LazyItineraryDrawer } from './components/itinerary/loadItineraryDrawer'
import { usePackages, prefetchPackages } from './hooks/usePackages'
import type { SearchParams } from './hooks/usePackages'
import { SearchForm } from './components/SearchForm'
import { cityName, shortDate } from './lib/itinerary'
import type { NormalizedPackage } from './types'

const DEFAULT_SEARCH_PARAMS: SearchParams = {
  originAirport: 'EWR',
  originMetroCode: 'NYC',
  destinationAirport: 'CUN',
  destinationCityId: '3000061781',
  destinationCityName: 'Cancun, Mexico',
  departDate: '2026-11-15',
  returnDate: '2026-11-19',
  travelers: 2,
}

function nightsBetween(depart: string, ret: string) {
  return Math.round((new Date(`${ret}T12:00:00`).getTime() - new Date(`${depart}T12:00:00`).getTime()) / 86400000)
}

const GLOBAL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Two-column layout: sidebar + cards */
  .pkg-layout {
    max-width: 1440px;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    gap: 28px;
    align-items: flex-start;
  }
  .pkg-search-bar {
    background: #003c8a;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .pkg-search-inner {
    max-width: 1440px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .filter-sidebar-desktop {
    display: none;
  }
  @media (min-width: 900px) {
    .filter-sidebar-desktop {
      display: block;
      width: 280px;
      flex-shrink: 0;
      background: #fff;
      border: 1px solid #d2e6ff;
      border-radius: 14px;
      position: sticky;
      top: 60px;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
    }
    .pkg-cards-col { flex: 1; min-width: 0; }
  }
  .pkg-cards-col { flex: 1; }
`

export default function App() {
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS)
  const { packages, loading, error, fromCache } = usePackages(searchParams)

  useEffect(() => {
    prefetchPackages(DEFAULT_SEARCH_PARAMS)
  }, [])
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  // Kept separate from `itineraryOpen` so drawer content stays rendered during its close animation
  const [itineraryPkg, setItineraryPkg] = useState<NormalizedPackage | null>(null)
  const [itineraryOpen, setItineraryOpen] = useState(false)

  function handleRefresh() {
    setSearchParams({ ...searchParams })
    window.location.reload()
  }

  function handleViewItinerary(pkg: NormalizedPackage) {
    setItineraryPkg(pkg)
    setItineraryOpen(true)
  }

  const filtered = applyFilters(packages, filters)
  const nights = nightsBetween(searchParams.departDate, searchParams.returnDate)

  const activeFilterCount = [
    filters.sortBy !== 'recommended',
    filters.amenities.length > 0,
    filters.minStars > 0,
    filters.minRating > 0,
  ].filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: '#edf0f3', fontFamily: "'Montserrat', Arial, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      <GlobalHeader />

      {/* Search bar — full-width blue, content aligned to the results container */}
      <div className="pkg-search-bar">
        <div className="pkg-search-inner">
          <SearchForm defaultParams={searchParams} onSearch={setSearchParams} />
          {fromCache && (
            <span style={{ background: 'rgba(0,104,239,0.2)', color: '#b3d4ff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(0,104,239,0.4)' }}>⚡ cached</span>
          )}
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="pkg-layout">

        {/* Sidebar — desktop always visible, mobile via drawer */}
        {!loading && packages.length > 0 && (
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            packages={packages}
            resultCount={filtered.length}
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
          />
        )}

        {/* Cards column */}
        <div className="pkg-cards-col">

          {/* Results header row */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <Heading as="h2" textStyle="heading4" palette="primary" shade="13">
                Itineraries from {cityName(searchParams.originAirport)} to {searchParams.destinationCityName}
              </Heading>
              <Span textStyle="body3" palette="primary" shade="10">
                {shortDate(searchParams.departDate)} – {shortDate(searchParams.returnDate)} · {nights} nights · {searchParams.travelers} traveler{searchParams.travelers > 1 ? 's' : ''}
              </Span>
            </div>

            {!loading && !error && (
              <Span textStyle="body2" bold palette="primary" shade="10">
                {filtered.length} itinerar{filtered.length !== 1 ? 'ies' : 'y'}
              </Span>
            )}

            {/* Mobile filter toggle */}
            {!loading && packages.length > 0 && (
              <div className="min-[900px]:hidden">
                <Button type="secondary" size="sm" iconLeft="tune" onClick={() => setFilterOpen(true)}>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Button>
              </div>
            )}

            {loading && <Spinner size="md" />}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
              <P textStyle="body2" style={{ color: '#b91c1c', margin: 0, fontWeight: 600 }}>⚠️ {error}</P>
            </div>
          )}

          {/* Loading */}
          {loading && !error && (
            <>
              <PackageCardSkeleton />
              <PackageCardSkeleton />
              <PackageCardSkeleton />
            </>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 16, padding: '48px 20px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <Heading as="h3" textStyle="heading5" style={{ marginBottom: 8, color: '#001833' }}>
                {packages.length > 0 ? 'No matches for these filters' : 'No packages found'}
              </Heading>
              <P textStyle="body2" style={{ color: '#496785', margin: '0 0 20px' }}>
                {packages.length > 0 ? 'Try adjusting your filters.' : 'Connect VPN and try refreshing.'}
              </P>
              <button
                onClick={packages.length > 0 ? () => setFilters(DEFAULT_FILTERS) : handleRefresh}
                style={{ background: '#0068ef', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 14, fontWeight: 700, padding: '11px 24px', cursor: 'pointer' }}
              >
                {packages.length > 0 ? 'Clear Filters' : 'Try Again'}
              </button>
            </div>
          )}

          {/* Cards */}
          {!loading && filtered.map((pkg) => (
            <PackageCard
              key={`${pkg.proposalIndex}-${pkg.hotelItemKey}`}
              pkg={pkg}
              onViewItinerary={handleViewItinerary}
            />
          ))}
        </div>
      </div>

      {itineraryPkg ? (
        <Suspense fallback={null}>
          <LazyItineraryDrawer pkg={itineraryPkg} open={itineraryOpen} onOpenChange={setItineraryOpen} />
        </Suspense>
      ) : null}

      <GlobalFooter />
    </div>
  )
}
