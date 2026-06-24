import { User } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { OperatorProfileForm } from "@/components/operator/OperatorProfileForm";
import { createClient } from "@/lib/supabase/server";
import { resolveOperatorFleetTypes } from "@/lib/operator/fleet-vehicle-types";
import type { OperatorStatus } from "@/types";
import type { OperatorProfileFormValues } from "@/lib/validations/operatorProfile";

export default async function OperatorProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, phone, created_at")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Use `*` so the row still loads if migration 003 columns are not applied yet
  // (requesting unknown column names makes the whole query fail and returns no row).
  const { data: operator } = await supabase
    .from("operators")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const raw = operator as Record<string, unknown> | null;
  const op = raw
    ? {
        id: String(raw.id),
        business_name: String(raw.business_name ?? ""),
        vehicle_registration: String(raw.vehicle_registration ?? ""),
        rating: Number(raw.rating ?? 0),
        total_reviews: Number(raw.total_reviews ?? 0),
        created_at: String(raw.created_at ?? ""),
        business_address:
          raw.business_address == null
            ? null
            : String(raw.business_address),
        business_description:
          raw.business_description == null
            ? null
            : String(raw.business_description),
        fleet_vehicle_count:
          raw.fleet_vehicle_count == null
            ? null
            : Number(raw.fleet_vehicle_count),
        fleet_vehicle_types:
          raw.fleet_vehicle_types == null
            ? null
            : String(raw.fleet_vehicle_types),
        vehicle_type:
          raw.vehicle_type == null ? null : String(raw.vehicle_type),
        license_number: String(raw.license_number ?? ""),
        license_expiry: String(raw.license_expiry ?? "").slice(0, 10),
      }
    : null;

  let totalBookings = 0;
  let completedBookings = 0;

  if (op?.id) {
    const { count: total } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", op.id);

    const { count: completed } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", op.id)
      .eq("status", "completed");

    totalBookings = total ?? 0;
    completedBookings = completed ?? 0;
  }

  const completionRate =
    totalBookings > 0
      ? (completedBookings / totalBookings) * 100
      : 0;

  const memberSinceYear = op?.created_at
    ? new Date(op.created_at).getFullYear().toString()
    : new Date().getFullYear().toString();

  const initialForm: OperatorProfileFormValues = {
    business_name: op?.business_name ?? "",
    vehicle_registration: op?.vehicle_registration ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    business_address: op?.business_address ?? "",
    business_description: op?.business_description ?? "",
    fleet_vehicle_types: resolveOperatorFleetTypes({
      fleet_vehicle_types: op?.fleet_vehicle_types ?? null,
      vehicle_type: op?.vehicle_type ?? null,
    }),
    license_number: op?.license_number ?? "",
    license_expiry: op?.license_expiry ?? "",
    fleet_vehicle_count: op?.fleet_vehicle_count ?? 1,
  };

  const summary = {
    businessName: op?.business_name ?? "Your business",
    memberSinceYear,
    rating: Number(op?.rating ?? 0),
    totalReviews: op?.total_reviews ?? 0,
    totalBookings,
    completionRate,
    fleetVehicleCount: op?.fleet_vehicle_count ?? 1,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-primary sm:text-3xl">
          <User className="h-8 w-8 shrink-0 text-secondary" aria-hidden />
          Profile settings
        </h1>
        <p className="mt-2 text-sm text-content/70 sm:text-base">
          Manage your profile, business information, and availability.
        </p>
      </div>

      <OperatorProfileForm
        initialForm={initialForm}
        summary={summary}
        availability={
          raw && (raw.status as OperatorStatus) === "approved"
            ? {
                isPaused: raw.is_paused === true,
                pausedAt:
                  raw.paused_at == null ? null : String(raw.paused_at),
              }
            : undefined
        }
      />

      <div className="mt-8 max-w-3xl">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
