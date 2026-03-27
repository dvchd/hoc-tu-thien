import { SystemConfigPanel } from "@/presentation/components/admin/SystemConfigPanel";

export default function ConfigAdminPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cấu hình hệ thống</h1>
        <p className="text-gray-600">Quản lý các thông số vận hành của nền tảng.</p>
      </div>
      
      <SystemConfigPanel />
    </div>
  );
}
