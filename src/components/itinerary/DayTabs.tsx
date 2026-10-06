import { Badge, Button, CdnIcon, Disc, Heading, Span, Tabs } from '@pcln/horizon'
import type { DiscProps, TabsValue, ValidGoogleSymbol } from '@pcln/horizon'
import { useRef, useState } from 'react'
import { buildItineraryDays, formatLongDate } from '../../lib/itinerary'
import type { ItineraryDay, ItineraryItem, ItineraryItemKind } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'

export const ITEM_ICONS: Record<ItineraryItemKind, ValidGoogleSymbol> = {
  flight: 'flight',
  car: 'directions_car',
  hotel: 'hotel',
  meal: 'restaurant',
}

const ITEM_PALETTES: Record<ItineraryItemKind, NonNullable<DiscProps['palette']>> = {
  flight: 'primary',
  car: 'neutral',
  hotel: 'benefit',
  meal: 'caution',
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
        <div className={`flex flex-col gap-1 rounded-xl p-4 ${item.kind === 'flight' ? 'bg-neutral-2' : 'border border-primary-4'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Span textStyle="label" palette="primary" shade="10">{item.categoryLabel}</Span>
            <Badge palette="success" emphasis="medium" size="sm">Included</Badge>
          </div>
          <Heading as="h5" textStyle="heading6" palette="primary" shade="13">{item.title}</Heading>
          {item.description ? <Span textStyle="body2" palette="primary" shade="10">{item.description}</Span> : null}
          {item.location ? (
            <div className="flex items-start gap-1">
              <CdnIcon iconName="location_on" size="16" palette="primary" shade="8" />
              <Span textStyle="body2" palette="primary" shade="10">{item.location}</Span>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}

interface DayPanelProps {
  day: ItineraryDay
  isFirst: boolean
  isLast: boolean
  onStep: (delta: number) => void
}

function DayPanel({ day, isFirst, isLast, onStep }: DayPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Span textStyle="body2" bold palette="actionPrimary" shade="8">
          Day {day.day} · {formatLongDate(day.date)}
        </Span>
        <Heading as="h4" textStyle="heading3" palette="primary" shade="13">{day.title}</Heading>
        <Span textStyle="body1" palette="primary" shade="10">{day.description}</Span>
      </div>

      {day.items.length > 0 ? (
        <ol className="flex flex-col">
          {day.items.map((item, i) => (
            <TimelineRow key={`${item.kind}-${item.title}`} item={item} isLast={i === day.items.length - 1} />
          ))}
        </ol>
      ) : null}

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

// Keyed on the package by the parent so the selected day resets per package
export function DayTabs({ pkg }: { pkg: NormalizedPackage }) {
  const days = buildItineraryDays(pkg)
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
    panelContent: <DayPanel day={d} isFirst={i === 0} isLast={i === days.length - 1} onStep={handleStep} />,
  }))

  return (
    <section ref={rootRef} aria-label="Day-by-day itinerary">
      <Tabs tabsContent={tabsContent} value={value} onValueChange={setValue} slotClassNames={TABS_SLOT_CLASS_NAMES} />
    </section>
  )
}
