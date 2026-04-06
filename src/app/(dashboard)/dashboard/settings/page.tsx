import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/presentation/components/settings/SettingsForm";
import { prisma } from "@/infrastructure/database/prisma/client";

export default async function SettingsPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[SettingsPage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");

  // Fetch extra user stats not included in the JWT session
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      lateCancellationCount: true,
      menteeProfile: { select: { noShowCount: true } },
    },
  });

  const userWithStats = {
    ...session.user,
    lateCancellationCount: dbUser?.lateCancellationCount ?? 0,
    noShowCount: dbUser?.menteeProfile?.noShowCount ?? 0,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          T\u00e0i kho\u1ea3n
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          C\u00e0i \u0111\u1eb7t h\u1ed3 s\u01a1
        </h1>
        <p className="text-stone-500 mt-1">
          C\u1eadp nh\u1eadt th\u00f4ng tin c\u00e1 nh\u00e2n c\u1ee7a b\u1ea1n.
        </p>
      </div>

      <SettingsForm user={userWithStats} />
    </div>
  );
}
