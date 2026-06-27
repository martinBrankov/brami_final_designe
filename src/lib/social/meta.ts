import "server-only";

// Publishing to Facebook Pages and Instagram via the Meta Graph API. Called only
// when an admin approves+publishes a draft social post — never autonomously.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Липсва ${name} в средата — нужен за публикуване в Meta.`);
  }
  return value;
}

type GraphError = { error?: { message?: string } };

async function graphPost(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${GRAPH_BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json().catch(() => ({}))) as GraphError & Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Meta Graph грешка ${res.status}: ${json.error?.message ?? "unknown"}`);
  }
  return json;
}

export type PublishResult = { externalPostId: string };

/**
 * Publishes to the configured Facebook Page. With an image it posts a photo,
 * otherwise a text/link feed post.
 */
export async function publishFacebookPost(input: {
  message: string;
  link?: string | null;
  imageUrl?: string | null;
}): Promise<PublishResult> {
  const pageId = requireEnv("META_PAGE_ID");
  const token = requireEnv("META_PAGE_ACCESS_TOKEN");

  if (input.imageUrl) {
    const data = await graphPost(`${pageId}/photos`, {
      url: input.imageUrl,
      caption: input.message,
      access_token: token,
    });
    return { externalPostId: String(data.post_id ?? data.id ?? "") };
  }

  const params: Record<string, string> = { message: input.message, access_token: token };
  if (input.link) params.link = input.link;
  const data = await graphPost(`${pageId}/feed`, params);
  return { externalPostId: String(data.id ?? "") };
}

/**
 * Publishes to Instagram (business account). Two-step: create a media container
 * from a publicly reachable image URL, then publish it. Requires an image.
 */
export async function publishInstagramPost(input: {
  caption: string;
  imageUrl?: string | null;
}): Promise<PublishResult> {
  const igId = requireEnv("IG_BUSINESS_ACCOUNT_ID");
  const token = requireEnv("META_PAGE_ACCESS_TOKEN");

  if (!input.imageUrl) {
    throw new Error("Instagram пост изисква публичен URL на изображение.");
  }

  const container = await graphPost(`${igId}/media`, {
    image_url: input.imageUrl,
    caption: input.caption,
    access_token: token,
  });
  const creationId = String(container.id ?? "");
  if (!creationId) {
    throw new Error("Meta не върна creation id за Instagram контейнера.");
  }

  const published = await graphPost(`${igId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  return { externalPostId: String(published.id ?? "") };
}

export function buildCaption(caption: string, hashtags: string[]): string {
  const tags = (hashtags ?? [])
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  return tags ? `${caption}\n\n${tags}` : caption;
}
