import { NextResponse } from "next/server";

import { generateAndSaveBlogDraft, type GenerateResult } from "@/lib/blog-generate";
import { createMailer, getSender } from "@/lib/order-mail/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generation + email can take 30-50s — extend the function timeout.
export const maxDuration = 90;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Without a secret configured we refuse — never allow open access.
    return false;
  }
  const header = request.headers.get("authorization");
  // Vercel Cron sends: "Authorization: Bearer <CRON_SECRET>"
  return header === `Bearer ${secret}`;
}

function resolveSiteOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return "https://brami.shop";
}

function resolveRecipients(): string[] {
  const explicit = process.env.BLOG_NOTIFY_EMAIL;
  if (explicit) {
    return explicit.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const fallback = process.env.SALES_ORDER_EMAIL;
  return fallback ? [fallback] : [];
}

function renderRecentList(result: GenerateResult): string {
  // Drop the freshly-created draft itself if it slipped into the snapshot
  // (it was queried before insert, so usually it won't be, but be safe).
  const items = result.recentArticles.filter((r) => r.title !== result.title);
  if (items.length === 0) return "";

  // Group by eyebrow category for editorial perspective.
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.eyebrow?.trim() || "Без категория";
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }

  const groupHtml = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, list]) => {
      const rows = list
        .map((item) => {
          const date = new Date(item.createdAt).toLocaleDateString("bg-BG", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });
          const status = item.published
            ? '<span style="font-size:10px;color:#218a54;font-weight:600;">публикувана</span>'
            : '<span style="font-size:10px;color:#8a9099;font-weight:600;">чернова</span>';
          return `<li style="margin:4px 0;font-size:12px;color:#4f5b66;line-height:1.5;">
              <span style="color:#1d2733;">${escapeHtml(item.title)}</span>
              <span style="color:#8a9099;"> · ${escapeHtml(date)} · </span>${status}
            </li>`;
        })
        .join("");
      return `<div style="margin-bottom:14px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8a6f45;">${escapeHtml(category)} (${list.length})</p>
        <ul style="margin:0;padding:0 0 0 18px;list-style:disc;">${rows}</ul>
      </div>`;
    })
    .join("");

  return `<div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee5d4;">
    <h2 style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1d2733;">Какво вече има в блога (последните ${items.length})</h2>
    <p style="margin:0 0 14px;font-size:12px;color:#7c8a96;">Списък по категории — AI ползва това за избягване на дублиране и продължаване на редакторския план.</p>
    ${groupHtml}
  </div>`;
}

function renderEmailHtml(result: GenerateResult, origin: string) {
  const editUrl = `${origin}/admin-panel/blog`;
  const previewUrl = `${origin}/blog/${result.slug}`; // works once the admin publishes

  return `<!DOCTYPE html>
<html lang="bg">
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4efe5;color:#1d2733;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a6f45;">Brami · AI блог</p>
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:600;color:#1d2733;">Нова чернова е готова за преглед</h1>

      <p style="margin:0 0 8px;font-size:14px;color:#4f5b66;">Генерирана автоматично от ${escapeHtml(result.model)} в ${escapeHtml(new Date().toLocaleString("bg-BG", { timeZone: "Europe/Sofia" }))} часа.</p>

      <div style="margin:18px 0;padding:16px;background:#fdf8ee;border-left:3px solid #d8b36b;border-radius:8px;">
        <p style="margin:0;font-size:16px;font-weight:600;color:#1d2733;">${escapeHtml(result.title)}</p>
        ${result.excerpt ? `<p style="margin:8px 0 0;font-size:13px;color:#5f6b76;line-height:1.5;">${escapeHtml(result.excerpt)}</p>` : ""}
      </div>

      <p style="margin:0 0 14px;font-size:14px;color:#4f5b66;">Статията е запазена като <strong>чернова</strong>. Прегледай я, редактирай ако е нужно, и я публикувай ръчно от админ панела.</p>

      <p style="margin:24px 0 8px;">
        <a href="${editUrl}" style="display:inline-block;background:#1d2733;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600;">
          Отвори в админ панела
        </a>
      </p>

      <p style="margin:18px 0 0;font-size:12px;color:#8a9099;">
        Slug: <code style="background:#f4efe5;padding:2px 6px;border-radius:4px;">${escapeHtml(result.slug)}</code>
        · след публикуване: <a href="${previewUrl}" style="color:#3d73b8;">${escapeHtml(previewUrl)}</a>
      </p>

      ${renderRecentList(result)}
    </div>

    <p style="margin:18px auto 0;max-width:600px;font-size:11px;color:#8a9099;text-align:center;">
      Този мейл е изпратен автоматично от cron job-а на Brami. Промени получателя чрез <code>BLOG_NOTIFY_EMAIL</code> в Vercel env.
    </p>
  </body>
</html>`;
}

function renderEmailText(result: GenerateResult, origin: string) {
  const editUrl = `${origin}/admin-panel/blog`;
  const recent = result.recentArticles.filter((r) => r.title !== result.title);
  const recentText = recent.length
    ? [
        "",
        `Какво вече има в блога (последните ${recent.length}):`,
        ...recent.map((r) => {
          const date = new Date(r.createdAt).toLocaleDateString("bg-BG");
          const status = r.published ? "пуб." : "чернова";
          const cat = r.eyebrow ? ` [${r.eyebrow}]` : "";
          return `  · ${r.title}${cat} — ${date}, ${status}`;
        }),
      ]
    : [];
  return [
    "Brami · AI блог",
    "",
    `Нова чернова: ${result.title}`,
    result.excerpt ?? "",
    "",
    `Преглед и публикуване: ${editUrl}`,
    `Slug: ${result.slug}`,
    `Модел: ${result.model}`,
    ...recentText,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

async function sendNotification(result: GenerateResult, origin: string) {
  const recipients = resolveRecipients();
  if (recipients.length === 0) {
    console.warn("[cron blog-daily] no recipient configured — skipping email");
    return { sent: false, reason: "no recipient" };
  }

  try {
    const mailer = createMailer();
    await mailer.sendMail({
      from: getSender(),
      to: recipients,
      subject: `📝 Нова AI чернова: ${result.title}`,
      text: renderEmailText(result, origin),
      html: renderEmailHtml(result, origin),
    });
    return { sent: true, recipients };
  } catch (err) {
    console.error("[cron blog-daily] mail send failed:", err);
    return { sent: false, reason: err instanceof Error ? err.message : "mail error" };
  }
}

// Vercel Cron fires this with GET; we also accept POST for manual smoke tests.
async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let result: GenerateResult;
  try {
    result = await generateAndSaveBlogDraft({ auto: true });
  } catch (err) {
    console.error("[cron blog-daily] generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 502 },
    );
  }

  const origin = resolveSiteOrigin(request);
  const mail = await sendNotification(result, origin);

  return NextResponse.json({
    ok: true,
    draftId: result.id,
    slug: result.slug,
    title: result.title,
    model: result.model,
    mail,
  });
}

export const GET = handle;
export const POST = handle;
