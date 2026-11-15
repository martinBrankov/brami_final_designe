"use client";

import { useLocale, useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminUserProfile } from "@/lib/admin-data";

type UserDraft = Record<string, string | boolean | number>;

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
    merchantDiscountPercent: user.merchantDiscountPercent,
  };
}

const ROLES = new Set(["user", "merchant", "admin"]);

export function AdminUsersManager({
  users,
  canManageMerchant = false,
}: {
  users: AdminUserProfile[];
  canManageMerchant?: boolean;
}) {
  const t = useTranslations("AdminUsers");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(
    Object.fromEntries(users.map((user) => [user.id, toDraft(user)])),
  );
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modalUser = modalUserId ? users.find((u) => u.id === modalUserId) ?? null : null;
  const modalDraft = modalUserId ? drafts[modalUserId] : null;

  function updateDraft(userId: string, key: string, value: string | boolean | number) {
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
      setFeedback(result?.error || t("neuspeshenZapisNaPotrebitelya"));
      return;
    }

    setFeedback(t("promeniteSaZapisani"));
    startTransition(() => { router.refresh(); });
  }

  if (!users.length) {
    return (
      <p className="py-12 text-center text-sm text-[#5f6b76]">
        {t("nyamaRegistriraniPotrebiteli")}
      </p>
    );
  }

  return (
    <>
      <div>
        <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(200px,1.2fr)_100px_120px_80px] gap-3 border-b border-[#e7dfd1] pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61] lg:grid">
          <span>{t("potrebitel")}</span>
          <span>{t("imeyl")}</span>
          <span>{t("telefon")}</span>
          <span>{t("rolya")}</span>
          <span className="text-right">{t("deystvie")}</span>
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
                  {new Date(user.createdAt).toLocaleDateString(dateLocale)}
                </p>
              </div>

              <p className="truncate text-sm text-[#4f5b66]">{user.email}</p>

              <p className="text-sm text-[#4f5b66]">{user.phone || "—"}</p>

              <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                user.role === "admin"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : user.role === "merchant"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-[#d2c8b8] bg-[#f8f4ec] text-[#5f6b76]"
              }`}>
                {ROLES.has(user.role) ? t(`roles.${user.role}`) : user.role}
              </span>

              <div className="flex justify-end order-first lg:order-none">
                <button
                  type="button"
                  onClick={() => openModal(user.id)}
                  title={t("redaktiray")}
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
                    <p className={`mr-auto text-xs font-medium ${feedback.includes(t("neuspeshen")) ? "text-red-600" : "text-emerald-700"}`}>
                      {feedback}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveUser(modalUser.id)}
                    disabled={isPending}
                    title={t("zapazi")}
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
                    aria-label={t("zatvori")}
                  >
                    ✕
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-[#1d2733]">{modalUser.username || modalUser.email}</p>
                  <p className="text-xs text-[#6a7480]">
                    {t("sazdaden", { BG: new Date(modalUser.createdAt).toLocaleString(dateLocale) })}
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
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">{t("telefon")}</span>
                    <input
                      value={String(modalDraft.phone ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "phone", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">{t("darzhava")}</span>
                    <input
                      value={String(modalDraft.country ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "country", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">{t("grad")}</span>
                    <input
                      value={String(modalDraft.city ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "city", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">{t("poshtenskiKod")}</span>
                    <input
                      value={String(modalDraft.postalCode ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "postalCode", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">{t("adres")}</span>
                    <input
                      value={String(modalDraft.address ?? "")}
                      onChange={(e) => updateDraft(modalUser.id, "address", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#25313d]">{t("rolya")}</span>
                    <select
                      value={String(modalDraft.role ?? "user")}
                      onChange={(e) => updateDraft(modalUser.id, "role", e.target.value)}
                      className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    >
                      <option value="user">{t("potrebitel")}</option>
                      <option value="merchant">{t("targovets")}</option>
                      <option value="admin">{t("admin")}</option>
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

                {canManageMerchant && modalDraft.role === "merchant" ? (
                  <div className="mt-6 rounded-[18px] border border-[#e7dfd1] bg-[#fbf8f1] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
                      {t("targovets")}
                    </p>
                    <p className="mt-1 text-xs text-[#6a7480]">
                      {t("samoAdministratorMozheDa")}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-[#25313d]">
                          {t("lichnaOtstapkaNaTargovetsa")}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={String(modalDraft.merchantDiscountPercent ?? 0)}
                          onChange={(e) =>
                            updateDraft(
                              modalUser.id,
                              "merchantDiscountPercent",
                              Number(e.target.value),
                            )
                          }
                          className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                        />
                        <span className="mt-1 block text-xs text-[#6a7480]">
                          {t("prilagaSeAvtomatichnoVarhu")}
                        </span>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
          </div>
        </div>
      )}
    </>
  );
}
