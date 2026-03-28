"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "react-hot-toast";
import { Search, Loader2, Calendar, Clock, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  title: string;
  mentor: { id: string; name: string };
  mentee: { id: string; name: string };
  status: string;
  startTime: string;
  endTime: string;
  price: number;
}

export function AdminSessionsTable() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      toast.error("Không thể tải danh sách buổi học");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Chờ xác nhận</span>;
      case "ACCEPTED":
      case "SCHEDULED":
        return <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Đã lên lịch</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 text-xs font-medium bg-jade-100 text-jade-700 rounded-full">Đã hoàn thành</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium bg-stone-100 text-stone-700 rounded-full">{status}</span>;
    }
  };

  const filteredSessions = sessions.filter(session => 
    session.title?.toLowerCase().includes(search.toLowerCase()) ||
    session.mentor?.name?.toLowerCase().includes(search.toLowerCase()) ||
    session.mentee?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm buổi học, mentor, mentee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-10 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jade-500/20 focus:border-jade-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600">
          <thead className="bg-stone-50/80 text-stone-500 font-medium border-b border-stone-200">
            <tr>
              <th className="px-6 py-4">Buổi học</th>
              <th className="px-6 py-4">Mentor / Mentee</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-jade-600 mx-auto" />
                  <p className="mt-2 text-stone-500 text-sm">Đang tải dữ liệu...</p>
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-stone-400" />
                  </div>
                  <p className="text-stone-900 font-medium">Không tìm thấy buổi học</p>
                  <p className="text-stone-500 text-sm mt-1">Thử điều chỉnh từ khóa tìm kiếm</p>
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-stone-900 line-clamp-1">{session.title}</div>
                    <div className="text-xs text-stone-500 mt-1">{session.price?.toLocaleString("vi-VN")} VND</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-amber-700" />
                      </div>
                      <span className="font-medium text-stone-700 truncate">{session.mentor?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-jade-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-jade-700" />
                      </div>
                      <span className="text-stone-600 truncate">{session.mentee?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-stone-700 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {session.startTime ? format(new Date(session.startTime), "dd/MM/yyyy", { locale: vi }) : "N/A"}
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-500 text-xs">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {session.startTime ? format(new Date(session.startTime), "HH:mm") : ""} - {session.endTime ? format(new Date(session.endTime), "HH:mm") : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(session.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
