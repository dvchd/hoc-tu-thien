"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatVND } from "@/lib/utils";
import {
  Copy,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
  QrCode,
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
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-stone-500 hover:text-jade-700 hover:bg-jade-50 transition-colors"
    >
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-jade-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Đã sao chép" : `Sao chép ${label}`}
    </button>
  );
}

export function ActivationQRPanel({ paymentInfo, userId, sessionId, onSuccess }: Props) {
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
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push("/dashboard");
            router.refresh();
          }
        }, 1500);
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
      <div className="grid md:grid-cols-2">

        {/* Left: QR Code */}
        <div className="p-8 bg-gradient-to-br from-stone-50 to-jade-50/30 border-r border-stone-100 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-5 text-sm text-stone-500">
            <QrCode className="w-4 h-4" />
            <span>Quét mã VietQR để chuyển khoản</span>
          </div>

          {/* VietQR Image */}
          <div className="relative w-52 h-52 rounded-2xl overflow-hidden border-2 border-stone-200 bg-white shadow-sm">
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
          <div className={`mt-4 flex items-center gap-2 text-sm font-mono font-semibold ${isExpired ? "text-red-500" : "text-stone-500"}`}>
            <Clock className="w-4 h-4" />
            {countdown}
          </div>
          <p className="text-xs text-stone-400 mt-1">Hết hạn sau 24 giờ</p>
        </div>

        {/* Right: Info & Action */}
        <div className="p-8 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Amount */}
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Số tiền</p>
              <p className="font-display text-3xl font-bold text-jade-600">
                {formatVND(paymentInfo.amount)}
              </p>
              <p className="text-stone-400 text-xs mt-0.5">Vào Quỹ Thiện Nguyện MBBank</p>
            </div>

            {/* Account info */}
            <div className="space-y-3">
              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Số tài khoản TN App</p>
                    <p className="font-semibold text-stone-800 font-mono text-lg">
                      {paymentInfo.tnAccountNo}
                    </p>
                  </div>
                  <CopyButton value={paymentInfo.tnAccountNo} label="STK" />
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-400 mb-0.5">Nội dung chuyển khoản</p>
                    <p className="font-mono text-sm font-semibold text-stone-800 break-all">
                      {paymentInfo.transactionCode}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Vui lòng nhập chính xác nội dung này
                    </p>
                  </div>
                  <CopyButton value={paymentInfo.transactionCode} label="nội dung" />
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-400 mb-0.5">Chủ tài khoản</p>
                <p className="font-semibold text-stone-800 text-sm">
                  {paymentInfo.tnAccountName}
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-400 mb-0.5">Ngân hàng</p>
                <div className="flex items-center gap-2">
                  <img
                    src="/mbbank-logo.svg"
                    alt="MB Bank"
                    className="h-5 object-contain"
                  />
                  <span className="text-sm font-semibold text-stone-700">MB Bank</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleVerify}
              disabled={verifying || isExpired}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all bg-jade-600 text-white hover:bg-jade-700 hover:shadow-lg hover:shadow-jade-200 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang kiểm tra giao dịch...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Tôi đã chuyển khoản xong
                </>
              )}
            </button>

            {checkCount > 0 && !verifying && (
              <p className="text-xs text-center text-stone-400">
                Đã kiểm tra {checkCount} lần. Nếu vừa chuyển, vui lòng đợi 1-2 phút rồi thử lại.
              </p>
            )}

            <a
              href="https://thiennguyen.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-stone-500 hover:text-jade-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Xem Thiện Nguyện App
            </a>
          </div>
        </div>
      </div>

      {/* Bottom notice */}
      <div className="px-8 py-4 bg-amber-50 border-t border-amber-100">
        <p className="text-xs text-amber-700 text-center">
          🔒 Nội dung chuyển khoản được mã hoá. Hệ thống tự động xác minh khi bạn bấm &quot;Đã chuyển khoản&quot;.
          Giao dịch thường được xác nhận trong vòng 1-5 phút.
        </p>
      </div>
    </div>
  );
}
