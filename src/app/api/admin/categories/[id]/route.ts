import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, session.user.staffRole, "products")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const gone = await prisma.category.delete({ where: { id } });
    await audit(session, { action: "category.delete", targetType: "category", targetId: id, summary: `Category "${gone.name}" deleted` });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete (has products?)" },
      { status: 400 },
    );
  }
}
