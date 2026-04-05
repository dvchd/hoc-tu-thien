"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, GripVertical, Save, X, Loader2, Tag, CheckCircle2 } from "lucide-react";

interface FieldData {
  id: string; name: string; slug: string; description: string | null;
  icon: string | null; isActive: boolean; sortOrder: number;
  _count: { mentors: number };
}

const POPULAR_ICONS = ["💻", "🎨", "📊", "🔬", "📱", "🌐", "🎯", "🏗️", "📈", "✍️", "🎓", "🔧", "🤝", "💡", "🎵", "📷"];

export function TeachingFieldsManager({ fields: initialFields }: { fields: FieldData[] }) {
  const [fields, setFields] = useState(initialFields);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [newField, setNewField] = useState({ name: "", description: "", icon: "📚", isActive: true });
  const [editData, setEditData] = useState<Partial<FieldData>>({});

  async function handleAdd() {
    if (!newField.name.trim()) { toast.error("Vui lòng nhập tên lĩnh vực"); return; }
    setLoading("new");
    try {
      const res = await fetch("/api/admin/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newField),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFields([...fields, { ...data, _count: { mentors: 0 } }]);
      setNewField({ name: "", description: "", icon: "📚", isActive: true });
      setAdding(false);
      toast.success("Đã thêm lĩnh vực mới!");
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  }

  async function handleUpdate(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFields(fields.map((f) => f.id === id ? { ...f, ...data } : f));
      setEditing(null);
      toast.success("Đã cập nhật!");
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xoá lĩnh vực "${name}"?`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/fields/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setFields(fields.filter((f) => f.id !== id));
      toast.success("Đã xoá!");
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  }

  function startEdit(field: FieldData) {
    setEditing(field.id);
    setEditData({ name: field.name, description: field.description ?? "", icon: field.icon ?? "📚", isActive: field.isActive });
  }

  return (
    <div className="space-y-5 animate-in animate-in-delay-1">
      {/* Add button */}
      <button onClick={() => setAdding(!adding)}
        className="flex items-center gap-2 px-4 py-2.5 bg-jade-600 text-white rounded-xl text-sm font-semibold hover:bg-jade-700 transition-all">
        <Plus className="w-4 h-4" />
        Thêm lĩnh vực mới
      </button>

      {/* Add form */}
      {adding && (
        <div className="p-5 bg-white rounded-2xl border border-jade-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-stone-800">Thêm lĩnh vực mới</h3>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600">Tên lĩnh vực</label>
            <input value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })}
              placeholder="VD: Web Development" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600">Mô tả (tuỳ chọn)</label>
            <input value={newField.description} onChange={(e) => setNewField({ ...newField, description: e.target.value })}
              placeholder="Mô tả ngắn về lĩnh vực" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600">Icon</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ICONS.map((icon) => (
                <button key={icon} type="button"
                  onClick={() => setNewField({ ...newField, icon })}
                  className={cn("w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border",
                    newField.icon === icon ? "bg-jade-100 border-jade-400 scale-110" : "bg-stone-50 border-stone-200 hover:border-jade-300")}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={loading === "new"}
              className="flex items-center gap-2 px-4 py-2 bg-jade-600 text-white rounded-xl text-sm font-medium hover:bg-jade-700 transition-colors">
              {loading === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Thêm
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Fields list */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-50 bg-stone-50/50">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            {fields.length} lĩnh vực
          </p>
        </div>

        {fields.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có lĩnh vực nào</p>
          </div>
        ) : (
          fields.map((field) => (
            <div key={field.id}
              className={cn("flex items-center gap-4 px-5 py-4 border-b border-stone-50 last:border-0 transition-colors",
                loading === field.id ? "opacity-50" : "hover:bg-stone-50/50")}>
              <GripVertical className="w-4 h-4 text-stone-300 flex-shrink-0" />

              {editing === field.id ? (
                /* Edit mode */
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1.5">
                    {POPULAR_ICONS.slice(0, 8).map((icon) => (
                      <button key={icon} type="button"
                        onClick={() => setEditData({ ...editData, icon })}
                        className={cn("w-7 h-7 rounded-lg text-sm flex items-center justify-center border",
                          editData.icon === icon ? "bg-jade-100 border-jade-400" : "border-transparent hover:border-stone-300")}>
                        {icon}
                      </button>
                    ))}
                  </div>
                  <input value={editData.name ?? ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-jade-400 flex-1 min-w-32" />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(field.id)} disabled={loading === field.id}
                      className="p-1.5 bg-jade-600 text-white rounded-lg hover:bg-jade-700 transition-colors">
                      {loading === field.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="p-1.5 bg-white border border-stone-200 text-stone-500 rounded-lg hover:bg-stone-50 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="text-2xl">{field.icon ?? "📚"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-800 text-sm">{field.name}</span>
                      {!field.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-400 rounded">Ẩn</span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-xs text-stone-400 truncate">{field.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-stone-400 flex-shrink-0">
                    {field._count.mentors} Mentor
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(field)}
                      className="p-1.5 text-stone-400 hover:text-jade-600 hover:bg-jade-50 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(field.id, field.name)}
                      disabled={field._count.mentors > 0}
                      title={field._count.mentors > 0 ? "Không thể xoá - đang có Mentor dùng" : ""}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all";
