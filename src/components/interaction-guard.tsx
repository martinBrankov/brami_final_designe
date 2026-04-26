"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function InteractionGuard() {
  useEffect(() => {
    function handleCopy(event: ClipboardEvent) {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    }

    function handleCut(event: ClipboardEvent) {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    }

    function handleSelectStart(event: Event) {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    }

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, []);

  return null;
}
