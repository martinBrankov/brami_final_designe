import type { Metadata } from "next";

import { LegalPage, getLegalMetadata, type LegalPageProps } from "@/components/legal-page";

export function generateMetadata(props: LegalPageProps): Promise<Metadata> {
  return getLegalMetadata("terms", props);
}

export default function TermsPage(props: LegalPageProps) {
  return <LegalPage pageKey="terms" {...props} />;
}
