import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { SessionCard } from "@/presentation/components/session/SessionCard";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

export default async function MentorSessionsPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[MentorSessionsPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) redirect("/dashboard");

  const { getMentorSessions } = createUseCases();

  let sessions: any[] = [];
  let shouldRedirectToLogin = false;
  try {
    sessions = await getMentorSessions.byMentorId(session.user.id);
  } catch (error) {
    console.error("[MentorSessions] Error loading sessions:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Không tìm thấy người dùng")) {
      shouldRedirectToLogin = true;
    }
  }

  if (shouldRedirectToLogin) {
    redirect("/login?error=SessionExpired");
  }

  // BUG-H4 fix: phu00e2n lou1ea1i u0111u00fang:
  // - pending: chu1edd xu00e1c nhu1eadn (PENDING)
  // - upcoming: u0111ang diu1ec5n ra hou1eb7c su1eafp diu1ec5n ra, cu1ea7n action
  //   Bao gu1ed3m CONFIRMED (du00f9 u0111u00e3 qua giu1edd hu1ecdc vu00e0 chu01b0a xong) vu00e0 IN_PROGRESS
  //   u0111u1ec3 mentor lu1ee5c nu00e0o cu0169ng cu00f3 nu00fat "Xu00e1c nhu1eadn hou00e0n thu00e0nh" vu00e0 "Vu1eafng mu1eb7t"
  // - past: tu1ea5t cu1ea3 su1ed1 cu00f2n lu1ea1i (lu1ecbch su1eed)
  const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS"];
  const pending  = sessions.filter((s) => s.status === "PENDING");
  const upcoming = sessions.filter((s) => s.status === "CONFIRMED" || s.status === "IN_PROGRESS");
  const past     = sessions.filter((s) => !ACTIVE_STATUSES.includes(s.status));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
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
