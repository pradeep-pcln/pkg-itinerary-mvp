import { Button, CdnIcon, Heading, IconButton, InputChip, InputText, Span } from '@pcln/horizon'
import type { ValidGoogleSymbol } from '@pcln/horizon'
import { useEffect, useRef, useState } from 'react'
import {
  cityName,
  formatAmount,
  itineraryDaysForShare,
  shareTripText,
  shareUrl,
  shortDate,
  travelersLabel,
  tripTitle,
} from '../../lib/itinerary'
import type { ActivityImageResult, AiDay, ItineraryDay } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_SEPARATORS = /[,\s;]+/

// Recipients live only in this hook's state: never logged, cached, or sent to the server.
export function useShareTrip(pkg: NormalizedPackage, aiDays: AiDay[] | null, activityImages: ReadonlyMap<string, ActivityImageResult>) {
  const [email, setEmail] = useState('')
  const [recipients, setRecipients] = useState<string[]>([])
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const days = itineraryDaysForShare(pkg, aiDays, activityImages)
  const destination = cityName(pkg.destination)
  const subject = `${destination} together? Here’s the plan`
  const pageHref = window.location.href
  const tripLink = shareUrl(pkg, pageHref)

  function reset() {
    setEmail('')
    setRecipients([])
    setError('')
    setSent(false)
    setCopied(false)
  }

  function updateEmail(value: string) {
    setEmail(value)
    if (error) setError('')
  }

  function addRecipients(): string[] | null {
    const candidates = email.split(EMAIL_SEPARATORS).map((value) => value.trim().toLowerCase()).filter(Boolean)
    if (candidates.length === 0) {
      setError('Enter an email address')
      return null
    }
    const invalid = candidates.find((candidate) => !EMAIL_PATTERN.test(candidate))
    if (invalid) {
      setError(`“${invalid}” doesn’t look like an email`)
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
      setError('Add at least one email address')
      return
    }
    setSent(true)
  }

  async function copyEmail() {
    const body = [
      `Subject: ${subject}`,
      '',
      'Hi!',
      `I found this ${destination} trip and wanted to share the plan with you.`,
      '',
      shareTripText(pkg, days, pageHref),
      '',
      'Suggested activities are ideas only and are not included in the package price.',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return {
    email, recipients, error, sent, copied, days, destination, subject, tripLink,
    reset, updateEmail, addRecipients, removeRecipient, send, copyEmail,
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
          {sent ? 'Here’s what your friends will see' : 'Plan it together with friends and family'}
        </Span>
      </div>
    </div>
  )
}

export function ShareTripFooter({ share, onBack }: Readonly<{ share: ShareTripState; onBack: () => void }>) {
  return (
    <div className="flex flex-col gap-2 border-t border-primary-4 bg-neutral-1 px-4 py-4 sm:flex-row sm:justify-end lg:px-6">
      {share.sent ? (
        <>
          <Button
            type="secondary"
            size="lg"
            buttonType="button"
            className="w-full sm:w-auto"
            iconLeft={share.copied ? 'check' : 'content_copy'}
            onClick={() => { void share.copyEmail() }}
          >
            {share.copied ? 'Copied' : 'Copy email'}
          </Button>
          <Button type="primary" size="lg" buttonType="button" className="w-full sm:w-auto" onClick={onBack}>
            Back to itinerary
          </Button>
        </>
      ) : (
        <>
          <Button type="secondary" size="lg" buttonType="button" className="w-full sm:w-auto" onClick={onBack}>
            Cancel
          </Button>
          <Button type="primary" size="lg" buttonType="button" className="w-full sm:w-auto" iconLeft="email" onClick={share.send}>
            {share.recipients.length > 1 ? `Send email to ${share.recipients.length}` : 'Send email'}
          </Button>
        </>
      )}
      <span className="sr-only" aria-live="polite">{share.copied ? 'Email copied' : ''}</span>
    </div>
  )
}

export function ShareTripBody({ pkg, share }: Readonly<{ pkg: NormalizedPackage; share: ShareTripState }>) {
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [share.sent])

  return (
    <div ref={topRef} className="flex flex-col gap-6 px-4 pt-2 pb-8 lg:px-6">
      {share.sent ? (
        <SentBanner recipients={share.recipients} />
      ) : (
        <RecipientsField share={share} />
      )}
      <section className="flex flex-col gap-3" aria-label="Email preview">
        <div className="flex items-center justify-between gap-2">
          <Heading as="h3" textStyle="heading5" palette="primary" shade="13">
            {share.sent ? 'The email' : 'Preview'}
          </Heading>
          <Span textStyle="body3" palette="primary" shade="8">Updates with your latest plan</Span>
        </div>
        <EmailPreview pkg={pkg} share={share} />
      </section>
    </div>
  )
}

function RecipientsField({ share }: Readonly<{ share: ShareTripState }>) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-primary-4 bg-neutral-1 p-4">
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
          errorText={share.error || undefined}
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

function SentBanner({ recipients }: Readonly<{ recipients: string[] }>) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-success-1 p-4">
      <CdnIcon iconName="check_circle" size="24" palette="success" shade="8" />
      <div className="flex min-w-0 flex-col gap-1">
        <Heading as="h3" textStyle="heading5" palette="primary" shade="13">
          Sent to {recipients.length === 1 ? '1 person' : `${recipients.length} people`}
        </Heading>
        <Span textStyle="body2" palette="primary" shade="10" className="break-words">{recipients.join(', ')}</Span>
      </div>
    </div>
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

      <div className="flex flex-col gap-6 px-5 py-6">
        <div className="flex flex-col gap-1">
          <Span textStyle="body1" palette="primary" shade="13">Hi!</Span>
          <Span textStyle="body1" palette="primary" shade="10">
            I found this {share.destination} trip and wanted to share the plan with you.
          </Span>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl bg-primary-2 p-4 sm:grid-cols-4">
          <TripFact icon="date_range" label="Dates" value={`${shortDate(pkg.departDate)} – ${shortDate(pkg.returnDate)}`} />
          <TripFact icon="hotel" label="Stay" value={`${pkg.nights} nights`} />
          <TripFact icon="group" label="Travelers" value={travelersLabel(pkg.travelers)} />
          <TripFact icon="paid" label="Trip total" value={`${pkg.currencySymbol}${formatAmount(pkg.bundleTotal)}`} />
        </div>

        <div className="flex flex-col gap-3">
          <Heading as="h4" textStyle="heading5" palette="primary" shade="13">Day by day</Heading>
          <ol className="flex flex-col">
            {share.days.map((day, i) => (
              <PreviewDay key={day.day} day={day} isLast={i === share.days.length - 1} />
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

        <Span textStyle="body3" palette="primary" shade="8" className="text-center">
          Suggested activities are ideas only and are not included in the package price.
        </Span>
      </div>
    </article>
  )
}

function PreviewDay({ day, isLast }: Readonly<{ day: ItineraryDay; isLast: boolean }>) {
  const highlights = day.items.slice(0, 3).map((item) => item.title).join(' · ')
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
      <div className="relative flex justify-center">
        <span className="z-1 flex size-9 items-center justify-center rounded-full bg-actionPrimary-1 text-body2 font-semibold text-actionPrimary-8">
          {day.day}
        </span>
        {isLast ? null : <span aria-hidden className="absolute top-10 bottom-1 w-0.5 rounded-full bg-primary-4" />}
      </div>
      <div className={`flex min-w-0 flex-col gap-0.5 pt-1.5 ${isLast ? '' : 'pb-4'}`}>
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
