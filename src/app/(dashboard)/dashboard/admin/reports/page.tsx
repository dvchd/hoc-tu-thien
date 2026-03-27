import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { AdminReportsTable } from "@/presentation/components/admin/AdminReportsTable";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo vi phạm</h1>
        <p className="text-gray-600">Xem xét và xử lý các báo cáo từ người dùng.</p>
      </div>

      <AdminReportsTable />
    </div>
  );
}
