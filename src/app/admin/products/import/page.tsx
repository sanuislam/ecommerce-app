import { ProductImport } from "@/components/admin/product-import";
import { CSV_HEADERS } from "@/lib/product-csv";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Import and export products</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Export your catalogue as a spreadsheet, change prices, stock or anything else, and import it back. New rows become
        new products. Empty cells keep what is saved.
      </p>
      <div className="mt-6 max-w-4xl">
        <ProductImport headers={[...CSV_HEADERS]} />
      </div>
    </div>
  );
}
