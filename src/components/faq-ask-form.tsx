"use client";

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
        setErrorMessage(body.error ?? "Не успяхме да запишем въпроса. Опитай отново.");
        return;
      }

      setStatus("sent");
      setValues(initialValues);
    } catch {
      setStatus("failed");
      setErrorMessage("Не успяхме да запишем въпроса. Опитай отново след малко.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
        Твоят въпрос
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
          placeholder="Например: Как да избера крем според типа си кожа?"
          className="rounded-[18px] border border-[#ddd3e4] bg-white px-4 py-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        Име (по желание)
        <input
          type="text"
          name="name"
          autoComplete="name"
          maxLength={120}
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Как да се обръщаме към теб"
          className={fieldClassName}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
        Имейл (по желание)
        <input
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          onChange={(event) =>
            setValues((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="За да те уведомим за отговора"
          className={fieldClassName}
        />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {status === "sending" ? "Изпращане..." : "Изпрати въпроса"}
        </button>
      </div>

      {status === "sent" ? (
        <p className="text-sm leading-7 text-[#305439] sm:col-span-2">
          Благодарим! Въпросът е записан и чака отговор. След като екипът ни
          отговори, ще го публикуваме на тази страница.
        </p>
      ) : null}

      {status === "failed" ? (
        <p className="text-sm text-[#8d4e5f] sm:col-span-2">{errorMessage}</p>
      ) : null}
    </form>
  );
}
