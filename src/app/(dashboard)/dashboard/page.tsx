import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;

  if (role === UserRole.ADMIN) redirect("/dashboard/admin");
  if (role === UserRole.MENTOR) redirect("/dashboard/mentor");
  redirect("/dashboard/mentee");
}
