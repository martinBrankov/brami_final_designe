"use client";

import { useCallback, useEffect, useState } from "react";

type ArtifactView = {
  id: string;
  artifactType: string;
  name: string;
  status: string;
  previewUrl: string | null;
  publishedUrl: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Чернова",
  reviewing: "Проверка",
  ready_for_approval: "За одобрение",
  changes_requested: "Нужни промени",
  approved: "Одобрена",
  publishing: "Публикува",
  published: "Публикувана",
  rejected: "Отхвърлена",
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Грешка ${res.status}`);
  return data;
}

// Preview card rendered in the chat for an "artifact" message. Shows the produced
// deliverable, its status and preview link, and the approval / publish actions.
export function ArtifactPreviewCard({
  artifactId,
  fallbackName,
  fallbackPreviewUrl,
  onChanged,
}: {
  artifactId: string;
  fallbackName?: string;
  fallbackPreviewUrl?: string;
  onChanged?: () => void;
}) {
  const [artifact, setArtifact] = useState<ArtifactView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesText, setChangesText] = useState("");

  const load = useCallback(async () => {
    try {
      const { artifact } = await jsonFetch<{ artifact: ArtifactView }>(
        `/api/agent-chat/artifacts/${artifactId}`,
      );
      setArtifact(artifact);
    } catch {
      /* keep fallbacks */
    }
  }, [artifactId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, comment?: string) {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch(`/api/agent-chat/artifacts/${artifactId}/approval`, {
        method: "POST",
        body: JSON.stringify({ action, comment }),
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неуспешно действие.");
    } finally {
      setBusy(false);
    }
  }

  async function approveAndPublish() {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch(`/api/agent-chat/artifacts/${artifactId}/approval`, {
        method: "POST",
        body: JSON.stringify({ action: "approve" }),
      });
      await jsonFetch(`/api/agent-chat/artifacts/${artifactId}/approval`, {
        method: "POST",
        body: JSON.stringify({ action: "publish" }),
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неуспешно публикуване.");
    } finally {
      setBusy(false);
    }
  }

  const name = artifact?.name ?? fallbackName ?? "Резултат";
  const status = artifact?.status ?? "ready_for_approval";
  const previewUrl = artifact?.previewUrl ?? fallbackPreviewUrl ?? null;
  const publishedUrl = artifact?.publishedUrl ?? null;

  const canApprove = status === "ready_for_approval" || status === "changes_requested";
  const canPublish = status === "approved";
  const isPublished = status === "published";
  const isRejected = status === "rejected";

  const btn =
    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:opacity-40";

  return (
    <div className="max-w-[80%] rounded-2xl border border-[#dbe7f7] bg-[#f6faff] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2f5c8a]">
          📄 Статия · v1
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#2f5c8a]">
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-[#1d2733]">{name}</p>

      {(previewUrl || publishedUrl) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {previewUrl && !isPublished && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#2f5c8a] underline hover:no-underline"
            >
              Отвори preview
            </a>
          )}
          {publishedUrl && (
            <a
              href={publishedUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#2f7d55] underline hover:no-underline"
            >
              Публикувано ↗
            </a>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-[#a23b3b]">{error}</p>}

      {!isPublished && !isRejected && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {canApprove && (
            <>
              <button
                onClick={approveAndPublish}
                disabled={busy}
                className={`${btn} border-[#2f7d55] bg-[#dcefe4] text-[#2f7d55] hover:brightness-95`}
              >
                Одобри и публикувай
              </button>
              <button
                onClick={() => act("approve")}
                disabled={busy}
                className={`${btn} border-[#d9d4ca] text-[#1d2733] hover:bg-white`}
              >
                Одобри
              </button>
              <button
                onClick={() => setChangesOpen((v) => !v)}
                disabled={busy}
                className={`${btn} border-[#d9d4ca] text-[#1d2733] hover:bg-white`}
              >
                Поискай промени
              </button>
              <button
                onClick={() => act("reject")}
                disabled={busy}
                className={`${btn} border-[#e0b4b4] text-[#a23b3b] hover:bg-white`}
              >
                Отхвърли
              </button>
            </>
          )}
          {canPublish && (
            <button
              onClick={() => act("publish")}
              disabled={busy}
              className={`${btn} border-[#2f7d55] bg-[#dcefe4] text-[#2f7d55] hover:brightness-95`}
            >
              Публикувай
            </button>
          )}
        </div>
      )}

      {changesOpen && canApprove && (
        <div className="mt-2">
          <textarea
            value={changesText}
            onChange={(e) => setChangesText(e.target.value)}
            rows={2}
            placeholder="Какви промени са нужни?"
            className="w-full resize-none rounded-lg border border-[#d9d4ca] px-2 py-1 text-xs text-[#1d2733] focus:border-[#8a6f45] focus:outline-none"
          />
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => {
                act("request_changes", changesText.trim() || undefined);
                setChangesOpen(false);
                setChangesText("");
              }}
              disabled={busy}
              className="rounded-lg bg-[#1d2733] px-3 py-1 text-xs font-medium text-white hover:bg-[#2b3947] disabled:opacity-40"
            >
              Изпрати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
