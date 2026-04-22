import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";

export { metadata, viewport } from "next-sanity/studio";

export const dynamic = "force-dynamic";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/studio");
  if (session.user.role !== Role.ADMIN) redirect("/");
  return children;
}
