"use client";

import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <Link
        href="/"
        className="mb-10 text-2xl font-bold tracking-tight text-primary"
      >
        AirportHub
      </Link>
      <ForgotPasswordForm />
    </div>
  );
}
