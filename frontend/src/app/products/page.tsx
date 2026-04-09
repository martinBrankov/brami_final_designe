import { Suspense } from "react";
import { ProductsPageContent } from "./products-page-content";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
