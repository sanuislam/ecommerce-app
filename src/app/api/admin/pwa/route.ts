import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const pwaSchema = z.object({
  enabled: z.boolean(),
  appName: z.string().min(1).max(80),
  shortName: z.string().min(1).max(40),
  description: z.string().min(1).max(320),
  themeColor: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/, "Invalid hex color"),
  backgroundColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{3,8}$/, "Invalid hex color"),
  icon192Url: z.string().max(500),
  icon512Url: z.string().max(500),
  maskableIconUrl: z.string().max(500),
  display: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]),
  orientation: z.enum(["portrait", "landscape", "any"]),
  startUrl: z.string().min(1).max(100),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = pwaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = {
    ...parsed.data,
    themeColor: parsed.data.themeColor.startsWith("#")
      ? parsed.data.themeColor
      : `#${parsed.data.themeColor}`,
    backgroundColor: parsed.data.backgroundColor.startsWith("#")
      ? parsed.data.backgroundColor
      : `#${parsed.data.backgroundColor}`,
  };
  await prisma.pwaSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  revalidatePath("/", "layout");
  revalidatePath("/manifest.webmanifest");
  return NextResponse.json({ ok: true });
}
