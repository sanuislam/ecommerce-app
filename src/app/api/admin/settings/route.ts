import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";

const shippingInt = (label: string) =>
  z
    .number(`${label} must be a number`)
    .int(`${label} must be a whole number`)
    .min(0, `${label} cannot be negative`)
    .max(1_000_000, `${label} is too large`)
    .optional();

const schema = z.object({
  facebookUrl: z.string().trim().max(500).default(""),
  whatsappUrl: z.string().trim().max(500).default(""),
  instagramUrl: z.string().trim().max(500).default(""),
  supportEmail: z.string().trim().max(200).default(""),
  supportPhone: z.string().trim().max(50).default(""),
  address: z.string().trim().max(500).default(""),
  shippingInsideDhaka: shippingInt("Inside-Dhaka delivery charge"),
  shippingOutsideDhaka: shippingInt("Outside-Dhaka delivery charge"),
  freeShippingThreshold: shippingInt("Free-shipping threshold"),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues },
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
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return NextResponse.json(row);
}
