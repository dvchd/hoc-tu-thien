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
    allowDangerousEmailAccountLinking: true,
    checks: ["pkce", "state"],
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProviderWithHardcodedEndpoints(),
  ],
  // Use JWT strategy so middleware (Edge Runtime) can read session without PrismaClient
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
    async jwt({ token, user }) {
      // On initial sign-in, populate token from DB
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
        }
      } else if (token.id) {
        // On subsequent requests, always re-read status/role from DB
        // so changes (e.g. activation, role change) are reflected immediately
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, bio: true, phone: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.bio = dbUser.bio;
          token.phone = dbUser.phone;
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
