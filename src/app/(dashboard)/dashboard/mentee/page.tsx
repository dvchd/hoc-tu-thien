import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createUseCases } from "@/lib/container";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { MentorGrid } from "@/presentation/components/mentee/MentorGrid";
import Link from "next/link";
import {
  BookOpen,
  Heart,
  Star,
  Clock,
  Zap,
} from "lucide-react";

export default async function MenteeDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Load available mentors and stats
  const { listUsers, getMenteeLearningStats } = createUseCases();
  const [{ users: mentors }, menteeStats] = await Promise.all([
    listUsers.execute({
      role: "MENTOR" as any,
      pageSize: 6,
    }),
    getMenteeLearningStats.execute(session.user.id)
  ]);

  const stats = [
    { label: "Buổi đã học", value: menteeStats.totalSessions.toString(), icon: BookOpen, color: "text-jade-600", bg: "bg-jade-50" },
    { label: "Giờ học", value: `${menteeStats.totalHours}h`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Đã góp quỹ", value: `₫${menteeStats.totalDonated.toLocaleString("vi-VN")}`, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Đánh giá TB", value: menteeStats.avgRatingGiven ? `${menteeStats.avgRatingGiven.toFixed(1)}★` : "N/A", icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  // Fallback mock mentors if no data yet
  const mockMentors = [
    { id: "1", name: "Nguyễn Văn Anh", image: null, bio: "Senior Software Engineer tại Google với 8 năm kinh nghiệm ReactJS, NodeJS.", expertise: "Web Development" },
    { id: "2", name: "Trần Thị Mai", image: null, bio: "Data Scientist tại VinAI, chuyên về ML/AI và Python.", expertise: "Data Science" },
    { id: "3", name: "Lê Minh Tuấn", image: null, bio: "Product Manager tại Grab, hơn 6 năm trong lĩnh vực product.", expertise: "Product Management" },
    { id: "4", name: "Phạm Thu Hương", image: null, bio: "UX Designer với portfolio tại các công ty top tier.", expertise: "UX/UI Design" },
    { id: "5", name: "Võ Thanh Long", image: null, bio: "DevOps engineer chuyên AWS và Kubernetes.", expertise: "Cloud & DevOps" },
    { id: "6", name: "Đỗ Minh Châu", image: null, bio: "Marketing director 10 năm kinh nghiệm growth hacking.", expertise: "Digital Marketing" },
  ];

  const displayMentors = mentors.length > 0
    ? mentors.map((m) => ({ id: m.id, name: m.name || "Mentor", image: m.image, bio: m.bio || "", expertise: "Mentor" }))
    : mockMentors;

  const isPendingActivation = session.user.status === UserStatus.PENDING_ACTIVATION;

  return (
    <div className="space-y-8">
      {/* Activation banner */}
      {isPendingActivation && (
        <div className="animate-in p-4 rounded-2xl bg-jade-50 border border-jade-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-jade-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-jade-800 text-sm">Tài khoản chưa được kích hoạt</h3>
            <p className="text-jade-600 text-xs mt-0.5">
              Kích hoạt tài khoản để mở khoá đầy đủ tính năng và tham gia cộng đồng Học Từ Thiện.
            </p>
          </div>
          <Link
            href="/activation"
            className="flex-shrink-0 px-4 py-2 bg-jade-600 text-white text-sm font-medium rounded-xl hover:bg-jade-700 transition-colors"
          >
            Kích hoạt ngay
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Người học
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Xin chào, {session.user.name?.split(" ").at(-1)} 👋
        </h1>
        <p className="text-stone-500 mt-1">
          Tiếp tục hành trình học tập và đóng góp cho cộng đồng của bạn.
        </p>
      </div>

      {/* Stats */}
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

      {/* Impact banner */}
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

      {/* Find Mentor – client component with search + link */}
      <div className="animate-in animate-in-delay-3">
        <MentorGrid mentors={displayMentors} />
      </div>
    </div>
  );
}
