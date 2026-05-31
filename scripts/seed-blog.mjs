/**
 * Seed blog blocks from articles.ts content into Supabase.
 *
 * Usage:
 *   node scripts/seed-blog.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnv() {
  const path = resolve(__dirname, "../.env.local");
  const text = readFileSync(path, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = readEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ── Article content copied from articles.ts ───────────────────────────────────

const articles = [
  {
    slug: "shafranat-v-kozmetikata",
    eyebrow: "Активна грижа",
    excerpt:
      "Шафранът е сред най-ценните растителни съставки в козметиката. Той носи усещане за комфорт, подкрепя сияйния вид на кожата и прави рутината по-специална.",
    publishedAt: "2026-05-04",
    readTime: "4 мин",
    isFeatured: true,
    intro:
      "Шафранът е познат от векове като ценна природна суровина. В съвременната козметика той се използва не само заради луксозния си образ, а и заради способността си да прави формулите по-деликатни, по-приятни и по-вдъхновяващи за ежедневна употреба.",
    sections: [
      {
        heading: "Защо шафранът е толкова ценен",
        paragraphs: [
          "Шафранът се добива трудно и внимателно, което го превръща в една от най-специалните съставки в света на красотата. Малкото количество, което е нужно за една формула, често е достатъчно, за да внесе усещане за премиум грижа.",
          "Той се асоциира с богато съдържание на растителни съединения и се включва във формули, насочени към по-свеж, озарен и равномерен вид на кожата.",
        ],
      },
      {
        heading: "Какво носи на кожата",
        paragraphs: [
          "Козметиката с шафран обикновено е насочена към комфорт, мекота и видимо по-жизнен тен. Когато е комбиниран с подхранващи масла и успокояващи растителни екстракти, шафранът допринася за по-завършено усещане след нанасяне.",
          "Това го прави подходящ избор за рутини, в които се търси нежен блясък и грижа, която да не натоварва кожата.",
        ],
      },
      {
        heading: "Къде се вписва най-добре",
        paragraphs: [
          "Шафранът може да присъства в серуми, кремове, маски и масла за лице. Най-често се избира във вечерни ритуали или в продукти, с които искаме да превърнем ежедневната грижа в малък момент на внимание към себе си.",
          "Когато формулата е балансирана, той се комбинира отлично с флорални води, леки растителни масла и съставки, които поддържат кожната бариера.",
        ],
      },
    ],
  },
  {
    slug: "shafranat-sila-ot-prirodata",
    eyebrow: "Натурални съставки",
    excerpt:
      "Зад фините нишки на шафрана стои съставка с характер, история и място в модерната ботанична козметика.",
    publishedAt: "2026-05-03",
    readTime: "3 мин",
    isFeatured: false,
    intro:
      "Когато говорим за ботанична козметика с ясно присъствие, шафранът винаги изпъква. Той не е просто екзотичен акцент, а съставка, която носи стойност и характер в една формула.",
    sections: [
      {
        heading: "От растение към ритуал",
        paragraphs: [
          "Силата на шафрана не е в агресивното действие, а в неговата фина роля. Той работи най-добре в продукти, които са създадени да подкрепят кожата с внимание и постоянство.",
          "Именно затова често се среща в рутини, които поставят на първо място комфорта, меката текстура и усещането за добре поддържана кожа.",
        ],
      },
      {
        heading: "Лукс без излишна тежест",
        paragraphs: [
          "Добре формулираната грижа с шафран не стои тежко върху кожата. Тя съчетава усещане за лукс с лекота, което е особено важно за ежедневни продукти.",
          "Това е една от причините шафранът да се цени в модерната козметика: придава идентичност, без да прави рутината сложна.",
        ],
      },
    ],
  },
  {
    slug: "krasota-i-balans-sas-shafran",
    eyebrow: "Ритуали за лице",
    excerpt:
      "Когато една съставка носи и настроение, и грижа, тя лесно намира място в рутината. Шафранът е точно такъв пример.",
    publishedAt: "2026-05-02",
    readTime: "5 мин",
    isFeatured: false,
    intro:
      "Красотата и доброто усещане често започват от малките навици. Продуктите с шафран добавят към тях чувство за мекота, фина грижа и по-изискано преживяване пред огледалото.",
    sections: [
      {
        heading: "Грижата започва с последователност",
        paragraphs: [
          "Не е нужно една рутина да бъде дълга, за да бъде ефективна. По-важно е продуктите в нея да работят в синхрон и да подкрепят кожата ден след ден.",
          "Шафранът се вписва добре именно в такива режими: внимателни, балансирани и насочени към здрав вид, а не към бързи крайности.",
        ],
      },
      {
        heading: "Как да го комбинираме",
        paragraphs: [
          "Комбинацията с нежно измиване, хидратиращ серум и крем с растителни масла е добра база за рутина със шафран. Така съставката има пространство да разгърне мекото си присъствие.",
          "При вечерна грижа може да се добави и маска или по-плътен крем, за да се подсили усещането за подхранване и комфорт.",
        ],
      },
      {
        heading: "Повече от красива съставка",
        paragraphs: [
          "Шафранът присъства в козметиката и като символ на отношение към детайла. Той подсказва, че формулата е мислена не само като функция, а и като преживяване.",
          "Точно затова той остава актуален избор за хора, които търсят естествена грижа с ясно изразен характер.",
        ],
      },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  let totalBlocks = 0;

  for (const article of articles) {
    // 1. Find the post by slug
    const { data: post, error: fetchErr } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", article.slug)
      .maybeSingle();

    if (fetchErr) {
      console.error(`✗  Could not fetch post "${article.slug}":`, fetchErr.message);
      continue;
    }
    if (!post) {
      console.warn(`⚠  Post not found for slug "${article.slug}" — skipping`);
      continue;
    }

    const postId = post.id;

    // 2. Update post metadata
    const { error: updateErr } = await supabase
      .from("blog_posts")
      .update({
        eyebrow: article.eyebrow,
        excerpt: article.excerpt,
        read_time: article.readTime,
        published_at: article.publishedAt,
        is_featured: article.isFeatured,
        published: true,
      })
      .eq("id", postId);

    if (updateErr) {
      console.error(`✗  Could not update post "${article.slug}":`, updateErr.message);
      continue;
    }

    // 3. Delete existing blocks
    const { error: deleteErr } = await supabase
      .from("blog_blocks")
      .delete()
      .eq("post_id", postId);

    if (deleteErr) {
      console.error(`✗  Could not delete blocks for "${article.slug}":`, deleteErr.message);
      continue;
    }

    // 4. Build blocks
    const blocks = [];
    let order = 1;

    // intro paragraph — plain string content
    blocks.push({
      post_id: postId,
      type: "text",
      content: article.intro,
      position: order++,
    });

    // sections → heading (object) + paragraphs (plain string)
    for (const section of article.sections) {
      blocks.push({
        post_id: postId,
        type: "text",
        content: `<h2>${section.heading}</h2>`,
        position: order++,
      });
      for (const paragraph of section.paragraphs) {
        blocks.push({
          post_id: postId,
          type: "text",
          content: paragraph,
          position: order++,
        });
      }
    }

    // 5. Insert blocks
    const { error: insertErr } = await supabase
      .from("blog_blocks")
      .insert(blocks);

    if (insertErr) {
      console.error(`✗  Could not insert blocks for "${article.slug}":`, insertErr.message);
      continue;
    }

    console.log(`✓  "${article.slug}" — ${blocks.length} blocks written`);
    totalBlocks += blocks.length;
  }

  console.log(`\nDone. ${totalBlocks} blocks total across ${articles.length} posts.`);
}

seed().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
