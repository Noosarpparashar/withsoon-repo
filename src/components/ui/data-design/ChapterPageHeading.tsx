export default function ChapterPageHeading({
  company,
  title,
  description,
}: {
  company: "Netflix" | "Uber";
  title: string;
  description: string;
}) {
  return (
    <header
      data-testid="chapter-page-heading"
      className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 md:px-6 md:py-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">
        {company} · Data Engineering
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.035em] text-[var(--text)] md:text-3xl">
        <span className="sr-only">{company} Data Engineering: </span>
        {title}
      </h1>
      <p className="mt-1.5 max-w-3xl text-xs leading-5 text-[var(--text-muted)] md:text-sm md:leading-6">
        {description}
      </p>
    </header>
  );
}
