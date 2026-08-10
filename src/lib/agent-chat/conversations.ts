import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getAgentById, getModelById } from "@/lib/agent-chat/registry";
import { getLatestTaskId } from "@/lib/agent-chat/tasks";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationMember,
  ConversationSummary,
  MemberStatus,
  MessageType,
  SenderType,
} from "@/lib/agent-chat/types";

// Server-side data-access for conversations, members and messages. All access
// goes through the service-role client and is guarded by the caller (admin
// session) — RLS is enabled with no permissive policies (see migration 027).

const nowIso = () => new Date().toISOString();

// Statuses at which an agent member can be removed without stopping a task.
// (No running tasks exist yet in Phase 1; this keeps the rule in one place.)
const REMOVABLE_STATUSES: MemberStatus[] = ["idle", "completed", "failed"];

type ConversationRow = {
  id: string;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

function mapConversation(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listConversations(limit = 50): Promise<ConversationSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, status, created_at, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Неуспешно зареждане на чатове: ${error.message}`);
  return (data ?? []).map((r) => mapConversation(r as ConversationRow));
}

export async function createConversation(input: {
  title?: string;
  createdBy: string | null;
}): Promise<ConversationSummary> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      title: input.title?.trim() || "Нов чат",
      created_by: input.createdBy,
    })
    .select("id, title, status, created_at, updated_at")
    .single<ConversationRow>();
  if (error || !data) {
    throw new Error(`Неуспешно създаване на чат: ${error?.message ?? "unknown"}`);
  }

  // Register the creating human as a member so the roster shows them.
  if (input.createdBy) {
    await supabase.from("conversation_members").insert({
      conversation_id: data.id,
      member_type: "user",
      user_id: input.createdBy,
      status: "idle",
    });
  }

  return mapConversation(data);
}

type MemberRow = {
  id: string;
  member_type: "user" | "agent";
  user_id: string | null;
  agent_id: string | null;
  model_config_id: string | null;
  status: MemberStatus;
  joined_at: string;
  agents: { key: string; name: string; category: string } | null;
  model_configs: { display_name: string } | null;
};

function mapMember(row: MemberRow): ConversationMember {
  return {
    id: row.id,
    memberType: row.member_type,
    userId: row.user_id,
    agentId: row.agent_id,
    agentKey: row.agents?.key ?? null,
    agentName: row.agents?.name ?? null,
    agentCategory: (row.agents?.category as ConversationMember["agentCategory"]) ?? null,
    modelConfigId: row.model_config_id,
    modelDisplayName: row.model_configs?.display_name ?? null,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

const MEMBER_SELECT =
  "id, member_type, user_id, agent_id, model_config_id, status, joined_at, agents(key, name, category), model_configs(display_name)";

async function loadMembers(conversationId: string): Promise<ConversationMember[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversation_members")
    .select(MEMBER_SELECT)
    .eq("conversation_id", conversationId)
    .is("removed_at", null)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(`Неуспешно зареждане на членове: ${error.message}`);
  return (data ?? []).map((r) => mapMember(r as unknown as MemberRow));
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  message_type: MessageType;
  content: string;
  metadata_json: Record<string, unknown> | null;
  parent_message_id: string | null;
  created_at: string;
};

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    messageType: row.message_type,
    content: row.content,
    metadata: row.metadata_json ?? {},
    parentMessageId: row.parent_message_id,
    createdAt: row.created_at,
  };
}

const MESSAGE_SELECT =
  "id, conversation_id, sender_type, sender_id, message_type, content, metadata_json, parent_message_id, created_at";

export async function loadMessages(conversationId: string, limit = 200): Promise<ChatMessage[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Неуспешно зареждане на съобщения: ${error.message}`);
  return (data ?? []).map((r) => mapMessage(r as MessageRow));
}

/** Active agent members of a conversation — used by the orchestrator. */
export async function getAgentMembers(conversationId: string): Promise<ConversationMember[]> {
  const members = await loadMembers(conversationId);
  return members.filter((m) => m.memberType === "agent");
}

/** Sets an agent member's live status badge. */
export async function setMemberStatus(
  memberId: string,
  status: MemberStatus,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("conversation_members").update({ status }).eq("id", memberId);
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, status, created_at, updated_at")
    .eq("id", id)
    .maybeSingle<ConversationRow>();
  if (error) throw new Error(`Неуспешно зареждане на чат: ${error.message}`);
  if (!data) return null;

  const [members, messages, latestTaskId] = await Promise.all([
    loadMembers(id),
    loadMessages(id),
    getLatestTaskId(id),
  ]);
  return { ...mapConversation(data), members, messages, latestTaskId };
}

async function touchConversation(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("conversations").update({ updated_at: nowIso() }).eq("id", id);
}

/** Adds an agent to a conversation with a chosen (or default) model config. */
export async function addAgentToConversation(
  conversationId: string,
  agentId: string,
  modelConfigId?: string | null,
): Promise<ConversationMember> {
  const agent = await getAgentById(agentId);
  if (!agent || !agent.enabled) throw new Error("Непознат или изключен агент.");

  // Resolve the model: explicit choice → validate; otherwise agent default.
  let resolvedModelId = agent.defaultModelConfigId;
  if (modelConfigId) {
    const model = await getModelById(modelConfigId);
    if (!model) throw new Error("Непознат модел.");
    resolvedModelId = model.id;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversation_members")
    .insert({
      conversation_id: conversationId,
      member_type: "agent",
      agent_id: agentId,
      model_config_id: resolvedModelId,
      status: "idle",
    })
    .select(MEMBER_SELECT)
    .single();
  if (error) {
    // Unique partial index → agent already active in this conversation.
    if (error.code === "23505") throw new Error("Агентът вече е добавен към този чат.");
    throw new Error(`Неуспешно добавяне на агент: ${error.message}`);
  }
  await touchConversation(conversationId);
  return mapMember(data as unknown as MemberRow);
}

/** Soft-removes an agent member (preserves history). Only when not running. */
export async function removeMember(conversationId: string, memberId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: member, error: loadErr } = await supabase
    .from("conversation_members")
    .select("id, member_type, status")
    .eq("id", memberId)
    .eq("conversation_id", conversationId)
    .maybeSingle<{ id: string; member_type: string; status: MemberStatus }>();
  if (loadErr) throw new Error(`Неуспешно зареждане на член: ${loadErr.message}`);
  if (!member) throw new Error("Членът не е намерен.");
  if (member.member_type !== "agent") throw new Error("Само агенти могат да се премахват.");
  if (!REMOVABLE_STATUSES.includes(member.status)) {
    throw new Error("Агентът работи — първо го спри, преди да го премахнеш.");
  }

  const { error } = await supabase
    .from("conversation_members")
    .update({ removed_at: nowIso() })
    .eq("id", memberId);
  if (error) throw new Error(`Неуспешно премахване на агент: ${error.message}`);
  await touchConversation(conversationId);
}

/** Changes the model an agent member will use for future tasks. */
export async function updateMemberModel(
  conversationId: string,
  memberId: string,
  modelConfigId: string,
): Promise<void> {
  const model = await getModelById(modelConfigId);
  if (!model) throw new Error("Непознат модел.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ model_config_id: modelConfigId })
    .eq("id", memberId)
    .eq("conversation_id", conversationId)
    .eq("member_type", "agent");
  if (error) throw new Error(`Неуспешна смяна на модел: ${error.message}`);
  await touchConversation(conversationId);
}

export async function postMessage(input: {
  conversationId: string;
  senderType: SenderType;
  senderId?: string | null;
  messageType?: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<ChatMessage> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_type: input.senderType,
      sender_id: input.senderId ?? null,
      message_type: input.messageType ?? "text",
      content: input.content,
      metadata_json: input.metadata ?? {},
    })
    .select(MESSAGE_SELECT)
    .single<MessageRow>();
  if (error || !data) {
    throw new Error(`Неуспешно записване на съобщение: ${error?.message ?? "unknown"}`);
  }
  await touchConversation(input.conversationId);
  return mapMessage(data);
}
