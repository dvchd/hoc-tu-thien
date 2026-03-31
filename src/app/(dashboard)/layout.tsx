import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma/client";
import { Sidebar } from "@/presentation/components/layout/Sidebar";
import { TopBar } from "@/presentation/components/layout/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch (error) {
    // JWT decryption failed (stale cookie after rebuild/deploy).
    console.error("[DashboardLayout] auth() error, redirecting to login:", error);
    redirect("/login?error=SessionExpired");
  }

  if (!session?.user) redirect("/login");

  // Verify the user still exists in the database.
  // In test/staging environments the DB may be periodically wiped, leaving
  // stale JWTs that contain valid-looking user IDs. Without this check,
  // every child page that queries by session.user.id would throw
  // "Không tìm thấy người dùng" into the error boundary.
  //
  // IMPORTANT: redirect() must NOT be inside this try-catch because
  // redirect() throws internally in Next.js and would be caught here.
  // Instead, we capture the result and redirect OUTSIDE the try-catch.
  let userExists = true;
  try {
    const exists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (!exists) {
      userExists = false;
    }
  } catch (dbError) {
    // DB is unreachable — let the child pages handle their own errors
    // rather than blocking the entire dashboard.
    console.error("[DashboardLayout] DB check failed:", dbError);
  }

  if (!userExists) {
    console.warn(
      `[DashboardLayout] User ${session.user.id} not found in DB. ` +
      "Redirecting to login to re-authenticate.",
    );
    redirect("/login?error=SessionExpired");
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={{ ...session.user, status: session.user.status }} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
