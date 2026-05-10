import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";
import { testBkashConnection } from "@/lib/bkash";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await testBkashConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
