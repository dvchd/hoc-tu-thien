"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  reason: string;
  description: string;
  createdAt: string;
  reviewNote: string | null;
  reporter: { id: string; name: string | null; email: string };
  reportedUser: { id: string; name: string | null; email: string };
  session?: { id: string; title?: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý",
  REVIEWED: "Đang xem xét",
  RESOLVED: "Đã xử lý",
  DISMISSED: "Bỏ qua",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  REVIEWED: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-jade-100 text-jade-700",
  DISMISSED: "bg-stone-100 text-stone-500",
};

const REASON_LABELS: Record<string, string> = {
  INAPPROPRIATE: "Nội dung không phù hợp",
  MISCONDUCT: "Hành vi không đúng mực",
  NO_SHOW_DISPUTE: "Tranh chấp vắng mặt",
  OTHER: "Lý do khác",
};

type ResolveStatus = "REVIEWED" | "RESOLVED" | "DISMISSED";

const ACTION_CONFIG: Record<ResolveStatus, { label: string; btnClass: string }> = {
  REVIEWED: { label: "Đánh dấu đang xem xét", btnClass: "bg-blue-600 hover:bg-blue-700" },
  RESOLVED: { label: "Đánh dấu đã xử lý", btnClass: "bg-jade-600 hover:bg-jade-700" },
  DISMISSED: { label: "Bỏ qua báo cáo", btnClass: "bg-stone-500 hover:bg-stone-600" },
};

interface ResolveModalProps {
  reportId: string;
  targetStatus: ResolveStatus;
  onConfirm: (note: string) => void;
  onClose: () => void;
  loading: boolean;
}

function ResolveModal({ targetStatus, onConfirm, onClose, loading }: ResolveModalProps) {
  const [note, setNote] = useState("");
  const cfg = ACTION_CONFIG[targetStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-stone-800">{cfg.label}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">
              Ghi chú xử lý <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Nhập ghi chú xử lý..."
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all resize-none"
            />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading || !note.trim()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              cfg.btnClass
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{ reportId: string; targetStatus: ResolveStatus } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? data);
        setTotal(data.total ?? (data.reports ?? data).length);
      }
    } catch {
      toast.error("Lỗi khi tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleConfirm = async (note: string) => {
    if (!modal) return;
    if (!note.trim()) {
      toast.error("Vui lòng nhập ghi chú xử lý");
      return;
    }
    setProcessingId(modal.reportId);
    try {
      const res = await fetch(`/api/admin/reports/${modal.reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modal.targetStatus, reviewNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi hệ thống");
      toast.success("Đã cập nhật báo cáo thành công");
      setModal(null);
      fetchReports();
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {modal && (
        <ResolveModal
          reportId={modal.reportId}
          targetStatus={modal.targetStatus}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
          loading={processingId === modal.reportId}
        />
      )}

      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-stone-500">Lọc:</span>
          {(["", "PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
                filterStatus === s
                  ? "bg-jade-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              {s === "" ? "Tất cả" : STATUS_LABELS[s]}
            </button>
          ))}
          <span className="ml-auto text-sm text-stone-400">{total} báo cáo</span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-jade-500 animate-spin mr-2" />
            <span className="text-stone-400 text-sm">Đang tải...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-stone-50 rounded-2xl text-stone-400">
            Không có báo cáo nào.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Summary row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[report.status])}>
                        {STATUS_LABELS[report.status]}
                      </span>
                      <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                      <span className="text-xs text-stone-400">
                        {format(new Date(report.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 mt-1 truncate">
                      <span className="font-medium">{report.reporter.name ?? report.reporter.email}</span>
                      {" báo cáo "}
                      <span className="font-medium text-red-600">{report.reportedUser.name ?? report.reportedUser.email}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  {report.status === "PENDING" && (
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setModal({ reportId: report.id, targetStatus: "REVIEWED" })}
                        disabled={processingId === report.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        Xem xét
                      </button>
                      <button
                        onClick={() => setModal({ reportId: report.id, targetStatus: "RESOLVED" })}
                        disabled={processingId === report.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-jade-50 text-jade-700 hover:bg-jade-100 disabled:opacity-50 transition-colors"
                      >
                        Xử lý xong
                      </button>
                      <button
                        onClick={() => setModal({ reportId: report.id, targetStatus: "DISMISSED" })}
                        disabled={processingId === report.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-50 text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  )}
                  {report.status === "REVIEWED" && (
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setModal({ reportId: report.id, targetStatus: "RESOLVED" })}
                        disabled={processingId === report.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-jade-50 text-jade-700 hover:bg-jade-100 disabled:opacity-50 transition-colors"
                      >
                        Xử lý xong
                      </button>
                      <button
                        onClick={() => setModal({ reportId: report.id, targetStatus: "DISMISSED" })}
                        disabled={processingId === report.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-50 text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  )}

                  <div className="text-stone-400 flex-shrink-0">
                    {expanded === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expanded === report.id && (
                  <div className="px-4 pb-4 border-t border-stone-50 space-y-3 bg-stone-50/50">
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-stone-400 mb-1">Người báo cáo</p>
                        <p className="font-medium text-stone-800">
                          {report.reporter.name ?? "—"}{" "}
                          <span className="text-stone-400 font-normal">({report.reporter.email})</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 mb-1">Người bị báo cáo</p>
                        <p className="font-medium text-red-700">
                          {report.reportedUser.name ?? "—"}{" "}
                          <span className="text-red-400 font-normal">({report.reportedUser.email})</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-stone-400 mb-1">Mô tả chi tiết</p>
                      <p className="text-sm text-stone-700 whitespace-pre-wrap bg-white rounded-xl p-3 border border-stone-100">
                        {report.description}
                      </p>
                    </div>

                    {report.reviewNote && (
                      <div>
                        <p className="text-xs text-stone-400 mb-1">Ghi chú xử lý</p>
                        <p className="text-sm text-stone-600 bg-blue-50 rounded-xl p-3 border border-blue-100">
                          {report.reviewNote}
                        </p>
                      </div>
                    )}

                    {report.session && (
                      <div>
                        <p className="text-xs text-stone-400 mb-1">Buổi học liên quan</p>
                        <p className="text-sm text-stone-600 font-mono">{report.session.id}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
