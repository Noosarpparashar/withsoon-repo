import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NETFLIX_ROUTE_REGISTRY } from "@/components/ui/netflix-data-engineering/curriculum";
import { BOOKMYSHOW_CHAPTERS } from "@/components/ui/bookmyshow-data-engineering/data";
import { WHATSAPP_CHAPTERS } from "@/components/ui/whatsapp-data-engineering/data";
import { AMAZON_CHAPTERS } from "@/components/ui/amazon-data-engineering/data";
import InterviewQuestionBank from "@/components/ui/interview-question-bank/InterviewQuestionBank";
import { INTERVIEW_QUESTION_CATEGORIES } from "@/lib/interviewQuestionBank";

export const metadata: Metadata = {
  title: "Data Engineering Designs | withsoon",
  description: "Interactive, chapter-by-chapter data engineering interview designs for Netflix, Uber, YouTube, BookMyShow, WhatsApp, and Amazon.",
  alternates: { canonical: "https://withsoon.com" },
};

const COMPANIES = [
  { name: "Netflix", logo: "/logo-netflix.webp", tagline: "Streaming data at global scale", topics: "Playback · QoE · Lakehouse", href: "/data-engineering/netflix/start-here", chapters: NETFLIX_ROUTE_REGISTRY.length },
  { name: "Uber", logo: "/logo-uber.png", tagline: "Real-time marketplace data", topics: "Trips · Streaming · Reconciliation", href: "/data-engineering/uber/start-here", chapters: 9 },
  { name: "YouTube", logo: "/logo-youtube.webp", tagline: "Video analytics and data platform", topics: "Watch time · Creators · Quality", href: "/data-engineering/youtube/start-here", chapters: 9 },
  { name: "BookMyShow", logo: "/logo-bookmyshow.jpg", tagline: "Live-event inventory and ticketing", topics: "Seats · Payments · Flash sales", href: "/data-engineering/bookmyshow/start-here", chapters: BOOKMYSHOW_CHAPTERS.length },
  { name: "WhatsApp", logo: "/logo-whatsapp.png", tagline: "Privacy-safe data at global scale", topics: "Events · Streaming · Lakehouse", href: "/data-engineering/whatsapp/start-here", chapters: WHATSAPP_CHAPTERS.length },
  { name: "Amazon", logo: "/logo-amazon.svg", tagline: "E-commerce truth at global scale", topics: "Orders · Inventory · Finance", href: "/data-engineering/amazon/start-here", chapters: AMAZON_CHAPTERS.length },
] as const;

const NOTEBOOKS = [
  {
    language: "Scala",
    title: "Scala + Spark",
    preRun: "Use an Almond Scala kernel, then run the dependency, setup, and data cells.",
    previewHref: "/notebooks/scala",
    href: "/notebooks/spark-scala-practice-problems.ipynb",
    filename: "spark-scala-practice-problems.ipynb",
    iconClass: "bg-[#17202b] text-white",
    buttonClass: "bg-[#17202b] text-white hover:bg-black focus-visible:outline-[#17202b]",
  },
  {
    language: "PySpark",
    title: "Python + Spark",
    preRun: "Install PySpark 3.5.0 if needed, then run the import, setup, and data cells.",
    previewHref: "/notebooks/pyspark",
    href: "/notebooks/pyspark-practice-problems.ipynb",
    filename: "pyspark-practice-problems.ipynb",
    iconClass: "bg-[#17202b] text-white",
    buttonClass: "bg-[#17202b] text-white hover:bg-black focus-visible:outline-[#17202b]",
  },
] as const;

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 16 16 8m-6 0h6v6M5 5h6M5 5v14h14v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f4f7fb] text-[#17202b]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-7 sm:py-16">
        <header className="relative overflow-hidden rounded-[30px] border border-[#d6e1eb] bg-white px-6 py-10 shadow-[0_24px_70px_rgba(72,91,108,.10)] sm:px-10 sm:py-14">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#e7eef5] blur-3xl" aria-hidden />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#65798b]">Data Engineering Interview Library</p>
            <h1 id="home-title" className="mt-5 text-4xl font-bold tracking-[-.055em] text-[#17202b] sm:text-6xl">Design data platforms that operate at company scale.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#526171] sm:text-base">Interactive architecture tracks built for big-data interviews. Follow each company chapter by chapter, inspect every component, and practise the decisions behind the design.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#practice-notebooks" className="inline-flex items-center rounded-xl border border-[#cbd7e2] bg-white px-5 py-3 text-sm font-bold text-[#263646] transition hover:-translate-y-0.5 hover:border-[#8197aa] hover:bg-[#f7fafc]">Get practice notebooks</a>
              <a href="#data-engineering-designs" className="inline-flex items-center rounded-xl border border-[#cbd7e2] bg-white px-5 py-3 text-sm font-bold text-[#263646] transition hover:-translate-y-0.5 hover:border-[#8197aa] hover:bg-[#f7fafc]">Explore designs</a>
              <a href="#interview-question-bank" className="inline-flex items-center rounded-xl border border-[#cbd7e2] bg-white px-5 py-3 text-sm font-bold text-[#263646] transition hover:-translate-y-0.5 hover:border-[#8197aa] hover:bg-[#f7fafc]">Interview Q&amp;A</a>
            </div>
          </div>
        </header>

        <section id="practice-notebooks" data-testid="practice-notebooks" className="scroll-mt-24 pt-8" aria-labelledby="notebooks-heading">
          <div className="rounded-[24px] border border-[#d6e1eb] bg-white p-5 shadow-[0_12px_35px_rgba(72,91,108,.07)] sm:p-6 lg:p-7">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl">
                  <h2 id="notebooks-heading" className="text-xl font-extrabold tracking-[-.035em] text-[#17202b] sm:text-2xl">Spark practice notebooks</h2>
                  <p className="mt-1.5 text-sm text-[#526171]">Practise all kinds of Spark transformations asked in interviews.</p>
                </div>
                <span className="rounded-full border border-[#d6e1eb] bg-[#f7f9fb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#526171]">Exercises · outputs · solutions</span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {NOTEBOOKS.map((notebook) => (
                  <article key={notebook.language} className="flex h-full flex-col rounded-2xl border border-[#d6e1eb] bg-white p-4 text-[#17202b] sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-[11px] font-black ${notebook.iconClass}`} aria-hidden="true">
                        {notebook.language === "Scala" ? "SC" : "PY"}
                      </div>
                      <a
                        href={notebook.previewHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d6e1eb] bg-white px-3 py-2 text-[10px] font-bold text-[#344454] transition hover:border-[#929fac] hover:bg-[#f7f9fb]"
                        aria-label={`Open the ${notebook.language} notebook preview in a new tab`}
                      >
                        Open preview
                        <PreviewIcon />
                      </a>
                    </div>
                    <p className="mt-3 text-[9px] font-black uppercase tracking-[.14em] text-[#718293]">{notebook.language} notebook</p>
                    <h3 className="mt-0.5 text-lg font-bold tracking-[-.03em]">{notebook.title}</h3>
                    <div className="mt-2 text-xs leading-5 text-[#526171]">
                      <p><span className="font-bold text-[#17202b]">Before you start:</span> {notebook.preRun}</p>
                      <p className="mt-1">Then solve the exercises in Jupyter Notebook. Solutions are provided at the end.</p>
                    </div>
                    <a
                      href={notebook.href}
                      download={notebook.filename}
                      className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${notebook.buttonClass}`}
                      aria-label={`Download the ${notebook.language} Spark practice notebook`}
                    >
                      <DownloadIcon />
                      Download {notebook.language} notebook
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="data-engineering-designs" className="scroll-mt-24 py-12" aria-labelledby="designs-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#59697a]">Company tracks</p>
              <h2 id="designs-heading" className="mt-2 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Data Engineering Designs</h2>
            </div>
            <span className="rounded-full border border-[#d6e1eb] bg-white px-3 py-1.5 text-[10px] font-bold text-[#65798b]">6 company tracks</span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {COMPANIES.map((company) => (
              <Link key={company.name} href={company.href} className="group rounded-[24px] border border-[#d6e1eb] bg-white p-6 shadow-[0_10px_35px_rgba(72,91,108,.06)] transition duration-300 hover:-translate-y-2 hover:border-[#8197aa] hover:shadow-[0_25px_60px_rgba(72,91,108,.16)] xl:p-4 2xl:p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6e1eb] bg-[#eef4f9]"><Image src={company.logo} alt="" width={48} height={48} className="h-11 w-11 rounded-xl object-contain" /></span>
                  <span className="rounded-full bg-[#eef4f9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#526171]">{company.chapters} chapters</span>
                </div>
                <h3 className="mt-7 text-xl font-bold tracking-[-.03em]">{company.name}</h3>
                <p className="mt-1.5 text-sm text-[#526171]">{company.tagline}</p>
                <p className="mt-4 text-[11px] font-semibold text-[#59697a]">{company.topics}</p>
                <div className="mt-7 flex items-center justify-between border-t border-[#e1e8ee] pt-5 text-xs font-bold"><span>Open track</span><span className="text-lg transition-transform group-hover:translate-x-1" aria-hidden>→</span></div>
              </Link>
            ))}
          </div>
        </section>

        <InterviewQuestionBank
          categories={INTERVIEW_QUESTION_CATEGORIES}
        />
      </div>
    </div>
  );
}
