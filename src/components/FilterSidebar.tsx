import {
  Button,
  CheckboxFilterGroup,
  ChipFilterGroup,
  IconButton,
  SelectFilterGroup,
  Span,
} from '@pcln/horizon'
import type { NormalizedPackage } from '../types'

export type SortKey = 'recommended' | 'price-asc' | 'stars-desc' | 'rating-desc'

export interface Filters {
  sortBy: SortKey
  amenities: string[]       // 'allInclusive' | 'freeCancellation'
  minStars: number          // 0 = any, 3/4/5
  minRating: number         // 0 = any, 5/6/7/8/9
}

export const DEFAULT_FILTERS: Filters = {
  sortBy: 'recommended',
  amenities: [],
  minStars: 0,
  minRating: 0,
}

export function applyFilters(packages: NormalizedPackage[], filters: Filters): NormalizedPackage[] {
  let result = packages.filter((pkg) => {
    if (filters.minStars > 0 && pkg.starRating < filters.minStars) return false
    if (filters.minRating > 0 && pkg.guestRating < filters.minRating) return false
    if (filters.amenities.includes('allInclusive') && !pkg.allInclusive) return false
    if (filters.amenities.includes('freeCancellation') && !pkg.freeCancellation) return false
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

// ─── options ──────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Cheapest' },
  { value: 'stars-desc', label: 'Star Level (Highest)' },
  { value: 'rating-desc', label: 'Guest Rating' },
]

const STAR_LEVELS = [1, 2, 3, 4, 5]
const GUEST_RATINGS = [5, 6, 7, 8, 9]

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
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  const allInclusiveCount = packages.filter((p) => p.allInclusive).length
  const freeCancellationCount = packages.filter((p) => p.freeCancellation).length

  const content = (
    <div className="flex flex-col gap-2 px-3.5 pt-2 pb-4">
      <SelectFilterGroup
        title="Sort By"
        placeholder="Recommended"
        menuItems={SORT_OPTIONS}
        value={filters.sortBy}
        onChange={(v) => set('sortBy', v as SortKey)}
      />

      <CheckboxFilterGroup
        title="Amenities"
        resettable
        value={filters.amenities}
        onChange={(values) => set('amenities', values)}
        options={[
          { name: 'amenities', value: 'allInclusive', label: 'All-Inclusive', iconName: 'restaurant', facet: allInclusiveCount },
          { name: 'amenities', value: 'freeCancellation', label: 'Free Cancellation', iconName: 'free_cancellation', facet: freeCancellationCount },
        ]}
      />

      <ChipFilterGroup
        title="Hotel Star Level"
        resettable
        onReset={() => set('minStars', 0)}
        options={STAR_LEVELS.map((s) => ({
          value: String(s),
          label: `${s}+`,
          iconLeft: 'star',
          showCheckIcon: false,
          selected: filters.minStars === s,
          onSelectionChange: () => set('minStars', filters.minStars === s ? 0 : s),
        }))}
      />

      <ChipFilterGroup
        title="Guest Rating"
        resettable
        onReset={() => set('minRating', 0)}
        options={GUEST_RATINGS.map((r) => ({
          value: String(r),
          label: `${r}+`,
          showCheckIcon: false,
          selected: filters.minRating === r,
          onSelectionChange: () => set('minRating', filters.minRating === r ? 0 : r),
        }))}
      />
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
          className="fixed inset-0 z-[300] bg-primary-13/50 backdrop-blur-[3px]"
          onClick={onClose}
        >
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-2xl bg-primary-1 [animation:filterSlideUp_0.28s_cubic-bezier(0.22,1,0.36,1)_both]"
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes filterSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Drag handle + close */}
            <div className="shrink-0 px-4 pt-3">
              <div className="mb-2.5 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-primary-4" />
              </div>
              <div className="flex items-center justify-between border-b border-primary-4 pb-2.5">
                <Span textStyle="heading5" palette="primary" shade="13">Filters</Span>
                <IconButton iconName="close" type="plainSecondary" aria-label="Close filters" onClick={onClose} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {content}
            </div>

            {/* Apply button */}
            <div className="shrink-0 border-t border-primary-4 px-4 pt-3 pb-6">
              <Button type="primary" size="lg" fullWidth onClick={onClose}>
                Show {resultCount} result{resultCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
