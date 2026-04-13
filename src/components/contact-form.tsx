"use client";

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
      setErrorMessage("Не успяхме да изпратим запитването. Опитай отново след малко.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        Име
        <input
          type="text"
          required
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Въведи име"
          className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        Имейл
        <input
          type="email"
          required
          name="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          placeholder="Въведи имейл"
          className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
        Тема
        <input
          type="text"
          required
          value={values.subject}
          onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))}
          placeholder="Например: Въпрос за продукт или поръчка"
          className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
        Съобщение
        <textarea
          rows={6}
          required
          value={values.message}
          onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))}
          placeholder="Опиши как можем да помогнем"
          className="rounded-[18px] border border-[#ddd3e4] bg-white px-4 py-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {status === "sending" ? "Изпращане..." : "Изпрати запитване"}
        </button>
      </div>

      {status === "sent" ? (
        <p className="sm:col-span-2 text-sm text-[#305439]">
          Запитването е изпратено успешно до info@brami.shop.
        </p>
      ) : null}

      {status === "failed" ? (
        <p className="sm:col-span-2 text-sm text-[#8d4e5f]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
