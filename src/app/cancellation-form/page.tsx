import type { Metadata } from "next";

import {
  SectionIntro,
  contentSectionInnerClassName,
  pageSectionClassName,
} from "@/components/section-intro";
import { CancellationForm } from "@/components/cancellation-form";

export const metadata: Metadata = {
  title: "Формуляр за отказ от договор",
  description:
    "Попълнете и изпратете формуляра за отказ от договор за покупка на стоки от Брами Трейд ЕООД.",
};

export default function CancellationFormPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={pageSectionClassName}>
        <SectionIntro
          title="Формуляр за отказ от договор"
          titleAs="h1"
          size="page"
          description="Попълнете и изпратете формуляра, ако желаете да се откажете от договор за покупка на стоки."
          note="Имате право на отказ в срок от 14 дни от получаване на стоката, без да посочвате причина."
          noteClassName="pb-6 sm:pb-10"
        />
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className={contentSectionInnerClassName}>
          <SectionIntro
            title="Данни за отказа"
            description="Попълнете всички полета и изпратете формуляра. Ще получите потвърждение по имейл."
          />
        </div>

        <div className="border-t border-[#d8d0de] bg-[#f8f4fc] px-6 py-8 sm:px-10 lg:px-14">
          <CancellationForm />
        </div>
      </section>
    </main>
  );
}
