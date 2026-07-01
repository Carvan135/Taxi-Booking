export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
  isAirport: boolean;
};

export type RouteResult = {
  distanceMiles: number;
  durationMinutes: number;
};
