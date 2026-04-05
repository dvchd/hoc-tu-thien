"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  motivation: string;
  experience: string;
  contactInfo: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-jade-100 text-jade-700",
  REJECTED: "bg-red-100 text-red-700",
};

interface ReviewModalProps {
  app: MentorApplication;
  action: "APPROVE" | "REJECT";
  onConfirm: (note: string) => void;
  onClose: () => void;
  loading: boolean;
}

function ReviewModal({ app, action, onConfirm, onClose, loading }: ReviewModalProps) {
  const [note, setNote] = useState("");
  const isReject = action === "REJECT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className={cn(
          "px-6 py-4 flex items-center justify-between",
          isReject ? "bg-red-50 border-b border-red-100" : "bg-jade-50 border-b border-jade-100"
        )}>
          <div className="flex items-center gap-2">
            {isReject
              ? <XCircle className="w-5 h-5 text-red-500" />
              : <CheckCircle2 className="w-5 h-5 text-jade-600" />
            }
            <h3 className="font-display font-semibold text-stone-800">
              {isReject ? "Từ chối đơn đăng ký" : "Duyệt đơn đăng ký"}
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 bg-stone-50 rounded-xl text-sm">
            <p className="text-stone-500 text-xs mb-1">Ứng viên</p>
            <p className="font-medium text-stone-800">{app.user.name ?? "(Chưa có tên)"}</p>
            <p className="text-stone-400 text-xs">{app.user.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">
              {isReject ? "Lý do từ chối" : "Ghi chú phê duyệt"}
              {isReject && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={isReject ? "Nhập lý do từ chối..." : "Ghi chú thêm (tuỳ chọn)..."}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading || (isReject && !note.trim())}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isReject ? "bg-red-500 hover:bg-red-600" : "bg-jade-600 hover:bg-jade-700"
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isReject ? "Từ chối" : "Phê duyệt"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MentorApplicationsTable() {
  const [applications, setApplications] = useState<MentorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{ app: MentorApplication; action: "APPROVE" | "REJECT" } | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/admin/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications ?? data);
      }
    } catch {
      toast.error("Lỗi khi tải danh sách đơn đăng ký");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleConfirm = async (note: string) => {
    if (!modal) return;
    const { app, action } = modal;

    if (action === "REJECT" && !note.trim()) {
      toast.error("Phải nhập lý do từ chối");
      return;
    }

    setProcessingId(app.id);
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "APPROVE" ? "approve" : "reject",
          reviewNote: note || undefined,
        }),
      });

      if (res.ok) {
        toast.success(action === "APPROVE" ? "Đã duyệt đơn thành công" : "Đã từ chối đơn");
        setModal(null);
        fetchApplications();
      } else {
        const error = await res.json();
        toast.error(error.error || "Thao tác thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-jade-500 animate-spin mr-2" />
        <span className="text-stone-400 text-sm">Đang tải...</span>
      </div>
    );
  }

  return (
    <>
      {modal && (
        <ReviewModal
          app={modal.app}
          action={modal.action}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
          loading={processingId === modal.app.id}
        />
      )}

      <div className="space-y-3">
        {applications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-stone-100 text-stone-400 text-sm">
            Không có đơn đăng ký nào.
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Summary row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-jade-300 to-emerald-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(app.user.name ?? app.user.email ?? "?").charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-800 text-sm">
                      {app.user.name ?? "(Chưa có tên)"}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      STATUS_COLORS[app.status]
                    )}>
                      {STATUS_LABELS[app.status]}
                    </span>
                  </div>
                  <p className="text-stone-400 text-xs truncate mt-0.5">{app.user.email}</p>
                </div>

                <div className="text-stone-400 text-xs hidden sm:block flex-shrink-0">
                  {new Date(app.createdAt).toLocaleDateString("vi-VN")}
                </div>

                {/* Actions */}
                {app.status === "PENDING" && (
                  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={!!processingId}
                      onClick={() => setModal({ app, action: "APPROVE" })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-jade-50 text-jade-700 hover:bg-jade-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Duyệt
                    </button>
                    <button
                      disabled={!!processingId}
                      onClick={() => setModal({ app, action: "REJECT" })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Từ chối
                    </button>
                  </div>
                )}

                <div className="text-stone-400 flex-shrink-0">
                  {expanded === app.id
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </div>

              {/* Expanded details */}
              {expanded === app.id && (
                <div className="px-5 pb-5 border-t border-stone-50 pt-4 bg-stone-50/50 space-y-3">
                  <div>
                    <p className="text-xs text-stone-400 font-medium mb-1">Động lực</p>
                    <p className="text-sm text-stone-700 bg-white rounded-xl p-3 border border-stone-100">
                      {app.motivation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 font-medium mb-1">Kinh nghiệm</p>
                    <p className="text-sm text-stone-700 bg-white rounded-xl p-3 border border-stone-100">
                      {app.experience}
                    </p>
                  </div>
                  {app.contactInfo && (() => {
                    try {
                      const contact = JSON.parse(app.contactInfo);
                      return (
                        <div className="flex flex-wrap gap-2">
                          {contact.facebook && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">
                              <ExternalLink className="w-3 h-3" />
                              Facebook
                            </span>
                          )}
                          {contact.zalo && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">
                              <ExternalLink className="w-3 h-3" />
                              Zalo: {contact.zalo}
                            </span>
                          )}
                        </div>
                      );
                    } catch {
                    return null;
                  }
                  })()}  
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
