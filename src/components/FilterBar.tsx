import type { NormalizedPackage } from '../types'

export type SortKey = 'price-asc' | 'price-desc' | 'savings-desc' | 'stars-desc'

export interface Filters {
  sortBy: SortKey
  directOnly: boolean
  minStars: number
  selectedAirlines: string[]
}

export const DEFAULT_FILTERS: Filters = {
  sortBy: 'price-asc',
  directOnly: false,
  minStars: 0,
  selectedAirlines: [],
}

export function applyFilters(packages: NormalizedPackage[], filters: Filters): NormalizedPackage[] {
  let result = packages.filter((pkg) => {
    if (filters.directOnly && pkg.outboundLegs.length > 1) return false
    if (filters.minStars > 0 && pkg.starRating < filters.minStars) return false
    if (filters.selectedAirlines.length > 0 && !filters.selectedAirlines.includes(pkg.airline)) return false
    return true
  })

  result = [...result].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price-desc': return b.bundleTotal - a.bundleTotal
      case 'savings-desc': return b.savingsPct - a.savingsPct
      case 'stars-desc': return b.starRating - a.starRating
      default: return a.bundleTotal - b.bundleTotal
    }
  })

  return result
}

export function getUniqueAirlines(packages: NormalizedPackage[]): string[] {
  return [...new Set(packages.map((p) => p.airline).filter(Boolean))].sort()
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'savings-desc', label: 'Best Savings' },
  { value: 'stars-desc', label: 'Star Rating' },
]

const STAR_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 3, label: '3★+' },
  { value: 4, label: '4★+' },
  { value: 5, label: '5★' },
]

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  airlines: string[]
  resultCount: number
}

const chipBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 14px',
  borderRadius: 999,
  border: '1px solid #c8d8ee',
  background: '#fff',
  color: '#003580',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.12s, border-color 0.12s',
}

const chipActive: React.CSSProperties = {
  ...chipBase,
  background: '#003580',
  borderColor: '#003580',
  color: '#fff',
}

export function FilterBar({ filters, onChange, airlines, resultCount }: Props) {
  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleAirline(airline: string) {
    const next = filters.selectedAirlines.includes(airline)
      ? filters.selectedAirlines.filter((a) => a !== airline)
      : [...filters.selectedAirlines, airline]
    onChange({ ...filters, selectedAirlines: next })
  }

  const hasActiveFilters =
    filters.directOnly || filters.minStars > 0 || filters.selectedAirlines.length > 0

  return (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid #dce6f5',
      padding: '10px 20px',
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 2,
      }}>
        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => toggle('sortBy', e.target.value as SortKey)}
          style={{
            border: '1px solid #c8d8ee',
            borderRadius: 999,
            background: '#fff',
            color: '#003580',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            cursor: 'pointer',
            appearance: 'none',
            paddingRight: 28,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23003580' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            flexShrink: 0,
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div style={{ width: 1, height: 22, background: '#dce6f5', flexShrink: 0 }} />

        {/* Direct only */}
        <button
          onClick={() => toggle('directOnly', !filters.directOnly)}
          style={filters.directOnly ? chipActive : chipBase}
        >
          ✈ Direct only
        </button>

        {/* Star rating */}
        {STAR_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => toggle('minStars', o.value)}
            style={filters.minStars === o.value ? chipActive : chipBase}
          >
            {o.label}
          </button>
        ))}

        {airlines.length > 1 && (
          <>
            <div style={{ width: 1, height: 22, background: '#dce6f5', flexShrink: 0 }} />
            {airlines.map((airline) => (
              <button
                key={airline}
                onClick={() => toggleAirline(airline)}
                style={filters.selectedAirlines.includes(airline) ? chipActive : chipBase}
              >
                {airline}
              </button>
            ))}
          </>
        )}

        {hasActiveFilters && (
          <>
            <div style={{ width: 1, height: 22, background: '#dce6f5', flexShrink: 0 }} />
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              style={{ ...chipBase, color: '#c0392b', borderColor: '#fecaca', background: '#fef2f2' }}
            >
              ✕ Clear
            </button>
          </>
        )}

        <span style={{
          marginLeft: 'auto',
          flexShrink: 0,
          fontSize: 12,
          color: '#64748b',
          fontWeight: 600,
        }}>
          {resultCount} shown
        </span>
      </div>
    </div>
  )
}
