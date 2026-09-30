import { A, Badge, CdnIcon, Drawer, Heading, Price, ReviewBadge, Span, Timeline } from '@pcln/horizon'
import type { ValidGoogleSymbol } from '@pcln/horizon'
import type { FlightLeg, NormalizedPackage, NormalizedRentalCar } from '../types'
import { bookUrl, perPersonPrice, placeholderDays, tripMeta, tripTitle } from '../lib/itinerary'
import { HotelCarousel } from './PackageCard'

function epochToTime(seconds: string): string {
  if (!seconds) return ''
  return new Date(Number(seconds) * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
  })
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function stopsLabel(legs: FlightLeg[]): string {
  const stops = legs.length - 1
  if (stops <= 0) return 'Nonstop'
  const via = legs.slice(1).map((l) => l.origin).join(', ')
  return `${stops} stop${stops > 1 ? 's' : ''} · ${via}`
}

function SummaryBlock({ iconName, title, children }: { iconName: ValidGoogleSymbol; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-primary-4 p-3">
      <CdnIcon iconName={iconName} size="24" palette="primary" shade="8" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Span textStyle="body2" bold palette="primary" shade="13">{title}</Span>
        {children}
      </div>
    </div>
  )
}

function FlightSlice({ label, legs, date }: { label: string; legs: FlightLeg[]; date: string }) {
  if (!legs.length) return null
  const first = legs[0]
  const last = legs[legs.length - 1]
  return (
    <Span textStyle="body3" palette="primary" shade="10" className="block">
      <Span textStyle="body3" bold palette="primary" shade="13">{label}</Span>
      {' '}{formatDate(date)} · {first.origin} {epochToTime(first.departTime)} to {last.destination} {epochToTime(last.arriveTime)} · {stopsLabel(legs)}
    </Span>
  )
}

function FlightSummary({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <SummaryBlock iconName="flight" title={pkg.airline || 'Round-trip flight'}>
      <FlightSlice label="Depart" legs={pkg.outboundLegs} date={pkg.departDate} />
      <FlightSlice label="Return" legs={pkg.returnLegs} date={pkg.returnDate} />
    </SummaryBlock>
  )
}

function HotelSummary({ pkg }: { pkg: NormalizedPackage }) {
  const perks: string[] = []
  if (pkg.allInclusive) perks.push('All-Inclusive')
  if (pkg.freeCancellation) perks.push('Free Cancellation')

  return (
    <SummaryBlock iconName="hotel" title={pkg.hotelName}>
      <div className="flex flex-wrap items-center gap-2">
        {pkg.starRating > 0 && (
          <Span textStyle="body3" palette="primary" shade="10">{pkg.starRating}-star · {pkg.nights} nights</Span>
        )}
        {pkg.guestRating > 0 && <ReviewBadge rating={pkg.guestRating.toFixed(1)} size="sm" />}
      </div>
      {perks.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {perks.map((p) => <Badge key={p} palette="benefit" emphasis="medium" size="sm">{p}</Badge>)}
        </div>
      )}
    </SummaryBlock>
  )
}

function CarSummary({ car }: { car: NormalizedRentalCar }) {
  const details = [car.carType, car.transmission].filter(Boolean).join(' · ')
  return (
    <SummaryBlock iconName="directions_car" title={car.vendor || 'Rental car'}>
      {details && <Span textStyle="body3" palette="primary" shade="10">{details}</Span>}
      <Span textStyle="body3" palette="primary" shade="10">
        Pick up & return at {car.pickupLocation} · ${Math.round(car.totalPrice).toLocaleString()} total
      </Span>
    </SummaryBlock>
  )
}

function DrawerFooter({ pkg }: { pkg: NormalizedPackage }) {
  const perPerson = perPersonPrice(pkg)
  return (
    <div className="flex items-center justify-between gap-4 border-t border-primary-4 bg-neutral-1 px-4 py-3">
      <div>
        {perPerson > 0 && (
          <Price type="priceSale" textStyle="heading4" bold currencySymbol={pkg.currencySymbol} price={perPerson.toLocaleString()} suffix="/person" />
        )}
        <Span textStyle="body3" palette="primary" shade="10" className="block">
          ${Math.round(pkg.bundleTotal).toLocaleString()} total · {pkg.travelers} traveler{pkg.travelers > 1 ? 's' : ''}
        </Span>
      </div>
      <A type="primary" href={bookUrl(pkg)} target="_blank" rel="noopener noreferrer">Book Now</A>
    </div>
  )
}

interface ItineraryDrawerProps {
  pkg: NormalizedPackage | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ItineraryDrawer({ pkg, open, onOpenChange }: ItineraryDrawerProps) {
  if (!pkg) return null
  const title = tripTitle(pkg)
  const days = placeholderDays(pkg)

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      size="md"
      scroll="body"
      stickyFooter
      title={title}
      // Must sit above the app's sticky search bar (z-index 100)
      classNames={{ overlaySlot: 'z-[200]', contentSlot: 'z-[200]' }}
      headingCustomNode={
        <div className="px-4 pt-4 pr-12 pb-3">
          <Heading as="h2" textStyle="heading4" palette="primary" shade="13">{title}</Heading>
          <Span textStyle="body3" palette="primary" shade="10">{tripMeta(pkg)}</Span>
        </div>
      }
      footer={<DrawerFooter pkg={pkg} />}
    >
      <div className="flex flex-col gap-5 px-4 pb-4">
        <HotelCarousel pkg={pkg} variant="drawer" className="aspect-video rounded-xl" />

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Heading as="h3" textStyle="heading6" palette="primary" shade="13">Day by day</Heading>
            <Badge palette="caution" emphasis="medium" size="sm">Sample itinerary</Badge>
          </div>
          <Timeline aria-label="Day-by-day itinerary">
            {days.map((d) => (
              <Timeline.Item key={d.day}>
                <Timeline.Marker variant="dot" />
                <Timeline.Content>
                  <Span textStyle="body3" bold palette="primary" shade="8" className="block">Day {d.day}</Span>
                  <Span textStyle="body2" palette="primary" shade="13">{d.title}</Span>
                </Timeline.Content>
              </Timeline.Item>
            ))}
          </Timeline>
        </section>

        <section className="flex flex-col gap-2">
          <Heading as="h3" textStyle="heading6" palette="primary" shade="13">What's included</Heading>
          <FlightSummary pkg={pkg} />
          <HotelSummary pkg={pkg} />
          {pkg.car && <CarSummary car={pkg.car} />}
        </section>
      </div>
    </Drawer>
  )
}
