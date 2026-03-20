"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserRole, UserRoleLabels } from "@/domain/value-objects/UserRole";
import { UserStatus, UserStatusLabels } from "@/domain/value-objects/UserStatus";
import { Save, User, Mail, Phone, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
  status: UserStatus;
  bio?: string | null;
  phone?: string | null;
}

export function SettingsForm({ user }: { user: SettingsUser }) {
  const [form, setForm] = useState({
    name: user.name ?? "",
    bio: user.bio ?? "",
    phone: user.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setDirty(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Đã lưu hồ sơ thành công!");
      setDirty(false);
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-in animate-in-delay-1">
      {/* Avatar + role info */}
      <div className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm">
        <div className="flex items-center gap-5">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ?? ""}
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-jade-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-display font-bold">
              {user.name?.charAt(0) ?? "U"}
            </div>
          )}
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-800">
              {user.name ?? "(Chưa có tên)"}
            </h2>
            <p className="text-stone-400 text-sm mb-2">{user.email}</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium",
                  {
                    "bg-red-100 text-red-700": user.role === UserRole.ADMIN,
                    "bg-amber-100 text-amber-700": user.role === UserRole.MENTOR,
                    "bg-jade-100 text-jade-700": user.role === UserRole.MENTEE,
                  }
                )}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                {UserRoleLabels[user.role]}
              </span>
              <span className="text-xs text-stone-400">
                {UserStatusLabels[user.status]}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-4 flex items-center gap-1">
          <Mail className="w-3 h-3" />
          Ảnh đại diện được lấy từ tài khoản Google của bạn
        </p>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm space-y-5">
        <h3 className="font-display text-lg font-semibold text-stone-800 pb-2 border-b border-stone-50">
          Thông tin cá nhân
        </h3>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-stone-400" />
            Họ và tên
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
          />
        </div>

        {/* Email (readonly) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-stone-400" />
            Email
          </label>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="w-full px-4 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-sm text-stone-400 cursor-not-allowed"
          />
          <p className="text-xs text-stone-400">
            Email được quản lý bởi Google OAuth và không thể thay đổi.
          </p>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-stone-400" />
            Số điện thoại
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="0912 345 678"
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
          />
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            Giới thiệu bản thân
          </label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            placeholder="Chia sẻ đôi điều về bạn, kinh nghiệm và mục tiêu học tập..."
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all resize-none"
          />
          <p className="text-xs text-stone-400 text-right">
            {form.bio.length}/500 ký tự
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !dirty}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
            dirty && !saving
              ? "bg-jade-600 text-white hover:bg-jade-700 hover:shadow-lg hover:shadow-jade-200 hover:-translate-y-0.5"
              : "bg-stone-100 text-stone-400 cursor-not-allowed"
          )}
        >
          <Save className="w-4 h-4" />
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>

      {/* Account info (read-only) */}
      <div className="p-6 bg-white rounded-2xl border border-stone-100 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-stone-800 pb-2 border-b border-stone-50 mb-4">
          Thông tin tài khoản
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-stone-50">
            <span className="text-stone-500">Phương thức đăng nhập</span>
            <span className="font-medium text-stone-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google OAuth
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-stone-50">
            <span className="text-stone-500">Vai trò</span>
            <span className="font-medium text-stone-700">{UserRoleLabels[user.role]}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-stone-500">Trạng thái</span>
            <span className="font-medium text-stone-700">{UserStatusLabels[user.status]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
