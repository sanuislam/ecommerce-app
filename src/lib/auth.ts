import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hashRecovery, openSecret, verifyTotp } from "@/lib/totp";
import { verifyOtp } from "@/lib/otp";
import { StaffMustUsePassword, userForPhone } from "@/lib/phone-login";
import Google from "next-auth/providers/google";

/** The account has two-factor sign-in: ask for the code. */
class TwoFactorRequired extends CredentialsSignin {
  code = "2fa_required";
}
/** The two-factor code (or recovery code) was wrong. */
class TwoFactorInvalid extends CredentialsSignin {
  code = "2fa_invalid";
}
/** The SMS sign-in code was wrong or expired. */
class OtpInvalid extends CredentialsSignin {
  code = "otp_invalid";
}
/** Staff accounts sign in with e-mail, password (and two-factor), not SMS. */
class StaffUsePassword extends CredentialsSignin {
  code = "staff_use_password";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      staffRole: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    staffRole?: string | null;
    needs2fa?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    staffRole?: string | null;
    roleCheckedAt?: number;
    /** When this session signed in (ms); a later password change ends it. */
    signedInAt?: number;
    /** Admin-panel user who must still turn on two-factor (owner requires it). */
    needs2fa?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().trim().max(20).optional(),
});

// How often the JWT re-reads the user's role from the database, so a
// demoted or deleted admin loses access quickly.
const ROLE_REFRESH_MS = 60_000;

/** Must this admin-panel user turn on two-factor before using the panel? */
async function needsTwoFactor(role: Role, enabledAt: Date | null): Promise<boolean> {
  if (role === Role.USER || enabledAt) return false;
  const rules = await prisma.adminSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  return !!rules?.require2fa;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    // Mobile number + 6-digit SMS code: signs in, or creates the account.
    Credentials({
      id: "phone-otp",
      name: "Mobile number",
      credentials: { phone: { label: "Mobile", type: "tel" }, code: { label: "Code", type: "text" }, name: { label: "Name", type: "text" } },
      async authorize(raw) {
        const parsed = z
          .object({ phone: z.string().max(20), code: z.string().trim().max(10), name: z.string().trim().max(80).optional() })
          .safeParse(raw);
        if (!parsed.success) throw new OtpInvalid();
        const ip = await clientIp().catch(() => "unknown");
        if (!(await rateLimit(`otplogin:ip:${ip}`, 30, 900))) throw new OtpInvalid();
        if (!(await verifyOtp(parsed.data.phone, "login", parsed.data.code.replace(/\s/g, "")))) throw new OtpInvalid();
        let user;
        try {
          user = await userForPhone(parsed.data.phone, parsed.data.name);
        } catch (err) {
          if (err instanceof StaffMustUsePassword) throw new StaffUsePassword();
          throw err;
        }
        if (!user) throw new OtpInvalid();
        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role, staffRole: null, needs2fa: false };
      },
    }),
    // Google sign-in, only when its keys are set (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Two-factor code", type: "text" },
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

        if (user.twoFactorEnabledAt && user.twoFactorSecret) {
          const code = (parsed.data.code ?? "").replace(/\s/g, "");
          if (!code) throw new TwoFactorRequired();
          if (!(await rateLimit(`2fa:${user.id}`, 6, 900))) throw new TwoFactorInvalid();
          const secret = openSecret(user.twoFactorSecret);
          let passed = !!secret && /^\d{6}$/.test(code) && verifyTotp(secret, code);
          if (!passed && code.length >= 10) {
            // A recovery code works once.
            const used = await prisma.$executeRaw`
              UPDATE "User" SET "twoFactorRecovery" = array_remove("twoFactorRecovery", ${hashRecovery(code)})
              WHERE "id" = ${user.id} AND ${hashRecovery(code)} = ANY("twoFactorRecovery")`;
            passed = used === 1;
          }
          if (!passed) throw new TwoFactorInvalid();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          staffRole: user.staffRole,
          needs2fa: await needsTwoFactor(user.role, user.twoFactorEnabledAt),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google may only open customer accounts: staff need password + two-factor.
      if (account?.provider === "google") {
        const u = user.email ? await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { role: true } }) : null;
        if (u && u.role !== Role.USER) return "/sign-in?error=staff_use_password";
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? Role.USER;
        token.staffRole = (user as { staffRole?: string | null }).staffRole ?? null;
        token.needs2fa = !!user.needs2fa;
        token.roleCheckedAt = Date.now();
        token.signedInAt = Date.now();
        return token;
      }
      // "update" (from the client) only forces a fresh read from the database;
      // nothing the client sends is trusted.
      if (token.id && (trigger === "update" || Date.now() - (token.roleCheckedAt ?? 0) > ROLE_REFRESH_MS)) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, name: true, staffRole: true, passwordChangedAt: true, twoFactorEnabledAt: true },
          });
          if (!fresh) return null; // account deleted → sign out
          // Password changed (or reset) after this session started → sign out.
          if (fresh.passwordChangedAt && fresh.passwordChangedAt.getTime() > (token.signedInAt ?? 0) + 1000) {
            return null;
          }
          token.role = fresh.role;
          token.staffRole = fresh.staffRole;
          token.needs2fa = await needsTwoFactor(fresh.role, fresh.twoFactorEnabledAt);
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
        session.user.staffRole = token.staffRole ?? null;
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
