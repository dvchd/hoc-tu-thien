"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Props {
  userId: string;
  mentorProfileId: string | null;
  slots: Slot[];
}

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const DAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7; // 7:00 → 20:00
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

export function AvailabilityManager({ userId, mentorProfileId, slots: initialSlots }: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
  });

  function addSlot() {
    if (newSlot.startTime >= newSlot.endTime) {
      toast.error("Giờ bắt đầu phải trước giờ kết thúc");
      return;
    }
    const temp: Slot = { id: `temp_${Date.now()}`, ...newSlot };
    setSlots([...slots, temp]);
    setAdding(false);
  }

  function removeSlot(id: string) {
    setSlots(slots.filter((s) => s.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/mentor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi server");
      toast.success("Đã lưu lịch trống!");
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const slotsByDay = DAYS.map((_, day) => ({
    day,
    slots: slots.filter((s) => s.dayOfWeek === day),
  }));

  return (
    <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 animate-in animate-in-delay-2">
      <div className="flex items-center justify-between pb-3 border-b border-stone-50 mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-jade-600" />
          <h2 className="font-display text-lg font-semibold text-stone-800">
            Lịch trống hàng tuần
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-jade-50 text-jade-700 rounded-lg hover:bg-jade-100 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm khung giờ
        </button>
      </div>

      {/* Add new slot form */}
      {adding && (
        <div className="mb-5 p-4 rounded-xl bg-jade-50 border border-jade-100">
          <p className="text-sm font-medium text-jade-800 mb-3">Thêm khung giờ mới</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-stone-500">Thứ</label>
              <select
                value={newSlot.dayOfWeek}
                onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-jade-400"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-stone-500">Từ</label>
              <select
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-jade-400"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-stone-500">Đến</label>
              <select
                value={newSlot.endTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-jade-400"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={addSlot}
              className="px-4 py-2 bg-jade-600 text-white text-sm rounded-lg hover:bg-jade-700 transition-colors font-medium">
              Thêm
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors">
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Weekly grid */}
      <div className="space-y-2">
        {slotsByDay.filter((d) => d.slots.length > 0 || d.day >= 1).map(({ day, slots: daySlots }) => (
          <div key={day} className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
              daySlots.length > 0 ? "bg-jade-600 text-white" : "bg-stone-100 text-stone-400"
            )}>
              {DAY_SHORT[day]}
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {daySlots.length === 0 ? (
                <span className="text-xs text-stone-300 mt-2">Không có lịch</span>
              ) : (
                daySlots.map((slot) => (
                  <div key={slot.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-jade-50 border border-jade-200 rounded-lg text-xs text-jade-700 font-medium">
                    {slot.startTime} – {slot.endTime}
                    <button type="button" onClick={() => removeSlot(slot.id)}
                      className="text-jade-400 hover:text-red-500 transition-colors ml-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {slots.length === 0 && !adding && (
        <div className="text-center py-8 text-stone-400">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa có lịch trống. Hãy thêm khung giờ để Mentee đặt lịch.</p>
        </div>
      )}

      <button type="button" onClick={handleSave} disabled={saving}
        className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white text-sm rounded-xl font-medium hover:bg-stone-900 transition-all disabled:bg-stone-200 disabled:text-stone-400">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
        {saving ? "Đang lưu..." : "Lưu lịch trống"}
      </button>
    </section>
  );
}
