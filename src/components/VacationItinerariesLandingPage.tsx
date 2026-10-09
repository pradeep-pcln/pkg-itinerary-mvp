import { useState } from 'react'
import { Button, Card, Counter, DatePicker, Heading, Label, Select, Span, Stage } from '@pcln/horizon'
import type { DateRange } from '@pcln/horizon'
import type { SearchParams } from '../hooks/usePackages'
import { clearPackageCache } from '../hooks/usePackages'
import { ORIGINS, DESTINATIONS } from '../lib/destinations'

interface Props {
  defaultParams: SearchParams
  onSearch: (params: SearchParams) => void
}

function dateToStr(d: Date): string {
  // Format as YYYY-MM-DD without timezone shift
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function strToDate(s: string): Date {
  // Parse as local noon to avoid timezone boundary issues
  return new Date(`${s}T12:00:00`)
}

export function VacationItinerariesLandingPage({ defaultParams, onSearch }: Props) {
  const [originAirport, setOriginAirport] = useState(defaultParams.originAirport)
  const [destinationAirport, setDestinationAirport] = useState(defaultParams.destinationAirport)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: strToDate(defaultParams.departDate),
    to: strToDate(defaultParams.returnDate),
  })
  const [travelers, setTravelers] = useState(defaultParams.travelers)

  function handleCalendarChange(dates: Date | Date[] | DateRange) {
    if (dates && typeof dates === 'object' && 'from' in dates) {
      setDateRange(dates as DateRange)
    }
  }

  function handleSearch() {
    const origin = ORIGINS.find(o => o.airportCode === originAirport) ?? ORIGINS[0]
    const dest = DESTINATIONS.find(d => d.airportCode === destinationAirport) ?? DESTINATIONS[2]
    clearPackageCache()
    onSearch({
      originAirport: origin.airportCode,
      originMetroCode: origin.metroCode,
      destinationAirport: dest.airportCode,
      destinationCityId: dest.cityId,
      destinationCityName: dest.cityName,
      departDate: dateRange.from ? dateToStr(dateRange.from) : defaultParams.departDate,
      returnDate: dateRange.to ? dateToStr(dateRange.to) : defaultParams.returnDate,
      travelers,
    })
  }

  return (
    <Stage
      palette="primary"
      emphasis="regular"
      media
      className="vi-hero-image"
      image={{
        src: 'https://fastly.picsum.photos/id/961/1400/900.jpg?hmac=iXPb7S5lkdO8uptL-2yHvzzS8idLH8yrmz3qJPGQKew',
        alt: 'Travel landscape',
      }}
      header={
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <Heading as="h1" palette="primary" shade="1">
            More Than a Trip. A Complete Experience.
          </Heading>
          <Span palette="primary" shade="3" textStyle="body1">
            From flights to unforgettable experiences, your entire journey comes together in one place.
          </Span>
        </div>
      }
      body={
        <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%', padding: '0 16px 32px' }}>
          <Card as="div">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 220 }}>
                <Select
                  placeholder="Select origin"
                  iconLeft="flight_takeoff"
                  value={originAirport}
                  onChange={setOriginAirport}
                  menuItems={ORIGINS.map(o => ({ label: o.label, value: o.airportCode }))}
                />
              </div>
              <div style={{ flex: '1.4 1 290px', minWidth: 290 }}>
                <Select
                  placeholder="Select destination"
                  iconLeft="flight_land"
                  value={destinationAirport}
                  onChange={setDestinationAirport}
                  menuItems={DESTINATIONS.map(d => ({ label: d.label, value: d.airportCode }))}
                />
              </div>
              <div style={{ flex: '1 1 290px', minWidth: 290 }}>
                <DatePicker
                  label="Departure – Return"
                  mode="range"
                  selected={dateRange}
                  handleCalendarChange={handleCalendarChange}
                />
              </div>
              <div>
                <Label>Travelers</Label>
                <Counter
                  label="Travelers"
                  value={travelers}
                  min={1}
                  max={8}
                  handleValueChange={setTravelers}
                />
              </div>
              <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                <Button type="primaryShop" size="lg" onClick={handleSearch}>
                  Search Itineraries
                </Button>
              </div>
            </div>
          </Card>
        </div>
      }
    />
  )
}
