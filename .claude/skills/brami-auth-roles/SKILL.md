---
name: brami-auth-roles
description: Brami автентикация, сесии и роли (user / merchant / admin). Използвай при guard-ване на страница/API route, логин/регистрация/OAuth, или логика зависеща от ролята на потребителя (мърчант отстъпки, админ достъп).
---

# Brami — автентикация и роли

Собствена сесийна система (без външен auth провайдър за сесиите). Логиката е в `src/lib/user-auth.ts` (`server-only`).

## Сесии
- Cookie: `brami-user-session` (`USER_SESSION_COOKIE`), httpOnly, `sameSite=lax`, `secure` в production, 30 дни.
- Стойност: `base64url(payload).HMAC-SHA256(payload)` — подписана с `USER_SESSION_SECRET` / `ADMIN_SESSION_SECRET` / (fallback) `SUPABASE_SERVICE_ROLE_KEY`. Проверката ползва `timingSafeEqual`.
- `getUserSession()` чете и валидира cookie (подпис + `exp`), връща `UserSession | null`.
- Пароли: `bcryptjs`, 10 rounds. Силна парола = `validateStrongPassword` (≥8 символа, малка+главна буква, цифра, спец. символ).

## Роли
Три роли в `user_profiles.role`: **`user`**, **`merchant`**, **`admin`**.

Важно: за достъп **винаги се чете актуалната роля от БД**, не от cookie-то (cookie може да е остаряло). Виж `getAdminSession()` — взема сесия, после `getUserProfile()` и доверява на DB ролята.

## Guard функции (използвай тези, не пиши нови ad-hoc проверки)
- `getUserSession()` — суров достъп до сесия.
- `getAdminSession()` / `requireAdminSession()` — `src/lib/admin-auth.ts`. `require*` прави `redirect("/account")` ако не е админ. За страници в `admin-panel/*` и `api/admin/*`.
- `requireFullAdminSession()` / `isFullAdmin()` — за действия само за пълен админ.
- `requireMerchantSession()` — `user-auth.ts`. Връща `{ session, profile }` или `null` ако не е мърчант.
- `isConsentedMerchant(profile)` — мърчант **и** приел условията (`merchantTermsAcceptedAt !== null`). Това е гейтът за мърчант достъп **и** за прилагане на отстъпки.

Pattern в API route:
```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireAdminSession(); // guard първо
  // ...
}
```

## OAuth
- `src/lib/oauth.ts` + `api/auth/oauth/[provider]/route.ts` и `.../callback/route.ts`.
- OAuth потребители може да нямат парола (`hasPassword=false`); `api/auth/set-password` позволява задаване по-късно.

## Мърчант жизнен цикъл
- Админ задава `role = "merchant"`. Мърчантът трябва да приеме условията (`setMerchantConsent`) и да въведе банкови детайли (`validateBankDetails` → `setMerchantBankDetails`) за изплащане на комисиони.
- Отказ/оттегляне → `demoteMerchantToUser()` (връща роля `user`, изчиства съгласие; данните — кодове/поръчки/комисиони — се пазят).
- Отстъпката е по нива (`src/lib/merchant-tier.ts`, `getMerchantTierStatus().poolPercent`) и важи само при `isConsentedMerchant`.

## Профил
- `getUserProfile(userId)` връща пълен `UserProfile` (snake_case → camelCase). Прави forward-compatible select (пада назад ако нови колони липсват — виж `brami-data-supabase`).
- `toPublicUser(session)` — безопасното подмножество за клиента (id, username, email, role).
- Промяна на профил → `updateUserProfile()`, която и синхронизира маркетинг абонамента.
