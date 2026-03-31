import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createUseCases } from "@/lib/container";
import { Trophy, Medal, Star, Heart, Users, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/utils";

export default async function LeaderboardPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[LeaderboardPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");
  const { getLeaderboard } = createUseCases();
  const now = new Date();
  const leaderboard = await getLeaderboard.execute(now.getMonth() + 1, now.getFullYear());
  const monthName = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(now);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">Bảng xếp hạng</p>
        <h1 className="font-display text-3xl font-bold text-stone-900">Thành tích tháng này 🏆</h1>
        <p className="text-stone-500 mt-1 capitalize">{monthName}</p>
      </div>
      <div className="p-5 rounded-2xl bg-gradient-to-r from-jade-600 to-emerald-600 text-white animate-in animate-in-delay-1">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-white/80 fill-white/30 flex-shrink-0" />
          <div>
            <p className="font-semibold text-lg">Cùng nhau đóng góp cho cộng đồng</p>
            <p className="text-jade-100 text-sm mt-0.5">Mỗi buổi học hoàn thành = học phí vào Quỹ Thiện Nguyện MBBank.</p>
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <LeaderSection title="Top Mentor" subtitle="Nhiều buổi dạy nhất" icon={<Star className="w-4 h-4 text-amber-600 fill-amber-400" />} bg="bg-amber-100" entries={leaderboard.topMentors} color="amber" />
        <LeaderSection title="Top Mentee" subtitle="Học chăm chỉ nhất" icon={<Users className="w-4 h-4 text-jade-600" />} bg="bg-jade-100" entries={leaderboard.topMentees} color="jade" />
      </div>
    </div>
  );
}

function LeaderSection({ title, subtitle, icon, bg, entries, color }: any) {
  const rankColors = ["bg-amber-500", "bg-stone-400", "bg-orange-400"];
  return (
    <section className="animate-in animate-in-delay-2">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
        <div>
          <h2 className="font-display text-lg font-semibold text-stone-800">{title}</h2>
          <p className="text-stone-400 text-xs">{subtitle}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-stone-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có dữ liệu tháng này</p>
          </div>
        ) : entries.map((entry: any, i: number) => (
          <div key={entry.userId} className={`flex items-center gap-4 px-5 py-4 border-b border-stone-50 last:border-0 ${i === 0 ? "bg-amber-50/50" : ""}`}>
            <div className="w-8 text-center flex-shrink-0">
              {i === 0 ? <Trophy className="w-5 h-5 text-amber-500 mx-auto" /> :
               i === 1 ? <Medal className="w-5 h-5 text-stone-400 mx-auto" /> :
               i === 2 ? <Medal className="w-5 h-5 text-orange-400 mx-auto" /> :
               <span className="text-stone-400 font-bold text-sm">#{i+1}</span>}
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${color === "amber" ? "bg-gradient-to-br from-amber-300 to-amber-500" : "bg-gradient-to-br from-jade-300 to-jade-500"}`}>
              {entry.name?.charAt(0) ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-800 text-sm truncate">{entry.name ?? "Ẩn danh"}</div>
              <div className="text-stone-400 text-xs">{entry.sessionCount} buổi · {formatVND(entry.totalAmount)}</div>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${i === 0 ? rankColors[0] + " text-white" : "bg-stone-100 text-stone-600"}`}>
              {entry.sessionCount}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
