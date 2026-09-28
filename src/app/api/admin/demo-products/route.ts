import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { loadDemoCatalog, removeDemoCatalog } from "@/lib/demo-loader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function isAdmin() {
  const session = await auth();
  return session?.user?.role === Role.ADMIN;
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Loads (or refreshes) the demo catalogue. Admin only. */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await loadDemoCatalog(prisma);
  refresh();
  return NextResponse.json(result);
}

/** Removes the demo catalogue. Admin only. */
export async function DELETE() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await removeDemoCatalog(prisma);
  refresh();
  return NextResponse.json(result);
}
