import { useState } from 'react'
import { Heading } from '@pcln/horizon'
import type { NormalizedFlight, NormalizedPackage } from '../types'

function epochToTime(s: string) {
  if (!s) return ''
  return new Date(Number(s) * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
  })
}

function duration(dep: string, arr: string) {
  const mins = Math.round((Number(arr) - Number(dep)) / 60)
  if (mins <= 0) return ''
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

type TimeSlot = 'early' | 'morning' | 'afternoon' | 'evening'
const TIME_SLOTS: { key: TimeSlot; label: string; sub: string; icon: string }[] = [
  { key: 'early', label: 'Early', sub: '12a–5a', icon: '🌙' },
  { key: 'morning', label: 'Morning', sub: '5a–12p', icon: '🌅' },
  { key: 'afternoon', label: 'Afternoon', sub: '12p–6p', icon: '☀️' },
  { key: 'evening', label: 'Evening', sub: '6p–12a', icon: '🌆' },
]

function getSlot(epochStr: string): TimeSlot {
  const h = new Date(Number(epochStr) * 1000).getUTCHours()
  if (h < 5) return 'early'
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

interface Filters {
  nonstop: boolean
  airlines: string[]
  slots: TimeSlot[]
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 999,
        border: `1.5px solid ${active ? '#0068ef' : '#d2e6ff'}`,
        background: active ? '#0068ef' : '#fff',
        color: active ? '#fff' : '#496785',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        fontFamily: "'Montserrat', Arial, sans-serif",
        whiteSpace: 'nowrap' as const,
        transition: 'all 0.12s',
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  )
}

function FlightRow({
  flight,
  selected,
  current,
  onSelect,
}: {
  flight: NormalizedFlight
  selected: boolean
  current: boolean
  onSelect: () => void
}) {
  const out = flight.outboundLegs
  const ret = flight.returnLegs
  const outFirst = out[0]; const outLast = out[out.length - 1]
  const retFirst = ret[0]; const retLast = ret[ret.length - 1]
  const outStops = out.length - 1
  const retStops = ret.length - 1

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'block', width: '100%', textAlign: 'left' as const,
        padding: '14px 16px',
        border: `2px solid ${selected ? '#0068ef' : '#d2e6ff'}`,
        borderRadius: 14,
        background: selected ? '#e8f2ff' : '#fff',
        marginBottom: 10, cursor: 'pointer',
        fontFamily: "'Montserrat', Arial, sans-serif",
        position: 'relative' as const,
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Badges row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {flight.airlineLogoUrl && (
          <img src={flight.airlineLogoUrl} alt={flight.airline} style={{ height: 18, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{flight.airline}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {current && !selected && (
            <span style={{ fontSize: 9, fontWeight: 800, color: '#8399b0', border: '1px solid #d2e6ff', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
              Current
            </span>
          )}
          {selected && (
            <span style={{ fontSize: 9, fontWeight: 800, color: '#0068ef', border: '1.5px solid #0068ef', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#e8f2ff' }}>
              ✓ Selected
            </span>
          )}
          {flight.isNonstopOut && flight.isNonstopRet && (
            <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', border: '1px solid #a7f3d0', borderRadius: 999, padding: '2px 8px', background: '#ecfdf5', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
              Nonstop both ways
            </span>
          )}
        </div>
      </div>

      {/* Outbound */}
      {outFirst && outLast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#8399b0', width: 22, textAlign: 'right' as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0 }}>Out</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#001833', width: 32, textAlign: 'center' as const }}>{outFirst.origin}</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9, color: '#8399b0', fontWeight: 700 }}>{duration(outFirst.departTime, outLast.arriveTime)}</span>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: '#b3d4ff' }} />
              <span style={{ color: '#0068ef', fontSize: 11, margin: '0 3px' }}>✈</span>
              <div style={{ flex: 1, height: 1, background: '#b3d4ff' }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: outStops === 0 ? '#0068ef' : '#b45309' }}>
              {outStops === 0 ? 'Nonstop' : `${outStops} stop`}
            </span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#001833', width: 32, textAlign: 'center' as const }}>{outLast.destination}</span>
          <div style={{ minWidth: 80, textAlign: 'right' as const }}>
            <span style={{ fontSize: 11, color: '#496785', fontWeight: 600 }}>{epochToTime(outFirst.departTime)}</span>
            <span style={{ fontSize: 10, color: '#b3d4ff', margin: '0 3px' }}>→</span>
            <span style={{ fontSize: 11, color: '#496785', fontWeight: 600 }}>{epochToTime(outLast.arriveTime)}</span>
          </div>
        </div>
      )}

      {/* Return */}
      {retFirst && retLast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#8399b0', width: 22, textAlign: 'right' as const, textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0 }}>Ret</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#001833', width: 32, textAlign: 'center' as const }}>{retFirst.origin}</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9, color: '#8399b0', fontWeight: 700 }}>{duration(retFirst.departTime, retLast.arriveTime)}</span>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: '#b3d4ff' }} />
              <span style={{ color: '#0068ef', fontSize: 11, margin: '0 3px' }}>✈</span>
              <div style={{ flex: 1, height: 1, background: '#b3d4ff' }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: retStops === 0 ? '#0068ef' : '#b45309' }}>
              {retStops === 0 ? 'Nonstop' : `${retStops} stop`}
            </span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#001833', width: 32, textAlign: 'center' as const }}>{retLast.destination}</span>
          <div style={{ minWidth: 80, textAlign: 'right' as const }}>
            <span style={{ fontSize: 11, color: '#496785', fontWeight: 600 }}>{epochToTime(retFirst.departTime)}</span>
            <span style={{ fontSize: 10, color: '#b3d4ff', margin: '0 3px' }}>→</span>
            <span style={{ fontSize: 11, color: '#496785', fontWeight: 600 }}>{epochToTime(retLast.arriveTime)}</span>
          </div>
        </div>
      )}
    </button>
  )
}

interface Props {
  pkg: NormalizedPackage
  allFlights: NormalizedFlight[]
  loading?: boolean
  selectedFlyItemKey: string
  onSelect: (flight: NormalizedFlight) => void
  onClose: () => void
}

export function FlightSelectModal({ pkg, allFlights, loading, selectedFlyItemKey, onSelect, onClose }: Props) {
  const [filters, setFilters] = useState<Filters>({ nonstop: false, airlines: [], slots: [] })

  const uniqueAirlines = [...new Map(allFlights.map((f) => [f.carrierCode, f])).values()]

  function toggleAirline(code: string) {
    const next = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code]
    setFilters({ ...filters, airlines: next })
  }

  function toggleSlot(slot: TimeSlot) {
    const next = filters.slots.includes(slot)
      ? filters.slots.filter((s) => s !== slot)
      : [...filters.slots, slot]
    setFilters({ ...filters, slots: next })
  }

  const hasFilters = filters.nonstop || filters.airlines.length > 0 || filters.slots.length > 0

  const visible = allFlights.filter((fl) => {
    if (filters.nonstop && !fl.isNonstopOut) return false
    if (filters.airlines.length > 0 && !filters.airlines.includes(fl.carrierCode)) return false
    if (filters.slots.length > 0) {
      const dep = fl.outboundLegs[0]?.departTime
      if (!dep || !filters.slots.includes(getSlot(dep))) return false
    }
    return true
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,24,51,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#f5f8ff', borderRadius: '20px 20px 0 0', width: '100%',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,24,51,0.25)',
        animation: 'fsSlideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <style>{`@keyframes fsSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d2e6ff' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px 0' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#0068ef', marginBottom: 4 }}>
                ✈️ Change Flight
              </div>
              <Heading as="h2" textStyle="heading5" style={{ margin: 0, color: '#001833' }}>
                {pkg.origin} ↔ {pkg.destination}
              </Heading>
              <div style={{ fontSize: 12, color: '#496785', marginTop: 4 }}>
                {loading ? 'Loading flights…' : `${allFlights.length} available itineraries`}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: '#fff', border: '1px solid #d2e6ff', color: '#496785', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >✕</button>
          </div>

          <div style={{ padding: '14px 20px 32px' }}>
            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                <Chip active={filters.nonstop} onClick={() => setFilters({ ...filters, nonstop: !filters.nonstop })}>
                  ✈ Nonstop only
                </Chip>
                {TIME_SLOTS.map((s) => (
                  <Chip key={s.key} active={filters.slots.includes(s.key)} onClick={() => toggleSlot(s.key)}>
                    {s.icon} {s.label} <span style={{ opacity: 0.6 }}>({s.sub})</span>
                  </Chip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#8399b0', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Airline:</span>
                {uniqueAirlines.map((fl) => (
                  <Chip key={fl.carrierCode} active={filters.airlines.includes(fl.carrierCode)} onClick={() => toggleAirline(fl.carrierCode)}>
                    {fl.airline}
                  </Chip>
                ))}
                {hasFilters && (
                  <button
                    onClick={() => setFilters({ nonstop: false, airlines: [], slots: [] })}
                    style={{ background: 'none', border: 'none', color: '#0068ef', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Count */}
            {!loading && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8399b0', marginBottom: 10 }}>
                {visible.length} of {allFlights.length} itineraries
              </div>
            )}

            {/* List */}
            {loading ? (
              <div style={{ textAlign: 'center' as const, padding: '48px 0', color: '#8399b0', fontSize: 13, fontWeight: 600 }}>
                ✈️ Searching flights…
              </div>
            ) : visible.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '32px 0', color: '#8399b0', fontSize: 13, fontWeight: 600 }}>
                No itineraries match these filters
              </div>
            ) : (
              visible.map((fl) => (
                <FlightRow
                  key={fl.itemKey}
                  flight={fl}
                  selected={fl.itemKey === selectedFlyItemKey}
                  current={fl.itemKey === pkg.flyItemKey}
                  onSelect={() => {
                    onSelect(fl)
                    onClose()
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
