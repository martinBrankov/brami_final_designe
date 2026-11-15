"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { sectionPrimaryButtonClassName } from "@/components/section-intro";

type ContactFormStatus = "idle" | "sending" | "sent" | "failed";

const initialValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const t = useTranslations("ContactForm");
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<ContactFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setStatus("sent");
      setValues(initialValues);
    } catch {
      setStatus("failed");
      setErrorMessage(t("error"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        {t("name")}
        <input
          type="text"
          required
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder={t("namePlaceholder")}
          className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        {t("email")}
        <input
          type="email"
          required
          name="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          placeholder={t("emailPlaceholder")}
          className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
        {t("subject")}
        <input
          type="text"
          required
          value={values.subject}
          onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))}
          placeholder={t("subjectPlaceholder")}
          className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
        {t("message")}
        <textarea
          rows={6}
          required
          value={values.message}
          onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))}
          placeholder={t("messagePlaceholder")}
          className="rounded-[18px] border border-[#ddd3e4] bg-white px-4 py-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
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
        <p className="sm:col-span-2 text-sm text-[#305439]">
          {t("sent")}
        </p>
      ) : null}

      {status === "failed" ? (
        <p className="sm:col-span-2 text-sm text-[#8d4e5f]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
