import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { cloudinaryConfigured, signCloudinaryUpload } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Customers' photo uploads (reviews, returns) go straight to Cloudinary into a fixed folder. */
const CUSTOMER_FOLDERS = { review: "eidbazar/reviews", return: "eidbazar/returns" } as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!cloudinaryConfigured()) return NextResponse.json({ error: "Photo upload is not available" }, { status: 503 });
  if (!(await rateLimit(`custupload:${session.user.id}`, 30, 3600))) {
    return NextResponse.json({ error: "Too many uploads. Try later." }, { status: 429 });
  }
  const parsed = z.object({ kind: z.enum(["review", "return"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  return NextResponse.json(signCloudinaryUpload({ timestamp: Math.floor(Date.now() / 1000), folder: CUSTOMER_FOLDERS[parsed.data.kind] }));
}
