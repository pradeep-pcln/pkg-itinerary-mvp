import express from 'express'
import https from 'https'
import http from 'http'
import grpc from '@grpc/grpc-js'
let HeaderInstaller = null
try {
  const mod = await import('@pcln/global-header-install')
  HeaderInstaller = mod.default
} catch {
  // package not installed — header endpoint returns empty strings
}
import protoLoader from '@grpc/proto-loader'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

const pclnCa = readFileSync(join(__dirname, 'certs', 'pcln-internal-ca.pem'))

const QAA_HOST = 'guse4-uspmidtiergw-qaa.dqs.pcln.com:443'
const UNIFIED_SEARCH_URL = 'https://guse4-uspmidtiergw-qaa.dqs.pcln.com/bundle/v1/unified-search'
const HTL_CONTENT_URL = 'https://guse4-htlmidtiergw-qaa.dqs.pcln.com/htl-content/content/with-deal-ids?responseOptions=ALL_AMENITIES,HOTEL_IMAGES,UHD_IMAGES&appid=RELAX&appc=MOBILEWEB&format=json'
const FLY_METAINFO_URL = 'http://guse4-flymidtiergw-qaa.dqs.pcln.com/flymetainfo/api/v1/metainfo/'
const RC_AVAILABILITY_BASE_URL = 'https://guse4-rcmidtiergw-qaa.dqs.pcln.com/rc/api/v0/availability'
function airlineLogoUrl(iataCode) {
  return `https://s1.pclncdn.com/design-assets/fly/carrier-logos/airLogo_${iataCode}.png`
}

// 55-min TTL — session keys expire at ~60 min
const SESSION_TTL_MS = 55 * 60 * 1000
const sessionCache = new Map()

function log(level, message, data) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...data })
  if (level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

// --- gRPC client for RequestCacheService ---
const PROTO_ROOT = join(__dirname, 'node_modules/@pcln/unified-schema/src/main/proto')
const pkgDef = protoLoader.loadSync(
  join(PROTO_ROOT, 'services/external/api/requestcache/v1/request_cache_api.proto'),
  { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [PROTO_ROOT] },
)
const proto = grpc.loadPackageDefinition(pkgDef)
const RequestCacheService = proto.services.external.api.requestcache.v1.RequestCacheService

const crcClient = new RequestCacheService(
  QAA_HOST,
  grpc.credentials.createSsl(pclnCa),
)

function grpcCreateRequestCache(request) {
  return new Promise((resolve, reject) => {
    crcClient.CreateRequestCache(request, (err, response) => {
      if (err) reject(err)
      else resolve(response)
    })
  })
}

// --- HTTPS POST helper (supports query strings in URL) ---
function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const data = JSON.stringify(body)
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 443,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        ca: pclnCa,
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(raw),
            json: () => Promise.resolve(JSON.parse(raw)),
          })
        })
      },
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// --- HTTP POST helper (for plain HTTP internal services like FlyMetaInfo) ---
function postHttp(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const data = JSON.stringify(body)
    const req = http.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 80,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(raw),
            json: () => Promise.resolve(JSON.parse(raw)),
          })
        })
      },
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// --- HTTPS GET helper (supports query strings in URL) ---
function get(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 443,
        method: 'GET',
        headers: { Accept: 'application/json' },
        ca: pclnCa,
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(raw),
            json: () => Promise.resolve(JSON.parse(raw)),
          })
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

function makeContext(rguid) {
  return {
    appc: 'DESKTOP', appv: 'node',
    rguid, cguid: '22222222-2222-2222-2222-222222222222',
    plf: 'PCLN', gpcd: 'PCLN', transId: rguid,
    ua: 'node',
    referral: { id: 'DIRECT', sourceId: 'DT' },
    visitId: rguid,
  }
}

// gRPC header — Duration must be an object { seconds }
function makeGrpcHeader(rguid) {
  return {
    context: makeContext(rguid),
    sla: { maxTimeout: { seconds: 20 } },
    pointOfSale: { countryCode: 'US', languageCode: 'EN', currencyCode: 'USD', locale: 'en-us' },
  }
}

// REST/JSON header — Duration is the string form "20s"
function makeRestHeader(rguid) {
  return {
    context: makeContext(rguid),
    sla: { maxTimeout: '20s' },
    pointOfSale: { countryCode: 'US', languageCode: 'EN', currencyCode: 'USD', locale: 'en-us' },
  }
}

async function createRequestCache({ originMetroCode, destinationCityId, departSeconds, returnSeconds, adults, rguid }) {
  const request = {
    header: makeGrpcHeader(rguid),
    body: {
      searchComponentRequest: {
        timestamp: { seconds: String(departSeconds) },
        clientType: 'PACKAGE_QL',
        requestTypeInfo: { requestType: 'BUNDLE_REQUEST' },
        componentRequest: [
          {
            type: 'FLY', key: 'FLY-1', index: 1,
            platformFlyRequest: {
              flyRequest: {
                flyQuery: {
                  passengers: Array.from({ length: adults }, (_, i) => ({ id: i + 1, type: 'ADULT' })),
                  tripQuery: {
                    id: 1,
                    itineraryTypes: ['FLY_RETAIL', 'FLY_FUSED'],
                    priority: 1,
                    slices: [
                      { id: 1, departDateTimes: [{ seconds: String(departSeconds) }] },
                      { id: 2, departDateTimes: [{ seconds: String(returnSeconds) }] },
                    ],
                    requestOption: {
                      cabinClass: { name: 'ECONOMY', type: 'PREFERRED_CABIN_CLASS' },
                      isUseFirefly: true,
                    },
                    sortOption: { sortOptionTypes: ['LOWEST_PRICE', 'UNIQUE_SLICE'] },
                  },
                },
                step: { reservedStep: 'SEARCH' },
              },
              flyBundleAttributes: {
                bundleLocation: {
                  origin: { area: { airport: { metroAreaCode: originMetroCode } } },
                  destination: { area: { city: { cityId: destinationCityId } } },
                },
              },
            },
          },
          {
            type: 'STAY', key: 'STAY-1', index: 2,
            platformStayRequest: {
              stayRequest: {
                stayQuery: {
                  roomInfo: { count: 1 },
                  staySearchRequestOption: { stayPagination: { pageSize: 30, offset: 1 } },
                },
                step: { reservedStep: 'SEARCH' },
              },
              stayBundleAttributes: {
                stayAssociation: {
                  location: { deriveFromComponentIndex: 1 },
                  checkIn: { deriveFromComponentIndex: 1 },
                  checkOut: { deriveFromComponentIndex: 1 },
                  occupants: { deriveFromComponentIndex: 1 },
                },
              },
            },
          },
        ],
      },
    },
  }

  const response = await grpcCreateRequestCache(request)
  const sessionKey = response?.body?.session?.key
  if (!sessionKey) throw new Error(`CRC missing sessionKey: ${JSON.stringify(response).slice(0, 300)}`)
  return sessionKey
}

async function createFlightPivotRequestCache({ originMetroCode, destinationCityId, departSeconds, returnSeconds, adults, rguid }) {
  const request = {
    header: makeGrpcHeader(rguid),
    body: {
      searchComponentRequest: {
        timestamp: { seconds: String(departSeconds) },
        clientType: 'PACKAGE_QL',
        requestTypeInfo: { requestType: 'BUNDLE_REQUEST' },
        componentRequest: [
          {
            isPivot: true,
            type: 'FLY', key: 'FLY-1', index: 1,
            platformFlyRequest: {
              flyRequest: {
                flyQuery: {
                  passengers: Array.from({ length: adults }, (_, i) => ({ id: i + 1, type: 'ADULT' })),
                  tripQuery: {
                    id: 1,
                    itineraryTypes: ['FLY_RETAIL', 'FLY_FUSED'],
                    priority: 1,
                    slices: [
                      { id: 1, departDateTimes: [{ seconds: String(departSeconds) }] },
                      { id: 2, departDateTimes: [{ seconds: String(returnSeconds) }] },
                    ],
                    requestOption: {
                      cabinClass: { name: 'ECONOMY', type: 'PREFERRED_CABIN_CLASS' },
                      isUseFirefly: true,
                    },
                    sortOption: { sortOptionTypes: ['LOWEST_PRICE', 'UNIQUE_SLICE'] },
                  },
                },
                step: { reservedStep: 'SEARCH' },
              },
              flyBundleAttributes: {
                bundleLocation: {
                  origin: { area: { airport: { metroAreaCode: originMetroCode } } },
                  destination: { area: { city: { cityId: destinationCityId } } },
                },
              },
            },
          },
          {
            type: 'STAY', key: 'STAY-1', index: 2,
            platformStayRequest: {
              stayRequest: {
                stayQuery: {
                  roomInfo: { count: 1 },
                  staySearchRequestOption: { stayPagination: { pageSize: 1, offset: 1 } },
                },
                step: { reservedStep: 'SEARCH' },
              },
              stayBundleAttributes: {
                stayAssociation: {
                  location: { deriveFromComponentIndex: 1 },
                  checkIn: { deriveFromComponentIndex: 1 },
                  checkOut: { deriveFromComponentIndex: 1 },
                  occupants: { deriveFromComponentIndex: 1 },
                },
              },
            },
          },
        ],
      },
    },
  }

  const response = await grpcCreateRequestCache(request)
  const sessionKey = response?.body?.session?.key
  if (!sessionKey) throw new Error(`FLY-pivot CRC missing sessionKey: ${JSON.stringify(response).slice(0, 300)}`)
  return sessionKey
}


async function unifiedSearchFlyPivot({ sessionKey, originAirport, destinationAirport, originMetroCode, destinationCityName, departSeconds, returnSeconds, adults, rguid }) {
  const body = {
    header: makeRestHeader(rguid),
    body: {
      componentRequests: [
        {
          isPivot: true,
          type: 'FLY', key: 'FLY-1', index: 2,
          platformFlyRequest: {
            flyRequest: {
              flyQuery: {
                passengers: Array.from({ length: adults }, (_, i) => ({ id: i + 1, type: 'ADULT' })),
                tripQuery: {
                  id: 1,
                  itineraryTypes: ['FLY_RETAIL', 'FLY_FUSED'],
                  priority: 1,
                  slices: [
                    { id: 1, departDateTimes: [{ seconds: String(departSeconds) }], origins: [{ airportCode: originAirport }], destinations: [{ airportCode: destinationAirport }] },
                    { id: 2, departDateTimes: [{ seconds: String(returnSeconds) }], origins: [{ airportCode: destinationAirport }], destinations: [{ airportCode: originAirport }] },
                  ],
                  requestOption: {
                    brandOptions: { brandFeatures: ['BRAND_ATTRIBUTES_CORE'] },
                    cabinClass: { name: 'ECONOMY', type: 'STRICT_INCLUDE_CABIN_CLASS' },
                    summary: { includeSliceSummary: true, includeFilteredTrip: true, includeFullTrip: true },
                    pagination: { lowerBound: 1, upperBound: 30 },
                  },
                  filterOption: {
                    itineraryFilter: {},
                    sliceFilter: [
                      { id: 1, stops: { max: 7 }, slice: {}, duration: { min: '0s', max: '0s' }, airlines: {}, airports: { origin: {}, destination: {} }, times: {} },
                      { id: 2, stops: { max: 7 }, slice: {}, duration: { min: '0s', max: '0s' }, airlines: {}, airports: { origin: {}, destination: {} }, times: {} },
                    ],
                  },
                  sortOption: { sortOptionTypes: ['UNIQUE_SLICE', 'LOWEST_PRICE'], sliceIdRef: 1 },
                },
              },
              step: { reservedStep: 'SEARCH' },
            },
            flyBundleAttributes: {
              bundleLocation: {
                origin: { area: { airport: { metroAreaCode: originMetroCode } } },
                destination: { area: { city: { cityName: destinationCityName } } },
              },
            },
          },
        },
      ],
      session: { key: sessionKey },
      requestType: 'BUNDLE_REQUEST',
    },
  }

  const resp = await post(UNIFIED_SEARCH_URL, body)
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`fly-pivot unified-search HTTP ${resp.status}: ${text.slice(0, 300)}`)
  }
  return resp.json()
}

async function getSessionKey({ cacheKey, originMetroCode, destinationCityId, departSeconds, returnSeconds, adults }) {
  const cached = sessionCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    log('info', 'session cache hit', { cacheKey, expiresIn: Math.round((cached.expiresAt - Date.now()) / 1000) + 's' })
    return cached.sessionKey
  }
  log('info', 'session cache miss — calling CRC via gRPC', { cacheKey })
  const sessionKey = await createRequestCache({
    originMetroCode, destinationCityId, departSeconds, returnSeconds, adults,
    rguid: `crc-${cacheKey}`,
  })
  sessionCache.set(cacheKey, { sessionKey, expiresAt: Date.now() + SESSION_TTL_MS })
  log('info', 'CRC complete', { sessionKey })
  return sessionKey
}

async function unifiedSearch({ sessionKey, originMetroCode, destinationCityId, departSeconds, returnSeconds, adults, rguid }) {
  const body = {
    header: makeRestHeader(rguid),
    body: {
      componentRequests: [
        {
          isPivot: true,
          type: 'STAY', key: 'STAY-1', index: 1,
          platformStayRequest: {
            stayRequest: {
              stayQuery: {
                occupants: Array.from({ length: adults }, (_, i) => ({ id: i + 1, type: 'ADULT' })),
                roomInfo: { count: 1 },
                location: { area: { city: { cityName: 'Cancun', cityId: destinationCityId } } },
                staySearchRequestOption: { stayPagination: { pageSize: 30, offset: 1 } },
              },
            },
          },
        },
        {
          type: 'FLY', key: 'FLY-1', index: 2,
          platformFlyRequest: {
            flyRequest: {
              flyQuery: {
                passengers: Array.from({ length: adults }, (_, i) => ({ id: i + 1, type: 'ADULT' })),
                tripQuery: {
                  id: 1,
                  itineraryTypes: ['FLY_RETAIL', 'FLY_FUSED'],
                  priority: 1,
                  slices: [
                    { id: 1, departDateTimes: [{ seconds: String(departSeconds) }], origins: [], destinations: [] },
                    { id: 2, departDateTimes: [{ seconds: String(returnSeconds) }], origins: [], destinations: [] },
                  ],
                  requestOption: {
                    cabinClass: { name: 'ECONOMY', type: 'PREFERRED_CABIN_CLASS' },
                    isUseFirefly: true,
                    carrierOptions: [],
                  },
                },
                packageRequest: {
                  origin: { area: { airport: { metroAreaCode: originMetroCode } } },
                  destination: { area: { city: { cityName: 'Cancun', cityId: destinationCityId } } },
                },
              },
              step: { reservedStep: 'SEARCH' },
            },
          },
        },
      ],
      session: { key: sessionKey },
      requestType: 'BUNDLE_REQUEST',
    },
  }

  const resp = await post(UNIFIED_SEARCH_URL, body)
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText)
    throw new Error(`unified-search HTTP ${resp.status}: ${text.slice(0, 300)}`)
  }
  return resp.json()
}

// --- Hotel content enrichment ---

function extractHotelId(stayItem) {
  // itemKey is base64-encoded; first segment before '_' is the numeric hotel ID
  // e.g. base64("1509805_20260815_...") → hotel ID "1509805"
  const itemKey = stayItem?.itemKey ?? ''
  try {
    const decoded = Buffer.from(itemKey, 'base64').toString('utf8')
    const hotelId = decoded.split('_')[0]
    if (hotelId && /^\d+$/.test(hotelId)) return hotelId
  } catch {}
  return null
}

const MAX_HOTEL_IMAGES = 8

function normalizeHotelImages(images) {
  const seen = new Set()
  const result = []
  for (const img of images) {
    const hdUrl = img?.imageHDUrl || img?.imageUrl || ''
    if (!hdUrl || seen.has(hdUrl)) continue
    seen.add(hdUrl)
    result.push({ url: img?.imageUrl || hdUrl, hdUrl, caption: img?.genAIMetadata?.caption ?? '' })
    if (result.length === MAX_HOTEL_IMAGES) break
  }
  return result
}

async function fetchHotelContent(hotelIds) {
  const uniqueIds = [...new Set(hotelIds.filter(Boolean))]
  if (!uniqueIds.length) return {}

  log('info', 'htl-content request', { count: uniqueIds.length })
  try {
    const resp = await post(HTL_CONTENT_URL, {
      deals: uniqueIds.map(id => ({ dealId: id })),
    })
    if (!resp.ok) {
      log('error', 'htl-content non-OK', { status: resp.status })
      return {}
    }
    const data = await resp.json()
    const hotels = data?.hotels ?? []
    log('info', 'htl-content complete', { returned: hotels.length })

    // Build map: hotelId → first MAX_HOTEL_IMAGES unique images
    const imageMap = {}
    for (const hotel of hotels) {
      const id = String(hotel.hotelId ?? '')
      if (!id) continue
      imageMap[id] = normalizeHotelImages(hotel.images ?? [])
    }
    return imageMap
  } catch (err) {
    log('error', 'htl-content fetch failed', { error: err.message })
    return {}
  }
}

async function fetchAirlineMetadata(carrierCodes) {
  const unique = [...new Set(carrierCodes.filter(Boolean))]
  if (!unique.length) return {}

  log('info', 'fly-metainfo request', { codes: unique })
  try {
    const resp = await postHttp(FLY_METAINFO_URL, { airline: unique })
    if (!resp.ok) {
      log('error', 'fly-metainfo non-OK', { status: resp.status })
      return {}
    }
    const data = await resp.json()
    const airlines = data?.airline ?? []
    log('info', 'fly-metainfo complete', { returned: airlines.length })

    // Build map: carrierCode → { name, logoUrl }
    const airlineMap = {}
    for (const a of airlines) {
      const code = a.code
      if (!code) continue
      airlineMap[code] = { name: a.name ?? code, logoUrl: airlineLogoUrl(code) }
    }
    return airlineMap
  } catch (err) {
    log('error', 'fly-metainfo fetch failed', { error: err.message })
    return {}
  }
}

// --- Normalization (server-side) ---

function mapLegs(segments) {
  return (segments ?? []).map((seg) => ({
    origin: seg?.originAirport?.airportCode ?? '',
    destination: seg?.destinationAirport?.airportCode ?? '',
    carrier: seg?.marketingAirlineCode ?? '',
    departTime: seg?.departDateTime?.seconds ?? '',
    arriveTime: seg?.arrivalDateTime?.seconds ?? '',
  }))
}

function normalizeProposal(proposal, stayItemsMap, flyItem, index, imageMap, airlineMap, searchParams) {
  const stayRef = proposal?.componentReferences?.find((r) => r.type === 'STAY')
  const flyRef = proposal?.componentReferences?.find((r) => r.type === 'FLY')
  const stayItemKey = stayRef?.itemPriceKeyReference?.itemKey ?? stayRef?.itemKey
  const flyItemKey = flyRef?.itemPriceKeyReference?.itemKey ?? flyRef?.itemKey
  const stayItem = stayItemsMap[stayItemKey] ?? {}

  const priceOption = stayItem?.roomPriceContainers?.[0]?.standalonePriceOption ?? {}
  const fees = priceOption?.price?.priceSummary?.taxesFees?.fees ?? []
  const resortFee = fees.find((f) => f.code === 'Postpaid Mandatory Fees')?.amount ?? 0

  const outboundLegs = mapLegs(flyItem?.slices?.[0]?.segments)
  const returnLegs = mapLegs(flyItem?.slices?.[1]?.segments)

  const depart = new Date(searchParams.departDate)
  const ret = new Date(searchParams.returnDate)
  const nights = Math.round((ret.getTime() - depart.getTime()) / 86400000)

  const hotelId = extractHotelId(stayItem)
  const hotelImages = (hotelId && imageMap[hotelId]) ? imageMap[hotelId] : []
  const heroImageUrl = hotelImages[0]?.hdUrl ?? ''

  return {
    proposalIndex: index,
    hotelItemKey: stayItemKey ?? '',
    hotelPriceKey: stayRef?.itemPriceKeyReference?.priceKey ?? '',
    flyItemKey: flyItemKey ?? '',
    flyPriceKey: flyRef?.itemPriceKeyReference?.priceKey ?? '',
    hotelName: stayItem?.itemContent?.propertyName ?? `Hotel ${index + 1}`,
    starRating: stayItem?.itemContent?.starRating ?? 0,
    guestRating: stayItem?.itemContent?.guestRating ?? 0,
    thumbnailUrl: stayItem?.itemContent?.thumbnailUrl ?? '',
    heroImageUrl,
    hotelImages,
    nightlyRate: priceOption?.displayPrice?.nightlyRate?.averageRate?.charge?.amount ?? 0,
    nightlyStrikethrough: priceOption?.displayPrice?.nightlyRate?.strikeThroughRate?.charge?.amount ?? 0,
    dealName: priceOption?.priceDeal?.dealProgramName ?? '',
    savingsPct: priceOption?.priceDeal?.savingsPercentage ?? 0,
    freeCancellation: stayItem?.stayRateSummary?.isFreeCancelableAvailable ?? false,
    allInclusive: stayItem?.stayRequestOption?.isAllInclusive ?? false,
    resortFee,
    airline: airlineMap[outboundLegs[0]?.carrier]?.name ?? outboundLegs[0]?.carrier ?? '',
    airlineLogoUrl: outboundLegs[0]?.carrier ? airlineLogoUrl(outboundLegs[0].carrier) : '',
    outboundLegs,
    returnLegs,
    bundleTotal: proposal?.price?.payment?.total?.charge?.amount ?? 0,
    bundleStrikethrough: proposal?.price?.strikeThrough?.charge?.amount ?? 0,
    currencySymbol: '$',
    origin: searchParams.originAirport,
    destination: searchParams.destinationAirport,
    departDate: searchParams.departDate,
    returnDate: searchParams.returnDate,
    travelers: searchParams.travelers,
    nights,
  }
}

function normalizeFlyItem(flyItem, airlineMap) {
  const outboundLegs = mapLegs(flyItem?.slices?.[0]?.segments)
  const returnLegs = mapLegs(flyItem?.slices?.[1]?.segments)
  const carrierCode = outboundLegs[0]?.carrier ?? ''
  const retCarrierCode = returnLegs[0]?.carrier ?? ''
  return {
    itemKey: flyItem.itemKey,
    carrierCode,
    airline: airlineMap[carrierCode]?.name ?? carrierCode,
    airlineLogoUrl: carrierCode ? airlineLogoUrl(carrierCode) : '',
    retCarrierCode,
    retAirline: airlineMap[retCarrierCode]?.name ?? retCarrierCode,
    retAirlineLogoUrl: retCarrierCode ? airlineLogoUrl(retCarrierCode) : '',
    outboundLegs,
    returnLegs,
    isNonstopOut: outboundLegs.length === 1,
    isNonstopRet: returnLegs.length === 1,
  }
}

function normalizeSearchResult(json, imageMap, airlineMap, searchParams) {
  const stayItems = json?.body?.componentResponses?.[0]?.stayResponse?.stayItems ?? []
  const flyItems = json?.body?.componentResponses?.[1]?.flyResponse?.flyItems ?? []
  const proposals = json?.body?.proposals ?? []

  const stayItemsMap = Object.fromEntries(stayItems.map((item) => [item.itemKey, item]))
  const flyItemsMap = Object.fromEntries(flyItems.map((item) => [item.itemKey, item]))

  const packages = proposals.map((p, i) => {
    const flyRef = p?.componentReferences?.find((r) => r.type === 'FLY')
    const flyItemKey = flyRef?.itemPriceKeyReference?.itemKey ?? flyRef?.itemKey
    const flyItem = flyItemsMap[flyItemKey] ?? flyItems[0]
    return normalizeProposal(p, stayItemsMap, flyItem, i, imageMap, airlineMap, searchParams)
  })

  const normalizedFlyItems = flyItems.map((f) => normalizeFlyItem(f, airlineMap))

  return { packages, flyItems: normalizedFlyItems }
}

// ---

function toMidnightUtcSeconds(dateStr) {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000)
}

async function fetchPackages({ originAirport, originMetroCode, destinationAirport, destinationCityId, departDate, returnDate, travelers = 2 }) {
  const departSeconds = toMidnightUtcSeconds(departDate)
  const returnSeconds = toMidnightUtcSeconds(returnDate)
  const metroCode = originMetroCode || 'NYC'
  const cityId = destinationCityId || '3000061781'
  const cacheKey = `${metroCode}|${cityId}|${departSeconds}|${returnSeconds}|${travelers}`
  const rguid = `vibe-${originAirport}-${destinationAirport}-${departDate}-${returnDate}`

  const sessionKey = await getSessionKey({
    cacheKey, originMetroCode: metroCode, destinationCityId: cityId,
    departSeconds, returnSeconds, adults: travelers,
  })

  log('info', 'unified-search request', { rguid })
  const start = Date.now()
  const json = await unifiedSearch({
    sessionKey, originMetroCode: metroCode, destinationCityId: cityId,
    departSeconds, returnSeconds, adults: travelers, rguid,
  })

  const stayItems = json?.body?.componentResponses?.[0]?.stayResponse?.stayItems ?? []
  const flyItems = json?.body?.componentResponses?.[1]?.flyResponse?.flyItems ?? []
  const proposals = json?.body?.proposals ?? []
  log('info', 'unified-search complete', {
    durationMs: Date.now() - start,
    proposals: proposals.length,
    stayItems: stayItems.length,
    flyItems: flyItems.length,
  })

  // Extract IDs for enrichment calls
  const hotelIds = stayItems.map(extractHotelId)
  const carrierCodes = [...new Set(
    flyItems.flatMap(f => f?.slices?.flatMap(s => s?.segments?.map(seg => seg?.marketingAirlineCode)) ?? [])
  )].filter(Boolean)

  // Fan out enrichment in parallel — all best-effort, failures degrade gracefully
  const [imageMap, airlineMap, rentalCars] = await Promise.all([
    fetchHotelContent(hotelIds),
    fetchAirlineMetadata(carrierCodes),
    fetchRentalCars({
      pickupLocation: destinationAirport,
      returnLocation: destinationAirport,
      pickupDateTime: toRcDateTime(departDate, '12:00'),
      returnDateTime: toRcDateTime(returnDate, '10:00'),
    })
      .then((r) => r.rentalCars)
      .catch((err) => {
        log('warn', 'rc-availability failed, packages returned without car', { error: err.message })
        return []
      }),
  ])

  const car = pickCheapestCar(rentalCars)
  const searchParams = { originAirport, destinationAirport, departDate, returnDate, travelers }
  const { packages: basePackages, flyItems: normalizedFlyItems } = normalizeSearchResult(json, imageMap, airlineMap, searchParams)
  const packages = car ? basePackages.map((pkg) => attachCar(pkg, car)) : basePackages.map((pkg) => ({ ...pkg, car: null }))

  return {
    packages,
    flyItems: normalizedFlyItems,
    rentalCars,
    meta: { origin: originAirport, destination: destinationAirport, departDate, returnDate, travelers },
  }
}

// rc-availability expects YYYYMMDDTHH:MM
function toRcDateTime(dateStr, time) {
  return `${dateStr.replaceAll('-', '')}T${time}`
}

function pickCheapestCar(cars) {
  let cheapest = null
  for (const c of cars) {
    if (c.packageSupported && c.totalPrice > 0 && (!cheapest || c.totalPrice < cheapest.totalPrice)) cheapest = c
  }
  return cheapest
}

function attachCar(pkg, car) {
  return {
    ...pkg,
    car,
    bundleTotal: pkg.bundleTotal + car.totalPrice,
    bundleStrikethrough: pkg.bundleStrikethrough > 0 ? pkg.bundleStrikethrough + car.totalPrice : 0,
  }
}

app.post(['/api/packages', '/cdns-pkg-ui/api/packages'], express.json(), async (req, res) => {
  log('info', 'Packages request', req.body)
  const result = await fetchPackages(req.body || {}).catch((err) => {
    log('error', 'fetchPackages threw', { error: err.message })
    return { error: err.message }
  })
  if (result.error) return res.status(502).json({ error: result.error })
  res.json(result)
})

// Debug: dump htl-content response for a given dealId
app.get('/debug/htl-content/:dealId', async (req, res) => {
  try {
    const resp = await post(HTL_CONTENT_URL, { deals: [{ dealId: req.params.dealId }] })
    const data = await resp.json()
    res.json({ status: resp.status, data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Debug: dump raw stayItem content fields from a live search
app.post('/debug/stay-content', express.json(), async (req, res) => {
  try {
    const params = { ...{ originAirport: 'EWR', originMetroCode: 'NYC', destinationAirport: 'CUN', destinationCityId: '3000061781', departDate: '2026-08-15', returnDate: '2026-08-22', travelers: 2 }, ...(req.body || {}) }
    const departSeconds = toMidnightUtcSeconds(params.departDate)
    const returnSeconds = toMidnightUtcSeconds(params.returnDate)
    const cacheKey = `${params.originMetroCode}|${params.destinationCityId}|${departSeconds}|${returnSeconds}|${params.travelers}`
    const sessionKey = await getSessionKey({ cacheKey, originMetroCode: params.originMetroCode, destinationCityId: params.destinationCityId, departSeconds, returnSeconds, adults: params.travelers })
    const json = await unifiedSearch({ sessionKey, originMetroCode: params.originMetroCode, destinationCityId: params.destinationCityId, departSeconds, returnSeconds, adults: params.travelers, rguid: 'debug' })
    const stayItems = json?.body?.componentResponses?.[0]?.stayResponse?.stayItems ?? []
    const sample = stayItems.slice(0, 3).map(item => ({
      itemKey: item.itemKey,
      itemContent: item.itemContent,
    }))
    res.json({ count: stayItems.length, sample })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Flight-pivot search — reuses same STAY-pivot CRC session, same as what Splunk shows working
async function fetchFlightOptions(params) {
  const { originAirport, originMetroCode, destinationAirport, destinationCityId, departDate, returnDate, travelers } = params
  const departSeconds = toMidnightUtcSeconds(departDate)
  const returnSeconds = toMidnightUtcSeconds(returnDate)
  const cacheKey = `${originMetroCode}|${destinationCityId}|${departSeconds}|${returnSeconds}|${travelers}`

  const sessionKey = await getSessionKey({
    cacheKey, originMetroCode, destinationCityId, departSeconds, returnSeconds, adults: travelers,
  })

  const usRguid = `fly-pivot-${Date.now()}`
  log('info', 'fly-pivot unified-search request', { rguid: usRguid })
  const json = await unifiedSearchFlyPivot({
    sessionKey, originAirport, originMetroCode, destinationAirport, destinationCityName: 'Cancun, Mexico', departSeconds, returnSeconds, adults: travelers, rguid: usRguid,
  })

  const flyItems = json?.body?.componentResponses?.find(c => c.flyResponse)?.flyResponse?.flyItems ?? []
  log('info', 'fly-pivot complete', { flyItems: flyItems.length })

  const carrierCodes = [...new Set(
    flyItems.flatMap(f => f?.slices?.flatMap(s => s?.segments?.map(seg => seg?.marketingAirlineCode)) ?? [])
  )].filter(Boolean)
  const airlineMap = await fetchAirlineMetadata(carrierCodes)

  return {
    flyItems: flyItems.map(f => normalizeFlyItem(f, airlineMap)),
    meta: { originAirport, destinationAirport, departDate, returnDate, travelers },
  }
}

app.post(['/api/flights', '/cdns-pkg-ui/api/flights'], express.json(), async (req, res) => {
  log('info', 'Flights request', req.body)
  const result = await fetchFlightOptions(req.body || {}).catch(err => ({ error: err.message }))
  if (result.error) return res.status(502).json({ error: result.error })
  res.json(result)
})

// Debug: raw fly-pivot unified-search response
app.post(['/debug/raw-flights', '/cdns-pkg-ui/debug/raw-flights'], express.json(), async (req, res) => {
  try {
    const params = {
      originAirport: 'EWR', originMetroCode: 'NYC',
      destinationAirport: 'CUN', destinationCityId: '3000061781',
      departDate: '2026-08-15', returnDate: '2026-08-22', travelers: 2,
      ...(req.body || {}),
    }
    const departSeconds = toMidnightUtcSeconds(params.departDate)
    const returnSeconds = toMidnightUtcSeconds(params.returnDate)
    const cacheKey = `${params.originMetroCode}|${params.destinationCityId}|${departSeconds}|${returnSeconds}|${params.travelers}`
    const sessionKey = await getSessionKey({
      cacheKey, originMetroCode: params.originMetroCode,
      destinationCityId: params.destinationCityId,
      departSeconds, returnSeconds, adults: params.travelers,
    })
    // STAY-pivot must run first to populate session; debug has no prior packages call
    await unifiedSearch({
      sessionKey, originMetroCode: params.originMetroCode,
      destinationCityId: params.destinationCityId,
      departSeconds, returnSeconds, adults: params.travelers, rguid: 'debug-stay-seed',
    })
    const json = await unifiedSearchFlyPivot({
      sessionKey, originAirport: params.originAirport, originMetroCode: params.originMetroCode,
      destinationAirport: params.destinationAirport, destinationCityName: 'Cancun, Mexico',
      departSeconds, returnSeconds, adults: params.travelers, rguid: 'debug-fly-pivot',
    })
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Debug: full raw unified-search response
app.post(['/debug/raw', '/cdns-pkg-ui/debug/raw'], express.json(), async (req, res) => {
  try {
    const params = {
      originAirport: 'EWR', originMetroCode: 'NYC',
      destinationAirport: 'CUN', destinationCityId: '3000061781',
      departDate: '2026-08-15', returnDate: '2026-08-22', travelers: 2,
      ...(req.body || {}),
    }
    const departSeconds = toMidnightUtcSeconds(params.departDate)
    const returnSeconds = toMidnightUtcSeconds(params.returnDate)
    const cacheKey = `${params.originMetroCode}|${params.destinationCityId}|${departSeconds}|${returnSeconds}|${params.travelers}`
    const sessionKey = await getSessionKey({
      cacheKey, originMetroCode: params.originMetroCode,
      destinationCityId: params.destinationCityId,
      departSeconds, returnSeconds, adults: params.travelers,
    })
    const json = await unifiedSearch({
      sessionKey, originMetroCode: params.originMetroCode,
      destinationCityId: params.destinationCityId,
      departSeconds, returnSeconds, adults: params.travelers, rguid: 'debug-raw',
    })
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function transmissionLabel(vehicleInfo) {
  if (vehicleInfo?.automatic) return 'Automatic'
  if (vehicleInfo?.manual) return 'Manual'
  return ''
}

function absoluteUrl(url) {
  return url?.startsWith('//') ? `https:${url}` : (url ?? '')
}

// rc-availability v0 returns rates keyed by id under availability.vehicleRates,
// with vendor names in the separate availability.partners map
function normalizeVehicleRates(availability, search) {
  const partners = availability?.partners ?? {}
  const currency = availability?.posCurrencyCode ?? 'USD'
  return Object.values(availability.vehicleRates).map((rate) => {
    const price = rate?.rates?.[currency] ?? Object.values(rate?.rates ?? {})[0] ?? {}
    const images = rate?.vehicleInfo?.images ?? rate?.partnerInfo?.images ?? {}
    return {
      carGroupId: rate?.id ?? '',
      carClass: rate?.vehicleCode ?? '',
      carType: rate?.vehicleInfo?.description ?? '',
      transmission: transmissionLabel(rate?.vehicleInfo),
      vendor: partners[rate?.partnerCode]?.partnerName ?? rate?.partnerCode ?? '',
      vendorCode: rate?.partnerCode ?? '',
      imageUrl: absoluteUrl(images.SIZE335X180 ?? images.SIZE268X144),
      totalPrice: Number(price.totalAllInclusivePrice ?? 0),
      dailyRate: Number(price.basePrices?.DAILY ?? 0),
      currencyCode: price.currencyCode ?? currency,
      isExpressDeal: false,
      isPrepaid: rate?.payAtBooking === true,
      isPayLater: rate?.payAtBooking === false,
      freeCancellation: rate?.freeCancellation ?? false,
      packageSupported: rate?.packageSupported ?? false,
      ...search,
    }
  })
}

function normalizeRentalCars(json, search) {
  if (json?.availability?.vehicleRates) return normalizeVehicleRates(json.availability, search)
  const { pickupLocation, returnLocation, pickupDateTime, returnDateTime } = search
  const items = json?.results ?? json?.carGroups ?? json?.vehicles ?? []
  const list = Array.isArray(items) ? items : []
  return list.map((item) => ({
    carGroupId: item?.carGroupId ?? item?.id ?? '',
    carClass: item?.vehicleInfo?.acrissCode ?? item?.carClass ?? '',
    carType: item?.vehicleInfo?.type ?? '',
    transmission: item?.vehicleInfo?.transmission ?? '',
    vendor: item?.vendor?.name ?? item?.vendorName ?? '',
    vendorCode: item?.vendor?.code ?? item?.vendorCode ?? '',
    imageUrl: item?.vehicleInfo?.imageUrl ?? '',
    totalPrice: item?.pricing?.retail?.prepaid?.total?.amount ?? item?.totalPrice ?? 0,
    dailyRate: item?.pricing?.retail?.prepaid?.daily?.amount ?? item?.dailyRate ?? 0,
    currencyCode: item?.pricing?.currencyCode ?? 'USD',
    isExpressDeal: item?.isExpressDeal ?? false,
    isPrepaid: item?.pricing?.retail?.prepaid != null,
    isPayLater: item?.pricing?.retail?.payLater != null,
    freeCancellation: item?.freeCancellation ?? false,
    packageSupported: item?.packageSupported ?? false,
    pickupLocation,
    returnLocation,
    pickupDateTime,
    returnDateTime,
  }))
}

async function fetchRentalCars({ pickupLocation, returnLocation, pickupDateTime, returnDateTime, currencyCode = 'USD' }) {
  const params = new URLSearchParams({
    'pickup-date-time': pickupDateTime,
    'return-date-time': returnDateTime,
    'return-location': returnLocation,
    'currency-code': currencyCode,
    'plf': 'PCLN',
    'source-id': 'PKG-FROM-FLIGHT',
    'include-retail-prepaid': 'true',
    'include-retail-pay-later': 'true',
    'include-express-deals': 'true',
    'include-airport-locations': 'true',
    'include-score': 'false',
  })
  const url = `${RC_AVAILABILITY_BASE_URL}/${pickupLocation}?${params}`
  log('info', 'rc-availability request', { pickupLocation, returnLocation })
  const start = Date.now()
  const resp = await get(url)
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText ?? '')
    throw new Error(`rc-availability HTTP ${resp.status}: ${text.slice(0, 300)}`)
  }
  const json = await resp.json()
  log('info', 'rc-availability complete', { durationMs: Date.now() - start })
  const search = { pickupLocation, returnLocation, pickupDateTime, returnDateTime }
  return { rentalCars: normalizeRentalCars(json, search), meta: search }
}

app.post(['/api/rental-cars', '/cdns-pkg-ui/api/rental-cars'], express.json(), async (req, res) => {
  log('info', 'Rental cars request', req.body)
  const result = await fetchRentalCars(req.body || {}).catch((err) => {
    log('error', 'fetchRentalCars threw', { error: err.message })
    return { error: err.message }
  })
  if (result.error) return res.status(502).json({ error: result.error })
  res.json(result)
})

app.get(['/debug/rental-cars', '/cdns-pkg-ui/debug/rental-cars'], async (req, res) => {
  try {
    const result = await fetchRentalCars({
      pickupLocation: req.query.pickup ?? 'JFK',
      returnLocation: req.query.returnLoc ?? 'JFK',
      pickupDateTime: req.query.pickupDt ?? '20260928T12:00',
      returnDateTime: req.query.returnDt ?? '20261002T12:00',
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Global header — fetches real Priceline header/footer HTML from global-navigation-service
const GLOBAL_WEB_COMPONENTS_URL = process.env.GLOBAL_WEB_COMPONENTS_URL ||
  'https://qaa.priceline.com/global-web-components/public/js/global-web-components-install.js'

const installerHTML = `
      <script
        id="pcln-header-install-script"
        type="text/javascript"
        data-base-url="https://qaa.priceline.com">
          (function() {
            var gwci = document.createElement('script');
            gwci.id = 'gwci';
            gwci.type = 'application/javascript';
            gwci.async = true;
            gwci.src = '${GLOBAL_WEB_COMPONENTS_URL}';
            var s = document.getElementsByTagName('head')[0];
            s.appendChild(gwci);
          })();
      </script>`

function httpsPost(urlStr, body, caBundle) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      ca: caBundle,
    }, res => {
      let buf = ''
      res.on('data', c => buf += c)
      res.on('end', () => {
        try { resolve(JSON.parse(buf)) } catch { reject(new Error('JSON parse failed')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => { req.destroy(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

let _headerCache = null
async function fetchGlobalHeader() {
  if (_headerCache) return _headerCache
  const navUrl = process.env.GLOBAL_NAV_URL
  if (!navUrl) return { headerHTML: '', footerHTML: '', installerHTML: '' }

  try {
    const data = await httpsPost(
      `${navUrl}?client-app-name=cdns-pkg-ui&client-app-version=1.0`,
      { featureOptions: { lightHeader: true }, cguid: null, visitId: null, multiCurrency: { mcType: 'NONE' }, route: '/' },
      pclnCa,
    )
    _headerCache = {
      headerHTML: data.headerContent ? `<div>${data.headerContent}</div>` : '',
      footerHTML: data.footerContent ? `<div>${data.footerContent}</div>` : '',
      installerHTML,
    }
  } catch (err) {
    log('warn', 'global-nav fetch failed, no header', { err: err.message })
    _headerCache = { headerHTML: '', footerHTML: '', installerHTML: '' }
  }
  return _headerCache
}

app.get(['/api/header', '/cdns-pkg-ui/api/header'], async (req, res) => {
  const data = await fetchGlobalHeader()
  res.json(data)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', crcHost: QAA_HOST, unifiedSearchUrl: UNIFIED_SEARCH_URL })
})

// Proxy global-web-components assets (CSS, JS bundle) to QAA.
// Needed because Express on :3001 doesn't have Vite's proxy rules.
app.get('/global-web-components/*', (req, res) => {
  const target = `https://qaa.priceline.com${req.path}`
  https.get(target, { rejectUnauthorized: false }, upstream => {
    res.status(upstream.statusCode)
    const ct = upstream.headers['content-type']
    if (ct) res.setHeader('Content-Type', ct)
    upstream.pipe(res)
  }).on('error', err => {
    log('warn', 'global-web-components proxy error', { err: err.message, path: req.path })
    res.status(502).send('proxy error')
  })
})

if (process.env.NODE_ENV === 'production') {
  const publicDir = join(__dirname, 'public')
  // Serve frontend assets under the /cdns-pkg-ui/ path prefix Vite bakes into asset URLs
  app.use('/cdns-pkg-ui', express.static(publicDir))
  // SPA catch-all — any unmatched route under the app prefix returns index.html
  app.get(['/cdns-pkg-ui', '/cdns-pkg-ui/*'], (_req, res) =>
    res.sendFile(join(publicDir, 'index.html'))
  )
}

app.listen(PORT, () => log('info', `Server listening on :${PORT}`, { crcHost: QAA_HOST, unifiedSearchUrl: UNIFIED_SEARCH_URL }))
