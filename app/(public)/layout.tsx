import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getServerSession } from "@/lib/auth/getServerSession";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serverSession = await getServerSession();
  const navbarSession = serverSession
    ? {
        displayName:
          serverSession.profile.full_name?.trim() ||
          serverSession.profile.email ||
          "Account",
        role: serverSession.role,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar variant="public" session={navbarSession} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
