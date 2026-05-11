"use client";

import { Suspense } from "react";
import {
  LoginForm,
  LoginFormCardFallback,
} from "@/components/auth/LoginForm";

export default function OperatorLoginPage() {
  return (
    <Suspense fallback={<LoginFormCardFallback />}>
      <LoginForm variant="operator" />
    </Suspense>
  );
}
