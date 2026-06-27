"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  AdminCampaign,
  AdminSocialPost,
  AdminStrategy,
  AdminSuggestion,
} from "@/lib/ai/marketing-data";

const STATUS_LABELS: Record<string, string> = {
  draft: "Чернова",
  approved: "Одобрен",
  published: "Публикуван",
  failed: "Грешка",
  pending: "Чакащо",
  applied: "Приложено",
  rejected: "Отхвърлено",
  completed: "Готова",
  planning: "Планиране",
};

const cardCls = "rounded-[18px] border border-[#e7dfd1] bg-white p-5";
const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-[8px] bg-[#1d2733] px-4 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#2b3847] disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "inline-flex h-9 items-center justify-center rounded-[8px] border border-[#d2c8b8] px-4 text-xs font-semibold text-[#1d2733] transition hover:bg-[#f8f4ec] disabled:opacity-50";
const inputCls =
  "w-full rounded-[10px] border border-[#d9d4ca] bg-white px-3 py-2 text-sm text-[#25313d] outline-none";

function Badge({ status }: { status: string }) {
  return (
    <span className="w-fit rounded-full border border-[#d2c8b8] bg-[#f8f4ec] px-2.5 py-0.5 text-xs font-semibold text-[#5f6b76]">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Грешка при заявката.");
  return json;
}

export function AdminAiDashboard({
  campaigns,
  socialPosts,
  strategies,
  suggestions,
}: {
  campaigns: AdminCampaign[];
  socialPosts: AdminSocialPost[];
  strategies: AdminStrategy[];
  suggestions: AdminSuggestion[];
}) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Manager — campaign generator */}
      <section className={cardCls}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
          Мениджър
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#1d2733]">Изготви кампания</h2>
        <p className="mt-1 text-sm text-[#6a7480]">
          Опиши целта — мениджърът планира и възлага задачи на инфлуенсъра, редактора и маркетинг специалиста. Всичко се записва като чернова за одобрение.
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="Напр. Популяризирай шафрановите серуми за лице преди лятото и освежи блога."
          className={`mt-3 resize-none ${inputCls}`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null || goal.trim().length < 5}
            onClick={() =>
              run("campaign", async () => {
                const r = await api("/api/admin/ai/campaign", "POST", { goal });
                const ok = (r.outcomes ?? []).filter((o: { ok: boolean }) => o.ok).length;
                return `Кампанията е готова — ${ok}/${(r.outcomes ?? []).length} задачи успешни.`;
              })
            }
            className={btnPrimary}
          >
            {busy === "campaign" ? "Работя…" : "Изготви кампания"}
          </button>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("influencer", async () => {
                const r = await api("/api/admin/ai/influencer", "POST", {
                  instruction: goal.trim() || "Създай постове за актуални продукти и за марката Brami.",
                });
                return `Генерирани ${r.count} социални поста.`;
              })
            }
            className={btnGhost}
          >
            Само инфлуенсър
          </button>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("marketing", async () => {
                await api("/api/admin/ai/marketing", "POST", {
                  instruction: goal.trim() || "Изготви обща маркетинг стратегия за следващото тримесечие.",
                });
                return "Стратегията е готова.";
              })
            }
            className={btnGhost}
          >
            Само стратегия
          </button>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("editor", async () => {
                await api("/api/admin/ai/editor", "POST", {
                  instruction: goal.trim() || "Подобри четимостта и структурата на последната статия.",
                });
                return "Редакторско предложение е готово.";
              })
            }
            className={btnGhost}
          >
            Само редактор (последна статия)
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      </section>

      <SocialPostsSection posts={socialPosts} busy={busy} run={run} />
      <SuggestionsSection suggestions={suggestions} busy={busy} run={run} />
      <StrategiesSection strategies={strategies} />
      <CampaignsSection campaigns={campaigns} />
    </div>
  );
}

type RunFn = (key: string, fn: () => Promise<string>) => Promise<void>;

function SocialPostsSection({
  posts,
  busy,
  run,
}: {
  posts: AdminSocialPost[];
  busy: string | null;
  run: RunFn;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[#1d2733]">
        Социални постове <span className="text-sm font-normal text-[#6a7480]">({posts.length})</span>
      </h2>
      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#5f6b76]">Все още няма генерирани постове.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <SocialPostCard key={post.id} post={post} busy={busy} run={run} />
          ))}
        </div>
      )}
    </section>
  );
}

function SocialPostCard({
  post,
  busy,
  run,
}: {
  post: AdminSocialPost;
  busy: string | null;
  run: RunFn;
}) {
  const [caption, setCaption] = useState(post.caption);
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "));
  const [imageUrl, setImageUrl] = useState(post.imageUrl ?? "");
  const dirty =
    caption !== post.caption ||
    hashtags !== post.hashtags.join(" ") ||
    imageUrl !== (post.imageUrl ?? "");
  const locked = post.status === "published";

  function hashtagArray() {
    return hashtags.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  }

  return (
    <article className={cardCls}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#1d2733] px-2.5 py-0.5 text-xs font-semibold text-white">
          {post.platform === "instagram" ? "Instagram" : "Facebook"}
        </span>
        <Badge status={post.status} />
        <span className="text-xs text-[#6a7480]">
          цел: {post.targetType}{post.targetRef ? ` · ${post.targetRef}` : ""}
        </span>
      </div>

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
        disabled={locked}
        className={`resize-none ${inputCls} disabled:bg-[#f6f3ed]`}
      />
      <input
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
        disabled={locked}
        placeholder="Хаштагове (разделени с интервал)"
        className={`mt-2 ${inputCls} disabled:bg-[#f6f3ed]`}
      />
      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        disabled={locked}
        placeholder="Публичен URL на изображение (нужен за Instagram)"
        className={`mt-2 ${inputCls} disabled:bg-[#f6f3ed]`}
      />
      {post.imagePrompt ? (
        <p className="mt-2 text-xs text-[#6a7480]">💡 Идея за изображение: {post.imagePrompt}</p>
      ) : null}
      {post.externalPostId ? (
        <p className="mt-2 text-xs text-emerald-700">Публикуван · id: {post.externalPostId}</p>
      ) : null}
      {post.publishError ? (
        <p className="mt-2 text-xs text-red-700">{post.publishError}</p>
      ) : null}

      {!locked ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null || !dirty}
            onClick={() =>
              run(`save-${post.id}`, async () => {
                await api(`/api/admin/ai/social-posts/${post.id}`, "PATCH", {
                  caption,
                  hashtags: hashtagArray(),
                  imageUrl,
                });
                return "Запазено.";
              })
            }
            className={btnGhost}
          >
            Запази промените
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run(`publish-${post.id}`, async () => {
                if (dirty) {
                  await api(`/api/admin/ai/social-posts/${post.id}`, "PATCH", {
                    caption,
                    hashtags: hashtagArray(),
                    imageUrl,
                  });
                }
                await api(`/api/admin/ai/social-posts/${post.id}`, "POST");
                return "Публикувано.";
              })
            }
            className={btnPrimary}
          >
            Публикувай
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run(`del-${post.id}`, async () => {
                await api(`/api/admin/ai/social-posts/${post.id}`, "DELETE");
                return "Изтрито.";
              })
            }
            className={btnGhost}
          >
            Изтрий
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SuggestionsSection({
  suggestions,
  busy,
  run,
}: {
  suggestions: AdminSuggestion[];
  busy: string | null;
  run: RunFn;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[#1d2733]">
        Редакторски предложения{" "}
        <span className="text-sm font-normal text-[#6a7480]">({suggestions.length})</span>
      </h2>
      {suggestions.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#5f6b76]">Няма предложения за статии.</p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <article key={s.id} className={`${cardCls} flex flex-wrap items-center gap-3`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[#1d2733]">{s.postTitle}</p>
                  <Badge status={s.status} />
                </div>
                {s.notes ? <p className="mt-1 text-xs text-[#6a7480]">{s.notes}</p> : null}
              </div>
              {s.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`apply-${s.id}`, async () => {
                        await api(`/api/admin/ai/editor-suggestions/${s.id}/apply`, "POST");
                        return "Приложено към статията.";
                      })
                    }
                    className={btnPrimary}
                  >
                    Приложи
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`reject-${s.id}`, async () => {
                        await api(`/api/admin/ai/editor-suggestions/${s.id}`, "PATCH", {
                          status: "rejected",
                        });
                        return "Отхвърлено.";
                      })
                    }
                    className={btnGhost}
                  >
                    Отхвърли
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StrategiesSection({ strategies }: { strategies: AdminStrategy[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[#1d2733]">
        Маркетинг стратегии{" "}
        <span className="text-sm font-normal text-[#6a7480]">({strategies.length})</span>
      </h2>
      {strategies.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#5f6b76]">Няма стратегии.</p>
      ) : (
        <div className="space-y-3">
          {strategies.map((s) => (
            <details key={s.id} className={cardCls}>
              <summary className="cursor-pointer text-sm font-semibold text-[#1d2733]">
                {s.title}
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[10px] bg-[#fbf8f1] p-3 text-xs text-[#4f5b66]">
                {JSON.stringify(s.content, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function CampaignsSection({ campaigns }: { campaigns: AdminCampaign[] }) {
  if (campaigns.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[#1d2733]">История на кампаниите</h2>
      <div className="divide-y divide-[#e7dfd1]">
        {campaigns.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
            <Badge status={c.status} />
            <span className="min-w-0 flex-1 truncate text-sm text-[#1d2733]">{c.goal}</span>
            <span className="text-xs text-[#6a7480]">
              {c.source === "cron" ? "авто" : "ръчно"} ·{" "}
              {new Date(c.createdAt).toLocaleString("bg-BG")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
