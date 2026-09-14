"use client";

import Image from "next/image";
import Link from "next/link";

export type DataDesignCompany = "netflix" | "youtube" | "uber";

const COMPANIES = {
  netflix: { name: "Netflix", logo: "/logo-netflix.webp" },
  youtube: { name: "YouTube", logo: "/logo-youtube.webp" },
  uber: { name: "Uber", logo: "/logo-uber.png" },
} as const;

export default function DataDesignSwitcher({ current }: { current: DataDesignCompany }) {
  const company = COMPANIES[current];

  return (
    <Link
      href="/"
      aria-label="Open the Data Engineering company library"
      title="Browse Data Engineering companies"
      className="group flex h-11 shrink-0 items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 text-left transition hover:-translate-y-0.5 hover:border-[#526b82] hover:shadow-md"
    >
      <Image src={company.logo} alt="" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
      <span className="hidden lg:block">
        <span className="block text-[8px] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">Data Engineering</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[var(--text)]">
          {company.name}
          <span className="text-[10px] text-[#526b82] transition group-hover:translate-x-0.5" aria-hidden>↗</span>
        </span>
      </span>
    </Link>
  );
}
