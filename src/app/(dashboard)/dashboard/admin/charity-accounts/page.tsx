import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { CharityAccountManager } from "@/presentation/components/admin/CharityAccountManager";

export default async function CharityAccountsAdminPage() {
  const session = await auth();
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
          Tài khoản thiện nguyện
        </h1>
        <p className="text-stone-500 mt-1">
          Thêm, sửa và quản lý các tài khoản ngân hàng nhận tiền đóng góp.
        </p>
      </div>
      <CharityAccountManager />
    </div>
  );
}
