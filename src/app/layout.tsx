import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "withsoon — AI tools, LLM guides & experiments",
  description:
    "Your one-stop platform for LLM comparisons, RAG pipelines, AI tutorials, and hands-on experiments.",
  metadataBase: new URL("https://withsoon.com"),
  openGraph: {
    title: "withsoon",
    description: "AI guides, LLM comparisons, and hands-on experiments.",
    url: "https://withsoon.com",
    siteName: "withsoon",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
