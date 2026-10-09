import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, STAFF_ROLE_IDS, type StaffRole } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function staffMember(id: string) {
  return prisma.user.findFirst({ where: { id, role: "STAFF" }, select: { id: true, email: true, staffRole: true } });
}

/** Changes a staff member's role (owner only). Takes effect within a minute. */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = z
    .object({ staffRole: z.enum(STAFF_ROLE_IDS as [string, ...string[]]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a role" }, { status: 400 });
  const member = await staffMember(id);
  if (!member) return NextResponse.json({ error: "Not a staff member" }, { status: 404 });
  const role = parsed.data.staffRole as StaffRole;
  await prisma.user.update({ where: { id }, data: { staffRole: role } });
  await audit(session, {
    action: "staff.role",
    targetType: "user",
    targetId: id,
    summary: `${member.email}: ${member.staffRole ?? "?"} → ${STAFF_ROLES[role].label}`,
    data: { from: member.staffRole, to: role },
  });
  return NextResponse.json({ ok: true });
}

/** Removes someone from the staff: the account becomes a plain customer account. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await adminSession("owner");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const member = await staffMember(id);
  if (!member) return NextResponse.json({ error: "Not a staff member" }, { status: 404 });
  await prisma.user.update({ where: { id }, data: { role: "USER", staffRole: null } });
  await prisma.passwordReset.deleteMany({ where: { userId: id, usedAt: null } });
  await audit(session, {
    action: "staff.remove",
    targetType: "user",
    targetId: id,
    summary: `${member.email} removed from staff`,
    data: { staffRole: member.staffRole },
  });
  return NextResponse.json({ ok: true });
}
