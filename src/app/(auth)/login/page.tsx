import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { Heart, Shield, Users, BookOpen } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Panel – Brand ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-stone-900 p-12 flex-col justify-between">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-jade-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-jade-600 flex items-center justify-center shadow-lg shadow-jade-900/50">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">
              Học Từ Thiện
            </div>
            <div className="text-stone-400 text-xs">Kết nối Mentor & Mentee</div>
          </div>
        </div>

        {/* Quote */}
        <div className="relative">
          <blockquote className="font-display text-3xl font-medium text-white leading-tight mb-6">
            "Tri thức chia sẻ không bao giờ cạn — nó chỉ sinh sôi thêm."
          </blockquote>
          <p className="text-stone-400 text-sm">
            Mỗi buổi học của bạn góp phần xây dựng một tương lai tốt đẹp hơn
            cho cộng đồng.
          </p>
        </div>

        {/* Features */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Kết nối 1-1" },
            { icon: BookOpen, label: "Học linh hoạt" },
            { icon: Shield, label: "Minh bạch" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <Icon className="w-5 h-5 text-jade-400" />
              <span className="text-stone-300 text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Panel – Auth ─────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 gradient-hero relative">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-jade-600 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-display text-lg font-semibold">Học Từ Thiện</span>
        </div>

        <div className="w-full max-w-md animate-in">
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-display text-4xl font-bold text-stone-900 mb-3">
              Chào mừng!
            </h1>
            <p className="text-stone-500">
              Đăng nhập để bắt đầu hành trình học tập và thiện nguyện của bạn.
            </p>
          </div>

          {/* Google Sign In */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-4 px-6 py-4 bg-white border-2 border-stone-200 rounded-2xl text-stone-700 font-semibold text-base hover:border-jade-300 hover:shadow-lg hover:shadow-jade-100 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              {/* Google icon */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Tiếp tục với Google</span>
              <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-jade-600">
                →
              </span>
            </button>
          </form>

          {/* Divider / notice */}
          <div className="mt-8 p-4 rounded-2xl bg-jade-50 border border-jade-100">
            <div className="flex items-start gap-3">
              <Heart className="w-4 h-4 text-jade-600 fill-jade-200 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-jade-700 leading-relaxed">
                <span className="font-semibold">Tài khoản mới</span> sẽ được tạo tự động với vai trò{" "}
                <span className="font-semibold">Người học (Mentee)</span>. Bạn có
                thể được nâng lên Mentor bởi Admin sau khi đăng ký.
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Bảo mật
            </span>
            <span className="w-px h-4 bg-stone-200" />
            <span>Không lưu mật khẩu</span>
            <span className="w-px h-4 bg-stone-200" />
            <span>OAuth 2.0</span>
          </div>
        </div>

        {/* Bottom notice */}
        <p className="absolute bottom-8 text-xs text-stone-400 text-center px-8">
          Học phí 100% chuyển vào{" "}
          <span className="text-stone-500 font-medium">
            Quỹ Thiện Nguyện App MBBank
          </span>
          . Bằng việc đăng nhập, bạn đồng ý với điều khoản dịch vụ.
        </p>
      </div>
    </div>
  );
}
