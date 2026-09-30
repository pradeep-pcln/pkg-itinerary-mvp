import { useState } from 'react'
import type { NormalizedPackage } from '../types'

export type SortKey = 'recommended' | 'price-asc' | 'stars-desc' | 'rating-desc'
export type TakeoffSlot = 'early' | 'morning' | 'afternoon' | 'evening'

export interface Filters {
  sortBy: SortKey
  // Hotel
  amenities: string[]       // 'allInclusive' | 'freeCancellation'
  minStars: number          // 0 = any, 3/4/5
  minRating: number         // 0 = any, 5/6/7/8/9
  // Flight
  outboundStops: number     // -1 = any, 0 = nonstop, 1 = up to 1
  selectedAirlines: string[]
  takeoffSlots: TakeoffSlot[]
  maxDurationMin: number
}

export const DEFAULT_FILTERS: Filters = {
  sortBy: 'recommended',
  amenities: [],
  minStars: 0,
  minRating: 0,
  outboundStops: -1,
  selectedAirlines: [],
  takeoffSlots: [],
  maxDurationMin: 1440,
}

export function getUniqueAirlines(packages: NormalizedPackage[]): { name: string; minPrice: number }[] {
  const map = new Map<string, number>()
  for (const p of packages) {
    if (!p.airline) continue
    const perPerson = Math.round(p.bundleTotal / Math.max(p.travelers, 1))
    if (!map.has(p.airline) || perPerson < map.get(p.airline)!) {
      map.set(p.airline, perPerson)
    }
  }
  return [...map.entries()].map(([name, minPrice]) => ({ name, minPrice })).sort((a, b) => a.minPrice - b.minPrice)
}

export function getNonstopPrice(packages: NormalizedPackage[]): number | null {
  const nonstop = packages.filter((p) => p.outboundLegs.length === 1)
  if (!nonstop.length) return null
  return Math.round(Math.min(...nonstop.map((p) => p.bundleTotal / Math.max(p.travelers, 1))))
}

export function getOneStopPrice(packages: NormalizedPackage[]): number | null {
  const oneStop = packages.filter((p) => p.outboundLegs.length <= 2)
  if (!oneStop.length) return null
  return Math.round(Math.min(...oneStop.map((p) => p.bundleTotal / Math.max(p.travelers, 1))))
}

export function applyFilters(packages: NormalizedPackage[], filters: Filters): NormalizedPackage[] {
  let result = packages.filter((pkg) => {
    if (filters.minStars > 0 && pkg.starRating < filters.minStars) return false
    if (filters.minRating > 0 && pkg.guestRating < filters.minRating) return false
    if (filters.amenities.includes('allInclusive') && !pkg.allInclusive) return false
    if (filters.amenities.includes('freeCancellation') && !pkg.freeCancellation) return false
    if (filters.outboundStops === 0 && pkg.outboundLegs.length > 1) return false
    if (filters.outboundStops === 1 && pkg.outboundLegs.length > 2) return false
    if (filters.selectedAirlines.length > 0 && !filters.selectedAirlines.includes(pkg.airline)) return false
    return true
  })

  result = [...result].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-asc': return a.bundleTotal - b.bundleTotal
      case 'stars-desc': return b.starRating - a.starRating
      case 'rating-desc': return b.guestRating - a.guestRating
      default: return b.savingsPct - a.savingsPct || a.bundleTotal - b.bundleTotal
    }
  })
  return result
}

// ─── sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, onReset, children }: {
  title: string
  onReset: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid #f0f4ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 800, color: '#001833', fontSize: 13, letterSpacing: '-0.01em' }}>{title}</span>
        <button
          onClick={onReset}
          style={{ background: 'none', border: 'none', color: '#0068ef', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          Reset
        </button>
      </div>
      {children}
    </div>
  )
}

function CheckRow({ checked, onChange, icon, label, value }: {
  checked: boolean
  onChange: () => void
  icon?: string
  label: string
  value?: string
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          onClick={onChange}
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: checked ? 'none' : '1.5px solid #c0cad5',
            background: checked ? '#0068ef' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{label}</span>
      </div>
      {value && <span style={{ fontSize: 10, fontWeight: 800, color: '#0068ef' }}>{value}</span>}
    </label>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  packages: NormalizedPackage[]
  resultCount: number
  isOpen: boolean
  onClose: () => void
}

export function FilterSidebar({ filters, onChange, packages, resultCount, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'hotel' | 'flight'>('hotel')

  const airlines = getUniqueAirlines(packages)
  const nonstopPrice = getNonstopPrice(packages)
  const oneStopPrice = getOneStopPrice(packages)

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleArr<K extends 'amenities' | 'selectedAirlines' | 'takeoffSlots'>(
    key: K,
    value: string
  ) {
    const arr = filters[key] as string[]
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
    onChange({ ...filters, [key]: next } as unknown as Filters)
  }

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price-asc', label: 'Cheapest' },
    { value: 'stars-desc', label: 'Star Level (Highest)' },
    { value: 'rating-desc', label: 'Guest Rating' },
  ]

  const TAKEOFF_SLOTS = [
    { key: 'early', label: 'Early Morning', time: '12a – 5a', icon: '🌙' },
    { key: 'morning', label: 'Morning', time: '5a – 12p', icon: '🌅' },
    { key: 'afternoon', label: 'Afternoon', time: '12p – 6p', icon: '☀️' },
    { key: 'evening', label: 'Evening', time: '6p – 12a', icon: '🌆' },
  ]

  const AMENITIES = [
    { key: 'allInclusive', label: 'All-Inclusive', icon: '🍽️' },
    { key: 'freeCancellation', label: 'Free Cancellation', icon: '↩️' },
  ]

  const hotelContent = (
    <>
      {/* Sort */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, color: '#001833', fontSize: 13, marginBottom: 10 }}>Sort By</div>
        <div style={{ position: 'relative' }}>
          <select
            value={filters.sortBy}
            onChange={(e) => set('sortBy', e.target.value as SortKey)}
            style={{
              width: '100%', appearance: 'none' as const,
              background: '#fff', border: '1px solid #d2e6ff',
              borderRadius: 12, padding: '10px 36px 10px 14px',
              fontSize: 13, fontWeight: 600, color: '#334155',
              outline: 'none', cursor: 'pointer',
              fontFamily: "'Montserrat', Arial, sans-serif",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#8399b0', pointerEvents: 'none', fontSize: 12 }}>▾</span>
        </div>
      </div>

      {/* Amenities */}
      <FilterSection title="Amenities" onReset={() => set('amenities', [])}>
        {AMENITIES.map((a) => (
          <CheckRow
            key={a.key}
            checked={filters.amenities.includes(a.key)}
            onChange={() => toggleArr('amenities', a.key)}
            icon={a.icon}
            label={a.label}
            value={`(${packages.filter((p) => (a.key === 'allInclusive' ? p.allInclusive : p.freeCancellation)).length})`}
          />
        ))}
      </FilterSection>

      {/* Hotel Star Level */}
      <FilterSection title="Hotel Star Level" onReset={() => set('minStars', 0)}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((s) => {
            const active = filters.minStars === s
            return (
              <button
                key={s}
                onClick={() => set('minStars', filters.minStars === s ? 0 : s)}
                style={{
                  flex: 1, padding: '7px 0',
                  border: `1px solid ${active ? '#0068ef' : '#d2e6ff'}`,
                  borderRadius: 10,
                  background: active ? '#e8f2ff' : '#fff',
                  color: active ? '#0068ef' : '#8399b0',
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  fontFamily: "'Montserrat', Arial, sans-serif",
                  transition: 'all 0.12s',
                }}
              >{s}+</button>
            )
          })}
        </div>
      </FilterSection>

      {/* Guest Rating */}
      <FilterSection title="Guest Rating" onReset={() => set('minRating', 0)}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[5, 6, 7, 8, 9].map((r) => {
            const active = filters.minRating === r
            return (
              <button
                key={r}
                onClick={() => set('minRating', filters.minRating === r ? 0 : r)}
                style={{
                  flex: 1, padding: '7px 0',
                  border: `1px solid ${active ? '#0068ef' : '#d2e6ff'}`,
                  borderRadius: 10,
                  background: active ? '#e8f2ff' : '#fff',
                  color: active ? '#0068ef' : '#8399b0',
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  fontFamily: "'Montserrat', Arial, sans-serif",
                  transition: 'all 0.12s',
                }}
              >{r}+</button>
            )
          })}
        </div>
      </FilterSection>
    </>
  )

  const flightContent = (
    <>
      {/* Stops */}
      <FilterSection title="Stops" onReset={() => set('outboundStops', -1)}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {[
            { value: 0, label: 'Nonstop', price: nonstopPrice },
            { value: 1, label: 'Up to 1 stop', price: oneStopPrice },
          ].map((opt) => {
            const active = filters.outboundStops === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set('outboundStops', filters.outboundStops === opt.value ? -1 : opt.value)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '12px 14px',
                  border: `1px solid ${active ? '#0068ef' : '#d2e6ff'}`,
                  borderRadius: 16,
                  background: active ? '#e8f2ff' : '#fff',
                  color: active ? '#003c8a' : '#496785',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Montserrat', Arial, sans-serif",
                  transition: 'all 0.12s',
                }}
              >
                <span>{opt.label}</span>
                {opt.price && (
                  <span style={{ fontWeight: 800, color: active ? '#0068ef' : '#8399b0' }}>
                    from ${opt.price.toLocaleString()}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </FilterSection>

      {/* Airlines */}
      <FilterSection title="Airlines" onReset={() => set('selectedAirlines', [])}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={() => set('selectedAirlines', [])}
            style={{ background: 'none', border: 'none', color: '#0068ef', fontSize: 10, fontWeight: 800, cursor: 'pointer', padding: 0, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}
          >Select None</button>
          <span style={{ color: '#d2e6ff', fontSize: 10 }}>|</span>
          <button
            onClick={() => set('selectedAirlines', airlines.map((a) => a.name))}
            style={{ background: 'none', border: 'none', color: '#0068ef', fontSize: 10, fontWeight: 800, cursor: 'pointer', padding: 0, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}
          >Select All</button>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
          {airlines.map((a) => (
            <CheckRow
              key={a.name}
              checked={filters.selectedAirlines.includes(a.name)}
              onChange={() => toggleArr('selectedAirlines', a.name)}
              label={a.name}
              value={`$${a.minPrice.toLocaleString()}`}
            />
          ))}
        </div>
      </FilterSection>

      {/* Takeoff */}
      <FilterSection title="Takeoff Time" onReset={() => set('takeoffSlots', [])}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          {TAKEOFF_SLOTS.map((slot) => {
            const active = (filters.takeoffSlots as string[]).includes(slot.key)
            return (
              <button
                key={slot.key}
                onClick={() => toggleArr('takeoffSlots', slot.key)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px',
                  border: `1px solid ${active ? '#0068ef' : '#d2e6ff'}`,
                  borderRadius: 16,
                  background: active ? '#e8f2ff' : '#fff',
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', Arial, sans-serif",
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{slot.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#003c8a' : '#496785' }}>{slot.label}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8399b0' }}>{slot.time}</span>
              </button>
            )
          })}
        </div>
      </FilterSection>
    </>
  )

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%' }}>
      {/* HOTEL | FLIGHT tab switcher */}
      <div style={{ padding: '14px 14px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', background: '#edf0f3', padding: 4,
          borderRadius: 14, marginBottom: 4,
        }}>
          {(['hotel', 'flight'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '8px 0',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 10, fontWeight: 900,
                letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                fontFamily: "'Montserrat', Arial, sans-serif",
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#0068ef' : '#8399b0',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,104,239,0.12)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'hotel' ? '🏨 Hotel' : '✈️ Flight'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable filter content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', scrollbarWidth: 'thin', scrollbarColor: '#0068ef transparent' }}>
        {activeTab === 'hotel' ? hotelContent : flightContent}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="filter-sidebar-desktop">
        {content}
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,24,51,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={onClose}
        >
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff', borderRadius: '20px 20px 0 0',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const,
              animation: 'filterSlideUp 0.28s cubic-bezier(0.22,1,0.36,1) both',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes filterSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Drag handle + close */}
            <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d2e6ff' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e8f2ff' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#001833' }}>Filters</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#496785' }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {content}
            </div>

            {/* Apply button */}
            <div style={{ padding: '12px 16px 24px', borderTop: '1px solid #e8f2ff', flexShrink: 0 }}>
              <button
                onClick={onClose}
                style={{
                  width: '100%', background: '#0068ef', border: 'none',
                  borderRadius: 12, color: '#fff',
                  fontFamily: "'Montserrat', Arial, sans-serif",
                  fontSize: 15, fontWeight: 700, padding: '13px', cursor: 'pointer',
                }}
              >
                Show {resultCount} result{resultCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
