import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readEmailToken } from "@/lib/email-verify";

export const dynamic = "force-dynamic";

/** The link from the confirmation e-mail. Must be opened signed in as the same account. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const go = (r: string) => NextResponse.redirect(new URL(`/account/profile?email=${r}`, url.origin), { status: 303 });
  const session = await auth();
  if (!session?.user) {
    const back = `/api/account/email/verify?t=${encodeURIComponent(t)}`;
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(back)}`, url.origin), { status: 303 });
  }
  const tok = readEmailToken(t);
  if (!tok || tok.userId !== session.user.id) return go("invalid");
  const holder = await prisma.user.findUnique({ where: { email: tok.email }, select: { id: true } });
  if (holder) return go(holder.id === tok.userId ? "verified" : "taken");
  try {
    // Only while the account still has the e-mail the link was made for.
    const r = await prisma.user.updateMany({
      where: { id: tok.userId, email: tok.prev, role: "USER", deletedAt: null },
      data: { email: tok.email, emailVerified: new Date() },
    });
    return go(r.count === 1 ? "verified" : "invalid");
  } catch {
    return go("taken"); // unique clash in a race
  }
}
