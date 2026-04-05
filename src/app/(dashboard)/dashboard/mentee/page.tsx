import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createUseCases } from "@/lib/container";
import { prisma } from "@/infrastructure/database/prisma/client";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { MentorGrid } from "@/presentation/components/mentee/MentorGrid";
import Link from "next/link";
import {
  BookOpen,
  Heart,
  Star,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";

interface MentorItem {
  id: string;
  name: string;
  image: string | null;
  bio: string;
  expertise: string;
  averageRating: number | null;
  ratingCount: number;
}

export default async function MenteeDashboardPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[MenteeDashboard] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");

  const { getMenteeLearningStats } = createUseCases();

  // Fetch mentors with profile ratings and mentee stats — handle gracefully if user was deleted
  // (e.g. DB was reset/cleared) to avoid crashing the page.
  //
  // IMPORTANT: redirect() must NOT be called inside this try-catch because
  // redirect() throws internally in Next.js and would be swallowed by catch.
  // Instead, capture the intent and redirect OUTSIDE the try-catch.
  let mentors: any[] = [];
  let menteeStats = { totalSessions: 0, totalHours: 0, totalDonated: 0, avgRatingGiven: null as number | null };
  let shouldRedirectToLogin = false;

  try {
    const results = await Promise.all([
      prisma.user.findMany({
        where: { role: "MENTOR", status: "ACTIVE", isDeleted: false },
        include: { mentorProfile: { select: { rating: true, ratingCount: true } } },
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
      getMenteeLearningStats.execute(session.user.id),
    ]);
    mentors = results[0];
    menteeStats = results[1];
  } catch (error) {
    console.error("[MenteeDashboard] Error loading data:", error);
    // User may have been deleted from DB — redirect to login to re-create
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Không tìm thấy người dùng")) {
      shouldRedirectToLogin = true;
    }
    // For other errors (network, etc.), render page with empty stats
  }

  if (shouldRedirectToLogin) {
    redirect("/login?error=SessionExpired");
  }

  const stats = [
    { 
      label: "Buổi đã học", 
      value: menteeStats.totalSessions.toString(), 
      icon: BookOpen, 
      color: "text-jade-600", 
      bg: "bg-jade-50" 
    },
    { 
      label: "Giờ học", 
      value: `${menteeStats.totalHours}h`, 
      icon: Clock, 
      color: "text-amber-600", 
      bg: "bg-amber-50" 
    },
    { 
      label: "Đã góp quỹ", 
      value: `₫${menteeStats.totalDonated.toLocaleString("vi-VN")}`, 
      icon: Heart, 
      color: "text-rose-600", 
      bg: "bg-rose-50" 
    },
    { 
      label: "Đánh giá TB", 
      value: menteeStats.avgRatingGiven ? `${menteeStats.avgRatingGiven.toFixed(1)}★` : "N/A", 
      icon: Star, 
      color: "text-amber-500", 
      bg: "bg-amber-50" 
    },
  ];

  const displayMentors: MentorItem[] = mentors.map((m: any) => ({
    id: m.id,
    name: m.name || "Mentor",
    image: m.image,
    bio: m.bio || "",
    expertise: "Mentor",
    averageRating: m.mentorProfile?.rating ?? null,
    ratingCount: m.mentorProfile?.ratingCount ?? 0,
  }));

  const isPendingActivation = session.user.status === UserStatus.PENDING_ACTIVATION;
  const lastName = session.user.name?.split(" ").at(-1) || "bạn";

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {isPendingActivation && (
        <Link
          href="/activation"
          className="animate-in block p-4 rounded-2xl bg-jade-50 border border-jade-200 hover:bg-jade-100 hover:border-jade-300 transition-all group cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-xl bg-jade-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-jade-800 text-sm">Tài khoản chưa được kích hoạt</h3>
              <p className="text-jade-600 text-xs mt-0.5">
                Kích hoạt tài khoản để mở khoá đầy đủ tính năng và tham gia cộng đồng Học Từ Thiện.
              </p>
            </div>
            <div className="flex-shrink-0 px-4 py-2 bg-jade-600 group-hover:bg-jade-700 text-white text-sm font-medium rounded-xl transition-colors">
              Kích hoạt ngay →
            </div>
          </div>
        </Link>
      )}

      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Người học
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Xin chào, {lastName} 👋
        </h1>
        <p className="text-stone-500 mt-1">
          Tiếp tục hành trình học tập và đóng góp cho cộng đồng của bạn.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in animate-in-delay-1">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="font-display text-2xl font-bold text-stone-900 mb-1">
              {stat.value}
            </div>
            <div className="text-stone-500 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {menteeStats.totalDonated > 0 && (
        <div className="animate-in animate-in-delay-2 p-5 rounded-2xl bg-gradient-to-r from-jade-600 to-emerald-600 text-white">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white fill-white/50" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Tác động của bạn</h3>
              <p className="text-jade-100 text-sm">
                ₫{menteeStats.totalDonated.toLocaleString("vi-VN")} học phí của bạn đã được chuyển vào Quỹ Thiện Nguyện MBBank —
                tương đương {Math.floor(menteeStats.totalDonated / 20000)} bữa ăn cho trẻ em vùng cao 🌱
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="animate-in animate-in-delay-3">
        <MentorGrid mentors={displayMentors} />
      </div>
    </div>
  );
}
