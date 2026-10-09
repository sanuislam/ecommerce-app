import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Signs the account out on every device (this one too). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: session.user.id }, data: { passwordChangedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: session.user.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
