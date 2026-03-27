"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  SessionStatus,
  SessionStatusLabels,
  SessionStatusColors,
} from "@/domain/value-objects/Payment";
import type { SessionRecord } from "@/domain/repositories/ISessionRepository";
import { formatVND, cn } from "@/lib/utils";
import {
  Video, Clock, DollarSign, CheckCircle2,
  X, Star, ExternalLink, CreditCard, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { ActivationQRPanel } from "@/presentation/components/activation/ActivationQRPanel";

interface Props {
  session: SessionRecord;
  viewAs: "mentor" | "mentee";
  currentUserId: string;
}

export function SessionCard({ session, viewAs, currentUserId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(session.status);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [rating, setRating] = useState(session.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);

  async function doAction(action: string, extra?: object) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocalStatus(data.status);
      toast.success(
        action === "confirm" ? "Đã xác nhận buổi học!" :
        action === "complete" ? "Đã kết thúc buổi học!" :
        action === "cancel" ? "Đã huỷ buổi học" :
        action === "rate" ? "Cảm ơn đánh giá của bạn!" : "Thành công"
      );
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  async function initiatePayment() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/payment`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentInfo(data);
      setShowPayment(true);
    } catch (err: any) {
      toast.error(err.message ?? "Không thể tạo thanh toán");
    } finally {
      setLoading(false);
    }
  }

  const statusColor = SessionStatusColors[localStatus as SessionStatus] ?? "bg-stone-100 text-stone-600";
  const statusLabel = SessionStatusLabels[localStatus as SessionStatus] ?? localStatus;
  const scheduledDate = new Date(session.scheduledAt);
  const isPast = scheduledDate < new Date();

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-lg", statusColor)}>
                  {statusLabel}
                </span>
                {session.fee === 0 && (
                  <span className="text-xs bg-jade-50 text-jade-700 px-2 py-0.5 rounded-lg font-medium">
                    Miễn phí
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-stone-800 truncate">{session.title}</h3>
            </div>
            <button onClick={() => setExpanded(!expanded)}
              className="text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0 mt-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-stone-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(scheduledDate, "EEEE, dd/MM/yyyy · HH:mm", { locale: vi })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.durationMinutes} phút
            </span>
            {session.fee > 0 && (
              <span className="flex items-center gap-1 text-jade-600 font-medium">
                <DollarSign className="w-3 h-3" />
                {formatVND(session.fee)}
              </span>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-5 pb-4 border-t border-stone-50 pt-4 space-y-3">
            {session.description && (
              <p className="text-sm text-stone-500">{session.description}</p>
            )}
            {session.notes && (
              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-xs font-medium text-stone-500 mb-1">Ghi chú từ người học:</p>
                <p className="text-sm text-stone-600">{session.notes}</p>
              </div>
            )}
            {session.mentorNotes && (
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-xs font-medium text-amber-600 mb-1">Nhận xét từ Mentor:</p>
                <p className="text-sm text-stone-600">{session.mentorNotes}</p>
              </div>
            )}
            {session.meetLink && (
              <a href={session.meetLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors font-medium">
                <Video className="w-4 h-4" />
                Tham gia Google Meet
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Rating (mentee, completed session) */}
            {viewAs === "mentee" && localStatus === "COMPLETED" && !session.rating && (
              <div className="pt-2">
                <p className="text-sm font-medium text-stone-600 mb-2">Đánh giá Mentor:</p>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110">
                      <Star className={cn("w-7 h-7 transition-colors",
                        (hoverRating || rating) >= star ? "text-amber-400 fill-amber-400" : "text-stone-200")} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <button onClick={() => doAction("rate", { rating })} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm rounded-xl hover:bg-amber-600 transition-colors">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                    Gửi đánh giá
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="px-5 py-3 bg-stone-50/60 border-t border-stone-50 flex items-center gap-2 flex-wrap">
          {/* Mentor actions */}
          {viewAs === "mentor" && localStatus === "PENDING" && (
            <button onClick={() => doAction("confirm")} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-jade-600 text-white text-xs rounded-lg hover:bg-jade-700 transition-colors font-medium">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Xác nhận & Tạo Meet
            </button>
          )}
          {viewAs === "mentor" && (localStatus === "CONFIRMED" || localStatus === "IN_PROGRESS") && (
            <button onClick={() => doAction("complete")} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white text-xs rounded-lg hover:bg-stone-900 transition-colors font-medium">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Kết thúc buổi học
            </button>
          )}

          {/* Mentee payment */}
          {viewAs === "mentee" && localStatus === "PAYMENT_PENDING" && (
            <button onClick={initiatePayment} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors font-medium">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
              Thanh toán học phí
            </button>
          )}

          {/* Cancel (both) */}
          {["PENDING", "CONFIRMED"].includes(localStatus) && !isPast && (
            <button onClick={() => doAction("cancel", { cancelReason: "Người dùng huỷ" })} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors font-medium">
              <X className="w-3 h-3" />
              Huỷ buổi học
            </button>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && paymentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Thanh toán học phí</h2>
              <button onClick={() => setShowPayment(false)} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <ActivationQRPanel
              paymentInfo={paymentInfo}
              userId={currentUserId}
              sessionId={session.id}
              onSuccess={() => { setShowPayment(false); setLocalStatus(SessionStatus.COMPLETED); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
