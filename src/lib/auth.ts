import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    roleCheckedAt?: number;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// How often the JWT re-reads the user's role from the database, so a
// demoted or deleted admin loses access quickly.
const ROLE_REFRESH_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const { password } = parsed.data;

        const ip = await clientIp().catch(() => "unknown");
        const allowed =
          (await rateLimit(`login:ip:${ip}`, 20, 900)) &&
          (await rateLimit(`login:email:${email}`, 8, 900));
        if (!allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? Role.USER;
        token.roleCheckedAt = Date.now();
        return token;
      }
      if (token.id && Date.now() - (token.roleCheckedAt ?? 0) > ROLE_REFRESH_MS) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, name: true },
          });
          if (!fresh) return null; // account deleted → sign out
          token.role = fresh.role;
          token.name = fresh.name;
          token.roleCheckedAt = Date.now();
        } catch {
          // Keep the existing token if the database is briefly unreachable.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? session.user.id;
        session.user.role = token.role ?? Role.USER;
      }
      return session;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("FORBIDDEN");
  }
  return session.user;
}
