import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { TeachingFieldsManager } from "@/presentation/components/admin/TeachingFieldsManager";

export default async function AdminTeachingFieldsPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[AdminTeachingFieldsPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user || session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const fields = await prisma.teachingField.findMany({
    where: { isDeleted: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { mentors: true } } },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">Quản trị</p>
        <h1 className="font-display text-3xl font-bold text-stone-900">Lĩnh vực giảng dạy</h1>
        <p className="text-stone-500 mt-1">Quản lý danh mục lĩnh vực mà Mentor có thể đăng ký.</p>
      </div>
      <TeachingFieldsManager fields={fields} />
    </div>
  );
}
