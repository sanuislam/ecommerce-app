import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isDistrict, normalizeBdPhone } from "@/lib/districts";

type Ctx = { params: Promise<{ id: string }> };

async function ownAddress(id: string) {
  const session = await auth();
  if (!session?.user) return null;
  const address = await prisma.address.findFirst({
    where: { id, userId: session.user.id, archived: false },
  });
  return address ? { address, userId: session.user.id } : null;
}

const editSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter the full name").max(80),
  phone: z.string().trim().min(1, "Phone number is required"),
  line1: z.string().trim().min(5, "Please enter the full address").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Please enter the area / thana").max(80),
  state: z.string().trim().refine(isDistrict, "Please choose a district"),
  postalCode: z.string().trim().max(10).optional().default(""),
  isDefault: z.boolean().optional(),
});

/**
 * No body: make the address the default one. With the address fields: edit
 * it. An address already used by an order is never changed in place (the
 * order must keep where it went): the old one is archived and a new one
 * takes its place in the address book.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await ownAddress(id);
  if (!owned) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  const raw = await req.json().catch(() => null);

  if (!raw) {
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId: owned.userId }, data: { isDefault: false } }),
      prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const phone = normalizeBdPhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid mobile number (01XXXXXXXXX)" }, { status: 400 });
  const a = parsed.data;
  const fields = {
    fullName: a.fullName,
    phone,
    line1: a.line1,
    line2: a.line2 || null,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode || null,
  };
  const makeDefault = a.isDefault ?? owned.address.isDefault;
  const used = await prisma.order.count({ where: { addressId: id } });
  const saved = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: owned.userId }, data: { isDefault: false } });
    if (!used) return tx.address.update({ where: { id }, data: { ...fields, isDefault: makeDefault } });
    await tx.address.update({ where: { id }, data: { archived: true, isDefault: false } });
    return tx.address.create({ data: { ...fields, userId: owned.userId, country: "BD", isDefault: makeDefault } });
  });
  return NextResponse.json({ id: saved.id });
}

/** Removes an address from the address book (kept for past orders). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await ownAddress(id);
  if (!owned) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  await prisma.address.update({ where: { id }, data: { archived: true, isDefault: false } });
  if (owned.address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: owned.userId, archived: false },
      orderBy: { createdAt: "desc" },
    });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return NextResponse.json({ ok: true });
}
