"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface MentorApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  motivation: string;
  experience: string;
  linkedinUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export function MentorApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [application, setApplication] = useState<MentorApplication | null>(null);
  
  const [formData, setFormData] = useState({
    motivation: "",
    experience: "",
    linkedinUrl: "",
  });

  useEffect(() => {
    async function fetchApplication() {
      try {
        const res = await fetch("/api/mentor/apply");
        if (res.ok) {
          const data = await res.json();
          setApplication(data);
        }
      } catch (error) {
        console.error("Error fetching application:", error);
      } finally {
        setFetching(false);
      }
    }
    fetchApplication();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/mentor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Đơn đăng ký đã được gửi thành công!");
        const data = await res.json();
        setApplication(data);
      } else {
        const error = await res.json();
        toast.error(error.message || "Có lỗi xảy ra khi gửi đơn.");
      }
    } catch (error) {
      toast.error("Lỗi kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-4 animate-pulse text-center">Đang tải thông tin...</div>;
  }

  if (application) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Trạng thái đơn đăng ký Mentor</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Trạng thái:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
              application.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {application.status === 'PENDING' ? 'Đang chờ duyệt' :
               application.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
            </span>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500 mb-1">Ngày gửi đơn:</p>
            <p className="text-gray-700">{new Date(application.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>

          {application.reviewNote && (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-md">
              <p className="text-sm text-orange-600 font-medium mb-1">Ghi chú từ Admin:</p>
              <p className="text-orange-700">{application.reviewNote}</p>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <button
              onClick={() => setApplication(null)}
              className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Gửi lại đơn mới
            </button>
          )}
          
          {application.status === 'APPROVED' && (
            <button
              onClick={() => router.push('/dashboard/mentor/profile')}
              className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              Cập nhật hồ sơ Mentor
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Đăng ký trở thành Mentor</h2>
      <p className="text-gray-600 text-sm mb-6">
        Hãy chia sẻ kiến thức của bạn để giúp đỡ cộng đồng và đóng góp cho các quỹ từ thiện.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Động lực của bạn (Motivation)
        </label>
        <textarea
          required
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Tại sao bạn muốn trở thành mentor tại Học Từ Thiện?"
          value={formData.motivation}
          onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kinh nghiệm chuyên môn (Experience)
        </label>
        <textarea
          required
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Tóm tắt kinh nghiệm và kỹ năng bạn có thể chia sẻ."
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LinkedIn URL (Tùy chọn)
        </label>
        <input
          type="url"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://linkedin.com/in/yourprofile"
          value={formData.linkedinUrl}
          onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Đang gửi..." : "Gửi đơn đăng ký"}
      </button>
    </form>
  );
}
