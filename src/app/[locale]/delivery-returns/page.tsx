import type { Metadata } from "next";

import { LegalPage, getLegalMetadata, type LegalPageProps } from "@/components/legal-page";

export function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  return getLegalMetadata("deliveryReturns", props);
}

export default function DeliveryReturnsPage(props: LegalPageProps) {
  return <LegalPage pageKey="deliveryReturns" {...props} />;
}
