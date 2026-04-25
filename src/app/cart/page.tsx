"use client";

import Image from "next/image";
import Link from "next/link";
import type { HTMLInputTypeAttribute } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

const FREE_SHIPPING_THRESHOLD_EUR = 100;
const HEAVY_THRESHOLD_KG = 3;
const BGN_TO_EUR = 1.95583;
const LOCKER_SHIPPING_BGN = 1.27 * BGN_TO_EUR;

const SHIPPING_RATES = {
  office:  { standard: 5.99, heavy: 8.99 },
  locker:  { standard: LOCKER_SHIPPING_BGN, heavy: LOCKER_SHIPPING_BGN },
  address: { standard: 7.99, heavy: 10.99 },
};

function calcShipping(method: DeliveryMethod, totalWeightKg: number): number {
  const rates = SHIPPING_RATES[method];
  return totalWeightKg > HEAVY_THRESHOLD_KG ? rates.heavy : rates.standard;
}

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
type DeliveryMethod = "address" | "office" | "locker";
type OrderEmailStatus = "idle" | "sending" | "sent" | "failed";
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

type SpeedyOffice = {
  id: number;
  name: string;
  type?: "OFFICE" | "APT";
  address: {
    fullAddressString?: string;
    siteName?: string;
    postCode?: string;
  };
};

function formatPrice(eur: number) {
  const bgn = eur * BGN_TO_EUR;
  return `€${eur.toFixed(2)} / ${bgn.toFixed(2)} лв.`;
}

function parseEurPrice(price: string) {
  const eurMatch = price.match(/€\s?(\d+[.,]?\d*)/i);

  if (eurMatch) {
    return Number.parseFloat(eurMatch[1].replace(",", "."));
  }

  const fallbackMatch = price.match(/(\d+[.,]?\d*)/);
  return fallbackMatch ? Number.parseFloat(fallbackMatch[1].replace(",", ".")) : 0;
}

function isOfficePickupMethod(method: DeliveryMethod) {
  return method === "office" || method === "locker";
}

function getDeliveryMethodLabel(method: DeliveryMethod) {
  switch (method) {
    case "office":
      return "До офис на Спиди";
    case "locker":
      return "До автомат на Спиди";
    default:
      return "До адрес";
  }
}

function getOfficePickerLabel(method: DeliveryMethod) {
  return method === "locker" ? "Избери автомат на Спиди" : "Избери офис на Спиди";
}

function getOfficeSearchPlaceholder(method: DeliveryMethod) {
  return method === "locker"
    ? "Търси по автомат, град или адрес"
    : "Търси по офис, град или адрес";
}

function getOfficeEmptyLabel(method: DeliveryMethod) {
  return method === "locker" ? "Няма намерени автомати." : "Няма намерени офиси.";
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

function scrollFieldToTop(el: HTMLElement) {
  window.setTimeout(() => {
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, 300);
}

function getOrderMailEndpoint() {
  if (process.env.NEXT_PUBLIC_ORDER_API_URL) {
    return process.env.NEXT_PUBLIC_ORDER_API_URL;
  }

  return "/api/orders/confirmation";
}

function getAbsoluteImageUrl(imageSrc: unknown) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (!siteUrl) {
    return "";
  }

  if (typeof imageSrc === "string") {
    if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
      return imageSrc;
    }

    return imageSrc.startsWith("/") ? `${siteUrl}${imageSrc}` : `${siteUrl}/${imageSrc}`;
  }

  if (
    typeof imageSrc === "object" &&
    imageSrc !== null &&
    "src" in imageSrc &&
    typeof imageSrc.src === "string"
  ) {
    return imageSrc.src.startsWith("/") ? `${siteUrl}${imageSrc.src}` : `${siteUrl}/${imageSrc.src}`;
  }

  return "";
}

export default function CartPage() {
  const deliveryDropdownRef = useRef<HTMLDivElement | null>(null);
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const officeDropdownRef = useRef<HTMLDivElement | null>(null);
  const officeSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("office");
  const [isDeliveryDropdownOpen, setIsDeliveryDropdownOpen] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [officeQuery, setOfficeQuery] = useState("");
  const [isOfficeDropdownOpen, setIsOfficeDropdownOpen] = useState(false);
  const [officeSearchResults, setOfficeSearchResults] = useState<SpeedyOffice[]>([]);
  const [isLoadingOffices, setIsLoadingOffices] = useState(false);
  const [selectedSpeedyOffice, setSelectedSpeedyOffice] = useState<SpeedyOffice | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<AddressField, boolean>>>({});
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [showPoliciesError, setShowPoliciesError] = useState(false);
  const [step1ValidationFailed, setStep1ValidationFailed] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [orderEmailStatus, setOrderEmailStatus] = useState<OrderEmailStatus>("idle");
  const [orderEmailError, setOrderEmailError] = useState("");

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

          const originalPrice = parseEurPrice(product.price);
          const unitPrice = product.badge === "sale" && product.discountPercent
            ? originalPrice * (1 - product.discountPercent / 100)
            : originalPrice;

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
  const totalWeight = cartItems.reduce(
    (sum, item) => sum + item.product.weight * item.quantity,
    0,
  ) + 0.15;
  const isHeavyShipment = totalWeight > HEAVY_THRESHOLD_KG;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const shipping = cartItems.length && !isFreeShipping ? calcShipping(deliveryMethod, totalWeight) / BGN_TO_EUR : 0;
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

  useEffect(() => {
    if (deliveryMethod === "locker" && isHeavyShipment) {
      applyDeliveryMethod("office");
    }
  }, [deliveryMethod, isHeavyShipment]);

  useEffect(() => {
    if (!isDeliveryDropdownOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!deliveryDropdownRef.current?.contains(event.target as Node)) {
        setIsDeliveryDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isDeliveryDropdownOpen]);

  useEffect(() => {
    if (!isOfficeDropdownOpen) {
      return;
    }

    officeSearchInputRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (!officeDropdownRef.current?.contains(event.target as Node)) {
        setIsOfficeDropdownOpen(false);
        setTouchedFields((current) => ({
          ...current,
          officeId: true,
        }));
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOfficeDropdownOpen]);

  useEffect(() => {
    const query = officeQuery.trim();

    if (query.length < 2) {
      setOfficeSearchResults([]);
      return;
    }

    setIsLoadingOffices(true);

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/speedy/offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            officeType: deliveryMethod === "locker" ? "APT" : "OFFICE",
          }),
        });
        const data = (await res.json()) as { offices?: SpeedyOffice[] };
        setOfficeSearchResults(data.offices ?? []);
      } catch {
        setOfficeSearchResults([]);
      } finally {
        setIsLoadingOffices(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      setIsLoadingOffices(false);
    };
  }, [deliveryMethod, officeQuery]);

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
        if (isOfficePickupMethod(deliveryMethod) && !trimmedValue) {
          return deliveryMethod === "locker"
            ? "Избери автомат на Спиди."
            : "Избери офис на Спиди.";
        }

        return "";
      case "city":
        if (isOfficePickupMethod(deliveryMethod)) {
          return "";
        }

        if (!trimmedValue) {
          return "Градът е задължителен.";
        }

        return "";
      case "postcode":
        if (isOfficePickupMethod(deliveryMethod)) {
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
        if (isOfficePickupMethod(deliveryMethod)) {
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
  const step1HasError = step1ValidationFailed && (!isAddressValid || !hasAcceptedPolicies);

  function applyDeliveryMethod(nextMethod: DeliveryMethod) {
    setDeliveryMethod(nextMethod);
    setOfficeQuery("");
    setOfficeSearchResults([]);
    setSelectedSpeedyOffice(null);
    setIsOfficeDropdownOpen(false);
    setIsDeliveryDropdownOpen(false);
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
  }

  const deliveryOptions = [
    { value: "address" as const, label: "До адрес" },
    { value: "office" as const, label: "До офис на Спиди" },
    ...(!isHeavyShipment ? [{ value: "locker" as const, label: "До автомат на Спиди" }] : []),
  ];

  function markAllMandatoryFieldsTouched() {
    setTouchedFields({
      fullName: true,
      phone: true,
      email: true,
      city: deliveryMethod === "address",
      postcode: deliveryMethod === "address",
      addressLine: deliveryMethod === "address",
      officeId: isOfficePickupMethod(deliveryMethod),
    });
  }

  async function sendOrderConfirmationEmail(generatedOrderId: string) {
    const deliveryDestination =
      isOfficePickupMethod(deliveryMethod)
        ? selectedSpeedyOffice
          ? [
              selectedSpeedyOffice.address.siteName,
              selectedSpeedyOffice.address.fullAddressString ?? selectedSpeedyOffice.name,
              selectedSpeedyOffice.address.postCode,
            ].filter(Boolean).join(", ")
          : ""
        : [address.city.trim(), address.postcode.trim(), address.addressLine.trim()]
            .filter(Boolean)
            .join(", ");

    const payload = {
      orderId: generatedOrderId,
      status: "Потвърдена",
      createdAt: new Date().toLocaleString("bg-BG"),
      customer: {
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        email: address.email.trim(),
      },
      delivery: {
        methodLabel: getDeliveryMethodLabel(deliveryMethod),
        destination: deliveryDestination,
        notes: address.notes.trim(),
      },
      items: cartItems.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        packaging: item.product.packaging,
        imageUrl: getAbsoluteImageUrl(item.product.imageSrc[0]),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      totals: {
        subtotal,
        shipping,
        total,
      },
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(getOrderMailEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function handleAddressStepContinue() {
    markAllMandatoryFieldsTouched();
    setShowPoliciesError(!hasAcceptedPolicies);

    if (!isAddressValid || !hasAcceptedPolicies) {
      setStep1ValidationFailed(true);
      return;
    }

    setStep1ValidationFailed(false);
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
      setStep1ValidationFailed(true);
      return;
    }

    setStep1ValidationFailed(false);
    setCurrentStep(2);
    scrollToPageTop();
  }

  async function handleSubmitOrder() {
    if (!cartItems.length || !isAddressValid || !hasAcceptedPolicies) {
      setShowPoliciesError(!hasAcceptedPolicies);
      return;
    }

    setIsSubmittingOrder(true);
    setOrderEmailStatus("sending");
    setOrderEmailError("");
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    const generatedOrderId = `BR-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Math.floor(100000 + Math.random() * 900000)}`;

    const emailSent = await sendOrderConfirmationEmail(generatedOrderId);

    if (emailSent) {
      setOrderEmailStatus("sent");
    } else {
      setOrderEmailStatus("failed");
      setOrderEmailError(
        "Поръчката е приета, но не успяхме да изпратим имейл потвърждение. Можеш да опиташ отново по-късно.",
      );
    }

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
              stepErrors={{ 1: step1HasError }}
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
                                <div>
                                  <p className="text-lg font-semibold text-[#432855]">
                                    {item.product.price}
                                  </p>
                                  {item.quantity > 1 ? (
                                    <p className="mt-0.5 text-xs text-[#8f72a7]">
                                      Общо: {formatPrice(item.totalPrice)}
                                    </p>
                                  ) : null}
                                </div>
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

                            <div className="hidden min-w-0 items-stretch gap-4 md:flex">
                              <div className="aspect-square w-[140px] shrink-0 self-end overflow-hidden rounded-[18px] border border-[#ece3f2] bg-[#fcf9ff]">
                                {productImage ? (
                                  <Image
                                    src={productImage}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
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
                                  {item.quantity > 1 ? (
                                    <p className="mt-0.5 text-xs text-[#8f72a7]">
                                      Общо: {formatPrice(item.totalPrice)}
                                    </p>
                                  ) : null}
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
                          onFocus={(e) => scrollFieldToTop(e.currentTarget)}
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

                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <span className="text-sm font-medium text-[#432855]">Начин на плащане</span>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#6b587f]">
                          <svg aria-hidden="true" viewBox="0 0 38 24" className="h-[1.35rem] w-[1.7rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 5h14v11H1z" />
                            <path d="M15 9h4.5l3 3.5V16H15z" />
                            <circle cx="5.5" cy="18" r="2" />
                            <circle cx="19" cy="18" r="2" />
                            <path d="M25 12h2" strokeWidth="1.4" />
                            <rect x="28" y="7" width="9" height="6" rx="1" />
                            <circle cx="32.5" cy="10" r="1.3" />
                          </svg>
                        </span>
                        <p className="text-sm leading-5 text-[#5f4b73]">
                          Плащането става лесно и сигурно с наложен платеж при получаване.
                        </p>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs font-medium leading-5 text-[#6b587f]">
                        Доставката се извършва от куриерска фирма Спиди.
                      </p>
                    </div>

                    <label className="sm:col-span-2 min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                      <span>Начин на доставка</span>
                      <div ref={deliveryDropdownRef} className="relative">
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isDeliveryDropdownOpen}
                          onClick={() => setIsDeliveryDropdownOpen((current) => !current)}
                          className="flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-left text-[#432855] outline-none transition focus:border-[#9f79ac]"
                        >
                          <span>{getDeliveryMethodLabel(deliveryMethod)}</span>
                          <span className="shrink-0 text-[#6b587f]">
                            <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition ${isDeliveryDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 8l5 5 5-5" />
                            </svg>
                          </span>
                        </button>

                        {isDeliveryDropdownOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] p-2 shadow-[0_24px_80px_rgba(67,40,85,0.16)]">
                            <div className="space-y-2">
                              {deliveryOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => applyDeliveryMethod(option.value)}
                                  className={`flex w-full rounded-[16px] border px-4 py-3 text-left transition ${
                                    deliveryMethod === option.value
                                      ? "border-[#e4d6ea] bg-white"
                                      : "border-transparent bg-white/70 hover:border-[#d9cce3]"
                                  }`}
                                >
                                  <span className="text-sm font-semibold text-[#432855]">
                                    {option.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
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
                            onFocus={(e) => scrollFieldToTop(e.currentTarget)}
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
                            onFocus={(e) => scrollFieldToTop(e.currentTarget)}
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
                            {getOfficePickerLabel(deliveryMethod)}
                            <span className="ml-1 text-[#b5445c]">*</span>
                          </span>
                          <div ref={officeDropdownRef} className="relative">
                            <button
                              type="button"
                              aria-haspopup="listbox"
                              aria-expanded={isOfficeDropdownOpen}
                              onClick={() => setIsOfficeDropdownOpen((current) => !current)}
                              className={`flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-[18px] border bg-[#faf7fc] px-4 text-left text-[#432855] outline-none transition ${
                                touchedFields.officeId && fieldErrors.officeId
                                  ? "border-[#d85b73]"
                                  : "border-[#ddd3e4]"
                              }`}
                            >
                              <span className={address.officeId ? "text-[#432855]" : "text-[#8f72a7]"}>
                                {selectedSpeedyOffice
                                  ? [selectedSpeedyOffice.address.siteName, selectedSpeedyOffice.address.fullAddressString ?? selectedSpeedyOffice.name]
                                      .filter(Boolean)
                                      .join(", ")
                                  : `${getOfficePickerLabel(deliveryMethod)} от списъка`}
                              </span>
                              <span className="shrink-0 text-[#6b587f]">
                                <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 transition ${isOfficeDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 8l5 5 5-5" />
                                </svg>
                              </span>
                            </button>

                            {isOfficeDropdownOpen ? (
                              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] p-2 shadow-[0_24px_80px_rgba(67,40,85,0.16)]">
                                <input
                                  ref={officeSearchInputRef}
                                  type="text"
                                  name="speedy-office-filter"
                                  autoComplete="new-password"
                                  autoCorrect="off"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  data-form-type="other"
                                  data-lpignore="true"
                                  placeholder={getOfficeSearchPlaceholder(deliveryMethod)}
                                  value={officeQuery}
                                  onChange={(event) => {
                                    setOfficeQuery(event.target.value);
                                    setAddress((current) => ({
                                      ...current,
                                      officeId: "",
                                    }));
                                    setSelectedSpeedyOffice(null);
                                  }}
                                  onFocus={(e) => scrollFieldToTop(e.currentTarget)}
                                  className="mb-2 h-11 w-full rounded-[14px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
                                />

                                <div className="max-h-64 overflow-y-auto">
                                  {isLoadingOffices ? (
                                    <p className="px-2 py-3 text-sm text-[#8f72a7]">Търсене...</p>
                                  ) : officeQuery.trim().length < 2 ? (
                                    <p className="px-2 py-3 text-sm text-[#8f72a7]">Въведи поне 2 символа за търсене.</p>
                                  ) : officeSearchResults.length ? (
                                    <div className="space-y-2">
                                      {officeSearchResults.map((office) => (
                                        <button
                                          key={office.id}
                                          type="button"
                                          onClick={() => {
                                            setAddress((current) => ({
                                              ...current,
                                              officeId: String(office.id),
                                            }));
                                            setSelectedSpeedyOffice(office);
                                            setOfficeQuery("");
                                            setTouchedFields((current) => ({
                                              ...current,
                                              officeId: true,
                                            }));
                                            setIsOfficeDropdownOpen(false);
                                          }}
                                          className={`flex w-full flex-col rounded-[16px] border px-4 py-3 text-left transition ${
                                            address.officeId === String(office.id)
                                              ? "border-[#e4d6ea] bg-white"
                                              : "border-transparent bg-white/70 hover:border-[#d9cce3]"
                                          }`}
                                        >
                                          <span className="text-sm font-semibold text-[#432855]">
                                            {office.address.siteName ?? office.name}
                                          </span>
                                          <span className="mt-1 text-sm leading-5 text-[#6b587f]">
                                            {office.address.fullAddressString ?? office.name}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="px-2 py-3 text-sm text-[#6b587f]">
                                      {getOfficeEmptyLabel(deliveryMethod)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {touchedFields.officeId && fieldErrors.officeId ? (
                            <span className="text-xs font-medium text-[#c04e65]">
                              {fieldErrors.officeId}
                            </span>
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
                          onFocus={(e) => scrollFieldToTop(e.currentTarget)}
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
                        onFocus={(e) => scrollFieldToTop(e.currentTarget)}
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
                        Изпратихме потвърждението и започваме обработката на поръчката.
                      </p>
                      {orderEmailStatus === "sent" ? (
                        <p className="mt-2 text-[#4f6a57]">
                          Изпратихме имейл с обобщението на поръчката до{" "}
                          <span className="font-semibold text-[#305439]">{address.email}</span>.
                        </p>
                      ) : null}
                      {orderEmailStatus === "failed" ? (
                        <p className="mt-2 text-[#8d4e5f]">{orderEmailError}</p>
                      ) : null}
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
                        Изчакай няколко секунди, за да генерираме потвърждението и да изпратим имейл.
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
                    <span className="flex flex-col gap-0.5">
                      <span>Доставка</span>
                      <span className="text-xs text-[#8f72a7]">
                        {getDeliveryMethodLabel(deliveryMethod)} · {totalWeight.toFixed(2)} кг
                        {totalWeight > HEAVY_THRESHOLD_KG ? " · тежка пратка" : ""}
                        {isFreeShipping ? " · безплатна" : ""}
                      </span>
                    </span>
                    <span className={`font-medium ${isFreeShipping ? "text-[#2e7d46]" : "text-[#432855]"}`}>
                      {isFreeShipping ? "Безплатна" : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="h-px bg-[#e4dbea]" />
                  <div className="flex items-center justify-between gap-4 text-lg font-semibold text-[#432855]">
                    <span>Общо</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

              </aside>
            ) : null}

            {!orderId && cartItems.length ? (
              <p className="mt-3 text-xs leading-5 text-[#9a87b0]">
                Курс на превалутиране: €1 = {BGN_TO_EUR.toFixed(5)} лв. Възможно е незначително разминаване между крайните цени в лева поради закръгляне при превалутирането.
              </p>
            ) : null}

            {!orderId && cartItems.length ? (
              <Link
                href="/products"
                className={`mt-2 flex items-center gap-4 rounded-[18px] border px-4 py-3.5 transition ${
                  isFreeShipping
                    ? "border-[#3a9e52] bg-[#f4fbf5] hover:bg-[#edf7ef]"
                    : "border-[#d4b44a] bg-[#fdf9ee] hover:bg-[#faf4dc]"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    isFreeShipping
                      ? "bg-[linear-gradient(100deg,#2e7d65_0%,#1a5540_100%)] shadow-[0_0_14px_5px_rgba(58,158,82,0.4)]"
                      : "bg-[linear-gradient(100deg,#c8a020_0%,#a07810_100%)] shadow-[0_0_14px_5px_rgba(200,160,32,0.45)]"
                  } text-white`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className={`text-sm font-semibold ${isFreeShipping ? "text-[#1a5c30]" : "text-[#7a5c10]"}`}>
                    {isFreeShipping
                      ? "Безплатна доставка!"
                      : `Остават €${(FREE_SHIPPING_THRESHOLD_EUR - subtotal).toFixed(2)} до безплатна доставка`}
                  </span>
                  <span className={`text-xs ${isFreeShipping ? "text-[#3a7a50]" : "text-[#9a7820]"}`}>
                    {isFreeShipping ? "Добавена е безплатна доставка за вашата поръчка." : "Добави още продукти и спести от доставката."}
                  </span>
                </span>
              </Link>
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
                    onClick={() => {
                      setCurrentStep((step) => Math.max(0, step - 1));
                      setStep1ValidationFailed(false);
                    }}
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
