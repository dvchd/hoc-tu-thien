import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createUseCases } from "@/lib/container";
import {
  BookOpen,
  Heart,
  Search,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default async function MenteeDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Load available mentors (simplified - in real app, filter by MENTOR role)
  const { listUsers } = createUseCases();
  const { users: mentors } = await listUsers.execute({
    role: "MENTOR" as any,
    pageSize: 6,
  });

  const stats = [
    { label: "Buổi đã học", value: "24", icon: BookOpen, color: "text-jade-600", bg: "bg-jade-50" },
    { label: "Giờ học", value: "48h", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Đã góp quỹ", value: "₫4.8M", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Đánh giá TB", value: "4.9★", icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
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
    ? mentors.map(m => ({ id: m.id, name: m.name || "Mentor", image: m.image, bio: m.bio || "", expertise: "Mentor" }))
    : mockMentors;

  return (
    <div className="space-y-8">
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
              ₫4,800,000 học phí của bạn đã được chuyển vào Quỹ Thiện Nguyện MBBank —
              tương đương 240 bữa ăn cho trẻ em vùng cao 🌱
            </p>
          </div>
        </div>
      </div>

      {/* Find Mentor */}
      <div className="animate-in animate-in-delay-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-stone-800">
            Tìm Mentor phù hợp
          </h2>
          <button className="flex items-center gap-1.5 text-sm text-jade-600 hover:text-jade-700 font-medium">
            Xem tất cả
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            placeholder="Tìm kiếm theo chuyên môn, tên mentor..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
          />
        </div>

        {/* Mentor cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayMentors.map((mentor, i) => (
            <div
              key={mentor.id}
              className="p-5 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg hover:border-jade-200 transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-jade-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {mentor.name.split(" ").slice(-2).map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-stone-800 text-sm truncate">
                    {mentor.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600 text-xs">{mentor.expertise}</span>
                  </div>
                </div>
              </div>

              <p className="text-stone-500 text-xs leading-relaxed line-clamp-2 mb-4">
                {mentor.bio}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="text-xs text-stone-400 ml-1">4.9</span>
                </div>
                <button className="px-3 py-1.5 bg-jade-600 text-white text-xs font-medium rounded-lg hover:bg-jade-700 transition-colors opacity-0 group-hover:opacity-100">
                  Kết nối
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
