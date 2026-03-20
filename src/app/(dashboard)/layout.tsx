import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/presentation/components/layout/Sidebar";
import { TopBar } from "@/presentation/components/layout/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex bg-stone-50">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={session.user} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
