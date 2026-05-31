"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function InteractionGuard() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin-panel");

  useEffect(() => {
    // Admin panel needs free selection and copy/paste — skip all guards
    if (isAdmin) return;

    function handleCopy(e: ClipboardEvent) {
      if (!isEditableTarget(e.target)) e.preventDefault();
    }
    function handleCut(e: ClipboardEvent) {
      if (!isEditableTarget(e.target)) e.preventDefault();
    }
    function handleSelectStart(e: Event) {
      if (!isEditableTarget(e.target)) e.preventDefault();
    }

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [isAdmin]);

  return null;
}
