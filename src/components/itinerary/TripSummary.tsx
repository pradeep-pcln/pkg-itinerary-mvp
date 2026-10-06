import { CdnIcon, Divider, Span } from '@pcln/horizon'
import { cityName, tripIncludes } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { ITEM_ICONS } from './DayTabs'
import { Section } from './Section'

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <Span textStyle="body2" palette="primary" shade="10">{label}</Span>
      <Span textStyle="body2" bold palette="primary" shade="13">{value}</Span>
    </div>
  )
}

export function TripSummary({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <Section title="Your trip includes">
      <div className="flex flex-1 flex-col gap-3 rounded-xl border border-primary-4 bg-neutral-1 p-4">
        <ul className="flex flex-col gap-2">
          {tripIncludes(pkg).map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <CdnIcon iconName={ITEM_ICONS[item.kind]} size="20" palette="primary" shade="8" />
              <Span textStyle="body2" palette="primary" shade="13">{item.label}</Span>
            </li>
          ))}
        </ul>
        <Divider />
        <FactRow label="Trip duration" value={`${pkg.nights + 1} Days / ${pkg.nights} Nights`} />
        <FactRow label="Destination" value={cityName(pkg.destination)} />
      </div>
    </Section>
  )
}
