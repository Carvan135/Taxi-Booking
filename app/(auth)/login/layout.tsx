import Link from "next/link";

export default function LoginSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <Link
        href="/"
        className="mb-10 text-2xl font-bold tracking-tight text-primary"
      >
        TaxiBook
      </Link>
      {children}
    </div>
  );
}
