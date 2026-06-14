/**
 * Turns an email into a readable fallback name, e.g.
 * "martin.brankov@gmail.com" -> "Martin Brankov".
 */
export function deriveNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._\-+]+/g, " ").trim();

  if (!cleaned) {
    return email;
  }

  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The display name for a user: their profile name ("Име") when present,
 * otherwise a readable alternative generated from their email.
 */
export function getDisplayName(
  fullName: string | null | undefined,
  email: string,
): string {
  const trimmed = (fullName ?? "").trim();
  return trimmed || deriveNameFromEmail(email);
}
