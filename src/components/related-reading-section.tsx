import { getTranslations } from "next-intl/server";

import { SeeAlsoPills, type SeeAlsoPage } from "@/components/see-also-links";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { BlogPost } from "@/lib/blog";
import type { LocalizedFaqEntry } from "@/lib/faq";

type RelatedReadingSectionProps = {
  locale: AppLocale;
  posts: BlogPost[];
  faqEntries?: LocalizedFaqEntry[];
  pages: readonly SeeAlsoPage[];
};

const listLinkClassName =
  "font-medium text-[#432855] underline decoration-[#cdbed9] underline-offset-[0.22em] transition hover:decoration-[#432855]";

/** Articles, answered questions and related pages for a product or a collection. */
export async function RelatedReadingSection({
  locale,
  posts,
  faqEntries = [],
  pages,
}: RelatedReadingSectionProps) {
  const [tBlog, tFaq] = await Promise.all([
    getTranslations({ locale, namespace: "BeautyCare" }),
    getTranslations({ locale, namespace: "Faq" }),
  ]);

  return (
    <section className="w-full border-t border-[#d8d0de] bg-white">
      <div className="space-y-8 px-6 py-10 sm:px-10 lg:px-14">
        {posts.length || faqEntries.length ? (
          <div className="grid gap-8 lg:grid-cols-2">
            {posts.length ? (
              <div>
                <h2 className="font-serif text-[1.5rem] leading-tight text-[#432855]">
                  {tBlog("relatedArticles")}
                </h2>
                <ul className="mt-4 space-y-3">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={{ pathname: "/beauty-care/[slug]", params: { slug: post.slug } }}
                        className={listLinkClassName}
                      >
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {faqEntries.length ? (
              <div>
                <h2 className="font-serif text-[1.5rem] leading-tight text-[#432855]">
                  {tFaq("relatedQuestions")}
                </h2>
                <ul className="mt-4 space-y-3">
                  {faqEntries.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={{ pathname: "/faq/[slug]", params: { slug: entry.slug } }}
                        className={listLinkClassName}
                      >
                        {entry.question}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <SeeAlsoPills locale={locale} pages={pages} />
      </div>
    </section>
  );
}
