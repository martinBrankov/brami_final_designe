import { NextResponse } from "next/server";

import { generateCampaign, type CampaignResult } from "@/lib/ai/agents/manager";
import { createMailer, getMailRecipient, getSender } from "@/lib/order-mail/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_GOAL =
  "Седмична маркетинг активност: популяризирай актуални продукти и марката Brami в социалните мрежи и поддържай блога свеж.";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function resolveRecipients(): string[] {
  const explicit = process.env.BLOG_NOTIFY_EMAIL || process.env.SALES_ORDER_EMAIL;
  return explicit ? explicit.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function renderText(result: CampaignResult): string {
  const lines = result.outcomes.map(
    (o) => `  ${o.ok ? "✓" : "✗"} ${o.agent}: ${o.detail}`,
  );
  return [
    "Brami · AI маркетинг кампания",
    "",
    `Цел: ${result.goal}`,
    result.rationale ? `План: ${result.rationale}` : "",
    "",
    "Резултати:",
    ...lines,
    "",
    "Прегледай и одобри в админ панела: /admin-panel/ai",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendNotification(result: CampaignResult) {
  const recipients = resolveRecipients();
  if (recipients.length === 0) {
    console.warn("[cron ai-marketing] no recipient configured — skipping email");
    return;
  }
  try {
    const mailer = createMailer();
    await mailer.sendMail({
      from: getSender(),
      to: getMailRecipient(recipients),
      subject: "🤖 Нова AI маркетинг кампания (чернови за преглед)",
      text: renderText(result),
    });
  } catch (err) {
    console.error("[cron ai-marketing] mail send failed:", err);
  }
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let result: CampaignResult;
  try {
    result = await generateCampaign(DEFAULT_GOAL, { source: "cron" });
  } catch (err) {
    console.error("[cron ai-marketing] campaign failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Campaign failed" },
      { status: 502 },
    );
  }

  await sendNotification(result);
  return NextResponse.json({ ok: true, campaignId: result.campaignId, outcomes: result.outcomes });
}

export const GET = handle;
export const POST = handle;
