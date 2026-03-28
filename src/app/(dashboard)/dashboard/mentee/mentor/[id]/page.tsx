import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { MentorPublicProfile } from "@/presentation/components/mentor/MentorPublicProfile";
import { createUseCases } from "@/lib/container";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MentorPublicProfilePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { getMentorPublicProfile } = createUseCases();

  try {
    const mentor = await getMentorPublicProfile.execute(id);

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="animate-in">
          <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
            Hồ sơ Mentor
          </p>
          <p className="text-stone-500">
            Chi tiết thông tin và chuyên môn của Mentor.
          </p>
        </div>
        <MentorPublicProfile mentor={mentor} />
      </div>
    );
  } catch {
    notFound();
  }
}
