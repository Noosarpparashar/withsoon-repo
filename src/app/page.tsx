import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Engineering Designs | withsoon",
  description: "Interactive, chapter-by-chapter data engineering interview designs for Netflix, Uber, and YouTube.",
  alternates: { canonical: "https://withsoon.com" },
};

const COMPANIES = [
  { name: "Netflix", logo: "/logo-netflix.webp", tagline: "Streaming data at global scale", topics: "Playback · QoE · Lakehouse", href: "/data-engineering/netflix/start-here", chapters: 10 },
  { name: "Uber", logo: "/logo-uber.png", tagline: "Real-time marketplace data", topics: "Trips · Streaming · Reconciliation", href: "/data-engineering/uber/start-here", chapters: 9 },
  { name: "YouTube", logo: "/logo-youtube.webp", tagline: "Video analytics and data platform", topics: "Watch time · Creators · Quality", href: "/data-engineering/youtube/start-here", chapters: 9 },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#f4f7fb] text-[#17202b]">
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-7 sm:py-16">
        <header className="relative overflow-hidden rounded-[30px] border border-[#d6e1eb] bg-white px-6 py-10 shadow-[0_24px_70px_rgba(72,91,108,.10)] sm:px-10 sm:py-14">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#e7eef5] blur-3xl" aria-hidden />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#65798b]">Data Engineering Interview Library</p>
            <h1 className="mt-5 text-4xl font-bold tracking-[-.055em] text-[#17202b] sm:text-6xl">Design data platforms that operate at company scale.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#526171] sm:text-base">Interactive architecture tracks built for big-data interviews. Follow each company chapter by chapter, inspect every component, and practise the decisions behind the design.</p>
            <a href="#data-engineering-designs" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#17202b] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#273544]">Explore designs <span aria-hidden>↓</span></a>
          </div>
        </header>

        <section id="data-engineering-designs" className="scroll-mt-24 py-12" aria-labelledby="designs-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#76879a]">Company tracks</p>
              <h2 id="designs-heading" className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Data Engineering Designs</h2>
            </div>
            <span className="rounded-full border border-[#d6e1eb] bg-white px-3 py-1.5 text-[10px] font-bold text-[#65798b]">3 complete tracks</span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {COMPANIES.map((company) => (
              <Link key={company.name} href={company.href} className="group rounded-[24px] border border-[#d6e1eb] bg-white p-6 shadow-[0_10px_35px_rgba(72,91,108,.06)] transition duration-300 hover:-translate-y-2 hover:border-[#8197aa] hover:shadow-[0_25px_60px_rgba(72,91,108,.16)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6e1eb] bg-[#eef4f9]"><Image src={company.logo} alt="" width={48} height={48} className="h-11 w-11 rounded-xl object-contain" /></span>
                  <span className="rounded-full bg-[#eef4f9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#65798b]">{company.chapters} chapters</span>
                </div>
                <h3 className="mt-7 text-xl font-bold tracking-[-.03em]">{company.name}</h3>
                <p className="mt-1.5 text-sm text-[#526171]">{company.tagline}</p>
                <p className="mt-4 text-[11px] font-semibold text-[#76879a]">{company.topics}</p>
                <div className="mt-7 flex items-center justify-between border-t border-[#e1e8ee] pt-5 text-xs font-bold"><span>Open track</span><span className="text-lg transition-transform group-hover:translate-x-1" aria-hidden>→</span></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
