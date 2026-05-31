"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      setErrorMessage(result?.error || "Login failed.");
      return;
    }

    startTransition(() => {
      router.replace("/admin-panel/products");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[420px] rounded-[28px] border border-[#d8d0de] bg-white p-7 shadow-[0_24px_80px_rgba(20,28,38,0.08)]"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
          Admin Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#1d2733]">
          Brami admin panel
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5f6b76]">
          Вход само за профили с роля <code>admin</code> или <code>super_user</code>.
        </p>
      </div>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-medium text-[#25313d]">Username or email</span>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="h-12 w-full rounded-[18px] border border-[#d9d4ca] bg-[#fcfbf8] px-4 text-[#1d2733] outline-none transition focus:border-[#b38a44]"
          autoComplete="username"
          required
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-medium text-[#25313d]">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 w-full rounded-[18px] border border-[#d9d4ca] bg-[#fcfbf8] px-4 text-[#1d2733] outline-none transition focus:border-[#b38a44]"
          autoComplete="current-password"
          required
        />
      </label>

      {errorMessage ? (
        <div className="mb-4 rounded-[18px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a3f3f]">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1d2733] px-5 text-sm font-semibold text-white transition hover:bg-[#2b3847] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Влизане..." : "Вход"}
      </button>
    </form>
  );
}
