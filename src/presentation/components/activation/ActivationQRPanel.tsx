"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatVND } from "@/lib/utils";
import Link from "next/link";
import {
  Copy,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  QrCode,
  Home,
  Info,
  Shield,
} from "lucide-react";
import type { ActivationPaymentInfo } from "@/application/use-cases/payment/PaymentUseCases";

interface Props {
  paymentInfo: ActivationPaymentInfo;
  userId: string;
  sessionId?: string; // nếu là session fee payment
  onSuccess?: () => void;
}

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Đã hết hạn";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-jade-700 hover:bg-jade-50 transition-colors border border-stone-200 hover:border-jade-200"
    >
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-jade-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Đã sao chép" : label}
    </button>
  );
}

export function ActivationQRPanel({ paymentInfo, userId, sessionId, onSuccess }: Props) {
  const { update } = useSession();
  const router = useRouter();
  const [countdown, setCountdown] = useState(
    formatCountdown(paymentInfo.expiresAt)
  );
  const [verifying, setVerifying] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [qrLoaded, setQrLoaded] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(paymentInfo.expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentInfo.expiresAt]);

  async function handleVerify() {
    setVerifying(true);
    setCheckCount((c) => c + 1);

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: paymentInfo.paymentId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message, { duration: 5000 });
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        } else {
          await update();
          window.location.href = "/dashboard";
        }
      } else {
        toast.error(data.message, { duration: 4000 });
      }
    } catch {
      toast.error("Có lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setVerifying(false);
    }
  }

  const isExpired = new Date(paymentInfo.expiresAt) < new Date();

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/40 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">

        {/* ── Left: QR Code (bigger) ── */}
        <div className="p-8 md:p-10 bg-gradient-to-br from-stone-50 to-jade-50/30 border-r border-stone-100 flex flex-col items-center justify-center">
          {/* Bank header */}
          <div className="flex items-center gap-2.5 mb-5">
            <img
              src="/mbbank-logo.svg"
              alt="MB Bank"
              className="h-7 object-contain"
            />
            <span className="text-sm font-bold text-stone-700">Quỹ Thiện Nguyện MBBank</span>
          </div>

          {/* VietQR Image — bigger */}
          <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-stone-200 bg-white shadow-md">
            {!qrLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-jade-500 animate-spin" />
              </div>
            )}
            <img
              src={paymentInfo.qrImageUrl}
              alt="VietQR Code"
              className={`w-full h-full object-contain transition-opacity duration-300 ${qrLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setQrLoaded(true)}
              onError={() => setQrLoaded(true)}
            />
            {isExpired && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-red-400 mx-auto mb-1" />
                  <p className="text-red-500 text-xs font-medium">QR đã hết hạn</p>
                </div>
              </div>
            )}
          </div>

          {/* Countdown */}
          <div className={`mt-5 flex items-center gap-2 text-base font-mono font-bold ${isExpired ? "text-red-500" : "text-stone-600"}`}>
            <Clock className="w-4 h-4" />
            {countdown}
          </div>
          <p className="text-xs text-stone-400 mt-1">QR hết hạn sau 24 giờ</p>
        </div>

        {/* ── Right: Info & Action ── */}
        <div className="p-8 md:p-10 flex flex-col justify-between">
          <div className="space-y-5">

            {/* Amount — bigger, prominent */}
            <div className="text-center py-4 px-6 bg-gradient-to-r from-jade-50 to-emerald-50 rounded-2xl border border-jade-100">
              <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Số tiền chuyển khoản</p>
              <p className="font-display text-4xl font-bold text-jade-700">
                {formatVND(paymentInfo.amount)}
              </p>
            </div>

            {/* Transfer details card */}
            <div className="space-y-0 bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden">

              {/* Số tài khoản */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100">
                <div>
                  <p className="text-[11px] text-stone-400 uppercase tracking-wide">Số tài khoản</p>
                  <p className="font-mono text-lg font-bold text-stone-800 tracking-wider">
                    {paymentInfo.tnAccountNo}
                  </p>
                </div>
                <CopyButton value={paymentInfo.tnAccountNo} label="Sao chép STK" />
              </div>

              {/* Chủ tài khoản */}
              <div className="px-4 py-3.5 border-b border-stone-100">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Chủ tài khoản</p>
                <p className="font-semibold text-stone-800">{paymentInfo.tnAccountName}</p>
              </div>

              {/* Ngân hàng */}
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-stone-100">
                <img
                  src="/mbbank-logo.svg"
                  alt="MB Bank"
                  className="h-6 w-6 object-contain rounded"
                />
                <span className="font-semibold text-stone-800">Ngân hàng Quân Đội MB Bank</span>
              </div>

              {/* Nội dung chuyển khoản — BIG and PROMINENT */}
              <div className="px-4 py-4 bg-amber-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-[11px] text-amber-700 uppercase tracking-wide font-semibold">
                        Nội dung chuyển khoản
                      </p>
                    </div>
                    {/* Large, prominent transaction code — fully visible */}
                    <p className="font-mono text-xl font-extrabold text-stone-900 break-all leading-relaxed bg-white rounded-xl px-3 py-2.5 border border-amber-200 shadow-sm">
                      {paymentInfo.transactionCode}
                    </p>
                    <p className="text-xs text-amber-700 mt-2 flex items-start gap-1">
                      <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Nhập <strong>chính xác</strong> nội dung này khi chuyển khoản để hệ thống tự động xác minh.</span>
                    </p>
                  </div>
                  <CopyButton value={paymentInfo.transactionCode} label="Sao chép" />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 space-y-2.5">
            <button
              onClick={handleVerify}
              disabled={verifying || isExpired}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm transition-all bg-jade-600 text-white hover:bg-jade-700 hover:shadow-lg hover:shadow-jade-200 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang kiểm tra giao dịch...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Tôi đã chuyển khoản xong
                </>
              )}
            </button>

            {checkCount > 0 && !verifying && (
              <p className="text-xs text-center text-stone-400 px-4">
                Đã kiểm tra {checkCount} lần. Nếu vừa chuyển, vui lòng đợi 1-2 phút rồi thử lại.
              </p>
            )}

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-50 border border-stone-200 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Về dashboard
              </Link>
              <a
                href="https://thiennguyen.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-stone-500 hover:text-jade-700 transition-colors border border-stone-200 hover:border-jade-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                TN App
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom notice */}
      <div className="px-8 py-3.5 bg-amber-50 border-t border-amber-100">
        <p className="text-xs text-amber-700 text-center flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Nội dung chuyển khoản được mã hoá — hệ thống tự động xác minh khi bạn bấm &quot;Đã chuyển khoản&quot;.
          Giao dịch thường xác nhận trong 1-5 phút.
        </p>
      </div>
    </div>
  );
}
