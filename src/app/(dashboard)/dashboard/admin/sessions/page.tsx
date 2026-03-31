import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { AdminSessionsTable } from "@/presentation/components/admin/AdminSessionsTable";

export default async function AdminSessionsPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[AdminSessionsPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Quản trị viên
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Danh sách buổi học
        </h1>
        <p className="text-stone-500 mt-1">
          Quản lý và theo dõi tất cả buổi học trong hệ thống.
        </p>
      </div>

      <AdminSessionsTable />
    </div>
  );
}
