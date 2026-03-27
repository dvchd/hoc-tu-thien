import { MentorApplicationsTable } from "@/presentation/components/admin/MentorApplicationsTable";

export default function MentorApplicationsAdminPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn đăng ký Mentor</h1>
        <p className="text-gray-600">Xem xét và phê duyệt các ứng viên muốn trở thành mentor.</p>
      </div>
      
      <MentorApplicationsTable />
    </div>
  );
}
