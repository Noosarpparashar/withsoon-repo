export default function SparkPartitionSizing({ adaptive = false }: { adaptive?: boolean }) {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-center text-neutral-200 sm:p-5" aria-label={adaptive ? "Illustrative AQE coalescing from 400 initial shuffle partitions to 100" : "40 available cores, with two to four partitions per core, gives an initial estimate of 80 to 160 partitions"}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">{adaptive ? "Adaptive shuffle partition sizing" : "Initial parallelism estimate"}</p>
      <div className={`grid gap-3 ${adaptive ? "sm:grid-cols-2" : "grid-cols-3"}`}>
        {(adaptive ? [{label: "Initial shuffle partitions", value: "400"}, {label: "Illustrative runtime result", value: "100"}] : [{label: "Total cores", value: "40"}, {label: "2 × cores", value: "80"}, {label: "4 × cores", value: "160"}]).map(({label,value},i) => (
          <div key={label} className={`min-w-0 rounded-xl border p-3 ${i === 0 ? "border-blue-400/35 bg-blue-400/5" : "border-emerald-400/35 bg-emerald-400/5"}`}>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-2 text-xs leading-5">{label}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">{adaptive ? "AQE coalesces small shuffle partitions. This example is illustrative; the actual count depends on runtime statistics and configuration." : "80–160 partitions is a starting estimate. Data size and workload can call for more partitions, processed in waves."}</figcaption>
    </figure>
  );
}
