import { A, Badge, Button, CdnIcon, Disc, Heading, Skeleton, Span, Tabs } from '@pcln/horizon'
import type { DiscProps, TabsValue, ValidGoogleSymbol } from '@pcln/horizon'
import { useRef, useState } from 'react'
import { buildItineraryDays, formatLongDate, mergeAiDays } from '../../lib/itinerary'
import type { ActivityImageResult, AiDay, ItineraryDay, ItineraryItem, ItineraryItemKind } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'

export const ITEM_ICONS: Record<ItineraryItemKind, ValidGoogleSymbol> = {
  flight: 'flight',
  car: 'directions_car',
  hotel: 'hotel',
  meal: 'restaurant',
  // Horizon's icon set has no local_activity symbol; attractions is the activity ticket icon.
  activity: 'attractions',
}

const ITEM_PALETTES: Record<ItineraryItemKind, NonNullable<DiscProps['palette']>> = {
  flight: 'primary',
  car: 'neutral',
  hotel: 'benefit',
  meal: 'caution',
  activity: 'highlight',
}

// The Drawer body is the scroll container, so the tab row sticks to its top
const TABS_SLOT_CLASS_NAMES = {
  listClass: 'sticky top-0 z-10 bg-neutral-1 pt-2 border-b border-primary-4 [scrollbar-width:none]',
  panelClass: 'pt-5',
}

function TimelineRow({ item, isLast }: { item: ItineraryItem; isLast: boolean }) {
  return (
    <li className="grid grid-cols-[4.5rem_2rem_minmax(0,1fr)] gap-x-3">
      <Span textStyle="body2" bold palette="primary" shade="10" className="pt-1.5 text-right">{item.time}</Span>
      <div className="relative flex justify-center">
        <Disc contentType="icon" content={ITEM_ICONS[item.kind]} size="xs" palette={ITEM_PALETTES[item.kind]} />
        {isLast ? null : <span aria-hidden className="absolute top-9 bottom-1 w-0.5 rounded-full bg-primary-4" />}
      </div>
      <div className="pb-4">
        <div className={`flex items-start gap-3 rounded-xl p-4 ${item.kind === 'flight' ? 'bg-neutral-2' : 'border border-primary-4'}`}>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Span textStyle="label" palette="primary" shade="10">{item.categoryLabel}</Span>
              {item.isAiSuggested ? (
                <Badge palette="neutral" emphasis="medium" size="sm">Suggested — not included</Badge>
              ) : (
                <Badge palette="success" emphasis="medium" size="sm">Included</Badge>
              )}
            </div>
            <Heading as="h5" textStyle="heading6" palette="primary" shade="13">{item.title}</Heading>
            {item.description ? <Span textStyle="body2" palette="primary" shade="10">{item.description}</Span> : null}
            {item.location ? (
              <div className="flex items-start gap-1">
                <CdnIcon iconName="location_on" size="16" palette="primary" shade="8" />
                <Span textStyle="body2" palette="primary" shade="10">{item.location}</Span>
              </div>
            ) : null}
            {item.imageUrl && item.attribution?.googleMapsUrl ? (
              <A
                type="tertiary"
                size="sm"
                href={item.attribution.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.attribution.placeName ? `${item.attribution.placeName} on Google Maps` : 'View on Google Maps'}
              </A>
            ) : null}
          </div>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="hidden lg:block h-28 w-40 flex-shrink-0 rounded-md object-cover bg-neutral-3"
            />
          ) : null}
        </div>
      </div>
    </li>
  )
}

const SKELETON_ROWS = [0, 1, 2] as const

function FreeDaySkeleton() {
  return (
    <ol className="flex flex-col" aria-busy="true" aria-label="Loading suggested activities">
      {SKELETON_ROWS.map((row) => (
        <li key={row} className="grid grid-cols-[4.5rem_2rem_minmax(0,1fr)] gap-x-3">
          <Skeleton type="body2" className="mt-1.5 ml-auto w-12" />
          <div className="relative flex justify-center">
            <Skeleton type="image" width="2rem" height="2rem" className="rounded-full" />
            {row === SKELETON_ROWS.length - 1 ? null : (
              <span aria-hidden className="absolute top-9 bottom-1 w-0.5 rounded-full bg-primary-4" />
            )}
          </div>
          <div className="pb-4">
            <div className="flex flex-col gap-2 rounded-xl border border-primary-4 p-4">
              <Skeleton type="label" className="w-1/4" />
              <Skeleton type="h5" className="w-2/3" />
              <Skeleton type="body2" className="w-full" />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

interface DayPanelProps {
  day: ItineraryDay
  isFirst: boolean
  isLast: boolean
  aiLoading: boolean
  onStep: (delta: number) => void
}

function DayPanel({ day, isFirst, isLast, aiLoading, onStep }: Readonly<DayPanelProps>) {
  const showSkeleton = day.isFreeDay && aiLoading
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Span textStyle="body2" bold palette="actionPrimary" shade="8">
          Day {day.day} · {formatLongDate(day.date)}
        </Span>
        <Heading as="h4" textStyle="heading3" palette="primary" shade="13">{day.title}</Heading>
        <Span textStyle="body1" palette="primary" shade="10">{day.description}</Span>
      </div>

      {showSkeleton ? (
        <FreeDaySkeleton />
      ) : day.items.length > 0 ? (
        <ol className="flex flex-col">
          {day.items.map((item, i) => (
            <TimelineRow key={`${item.kind}-${item.title}-${i}`} item={item} isLast={i === day.items.length - 1} />
          ))}
        </ol>
      ) : null}

      {(() => {
        const attractions = day.items.filter((item) => item.kind === 'activity' && item.imageUrl)
        const restaurants = day.items.filter((item) => item.kind === 'meal' && item.imageUrl)
        if (attractions.length === 0 && restaurants.length === 0) return null

        function PlaceCard({ item }: { item: ItineraryItem }) {
          const content = (
            <div className="flex flex-col overflow-hidden rounded-xl border border-primary-4 transition-shadow hover:shadow-md">
              <img src={item.imageUrl!} alt={item.title} className="h-[140px] w-full object-cover" />
              <div className="p-3">
                <Heading as="h5" textStyle="heading6" palette="primary" shade="13" className="line-clamp-2">{item.title}</Heading>
              </div>
            </div>
          )
          const mapsUrl = item.attribution?.googleMapsUrl
          return mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block no-underline">
              {content}
            </a>
          ) : (
            <div>{content}</div>
          )
        }

        return (
          <>
            {attractions.length > 0 && (
              <div className="flex flex-col gap-3">
                <Heading as="h4" textStyle="heading5" palette="primary" shade="13">Attractions</Heading>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                >
                  {attractions.map((item, i) => (
                    <PlaceCard key={`attr-${item.title}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            )}
            {restaurants.length > 0 && (
              <div className="flex flex-col gap-3">
                <Heading as="h4" textStyle="heading5" palette="primary" shade="13">Restaurants</Heading>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                >
                  {restaurants.map((item, i) => (
                    <PlaceCard key={`rest-${item.title}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      })()}

      <div className="flex items-center justify-between gap-2">
        <Button type="tertiary" size="sm" iconLeft="chevron_left" disabled={isFirst} onClick={() => onStep(-1)}>
          Previous day
        </Button>
        <Button type="tertiary" size="sm" iconRight="chevron_right" disabled={isLast} onClick={() => onStep(1)}>
          Next day
        </Button>
      </div>
    </div>
  )
}

interface DayTabsProps {
  pkg: NormalizedPackage
  aiDays: AiDay[] | null
  aiLoading: boolean
  activityImages: ReadonlyMap<string, ActivityImageResult>
}

// Keyed on the package by the parent so the selected day resets per package
export function DayTabs({ pkg, aiDays, aiLoading, activityImages }: Readonly<DayTabsProps>) {
  const staticDays = buildItineraryDays(pkg)
  const days = aiDays && aiDays.length > 0 ? mergeAiDays(staticDays, aiDays, activityImages) : staticDays
  const [value, setValue] = useState<TabsValue>('1')
  const rootRef = useRef<HTMLDivElement>(null)

  function handleStep(delta: number) {
    const nextIndex = Math.min(Math.max(Number(value) - 1 + delta, 0), days.length - 1)
    setValue(String(nextIndex + 1))

    const root = rootRef.current
    const tab = root?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]
    const list = tab?.parentElement
    if (!root || !tab || !list) return
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
    // Once the tab row is stuck, the new day's top is hidden above it
    if (root.getBoundingClientRect().top < list.getBoundingClientRect().top) {
      root.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  const tabsContent = days.map((d, i) => ({
    value: String(d.day),
    label: `Day ${d.day}`,
    helperText: d.tabLabel,
    panelContent: (
      <DayPanel
        day={d}
        isFirst={i === 0}
        isLast={i === days.length - 1}
        aiLoading={aiLoading}
        onStep={handleStep}
      />
    ),
  }))

  return (
    <section ref={rootRef} aria-label="Day-by-day itinerary">
      <Tabs tabsContent={tabsContent} value={value} onValueChange={setValue} slotClassNames={TABS_SLOT_CLASS_NAMES} />
    </section>
  )
}
