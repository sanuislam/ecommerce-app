import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { normalizeUpayBase, resetUpayTokenCache } from "@/lib/upay";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  upayEnabled: z.boolean(),
  upayBaseUrl: z.string().trim().max(200),
  upayMerchantId: z.string().trim().max(120),
  // Empty string = keep the saved key.
  upayMerchantKey: z.string().trim().max(255),
  upayMerchantName: z.string().trim().max(120),
  upayMerchantCode: z.string().trim().max(60),
  upayMerchantCity: z.string().trim().max(60),
  upayMerchantMobile: z.string().trim().max(20),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const v = parsed.data;
  const baseUrl = normalizeUpayBase(v.upayBaseUrl);
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Base URL must be an https:// address, e.g. https://uat-pg.upay.systems" },
      { status: 400 },
    );
  }

  const existing = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
  const merchantKey = v.upayMerchantKey || existing?.upayMerchantKey || "";

  if (
    v.upayEnabled &&
    !(v.upayMerchantId && merchantKey && v.upayMerchantName && v.upayMerchantCode && v.upayMerchantMobile)
  ) {
    return NextResponse.json(
      { error: "Merchant ID, key, name, code and mobile are all required to enable Upay" },
      { status: 400 },
    );
  }

  const data = {
    upayEnabled: v.upayEnabled,
    upayBaseUrl: baseUrl,
    upayMerchantId: v.upayMerchantId,
    upayMerchantKey: merchantKey,
    upayMerchantName: v.upayMerchantName,
    upayMerchantCode: v.upayMerchantCode,
    upayMerchantCity: v.upayMerchantCity || "Dhaka",
    upayMerchantMobile: v.upayMerchantMobile,
  };
  await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  resetUpayTokenCache();
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  await audit(session, { action: "settings.payments", summary: "Upay settings saved", data: v });
  return NextResponse.json({ ok: true });
}
