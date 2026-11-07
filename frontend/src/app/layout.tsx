import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Assistant } from "@/components/assistant/assistant";
import { SiteControlsProvider } from "@/components/assistant/site-controls";
import { VideoOverlay } from "@/components/assistant/video-overlay";
import { AppShell } from "@/components/layout/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "SpamShield AI · Spam Detection Using Machine Learning",
    template: "%s · SpamShield AI",
  },
  description:
    "A cybersecurity-focused platform that trains and evaluates ten machine learning models to detect SMS spam, phishing, and malicious messaging.",
};

export const viewport: Viewport = {
  themeColor: "#05080f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <TooltipProvider delayDuration={150}>
          <SiteControlsProvider>
            <AppShell>{children}</AppShell>
            <Assistant />
            <VideoOverlay />
          </SiteControlsProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
