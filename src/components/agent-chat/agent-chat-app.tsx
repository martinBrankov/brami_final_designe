"use client";

import { useLocale, useTranslations } from "next-intl";

import { useCallback, useEffect, useRef, useState } from "react";
import { useJsonFetch } from "@/lib/use-json-fetch";

import { ArtifactPreviewCard } from "@/components/agent-chat/artifact-preview-card";
import { StatusBadge } from "@/components/agent-chat/labels";
import { TaskInspector, type TaskControlAction } from "@/components/agent-chat/task-inspector";
import type {
  AgentDefinition,
  ChatMessage,
  ConversationDetail,
  ConversationMember,
  ConversationSummary,
  ModelDefinition,
  TaskDetail,
  TaskStatus,
} from "@/lib/agent-chat/types";

const TERMINAL_TASK_STATUSES: TaskStatus[] = [
  "ready_for_approval",
  "approved",
  "published",
  "failed",
  "cancelled",
  "needs_changes",
];

type Props = {
  initialConversations: ConversationSummary[];
  agents: AgentDefinition[];
  models: ModelDefinition[];
};

export function AgentChatApp({ initialConversations, agents, models }: Props) {
  const t = useTranslations("AgentChat");
  const jsonFetch = useJsonFetch();
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskRunning, setTaskRunning] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const loadDetail = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingDetail(true);
    try {
      const { conversation } = await jsonFetch<{ conversation: ConversationDetail }>(
        `/api/agent-chat/conversations/${id}`,
      );
      setDetail(conversation);
      // Only adopt the stored latest task when no run is being polled.
      if (!runningRef.current) setActiveTaskId(conversation.latestTaskId);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : t("neuspeshnoZarezhdane"));
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  }, [jsonFetch, t]);

  const loadTask = useCallback(async (taskId: string) => {
    try {
      const { task } = await jsonFetch<{ task: TaskDetail }>(`/api/agent-chat/tasks/${taskId}`);
      setTaskDetail(task);
      return task;
    } catch {
      return null;
    }
  }, [jsonFetch]);

  useEffect(() => {
    if (activeId) loadDetail(activeId);
    else {
      setDetail(null);
      setTaskDetail(null);
      setActiveTaskId(null);
    }
  }, [activeId, loadDetail]);

  useEffect(() => {
    if (activeTaskId) loadTask(activeTaskId);
    else setTaskDetail(null);
  }, [activeTaskId, loadTask]);

  // Clean up any running poll on unmount.
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function handleNewConversation() {
    setError(null);
    try {
      const { conversation } = await jsonFetch<{ conversation: ConversationSummary }>(
        "/api/agent-chat/conversations",
        { method: "POST", body: JSON.stringify({}) },
      );
      setConversations((prev) => [conversation, ...prev]);
      setActiveId(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnoSazdavane"));
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    setError(null);

    // Optimistic append.
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversationId: activeId,
      senderType: "user",
      senderId: null,
      messageType: "text",
      content,
      metadata: {},
      parentMessageId: null,
      createdAt: new Date().toISOString(),
    };
    setDetail((d) => (d ? { ...d, messages: [...d.messages, optimistic] } : d));
    setInput("");

    try {
      await jsonFetch(`/api/agent-chat/conversations/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      await loadDetail(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnoIzprashtane"));
      // Roll back the optimistic message.
      setDetail((d) =>
        d ? { ...d, messages: d.messages.filter((m) => m.id !== optimistic.id) } : d,
      );
    } finally {
      setSending(false);
    }
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    runningRef.current = false;
    setTaskRunning(false);
  }

  async function handleRunTask(taskType: "generic" | "article" = "generic") {
    const instruction = input.trim();
    if (!instruction || !activeId || taskRunning) return;
    // Article mode runs its own writer→metadata→QA pipeline; agents are optional.
    if (taskType === "generic") {
      const agentCount = (detail?.members ?? []).filter((m) => m.memberType === "agent").length;
      if (agentCount === 0) {
        setError(t("dobaviPoneEdinAgent"));
        return;
      }
    }
    setError(null);
    setInput("");
    runningRef.current = true;
    setTaskRunning(true);

    try {
      const { taskId } = await jsonFetch<{ taskId: string }>(
        `/api/agent-chat/conversations/${activeId}/tasks`,
        { method: "POST", body: JSON.stringify({ instruction, taskType }) },
      );
      setActiveTaskId(taskId);
      await loadDetail(activeId, true);

      // Poll task + conversation for live progress until the task is terminal.
      pollRef.current = setInterval(async () => {
        const task = await loadTask(taskId);
        if (activeId) await loadDetail(activeId, true);
        if (task && TERMINAL_TASK_STATUSES.includes(task.status)) {
          stopPolling();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnoStartiraneNaZadacha"));
      stopPolling();
    }
  }

  async function handleControl(action: TaskControlAction, instruction?: string) {
    if (!activeTaskId || controlBusy) return;
    setError(null);
    setControlBusy(true);
    try {
      await jsonFetch(`/api/agent-chat/tasks/${activeTaskId}/control`, {
        method: "POST",
        body: JSON.stringify({ action, instruction }),
      });

      if (action === "resume" || action === "retry") {
        // Orchestrator re-triggered in the background — poll for live progress.
        runningRef.current = true;
        setTaskRunning(true);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          const task = await loadTask(activeTaskId);
          if (activeId) await loadDetail(activeId, true);
          if (task && TERMINAL_TASK_STATUSES.includes(task.status)) stopPolling();
        }, 1500);
      } else {
        // pause/stop/redirect are consumed at the next step boundary — refresh
        // shortly so the new status/message appears. Any existing poll also catches it.
        setTimeout(() => {
          void loadTask(activeTaskId);
          if (activeId) void loadDetail(activeId, true);
        }, 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnoDeystvie"));
    } finally {
      setControlBusy(false);
    }
  }

  async function handleAddAgent(agentId: string, modelConfigId: string | null) {
    if (!activeId) return;
    setError(null);
    try {
      await jsonFetch(`/api/agent-chat/conversations/${activeId}/agents`, {
        method: "POST",
        body: JSON.stringify({ agentId, modelConfigId }),
      });
      setPickerOpen(false);
      await loadDetail(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnoDobavyane"));
    }
  }

  async function handleRemoveAgent(memberId: string) {
    if (!activeId) return;
    setError(null);
    try {
      await jsonFetch(`/api/agent-chat/conversations/${activeId}/agents/${memberId}`, {
        method: "DELETE",
      });
      await loadDetail(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnoPremahvane"));
    }
  }

  async function handleChangeModel(memberId: string, modelConfigId: string) {
    if (!activeId) return;
    setError(null);
    try {
      await jsonFetch(`/api/agent-chat/conversations/${activeId}/agents/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ modelConfigId }),
      });
      await loadDetail(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("neuspeshnaSmyanaNaModel"));
    }
  }

  const agentMembers = (detail?.members ?? []).filter((m) => m.memberType === "agent");
  const usedAgentIds = new Set(agentMembers.map((m) => m.agentId));
  const availableAgents = agents.filter((a) => !usedAgentIds.has(a.id));

  return (
    <div className="flex h-[calc(100vh-240px)] min-h-[520px] gap-4">
      {/* Left panel: conversations + agent roster */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-4 overflow-hidden">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNewConversation}
        />
        <AgentRoster
          members={agentMembers}
          models={models}
          disabled={!activeId}
          onAdd={() => setPickerOpen((v) => !v)}
          onRemove={handleRemoveAgent}
          onChangeModel={handleChangeModel}
        />
        {pickerOpen && activeId && (
          <AgentPicker
            agents={availableAgents}
            models={models}
            onPick={handleAddAgent}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </aside>

      {/* Center panel: chat timeline + composer */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e3ddd1] bg-white">
        {error && (
          <div className="border-b border-[#f0d9d9] bg-[#fbf1f1] px-4 py-2 text-sm text-[#a23b3b]">
            {error}
          </div>
        )}
        {!activeId ? (
          <EmptyState onNew={handleNewConversation} />
        ) : (
          <>
            <ChatTimeline
              messages={detail?.messages ?? []}
              loading={loadingDetail}
              onArtifactChanged={() => activeId && loadDetail(activeId, true)}
            />
            <Composer
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onRun={() => handleRunTask("generic")}
              onRunArticle={() => handleRunTask("article")}
              sending={sending}
              running={taskRunning}
              hasAgents={agentMembers.length > 0}
            />
          </>
        )}
      </section>

      {/* Right panel: task inspector (desktop) */}
      {activeId && (
        <div className="hidden xl:flex">
          <TaskInspector task={taskDetail} onControl={handleControl} busy={controlBusy} />
        </div>
      )}
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const t = useTranslations("AgentChat");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  return (
    <div className="flex min-h-0 flex-[3] flex-col overflow-hidden rounded-2xl border border-[#e3ddd1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eee7da] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1d2733]">{t("razgovori")}</h2>
        <button
          onClick={onNew}
          className="inline-flex h-8 items-center rounded-full bg-[#1d2733] px-3 text-xs font-medium text-white transition hover:bg-[#2b3947]"
        >
          {t("novChat")}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-[#8a94a0]">{t("nyamaRazgovoriOshte")}</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`mb-1 flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition ${
                c.id === activeId ? "bg-[#eef2f4]" : "hover:bg-[#f6f4ef]"
              }`}
            >
              <span className="line-clamp-1 text-sm font-medium text-[#1d2733]">{c.title}</span>
              <span className="text-[11px] text-[#8a94a0]">
                {new Date(c.updatedAt).toLocaleString(dateLocale, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function AgentRoster({
  members,
  models,
  disabled,
  onAdd,
  onRemove,
  onChangeModel,
}: {
  members: ConversationMember[];
  models: ModelDefinition[];
  disabled: boolean;
  onAdd: () => void;
  onRemove: (memberId: string) => void;
  onChangeModel: (memberId: string, modelConfigId: string) => void;
}) {
  const t = useTranslations("AgentChat");
  return (
    <div className="flex min-h-0 flex-[2] flex-col overflow-hidden rounded-2xl border border-[#e3ddd1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eee7da] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1d2733]">{t("agenti")}</h2>
        <button
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex h-8 items-center rounded-full border border-[#d9d4ca] px-3 text-xs font-medium text-[#1d2733] transition hover:bg-[#f6f4ef] disabled:opacity-40"
        >
          {t("dobavi")}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {members.length === 0 ? (
          <p className="px-2 py-4 text-sm text-[#8a94a0]">
            {disabled ? t("izberiRazgovor") : t("nyamaAgentiDobaviOt")}
          </p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="mb-2 rounded-xl border border-[#eee7da] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[#1d2733]">{m.agentName}</span>
                <StatusBadge status={m.status} />
              </div>
              {m.agentCategory && (
                <span className="mt-1 inline-block text-[11px] text-[#8a94a0]">
                  {t(`category.${m.agentCategory}`)}
                </span>
              )}
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={m.modelConfigId ?? ""}
                  onChange={(e) => onChangeModel(m.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#d9d4ca] bg-white px-2 py-1 text-xs text-[#1d2733]"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onRemove(m.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-[#a23b3b] transition hover:bg-[#fbf1f1]"
                  title={t("premahniAgenta")}
                >
                  {t("premahni")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AgentPicker({
  agents,
  models,
  onPick,
  onClose,
}: {
  agents: AgentDefinition[];
  models: ModelDefinition[];
  onPick: (agentId: string, modelConfigId: string | null) => void;
  onClose: () => void;
}) {
  const t = useTranslations("AgentChat");
  const [modelByAgent, setModelByAgent] = useState<Record<string, string>>({});

  return (
    <div className="rounded-2xl border border-[#e3ddd1] bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1d2733]">{t("dobaviAgent")}</h3>
        <button onClick={onClose} className="text-xs text-[#8a94a0] hover:text-[#1d2733]">
          {t("zatvori")}
        </button>
      </div>
      {agents.length === 0 ? (
        <p className="py-2 text-sm text-[#8a94a0]">{t("vsichkiAgentiVecheSa")}</p>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => {
            const selected = modelByAgent[a.id] ?? a.defaultModelConfigId ?? models[0]?.id ?? "";
            return (
              <div key={a.id} className="rounded-xl border border-[#eee7da] p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1d2733]">{a.name}</span>
                  <span className="text-[11px] text-[#8a94a0]">
                    {t(`category.${a.category}`)}
                  </span>
                </div>
                {a.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-[#8a94a0]">{a.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={selected}
                    onChange={(e) =>
                      setModelByAgent((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                    className="min-w-0 flex-1 rounded-lg border border-[#d9d4ca] bg-white px-2 py-1 text-xs"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onPick(a.id, selected || null)}
                    className="shrink-0 rounded-lg bg-[#1d2733] px-3 py-1 text-xs font-medium text-white hover:bg-[#2b3947]"
                  >
                    {t("dobavi2")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChatTimeline({
  messages,
  loading,
  onArtifactChanged,
}: {
  messages: ChatMessage[];
  loading: boolean;
  onArtifactChanged?: () => void;
}) {
  const t = useTranslations("AgentChat");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {loading && messages.length === 0 && (
        <p className="text-center text-sm text-[#8a94a0]">{t("zarezhdane")}</p>
      )}
      {!loading && messages.length === 0 && (
        <p className="mt-8 text-center text-sm text-[#8a94a0]">
          {t("napishiSaobshtenieZaDa")}
        </p>
      )}
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} onArtifactChanged={onArtifactChanged} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function MessageRow({
  message,
  onArtifactChanged,
}: {
  message: ChatMessage;
  onArtifactChanged?: () => void;
}) {
  const t = useTranslations("AgentChat");
  if (message.messageType === "artifact" && typeof message.metadata?.artifactId === "string") {
    return (
      <div className="flex justify-start">
        <ArtifactPreviewCard
          artifactId={message.metadata.artifactId as string}
          fallbackName={message.metadata.name as string | undefined}
          fallbackPreviewUrl={message.metadata.previewUrl as string | undefined}
          onChanged={onArtifactChanged}
        />
      </div>
    );
  }

  if (message.senderType === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-[#f4efe5] px-3 py-1 text-[11px] text-[#8a6f45]">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.senderType === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[#1d2733] px-4 py-2 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  // Agent message (text/activity) — shown Phase 2+ when the orchestrator posts.
  const senderLabel = message.senderId ? `${message.senderId}` : t("agent");
  return (
    <div className="flex justify-start">
      <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-[#e3ddd1] bg-[#faf8f3] px-4 py-2 text-sm text-[#1d2733]">
        <span className="mb-0.5 block text-[11px] font-semibold text-[#8a6f45]">{senderLabel}</span>
        {message.content}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onRun,
  onRunArticle,
  sending,
  running,
  hasAgents,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onRun: () => void;
  onRunArticle: () => void;
  sending: boolean;
  running: boolean;
  hasAgents: boolean;
}) {
  const t = useTranslations("AgentChat");
  return (
    <div className="border-t border-[#eee7da] p-3">
      {!hasAgents && (
        <p className="mb-2 rounded-lg bg-[#fdf0d8] px-3 py-1.5 text-[11px] text-[#8a6f45]">
          {t("dobaviAgentOtlyavoNapr")}
          {t("agentButonatIzpratiSamo")}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (hasAgents) onRun();
              else onSend();
            }
          }}
          rows={1}
          placeholder={
            hasAgents
              ? t("opishiZadachaZaAgentite")
              : t("napishiSaobshtenieEnterZa")
          }
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-[#d9d4ca] px-3 py-2 text-sm text-[#1d2733] focus:border-[#8a6f45] focus:outline-none"
        />
        <button
          onClick={onSend}
          disabled={sending || running || !value.trim()}
          title={t("samoSaobshtenieBezStartirane")}
          className="inline-flex h-[42px] shrink-0 items-center rounded-xl border border-[#d9d4ca] px-4 text-sm font-medium text-[#1d2733] transition hover:bg-[#f6f4ef] disabled:opacity-40"
        >
          {sending ? "…" : t("izprati")}
        </button>
        <button
          onClick={onRunArticle}
          disabled={running || !value.trim()}
          title={t("sazdayTsyalaStatiyaWriter")}
          className="inline-flex h-[42px] shrink-0 items-center rounded-xl border border-[#8a6f45] px-4 text-sm font-medium text-[#8a6f45] transition hover:bg-[#faf5ec] disabled:opacity-40"
        >
          {t("statiya")}
        </button>
        <button
          onClick={onRun}
          disabled={running || !value.trim() || !hasAgents}
          title={hasAgents ? t("startirayZadachaSAgentite") : t("dobaviAgentZaDa")}
          className="inline-flex h-[42px] shrink-0 items-center rounded-xl bg-[#1d2733] px-5 text-sm font-medium text-white transition hover:bg-[#2b3947] disabled:opacity-40"
        >
          {running ? t("raboti") : t("zadacha")}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const t = useTranslations("AgentChat");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-[#8a94a0]">{t("izberiRazgovorIliSazday")}</p>
      <button
        onClick={onNew}
        className="inline-flex h-9 items-center rounded-full bg-[#1d2733] px-4 text-sm font-medium text-white hover:bg-[#2b3947]"
      >
        {t("novChat")}
      </button>
    </div>
  );
}
