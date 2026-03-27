"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface MentorApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  motivation: string;
  experience: string;
  linkedinUrl: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

export function MentorApplicationsTable() {
  const [applications, setApplications] = useState<MentorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/admin/mentor-applications");
      if (res.ok) {
        const data = await res.json();
        // API trả về { applications: [], total: n } hoặc array trực tiếp
        setApplications(data.applications ?? data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách đơn đăng ký");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    const reviewNote = window.prompt(action === "APPROVE" ? "Ghi chú phê duyệt (tùy chọn):" : "Lý do từ chối (bắt buộc):");
    
    if (action === "REJECT" && !reviewNote) {
      toast.error("Phải nhập lý do từ chối");
      return;
    }

    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/mentor-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // API expect { action: "approve"|"reject", reviewNote }
        body: JSON.stringify({ action: action === "APPROVE" ? "approve" : "reject", reviewNote }),
      });

      if (res.ok) {
        toast.success(action === "APPROVE" ? "Đã duyệt đơn" : "Đã từ chối đơn");
        fetchApplications();
      } else {
        const error = await res.json();
        toast.error(error.message || "Thao tác thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ứng viên</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông tin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày gửi</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app) => (
            <tr key={app.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{app.user.name}</div>
                <div className="text-sm text-gray-500">{app.user.email}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-xs text-gray-900 max-w-xs truncate" title={app.motivation}>
                  <strong>Động lực:</strong> {app.motivation}
                </div>
                {app.linkedinUrl && (
                  <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    LinkedIn
                  </a>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(app.createdAt).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  app.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {app.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {app.status === 'PENDING' && (
                  <div className="space-x-2">
                    <button
                      disabled={!!processingId}
                      onClick={() => handleAction(app.id, "APPROVE")}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                    <button
                      disabled={!!processingId}
                      onClick={() => handleAction(app.id, "REJECT")}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {applications.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                Không có đơn đăng ký nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
