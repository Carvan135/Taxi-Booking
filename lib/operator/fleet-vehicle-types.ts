import type { ServiceType } from "@/lib/validations/enums";

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

export const SERVICE_TYPE_FLEET_MATCH: Record<
  ServiceType,
  readonly OperatorFleetVehicleType[]
> = {
  standard: ["Saloon", "EV"],
  executive: ["Executive", "Luxury"],
  van: ["MPV", "8 Seater"],
  suv: ["Estate"],
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

export function operatorMatchesServiceType(
  input: {
    fleet_vehicle_types?: string | null;
    vehicle_type?: string | null;
  },
  serviceType: ServiceType,
): boolean {
  const fleet = resolveOperatorFleetTypes(input);
  const matches = SERVICE_TYPE_FLEET_MATCH[serviceType];
  return fleet.some((type) => matches.includes(type));
}
