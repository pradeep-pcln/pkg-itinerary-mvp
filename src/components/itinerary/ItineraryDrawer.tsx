import { A, Button, Drawer, Heading, Price, Span } from '@pcln/horizon'
import { useLayoutEffect, useRef, useState } from 'react'
import { useActivityImages } from '../../hooks/useActivityImages'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { forgetItineraryPlans, hasItineraryPlan, useItinerary } from '../../hooks/useItinerary'
import { bookUrl, cityName, formatAmount, travelersLabel, tripMeta, tripTitle } from '../../lib/itinerary'
import type { ShapeChoice, TripStyle } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { DayTabs } from './DayTabs'
import { DrawerHero } from './DrawerHero'
import { HotelSection } from './HotelSection'
import { IncludesExcludes } from './IncludesExcludes'
import { PriceBreakdown } from './PriceBreakdown'
import { ShareTripBody, ShareTripFooter, ShareTripHeader, useShareTrip } from './ShareTrip'
import { ShapeTrip } from './ShapeTrip'
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

interface SavedShape {
  choice: ShapeChoice
  nonce: number
  committedStyle: TripStyle | null
}

// Module scope so choices survive the drawer remounting; session-only like the plan cache
const savedShapes = new Map<string, SavedShape>()

// Search results can reorder between cached and fresh loads, so proposalIndex is not stable
function packageIdentity(pkg: NormalizedPackage): string {
  return [pkg.hotelItemKey || pkg.hotelName, pkg.destination, pkg.departDate, pkg.nights].join('|')
}

interface ItineraryDrawerProps {
  pkg: NormalizedPackage
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ItineraryDrawer({ pkg, open, onOpenChange }: Readonly<ItineraryDrawerProps>) {
  const isDesktop = useIsDesktop()
  const title = tripTitle(pkg)
  const packageKey = packageIdentity(pkg)
  const totalDays = Math.max(pkg.nights, 0) + 1
  const [, setShapesVersion] = useState(0)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const savedShape = savedShapes.get(packageKey)
  const shape = savedShape?.choice ?? null
  const planNonce = savedShape?.nonce ?? 0
  const editing = editingKey === packageKey
  const showingPlan = Boolean(shape) && !editing
  const effectiveShape = showingPlan
    ? shape
    : totalDays <= 2
      ? { style: 'Balanced', days: [] } satisfies ShapeChoice
      : null
  const { aiDays, loading: aiLoading, regeneratingDay, regenError, regenerateDay } = useItinerary(open ? pkg : null, effectiveShape, planNonce)
  const hasPlannedDays = savedShape
    ? savedShape.choice.days.length > 0 || hasItineraryPlan(pkg, savedShape.choice, savedShape.nonce)
    : false
  const activityImages = useActivityImages(aiDays, cityName(pkg.destination))

  function saveShape(next: SavedShape | null) {
    if (next) savedShapes.set(packageKey, next)
    else savedShapes.delete(packageKey)
    setShapesVersion((version) => version + 1)
  }

  const share = useShareTrip(pkg, aiDays, activityImages)
  const [sharing, setSharing] = useState(false)
  const daysRef = useRef<HTMLDivElement>(null)
  const pendingDayScroll = useRef(false)

  function closeShare() {
    setSharing(false)
    share.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      closeShare()
      setEditingKey(null)
      // Reopening lands on the plan only once at least one day has been planned
      if (!hasPlannedDays) saveShape(null)
    }
    onOpenChange(nextOpen)
  }

  function handleCreate(choice: ShapeChoice) {
    setEditingKey(null)
    pendingDayScroll.current = true
    // A style is shown only after a plan is created for at least one day.
    // Viewing the itinerary with no days keeps the current plan and style.
    if (choice.days.length === 0) {
      if (savedShape?.committedStyle || hasPlannedDays) {
        setShapesVersion((version) => version + 1)
        return
      }
      saveShape({ choice, nonce: planNonce, committedStyle: null })
      return
    }
    forgetItineraryPlans(pkg)
    saveShape({ choice, nonce: planNonce + 1, committedStyle: choice.style })
  }

  function handleChangeStyle() {
    pendingDayScroll.current = true
    setEditingKey(packageKey)
  }

  useLayoutEffect(() => {
    if (!pendingDayScroll.current || (!effectiveShape && !editing)) return
    const node = daysRef.current
    if (!node) return
    pendingDayScroll.current = false
    let scroller = node.parentElement
    while (scroller) {
      const { overflowY } = getComputedStyle(scroller)
      if ((overflowY === 'auto' || overflowY === 'scroll') && scroller.scrollHeight > scroller.clientHeight + 1) break
      scroller = scroller.parentElement
    }
    if (!scroller) return
    const delta = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'auto' })
  }, [effectiveShape, editing])

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
        <div ref={daysRef} className="px-4 pb-8 lg:px-6">
          {effectiveShape ? (
            <DayTabs
              key={packageKey}
              pkg={pkg}
              aiDays={aiDays}
              aiLoading={aiLoading}
              plannedDays={effectiveShape.days}
              openDayCopy={totalDays > 2}
              tripStyle={totalDays > 2 ? (savedShape?.committedStyle ?? (hasPlannedDays ? shape?.style : undefined)) : undefined}
              onChangeStyle={totalDays > 2 ? handleChangeStyle : undefined}
              regeneratingDay={regeneratingDay}
              regenError={regenError}
              onRegenerate={regenerateDay}
              activityImages={activityImages}
            />
          ) : (
            <ShapeTrip
              key={`${packageKey}-${editing ? 'edit' : 'setup'}`}
              totalDays={totalDays}
              departDate={pkg.departDate}
              initial={editing && shape ? shape : undefined}
              onCreate={handleCreate}
            />
          )}
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
