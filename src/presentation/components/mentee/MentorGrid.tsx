"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Star, Sparkles, ArrowRight } from "lucide-react";

interface MentorItem {
  id: string;
  name: string;
  image?: string | null;
  bio: string;
  expertise: string;
}

export function MentorGrid({ mentors }: { mentors: MentorItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = mentors.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.expertise.toLowerCase().includes(q) ||
      m.bio.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-semibold text-stone-800">
          Tìm Mentor phù hợp
        </h2>
        <Link
          href="/dashboard/mentee/find-mentor"
          className="flex items-center gap-1.5 text-sm text-jade-600 hover:text-jade-700 font-medium"
        >
          Xem tất cả
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm theo chuyên môn, tên mentor..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 transition-all"
        />
      </div>

      {/* Mentor cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">
          Không tìm thấy mentor phù hợp với &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mentor) => (
            <Link
              key={mentor.id}
              href={`/dashboard/mentee/mentor/${mentor.id}`}
              className="p-5 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg hover:border-jade-200 transition-all duration-300 hover:-translate-y-1 group block"
            >
              {/* Avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-jade-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {mentor.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-stone-800 text-sm truncate">
                    {mentor.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600 text-xs">{mentor.expertise}</span>
                  </div>
                </div>
              </div>

              <p className="text-stone-500 text-xs leading-relaxed line-clamp-2 mb-4">
                {mentor.bio}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="text-xs text-stone-400 ml-1">4.9</span>
                </div>
                <span className="px-3 py-1.5 bg-jade-600 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  Kết nối
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
