import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Học Từ Thiện – Kết nối Mentor & Mentee",
  description:
    "Nền tảng kết nối 1-1 Mentor và Mentee. Học phí được chuyển thẳng vào Quỹ Thiện Nguyện MBBank.",
  keywords: ["mentor", "mentee", "học tập", "thiện nguyện", "từ thiện"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${beVietnamPro.variable} ${playfair.variable} font-body antialiased bg-stone-50 text-stone-900`}
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
