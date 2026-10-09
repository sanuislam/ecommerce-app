import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { COURIER_LABEL, readyCouriers } from "@/lib/couriers";

export const dynamic = "force-dynamic";

/** Couriers that are set up and can book parcels. */
export async function GET() {
  if (!(await adminSession("orders"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ready = await readyCouriers();
  return NextResponse.json({ couriers: ready.map((id) => ({ id, label: COURIER_LABEL[id] })) });
}
