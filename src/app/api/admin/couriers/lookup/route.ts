import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { getCourierSettings } from "@/lib/couriers";
import { pathaoAreas, pathaoCities, pathaoStores, pathaoZones } from "@/lib/couriers/pathao";
import { redxAreas, redxStores } from "@/lib/couriers/redx";

export const dynamic = "force-dynamic";

/**
 * Courier reference lists for the booking dialog and settings:
 *   ?courier=pathao&type=cities | zones&id=<city> | areas&id=<zone> | stores
 *   ?courier=redx&type=areas&district=<name>[&post=<code>] | stores
 */
export async function GET(req: Request) {
  if (!(await adminSession("orders"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const courier = sp.get("courier");
  const type = sp.get("type");
  const id = Number(sp.get("id"));
  const s = await getCourierSettings();
  try {
    if (courier === "pathao") {
      if (type === "cities") return NextResponse.json({ items: await pathaoCities(s) });
      if (type === "zones" && id > 0) return NextResponse.json({ items: await pathaoZones(s, id) });
      if (type === "areas" && id > 0) return NextResponse.json({ items: await pathaoAreas(s, id) });
      if (type === "stores") return NextResponse.json({ items: await pathaoStores(s) });
    }
    if (courier === "redx") {
      if (type === "areas") {
        const items = await redxAreas(s, {
          district: sp.get("district") ?? undefined,
          postCode: sp.get("post") ?? undefined,
        });
        return NextResponse.json({ items });
      }
      if (type === "stores") return NextResponse.json({ items: await redxStores(s) });
    }
    return NextResponse.json({ error: "Unknown lookup" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lookup failed" }, { status: 502 });
  }
}
