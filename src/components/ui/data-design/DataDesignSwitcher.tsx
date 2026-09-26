"use client";

import Image from "next/image";
import Link from "next/link";

export type DataDesignCompany = "netflix" | "youtube" | "uber" | "bookmyshow";

const COMPANIES = {
  netflix: { name: "Netflix", logo: "/logo-netflix.webp" },
  youtube: { name: "YouTube", logo: "/logo-youtube.webp" },
  uber: { name: "Uber", logo: "/logo-uber.png" },
  bookmyshow: { name: "BookMyShow", logo: "/logo-bookmyshow.jpg" },
} as const;

export default function DataDesignSwitcher({ current }: { current: DataDesignCompany }) {
  const company = COMPANIES[current];

  return (
    <Link
      href="/"
      aria-label="Open the Data Engineering company library"
      title="Browse Data Engineering companies"
      data-testid="data-design-switcher"
      className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-left outline-none transition-colors hover:border-[#526b82] hover:bg-[var(--bg-muted)] focus-visible:ring-2 focus-visible:ring-[#526b82] focus-visible:ring-offset-2 xl:w-[164px] xl:justify-start xl:gap-2.5 xl:px-3"
    >
      <Image src={company.logo} alt="" width={28} height={28} className="h-6 w-6 rounded-md object-contain sm:h-7 sm:w-7" />
      <span className="hidden xl:block">
        <span className="block text-[8px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Data Engineering</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold leading-none text-[var(--text)]">
          {company.name}
          <svg className="h-3 w-3 text-[#526b82] transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M5 11 11 5m-5 0h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
