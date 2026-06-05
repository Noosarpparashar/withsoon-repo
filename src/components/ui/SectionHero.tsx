type Props = {
  emoji: string;
  title: string;
  subtitle: string;
  accentClass: string; // e.g. "text-[var(--blue-text)]"
};

export default function SectionHero({ emoji, title, subtitle, accentClass }: Props) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-8 mb-10 bg-[var(--bg-card)]">
      <div className="text-4xl mb-3">{emoji}</div>
      <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${accentClass}`}>{title}</h1>
      <p className="text-[var(--text-muted)] text-lg max-w-2xl">{subtitle}</p>
    </div>
  );
}
