import { Badge, CdnIcon, Span } from '@pcln/horizon'
import { formatAmount, perPersonPrice, tripHighlights } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { HotelCarousel } from '../PackageCard'

function PriceChip({ pkg }: { pkg: NormalizedPackage }) {
  const perPerson = perPersonPrice(pkg)
  if (perPerson <= 0) return null
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-neutral-1 px-3 py-1.5 shadow-overlay-md">
      <Span textStyle="body2" palette="primary" shade="10">From </Span>
      <Span textStyle="body1" bold palette="primary" shade="13">{pkg.currencySymbol}{formatAmount(perPerson)}</Span>
      <Span textStyle="body2" palette="primary" shade="10"> / person</Span>
    </div>
  )
}

export function DrawerHero({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <HotelCarousel pkg={pkg} variant="drawer" className="aspect-video rounded-xl lg:aspect-[21/9]" />
        <PriceChip pkg={pkg} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge palette="neutral" emphasis="medium" size="md" iconLeft="flight">Flight</Badge>
        <Badge palette="neutral" emphasis="medium" size="md" iconLeft="hotel">Hotel</Badge>
        {pkg.car ? <Badge palette="neutral" emphasis="medium" size="md" iconLeft="directions_car">Car</Badge> : null}
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Highlights">
        {tripHighlights(pkg).map((h) => (
          <li key={h} className="flex items-center gap-1.5 rounded-full bg-neutral-2 px-3 py-1.5">
            <CdnIcon iconName="check" size="16" palette="benefit" shade="8" />
            <Span textStyle="body2" palette="primary" shade="13">{h}</Span>
          </li>
        ))}
      </ul>
    </div>
  )
}
