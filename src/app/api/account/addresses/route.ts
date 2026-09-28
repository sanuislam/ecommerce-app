import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDistrict, normalizeBdPhone } from "@/lib/districts";

const schema = z.object({
  fullName: z.string().trim().min(2, "Please enter the full name").max(80),
  phone: z.string().trim().min(1, "Phone number is required"),
  line1: z.string().trim().min(5, "Please enter the full address").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Please enter the area / thana").max(80),
  state: z.string().trim().refine(isDistrict, "Please choose a district"),
  postalCode: z.string().trim().max(10).optional().default(""),
  isDefault: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const userId = session.user.id;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const phone = normalizeBdPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "Enter a valid mobile number (01XXXXXXXXX)" }, { status: 400 });
  }
  const count = await prisma.address.count({ where: { userId, archived: false } });
  if (count >= 10) {
    return NextResponse.json({ error: "You can save up to 10 addresses" }, { status: 400 });
  }
  const makeDefault = parsed.data.isDefault || count === 0;
  const a = parsed.data;
  const created = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({
      data: {
        userId,
        fullName: a.fullName,
        phone,
        line1: a.line1,
        line2: a.line2 || null,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode || null,
        country: "BD",
        isDefault: makeDefault,
      },
    });
  });
  return NextResponse.json(created, { status: 201 });
}
