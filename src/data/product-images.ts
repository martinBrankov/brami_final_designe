import type { StaticImageData } from "next/image";

import id01 from "@/assets/images/products/krem-za-litse-s-shafran-saffron-adela-sunny-50-ml/krem-za-litse-s-shafran-saffron-adela-sunny-50-ml.jpg";
import id02 from "@/assets/images/products/krem-losion-za-tyalo-s-shafran-saffron-adela-sunny-120-ml/krem-losion-za-tyalo-s-shafran-saffron-adela-sunny-120-ml.jpg";
import id03 from "@/assets/images/products/balsam-za-kosa-s-shafran-saffron-adela-sunny-250-ml/balsam-za-kosa-s-shafran-saffron-adela-sunny-250-ml.jpg";
import id04 from "@/assets/images/products/dush-gel-s-shafran-tuberoza-i-krusha-saffron-adela-sunny-250-ml/dush-gel-s-shafran-tuberoza-i-krusha-saffron-adela-sunny-250-ml.jpg";
import id05 from "@/assets/images/products/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-300-ml/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-300-ml.jpg";
import id06 from "@/assets/images/products/shampoan-s-shafran-saffron-adela-sunny-250-ml/shampoan-s-shafran-saffron-adela-sunny-250-ml.jpg";
import id07 from "@/assets/images/products/dush-gel-s-shafran-saffron-adela-sunny-250-ml/dush-gel-s-shafran-saffron-adela-sunny-250-ml.jpg";
import id08 from "@/assets/images/products/glitserinov-sapun-s-shafran-saffron-adela-sunny-80-g/glitserinov-sapun-s-shafran-saffron-adela-sunny-80-g.jpg";
import id09 from "@/assets/images/products/shampoan-s-shafran-saffron-adela-sunny-50-ml/shampoan-s-shafran-saffron-adela-sunny-50-ml.jpg";
import id10 from "@/assets/images/products/dush-gel-s-shafran-saffron-adela-sunny-50-ml/dush-gel-s-shafran-saffron-adela-sunny-50-ml.jpg";
import id11 from "@/assets/images/products/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-50-ml/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-50-ml.jpg";
import id12 from "@/assets/images/products/podarachen-komplekt-s-shafran-saffron-adela-sunny/podarachen-komplekt-s-shafran-saffron-adela-sunny.jpg";
import id13 from "@/assets/images/products/komplekt-za-patuvane-s-shafran-saffron-adela-sunny-3x50-ml/komplekt-za-patuvane-s-shafran-saffron-adela-sunny-3x50-ml.jpg";
import id14 from "@/assets/images/products/ozaryavashta-maska-za-litse-voditsa-100-ml/ozaryavashta-maska-za-litse-voditsa-100-ml.jpg";
import id15 from "@/assets/images/products/noshten-krem-protiv-brachki-voditsa-50-ml/noshten-krem-protiv-brachki-voditsa-50-ml.jpg";
import id16 from "@/assets/images/products/dneven-krem-protiv-brachki-voditsa-50-ml/dneven-krem-protiv-brachki-voditsa-50-ml.jpg";
import id17 from "@/assets/images/products/okoloochen-krem-protiv-brachki-voditsa-15-ml/okoloochen-krem-protiv-brachki-voditsa-15-ml.jpg";
import id18 from "@/assets/images/products/hidratirasht-mist-za-litse-voditsa-100-ml/hidratirasht-mist-za-litse-voditsa-100-ml.jpg";
import id19 from "@/assets/images/products/mitselarna-voda-s-roza-voditsa-250-ml/mitselarna-voda-s-roza-voditsa-250-ml.jpg";
import id20 from "@/assets/images/products/voda-ot-shafran-hidrolat-100-ml/voda-ot-shafran-hidrolat-100-ml.jpg";
import id21 from "@/assets/images/products/serum-za-litse-s-shafran-perla-i-vitamin-c-shafpol-beauty-30-ml/serum-za-litse-s-shafran-perla-i-vitamin-c-shafpol-beauty-30-ml.jpg";
import id22 from "@/assets/images/products/slantsezashtiten-krem-za-litse-spf-50-shafpol-beauty-50-ml/slantsezashtiten-krem-za-litse-spf-50-shafpol-beauty-50-ml.jpg";
import id23 from "@/assets/images/products/shafrancho-i-priyateli-detska-knizhka/shafrancho-i-priyateli-detska-knizhka.jpg";
import id24 from "@/assets/images/products/pochistvasht-gel-za-litse-pure-pearl-shafpol-beauty-150-ml/pochistvasht-gel-za-litse-pure-pearl-shafpol-beauty-150-ml.jpg";

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
  id20,
  id21,
  id22,
  id23,
  id24,
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
