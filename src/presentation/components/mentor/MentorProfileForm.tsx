"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Save, User, DollarSign, Star, Link2, Wallet, CheckCircle2, Info, Loader2 } from "lucide-react";

interface TeachingField { id: string; name: string; icon: string | null; description: string | null; }

interface Props {
  userId: string;
  userName: string | null | undefined;
  userImage: string | null | undefined;
  profile: any;
  allFields: TeachingField[];
  selectedFieldIds: string[];
}

export function MentorProfileForm({ userId, userName, userImage, profile, allFields, selectedFieldIds }: Props) {
  const [form, setForm] = useState({
    headline: profile?.headline ?? "",
    expertise: profile?.expertise ?? "",
    experience: profile?.experience?.toString() ?? "",
    hourlyRate: profile?.hourlyRate?.toString() ?? "0",
    isAvailable: profile?.isAvailable ?? true,
    tnAccountNo: profile?.tnAccountNo ?? "",
    tnAccountName: profile?.tnAccountName ?? "",
    tnCampaignKeyword: profile?.tnCampaignKeyword ?? "",
  });
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(selectedFieldIds));
  const [saving, setSaving] = useState(false);

  function toggleField(id: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/mentor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          experience: parseInt(form.experience) || 0,
          hourlyRate: parseInt(form.hourlyRate) || 0,
          fieldIds: Array.from(selectedFields),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi server");
      toast.success("Đã lưu hồ sơ Mentor!");
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in animate-in-delay-1">
      {/* Basic Info */}
      <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h2 className="font-display text-lg font-semibold text-stone-800 pb-3 border-b border-stone-50 mb-5">Thông tin cơ bản</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Tiêu đề nghề nghiệp</label>
            <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="VD: Senior Engineer tại Google · 8 năm kinh nghiệm" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Kinh nghiệm chi tiết</label>
            <textarea value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} rows={3} placeholder="Mô tả kinh nghiệm, dự án đã làm, thành tựu..." className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Số năm kinh nghiệm</label>
              <input type="number" min="0" max="50" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Học phí mỗi buổi (VND)</label>
              <input type="number" min="0" step="10000" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="0 = miễn phí" className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50">
            <input id="isAvailable" type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="w-4 h-4 rounded accent-jade-600" />
            <label htmlFor="isAvailable" className="text-sm font-medium text-stone-700 cursor-pointer">Đang nhận Mentee mới</label>
          </div>
        </div>
      </section>

      {/* TN App Account */}
      <section className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-amber-50 mb-5">
          <Wallet className="w-4 h-4 text-amber-600" />
          <h2 className="font-display text-lg font-semibold text-stone-800">Tài khoản Thiện Nguyện App</h2>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-5 flex gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Học phí của Mentee sẽ được chuyển vào tài khoản TN App này. Nhập số tài khoản 4 số từ Thiện Nguyện App (MBBank).</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Số tài khoản TN App (4 số)</label>
            <input value={form.tnAccountNo} onChange={(e) => setForm({ ...form, tnAccountNo: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="VD: 2000" maxLength={4} className={`${inputCls} font-mono text-lg tracking-widest`} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Tên tài khoản TN App</label>
            <input value={form.tnAccountName} onChange={(e) => setForm({ ...form, tnAccountName: e.target.value.toUpperCase() })} placeholder="VD: NGUYEN VAN A" className={`${inputCls} uppercase`} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Keyword chiến dịch (tuỳ chọn)</label>
            <input value={form.tnCampaignKeyword} onChange={(e) => setForm({ ...form, tnCampaignKeyword: e.target.value })} placeholder="Nhập nếu bạn có chiến dịch riêng trên TN App" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Teaching Fields */}
      <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h2 className="font-display text-lg font-semibold text-stone-800 pb-3 border-b border-stone-50 mb-5">Lĩnh vực giảng dạy</h2>
        {allFields.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8">Chưa có lĩnh vực. Admin cần thêm trước.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allFields.map((field) => {
              const selected = selectedFields.has(field.id);
              return (
                <button key={field.id} type="button" onClick={() => toggleField(field.id)}
                  className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-left",
                    selected ? "bg-jade-600 border-jade-600 text-white" : "bg-stone-50 border-stone-200 text-stone-600 hover:border-jade-300 hover:bg-jade-50")}>
                  {selected && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{field.icon ?? "📚"}</span>
                  <span className="truncate">{field.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-stone-400 mt-3">Đã chọn {selectedFields.size} lĩnh vực</p>
      </section>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-jade-600 text-white rounded-xl font-semibold hover:bg-jade-700 transition-all disabled:bg-stone-200 disabled:text-stone-400">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Đang lưu..." : "Lưu hồ sơ"}
      </button>
    </form>
  );
}
