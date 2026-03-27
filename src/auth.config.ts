import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";

/**
 * Edge-compatible auth config (no Prisma adapter).
 * Used by middleware which runs in Edge Runtime.
 *
 * Uses JWT session strategy so the middleware can verify sessions
 * without needing PrismaClient (which can't run in Edge Runtime).
 * The JWT is signed with the same secret as auth.ts, so tokens are compatible.
 */
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token }) {
      // Pass through custom fields already stored in the token by auth.ts
      return token;
    },
    async session({ session, token }) {
      // Populate session.user with custom fields from JWT token
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
};
