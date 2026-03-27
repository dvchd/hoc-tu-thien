"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { cn, formatVND } from "@/lib/utils";
import {
  Search, Star, Clock, Users, X, ChevronRight,
  Calendar, Video, DollarSign, Loader2, BookOpen, Filter, CheckCircle2,
} from "lucide-react";

interface Field { id: string; name: string; icon: string | null; }
interface Slot { dayOfWeek: number; startTime: string; endTime: string; }
interface MentorData {
  id: string; name: string | null; image: string | null; bio: string | null;
  profile: {
    headline: string | null; expertise: string | null; experience: number | null;
    hourlyRate: number | null; isAvailable: boolean; rating: number;
    ratingCount: number; totalSessions: number; tnAccountNo: string | null;
    fields: Field[]; slots: Slot[];
  } | null;
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAYS_FULL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function FindMentorClient({
  mentors, allFields, currentUserId,
}: { mentors: MentorData[]; allFields: Field[]; currentUserId: string }) {
  const [search, setSearch] = useState("");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorData | null>(null);
  const [booking, setBooking] = useState({
    dayOfWeek: -1, slotIndex: -1, title: "", description: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      if (!m.profile?.isAvailable) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.name?.toLowerCase().includes(q) &&
          !m.profile?.headline?.toLowerCase().includes(q) &&
          !m.profile?.expertise?.toLowerCase().includes(q) &&
          !m.profile?.fields.some((f) => f.name.toLowerCase().includes(q))
        ) return false;
      }
      if (selectedField && !m.profile?.fields.some((f) => f.id === selectedField)) return false;
      if (onlyFree && (m.profile?.hourlyRate ?? 0) > 0) return false;
      return true;
    });
  }, [mentors, search, selectedField, onlyFree]);

  // Build next 4-week available slots
  function buildAvailableDates(mentor: MentorData) {
    if (!mentor.profile?.slots.length) return [];
    const today = new Date();
    const dates: { date: Date; slot: Slot }[] = [];
    for (let d = 0; d < 28 && dates.length < 12; d++) {
      const date = addDays(today, d + 1);
      const dow = date.getDay();
      const matchSlots = mentor.profile.slots.filter((s) => s.dayOfWeek === dow);
      matchSlots.forEach((s) => dates.push({ date, slot: s }));
    }
    return dates.slice(0, 12);
  }

  async function handleBook() {
    if (!selectedMentor || booking.dayOfWeek < 0 || booking.slotIndex < 0) {
      toast.error("Vui lòng chọn khung giờ học");
      return;
    }
    if (!booking.title.trim()) {
      toast.error("Vui lòng nhập chủ đề buổi học");
      return;
    }

    const available = buildAvailableDates(selectedMentor);
    const picked = available.find(
      (a, i) => a.date.getDay() === booking.dayOfWeek && i === booking.slotIndex
    );
    if (!picked) { toast.error("Không tìm thấy khung giờ"); return; }

    const [h, m] = picked.slot.startTime.split(":").map(Number);
    const scheduledAt = new Date(picked.date);
    scheduledAt.setHours(h, m, 0, 0);

    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          title: booking.title,
          description: booking.description,
          notes: booking.notes,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("🎉 Đã đặt lịch thành công! Mentor sẽ xác nhận sớm.");
      setSelectedMentor(null);
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  const availableDates = selectedMentor ? buildAvailableDates(selectedMentor) : [];

  return (
    <>
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in animate-in-delay-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, chuyên môn, lĩnh vực..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm cursor-pointer hover:border-jade-300">
            <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} className="accent-jade-600" />
            <span className="text-stone-600">Miễn phí</span>
          </label>
        </div>
      </div>

      {/* Field filter pills */}
      {allFields.length > 0 && (
        <div className="flex gap-2 flex-wrap animate-in animate-in-delay-1">
          <button onClick={() => setSelectedField(null)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
              !selectedField ? "bg-jade-600 text-white border-jade-600" : "bg-white border-stone-200 text-stone-600 hover:border-jade-300")}>
            Tất cả
          </button>
          {allFields.map((f) => (
            <button key={f.id} onClick={() => setSelectedField(selectedField === f.id ? null : f.id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                selectedField === f.id ? "bg-jade-600 text-white border-jade-600" : "bg-white border-stone-200 text-stone-600 hover:border-jade-300")}>
              <span>{f.icon ?? "📚"}</span>{f.name}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-stone-400 animate-in animate-in-delay-2">
        {filtered.length} Mentor phù hợp
      </p>

      {/* Mentor grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in animate-in-delay-2">
        {filtered.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-stone-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Không tìm thấy Mentor phù hợp</p>
          </div>
        ) : filtered.map((mentor) => (
          <div key={mentor.id}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg hover:border-jade-200 transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
            onClick={() => { setSelectedMentor(mentor); setBooking({ dayOfWeek: -1, slotIndex: -1, title: "", description: "", notes: "" }); }}>
            <div className="p-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-jade-400 to-emerald-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {mentor.name?.split(" ").slice(-2).map((n) => n[0]).join("") ?? "M"}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-stone-800 truncate">{mentor.name}</div>
                  {mentor.profile?.headline && (
                    <div className="text-stone-400 text-xs truncate mt-0.5">{mentor.profile.headline}</div>
                  )}
                </div>
              </div>

              {/* Fields */}
              {mentor.profile?.fields.length ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {mentor.profile.fields.slice(0, 3).map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-jade-50 text-jade-700 text-xs rounded-lg">
                      {f.icon ?? "📚"} {f.name}
                    </span>
                  ))}
                  {mentor.profile.fields.length > 3 && (
                    <span className="text-xs text-stone-400 self-center">+{mentor.profile.fields.length - 3}</span>
                  )}
                </div>
              ) : null}

              {/* Bio */}
              {mentor.bio && (
                <p className="text-stone-500 text-xs line-clamp-2 mb-4">{mentor.bio}</p>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-stone-400">
                  {mentor.profile?.experience && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mentor.profile.experience}n KN</span>
                  )}
                  {(mentor.profile?.ratingCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400" />{mentor.profile?.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className={cn("font-semibold", (mentor.profile?.hourlyRate ?? 0) === 0 ? "text-jade-600" : "text-stone-700")}>
                  {(mentor.profile?.hourlyRate ?? 0) === 0 ? "Miễn phí" : formatVND(mentor.profile!.hourlyRate!)}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50/60 border-t border-stone-50 flex items-center justify-between">
              <div className="text-xs text-stone-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />{mentor.profile?.totalSessions ?? 0} buổi
                </span>
              </div>
              <div className="flex items-center gap-1 text-jade-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Xem & đặt lịch <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setSelectedMentor(null)}>
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jade-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                  {selectedMentor.name?.split(" ").slice(-2).map((n) => n[0]).join("") ?? "M"}
                </div>
                <div>
                  <div className="font-semibold text-stone-800">{selectedMentor.name}</div>
                  <div className="text-stone-400 text-xs">{selectedMentor.profile?.headline}</div>
                </div>
              </div>
              <button onClick={() => setSelectedMentor(null)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Profile details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">Học phí / buổi</p>
                  <p className={cn("font-bold", (selectedMentor.profile?.hourlyRate ?? 0) === 0 ? "text-jade-600" : "text-stone-800")}>
                    {(selectedMentor.profile?.hourlyRate ?? 0) === 0 ? "Miễn phí 🎁" : formatVND(selectedMentor.profile!.hourlyRate!)}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">Kinh nghiệm</p>
                  <p className="font-bold text-stone-800">{selectedMentor.profile?.experience ?? 0} năm</p>
                </div>
              </div>

              {selectedMentor.profile?.expertise && (
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">Về Mentor</p>
                  <p className="text-sm text-stone-500 leading-relaxed">{selectedMentor.profile.expertise}</p>
                </div>
              )}

              {/* Fields */}
              {selectedMentor.profile?.fields.length ? (
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">Lĩnh vực</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMentor.profile.fields.map((f) => (
                      <span key={f.id} className="px-2.5 py-1.5 bg-jade-50 text-jade-700 text-xs rounded-lg font-medium">
                        {f.icon ?? "📚"} {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Available slots */}
              <div>
                <p className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-jade-600" />
                  Chọn thời gian học
                </p>
                {availableDates.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 bg-stone-50 rounded-xl">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Mentor chưa cập nhật lịch trống</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableDates.map(({ date, slot }, i) => {
                      const isSelected = booking.dayOfWeek === date.getDay() && booking.slotIndex === i;
                      return (
                        <button key={i} type="button"
                          onClick={() => setBooking({ ...booking, dayOfWeek: date.getDay(), slotIndex: i })}
                          className={cn("p-3 rounded-xl border text-left transition-all text-xs",
                            isSelected ? "bg-jade-600 border-jade-600 text-white" : "bg-white border-stone-200 hover:border-jade-300 text-stone-700")}>
                          <div className="font-semibold">{DAYS_FULL[date.getDay()]}</div>
                          <div className={isSelected ? "text-jade-100" : "text-stone-400"}>
                            {format(date, "dd/MM")}
                          </div>
                          <div className={cn("font-mono mt-1", isSelected ? "text-white" : "text-stone-600")}>
                            {slot.startTime} – {slot.endTime}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Booking form */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-stone-700">Thông tin buổi học</p>
                <input value={booking.title} onChange={(e) => setBooking({ ...booking, title: e.target.value })}
                  placeholder="Chủ đề buổi học (VD: Học ReactJS Hooks cơ bản) *"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100" />
                <textarea value={booking.description} onChange={(e) => setBooking({ ...booking, description: e.target.value })}
                  placeholder="Mô tả chi tiết những gì bạn muốn học..."
                  rows={2} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 resize-none" />
                <textarea value={booking.notes} onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                  placeholder="Ghi chú cho Mentor (trình độ hiện tại, câu hỏi cụ thể...)"
                  rows={2} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 resize-none" />
              </div>

              {/* Payment notice */}
              {(selectedMentor.profile?.hourlyRate ?? 0) > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700 flex items-start gap-2">
                    <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Học phí <strong>{formatVND(selectedMentor.profile!.hourlyRate!)}</strong> sẽ được thanh toán sau buổi học qua chuyển khoản MBBank đến Quỹ Thiện Nguyện App tài khoản{" "}
                      <strong>{selectedMentor.profile?.tnAccountNo ?? "của Mentor"}</strong>.
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex items-center gap-3 flex-shrink-0 bg-stone-50/60">
              <button onClick={() => setSelectedMentor(null)}
                className="px-5 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors">
                Huỷ
              </button>
              <button onClick={handleBook} disabled={submitting || booking.slotIndex < 0 || !booking.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-jade-600 text-white rounded-xl text-sm font-semibold hover:bg-jade-700 transition-all disabled:bg-stone-200 disabled:text-stone-400">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {submitting ? "Đang đặt lịch..." : "Xác nhận đặt lịch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
