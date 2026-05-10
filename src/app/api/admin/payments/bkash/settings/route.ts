import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { resetBkashTokenCache } from "@/lib/bkash";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bkashEnabled: z.boolean(),
  bkashMode: z.enum(["sandbox", "live"]),
  bkashUsername: z.string().max(120),
  // Pass empty string to leave existing secret unchanged.
  bkashPassword: z.string().max(255),
  bkashAppKey: z.string().max(120),
  bkashAppSecret: z.string().max(255),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const existing = await prisma.paymentSettings.findUnique({
    where: { id: "default" },
  });

  // Empty secret fields mean "do not change". Otherwise overwrite.
  const nextPassword = v.bkashPassword.trim()
    ? v.bkashPassword
    : (existing?.bkashPassword ?? "");
  const nextAppSecret = v.bkashAppSecret.trim()
    ? v.bkashAppSecret
    : (existing?.bkashAppSecret ?? "");

  await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      bkashEnabled: v.bkashEnabled,
      bkashMode: v.bkashMode,
      bkashUsername: v.bkashUsername,
      bkashPassword: nextPassword,
      bkashAppKey: v.bkashAppKey,
      bkashAppSecret: nextAppSecret,
    },
    update: {
      bkashEnabled: v.bkashEnabled,
      bkashMode: v.bkashMode,
      bkashUsername: v.bkashUsername,
      bkashPassword: nextPassword,
      bkashAppKey: v.bkashAppKey,
      bkashAppSecret: nextAppSecret,
    },
  });

  resetBkashTokenCache();
  // Refresh checkout/cart pages that depend on bKash being live.
  revalidatePath("/checkout");
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
