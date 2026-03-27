"use client";

import { Star, Clock, User, BookOpen, GraduationCap, Calendar, MapPin, Mail, Linkedin } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface MentorPublicProfileProps {
  mentor: any; // Type following domain MentorProfile
}

export function MentorPublicProfile({ mentor }: MentorPublicProfileProps) {
  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Cover/Header Area */}
      <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
      
      <div className="px-8 pb-8 -mt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="w-32 h-32 rounded-3xl border-4 border-white overflow-hidden bg-stone-100 shadow-lg">
              {mentor.user.image ? (
                <img src={mentor.user.image} alt={mentor.user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <User size={64} />
                </div>
              )}
            </div>
            <div className="text-center md:text-left pb-2">
              <h1 className="text-3xl font-bold text-stone-900">{mentor.user.name}</h1>
              <p className="text-stone-500 font-medium">{mentor.headline || "Mentor tại Học Từ Thiện"}</p>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                 <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full text-sm font-bold">
                   <Star size={14} fill="currentColor" />
                   {mentor.averageRating || "N/A"}
                 </div>
                 <div className="text-stone-400 text-sm">{mentor.totalSessions || 0} buổi học đã dạy</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
             <div className="bg-jade-50 text-jade-700 px-4 py-3 rounded-2xl border border-jade-100 text-center">
                <span className="text-xs font-bold uppercase tracking-wider block mb-1">Mức phí đóng góp</span>
                <span className="text-xl font-bold">{formatVND(mentor.hourlyRate)}</span>
                <span className="text-xs block opacity-80">mỗi giờ học</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-indigo-600" /> Giới thiệu
              </h2>
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{mentor.bio || "Chưa có thông tin giới thiệu."}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" /> Chuyên môn & Kỹ năng
              </h2>
              <div className="flex flex-wrap gap-2">
                {mentor.teachingFields?.map((tf: any) => (
                  <span key={tf.id} className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm font-medium">
                    {tf.field.name}
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
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{mentor.experience || "Chưa cập nhật kinh nghiệm."}</p>
            </section>
          </div>

          {/* Right Column: Sidebar info */}
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
               <h3 className="font-bold text-stone-900 mb-4">Thông tin thêm</h3>
               <div className="space-y-4">
                 <div className="flex items-center gap-3 text-stone-600">
                    <Calendar size={18} className="text-stone-400" />
                    <span className="text-sm">Tham gia từ {format(new Date(mentor.createdAt), 'MM/yyyy', { locale: vi })}</span>
                 </div>
                 {mentor.linkedinUrl && (
                   <div className="flex items-center gap-3 text-stone-600">
                      <Linkedin size={18} className="text-stone-400" />
                      <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">LinkedIn Profile</a>
                   </div>
                 )}
                 <div className="flex items-center gap-3 text-stone-600">
                    <MapPin size={18} className="text-stone-400" />
                    <span className="text-sm">Vietnam</span>
                 </div>
               </div>
            </div>

            <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
               <h3 className="font-bold text-indigo-900 mb-2">Quỹ từ thiện hỗ trợ</h3>
               <p className="text-sm text-indigo-700 mb-4">Mọi khoản học phí bạn đóng sẽ được chuyển trực tiếp đến quỹ:</p>
               <div className="bg-white rounded-xl p-4 border border-indigo-200">
                  <p className="font-bold text-indigo-900">{mentor.charityAccount?.name || "Học Từ Thiện Foundation"}</p>
                  <p className="text-xs text-indigo-500 mt-1">{mentor.charityAccount?.bankName}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
