"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SESSION_STORAGE_KEY = "brami-visit-session";
const VISITOR_STORAGE_KEY = "brami-visitor-token";

function randomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readOrCreate(storage: Storage | null, key: string): string {
  if (storage) {
    try {
      const existing = storage.getItem(key);
      if (existing) return existing;
    } catch {
      // ignore
    }
  }

  const fresh = randomId();

  if (storage) {
    try {
      storage.setItem(key, fresh);
    } catch {
      // ignore
    }
  }

  return fresh;
}

function safeSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Stable browser/device fingerprint — combination of properties that rarely
// change for a given user-agent. Not perfect (privacy tools / iframes will
// vary), but good enough to disambiguate cleared-cookie cases.
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Brami-fp-✦", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Brami-fp-✦", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fall through
    }
  }
  // Tiny non-crypto fallback hash — only used when SubtleCrypto is unavailable.
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 33) ^ value.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

async function computeFingerprint(): Promise<string> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  })();

  const parts = [
    nav.userAgent,
    nav.language,
    Array.isArray(nav.languages) ? nav.languages.join(",") : "",
    nav.platform ?? "",
    String(nav.hardwareConcurrency ?? ""),
    String(nav.deviceMemory ?? ""),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    tz,
    getCanvasFingerprint(),
  ];

  return sha256Hex(parts.join("|"));
}

export function VisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

    if (isLocal) return;

    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    const sessionId = readOrCreate(safeSessionStorage(), SESSION_STORAGE_KEY);
    const visitorToken = readOrCreate(safeLocalStorage(), VISITOR_STORAGE_KEY);

    const sameOrigin =
      document.referrer &&
      (() => {
        try {
          return new URL(document.referrer).origin === window.location.origin;
        } catch {
          return false;
        }
      })();

    const referrer = sameOrigin ? null : document.referrer || null;

    void (async () => {
      let fingerprint = "";
      try {
        fingerprint = await computeFingerprint();
      } catch {
        // ignore — server will fall back to visitorToken alone
      }

      const payload = JSON.stringify({
        sessionId,
        visitorToken,
        fingerprint,
        path: fullPath,
        title: document.title || null,
        referrer,
        timezone: (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch {
            return null;
          }
        })(),
      });

      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // best-effort
      });
    })();
  }, [pathname, searchParams]);

  return null;
}
