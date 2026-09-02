import type { MetadataRoute } from "next";

import { getBlogPosts } from "@/lib/blog";
import { getFaqSlugs } from "@/lib/faq";
import { SITE_URL } from "@/lib/site-url";
import { getProducts } from "@/data/products";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allProducts, blogPosts, faqSlugs] = await Promise.all([
    getProducts(),
    getBlogPosts(),
    getFaqSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/beauty-care`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
    { url: `${BASE_URL}/partners`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/delivery-returns`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/cancellation-form`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = allProducts.map((product) => ({
    url: `${BASE_URL}/products/${product.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/beauty-care/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const faqRoutes: MetadataRoute.Sitemap = faqSlugs.map((slug) => ({
    url: `${BASE_URL}/faq/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.55,
  }));

  return [...staticRoutes, ...productRoutes, ...articleRoutes, ...faqRoutes];
}
