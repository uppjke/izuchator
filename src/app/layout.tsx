import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-provider";
import { ToastProvider } from "@/lib/toast-provider";
import { CookieBanner } from "@/components/cookie-banner";
import { SessionProvider } from "next-auth/react";
import "sonner/dist/styles.css";
import "./globals.css";

// NOTE: Temporarily removed next/font/google Geist imports due to Turbopack
// build error ("@vercel/turbopack-next/internal/font/google/font" not found)
// which appears when fetching remote font files fails (TLS decode error in logs).
// Using system font stack fallback until remote fetch issue is resolved.

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Предотвращает zoom при фокусе на input на iOS
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "Изучатор",
  description: "Учи, Учись, Твори с Изучатором!",
  keywords: ["образование", "обучение", "репетитор", "уроки", "планирование занятий"],
  authors: [{ name: "Изучатор" }],
  creator: "Изучатор",
  publisher: "Изучатор",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://izuchator.ru",
    siteName: "Изучатор",
    title: "Изучатор - Учи, Учись, Твори!",
    description: "Образовательная платформа для учеников и преподавателей",
  },
  twitter: {
    card: "summary_large_image",
    title: "Изучатор",
    description: "Учи, Учись, Твори с Изучатором!",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
    other: [
      {
        rel: "apple-touch-icon",
        url: "/logo.svg",
      },
      {
        rel: "apple-touch-icon-precomposed",
        url: "/logo.svg",
      },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="light">
      <body className="antialiased bg-white">
        <QueryProvider>
          <SessionProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </SessionProvider>
        </QueryProvider>
        <ToastProvider />
        <CookieBanner />
      </body>
    </html>
  );
}
