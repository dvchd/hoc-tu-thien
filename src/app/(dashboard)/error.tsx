"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, LogOut, RefreshCw } from "lucide-react";

/**
 * Dashboard error boundary.
 *
 * Most common trigger: stale JWT cookie after a new build/deploy where
 * AUTH_SECRET changed. The middleware should catch this and redirect to
 * login, but as a safety-net this boundary offers a "Đăng nhập lại" action
 * that navigates to the sign-in page (clearing the stale cookie server-side).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]:", error);
  }, [error]);

  const handleReLogin = () => {
    // Navigate to the NextAuth sign-out endpoint, which clears the session
    // cookie, then the user will be redirected to the login page.
    router.push("/api/auth/signout?callbackUrl=/login");
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mb-8">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>

      <h1 className="font-display text-2xl font-semibold text-stone-800 mb-3">
        Đã xảy ra lỗi
      </h1>
      <p className="text-stone-500 max-w-sm mb-4">
        Có lỗi không mong muốn xảy ra. Điều này thường do phiên đăng nhập hết
        hạn hoặc không hợp lệ sau khi ứng dụng được cập nhật.
      </p>

      {error.digest && (
        <p className="text-xs text-stone-400 font-mono mb-8 bg-stone-100 px-3 py-1 rounded-lg">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleReLogin}
          className="flex items-center gap-2 px-5 py-2.5 bg-jade-600 text-white rounded-xl font-medium text-sm hover:bg-jade-700 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Đăng nhập lại
        </button>
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium text-sm hover:bg-stone-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Thử lại
        </button>
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium text-sm hover:bg-stone-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Về trang đăng nhập
        </button>
      </div>
    </div>
  );
}
