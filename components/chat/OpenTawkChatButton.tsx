"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type TawkApi = {
  maximize?: () => void;
  toggle?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
  }
}

function openTawkChat() {
  if (typeof window === "undefined") return;
  const api = window.Tawk_API;
  if (api?.maximize) {
    api.maximize();
    return;
  }
  if (api?.toggle) {
    api.toggle();
  }
}

type OpenTawkChatButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function OpenTawkChatButton({
  className = "",
  children = "Start live chat",
}: OpenTawkChatButtonProps) {
  return (
    <Button
      type="button"
      variant="primary"
      className={className}
      onClick={openTawkChat}
    >
      <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
      {children}
    </Button>
  );
}
