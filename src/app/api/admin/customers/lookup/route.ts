import { NextResponse } from "next/server";
import { adminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** A customer by phone: their name, e-mail, last address and order history size. */
export async function GET(req: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const digits = (new URL(req.url).searchParams.get("phone") ?? "").replace(/\D/g, "");
  if (digits.length < 10) return NextResponse.json({ customer: null });
  const tail = digits.slice(-10);
  const address = await prisma.address.findFirst({
    where: { phone: { endsWith: tail } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const user =
    address?.user ??
    (await prisma.user.findFirst({ where: { phone: { endsWith: tail } }, select: { id: true, name: true, email: true } }));
  if (!user) return NextResponse.json({ customer: null });
  const [orders, cancelled] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.count({ where: { userId: user.id, status: "CANCELLED" } }),
  ]);
  return NextResponse.json({
    customer: {
      name: address?.fullName || user.name || "",
      email: user.email.endsWith(".invalid") ? "" : user.email,
      orders,
      cancelled,
      address: address
        ? {
            district: address.state ?? "",
            area: address.city,
            line1: address.line1,
            line2: address.line2 ?? "",
            postalCode: address.postalCode ?? "",
          }
        : null,
    },
  });
}
