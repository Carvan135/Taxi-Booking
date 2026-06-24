import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shield, Star } from "lucide-react";
import { OperatorDetailActions } from "@/components/admin/OperatorDetailActions";
import { OperatorLicensePreview } from "@/components/admin/OperatorLicensePreview";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatFleetVehicleTypesDisplay } from "@/lib/operator/fleet-vehicle-types";
import { createClient } from "@/lib/supabase/server";

function formatMoneyGBP(n: number): string {
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function memberSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type PageProps = { params: { id: string } };

export default async function AdminOperatorDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const { id } = params;

  const { data: op, error } = await supabase
    .from("operators")
    .select(
      "id, business_name, status, rating, total_reviews, created_at, updated_at, stripe_onboarding_complete, fleet_vehicle_count, fleet_vehicle_types, business_address, vehicle_type, base_price, user_id, license_document_url, license_number, license_expiry, vehicle_registration",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !op) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, phone, full_name")
    .eq("id", op.user_id)
    .maybeSingle();

  const { data: revBookings } = await supabase
    .from("bookings")
    .select("price")
    .eq("operator_id", id)
    .in("status", ["completed", "confirmed"]);

  const bookingsCount = revBookings?.length ?? 0;
  const revenueGbp =
    revBookings?.reduce((s, b) => s + Number(b.price ?? 0), 0) ?? 0;

  const licensePath =
    typeof op.license_document_url === "string" &&
    op.license_document_url.trim()
      ? op.license_document_url.trim()
      : null;

  let licenseSignedUrl: string | null = null;
  if (licensePath) {
    const { data: signed, error: signErr } = await supabase.storage
      .from("operator-licenses")
      .createSignedUrl(licensePath, 3600);
    if (!signErr && signed?.signedUrl) {
      licenseSignedUrl = signed.signedUrl;
    }
  }

  const status = op.status as
    | "pending"
    | "approved"
    | "rejected"
    | "suspended";
  const badgeStatus =
    status === "suspended"
      ? "suspended"
      : status === "approved"
        ? "approved"
        : status === "rejected"
          ? "rejected"
          : "pending";

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-full">
        <Link
          href="/admin/operators"
          className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to operators
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
                {op.business_name}
              </h1>
              {profile?.full_name ? (
                <p className="mt-1 text-sm text-[#6B7280]">
                  Contact: {profile.full_name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {op.stripe_onboarding_complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">
                  <Shield className="h-3.5 w-3.5" aria-hidden />
                  Verified
                </span>
              ) : null}
              <StatusBadge status={badgeStatus} />
            </div>
          </div>

          <OperatorDetailActions
            operatorId={op.id}
            status={status}
            className="mt-4 border-t border-slate-100 pt-4"
          />

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Email
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {profile?.email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Phone
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {profile?.phone?.trim() ? profile.phone : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {memberSince(op.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Vehicles
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {op.fleet_vehicle_count ?? 1}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Vehicle registration
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {op.vehicle_registration}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                License number
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {op.license_number}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                License expiry
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {op.license_expiry
                  ? new Date(op.license_expiry).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Vehicle types
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {formatFleetVehicleTypesDisplay(op)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Base price
              </dt>
              <dd className="mt-1 text-sm text-[#111827]">
                {formatMoneyGBP(Number(op.base_price ?? 0))}
              </dd>
            </div>
            {op.business_address ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Address
                </dt>
                <dd className="mt-1 text-sm text-[#111827]">
                  {op.business_address}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8">
            <OperatorLicensePreview
              storagePath={licensePath}
              signedUrl={licenseSignedUrl}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-6 border-t border-slate-100 pt-6 text-sm">
            <div className="inline-flex items-center gap-2 font-medium text-[#111827]">
              <Star className="h-5 w-5 text-amber-500" aria-hidden />
              {op.total_reviews > 0
                ? `${Number(op.rating).toFixed(1)} (${op.total_reviews} reviews)`
                : "No reviews yet"}
            </div>
            <div>
              <span className="text-[#6B7280]">Bookings:</span>{" "}
              <span className="font-semibold text-[#111827]">
                {bookingsCount.toLocaleString("en-GB")}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280]">Revenue:</span>{" "}
              <span className="font-semibold text-[#111827]">
                {formatMoneyGBP(revenueGbp)}
              </span>
            </div>
          </div>

          <p className="mt-6 text-xs text-[#9CA3AF]">
            Last updated {memberSince(op.updated_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
