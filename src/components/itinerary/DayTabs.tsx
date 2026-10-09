import { A, Badge, Button, CdnIcon, Disc, Heading, IconButton, Skeleton, Span, Tabs, Tooltip } from '@pcln/horizon'
import type { DiscProps, TabsValue, ValidGoogleSymbol } from '@pcln/horizon'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
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
    .day-plan-in { animation: dayPlanIn 0.4s ease both; }
    .day-plan-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: currentColor;
      display: inline-block;
      animation: planPulse 1.2s ease-in-out infinite;
    }
    @keyframes npSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @keyframes npFlow { from { background-position: 100% 0; } to { background-position: 0 0; } }
    @keyframes npGrow {
      from { max-width: 0; opacity: 0; margin-left: 0; }
      to { max-width: 90px; opacity: 1; margin-left: 8px; }
    }
    @keyframes npHalo {
      0% { opacity: 0; transform: scale(.7); }
      40% { opacity: .85; transform: scale(1.05); }
      100% { opacity: .35; transform: scale(1); }
    }
    @keyframes npPop { 0% { transform: scale(.9); } 55% { transform: scale(1.06); } 100% { transform: scale(1); } }
    @keyframes npSheen {
      from { transform: translateX(-130%) skewX(-20deg); }
      to { transform: translateX(420%) skewX(-20deg); }
    }
    @keyframes npBurst {
      0% { opacity: 0; transform: translate(0, 0) scale(.3); }
      30% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--bx), var(--by)) scale(var(--bs)); }
    }
    .np-wrap { animation: npPop .6s ease both; }
    .np-halo {
      background: linear-gradient(110deg, #0068ef, #7b5cff, #22c7d6);
      filter: blur(12px);
      opacity: .35;
      animation: npHalo 1.6s ease .1s both;
    }
    .np-pill {
      background: linear-gradient(110deg, #0057d9, #0068ef 25%, #6a5cff 55%, #22c7d6 90%);
      background-size: 240% 100%;
      background-position: 0 0;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .4);
      animation: npFlow 1.6s ease both;
    }
    .np-turn { transition: transform .3s ease; }
    .np-pill:not(:disabled):hover .np-turn { transform: rotate(180deg); }
    .np-icon { animation: npSpin .9s ease .3s both; }
    .np-label { max-width: 90px; margin-left: 8px; animation: npGrow .55s ease .15s both; }
    .np-star {
      clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
      opacity: 0;
      animation: npBurst .9s ease both;
    }
    .np-sheen {
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .5), transparent);
      transform: translateX(420%) skewX(-20deg);
      animation: npSheen 1.1s ease .9s both;
    }
    .np-wrap.np-rest, .np-rest .np-halo, .np-rest .np-pill, .np-rest .np-icon,
    .np-rest .np-label, .np-rest .np-star, .np-rest .np-sheen,
    .np-wrap.np-off, .np-off .np-halo, .np-off .np-pill, .np-off .np-icon,
    .np-off .np-label, .np-off .np-star, .np-off .np-sheen { animation: none; }
    .np-off .np-halo, .np-off .np-star, .np-off .np-sheen { display: none; }
    .np-off .np-pill { background: #dfe4eb; color: #7b8697; box-shadow: none; }
    @keyframes phr {
      0% { opacity: 0; transform: translateY(14px); }
      6% { opacity: 1; transform: none; }
      28% { opacity: 1; transform: none; }
      34% { opacity: 0; transform: translateY(-14px); }
      100% { opacity: 0; transform: translateY(-14px); }
    }
    @keyframes ico {
      0% { opacity: 0; transform: scale(.5) rotate(-20deg); }
      6% { opacity: 1; transform: none; }
      28% { opacity: 1; transform: none; }
      34% { opacity: 0; transform: scale(.5) rotate(20deg); }
      100% { opacity: 0; }
    }
    @keyframes tw {
      0%, 100% { opacity: 0; transform: scale(.3); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes ring {
      0% { transform: scale(.7); opacity: .5; }
      100% { transform: scale(1.9); opacity: 0; }
    }
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @keyframes sweep {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .day-load-phrase { animation: phr 4.5s ease-in-out infinite; }
    .day-load-icon { animation: ico 4.5s ease-in-out infinite; }
    .day-load-star { animation: tw 2s ease-in-out infinite; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); }
    .day-load-ring { animation: ring 2.4s ease-out infinite; }
    .day-load-core { animation: breathe 2.4s ease-in-out infinite; }
    .day-load-sweep { animation: sweep 2.4s ease-in-out infinite; }
    @keyframes openDayRise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes openDayBreathe { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    .open-day-row { animation: openDayRise .45s ease both; }
    .open-day-pill { animation: openDayBreathe 3s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .day-plan-in, .day-plan-dot,
      .np-wrap, .np-halo, .np-pill, .np-icon, .np-label, .np-star, .np-sheen,
      .day-load-phrase, .day-load-icon, .day-load-star, .day-load-ring, .day-load-core, .day-load-sweep,
      .open-day-row, .open-day-pill { animation: none; }
      .day-load-phrase:first-child, .day-load-icon:first-child { opacity: 1; }
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

const NEW_PLAN_STARS = [
  { bx: '-18px', by: '-16px', bs: 1 },
  { bx: '16px', by: '-20px', bs: 1 },
  { bx: '22px', by: '10px', bs: 0.8 },
  { bx: '-20px', by: '14px', bs: 0.8 },
] as const

// Each day tab remounts this button, so the shared ref limits the entrance to
// the first one shown while the itinerary is open.
function NewPlanButton({ busy, disabled, hasPlan, introPlayed, onClick }: Readonly<{
  busy: boolean
  disabled: boolean
  hasPlan: boolean
  introPlayed: RefObject<boolean>
  onClick: () => void
}>) {
  const [animate, setAnimate] = useState(() => !introPlayed.current)
  // Once greyed out, coming back must not replay the entrance
  if (disabled && animate) setAnimate(false)
  useEffect(() => {
    introPlayed.current = true
  }, [introPlayed])

  const state = disabled ? ' np-off' : animate ? '' : ' np-rest'
  return (
    <span className={`np-wrap relative inline-flex${state}`}>
      <span aria-hidden className="np-halo absolute -inset-x-1.5 -inset-y-[3px] rounded-full" />
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="np-pill relative inline-flex cursor-pointer items-center overflow-hidden rounded-full px-4 py-2.5 text-[14px] leading-none font-bold text-neutral-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-actionPrimary-8 disabled:cursor-default"
      >
        <span aria-hidden className="relative flex">
          <span className="np-turn flex">
            <span className="np-icon flex">
              <CdnIcon iconName="refresh" size="18" />
            </span>
          </span>
          {NEW_PLAN_STARS.map((star, i) => (
            <span
              key={`${star.bx}${star.by}`}
              className="np-star absolute top-[5px] left-[5px] size-[9px] bg-neutral-1"
              style={{ animationDelay: `${0.55 + i * 0.08}s`, '--bx': star.bx, '--by': star.by, '--bs': star.bs } as CSSProperties}
            />
          ))}
        </span>
        <span className="np-label overflow-hidden whitespace-nowrap">{busy ? 'Planning…' : hasPlan ? 'New plan' : 'Plan day'}</span>
        <span aria-hidden className="np-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4" />
      </button>
    </span>
  )
}

const LOADING_BEATS = [
  { phrase: 'Finding fresh spots', icon: 'location_on', delay: '0s' },
  { phrase: 'Mixing new ideas', icon: 'search', delay: '-3s' },
  { phrase: 'Shaping your day', icon: 'attractions', delay: '-1.5s' },
] as const

const GLITTER = [
  { left: '-30%', top: '5%', size: 9, delay: '0s' },
  { left: '115%', top: '0%', size: 7, delay: '.5s' },
  { left: '120%', top: '70%', size: 10, delay: '1s' },
  { left: '-22%', top: '85%', size: 6, delay: '.24s' },
  { left: '50%', top: '-35%', size: 7, delay: '.6s' },
] as const

const OPEN_DAY_ROWS = [
  { label: 'Morning', icon: 'beach_access', text: 'Slow start, or an early adventure' },
  { label: 'Afternoon', icon: 'pool', text: 'Beach, pool, or somewhere new' },
  { label: 'Evening', icon: 'local_bar', text: 'Dinner and wherever the night goes' },
] as const

function OpenDayOutline() {
  return (
    <div className="flex flex-col">
      {OPEN_DAY_ROWS.map((row, index) => (
        <div
          key={row.label}
          className="open-day-row grid grid-cols-[4.5rem_2rem_minmax(0,1fr)] gap-x-3"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <Span textStyle="disclaimer" bold palette="primary" shade="10" className="pt-3 text-right">{row.label}</Span>
          <div className="relative flex justify-center">
            <span className="relative z-[1] mt-1.5 flex size-8 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#9fb7dc] bg-[#f6faff] text-[#6b86ad]">
              <CdnIcon iconName={row.icon} size="16" className="text-inherit" />
            </span>
            {index === OPEN_DAY_ROWS.length - 1 ? null : (
              <span aria-hidden className="absolute top-10 bottom-[-6px] w-0.5 bg-[repeating-linear-gradient(#c4d8f7_0_4px,transparent_4px_8px)]" />
            )}
          </div>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-dashed border-[#c4d8f7] bg-[linear-gradient(90deg,#f8fbff,#fff)] px-4 py-3">
            <Span textStyle="body2" palette="primary" shade="10">{row.text}</Span>
            <span className="open-day-pill shrink-0 rounded-full bg-[#eaf2ff] px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap text-[#0068ef]">No rush</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DayLoading() {
  return (
    <div
      className="relative min-h-[380px] overflow-hidden rounded-2xl bg-linear-to-b from-primary-1 to-neutral-1"
      aria-busy="true"
      aria-live="polite"
      aria-label="Planning this day"
    >
      <div className="absolute inset-0 p-5 opacity-80">
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-[4.5rem_2rem_minmax(0,1fr)] gap-x-3">
            <Skeleton type="body2" width="3rem" className="mt-1.5 ml-auto" />
            <div className="relative flex justify-center">
              <Skeleton type="image" width="2rem" height="2rem" className="rounded-full" />
              {row === 2 ? null : <span aria-hidden className="absolute top-9 bottom-1 w-0.5 rounded-full bg-primary-4" />}
            </div>
            <div className="pb-3.5">
              <div className="relative flex h-[104px] flex-col gap-2 overflow-hidden rounded-xl border border-primary-4 p-4">
                <Skeleton type="label" className="w-1/4" />
                <Skeleton type="h5" className="w-2/3" />
                <Skeleton type="body2" className="w-full" />
                <span
                  aria-hidden
                  className="day-load-sweep pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,104,239,0.07),transparent)]"
                  style={{ animationDelay: `${row * 0.3}s` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.9)_14%,rgba(255,255,255,0.35)_55%,rgba(255,255,255,0)_100%)]" />
      <div className="relative flex min-h-[380px] flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="relative flex size-[76px] items-center justify-center">
          {GLITTER.map((star) => (
            <span
              key={`${star.left}-${star.top}`}
              aria-hidden
              className="day-load-star absolute bg-actionPrimary-8"
              style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}
            />
          ))}
          <span className="day-load-ring absolute inset-0 rounded-full border-2 border-actionPrimary-8" />
          <span className="day-load-ring absolute inset-0 rounded-full border-2 border-actionPrimary-8 [animation-delay:1.2s]" />
          <span className="day-load-core relative flex size-14 items-center justify-center rounded-full bg-linear-to-br from-actionPrimary-6 to-actionPrimary-8 text-neutral-1 shadow-[0_6px_16px_rgba(0,104,239,0.25)]">
            {LOADING_BEATS.map((beat) => (
              <span key={beat.icon} className="day-load-icon absolute flex opacity-0" style={{ animationDelay: beat.delay }}>
                <CdnIcon iconName={beat.icon} size="28" className="text-neutral-1" />
              </span>
            ))}
          </span>
        </div>
        <div className="relative h-10 w-full">
          {LOADING_BEATS.map((beat) => (
            <div
              key={beat.phrase}
              className="day-load-phrase absolute inset-0 flex items-center justify-center text-[28px] font-bold tracking-tight text-actionPrimary-8/75 opacity-0"
              style={{ animationDelay: beat.delay }}
            >
              {beat.phrase}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface DayPanelProps {
  day: ItineraryDay
  isFirst: boolean
  isLast: boolean
  isPlanning: boolean
  initialPlanLoading: boolean
  isRewriting: boolean
  anyRewriting: boolean
  regenMessage: string | null
  onRegenerate: (day: number) => void
  onStep: (delta: number) => void
  newPlanIntroPlayed: RefObject<boolean>
}

function DayPanel({
  day, isFirst, isLast, isPlanning, initialPlanLoading, isRewriting, anyRewriting, regenMessage, onRegenerate, onStep, newPlanIntroPlayed,
}: Readonly<DayPanelProps>) {
  const hasSuggestions = day.items.some((item) => item.isAiSuggested)
  const showSkeleton = isPlanning || isRewriting
  const showNewPlan = !isPlanning && (day.isFreeDay || hasSuggestions || isRewriting)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Span textStyle="body2" bold palette="actionPrimary" shade="8">
            Day {day.day} · {formatLongDate(day.date)}
          </Span>
          {showNewPlan ? (
            <div className="flex items-center gap-1.5">
              <NewPlanButton
                key={day.day}
                busy={isRewriting}
                disabled={anyRewriting || initialPlanLoading}
                hasPlan={hasSuggestions}
                introPlayed={newPlanIntroPlayed}
                onClick={() => onRegenerate(day.day)}
              />
              <Tooltip
                side="bottom"
                align="end"
                showArrow
                color="neutral"
                delay={150}
                className="max-w-[12rem]"
                triggerNode={(
                  <IconButton type="plainPrimary" size="sm" iconName="info" aria-label="What does New plan do?" />
                )}
              >
                {`Not feeling Day ${day.day}? Fresh take.`}
              </Tooltip>
            </div>
          ) : null}
        </div>
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
        <DayLoading />
      ) : day.isFreeDay ? (
        <OpenDayOutline />
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
  plannedDays: number[]
  openDayCopy: boolean
  regeneratingDay: number | null
  regenError: { day: number; message: string } | null
  onRegenerate: (day: number) => void
  activityImages: ReadonlyMap<string, ActivityImageResult>
}

function verticalScrollParent(node: HTMLElement): HTMLElement | null {
  let current = node.parentElement
  while (current) {
    const { overflowY } = getComputedStyle(current)
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight + 1) {
      return current
    }
    current = current.parentElement
  }
  return null
}

// The drawer body keeps its scroll offset when a tab swaps the day in place,
// so pin the day section to the top of that scroller: the tabs stick there and
// the date line sits right under them. Coming from further down the new day is
// already on screen, so jump instantly; a smooth scroll there would visibly
// travel through the hero. Going down from the hero, scroll smoothly.
function alignDayHeader(root: HTMLElement) {
  const scroller = verticalScrollParent(root)
  if (!scroller) return
  const delta = root.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  if (Math.abs(delta) <= 1) return
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: delta < 0 ? 'auto' : 'smooth' })
}

// Keyed on the package by the parent so the selected day resets per package
export function DayTabs({
  pkg, aiDays, aiLoading, plannedDays, openDayCopy, regeneratingDay, regenError, onRegenerate, activityImages,
}: Readonly<DayTabsProps>) {
  const staticDays = buildItineraryDays(pkg, openDayCopy)
  const days = aiDays && aiDays.length > 0 ? mergeAiDays(staticDays, aiDays, activityImages) : staticDays
  const [value, setValue] = useState<TabsValue>('1')
  const rootRef = useRef<HTMLDivElement>(null)
  const alignedValue = useRef(value)
  const newPlanIntroPlayed = useRef(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const index = Number(value) - 1
    const tab = root.querySelectorAll<HTMLElement>('[role="tab"]')[index]
    const list = tab?.parentElement
    if (tab && list) {
      list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
    }
    if (alignedValue.current === value) return
    alignedValue.current = value
    alignDayHeader(root)
  }, [value])

  function handleStep(delta: number) {
    const nextIndex = Math.min(Math.max(Number(value) - 1 + delta, 0), days.length - 1)
    setValue(String(nextIndex + 1))
  }

  const tabsContent = days.map((d, i) => ({
    value: String(d.day),
    label: `Day ${d.day}`,
    helperText: aiLoading && plannedDays.includes(d.day) ? 'Planning' : d.tabLabel,
    iconLeft: aiLoading && plannedDays.includes(d.day) ? <PlanningDot /> : undefined,
    panelContent: (
      <DayPanel
        day={d}
        isFirst={i === 0}
        isLast={i === days.length - 1}
        isPlanning={aiLoading && plannedDays.includes(d.day)}
        initialPlanLoading={aiLoading}
        isRewriting={regeneratingDay === d.day}
        anyRewriting={regeneratingDay !== null}
        regenMessage={regenError?.day === d.day ? regenError.message : null}
        onRegenerate={onRegenerate}
        onStep={handleStep}
        newPlanIntroPlayed={newPlanIntroPlayed}
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
