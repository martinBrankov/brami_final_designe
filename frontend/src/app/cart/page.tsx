"use client";

import Image from "next/image";
import Link from "next/link";
import type { HTMLInputTypeAttribute } from "react";
import { useEffect, useMemo, useState } from "react";

import { CartStepper } from "@/components/cart-stepper";
import { useCart } from "@/components/cart-provider";
import { IconCircleButton } from "@/components/icon-circle-button";
import { ProductCarouselSection } from "@/components/product-carousel-section";
import {
  SectionIntro,
  pageSectionClassName,
  sectionActionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";
import { getProductsByIds, products } from "@/data/products";

const initialAddress = {
  fullName: "",
  phone: "",
  email: "",
  officeId: "",
  city: "",
  postcode: "",
  addressLine: "",
  notes: "",
};

type AddressField = keyof typeof initialAddress;
type DeliveryMethod = "address" | "office";
type DeliveryFieldConfig = [
  key: AddressField,
  label: string,
  type: HTMLInputTypeAttribute,
  autoComplete: string,
  placeholder: string,
  required: boolean,
];

const contactFields: DeliveryFieldConfig[] = [
  ["fullName", "Име и фамилия", "text", "name", "Например: Мария Иванова", true],
  ["phone", "Телефон", "tel", "tel", "Например: 0888 123 456", true],
  ["email", "Имейл", "email", "email", "Например: maria@example.com", true],
];

const speedyOffices = [
  {
    id: "sofia-center",
    city: "София",
    postcode: "1000",
    address: "Офис Спиди София Център, бул. Дондуков 28",
  },
  {
    id: "sofia-mladost",
    city: "София",
    postcode: "1784",
    address: "Офис Спиди София Младост, бул. Александър Малинов 31",
  },
  {
    id: "plovdiv-center",
    city: "Пловдив",
    postcode: "4000",
    address: "Офис Спиди Пловдив Център, ул. Христо Г. Данов 14",
  },
  {
    id: "varna-center",
    city: "Варна",
    postcode: "9000",
    address: "Офис Спиди Варна Център, бул. Мария Луиза 21",
  },
] as const;

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

function scrollToPageTop() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("office");
  const [address, setAddress] = useState(initialAddress);
  const [officeQuery, setOfficeQuery] = useState("");
  const [isOfficeDropdownOpen, setIsOfficeDropdownOpen] = useState(false);
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
  const relatedCartProducts = useMemo(() => {
    if (!cartItems.length) {
      return [];
    }

    const cartProductIds = new Set(cartItems.map((item) => item.product.id));
    const relatedIds = Array.from(
      new Set(cartItems.flatMap((item) => item.product.relatedProductIds)),
    ).filter((id) => !cartProductIds.has(id));

    return getProductsByIds(relatedIds);
  }, [cartItems]);

  useEffect(() => {
    if (!cartItems.length && !orderId) {
      setCurrentStep(0);
    }
  }, [cartItems.length, orderId]);

  const filteredOffices = useMemo(() => {
    const normalizedQuery = officeQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return speedyOffices;
    }

    return speedyOffices.filter((office) =>
      `${office.city} ${office.address}`.toLowerCase().includes(normalizedQuery),
    );
  }, [officeQuery]);

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
      case "officeId":
        if (deliveryMethod === "office" && !trimmedValue) {
          return "Избери офис на Спиди.";
        }

        return "";
      case "city":
        if (deliveryMethod === "office") {
          return "";
        }

        if (!trimmedValue) {
          return "Градът е задължителен.";
        }

        return "";
      case "postcode":
        if (deliveryMethod === "office") {
          return "";
        }

        if (!trimmedValue) {
          return "Пощенският код е задължителен.";
        }

        if (!/^\d{3,10}$/.test(trimmedValue)) {
          return "Пощенският код не е валиден.";
        }

        return "";
      case "addressLine":
        if (deliveryMethod === "office") {
          return "";
        }

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
    officeId: getFieldError("officeId", address.officeId),
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
      city: deliveryMethod === "address",
      postcode: deliveryMethod === "address",
      addressLine: deliveryMethod === "address",
      officeId: deliveryMethod === "office",
    });
  }

  async function handleAddressStepContinue() {
    markAllMandatoryFieldsTouched();
    setShowPoliciesError(!hasAcceptedPolicies);

    if (!isAddressValid || !hasAcceptedPolicies) {
      return;
    }

    setCurrentStep(2);
    scrollToPageTop();
    await handleSubmitOrder();
  }

  function handleStepSelect(step: number) {
    if (orderId) {
      return;
    }

    if (step <= 1) {
      setCurrentStep(step);
      if (step === 1) {
        scrollToPageTop();
      }
      return;
    }

    markAllMandatoryFieldsTouched();
    setShowPoliciesError(!hasAcceptedPolicies);

    if (!isAddressValid || !hasAcceptedPolicies) {
      setCurrentStep(1);
      return;
    }

    setCurrentStep(2);
    scrollToPageTop();
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
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title="Количка"
            titleAs="h1"
            size="page"
            description="Завърши поръчката в 3 стъпки: продукти, доставка и потвърждение."
          />
          <div className="mt-5 sm:mt-8">
            <CartStepper
              currentStep={currentStep}
              orderCompleted={Boolean(orderId)}
              onStepSelect={cartItems.length && currentStep !== 2 ? handleStepSelect : undefined}
            />
          </div>
        </div>
      </section>
      <section className="w-full border-y border-y-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6">
            <div className="bg-white py-6 sm:py-7">
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
                                  <IconCircleButton
                                    onClick={() => removeItem(item.product.id)}
                                    label="Премахни продукт"
                                    className="h-8 w-8 shrink-0 text-[1.2rem]"
                                  >
                                    {"\u00d7"}
                                  </IconCircleButton>
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
                                    <IconCircleButton
                                      onClick={() => removeItem(item.product.id)}
                                      label="Премахни продукт"
                                      className="h-9 w-9 shrink-0 text-[1.35rem]"
                                    >
                                      {"\u00d7"}
                                    </IconCircleButton>
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
                        className={`mt-5 flex w-full justify-center ${sectionPrimaryButtonClassName}`}
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
                    {contactFields.map(([key, label, type, autoComplete, placeholder, required]) => (
                      <label key={key} className="min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
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
                          className={`h-12 w-full min-w-0 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
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

                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs font-medium leading-5 text-[#6b587f]">
                        Доставката се извършва от куриерска фирма Спиди.
                      </p>
                    </div>

                    <label className="sm:col-span-2 min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                      <span>Начин на доставка</span>
                      <select
                        value={deliveryMethod}
                        onChange={(event) => {
                          const nextMethod = event.target.value as DeliveryMethod;

                          setDeliveryMethod(nextMethod);
                          setOfficeQuery("");
                          setIsOfficeDropdownOpen(false);
                          setAddress((current) => ({
                            ...current,
                            officeId: "",
                            city: "",
                            postcode: "",
                            addressLine: "",
                          }));
                          setTouchedFields((current) => ({
                            ...current,
                            officeId: false,
                            city: false,
                            postcode: false,
                            addressLine: false,
                          }));
                        }}
                        className="h-12 w-full min-w-0 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 pr-[58px] text-[#432855] outline-none transition focus:border-[#9f79ac]"
                      >
                        <option value="address">До адрес</option>
                        <option value="office">До офис на Спиди</option>
                      </select>
                    </label>

                    {deliveryMethod === "address" ? (
                      <>
                        <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                          <span>
                            Град
                            <span className="ml-1 text-[#b5445c]">*</span>
                          </span>
                          <input
                            type="text"
                            autoComplete="address-level2"
                            placeholder="Например: София"
                            value={address.city}
                            onChange={(event) =>
                              setAddress((current) => ({
                                ...current,
                                city: event.target.value,
                              }))
                            }
                            onBlur={() =>
                              setTouchedFields((current) => ({
                                ...current,
                                city: true,
                              }))
                            }
                            className={`h-12 w-full min-w-0 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
                              touchedFields.city && fieldErrors.city
                                ? "border-[#d85b73] focus:border-[#d85b73]"
                                : "border-[#ddd3e4] focus:border-[#9f79ac]"
                            }`}
                          />
                          {touchedFields.city && fieldErrors.city ? (
                            <span className="text-xs font-medium text-[#c04e65]">
                              {fieldErrors.city}
                            </span>
                          ) : null}
                        </label>

                        <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                          <span>
                            Пощенски код
                            <span className="ml-1 text-[#b5445c]">*</span>
                          </span>
                          <input
                            type="text"
                            autoComplete="postal-code"
                            inputMode="numeric"
                            placeholder="Например: 1000"
                            value={address.postcode}
                            onChange={(event) =>
                              setAddress((current) => ({
                                ...current,
                                postcode: event.target.value.replace(/\D/g, "").slice(0, 10),
                              }))
                            }
                            onBlur={() =>
                              setTouchedFields((current) => ({
                                ...current,
                                postcode: true,
                              }))
                            }
                            className={`h-12 w-full min-w-0 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
                              touchedFields.postcode && fieldErrors.postcode
                                ? "border-[#d85b73] focus:border-[#d85b73]"
                                : "border-[#ddd3e4] focus:border-[#9f79ac]"
                            }`}
                          />
                          {touchedFields.postcode && fieldErrors.postcode ? (
                            <span className="text-xs font-medium text-[#c04e65]">
                              {fieldErrors.postcode}
                            </span>
                          ) : null}
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="sm:col-span-2 min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                          <span>
                            Избери офис
                            <span className="ml-1 text-[#b5445c]">*</span>
                          </span>
                          <input
                            type="text"
                            autoComplete="off"
                            placeholder="Пиши за офис, град или адрес"
                            value={officeQuery}
                            onFocus={() => setIsOfficeDropdownOpen(true)}
                            onChange={(event) => {
                              setOfficeQuery(event.target.value);
                              setIsOfficeDropdownOpen(true);
                              setAddress((current) => ({
                                ...current,
                                officeId: "",
                              }));
                            }}
                            onBlur={() =>
                              window.setTimeout(() => {
                                setTouchedFields((current) => ({
                                  ...current,
                                  officeId: true,
                                }));
                                setIsOfficeDropdownOpen(false);
                              }, 120)
                            }
                            className={`h-12 w-full min-w-0 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
                              touchedFields.officeId && fieldErrors.officeId
                                ? "border-[#d85b73] focus:border-[#d85b73]"
                                : "border-[#ddd3e4] focus:border-[#9f79ac]"
                            }`}
                          />
                          {touchedFields.officeId && fieldErrors.officeId ? (
                            <span className="text-xs font-medium text-[#c04e65]">
                              {fieldErrors.officeId}
                            </span>
                          ) : null}

                          {isOfficeDropdownOpen ? (
                            <div className="max-h-64 overflow-y-auto rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] p-2">
                              {filteredOffices.length ? (
                                <div className="space-y-2">
                                  {filteredOffices.map((office) => (
                                    <button
                                      key={office.id}
                                      type="button"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                        setAddress((current) => ({
                                          ...current,
                                          officeId: office.id,
                                        }));
                                        setOfficeQuery(`${office.city}, ${office.address}`);
                                        setTouchedFields((current) => ({
                                          ...current,
                                          officeId: true,
                                        }));
                                        setIsOfficeDropdownOpen(false);
                                      }}
                                      className={`flex w-full flex-col rounded-[16px] border px-4 py-3 text-left transition ${
                                        address.officeId === office.id
                                          ? "border-[#9f79ac] bg-white"
                                          : "border-transparent bg-white/70 hover:border-[#d9cce3]"
                                      }`}
                                    >
                                      <span className="text-sm font-semibold text-[#432855]">
                                        {office.city}
                                      </span>
                                      <span className="mt-1 text-sm leading-5 text-[#6b587f]">
                                        {office.address}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="px-2 py-3 text-sm text-[#6b587f]">
                                  Няма офиси по това търсене.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </label>
                      </>
                    )}

                    {deliveryMethod === "address" ? (
                      <label className="sm:col-span-2 min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                        <span>
                          Адрес
                          <span className="ml-1 text-[#b5445c]">*</span>
                        </span>
                        <input
                          type="text"
                          autoComplete="street-address"
                          placeholder="Например: ул. Шипка 12, вх. Б, ап. 4"
                          value={address.addressLine}
                          onChange={(event) =>
                            setAddress((current) => ({
                              ...current,
                              addressLine: event.target.value,
                            }))
                          }
                          onBlur={() =>
                            setTouchedFields((current) => ({
                              ...current,
                              addressLine: true,
                            }))
                          }
                          className={`h-12 w-full min-w-0 rounded-[18px] border bg-[#faf7fc] px-4 text-[#432855] outline-none transition ${
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
                    ) : null}

                    <label className="sm:col-span-2 min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
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
                        Към продуктите
                      </Link>
                    </div>
                  ) : isSubmittingOrder ? (
                    <div className="mt-6 border border-[#e4dbea] bg-[#faf7fc] p-6">
                      <p className="text-lg font-semibold text-[#432855]">
                        Изпращаме поръчката...
                      </p>
                      <p className="mt-3 text-[#6b587f]">
                        Изчакай няколко секунди, за да генерираме потвърждението.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 border border-[#e4dbea] bg-[#faf7fc] p-6">
                      <p className="text-[#6b587f]">
                        Подготвяме потвърждението на поръчката.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

            </div>

            {!orderId && cartItems.length ? (
              <aside className="border-y border-[#d8d0de] bg-white py-6">
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

              </aside>
            ) : null}

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {currentStep === 0 && cartItems.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      scrollToPageTop();
                    }}
                    className={`w-full justify-center sm:w-auto ${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Към доставка
                  </button>
                ) : null}

                {currentStep === 0 && cartItems.length ? (
                  <Link
                    href="/products"
                    className={`w-full justify-center sm:w-auto ${sectionActionClassName} uppercase tracking-[0.08em]`}
                  >
                    Към продуктите
                  </Link>
                ) : null}

                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleAddressStepContinue}
                    disabled={isSubmittingOrder}
                    className={`w-full justify-center sm:w-auto ${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isSubmittingOrder ? "Изпращаме..." : "Потвърди"}
                  </button>
                ) : null}

                {currentStep === 1 && !orderId ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                    className={`w-full justify-center sm:w-auto ${sectionActionClassName} uppercase tracking-[0.08em]`}
                  >
                    Назад
                  </button>
                ) : null}

              </div>
          </div>
        </div>
      </section>

      {relatedCartProducts.length ? (
        <ProductCarouselSection
          title="Свързани продукти"
          products={relatedCartProducts}
        />
      ) : null}
    </main>
  );
}
