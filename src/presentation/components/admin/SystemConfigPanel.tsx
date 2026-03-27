"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SystemConfig {
  key: string;
  value: string;
  description: string;
}

export function SystemConfigPanel() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        // API trả về { configs: [] }
        setConfigs(data.configs ?? data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải cấu hình");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // API expect { configs: [{key, value}] }
        body: JSON.stringify({ configs: [{ key, value }] }),
      });

      if (res.ok) {
        toast.success(`Đã cập nhật ${key}`);
        fetchConfigs();
      } else {
        toast.error("Cập nhật thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Thông số hệ thống</h2>
        <p className="text-sm text-gray-600 text-balance">
          Các thông số này ảnh hưởng trực tiếp đến quy trình nghiệp vụ (phí kích hoạt, thời gian hủy lịch, v.v.)
        </p>
      </div>
      <div className="divide-y divide-gray-200">
        {configs.map((config) => (
          <div key={config.key} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <code className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {config.key}
              </code>
              <p className="mt-1 text-sm text-gray-500">{config.description}</p>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                defaultValue={config.value}
                onBlur={(e) => {
                   if (e.target.value !== config.value) {
                     handleUpdate(config.key, e.target.value);
                   }
                }}
              />
            </div>
            <div className="text-right">
              {saving === config.key ? (
                <span className="text-sm text-gray-400 animate-pulse">Đang lưu...</span>
              ) : (
                <span className="text-xs text-gray-400 italic">Tự động lưu khi thoát field</span>
              )}
            </div>
          </div>
        ))}
        {configs.length === 0 && (
          <div className="p-10 text-center text-gray-500">Không tìm thấy cấu hình nào.</div>
        )}
      </div>
    </div>
  );
}
