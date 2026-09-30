import { Badge, Heading, Price, Span } from '@pcln/horizon'
import type { FlightLeg, NormalizedPackage } from '../types'

function epochToTime(seconds: string): string {
  if (!seconds) return ''
  return new Date(Number(seconds) * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
  })
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function Stars({ count }: { count: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#0068ef' : '#e2e8f0', fontSize: 15 }}>★</span>
      ))}
    </span>
  )
}

function LegRow({ leg, isLast }: { leg: FlightLeg; isLast: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0068ef', flexShrink: 0 }} />
        {!isLast && <div style={{ width: 2, height: 36, background: '#d2e6ff', marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#001833' }}>
            {leg.origin} → {leg.destination}
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {epochToTime(leg.departTime)} – {epochToTime(leg.arriveTime)}
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Operated by {leg.carrier}
        </span>
      </div>
    </div>
  )
}

function FlightItinerary({ legs, label, date, airlineLogoUrl, airline }: {
  legs: FlightLeg[]
  label: string
  date: string
  airlineLogoUrl?: string
  airline?: string
}) {
  if (!legs.length) return null
  const stops = legs.length - 1

  return (
    <div style={{
      background: '#f5f8ff',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 12,
      border: '1px solid #d2e6ff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <span style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: '#0068ef', display: 'block', marginBottom: 2,
          }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{formatDate(date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {airlineLogoUrl && (
            <img
              src={airlineLogoUrl}
              alt={airline}
              style={{ height: 22, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span style={{
            background: stops === 0 ? '#e6f4ea' : '#fff8e1',
            color: stops === 0 ? '#1e7e34' : '#b45309',
            fontSize: 11, fontWeight: 700, padding: '3px 10px',
            borderRadius: 999, border: `1px solid ${stops === 0 ? '#c3e6cb' : '#fde68a'}`,
          }}>
            {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>
      {legs.map((leg, i) => (
        <LegRow key={i} leg={leg} isLast={i === legs.length - 1} />
      ))}
    </div>
  )
}

interface Props {
  pkg: NormalizedPackage
  onClose: () => void
}

export function PackageModal({ pkg, onClose }: Props) {
  const perPerson = pkg.bundleTotal > 0 ? Math.round(pkg.bundleTotal / pkg.travelers) : 0

  const bookParams = new URLSearchParams({
    origin: pkg.origin,
    destination: pkg.destination,
    'departure-date': pkg.departDate.replace(/-/g, ''),
    'return-date': pkg.returnDate.replace(/-/g, ''),
    'num-adults': String(pkg.travelers),
    'package-type-code': 'AH',
  })
  const bookUrl = `https://qaa.priceline.com/shop/search/?${bookParams}`

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,21,64,0.55)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,21,64,0.2)',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <style>{`
          @keyframes modalSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          @media (min-width: 640px) {
            .modal-inner { max-width: 720px; margin: 0 auto; }
          }
        `}</style>

        <div className="modal-inner">
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
          </div>

          {/* Hotel hero */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
            {(pkg.heroImageUrl || pkg.thumbnailUrl) ? (
              <img
                src={pkg.heroImageUrl || pkg.thumbnailUrl}
                alt={pkg.hotelName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#e8eef7' }} />
            )}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.5)', border: 'none',
                color: '#fff', borderRadius: '50%',
                width: 36, height: 36, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >✕</button>
          </div>

          <div style={{ padding: '20px 20px 0' }}>
            {/* Hotel header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {pkg.dealName && (
                  <Badge palette="success" emphasis="bold" size="sm">{pkg.dealName}</Badge>
                )}
                {pkg.allInclusive && (
                  <Badge palette="benefit" emphasis="bold" size="sm">All-Inclusive</Badge>
                )}
                {pkg.freeCancellation && (
                  <Badge palette="benefit" emphasis="medium" size="sm">Free Cancellation</Badge>
                )}
                {pkg.savingsPct > 0 && (
                  <span style={{
                    background: '#0068ef', color: '#fff',
                    fontSize: 11, fontWeight: 800, padding: '3px 10px',
                    borderRadius: 999,
                  }}>Save {pkg.savingsPct}%</span>
                )}
              </div>

              <Heading as="h2" textStyle="heading4" style={{ margin: '0 0 6px', color: '#001833' }}>
                {pkg.hotelName}
              </Heading>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {pkg.starRating > 0 && <Stars count={pkg.starRating} />}
                {pkg.guestRating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      background: '#0068ef', color: '#fff',
                      fontWeight: 800, fontSize: 13, padding: '3px 8px', borderRadius: 6,
                    }}>
                      {pkg.guestRating.toFixed(1)}
                    </span>
                    <Span textStyle="body3" style={{ color: '#334155' }}>
                      {pkg.guestRating >= 9 ? 'Exceptional' : pkg.guestRating >= 8 ? 'Excellent' : 'Very Good'}
                    </Span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: '#e8eef7', margin: '0 0 20px' }} />

            {/* Pricing summary */}
            <div style={{
              background: '#e8f2ff',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
              border: '1px solid #d2e6ff',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
                    Bundle total · {pkg.travelers} traveler{pkg.travelers > 1 ? 's' : ''} · {pkg.nights} nights
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    {pkg.bundleStrikethrough > 0 && (
                      <Price type="priceRetail" textStyle="body1" currencySymbol="$" price={String(Math.round(pkg.bundleStrikethrough))} />
                    )}
                    <Price type="priceSale" textStyle="heading3" bold currencySymbol="$" price={String(Math.round(pkg.bundleTotal))} />
                  </div>
                  {perPerson > 0 && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>${perPerson.toLocaleString()} per person</span>
                  )}
                  {pkg.nightlyRate > 0 && (
                    <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>
                      Hotel from ${Math.round(pkg.nightlyRate)}/night
                    </span>
                  )}
                  {pkg.resortFee > 0 && (
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginTop: 2 }}>
                      + ${pkg.resortFee} resort fee at hotel
                    </span>
                  )}
                </div>
                <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: '#0068ef',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontFamily: "'Montserrat', Arial, sans-serif",
                    fontSize: 15,
                    fontWeight: 800,
                    padding: '13px 28px',
                    cursor: 'pointer',
                    letterSpacing: '0.01em',
                  }}>
                    Book This Package
                  </button>
                </a>
              </div>
            </div>

            {/* Flight itineraries */}
            <div style={{ marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#0068ef', display: 'block', marginBottom: 12,
              }}>
                ✈ Included Flights
              </span>
              <FlightItinerary
                legs={pkg.outboundLegs}
                label="Outbound"
                date={pkg.departDate}
                airlineLogoUrl={pkg.airlineLogoUrl}
                airline={pkg.airline}
              />
              <FlightItinerary
                legs={pkg.returnLegs}
                label="Return"
                date={pkg.returnDate}
                airlineLogoUrl={pkg.airlineLogoUrl}
                airline={pkg.airline}
              />
            </div>

            {/* What's included */}
            <div style={{ marginBottom: 24 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#0068ef', display: 'block', marginBottom: 12,
              }}>
                📋 What's Included
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: '✈️', label: 'Round-trip flights' },
                  { icon: '🏨', label: `${pkg.nights}-night hotel stay` },
                  { icon: '👥', label: `${pkg.travelers} traveler${pkg.travelers > 1 ? 's' : ''}` },
                  ...(pkg.allInclusive ? [{ icon: '🍽️', label: 'All-inclusive meals' }] : []),
                  ...(pkg.freeCancellation ? [{ icon: '↩️', label: 'Free cancellation' }] : []),
                  { icon: '💰', label: 'Bundle savings' },
                ].map(({ icon, label }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#f5f8ff', borderRadius: 8, padding: '10px 14px',
                    border: '1px solid #e8eef7',
                  }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
