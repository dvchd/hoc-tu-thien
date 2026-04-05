import NextAuth from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./infrastructure/database/prisma/client";
import { createUseCases } from "./lib/container";
import { UserRole } from "./domain/value-objects/UserRole";
import { UserStatus } from "./domain/value-objects/UserStatus";

/**
 * Custom Google provider with hardcoded endpoints to avoid OIDC discovery fetch.
 * The standard GoogleProvider fetches https://accounts.google.com/.well-known/openid-configuration
 * on every sign-in, which fails behind corporate proxies that block HTTPS tunneling.
 *
 * Uses "state" check only (no pkce) to avoid cookie loss behind reverse proxies
 * (Coolify/Nginx) which causes InvalidCheck errors on the OAuth callback.
 */
function GoogleProviderWithHardcodedEndpoints(): OAuthConfig<Record<string, unknown>> {
  return {
    id: "google",
    name: "Google",
    type: "oidc",
    issuer: "https://accounts.google.com",
    // Hardcoded endpoints - no discovery fetch needed
    authorization: {
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code",
        scope: "openid email profile",
      },
    },
    token: "https://oauth2.googleapis.com/token",
    userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
    jwks_endpoint: "https://www.googleapis.com/oauth2/v3/certs",
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // allowDangerousEmailAccountLinking: Required — without this, NextAuth refuses to link a
    // new Google OAuth account to an existing local account with the same email, causing
    // sign-in failures for users who originally signed up via email/password or a
    // different provider. This is intentional and necessary for the platform's OAuth flow.
    allowDangerousEmailAccountLinking: true,
    // Use "state" only — pkce requires additional cookies that can be lost
    // behind reverse proxies (Coolify/Nginx), causing InvalidCheck errors.
    checks: ["state"],
    profile(profile) {
      return {
        id: profile.sub as string,
        name: profile.name as string,
        email: profile.email as string,
        image: profile.picture as string,
      };
    },
  };
}

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!secret) {
  console.error("[Auth] FATAL: AUTH_SECRET / NEXTAUTH_SECRET is not set. Authentication will fail.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  // trustHost allows NextAuth to work behind Coolify/Nginx reverse proxy
  // without needing to explicitly whitelist hosts.
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProviderWithHardcodedEndpoints(),
  ],
  // JWT strategy: middleware (Edge Runtime) can verify session without PrismaClient.
  // Do NOT add custom cookies config — it causes cookie name mismatch between
  // auth.ts (Node.js) and auth.config.ts (Edge/middleware), breaking session reads.
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        const { findOrCreateUser } = createUseCases();
        await findOrCreateUser.execute({
          id: user.id!,
          email: user.email,
          name: user.name,
          image: user.image,
          role: UserRole.MENTEE,
          createdBy: "google-oauth",
        });
        return true;
      } catch (error) {
        console.error("[Auth] signIn error:", error);
        return false;
      }
    },
    async jwt({ token, user, trigger }) {
      // On initial sign-in: populate token from DB
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, status: true, bio: true, phone: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.bio = dbUser.bio;
          token.phone = dbUser.phone;
          token.fetchedAt = Date.now();
        }
        return token;
      }

      // On explicit update trigger (e.g. after activation): re-read from DB
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, bio: true, phone: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.bio = dbUser.bio;
          token.phone = dbUser.phone;
          token.fetchedAt = Date.now();
        }
        return token;
      }

      // On subsequent requests: re-read DB only every 5 minutes
      // This keeps role/status fresh without hammering DB on every request.
      const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
      const fetchedAt = (token.fetchedAt as number) ?? 0;
      if (token.id && Date.now() - fetchedAt > REFRESH_INTERVAL_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, bio: true, phone: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.bio = dbUser.bio;
          token.phone = dbUser.phone;
          token.fetchedAt = Date.now();
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.bio = token.bio as string | null | undefined;
        session.user.phone = token.phone as string | null | undefined;
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
