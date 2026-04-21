import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
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
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 409 },
    );
  }
}
