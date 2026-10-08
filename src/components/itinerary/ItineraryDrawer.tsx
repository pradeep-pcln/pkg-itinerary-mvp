import { A, Button, Drawer, Heading, Price, Span } from '@pcln/horizon'
import { useState } from 'react'
import { useActivityImages } from '../../hooks/useActivityImages'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useItinerary } from '../../hooks/useItinerary'
import { bookUrl, cityName, formatAmount, travelersLabel, tripMeta, tripTitle } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { DayTabs } from './DayTabs'
import { DrawerHero } from './DrawerHero'
import { HotelSection } from './HotelSection'
import { IncludesExcludes } from './IncludesExcludes'
import { PriceBreakdown } from './PriceBreakdown'
import { ShareTripBody, ShareTripFooter, ShareTripHeader, useShareTrip } from './ShareTrip'
import { TransportSection } from './TransportSection'
import { TripSummary } from './TripSummary'

// Overlay and content must sit above the app's sticky search bar (z-index 100).
// Right-side drawers are pinned to size "sm" by Horizon, so the panel width is widened here.
// The body has no vertical padding so the grey lower section runs to the footer.
const DESKTOP_CLASS_NAMES = {
  overlaySlot: 'z-[200]',
  contentSlot: 'z-[200] top-5 w-[76vw] max-w-none min-[1180px]:w-[60vw] min-[1180px]:max-w-[1120px]',
  bodySlot: 'py-0',
}
const MOBILE_CLASS_NAMES = {
  overlaySlot: 'z-[200]',
  contentSlot: 'z-[200]',
  bodySlot: 'py-0',
}

function DrawerHeader({ pkg, title }: { pkg: NormalizedPackage; title: string }) {
  return (
    <div className="px-4 pt-4 pr-12 pb-3 lg:px-6">
      <Heading as="h2" textStyle="heading3" palette="primary" shade="13">{title}</Heading>
      <Span textStyle="body2" palette="primary" shade="10">{tripMeta(pkg)}</Span>
    </div>
  )
}

function DrawerFooter({ pkg, onShare }: { pkg: NormalizedPackage; onShare: () => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-primary-4 bg-neutral-1 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Price type="priceSale" textStyle="heading3" bold currencySymbol={pkg.currencySymbol} price={formatAmount(pkg.bundleTotal)} suffix=" total" />
          <Span textStyle="body2" palette="primary" shade="10" className="block">{travelersLabel(pkg.travelers)}</Span>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row-reverse sm:items-center">
          <A type="primaryShop" size="lg" className="w-full sm:w-auto" href={bookUrl(pkg)} target="_blank" rel="noopener noreferrer">Book This Trip</A>
          <Button type="secondary" size="lg" buttonType="button" className="w-full sm:w-auto" iconLeft="share" onClick={onShare}>
            Share trip
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ItineraryDrawerProps {
  pkg: NormalizedPackage
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ItineraryDrawer({ pkg, open, onOpenChange }: Readonly<ItineraryDrawerProps>) {
  const isDesktop = useIsDesktop()
  const title = tripTitle(pkg)
  const { aiDays, loading: aiLoading, regeneratingDay, regenError, regenerateDay } = useItinerary(open ? pkg : null)
  const activityImages = useActivityImages(aiDays, cityName(pkg.destination))
  const share = useShareTrip(pkg, aiDays, activityImages)
  const [sharing, setSharing] = useState(false)

  function closeShare() {
    setSharing(false)
    share.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) closeShare()
    onOpenChange(nextOpen)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction={isDesktop ? 'right' : 'bottom'}
      showDragHandle={!isDesktop}
      size="md"
      scroll="body"
      stickyFooter
      title={sharing ? 'Share this trip' : title}
      classNames={isDesktop ? DESKTOP_CLASS_NAMES : MOBILE_CLASS_NAMES}
      headingCustomNode={sharing ? <ShareTripHeader sent={share.sent} onBack={closeShare} /> : <DrawerHeader pkg={pkg} title={title} />}
      footer={sharing ? <ShareTripFooter share={share} onBack={closeShare} /> : <DrawerFooter pkg={pkg} onShare={() => setSharing(true)} />}
    >
      {sharing ? <ShareTripBody pkg={pkg} share={share} /> : null}
      <div className={sharing ? 'hidden' : 'flex flex-col'}>
        <div className="px-4 pt-4 pb-6 lg:px-6">
          <DrawerHero pkg={pkg} />
        </div>
        <div className="px-4 pb-8 lg:px-6">
          <DayTabs
            key={pkg.proposalIndex}
            pkg={pkg}
            aiDays={aiDays}
            aiLoading={aiLoading}
            regeneratingDay={regeneratingDay}
            regenError={regenError}
            onRegenerate={regenerateDay}
            activityImages={activityImages}
          />
        </div>
        <div className="flex flex-col gap-8 bg-neutral-2 px-4 py-8 lg:px-6">
          <HotelSection pkg={pkg} />
          <TransportSection pkg={pkg} />
          <IncludesExcludes pkg={pkg} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TripSummary pkg={pkg} />
            <PriceBreakdown pkg={pkg} />
          </div>
        </div>
      </div>
    </Drawer>
  )
}
