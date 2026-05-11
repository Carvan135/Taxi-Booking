"use client";

import { Suspense } from "react";
import {
  LoginForm,
  LoginFormCardFallback,
} from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormCardFallback />}>
      <LoginForm variant="rider" />
    </Suspense>
  );
}
