"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminUserProfile } from "@/lib/admin-data";

type UserDraft = Record<string, string | boolean>;

function toDraft(user: AdminUserProfile): UserDraft {
  return {
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    city: user.city,
    postalCode: user.postalCode,
    address: user.address,
    role: user.role,
    marketingSubscription: user.marketingSubscription,
  };
}

const ROLE_LABELS: Record<string, string> = {
  user: "Потребител",
  super_user: "Супер потребител",
  admin: "Админ",
};

export function AdminUsersManager({ users }: { users: AdminUserProfile[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(
    Object.fromEntries(users.map((user) => [user.id, toDraft(user)])),
  );
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modalUser = modalUserId ? users.find((u) => u.id === modalUserId) ?? null : null;
  const modalDraft = modalUserId ? drafts[modalUserId] : null;

  function updateDraft(userId: string, key: string, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], [key]: value },
    }));
  }

  function openModal(userId: string) {
    setFeedback(null);
    setModalUserId(userId);
  }

  function closeModal() {
    setModalUserId(null);
    setFeedback(null);
  }

  async function saveUser(userId: string) {
    setFeedback(null);
    const draft = drafts[userId];

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      setFeedback(result?.error || "Неуспешен запис на потребителя.");
      return;
    }

    setFeedback("Промените са записани.");
    startTransition(() => { router.refresh(); });
  }

  if (!users.length) {
    return (
      <p className="py-12 text-center text-sm text-[#5f6b76]">
        Няма регистрирани потребители.
      </p>
    );
  }

  return (
    <>
      <div>
        <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(200px,1.2fr)_100px_120px_80px] gap-3 border-b border-[#e7dfd1] pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61] lg:grid">
          <span>Потребител</span>
          <span>Имейл</span>
          <span>Телефон</span>
          <span>Роля</span>
          <span className="text-right">Действие</span>
        </div>

        <div className="divide-y divide-[#e7dfd1]">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-3 py-4 lg:grid-cols-[minmax(180px,1fr)_minmax(200px,1.2fr)_100px_120px_80px] lg:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-[#1d2733]">{user.username || "—"}</p>
                <p className="mt-0.5 text-xs text-[#6a7480]">
                  {new Date(user.createdAt).toLocaleDateString("bg-BG")}
                </p>
              </div>

              <p className="truncate text-sm text-[#4f5b66]">{user.email}</p>

              <p className="text-sm text-[#4f5b66]">{user.phone || "—"}</p>

              <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                user.role === "admin"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : user.role === "super_user"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-[#d2c8b8] bg-[#f8f4ec] text-[#5f6b76]"
              }`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>

              <div className="flex justify-end order-first lg:order-none">
                <button
                  type="button"
                  onClick={() => openModal(user.id)}
                  title="Редактирай"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalUser && modalDraft && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">

              <div className="mb-5 space-y-2">
                <div className="flex items-center justify-end gap-2">
                  {feedback && (
                    <p className={`mr-auto text-xs font-medium ${feedback.includes("Неуспешен") ? "text-red-600" : "text-emerald-700"}`}>
                      {feedback}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveUser(modalUser.id)}
                    disabled={isPending}
                    title="Запази"
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#1d2733] text-white transition hover:bg-[#2b3847] disabled:opacity-60"
                  >
                    {isPending
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d2c8b8] bg-white text-[#5f6b76] transition hover:bg-[#f8f4ec]"
                    aria-label="Затвори"
                  >
                    ✕
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-[#1d2733]">{modalUser.username || modalUser.email}</p>
                  <p className="text-xs text-[#6a7480]">
                    Създаден: {new Date(modalUser.createdAt).toLocaleString("bg-BG")}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#e7dfd1] pt-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Username</span>
                    <input
                      value={String(modalDraft.username ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "username", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Email</span>
                    <input
                      value={String(modalDraft.email ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "email", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Телефон</span>
                    <input
                      value={String(modalDraft.phone ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "phone", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Държава</span>
                    <input
                      value={String(modalDraft.country ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "country", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Град</span>
                    <input
                      value={String(modalDraft.city ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "city", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Пощенски код</span>
                    <input
                      value={String(modalDraft.postalCode ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "postalCode", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Адрес</span>
                    <input
                      value={String(modalDraft.address ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "address", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">Роля</span>
                    <select
                      value={String(modalDraft.role ?? "user")}
                      onChange={(e) => updateDraft(modalUser.id, "role", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    >
                      <option value="user">Потребител</option>
                      <option value="super_user">Супер потребител</option>
                      <option value="admin">Админ</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-3 pt-7 text-sm font-medium text-[#25313d] xl:col-span-3">
                    <input
                      type="checkbox"
                      checked={Boolean(modalDraft.marketingSubscription)}
                      onChange={(e) => updateDraft(modalUser.id, "marketingSubscription", e.target.checked)}
                      className="h-4 w-4 rounded border-[#bca5cc] accent-[#1d2733]"
                    />
                    Marketing subscription
                  </label>
                </div>
              </div>
          </div>
        </div>
      )}
    </>
  );
}
