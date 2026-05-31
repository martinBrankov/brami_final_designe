import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "blog-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const BG: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ж:"zh",з:"z",и:"i",й:"y",
  к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",
  ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sht",ъ:"a",ь:"",ю:"yu",я:"ya",
};

function slugifyFilename(name: string): string {
  return name
    .toLowerCase()
    .split("").map((c) => BG[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";
}

export async function POST(request: Request) {
  await requireAdminSession();

  const formData = await request.formData().catch(() => null);
  const raw = formData?.get("file");

  // In Node.js 18, FormData file entries are Blob instances (File is not a global until Node 20)
  if (!(raw instanceof Blob)) {
    return NextResponse.json({ error: "Не е предоставен файл." }, { status: 400 });
  }

  const fileType = raw.type;
  const fileSize = raw.size;
  const fileName = ("name" in raw ? String((raw as { name: unknown }).name) : "") || "upload";

  if (!ALLOWED.includes(fileType)) {
    return NextResponse.json({ error: "Неподдържан формат. Използвай JPG, PNG, WebP, GIF или AVIF." }, { status: 400 });
  }
  if (fileSize > MAX_BYTES) {
    return NextResponse.json({ error: "Файлът е по-голям от 5 MB." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Ensure bucket exists (ignore error if already created)
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED,
  });

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const basename = fileName.slice(0, fileName.lastIndexOf(".")) || fileName;
  const slug = slugifyFilename(basename);
  const suffix = Date.now().toString(36);
  const filename = `${slug}-${suffix}.${ext}`;
  const buffer = Buffer.from(await raw.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: fileType, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl });
}
