export default function SparkSharedVariableFlow() {
  return <figure aria-label="Broadcast: driver sends read-only data to executors. Accumulator: executor tasks send updates to the driver for aggregation." className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="grid gap-4 sm:grid-cols-2">{[false,true].map(acc=><div key={String(acc)} className={`rounded-xl border p-4 text-center ${acc ? "border-emerald-400/35 bg-emerald-400/5" : "border-blue-400/35 bg-blue-400/5"}`}>
      <p className={`text-sm font-bold ${acc ? "text-emerald-300" : "text-blue-300"}`}>{acc ? "Accumulator" : "Broadcast variable"}</p>
      <p className="mt-4 rounded-lg border border-neutral-600 p-3 text-sm font-semibold">{acc ? "Executor tasks" : "Driver"}</p>
      <p className="py-3 text-xs leading-6">{acc ? "Add local updates" : "Distribute read-only data"}<span aria-hidden="true" className="block text-lg">↓</span></p>
      <p className="rounded-lg border border-neutral-600 p-3 text-sm font-semibold">{acc ? "Driver aggregates updates" : "Executors cache data"}</p>
      <p className="mt-3 text-xs text-neutral-400">{acc ? "Counters and processing metrics" : "Lookup dictionaries and configuration"}</p>
    </div>)}</div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Broadcast distributes shared data outward; accumulators collect aggregated task updates. Neither provides a synchronized, globally mutable object for tasks.</figcaption>
  </figure>;
}
