type Props = {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
};

export default function SectionHero({ emoji, title, subtitle, color }: Props) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] p-8 mb-10 bg-gradient-to-br from-[var(--muted)] to-[var(--background)]`}>
      <div className="text-4xl mb-3">{emoji}</div>
      <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${color}`}>{title}</h1>
      <p className="text-gray-400 text-lg max-w-2xl">{subtitle}</p>
    </div>
  );
}
