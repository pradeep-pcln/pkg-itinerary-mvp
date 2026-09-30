import { Badge, Heading, Price, Span } from '@pcln/horizon'
import type { NormalizedPackage } from '../types'

function Stars({ count }: { count: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#0068ef' : '#d2e6ff', fontSize: 16 }}>★</span>
      ))}
    </span>
  )
}

const AMENITY_ICONS: Record<string, string> = {
  allInclusive: '🍽️',
  freeCancellation: '↩️',
  pool: '🏊',
  spa: '💆',
  gym: '🏋️',
  wifi: '📶',
  parking: '🅿️',
  restaurant: '🍴',
  bar: '🍸',
  beachAccess: '🏖️',
  airportTransfer: '🚌',
  kidsClub: '🎠',
}

interface Props {
  pkg: NormalizedPackage
  onClose: () => void
}

export function HotelModal({ pkg, onClose }: Props) {
  const bookParams = new URLSearchParams({
    origin: pkg.origin,
    destination: pkg.destination,
    'departure-date': pkg.departDate.replace(/-/g, ''),
    'return-date': pkg.returnDate.replace(/-/g, ''),
    'num-adults': String(pkg.travelers),
    'package-type-code': 'AH',
  })
  const bookUrl = `https://qaa.priceline.com/shop/search/?${bookParams}`

  const amenities: { key: string; label: string }[] = [
    ...(pkg.allInclusive ? [{ key: 'allInclusive', label: 'All-Inclusive' }] : []),
    ...(pkg.freeCancellation ? [{ key: 'freeCancellation', label: 'Free Cancellation' }] : []),
  ]

  const checkIn = new Date(pkg.departDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
  const checkOut = new Date(pkg.returnDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,24,51,0.55)',
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
        boxShadow: '0 -8px 40px rgba(0,24,51,0.25)',
        animation: 'hotelSlideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <style>{`
          @keyframes hotelSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          .hotel-modal-inner { max-width: 720px; margin: 0 auto; }
        `}</style>

        <div className="hotel-modal-inner">
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d2e6ff' }} />
          </div>

          {/* Hero image */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', overflow: 'hidden', marginTop: 8 }}>
            {(pkg.heroImageUrl || pkg.thumbnailUrl) ? (
              <img
                src={pkg.heroImageUrl || pkg.thumbnailUrl}
                alt={pkg.hotelName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#e8f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 40 }}>🏨</span>
              </div>
            )}

            {/* Category label */}
            <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
              <span style={{
                background: 'rgba(0,24,51,0.7)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 6,
                textTransform: 'uppercase' as const, letterSpacing: '0.06em',
              }}>🏨 Hotel Details</span>
            </div>

            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.5)', border: 'none',
                color: '#fff', borderRadius: '50%',
                width: 36, height: 36, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>

          <div style={{ padding: '20px 20px 0' }}>

            {/* Name + stars + rating */}
            <Heading as="h2" textStyle="heading4" style={{ margin: '0 0 8px', color: '#001833' }}>
              {pkg.hotelName}
            </Heading>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const }}>
              {pkg.starRating > 0 && <Stars count={pkg.starRating} />}
              {pkg.guestRating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    background: '#0068ef', color: '#fff',
                    fontWeight: 800, fontSize: 13,
                    padding: '3px 9px', borderRadius: 6,
                  }}>
                    {pkg.guestRating.toFixed(1)}
                  </span>
                  <Span textStyle="body3" style={{ color: '#334155' }}>
                    {pkg.guestRating >= 9 ? 'Exceptional' : pkg.guestRating >= 8 ? 'Excellent' : 'Very Good'}
                  </Span>
                </div>
              )}
            </div>

            {/* Badges */}
            {(pkg.dealName || pkg.allInclusive || pkg.freeCancellation || pkg.savingsPct > 0) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 16 }}>
                {pkg.dealName && <Badge palette="marketingBrand" emphasis="bold" size="sm">{pkg.dealName}</Badge>}
                {pkg.allInclusive && <Badge palette="benefit" emphasis="bold" size="sm">All-Inclusive</Badge>}
                {pkg.freeCancellation && <Badge palette="benefit" emphasis="medium" size="sm">Free Cancellation</Badge>}
                {pkg.savingsPct > 0 && (
                  <span style={{ background: '#0068ef', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999 }}>
                    Save {pkg.savingsPct}%
                  </span>
                )}
              </div>
            )}

            <div style={{ height: 1, background: '#e8f2ff', margin: '0 0 20px' }} />

            {/* Stay details */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
              background: '#d2e6ff', borderRadius: 12, overflow: 'hidden', marginBottom: 20,
            }}>
              {[
                { label: 'Check-in', value: checkIn },
                { label: 'Check-out', value: checkOut },
                { label: 'Duration', value: `${pkg.nights} night${pkg.nights !== 1 ? 's' : ''}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f5f8ff', padding: '14px 16px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 11, color: '#8399b0', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#001833', fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#496785', marginBottom: 12 }}>
                  Amenities
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {amenities.map(({ key, label }) => (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#f5f8ff', borderRadius: 8, padding: '10px 14px',
                      border: '1px solid #d2e6ff',
                    }}>
                      <span style={{ fontSize: 18 }}>{AMENITY_ICONS[key] ?? '✓'}</span>
                      <span style={{ fontSize: 13, color: '#001833', fontWeight: 500 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pricing */}
            <div style={{
              background: '#e8f2ff', borderRadius: 12, padding: '16px 20px',
              marginBottom: 24, border: '1px solid #d2e6ff',
              display: 'flex', alignItems: 'flex-end',
              justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 14,
            }}>
              <div>
                <Span textStyle="body3" style={{ color: '#496785', display: 'block', marginBottom: 2 }}>
                  Hotel · {pkg.travelers} traveler{pkg.travelers > 1 ? 's' : ''} · {pkg.nights} nights
                </Span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  {pkg.nightlyStrikethrough > 0 && (
                    <Price type="priceRetail" textStyle="body2" currencySymbol="$" price={String(Math.round(pkg.nightlyStrikethrough))} />
                  )}
                  <Price type="priceSale" textStyle="heading4" bold currencySymbol="$" price={String(Math.round(pkg.nightlyRate))} />
                  <Span textStyle="body3" style={{ color: '#496785' }}>/night</Span>
                </div>
                {pkg.resortFee > 0 && (
                  <Span textStyle="body3" style={{ color: '#8399b0', display: 'block', marginTop: 4 }}>
                    + ${pkg.resortFee} resort fee due at hotel
                  </Span>
                )}
              </div>
              <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: '#0068ef', border: 'none', borderRadius: 10,
                  color: '#fff', fontFamily: "'Montserrat', Arial, sans-serif",
                  fontSize: 14, fontWeight: 800, padding: '12px 28px', cursor: 'pointer',
                }}>
                  Book Package
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
