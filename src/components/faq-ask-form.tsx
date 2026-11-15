"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { sectionPrimaryButtonClassName } from "@/components/section-intro";

type AskFormStatus = "idle" | "sending" | "sent" | "failed";

const initialValues = {
  question: "",
  name: "",
  email: "",
};

const fieldClassName =
  "h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]";

export function FaqAskForm() {
  const t = useTranslations("FaqAskForm");
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<AskFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/faq/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setStatus("failed");
        setErrorMessage(body.error ?? t("saveError"));
        return;
      }

      setStatus("sent");
      setValues(initialValues);
    } catch {
      setStatus("failed");
      setErrorMessage(t("networkError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
        {t("question")}
        <textarea
          rows={5}
          required
          minLength={10}
          maxLength={1000}
          name="question"
          value={values.question}
          onChange={(event) =>
            setValues((current) => ({ ...current, question: event.target.value }))
          }
          placeholder={t("questionPlaceholder")}
          className="rounded-[18px] border border-[#ddd3e4] bg-white px-4 py-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        {t("name")}
        <input
          type="text"
          name="name"
          autoComplete="name"
          maxLength={120}
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          placeholder={t("namePlaceholder")}
          className={fieldClassName}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        {t("email")}
        <input
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          onChange={(event) =>
            setValues((current) => ({ ...current, email: event.target.value }))
          }
          placeholder={t("emailPlaceholder")}
          className={fieldClassName}
        />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {status === "sending" ? t("sending") : t("submit")}
        </button>
      </div>

      {status === "sent" ? (
        <p className="text-sm leading-7 text-[#305439] sm:col-span-2">
          {t("sent")}
        </p>
      ) : null}

      {status === "failed" ? (
        <p className="text-sm text-[#8d4e5f] sm:col-span-2">{errorMessage}</p>
      ) : null}
    </form>
  );
}
