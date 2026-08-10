import "server-only";

import type { ModelChoice } from "@/lib/ai/client";
import { generateArticle, getArticleBody } from "@/lib/agent-chat/agents/writer";
import { generateMetadata } from "@/lib/agent-chat/agents/metadata";
import { reviewArticle } from "@/lib/agent-chat/agents/qa";
import { createArtifact } from "@/lib/agent-chat/artifacts";
import { getAgentMembers, postMessage, setMemberStatus } from "@/lib/agent-chat/conversations";
import { getModelById } from "@/lib/agent-chat/registry";
import { emitEvent, finishRun, setTaskStatus, startRun } from "@/lib/agent-chat/tasks";
import type { ConversationMember } from "@/lib/agent-chat/types";

// Article workflow (Phase 4): writer → metadata → QA → artifact (pending approval).
// A dedicated pipeline (not the generic planner) for task_type "article". Each
// step records a run + event + short chat message for live progress. Publishing
// happens later, only on explicit approval (see artifacts.ts).

async function memberModel(
  members: ConversationMember[],
  key: string,
): Promise<ModelChoice | null> {
  const m = members.find((mm) => mm.agentKey === key);
  if (!m?.modelConfigId) return null;
  const mc = await getModelById(m.modelConfigId);
  return mc ? { provider: mc.provider, modelId: mc.modelId } : null;
}

function agentId(members: ConversationMember[], key: string): string | null {
  return members.find((mm) => mm.agentKey === key)?.agentId ?? null;
}

async function activity(conversationId: string, taskId: string, agentKey: string, text: string) {
  await postMessage({
    conversationId,
    senderType: "agent",
    senderId: agentKey,
    messageType: "activity",
    content: text,
    metadata: { taskId },
  });
}

export async function runArticleTask(input: {
  taskId: string;
  conversationId: string;
  instruction: string;
}): Promise<void> {
  const { taskId, conversationId, instruction } = input;
  const members = await getAgentMembers(conversationId);

  try {
    await setTaskStatus(taskId, "running");

    // ── Writer ────────────────────────────────────────────────────────────
    await activity(conversationId, taskId, "writer", "Writer: Пиша статията по темата…");
    const writerRun = await startRun({
      taskId,
      agentId: agentId(members, "writer"),
      modelConfigId: null,
      inputSnapshot: { instruction, step: "write" },
    });
    const article = await generateArticle(instruction);
    await finishRun(writerRun, {
      status: "succeeded",
      output: { postId: article.postId, slug: article.slug, title: article.title },
    });
    await emitEvent({
      taskId,
      eventType: "step_done",
      payload: { step: "write", postId: article.postId },
      visibility: "user_summary",
    });
    await activity(conversationId, taskId, "writer", `Writer: Черновата „${article.title}" е готова.`);

    const body = await getArticleBody(article.postId);

    // ── Metadata ──────────────────────────────────────────────────────────
    await activity(conversationId, taskId, "metadata", "Metadata: Подготвям SEO метаданните…");
    const metaRun = await startRun({
      taskId,
      agentId: agentId(members, "metadata"),
      modelConfigId: null,
      inputSnapshot: { step: "metadata" },
    });
    const metadata = await generateMetadata(
      { title: article.title, excerpt: article.excerpt, body },
      await memberModel(members, "metadata"),
    );
    await finishRun(metaRun, { status: "succeeded", output: { metaTitle: metadata.metaTitle } });
    await activity(conversationId, taskId, "metadata", "Metadata: Метаданните са готови.");

    // ── QA ────────────────────────────────────────────────────────────────
    await activity(conversationId, taskId, "qa", "QA: Проверявам статията…");
    const qaRun = await startRun({
      taskId,
      agentId: agentId(members, "qa"),
      modelConfigId: null,
      inputSnapshot: { step: "qa" },
    });
    const qa = await reviewArticle(
      { title: article.title, body },
      await memberModel(members, "qa"),
    );
    await finishRun(qaRun, { status: "succeeded", output: { ok: qa.ok, issues: qa.issues.length } });
    await activity(conversationId, taskId, "qa", `QA: ${qa.summary}`);

    // ── Artifact + approval ────────────────────────────────────────────────
    const previewUrl = `/beauty-care/${article.slug}`;
    const artifactId = await createArtifact({
      conversationId,
      taskId,
      artifactType: "article",
      name: article.title,
      previewUrl,
      content: { title: article.title, excerpt: article.excerpt, metadata },
      metadata: { postId: article.postId, slug: article.slug, metadata, qa },
      agentId: agentId(members, "writer"),
      status: "ready_for_approval",
    });

    await setTaskStatus(taskId, "ready_for_approval", { output_json: { artifactId } });
    await postMessage({
      conversationId,
      senderType: "system",
      senderId: null,
      messageType: "artifact",
      content: `Статията „${article.title}" е готова за преглед.`,
      metadata: { taskId, artifactId, artifactType: "article", previewUrl, name: article.title },
    });

    for (const m of members) await setMemberStatus(m.id, "idle");
  } catch (err) {
    const message = err instanceof Error ? err.message : "неизвестна грешка";
    await setTaskStatus(taskId, "failed", { error_json: { message } });
    await emitEvent({ taskId, eventType: "task_failed", payload: { error: message }, visibility: "user_summary" });
    await postMessage({
      conversationId,
      senderType: "system",
      senderId: null,
      messageType: "error",
      content: `Създаването на статията се провали: ${message}`,
      metadata: { taskId },
    });
    for (const m of members) await setMemberStatus(m.id, "idle");
  }
}
