import { MentorPublicProfile } from "@/presentation/components/mentor/MentorPublicProfile";
import { createUseCases } from "@/lib/container";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function MentorPublicProfilePage({ params }: PageProps) {
  const { getMentorPublicProfile } = createUseCases();

  try {
    // params.id là userId của mentor
    const mentor = await getMentorPublicProfile.execute(params.id);

    return (
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-1">Hồ sơ Mentor</h2>
          <p className="text-stone-500">Chi tiết thông tin và chuyên môn của Mentor.</p>
        </div>

        <MentorPublicProfile mentor={mentor} />
      </div>
    );
  } catch {
    notFound();
  }
}
