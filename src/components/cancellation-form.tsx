"use client";

import { useState } from "react";

import { sectionPrimaryButtonClassName } from "@/components/section-intro";

type CancellationFormStatus = "idle" | "sending" | "sent" | "failed";

function getTodayDate() {
  return new Date().toLocaleDateString("bg-BG", {
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

function validateForm(values: typeof initialValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.products.trim()) {
    errors.products = "Полето е задължително.";
  }

  if (!values.orderInfo.trim()) {
    errors.orderInfo = "Полето е задължително.";
  }

  const name = values.customerName.trim();
  if (!name) {
    errors.customerName = "Полето е задължително.";
  } else if (name.length < 3) {
    errors.customerName = "Моля въведи поне 3 символа.";
  } else if (!/^[\p{L}\s'-]+$/u.test(name)) {
    errors.customerName = "Въведи валидно пълно име.";
  }

  if (!values.customerAddress.trim()) {
    errors.customerAddress = "Полето е задължително.";
  } else if (values.customerAddress.trim().length < 5) {
    errors.customerAddress = "Моля въведи пълен адрес.";
  }

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = "Полето е задължително.";
  } else if (!/^\+?[\d\s\-().]{7,20}$/.test(phone)) {
    errors.phone = "Въведи валиден телефонен номер.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Полето е задължително.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Въведи валиден имейл адрес.";
  }

  return errors;
}

function Required() {
  return <span className="ml-0.5 text-red-500">*</span>;
}

function SuccessScreen() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(100deg,#2e7d65_0%,#1a5540_100%)] shadow-[0_12px_32px_rgba(46,125,101,0.28)]">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9 18 20 7" />
        </svg>
      </div>
      <h2 className="mt-5 font-serif text-2xl text-[#432855] sm:text-3xl">
        Формулярът е изпратен
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[#6b587f]">
        Получихме вашето заявление за отказ. Ще се свържем с вас на посочените контакти в рамките на работния ден.
      </p>
      <p className="mt-2 text-xs text-[#8f72a7]">
        Изпратено до sales@brami.shop
      </p>
    </div>
  );
}

export function CancellationForm() {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<CancellationFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttempted, setHasAttempted] = useState(false);
  const todayDate = getTodayDate();

  function set(field: keyof typeof initialValues) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const updated = { ...values, [field]: event.target.value };
      setValues(updated);
      if (hasAttempted) {
        setErrors(validateForm(updated));
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

    const formErrors = validateForm(values);
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
      setErrorMessage("Не успяхме да изпратим формуляра. Опитай отново след малко.");
    }
  }

  if (status === "sent") {
    return <SuccessScreen />;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-[20px] border border-[#ddd3e4] bg-[#faf7fc] px-5 py-4 text-sm leading-6 text-[#5f4b74]">
          <p className="font-medium text-[#432855]">До:</p>
          <p>Брами Трейд ЕООД</p>
          <p>Адрес: България, гр. София 1588, Кривина, ул. Демокрация № 13</p>
          <p>Имейл: sales@brami.shop</p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>Стоки, от чиято покупка се отказвам<Required /></span>
          <textarea
            rows={4}
            value={values.products}
            onChange={set("products")}
            placeholder="Опиши стоките — наименование, количество и др."
            className={fieldClass("products")}
          />
          {errors.products && (
            <span className="text-xs font-normal text-red-500">{errors.products}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>Поръчано на / Номер на поръчката / Получено на<Required /></span>
          <textarea
            rows={2}
            value={values.orderInfo}
            onChange={set("orderInfo")}
            placeholder="Напр. 15.04.2026 / BR-20260420-332268 / 17.04.2026"
            className={fieldClass("orderInfo")}
          />
          {errors.orderInfo && (
            <span className="text-xs font-normal text-red-500">{errors.orderInfo}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>Име на потребителя<Required /></span>
          <input
            type="text"
            autoComplete="name"
            value={values.customerName}
            onChange={set("customerName")}
            placeholder="Въведи пълно име"
            className={fieldClass("customerName", "h-12")}
          />
          {errors.customerName && (
            <span className="text-xs font-normal text-red-500">{errors.customerName}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
          <span>Адрес на потребителя<Required /></span>
          <textarea
            rows={2}
            autoComplete="street-address"
            value={values.customerAddress}
            onChange={set("customerAddress")}
            placeholder="Град, улица, номер, пощенски код"
            className={fieldClass("customerAddress")}
          />
          {errors.customerAddress && (
            <span className="text-xs font-normal text-red-500">{errors.customerAddress}</span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
          <span>Телефон<Required /></span>
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
          <span>Имейл<Required /></span>
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
          <span>Дата</span>
          <p className="flex h-12 items-center rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-[#6b587f]">
            {todayDate}
          </p>
        </div>

        <p className="sm:col-span-2 text-xs leading-5 text-[#8f72a7]">
          Брами Трейд ЕООД си запазва правото да откаже връщането на стоката при неправилно или непълно попълнени данни във формуляра.
        </p>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === "sending"}
            className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {status === "sending" ? "Изпращане..." : "Изпрати формуляра"}
          </button>
        </div>

        {status === "failed" ? (
          <p className="sm:col-span-2 text-sm text-[#8d4e5f]">{errorMessage}</p>
        ) : null}
      </form>

      <div className="mt-8 border-t border-[#e4d9ed] pt-6 text-sm leading-6 text-[#6b587f]">
        <p>
          Предпочитате да се откажете по телефон? Обадете се на{" "}
          <a
            href="tel:+359889342781"
            className="font-medium text-[#432855] transition hover:text-[#6c3f8d]"
          >
            +359 889 342 781
          </a>{" "}
          в работни дни от 09:00 до 18:00.
        </p>
      </div>
    </div>
  );
}
