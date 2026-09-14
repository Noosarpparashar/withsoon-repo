import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Big Data & AI Engineering Library — withsoon",
  description:
    "Practical Big Data and AI projects, reusable templates, focused builds, and company-scale data engineering designs.",
  alternates: { canonical: "https://withsoon.com" },
};

const COMPANIES = [
  {
    name: "Netflix",
    logo: "/logo-netflix.webp",
    tagline: "Streaming analytics at global scale",
    detail: "Playback · QoE · Lakehouse",
    href: "/system-design/netflix-data-engineering/start-here",
    chapters: 10,
  },
  {
    name: "Uber",
    logo: "/logo-uber.png",
    tagline: "Real-time marketplace data",
    detail: "Trips · Streaming · Reconciliation",
    href: "/system-design/uber/start-here",
    chapters: 9,
  },
  {
    name: "YouTube",
    logo: "/logo-youtube.webp",
    tagline: "Video analytics and data platform",
    detail: "Watch time · Creators · Quality",
    href: "/system-design/youtube/start-here",
    chapters: 9,
  },
  {
    name: "WhatsApp",
    logo: "/logo-whatsapp.png",
    tagline: "100B+ messages per day",
    detail: "Messaging · Delivery · Privacy",
  },
  {
    name: "Swiggy",
    logo: "/logo-swiggy.png",
    tagline: "Food delivery in milliseconds",
    detail: "Orders · ETA · Logistics",
  },
  {
    name: "MakeMyTrip",
    logo: "/logo-makemytrip.png",
    tagline: "Travel booking under peak demand",
    detail: "Search · Inventory · Booking",
  },
  {
    name: "BookMyShow",
    logo: "/logo-bookmyshow.jpg",
    tagline: "Ticketing under flash-sale load",
    detail: "Seats · Queue · Payments",
  },
] as const;

const LIBRARY_FORMATS = [
  {
    title: "Data Engineering Designs",
    detail: "Company-scale interview tracks",
    status: "3 available",
    active: true,
  },
  {
    title: "Quick Builds",
    detail: "Small, focused implementations",
    status: "Coming next",
    active: false,
  },
  {
    title: "End-to-End Projects",
    detail: "Complete Big Data and AI systems",
    status: "Planned",
    active: false,
  },
  {
    title: "AI Engineering",
    detail: "RAG, agents and data workflows",
    status: "Planned",
    active: false,
  },
  {
    title: "Templates",
    detail: "Reusable technical starting points",
    status: "Planned",
    active: false,
  },
] as const;

function CompanyCard({
  company,
  index,
}: {
  company: (typeof COMPANIES)[number];
  index: number;
}) {
  const ready = "href" in company;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#d6e1eb] bg-[#eef4f9] transition duration-300 group-hover:scale-105 group-hover:bg-white">
          <Image
            src={company.logo}
            alt=""
            width={44}
            height={44}
            className="h-10 w-10 rounded-lg object-contain"
          />
        </span>
        <span className="rounded-full border border-[#d6e1eb] bg-[#eef4f9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#65798b]">
          {ready ? `${company.chapters} chapters` : "Coming soon"}
        </span>
      </div>

      <div className="mt-5">
        <h2 className="text-lg font-bold tracking-[-.02em] text-[#17202b]">
          {company.name}
        </h2>
        <p className="mt-1 text-sm text-[#526171]">{company.tagline}</p>
        <p className="mt-3 text-[11px] font-semibold text-[#76879a]">
          {company.detail}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#e1e8ee] pt-4 text-xs font-bold text-[#273544]">
        <span>{ready ? "Start preparing" : "Planned"}</span>
        {ready ? (
          <span
            className="text-base text-[#526b82] transition group-hover:translate-x-1"
            aria-hidden
          >
            →
          </span>
        ) : null}
      </div>
    </>
  );

  const className = `data-design-library-card group relative min-h-[220px] overflow-hidden rounded-[22px] border border-[#d6e1eb] bg-white p-5 shadow-[0_8px_30px_rgba(57,75,91,.05)] ${
    ready
      ? "transition duration-300 hover:-translate-y-2 hover:border-[#8197aa] hover:shadow-[0_24px_55px_rgba(72,91,108,.16)]"
      : "opacity-75"
  }`;

  if (ready) {
    return (
      <Link
        href={company.href}
        className={className}
        style={{ animationDelay: `${index * 55}ms` }}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={className}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {content}
    </article>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#f4f7fb] text-[#17202b]">
      <div className="relative mx-auto max-w-[1500px] overflow-hidden px-4 py-8 sm:px-7 lg:py-10">
        <div
          className="pointer-events-none absolute -right-36 -top-32 h-[420px] w-[420px] rounded-full bg-[#dce8f1] opacity-80 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-40 top-80 h-80 w-80 rounded-full bg-white blur-3xl"
          aria-hidden
        />

        <header className="data-design-library-enter relative mb-8 overflow-hidden rounded-[28px] border border-[#d6e1eb] bg-white px-6 py-7 shadow-[0_18px_60px_rgba(72,91,108,.08)] sm:px-9 sm:py-8">
          <div
            className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,#dce8f1_0,transparent_68%)] lg:block"
            aria-hidden
          />
          <div className="relative max-w-4xl">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#65798b]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#17202b] text-xs text-white">
                  WS
                </span>
                Engineering Resource Library
              </div>
              <h1 className="text-3xl font-bold tracking-[-.045em] sm:text-5xl">
                Practical resources for Big Data and AI engineering.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526171] sm:text-base">
                Focused builds, complete projects, reusable templates, and
                company-scale data platform designs—organized in one place.
              </p>
            </div>
          </div>
        </header>

        <section
          className="relative mb-10"
          aria-labelledby="library-formats-title"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="library-formats-title"
              className="text-sm font-bold uppercase tracking-[.14em] text-[#526171]"
            >
              Browse by format
            </h2>
            <span className="text-[10px] font-semibold text-[#76879a]">
              More collections will be added here
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {LIBRARY_FORMATS.map((format) => (
              <div
                key={format.title}
                className={`rounded-2xl border p-4 ${format.active ? "border-[#8197aa] bg-white shadow-[0_10px_28px_rgba(72,91,108,.09)]" : "border-[#d6e1eb] bg-[#f9fbfd]"}`}
              >
                <div className="flex items-center justify-end">
                  <span
                    className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] ${format.active ? "bg-[#17202b] text-white" : "bg-[#e8eff5] text-[#76879a]"}`}
                  >
                    {format.status}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold text-[#273544]">
                  {format.title}
                </p>
                <p className="mt-1 text-[11px] text-[#76879a]">
                  {format.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="data-engineering-designs"
          className="relative scroll-mt-24"
          aria-labelledby="data-engineering-designs-title"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2
                  id="data-engineering-designs-title"
                  className="text-xl font-bold sm:text-2xl"
                >
                  Data Engineering Designs
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#65798b]">
                Company-based data platform interview tracks
              </p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-[#ccd9e4] bg-white px-2.5 py-1 text-[10px] font-bold text-[#526b82]">
                3 available
              </span>
              <span className="rounded-full border border-[#d6e1eb] bg-[#e8f1f8] px-2.5 py-1 text-[10px] font-bold text-[#65798b]">
                7 companies
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {COMPANIES.map((company, index) => (
              <CompanyCard key={company.name} company={company} index={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
