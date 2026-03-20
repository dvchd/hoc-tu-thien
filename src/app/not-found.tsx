import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-jade-600 flex items-center justify-center mb-8 shadow-lg shadow-jade-200">
        <Heart className="w-8 h-8 text-white fill-white" />
      </div>

      <h1 className="font-display text-8xl font-bold text-stone-200 mb-2">
        404
      </h1>
      <h2 className="font-display text-2xl font-semibold text-stone-800 mb-3">
        Trang không tồn tại
      </h2>
      <p className="text-stone-500 max-w-sm mb-10">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xoá. Hãy quay về
        trang chủ.
      </p>

      <Link
        href="/"
        className="flex items-center gap-2 px-6 py-3 bg-jade-600 text-white rounded-xl font-medium hover:bg-jade-700 transition-all hover:shadow-lg hover:shadow-jade-200 hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-4 h-4" />
        Về trang chủ
      </Link>
    </div>
  );
}
