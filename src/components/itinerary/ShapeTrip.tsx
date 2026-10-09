import { CdnIcon, Heading, PlainButton, Span } from '@pcln/horizon'
import type { ValidGoogleSymbol } from '@pcln/horizon'
import { useState, type CSSProperties } from 'react'
import { TRIP_STYLES } from '../../lib/itinerary'
import type { ShapeChoice, TripStyle } from '../../lib/itinerary'

interface StyleOption {
  label: TripStyle
  icon: ValidGoogleSymbol
  tagline: string
  accent: string
  tint: string
}

const STYLE_OPTIONS: StyleOption[] = [
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
    @keyframes shapePop { 0% { transform: scale(.94); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
    @keyframes shapeIconHop { 0% { transform: scale(.7) rotate(-14deg); } 60% { transform: scale(1.15) rotate(8deg); } 100% { transform: none; } }
    @keyframes shapeBadgeIn { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes shapeRipple { from { opacity: .45; transform: scale(.6); } to { opacity: 0; transform: scale(1.9); } }
    .shape-style-tile { border-color: var(--color-primary-4); background: var(--color-neutral-1); }
    .shape-style-tile:hover { transform: translateY(-1px); }
    .shape-style-icon { background: var(--shape-tint); color: var(--shape-accent); }
    .shape-style-tile[data-selected="true"] {
      border-color: var(--shape-accent);
      background: var(--shape-tint);
      box-shadow: 0 6px 16px rgba(10, 37, 64, .10);
    }
    .shape-style-tile[data-selected="true"] .shape-style-icon { background: var(--color-neutral-1); }
    .shape-day-selected {
      background: var(--shape-soft);
      border-color: var(--shape-soft);
      box-shadow: 0 0 0 4px var(--shape-tint);
    }
    .shape-route-on { border-color: var(--shape-soft); }
    @media (prefers-reduced-motion: no-preference) {
      .shape-style-tile[data-selected="true"] { animation: shapePop .35s cubic-bezier(.3, 1.4, .5, 1); }
      .shape-style-tile[data-selected="true"] .shape-style-icon > span:last-child { animation: shapeIconHop .45s ease; }
      .shape-style-tile[data-selected="true"] .shape-ripple { animation: shapeRipple .6s ease-out; }
      .shape-style-check { animation: shapeBadgeIn .25s cubic-bezier(.3, 1.6, .5, 1); }
    }
  `}</style>
)

interface ShapeTripProps {
  totalDays: number
  onCreate: (choice: ShapeChoice) => void
}

function eligibleDays(totalDays: number): number[] {
  return Array.from({ length: Math.max(totalDays - 2, 0) }, (_, index) => index + 2)
}

export function ShapeTrip({ totalDays, onCreate }: Readonly<ShapeTripProps>) {
  const middleDays = eligibleDays(totalDays)
  const [style, setStyle] = useState<TripStyle>('Balanced')
  const [selected, setSelected] = useState(() => new Set(middleDays))
  const styleOption = STYLE_OPTIONS.find((option) => option.label === style) ?? STYLE_OPTIONS[5]
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

  const note = skippedDays.length > 0
    ? `Day ${skippedDays.join(', Day ')} will stay free - plan ${skippedDays.length > 1 ? 'them' : 'it'} anytime.`
    : 'Arrival and departure are set. Days you skip stay free.'

  return (
    <section className="flex flex-col gap-5" aria-label="Shape your trip" style={styleVars}>
      {SHAPE_MOTION}
      <div className="flex flex-col gap-1">
        <Heading as="h3" textStyle="heading3" palette="primary" shade="13">Shape your trip</Heading>
        <Span textStyle="body2" palette="primary" shade="10">What kind of trip is this? We’ll plan around it.</Span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3" role="radiogroup" aria-label="Trip style">
        {STYLE_OPTIONS.map((option) => {
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
              className="shape-style-tile relative flex min-h-[104px] flex-col items-start gap-2.5 rounded-2xl border-[1.5px] p-3 text-left transition-[transform,background-color,border-color,box-shadow]"
              style={optionVars}
              onClick={() => setStyle(option.label)}
            >
              <span className="shape-style-icon relative flex size-9 items-center justify-center rounded-full">
                <span aria-hidden className="shape-ripple absolute inset-0 rounded-full bg-[var(--shape-accent)] opacity-0" />
                <span className="relative flex">
                  <CdnIcon iconName={option.icon} size="20" className="text-inherit" />
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
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-primary-4 bg-primary-1 p-4">
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
                onClick={toggleAll}
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </PlainButton>
              <Span textStyle="disclaimer" bold palette="primary" shade="13" className="rounded-full border border-primary-4 bg-neutral-1 px-2.5 py-1 whitespace-nowrap">
                {selectedDays.length} of {middleDays.length} days
              </Span>
            </div>
          </div>

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

          <div className="flex items-center justify-center gap-1.5 text-center">
            <CdnIcon iconName="info" size="16" palette="primary" shade="8" />
            <Span textStyle="disclaimer" palette="primary" shade="10">{note}</Span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          className="flex h-[54px] min-w-[260px] max-w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(135deg,#3d8bff,#0068ef_60%,#0054c2)] px-8 font-bold text-neutral-1 shadow-[0_8px_20px_rgba(0,104,239,.35),inset_0_1px_0_rgba(255,255,255,.3)] transition-[filter,transform] hover:brightness-105 active:scale-[.98]"
          onClick={() => onCreate({ style, days: selectedDays })}
        >
          <span className="flex size-[26px] items-center justify-center rounded-full bg-neutral-1/20">
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
