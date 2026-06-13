"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createClient } from "@/lib/supabase/client";

export default function AuthResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const finish = (ok: boolean) => {
      if (!active) return;
      if (ok) {
        setReady(true);
        setChecking(false);
      } else {
        router.replace("/forgot-password");
      }
    };

    async function init(): Promise<(() => void) | undefined> {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";

      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          window.history.replaceState(null, "", window.location.pathname);
          if (!error) {
            finish(true);
            return undefined;
          }
        }
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        router.replace(
          `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent("/auth/reset-password")}`,
        );
        return undefined;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        finish(true);
        return undefined;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === "PASSWORD_RECOVERY" || nextSession) {
          finish(true);
        }
      });

      const timer = window.setTimeout(() => {
        void supabase.auth.getSession().then(({ data: { session: next } }) => {
          finish(Boolean(next));
        });
      }, 500);

      return () => {
        subscription.unsubscribe();
        window.clearTimeout(timer);
      };
    }

    let cleanup: (() => void) | undefined;
    void init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <p className="text-sm text-content/60">Preparing password reset…</p>
      </div>
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-100 to-white px-4 py-12">
      <Link
        href="/"
        className="mb-10 text-2xl font-bold tracking-tight text-primary"
      >
        AirportHub
      </Link>
      <ResetPasswordForm />
    </div>
  );
}
