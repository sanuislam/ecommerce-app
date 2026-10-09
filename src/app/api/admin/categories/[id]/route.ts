import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
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

/** Size guide (and description) of a category. */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, session.user.staffRole, "products")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = z
    .object({ sizeGuide: z.string().max(4000).optional(), description: z.string().trim().max(1000).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const cat = await prisma.category.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  revalidatePath("/", "layout");
  await audit(session, { action: "category.update", targetType: "category", targetId: id, summary: `Category "${cat.name}" updated (size guide)` });
  return NextResponse.json({ ok: true });
}
