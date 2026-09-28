import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function ownAddress(id: string) {
  const session = await auth();
  if (!session?.user) return null;
  const address = await prisma.address.findFirst({
    where: { id, userId: session.user.id, archived: false },
  });
  return address ? { address, userId: session.user.id } : null;
}

/** Make an address the default one. */
export async function PATCH(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await ownAddress(id);
  if (!owned) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: owned.userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return NextResponse.json({ ok: true });
}

/** Removes an address from the address book (kept for past orders). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await ownAddress(id);
  if (!owned) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  await prisma.address.update({ where: { id }, data: { archived: true, isDefault: false } });
  if (owned.address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: owned.userId, archived: false },
      orderBy: { createdAt: "desc" },
    });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return NextResponse.json({ ok: true });
}
