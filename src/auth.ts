import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./infrastructure/database/prisma/client";
import { createUseCases } from "./lib/container";
import { UserRole } from "./domain/value-objects/UserRole";
import { UserStatus } from "./domain/value-objects/UserStatus";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } },
    }),
  ],
  session: { strategy: "database" },
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
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, status: true, bio: true, phone: true },
        });
        if (dbUser) {
          session.user.id = user.id;
          session.user.role = dbUser.role as UserRole;
          session.user.status = dbUser.status as UserStatus;
          session.user.bio = dbUser.bio;
          session.user.phone = dbUser.phone;
        }
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
