import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { prisma } from "@/infrastructure/database/prisma/client";
import {
  Users,
  BookOpen,
  GraduationCap,
  CreditCard,
  TrendingUp,
  Calendar,
} from "lucide-react";

export default async function AdminStatsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const { uow } = createUseCases();

  const [
    totalUsers,
    activeUsers,
    totalMentors,
    totalMentees,
    totalSessions,
    completedSessions,
    totalCharityAccounts,
    activeCharityAccounts,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false, status: "ACTIVE" } }),
    prisma.user.count({ where: { isDeleted: false, role: "MENTOR" } }),
    prisma.user.count({ where: { isDeleted: false, role: "MENTEE" } }),
    prisma.learningSession.count(),
    prisma.learningSession.count({ where: { status: "COMPLETED" } }),
    prisma.charityAccount.count({ where: { isDeleted: false } }),
    prisma.charityAccount.count({ where: { isDeleted: false, isActive: true } }),
  ]);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const sessionsThisMonth = await prisma.learningSession.count({
    where: {
      createdAt: { gte: thisMonth },
    },
  });

  const pendingApplications = await prisma.mentorApplication.count({
    where: { status: "PENDING" },
  });

  const stats = [
    {
      label: "Tổng người dùng",
      value: totalUsers.toString(),
      icon: Users,
      color: "text-jade-600",
      bg: "bg-jade-50",
    },
    {
      label: "Người dùng hoạt động",
      value: activeUsers.toString(),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Tổng Mentor",
      value: totalMentors.toString(),
      icon: GraduationCap,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Tổng Mentee",
      value: totalMentees.toString(),
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Tổng buổi học",
      value: totalSessions.toString(),
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Buổi hoàn thành",
      value: completedSessions.toString(),
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Buổi tháng này",
      value: sessionsThisMonth.toString(),
      icon: Calendar,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Đơn chờ duyệt",
      value: pendingApplications.toString(),
      icon: CreditCard,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Tài khoản thiện nguyện",
      value: `${activeCharityAccounts}/${totalCharityAccounts}`,
      icon: CreditCard,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Quản trị
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Thống kê hệ thống
        </h1>
        <p className="text-stone-500 mt-1">
          Tổng quan các số liệu và hoạt động của nền tảng.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in animate-in-delay-1">
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

      <div className="animate-in animate-in-delay-2 p-6 rounded-2xl bg-gradient-to-br from-jade-50 to-emerald-50 border border-jade-100">
        <h3 className="font-display text-lg font-semibold text-stone-800 mb-4">
          Tổng quan hoạt động
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-xl border border-jade-100">
            <div className="text-2xl font-bold text-jade-700">
              {totalMentors > 0 ? Math.round((completedSessions / totalMentors) * 10) / 10 : 0}
            </div>
            <div className="text-xs text-stone-500 mt-1">Trung bình buổi/Mentor</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border border-jade-100">
            <div className="text-2xl font-bold text-jade-700">
              {totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%
            </div>
            <div className="text-xs text-stone-500 mt-1">Tỷ lệ hoàn thành</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border border-jade-100">
            <div className="text-2xl font-bold text-jade-700">
              {activeUsers > 0 ? Math.round((totalMentors / activeUsers) * 100) : 0}%
            </div>
            <div className="text-xs text-stone-500 mt-1">Tỷ lệ Mentor</div>
          </div>
          <div className="text-center p-4 bg-white rounded-xl border border-jade-100">
            <div className="text-2xl font-bold text-jade-700">
              {pendingApplications}
            </div>
            <div className="text-xs text-stone-500 mt-1">Đơn đang chờ</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
