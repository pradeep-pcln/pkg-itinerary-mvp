// Unified-search API response types

export interface NormalizedFlight {
  itemKey: string
  carrierCode: string
  airline: string
  airlineLogoUrl: string
  retCarrierCode: string
  retAirline: string
  retAirlineLogoUrl: string
  outboundLegs: FlightLeg[]
  returnLegs: FlightLeg[]
  isNonstopOut: boolean
  isNonstopRet: boolean
}

export interface FlightLeg {
  origin: string
  destination: string
  carrier: string
  departTime: string
  arriveTime: string
}

export interface HotelImage {
  // ~500px wide, for cards
  url: string
  // ~1280px wide, for the drawer
  hdUrl: string
  caption: string
}

export interface NormalizedPackage {
  proposalIndex: number
  // Keys needed for checkout
  hotelItemKey: string
  hotelPriceKey: string
  flyItemKey: string
  flyPriceKey: string
  // Hotel
  hotelName: string
  starRating: number
  guestRating: number
  thumbnailUrl: string
  heroImageUrl: string
  hotelImages: HotelImage[]
  nightlyRate: number
  nightlyStrikethrough: number
  dealName: string
  savingsPct: number
  freeCancellation: boolean
  allInclusive: boolean
  resortFee: number
  // Flight
  airline: string
  airlineLogoUrl: string
  outboundLegs: FlightLeg[]
  returnLegs: FlightLeg[]
  // Bundle pricing from proposals[]
  bundleTotal: number
  bundleStrikethrough: number
  currencySymbol: string
  // Search context
  origin: string
  destination: string
  destinationCityName: string
  departDate: string
  returnDate: string
  travelers: number
  nights: number
  // Cheapest rental car at the destination; null when rc-availability failed or returned nothing
  car: NormalizedRentalCar | null
}

export interface NormalizedRentalCar {
  carGroupId: string
  carClass: string
  carType: string
  transmission: string
  vendor: string
  vendorCode: string
  imageUrl: string
  totalPrice: number
  dailyRate: number
  currencyCode: string
  isExpressDeal: boolean
  isPrepaid: boolean
  isPayLater: boolean
  freeCancellation: boolean
  packageSupported: boolean
  pickupLocation: string
  returnLocation: string
  pickupDateTime: string
  returnDateTime: string
}
