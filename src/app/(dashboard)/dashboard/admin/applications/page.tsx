import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { MentorApplicationsTable } from "@/presentation/components/admin/MentorApplicationsTable";

export default async function MentorApplicationsAdminPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[MentorApplicationsAdminPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Quản trị viên
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Đơn đăng ký Mentor
        </h1>
        <p className="text-stone-500 mt-1">
          Xem xét và phê duyệt các ứng viên muốn trở thành mentor.
        </p>
      </div>
      <MentorApplicationsTable />
    </div>
  );
}
