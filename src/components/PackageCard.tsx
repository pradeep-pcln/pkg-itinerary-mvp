import {
  Badge,
  Button,
  Card,
  Carousel,
  CdnIcon,
  Heading,
  PlainA,
  Price,
  ReviewBadge,
  Skeleton,
  Span,
} from '@pcln/horizon'
import { useState } from 'react'
import {
  bookUrl,
  dealLabel,
  perPersonPrice,
  placeholderActivityCount,
  placeholderDays,
  placeholderHighlights,
  tripDaysLabel,
  tripMeta,
  tripTitle,
} from '../lib/itinerary'
import type { NormalizedPackage } from '../types'

const CARD_DAY_COUNT = 3

// Deterministic stand-in until a review-count source exists
function placeholderReviewCount(pkg: NormalizedPackage): number {
  return 120 + ((pkg.proposalIndex * 37) % 400)
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
    <div className="relative">
      <HotelCarousel pkg={pkg} variant="card" className="aspect-[4/3] md:aspect-auto md:h-full md:min-h-64" />
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

function SummaryColumn({ pkg }: { pkg: NormalizedPackage }) {
  const days = placeholderDays(pkg).slice(0, CARD_DAY_COUNT)
  const activityCount = placeholderActivityCount(pkg)

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div>
        <Heading as="h3" textStyle="heading5" palette="primary" shade="13" className="mb-1">
          {tripTitle(pkg)}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Span textStyle="body3" palette="primary" shade="10">{tripMeta(pkg)}</Span>
          {pkg.guestRating > 0 && (
            <>
              <ReviewBadge rating={pkg.guestRating.toFixed(1)} size="sm" />
              <Span textStyle="body3" palette="neutral" shade="7">{placeholderReviewCount(pkg)} reviews</Span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="flight">Flight</Badge>
        <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="hotel">Hotel</Badge>
        {pkg.car && <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="directions_car">Car</Badge>}
        {activityCount > 0 && (
          <Badge palette="neutral" emphasis="medium" size="sm" iconLeft="attractions">
            {activityCount} Activities
          </Badge>
        )}
      </div>

      <ol className="flex flex-col gap-1.5">
        {days.map((d) => (
          <li key={d.day} className="border-l-2 border-primary-4 pl-2.5">
            <Span textStyle="body3" bold palette="primary" shade="8" className="mr-1.5">Day {d.day}</Span>
            <Span textStyle="body3" palette="primary" shade="13">{d.title}</Span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex items-start gap-1.5">
        <CdnIcon iconName="hotel" size="16" palette="primary" shade="8" />
        <div className="min-w-0">
          <Span textStyle="body3" bold palette="primary" shade="13">{pkg.hotelName}</Span>
          <Span textStyle="body3" palette="primary" shade="10">
            {' · '}{pkg.starRating > 0 ? `${pkg.starRating}-star · ` : ''}{pkg.nights} nights
          </Span>
        </div>
      </div>
    </div>
  )
}

function PriceColumn({ pkg, onViewItinerary }: { pkg: NormalizedPackage; onViewItinerary: (p: NormalizedPackage) => void }) {
  const perPerson = perPersonPrice(pkg)

  return (
    <div className="flex flex-col gap-4 border-t border-primary-4 px-5 py-4 md:border-t-0 md:border-l">
      <ul className="flex flex-col gap-1.5">
        {placeholderHighlights().map((h) => (
          <li key={h.label} className="flex items-start gap-1.5">
            <CdnIcon iconName="check" size="16" palette="benefit" shade="8" />
            <Span textStyle="body3" palette="primary" shade="13">{h.label}</Span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <Span textStyle="body3" palette="primary" shade="10" className="block">From</Span>
        {perPerson > 0 && (
          <Price type="priceSale" textStyle="heading3" bold currencySymbol={pkg.currencySymbol} price={perPerson.toLocaleString()} />
        )}
        <Span textStyle="body3" palette="primary" shade="10" className="block">
          per person · <Span textStyle="body3" bold palette="primary" shade="13">${Math.round(pkg.bundleTotal).toLocaleString()} total</Span>
        </Span>
        <Span textStyle="body3" palette="benefit" shade="8" className="block">Taxes &amp; fees included</Span>
        {pkg.resortFee > 0 && (
          <Span textStyle="body3" palette="neutral" shade="7" className="block">
            + ${pkg.resortFee} resort fee at hotel
          </Span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button type="primary" fullWidth onClick={() => onViewItinerary(pkg)}>View Itinerary</Button>
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
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
          <ImageColumn pkg={pkg} />
          <SummaryColumn pkg={pkg} />
          <PriceColumn pkg={pkg} onViewItinerary={onViewItinerary} />
        </div>
      </Card>
    </div>
  )
}

export function PackageCardSkeleton() {
  return (
    <div className="mb-5">
      <Card as="div" cardClassName="overflow-hidden p-0">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
          <Skeleton type="image" className="aspect-[4/3] md:aspect-auto md:h-full md:min-h-64" />
          <div className="flex flex-col gap-3 px-5 py-4">
            <Skeleton type="h5" className="w-3/4" />
            <Skeleton type="body2" className="w-1/2" />
            <Skeleton type="body2" className="w-2/3" />
            <Skeleton type="body2" className="w-5/6" />
            <Skeleton type="body2" className="w-4/6" />
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            <Skeleton type="body2" className="w-2/3" />
            <Skeleton type="body2" className="w-1/2" />
            <Skeleton type="h3" className="mt-auto w-1/2" />
            <Skeleton type="btn_md" className="w-full" />
          </div>
        </div>
      </Card>
    </div>
  )
}
