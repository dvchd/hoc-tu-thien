import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { createUseCases } from "@/lib/container";
import { AdminUserTable } from "@/presentation/components/admin/AdminUserTable";

interface SearchParams {
  role?: string;
  status?: string;
  page?: string;
  search?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[AdminUsersPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const { page: pageParam, role, status } = await searchParams;
  const page = Number(pageParam ?? 1);
  const VALID_STATUSES = new Set<string>(Object.values(UserStatus));
  const validatedStatus = status && VALID_STATUSES.has(status) ? (status as UserStatus) : undefined;

  const { listUsers } = createUseCases();

  const { users, total } = await listUsers.execute({
    role: role as UserRole | undefined,
    status: validatedStatus,
    page,
    pageSize: 20,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Quản trị viên
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Danh sách người dùng
        </h1>
        <p className="text-stone-500 mt-1">
          Quản lý tất cả tài khoản trong hệ thống.
        </p>
      </div>

      <AdminUserTable
        users={users}
        total={total}
        currentUserId={session.user.id}
      />
    </div>
  );
}
