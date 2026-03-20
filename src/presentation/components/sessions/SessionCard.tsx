"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SessionRecord } from "@/domain/repositories/ISessionRepository";
import {
  SessionStatus,
  SessionStatusLabels,
  SessionStatusColors,
} from "@/domain/value-objects/Payment";
import { formatVND, cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Video,
  Clock,
  CalendarDays,
  Star,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  CreditCard,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { PaymentModal } from "@/presentation/components/payment/PaymentModal";

interface Props {
  session: SessionRecord;
  viewAs: "mentor" | "mentee";
  currentUserId: string;
}

export function SessionCard({ session: initialSession, viewAs, currentUserId }: Props) {
  const [session, setSession] = useState(initialSession);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  async function handleAction(action: string, extra?: object) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSession(data);
      toast.success(
        action === "confirm"
          ? "✅ Đã xác nhận buổi học! Link Meet đã được tạo."
          : action === "complete"
          ? "✅ Đã đánh dấu hoàn thành!"
          : action === "cancel"
          ? "Đã huỷ buổi học"
          : "Cập nhật thành công"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  const statusColor = SessionStatusColors[session.status as SessionStatus] ?? "bg-stone-100 text-stone-600";
  const statusLabel = SessionStatusLabels[session.status as SessionStatus] ?? session.status;

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {/* Header row */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-lg", statusColor)}>
                  {statusLabel}
                </span>
                {session.fee > 0 && (
                  <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-lg">
                    {formatVND(session.fee)}
                  </span>
                )}
                {session.fee === 0 && (
                  <span className="text-xs text-jade-700 font-medium bg-jade-50 px-2 py-0.5 rounded-lg">
                    Miễn phí
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-stone-800 truncate">{session.title}</h3>
              <div className="flex items-center gap-4 mt-1.5 text-stone-400 text-xs flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {format(new Date(session.scheduledAt), "EEEE, dd/MM/yyyy HH:mm", { locale: vi })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.durationMinutes} phút
                </span>
              </div>
            </div>

            {/* Rating */}
            {session.rating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn("w-3.5 h-3.5", i < session.rating! ? "text-amber-400 fill-amber-400" : "text-stone-200")}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {/* Meet link */}
            {session.meetLink && (
              <a
                href={session.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                Vào Google Meet
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Mentor actions */}
            {viewAs === "mentor" && (
              <>
                {session.status === SessionStatus.PENDING && (
                  <button
                    onClick={() => handleAction("confirm")}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-jade-600 text-white text-xs font-medium rounded-lg hover:bg-jade-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Xác nhận & Tạo Meet
                  </button>
                )}
                {(session.status === SessionStatus.CONFIRMED || session.status === SessionStatus.IN_PROGRESS) && (
                  <button
                    onClick={() => handleAction("complete")}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Kết thúc buổi học
                  </button>
                )}
              </>
            )}

            {/* Mentee actions */}
            {viewAs === "mentee" && (
              <>
                {session.status === SessionStatus.PAYMENT_PENDING && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors animate-pulse"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Thanh toán học phí
                  </button>
                )}
                {session.status === SessionStatus.COMPLETED && !session.rating && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Đánh giá buổi học
                  </button>
                )}
              </>
            )}

            {/* Cancel */}
            {(session.status === SessionStatus.PENDING || session.status === SessionStatus.CONFIRMED) && (
              <button
                onClick={() => {
                  const reason = prompt("Lý do huỷ:");
                  if (reason !== null) handleAction("cancel", { cancelReason: reason });
                }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Huỷ
              </button>
            )}

            {/* Expand */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 text-stone-400 text-xs hover:text-stone-600 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? "Thu gọn" : "Chi tiết"}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-stone-50 px-5 py-4 bg-stone-50/50 space-y-3">
            {session.description && (
              <div>
                <p className="text-xs text-stone-400 mb-1">Mô tả</p>
                <p className="text-sm text-stone-600">{session.description}</p>
              </div>
            )}
            {session.notes && (
              <div>
                <p className="text-xs text-stone-400 mb-1">Ghi chú từ Mentee</p>
                <p className="text-sm text-stone-600">{session.notes}</p>
              </div>
            )}
            {session.mentorNotes && (
              <div>
                <p className="text-xs text-stone-400 mb-1">Nhận xét từ Mentor</p>
                <p className="text-sm text-stone-600 italic">"{session.mentorNotes}"</p>
              </div>
            )}
            {session.ratingComment && (
              <div>
                <p className="text-xs text-stone-400 mb-1">Đánh giá của Mentee</p>
                <p className="text-sm text-stone-600 italic">"{session.ratingComment}"</p>
              </div>
            )}
            {session.cancelReason && (
              <div>
                <p className="text-xs text-red-400 mb-1">Lý do huỷ</p>
                <p className="text-sm text-red-500">{session.cancelReason}</p>
              </div>
            )}

            {/* Rate form inline */}
            {viewAs === "mentee" && session.status === SessionStatus.COMPLETED && !session.rating && (
              <RatingForm sessionId={session.id} onSubmit={(updated) => setSession(updated)} />
            )}
          </div>
        )}
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <PaymentModal
          sessionId={session.id}
          userId={currentUserId}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSession((prev) => ({ ...prev, status: SessionStatus.COMPLETED }));
          }}
        />
      )}
    </>
  );
}

// ─── Inline Rating Form ────────────────────────────────────────────────────────

function RatingForm({
  sessionId,
  onSubmit,
}: {
  sessionId: string;
  onSubmit: (session: SessionRecord) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!rating) return toast.error("Vui lòng chọn số sao");
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate", rating, ratingComment: comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Cảm ơn bạn đã đánh giá!");
      onSubmit(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi gửi đánh giá");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
      <p className="text-sm font-medium text-stone-700 mb-3">Đánh giá buổi học</p>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-7 h-7 transition-colors",
                i <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-stone-300"
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-stone-500">
            {["", "Tệ", "Không tốt", "Tạm ổn", "Tốt", "Xuất sắc"][rating]}
          </span>
        )}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Nhận xét thêm (không bắt buộc)..."
        rows={2}
        className="w-full px-3 py-2 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 resize-none mb-3"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !rating}
        className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
      >
        {loading ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </div>
  );
}
