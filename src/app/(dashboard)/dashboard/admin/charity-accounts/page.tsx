import { CharityAccountManager } from "@/presentation/components/admin/CharityAccountManager";

export default function CharityAccountsAdminPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản thiện nguyện</h1>
        <p className="text-gray-600">Thêm, sửa và quản lý các tài khoản ngân hàng nhận tiền đóng góp.</p>
      </div>
      
      <CharityAccountManager />
    </div>
  );
}
