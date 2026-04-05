import { PrismaClient } from "@prisma/client";

// ─── Prisma Singleton ─────────────────────────────────────────────────────────
// In development, reuse the Prisma client across hot reloads.
// In production, create a single instance.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
