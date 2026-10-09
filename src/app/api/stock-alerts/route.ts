import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bdMobile } from "@/lib/sms";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** "Tell me when it's back" for a sold-out product or option. */
export async function POST(req: Request) {
  const ip = await clientIp().catch(() => "unknown");
  if (!(await rateLimit(`stockalert:${ip}`, 20, 3600))) {
    return NextResponse.json({ error: "Too many requests. Try later." }, { status: 429 });
  }
  const parsed = z
    .object({ productId: z.string().min(1).max(40), variantId: z.string().max(40).nullable().optional(), phone: z.string().max(20) })
    .safeParse(await req.json().catch(() => null));
  const phone = parsed.success ? bdMobile(parsed.data.phone) : null;
  if (!parsed.success || !phone) return NextResponse.json({ error: "Enter a valid mobile number (01XXXXXXXXX)" }, { status: 400 });
  const { productId } = parsed.data;
  const variantId = parsed.data.variantId ?? "";
  const product = await prisma.product.findFirst({
    where: { id: productId, published: true },
    select: { id: true, variants: { select: { id: true } } },
  });
  if (!product || (variantId && !product.variants.some((v) => v.id === variantId))) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const session = await auth();
  await prisma.stockAlert.upsert({
    where: { productId_variantId_phone: { productId, variantId, phone } },
    create: { productId, variantId, phone, userId: session?.user?.id ?? null },
    update: { notifiedAt: null },
  });
  return NextResponse.json({ ok: true });
}
