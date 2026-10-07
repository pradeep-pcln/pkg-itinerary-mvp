import { Heading, Skeleton, Span } from '@pcln/horizon'
import type { ActivityImageResult, AiDay } from '../../lib/itinerary'

interface AttractionsSummaryProps {
  aiDays: AiDay[] | null
  activityImages: ReadonlyMap<string, ActivityImageResult>
  aiLoading: boolean
}

function DayHighlightCard({ title, imageUrl }: { title: string; imageUrl: string }) {
  return (
    <div className="flex w-40 flex-none flex-col gap-2 sm:w-48">
      <img
        src={imageUrl}
        alt={title}
        className="aspect-[4/3] w-full rounded-xl object-cover"
      />
      <Span textStyle="body2" palette="primary" shade="13" className="line-clamp-2">{title}</Span>
    </div>
  )
}

function DayHighlightRow({ day }: { day: AiDay & { imageCards: { title: string; imageUrl: string }[] } }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Span textStyle="body2" bold palette="actionPrimary" shade="8">Day {day.day}</Span>
        <Heading as="h4" textStyle="heading6" palette="primary" shade="13">{day.title}</Heading>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {day.imageCards.map((card) => (
          <DayHighlightCard key={card.title} title={card.title} imageUrl={card.imageUrl} />
        ))}
      </div>
    </div>
  )
}

const SKELETON_CARDS = [0, 1, 2] as const

function AttractionsSummarySkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6" aria-busy="true" aria-label="Loading trip highlights">
      <Skeleton type="h4" className="w-40" />
      {SKELETON_CARDS.map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton type="label" className="w-24" />
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {SKELETON_CARDS.map((j) => (
              <div key={j} className="w-40 flex-none sm:w-48">
                <Skeleton type="image" className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton type="body2" className="mt-2 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AttractionsSummary({ aiDays, activityImages, aiLoading }: Readonly<AttractionsSummaryProps>) {
  if (aiLoading) {
    return <AttractionsSummarySkeleton />
  }

  if (!aiDays || aiDays.length === 0) return null

  // Build day rows that have at least one activity with an image
  const daysWithImages = aiDays.flatMap((day) => {
    const imageCards = day.items.flatMap((item) => {
      const result = activityImages.get(item.title)
      return result?.imageUrl ? [{ title: item.title, imageUrl: result.imageUrl }] : []
    })
    return imageCards.length > 0 ? [{ ...day, imageCards }] : []
  })

  if (daysWithImages.length === 0) return null

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <Heading as="h3" textStyle="heading4" palette="primary" shade="13">Trip Highlights</Heading>
      {daysWithImages.map((day) => (
        <DayHighlightRow key={day.day} day={day} />
      ))}
    </div>
  )
}
