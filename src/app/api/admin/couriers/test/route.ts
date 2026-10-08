import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { COURIERS, getCourierSettings } from "@/lib/couriers";
import { steadfastBalance } from "@/lib/couriers/steadfast";
import { pathaoStores } from "@/lib/couriers/pathao";
import { redxStores } from "@/lib/couriers/redx";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Checks saved credentials with a harmless read. */
export async function POST(req: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ courier: z.enum(COURIERS) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const s = await getCourierSettings();
  try {
    if (parsed.data.courier === "steadfast") {
      const bal = await steadfastBalance(s);
      return NextResponse.json({ ok: true, message: `Connected · balance ${formatPrice(bal)}` });
    }
    if (parsed.data.courier === "pathao") {
      const stores = await pathaoStores(s);
      return NextResponse.json({ ok: true, message: `Connected · ${stores.length} pickup store(s)`, stores });
    }
    const stores = await redxStores(s);
    return NextResponse.json({ ok: true, message: `Connected · ${stores.length} pickup store(s)`, stores });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Test failed" },
      { status: 502 },
    );
  }
}
