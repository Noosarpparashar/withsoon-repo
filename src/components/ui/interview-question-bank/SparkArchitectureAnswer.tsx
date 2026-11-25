import content from "@/lib/sparkArchitectureAnswer.json";
import { renderBody } from "./SparkPerformanceAnswer";

function ArchitectureDiagram() {
  return (
    <figure className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6">
      <figcaption className="mb-5 text-xs font-bold uppercase tracking-wider text-neutral-500">Physical architecture</figcaption>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-300 bg-white p-4 text-center">
          <p className="font-bold text-neutral-900">Driver</p>
          <p className="mt-2 text-xs text-neutral-500">SparkSession · SparkContext</p>
          <p className="text-xs text-neutral-500">DAG Scheduler · Task Scheduler</p>
        </div>
        <div className="rounded-xl border border-neutral-300 bg-white p-4 text-center">
          <p className="font-bold text-neutral-900">Cluster Manager</p>
          <p className="mt-2 text-xs text-neutral-500">Standalone · YARN · Kubernetes</p>
          <p className="text-xs text-neutral-500">Allocates resources and launches executors</p>
        </div>
      </div>
      <p className="my-4 text-center text-xs leading-6 text-neutral-600">Driver ↔ Cluster Manager: resource requests<br />Driver ↔ Executors: tasks, status and results<br />Cluster Manager → Executors: resource allocation</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map(worker => <div key={worker} className="rounded-xl border border-neutral-300 p-3">
          <p className="mb-3 text-center text-xs font-semibold text-neutral-700">Worker Node {worker}</p>
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-center">
            <p className="font-bold text-neutral-900">Executor</p>
            <p className="mt-2 text-xs text-neutral-500">Task execution · Cache / intermediate data</p>
          </div>
        </div>)}
      </div>
      <p className="my-3 text-center text-neutral-400" aria-hidden="true">↕</p>
      <div className="rounded-lg border border-neutral-200 bg-white p-3 text-center text-xs font-semibold text-neutral-700">External storage / data sources</div>
    </figure>
  );
}

function LogicalDiagram() {
  return (
    <figure className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6">
      <figcaption className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Logical execution hierarchy</figcaption>
      <div className="rounded-lg border border-neutral-200 bg-white p-3 text-center font-bold text-neutral-900">Spark Application</div>
      <p className="py-2 text-center text-neutral-400" aria-hidden="true">↓</p>
      <div className="rounded-lg border border-neutral-200 bg-white p-3 text-center"><p className="font-bold text-neutral-900">Job</p><p className="text-xs">Triggered by an action</p></div>
      <p className="py-2 text-center text-neutral-400" aria-hidden="true">↓</p>
      <div className="grid gap-3 sm:grid-cols-2">{[1, 2].map(stage => <div key={stage} className="rounded-lg border border-neutral-200 bg-white p-3">
        <p className="mb-3 text-center font-bold text-neutral-900">Stage {stage}</p>
        <ul className="flex flex-wrap justify-center gap-2">{[1, 2, 3].map(task => <li key={task} className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs">Task {task}</li>)}</ul>
      </div>)}</div>
    </figure>
  );
}

const sections = content.split(/^#{1,2} /m).filter(Boolean).map(section => {
  const newline = section.indexOf("\n");
  return { title: section.slice(0, newline).trim(), body: section.slice(newline + 1) };
});

export default function SparkArchitectureAnswer() {
  return (
    <article className="overflow-hidden bg-white">
      <header className="bg-neutral-900 px-5 py-8 text-white sm:px-7"><h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{sections[0].title}</h2></header>
      <div className="space-y-8 px-5 py-6 text-sm leading-7 text-neutral-600 sm:px-7 sm:py-8">
        <div className="space-y-4">{renderBody(sections[0].body)}</div>
        {sections.slice(1).map(section => <section key={section.title} className={section.title.startsWith("Interview-ready") ? "space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6" : "space-y-4 border-t border-neutral-200 pt-6"}>
          <h3 className="text-base font-bold tracking-tight text-neutral-900">{section.title}</h3>
          {section.title.startsWith("1.") && <ArchitectureDiagram />}
          {section.title.startsWith("4.") && <LogicalDiagram />}
          {renderBody(section.body)}
        </section>)}
      </div>
    </article>
  );
}
