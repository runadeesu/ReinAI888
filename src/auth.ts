import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { verifyTotpToken } from "@/lib/auth/totp";
import { decrypt } from "@/lib/crypto/encryption";
import { generateDisplayId, generateToken } from "@/lib/utils/ids";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// PrismaAdapter's default createUser has no knowledge of our custom required
// `displayId` field (only populated by the credentials-based /api/register
// route), so OAuth sign-ins (e.g. Google) would fail with a Prisma
// validation error on first login. Wrap the adapter to generate one here.
async function createUserWithDisplayId(data: Record<string, unknown>) {
  let displayId = generateDisplayId();
  while (await prisma.user.findUnique({ where: { displayId } })) {
    displayId = generateDisplayId();
  }
  const user = await prisma.user.create({ data: { ...data, displayId } as never });
  return user;
}

// Auth.js only forwards CredentialsSignin (and subclasses) to the client as
// a stable `code` search param — a plain thrown Error gets swallowed into a
// generic "Configuration" error. Use these so the login form can show the
// right message / prompt for a 2FA code.
class InvalidCredentialsError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS";
}
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}
class TotpRequiredError extends CredentialsSignin {
  code = "TOTP_REQUIRED";
}
class InvalidTotpError extends CredentialsSignin {
  code = "INVALID_TOTP";
}
class AccountSuspendedError extends CredentialsSignin {
  code = "ACCOUNT_SUSPENDED";
}

const baseAdapter = PrismaAdapter(prisma);

const authConfig: NextAuthConfig = {
  adapter: {
    ...baseAdapter,
    createUser: createUserWithDisplayId as unknown as typeof baseAdapter.createUser,
  },
  // Self-hosted deployments (not Vercel) must opt in to trusting the
  // request Host header; NEXTAUTH_URL / a reverse proxy is expected to
  // enforce the real external host in front of this.
  trustHost: true,
  session: { strategy: "jwt" as const, maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Google verifies email ownership itself, so it's safe to link
            // a Google sign-in to an existing credentials account with the
            // same address instead of blocking with OAuthAccountNotLinked.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.passwordHash) {
          throw new InvalidCredentialsError();
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          throw new InvalidCredentialsError();
        }

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        if (user.isSuspended) {
          throw new AccountSuspendedError();
        }

        if (user.twoFactorEnabled) {
          if (!totpCode) {
            throw new TotpRequiredError();
          }
          const secret = decrypt(JSON.parse(user.twoFactorSecret ?? "{}"));
          if (!verifyTotpToken(totpCode, secret)) {
            throw new InvalidTotpError();
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.sub = user.id;
      }

      if (trigger === "signIn" || trigger === "signUp") {
        try {
          const hdrs = await headers();
          const userAgent = hdrs.get("user-agent") ?? undefined;
          const ipAddress =
            hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? undefined;
          const method = account?.provider === "google" ? "google" : "credentials";

          const session = await prisma.session.create({
            data: {
              sessionToken: generateToken(),
              userId: token.sub as string,
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              userAgent,
              ipAddress,
            },
          });
          token.sid = session.id;

          await prisma.loginHistory.create({
            data: {
              userId: token.sub as string,
              ipAddress,
              userAgent,
              method,
              success: true,
            },
          });
        } catch {
          // Best-effort: auth still succeeds even if audit logging fails.
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }

      if (token.sid) {
        const dbSession = await prisma.session.findUnique({
          where: { id: token.sid as string },
          include: { user: { select: { isSuspended: true } } },
        });
        if (!dbSession || dbSession.expires < new Date() || dbSession.user.isSuspended) {
          // Session was revoked/expired, or the account was suspended after sign-in.
          return { ...session, user: undefined, expires: session.expires };
        }
        if (dbSession.lastSeenAt.getTime() < Date.now() - 5 * 60 * 1000) {
          await prisma.session.update({
            where: { id: dbSession.id },
            data: { lastSeenAt: new Date() },
          }).catch(() => {});
        }
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
