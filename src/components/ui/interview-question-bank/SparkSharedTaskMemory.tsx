export default function SparkSharedTaskMemory() {
  return (
    <figure aria-label="Four concurrent tasks dynamically share an eight GiB executor heap with storage and other JVM usage" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-center text-neutral-200 sm:p-5">
      <p className="text-xs uppercase tracking-wide text-neutral-400">Executor memory is shared</p>
      <div className="mt-4 rounded-xl border border-blue-400/35 bg-blue-400/5 p-4">
        <p className="text-sm font-semibold">Executor JVM</p>
        <p className="mt-2 text-2xl font-bold text-blue-300">8 GiB heap</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1,2,3,4].map(n=><div key={n} className="rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-2 py-3 text-xs font-semibold text-emerald-300">Task {n}</div>)}
        </div>
        <p className="mt-4 rounded-lg border border-neutral-600 p-3 text-xs leading-5">Shared execution/storage memory and other JVM usage</p>
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual illustration. Spark does not reserve exactly 2 GiB per task; execution memory is dynamically shared.</figcaption>
    </figure>
  );
}
