"use client";

import { Suspense } from "react";
import {
  LoginForm,
  LoginFormCardFallback,
} from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFormCardFallback />}>
      <LoginForm variant="rider" allowedRoles={["admin"]} />
    </Suspense>
  );
}

