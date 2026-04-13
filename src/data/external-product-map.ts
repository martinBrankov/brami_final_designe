const externalProductMap: Record<string, number> = {
  "3856000": 8,
  "3856001": 6,
  "3856002": 7,
  "3856004": 5,
  "3856005": 9,
  "3856006": 10,
  "3856007": 11,
  "3856008": 12,
  "3856009": 13,
  "3856010": 3,
  "3856011": 4,
  "3856012": 2,
  "3856013": 1,
  "3856110": 18,
  "3856111": 15,
  "3856112": 16,
  "3856113": 17,
  "3856114": 14,
  "3856115": 19,
};

export function getMappedProductId(externalProductId: string): number | undefined {
  return externalProductMap[externalProductId];
}
