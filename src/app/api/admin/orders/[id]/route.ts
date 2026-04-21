import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, OrderStatus } from "@/generated/prisma";

const schema = z.object({
  status: z.nativeEnum(OrderStatus),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
