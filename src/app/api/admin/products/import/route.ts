import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { applyImport, planImport } from "@/lib/product-csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ csv: z.string().min(1).max(8_000_000), apply: z.boolean() });

/** Checks a CSV (apply=false) or runs it (apply=true; re-checked first). */
export async function POST(req: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Upload a CSV file" }, { status: 400 });
  const plan = await planImport(parsed.data.csv);
  const preview = {
    summary: plan.summary,
    errors: plan.errors.slice(0, 200),
    warnings: plan.warnings.slice(0, 200),
    products: plan.products.slice(0, 300).map((p) => ({
      label: p.label,
      action: p.productId ? "update" : "create",
      options: p.units.filter((u) => u.create).length,
      rows: p.units.length,
      fields: Object.keys(p.fields),
    })),
  };
  if (!parsed.data.apply || plan.errors.length) return NextResponse.json(preview);
  try {
    const r = await applyImport(plan, session.user.id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ...preview, applied: r.products });
  } catch (err) {
    console.error("product import failed", err);
    return NextResponse.json({ ...preview, error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}
