"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { ActivationQRPanel } from "@/presentation/components/activation/ActivationQRPanel";
import type { ActivationPaymentInfo } from "@/application/use-cases/payment/PaymentUseCases";

interface Props {
  sessionId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ sessionId, userId, onClose, onSuccess }: Props) {
  const [paymentInfo, setPaymentInfo] = useState<ActivationPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initPayment() {
      try {
        const res = await fetch(`/api/payments/session-fee`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPaymentInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tạo yêu cầu thanh toán");
      } finally {
        setLoading(false);
      }
    }
    initPayment();
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900">Thanh toán học phí</h2>
            <p className="text-stone-400 text-sm">Chuyển khoản qua Quỹ Thiện Nguyện MBBank</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-8 h-8 text-jade-500 animate-spin mb-3" />
              <p className="text-stone-400 text-sm">Đang tạo mã thanh toán...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500 font-medium">{error}</p>
              <button onClick={onClose} className="mt-4 text-sm text-stone-400 hover:text-stone-600">
                Đóng
              </button>
            </div>
          )}
          {paymentInfo && (
            <ActivationQRPanel
              paymentInfo={paymentInfo}
              userId={userId}
              sessionId={sessionId}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
