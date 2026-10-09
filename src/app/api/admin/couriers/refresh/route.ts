import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { refreshCourierStatus } from "@/lib/couriers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await adminSession("orders"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ orderId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const r = await refreshCourierStatus(parsed.data.orderId);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
