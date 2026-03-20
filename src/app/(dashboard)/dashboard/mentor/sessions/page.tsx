import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { SessionCard } from "@/presentation/components/session/SessionCard";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

export default async function MentorSessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const { getMentorSessions } = createUseCases();
  const sessions = await getMentorSessions.byMentorId(session.user.id);

  const pending = sessions.filter((s) => s.status === "PENDING");
  const upcoming = sessions.filter((s) => s.status === "CONFIRMED" && new Date(s.scheduledAt) > new Date());
  const past = sessions.filter((s) => ["COMPLETED", "CANCELLED", "PAYMENT_PENDING"].includes(s.status));

  return (
    <div className="max-w-3xl space-y-8">
      <div className="animate-in">
        <p className="text-amber-600 text-sm font-medium tracking-wide uppercase mb-1">Mentor</p>
        <h1 className="font-display text-3xl font-bold text-stone-900">Quản lý buổi học</h1>
        <p className="text-stone-500 mt-1">Xác nhận lịch, quản lý Mentee và kết thúc buổi học.</p>
      </div>

      {/* Pending confirmation */}
      {pending.length > 0 && (
        <section className="animate-in animate-in-delay-1">
          <h2 className="font-display text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Chờ xác nhận ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((s) => (
              <SessionCard key={s.id} session={s} viewAs="mentor" currentUserId={session.user.id} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section className="animate-in animate-in-delay-2">
        <h2 className="font-display text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />Sắp diễn ra ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-2xl border border-stone-100 text-stone-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Không có buổi học sắp tới</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} viewAs="mentor" currentUserId={session.user.id} />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="animate-in animate-in-delay-3">
        <h2 className="font-display text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-stone-400" />Lịch sử ({past.length})
        </h2>
        {past.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-2xl border border-stone-100 text-stone-400">
            <p className="text-sm">Chưa có buổi học nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {past.map((s) => (
              <SessionCard key={s.id} session={s} viewAs="mentor" currentUserId={session.user.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
