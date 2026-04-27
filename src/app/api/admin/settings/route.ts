import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";

const schema = z.object({
  facebookUrl: z.string().trim().max(500).default(""),
  whatsappUrl: z.string().trim().max(500).default(""),
  instagramUrl: z.string().trim().max(500).default(""),
  supportEmail: z.string().trim().max(200).default(""),
  supportPhone: z.string().trim().max(50).default(""),
  address: z.string().trim().max(500).default(""),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  for (const key of ["facebookUrl", "whatsappUrl", "instagramUrl"] as const) {
    const v = data[key];
    if (v && !/^https?:\/\//i.test(v)) {
      return NextResponse.json(
        { error: `${key} must start with http:// or https://` },
        { status: 400 },
      );
    }
  }
  const row = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  return NextResponse.json(row);
}
