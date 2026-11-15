import type { AbstractIntlMessages } from "next-intl";

// Message namespaces the browser never needs on public pages: texts used only
// by Server Components (they read messages on the server) and the admin
// panel's texts (the admin layout adds its own provider with everything).
// Keeps the HTML of every public page smaller.
const SERVER_ONLY_NAMESPACES = new Set([
  "About",
  "AccountPage",
  "CancellationPage",
  "Collections",
  "Contact",
  "Email",
  "Legal",
  "MerchantPage",
  "MerchantTerms",
  "Metadata",
  "MyOrders",
  "Partners",
]);

export function getPublicClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return Object.fromEntries(
    Object.entries(messages).filter(
      ([namespace]) => !SERVER_ONLY_NAMESPACES.has(namespace) && !/^(Admin|AgentChat)/.test(namespace),
    ),
  );
}
