"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SESSION_STORAGE_KEY = "brami-visit-session";

function readOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
  } catch {
    // sessionStorage may be unavailable (private mode, etc.) — fall through.
  }

  const fresh =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
  } catch {
    // Storing failed — we still return a stable id for this render pass.
  }

  return fresh;
}

export function VisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;
    const sessionId = readOrCreateSessionId();

    const sameOrigin =
      typeof window !== "undefined" &&
      document.referrer &&
      (() => {
        try {
          return new URL(document.referrer).origin === window.location.origin;
        } catch {
          return false;
        }
      })();

    const referrer = sameOrigin ? null : document.referrer || null;

    const payload = JSON.stringify({
      sessionId,
      path: fullPath,
      title: document.title || null,
      referrer,
    });

    // Prefer sendBeacon when leaving the page is possible — but for inline
    // pageviews fetch with keepalive is fine and gives us a response.
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Tracking is best-effort; never throw into user flow.
    });
  }, [pathname, searchParams]);

  return null;
}
