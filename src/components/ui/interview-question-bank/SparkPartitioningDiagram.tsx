export default function SparkPartitioningDiagram() {
  return (
    <figure aria-label="100 million records divided into four partitions, processed by four concurrent tasks" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
      <div className="mb-5 text-center">
        <p className="font-bold text-white">Dataset: 100 million records</p>
        <p className="mt-1 text-xs text-neutral-400">Split into 4 logical partitions</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="min-w-0 text-center">
            <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-3">
              <p className="text-sm font-semibold text-blue-300">Partition {n}</p>
              <p className="mt-2 text-xs">25M records</p>
            </div>
            <div aria-hidden="true" className="py-2 text-neutral-400">↓</div>
            <div className="rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-3">
              <p className="text-sm font-semibold text-emerald-300">Task {n}</p>
              <p className="mt-2 text-xs">Executor core</p>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Illustrative equal-sized partitions. All 4 tasks can run concurrently when 4 task slots are available.</figcaption>
    </figure>
  );
}
