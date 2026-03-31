import { auth } from "@/auth";
import { redirect } from "next/navigation";
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
    // Redirect to login — the middleware will also clear the cookie,
    // but this catch ensures the server component doesn't throw
    // into the error boundary.
    console.error("[DashboardLayout] auth() error, redirecting to login:", error);
    redirect("/login?error=SessionExpired");
  }

  if (!session?.user) redirect("/login");

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
