import { Badge, Heading, Span } from '@pcln/horizon'
import { flightCards, formatAmount, formatDate } from '../../lib/itinerary'
import type { FlightCard as FlightCardData } from '../../lib/itinerary'
import type { NormalizedPackage, NormalizedRentalCar } from '../../types'
import { Section } from './Section'

function FlightCard({ card }: { card: FlightCardData }) {
  const times = card.departTime && card.arriveTime ? `${card.departTime} – ${card.arriveTime}` : ''
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary-4 bg-neutral-1 p-4">
      <Span textStyle="body2" palette="primary" shade="10">
        <Span textStyle="body2" bold palette="primary" shade="13">{card.direction}</Span> · {formatDate(card.date)}
      </Span>
      <div className="flex flex-wrap items-center gap-2">
        <Heading as="h4" textStyle="heading4" palette="primary" shade="13">{card.from} → {card.to}</Heading>
        <Badge palette={card.isNonstop ? 'success' : 'caution'} emphasis="medium" size="sm">{card.stopsLabel}</Badge>
      </div>
      {times ? <Span textStyle="body1" palette="primary" shade="13">{times}</Span> : null}
      {card.airline ? (
        <div className="flex items-center gap-2">
          {card.airlineLogoUrl ? <img src={card.airlineLogoUrl} alt="" className="size-5 object-contain" /> : null}
          <Span textStyle="body2" palette="primary" shade="10">{card.airline}</Span>
        </div>
      ) : null}
      {card.layovers.map((l) => (
        <Span key={l.airport} textStyle="body2" palette="neutral" shade="7">
          Layover in {l.airport}{l.durationLabel ? ` · ${l.durationLabel}` : ''}
        </Span>
      ))}
    </div>
  )
}

function CarRow({ car, currencySymbol }: { car: NormalizedRentalCar; currencySymbol: string }) {
  const title = [car.vendor || 'Rental car', car.carType].filter(Boolean).join(' · ')
  const details = [
    car.transmission,
    car.returnLocation && car.returnLocation !== car.pickupLocation
      ? `Pick up at ${car.pickupLocation} · Return at ${car.returnLocation}`
      : `Pick up & return at ${car.pickupLocation}`,
    car.freeCancellation ? 'Free cancellation' : '',
    `${currencySymbol}${formatAmount(car.totalPrice)} total`,
  ].filter(Boolean).join(' · ')
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary-4 bg-neutral-1 p-4">
      <img src={car.imageUrl} alt={car.vendor} className="h-14 w-24 rounded-lg object-contain" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading as="h4" textStyle="heading6" palette="primary" shade="13">{title}</Heading>
        <Span textStyle="body2" palette="primary" shade="10">{details}</Span>
      </div>
    </div>
  )
}

export function TransportSection({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <Section title="Flights & transportation">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {flightCards(pkg).map((card) => <FlightCard key={card.direction} card={card} />)}
      </div>
      {pkg.car ? <CarRow car={pkg.car} currencySymbol={pkg.currencySymbol} /> : null}
    </Section>
  )
}
