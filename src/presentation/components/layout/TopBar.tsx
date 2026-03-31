"use client";

import { signOut } from "next-auth/react";
import { UserRole, UserRoleLabels } from "@/domain/value-objects/UserRole";
import { Bell, LogOut, Settings, ChevronDown, Heart, Menu, X, LayoutDashboard, Users, BookOpen, Trophy, GraduationCap, FileText, CreditCard, Tag, AlertTriangle, User } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopBarUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
  status?: string | null;
}

const navByRole: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  [UserRole.ADMIN]: [
    { label: "Tổng quan", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Người dùng", href: "/dashboard/admin/users", icon: Users },
    { label: "Đơn Mentor", href: "/dashboard/admin/mentor-applications", icon: FileText },
    { label: "TK Thiện nguyện", href: "/dashboard/admin/charity-accounts", icon: CreditCard },
    { label: "Lĩnh vực học", href: "/dashboard/admin/fields", icon: Tag },
    { label: "Cấu hình", href: "/dashboard/admin/config", icon: Settings },
    { label: "Báo cáo", href: "/dashboard/admin/reports", icon: AlertTriangle },
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

export function TopBar({ user }: { user: TopBarUser }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navItems = navByRole[user.role] ?? navByRole[UserRole.MENTEE];

  // Use longest-prefix matching to avoid highlighting parent + child simultaneously
  const matchedHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {/* ── Full-viewport click-outside overlays ──────────────────────────────
          MUST be rendered OUTSIDE the header element because header uses
          backdrop-blur-sm which creates a new CSS stacking context.
          If fixed overlays are nested inside that context, they become
          relative to the header instead of the viewport, breaking
          click-outside-to-close on mobile. */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setDropdownOpen(false)}
        />
      )}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-stone-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        {/* Left: Mobile hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5 text-stone-500" />
          </button>
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-jade-600 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white fill-white" />
            </div>
            <span className="font-display font-bold text-stone-800 text-sm">Học Từ Thiện</span>
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notification bell */}
          <button className="relative p-2 rounded-xl hover:bg-stone-50 transition-colors">
            <Bell className="w-5 h-5 text-stone-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-jade-500 rounded-full" />
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? ""}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-jade-100 flex items-center justify-center text-jade-700 text-xs font-bold">
                  {user.name?.charAt(0) ?? "U"}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-stone-800 leading-tight">
                  {user.name?.split(" ").at(-1) ?? "Người dùng"}
                </div>
                <div className="text-xs text-stone-400">
                  {UserRoleLabels[user.role]}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-100 rounded-2xl shadow-xl shadow-stone-200/50 z-40 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-stone-50">
                  <div className="font-medium text-stone-800 text-sm">{user.name}</div>
                  <div className="text-stone-400 text-xs truncate">{user.email}</div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-stone-400" />
                    Cài đặt tài khoản
                  </Link>
                  {user.status === "PENDING_ACTIVATION" && (
                    <Link
                      href="/activation"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-jade-600 hover:bg-jade-50 hover:text-jade-700 transition-colors font-medium"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Heart className="w-4 h-4 text-jade-500 fill-jade-200" />
                      Kích hoạt tài khoản
                    </Link>
                  )}
                </div>

                <div className="py-2 border-t border-stone-50">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile sidebar drawer ───────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col lg:hidden">
          {/* Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-jade-600 flex items-center justify-center shadow-sm">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <div className="font-display text-base font-bold text-stone-900 leading-tight">Học Từ Thiện</div>
                <div className="text-stone-400 text-[10px]">Kết nối Mentor &amp; Mentee</div>
              </div>
            </Link>
            <button
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          {/* User info */}
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
                <div className="text-stone-400 text-xs">{UserRoleLabels[user.role]}</div>
              </div>
            </div>
          </div>

          {/* Activation banner for pending users */}
          {user.status === "PENDING_ACTIVATION" && (
            <div className="mx-3 mt-3">
              <Link
                href="/activation"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 bg-jade-50 border border-jade-200 rounded-xl text-sm text-jade-700 font-medium hover:bg-jade-100 transition-colors"
              >
                <Heart className="w-4 h-4 text-jade-500 fill-jade-200 flex-shrink-0" />
                Kích hoạt tài khoản
              </Link>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="text-stone-400 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Menu chính</div>
            {navItems.map((item) => {
              const isActive = item.href === matchedHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive ? "bg-jade-600 text-white shadow-sm" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-stone-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="px-3 py-4 border-t border-stone-50 space-y-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
            >
              <Settings className="w-4 h-4 text-stone-400" />Cài đặt
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="w-4 h-4 text-stone-400" />Đăng xuất
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
