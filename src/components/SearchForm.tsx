import { useState } from 'react'
import { DESTINATIONS, ORIGINS } from '../lib/destinations'
import type { SearchParams } from '../hooks/usePackages'
import { clearPackageCache } from '../hooks/usePackages'

interface SearchFormProps {
  defaultParams: SearchParams
  onSearch: (params: SearchParams) => void
}

const selectStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontFamily: "'Montserrat', Arial, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  outline: 'none',
  padding: 0,
  // Force white text for option elements (browser override via CSS class)
}

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontFamily: "'Montserrat', Arial, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none',
  padding: 0,
  width: 96,
  colorScheme: 'dark',
}

const pillStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  padding: '8px 14px',
}

export function SearchForm({ defaultParams, onSearch }: SearchFormProps) {
  const [originCode, setOriginCode] = useState(defaultParams.originAirport)
  const [destCode, setDestCode] = useState(defaultParams.destinationAirport)
  const [departDate, setDepartDate] = useState(defaultParams.departDate)
  const [returnDate, setReturnDate] = useState(defaultParams.returnDate)
  const [travelers, setTravelers] = useState(defaultParams.travelers)

  const today = new Date().toISOString().slice(0, 10)

  function handleSearch() {
    const origin = ORIGINS.find(o => o.airportCode === originCode) ?? ORIGINS[0]
    const dest = DESTINATIONS.find(d => d.airportCode === destCode) ?? DESTINATIONS[0]

    const params: SearchParams = {
      originAirport: origin.airportCode,
      originMetroCode: origin.metroCode,
      destinationAirport: dest.airportCode,
      destinationCityId: dest.cityId,
      destinationCityName: dest.cityName,
      departDate,
      returnDate,
      travelers,
    }

    clearPackageCache(params)
    onSearch(params)
  }

  function handleDepartChange(val: string) {
    setDepartDate(val)
    // Ensure return date is never before depart date
    if (returnDate < val) setReturnDate(val)
  }

  return (
    <>
      <style>{`
        .pkg-search-select option { background: #003c8a; color: #fff; }
        .pkg-search-select::-ms-expand { display: none; }
      `}</style>

      {/* Origin */}
      <div style={pillStyle}>
        <span style={{ fontSize: 14 }}>🛫</span>
        <select
          className="pkg-search-select"
          style={selectStyle}
          value={originCode}
          onChange={e => setOriginCode(e.target.value)}
          aria-label="Origin airport"
        >
          {ORIGINS.map(o => (
            <option key={o.airportCode} value={o.airportCode}>{o.label}</option>
          ))}
        </select>
      </div>

      <span style={{ color: '#b3d4ff', fontWeight: 700, fontSize: 16 }}>→</span>

      {/* Destination */}
      <div style={pillStyle}>
        <span style={{ fontSize: 14 }}>🌴</span>
        <select
          className="pkg-search-select"
          style={selectStyle}
          value={destCode}
          onChange={e => setDestCode(e.target.value)}
          aria-label="Destination"
        >
          {DESTINATIONS.map(d => (
            <option key={`${d.airportCode}-${d.cityId}`} value={d.airportCode}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div style={pillStyle}>
        <span style={{ fontSize: 13 }}>📅</span>
        <input
          type="date"
          style={inputStyle}
          value={departDate}
          min={today}
          onChange={e => handleDepartChange(e.target.value)}
          aria-label="Departure date"
        />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>–</span>
        <input
          type="date"
          style={inputStyle}
          value={returnDate}
          min={departDate || today}
          onChange={e => setReturnDate(e.target.value)}
          aria-label="Return date"
        />
      </div>

      {/* Travelers stepper */}
      <div style={pillStyle}>
        <span style={{ fontSize: 13 }}>👤</span>
        <button
          onClick={() => setTravelers(t => Math.max(1, t - 1))}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
          aria-label="Decrease travelers"
        >−</button>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{travelers}</span>
        <button
          onClick={() => setTravelers(t => Math.min(8, t + 1))}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
          aria-label="Increase travelers"
        >+</button>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 2 }}>traveler{travelers !== 1 ? 's' : ''}</span>
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        style={{
          background: '#0068ef',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontFamily: "'Montserrat', Arial, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          padding: '9px 20px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Search
      </button>
    </>
  )
}
