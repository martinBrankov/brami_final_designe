"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { HTMLInputTypeAttribute } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CartQuantityStepper } from "@/components/cart-quantity-stepper";
import { CartStepper } from "@/components/cart-stepper";
import { useCart } from "@/components/cart-provider";
import { useUser } from "@/components/user-provider";
import { IconCircleButton } from "@/components/icon-circle-button";
import { ProductCarouselSection } from "@/components/product-carousel-section";
import {
  SectionIntro,
  pageSectionClassName,
  sectionActionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";
import {
  BGN_TO_EUR,
  FREE_SHIPPING_THRESHOLD_EUR,
  HEAVY_THRESHOLD_KG,
  PACKAGING_WEIGHT_TABLE,
  SHIPPING_RATES,
  SHIPPING_RATE_TABLE,
} from "@/data/products";
import { useProducts } from "@/components/products-context";
import { getProductHref } from "@/data/products";
import { Link } from "@/i18n/navigation";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function calcShipping(method: DeliveryMethod, totalWeightKg: number): number {
  if (method === "locker") {
    return SHIPPING_RATES.locker.standard;
  }

  const bracket = SHIPPING_RATE_TABLE[method].find(
    (entry) => totalWeightKg <= entry.maxWeightKg,
  );
  const fallback = SHIPPING_RATE_TABLE[method][SHIPPING_RATE_TABLE[method].length - 1];

  return (bracket ?? fallback).eur * BGN_TO_EUR;
}

function getPackagingWeightKg(productsWeightKg: number) {
  const bracket = PACKAGING_WEIGHT_TABLE.find(
    (entry) => productsWeightKg <= entry.maxWeightKg,
  );
  const fallback = PACKAGING_WEIGHT_TABLE[PACKAGING_WEIGHT_TABLE.length - 1];

  return (bracket ?? fallback).packagingWeightKg;
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

function getContactFields(t: Translate): DeliveryFieldConfig[] {
  return [
    ["fullName", t("fields.fullName"), "text", "name", t("fields.fullNamePlaceholder"), true],
    ["phone", t("fields.phone"), "tel", "tel", t("fields.phonePlaceholder"), true],
    ["email", t("fields.email"), "email", "email", t("fields.emailPlaceholder"), true],
  ];
}

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
  return `€${eur.toFixed(2)}`;
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

function getDeliveryMethodLabel(t: Translate, method: DeliveryMethod) {
  switch (method) {
    case "office":
      return t("methods.office");
    case "locker":
      return t("methods.locker");
    default:
      return t("methods.address");
  }
}

function getOfficePickerLabel(t: Translate, method: DeliveryMethod) {
  return method === "locker" ? t("speedy.chooseLocker") : t("speedy.chooseOffice");
}

function getOfficeSearchPlaceholder(t: Translate, method: DeliveryMethod) {
  return method === "locker" ? t("speedy.searchLocker") : t("speedy.searchOffice");
}

function getOfficeEmptyLabel(t: Translate, method: DeliveryMethod) {
  return method === "locker" ? t("speedy.noLockers") : t("speedy.noOffices");
}

function getSpeedyLocationTypeLabel(t: Translate, type?: SpeedyOffice["type"]) {
  return type === "APT" ? t("speedy.locker") : t("speedy.office");
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
  const t = useTranslations("Cart");
  const locale = useLocale();
  const deliveryDropdownRef = useRef<HTMLDivElement | null>(null);
  const products = useProducts();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { user, profile: userProfile, discount: userDiscount } = useUser();
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
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    merchantId: string;
    discountPercent: number;
    commissionPercent: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("step") === "delivery") {
      setCurrentStep(1);
    }
  }, []);

  useEffect(() => {
    if (!user && !userProfile) {
      return;
    }

    setAddress((current) => ({
      ...current,
      fullName: current.fullName || userProfile?.fullName || "",
      phone: current.phone || (userProfile?.phone ? formatPhoneInput(userProfile.phone) : ""),
      email: current.email || user?.email || "",
      city: current.city || userProfile?.city || "",
      postcode: current.postcode || userProfile?.postalCode || "",
      addressLine: current.addressLine || userProfile?.address || "",
    }));
  }, [user, userProfile]);

  const hasInitializedPreferredOfficeRef = useRef(false);

  useEffect(() => {
    if (hasInitializedPreferredOfficeRef.current) {
      return;
    }

    const office = userProfile?.preferredOffice;
    const locker = userProfile?.preferredLocker;
    const preferred = office
      ? { kind: "office" as DeliveryMethod, slot: office }
      : locker
        ? { kind: "locker" as DeliveryMethod, slot: locker }
        : null;

    if (!preferred) {
      return;
    }

    hasInitializedPreferredOfficeRef.current = true;
    setDeliveryMethod(preferred.kind);
    setAddress((current) => ({
      ...current,
      officeId: preferred.slot.id,
    }));
    setSelectedSpeedyOffice(preferred.slot.data as SpeedyOffice);
  }, [userProfile]);

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
  const productsWeight = cartItems.reduce(
    (sum, item) => sum + item.product.weight * item.quantity,
    0,
  );
  const packagingWeight = getPackagingWeightKg(productsWeight);
  const totalWeight = productsWeight + packagingWeight;
  const isHeavyShipment = totalWeight > HEAVY_THRESHOLD_KG;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD_EUR;
  const shipping = cartItems.length && !isFreeShipping ? calcShipping(deliveryMethod, totalWeight) / BGN_TO_EUR : 0;
  // Only active (consented) merchants are on the merchant programme; otherwise
  // they accumulate the normal loyalty discount like any user.
  const isActiveMerchant =
    user?.role === "merchant" && Boolean(userProfile?.merchantTermsAccepted);
  const loyaltyPercent = isActiveMerchant ? 0 : userDiscount?.currentPercent ?? 0;
  const merchantPercent = isActiveMerchant
    ? userProfile?.effectiveMerchantDiscountPercent ?? 0
    : 0;
  const personalDiscountPercent = Math.max(loyaltyPercent, merchantPercent);
  const personalDiscountSource: "loyalty" | "merchant" | null =
    personalDiscountPercent === 0
      ? null
      : merchantPercent >= loyaltyPercent && merchantPercent > 0
        ? "merchant"
        : "loyalty";
  const promoEnteredPercent = appliedPromo?.discountPercent ?? 0;
  const promoWins =
    appliedPromo != null && promoEnteredPercent >= personalDiscountPercent && promoEnteredPercent > 0;
  const discountSource: "promo" | "personal" | null =
    promoWins ? "promo" : personalDiscountPercent > 0 ? "personal" : null;
  const personalDiscountPercentApplied =
    discountSource === "personal" ? personalDiscountPercent : 0;
  const personalDiscountAmount =
    discountSource === "personal" ? (subtotal * personalDiscountPercent) / 100 : 0;
  const promoDiscountPercent = promoWins ? promoEnteredPercent : 0;
  const promoDiscountAmount = promoWins ? (subtotal * promoEnteredPercent) / 100 : 0;
  const promoCommissionPercent = promoWins ? appliedPromo?.commissionPercent ?? 0 : 0;
  const promoCommissionAmount = promoWins
    ? (subtotal * (appliedPromo?.commissionPercent ?? 0)) / 100
    : 0;
  const discountPercent = promoWins ? promoEnteredPercent : personalDiscountPercentApplied;
  const discountAmount = promoWins ? promoDiscountAmount : personalDiscountAmount;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const total = discountedSubtotal + shipping;
  const promoIgnoredByPersonal =
    appliedPromo != null && !promoWins && personalDiscountPercent > 0;
  const relatedCartProducts = useMemo(() => {
    if (!cartItems.length) {
      return [];
    }

    const cartProductIds = new Set(cartItems.map((item) => item.product.id));
    const relatedIds = Array.from(
      new Set(cartItems.flatMap((item) => item.product.relatedProductIds)),
    ).filter((id) => !cartProductIds.has(id));

    return relatedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
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
          return t("errors.nameRequired");
        }

        if (trimmedValue.length < 5) {
          return t("errors.nameInvalid");
        }

        return "";
      case "phone":
        if (!trimmedValue) {
          return t("errors.phoneRequired");
        }

        if (!/^[+0-9\s()-]{8,}$/.test(trimmedValue)) {
          return t("errors.phoneInvalid");
        }

        return "";
      case "email":
        if (!trimmedValue) {
          return t("errors.emailRequired");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
          return t("errors.emailInvalid");
        }

        return "";
      case "officeId":
        if (isOfficePickupMethod(deliveryMethod) && !trimmedValue) {
          return deliveryMethod === "locker"
            ? t("errors.lockerRequired")
            : t("errors.officeRequired");
        }

        return "";
      case "city":
        if (isOfficePickupMethod(deliveryMethod)) {
          return "";
        }

        if (!trimmedValue) {
          return t("errors.cityRequired");
        }

        return "";
      case "postcode":
        if (isOfficePickupMethod(deliveryMethod)) {
          return "";
        }

        if (!trimmedValue) {
          return t("errors.postcodeRequired");
        }

        if (!/^\d{3,10}$/.test(trimmedValue)) {
          return t("errors.postcodeInvalid");
        }

        return "";
      case "addressLine":
        if (isOfficePickupMethod(deliveryMethod)) {
          return "";
        }

        if (!trimmedValue) {
          return t("errors.addressRequired");
        }

        if (trimmedValue.length < 8) {
          return t("errors.addressTooShort");
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

  async function applyPromoCode() {
    setPromoError(null);
    const code = promoInput.trim();
    if (!code) {
      setPromoError(t("promo.required"));
      return;
    }

    setIsApplyingPromo(true);
    try {
      const response = await fetch("/api/auth/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            promo?: {
              id: string;
              code: string;
              merchantId: string;
              discountPercent: number;
              commissionPercent: number;
            };
          }
        | null;

      if (!response.ok || !result?.ok || !result.promo) {
        setPromoError(result?.error || t("promo.invalid"));
        setAppliedPromo(null);
        return;
      }

      setAppliedPromo(result.promo);
      setPromoInput(result.promo.code);
    } catch {
      setPromoError(t("promo.checkError"));
    } finally {
      setIsApplyingPromo(false);
    }
  }

  function clearAppliedPromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  }

  function applyDeliveryMethod(nextMethod: DeliveryMethod) {
    setDeliveryMethod(nextMethod);
    setOfficeQuery("");
    setOfficeSearchResults([]);
    setIsOfficeDropdownOpen(false);
    setIsDeliveryDropdownOpen(false);

    const savedSlot =
      nextMethod === "office"
        ? userProfile?.preferredOffice ?? null
        : nextMethod === "locker"
          ? userProfile?.preferredLocker ?? null
          : null;

    setSelectedSpeedyOffice(savedSlot ? (savedSlot.data as SpeedyOffice) : null);
    setAddress((current) => ({
      ...current,
      officeId: savedSlot ? savedSlot.id : "",
      city: nextMethod === "address" ? userProfile?.city ?? "" : "",
      postcode: nextMethod === "address" ? userProfile?.postalCode ?? "" : "",
      addressLine: nextMethod === "address" ? userProfile?.address ?? "" : "",
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
    { value: "address" as const, label: t("methods.address") },
    { value: "office" as const, label: t("methods.office") },
    ...(!isHeavyShipment ? [{ value: "locker" as const, label: t("methods.locker") }] : []),
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
      // Stored status values stay in Bulgarian; they are translated on display.
      status: "Потвърдена",
      locale,
      createdAt: new Date().toLocaleString("bg-BG"),
      customer: {
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        email: address.email.trim(),
      },
      delivery: {
        methodLabel: getDeliveryMethodLabel(t, deliveryMethod),
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
        subtotal: discountedSubtotal,
        shipping,
        total,
        discountPercent,
        discountAmount,
        originalSubtotal: subtotal,
        personalDiscountPercent: personalDiscountPercentApplied,
        personalDiscountAmount,
        personalDiscountSource: discountSource === "personal" ? personalDiscountSource : null,
      },
      promo:
        appliedPromo && promoWins
          ? {
              id: appliedPromo.id,
              code: appliedPromo.code,
              merchantId: appliedPromo.merchantId,
              discountPercent: appliedPromo.discountPercent,
              discountAmount: promoDiscountAmount,
              commissionPercent: appliedPromo.commissionPercent,
              commissionAmount: promoCommissionAmount,
            }
          : null,
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
        t("emailFailed"),
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
            title={t("title")}
            titleAs="h1"
            size="page"
            description={t("description")}
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
                  <h2 className="font-serif text-3xl text-[#432855]">{t("productsInCart")}</h2>
                  {cartItems.length ? (
                    <div className="mt-6 space-y-4">
                      {cartItems.map((item) => {
                        const productImage = item.product.imageSrc[0];
                        const cartImageClassName =
                          item.product.id === 1
                            ? "scale-[1.06] object-top"
                            : "";

                        return (
                          <article
                            key={item.product.id}
                            className="py-4 md:border-b md:border-[#e4dbea] md:last:border-b-0"
                          >
                            <div className="grid grid-cols-[92px_minmax(0,1fr)] grid-rows-[auto_auto_auto] gap-x-4 gap-y-3 md:hidden">
                              <div className="col-span-2 row-start-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <Link
                                    href={getProductHref(item.product)}
                                    className="block min-w-0 flex-1 line-clamp-2 font-serif text-[1.25rem] leading-7 text-[#432855] transition hover:text-[#6c3f8d]"
                                  >
                                    {item.product.name}
                                  </Link>
                                  <IconCircleButton
                                    onClick={() => removeItem(item.product.id)}
                                    label={t("removeProduct")}
                                    className="h-8 w-8 shrink-0 text-[1.2rem]"
                                  >
                                    {"\u00d7"}
                                  </IconCircleButton>
                                </div>
                                <p className="mt-1 text-sm text-[#6b587f]">
                                  {item.product.packaging}
                                </p>
                              </div>

                              <div className="col-start-1 row-start-2 aspect-square w-[92px] shrink-0 overflow-hidden rounded-[18px] border border-[#ece3f2] bg-[#fcf9ff]">
                                {productImage ? (
                                  <Image
                                    src={productImage}
                                    alt={item.product.name}
                                    className={`block h-full w-full object-cover ${cartImageClassName}`}
                                  />
                                ) : (
                                  <div className="h-full w-full bg-[#f3edf7]" />
                                )}
                              </div>

                              <div className="col-start-2 row-start-2 flex min-w-0 flex-col justify-between self-stretch">
                                <div>
                                  <p className="text-lg font-semibold text-[#432855]">
                                    {item.product.price}
                                  </p>
                                  {item.quantity > 1 ? (
                                    <p className="mt-0.5 text-xs text-[#8f72a7]">
                                      {t("itemTotal", { price: formatPrice(item.totalPrice) })}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="mt-3">
                                  <CartQuantityStepper
                                    quantity={item.quantity}
                                    stock={item.product.stock}
                                    onChange={(next) => updateQuantity(item.product.id, next)}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="hidden min-w-0 items-stretch gap-4 md:flex">
                              <div className="aspect-square w-[184px] shrink-0 self-start overflow-hidden rounded-[18px] border border-[#ece3f2] bg-[#fcf9ff] lg:w-[196px]">
                                {productImage ? (
                                  <Image
                                    src={productImage}
                                    alt={item.product.name}
                                    className={`block h-full w-full object-cover ${cartImageClassName}`}
                                  />
                                ) : (
                                  <div className="aspect-square w-full bg-[#f3edf7]" />
                                )}
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-3">
                                    <Link
                                      href={getProductHref(item.product)}
                                      className="block min-w-0 flex-1 line-clamp-2 font-serif text-2xl leading-8 text-[#432855] transition hover:text-[#6c3f8d]"
                                    >
                                      {item.product.name}
                                    </Link>
                                    <IconCircleButton
                                      onClick={() => removeItem(item.product.id)}
                                      label={t("removeProduct")}
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
                                      {t("itemTotal", { price: formatPrice(item.totalPrice) })}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="mt-4">
                                  <CartQuantityStepper
                                    quantity={item.quantity}
                                    stock={item.product.stock}
                                    onChange={(next) => updateQuantity(item.product.id, next)}
                                  />
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 border border-dashed border-[#d8d0de] bg-[#faf7fc] p-8 text-center">
                      <p className="text-lg text-[#6b587f]">{t("empty")}</p>
                      <Link
                        href="/products"
                        className={`mt-5 flex w-full justify-center ${sectionPrimaryButtonClassName}`}
                      >
                        {t("toProducts")}
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div>
                  <h2 className="font-serif text-3xl text-[#432855]">{t("deliveryAddress")}</h2>
                  <p className="mt-2 text-[#6b587f]">
                    {t.rich("deliveryIntro", { mark: (chunks) => <span className="font-semibold text-[#b5445c]">{chunks}</span> })}
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {getContactFields(t).map(([key, label, type, autoComplete, placeholder, required]) => (
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

                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <span className="text-sm font-medium text-[#432855]">{t("paymentMethod")}</span>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#6b587f]">
                          <svg aria-hidden="true" viewBox="0 0 36 24" className="h-[1.35rem] w-[1.7rem]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <g opacity="0.45" strokeWidth="1.4">
                              <path d="M20 9h5l3 3v4h-8V9Z" />
                              <path d="M17 9h3v7h-3" />
                              <circle cx="22" cy="17.5" r="1.5" />
                              <circle cx="28" cy="17.5" r="1.5" />
                            </g>
                            <g strokeWidth="1.8">
                              <rect x="3" y="5" width="18" height="11" rx="2.5" />
                              <circle cx="12" cy="10.5" r="2.5" />
                              <path d="M6 8.5h1.5M17.5 12.5H19" />
                              <path d="M24 8.5c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3Z" />
                              <path d="M27.5 15.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S25 19.38 25 18s1.12-2.5 2.5-2.5Z" />
                            </g>
                          </svg>
                        </span>
                        <p className="text-sm leading-5 text-[#5f4b73]">
                          {t("codNote")}
                        </p>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="mb-2 text-xs font-medium leading-5 text-[#6b587f]">
                        {t("speedyNote")}
                      </p>
                    </div>

                    <label className="sm:col-span-2 min-w-0 flex flex-col gap-2 text-sm font-medium text-[#432855]">
                      <span>{t("deliveryMethod")}</span>
                      <div ref={deliveryDropdownRef} className="relative">
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isDeliveryDropdownOpen}
                          onClick={() => setIsDeliveryDropdownOpen((current) => !current)}
                          className="flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-left text-[#432855] outline-none transition focus:border-[#9f79ac]"
                        >
                          <span>{getDeliveryMethodLabel(t, deliveryMethod)}</span>
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
                            {t("fields.city")}
                            <span className="ml-1 text-[#b5445c]">*</span>
                          </span>
                          <input
                            type="text"
                            autoComplete="address-level2"
                            placeholder={t("fields.cityPlaceholder")}
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
                            {t("fields.postcode")}
                            <span className="ml-1 text-[#b5445c]">*</span>
                          </span>
                          <input
                            type="text"
                            autoComplete="postal-code"
                            inputMode="numeric"
                            placeholder={t("fields.postcodePlaceholder")}
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
                            {getOfficePickerLabel(t, deliveryMethod)}
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
                                  : t("speedy.fromList", { label: getOfficePickerLabel(t, deliveryMethod) })}
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
                                  placeholder={getOfficeSearchPlaceholder(t, deliveryMethod)}
                                  value={officeQuery}
                                  onChange={(event) => {
                                    setOfficeQuery(event.target.value);
                                    setAddress((current) => ({
                                      ...current,
                                      officeId: "",
                                    }));
                                    setSelectedSpeedyOffice(null);
                                  }}
                                  className="mb-2 h-11 w-full rounded-[14px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
                                />

                                <div className="max-h-64 overflow-y-auto">
                                  {isLoadingOffices ? (
                                    <p className="px-2 py-3 text-sm text-[#8f72a7]">{t("speedy.searching")}</p>
                                  ) : officeQuery.trim().length < 2 ? (
                                    <p className="px-2 py-3 text-sm text-[#8f72a7]">{t("speedy.minChars")}</p>
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
                                            {(office.address.siteName ?? office.name)} - {getSpeedyLocationTypeLabel(t, office.type)}
                                          </span>
                                          <span className="mt-1 text-sm leading-5 text-[#6b587f]">
                                            {office.address.fullAddressString ?? office.name}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="px-2 py-3 text-sm text-[#6b587f]">
                                      {getOfficeEmptyLabel(t, deliveryMethod)}
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
                          {t("fields.address")}
                          <span className="ml-1 text-[#b5445c]">*</span>
                        </span>
                        <input
                          type="text"
                          autoComplete="street-address"
                          placeholder={t("fields.addressPlaceholder")}
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
                      {t("fields.notes")}
                      <textarea
                        value={address.notes}
                        onChange={(event) =>
                          setAddress((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder={t("fields.notesPlaceholder")}
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
                        {t("consent.agree")}{" "}
                        <Link
                          href={{ pathname: "/privacy-policy", query: { from: "cart", step: "delivery" } }}
                          className="font-medium text-[#432855] underline decoration-[#cbb7d8] underline-offset-4"
                        >
                          {t("consent.privacy")}
                        </Link>{" "}
                        {t("consent.and")}{" "}
                        <Link
                          href={{ pathname: "/terms", query: { from: "cart", step: "delivery" } }}
                          className="font-medium text-[#432855] underline decoration-[#cbb7d8] underline-offset-4"
                        >
                          {t("consent.terms")}
                        </Link>
                        .
                      </span>
                    </label>

                    {showPoliciesError ? (
                      <p className="sm:col-span-2 text-xs font-medium text-[#c04e65]">
                        {t("consent.required")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div>
                  <h2 className="font-serif text-3xl text-[#432855]">{t("confirmation")}</h2>

                  {orderId ? (
                    <div className="mt-6 border border-[#d7ead8] bg-[#f5fbf5] p-6">
                      <p className="text-lg font-semibold text-[#305439]">
                        {t("orderSent")}
                      </p>
                      <p className="mt-3 text-[#4f6a57]">
                        {t.rich("orderNumber", { id: orderId ?? "", strong: (chunks) => <span className="font-semibold text-[#305439]">{chunks}</span> })}
                      </p>
                      <p className="mt-2 text-[#4f6a57]">
                        {t("orderProcessing")}
                      </p>
                      {orderEmailStatus === "sent" ? (
                        <p className="mt-2 text-[#4f6a57]">
                          {t("emailSentTo")}{" "}
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
                        {t("toProducts")}
                      </Link>
                    </div>
                  ) : isSubmittingOrder ? (
                    <div className="mt-6 border border-[#e4dbea] bg-[#faf7fc] p-6">
                      <p className="text-lg font-semibold text-[#432855]">
                        {t("sendingOrder")}
                      </p>
                      <p className="mt-3 text-[#6b587f]">
                        {t("sendingOrderHint")}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 border border-[#e4dbea] bg-[#faf7fc] p-6">
                      <p className="text-[#6b587f]">
                        {t("preparingConfirmation")}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

            </div>

            {!orderId && cartItems.length ? (
              <aside className="border-y border-[#d8d0de] bg-white py-6">
                <h2 className="font-serif text-3xl text-[#432855]">{t("summary")}</h2>
                <div className="mt-5 space-y-3 text-[#5f4b73]">
                  <div className="flex items-center justify-between gap-4">
                    <span>{t("summaryProducts")}</span>
                    <span className="font-medium text-[#432855]">{formatPrice(subtotal)}</span>
                  </div>
                  {discountSource === "personal" ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex flex-col gap-0.5">
                        <span>
                          {personalDiscountSource === "merchant"
                            ? t("merchantDiscount")
                            : t("loyaltyDiscount")}
                        </span>
                        <span className="text-xs text-[#8f72a7]">
                          {t("percentOfProducts", { percent: personalDiscountPercent })}
                        </span>
                      </span>
                      <span className="font-medium text-[#2e7d46]">
                        −{formatPrice(personalDiscountAmount)}
                      </span>
                    </div>
                  ) : null}
                  {discountSource === "promo" && appliedPromo ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex flex-col gap-0.5">
                        <span>{t("promo.applied", { code: appliedPromo.code })}</span>
                        <span className="text-xs text-[#8f72a7]">
                          {t("percentOfProducts", { percent: appliedPromo.discountPercent })}
                        </span>
                      </span>
                      <span className="font-medium text-[#2e7d46]">
                        −{formatPrice(promoDiscountAmount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex flex-col gap-0.5">
                      <span>{t("summaryDelivery")}</span>
                      <span className="text-xs text-[#8f72a7]">
                        {getDeliveryMethodLabel(t, deliveryMethod)} · {t("weightKg", { weight: totalWeight.toFixed(2) })}
                        {totalWeight > HEAVY_THRESHOLD_KG ? ` · ${t("heavyShipment")}` : ""}
                        {isFreeShipping ? ` · ${t("freeLower")}` : ""}
                      </span>
                    </span>
                    <span className={`font-medium ${isFreeShipping ? "text-[#2e7d46]" : "text-[#432855]"}`}>
                      {isFreeShipping ? t("free") : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="h-px bg-[#e4dbea]" />
                  <div className="flex items-center justify-between gap-4 text-lg font-semibold text-[#432855]">
                    <span>{t("total")}</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#e4dbea] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                    {t("promo.label")}
                  </p>
                  {appliedPromo ? (
                    <>
                      <div
                        className={`mt-2 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 ${
                          promoWins
                            ? "border-[#cce4d3] bg-[#f3faf4]"
                            : "border-[#e7d6c1] bg-[#fdf6ec]"
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            promoWins ? "text-[#2e6b3a]" : "text-[#8a6f45]"
                          }`}
                        >
                          {appliedPromo.code} · −{appliedPromo.discountPercent}%
                        </span>
                        <button
                          type="button"
                          onClick={clearAppliedPromo}
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9a3f3f] transition hover:underline"
                        >
                          {t("promo.remove")}
                        </button>
                      </div>
                      {promoIgnoredByPersonal ? (
                        <p className="mt-2 text-xs text-[#8a6f45]">
                          {t("promo.ignored", { percent: personalDiscountPercent })}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(event) => {
                          setPromoInput(event.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        placeholder={t("promo.placeholder")}
                        className="h-11 w-full rounded-[14px] border border-[#ddd3e4] bg-[#faf7fc] px-3 uppercase tracking-[0.08em] text-[#432855] outline-none transition focus:border-[#9f79ac]"
                      />
                      <button
                        type="button"
                        onClick={applyPromoCode}
                        disabled={isApplyingPromo || !promoInput.trim()}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isApplyingPromo ? t("promo.checking") : t("promo.apply")}
                      </button>
                    </div>
                  )}
                  {promoError ? (
                    <p className="mt-2 text-xs font-medium text-[#9a3f3f]">{promoError}</p>
                  ) : null}
                </div>

              </aside>
            ) : null}

            {!orderId && cartItems.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-[#9a87b0]">
                <li>
                  {t("lockerLimit")}
                </li>
              </ul>
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
                      ? t("freeShipping")
                      : t("toFreeShipping", { amount: (FREE_SHIPPING_THRESHOLD_EUR - subtotal).toFixed(2) })}
                  </span>
                  <span className={`text-xs ${isFreeShipping ? "text-[#3a7a50]" : "text-[#9a7820]"}`}>
                    {isFreeShipping ? t("freeShippingAdded") : t("addMoreProducts")}
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
                    {t("toDelivery")}
                  </button>
                ) : null}

                {currentStep === 0 && cartItems.length ? (
                  <Link
                    href="/products"
                    className={`w-full justify-center sm:w-auto ${sectionActionClassName} uppercase tracking-[0.08em]`}
                  >
                    {t("toProducts")}
                  </Link>
                ) : null}

                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleAddressStepContinue}
                    disabled={isSubmittingOrder}
                    className={`w-full justify-center sm:w-auto ${sectionPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isSubmittingOrder ? t("submitting") : t("confirm")}
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
                    {t("back")}
                  </button>
                ) : null}

              </div>
          </div>
        </div>
      </section>

      {relatedCartProducts.length ? (
        <ProductCarouselSection
          title={t("relatedProducts")}
          products={relatedCartProducts}
        />
      ) : null}
    </main>
  );
}
