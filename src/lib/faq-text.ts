// Answer bodies are stored as plain text or as light HTML written in the admin
// panel; these helpers are shared by the list page and the answer page.

/** Strips tags and decodes the few entities the editor can produce. */
export function toPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeHtml(value: string): boolean {
  return value.trimStart().startsWith("<");
}

/** Splits plain-text answers on blank lines so paragraphs survive. */
export function toParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
