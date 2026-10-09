import { useState } from 'react'
import { Button, Counter, DatePicker, Select } from '@pcln/horizon'
import type { DateRange } from '@pcln/horizon'
import { DESTINATIONS, ORIGINS } from '../lib/destinations'
import type { SearchParams } from '../hooks/usePackages'
import { clearPackageCache } from '../hooks/usePackages'

interface SearchFormProps {
  defaultParams: SearchParams
  onSearch: (params: SearchParams) => void
}

function dateToStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function strToDate(s: string): Date {
  return new Date(`${s}T12:00:00`)
}

export function SearchForm({ defaultParams, onSearch }: SearchFormProps) {
  const [originCode, setOriginCode] = useState(defaultParams.originAirport)
  const [destCode, setDestCode] = useState(defaultParams.destinationAirport)
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
    const origin = ORIGINS.find(o => o.airportCode === originCode) ?? ORIGINS[0]
    const dest = DESTINATIONS.find(d => d.airportCode === destCode) ?? DESTINATIONS[0]

    const params: SearchParams = {
      originAirport: origin.airportCode,
      originMetroCode: origin.metroCode,
      destinationAirport: dest.airportCode,
      destinationCityId: dest.cityId,
      destinationCityName: dest.cityName,
      departDate: dateRange.from ? dateToStr(dateRange.from) : defaultParams.departDate,
      returnDate: dateRange.to ? dateToStr(dateRange.to) : defaultParams.returnDate,
      travelers,
    }

    clearPackageCache(params)
    onSearch(params)
  }

  return (
    <>
      <div className="pkg-search-field">
        <Select
          iconLeft="flight_takeoff"
          value={originCode}
          onChange={setOriginCode}
          menuItems={ORIGINS.map(o => ({ label: o.label, value: o.airportCode }))}
        />
      </div>

      <div className="pkg-search-field pkg-search-field--dest">
        <Select
          iconLeft="flight_land"
          value={destCode}
          onChange={setDestCode}
          menuItems={DESTINATIONS.map(d => ({ label: d.label, value: d.airportCode }))}
        />
      </div>

      <div className="pkg-search-field--dates">
        <DatePicker
          label="Dates"
          mode="range"
          selected={dateRange}
          handleCalendarChange={handleCalendarChange}
        />
      </div>

      <div className="pkg-search-fixed">
        <Counter
          label="Travelers"
          value={travelers}
          min={1}
          max={8}
          handleValueChange={setTravelers}
        />
      </div>

      <div className="pkg-search-fixed">
        <Button type="primaryShop" size="lg" onClick={handleSearch}>
          Search
        </Button>
      </div>
    </>
  )
}
