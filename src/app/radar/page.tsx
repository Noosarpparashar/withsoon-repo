import { getContentBySection } from "@/lib/content";
import ContentCard from "@/components/ui/ContentCard";
import SectionHero from "@/components/ui/SectionHero";

export const metadata = {
  title: "Radar — withsoon",
  description: "Latest AI and Big Data news, tool launches, model releases — date-sorted.",
};

export default function RadarPage() {
  const items = getContentBySection("radar");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SectionHero
        emoji="📡"
        title="Radar"
        subtitle="Latest in AI and Big Data — new tools, model releases, papers, and industry moves. Date-sorted, click for the full breakdown."
        color="text-yellow-400"
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-16 text-center">
          <div className="text-4xl mb-4">📡</div>
          <p className="text-gray-500">First radar post coming soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <ContentCard key={item.slug} item={item} href={`/radar/${item.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
