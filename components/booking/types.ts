export type TripDraft = {
  tripType: "one-way" | "return";
  from: string;
  to: string;
  via: string;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
};

export const emptyTripDraft = (): TripDraft => ({
  tripType: "one-way",
  from: "",
  to: "",
  via: "",
  date: "",
  time: "",
  passengers: 1,
  luggage: 1,
});

export type OperatorOption = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  vehicleType: string;
  etaMins: number;
  priceGbp: number;
};
