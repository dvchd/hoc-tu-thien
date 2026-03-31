import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { SystemConfigPanel } from "@/presentation/components/admin/SystemConfigPanel";

export default async function ConfigAdminPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[ConfigAdminPage] auth() error (stale cookie):", error);
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
          Cấu hình hệ thống
        </h1>
        <p className="text-stone-500 mt-1">
          Quản lý các thông số vận hành của nền tảng.
        </p>
      </div>
      <SystemConfigPanel />
    </div>
  );
}
