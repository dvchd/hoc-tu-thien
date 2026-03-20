import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { AdminStatsCards } from "@/presentation/components/admin/AdminStatsCards";
import { AdminUserTable } from "@/presentation/components/admin/AdminUserTable";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const { listUsers, uow } = createUseCases();

  const [{ users, total }, stats] = await Promise.all([
    listUsers.execute({ pageSize: 20 }),
    uow.users.getUserStats(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Quản trị viên
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Tổng quan hệ thống
        </h1>
        <p className="text-stone-500 mt-1">
          Quản lý người dùng, theo dõi hoạt động và thống kê.
        </p>
      </div>

      {/* Stats */}
      <AdminStatsCards stats={stats} />

      {/* User Table */}
      <AdminUserTable
        users={users}
        total={total}
        currentUserId={session.user.id}
      />
    </div>
  );
}
