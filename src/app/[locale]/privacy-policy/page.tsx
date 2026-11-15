import type { Metadata } from "next";

import { LegalPage, getLegalMetadata, type LegalPageProps } from "@/components/legal-page";

export function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  return getLegalMetadata("privacy", props);
}

export default function PrivacyPolicyPage(props: LegalPageProps) {
  return <LegalPage pageKey="privacy" {...props} />;
}
