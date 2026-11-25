import content from "@/lib/sparkResponsibilitiesAnswer.json";
import { renderBody } from "./SparkPerformanceAnswer";

const sections = content.split(/^#{1,2} /m).filter(Boolean).map(section => {
  const newline = section.indexOf("\n");
  return { title: section.slice(0, newline).trim(), body: section.slice(newline + 1) };
});

function InteractionDiagram() {
  return (
    <figure className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6">
      <figcaption className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Coordination and resource allocation</figcaption>
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center"><p className="font-bold text-neutral-900">Driver</p><p className="text-xs">Plans jobs, creates stages, schedules tasks</p></div>
      <p className="py-3 text-center text-xs text-neutral-600">↕ Resource requests / allocation</p>
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center"><p className="font-bold text-neutral-900">Cluster Manager</p><p className="text-xs">Allocates CPU, memory and executor resources</p></div>
      <p className="py-3 text-center text-xs text-neutral-600">↓ Executor provisioning</p>
      <div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map(executor => <div key={executor} className="rounded-lg border border-neutral-200 bg-white p-3 text-center"><p className="font-bold text-neutral-900">Executor {executor}</p><p className="text-xs">Runs tasks</p></div>)}</div>
      <p className="mt-4 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center text-xs font-medium text-neutral-700">Driver ↔ Executors: direct task scheduling and execution status</p>
    </figure>
  );
}

export default function SparkResponsibilitiesAnswer() {
  return (
    <article className="overflow-hidden bg-white">
      <header className="bg-neutral-900 px-5 py-8 text-white sm:px-7"><h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{sections[0].title}</h2></header>
      <div className="space-y-8 px-5 py-6 text-sm leading-7 text-neutral-600 sm:px-7 sm:py-8">
        <div className="space-y-4">{renderBody(sections[0].body)}</div>
        {sections.slice(1).map(section => <section key={section.title} className={section.title.includes("Interview-ready") ? "space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6" : "space-y-4 border-t border-neutral-200 pt-6"}>
          <h3 className="text-base font-bold tracking-tight text-neutral-900">{section.title}</h3>
          {section.title.startsWith("4.") && <InteractionDiagram />}
          {renderBody(section.body)}
        </section>)}
      </div>
    </article>
  );
}
