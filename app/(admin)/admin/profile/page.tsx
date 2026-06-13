import { User } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { ProfileAccountSummary } from "@/components/profile/ProfileAccountSummary";
import { getServerSession } from "@/lib/auth/getServerSession";

export default async function AdminProfilePage() {
  const session = await getServerSession();
  const profile = session?.profile;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-primary sm:text-3xl">
          <User className="h-8 w-8 shrink-0 text-secondary" aria-hidden />
          Your profile
        </h1>
        <p className="mt-2 text-sm text-content/70 sm:text-base">
          Account details and password settings.
        </p>
      </div>

      <div className="space-y-6">
        <ProfileAccountSummary
          fullName={profile?.full_name ?? null}
          email={profile?.email ?? ""}
          phone={profile?.phone}
          role="admin"
          memberSince={profile?.created_at}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
