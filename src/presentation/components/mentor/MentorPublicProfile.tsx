"use client";

import { useState } from "react";
import { Star, Clock, User, BookOpen, GraduationCap, Calendar, Linkedin, Video, Loader2, X, DollarSign, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS_FULL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

interface MentorPublicProfileResult {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    lateCancellationCount: number;
  };
  profile: {
    headline: string | null;
    expertise: string | null;
    experience: number | null;
    hourlyRate: number | null;
    isAvailable: boolean;
    totalSessions: number;
    rating: number;
    ratingCount: number;
    onlyActivatedMentee: boolean;
    charityAccount: { name: string; accountNo: string } | null;
  };
  teachingFields: { id: string; name: string; icon: string | null }[];
  availabilitySlots: Slot[];
}

interface MentorPublicProfileProps {
  mentor: MentorPublicProfileResult;
}

export function MentorPublicProfile({ mentor }: MentorPublicProfileProps) {
  const [showBooking, setShowBooking] = useState(false);
  const [booking, setBooking] = useState({
    dayOfWeek: -1, slotIndex: -1, selectedFieldId: "", title: "", description: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function buildAvailableDates() {
    if (!mentor.availabilitySlots.length) return [];
    const today = new Date();
    const dates: { date: Date; slot: Slot }[] = [];
    for (let d = 0; d < 28 && dates.length < 12; d++) {
      const date = addDays(today, d + 1);
      const dow = date.getDay();
      const matchSlots = mentor.availabilitySlots.filter((s) => s.dayOfWeek === dow);
      matchSlots.forEach((s) => dates.push({ date, slot: s }));
    }
    return dates.slice(0, 12);
  }

  const availableDates = buildAvailableDates();

  async function handleBook() {
    if (booking.dayOfWeek < 0 || booking.slotIndex < 0) {
      toast.error("Vui lòng chọn khung giờ học");
      return;
    }
    if (!booking.selectedFieldId) {
      toast.error("Vui lòng chọn lĩnh vực học");
      return;
    }
    if (!booking.title.trim()) {
      toast.error("Vui lòng nhập chủ đề buổi học");
      return;
    }

    const picked = availableDates.find(
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
          mentorId: mentor.user.id,
          teachingFieldId: booking.selectedFieldId,
          title: booking.title,
          description: booking.description,
          notes: booking.notes,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Đã đặt lịch thành công! Mentor sẽ xác nhận sớm.");
      setShowBooking(false);
      setBooking({ dayOfWeek: -1, slotIndex: -1, selectedFieldId: "", title: "", description: "", notes: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        {/* Cover/Header Area */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              <div className="w-32 h-32 rounded-3xl border-4 border-white overflow-hidden bg-stone-100 shadow-lg flex-shrink-0">
                {mentor.user.image ? (
                  <img src={mentor.user.image} alt={mentor.user.name ?? "Mentor"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <User size={64} />
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-stone-900">{mentor.user.name}</h1>
                <p className="text-stone-500 font-medium">{mentor.profile.headline || "Mentor tại Học Từ Thiện"}</p>
                <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full text-sm font-bold">
                    <Star size={14} fill="currentColor" />
                    {mentor.profile.ratingCount > 0 ? mentor.profile.rating.toFixed(1) : "N/A"}
                  </div>
                  <div className="text-stone-400 text-sm">{mentor.profile.totalSessions} buổi học đã dạy</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="bg-jade-50 text-jade-700 px-4 py-3 rounded-2xl border border-jade-100 text-center">
                <span className="text-xs font-bold uppercase tracking-wider block mb-1">Mức phí đóng góp</span>
                <span className="text-xl font-bold">
                  {mentor.profile.hourlyRate ? formatVND(mentor.profile.hourlyRate) : "Miễn phí"}
                </span>
                <span className="text-xs block opacity-80">mỗi giờ học</span>
              </div>
              {mentor.profile.isAvailable && (
                <button
                  onClick={() => setShowBooking(true)}
                  className="px-5 py-3 bg-jade-600 text-white font-semibold rounded-2xl hover:bg-jade-700 transition-colors text-sm"
                >
                  Kết nối & Đặt lịch
                </button>
              )}
              {!mentor.profile.isAvailable && (
                <div className="px-4 py-2 bg-stone-100 text-stone-400 font-medium rounded-2xl text-sm text-center">
                  Mentor tạm không nhận học viên
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <User size={20} className="text-indigo-600" /> Giới thiệu
                </h2>
                <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {mentor.profile.expertise || "Chưa có thông tin giới thiệu."}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-indigo-600" /> Chuyên môn & Kỹ năng
                </h2>
                <div className="flex flex-wrap gap-2">
                  {mentor.teachingFields?.map((tf) => (
                    <span key={tf.id} className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm font-medium">
                      {tf.icon && <span className="mr-1">{tf.icon}</span>}{tf.name}
                    </span>
                  ))}
                  {(!mentor.teachingFields || mentor.teachingFields.length === 0) && (
                    <span className="text-stone-400 italic">Chưa cập nhật lĩnh vực giảng dạy.</span>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <GraduationCap size={20} className="text-indigo-600" /> Kinh nghiệm
                </h2>
                <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {mentor.profile.experience ? `${mentor.profile.experience} năm kinh nghiệm` : "Chưa cập nhật kinh nghiệm."}
                </p>
              </section>
            </div>

            {/* Right Column: Sidebar info */}
            <div className="space-y-6">
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                <h3 className="font-bold text-stone-900 mb-4">Thông tin thêm</h3>
                <div className="space-y-4">
                  {mentor.profile.experience && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <Clock size={18} className="text-stone-400" />
                      <span className="text-sm">{mentor.profile.experience} năm kinh nghiệm</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-stone-600">
                     <Calendar size={18} className="text-stone-400" />
                     <span className="text-sm">
                       {mentor.availabilitySlots.length > 0
                         ? `${mentor.availabilitySlots.length} khung giờ trống mỗi tuần`
                         : "Chưa cập nhật lịch trống"}
                     </span>
                   </div>
                  {mentor.user.lateCancellationCount > 0 && (
                    <div className="flex items-center gap-3 text-amber-600">
                      <AlertTriangle size={18} className="text-amber-400" />
                      <span className="text-sm">
                        {mentor.user.lateCancellationCount} lần hủy muộn
                      </span>
                    </div>
                  )}
                 </div>
              </div>

              {mentor.profile.charityAccount && (
                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                  <h3 className="font-bold text-indigo-900 mb-2">Quỹ từ thiện hỗ trợ</h3>
                  <p className="text-sm text-indigo-700 mb-4">Mọi khoản học phí bạn đóng sẽ được chuyển trực tiếp đến quỹ:</p>
                  <div className="bg-white rounded-xl p-4 border border-indigo-200">
                    <p className="font-bold text-indigo-900">{mentor.profile.charityAccount.name}</p>
                    <p className="text-xs text-indigo-500 mt-1">TK: {mentor.profile.charityAccount.accountNo}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowBooking(false)}
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jade-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                  {mentor.user.name?.split(" ").slice(-2).map((n) => n[0]).join("") ?? "M"}
                </div>
                <div>
                  <div className="font-semibold text-stone-800">{mentor.user.name}</div>
                  <div className="text-stone-400 text-xs">{mentor.profile.headline}</div>
                </div>
              </div>
              <button
                onClick={() => setShowBooking(false)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Profile details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">Học phí / buổi</p>
                  <p className={cn("font-bold", (mentor.profile.hourlyRate ?? 0) === 0 ? "text-jade-600" : "text-stone-800")}>
                    {(mentor.profile.hourlyRate ?? 0) === 0 ? "Miễn phí" : formatVND(mentor.profile.hourlyRate!)}
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-400 mb-1">Kinh nghiệm</p>
                  <p className="font-bold text-stone-800">{mentor.profile.experience ?? 0} năm</p>
                </div>
              </div>

              {/* Teaching field selection */}
              {mentor.teachingFields.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-jade-600" />
                    Chọn lĩnh vực muốn học <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mentor.teachingFields.map((f) => (
                      <button key={f.id} type="button"
                        onClick={() => setBooking({ ...booking, selectedFieldId: booking.selectedFieldId === f.id ? "" : f.id })}
                        className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-left",
                          booking.selectedFieldId === f.id
                            ? "bg-jade-600 border-jade-600 text-white"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:border-jade-300 hover:bg-jade-50")}>
                        {booking.selectedFieldId === f.id && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span>{f.icon ?? "📚"}</span>
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                  {!booking.selectedFieldId && (
                    <p className="text-xs text-stone-400 mt-2">Vui lòng chọn ít nhất một lĩnh vực</p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-stone-400 bg-stone-50 rounded-xl">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Mentor chưa cập nhật lĩnh vực giảng dạy</p>
                </div>
              )}

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
                        <button
                          key={i}
                          type="button"
                          onClick={() => setBooking({ ...booking, dayOfWeek: date.getDay(), slotIndex: i })}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all text-xs",
                            isSelected
                              ? "bg-jade-600 border-jade-600 text-white"
                              : "bg-white border-stone-200 hover:border-jade-300 text-stone-700"
                          )}
                        >
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
                <input
                  value={booking.title}
                  onChange={(e) => setBooking({ ...booking, title: e.target.value })}
                  placeholder="Chủ đề buổi học (VD: Học ReactJS Hooks cơ bản) *"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                />
                <textarea
                  value={booking.description}
                  onChange={(e) => setBooking({ ...booking, description: e.target.value })}
                  placeholder="Mô tả chi tiết những gì bạn muốn học..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 resize-none"
                />
                <textarea
                  value={booking.notes}
                  onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                  placeholder="Ghi chú cho Mentor (trình độ hiện tại, câu hỏi cụ thể...)"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 resize-none"
                />
              </div>

              {/* Payment notice */}
              {(mentor.profile.hourlyRate ?? 0) > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700 flex items-start gap-2">
                    <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Học phí <strong>{formatVND(mentor.profile.hourlyRate!)}</strong> sẽ được thanh toán sau buổi học qua chuyển khoản MBBank đến Quỹ Thiện Nguyện.
                      {mentor.profile.charityAccount && (
                        <> TK: <strong>{mentor.profile.charityAccount.accountNo}</strong></>
                      )}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex items-center gap-3 flex-shrink-0 bg-stone-50/60">
              <button
                onClick={() => setShowBooking(false)}
                className="px-5 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleBook}
                disabled={submitting || booking.slotIndex < 0 || !booking.selectedFieldId || !booking.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-jade-600 text-white rounded-xl text-sm font-semibold hover:bg-jade-700 transition-all disabled:bg-stone-200 disabled:text-stone-400"
              >
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
