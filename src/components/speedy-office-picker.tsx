"use client";

import { useEffect, useRef, useState } from "react";

export type SpeedyOffice = {
  id: number;
  name: string;
  type?: "OFFICE" | "APT";
  address: {
    fullAddressString?: string;
    siteName?: string;
    postCode?: string;
  };
};

export type SpeedyOfficeKind = "office" | "locker";

export function formatOfficeLabel(office: SpeedyOffice) {
  const heading = office.address.siteName ?? office.name;
  const detail = office.address.fullAddressString ?? office.name;
  return [heading, detail].filter(Boolean).join(", ");
}

function getSpeedyLocationTypeLabel(type?: SpeedyOffice["type"]) {
  return type === "APT" ? "Автомат" : "Офис";
}

function getOfficeSearchPlaceholder(kind: SpeedyOfficeKind) {
  return kind === "locker"
    ? "Търси по автомат, град или адрес"
    : "Търси по офис, град или адрес";
}

function getOfficeEmptyLabel(kind: SpeedyOfficeKind) {
  return kind === "locker" ? "Няма намерени автомати." : "Няма намерени офиси.";
}

export function SpeedyOfficePicker({
  kind,
  onKindChange,
  selected,
  onSelect,
  inline = false,
}: {
  kind: SpeedyOfficeKind;
  onKindChange?: (kind: SpeedyOfficeKind) => void;
  selected: SpeedyOffice | null;
  onSelect: (office: SpeedyOffice | null) => void;
  inline?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(inline);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpeedyOffice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (inline || !isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [inline, isOpen]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/speedy/offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            officeType: kind === "locker" ? "APT" : "OFFICE",
          }),
        });
        const data = (await res.json()) as { offices?: SpeedyOffice[] };
        setResults(data.offices ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      setIsLoading(false);
    };
  }, [kind, query]);

  const triggerLabel = selected
    ? formatOfficeLabel(selected)
    : kind === "locker"
      ? "Избери автомат на Спиди"
      : "Избери офис на Спиди";

  const selectedChip = selected ? (
    <div className="rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] p-2">
      <div className="flex items-start gap-3 rounded-[14px] border border-[#ddd3e4] bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#432855]">
            {(selected.address.siteName ?? selected.name)} -{" "}
            {getSpeedyLocationTypeLabel(selected.type)}
          </span>
          <span className="mt-1 block text-sm leading-5 text-[#6b587f]">
            {selected.address.fullAddressString ?? selected.name}
          </span>
        </div>
        <button
          type="button"
          aria-label="Премахни избрания офис"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#ddd3e4] text-[#6b587f] transition hover:border-[#d85b73] hover:text-[#9a3f3f]"
        >
          <svg
            viewBox="0 0 14 14"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
    </div>
  ) : null;

  const searchBody = (
    <div className="rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] p-2 shadow-[0_24px_80px_rgba(67,40,85,0.16)]">
      {onKindChange ? (
        <div className="mb-2 flex rounded-full bg-white p-1">
          <button
            type="button"
            onClick={() => onKindChange("office")}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
              kind === "office"
                ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                : "text-[#6b587f] hover:text-[#432855]"
            }`}
          >
            Офис
          </button>
          <button
            type="button"
            onClick={() => onKindChange("locker")}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
              kind === "locker"
                ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                : "text-[#6b587f] hover:text-[#432855]"
            }`}
          >
            Автомат
          </button>
        </div>
      ) : null}

      <input
        type="text"
        name="speedy-office-filter"
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={getOfficeSearchPlaceholder(kind)}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-2 h-11 w-full rounded-[14px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        autoFocus
      />

      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <p className="px-2 py-3 text-sm text-[#8f72a7]">Търсене...</p>
        ) : query.trim().length < 2 ? (
          <p className="px-2 py-3 text-sm text-[#8f72a7]">
            Въведи поне 2 символа за търсене.
          </p>
        ) : results.length ? (
          <div className="space-y-2">
            {results.map((office) => {
              return (
                <button
                  key={office.id}
                  type="button"
                  onClick={() => {
                    onSelect(office);
                    setQuery("");
                    if (!inline) {
                      setIsOpen(false);
                    }
                  }}
                  className="flex w-full flex-col rounded-[16px] border border-transparent bg-white/70 px-4 py-3 text-left transition hover:border-[#d9cce3]"
                >
                  <span className="text-sm font-semibold text-[#432855]">
                    {(office.address.siteName ?? office.name)} -{" "}
                    {getSpeedyLocationTypeLabel(office.type)}
                  </span>
                  <span className="mt-1 text-sm leading-5 text-[#6b587f]">
                    {office.address.fullAddressString ?? office.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-2 py-3 text-sm text-[#6b587f]">{getOfficeEmptyLabel(kind)}</p>
        )}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div ref={containerRef} className="w-full">
        {selected ? selectedChip : searchBody}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-left text-[#432855] outline-none transition"
      >
        <span className={selected ? "truncate text-[#432855]" : "truncate text-[#8f72a7]"}>
          {triggerLabel}
        </span>
        <span className="shrink-0 text-[#6b587f]">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20">{searchBody}</div>
      ) : null}
    </div>
  );
}
