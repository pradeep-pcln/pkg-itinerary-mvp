import { Badge, CdnIcon, Heading, ReviewBadge, Span } from '@pcln/horizon'
import { formatDate, nightsLabel } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { TripImage } from '../PackageCard'
import { Section } from './Section'

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  return (
    <span className="flex items-center" aria-label={`${rating}-star hotel`}>
      {Array.from({ length: full }, (_, i) => (
        <CdnIcon key={i} iconName="star" size="16" palette="caution" shade="7" className="[font-variation-settings:'FILL'_1]" />
      ))}
    </span>
  )
}

function StayDate({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex flex-col">
      <Span textStyle="body2" palette="primary" shade="10">{label}</Span>
      <Span textStyle="body1" bold palette="primary" shade="13">{formatDate(date)}</Span>
    </div>
  )
}

export function HotelSection({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <Section title="Your stay">
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-primary-4 bg-neutral-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <TripImage pkg={pkg} className="aspect-video sm:aspect-auto sm:h-full sm:min-h-48" />
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Heading as="h4" textStyle="heading5" palette="primary" shade="13">{pkg.hotelName}</Heading>
            <div className="flex flex-wrap items-center gap-2">
              {pkg.starRating > 0 ? <Stars rating={pkg.starRating} /> : null}
              {pkg.guestRating > 0 ? <ReviewBadge rating={pkg.guestRating.toFixed(1)} size="sm" /> : null}
              <Span textStyle="body2" palette="primary" shade="10">{nightsLabel(pkg.nights)}</Span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StayDate label="Check-in" date={pkg.departDate} />
            <StayDate label="Check-out" date={pkg.returnDate} />
          </div>

          {pkg.allInclusive || pkg.freeCancellation ? (
            <div className="flex flex-wrap gap-1.5">
              {pkg.allInclusive ? <Badge palette="benefit" emphasis="medium" size="md">All-Inclusive</Badge> : null}
              {pkg.freeCancellation ? <Badge palette="benefit" emphasis="medium" size="md">Free Cancellation</Badge> : null}
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  )
}
