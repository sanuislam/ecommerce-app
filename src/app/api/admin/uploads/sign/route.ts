import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";
import { cloudinaryConfigured, signCloudinaryUpload } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!cloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const folder =
    typeof body?.folder === "string" && body.folder.trim()
      ? body.folder.trim()
      : "eidbazar/products";
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = signCloudinaryUpload({ timestamp, folder });
  return NextResponse.json(signed);
}
