export type DeparturePhase = 'anticipation' | 'country' | 'details' | 'ready';

export interface DepartureResult {
  passengerName: string;
  country: string;
  countryLabel?: string;
  city: string;
  airportCode: string;
  airlineLabel?: string;
  airlineCode?: string;
  flightNumber?: string;
  arrivalAirportCode?: string;
  boardingTime?: string;
  gate: string;
}
