// Shared (client- and server-safe) rule for when a merchant's promo-code
// dividend becomes payable. Kept out of server-only modules so client
// components (admin/merchant dashboards) can reuse the same logic.

// The commission only becomes payable once the order reaches this status.
// Until then it is shown as "awaiting delivery".
export const COMMISSION_ELIGIBLE_STATUS = "Доставена";

// A cancelled order never yields a dividend — it stops "awaiting" and is shown
// as cancelled (in red) instead.
export const ORDER_CANCELLED_STATUS = "Отказана";

export function isCommissionEligible(status: string): boolean {
  return status === COMMISSION_ELIGIBLE_STATUS;
}

export function isOrderCancelled(status: string): boolean {
  return status === ORDER_CANCELLED_STATUS;
}
