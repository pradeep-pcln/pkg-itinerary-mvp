import { A, Drawer, Heading, Price, Span } from '@pcln/horizon'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { bookUrl, formatAmount, travelersLabel, tripMeta, tripTitle } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { DayTabs } from './DayTabs'
import { DrawerHero } from './DrawerHero'
import { HotelSection } from './HotelSection'
import { IncludesExcludes } from './IncludesExcludes'
import { PriceBreakdown } from './PriceBreakdown'
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

function DrawerFooter({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-primary-4 bg-neutral-1 px-4 py-4 lg:px-6">
      <div>
        <Price type="priceSale" textStyle="heading3" bold currencySymbol={pkg.currencySymbol} price={formatAmount(pkg.bundleTotal)} suffix=" total" />
        <Span textStyle="body2" palette="primary" shade="10" className="block">{travelersLabel(pkg.travelers)}</Span>
      </div>
      <A type="primaryShop" size="lg" href={bookUrl(pkg)} target="_blank" rel="noopener noreferrer">Book This Trip</A>
    </div>
  )
}

interface ItineraryDrawerProps {
  pkg: NormalizedPackage
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ItineraryDrawer({ pkg, open, onOpenChange }: ItineraryDrawerProps) {
  const isDesktop = useIsDesktop()
  const title = tripTitle(pkg)

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? 'right' : 'bottom'}
      showDragHandle={!isDesktop}
      size="md"
      scroll="body"
      stickyFooter
      title={title}
      classNames={isDesktop ? DESKTOP_CLASS_NAMES : MOBILE_CLASS_NAMES}
      headingCustomNode={<DrawerHeader pkg={pkg} title={title} />}
      footer={<DrawerFooter pkg={pkg} />}
    >
      <div className="flex flex-col">
        <div className="px-4 pt-4 pb-6 lg:px-6">
          <DrawerHero pkg={pkg} />
        </div>
        <div className="px-4 pb-8 lg:px-6">
          <DayTabs key={pkg.proposalIndex} pkg={pkg} />
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
