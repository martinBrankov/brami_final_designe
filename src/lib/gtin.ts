// GTIN (EAN-8, UPC-A, EAN-13/ISBN-13, GTIN-14) helpers shared by the admin
// and the product structured data.

/** Digits only: "978-619-93643-0-7" → "9786199364307". */
export function normalizeGtin(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** True for an 8/12/13/14-digit code with a correct GS1 check digit. */
export function isValidGtin(digits: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(digits)) return false;
  const body = digits.slice(0, -1).split("").reverse();
  const sum = body.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}
