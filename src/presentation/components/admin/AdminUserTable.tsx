"use client";

import { UserDTO } from "@/application/dtos/UserDTO";
import { UserRole, UserRoleLabels, UserRoleColors } from "@/domain/value-objects/UserRole";
import { UserStatus, UserStatusLabels, UserStatusColors } from "@/domain/value-objects/UserStatus";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  UserCheck,
  UserX,
  Trash2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminUserTableProps {
  users: UserDTO[];
  total: number;
  currentUserId: string;
}

export function AdminUserTable({ users: initialUsers, total, currentUserId }: AdminUserTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRoleChange(userId: string, newRole: UserRole) {
    if (userId === currentUserId) {
      toast.error("Không thể thay đổi vai trò của chính mình");
      return;
    }
    setLoading(userId);
    setOpenMenu(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
      toast.success(`Đã đổi vai trò thành ${UserRoleLabels[newRole]}`);
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(null);
    }
  }

  async function handleSoftDelete(userId: string) {
    if (userId === currentUserId) {
      toast.error("Không thể xoá chính mình");
      return;
    }
    if (!confirm("Bạn có chắc muốn xoá người dùng này?")) return;
    setLoading(userId);
    setOpenMenu(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Đã xoá người dùng");
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="animate-in animate-in-delay-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-stone-800">
            Quản lý người dùng
          </h2>
          <p className="text-stone-400 text-sm mt-0.5">
            {total.toLocaleString("vi-VN")} người dùng trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full sm:w-60 pl-9 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
            <Filter className="w-4 h-4" />
            Lọc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_140px_120px_120px_44px] gap-4 px-5 py-3 border-b border-stone-50 bg-stone-50/50">
          {[
            { label: "Người dùng", icon: ArrowUpDown },
            { label: "Vai trò" },
            { label: "Trạng thái" },
            { label: "Ngày tham gia" },
            { label: "" },
          ].map((col, i) => (
            <div key={i} className="flex items-center gap-1 text-xs font-semibold text-stone-400 uppercase tracking-wide">
              {col.label}
              {col.icon && <col.icon className="w-3 h-3" />}
            </div>
          ))}
        </div>

        {/* Table body */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">
            Không tìm thấy người dùng
          </div>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              className={cn(
                "grid grid-cols-[1fr_140px_120px_120px_44px] gap-4 px-5 py-4 items-center border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 transition-colors",
                loading === user.id && "opacity-50 pointer-events-none"
              )}
            >
              {/* User info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-jade-300 to-emerald-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() ?? user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-stone-800 text-sm truncate">
                    {user.name ?? "(Chưa có tên)"}
                  </div>
                  <div className="text-stone-400 text-xs truncate">{user.email}</div>
                </div>
              </div>

              {/* Role */}
              <div>
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium",
                  UserRoleColors[user.role]
                )}>
                  {user.role === UserRole.ADMIN && <Shield className="w-2.5 h-2.5" />}
                  {UserRoleLabels[user.role]}
                </span>
              </div>

              {/* Status */}
              <div>
                <span className={cn(
                  "inline-flex items-center text-xs px-2 py-1 rounded-lg font-medium",
                  UserStatusColors[user.status]
                )}>
                  {UserStatusLabels[user.status]}
                </span>
              </div>

              {/* Joined */}
              <div className="text-stone-400 text-xs">
                {formatDistanceToNow(new Date(user.createdAt), {
                  addSuffix: true,
                  locale: vi,
                })}
              </div>

              {/* Actions */}
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                  disabled={user.id === currentUserId}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {openMenu === user.id && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setOpenMenu(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-100 rounded-xl shadow-lg shadow-stone-200/50 z-40 overflow-hidden py-1">
                      {user.role !== UserRole.MENTOR && user.role !== UserRole.ADMIN && (
                        <button
                          onClick={() => handleRoleChange(user.id, UserRole.MENTOR)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                          Thăng Mentor
                        </button>
                      )}
                      {user.role === UserRole.MENTOR && (
                        <button
                          onClick={() => handleRoleChange(user.id, UserRole.MENTEE)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                          Hạ xuống Mentee
                        </button>
                      )}
                      <div className="border-t border-stone-50 mt-1 pt-1">
                        <button
                          onClick={() => handleSoftDelete(user.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xoá tài khoản
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
