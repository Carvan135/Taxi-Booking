"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TawkToWidget } from "@/components/chat/TawkToWidget";
import { CookieConsentProvider } from "@/components/cookies/CookieConsentProvider";
import { getQueryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>
        {children}
        <TawkToWidget />
      </CookieConsentProvider>
    </QueryClientProvider>
  );
}
