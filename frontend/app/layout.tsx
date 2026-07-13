import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/notification/Toast";
import { QuotaExceededHandler } from "@/components/notification/QuotaExceededHandler";
import { ConfettiProvider } from "@/components/ui/Confetti";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Knowledge Intelligence Platform",
  description: "AI-powered learning and progress tracking",
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KIP',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3b82f6" media="(prefers-color: light)" />
        <meta name="theme-color" content="#1e3a5f" media="(prefers-color: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfettiProvider>
                {children}
              </ConfettiProvider>
              <QuotaExceededHandler />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
