"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { UserRole, UserRoleLabels } from "@/domain/value-objects/UserRole";
import { LayoutDashboard, Users, BookOpen, Heart, Settings, LogOut, Shield, UserCircle, Star, BarChart3, Trophy, Calendar, User, Wallet, Tag, FileText, CreditCard, AlertTriangle, GraduationCap, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarUser { id: string; name?: string | null; email?: string | null; image?: string | null; role: UserRole; status?: string | null; }

const navByRole: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  [UserRole.ADMIN]: [
    { label: "Tổng quan", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Người dùng", href: "/dashboard/admin/users", icon: Users },
    { label: "Đơn Mentor", href: "/dashboard/admin/applications", icon: FileText },
    { label: "Buổi học", href: "/dashboard/admin/sessions", icon: BookOpen },
    { label: "TK Thiện nguyện", href: "/dashboard/admin/charity-accounts", icon: CreditCard },
    { label: "Lĩnh vực học", href: "/dashboard/admin/fields", icon: Tag },
    { label: "Cấu hình", href: "/dashboard/admin/config", icon: Settings },
    { label: "Báo cáo", href: "/dashboard/admin/reports", icon: AlertTriangle },
    { label: "Thống kê", href: "/dashboard/admin/stats", icon: BarChart3 },
    { label: "Bảng xếp hạng", href: "/dashboard/leaderboard", icon: Trophy },
  ],
  [UserRole.MENTOR]: [
    { label: "Tổng quan", href: "/dashboard/mentor", icon: LayoutDashboard },
    { label: "Buổi học", href: "/dashboard/mentor/sessions", icon: BookOpen },
    { label: "Hồ sơ Mentor", href: "/dashboard/mentor/profile", icon: User },
    { label: "Bảng xếp hạng", href: "/dashboard/leaderboard", icon: Trophy },
  ],
  [UserRole.MENTEE]: [
    { label: "Tổng quan", href: "/dashboard/mentee", icon: LayoutDashboard },
    { label: "Tìm Mentor", href: "/dashboard/mentee/find-mentor", icon: Users },
    { label: "Trở thành Mentor", href: "/dashboard/mentee/apply-mentor", icon: GraduationCap },
    { label: "Buổi học của tôi", href: "/dashboard/mentee/sessions", icon: BookOpen },
    { label: "Bảng xếp hạng", href: "/dashboard/leaderboard", icon: Trophy },
  ],
};

const roleIconMap: Record<UserRole, React.ElementType> = {
  [UserRole.ADMIN]: Shield, [UserRole.MENTOR]: Star, [UserRole.MENTEE]: UserCircle,
};

const roleBadgeColors: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-100 text-red-700",
  [UserRole.MENTOR]: "bg-amber-100 text-amber-700",
  [UserRole.MENTEE]: "bg-jade-100 text-jade-700",
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const navItems = navByRole[user.role] ?? navByRole[UserRole.MENTEE];
  const RoleIcon = roleIconMap[user.role];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-100 min-h-screen">
      <div className="p-6 border-b border-stone-50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-jade-600 flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-stone-900 leading-tight">Học Từ Thiện</div>
            <div className="text-stone-400 text-[10px]">Kết nối Mentor & Mentee</div>
          </div>
        </Link>
      </div>

      <div className="p-4 mx-3 mt-4 rounded-xl bg-stone-50 border border-stone-100">
        <div className="flex items-center gap-3">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-jade-100 flex items-center justify-center text-jade-700 font-semibold text-sm">
              {user.name?.charAt(0) ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-stone-800 text-sm truncate">{user.name ?? "Người dùng"}</div>
            <div className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium mt-0.5", roleBadgeColors[user.role])}>
              <RoleIcon className="w-2.5 h-2.5" />
              {UserRoleLabels[user.role]}
            </div>
          </div>
        </div>
      </div>

      {user.status === "PENDING_ACTIVATION" && (
        <div className="mx-3 mt-3">
          <Link
            href="/activation"
            className="flex items-start gap-3 px-3 py-3 bg-jade-50 border border-jade-200 rounded-xl hover:bg-jade-100 transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-jade-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-jade-700">Kích hoạt tài khoản</div>
              <div className="text-[10px] text-jade-500 mt-0.5 leading-snug">
                Kích hoạt để mở khoá đầy đủ tính năng
              </div>
            </div>
          </Link>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-stone-400 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Menu chính</div>
        {/* Use longest-prefix matching to avoid highlighting parent + child simultaneously */}
        {(() => {
          const matchedHref = navItems
            .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
            .sort((a, b) => b.href.length - a.href.length)[0]?.href;
          return navItems.map((item) => {
            const isActive = item.href === matchedHref;
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive ? "bg-jade-600 text-white shadow-sm" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900")}>
                <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-stone-400")} />
                {item.label}
              </Link>
            );
          });
        })()}
      </nav>

      <div className="px-3 py-4 border-t border-stone-50 space-y-1">
        <Link href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all">
          <Settings className="w-4 h-4 text-stone-400" />Cài đặt
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut className="w-4 h-4 text-stone-400" />Đăng xuất
        </button>
      </div>
    </aside>
  );
}
