import { inline, renderBody } from "./SparkPerformanceAnswer";

export default function FormattedSparkAnswer({ content }: { content: string }) {
  const sections: { title: string; body: string }[] = [];
  let inCodeBlock = false;
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("```")) inCodeBlock = !inCodeBlock;
    if (!inCodeBlock && /^#{1,2} /.test(line)) {
      sections.push({ title: line.replace(/^#{1,2} /, "").trim(), body: "" });
    } else if (sections.length) {
      sections[sections.length - 1].body += `${line}\n`;
    }
  }

  return (
    <article className="overflow-hidden bg-white">
      <header className="bg-neutral-900 px-5 py-8 text-white sm:px-7"><h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{sections[0].title.replace(/`/g, "")}</h2></header>
      <div className="space-y-8 px-5 py-6 text-sm leading-7 text-neutral-600 sm:px-7 sm:py-8">
        <div className="space-y-4">{renderBody(sections[0].body)}</div>
        {sections.slice(1).map(section => <section key={section.title} className={section.title.includes("Interview-ready") ? "space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6" : "space-y-4 border-t border-neutral-200 pt-6"}>
          <h3 className="text-base font-bold tracking-tight text-neutral-900">{inline(section.title)}</h3>
          {renderBody(section.body)}
        </section>)}
      </div>
    </article>
  );
}
