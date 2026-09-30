import {
  Badge,
  Card,
  Heading,
  Price,
  Skeleton,
  Span,
} from '@pcln/horizon'
import type { FlightLeg, NormalizedFlight, NormalizedPackage } from '../types'

function epochToTime(seconds: string): string {
  if (!seconds) return ''
  return new Date(Number(seconds) * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
  })
}

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#0068ef' : '#d2e6ff', fontSize: 13 }}>★</span>
      ))}
    </div>
  )
}

function RouteRow({ legs, date }: { legs: FlightLeg[]; date: string }) {
  if (!legs.length) return null
  const first = legs[0]
  const last = legs[legs.length - 1]
  const stops = legs.length - 1
  const depTime = epochToTime(first.departTime)
  const arrTime = epochToTime(last.arriveTime)
  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  return (
    <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
      <Span textStyle="body3" style={{ color: '#0068ef', fontWeight: 800, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {dateLabel}
      </Span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <Span textStyle="body1" bold style={{ color: '#001833' }}>{first.origin}</Span>
          <Span textStyle="body3" style={{ color: '#496785', display: 'block' }}>{depTime}</Span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, borderTop: '2px dashed #b3d4ff' }} />
          <span style={{ fontSize: 14, margin: '0 6px', color: '#0068ef' }}>✈</span>
          <div style={{ flex: 1, borderTop: '2px dashed #b3d4ff' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Span textStyle="body1" bold style={{ color: '#001833' }}>{last.destination}</Span>
          <Span textStyle="body3" style={{ color: '#496785', display: 'block' }}>{arrTime}</Span>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <Span textStyle="body3" style={{ background: '#e8f2ff', color: '#003c8a', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
          {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
          {legs.slice(1).map(l => ` · ${l.origin}`).join('')}
        </Span>
      </div>
    </div>
  )
}

function HotelSection({ pkg }: { pkg: NormalizedPackage }) {
  const perks: string[] = []
  if (pkg.allInclusive) perks.push('All-Inclusive')
  if (pkg.freeCancellation) perks.push('Free Cancel')

  return (
    <div className="pkg-hotel-section">
      <Span textStyle="body3" style={{ color: '#0068ef', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 12 }}>
        🏨 Hotel
      </Span>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        {(pkg.heroImageUrl || pkg.thumbnailUrl) ? (
          <img
            src={pkg.heroImageUrl || pkg.thumbnailUrl}
            alt={pkg.hotelName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              const img = e.target as HTMLImageElement
              if (pkg.heroImageUrl && img.src !== pkg.thumbnailUrl && pkg.thumbnailUrl) {
                img.src = pkg.thumbnailUrl
              } else {
                img.style.display = 'none'
              }
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#e8f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Span textStyle="body3" style={{ color: '#8399b0' }}>No image</Span>
          </div>
        )}
        {pkg.savingsPct > 0 && (
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            <span style={{
              background: '#0068ef',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 6,
            }}>Save {pkg.savingsPct}%</span>
          </div>
        )}
      </div>

      <Heading as="h3" textStyle="heading5" style={{ marginBottom: 6, color: '#001833' }}>
        {pkg.hotelName}
      </Heading>

      {pkg.starRating > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Stars count={pkg.starRating} />
        </div>
      )}

      {pkg.guestRating > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#0068ef', color: '#fff', fontWeight: 800, fontSize: 13, padding: '3px 8px', borderRadius: 6 }}>
            {pkg.guestRating.toFixed(1)}
          </div>
          <Span textStyle="body3" style={{ color: '#334155' }}>
            {pkg.guestRating >= 9 ? 'Exceptional' : pkg.guestRating >= 8 ? 'Excellent' : 'Very Good'}
          </Span>
        </div>
      )}

      {perks.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {perks.map((p) => (
            <Badge key={p} palette="benefit" emphasis="medium" size="sm">{p}</Badge>
          ))}
        </div>
      )}

      {pkg.nightlyRate > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {pkg.nightlyStrikethrough > 0 && (
            <Price
              type="priceRetail"
              textStyle="body2"
              currencySymbol="$"
              price={String(Math.round(pkg.nightlyStrikethrough))}
            />
          )}
          <Price
            type="priceSale"
            textStyle="body1"
            bold
            currencySymbol="$"
            price={String(Math.round(pkg.nightlyRate))}
          />
          <Span textStyle="body3" style={{ color: '#496785' }}>/night</Span>
        </div>
      )}
    </div>
  )
}

function FlightSection({ pkg, flightOverride, onChangeFlight }: {
  pkg: NormalizedPackage
  flightOverride?: NormalizedFlight
  onChangeFlight?: () => void
}) {
  const airline = flightOverride?.airline ?? pkg.airline
  const airlineLogoUrl = flightOverride?.airlineLogoUrl ?? pkg.airlineLogoUrl
  const outboundLegs = flightOverride?.outboundLegs ?? pkg.outboundLegs
  const returnLegs = flightOverride?.returnLegs ?? pkg.returnLegs
  const isOverride = !!flightOverride && flightOverride.itemKey !== pkg.flyItemKey

  return (
    <div className="pkg-flight-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Span textStyle="body3" style={{ color: '#0068ef', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ✈️ {isOverride ? 'Alternative Flight' : 'Included Flight'}
        </Span>
        {onChangeFlight && (
          <button className="pkg-detail-link" onClick={onChangeFlight} style={{ fontSize: 11 }}>
            🔄 Change ›
          </button>
        )}
      </div>

      {isOverride && (
        <div style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '3px 8px', display: 'inline-block', marginBottom: 8 }}>
          ⚠ Custom selection — pricing may vary
        </div>
      )}

      {airline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {airlineLogoUrl && (
            <img
              src={airlineLogoUrl}
              alt={airline}
              style={{ height: 24, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <Span textStyle="body3" style={{ color: '#496785', fontWeight: 600 }}>
            {airline}
          </Span>
        </div>
      )}

      <RouteRow legs={outboundLegs} date={pkg.departDate} />
      <RouteRow legs={returnLegs} date={pkg.returnDate} />

      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <span style={{
          background: '#e8f2ff',
          color: '#003c8a',
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: 999,
          border: '1px solid #b3d4ff',
        }}>
          {pkg.nights} nights included
        </span>
      </div>
    </div>
  )
}

function PricingFooter({ pkg, onHotelDetails, onFlightDetails }: {
  pkg: NormalizedPackage
  onHotelDetails?: (p: NormalizedPackage) => void
  onFlightDetails?: (p: NormalizedPackage) => void
}) {
  const params = new URLSearchParams({
    origin: pkg.origin,
    destination: pkg.destination,
    'departure-date': pkg.departDate.replace(/-/g, ''),
    'return-date': pkg.returnDate.replace(/-/g, ''),
    'num-adults': String(pkg.travelers),
    'package-type-code': 'AH',
  })
  const bookUrl = `https://qaa.priceline.com/shop/search/?${params}`
  const perPerson = pkg.bundleTotal > 0 ? Math.round(pkg.bundleTotal / pkg.travelers) : 0

  return (
    <div className="pkg-pricing-footer">
      <div>
        <Span textStyle="body3" style={{ color: '#496785', display: 'block', marginBottom: 2 }}>
          Bundle total · {pkg.travelers} traveler{pkg.travelers > 1 ? 's' : ''}
        </Span>
        {pkg.bundleStrikethrough > 0 && (
          <Price type="priceRetail" textStyle="body1" currencySymbol="$" price={String(Math.round(pkg.bundleStrikethrough))} />
        )}
        {pkg.bundleTotal > 0 && (
          <Price type="priceSale" textStyle="heading3" bold currencySymbol="$" price={String(Math.round(pkg.bundleTotal))} />
        )}
        {perPerson > 0 && (
          <Span textStyle="body3" style={{ color: '#496785' }}>${perPerson.toLocaleString()}/person</Span>
        )}
        {pkg.resortFee > 0 && (
          <Span textStyle="body3" style={{ color: '#8399b0', display: 'block', marginTop: 2 }}>
            + ${pkg.resortFee} resort fee at hotel
          </Span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Detail links */}
        <div style={{ display: 'flex', gap: 14 }}>
          {onHotelDetails && (
            <button className="pkg-detail-link" onClick={() => onHotelDetails(pkg)}>
              🏨 Hotel Details ›
            </button>
          )}
          {onFlightDetails && (
            <button className="pkg-detail-link" onClick={() => onFlightDetails(pkg)}>
              ✈ Flight Details ›
            </button>
          )}
        </div>
        <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <button
            style={{ width: '100%', background: '#0068ef', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 14, fontWeight: 700, padding: '11px 24px', cursor: 'pointer' }}
            onMouseOver={(e) => { (e.target as HTMLButtonElement).style.background = '#0053bf' }}
            onMouseOut={(e) => { (e.target as HTMLButtonElement).style.background = '#0068ef' }}
          >
            Book Now
          </button>
        </a>
      </div>
    </div>
  )
}

interface PackageCardProps {
  pkg: NormalizedPackage
  flightOverride?: NormalizedFlight
  onHotelDetails?: (p: NormalizedPackage) => void
  onFlightDetails?: (p: NormalizedPackage) => void
  onChangeFlight?: (p: NormalizedPackage) => void
}

export function PackageCard({ pkg, flightOverride, onHotelDetails, onFlightDetails, onChangeFlight }: PackageCardProps) {
  return (
    <div style={{ marginBottom: 20, animation: 'slideIn 0.3s cubic-bezier(0.22,1,0.36,1) both' }}>
      <Card
        as="div"
        topSubPanel={
          <div className="pkg-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge palette="marketingBrand" emphasis="bold" size="sm">
                {pkg.dealName || 'FLIGHT + HOTEL'}
              </Badge>
              <Heading as="h2" textStyle="heading6" style={{ margin: 0, color: '#001833' }}>
                {pkg.destination} · Cancun Area
              </Heading>
            </div>
          </div>
        }
        bottomSubPanel={<PricingFooter pkg={pkg} onHotelDetails={onHotelDetails} onFlightDetails={onFlightDetails} />}
        bottomSubPanelEmphasis="none"
      >
        <div className="pkg-card-body">
          <HotelSection pkg={pkg} />
          <FlightSection
            pkg={pkg}
            flightOverride={flightOverride}
            onChangeFlight={onChangeFlight ? () => onChangeFlight(pkg) : undefined}
          />
        </div>
      </Card>
    </div>
  )
}

export function PackageCardSkeleton() {
  return (
    <div style={{ marginBottom: 20 }}>
      <Card as="div">
        <div style={{ padding: 20 }}>
          <Skeleton type="h5" className="mb-4 w-48" />
          <div className="pkg-card-body">
            <div style={{ flex: 1 }}>
              <Skeleton type="image" className="rounded-xl mb-3 h-44" />
              <Skeleton type="h6" className="mb-2 w-3/4" />
              <Skeleton type="body2" className="w-1/2" />
            </div>
            <div style={{ flex: 1 }}>
              <Skeleton type="image" className="rounded-lg mb-3 h-20" />
              <Skeleton type="image" className="rounded-lg h-16" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
