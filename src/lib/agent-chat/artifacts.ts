import "server-only";

import { SITE_URL } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Artifacts + approvals (Phase 4). Unified preview/approval/publish for produced
// deliverables. An article artifact references a blog_posts draft; publishing
// flips that draft to published and records the public URL.

export type ArtifactStatus =
  | "draft"
  | "reviewing"
  | "ready_for_approval"
  | "changes_requested"
  | "approved"
  | "publishing"
  | "published"
  | "rejected";

export type ArtifactView = {
  id: string;
  conversationId: string | null;
  taskId: string | null;
  artifactType: string;
  name: string;
  status: ArtifactStatus;
  previewUrl: string | null;
  publishedUrl: string | null;
  metadata: Record<string, unknown>;
  currentVersion: number;
  createdAt: string;
};

const nowIso = () => new Date().toISOString();

export async function createArtifact(input: {
  conversationId: string;
  taskId: string | null;
  artifactType: string;
  name: string;
  previewUrl?: string | null;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  agentId?: string | null;
  status?: ArtifactStatus;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("artifacts")
    .insert({
      conversation_id: input.conversationId,
      task_id: input.taskId,
      artifact_type: input.artifactType,
      name: input.name,
      status: input.status ?? "ready_for_approval",
      preview_url: input.previewUrl ?? null,
      metadata_json: input.metadata ?? {},
      current_version: 1,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    throw new Error(`Неуспешно създаване на artifact: ${error?.message ?? "unknown"}`);
  }

  await supabase.from("artifact_versions").insert({
    artifact_id: data.id,
    version: 1,
    content_json: input.content,
    created_by_agent_id: input.agentId ?? null,
  });

  await supabase.from("approvals").insert({
    artifact_id: data.id,
    version: 1,
    status: "pending",
  });

  return data.id;
}

type ArtifactRow = {
  id: string;
  conversation_id: string | null;
  task_id: string | null;
  artifact_type: string;
  name: string;
  status: ArtifactStatus;
  preview_url: string | null;
  published_url: string | null;
  metadata_json: Record<string, unknown> | null;
  current_version: number;
  created_at: string;
};

function mapArtifact(row: ArtifactRow): ArtifactView {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    taskId: row.task_id,
    artifactType: row.artifact_type,
    name: row.name,
    status: row.status,
    previewUrl: row.preview_url,
    publishedUrl: row.published_url,
    metadata: row.metadata_json ?? {},
    currentVersion: row.current_version,
    createdAt: row.created_at,
  };
}

const ARTIFACT_SELECT =
  "id, conversation_id, task_id, artifact_type, name, status, preview_url, published_url, metadata_json, current_version, created_at";

export async function getArtifact(id: string): Promise<ArtifactView | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(ARTIFACT_SELECT)
    .eq("id", id)
    .maybeSingle<ArtifactRow>();
  if (error) throw new Error(`Неуспешно зареждане на artifact: ${error.message}`);
  return data ? mapArtifact(data) : null;
}

/** Approve / reject / request-changes on an artifact's pending approval. */
export async function resolveApproval(input: {
  artifactId: string;
  userId: string | null;
  action: "approve" | "reject" | "request_changes";
  comment?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const statusByAction: Record<typeof input.action, ArtifactStatus> = {
    approve: "approved",
    reject: "rejected",
    request_changes: "changes_requested",
  };
  const approvalStatus =
    input.action === "approve"
      ? "approved"
      : input.action === "reject"
        ? "rejected"
        : "changes_requested";

  await supabase
    .from("approvals")
    .update({
      status: approvalStatus,
      comment: input.comment ?? null,
      resolved_at: nowIso(),
      resolved_by: input.userId,
    })
    .eq("artifact_id", input.artifactId)
    .eq("status", "pending");

  await supabase
    .from("artifacts")
    .update({ status: statusByAction[input.action], updated_at: nowIso() })
    .eq("id", input.artifactId);
}

export type PublishOutcome = { publishedUrl: string };

/**
 * Publishes an approved artifact. For articles: flips the referenced blog_posts
 * draft to published and returns the public URL. Publishing is a separate,
 * permissioned step — never automatic.
 */
export async function publishArtifact(artifactId: string): Promise<PublishOutcome> {
  const artifact = await getArtifact(artifactId);
  if (!artifact) throw new Error("Artifact не е намерен.");
  if (artifact.status === "published") {
    if (artifact.publishedUrl) return { publishedUrl: artifact.publishedUrl };
    throw new Error("Artifact вече е публикуван.");
  }
  if (artifact.status !== "approved") {
    throw new Error("Artifact трябва да е одобрен преди публикуване.");
  }

  const supabase = createSupabaseAdminClient();

  if (artifact.artifactType === "article") {
    const postId = artifact.metadata.postId as string | undefined;
    const slug = artifact.metadata.slug as string | undefined;
    if (!postId || !slug) throw new Error("Липсва връзка към блог статията.");

    const { error: pubErr } = await supabase
      .from("blog_posts")
      .update({ published: true, published_at: nowIso() })
      .eq("id", postId);
    if (pubErr) throw new Error(`Неуспешно публикуване на статия: ${pubErr.message}`);

    const publishedUrl = `${SITE_URL}/beauty-care/${slug}`;
    await supabase
      .from("artifacts")
      .update({ status: "published", published_url: publishedUrl, updated_at: nowIso() })
      .eq("id", artifactId);
    return { publishedUrl };
  }

  throw new Error(`Публикуване на тип „${artifact.artifactType}" още не се поддържа.`);
}
