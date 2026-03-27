import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { createUseCases } from "@/lib/container";
import { ActivationQRPanel } from "@/presentation/components/activation/ActivationQRPanel";
import { CheckCircle2, Heart, Shield } from "lucide-react";

export default async function ActivationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Nếu đã active (theo JWT) → redirect về dashboard
  if (session.user.status === UserStatus.ACTIVE) {
    redirect("/dashboard");
  }

  // Khởi tạo payment activation
  // Nếu DB đã active (JWT chưa refresh) → redirect về dashboard
  const { initiateActivation } = createUseCases();
  let paymentInfo;
  try {
    paymentInfo = await initiateActivation.execute({
      userId: session.user.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Tài khoản đã được kích hoạt") {
      redirect("/dashboard");
    }
    throw err;
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8 animate-in">
          <div className="w-14 h-14 rounded-2xl bg-jade-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-jade-200">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-2">
            Kích hoạt tài khoản
          </h1>
          <p className="text-stone-500 max-w-md mx-auto">
            Chuyển khoản <span className="font-semibold text-stone-700">10.000₫</span> để kích hoạt
            tài khoản. Số tiền này sẽ được chuyển vào{" "}
            <span className="text-jade-700 font-semibold">Quỹ Thiện Nguyện MBBank</span>.
          </p>
        </div>

        {/* Main Card */}
        <div className="animate-in animate-in-delay-1">
          <ActivationQRPanel paymentInfo={paymentInfo} userId={session.user.id} />
        </div>

        {/* Why activate */}
        <div className="mt-6 grid grid-cols-3 gap-3 animate-in animate-in-delay-2">
          {[
            { icon: Shield, title: "Chống tài khoản rác", desc: "Đảm bảo chất lượng cộng đồng" },
            { icon: Heart, title: "Ý nghĩa thiện nguyện", desc: "10k đến tay người cần" },
            { icon: CheckCircle2, title: "Một lần duy nhất", desc: "Kích hoạt mãi mãi" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 bg-white/60 backdrop-blur rounded-xl border border-stone-100 text-center">
              <Icon className="w-5 h-5 text-jade-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-stone-700 mb-0.5">{title}</div>
              <div className="text-xs text-stone-400">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
