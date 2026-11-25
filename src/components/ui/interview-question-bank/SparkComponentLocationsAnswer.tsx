import content from "@/lib/sparkComponentLocationsAnswer.json";
import { renderBody } from "./SparkPerformanceAnswer";

const sections = content.split(/^#{1,2} /m).filter(Boolean).map(section => {
  const newline = section.indexOf("\n");
  return { title: section.slice(0, newline).trim(), body: section.slice(newline + 1) };
});

function DeploymentModes() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[false, true].map(cluster => <figure key={String(cluster)} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <figcaption className="mb-4 text-sm font-bold text-neutral-900">{cluster ? "Cluster Mode" : "Client Mode"}</figcaption>
        <div className="rounded-lg border border-neutral-200 bg-white p-3 text-center">
          <p className="text-xs font-semibold text-neutral-600">Client Machine</p>
          <p className="mt-1 text-sm font-bold text-neutral-900">{cluster ? "Submits application" : "Driver"}</p>
        </div>
        <p className="py-3 text-center text-xs text-neutral-500">↓ {cluster ? "Application submission" : "Resource requests"}</p>
        <div className="rounded-xl border border-neutral-300 p-3">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">Inside the cluster</p>
          <div className="rounded-lg border border-neutral-200 bg-white px-2 py-3 text-center text-xs font-semibold text-neutral-800">Cluster Manager</div>
          <p className="py-2 text-center text-neutral-400" aria-hidden="true">↓</p>
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-3 text-center text-xs font-semibold text-neutral-600">Cluster Workers</p>
            {cluster && <p className="mb-2 rounded border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-xs font-bold text-neutral-900">Driver</p>}
            <div className="grid grid-cols-2 gap-2">{[1, 2].map(executor => <p key={executor} className="rounded border border-neutral-200 bg-neutral-50 px-2 py-2 text-center text-xs text-neutral-700">Executor {executor}</p>)}</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-neutral-500">The Driver communicates directly with Executors to schedule tasks and receive status.</p>
      </figure>)}
    </div>
  );
}

export default function SparkComponentLocationsAnswer() {
  return (
    <article className="overflow-hidden bg-white">
      <header className="bg-neutral-900 px-5 py-8 text-white sm:px-7"><h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{sections[0].title}</h2></header>
      <div className="space-y-8 px-5 py-6 text-sm leading-7 text-neutral-600 sm:px-7 sm:py-8">
        <div className="space-y-4">{renderBody(sections[0].body)}</div>
        {sections.slice(1).map(section => <section key={section.title} className={section.title.includes("Interview-ready") ? "space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6" : "space-y-4 border-t border-neutral-200 pt-6"}>
          <h3 className="text-base font-bold tracking-tight text-neutral-900">{section.title}</h3>
          {section.title.startsWith("2.") && <DeploymentModes />}
          {renderBody(section.body)}
        </section>)}
      </div>
    </article>
  );
}
