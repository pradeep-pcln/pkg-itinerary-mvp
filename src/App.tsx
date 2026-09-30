import { Heading, P, Spinner } from '@pcln/horizon'
import { useState } from 'react'
import { GlobalHeader, GlobalFooter } from './components/GlobalHeader'
import { FilterSidebar, DEFAULT_FILTERS, applyFilters } from './components/FilterSidebar'
import type { Filters } from './components/FilterSidebar'
import { PackageCard, PackageCardSkeleton } from './components/PackageCard'
import { HotelModal } from './components/HotelModal'
import { FlightModal } from './components/FlightModal'
import { FlightSelectModal } from './components/FlightSelectModal'
import { usePackages, clearPackageCache } from './hooks/usePackages'
import type { NormalizedFlight, NormalizedPackage } from './types'

const AIRPORTS: Record<string, string> = {
  EWR: 'Newark', JFK: 'New York', LAX: 'Los Angeles',
  ORD: 'Chicago', MIA: 'Miami', DFW: 'Dallas', CUN: 'Cancun',
}
function airportLabel(code: string) {
  return AIRPORTS[code] ? `${AIRPORTS[code]} (${code})` : code
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
    max-width: 1160px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .filter-sidebar-desktop {
    display: none;
  }
  @media (min-width: 900px) {
    .filter-sidebar-desktop {
      display: block;
      width: 260px;
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

  /* Card layout */
  .pkg-card-body { display: flex; flex-direction: column; }
  @media (min-width: 768px) { .pkg-card-body { flex-direction: row; } }

  .pkg-hotel-section { padding: 16px 20px; border-bottom: 1px solid #d2e6ff; }
  @media (min-width: 768px) {
    .pkg-hotel-section { flex: 1; border-bottom: none; border-right: 1px solid #d2e6ff; padding: 20px 24px; }
  }

  .pkg-flight-section { padding: 16px 20px; background: #f5f8ff; }
  @media (min-width: 768px) { .pkg-flight-section { flex: 1; padding: 20px 24px; } }

  .pkg-card-header {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 8px; padding: 10px 20px;
    background: #e8f2ff; border-bottom: 1px solid #d2e6ff;
    border-radius: 12px 12px 0 0;
  }
  @media (min-width: 768px) { .pkg-card-header { padding: 10px 24px; } }

  .pkg-pricing-footer {
    display: flex; flex-direction: column; gap: 14px;
    padding: 14px 20px; background: #e8f2ff; border-top: 1px solid #d2e6ff;
    border-radius: 0 0 12px 12px;
  }
  @media (min-width: 768px) {
    .pkg-pricing-footer { flex-direction: row; align-items: center; justify-content: space-between; padding: 14px 24px; }
  }

  /* Detail link buttons on card sections */
  .pkg-detail-link {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 12px; font-weight: 700; color: #0068ef;
    background: none; border: none; cursor: pointer; padding: 4px 0;
    font-family: 'Montserrat', Arial, sans-serif;
    text-decoration: none;
  }
  .pkg-detail-link:hover { text-decoration: underline; }

  /* Mobile filter toggle */
  .filter-mobile-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #fff;
    border: 1px solid #d2e6ff;
    border-radius: 8px;
    color: #001833;
    font-family: 'Montserrat', Arial, sans-serif;
    font-size: 13px; font-weight: 700;
    padding: 8px 14px; cursor: pointer;
  }
  @media (min-width: 900px) { .filter-mobile-btn { display: none; } }
`

export default function App() {
  const { packages, flyItems, loading, error, fromCache, searchParams } = usePackages()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [hotelPkg, setHotelPkg] = useState<NormalizedPackage | null>(null)
  const [flightPkg, setFlightPkg] = useState<NormalizedPackage | null>(null)
  const [changeFlightPkg, setChangeFlightPkg] = useState<NormalizedPackage | null>(null)
  const [allFlightsForModal, setAllFlightsForModal] = useState<NormalizedFlight[]>([])
  const [flightsLoading, setFlightsLoading] = useState(false)
  // keyed by hotelItemKey — stores the user-selected override flight per package
  const [flightOverrides, setFlightOverrides] = useState<Record<string, NormalizedFlight>>({})

  function handleRefresh() {
    clearPackageCache()
    window.location.reload()
  }

  async function handleChangeFlight(pkg: NormalizedPackage) {
    setChangeFlightPkg(pkg)
    setAllFlightsForModal([])
    setFlightsLoading(true)
    try {
      const resp = await fetch('/cdns-pkg-ui/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAirport: searchParams.originAirport,
          originMetroCode: 'NYC',
          destinationAirport: searchParams.destinationAirport,
          destinationCityId: '3000061781',
          departDate: searchParams.departDate,
          returnDate: searchParams.returnDate,
          travelers: searchParams.travelers,
        }),
      })
      const data = await resp.json()
      setAllFlightsForModal(data.flyItems ?? [])
    } catch {
      setAllFlightsForModal(flyItems)
    } finally {
      setFlightsLoading(false)
    }
  }

  const filtered = applyFilters(packages, filters)

  const activeFilterCount = [
    filters.sortBy !== 'recommended',
    filters.amenities.length > 0,
    filters.minStars > 0,
    filters.minRating > 0,
    filters.outboundStops >= 0,
    filters.selectedAirlines.length > 0,
    filters.takeoffSlots.length > 0,
  ].filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: '#edf0f3', fontFamily: "'Montserrat', Arial, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      <GlobalHeader />

      {/* Search bar */}
      <div style={{ background: '#003c8a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', flex: 1, minWidth: 200, maxWidth: 560 }}>
          <span style={{ fontSize: 15 }}>✈️</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{airportLabel(searchParams.originAirport)}</span>
          <span style={{ color: '#b3d4ff', fontWeight: 600, margin: '0 4px' }}>→</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{airportLabel(searchParams.destinationAirport)}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', margin: '0 4px' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{searchParams.departDate} – {searchParams.returnDate}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', margin: '0 4px' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{searchParams.travelers} traveler{searchParams.travelers > 1 ? 's' : ''}</span>
        </div>
        {fromCache && (
          <span style={{ background: 'rgba(0,104,239,0.2)', color: '#b3d4ff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(0,104,239,0.4)' }}>⚡ cached</span>
        )}
        <button
          onClick={handleRefresh}
          style={{ background: '#0068ef', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 13, fontWeight: 700, padding: '9px 20px', cursor: 'pointer' }}
        >
          Search Again
        </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
            <Heading as="h2" textStyle="heading4" style={{ margin: 0, color: '#001833', flex: 1 }}>
              Cancun Vacation Packages
            </Heading>

            {!loading && !error && (
              <span style={{ background: '#0068ef', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', Arial, sans-serif", padding: '3px 10px', borderRadius: 999 }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Mobile filter toggle */}
            {!loading && packages.length > 0 && (
              <button className="filter-mobile-btn" onClick={() => setFilterOpen(true)}>
                ⚙ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
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
              flightOverride={flightOverrides[pkg.hotelItemKey]}
              onHotelDetails={setHotelPkg}
              onFlightDetails={setFlightPkg}
              onChangeFlight={handleChangeFlight}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {hotelPkg && <HotelModal pkg={hotelPkg} onClose={() => setHotelPkg(null)} />}
      {flightPkg && <FlightModal pkg={flightPkg} allFlights={flyItems} onClose={() => setFlightPkg(null)} />}
      {changeFlightPkg && (
        <FlightSelectModal
          pkg={changeFlightPkg}
          allFlights={allFlightsForModal}
          loading={flightsLoading}
          selectedFlyItemKey={flightOverrides[changeFlightPkg.hotelItemKey]?.itemKey ?? changeFlightPkg.flyItemKey}
          onSelect={(flight) => {
            setFlightOverrides((prev) => ({ ...prev, [changeFlightPkg.hotelItemKey]: flight }))
          }}
          onClose={() => setChangeFlightPkg(null)}
        />
      )}

      <GlobalFooter />
    </div>
  )
}
