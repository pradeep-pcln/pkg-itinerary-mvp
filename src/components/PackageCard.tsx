import {
  Badge,
  Button,
  Card,
  Carousel,
  CdnIcon,
  Heading,
  PlainA,
  PlainButton,
  Price,
  ReviewBadge,
  Skeleton,
  Span,
} from '@pcln/horizon'
import { useState, useSyncExternalStore } from 'react'
import {
  bookUrl,
  buildItineraryDays,
  dealLabel,
  formatAmount,
  nightsLabel,
  perPersonPrice,
  tripDaysLabel,
  tripHighlights,
  tripMeta,
  tripTitle,
} from '../lib/itinerary'
import type { NormalizedPackage } from '../types'
import { cachedItineraryPlan, subscribeItineraryPlans } from '../hooks/useItinerary'
import { tripStyleOption } from './itinerary/ShapeTrip'
import { loadItineraryDrawer } from './itinerary/loadItineraryDrawer'

const CARD_DAY_COUNT = 3

function preloadItineraryDrawer() {
  void loadItineraryDrawer()
}

export function TripImage({ pkg, className }: { pkg: NormalizedPackage; className?: string }) {
  const [src, setSrc] = useState(pkg.heroImageUrl || pkg.thumbnailUrl)

  function handleError() {
    setSrc((current) => (current !== pkg.thumbnailUrl && pkg.thumbnailUrl ? pkg.thumbnailUrl : ''))
  }

  return (
    <div className={`relative overflow-hidden bg-primary-3 ${className ?? ''}`}>
      {src ? (
        <img src={src} alt={pkg.hotelName} className="absolute inset-0 size-full object-cover" onError={handleError} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Span textStyle="body3" palette="neutral" shade="7">No image</Span>
        </div>
      )}
    </div>
  )
}

const CAROUSEL_SLOT_CLASSES = {
  viewportClass: 'h-full m-0 p-0 rounded-none',
  containerClass: 'h-full',
  slideClass: 'h-full',
}

interface HotelCarouselProps {
  pkg: NormalizedPackage
  // Cards use the ~500px images; the drawer uses the ~1280px ones
  variant: 'card' | 'drawer'
  className?: string
}

export function HotelCarousel({ pkg, variant, className }: HotelCarouselProps) {
  const images = pkg.hotelImages ?? []
  if (images.length < 2) return <TripImage pkg={pkg} className={className} />

  const slides = images.map((img, i) => ({
    id: i,
    image: variant === 'drawer' ? img.hdUrl : img.url,
    title: img.caption || `${pkg.hotelName} photo ${i + 1}`,
  }))

  return (
    <div className={`relative overflow-hidden bg-primary-3 ${className ?? ''}`}>
      <div className="absolute inset-0">
        <Carousel
          type="image"
          slides={slides}
          slideWidth="image"
          pagination="numbers"
          loop
          lazyLoad
          ariaLabel={`${pkg.hotelName} photos`}
          slotClassNames={CAROUSEL_SLOT_CLASSES}
        />
      </div>
    </div>
  )
}

function ImageColumn({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <div className="relative h-[200px] md:h-full md:min-h-[270px]">
      <HotelCarousel pkg={pkg} variant="card" className="h-full" />
      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
        {pkg.dealName && <Badge palette="caution" emphasis="bold" size="sm">{dealLabel(pkg.dealName)}</Badge>}
        {pkg.savingsPct > 0 && <Badge palette="benefit" emphasis="bold" size="sm">Save {pkg.savingsPct}%</Badge>}
      </div>
      <div className="absolute bottom-3 left-3">
        <Badge palette="neutral" emphasis="regular" size="sm" iconLeft="calendar_month">{tripDaysLabel(pkg)}</Badge>
      </div>
    </div>
  )
}

function SummaryColumn({ pkg, onViewItinerary }: { pkg: NormalizedPackage; onViewItinerary: (p: NormalizedPackage) => void }) {
  const days = buildItineraryDays(pkg)
  const preview = days.slice(0, CARD_DAY_COUNT)
  const moreDays = days.length - CARD_DAY_COUNT
  const plan = useSyncExternalStore(
    subscribeItineraryPlans,
    () => cachedItineraryPlan(pkg),
    () => cachedItineraryPlan(pkg),
  )
  const styleMark = plan.style ? tripStyleOption(plan.style) : null

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <Heading as="h3" textStyle="heading5" palette="primary" shade="13" className="mb-1">
          {tripTitle(pkg)}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Span textStyle="body2" palette="primary" shade="10">{tripMeta(pkg)}</Span>
          {pkg.guestRating > 0 ? <ReviewBadge rating={pkg.guestRating.toFixed(1)} size="sm" /> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="flight">Flight</Badge>
        <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="hotel">Hotel</Badge>
        {pkg.car ? <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="directions_car">Car</Badge> : null}
      </div>

      <ol className="flex min-w-0 flex-col gap-1.5">
        {preview.map((d) => {
          const planned = plan.days.find((day) => day.day === d.day)
          const label = planned ? planned.title : d.isFreeDay ? 'Your day' : d.title
          return (
            <li key={d.day} className="flex min-w-0 items-center gap-1.5 overflow-hidden border-l-2 border-primary-4 pl-2.5">
              <Span textStyle="body2" bold palette="primary" shade="8" className="shrink-0">Day {d.day}</Span>
              {planned && styleMark && d.isFreeDay ? (
                <CdnIcon iconName={styleMark.icon} size="16" className="shrink-0" style={{ color: styleMark.accent }} />
              ) : null}
              <Span
                textStyle="body2"
                palette={planned || !d.isFreeDay ? 'primary' : 'neutral'}
                shade={planned || !d.isFreeDay ? '13' : '7'}
                className="block min-w-0 flex-1 truncate"
              >
                {label}
              </Span>
            </li>
          )
        })}
      </ol>

      {moreDays > 0 ? (
        <PlainButton
          type="primary"
          textStyle="body2"
          className="self-start"
          onClick={() => onViewItinerary(pkg)}
        >
          See {moreDays} more day{moreDays === 1 ? '' : 's'}
        </PlainButton>
      ) : null}

      <div className="flex items-start gap-2">
        <span className="flex h-5 shrink-0 items-center">
          <CdnIcon iconName="hotel" size="20" palette="primary" shade="8" />
        </span>
        <div className="min-w-0">
          <Span textStyle="body2" bold palette="primary" shade="13" className="block">{pkg.hotelName}</Span>
          <Span textStyle="body2" palette="primary" shade="10" className="block">
            {pkg.starRating > 0 ? `${pkg.starRating}-star · ` : ''}{nightsLabel(pkg.nights)}
          </Span>
        </div>
      </div>
    </div>
  )
}

function PriceColumn({ pkg, onViewItinerary }: { pkg: NormalizedPackage; onViewItinerary: (p: NormalizedPackage) => void }) {
  const perPerson = perPersonPrice(pkg)

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1.5">
        {tripHighlights(pkg).map((h) => (
          <li key={h} className="flex items-start gap-1.5">
            <CdnIcon iconName="check" size="16" palette="benefit" shade="8" />
            <Span textStyle="body3" palette="primary" shade="13">{h}</Span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Span textStyle="body3" palette="primary" shade="10" className="block">From</Span>
        {perPerson > 0 ? (
          <Price type="priceSale" textStyle="heading3" bold currencySymbol={pkg.currencySymbol} price={formatAmount(perPerson)} />
        ) : null}
        <Span textStyle="body3" palette="primary" shade="10" className="block">
          per person · <Span textStyle="body3" bold palette="primary" shade="13">{pkg.currencySymbol}{formatAmount(pkg.bundleTotal)} total</Span>
        </Span>
        <Span textStyle="body3" palette="benefit" shade="8" className="block">Taxes &amp; fees included</Span>
        {pkg.resortFee > 0 ? (
          <Span textStyle="body3" palette="neutral" shade="7" className="block">
            + {pkg.currencySymbol}{formatAmount(pkg.resortFee)} resort fee at hotel
          </Span>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button
          type="primary"
          fullWidth
          onClick={() => onViewItinerary(pkg)}
          onMouseEnter={preloadItineraryDrawer}
          onFocus={preloadItineraryDrawer}
        >
          View Itinerary
        </Button>
        <PlainA type="primary" href={bookUrl(pkg)} target="_blank" rel="noopener noreferrer">Book Now</PlainA>
      </div>
    </div>
  )
}

interface PackageCardProps {
  pkg: NormalizedPackage
  onViewItinerary: (p: NormalizedPackage) => void
}

export function PackageCard({ pkg, onViewItinerary }: PackageCardProps) {
  return (
    <div className="mb-5 [animation:slideIn_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
      <Card as="div" cardClassName="overflow-hidden p-0 text-left">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <ImageColumn pkg={pkg} />
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,3fr)_minmax(196px,2fr)]">
            <SummaryColumn pkg={pkg} onViewItinerary={onViewItinerary} />
            <PriceColumn pkg={pkg} onViewItinerary={onViewItinerary} />
          </div>
        </div>
      </Card>
    </div>
  )
}

export function PackageCardSkeleton() {
  return (
    <div className="mb-5">
      <Card as="div" cardClassName="overflow-hidden p-0">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="h-[200px] md:h-full md:min-h-[270px]">
            <Skeleton type="image" className="size-full" width="100%" height="100%" />
          </div>
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[minmax(0,3fr)_minmax(196px,2fr)]">
            <div className="flex flex-col gap-3">
              <Skeleton type="h5" className="w-3/4" />
              <Skeleton type="body2" className="w-1/2" />
              <Skeleton type="body2" className="w-2/3" />
              <Skeleton type="body2" className="w-5/6" />
              <Skeleton type="body2" className="w-4/6" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton type="body3" className="w-2/3" />
              <Skeleton type="body3" className="w-1/2" />
              <Skeleton type="h3" className="mt-auto w-1/2" />
              <Skeleton type="btn_md" className="w-full" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
