"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Loader2, AlertCircle } from "lucide-react";
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

// 7:00 → 21:00 in 30-min increments (29 options)
const TIME_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

/** Convert "HH:MM" to minutes since midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Check if [aStart, aEnd) overlaps [bStart, bEnd). Excludes touching boundaries (08:00-09:00 vs 09:00-10:00 OK). */
function isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = toMinutes(aStart), ae = toMinutes(aEnd);
  const bs = toMinutes(bStart), be = toMinutes(bEnd);
  return as < be && bs < ae;
}

/** Build a map of already-taken time ranges per day (excluding a specific slot id). */
function buildOccupiedMap(slots: Slot[], excludeId?: string) {
  const map = new Map<number, { start: string; end: string }[]>();
  for (const s of slots) {
    if (excludeId && s.id === excludeId) continue;
    const day = s.dayOfWeek;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push({ start: s.startTime, end: s.endTime });
  }
  return map;
}

/** Get all end-time options that don't overlap with existing slots on the same day */
function getValidEndTimeOptions(
  dayOfWeek: number,
  startTime: string,
  occupiedMap: Map<number, { start: string; end: string }[]>,
  excludeId?: string,
): string[] {
  const startMin = toMinutes(startTime);
  // Minimum slot is 30 minutes
  const minEndMin = startMin + 30;
  // End must be on or before 21:00
  const maxEndMin = 21 * 60;

  const occupied = occupiedMap.get(dayOfWeek) ?? [];

  return TIME_OPTIONS.filter((t) => {
    const endMin = toMinutes(t);
    // Must be >= 30 min after start and <= 21:00
    if (endMin < minEndMin || endMin > maxEndMin) return false;
    // Must not overlap any existing slot on the same day
    for (const occ of occupied) {
      if (isOverlapping(startTime, t, occ.start, occ.end)) return false;
    }
    return true;
  });
}

export function AvailabilityManager({ userId, mentorProfileId, slots: initialSlots }: Props) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
  });

  // Build occupied map from current slots (no exclusion for adding new)
  const occupiedMap = useMemo(() => buildOccupiedMap(slots), [slots]);

  // Get valid endTime options for the "new slot" form
  const validEndTimes = useMemo(() => {
    return getValidEndTimeOptions(newSlot.dayOfWeek, newSlot.startTime, occupiedMap);
  }, [newSlot.dayOfWeek, newSlot.startTime, occupiedMap]);

  // Auto-correct endTime when startTime changes and current endTime becomes invalid
  const effectiveEndTime = useMemo(() => {
    if (validEndTimes.includes(newSlot.endTime)) return newSlot.endTime;
    // Pick the first valid end time (30 min after start)
    return validEndTimes.length > 0 ? validEndTimes[0] : "";
  }, [newSlot.endTime, validEndTimes]);

  // When dayOfWeek changes, check if current time range is still valid
  const dayValidEndTimes = useMemo(() => {
    return getValidEndTimeOptions(newSlot.dayOfWeek, newSlot.startTime, occupiedMap);
  }, [newSlot.dayOfWeek, newSlot.startTime, occupiedMap]);

  function addSlot() {
    const endTime = dayValidEndTimes.includes(newSlot.endTime) ? newSlot.endTime : effectiveEndTime;

    if (!endTime) {
      toast.error("Không tìm thấy khung giờ kết thúc hợp lệ. Vui lòng đổi khung giờ hoặc ngày khác.");
      return;
    }

    // Double-check overlap one more time
    const existingOnDay = slots.filter((s) => s.dayOfWeek === newSlot.dayOfWeek);
    for (const existing of existingOnDay) {
      if (isOverlapping(newSlot.startTime, endTime, existing.startTime, existing.endTime)) {
        toast.error(
          `Khung giờ ${newSlot.startTime} – ${endTime} bị trùng với ${existing.startTime} – ${existing.endTime} đã có. Hãy chọn giờ khác.`,
        );
        return;
      }
    }

    const temp: Slot = { id: `temp_${Date.now()}`, dayOfWeek: newSlot.dayOfWeek, startTime: newSlot.startTime, endTime };
    setSlots([...slots, temp]);
    setAdding(false);
    // Reset form for next add
    setNewSlot({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
  }

  function removeSlot(id: string) {
    setSlots(slots.filter((s) => s.id !== id));
  }

  async function handleSave() {
    // Final server-independent validation before saving
    for (const slot of slots) {
      if (toMinutes(slot.endTime) - toMinutes(slot.startTime) < 30) {
        toast.error(`Khung giờ ${DAYS[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime} phải ít nhất 30 phút.`);
        return;
      }
    }

    // Check all pairs for overlap
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        if (a.dayOfWeek === b.dayOfWeek && isOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
          toast.error(
            `${DAYS[a.dayOfWeek]}: ${a.startTime}–${a.endTime} và ${b.startTime}–${b.endTime} bị trùng nhau.`,
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/mentor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Lỗi server");
      }
      toast.success("Đã lưu lịch trống!");
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const slotsByDay = DAYS.map((_, day) => ({
    day,
    slots: slots
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
  }));

  // Format minutes to "Xh Y phút" for display
  function formatDuration(start: string, end: string): string {
    const diff = toMinutes(end) - toMinutes(start);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h}g ${m}p`;
  }

  const totalWeeklyMinutes = slots.reduce((sum, s) => sum + (toMinutes(s.endTime) - toMinutes(s.startTime)), 0);
  const totalWeeklyHours = (totalWeeklyMinutes / 60).toFixed(1);

  return (
    <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 animate-in animate-in-delay-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-50 mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-jade-600" />
          <h2 className="font-display text-lg font-semibold text-stone-800">
            Lịch trống hàng tuần
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {slots.length > 0 && (
            <span className="text-xs text-stone-400 bg-stone-50 px-2.5 py-1 rounded-lg">
              {slots.length} khung giờ · {totalWeeklyHours}h/tuần
            </span>
          )}
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium",
              adding
                ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                : "bg-jade-50 text-jade-700 hover:bg-jade-100"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm khung giờ
          </button>
        </div>
      </div>

      {/* Add new slot form */}
      {adding && (
        <div className="mb-5 p-4 rounded-xl bg-jade-50 border border-jade-100">
          <p className="text-sm font-medium text-jade-800 mb-3">Thêm khung giờ mới</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Day select */}
            <div className="space-y-1">
              <label className="text-xs text-stone-500 font-medium">Thứ</label>
              <select
                value={newSlot.dayOfWeek}
                onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            {/* Start time select */}
            <div className="space-y-1">
              <label className="text-xs text-stone-500 font-medium">Từ giờ</label>
              <select
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
              >
                {TIME_OPTIONS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {/* End time select - filtered to only valid options */}
            <div className="space-y-1">
              <label className="text-xs text-stone-500 font-medium">Đến giờ</label>
              <select
                value={effectiveEndTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
              >
                {dayValidEndTimes.length > 0 ? (
                  dayValidEndTimes.map((t) => (
                    <option key={t} value={t}>
                      {t} ({formatDuration(newSlot.startTime, t)})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Không có giờ hợp lệ</option>
                )}
              </select>
            </div>
          </div>

          {/* Warning when no valid end times */}
          {dayValidEndTimes.length === 0 && (
            <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Khung giờ này bị trùng với lịch đã có hoặc không còn giờ kết thúc hợp lệ.
                Hãy chọn khung giờ hoặc ngày khác.
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={addSlot}
              disabled={dayValidEndTimes.length === 0}
              className="px-4 py-2 bg-jade-600 text-white text-sm rounded-lg hover:bg-jade-700 transition-colors font-medium disabled:bg-stone-200 disabled:text-stone-400"
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Weekly grid */}
      <div className="space-y-2">
        {slotsByDay
          .filter((d) => d.slots.length > 0)
          .map(({ day, slots: daySlots }) => (
            <div key={day} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 bg-jade-600 text-white">
                {DAY_SHORT[day]}
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-jade-50 border border-jade-200 rounded-lg text-xs text-jade-700 font-medium"
                  >
                    <span>{slot.startTime} – {slot.endTime}</span>
                    <span className="text-jade-400 font-normal">({formatDuration(slot.startTime, slot.endTime)})</span>
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="text-jade-400 hover:text-red-500 transition-colors ml-1"
                      title="Xoá khung giờ này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
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

      {/* Save button */}
      {/* BUG-M3 fix: bu1ecf u0111iu1ec1u kiu1ec7n slots.length===0 khu1ecfi disabled vu00e0 thu00eam confirm khi xou00e1 tu1ea5t cu1ea3 */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white text-sm rounded-xl font-medium hover:bg-stone-900 transition-all disabled:bg-stone-200 disabled:text-stone-400"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          {saving ? "u0110ang lu01b0u..." : slots.length === 0 ? "Xu00f3a tu1ea5t cu1ea3 lu1ecbch" : "Lu01b0u lu1ecbch tru1ed1ng"}
        </button>
        {slots.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Bu1ea1n cu00f3 chu1eafc chu1eafn muu1ed1n xou00e1 tu1ea5t cu1ea3 khung giu1edd? Nhu1ea5n Lu01b0u u0111u1ec3 lu01b0u thu00e0nh cu00f4ng.")) return;
              setSlots([]);
              toast.info("u0110u00e3 xou00e1 tu1ea5t cu1ea3 khung giu1edd. Nhu1ea5n Lu01b0u u0111u1ec3 xu00e1c nhu1eadn.");
            }}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors"
          >
            Xou00e1 tu1ea5t cu1ea3
          </button>
        )}
      </div>
    </section>
  );
}
