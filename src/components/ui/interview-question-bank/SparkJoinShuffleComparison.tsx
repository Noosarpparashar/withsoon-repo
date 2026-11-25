export default function SparkJoinShuffleComparison() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Comparison: a shuffle join redistributes both inputs by key when required; a supported broadcast join distributes the small side and avoids repartitioning the large side">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-orange-400/30 bg-orange-400/5 p-3">
          <p className="text-center text-sm font-bold text-white">Shuffle join</p>
          <p className="mb-4 mt-1 text-center text-xs text-neutral-300">Both sides redistributed</p>
          <div className="grid grid-cols-2 gap-2">
            {["Left input", "Right input"].map((label) => (
              <div key={label} className="rounded-lg border border-neutral-600 bg-neutral-800 px-2 py-3 text-center text-[11px]">{label}</div>
            ))}
          </div>
          <div className="py-2 text-center text-lg text-orange-400" aria-hidden="true">↓</div>
          <div className="rounded-lg border border-orange-400/35 p-3 text-center">
            <p className="text-xs font-semibold text-orange-200">Shuffle by join key</p>
            <p className="mt-1 text-[11px] leading-5 text-neutral-300">Matching keys move into compatible partitions</p>
          </div>
          <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
          <div className="rounded-lg border border-neutral-600 bg-neutral-800 p-3 text-center text-xs">Partition-local join</div>
        </div>

        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3">
          <p className="text-center text-sm font-bold text-white">Broadcast join</p>
          <p className="mb-4 mt-1 text-center text-xs text-neutral-300">Small side broadcast to executors</p>
          <div className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-3 text-center text-[11px]">Safely small input</div>
          <div className="py-2 text-center text-lg text-blue-400" aria-hidden="true">↓</div>
          <div className="rounded-lg border border-emerald-400/35 p-3 text-center">
            <p className="text-xs font-semibold text-emerald-200">Available for local joins</p>
            <p className="mt-1 text-[11px] leading-5 text-neutral-300">Large-side partitions probe the broadcast relation</p>
          </div>
          <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
          <div className="rounded-lg border border-neutral-600 bg-neutral-800 p-3 text-center text-xs">Large-side join-key shuffle avoided</div>
        </div>
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-300">Broadcasting still transfers the small relation and consumes memory. The selected strategy depends on join conditions, sizes, and supported build sides.</figcaption>
    </figure>
  );
}
