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
  Flag, Send, AlertTriangle,
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
  const [mentorConfirmed, setMentorConfirmed] = useState(session.mentorConfirmed);
  const [menteeConfirmed, setMenteeConfirmed] = useState(session.menteeConfirmed);
  const [meetLinkInput, setMeetLinkInput] = useState(session.meetLink || "");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  // BUG-64 fix: track rated state locally so star UI hides after submit
  const [hasRated, setHasRated] = useState(!!session.rating);
  const [rating, setRating] = useState(session.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  // BUG-67/68 fix: cancel confirm dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const reportedUserId = viewAs === "mentee" ? session.mentorId : session.menteeId;

  // BUG-62 fix: read data.session.status instead of data.status
  async function confirmCompletion() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/confirm-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetLink: meetLinkInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (viewAs === "mentor") setMentorConfirmed(true);
      else setMenteeConfirmed(true);

      // API returns { success, session: result, message } — read session.status
      const newStatus = data.session?.status;
      if (newStatus) setLocalStatus(newStatus);
      toast.success(data.message ?? "u0110u00e3 xu00e1c nhu1eadn hou00e0n thu00e0nh!");
    } catch (err: any) {
      toast.error(err.message ?? "Cu00f3 lu1ed7i xu1ea3y ra");
    } finally {
      setLoading(false);
    }
  }

  // BUG-63 fix: read data.session.status instead of data.status
  async function markNoShow() {
    if (!window.confirm("Xu00e1c nhu1eadn ngu01b0u1eddi hu1ecdc khu00f4ng tham gia buu1ed5i hu1ecdc nu00e0y?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/no-show`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // API returns { success, session: result, message } — read session.status
      const newStatus = data.session?.status;
      if (newStatus) setLocalStatus(newStatus);
      toast.success("u0110u00e3 u0111u00e1nh du1ea5u vu1eafng mu1eb7t!");
    } catch (err: any) {
      toast.error(err.message ?? "Cu00f3 lu1ed7i xu1ea3y ra");
    } finally {
      setLoading(false);
    }
  }

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
      // PATCH /api/sessions/[id] returns the session record directly
      if (data.status) setLocalStatus(data.status);
      // BUG-64 fix: mark as rated so star UI hides
      if (action === "rate") setHasRated(true);
      toast.success(
        action === "confirm" ? "u0110u00e3 xu00e1c nhu1eadn buu1ed5i hu1ecdc!" :
        action === "cancel" ? "u0110u00e3 huu1ef7 buu1ed5i hu1ecdc" :
        action === "rate" ? "Cu1ea3m u01a1n u0111u00e1nh giu00e1 cu1ee7a bu1ea1n!" : "Thu00e0nh cu00f4ng"
      );
    } catch (err: any) {
      toast.error(err.message ?? "Cu00f3 lu1ed7i xu1ea3y ra");
    } finally {
      setLoading(false);
    }
  }

  // BUG-60 fix: call correct endpoint /api/payments/session-fee with sessionId in body
  async function initiatePayment() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/session-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentInfo(data);
      setShowPayment(true);
    } catch (err: any) {
      toast.error(err.message ?? "Khu00f4ng thu1ec3 tu1ea1o thanh tou00e1n");
    } finally {
      setLoading(false);
    }
  }

  // BUG-67/68 fix: cancel with confirm dialog and real reason input
  function handleCancelClick() {
    setCancelReason("");
    setShowCancelConfirm(true);
  }

  async function confirmCancel() {
    setShowCancelConfirm(false);
    await doAction("cancel", { cancelReason: cancelReason.trim() || "u00c9 lu00fd do" });
  }

  const statusColor = SessionStatusColors[localStatus as SessionStatus] ?? "bg-stone-100 text-stone-600";
  const statusLabel = SessionStatusLabels[localStatus as SessionStatus] ?? localStatus;
  const scheduledDate = new Date(session.scheduledAt);
  const isPast = scheduledDate < new Date();

  const reportReasons = [
    { value: "INAPPROPRIATE", label: "Hu00e0nh vi khu00f4ng phu00f9 hu1ee3p" },
    { value: "MISCONDUCT", label: "Vi phu1ea1m quy u0111u1ecbnh" },
    { value: "NO_SHOW_DISPUTE", label: "Tranh chu1ea5p vu1eafng mu1eb7t" },
    { value: "OTHER", label: "Khu00e1c" },
  ] as const;

  async function submitReport() {
    if (!reportReason) {
      toast.error("Vui lu00f2ng chu1ecdn lu00fd do bu00e1o cu00e1o");
      return;
    }
    if (reportDescription.trim().length < 20) {
      toast.error("Mu00f4 tu1ea3 phu1ea3i cu00f3 u00edt nhu1ea5t 20 ku00fd tu1ef1");
      return;
    }
    setReportLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId,
          sessionId: session.id,
          reason: reportReason,
          description: reportDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("u0110u00e3 gu1eedi bu00e1o cu00e1o. Cu1ea3m u01a1n bu1ea1n!");
      setReported(true);
      setShowReport(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cu00f3 lu1ed7i xu1ea3y ra";
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  }

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
                    Miu1ec5n phu00ed
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
              {format(scheduledDate, "EEEE, dd/MM/yyyy u00b7 HH:mm", { locale: vi })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.durationMinutes} phu00fat
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
                <p className="text-xs font-medium text-stone-500 mb-1">Ghi chu00fa tu1eeb ngu01b0u1eddi hu1ecdc:</p>
                <p className="text-sm text-stone-600">{session.notes}</p>
              </div>
            )}
            {session.mentorNotes && (
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-xs font-medium text-amber-600 mb-1">Nhu1eadn xu00e9t tu1eeb Mentor:</p>
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

            {/* Rating (mentee, completed session) — BUG-64 fix: use hasRated state */}
            {viewAs === "mentee" && localStatus === "COMPLETED" && !hasRated && (
              <div className="pt-2">
                <p className="text-sm font-medium text-stone-600 mb-2">u0110u00e1nh giu00e1 Mentor:</p>
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
                    Gu1eedi u0111u00e1nh giu00e1
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
              Xu00e1c nhu1eadn buu1ed5i hu1ecdc
            </button>
          )}

          {viewAs === "mentor" && (localStatus === "CONFIRMED" || localStatus === "IN_PROGRESS") && !mentorConfirmed && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Google Meet Link"
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 flex-1 min-w-[150px] focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
                value={meetLinkInput}
                onChange={(e) => setMeetLinkInput(e.target.value)}
              />
              <button onClick={confirmCompletion} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-jade-600 text-white text-xs rounded-lg hover:bg-jade-700 transition-colors font-medium whitespace-nowrap">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Xu00e1c nhu1eadn hou00e0n thu00e0nh
              </button>
              {isPast && (
                <button onClick={markNoShow} disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors font-medium whitespace-nowrap">
                  Vu1eafng mu1eb7t
                </button>
              )}
            </div>
          )}

          {viewAs === "mentee" && (localStatus === "CONFIRMED" || localStatus === "IN_PROGRESS") && !menteeConfirmed && (
            <button onClick={confirmCompletion} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-jade-600 text-white text-xs rounded-lg hover:bg-jade-700 transition-colors font-medium">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Xu00e1c nhu1eadn u0111u00e3 hu1ecdc xong
            </button>
          )}

          {mentorConfirmed && !menteeConfirmed && viewAs === "mentor" && (
            <span className="text-xs text-jade-600 font-medium italic">u0110ang chu1edd Mentee xu00e1c nhu1eadn...</span>
          )}
          {menteeConfirmed && !mentorConfirmed && viewAs === "mentee" && (
            <span className="text-xs text-jade-600 font-medium italic">u0110ang chu1edd Mentor xu00e1c nhu1eadn...</span>
          )}

          {/* Mentee payment */}
          {viewAs === "mentee" && localStatus === "PAYMENT_PENDING" && (
            <button onClick={initiatePayment} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors font-medium">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
              Thanh tou00e1n hu1ecdc phu00ed
            </button>
          )}

          {/* Report (confirmed, completed) — removed CANCELLED as it's less relevant */}
          {["CONFIRMED", "COMPLETED"].includes(localStatus) && (
            <button
              onClick={() => { setShowReport(true); setReportReason(""); setReportDescription(""); }}
              disabled={reported}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
                reported
                  ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              )}
            >
              <Flag className="w-3 h-3" />
              {reported ? "u0110u00e3 bu00e1o cu00e1o" : "Bu00e1o cu00e1o"}
            </button>
          )}

          {/* BUG-67 fix: Cancel with confirm dialog instead of direct action */}
          {["PENDING", "CONFIRMED"].includes(localStatus) && !isPast && (
            <button onClick={handleCancelClick} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors font-medium">
              <X className="w-3 h-3" />
              Huu1ef7 buu1ed5i hu1ecdc
            </button>
          )}
        </div>
      </div>

      {/* BUG-67/68 fix: Cancel confirm dialog with reason input */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCancelConfirm(false)}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-stone-800">Xu00e1c nhu1eadn huu1ef7 buu1ed5i hu1ecdc</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-stone-500">
                Bu1ea1n cu00f3 chu1eafc chu1eafn muu1ed1n huu1ef7 buu1ed5i hu1ecdc nu00e0y khu00f4ng?
                {localStatus === "CONFIRMED" && " Viu1ec7c huu1ef7 sau khi u0111u00e3 xu00e1c nhu1eadn cu00f3 thu1ec3 bu1ecb tu00ednh lu00e0 huu1ef7 muu1ed9n."}
              </p>
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1.5 block">
                  Lu00fd do huu1ef7 <span className="text-stone-400 font-normal">(tuu1ef3 chu1ecdn)</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhu1eadp lu00fd do huu1ef7 buu1ed5i hu1ecdc..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Quay lu1ea1i
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Xu00e1c nhu1eadn huu1ef7
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowReport(false)}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-stone-800">Bu00e1o cu00e1o buu1ed5i hu1ecdc</h3>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-stone-500">Bu00e1o cu00e1o nu00e0y su1ebd u0111u01b0u1ee3c gu1eedi u0111u1ebfn quu1ea3n tru1ecb viu00ean u0111u1ec3 xem xu00e9t.</p>

              {/* Reason select */}
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1.5 block">Lu00fd do <span className="text-red-500">*</span></label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                >
                  <option value="">-- Chu1ecdn lu00fd do --</option>
                  {reportReasons.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1.5 block">Mu00f4 tu1ea3 chi tiu1ebft <span className="text-red-500">*</span></label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Mu00f4 tu1ea3 tu00ecnh huu1ed1ng... (u00edt nhu1ea5t 20 ku00fd tu1ef1)"
                  rows={4}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 resize-none"
                />
                <p className={cn("text-xs mt-1", reportDescription.trim().length > 0 && reportDescription.trim().length < 20 ? "text-red-500" : "text-stone-400")}>
                  {reportDescription.trim().length}/20 ku00fd tu1ef1 tu1ed1i thiu1ec3u
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex items-center gap-3 bg-stone-50/60">
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Huu1ef7
              </button>
              <button
                onClick={submitReport}
                disabled={reportLoading || !reportReason || reportDescription.trim().length < 20}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all disabled:bg-stone-200 disabled:text-stone-400"
              >
                {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {reportLoading ? "u0110ang gu1eedi..." : "Gu1eedi bu00e1o cu00e1o"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && paymentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Thanh tou00e1n hu1ecdc phu00ed</h2>
              <button onClick={() => setShowPayment(false)} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <ActivationQRPanel
              paymentInfo={paymentInfo}
              userId={currentUserId}
              sessionId={session.id}
              onSuccess={() => {
                setShowPayment(false);
                // BUG-61 fix: set to COMPLETED after successful payment
                setLocalStatus(SessionStatus.COMPLETED);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
