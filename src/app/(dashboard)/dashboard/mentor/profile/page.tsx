import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { MentorProfileForm } from "@/presentation/components/mentor/MentorProfileForm";

export default async function MentorProfilePage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[MentorProfilePage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  let mentorProfile: any = null;
  let allFields: any[] = [];
  let charityAccounts: any[] = [];
  let shouldRedirectToLogin = false;

  try {
    [mentorProfile, allFields, charityAccounts] = await Promise.all([
      prisma.mentorProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          teachingFields: { include: { teachingField: true } },
          charityAccount: {
            select: { id: true, name: true, accountNo: true, bankName: true },
          },
        },
      }),
      prisma.teachingField.findMany({
        where: { isActive: true, isDeleted: false },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.charityAccount.findMany({
        where: { isActive: true, isDeleted: false },
        select: { id: true, name: true, accountNo: true, bankName: true, campaignKeyword: true, verificationStatus: true },
        orderBy: { name: "asc" },
      }),
    ]);
  } catch (error) {
    console.error("[MentorProfilePage] Error loading data:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Không tìm thấy người dùng")) {
      shouldRedirectToLogin = true;
    }
  }

  if (shouldRedirectToLogin) {
    redirect("/login?error=SessionExpired");
  }

  const selectedFieldIds =
    mentorProfile?.teachingFields.map((tf: { teachingFieldId: string }) => tf.teachingFieldId) ?? [];

  return (
    <div className="max-w-3xl space-y-8">
      <div className="animate-in">
        <p className="text-amber-600 text-sm font-medium tracking-wide uppercase mb-1">
          Mentor
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Hồ sơ Mentor
        </h1>
        <p className="text-stone-500 mt-1">
          Cập nhật thông tin, lĩnh vực giảng dạy và tài khoản Thiện Nguyện App.
        </p>
      </div>

      <MentorProfileForm
        userId={session.user.id}
        userName={session.user.name}
        userImage={session.user.image}
        profile={mentorProfile}
        allFields={allFields}
        selectedFieldIds={selectedFieldIds}
        charityAccounts={charityAccounts}
      />
    </div>
  );
}
