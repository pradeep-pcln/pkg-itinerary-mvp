import { Button, CdnIcon, Heading, IconButton, InputChip, InputText, Span } from '@pcln/horizon'
import type { ValidGoogleSymbol } from '@pcln/horizon'
import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import {
  cityName,
  formatAmount,
  itineraryDaysForShare,
  shareUrl,
  shortDate,
  travelersLabel,
  tripTitle,
} from '../../lib/itinerary'
import type { ActivityImageResult, AiDay, ItineraryDay } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_SEPARATORS = /[,\s;]+/
// Long enough for the plane to land and the last caption to settle
const SENDING_MS = 2900

type ShareStage = 'compose' | 'sending' | 'sent'

// Recipients live only in this hook's state: never logged, cached, or sent to the server.
export function useShareTrip(pkg: NormalizedPackage, aiDays: AiDay[] | null, activityImages: ReadonlyMap<string, ActivityImageResult>) {
  const [email, setEmail] = useState('')
  const [recipients, setRecipients] = useState<string[]>([])
  const [error, setError] = useState('')
  const [errorNotice, setErrorNotice] = useState(0)
  const [stage, setStage] = useState<ShareStage>('compose')
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const days = itineraryDaysForShare(pkg, aiDays, activityImages)
  const destination = cityName(pkg.destination)
  const subject = `${destination} together? Here’s the plan`
  const greeting = `I found this ${destination} trip and wanted to share the plan with you.`
  const tripLink = shareUrl(pkg, window.location.href)

  useEffect(() => () => {
    if (sendTimer.current) clearTimeout(sendTimer.current)
  }, [])

  function reset() {
    if (sendTimer.current) clearTimeout(sendTimer.current)
    sendTimer.current = null
    setEmail('')
    setRecipients([])
    setError('')
    setErrorNotice(0)
    setStage('compose')
  }

  function updateEmail(value: string) {
    setEmail(value)
    if (error) setError('')
  }

  function reportError(message: string) {
    setError(message)
    setErrorNotice((notice) => notice + 1)
  }

  function addRecipients(): string[] | null {
    const candidates = email.split(EMAIL_SEPARATORS).map((value) => value.trim().toLowerCase()).filter(Boolean)
    if (candidates.length === 0) {
      reportError('Enter an email address')
      return null
    }
    const invalid = candidates.find((candidate) => !EMAIL_PATTERN.test(candidate))
    if (invalid) {
      reportError(`“${invalid}” doesn’t look like an email`)
      return null
    }
    const next = [...new Set([...recipients, ...candidates])]
    setRecipients(next)
    setEmail('')
    setError('')
    return next
  }

  function removeRecipient(recipient: string) {
    setRecipients((current) => current.filter((item) => item !== recipient))
  }

  function send() {
    const finalRecipients = email.trim() ? addRecipients() : recipients
    if (!finalRecipients) return
    if (finalRecipients.length === 0) {
      reportError('Add at least one email address')
      return
    }
    setStage('sending')
    if (sendTimer.current) clearTimeout(sendTimer.current)
    sendTimer.current = setTimeout(() => {
      sendTimer.current = null
      setStage('sent')
    }, SENDING_MS)
  }

  return {
    email, recipients, error, errorNotice, stage, sent: stage === 'sent', days, destination, subject, greeting, tripLink,
    reset, updateEmail, addRecipients, removeRecipient, send,
  }
}

export type ShareTripState = ReturnType<typeof useShareTrip>

export function ShareTripHeader({ sent, onBack }: Readonly<{ sent: boolean; onBack: () => void }>) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pr-12 pb-3 lg:px-6">
      <IconButton type="plainPrimary" size="md" iconName="arrow_back" aria-label="Back to itinerary" onClick={onBack} />
      <div className="min-w-0">
        <Heading as="h2" textStyle="heading3" palette="primary" shade="13">
          {sent ? 'Trip shared' : 'Share this trip'}
        </Heading>
        <Span textStyle="body2" palette="primary" shade="10">
          {sent ? 'Your trip just landed in their inbox' : 'Plan it together with friends and family'}
        </Span>
      </div>
    </div>
  )
}

export function ShareTripFooter({ share, onBack }: Readonly<{ share: ShareTripState; onBack: () => void }>) {
  if (share.stage === 'sending') return null
  return (
    <div className="flex flex-col gap-2 border-t border-primary-4 bg-neutral-1 px-4 py-4 sm:flex-row sm:justify-end lg:px-6">
      {share.sent ? (
        <Button type="primary" size="lg" buttonType="button" className="w-full sm:w-auto" onClick={onBack}>
          Back to itinerary
        </Button>
      ) : (
        <>
          <Button type="secondary" size="lg" buttonType="button" className="w-full sm:w-auto" onClick={onBack}>
            Cancel
          </Button>
          <Button type="primary" size="lg" buttonType="button" className="w-full sm:w-auto" iconLeft="email" onClick={share.send}>
            Send email
          </Button>
        </>
      )}
    </div>
  )
}

export function ShareTripBody({ pkg, share }: Readonly<{ pkg: NormalizedPackage; share: ShareTripState }>) {
  const topRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLElement>(null)

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [share.stage])

  useEffect(() => {
    if (!share.errorNotice) return
    fieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    fieldRef.current?.querySelector('input')?.focus()
  }, [share.errorNotice])

  if (share.stage === 'sending') {
    return (
      <div ref={topRef}>
        {SHARE_MOTION}
        <SendingStage />
      </div>
    )
  }

  if (share.stage === 'sent') {
    return (
      <div ref={topRef} className="px-4 pt-2 pb-8 lg:px-6">
        {SHARE_MOTION}
        <SentStage pkg={pkg} share={share} />
      </div>
    )
  }

  return (
    <div ref={topRef} className="flex flex-col gap-6 px-4 pt-2 pb-8 lg:px-6">
      <RecipientsField ref={fieldRef} share={share} />
      <section className="flex flex-col gap-3" aria-label="Email preview">
        <div className="flex items-center justify-between gap-2">
          <Heading as="h3" textStyle="heading5" palette="primary" shade="13">Preview</Heading>
          <Span textStyle="body3" palette="primary" shade="8">Updates with your latest plan</Span>
        </div>
        <EmailPreview pkg={pkg} share={share} />
      </section>
    </div>
  )
}

const FLIGHT_PATH = 'M30 170 Q 150 -10 290 120'

const SHARE_MOTION = (
  <style>{`
    @keyframes shareFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes shareFly {
      0% { offset-distance: 0%; transform: scale(.7); opacity: 0; }
      10% { opacity: 1; transform: scale(1); }
      85% { offset-distance: 100%; opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; transform: scale(.6); }
    }
    @keyframes shareTrail { from { stroke-dashoffset: 360; } to { stroke-dashoffset: 0; } }
    @keyframes shareDrift { from { transform: translateX(-12px); } to { transform: translateX(14px); } }
    @keyframes shareLand { from { opacity: 0; transform: translateY(-14px) scale(.6); } to { opacity: 1; transform: none; } }
    @keyframes shareRing { 0% { transform: scale(.6); opacity: .7; } 100% { transform: scale(2); opacity: 0; } }
    @keyframes sharePhrase {
      0% { opacity: 0; transform: translateY(8px); }
      8% { opacity: 1; transform: none; }
      30% { opacity: 1; }
      36%, 100% { opacity: 0; transform: translateY(-8px); }
    }
    @keyframes sharePhraseLast {
      0% { opacity: 0; transform: translateY(8px); }
      8% { opacity: 1; transform: none; }
      100% { opacity: 1; }
    }
    @keyframes shareRingDraw { from { stroke-dashoffset: 176; } to { stroke-dashoffset: 0; } }
    @keyframes shareCheckDraw { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
    @keyframes sharePop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes shareRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @keyframes shareConfetti {
      0% { opacity: 0; transform: translate(0, 0) scale(.4); }
      20% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
    }
    .share-fade-in { animation: shareFadeIn .3s ease both; }
    .share-cloud { animation: shareDrift 5s ease-in-out infinite alternate; }
    .share-cloud-b { animation: shareDrift 4s ease-in-out infinite alternate-reverse; }
    .share-trail { stroke-dasharray: 360; animation: shareTrail 2.4s cubic-bezier(.5,0,.3,1) both; }
    .share-plane {
      offset-path: path('${FLIGHT_PATH}');
      offset-rotate: auto;
      animation: shareFly 2.4s cubic-bezier(.5,0,.3,1) both;
    }
    .share-pin { transform-box: fill-box; transform-origin: 50% 100%; animation: shareLand .6s ease 2.1s both; }
    .share-pin-ring { transform-box: fill-box; transform-origin: center; opacity: 0; animation: shareRing 1.2s ease-out 2.2s infinite; }
    .share-phrase { animation: sharePhrase 2.6s ease both; }
    .share-phrase-last { animation: sharePhraseLast 2.6s ease 1.74s both; }
    .share-mark { animation: sharePop .5s ease both; }
    .share-mark-ring { stroke-dasharray: 176; animation: shareRingDraw .6s ease .1s both; }
    .share-mark-check { stroke-dasharray: 40; animation: shareCheckDraw .4s ease .6s both; }
    .share-confetti { animation: shareConfetti 1.1s ease-out .45s both; }
    .share-rise { animation: shareRise .5s ease both; }
    @media (prefers-reduced-motion: reduce) {
      .share-fade-in, .share-cloud, .share-cloud-b, .share-trail, .share-plane, .share-pin, .share-pin-ring,
      .share-phrase, .share-phrase-last, .share-mark, .share-mark-ring, .share-mark-check, .share-confetti, .share-rise { animation: none; }
      .share-plane, .share-phrase, .share-confetti { display: none; }
      .share-pin-ring { opacity: 1; }
    }
  `}</style>
)

const SENDING_PHRASES = [
  { text: 'Packing your itinerary…', delay: '0s' },
  { text: 'Stamping your passport…', delay: '.87s' },
] as const

function SendingStage() {
  return (
    <div
      className="share-fade-in flex min-h-[60vh] flex-col items-center justify-center gap-[18px] bg-linear-to-b from-primary-2 via-neutral-1 to-neutral-1 px-4 py-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Sending your trip</span>
      <div aria-hidden className="relative h-[210px] w-[320px] max-w-full">
        <span className="share-cloud absolute top-10 left-5 h-[26px] w-[90px] rounded-full bg-actionPrimary-1 opacity-80" />
        <span className="share-cloud-b absolute top-[130px] left-[190px] h-5 w-[70px] rounded-full bg-primary-2" />
        <svg width="320" height="210" viewBox="0 0 320 210" className="absolute inset-0 overflow-visible">
          <path d={FLIGHT_PATH} fill="none" stroke="#b9d3f7" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
          <path d={FLIGHT_PATH} fill="none" className="share-trail stroke-actionPrimary-8" strokeWidth="3" strokeLinecap="round" />
          <ellipse className="share-pin-ring" cx="290" cy="120" rx="13" ry="5" fill="none" stroke="#0a9b3a" strokeWidth="2" />
          <g className="share-pin">
            <g transform="translate(274 81)" stroke="#0a9b3a" strokeWidth="3.5" strokeLinejoin="round">
              <path d="M16 37C16 37 4 24 4 14.5a12 12 0 0 1 24 0C28 24 16 37 16 37z" fill="#ffffff" />
              <circle cx="16" cy="14.5" r="4" fill="#0a9b3a" stroke="none" />
            </g>
          </g>
        </svg>
        <span className="absolute top-[164px] left-6 size-3 rounded-full bg-actionPrimary-8 shadow-[0_0_0_6px_#d9e8ff]" />
        <span className="share-plane absolute top-0 left-0 flex text-actionPrimary-8">
          <span className="flex rotate-90 drop-shadow-[0_6px_6px_rgba(0,104,239,0.3)]">
            <CdnIcon iconName="flight" size="36" />
          </span>
        </span>
      </div>
      <div aria-hidden className="relative h-7 w-full text-center text-[18px] font-semibold text-primary-13">
        {SENDING_PHRASES.map((phrase) => (
          <span key={phrase.text} className="share-phrase absolute inset-0" style={{ animationDelay: phrase.delay }}>
            {phrase.text}
          </span>
        ))}
        <span className="share-phrase-last absolute inset-0">Cleared for landing</span>
      </div>
    </div>
  )
}

const CONFETTI = [
  { dx: '-70px', dy: '-60px', size: 6, color: 'bg-actionPrimary-6' },
  { dx: '60px', dy: '-75px', size: 8, color: 'bg-success-8' },
  { dx: '90px', dy: '-10px', size: 10, color: 'bg-[#ffc933]' },
  { dx: '-90px', dy: '5px', size: 6, color: 'bg-actionPrimary-6' },
  { dx: '-30px', dy: '-90px', size: 8, color: 'bg-success-8' },
  { dx: '35px', dy: '-95px', size: 10, color: 'bg-[#ffc933]' },
] as const

function SentStage({ pkg, share }: Readonly<{ pkg: NormalizedPackage; share: ShareTripState }>) {
  const count = share.recipients.length
  const details = [
    `${shortDate(pkg.departDate)} – ${shortDate(pkg.returnDate)}`,
    travelersLabel(pkg.travelers),
    `${pkg.currencySymbol}${formatAmount(pkg.bundleTotal)}`,
  ].join(' · ')

  return (
    <div className="flex flex-col items-center gap-[18px] text-center" role="status" aria-live="polite">
      <div aria-hidden className="relative mt-2 size-24 text-success-8">
        <svg width="96" height="96" viewBox="0 0 96 96" className="share-mark">
          <circle cx="48" cy="48" r="28" className="fill-success-1" />
          <circle
            cx="48"
            cy="48"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="share-mark-ring"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transformBox: 'fill-box' }}
          />
          <path
            d="M37 49l8 8 15-17"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="share-mark-check"
          />
        </svg>
        {CONFETTI.map((dot) => (
          <span
            key={`${dot.dx}${dot.dy}`}
            className={`share-confetti absolute top-1/2 left-1/2 -m-1 rounded-full ${dot.color}`}
            style={{ width: dot.size, height: dot.size, '--dx': dot.dx, '--dy': dot.dy } as CSSProperties}
          />
        ))}
      </div>

      <div className="share-rise flex flex-col gap-1" style={{ animationDelay: '.5s' }}>
        <h3 className="text-[22px] leading-tight font-bold text-primary-13">Email sent. Bon voyage!</h3>
        <Span textStyle="body2" palette="primary" shade="10">
          Sent to {count === 1 ? '1 person' : `${count} people`}
        </Span>
      </div>

      <ul className="flex w-full max-w-[380px] flex-col gap-2" aria-label="Recipients">
        {share.recipients.map((recipient, i) => (
          <li
            key={recipient}
            className="share-rise flex items-center gap-3 rounded-full border border-primary-4 py-2 pr-3.5 pl-2"
            style={{ animationDelay: `${0.7 + i * 0.12}s` }}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-actionPrimary-1 text-body2 font-bold text-actionPrimary-8">
              {recipient.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-body2 font-semibold text-primary-13">{recipient}</span>
            <span className="text-body3 font-semibold text-success-8">Delivered</span>
          </li>
        ))}
      </ul>

      <div
        className="share-rise flex w-full max-w-[380px] items-center gap-3 rounded-xl bg-neutral-2 p-2.5 text-left"
        style={{ animationDelay: '1s' }}
      >
        <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-neutral-3">
          {pkg.heroImageUrl ? <img src={pkg.heroImageUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="flex min-w-0 flex-col">
          <Span textStyle="body2" bold palette="primary" shade="13" className="truncate">{tripTitle(pkg)}</Span>
          <Span textStyle="body3" palette="primary" shade="10">{details}</Span>
          <Span textStyle="body3" palette="actionPrimary" shade="8" className="mt-0.5">They’ll always see your latest plan</Span>
        </div>
      </div>

      <button
        type="button"
        className="share-rise rounded-full px-3 py-1 text-body2 font-semibold text-actionPrimary-8 hover:underline focus-visible:outline-2 focus-visible:outline-actionPrimary-8"
        style={{ animationDelay: '1.1s' }}
        onClick={share.reset}
      >
        Send to someone else
      </button>
    </div>
  )
}

function RecipientsField({ share, ref }: Readonly<{ share: ShareTripState; ref?: Ref<HTMLElement> }>) {
  return (
    <section ref={ref} className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border border-primary-4 bg-neutral-1 p-4">
      <div className="flex flex-col gap-1">
        <Heading as="h3" textStyle="heading5" palette="primary" shade="13">Who’s coming along?</Heading>
        <Span textStyle="body2" palette="primary" shade="10">Add one or more emails. Press Enter or comma to add each one.</Span>
      </div>
      <form
        className="flex items-start gap-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          share.addRecipients()
        }}
      >
        <InputText
          className="min-w-0 flex-1"
          type="email"
          inputMode="email"
          autoComplete="off"
          label="Email address"
          isLabelHidden
          placeholder="friend@example.com"
          iconLeft="mail"
          value={share.email}
          errorMessage={share.error || undefined}
          hasExternalError={Boolean(share.error)}
          onChange={(event) => share.updateEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === ',' || event.key === ';') {
              event.preventDefault()
              share.addRecipients()
            }
          }}
        />
        <Button type="secondary" size="lg" buttonType="submit" iconLeft="add">Add</Button>
      </form>
      {share.recipients.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Recipients">
          {share.recipients.map((recipient) => (
            <li key={recipient}>
              <InputChip label={recipient} iconLeft="person" onCloseButtonClick={() => share.removeRecipient(recipient)} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-1.5">
        <CdnIcon iconName="lock" size="16" palette="primary" shade="8" />
        <Span textStyle="body3" palette="primary" shade="8">Emails stay on this screen and are never saved.</Span>
      </div>
    </section>
  )
}

function EmailPreview({ pkg, share }: Readonly<{ pkg: NormalizedPackage; share: ShareTripState }>) {
  return (
    <article className="overflow-hidden rounded-2xl border border-primary-4 bg-neutral-1 shadow-md">
      <dl className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-b border-primary-4 bg-neutral-2 px-5 py-4">
        <dt><Span textStyle="body3" palette="primary" shade="8">From</Span></dt>
        <dd><Span textStyle="body3" palette="primary" shade="13">Priceline Trips</Span></dd>
        <dt><Span textStyle="body3" palette="primary" shade="8">To</Span></dt>
        <dd className="truncate">
          <Span textStyle="body3" palette="primary" shade="13">
            {share.recipients.length > 0 ? share.recipients.join(', ') : 'Your friends'}
          </Span>
        </dd>
        <dt><Span textStyle="body3" palette="primary" shade="8">Subject</Span></dt>
        <dd><Span textStyle="body2" bold palette="primary" shade="13">{share.subject}</Span></dd>
      </dl>

      <div className="relative h-44 bg-neutral-3">
        {pkg.heroImageUrl ? <img src={pkg.heroImageUrl} alt="" className="h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-linear-to-t from-primary-13/85 via-primary-13/30 to-transparent" />
        <div className="absolute inset-x-5 bottom-4 flex flex-col gap-1">
          <Span textStyle="label" bold className="text-neutral-1 uppercase tracking-wide">A trip worth sharing</Span>
          <Heading as="h4" textStyle="heading3" className="text-neutral-1">{tripTitle(pkg)}</Heading>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 py-6">
        <div className="flex flex-col gap-1">
          <Span textStyle="body1" palette="primary" shade="13">Hi!</Span>
          <Span textStyle="body1" palette="primary" shade="10">{share.greeting}</Span>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl bg-primary-2 p-4 sm:grid-cols-4">
          <TripFact icon="date_range" label="Dates" value={`${shortDate(pkg.departDate)} – ${shortDate(pkg.returnDate)}`} />
          <TripFact icon="hotel" label="Stay" value={`${pkg.nights} nights`} />
          <TripFact icon="group" label="Travelers" value={travelersLabel(pkg.travelers)} />
          <TripFact icon="paid" label="Trip total" value={`${pkg.currencySymbol}${formatAmount(pkg.bundleTotal)}`} />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-primary-2/70 p-4">
          <Heading as="h4" textStyle="heading5" palette="primary" shade="13">Day by Day Plan</Heading>
          <ol className="flex flex-col gap-2">
            {share.days.map((day) => (
              <PreviewDay key={day.day} day={day} />
            ))}
          </ol>
        </div>

        <a
          href={share.tripLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-actionPrimary-8 px-5 py-3 text-action1 font-semibold text-neutral-1 no-underline hover:bg-actionPrimary-9"
        >
          View this trip
          <CdnIcon iconName="open_in_new" size="20" />
        </a>

        <div className="flex items-center justify-center gap-1.5 text-center">
          <CdnIcon iconName="info" size="16" palette="primary" shade="8" />
          <Span textStyle="body3" palette="primary" shade="8">
            Suggested activities are ideas only and are not included in the package price.
          </Span>
        </div>
      </div>
    </article>
  )
}

function PreviewDay({ day }: Readonly<{ day: ItineraryDay }>) {
  const highlights = day.items.slice(0, 3).map((item) => item.title).join(' · ')
  return (
    <li className="flex items-start gap-3 rounded-xl bg-neutral-1 px-3 py-2.5 shadow-sm">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-actionPrimary-8 text-body3 font-semibold text-neutral-1">
        {day.day}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Span textStyle="body2" bold palette="primary" shade="13">{day.title}</Span>
        {highlights ? <Span textStyle="body3" palette="primary" shade="10">{highlights}</Span> : null}
      </div>
    </li>
  )
}

function TripFact({ icon, label, value }: Readonly<{ icon: ValidGoogleSymbol; label: string; value: string }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <CdnIcon iconName={icon} size="20" palette="actionPrimary" shade="8" />
      <Span textStyle="body3" palette="primary" shade="10">{label}</Span>
      <Span textStyle="body2" bold palette="primary" shade="13">{value}</Span>
    </div>
  )
}
