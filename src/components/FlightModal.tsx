import { useState } from 'react'
import { Heading, Span } from '@pcln/horizon'
import type { FlightLeg, NormalizedFlight, NormalizedPackage } from '../types'

function epochToTime(seconds: string): string {
  if (!seconds) return ''
  return new Date(Number(seconds) * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
  })
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function durationBetween(departEpoch: string, arriveEpoch: string): string {
  const diffMs = (Number(arriveEpoch) - Number(departEpoch)) * 1000
  if (diffMs <= 0) return ''
  const totalMin = Math.round(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function SliceRow({ legs, label }: { legs: FlightLeg[]; label: string }) {
  if (!legs.length) return null
  const first = legs[0]
  const last = legs[legs.length - 1]
  const stops = legs.length - 1
  const duration = durationBetween(first.departTime, last.arriveTime)
  const layovers = legs.slice(1).map((l) => l.origin)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      {/* Label */}
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#8399b0', width: 42, flexShrink: 0 }}>{label}</span>

      {/* Origin */}
      <div style={{ textAlign: 'center' as const, minWidth: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#001833', lineHeight: 1 }}>{first.origin}</div>
        <div style={{ fontSize: 10, color: '#8399b0', fontWeight: 600 }}>{epochToTime(first.departTime)}</div>
      </div>

      {/* Line */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        {duration && <span style={{ fontSize: 9, color: '#8399b0', fontWeight: 700, marginBottom: 3 }}>{duration}</span>}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1, height: 1, background: '#b3d4ff' }} />
          <span style={{ color: '#0068ef', fontSize: 12, margin: '0 4px', lineHeight: 1 }}>✈</span>
          <div style={{ flex: 1, height: 1, background: '#b3d4ff' }} />
        </div>
        <div style={{ marginTop: 3, textAlign: 'center' as const }}>
          {stops === 0 ? (
            <span style={{ fontSize: 9, fontWeight: 800, color: '#0068ef' }}>Nonstop</span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309' }}>
              {stops} stop{stops > 1 ? 's' : ''} · {layovers.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Destination */}
      <div style={{ textAlign: 'center' as const, minWidth: 36 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#001833', lineHeight: 1 }}>{last.destination}</div>
        <div style={{ fontSize: 10, color: '#8399b0', fontWeight: 600 }}>{epochToTime(last.arriveTime)}</div>
      </div>
    </div>
  )
}

function FlightCard({
  flight,
  isCurrent,
}: {
  flight: NormalizedFlight
  isCurrent: boolean
}) {
  return (
    <div style={{
      border: `1.5px solid ${isCurrent ? '#0068ef' : '#d2e6ff'}`,
      borderRadius: 14,
      padding: '14px 16px',
      background: isCurrent ? '#e8f2ff' : '#fff',
      marginBottom: 10,
      position: 'relative' as const,
    }}>
      {isCurrent && (
        <div style={{
          position: 'absolute' as const, top: -1, right: 14,
          background: '#0068ef', color: '#fff',
          fontSize: 9, fontWeight: 800, padding: '2px 8px',
          borderRadius: '0 0 6px 6px', letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        }}>
          Your flight
        </div>
      )}

      {/* Airline row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {flight.airlineLogoUrl && (
          <img
            src={flight.airlineLogoUrl}
            alt={flight.airline}
            style={{ height: 20, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{flight.airline}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {flight.isNonstopOut && (
            <span style={{ background: '#e8f2ff', color: '#0068ef', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, border: '1px solid #b3d4ff' }}>
              Nonstop out
            </span>
          )}
          {flight.isNonstopRet && (
            <span style={{ background: '#e8f2ff', color: '#0068ef', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, border: '1px solid #b3d4ff' }}>
              Nonstop ret
            </span>
          )}
        </div>
      </div>

      <SliceRow legs={flight.outboundLegs} label="Out" />
      <SliceRow legs={flight.returnLegs} label="Ret" />
    </div>
  )
}

// ── Filters ──────────────────────────────────────────────────────────────────

type TimeSlot = 'early' | 'morning' | 'afternoon' | 'evening'

function getTimeSlot(epochStr: string): TimeSlot {
  const hour = new Date(Number(epochStr) * 1000).getUTCHours()
  if (hour < 5) return 'early'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

const TIME_SLOTS: { key: TimeSlot; label: string; time: string; icon: string }[] = [
  { key: 'early', label: 'Early', time: '12a–5a', icon: '🌙' },
  { key: 'morning', label: 'Morning', time: '5a–12p', icon: '🌅' },
  { key: 'afternoon', label: 'Afternoon', time: '12p–6p', icon: '☀️' },
  { key: 'evening', label: 'Evening', time: '6p–12a', icon: '🌆' },
]

interface FlightFilters {
  nonstopOnly: boolean
  airlines: string[]
  timeSlots: TimeSlot[]
}

function filterFlights(flights: NormalizedFlight[], f: FlightFilters): NormalizedFlight[] {
  return flights.filter((fl) => {
    if (f.nonstopOnly && !fl.isNonstopOut) return false
    if (f.airlines.length > 0 && !f.airlines.includes(fl.carrierCode)) return false
    if (f.timeSlots.length > 0) {
      const slot = fl.outboundLegs[0]?.departTime ? getTimeSlot(fl.outboundLegs[0].departTime) : null
      if (!slot || !f.timeSlots.includes(slot)) return false
    }
    return true
  })
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999,
        border: `1px solid ${active ? '#0068ef' : '#d2e6ff'}`,
        background: active ? '#0068ef' : '#fff',
        color: active ? '#fff' : '#496785',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Montserrat', Arial, sans-serif",
        whiteSpace: 'nowrap' as const,
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  pkg: NormalizedPackage
  allFlights: NormalizedFlight[]
  onClose: () => void
}

export function FlightModal({ pkg, allFlights, onClose }: Props) {
  const [flightFilters, setFlightFilters] = useState<FlightFilters>({
    nonstopOnly: false,
    airlines: [],
    timeSlots: [],
  })

  const currentFlight = allFlights.find((f) => f.itemKey === pkg.flyItemKey) ?? null
  const otherFlights = allFlights.filter((f) => f.itemKey !== pkg.flyItemKey)
  const filteredOthers = filterFlights(otherFlights, flightFilters)

  // Unique airlines for filter chips
  const uniqueAirlines = [...new Map(allFlights.map((f) => [f.carrierCode, f])).values()]

  function toggleAirline(code: string) {
    const next = flightFilters.airlines.includes(code)
      ? flightFilters.airlines.filter((a) => a !== code)
      : [...flightFilters.airlines, code]
    setFlightFilters({ ...flightFilters, airlines: next })
  }

  function toggleTimeSlot(slot: TimeSlot) {
    const next = flightFilters.timeSlots.includes(slot)
      ? flightFilters.timeSlots.filter((s) => s !== slot)
      : [...flightFilters.timeSlots, slot]
    setFlightFilters({ ...flightFilters, timeSlots: next })
  }

  const bookParams = new URLSearchParams({
    origin: pkg.origin, destination: pkg.destination,
    'departure-date': pkg.departDate.replace(/-/g, ''),
    'return-date': pkg.returnDate.replace(/-/g, ''),
    'num-adults': String(pkg.travelers),
    'package-type-code': 'AH',
  })
  const bookUrl = `https://qaa.priceline.com/shop/search/?${bookParams}`

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,24,51,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#f5f8ff', borderRadius: '20px 20px 0 0', width: '100%',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,24,51,0.25)',
        animation: 'flightSlideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <style>{`
          @keyframes flightSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .flight-modal-inner { max-width: 720px; margin: 0 auto; }
        `}</style>

        <div className="flight-modal-inner">
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d2e6ff' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px 0' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#0068ef', marginBottom: 4 }}>
                ✈️ Flight Itineraries
              </div>
              <Heading as="h2" textStyle="heading5" style={{ margin: 0, color: '#001833' }}>
                {pkg.origin} ↔ {pkg.destination}
              </Heading>
              <div style={{ fontSize: 12, color: '#496785', marginTop: 4 }}>
                {formatDateShort(pkg.departDate)} – {formatDateShort(pkg.returnDate)} · {pkg.travelers} traveler{pkg.travelers > 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: '#fff', border: '1px solid #d2e6ff', color: '#496785', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >✕</button>
          </div>

          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ height: 1, background: '#d2e6ff', margin: '0 0 16px' }} />

            {/* Current flight */}
            {currentFlight && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#496785', marginBottom: 10 }}>
                  Your Package Flight
                </div>
                <FlightCard flight={currentFlight} isCurrent />
              </>
            )}

            {/* All itineraries section */}
            {otherFlights.length > 0 && (
              <>
                <div style={{ height: 1, background: '#d2e6ff', margin: '16px 0 14px' }} />
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#496785', marginBottom: 12 }}>
                  All Available Itineraries ({allFlights.length})
                </div>

                {/* Inline filters */}
                <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
                  {/* Row 1: nonstop + time */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                    <ChipBtn active={flightFilters.nonstopOnly} onClick={() => setFlightFilters({ ...flightFilters, nonstopOnly: !flightFilters.nonstopOnly })}>
                      ✈ Nonstop only
                    </ChipBtn>
                    {TIME_SLOTS.map((slot) => (
                      <ChipBtn key={slot.key} active={flightFilters.timeSlots.includes(slot.key)} onClick={() => toggleTimeSlot(slot.key)}>
                        {slot.icon} {slot.label} <span style={{ opacity: 0.6 }}>({slot.time})</span>
                      </ChipBtn>
                    ))}
                  </div>

                  {/* Row 2: airlines */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#8399b0', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginRight: 2 }}>Airline:</span>
                    {uniqueAirlines.map((fl) => (
                      <ChipBtn key={fl.carrierCode} active={flightFilters.airlines.includes(fl.carrierCode)} onClick={() => toggleAirline(fl.carrierCode)}>
                        {fl.airline}
                      </ChipBtn>
                    ))}
                    {(flightFilters.nonstopOnly || flightFilters.airlines.length > 0 || flightFilters.timeSlots.length > 0) && (
                      <button
                        onClick={() => setFlightFilters({ nonstopOnly: false, airlines: [], timeSlots: [] })}
                        style={{ background: 'none', border: 'none', color: '#0068ef', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtered list */}
                {filteredOthers.length === 0 ? (
                  <div style={{ textAlign: 'center' as const, padding: '24px 0', color: '#8399b0', fontSize: 13, fontWeight: 600 }}>
                    No itineraries match these filters
                  </div>
                ) : (
                  filteredOthers.map((fl) => (
                    <FlightCard key={fl.itemKey} flight={fl} isCurrent={false} />
                  ))
                )}
              </>
            )}

            {/* Book CTA */}
            <div style={{ background: '#e8f2ff', borderRadius: 12, padding: '14px 18px', margin: '16px 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const, border: '1px solid #d2e6ff' }}>
              <div>
                <Span textStyle="body3" style={{ color: '#496785', display: 'block', marginBottom: 2 }}>Flight included in your bundle</Span>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#001833' }}>Round-trip · {pkg.travelers} traveler{pkg.travelers > 1 ? 's' : ''}</div>
              </div>
              <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <button style={{ background: '#0068ef', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 14, fontWeight: 800, padding: '12px 28px', cursor: 'pointer' }}>
                  Book Package
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
