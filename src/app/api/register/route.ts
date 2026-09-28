import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeBdPhone } from "@/lib/districts";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().min(1).max(40),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  phone: z.string().trim().min(4).max(32),
});

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}

export async function POST(req: Request) {
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) {
    return NextResponse.json(
      { error: "Too many sign-ups from this network. Try again later." },
      { status: 429 },
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  // Store Bangladeshi numbers as 01XXXXXXXXX; keep other countries in +E.164.
  const rawDigits = parsed.data.phone.replace(/[^\d]/g, "");
  const phone =
    normalizeBdPhone(parsed.data.phone) ??
    (rawDigits.length >= 8 && rawDigits.length <= 15 ? `+${rawDigits}` : null);
  if (!phone) {
    return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const { firstName, lastName } = parsed.data;
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone,
        email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
