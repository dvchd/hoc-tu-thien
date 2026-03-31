"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  motivation: string;
  experience: string;
  linkedinUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Đang chờ duyệt",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: Loader2,
  },
  APPROVED: {
    label: "Đã duyệt",
    bg: "bg-jade-50",
    text: "text-jade-700",
    border: "border-jade-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Từ chối",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: XCircle,
  },
};

export function MentorApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    motivation: "",
    experience: "",
    linkedinUrl: "",
  });

  useEffect(() => {
    async function fetchApplication() {
      try {
        const res = await fetch("/api/mentor/apply");
        if (res.ok) {
          const data = await res.json();
          setApplication(data);
        }
      } catch (error) {
        console.error("Error fetching application:", error);
      } finally {
        setFetching(false);
      }
    }
    fetchApplication();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motivation.trim() || !formData.experience.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/mentor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Đơn đăng ký đã được gửi thành công!");
        const data = await res.json();
        setApplication(data);
        setShowForm(false);
      } else {
        const error = await res.json();
        toast.error(error.message || error.error || "Có lỗi xảy ra khi gửi đơn.");
      }
    } catch (error) {
      toast.error("Lỗi kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-jade-500 animate-spin" />
      </div>
    );
  }

  if (application) {
    const status = STATUS_CONFIG[application.status];
    const StatusIcon = status.icon;

    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-jade-600" />
          <h2 className="text-lg font-semibold text-stone-800">Trạng thái đơn đăng ký Mentor</h2>
        </div>

        <div className="space-y-4">
          <div className={cn("flex items-center gap-2 p-3 rounded-xl border", status.bg, status.border)}>
            <StatusIcon className={cn("w-4 h-4", status.text, application.status === "PENDING" && "animate-spin")} />
            <span className={cn("text-sm font-medium", status.text)}>{status.label}</span>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl">
            <p className="text-xs text-stone-400 mb-1">Ngày gửi đơn</p>
            <p className="text-stone-700 text-sm font-medium">
              {new Date(application.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {application.reviewNote && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ghi chú từ Admin
              </p>
              <p className="text-amber-700 text-sm">{application.reviewNote}</p>
            </div>
          )}

          {application.status === "REJECTED" && (
            <button
              onClick={() => { setApplication(null); setShowForm(true); }}
              className="w-full py-2.5 bg-jade-600 text-white rounded-xl text-sm font-medium hover:bg-jade-700 transition-colors"
            >
              Gửi đơn mới
            </button>
          )}

          {application.status === "APPROVED" && (
            <button
              onClick={() => router.push("/dashboard/mentor/profile")}
              className="w-full py-2.5 bg-jade-600 text-white rounded-xl text-sm font-medium hover:bg-jade-700 transition-colors flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              Cập nhật hồ sơ Mentor
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-jade-50 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-7 h-7 text-jade-600" />
        </div>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">Trở thành Mentor</h2>
        <p className="text-stone-500 text-sm mb-5 max-w-sm mx-auto">
          Chia sẻ kiến thức của bạn để giúp đỡ cộng đồng và đóng góp cho các quỹ từ thiện.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-2.5 bg-jade-600 text-white rounded-xl text-sm font-medium hover:bg-jade-700 transition-colors"
        >
          Đăng ký ngay
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-jade-600" />
          <h2 className="text-lg font-semibold text-stone-800">Đăng ký trở thành Mentor</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="text-stone-400 hover:text-stone-600 transition-colors text-sm"
        >
          Huỷ
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-stone-700">
            Động lực của bạn <span className="text-red-500">*</span>
          </label>
          <span className={cn(
            "text-xs tabular-nums",
            formData.motivation.length < 50 ? "text-amber-500" : formData.motivation.length > 2000 ? "text-red-500" : "text-stone-400",
          )}>
            {formData.motivation.length}/2000
            {formData.motivation.length < 50 && (
              <span className="ml-1">(tối thiểu 50)</span>
            )}
          </span>
        </div>
        <textarea
          required
          rows={4}
          maxLength={2000}
          className={cn(
            "w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none",
            formData.motivation.length < 50
              ? "border-amber-200 focus:border-amber-400 focus:ring-amber-100"
              : formData.motivation.length > 2000
                ? "border-red-200 focus:border-red-400 focus:ring-red-100"
                : "border-stone-200 focus:border-jade-400 focus:ring-jade-100",
          )}
          placeholder="Tại sao bạn muốn trở thành mentor tại Học Từ Thiện?"
          value={formData.motivation}
          onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-stone-700">
            Kinh nghiệm chuyên môn <span className="text-red-500">*</span>
          </label>
          <span className={cn(
            "text-xs tabular-nums",
            formData.experience.length < 20 ? "text-amber-500" : formData.experience.length > 2000 ? "text-red-500" : "text-stone-400",
          )}>
            {formData.experience.length}/2000
            {formData.experience.length < 20 && (
              <span className="ml-1">(tối thiểu 20)</span>
            )}
          </span>
        </div>
        <textarea
          required
          rows={4}
          maxLength={2000}
          className={cn(
            "w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none",
            formData.experience.length < 20
              ? "border-amber-200 focus:border-amber-400 focus:ring-amber-100"
              : formData.experience.length > 2000
                ? "border-red-200 focus:border-red-400 focus:ring-red-100"
                : "border-stone-200 focus:border-jade-400 focus:ring-jade-100",
          )}
          placeholder="Tóm tắt kinh nghiệm và kỹ năng bạn có thể chia sẻ."
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          LinkedIn URL <span className="text-stone-400 font-normal">(tuỳ chọn)</span>
        </label>
        <input
          type="url"
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
          placeholder="https://linkedin.com/in/yourprofile"
          value={formData.linkedinUrl}
          onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !formData.motivation.trim() || !formData.experience.trim()}
        className="w-full py-3 bg-jade-600 text-white rounded-xl text-sm font-semibold hover:bg-jade-700 transition-colors disabled:bg-stone-200 disabled:text-stone-400 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
        {loading ? "Đang gửi..." : "Gửi đơn đăng ký"}
      </button>
    </form>
  );
}
