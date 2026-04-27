import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { POLICY_SLUGS, POLICY_META, type PolicySlug } from "@/lib/policy-docs";

const schema = z.object({
  titleEn: z.string().trim().min(1).max(200),
  titleBn: z.string().trim().min(1).max(200),
  bodyEn: z.string().min(1),
  bodyBn: z.string().min(1),
});

function isPolicySlug(s: string): s is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(s);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slug } = await params;
  if (!isPolicySlug(slug)) {
    return NextResponse.json({ error: "Unknown policy" }, { status: 404 });
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
  const meta = POLICY_META[slug];
  const row = await prisma.policyDocument.upsert({
    where: { slug },
    create: {
      slug,
      titleEn: data.titleEn || meta.title,
      titleBn: data.titleBn || meta.titleBn,
      bodyEn: data.bodyEn,
      bodyBn: data.bodyBn,
    },
    update: data,
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slug } = await params;
  if (!isPolicySlug(slug)) {
    return NextResponse.json({ error: "Unknown policy" }, { status: 404 });
  }
  await prisma.policyDocument.delete({ where: { slug } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
