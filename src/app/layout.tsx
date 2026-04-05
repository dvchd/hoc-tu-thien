import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Học Từ Thiện – Kết nối Mentor & Mentee",
  description:
    "Nền tảng kết nối 1-1 Mentor và Mentee. Học phí được chuyển thẳng vào Quỹ Thiện Nguyện MBBank.",
  keywords: ["mentor", "mentee", "học tập", "thiện nguyện", "từ thiện"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`font-body antialiased bg-stone-50 text-stone-900`}
      >
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "font-body",
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
