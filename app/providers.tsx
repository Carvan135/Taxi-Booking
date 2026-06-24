"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CookieConsentProvider } from "@/components/cookies/CookieConsentProvider";
import { getQueryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>{children}</CookieConsentProvider>
    </QueryClientProvider>
  );
}
