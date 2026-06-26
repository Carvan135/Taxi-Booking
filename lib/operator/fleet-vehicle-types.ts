/** Fleet categories operators can offer (UK private hire). */
export const OPERATOR_FLEET_VEHICLE_TYPES = [
  "Saloon",
  "EV",
  "Estate",
  "MPV",
  "Executive",
  "8 Seater",
  "Luxury",
] as const;

export type OperatorFleetVehicleType =
  (typeof OPERATOR_FLEET_VEHICLE_TYPES)[number];

/** Legacy `vehicle_type` values still stored on older rows. */
const LEGACY_VEHICLE_TYPE_ALIASES: Record<string, OperatorFleetVehicleType> = {
  Sedan: "Saloon",
  SUV: "Estate",
  Van: "MPV",
};

/** Legacy booking service_type values before fleet alignment. */
const LEGACY_SERVICE_TYPE_TO_VEHICLE: Record<string, OperatorFleetVehicleType> =
  {
    standard: "Saloon",
    executive: "Executive",
    van: "MPV",
    suv: "Estate",
  };

export function serializeFleetVehicleTypes(types: string[]): string {
  return types.join(", ");
}

export function parseFleetVehicleTypes(
  raw: string | null | undefined,
): OperatorFleetVehicleType[] {
  if (!raw?.trim()) return [];

  const allowed = new Set<string>(OPERATOR_FLEET_VEHICLE_TYPES);
  const parsed: OperatorFleetVehicleType[] = [];

  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const normalized =
      LEGACY_VEHICLE_TYPE_ALIASES[trimmed] ??
      (allowed.has(trimmed) ? (trimmed as OperatorFleetVehicleType) : null);
    if (normalized && !parsed.includes(normalized)) {
      parsed.push(normalized);
    }
  }

  return parsed;
}

export function resolveOperatorFleetTypes(input: {
  fleet_vehicle_types?: string | null;
  vehicle_type?: string | null;
}): OperatorFleetVehicleType[] {
  const fromFleet = parseFleetVehicleTypes(input.fleet_vehicle_types);
  if (fromFleet.length > 0) return fromFleet;

  const primary = String(input.vehicle_type ?? "").trim();
  if (!primary) return [];

  const normalized =
    LEGACY_VEHICLE_TYPE_ALIASES[primary] ??
    (OPERATOR_FLEET_VEHICLE_TYPES.includes(primary as OperatorFleetVehicleType)
      ? (primary as OperatorFleetVehicleType)
      : null);

  return normalized ? [normalized] : [];
}

export function formatFleetVehicleTypesDisplay(
  input: {
    fleet_vehicle_types?: string | null;
    vehicle_type?: string | null;
  },
  fallback = "—",
): string {
  const types = resolveOperatorFleetTypes(input);
  return types.length > 0 ? types.join(", ") : fallback;
}

export function primaryFleetVehicleType(
  types: OperatorFleetVehicleType[],
): OperatorFleetVehicleType {
  return types[0] ?? "Saloon";
}

export function normalizeBookingServiceType(
  raw: string | null | undefined,
): OperatorFleetVehicleType {
  const value = String(raw ?? "").trim();
  if (!value) return "Saloon";

  if (
    OPERATOR_FLEET_VEHICLE_TYPES.includes(value as OperatorFleetVehicleType)
  ) {
    return value as OperatorFleetVehicleType;
  }

  return LEGACY_SERVICE_TYPE_TO_VEHICLE[value] ?? "Saloon";
}

export function formatBookingVehicleType(value: string): string {
  return normalizeBookingServiceType(value);
}

export function operatorMatchesServiceType(
  input: {
    fleet_vehicle_types?: string | null;
    vehicle_type?: string | null;
  },
  serviceType: OperatorFleetVehicleType,
): boolean {
  const fleet = resolveOperatorFleetTypes(input);
  return fleet.includes(serviceType);
}
