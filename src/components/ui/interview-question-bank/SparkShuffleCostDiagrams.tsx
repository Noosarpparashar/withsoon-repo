export function SparkShuffleCostDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Department data begins across four Executors. Shuffle writes, transfers, and reads intermediate data so matching department keys can be processed together.">
      <p className="mb-4 text-center text-sm font-bold text-white">Before shuffle — distributed across executors</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((executor) => (
          <div key={executor} className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-3 text-center">
            <p className="mb-2 text-xs font-bold text-white">Executor {executor}</p>
            {["IT", "HR", "Sales"].map((department) => <p key={department} className="text-[11px] leading-6 text-blue-200">{department}</p>)}
          </div>
        ))}
      </div>
      <div className="py-3 text-center text-lg text-orange-400" aria-hidden="true">↓</div>
      <div className="rounded-lg border border-orange-400/35 bg-orange-400/5 p-3">
        <p className="mb-3 text-center text-xs font-bold text-orange-200">Shuffle</p>
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="Shuffle I/O costs">
          {["Disk write", "Network transfer", "Disk read"].map((cost, index) => <li key={cost} className="rounded-md border border-neutral-600 bg-neutral-800 px-2 py-2 text-center text-xs">{index + 1}. {cost}</li>)}
        </ol>
      </div>
      <div className="py-3 text-center text-lg text-orange-400" aria-hidden="true">↓</div>
      <p className="mb-3 text-center text-sm font-bold text-white">After shuffle — same-key records are colocated</p>
      <div className="grid grid-cols-3 gap-2">
        {["IT", "HR", "Sales"].map((department) => (
          <div key={department} className="min-w-0 rounded-lg border border-emerald-400/35 bg-emerald-400/5 px-2 py-3 text-center">
            <p className="text-[11px] text-neutral-300">Partition</p>
            <p className="mt-2 text-xs font-bold text-emerald-200">{department}</p>
            <p className="mt-1 text-[10px] leading-5 text-neutral-300">Matching-key data</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">Conceptual illustration. Spark can perform partial aggregation before shuffling, greatly reducing the data transferred. Actual hash placement can put multiple keys in one partition.</figcaption>
    </figure>
  );
}

export function SparkShuffleSkewChart() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label="Shuffle partition imbalance: partitions 1, 2, and 3 each have 10 GB and take two minutes; partition 4 has 70 GB and takes fourteen minutes. Times are illustrative.">
      <p className="text-sm font-bold text-white">Shuffle partition imbalance</p>
      <p className="mt-1 text-xs leading-5 text-neutral-300">Uneven data distribution increases the time needed for the slowest task.</p>
      <div className="mb-3 ml-8 mt-5 flex justify-between text-[10px] text-neutral-400" aria-hidden="true">
        {[0, 20, 40, 60, 80].map((size) => <span key={size}>{size} GB</span>)}
      </div>
      <ul className="space-y-4">
        {[1, 2, 3, 4].map((partition) => {
          const skewed = partition === 4;
          return (
            <li key={partition}>
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-xs font-bold">P{partition}</span>
                <div className="h-6 flex-1 overflow-hidden rounded bg-neutral-800" aria-hidden="true">
                  <div className={`h-full rounded ${skewed ? "bg-orange-400" : "bg-blue-400"}`} style={{ width: skewed ? "87.5%" : "12.5%" }} />
                </div>
              </div>
              <p className={`ml-8 mt-1 text-[11px] ${skewed ? "text-orange-200" : "text-neutral-300"}`}>{skewed ? "70 GB · 14 minutes" : "10 GB · 2 minutes"}</p>
            </li>
          );
        })}
      </ul>
      <figcaption className="mt-4 border-t border-neutral-700 pt-3 text-xs leading-5 text-neutral-300">Illustrative times. The stage still waits for Partition 4 after the other three partitions finish.</figcaption>
    </figure>
  );
}
