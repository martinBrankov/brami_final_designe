import "server-only";

import { COMMISSION_ELIGIBLE_STATUS } from "@/lib/commission-status";
import { getMerchantPoolPercent } from "@/lib/merchant-tier";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type PromoCodeRecord = {
  id: string;
  code: string;
  merchantId: string;
  merchantUsername: string;
  merchantEmail: string;
  discountPercent: number;
  commissionPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromoValidation = {
  id: string;
  code: string;
  merchantId: string;
  discountPercent: number;
  commissionPercent: number;
};

type RawRow = {
  id: string;
  code: string;
  merchant_id: string;
  discount_percent: number | string | null;
  commission_percent: number | string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  merchant?: { username: string | null; email: string | null } | null;
};

function mapRecord(row: RawRow): PromoCodeRecord {
  return {
    id: row.id,
    code: row.code,
    merchantId: row.merchant_id,
    merchantUsername: row.merchant?.username ?? "",
    merchantEmail: row.merchant?.email ?? "",
    discountPercent: Number(row.discount_percent ?? 0),
    commissionPercent: Number(row.commission_percent ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const RECORD_SELECT =
  "id, code, merchant_id, discount_percent, commission_percent, is_active, created_at, updated_at, merchant:user_profiles!promo_codes_merchant_id_fkey(username, email)";

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(value: string): boolean {
  return /^[A-Z0-9%]{5}$/.test(value);
}

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateRandomCode(): string {
  let result = "";
  for (let i = 0; i < 5; i += 1) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export async function listPromoCodes(): Promise<PromoCodeRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(RECORD_SELECT)
    .order("created_at", { ascending: false })
    .returns<RawRow[]>();

  if (error) {
    throw new Error(`Failed to load promo codes: ${error.message}`);
  }

  return (data ?? []).map(mapRecord);
}

export async function listPromoCodesForMerchant(
  merchantId: string,
): Promise<PromoCodeRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(RECORD_SELECT)
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .returns<RawRow[]>();

  if (error) {
    throw new Error(`Failed to load promo codes: ${error.message}`);
  }

  return (data ?? []).map(mapRecord);
}

export type CreatePromoCodeInput = {
  code: string;
  merchantId: string;
  discountPercent: number;
  commissionPercent: number;
  isActive?: boolean;
};

export async function createPromoCode(
  input: CreatePromoCodeInput,
): Promise<PromoCodeRecord> {
  const code = normalizeCode(input.code);
  if (!isValidCode(code)) {
    throw new Error("Кодът трябва да е точно 5 символа (A–Z, 0–9, %).");
  }
  if (!input.merchantId) {
    throw new Error("Изберете търговец.");
  }

  const supabase = createSupabaseAdminClient();

  const { data: merchant, error: merchantErr } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("id", input.merchantId)
    .maybeSingle<{ id: string; role: string }>();

  if (merchantErr) {
    throw new Error(`Failed to verify merchant: ${merchantErr.message}`);
  }
  if (!merchant || merchant.role !== "merchant") {
    throw new Error("Избраният потребител няма роля търговец.");
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code,
      merchant_id: input.merchantId,
      discount_percent: clampPercent(input.discountPercent),
      commission_percent: clampPercent(input.commissionPercent),
      is_active: input.isActive ?? true,
    })
    .select(RECORD_SELECT)
    .single<RawRow>();

  if (error || !data) {
    const message = error?.message ?? "Failed to create promo code";
    if (message.toLowerCase().includes("duplicate")) {
      throw new Error("Този код вече съществува.");
    }
    throw new Error(message);
  }

  return mapRecord(data);
}

export type UpdatePromoCodeInput = {
  id: string;
  discountPercent?: number;
  commissionPercent?: number;
  isActive?: boolean;
  code?: string;
};

export async function updatePromoCode(
  input: UpdatePromoCodeInput,
): Promise<PromoCodeRecord> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.code !== undefined) {
    const code = normalizeCode(input.code);
    if (!isValidCode(code)) {
      throw new Error("Кодът трябва да е точно 5 символа (A–Z, 0–9, %).");
    }
    updates.code = code;
  }
  if (input.discountPercent !== undefined) {
    updates.discount_percent = clampPercent(input.discountPercent);
  }
  if (input.commissionPercent !== undefined) {
    updates.commission_percent = clampPercent(input.commissionPercent);
  }
  if (input.isActive !== undefined) {
    updates.is_active = input.isActive;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .update(updates)
    .eq("id", input.id)
    .select(RECORD_SELECT)
    .single<RawRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update promo code");
  }

  return mapRecord(data);
}

export async function deletePromoCode(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete promo code: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Merchant self-service (scoped to the signed-in merchant, pool-constrained)
// ---------------------------------------------------------------------------

/**
 * The customer discount plus the merchant dividend split a single pool — the
 * merchant's effective discount percentage. Their sum may not exceed it.
 */
export function assertSplitWithinPool(
  discountPercent: number,
  commissionPercent: number,
  poolPercent: number,
): void {
  const discount = clampPercent(discountPercent);
  const commission = clampPercent(commissionPercent);
  // Tolerate floating-point noise on the boundary.
  if (discount + commission > poolPercent + 1e-9) {
    throw new Error(
      `Сборът от отстъпка за клиента и твоя дивидент (${discount + commission}%) не може да надвишава общия пул от ${poolPercent}%.`,
    );
  }
}

async function getMerchantCodeOwner(
  id: string,
): Promise<{ merchantId: string; discountPercent: number; commissionPercent: number } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("merchant_id, discount_percent, commission_percent")
    .eq("id", id)
    .maybeSingle<{
      merchant_id: string;
      discount_percent: number | string | null;
      commission_percent: number | string | null;
    }>();

  if (error) {
    throw new Error(`Failed to load promo code: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return {
    merchantId: data.merchant_id,
    discountPercent: Number(data.discount_percent ?? 0),
    commissionPercent: Number(data.commission_percent ?? 0),
  };
}

export type CreateMerchantPromoCodeInput = {
  merchantId: string;
  poolPercent: number;
  code: string;
  discountPercent: number;
  commissionPercent: number;
  isActive?: boolean;
};

export async function createMerchantPromoCode(
  input: CreateMerchantPromoCodeInput,
): Promise<PromoCodeRecord> {
  assertSplitWithinPool(
    input.discountPercent,
    input.commissionPercent,
    input.poolPercent,
  );

  return createPromoCode({
    code: input.code,
    merchantId: input.merchantId,
    discountPercent: input.discountPercent,
    commissionPercent: input.commissionPercent,
    isActive: input.isActive ?? true,
  });
}

export type UpdateMerchantPromoCodeInput = {
  merchantId: string;
  poolPercent: number;
  id: string;
  discountPercent?: number;
  commissionPercent?: number;
  isActive?: boolean;
  code?: string;
};

export async function updateMerchantPromoCode(
  input: UpdateMerchantPromoCodeInput,
): Promise<PromoCodeRecord> {
  const existing = await getMerchantCodeOwner(input.id);
  if (!existing) {
    throw new Error("Кодът не е намерен.");
  }
  if (existing.merchantId !== input.merchantId) {
    throw new Error("Нямаш достъп до този код.");
  }

  // Validate the resulting split (only re-check when a percentage changes).
  const resultingDiscount =
    input.discountPercent !== undefined
      ? input.discountPercent
      : existing.discountPercent;
  const resultingCommission =
    input.commissionPercent !== undefined
      ? input.commissionPercent
      : existing.commissionPercent;

  if (
    input.isActive === true ||
    input.discountPercent !== undefined ||
    input.commissionPercent !== undefined
  ) {
    assertSplitWithinPool(resultingDiscount, resultingCommission, input.poolPercent);
  }

  return updatePromoCode({
    id: input.id,
    code: input.code,
    discountPercent: input.discountPercent,
    commissionPercent: input.commissionPercent,
    isActive: input.isActive,
  });
}

/**
 * Auto-deactivates the merchant's active codes whose customer discount + dividend
 * currently exceeds the merchant's pool (e.g. after the admin lowers the merchant's
 * starting discount). Returns the ids that were deactivated.
 */
export async function deactivateCodesOverPool(
  merchantId: string,
  poolPercent: number,
): Promise<string[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, discount_percent, commission_percent")
    .eq("merchant_id", merchantId)
    .eq("is_active", true)
    .returns<
      Array<{
        id: string;
        discount_percent: number | string | null;
        commission_percent: number | string | null;
      }>
    >();

  if (error) {
    throw new Error(`Failed to load promo codes: ${error.message}`);
  }

  const overIds = (data ?? [])
    .filter(
      (row) =>
        Number(row.discount_percent ?? 0) + Number(row.commission_percent ?? 0) >
        poolPercent + 1e-9,
    )
    .map((row) => row.id);

  if (overIds.length === 0) {
    return [];
  }

  const { error: updateError } = await supabase
    .from("promo_codes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", overIds);

  if (updateError) {
    throw new Error(`Failed to deactivate promo codes: ${updateError.message}`);
  }

  return overIds;
}

/**
 * Deactivates every promo code of a merchant. Used when the merchant withdraws
 * their consent to the terms — codes stay in the DB but become unusable.
 */
export async function deactivateAllMerchantCodes(
  merchantId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("promo_codes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("merchant_id", merchantId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to deactivate promo codes: ${error.message}`);
  }
}

export async function deleteMerchantPromoCode(
  merchantId: string,
  id: string,
): Promise<void> {
  const existing = await getMerchantCodeOwner(id);
  if (!existing) {
    throw new Error("Кодът не е намерен.");
  }
  if (existing.merchantId !== merchantId) {
    throw new Error("Нямаш достъп до този код.");
  }
  await deletePromoCode(id);
}

export async function validatePromoCode(
  rawCode: string,
): Promise<PromoValidation | null> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, merchant_id, discount_percent, commission_percent, is_active")
    .eq("code", code)
    .maybeSingle<{
      id: string;
      code: string;
      merchant_id: string;
      discount_percent: number | string | null;
      commission_percent: number | string | null;
      is_active: boolean | null;
    }>();

  if (error) {
    throw new Error(`Failed to validate code: ${error.message}`);
  }
  if (!data || !data.is_active) {
    return null;
  }

  const discountPercent = Number(data.discount_percent ?? 0);
  const commissionPercent = Number(data.commission_percent ?? 0);

  // If the merchant's pool is now below this code's split (e.g. the admin lowered
  // the starting discount), auto-deactivate it and reject — keeps DB consistent
  // even without a dashboard visit.
  const poolPercent = await getMerchantPoolPercent(data.merchant_id);
  if (discountPercent + commissionPercent > poolPercent + 1e-9) {
    await supabase
      .from("promo_codes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return null;
  }

  return {
    id: data.id,
    code: data.code,
    merchantId: data.merchant_id,
    discountPercent,
    commissionPercent,
  };
}

const MERCHANT_ORDER_SELECT = `id, order_number, status, customer_full_name, customer_email,
   subtotal, total, promo_code_text, promo_discount_percent,
   promo_discount_amount, promo_commission_percent, promo_commission_amount,
   promo_commission_paid_at, order_created_at, created_at`;

type MerchantOrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_full_name: string;
  customer_email: string;
  subtotal: number | string;
  total: number | string;
  promo_code_text: string | null;
  promo_discount_percent: number | string | null;
  promo_discount_amount: number | string | null;
  promo_commission_percent: number | string | null;
  promo_commission_amount: number | string | null;
  promo_commission_paid_at: string | null;
  order_created_at: string;
  created_at: string;
};

function mapMerchantOrder(row: MerchantOrderRow) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerFullName: row.customer_full_name,
    customerEmail: row.customer_email,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    promoCodeText: row.promo_code_text ?? "",
    promoDiscountPercent: Number(row.promo_discount_percent ?? 0),
    promoDiscountAmount: Number(row.promo_discount_amount ?? 0),
    promoCommissionPercent: Number(row.promo_commission_percent ?? 0),
    promoCommissionAmount: Number(row.promo_commission_amount ?? 0),
    promoCommissionPaidAt: row.promo_commission_paid_at,
    orderCreatedAt: row.order_created_at,
    createdAt: row.created_at,
  };
}

export async function getPromoOrdersForMerchant(merchantId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_orders")
    .select(MERCHANT_ORDER_SELECT)
    .eq("promo_merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .returns<MerchantOrderRow[]>();

  if (error) {
    throw new Error(`Failed to load merchant orders: ${error.message}`);
  }

  return (data ?? []).map(mapMerchantOrder);
}

export async function markCommissionsPaid(
  orderIds: string[],
  paid: boolean,
  adminId: string | null,
): Promise<void> {
  if (!orderIds.length) return;

  const supabase = createSupabaseAdminClient();
  const updates = paid
    ? {
        promo_commission_paid_at: new Date().toISOString(),
        promo_commission_paid_by: adminId,
        updated_at: new Date().toISOString(),
      }
    : {
        promo_commission_paid_at: null,
        promo_commission_paid_by: null,
        updated_at: new Date().toISOString(),
      };

  let query = supabase
    .from("customer_orders")
    .update(updates)
    .in("id", orderIds)
    .not("promo_merchant_id", "is", null);

  // A commission can only be paid out once the order is delivered. Reversing a
  // payout (paid = false) stays allowed regardless of status.
  if (paid) {
    query = query.eq("status", COMMISSION_ELIGIBLE_STATUS);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to update commission status: ${error.message}`);
  }
}

export type MerchantOrderSummary = Awaited<
  ReturnType<typeof getPromoOrdersForMerchant>
>[number];

export async function listMerchants(): Promise<
  Array<{ id: string; username: string; email: string }>
> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, email")
    .eq("role", "merchant")
    .order("username", { ascending: true })
    .returns<Array<{ id: string; username: string; email: string }>>();

  if (error) {
    throw new Error(`Failed to load merchants: ${error.message}`);
  }
  return data ?? [];
}

export type MerchantAdminRow = {
  id: string;
  username: string;
  email: string;
  merchantDiscountPercent: number;
  merchantTermsAccepted: boolean;
  bankAccountHolder: string;
  bankIban: string;
  bankBic: string;
  codeCount: number;
  orderCount: number;
  totalCommission: number;
  codes: PromoCodeRecord[];
  orders: MerchantOrderSummary[];
};

type MerchantProfileRow = {
  id: string;
  username: string;
  email: string;
  merchant_discount_percent: number | string | null;
  merchant_terms_accepted_at?: string | null;
  bank_account_holder?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
};

const MERCHANT_ADMIN_SELECT_FULL =
  "id, username, email, merchant_discount_percent, merchant_terms_accepted_at, bank_account_holder, bank_iban, bank_bic";
const MERCHANT_ADMIN_SELECT_BASE =
  "id, username, email, merchant_discount_percent";

function isMissingMerchantColumn(error: { message?: string } | null): boolean {
  return /merchant_terms_accepted_at|bank_account_holder|bank_iban|bank_bic/.test(
    error?.message ?? "",
  );
}

async function loadMerchantProfiles(): Promise<MerchantProfileRow[]> {
  const supabase = createSupabaseAdminClient();
  for (const select of [MERCHANT_ADMIN_SELECT_FULL, MERCHANT_ADMIN_SELECT_BASE]) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(select)
      .eq("role", "merchant")
      .order("username", { ascending: true })
      .returns<MerchantProfileRow[]>();
    if (!error) {
      return data ?? [];
    }
    // Retry without the new columns until migrations 020/021 are applied.
    if (!isMissingMerchantColumn(error)) {
      throw new Error(`Failed to load merchants: ${error.message}`);
    }
  }
  return [];
}

export async function listMerchantsForAdmin(): Promise<MerchantAdminRow[]> {
  const supabase = createSupabaseAdminClient();

  const [merchants, codesResult, ordersResult] = await Promise.all([
    loadMerchantProfiles(),
    supabase
      .from("promo_codes")
      .select(RECORD_SELECT)
      .order("created_at", { ascending: false })
      .returns<RawRow[]>(),
    supabase
      .from("customer_orders")
      .select(
        `id, order_number, status, customer_full_name, customer_email,
         subtotal, total, promo_code_text, promo_discount_percent,
         promo_discount_amount, promo_commission_percent, promo_commission_amount,
         promo_commission_paid_at, promo_merchant_id, order_created_at, created_at`,
      )
      .not("promo_merchant_id", "is", null)
      .order("created_at", { ascending: false })
      .returns<Array<MerchantOrderRow & { promo_merchant_id: string }>>(),
  ]);

  if (codesResult.error) {
    throw new Error(`Failed to load promo codes: ${codesResult.error.message}`);
  }
  if (ordersResult.error) {
    throw new Error(`Failed to load orders: ${ordersResult.error.message}`);
  }

  const codes = (codesResult.data ?? []).map(mapRecord);
  const orders = ordersResult.data ?? [];

  const codesByMerchant = new Map<string, PromoCodeRecord[]>();
  for (const code of codes) {
    const bucket = codesByMerchant.get(code.merchantId) ?? [];
    bucket.push(code);
    codesByMerchant.set(code.merchantId, bucket);
  }

  const ordersByMerchant = new Map<string, MerchantOrderSummary[]>();
  for (const order of orders) {
    const summary: MerchantOrderSummary = mapMerchantOrder(order);
    const bucket = ordersByMerchant.get(order.promo_merchant_id) ?? [];
    bucket.push(summary);
    ordersByMerchant.set(order.promo_merchant_id, bucket);
  }

  // Only current merchants (role 'merchant') are listed. Users who declined and
  // were demoted no longer appear here, even if they have historical data.
  return merchants.map((merchant) => {
    const merchantCodes = codesByMerchant.get(merchant.id) ?? [];
    const merchantOrders = ordersByMerchant.get(merchant.id) ?? [];
    const totalCommission = merchantOrders.reduce(
      (sum, order) => sum + order.promoCommissionAmount,
      0,
    );

    return {
      id: merchant.id,
      username: merchant.username,
      email: merchant.email,
      merchantDiscountPercent: Number(merchant.merchant_discount_percent ?? 0),
      merchantTermsAccepted: (merchant.merchant_terms_accepted_at ?? null) !== null,
      bankAccountHolder: merchant.bank_account_holder ?? "",
      bankIban: merchant.bank_iban ?? "",
      bankBic: merchant.bank_bic ?? "",
      codeCount: merchantCodes.length,
      orderCount: merchantOrders.length,
      totalCommission,
      codes: merchantCodes,
      orders: merchantOrders,
    };
  });
}
