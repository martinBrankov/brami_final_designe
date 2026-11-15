import { INDEXNOW_KEY } from "@/lib/indexnow";

// Key file for IndexNow: search engines fetch it to verify that pings for
// brami.shop come from the site owner.
export function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
