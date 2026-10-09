import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, session.user.staffRole, "products")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const cat = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug || slugify(parsed.data.name),
        description: parsed.data.description ?? null,
      },
    });
    await audit(session, { action: "category.create", targetType: "category", targetId: cat.id, summary: `Category "${cat.name}" created` });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 409 },
    );
  }
}
