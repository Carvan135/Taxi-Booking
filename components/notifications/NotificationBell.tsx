"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/queries/useNotifications";
import type { Notification, NotificationType } from "@/types";

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 hour ago" : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? "1 day ago" : `${day} days ago`;
}

function notificationIcon(type: NotificationType) {
  switch (type) {
    case "dispute_raised":
    case "auto_complete_warning":
      return AlertTriangle;
    case "operator_marked_complete":
    case "auto_completed":
    case "completion_confirmed":
      return Clock;
    default:
      return CheckCircle2;
  }
}

function bookingHref(
  notification: Notification,
  role: "customer" | "operator" | "admin",
): string | null {
  if (!notification.booking_id) return null;
  if (role === "admin") return `/admin/bookings/${notification.booking_id}`;
  if (role === "operator") return `/operator/bookings`;
  return `/bookings/${notification.booking_id}`;
}

type NotificationBellProps = {
  role: "customer" | "operator" | "admin";
  /** `dark` = white icon on dark header; `light` = dark icon on white header */
  tone?: "light" | "dark";
};

export function NotificationBell({
  role,
  tone = "dark",
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const buttonClass =
    tone === "light"
      ? "relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-content/80 transition hover:bg-slate-100 hover:text-content"
      : "relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white";

  async function onNotificationClick(n: Notification) {
    if (n.status === "unread") {
      await markRead.mutateAsync(n.id);
    }
    setOpen(false);
    const href = bookingHref(n, role);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#6B7280]">
                No notifications yet
              </p>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const Icon = notificationIcon(n.type);
                  const unread = n.status === "unread";
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void onNotificationClick(n)}
                        className={`flex w-full gap-3 border-l-4 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          unread
                            ? "border-l-sky-500 bg-sky-50/40"
                            : "border-l-slate-200"
                        }`}
                      >
                        <Icon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${unread ? "text-sky-600" : "text-slate-400"}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${unread ? "font-semibold text-[#111827]" : "font-medium text-[#374151]"}`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#6B7280]">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-[#9CA3AF]">
                            {formatTimeAgo(n.created_at)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {notifications.length > 0 ? (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => void markAllRead.mutateAsync()}
                className="w-full rounded-lg py-2 text-center text-xs font-semibold text-secondary hover:bg-slate-50 disabled:opacity-50"
              >
                Mark all as read
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
