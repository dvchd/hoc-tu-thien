import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { formatVND } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  Users,
  TrendingUp,
  Heart,
  Clock,
} from "lucide-react";

export default async function MentorDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN)) {
    redirect("/dashboard");
  }

  const { getMentorTeachingStats } = createUseCases();
  const mentorStats = await getMentorTeachingStats.execute(session.user.id);

  const stats = [
    { label: "Mentee đang dạy", value: mentorStats.totalMentees.toString(), icon: Users, color: "text-jade-600", bg: "bg-jade-50" },
    { label: "Buổi học tháng này", value: mentorStats.totalSessions.toString(), icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Đã quyên góp", value: `₫${(mentorStats.totalDonations / 1000000).toFixed(1)}M`, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Giờ giảng dạy", value: `${mentorStats.totalHours}h`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-in">
        <p className="text-amber-600 text-sm font-medium tracking-wide uppercase mb-1">
          Người hướng dẫn
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Xin chào, {session.user.name?.split(" ").at(-1)} 👋
        </h1>
        <p className="text-stone-500 mt-1">
          Bạn đang tạo ra sự khác biệt trong cuộc sống của nhiều người học.
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

      {/* Upcoming Sessions placeholder */}
      <div className="animate-in animate-in-delay-2">
        <h2 className="font-display text-xl font-semibold text-stone-800 mb-4">
          Buổi học sắp tới
        </h2>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {[
            { name: "Nguyễn Thị An", topic: "ReactJS Hooks", time: "10:00 - 11:00", date: "Hôm nay", avatar: "NA" },
            { name: "Trần Văn Bình", topic: "System Design", time: "14:00 - 15:30", date: "Hôm nay", avatar: "TB" },
            { name: "Lê Thị Cúc", topic: "Python OOP", time: "09:00 - 10:00", date: "Ngày mai", avatar: "LC" },
          ].map((session, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-b-0"
            >
              <div className="w-10 h-10 rounded-full bg-jade-100 text-jade-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {session.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-800 text-sm">{session.name}</div>
                <div className="text-stone-400 text-xs flex items-center gap-2 mt-0.5">
                  <BookOpen className="w-3 h-3" />
                  {session.topic}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-stone-700 text-sm font-medium">{session.time}</div>
                <div className="text-stone-400 text-xs">{session.date}</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-jade-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div className="animate-in animate-in-delay-3 p-6 rounded-2xl bg-gradient-to-br from-jade-50 to-emerald-50 border border-jade-100">
        <div className="flex items-center gap-3 mb-3">
          <TrendingUp className="w-5 h-5 text-jade-600" />
          <h3 className="font-display text-lg font-semibold text-stone-800">
            Tác động của bạn
          </h3>
        </div>
        <p className="text-stone-600 text-sm mb-4">
          Tổng số tiền học phí từ các buổi dạy của bạn đã được chuyển vào Quỹ
          Thiện Nguyện MBBank:
        </p>
        <div className="font-display text-4xl font-bold text-jade-700">
          {formatVND(mentorStats.totalDonations)}
        </div>
        <p className="text-jade-600 text-sm mt-1">
          Tương đương ~{Math.floor(mentorStats.totalDonations / 20000)} bữa ăn từ thiện 🙏
        </p>
      </div>
    </div>
  );
}
