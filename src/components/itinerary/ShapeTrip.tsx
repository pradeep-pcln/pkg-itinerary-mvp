import { CdnIcon, Heading, PlainButton, Span } from '@pcln/horizon'
import type { ValidGoogleSymbol } from '@pcln/horizon'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { TRIP_STYLES } from '../../lib/itinerary'
import type { ShapeChoice, TripStyle } from '../../lib/itinerary'

interface StyleOption {
  label: TripStyle
  icon: ValidGoogleSymbol
  tagline: string
  accent: string
  tint: string
}

export const STYLE_OPTIONS: StyleOption[] = [
  { label: 'Relaxed', icon: 'spa', tagline: 'Slow mornings', accent: 'oklch(.55 .09 195)', tint: 'oklch(.95 .035 195)' },
  { label: 'Food & culture', icon: 'restaurant', tagline: 'Eat like a local', accent: 'oklch(.6 .15 50)', tint: 'oklch(.95 .04 60)' },
  { label: 'Sightseeing', icon: 'travel_explore', tagline: 'Icons & views', accent: 'oklch(.52 .15 250)', tint: 'oklch(.95 .03 250)' },
  { label: 'Family-friendly', icon: 'family_restroom', tagline: 'Easy for all ages', accent: 'oklch(.55 .13 150)', tint: 'oklch(.95 .04 150)' },
  { label: 'Nightlife', icon: 'local_bar', tagline: 'After-dark fun', accent: 'oklch(.5 .16 300)', tint: 'oklch(.95 .03 300)' },
  { label: 'Balanced', icon: 'tune', tagline: 'A bit of everything', accent: '#0068ef', tint: '#eaf2ff' },
]

type StyleVars = CSSProperties & {
  '--shape-accent': string
  '--shape-tint': string
  '--shape-soft': string
}

const SHAPE_MOTION = (
  <style>{`
    @keyframes shapePop { from { transform: scale(.985); } to { transform: scale(1); } }
    @keyframes shapeIconHop { from { transform: scale(.9); } to { transform: none; } }
    @keyframes shapeBadgeIn { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes shapeRipple { from { opacity: .45; transform: scale(.6); } to { opacity: 0; transform: scale(1.9); } }
    @keyframes shapeTileIn { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
    @keyframes shapeGlowOnce {
      0%, 100% { box-shadow: 0 8px 20px rgba(0, 104, 239, .35), inset 0 1px 0 rgba(255, 255, 255, .3); }
      40% { box-shadow: 0 0 0 6px rgba(0, 104, 239, .18), 0 10px 28px rgba(0, 104, 239, .45), inset 0 1px 0 rgba(255, 255, 255, .3); }
    }
    @keyframes shapeSheen { from { transform: translateX(-140%); } to { transform: translateX(420%); } }
    .shape-style-tile { border-color: var(--color-primary-4); background: var(--color-neutral-1); }
    .shape-style-tile:hover { transform: translateY(-1px); }
    .shape-style-icon { background: var(--shape-tint); color: var(--shape-accent); }
    .shape-style-tile[data-selected="true"] {
      border-color: var(--shape-accent);
      background: var(--shape-tint);
      box-shadow: 0 6px 16px rgba(10, 37, 64, .10);
    }
    .shape-style-tile[data-selected="true"] .shape-style-icon { background: var(--color-neutral-1); }
    .shape-style-tile[data-selected="true"] .shape-style-glyph { font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; }
    .shape-day-selected {
      background: var(--shape-soft);
      border-color: var(--shape-soft);
      box-shadow: 0 0 0 4px var(--shape-tint);
    }
    .shape-route-on { border-color: var(--shape-soft); }
    .shape-create-sheen { background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .5), transparent); }
    @media (prefers-reduced-motion: no-preference) {
      .shape-tile-in { animation: shapeTileIn .5s ease backwards; }
      .shape-style-tile[data-pop="true"] { animation: shapePop .2s ease-out; }
      .shape-style-tile[data-pop="true"] .shape-style-icon > span:last-child { animation: shapeIconHop .25s ease-out; }
      .shape-create[data-mode="plan"] { transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; }
      .shape-create[data-mode="plan"]:hover {
        transform: translateY(-2px);
        filter: brightness(1.06);
        box-shadow: 0 12px 26px rgba(0, 104, 239, .42), inset 0 1px 0 rgba(255, 255, 255, .3);
      }
      .shape-create[data-mode="plan"]:hover .shape-create-icon { transform: rotate(72deg) scale(1.1); }
      .shape-create[data-mode="plan"]:active { transform: scale(.98); }
      .shape-create-icon { transition: transform .35s ease; }
      .shape-style-tile[data-pop="true"] .shape-ripple { animation: shapeRipple .6s ease-out; }
      .shape-style-check { animation: shapeBadgeIn .25s cubic-bezier(.3, 1.6, .5, 1); }
      .shape-create[data-mode="plan"] { animation: shapeGlowOnce 1.1s .5s ease-out 1; }
      .shape-create-sheen { animation: shapeSheen .9s .55s ease-out 1 both; }
    }
  `}</style>
)

export function tripStyleOption(style: TripStyle): StyleOption {
  return STYLE_OPTIONS.find((option) => option.label === style) ?? STYLE_OPTIONS[5]
}

interface ShapeTripProps {
  totalDays: number
  departDate: string
  initial?: ShapeChoice
  onCreate: (choice: ShapeChoice) => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const ARIA_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

const DAY_PRESETS: Array<{ label: string; keep: (day: number) => boolean }> = [
  { label: 'All days', keep: () => true },
  { label: 'First 5', keep: (day) => day <= 6 },
  { label: 'Every other day', keep: (day) => day % 2 === 0 },
]

function tripDate(departDate: string, dayNumber: number): Date {
  const [year, month, day] = departDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + dayNumber - 1))
}

interface CalendarWeek {
  label: string
  middleDays: number[]
  cells: Array<number | null>
}

function calendarWeeks(departDate: string, totalDays: number): CalendarWeek[] {
  const cells: Array<number | null> = Array.from({ length: tripDate(departDate, 1).getUTCDay() }, () => null)
  for (let day = 1; day <= totalDays; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: CalendarWeek[] = []
  for (let index = 0; index < cells.length; index += 7) {
    const row = cells.slice(index, index + 7)
    const days = row.filter((day): day is number => day !== null)
    const first = tripDate(departDate, days[0])
    const last = tripDate(departDate, days[days.length - 1])
    const label = days.length === 1
      ? MONTH_DAY.format(first)
      : first.getUTCMonth() === last.getUTCMonth()
        ? `${MONTH_DAY.format(first)}–${last.getUTCDate()}`
        : `${MONTH_DAY.format(first)}–${MONTH_DAY.format(last)}`
    weeks.push({
      label,
      middleDays: days.filter((day) => day > 1 && day < totalDays),
      cells: row,
    })
  }
  return weeks
}

function DayCalendar({
  departDate, totalDays, middleDays, selected, setSelected,
}: Readonly<{
  departDate: string
  totalDays: number
  middleDays: number[]
  selected: Set<number>
  setSelected: (value: Set<number> | ((current: Set<number>) => Set<number>)) => void
}>) {
  const paintMode = useRef<'select' | 'skip' | null>(null)
  const weeks = calendarWeeks(departDate, totalDays)

  useEffect(() => {
    function stopPaint() {
      paintMode.current = null
    }
    window.addEventListener('mouseup', stopPaint)
    return () => window.removeEventListener('mouseup', stopPaint)
  }, [])

  function paint(day: number, mode: 'select' | 'skip') {
    setSelected((current) => {
      const next = new Set(current)
      if (mode === 'select') next.add(day)
      else next.delete(day)
      return next
    })
  }

  function toggleWeek(days: number[]) {
    if (days.length === 0) return
    const allOn = days.every((day) => selected.has(day))
    setSelected((current) => {
      const next = new Set(current)
      for (const day of days) {
        if (allOn) next.delete(day)
        else next.add(day)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3" data-vaul-no-drag="">
      <div className="flex flex-wrap gap-2">
        {DAY_PRESETS.map((preset) => {
          const on = middleDays.every((day) => preset.keep(day) === selected.has(day))
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={on}
              className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12px] font-bold text-primary-13 ${on ? 'border-[var(--shape-accent)] bg-[var(--shape-tint)]' : 'border-[#dbe6f7] bg-neutral-1'}`}
              onClick={() => setSelected(new Set(middleDays.filter(preset.keep)))}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-0.5 select-none">
        <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-0.5 sm:grid-cols-[78px_repeat(7,minmax(0,1fr))]">
          <span />
          {WEEKDAYS.map((label, index) => (
            <span key={`${label}-${index}`} className="text-center text-[11px] font-bold text-[#7a8ba3]">{label}</span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week.label} className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] items-center gap-0.5 sm:grid-cols-[78px_repeat(7,minmax(0,1fr))]">
            <button
              type="button"
              className="min-h-10 bg-transparent p-0 pr-1 text-left text-[10px] font-bold whitespace-nowrap text-primary-10 sm:text-[11px]"
              onClick={() => toggleWeek(week.middleDays)}
            >
              {week.label}
            </button>
            {week.cells.map((day, index) => {
              if (day === null) {
                return <span key={`empty-${week.label}-${index}`} className="invisible h-10" />
              }
              const date = tripDate(departDate, day)
              const locked = day === 1 || day === totalDays
              const on = !locked && selected.has(day)
              return (
                <button
                  key={day}
                  type="button"
                  disabled={locked}
                  aria-pressed={locked ? undefined : on}
                  aria-label={locked
                    ? `Day ${day}, ${ARIA_DAY.format(date)}, ${day === 1 ? 'arrival' : 'departure'}`
                    : `Day ${day}, ${ARIA_DAY.format(date)}, ${on ? 'will be planned' : 'stays free'}`}
                  className="flex h-10 items-center justify-center bg-transparent p-0 disabled:cursor-default"
                  onMouseDown={(event: MouseEvent<HTMLButtonElement>) => {
                    if (locked) return
                    event.preventDefault()
                    const mode = selected.has(day) ? 'skip' : 'select'
                    paintMode.current = mode
                    paint(day, mode)
                  }}
                  onMouseEnter={() => {
                    if (locked || !paintMode.current) return
                    paint(day, paintMode.current)
                  }}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    if (locked || event.detail !== 0) return
                    paint(day, selected.has(day) ? 'skip' : 'select')
                  }}
                >
                  <span className={`flex size-[30px] items-center justify-center rounded-full border-[1.5px] text-[13px] transition-[background-color,border-color] duration-150 min-[360px]:size-[34px] ${
                    locked
                      ? 'border-solid border-[#c5d0e0] bg-neutral-1 font-semibold text-primary-10'
                      : on
                        ? 'border-solid border-[var(--shape-accent)] bg-[var(--shape-accent)] font-bold text-neutral-1 shadow-[0_0_0_3px_var(--shape-tint)]'
                        : 'border-dashed border-[#9fb0c8] bg-neutral-1 font-semibold text-[#51627a]'
                  }`}>
                    {locked ? (
                      <CdnIcon iconName={day === 1 ? 'flight_land' : 'flight_takeoff'} size="18" className="text-inherit" />
                    ) : date.getUTCDate()}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function eligibleDays(totalDays: number): number[] {
  return Array.from({ length: Math.max(totalDays - 2, 0) }, (_, index) => index + 2)
}

export function ShapeTrip({ totalDays, departDate, initial, onCreate }: Readonly<ShapeTripProps>) {
  const isDesktop = useIsDesktop()
  const useCalendar = isDesktop ? totalDays > 10 : totalDays > 6
  const middleDays = eligibleDays(totalDays)
  const [style, setStyle] = useState<TripStyle>(initial?.style ?? 'Balanced')
  const [selected, setSelected] = useState(() => new Set(initial ? initial.days : middleDays))
  const [intro, setIntro] = useState(true)
  const [tapped, setTapped] = useState<TripStyle | null>(null)
  const styleOption = tripStyleOption(style)

  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 1100)
    return () => window.clearTimeout(id)
  }, [])
  const styleVars: StyleVars = {
    '--shape-accent': styleOption.accent,
    '--shape-tint': styleOption.tint,
    '--shape-soft': `color-mix(in oklch, ${styleOption.accent} 68%, white)`,
  }
  const selectedDays = middleDays.filter((day) => selected.has(day))
  const allSelected = selectedDays.length === middleDays.length
  const skippedDays = middleDays.filter((day) => !selected.has(day))

  function toggleDay(day: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(middleDays))
  }

  const note = skippedDays.length > 3
    ? `${skippedDays.length} days will stay free — plan them anytime.`
    : skippedDays.length > 0
      ? `Day ${skippedDays.join(', Day ')} will stay free — plan ${skippedDays.length > 1 ? 'them' : 'it'} anytime.`
      : 'Arrival and departure are set. Days you skip stay free.'

  return (
    <section className="@container flex flex-col gap-5" aria-label="Shape your trip" style={styleVars}>
      {SHAPE_MOTION}
      <div className="flex flex-col gap-1">
        <Heading as="h3" textStyle="heading3" palette="primary" shade="13">Shape your trip</Heading>
        <Span textStyle="body2" palette="primary" shade="10">What kind of trip is this? We’ll plan around it.</Span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 @min-[700px]:grid-cols-3" role="radiogroup" aria-label="Trip style">
        {STYLE_OPTIONS.map((option, index) => {
          const isSelected = option.label === style
          const optionVars = {
            '--shape-accent': option.accent,
            '--shape-tint': option.tint,
          } as CSSProperties
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-selected={isSelected}
              data-pop={!intro && tapped === option.label}
              className={`shape-style-tile${intro ? ' shape-tile-in' : ''} relative flex min-h-[104px] flex-col items-start gap-2.5 rounded-2xl border-[1.5px] p-3 text-left transition-[transform,background-color,border-color,box-shadow]`}
              style={{ ...optionVars, animationDelay: `${index * 70}ms` }}
              onClick={() => {
                setStyle(option.label)
                if (!intro) setTapped(option.label)
              }}
            >
              <span className="shape-style-icon relative flex size-9 items-center justify-center rounded-full">
                <span aria-hidden className="shape-ripple absolute inset-0 rounded-full bg-[var(--shape-accent)] opacity-0" />
                <span className="relative flex">
                  <CdnIcon iconName={option.icon} size="20" className="shape-style-glyph text-inherit" />
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                <Span textStyle="body2" bold palette="primary" shade="13">{option.label}</Span>
                <Span textStyle="disclaimer" palette="primary" shade="10">{option.tagline}</Span>
              </span>
              {isSelected ? (
                <span className="shape-style-check absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-[var(--shape-accent)] text-neutral-1">
                  <CdnIcon iconName="check" size="12" className="text-inherit" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {middleDays.length === 1 ? (
        <div className="flex items-center gap-2 rounded-xl bg-actionPrimary-1 px-3 py-2.5">
          <CdnIcon iconName="calendar_month" size="18" palette="actionPrimary" shade="8" />
          <Span textStyle="body2" palette="primary" shade="13">
            We’ll plan <strong>Day {middleDays[0]}</strong> — your one open day.
          </Span>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-primary-4 bg-primary-1 p-3.5 lg:p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Heading as="h4" textStyle="heading5" palette="primary" shade="13">Which days should we plan?</Heading>
              <Span textStyle="disclaimer" palette="primary" shade="10">Tap a day to add or skip it</Span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PlainButton
                type="primary"
                textStyle="body3"
                emphasis="medium"
                className="whitespace-nowrap"
                slots={{ textSlot: 'no-underline font-bold' }}
                onClick={useCalendar ? () => setSelected(new Set()) : toggleAll}
              >
                {useCalendar || allSelected ? 'Clear all' : 'Select all'}
              </PlainButton>
              <Span textStyle="disclaimer" bold palette="primary" shade="13" className="rounded-full border border-primary-4 bg-neutral-1 px-2.5 py-1 whitespace-nowrap">
                {selectedDays.length} of {middleDays.length} days
              </Span>
            </div>
          </div>

          {useCalendar ? (
            <DayCalendar
              departDate={departDate}
              totalDays={totalDays}
              middleDays={middleDays}
              selected={selected}
              setSelected={setSelected}
            />
          ) : (
          <div className="flex items-start py-0.5">
            {Array.from({ length: totalDays }, (_, index) => index + 1).map((day, index) => {
              const isArrival = day === 1
              const isDeparture = day === totalDays
              const isLocked = isArrival || isDeparture
              const isOn = isLocked || selected.has(day)
              const previousDay = day - 1
              const previousOn = previousDay === 1 || selected.has(previousDay)
              return (
                <div key={day} className={`flex min-w-0 items-start ${index === 0 ? 'flex-none' : 'flex-1'}`}>
                  {index > 0 ? (
                    <span
                      aria-hidden
                      className={`mt-[23px] min-w-0 flex-1 border-t-[3px] ${isOn && previousOn ? 'shape-route-on border-solid' : 'border-dashed border-primary-5'}`}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={isLocked}
                    aria-pressed={isLocked ? undefined : isOn}
                    aria-label={isLocked
                      ? `${isArrival ? 'Arrival' : 'Departure'} day, not planned`
                      : `Day ${day}, ${isOn ? 'will be planned' : 'stays free'}`}
                    className="flex w-[46px] flex-none flex-col items-center gap-1.5 bg-transparent p-0 disabled:cursor-default"
                    onClick={() => toggleDay(day)}
                  >
                    <span className={`flex size-[46px] items-center justify-center rounded-full border-2 ${
                      isLocked
                        ? 'border-primary-5 bg-neutral-1 text-primary-10'
                        : isOn
                          ? 'shape-day-selected text-neutral-1'
                          : 'border-dashed border-primary-7 bg-neutral-1 text-primary-10'
                    }`}>
                      <CdnIcon
                        iconName={isArrival ? 'flight_land' : isDeparture ? 'flight_takeoff' : isOn ? 'check' : 'add'}
                        size="20"
                        className="text-inherit"
                      />
                    </span>
                    <Span textStyle="disclaimer" bold palette="primary" shade="13" className="whitespace-nowrap">Day {day}</Span>
                    <Span
                      textStyle="disclaimer"
                      bold
                      palette="primary"
                      shade={isLocked || !isOn ? '10' : '13'}
                      className={`rounded-full px-2 py-0.5 ${isLocked || !isOn ? 'bg-neutral-3' : 'bg-[var(--shape-tint)]'}`}
                    >
                      {isArrival ? 'Arrive' : isDeparture ? 'Depart' : isOn ? 'Plan' : 'Free'}
                    </Span>
                  </button>
                </div>
              )
            })}
          </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-center">
            <CdnIcon iconName="info" size="16" palette="primary" shade="8" />
            <Span textStyle="disclaimer" palette="primary" shade="10">{note}</Span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          data-mode={selectedDays.length > 0 ? 'plan' : 'view'}
          className="shape-create relative flex h-[54px] w-full min-w-0 max-w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[linear-gradient(135deg,#3d8bff,#0068ef_60%,#0054c2)] px-8 font-bold text-neutral-1 shadow-[0_8px_20px_rgba(0,104,239,.35),inset_0_1px_0_rgba(255,255,255,.3)] min-[400px]:w-auto min-[400px]:min-w-[260px]"
          onClick={() => onCreate({ style, days: selectedDays })}
        >
          {selectedDays.length > 0 ? (
            <span aria-hidden className="shape-create-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3" />
          ) : null}
          <span className="shape-create-icon flex size-[26px] items-center justify-center rounded-full bg-neutral-1/20">
            <CdnIcon iconName={selectedDays.length > 0 ? 'star' : 'calendar_month'} size="16" className="text-inherit" />
          </span>
          {selectedDays.length > 0 ? 'Create my plan' : 'View itinerary'}
        </button>
        <Span textStyle="disclaimer" palette="primary" shade="10" align="center">
          {selectedDays.length > 0
            ? `${style} · ${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} planned by AI`
            : 'No AI planning — every day stays free'}
        </Span>
      </div>
    </section>
  )
}
