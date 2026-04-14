import productsJson from "../../entryData/products.json";
import id01 from "@/assets/images/products/0000001/01.jpg";
import id02 from "@/assets/images/products/0000002/01.jpg";
import id03 from "@/assets/images/products/0000003/01.jpg";
import id04 from "@/assets/images/products/0000004/01.jpg";
import id05 from "@/assets/images/products/0000005/01.jpg";
import id06 from "@/assets/images/products/0000006/01.jpg";
import id07 from "@/assets/images/products/0000007/01.jpg";
import id08 from "@/assets/images/products/0000008/01.jpg";
import id09 from "@/assets/images/products/0000009/01.jpg";
import id10 from "@/assets/images/products/00000010/01.jpg";
import id11 from "@/assets/images/products/00000011/01.jpg";
import id12 from "@/assets/images/products/00000012/01.jpg";
import id13 from "@/assets/images/products/00000013/01.jpg";
import id14 from "@/assets/images/products/00000014/01.jpg";
import id15 from "@/assets/images/products/00000015/01.jpg";
import id16 from "@/assets/images/products/00000016/01.jpg";
import id17 from "@/assets/images/products/00000017/01.jpg";
import id18 from "@/assets/images/products/00000018/01.jpg";
import id19 from "@/assets/images/products/00000019/01.jpg";

export interface Comment {
  name: string;
  comment: string;
  rating: number;
  data: string;
}

export type Product = {
  id: number;
  name: string;
  category: ("hair" | "body" | "face")[];
  // Audience tags used by the product-list filter: women, men, unisex.
  audience: ("women" | "men" | "unisex")[];
  brand: "brami" | "vodica" | "other";
  badge: "bestseller" | "sale" | "new" | "favorite" | "featured";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageSrc: any[];
  checkboxInfo: string[];
  price: string;
  packaging: string;
  weight: number;
  rating: number;
  comments: Comment[];
  description: string;
  relatedProductIds: number[];
};

type ProductJson = {
  id: number;
  name: string;
  category: string[];
  audience?: string[];
  brand: string;
  badge: string;
  imageSrc: unknown[];
  checkboxInfo?: string[];
  price: string;
  packaging: string;
  weight?: number;
  rating: number;
  comments: Comment[];
  description: string;
  relatedProductIds?: number[];
};

const allowedCategories = new Set<Product["category"][number]>([
  "hair",
  "body",
  "face",
]);
const allowedAudiences = new Set<Product["audience"][number]>([
  "women",
  "men",
  "unisex",
]);

const allowedBrands = new Set<Product["brand"]>(["brami", "vodica", "other"]);
const allowedBadges = new Set<Product["badge"]>([
  "bestseller",
  "sale",
  "new",
  "favorite",
  "featured",
]);
const unicodeToByte = new Map<string, number>();

const productImages = {
  id01,
  id02,
  id03,
  id04,
  id05,
  id06,
  id07,
  id08,
  id09,
  id10,
  id11,
  id12,
  id13,
  id14,
  id15,
  id16,
  id17,
  id18,
  id19,
} as const;

for (let index = 0; index < 256; index += 1) {
  const char = new TextDecoder("windows-1251").decode(
    Uint8Array.from([index]),
  );

  if (!unicodeToByte.has(char)) {
    unicodeToByte.set(char, index);
  }
}

function fixMojibake(value: string): string {
  if (!/[РСЃЎҐВ]/.test(value)) {
    return value;
  }

  const bytes: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);

    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }

    const mapped = unicodeToByte.get(char);

    if (mapped === undefined) {
      return value;
    }

    bytes.push(mapped);
  }

  const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  return /[\u0400-\u04FF]/.test(decoded) && !decoded.includes("�")
    ? decoded
    : value;
}

function parseComments(comments: Comment[]): Comment[] {
  if (!Array.isArray(comments)) {
    return [];
  }

  return comments.map((comment) => ({
    name: fixMojibake(comment.name),
    comment: fixMojibake(comment.comment),
    rating: comment.rating,
    data: fixMojibake(comment.data),
  }));
}

function parseCategory(category: string[]): Product["category"] {
  return category.filter(
    (item): item is Product["category"][number] =>
      allowedCategories.has(item as Product["category"][number]),
  );
}

function parseAudience(audience?: string[]): Product["audience"] {
  if (!Array.isArray(audience)) {
    return ["unisex"];
  }

  const parsedAudience = audience.filter(
    (item): item is Product["audience"][number] =>
      allowedAudiences.has(item as Product["audience"][number]),
  );

  return parsedAudience.length ? parsedAudience : ["unisex"];
}

function parseBrand(brand: string): Product["brand"] {
  return allowedBrands.has(brand as Product["brand"])
    ? (brand as Product["brand"])
    : "other";
}

function parseBadge(badge: string): Product["badge"] {
  return allowedBadges.has(badge as Product["badge"])
    ? (badge as Product["badge"])
    : "featured";
}

function parseImageSrc(imageSrc: unknown[]): Product["imageSrc"] {
  if (!Array.isArray(imageSrc)) {
    return [];
  }

  return imageSrc.flatMap((item) => {
    if (typeof item !== "string") {
      return [];
    }

    const image = productImages[item as keyof typeof productImages];
    return image ? [image] : [];
  });
}

function parseCheckboxInfo(checkboxInfo?: string[]): string[] {
  if (!Array.isArray(checkboxInfo)) {
    return ["Натурален продукт"];
  }

  return checkboxInfo.map((item) => fixMojibake(item));
}

function parseRelatedProductIds(relatedProductIds?: number[]): number[] {
  if (!Array.isArray(relatedProductIds)) {
    return [];
  }

  return relatedProductIds.filter((id): id is number => Number.isInteger(id));
}

function parseProduct(product: ProductJson): Product {
  return {
    id: product.id,
    name: fixMojibake(product.name),
    category: parseCategory(product.category),
    audience: parseAudience(product.audience),
    brand: parseBrand(product.brand),
    badge: parseBadge(product.badge),
    imageSrc: parseImageSrc(product.imageSrc),
    checkboxInfo: parseCheckboxInfo(product.checkboxInfo),
    price: fixMojibake(product.price),
    packaging: fixMojibake(product.packaging),
    weight: typeof product.weight === "number" ? product.weight : 0.2,
    rating: product.rating,
    comments: parseComments(product.comments),
    description: fixMojibake(product.description),
    relatedProductIds: parseRelatedProductIds(product.relatedProductIds),
  };
}

export const products: Product[] = (productsJson as ProductJson[]).map(
  parseProduct,
);

export function getProductBadgeLabel(badge: Product["badge"]): string {
  switch (badge) {
    case "bestseller":
      return "Най-продаван";
    case "sale":
      return "-20%";
    case "new":
      return "Нов";
    case "favorite":
      return "Препоръчваме Ви";
    case "featured":
      return "Избрано";
    default:
      return "Продукт";
  }
}

export function getProductById(id: number): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getProductsByIds(ids: number[]): Product[] {
  return ids
    .map((id) => getProductById(id))
    .filter((product): product is Product => product !== undefined);
}

export function getProductDescription(product: Product): string {
  const description = product.description.trim();

  if (description) {
    return description;
  }

  const highlights = product.checkboxInfo.length
    ? `<br/><br/><b>Акценти:</b><br/>${product.checkboxInfo.join("<br/>")}`
    : "";

  return [
    `<b>${product.name}</b>`,
    `${product.packaging} от ${getProductBadgeLabel(product.badge).toLowerCase()} продукт с подбрани съставки и предназначение за ежедневна грижа.`,
    highlights,
  ].join("<br/>");
}

function stripHtml(value: string): string {
  return value
    .replaceAll(/<br\s*\/?>/gi, " ")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getProductShareDescription(product: Product): string {
  const plainDescription = stripHtml(product.description);
  const firstSentence = plainDescription.match(/.+?[.!?](?:\s|$)/)?.[0]?.trim();

  if (firstSentence && firstSentence.length >= 40) {
    return trimToLength(firstSentence, 140);
  }

  const highlights = product.checkboxInfo.slice(0, 2).join(", ");
  const fallback = [
    product.packaging,
    highlights || "Натурална грижа за ежедневна употреба",
  ].join(" • ");

  return trimToLength(fallback, 140);
}
