import { A, Badge, Button, CdnIcon, Disc, Heading, IconButton, Skeleton, Span, Tabs, Tooltip } from '@pcln/horizon'
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

const PLAN_MOTION = (
  <style>{`
    @keyframes dayPlanIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes planPulse {
      0%, 100% { opacity: 0.35; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1); }
    }
    .day-plan-row { animation: dayPlanIn 0.45s ease both; }
    .day-plan-row:nth-child(2) { animation-delay: 140ms; }
    .day-plan-row:nth-child(3) { animation-delay: 280ms; }
    .day-plan-in { animation: dayPlanIn 0.4s ease both; }
    .day-plan-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: currentColor;
      display: inline-block;
      animation: planPulse 1.2s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .day-plan-row, .day-plan-in, .day-plan-dot { animation: none; }
    }
  `}</style>
)

function PlanningDot() {
  return (
    <span aria-hidden className="mr-2 flex size-2 shrink-0 text-actionPrimary-8">
      <span className="day-plan-dot" />
    </span>
  )
}

const SKELETON_ROWS = [0, 1, 2] as const

function FreeDaySkeleton() {
  return (
    <ol className="flex flex-col" aria-busy="true" aria-label="Loading suggested activities">
      {SKELETON_ROWS.map((row) => (
        <li key={row} className="day-plan-row grid grid-cols-[4.5rem_2rem_minmax(0,1fr)] gap-x-3">
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
  isRewriting: boolean
  regenMessage: string | null
  onRegenerate: (day: number) => void
  onStep: (delta: number) => void
}

function DayPanel({
  day, isFirst, isLast, aiLoading, isRewriting, regenMessage, onRegenerate, onStep,
}: Readonly<DayPanelProps>) {
  const hasSuggestions = day.items.some((item) => item.isAiSuggested)
  const isPlanning = day.isFreeDay && aiLoading
  const showSkeleton = isPlanning || isRewriting
  const showNewPlan = hasSuggestions || isRewriting
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Span textStyle="body2" bold palette="actionPrimary" shade="8">
            Day {day.day} · {formatLongDate(day.date)}
          </Span>
          {showNewPlan ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="primary"
                size="sm"
                buttonType="button"
                disabled={isRewriting}
                onClick={() => onRegenerate(day.day)}
              >
                {isRewriting ? `Writing a new Day ${day.day}` : 'New plan'}
              </Button>
              <Tooltip
                side="top"
                showArrow
                color="neutral"
                delay={150}
                triggerNode={(
                  <IconButton type="plainPrimary" size="sm" iconName="info" aria-label="What does New plan do?" />
                )}
              >
                {`Not feeling Day ${day.day}? Tap New plan for fresh spots and new food. Your other days stay exactly as they are.`}
              </Tooltip>
            </div>
          ) : null}
        </div>
        {isPlanning ? (
          <Span textStyle="body1" palette="primary" shade="10">Planning your free days</Span>
        ) : null}
        {isRewriting ? (
          <Span textStyle="body1" palette="primary" shade="10">The other days stay the same.</Span>
        ) : null}
        {regenMessage && !isRewriting ? (
          <Span textStyle="body2" palette="caution" shade="10">{regenMessage}</Span>
        ) : null}
        {showSkeleton ? null : (
          <>
            <Heading as="h4" textStyle="heading3" palette="primary" shade="13">{day.title}</Heading>
            <Span textStyle="body1" palette="primary" shade="10">{day.description}</Span>
          </>
        )}
      </div>

      {showSkeleton ? (
        <FreeDaySkeleton />
      ) : day.items.length > 0 ? (
        <ol className="day-plan-in flex flex-col">
          {day.items.map((item, i) => (
            <TimelineRow key={`${item.kind}-${item.title}-${i}`} item={item} isLast={i === day.items.length - 1} />
          ))}
        </ol>
      ) : null}

      {showSkeleton ? null : (() => {
        const attractions = day.items.filter((item) => item.kind === 'activity' && item.imageUrl)
        const restaurants = day.items.filter((item) => item.kind === 'meal' && item.imageUrl)
        const places = [...attractions, ...restaurants]
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
          <div className="flex flex-col gap-3">
            <Heading as="h4" textStyle="heading5" palette="primary" shade="13">Attractions &amp; Restaurants</Heading>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
              {places.map((item, i) => {
                const card = (
                  <div className="flex w-40 flex-none flex-col overflow-hidden rounded-xl border border-primary-4 transition-shadow hover:shadow-md sm:w-48">
                    <img src={item.imageUrl!} alt={item.title} className="h-[120px] w-full object-cover" />
                    <div className="p-2">
                      <Span textStyle="body2" bold palette="primary" shade="13" className="line-clamp-2">{item.title}</Span>
                    </div>
                  </div>
                )
                const mapsUrl = item.attribution?.googleMapsUrl
                return mapsUrl ? (
                  <a key={`place-${item.title}-${i}`} href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block flex-none no-underline">
                    {card}
                  </a>
                ) : (
                  <div key={`place-${item.title}-${i}`} className="flex-none">{card}</div>
                )
              })}
            </div>
          </div>
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
  regeneratingDay: number | null
  regenError: { day: number; message: string } | null
  onRegenerate: (day: number) => void
  activityImages: ReadonlyMap<string, ActivityImageResult>
}

// Keyed on the package by the parent so the selected day resets per package
export function DayTabs({
  pkg, aiDays, aiLoading, regeneratingDay, regenError, onRegenerate, activityImages,
}: Readonly<DayTabsProps>) {
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
    helperText: aiLoading && d.isFreeDay ? 'Planning' : d.tabLabel,
    iconLeft: aiLoading && d.isFreeDay ? <PlanningDot /> : undefined,
    panelContent: (
      <DayPanel
        day={d}
        isFirst={i === 0}
        isLast={i === days.length - 1}
        aiLoading={aiLoading}
        isRewriting={regeneratingDay === d.day}
        regenMessage={regenError?.day === d.day ? regenError.message : null}
        onRegenerate={onRegenerate}
        onStep={handleStep}
      />
    ),
  }))

  return (
    <section ref={rootRef} aria-label="Day-by-day itinerary">
      {PLAN_MOTION}
      <Tabs tabsContent={tabsContent} value={value} onValueChange={setValue} slotClassNames={TABS_SLOT_CLASS_NAMES} />
    </section>
  )
}
