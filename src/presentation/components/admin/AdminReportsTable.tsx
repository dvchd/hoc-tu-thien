"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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
  RESOLVED: "bg-green-100 text-green-700",
  DISMISSED: "bg-stone-100 text-stone-500",
};

const REASON_LABELS: Record<string, string> = {
  INAPPROPRIATE: "Nội dung không phù hợp",
  MISCONDUCT: "Hành vi không đúng mực",
  NO_SHOW_DISPUTE: "Tranh chấp vắng mặt",
  OTHER: "Lý do khác",
};

export function AdminReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
  }, [filterStatus]);

  const handleResolve = async (
    id: string,
    status: "REVIEWED" | "RESOLVED" | "DISMISSED"
  ) => {
    const actionLabel =
      status === "REVIEWED"
        ? "Đánh dấu đang xem xét"
        : status === "RESOLVED"
        ? "Đánh dấu đã xử lý"
        : "Bỏ qua báo cáo";

    const reviewNote = window.prompt(`${actionLabel} - Nhập ghi chú xử lý (bắt buộc):`);
    if (!reviewNote?.trim()) {
      toast.error("Vui lòng nhập ghi chú xử lý");
      return;
    }

    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi hệ thống");
      toast.success(`Đã cập nhật báo cáo thành công`);
      fetchReports();
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-stone-500">Lọc theo trạng thái:</span>
        {["", "PENDING", "REVIEWED", "RESOLVED", "DISMISSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? "bg-indigo-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {s === "" ? "Tất cả" : STATUS_LABELS[s]}
          </button>
        ))}
        <span className="ml-auto text-sm text-stone-400">
          {total} báo cáo
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">Đang tải...</div>
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
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
                      onClick={() => handleResolve(report.id, "REVIEWED")}
                      disabled={processingId === report.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      Xem xét
                    </button>
                    <button
                      onClick={() => handleResolve(report.id, "RESOLVED")}
                      disabled={processingId === report.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      Xử lý xong
                    </button>
                    <button
                      onClick={() => handleResolve(report.id, "DISMISSED")}
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
                      onClick={() => handleResolve(report.id, "RESOLVED")}
                      disabled={processingId === report.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      Xử lý xong
                    </button>
                    <button
                      onClick={() => handleResolve(report.id, "DISMISSED")}
                      disabled={processingId === report.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-50 text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors"
                    >
                      Bỏ qua
                    </button>
                  </div>
                )}
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
  );
}
