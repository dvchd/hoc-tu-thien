import { UserCount } from "@/domain/repositories/IUserRepository";
import { Users, Shield, Star, UserCircle, AlertTriangle, Activity } from "lucide-react";

interface AdminStatsCardsProps {
  stats: UserCount;
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const cards = [
    {
      label: "Tổng người dùng",
      value: stats.total,
      icon: Users,
      color: "text-stone-600",
      bg: "bg-stone-50",
      border: "border-stone-200",
      change: "+12 tuần này",
    },
    {
      label: "Quản trị viên",
      value: stats.byRole.ADMIN,
      icon: Shield,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
      change: "Quản lý hệ thống",
    },
    {
      label: "Mentor",
      value: stats.byRole.MENTOR,
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      change: "+3 tuần này",
    },
    {
      label: "Mentee",
      value: stats.byRole.MENTEE,
      icon: UserCircle,
      color: "text-jade-600",
      bg: "bg-jade-50",
      border: "border-jade-100",
      change: "+24 tuần này",
    },
    {
      label: "Đang hoạt động",
      value: stats.byStatus.ACTIVE,
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
      change: `${Math.round((stats.byStatus.ACTIVE / Math.max(stats.total, 1)) * 100)}% tổng số`,
    },
    {
      label: "Bị đình chỉ",
      value: stats.byStatus.SUSPENDED,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-100",
      change: "Cần chú ý",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-in animate-in-delay-1">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`p-5 bg-white rounded-2xl border ${card.border} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
        >
          <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <div className="font-display text-2xl font-bold text-stone-900 mb-0.5">
            {card.value.toLocaleString("vi-VN")}
          </div>
          <div className="text-stone-700 text-xs font-medium mb-1">{card.label}</div>
          <div className="text-stone-400 text-xs">{card.change}</div>
        </div>
      ))}
    </div>
  );
}
