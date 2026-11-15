"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { sectionPrimaryButtonClassName } from "@/components/section-intro";

type CancellationFormStatus = "idle" | "sending" | "sent" | "failed";

type Translate = (key: string) => string;

function getTodayDate(locale: string) {
  return new Date().toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const initialValues = {
  products: "",
  orderInfo: "",
  customerName: "",
  customerAddress: "",
  phone: "",
  email: "",
};

type FormErrors = Partial<Record<keyof typeof initialValues, string>>;

/** `t` is bound to the "CancellationForm.errors" namespace. */
function validateForm(values: typeof initialValues, t: Translate): FormErrors {
  const errors: FormErrors = {};

  if (!values.products.trim()) {
    errors.products = t("required");
  }

  if (!values.orderInfo.trim()) {
    errors.orderInfo = t("required");
  }

  const name = values.customerName.trim();
  if (!name) {
    errors.customerName = t("required");
  } else if (name.length < 3) {
    errors.customerName = t("nameTooShort");
  } else if (!/^[\p{L}\s'-]+$/u.test(name)) {
    errors.customerName = t("nameInvalid");
  }

  if (!values.customerAddress.trim()) {
    errors.customerAddress = t("required");
  } else if (values.customerAddress.trim().length < 5) {
    errors.customerAddress = t("addressTooShort");
  }

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = t("required");
  } else if (!/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
    errors.phone = t("phoneInvalid");
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = t("required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = t("emailInvalid");
  }

  return errors;
}

function Required() {
  return <span className="ml-0.5 text-red-500">*</span>;
}

function SuccessScreen() {
  const t = useTranslations("CancellationForm");

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(100deg,#2e7d65_0%,#1a5540_100%)] shadow-[0_12px_32px_rgba(46,125,101,0.28)]">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9 18 20 7" />
        </svg>
      </div>
      <h2 className="mt-5 font-serif text-2xl text-[#432855] sm:text-3xl">
        {t("sentTitle")}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[#6b587f]">
        {t("sentText")}
      </p>
      <p className="mt-2 text-xs text-[#8f72a7]">
        {t("sentTo")}
      </p>
    </div>
  );
}

export function CancellationForm() {
  const t = useTranslations("CancellationForm");
  const tErrors = useTranslations("CancellationForm.errors");
  const locale = useLocale();
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<CancellationFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttempted, setHasAttempted] = useState(false);
  const todayDate = getTodayDate(locale);

  function set(field: keyof typeof initialValues) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const updated = { ...values, [field]: event.target.value };
      setValues(updated);
      if (hasAttempted) {
        setErrors(validateForm(updated, tErrors));
      }
    };
  }

  function fieldClass(field: keyof typeof initialValues, extra = "") {
    const base = "w-full rounded-[18px] border bg-white px-4 py-3 text-[#432855] outline-none transition";
    const border = errors[field]
      ? "border-red-400 focus:border-red-500"
      : "border-[#ddd3e4] focus:border-[#9f79ac]";
    return `${base} ${border}${extra ? ` ${extra}` : ""}`;
  }

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    setHasAttempted(true);

    const formErrors = validateForm(values, tErrors);
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, date: todayDate }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setStatus("sent");
    } catch {
      setStatus("failed");
      setErrorMessage(t("error"));
    }
  }

  if (status === "sent") {
    return <SuccessScreen />;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-[20px] border border-[#ddd3e4] bg-[#faf7fc] px-5 py-4 text-sm leading-6 text-[#5f4b74]">
          <p className="font-medium text-[#432855]">{t("to")}</p>
          <p>{t("company")}</p>
          <p>{t("address")}</p>
          <p>{t("emailLine")}</p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>{t("products")}<Required /></span>
          <textarea
            rows={4}
            value={values.products}
            onChange={set("products")}
            placeholder={t("productsPlaceholder")}
            className={fieldClass("products")}
          />
          {errors.products && (
            <span className="text-xs font-normal text-red-500">{errors.products}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>{t("orderInfo")}<Required /></span>
          <textarea
            rows={2}
            value={values.orderInfo}
            onChange={set("orderInfo")}
            placeholder={t("orderInfoPlaceholder")}
            className={fieldClass("orderInfo")}
          />
          {errors.orderInfo && (
            <span className="text-xs font-normal text-red-500">{errors.orderInfo}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>{t("customerName")}<Required /></span>
          <input
            type="text"
            autoComplete="name"
            value={values.customerName}
            onChange={set("customerName")}
            placeholder={t("customerNamePlaceholder")}
            className={fieldClass("customerName", "h-12")}
          />
          {errors.customerName && (
            <span className="text-xs font-normal text-red-500">{errors.customerName}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>{t("customerAddress")}<Required /></span>
          <textarea
            rows={2}
            autoComplete="street-address"
            value={values.customerAddress}
            onChange={set("customerAddress")}
            placeholder={t("customerAddressPlaceholder")}
            className={fieldClass("customerAddress")}
          />
          {errors.customerAddress && (
            <span className="text-xs font-normal text-red-500">{errors.customerAddress}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
          <span>{t("phone")}<Required /></span>
          <input
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={set("phone")}
            placeholder="+359 ..."
            className={fieldClass("phone", "h-12")}
          />
          {errors.phone && (
            <span className="text-xs font-normal text-red-500">{errors.phone}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
          <span>{t("email")}<Required /></span>
          <input
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set("email")}
            placeholder="example@mail.com"
            className={fieldClass("email", "h-12")}
          />
          {errors.email && (
            <span className="text-xs font-normal text-red-500">{errors.email}</span>
          )}
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium text-[#432855]">
          <span>{t("date")}</span>
          <p className="flex h-12 items-center rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-[#6b587f]">
            {todayDate}
          </p>
        </div>

        <p className="sm:col-span-2 text-xs leading-5 text-[#8f72a7]">
          {t("disclaimer")}
        </p>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === "sending"}
            className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {status === "sending" ? t("sending") : t("submit")}
          </button>
        </div>

        {status === "failed" ? (
          <p className="sm:col-span-2 text-sm text-[#8d4e5f]">{errorMessage}</p>
        ) : null}
      </form>

      <div className="mt-8 border-t border-[#e4d9ed] pt-6 text-sm leading-6 text-[#6b587f]">
        <p>
          {t("byPhone")}{" "}
          <a
            href="tel:+359889342781"
            className="font-medium text-[#432855] transition hover:text-[#6c3f8d]"
          >
            +359 889 342 781
          </a>{" "}
          {t("byPhoneHours")}
        </p>
      </div>
    </div>
  );
}
