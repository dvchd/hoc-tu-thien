import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/presentation/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Tài khoản
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Cài đặt hồ sơ
        </h1>
        <p className="text-stone-500 mt-1">
          Cập nhật thông tin cá nhân của bạn.
        </p>
      </div>

      <SettingsForm user={session.user} />
    </div>
  );
}
