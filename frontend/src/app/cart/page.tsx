"use client";

import Image from "next/image";
import Link from "next/link";
import type { HTMLInputTypeAttribute } from "react";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/cart-provider";
import {
  SectionIntro,
  pageSectionClassName,
  sectionActionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";
import { products } from "@/data/products";

const steps = ["Количка", "Доставка", "Потвърждение"];

const initialAddress = {
  fullName: "",
  phone: "",
  email: "",
  city: "",
  postcode: "",
  addressLine: "",
  notes: "",
};

type AddressField = keyof typeof initialAddress;
type DeliveryFieldConfig = [
  key: AddressField,
  label: string,
  type: HTMLInputTypeAttribute,
  autoComplete: string,
  placeholder: string,
  required: boolean,
];

const deliveryFields: DeliveryFieldConfig[] = [
  ["fullName", "Име и фамилия", "text", "name", "Например: Мария Иванова", true],
  ["phone", "Телефон", "tel", "tel", "Например: 0888 123 456", true],
  ["email", "Имейл", "email", "email", "Например: maria@example.com", true],
  ["city", "Град", "text", "address-level2", "Например: София", true],
  ["postcode", "Пощенски код", "text", "postal-code", "Например: 1000", true],
];

function formatPrice(value: number) {
  return `${value.toFixed(2)} лв.`;
}

function parseBgnPrice(price: string) {
  const bgnMatch = price.match(/\/(\d+[.,]?\d*)лв\.?/i);

  if (bgnMatch) {
    return Number.parseFloat(bgnMatch[1].replace(",", "."));
  }

  const fallbackMatch = price.match(/(\d+[.,]?\d*)/);
  return fallbackMatch ? Number.parseFloat(fallbackMatch[1].replace(",", ".")) : 0;
}

function formatPhoneInput(value: string) {
  const sanitizedValue = value.replace(/[^\d+\s]/g, "");

  if (sanitizedValue.startsWith("+")) {
    const digits = sanitizedValue.slice(1).replace(/\D/g, "").slice(0, 12);

    if (!digits) {
      return "+";
    }

    const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10), digits.slice(10, 12)]
      .filter(Boolean);

    return `+${groups.join(" ")}`;
  }

  const digits = sanitizedValue.replace(/\D/g, "").slice(0, 10);
  const groups = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean);

  return groups.join(" ");
}

function StepMarker({
  index,
  currentStep,
  isComplete,
}: {
  index: number;
  currentStep: number;
  isComplete: boolean;
}) {
  const isActive = index === currentStep;

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
          isComplete || isActive
            ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
            : "border border-[#d8d0de] bg-white text-[#8f72a7]"
        }`}
      >
        {index + 1}
      </span>
      <span className={`text-sm font-medium ${isActive ? "text-[#432855]" : "text-[#8f72a7]"}`}>
        {steps[index]}
      </span>
    </div>
  );
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(0);
  const [address, setAddress] = useState(initialAddress);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<AddressField, boolean>>>({});
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [showPoliciesError, setShowPoliciesError] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("step") === "delivery") {
      setCurrentStep(1);
    }
  }, []);

  const cartItems = useMemo(
    () =>
      items
        .map((item) => {
          const product = products.find((entry) => entry.id === item.productId);

          if (!product) {
            return null;
          }

          const unitPrice = parseBgnPrice(product.price);

          return {
            ...item,
            product,
            unitPrice,
            totalPrice: unitPrice * item.quantity,
          };
        })
        .filter((item) => item !== null),
    [items],
  );

  const subtotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
  const shipping = cartItems.length ? 7.99 : 0;
  const total = subtotal + shipping;

  function getFieldError(field: AddressField, value: string) {
    const trimmedValue = value.trim();

    switch (field) {
      case "fullName":
        if (!trimmedValue) {
          return "Името е задължително.";
        }

        if (trimmedValue.length < 5) {
          return "Въведи име и фамилия.";
        }

        return "";
      case "phone":
        if (!trimmedValue) {
          return "Телефонът е задължителен.";
        }

        if (!/^[+0-9\s()-]{8,}$/.test(trimmedValue)) {
          return "Въведи валиден телефонен номер.";
        }

        return "";
      case "email":
        if (!trimmedValue) {
          return "Имейлът е задължителен.";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
          return "Имейлът не е валиден.";
        }

        return "";
      case "city":
        if (!trimmedValue) {
          return "Градът е задължителен.";
        }

        return "";
      case "postcode":
        if (!trimmedValue) {
          return "Пощенският код е задължителен.";
        }

        if (!/^\d{3,10}$/.test(trimmedValue)) {
          return "Пощенският код не е валиден.";
        }

        return "";
      case "addressLine":
        if (!trimmedValue) {
          return "Адресът е задължителен.";
        }

        if (trimmedValue.length < 8) {
          return "Въведи по-пълен адрес за доставка.";
        }

        return "";
      case "notes":
        return "";
      default:
        return "";
    }
  }

  const fieldErrors = {
    fullName: getFieldError("fullName", address.fullName),
    phone: getFieldError("phone", address.phone),
    email: getFieldError("email", address.email),
    city: getFieldError("city", address.city),
    postcode: getFieldError("postcode", address.postcode),
    addressLine: getFieldError("addressLine", address.addressLine),
    notes: getFieldError("notes", address.notes),
  };

  const isAddressValid = Object.values(fieldErrors).every((error) => !error);

  function markAllMandatoryFieldsTouched() {
    setTouchedFields({
      fullName: true,
      phone: true,
      email: true,
      city: true,
      postcode: true,
      addressLine: true,
    });
  }

  function handleAddressStepContinue() {
    markAllMandatoryFieldsTouched();
    setShowPoliciesError(!hasAcceptedPolicies);

    if (!isAddressValid || !hasAcceptedPolicies) {
      return;
    }

    setCurrentStep(2);
  }

  async function handleSubmitOrder() {
    if (!cartItems.length || !isAddressValid || !hasAcceptedPolicies) {
      setShowPoliciesError(!hasAcceptedPolicies);
      return;
    }

    setIsSubmittingOrder(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    const generatedOrderId = `BR-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Math.floor(100000 + Math.random() * 900000)}`;

    setOrderId(generatedOrderId);
    setIsSubmittingOrder(false);
    clearCart();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title="Количка"
            titleAs="h1"
            size="page"
            description="Завърши поръчката в 3 стъпки: продукти, доставка и потвърждение."
          />

          <div className="mt-8 flex flex-col gap-4 border-y border-[#d8d0de] bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4">
                <StepMarker
                  index={index}
                  currentStep={currentStep}
                  isComplete={index < currentStep || (index === 2 && Boolean(orderId))}
                />
                {index < steps.length - 1 ? (
                  <span className="hidden h-px w-10 bg-[#ddd3e4] sm:block" />
                ) : null}
              </div>
            ))}
          </div>

          <div
            className={`mt-8 grid gap-6 ${
              orderId ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_340px]"
            }`}
          >
            <div className="border-y border-[#d8d0de] bg-white px-5 py-6 sm:px-7 sm:py-7">
              {currentStep === 0 ? (
                <div>
                  <h2 className="font-serif text-3xl text-[#432855]">Продукти в количката</h2>
                  {cartItems.length ? (
                    <div className="mt-6 space-y-4">
                      {cartItems.map((item) => {
                        const productImage = item.product.imageSrc[0];

                        return (
                          <article
                            key={item.product.id}
                            className="border-b border-[#e4dbea] py-4 last:border-b-0"
                          >
                            <div className="grid grid-cols-[92px_minmax(0,1fr)] grid-rows-[auto_auto_auto] gap-x-4 gap-y-3 md:hidden">
                              <div className="col-span-2 row-start-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <Link
                                    href={`/products/${item.product.id}`}
                                    className="block min-w-0 flex-1 line-clamp-2 font-serif text-[1.25rem] leading-7 text-[#432855] transition hover:text-[#6c3f8d]"
                                  >
                                    {item.product.name}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item.product.id)}
                                    aria-label="Премахни продукт"
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[1.2rem] leading-none text-[#8f72a7] transition hover:bg-[#f2e8f6] hover:text-[#432855]"
                                  >
                                    {"\u00d7"}
                                  </button>
                                </div>
                                <p className="mt-1 text-sm text-[#6b587f]">
                                  {item.product.packaging}
                                </p>
                              </div>

                              <div className="col-start-1 row-start-2 w-[92px] shrink-0 overflow-hidden rounded-[18px] border border-[#ece3f2] bg-[#fcf9ff]">
                                {productImage ? (
                                  <Image
                                    src={productImage}
                                    alt={item.product.name}
                                    className="aspect-square w-full object-cover"
                                  />
                                ) : (
                                  <div className="aspect-square w-full bg-[#f3edf7]" />
                                )}
                              </div>

                              <div className="col-start-2 row-start-2 flex min-w-0 flex-col justify-between self-stretch">
                                <p className="text-lg font-semibold text-[#432855]">
                                  {item.product.price}
                                </p>
                                <div className="mt-3 flex flex-col items-start gap-2">
                                  <div className="inline-flex items-center rounded-full border border-[#ddd3e4] bg-white p-1">
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-[#432855] transition hover:bg-[#f2e8f6]"
                                    >
                                      −
                                    </button>
                                    <span className="min-w-8 text-center text-sm font-semibold text-[#432855]">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-[#432855] transition hover:bg-[#f2e8f6]"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="hidden min-w-0 items-start gap-4 md:flex">
                              <div className="w-[140px] shrink-0 overflow-hidden rounded-[18px] border border-[#ece3f2] bg-[#fcf9ff]">
                                {productImage ? (
                                  <Image
                                    src={productImage}
                                    alt={item.product.name}
                                    className="aspect-square w-full object-cover"
                                  />
                                ) : (
                                  <div className="aspect-square w-full bg-[#f3edf7]" />
                                )}
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-3">
                                    <Link
                                      href={`/products/${item.product.id}`}
                                      className="block min-w-0 flex-1 line-clamp-2 font-serif text-2xl leading-8 text-[#432855] transition hover:text-[#6c3f8d]"
                                    >
                                      {item.product.name}
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => removeItem(item.product.id)}
                                      aria-label="Премахни продукт"
                                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[1.35rem] leading-none text-[#8f72a7] transition hover:bg-[#f2e8f6] hover:text-[#432855]"
                                    >
                                      {"\u00d7"}
                                    </button>
                                  </div>
                                  <p className="mt-1 text-sm text-[#6b587f]">
                                    {item.product.packaging}
                                  </p>
                                  <p className="mt-2 text-lg font-semibold text-[#432855]">
                                    {item.product.price}
                                  </p>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <div className="inline-flex items-center rounded-full border border-[#ddd3e4] bg-white p-1">
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#432855] transition hover:bg-[#f2e8f6]"
                                    >
                                      −
                                    </button>
                                    <span className="min-w-10 text-center text-sm font-semibold text-[#432855]">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#432855] transition hover:bg-[#f2e8f6]"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 border border-dashed border-[#d8d0de] bg-[#faf7fc] p-8 text-center">
                      <p className="text-lg text-[#6b587f]">Количката е празна.</p>
                      <Link
                        href="/products"
                        className={`mt-5 ${sectionPrimaryButtonClassName}`}
                      >
                        Към продуктите
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div>
                  <h2 className="font-serif text-3xl text-[#432855]">Адрес за доставка</h2>
                  <p className="mt-2 text-[#6b587f]">
                    Въведи данните за доставка. Задължителните полета са отбелязани със <span className="font-semibold text-[#b5445c]">*</span>.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {deliveryFields.map(([key, label, type, autoComplete, placeholder, required]) => (
                      <label key={key} className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
                        <span>
                          {label}
                          {required ? <span className="ml-1 text-[#b5445c]">*</span> : null}
                        </span>
                        <input
                          type={type}
                          autoComplete={autoComplete}
                          placeholder={placeholder}
                          inputMode={
                            key === "phone"
                              ? "tel"
                              : key === "postcode"
                                ? "numeric"
                                : undefined
                          }
                          value={address[key as keyof typeof address]}
                          onChange={(event) => {
                            const nextValue =
                              key === "phone"
                                ? formatPhoneInput(event.target.value)
                                : key === "postcode"
                                  ? event.target.value.replace(/\D/g, "").slice(0, 10)
                                  : event.target.value;

                            setAddress((current) => ({
                              ...current,
                              [key]: nextValue,
                            }));
                          }}
                          onBlur={() =>
                            setTouchedFields((current) => ({
                              ...current,
                              [key]: true,
                            }))
                          }
                          className={`h-12 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
                            touchedFields[key as AddressField] && fieldErrors[key as AddressField]
                              ? "border-[#d85b73] focus:border-[#d85b73]"
                              : "border-[#ddd3e4] focus:border-[#9f79ac]"
                          }`}
                        />
                        {touchedFields[key as AddressField] &&
                        fieldErrors[key as AddressField] ? (
                          <span className="text-xs font-medium text-[#c04e65]">
                            {fieldErrors[key as AddressField]}
                          </span>
                        ) : null}
                      </label>
                    ))}

                    <label className="sm:col-span-2 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                      <span>
                        Адрес
                        <span className="ml-1 text-[#b5445c]">*</span>
                      </span>
                      <input
                        type="text"
                        autoComplete="street-address"
                        placeholder="Например: ул. Шипка 12, вх. Б, ап. 4"
                        value={address.addressLine}
                        onChange={(event) => {
                          setAddress((current) => ({
                            ...current,
                            addressLine: event.target.value,
                          }));
                        }}
                        onBlur={() =>
                          setTouchedFields((current) => ({
                            ...current,
                            addressLine: true,
                          }))
                        }
                        className={`h-12 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
                          touchedFields.addressLine && fieldErrors.addressLine
                            ? "border-[#d85b73] focus:border-[#d85b73]"
                            : "border-[#ddd3e4] focus:border-[#9f79ac]"
                        }`}
                      />
                      {touchedFields.addressLine && fieldErrors.addressLine ? (
                        <span className="text-xs font-medium text-[#c04e65]">
                          {fieldErrors.addressLine}
                        </span>
                      ) : null}
                    </label>

                    <label className="sm:col-span-2 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                      Бележки
                      <textarea
                        value={address.notes}
                        onChange={(event) =>
                          setAddress((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="По желание: вход, етаж, час за доставка или друга важна информация."
                        rows={4}
                        className="rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 py-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
                      />
                    </label>

                    <label className="sm:col-span-2 flex items-start gap-3 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 py-4 text-sm text-[#5f4b73]">
                      <input
                        type="checkbox"
                        checked={hasAcceptedPolicies}
                        onChange={(event) => {
                          setHasAcceptedPolicies(event.target.checked);
                          setShowPoliciesError(false);
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#cdbcd9] accent-[#6c3f8d]"
                      />
                      <span className="leading-6">
                        Съгласявам се с{" "}
                        <Link
                          href="/privacy-policy?from=cart&step=delivery"
                          className="font-medium text-[#432855] underline decoration-[#cbb7d8] underline-offset-4"
                        >
                          политиката за личните данни
                        </Link>{" "}
                        и{" "}
                        <Link
                          href="/terms?from=cart&step=delivery"
                          className="font-medium text-[#432855] underline decoration-[#cbb7d8] underline-offset-4"
                        >
                          общите условия
                        </Link>
                        .
                      </span>
                    </label>

                    {showPoliciesError ? (
                      <p className="sm:col-span-2 text-xs font-medium text-[#c04e65]">
                        За да продължиш, трябва да приемеш политиката за личните данни и общите условия.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div>
                  <h2 className="font-serif text-3xl text-[#432855]">Потвърждение</h2>

                  {orderId ? (
                    <div className="mt-6 border border-[#d7ead8] bg-[#f5fbf5] p-6">
                      <p className="text-lg font-semibold text-[#305439]">
                        Поръчката е изпратена успешно.
                      </p>
                      <p className="mt-3 text-[#4f6a57]">
                        Индивидуален номер на поръчката: <span className="font-semibold text-[#305439]">{orderId}</span>
                      </p>
                      <p className="mt-2 text-[#4f6a57]">
                        Бекенд интеграцията ще се добави отделно. В момента това е симулирано успешно изпращане.
                      </p>
                      <Link
                        href="/products"
                        className={`mt-5 ${sectionPrimaryButtonClassName}`}
                      >
                        Продължи към продуктите
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-6 border border-[#e4dbea] bg-[#faf7fc] p-6">
                      <p className="text-[#6b587f]">
                        Провери обобщението вдясно и изпрати поръчката. След кратко изчакване ще получиш индивидуален номер.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                {currentStep > 0 && !orderId ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                    className={sectionActionClassName}
                  >
                    Назад
                  </button>
                ) : null}

                {currentStep === 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={!cartItems.length}
                    className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Към доставка
                  </button>
                ) : null}

                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleAddressStepContinue}
                    className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Към потвърждение
                  </button>
                ) : null}

                {currentStep === 2 && !orderId ? (
                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmittingOrder || !cartItems.length || !isAddressValid}
                    className={`${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isSubmittingOrder ? "Изпращаме..." : "Изпрати поръчката"}
                  </button>
                ) : null}
              </div>
            </div>

            {!orderId ? (
              <aside className="border-y border-[#d8d0de] bg-white px-5 py-6 sm:px-6">
                <h2 className="font-serif text-3xl text-[#432855]">Обобщение</h2>
                <div className="mt-5 space-y-3 text-[#5f4b73]">
                  <div className="flex items-center justify-between gap-4">
                    <span>Продукти</span>
                    <span className="font-medium text-[#432855]">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Доставка</span>
                    <span className="font-medium text-[#432855]">{formatPrice(shipping)}</span>
                  </div>
                  <div className="h-px bg-[#e4dbea]" />
                  <div className="flex items-center justify-between gap-4 text-lg font-semibold text-[#432855]">
                    <span>Общо</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border border-[#ece3f2] bg-[#faf7fc] p-4">
                  {cartItems.length ? (
                    cartItems.map((item) => (
                      <div key={item.product.id} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#432855]">{item.product.name}</p>
                          <p className="text-sm text-[#8f72a7]">{item.quantity} x {formatPrice(item.unitPrice)}</p>
                        </div>
                        <span className="whitespace-nowrap text-sm font-semibold text-[#432855]">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#6b587f]">Няма добавени продукти.</p>
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
