import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DesktopMaximizeOverlay from "@/components/layout/DesktopMaximizeOverlay";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ThemeProvider from "@/components/layout/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "withsoon — Data Engineering Designs",
  description: "Interactive data engineering interview designs for Netflix, Uber, and YouTube.",
  metadataBase: new URL("https://withsoon.com"),
  openGraph: {
    title: "withsoon — Data Engineering Designs",
    description: "Chapter-by-chapter data engineering architecture interview preparation.",
    url: "https://withsoon.com",
    siteName: "withsoon",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider>
          <Navbar />
          <DesktopMaximizeOverlay />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
