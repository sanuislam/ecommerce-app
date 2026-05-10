import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const seoSchema = z.object({
  siteName: z.string().min(1).max(80),
  titleTemplate: z.string().min(1).max(120),
  defaultTitle: z.string().min(1).max(160),
  defaultDescription: z.string().min(1).max(320),
  defaultKeywords: z.string().max(400),
  defaultOgImage: z.string().max(500),
  twitterHandle: z.string().max(40),
  googleSiteVerification: z.string().max(255),
  bingSiteVerification: z.string().max(255),
  facebookAppId: z.string().max(40),
  ga4MeasurementId: z.string().max(40),
  gtmContainerId: z.string().max(40),
  metaPixelId: z.string().max(40),
  jsonLdEnabled: z.boolean(),
  organizationLogoUrl: z.string().max(500),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = seoSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  await prisma.seoSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
