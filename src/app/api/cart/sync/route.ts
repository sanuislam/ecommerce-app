import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { cleanLines, resolveLines, syncCart } from "@/lib/carts";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(40),
        variantId: z.string().max(40).nullable().optional(),
        quantity: z.number().int().min(0).max(20),
      }),
    )
    .max(50),
});

/** The browser's cart, saved for a signed-in shopper (abandoned-cart reminders). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await rateLimit(`cartsync:${session.user.id}`, 120, 3600))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const r = await syncCart(session.user.id, parsed.data.items);
  return NextResponse.json({ ok: true, ...r });
}

/** The saved cart (for a shopper who signs in on another phone or browser). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ lines: [] }, { status: 401 });
  const snap = await prisma.cartSnapshot.findUnique({ where: { userId: session.user.id } });
  const lines = snap ? await resolveLines(cleanLines(snap.items)) : [];
  return NextResponse.json({ lines: lines.filter((l) => l.stock > 0) });
}
