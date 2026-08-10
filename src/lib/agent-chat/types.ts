// Shared types for the AI Agent Chat. Kept framework-agnostic so server
// data-access, API routes and client components share one vocabulary.

export type AgentCategory =
  | "orchestration"
  | "planning"
  | "content"
  | "image"
  | "ads"
  | "review"
  | "publishing"
  | "utility";

export type MemberStatus =
  | "idle"
  | "planning"
  | "working"
  | "waiting"
  | "paused"
  | "failed"
  | "completed";

export type ConversationStatus = "active" | "archived";

export type SenderType = "user" | "agent" | "system";

export type MessageType =
  | "text"
  | "activity"
  | "question"
  | "artifact"
  | "error"
  | "approval";

export type ModelDefinition = {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  capabilities: string[];
  enabled: boolean;
  isFreeTier?: boolean;
};

export type AgentDefinition = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: AgentCategory;
  capabilities: string[];
  implementationRef: string | null;
  defaultModelConfigId: string | null;
  enabled: boolean;
};

export type ConversationMember = {
  id: string;
  memberType: "user" | "agent";
  userId: string | null;
  agentId: string | null;
  agentKey: string | null;
  agentName: string | null;
  agentCategory: AgentCategory | null;
  modelConfigId: string | null;
  modelDisplayName: string | null;
  status: MemberStatus;
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string | null;
  messageType: MessageType;
  content: string;
  metadata: Record<string, unknown>;
  parentMessageId: string | null;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetail = ConversationSummary & {
  members: ConversationMember[];
  messages: ChatMessage[];
  latestTaskId: string | null;
};

// ── Tasks (Phase 2) ─────────────────────────────────────────────────────────

export type TaskStatus =
  | "draft"
  | "queued"
  | "planning"
  | "ready"
  | "running"
  | "waiting_for_dependency"
  | "waiting_for_user"
  | "paused"
  | "reviewing"
  | "needs_changes"
  | "ready_for_approval"
  | "approved"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type PlanStep = {
  id: string;
  agentKey: string;
  instruction: string;
  dependsOn: string[];
  expectedOutput: string;
};

export type TaskPlan = {
  goal: string;
  rationale: string;
  steps: PlanStep[];
};

export type TaskRunView = {
  id: string;
  agentKey: string | null;
  agentName: string | null;
  status: "running" | "succeeded" | "failed" | "cancelled";
  usage: { inputTokens: number; outputTokens: number } | null;
  error: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type TaskEventView = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  visibility: "internal" | "user_summary" | "debug";
  createdAt: string;
};

export type TaskDetail = {
  id: string;
  conversationId: string;
  status: TaskStatus;
  title: string;
  plan: TaskPlan | null;
  planSummary: string | null;
  runs: TaskRunView[];
  events: TaskEventView[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};
