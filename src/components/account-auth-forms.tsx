"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUser } from "@/components/user-provider";

type Mode = "login" | "register";
type SocialProvider = "google" | "facebook";

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.93v2.33A8.99 8.99 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.6.1-1.17.29-1.7V4.97H.93A9 9 0 0 0 0 9c0 1.45.35 2.83.93 4.03l3.02-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .93 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"
        fill="#1877F2"
      />
    </svg>
  );
}

function SocialButtons({ providers }: { providers: SocialProvider[] }) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[#8f72a7]">
        <span className="h-px flex-1 bg-[#e6dcef]" />
        <span>или продължи с</span>
        <span className="h-px flex-1 bg-[#e6dcef]" />
      </div>
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <a
            key={provider}
            href={`/api/auth/oauth/${provider}`}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#ddd3e4] bg-white px-5 text-sm font-semibold text-[#432855] transition hover:border-[#9f79ac] hover:bg-[#faf7fc]"
          >
            {provider === "google" ? <GoogleGlyph /> : <FacebookGlyph />}
            <span>Продължи с {PROVIDER_LABELS[provider]}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]";

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.22A10.48 10.48 0 0 0 1.93 12c1.3 4.34 5.31 7.5 10.07 7.5.99 0 1.95-.14 2.86-.4M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.76 0 8.77 3.16 10.07 7.5a10.52 10.52 0 0 1-4.3 5.77M6.23 6.23 3 3m3.23 3.23 3.65 3.65m7.89 7.89L21 21m-3.23-3.23-3.65-3.65m0 0a3 3 0 1 0-4.24-4.24"
          />
        </>
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.36 4.5 12 4.5c4.64 0 8.57 3.01 9.96 7.18.07.21.07.43 0 .64C20.58 16.49 16.64 19.5 12 19.5c-4.64 0-8.58-3.01-9.96-7.18Z"
          />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function PasswordField({
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#432855]">Парола</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className={`${inputClass} pr-12`}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Скрий паролата" : "Покажи паролата"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#8f72a7] transition hover:text-[#432855]"
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {hint ? (
        <span className="mt-1 block text-xs text-[#8f72a7]">{hint}</span>
      ) : null}
    </label>
  );
}

type AccountAuthFormsProps = {
  providers?: SocialProvider[];
  oauthError?: string | null;
};

export function AccountAuthForms({
  providers = [],
  oauthError = null,
}: AccountAuthFormsProps) {
  const router = useRouter();
  const { setUser } = useUser();
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setIdentifier("");
    setUsername("");
    setEmail("");
    setPassword("");
    setErrorMessage(null);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; user?: { id: string; username: string; email: string; role: string } }
      | null;

    if (!response.ok || !result?.ok || !result.user) {
      setErrorMessage(result?.error || "Неуспешен вход.");
      return;
    }

    setUser(result.user);

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; user?: { id: string; username: string; email: string; role: string } }
      | null;

    if (!response.ok || !result?.ok || !result.user) {
      setErrorMessage(result?.error || "Неуспешна регистрация.");
      return;
    }

    setUser(result.user);

    startTransition(() => {
      router.refresh();
    });
  }

  const tabBase =
    "flex-1 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] transition";
  const activeTab = "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white shadow";
  const inactiveTab = "text-[#6b587f] hover:text-[#432855]";

  return (
    <div className="w-full max-w-[460px]">
      <div className="mb-6 flex gap-2 rounded-full border border-[#e6dcef] bg-[#faf7fc] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            resetForm();
          }}
          className={`${tabBase} ${mode === "login" ? activeTab : inactiveTab}`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            resetForm();
          }}
          className={`${tabBase} ${mode === "register" ? activeTab : inactiveTab}`}
        >
          Регистрация
        </button>
      </div>

      {oauthError ? (
        <div className="mb-4 rounded-[18px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a3f3f]">
          {oauthError}
        </div>
      ) : null}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <h1 className="font-serif text-3xl text-[#432855]">Добре дошъл отново</h1>
          <p className="text-sm text-[#6b587f]">
            Влез с потребителско име или имейл.
          </p>

          <SocialButtons providers={providers} />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">
              Потребителско име или имейл
            </span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className={inputClass}
              autoComplete="username"
              required
            />
          </label>

          <PasswordField
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {errorMessage ? (
            <div className="rounded-[18px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a3f3f]">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Влизане..." : "Вход"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("register");
              resetForm();
            }}
            className="text-center text-sm text-[#6b587f] underline-offset-2 transition hover:text-[#432855] hover:underline"
          >
            Нямаш профил? Регистрирай се
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <h1 className="font-serif text-3xl text-[#432855]">Създай профил</h1>
          <p className="text-sm text-[#6b587f]">
            Регистрирай се за по-бърза поръчка и история на покупките.
          </p>

          <SocialButtons providers={providers} />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">
              Потребителско име
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClass}
              autoComplete="username"
              minLength={3}
              maxLength={32}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">
              Имейл
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              autoComplete="email"
              required
            />
          </label>

          <PasswordField
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            hint="Минимум 8 символа."
          />

          {errorMessage ? (
            <div className="rounded-[18px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a3f3f]">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Създаване..." : "Регистрирай се"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("login");
              resetForm();
            }}
            className="text-center text-sm text-[#6b587f] underline-offset-2 transition hover:text-[#432855] hover:underline"
          >
            Вече имаш профил? Влез
          </button>
        </form>
      )}
    </div>
  );
}
