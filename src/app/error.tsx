"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mb-8">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>

      <h1 className="font-display text-2xl font-semibold text-stone-800 mb-3">
        Đã xảy ra lỗi
      </h1>
      <p className="text-stone-500 max-w-sm mb-8">
        Có lỗi không mong muốn xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ
        nếu vấn đề tiếp tục.
      </p>

      {error.digest && (
        <p className="text-xs text-stone-400 font-mono mb-8 bg-stone-100 px-3 py-1 rounded-lg">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 bg-jade-600 text-white rounded-xl font-medium text-sm hover:bg-jade-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium text-sm hover:bg-stone-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Về Dashboard
        </Link>
      </div>
    </div>
  );
}
