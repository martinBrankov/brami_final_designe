import { getProductBrandName, getProductHref, getProducts, stripHtml, trimToLength } from "@/data/products";
import type { AppLocale } from "@/i18n/routing";
import { getBlogPosts } from "@/lib/blog";
import { COLLECTION_PATHS } from "@/lib/collections";
import { localizedUrl } from "@/lib/seo";

// /llms.txt – a plain-text map of the site for AI assistants
// (https://llmstxt.org). Bulgarian first, as the shop targets Bulgaria.
export const dynamic = "force-dynamic";

async function productLines(locale: AppLocale) {
  const products = await getProducts(locale);
  return products.map((product) => {
    const brand = getProductBrandName(product);
    const summary = trimToLength(stripHtml(product.summary || product.description), 180);
    return `- [${product.name}${brand ? ` – ${brand}` : ""}, ${product.packaging}](${localizedUrl(locale, getProductHref(product))}): ${summary}`;
  });
}

export async function GET() {
  const [bgProducts, enProducts, posts] = await Promise.all([
    productLines("bg"),
    productLines("en"),
    getBlogPosts("bg"),
  ]);
  const url = (locale: AppLocale, href: Parameters<typeof localizedUrl>[1]) => localizedUrl(locale, href);

  const body = `# Brami – натурална българска козметика с шафран

> Brami (Brami Trade, София, България) отглежда шафран (Crocus sativus) в България и създава натуралната козметична линия Saffron Adela Sunny – първата българска линия измивни продукти за коса и тяло с шафран (100% естествен шафран по ISO 3632). Онлайн магазинът brami.shop предлага и българска натурална козметика на Voditsa и Shafpol Beauty. Доставка със Speedy в цяла България за 1–3 работни дни, безплатна над 70 €. Плащане с наложен платеж.

## Основни страници
- [Всички продукти](${url("bg", "/products")})
- [Козметика с шафран](${url("bg", COLLECTION_PATHS.saffron)})
- [Българска натурална козметика](${url("bg", COLLECTION_PATHS.bulgarian)})
- [Козметика за лице](${url("bg", COLLECTION_PATHS.face)})
- [Козметика за коса](${url("bg", COLLECTION_PATHS.hair)})
- [Козметика за тяло](${url("bg", COLLECTION_PATHS.body)})
- [За нас – историята на българския шафран](${url("bg", "/about")})
- [Доставка и връщане](${url("bg", "/delivery-returns")})
- [Често задавани въпроси](${url("bg", "/faq")})
- [Контакти](${url("bg", "/contact")}): info@brami.shop, +359 889 342 781

## Продукти
${bgProducts.join("\n")}

## Статии
${posts.map((post) => `- [${post.title}](${url("bg", { pathname: "/beauty-care/[slug]", params: { slug: post.slug } })})${post.excerpt ? `: ${trimToLength(post.excerpt, 160)}` : ""}`).join("\n")}

## English
Brami grows saffron in Bulgaria and makes Saffron Adela Sunny natural saffron cosmetics. English version of the shop: ${url("en", "/")}

${enProducts.join("\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
