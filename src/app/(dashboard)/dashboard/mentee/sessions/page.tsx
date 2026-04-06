import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createUseCases } from "@/lib/container";
import { SessionCard } from "@/presentation/components/session/SessionCard";
import { BookOpen, Calendar } from "lucide-react";

export default async function MenteeSessionsPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[MenteeSessionsPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");
  const { getMentorSessions } = createUseCases();

  let sessions: any[] = [];
  let shouldRedirectToLogin = false;
  try {
    sessions = await getMentorSessions.byMenteeId(session.user.id);
  } catch (error) {
    console.error("[MenteeSessions] Error loading sessions:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Không tìm thấy người dùng")) {
      shouldRedirectToLogin = true;
    }
  }

  if (shouldRedirectToLogin) {
    redirect("/login?error=SessionExpired");
  }
  // BUG-07 fix:
  // - "upcoming" = sessions still needing action or scheduled in future (PENDING, CONFIRMED, IN_PROGRESS)
  //   Include IN_PROGRESS so mentor/mentee can still act on them.
  //   Also include CONFIRMED that have already passed the scheduled time
  //   (they need confirm-completion or no-show action).
  // - "past" = everything else (COMPLETED, PAYMENT_PENDING, CANCELLED, NO_SHOW)
  const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS"];
  const upcoming = sessions.filter((s) => ACTIVE_STATUSES.includes(s.status));
  const past = sessions.filter((s) => !ACTIVE_STATUSES.includes(s.status));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">Người học</p>
        <h1 className="font-display text-3xl font-bold text-stone-900">Buổi học của tôi</h1>
      </div>
      <section className="animate-in animate-in-delay-1">
        <h2 className="font-display text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-jade-600" />Sắp tới ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-2xl border border-stone-100 text-stone-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Không có buổi học sắp tới</p>
          </div>
        ) : <div className="space-y-3">{upcoming.map((s) => <SessionCard key={s.id} session={s} viewAs="mentee" currentUserId={session.user.id} />)}</div>}
      </section>
      <section className="animate-in animate-in-delay-2">
        <h2 className="font-display text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-stone-400" />Lịch sử ({past.length})
        </h2>
        {past.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-2xl border border-stone-100 text-stone-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Chưa có buổi học nào</p>
          </div>
        ) : <div className="space-y-3">{past.map((s) => <SessionCard key={s.id} session={s} viewAs="mentee" currentUserId={session.user.id} />)}</div>}
      </section>
    </div>
  );
}
