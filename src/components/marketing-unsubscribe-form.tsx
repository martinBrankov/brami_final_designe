"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

export function MarketingUnsubscribeForm({
  initialEmail = "",
  token = "",
}: {
  initialEmail?: string;
  token?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/marketing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setError(result?.error || "Отписването не беше успешно.");
        return;
      }

      setMessage("Имейлът е отписан от маркетинг съобщения.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        Имейл адрес
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="h-12 rounded-[14px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[#432855] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#5a3274] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Запис..." : "Отпиши ме"}
      </button>

      {message ? (
        <p className="rounded-[14px] border border-[#c8e6c9] bg-[#f3faf4] px-4 py-3 text-sm text-[#2e6b3a]">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[14px] border border-[#e8c7c7] bg-[#fff6f6] px-4 py-3 text-sm text-[#9a3f3f]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
