"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface CharityAccount {
  id: string;
  name: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
}

export function CharityAccountManager() {
  const [accounts, setAccounts] = useState<CharityAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bankName: "",
    accountNo: "",
    accountName: "",
    isDefault: false,
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/admin/charity-accounts");
      if (res.ok) {
        const data = await res.json();
        // API trả về { accounts: [] }
        setAccounts(data.accounts ?? data);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/charity-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Đã thêm tài khoản");
        setIsAdding(false);
        setFormData({ name: "", bankName: "", accountNo: "", accountName: "", isDefault: false });
        fetchAccounts();
      } else {
        const error = await res.json();
        toast.error(error.message || "Thêm thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/charity-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        toast.success("Đã cập nhật trạng thái");
        fetchAccounts();
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    }
  };

  const deleteAccount = async (id: string, usageCount: number) => {
    if (usageCount > 0) {
      toast.error("Không thể xóa tài khoản đang được sử dụng");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;

    try {
      const res = await fetch(`/api/admin/charity-accounts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Đã xóa tài khoản");
        fetchAccounts();
      } else {
        const error = await res.json();
        toast.error(error.message || "Xóa thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    }
  };

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Danh sách tài khoản thiện nguyện</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
        >
          {isAdding ? "Hủy" : "Thêm tài khoản mới"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg border border-gray-200 grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Tên quỹ / Tổ chức</label>
            <input
              required
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Ngân hàng</label>
            <input
              required
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Số tài khoản</label>
            <input
              required
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.accountNo}
              onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Tên chủ tài khoản</label>
            <input
              required
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">Đặt làm mặc định cho hệ thống</label>
          </div>
          <div className="col-span-2">
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition">
              Lưu tài khoản
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên / Quỹ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thông tin tài khoản</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sử dụng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((acc) => (
              <tr key={acc.id} className={acc.isDefault ? "bg-indigo-50" : ""}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{acc.name}</div>
                  {acc.isDefault && <span className="text-xs text-indigo-600 font-bold">MẶC ĐỊNH</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{acc.accountNo} - {acc.bankName}</div>
                  <div className="text-xs text-gray-500">{acc.accountName}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{acc.usageCount} mentors</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${acc.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {acc.isActive ? "Hoạt động" : "Tạm ngưng"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                  <button onClick={() => toggleStatus(acc.id, acc.isActive)} className="text-indigo-600 hover:text-indigo-900">
                    {acc.isActive ? "Tạm ngưng" : "Kích hoạt"}
                  </button>
                  <button
                    onClick={() => deleteAccount(acc.id, acc.usageCount)}
                    className={`text-red-600 hover:text-red-900 ${acc.usageCount > 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                    disabled={acc.usageCount > 0}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
