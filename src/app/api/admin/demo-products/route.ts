import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadDemoCatalog, removeDemoCatalog } from "@/lib/demo-loader";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function isAdmin() {
  const session = await auth();
  return session?.user && can(session.user.role, session.user.staffRole, "products") ? session : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Loads (or refreshes) the demo catalogue. Admin only. */
export async function POST() {
  const session = await isAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await loadDemoCatalog(prisma);
  refresh();
  await audit(session, { action: "product.import", summary: "Demo catalogue loaded" });
  return NextResponse.json(result);
}

/** Removes the demo catalogue. Admin only. */
export async function DELETE() {
  const session = await isAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await removeDemoCatalog(prisma);
  refresh();
  await audit(session, { action: "product.delete", summary: "Demo catalogue removed" });
  return NextResponse.json(result);
}
