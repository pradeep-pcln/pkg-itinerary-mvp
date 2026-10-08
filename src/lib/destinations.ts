export interface Destination {
  label: string
  airportCode: string
  cityId: string
  cityName: string
}

export interface Origin {
  label: string
  airportCode: string
  metroCode: string
}

export const DESTINATIONS: Destination[] = [
  // — European cities —
  { label: 'Cancun, Mexico',          airportCode: 'CUN', cityId: '3000061781', cityName: 'Cancun, Mexico' },
  { label: 'Paris, France',           airportCode: 'CDG', cityId: '3000035827', cityName: 'Paris, France' },
  { label: 'London, United Kingdom',  airportCode: 'LHR', cityId: '3000035825', cityName: 'London, United Kingdom' },
  { label: 'Madrid, Spain',           airportCode: 'MAD', cityId: '3000035834', cityName: 'Madrid, Spain' },
  { label: 'Florence, Italy',         airportCode: 'FLR', cityId: '3000035879', cityName: 'Florence, Italy' },
  { label: 'Milan, Italy',            airportCode: 'MXP', cityId: '3000035829', cityName: 'Milan, Italy' },
  // — US domestic cities —
  { label: 'New York, NY',            airportCode: 'JFK', cityId: '3000016152', cityName: 'New York' },
  { label: 'Las Vegas, NV',           airportCode: 'LAS', cityId: '3000015284', cityName: 'Las Vegas' },
  { label: 'Orlando, FL',             airportCode: 'MCO', cityId: '3000003349', cityName: 'Orlando' },
  { label: 'Chicago, IL',             airportCode: 'ORD', cityId: '3000005381', cityName: 'Chicago' },
  { label: 'San Francisco, CA',       airportCode: 'SFO', cityId: '3000002244', cityName: 'San Francisco' },
  { label: 'Los Angeles, CA',         airportCode: 'LAX', cityId: '3000001947', cityName: 'Los Angeles' },
  { label: 'Washington, DC',          airportCode: 'DCA', cityId: '3000003032', cityName: 'Washington, DC' },
  { label: 'Atlanta, GA',             airportCode: 'ATL', cityId: '3000003496', cityName: 'Atlanta' },
  { label: 'Dallas–Fort Worth, TX',   airportCode: 'DFW', cityId: '3000021082', cityName: 'Dallas–Fort Worth' },
  { label: 'San Diego, CA',           airportCode: 'SAN', cityId: '3000002241', cityName: 'San Diego' },
  { label: 'San Antonio, TX',         airportCode: 'SAT', cityId: '3000021763', cityName: 'San Antonio' },
  { label: 'Seattle, WA',             airportCode: 'SEA', cityId: '3000023414', cityName: 'Seattle' },
  { label: 'Phoenix, AZ',             airportCode: 'PHX', cityId: '3000001349', cityName: 'Phoenix' },
  { label: 'Denver, CO',              airportCode: 'DEN', cityId: '3000002573', cityName: 'Denver' },
  { label: 'Minneapolis, MN',         airportCode: 'MSP', cityId: '3000010974', cityName: 'Minneapolis' },
  { label: 'Houston, TX',             airportCode: 'IAH', cityId: '3000021312', cityName: 'Houston' },
  { label: 'St. Louis, MO',           airportCode: 'STL', cityId: '3000011975', cityName: 'St. Louis' },
  { label: 'Boston, MA',              airportCode: 'BOS', cityId: '3000008602', cityName: 'Boston' },
  { label: 'Philadelphia, PA',        airportCode: 'PHL', cityId: '3000019204', cityName: 'Philadelphia' },
  { label: 'Miami, FL',               airportCode: 'MIA', cityId: '3000003311', cityName: 'Miami' },
]

export const ORIGINS: Origin[] = [
  { label: 'New York (EWR)',      airportCode: 'EWR', metroCode: 'NYC' },
  { label: 'New York (JFK)',      airportCode: 'JFK', metroCode: 'NYC' },
  { label: 'San Francisco (SFO)', airportCode: 'SFO', metroCode: 'SFO' },
  { label: 'Los Angeles (LAX)',   airportCode: 'LAX', metroCode: 'LAX' },
]