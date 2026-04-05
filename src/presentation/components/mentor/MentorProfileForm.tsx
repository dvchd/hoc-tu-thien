"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Save, Wallet, CheckCircle2, Info, Loader2, Eye } from "lucide-react";
import Link from "next/link";

interface TeachingField { id: string; name: string; icon: string | null; description: string | null; }

interface CharityAccount {
  id: string;
  name: string;
  accountNo: string;
  bankName: string | null;
  campaignKeyword: string | null;
  verificationStatus: string;
}

interface Props {
  userId: string;
  userName: string | null | undefined;
  userImage: string | null | undefined;
  profile: any;
  allFields: TeachingField[];
  selectedFieldIds: string[];
  charityAccounts: CharityAccount[];
}

export function MentorProfileForm({ userId, userName, userImage, profile, allFields, selectedFieldIds, charityAccounts }: Props) {
  const [form, setForm] = useState({
    headline: profile?.headline ?? "",
    expertise: profile?.expertise ?? "",
    experience: profile?.experience?.toString() ?? "",
    hourlyRate: profile?.hourlyRate?.toString() ?? "0",
    isAvailable: profile?.isAvailable ?? true,
    charityAccountId: profile?.charityAccountId ?? "",
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
          headline: form.headline,
          expertise: form.expertise,
          experience: parseInt(form.experience) || 0,
          hourlyRate: parseInt(form.hourlyRate) || 0,
          isAvailable: form.isAvailable,
          charityAccountId: form.charityAccountId || null,
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

      {/* Charity Account Selection */}
      <section className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-amber-50 mb-5">
          <Wallet className="w-4 h-4 text-amber-600" />
          <h2 className="font-display text-lg font-semibold text-stone-800">Tài khoản Thiện Nguyện App</h2>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-5 flex gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Học phí của Mentee sẽ được chuyển vào tài khoản TN App được Admin cấu hình sẵn.
            Chọn một tài khoản từ danh sách bên dưới.
          </p>
        </div>
        {charityAccounts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-stone-400 text-sm">Chưa có tài khoản thiện nguyện nào được cấu hình.</p>
            <p className="text-stone-400 text-xs mt-1">Vui lòng liên hệ Admin để thêm tài khoản.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {charityAccounts.map((account) => {
              const isSelected = form.charityAccountId === account.id;
              const isVerified = account.verificationStatus === "VERIFIED";
              const isPending = account.verificationStatus === "PENDING";
              const isDefault = (account as any).isDefault === true;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setForm({ ...form, charityAccountId: account.id })}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                    isSelected
                      ? "bg-jade-50 border-jade-400 ring-2 ring-jade-100"
                      : "bg-stone-50 border-stone-200 hover:border-jade-300 hover:bg-jade-50/50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected ? "border-jade-600 bg-jade-600" : "border-stone-300"
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-stone-800">{account.name}</span>
                      {isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> Đã xác minh
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700">
                          Chờ xác minh
                        </span>
                      )}
                      {isDefault && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      STK: <span className="font-mono">{account.accountNo}</span>
                      {account.bankName && <span> · {account.bankName}</span>}
                      {account.campaignKeyword && <span> · Từ khóa: {account.campaignKeyword}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-jade-600 text-white rounded-xl font-semibold hover:bg-jade-700 transition-all disabled:bg-stone-200 disabled:text-stone-400">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Đang lưu..." : "Lưu hồ sơ"}
        </button>
        <Link
          href={`/dashboard/mentee/mentor/${userId}`}
          target="_blank"
          className="flex items-center gap-2 px-6 py-3 bg-white text-stone-700 rounded-xl font-semibold border border-stone-200 hover:border-jade-300 hover:bg-jade-50 transition-all"
        >
          <Eye className="w-4 h-4" />
          Xem hồ sơ công khai
        </Link>
      </div>
    </form>
  );
}
