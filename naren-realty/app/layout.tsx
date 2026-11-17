import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import MobileBottomNav from "./components/MobileBottomNav";
import NotificationBell from "./components/NotificationBell";
import InstallAppPrompt from "./components/InstallAppPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NAREN REALTY",
  description: "Find properties and accommodation with NAREN REALTY.",
  applicationName: "NAREN REALTY",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "NAREN REALTY",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10243A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen">
        {children}
        <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-600">
          <Link href="/referral-policy" className="font-semibold text-[#10243A] underline underline-offset-4">Referral &amp; Reward Policy</Link>
          <span className="mx-2 text-slate-300">·</span>
          <Link href="/privacy-policy" className="font-semibold text-[#10243A] underline underline-offset-4">Privacy Policy</Link>
        </footer>
        <NotificationBell />
        <InstallAppPrompt />
        <Suspense><MobileBottomNav /></Suspense>
      </body>
    </html>
  );
}
