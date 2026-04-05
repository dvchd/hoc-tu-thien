import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { AdminStatsCards } from "@/presentation/components/admin/AdminStatsCards";
import { AdminUserTable } from "@/presentation/components/admin/AdminUserTable";

export default async function AdminDashboardPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[AdminDashboardPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const { listUsers, uow } = createUseCases();

  let users: Awaited<ReturnType<typeof listUsers.execute>>["users"] = [];
  let total = 0;
  let stats: Awaited<ReturnType<typeof uow.users.getUserStats>> = {
    total: 0,
    byRole: { ADMIN: 0, MENTOR: 0, MENTEE: 0 },
    byStatus: { PENDING_ACTIVATION: 0, ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 },
  };

  try {
    const result = await Promise.all([
      listUsers.execute({ pageSize: 20 }),
      uow.users.getUserStats(),
    ]);
    users = result[0].users;
    total = result[0].total;
    stats = result[1];
  } catch (error) {
    console.error("[AdminDashboardPage] data fetch error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Không tìm thấy người dùng")) {
      redirect("/login?error=SessionExpired");
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
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
