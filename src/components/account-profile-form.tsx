"use client";

import { useState, useTransition, type ReactNode } from "react";

import { AccountDiscountProgress } from "@/components/account-discount-progress";
import {
  SpeedyOfficePicker,
  formatOfficeLabel,
  type SpeedyOffice,
  type SpeedyOfficeKind,
} from "@/components/speedy-office-picker";
import { useUser } from "@/components/user-provider";

export type PreferredOfficeValue = {
  id: string;
  data: SpeedyOffice;
};

export type AccountProfileFormValues = {
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  address: string;
  marketingSubscription: boolean;
};

type FieldKey = Exclude<keyof AccountProfileFormValues, "marketingSubscription">;

function formatPhoneInput(value: string) {
  const sanitizedValue = value.replace(/[^\d+\s]/g, "");

  if (sanitizedValue.startsWith("+")) {
    const digits = sanitizedValue.slice(1).replace(/\D/g, "").slice(0, 12);

    if (!digits) {
      return "+";
    }

    const groups = [
      digits.slice(0, 3),
      digits.slice(3, 6),
      digits.slice(6, 8),
      digits.slice(8, 10),
      digits.slice(10, 12),
    ].filter(Boolean);

    return `+${groups.join(" ")}`;
  }

  const digits = sanitizedValue.replace(/\D/g, "").slice(0, 10);
  const groups = [
    digits.slice(0, 4),
    digits.slice(4, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ].filter(Boolean);

  return groups.join(" ");
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.4 2.6 13.4 4.6 5 13 2 13.6 2.6 10.6Z" />
      <path d="M10.2 3.8 12.2 5.8" />
    </svg>
  );
}

type FieldRowProps = {
  label: string;
  value: string;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  inputNode: ReactNode;
  emptyLabel?: string;
};

function FieldRow({
  label,
  value,
  isEditing,
  isSaving,
  onStartEdit,
  onCancel,
  onSubmit,
  inputNode,
  emptyLabel = "Не е попълнено",
}: FieldRowProps) {
  return (
    <div className="border-b border-[#ece3f2] py-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          {label}
        </span>

        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">{inputNode}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Запис..." : "Запази"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#ddd3e4] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b587f] transition hover:border-[#9f79ac] hover:text-[#432855] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Откажи
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between gap-4">
            <span
              className={`min-w-0 truncate text-base ${
                value ? "font-medium text-[#432855]" : "text-[#a890ba] italic"
              }`}
            >
              {value || emptyLabel}
            </span>
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#ddd3e4] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b587f] transition hover:border-[#9f79ac] hover:text-[#432855]"
            >
              <PencilIcon />
              Редактирай
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type OfficeSlot = "office" | "locker";

type SlotRowProps = {
  label: string;
  kind: SpeedyOfficeKind;
  saved: PreferredOfficeValue | null;
  editing: boolean;
  slotDraft: SpeedyOffice | null;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSelectDraft: (office: SpeedyOffice | null) => void;
  onSubmit: () => void;
};

function SlotRow({
  label,
  kind,
  saved,
  editing,
  slotDraft,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSelectDraft,
  onSubmit,
}: SlotRowProps) {
  return (
    <div className="border-b border-[#ece3f2] py-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          {label}
        </span>

        {editing ? (
          <div className="mt-3 flex flex-col gap-3">
            <SpeedyOfficePicker
              kind={kind}
              selected={slotDraft}
              onSelect={onSelectDraft}
              inline
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSaving || !slotDraft}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Запис..." : "Запази"}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#ddd3e4] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b587f] transition hover:border-[#9f79ac] hover:text-[#432855] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Откажи
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              {saved ? (
                <span className="block text-base font-medium text-[#432855]">
                  {formatOfficeLabel(saved.data)}
                </span>
              ) : (
                <span className="text-base italic text-[#a890ba]">Не е избран</span>
              )}
            </div>
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#ddd3e4] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b587f] transition hover:border-[#9f79ac] hover:text-[#432855]"
            >
              <PencilIcon />
              Редактирай
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountProfileForm({
  initial,
  email,
  initialPreferredOffice = null,
  initialPreferredLocker = null,
  initialHasPassword = true,
}: {
  initial: AccountProfileFormValues;
  email: string;
  initialPreferredOffice?: PreferredOfficeValue | null;
  initialPreferredLocker?: PreferredOfficeValue | null;
  initialHasPassword?: boolean;
}) {
  const { profile: contextProfile, setProfile: setUserProfile } = useUser();
  const [values, setValues] = useState<AccountProfileFormValues>(initial);
  const [preferredOffice, setPreferredOffice] = useState<PreferredOfficeValue | null>(
    initialPreferredOffice,
  );
  const [preferredLocker, setPreferredLocker] = useState<PreferredOfficeValue | null>(
    initialPreferredLocker,
  );
  const [hasPassword, setHasPassword] = useState<boolean>(initialHasPassword);
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [editingSlot, setEditingSlot] = useState<OfficeSlot | null>(null);
  const [slotDraft, setSlotDraft] = useState<SpeedyOffice | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );
  const [isSaving, startSaving] = useTransition();
  const [isSavingPassword, startSavingPassword] = useTransition();

  const inputClass =
    "h-11 w-full min-w-0 rounded-[14px] border border-[#ddd3e4] bg-[#faf7fc] px-3 text-[#432855] outline-none transition focus:border-[#9f79ac]";

  function startEdit(field: FieldKey) {
    setFeedback(null);
    setEditingField(field);
    setDraft(values[field]);
  }

  function cancelEdit() {
    setEditingField(null);
    setDraft("");
  }

  function persist(
    nextValues: AccountProfileFormValues,
    options: {
      nextPreferredOffice?: PreferredOfficeValue | null;
      nextPreferredLocker?: PreferredOfficeValue | null;
      onSuccess?: () => void;
    } = {},
  ) {
    const { nextPreferredOffice, nextPreferredLocker, onSuccess } = options;
    const officeForPayload =
      nextPreferredOffice !== undefined ? nextPreferredOffice : preferredOffice;
    const lockerForPayload =
      nextPreferredLocker !== undefined ? nextPreferredLocker : preferredLocker;

    startSaving(async () => {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextValues,
          preferredOffice: officeForPayload,
          preferredLocker: lockerForPayload,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setFeedback({
          kind: "error",
          message: result?.error || "Грешка при запис.",
        });
        return;
      }

      setValues(nextValues);
      if (nextPreferredOffice !== undefined) {
        setPreferredOffice(nextPreferredOffice);
      }
      if (nextPreferredLocker !== undefined) {
        setPreferredLocker(nextPreferredLocker);
      }
      setUserProfile({
        fullName: nextValues.fullName,
        phone: nextValues.phone,
        city: nextValues.city,
        postalCode: nextValues.postalCode,
        address: nextValues.address,
        preferredOffice: officeForPayload,
        preferredLocker: lockerForPayload,
        hasPassword,
        merchantDiscountPercent: contextProfile?.merchantDiscountPercent ?? 0,
        effectiveMerchantDiscountPercent:
          contextProfile?.effectiveMerchantDiscountPercent ?? 0,
        merchantTermsAccepted: contextProfile?.merchantTermsAccepted ?? false,
      });
      setFeedback({ kind: "success", message: "Профилът е обновен." });
      onSuccess?.();
    });
  }

  function saveField(field: FieldKey) {
    const nextValues = { ...values, [field]: draft };
    persist(nextValues, {
      onSuccess: () => {
        setEditingField(null);
        setDraft("");
      },
    });
  }

  function toggleMarketing(next: boolean) {
    const nextValues = { ...values, marketingSubscription: next };
    persist(nextValues);
  }

  function startEditSlot(slot: OfficeSlot) {
    setFeedback(null);
    setEditingSlot(slot);
    setSlotDraft(null);
  }

  function cancelEditSlot() {
    setEditingSlot(null);
    setSlotDraft(null);
  }

  function validatePasswordClient(value: string): string | null {
    if (value.length < 8) return "Паролата трябва да е поне 8 символа.";
    if (!/[a-z]/.test(value)) return "Паролата трябва да съдържа малка буква.";
    if (!/[A-Z]/.test(value)) return "Паролата трябва да съдържа главна буква.";
    if (!/\d/.test(value)) return "Паролата трябва да съдържа цифра.";
    if (!/[^A-Za-z0-9]/.test(value)) {
      return "Паролата трябва да съдържа специален символ.";
    }
    return null;
  }

  function savePassword() {
    setPasswordError(null);

    const localError = validatePasswordClient(passwordValue);
    if (localError) {
      setPasswordError(localError);
      return;
    }

    if (passwordConfirm !== passwordValue) {
      setPasswordError("Паролите не съвпадат.");
      return;
    }

    startSavingPassword(async () => {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordValue }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setPasswordError(result?.error || "Грешка при запис на парола.");
        return;
      }

      setHasPassword(true);
      setIsPasswordSectionOpen(false);
      setPasswordValue("");
      setPasswordConfirm("");

      if (contextProfile) {
        setUserProfile({ ...contextProfile, hasPassword: true });
      }

      setFeedback({
        kind: "success",
        message: "Паролата е зададена. Вече можеш да влизаш с имейл и парола.",
      });
    });
  }

  function cancelPassword() {
    setIsPasswordSectionOpen(false);
    setPasswordValue("");
    setPasswordConfirm("");
    setPasswordError(null);
  }

  function saveSlot() {
    if (!editingSlot || !slotDraft) {
      return;
    }

    const next: PreferredOfficeValue = {
      id: String(slotDraft.id),
      data: slotDraft,
    };

    const updates =
      editingSlot === "office"
        ? { nextPreferredOffice: next }
        : { nextPreferredLocker: next };

    persist(values, {
      ...updates,
      onSuccess: () => {
        setEditingSlot(null);
        setSlotDraft(null);
      },
    });
  }

  function renderInput(field: FieldKey): ReactNode {
    switch (field) {
      case "fullName":
        return (
          <input
            type="text"
            autoComplete="name"
            placeholder="Например: Мария Иванова"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={inputClass}
            autoFocus
          />
        );
      case "phone":
        return (
          <input
            type="tel"
            autoComplete="tel"
            placeholder="Например: 0888 123 456"
            value={draft}
            onChange={(event) => setDraft(formatPhoneInput(event.target.value))}
            className={inputClass}
            autoFocus
          />
        );
      case "city":
        return (
          <input
            type="text"
            autoComplete="address-level2"
            placeholder="Например: София"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={inputClass}
            autoFocus
          />
        );
      case "postalCode":
        return (
          <input
            type="text"
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="Например: 1000"
            value={draft}
            onChange={(event) =>
              setDraft(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className={inputClass}
            autoFocus
          />
        );
      case "address":
        return (
          <input
            type="text"
            autoComplete="street-address"
            placeholder="Например: ул. Шипка 12, вх. Б, ап. 4"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={inputClass}
            autoFocus
          />
        );
    }
  }

  const fieldOrder: { key: FieldKey; label: string }[] = [
    { key: "fullName", label: "Име и фамилия" },
    { key: "phone", label: "Телефон" },
    { key: "city", label: "Град" },
    { key: "postalCode", label: "Пощенски код" },
    { key: "address", label: "Адрес" },
  ];

  return (
    <div className="w-full">
      <div className="border-t border-[#ece3f2]">
        <div className="border-b border-[#ece3f2] py-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
              Имейл
            </span>
            <span className="mt-1 min-w-0 truncate text-base font-medium text-[#432855]">
              {email}
            </span>
          </div>
        </div>

        <AccountDiscountProgress />

        {fieldOrder.map(({ key, label }) => (
          <FieldRow
            key={key}
            label={label}
            value={values[key]}
            isEditing={editingField === key}
            isSaving={isSaving && editingField === key}
            onStartEdit={() => startEdit(key)}
            onCancel={cancelEdit}
            onSubmit={() => saveField(key)}
            inputNode={renderInput(key)}
          />
        ))}

        <SlotRow
          label="Предпочитан офис на Спиди"
          kind="office"
          saved={preferredOffice}
          editing={editingSlot === "office"}
          slotDraft={editingSlot === "office" ? slotDraft : null}
          isSaving={isSaving && editingSlot === "office"}
          onStartEdit={() => startEditSlot("office")}
          onCancelEdit={cancelEditSlot}
          onSelectDraft={setSlotDraft}
          onSubmit={saveSlot}
        />

        <SlotRow
          label="Предпочитан автомат на Спиди"
          kind="locker"
          saved={preferredLocker}
          editing={editingSlot === "locker"}
          slotDraft={editingSlot === "locker" ? slotDraft : null}
          isSaving={isSaving && editingSlot === "locker"}
          onStartEdit={() => startEditSlot("locker")}
          onCancelEdit={cancelEditSlot}
          onSelectDraft={setSlotDraft}
          onSubmit={saveSlot}
        />

        <div className="border-b border-[#ece3f2] py-4">
          <label className="flex items-start gap-3 text-sm text-[#432855]">
            <input
              type="checkbox"
              checked={values.marketingSubscription}
              onChange={(event) => toggleMarketing(event.target.checked)}
              disabled={isSaving}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#432855]"
            />
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                Маркетинг съгласие
              </span>
              <span className="mt-1 block">
                Съгласен съм да получавам маркетингови съобщения от Brami — промоции,
                новости и оферти.
              </span>
            </span>
          </label>
        </div>

        {!hasPassword ? (
          <div className="border-b border-[#ece3f2] py-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                Парола за вход
              </span>

              {isPasswordSectionOpen ? (
                <div className="mt-3 flex flex-col gap-3">
                  <p className="text-sm text-[#6b587f]">
                    Запази парола, за да можеш да влизаш и с имейл/парола, а не само през Google.
                  </p>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#6b587f]">
                      Нова парола
                    </span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordValue}
                      onChange={(event) => {
                        setPasswordValue(event.target.value);
                        setPasswordError(null);
                      }}
                      className="h-11 w-full rounded-[14px] border border-[#ddd3e4] bg-[#faf7fc] px-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
                      autoFocus
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-[#6b587f]">
                      Повтори паролата
                    </span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(event) => {
                        setPasswordConfirm(event.target.value);
                        setPasswordError(null);
                      }}
                      className="h-11 w-full rounded-[14px] border border-[#ddd3e4] bg-[#faf7fc] px-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
                    />
                  </label>

                  <ul className="rounded-[14px] border border-[#ece3f2] bg-[#faf7fc] px-4 py-3 text-xs text-[#6b587f]">
                    <li>• Минимум 8 символа</li>
                    <li>• Поне една малка буква (a-z)</li>
                    <li>• Поне една главна буква (A-Z)</li>
                    <li>• Поне една цифра (0-9)</li>
                    <li>• Поне един специален символ (напр. ! @ # $ % &)</li>
                  </ul>

                  {passwordError ? (
                    <div className="rounded-[14px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-2.5 text-xs text-[#9a3f3f]">
                      {passwordError}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={savePassword}
                      disabled={isSavingPassword}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingPassword ? "Запис..." : "Запази паролата"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelPassword}
                      disabled={isSavingPassword}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[#ddd3e4] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b587f] transition hover:border-[#9f79ac] hover:text-[#432855] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Откажи
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between gap-4">
                  <span className="min-w-0 flex-1 text-sm text-[#6b587f]">
                    Влизаш само през Google. Създай парола, за да можеш да влизаш и с имейл и парола.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setIsPasswordSectionOpen(true);
                    }}
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#432855] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#432855] transition hover:bg-[#432855] hover:text-white"
                  >
                    Създай профил с парола
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={
            feedback.kind === "success"
              ? "mt-6 rounded-[18px] border border-[#c8e6c9] bg-[#f3faf4] px-4 py-3 text-sm text-[#2e6b3a]"
              : "mt-6 rounded-[18px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a3f3f]"
          }
        >
          {feedback.message}
        </div>
      ) : null}

    </div>
  );
}
