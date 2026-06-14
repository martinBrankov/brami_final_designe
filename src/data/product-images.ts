import type { StaticImageData } from "next/image";

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

export const productImages = {
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

export type ProductImageKey = keyof typeof productImages;

export function getProductImage(
  key: string | undefined | null,
): StaticImageData | undefined {
  if (!key) {
    return undefined;
  }
  return productImages[key as ProductImageKey];
}
