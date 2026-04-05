import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  Heart,
  Users,
  ArrowRight,
  Star,
  BookOpen,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default async function HomePage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    // JWT decryption failed — stale cookie from a previous deployment.
    // Treat as no session so the landing page renders normally.
    console.error("[HomePage] auth() error (stale cookie):", error);
    session = null;
  }
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen gradient-hero overflow-hidden">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-jade-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-display text-lg font-semibold text-stone-800">
              Học Từ Thiện
            </span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-jade-600 text-white rounded-xl text-sm font-medium hover:bg-jade-700 transition-all hover:shadow-lg hover:shadow-jade-200 hover:-translate-y-0.5"
          >
            Bắt đầu ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="pt-36 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-jade-50 border border-jade-200 rounded-full text-jade-700 text-xs font-medium mb-8 animate-in">
            <Heart className="w-3 h-3 fill-jade-500 text-jade-500" />
            Học phí → Quỹ Thiện Nguyện MBBank
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-stone-900 leading-tight mb-6 animate-in animate-in-delay-1">
            Học để trưởng thành,
            <br />
            <span className="text-jade-600">Trao để yêu thương</span>
          </h1>

          <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-in animate-in-delay-2">
            Nền tảng kết nối 1-1 giữa Mentor và Mentee. Mỗi buổi học là một
            hành động thiện nguyện — học phí được chuyển thẳng vào{" "}
            <span className="text-stone-700 font-medium">
              Quỹ Thiện Nguyện App MBBank
            </span>
            .
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in animate-in-delay-3">
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 bg-jade-600 text-white rounded-2xl font-semibold text-base hover:bg-jade-700 transition-all hover:shadow-xl hover:shadow-jade-200 hover:-translate-y-1"
            >
              <Sparkles className="w-5 h-5" />
              Đăng nhập với Google
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 bg-white/80 border border-stone-200 text-stone-700 rounded-2xl font-medium text-base hover:bg-white transition-all hover:border-stone-300"
            >
              Tìm hiểu thêm
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-3 gap-6 animate-in animate-in-delay-4">
          {[
            { value: "500+", label: "Mentor tình nguyện" },
            { value: "2,000+", label: "Mentee đang học" },
            { value: "₫1.2 tỷ", label: "Đã quyên góp" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 glass rounded-2xl"
            >
              <div className="font-display text-3xl font-bold text-jade-600 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-stone-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-stone-900 mb-4">
              Cách hoạt động
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              Đơn giản, minh bạch và ý nghĩa — mỗi kết nối đều tạo ra giá trị
              thực sự
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Đăng ký & Kết nối",
                desc: "Đăng nhập bằng Google, chọn Mentor phù hợp với mục tiêu của bạn. Không cần tạo mật khẩu.",
                color: "from-jade-50 to-jade-100/50 border-jade-200",
                iconColor: "text-jade-600",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "Học 1-1 chất lượng",
                desc: "Học theo lịch linh hoạt, nội dung cá nhân hóa với Mentor dày dạn kinh nghiệm.",
                color: "from-amber-50 to-amber-100/50 border-amber-200",
                iconColor: "text-amber-600",
              },
              {
                step: "03",
                icon: Heart,
                title: "Học phí → Thiện nguyện",
                desc: "100% học phí được chuyển khoản tự động vào Quỹ Thiện Nguyện App của MBBank.",
                color: "from-rose-50 to-rose-100/50 border-rose-200",
                iconColor: "text-rose-600",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`p-8 rounded-3xl border bg-gradient-to-br ${item.color} relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="absolute top-4 right-4 font-display text-6xl font-bold text-stone-100 select-none">
                  {item.step}
                </div>
                <item.icon
                  className={`w-10 h-10 mb-4 ${item.iconColor} relative z-10`}
                />
                <h3 className="font-display text-xl font-semibold text-stone-800 mb-3 relative z-10">
                  {item.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed relative z-10">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust ───────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-stone-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ShieldCheck className="w-6 h-6 text-jade-400" />
            <span className="text-jade-400 font-medium text-sm tracking-wide uppercase">
              Minh bạch & Tin cậy
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Mỗi đồng học phí đều có địa chỉ cụ thể
          </h2>
          <p className="text-stone-400 max-w-2xl mx-auto mb-8">
            Học phí được chuyển khoản trực tiếp vào{" "}
            <span className="text-white font-medium">
              Quỹ Thiện Nguyện App MBBank
            </span>
            . Bạn có thể theo dõi từng giao dịch công khai trên ứng dụng MBBank.
          </p>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-5 h-5 text-amber-400 fill-amber-400"
              />
            ))}
            <span className="text-stone-400 text-sm ml-2">
              4.9/5 từ 1,200+ người dùng
            </span>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-stone-900 mb-4">
            Sẵn sàng tạo ra sự thay đổi?
          </h2>
          <p className="text-stone-500 mb-10">
            Đăng nhập ngay, chỉ cần tài khoản Google — không mật khẩu, không
            phức tạp.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-10 py-5 bg-stone-900 text-white rounded-2xl font-semibold text-base hover:bg-jade-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <Heart className="w-5 h-5 fill-white" />
            Bắt đầu học & cho đi
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-jade-600 fill-jade-600" />
            <span className="font-display font-semibold text-stone-700">
              Học Từ Thiện
            </span>
          </div>
          <p className="text-stone-400 text-sm">
            © 2025 Học Từ Thiện. Học phí → Quỹ Thiện Nguyện MBBank.
          </p>
        </div>
      </footer>
    </div>
  );
}
