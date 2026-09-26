import Image from "next/image";
import Link from "next/link";

const TRACKS = [
  {
    name: "Netflix",
    summary: "Streaming analytics platform",
    href: "/data-engineering/netflix/start-here",
    logo: "/logo-netflix.webp",
  },
  {
    name: "Uber",
    summary: "Marketplace data platform",
    href: "/data-engineering/uber/start-here",
    logo: "/logo-uber.png",
  },
  {
    name: "YouTube",
    summary: "Video analytics platform",
    href: "/data-engineering/youtube/start-here",
    logo: "/logo-youtube.webp",
  },
] as const;

export default function RecoveryState({
  eyebrow,
  title,
  description,
  action,
  loading = false,
  testId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  loading?: boolean;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-5xl items-center px-4 py-10 sm:px-6"
    >
      <section className="w-full overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_24px_80px_rgba(15,23,42,.08)]">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)] lg:p-12">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 rounded-full bg-[#526b82] ${loading ? "animate-pulse" : ""}`}
                aria-hidden
              />
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[var(--text-faint)]">
                {eyebrow}
              </p>
            </div>
            <h1 className="mt-5 max-w-xl text-3xl font-bold tracking-[-.04em] text-[var(--text)] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
              {description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {action}
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-5 text-sm font-semibold text-[var(--text)] outline-none transition hover:border-[#526b82] focus-visible:ring-2 focus-visible:ring-[#526b82]"
              >
                Open design library
              </Link>
            </div>
          </div>

          <div aria-label="Available learning tracks" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">
              Continue learning
            </p>
            <div className="space-y-2">
              {TRACKS.map((track) => (
                <Link
                  key={track.name}
                  href={track.href}
                  className="group flex min-h-16 items-center gap-3 rounded-xl border border-transparent bg-[var(--bg-card)] px-3 py-2.5 outline-none transition hover:border-[#526b82] focus-visible:ring-2 focus-visible:ring-[#526b82]"
                >
                  <Image
                    src={track.logo}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-lg object-contain"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--text)]">
                      {track.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {track.summary}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="text-sm text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5"
                  >
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
