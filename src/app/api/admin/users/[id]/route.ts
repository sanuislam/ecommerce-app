import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@/generated/prisma";

const schema = z.object({
  role: z.nativeEnum(Role),
});

type Ctx = { params: Promise<{ id: string }> };

class LastAdminError extends Error {}
class UserNotFoundError extends Error {}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: { id: true, role: true },
        });
        if (!target) {
          throw new UserNotFoundError();
        }
        if (target.role === Role.ADMIN && parsed.data.role !== Role.ADMIN) {
          const adminCount = await tx.user.count({
            where: { role: Role.ADMIN },
          });
          if (adminCount <= 1) {
            throw new LastAdminError();
          }
        }
        return tx.user.update({
          where: { id },
          data: { role: parsed.data.role },
          select: { id: true, role: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof LastAdminError) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 400 },
      );
    }
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw err;
  }
}
