export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
  isAirport: boolean;
  /** Google Places id — resolved to coordinates on selection when needed. */
  googlePlaceId?: string;
};

export type RouteResult = {
  distanceMiles: number;
  durationMinutes: number;
};
