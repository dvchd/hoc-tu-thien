"use client";

import { signOut } from "next-auth/react";
import { UserRole, UserRoleLabels } from "@/domain/value-objects/UserRole";
import { Bell, LogOut, Settings, ChevronDown, Heart, Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface TopBarUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

export function TopBar({ user }: { user: TopBarUser }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-stone-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Left: Mobile logo + breadcrumb */}
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors">
          <Menu className="w-5 h-5 text-stone-500" />
        </button>
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-jade-600 flex items-center justify-center">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
          <span className="font-display font-bold text-stone-800 text-sm">Học Từ Thiện</span>
        </div>
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
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
