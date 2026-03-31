import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { MentorApplicationForm } from "@/presentation/components/mentor/MentorApplicationForm";

export default async function ApplyMentorPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[ApplyMentorPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");

  // Only MENTEE can apply to become a Mentor
  if (session.user.role !== UserRole.MENTEE) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Người học
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Trở thành Mentor
        </h1>
        <p className="text-stone-500 mt-1">
          Chia sẻ kiến thức, truyền cảm hứng và đóng góp cho cộng đồng.
        </p>
      </div>
      <MentorApplicationForm />
    </div>
  );
}
