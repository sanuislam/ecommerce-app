import "server-only";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma";

/** The signed-in admin's session, or null. */
export async function adminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) return null;
  return session;
}
