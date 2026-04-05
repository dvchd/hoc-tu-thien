"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, CreditCard, Check, X, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bankName: "MB Bank",
    accountNo: "",
    accountName: "",
    isDefault: false,
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/admin/charity-accounts");
      if (res.ok) {
        const data = await res.json();
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
    if (!formData.name.trim() || !formData.accountNo.trim() || !formData.accountName.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/charity-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Đã thêm tài khoản");
        setIsAdding(false);
        setFormData({ name: "", bankName: "MB Bank", accountNo: "", accountName: "", isDefault: false });
        fetchAccounts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Thêm thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    } finally {
      setSubmitting(false);
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
        toast.success(currentStatus ? "Đã tạm ngưng" : "Đã kích hoạt");
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
        toast.error(error.error || "Xóa thất bại");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
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
    <div className="space-y-5 animate-in animate-in-delay-1">
      <button
        onClick={() => setIsAdding(!isAdding)}
        className="flex items-center gap-2 px-4 py-2.5 bg-jade-600 text-white rounded-xl text-sm font-semibold hover:bg-jade-700 transition-all"
      >
        <Plus className="w-4 h-4" />
        {isAdding ? "Huỷ" : "Thêm tài khoản mới"}
      </button>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-2xl border border-jade-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-stone-800">Thêm tài khoản thiện nguyện</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Tên quỹ / Tổ chức</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Quỹ Bữa ăn vùng cao"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Ngân hàng</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Số tài khoản</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                value={formData.accountNo}
                onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                placeholder="VD: 123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Tên chủ tài khoản</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                formData.isDefault
                  ? "bg-jade-50 border-jade-300 text-jade-700"
                  : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center",
                formData.isDefault ? "bg-jade-600 border-jade-600" : "border-stone-300"
              )}>
                {formData.isDefault && <Check className="w-3 h-3 text-white" />}
              </div>
              Đặt làm mặc định
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-jade-600 text-white rounded-xl text-sm font-medium hover:bg-jade-700 transition-colors disabled:bg-stone-200"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Lưu tài khoản
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl text-sm hover:bg-stone-50 transition-colors"
            >
              Huỷ
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-50 bg-stone-50/50">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            {accounts.length} tài khoản thiện nguyện
          </p>
        </div>

        {accounts.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có tài khoản thiện nguyện nào</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={cn(
                  "px-5 py-4 hover:bg-stone-50/50 transition-colors",
                  acc.isDefault && "bg-jade-50/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    acc.isActive ? "bg-jade-100" : "bg-stone-100"
                  )}>
                    <CreditCard className={cn("w-5 h-5", acc.isActive ? "text-jade-600" : "text-stone-400")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-800 text-sm">{acc.name}</span>
                      {acc.isDefault && (
                        <span className="px-2 py-0.5 bg-jade-100 text-jade-700 text-xs rounded-lg font-medium">
                          MẶC ĐỊNH
                        </span>
                      )}
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-lg font-medium",
                        acc.isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
                      )}>
                        {acc.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </span>
                    </div>
                    <div className="text-sm text-stone-600">
                      {acc.accountNo} - {acc.bankName}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {acc.accountName} · {acc.usageCount} mentor sử dụng
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(acc.id, acc.isActive)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                        acc.isActive
                          ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          : "bg-jade-100 text-jade-700 hover:bg-jade-200"
                      )}
                    >
                      {acc.isActive ? "Tạm ngưng" : "Kích hoạt"}
                    </button>
                    <button
                      onClick={() => deleteAccount(acc.id, acc.usageCount)}
                      disabled={acc.usageCount > 0}
                      title={acc.usageCount > 0 ? "Không thể xóa - đang có Mentor dùng" : ""}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        acc.usageCount > 0
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-400 hover:text-red-500 hover:bg-red-50"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
