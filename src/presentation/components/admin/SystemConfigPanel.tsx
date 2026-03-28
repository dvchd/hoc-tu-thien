"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemConfig {
  key: string;
  value: string;
  description: string;
}

export function SystemConfigPanel() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        const configList = data.configs ?? data;
        setConfigs(configList);
        const values: Record<string, string> = {};
        configList.forEach((c: SystemConfig) => { values[c.key] = c.value; });
        setLocalValues(values);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-jade-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-50 bg-stone-50/50">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-jade-600" />
          <h2 className="text-lg font-semibold text-stone-800">Thông số hệ thống</h2>
        </div>
        <p className="text-sm text-stone-500">
          Các thông số này ảnh hưởng trực tiếp đến quy trình nghiệp vụ
        </p>
      </div>

      {configs.length === 0 ? (
        <div className="py-16 text-center text-stone-400">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Không tìm thấy cấu hình nào</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-50">
          {configs.map((config) => (
            <div
              key={config.key}
              className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-stone-50/30 transition-colors"
            >
              <div className="md:col-span-5">
                <code className="text-sm font-mono font-semibold text-jade-600 bg-jade-50 px-2 py-1 rounded-lg">
                  {config.key}
                </code>
                <p className="mt-1.5 text-xs text-stone-400">{config.description}</p>
              </div>

              <div className="md:col-span-5">
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
                  value={localValues[config.key] ?? config.value}
                  onChange={(e) => setLocalValues({ ...localValues, [config.key]: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value !== config.value) {
                      handleUpdate(config.key, e.target.value);
                    }
                  }}
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                {saving === config.key ? (
                  <span className="flex items-center gap-1.5 text-xs text-stone-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
                  </span>
                ) : (
                  <button
                    onClick={() => handleUpdate(config.key, localValues[config.key] ?? config.value)}
                    disabled={localValues[config.key] === config.value}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      localValues[config.key] !== config.value
                        ? "bg-jade-100 text-jade-700 hover:bg-jade-200"
                        : "bg-stone-50 text-stone-300 cursor-not-allowed"
                    )}
                  >
                    <Save className="w-3 h-3" />
                    Lưu
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
