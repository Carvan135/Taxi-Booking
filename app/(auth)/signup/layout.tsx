"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/site/contact";

export default function SignupSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOperatorSignup = pathname?.startsWith("/signup/operator");

  if (isOperatorSignup) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <Link
        href="/"
        className="mb-10 text-2xl font-bold tracking-tight text-primary"
      >
        {SITE_NAME}
      </Link>
      {children}
    </div>
  );
}
