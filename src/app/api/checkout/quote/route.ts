import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { buildQuote, MAX_LINES, MAX_QTY_PER_LINE } from "@/lib/checkout";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).nullable().optional(),
        quantity: z.number().int().positive().max(MAX_QTY_PER_LINE),
      }),
    )
    .max(MAX_LINES),
  district: z.string().optional().default("Dhaka"),
  couponCode: z.string().trim().max(40).optional().default(""),
});

/** Server-side price check used by the cart and checkout pages. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const session = await auth();
  const quote = await buildQuote({
    items: parsed.data.items,
    district: parsed.data.district,
    couponCode: parsed.data.couponCode,
    userId: session?.user?.id ?? null,
  });
  return NextResponse.json(quote);
}
