export default function SparkShuffleInternals() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Three upstream shuffle-map tasks write blocks for two downstream partitions. Downstream tasks fetch their assigned blocks, then merge or aggregate records.">
      <p className="mb-4 text-center text-sm font-bold text-white">Upstream stage — shuffle write</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((task) => (
          <div key={task} className="min-w-0 rounded-lg border border-blue-400/35 bg-blue-400/5 p-3 text-center">
            <p className="text-xs font-bold text-white">Map task {task}</p>
            <p className="mt-2 text-[11px] leading-5 text-neutral-300">Read input partition</p>
            <p className="text-[11px] leading-5 text-neutral-300">Partition records by destination</p>
            <p className="mt-2 rounded border border-neutral-600 bg-neutral-800 px-1 py-2 text-[10px] leading-5">Shuffle blocks for P0 and P1</p>
          </div>
        ))}
      </div>

      <div className="my-4 rounded-lg border border-orange-400/30 bg-orange-400/5 p-3 text-center">
        <p className="text-xs font-bold text-orange-200">Shuffle boundary</p>
        <p className="mt-1 text-[11px] leading-5 text-neutral-300">Downstream tasks fetch local and remote blocks from upstream outputs</p>
        <span className="mt-2 block text-lg text-orange-400" aria-hidden="true">↓</span>
      </div>

      <p className="mb-3 text-center text-sm font-bold text-white">Downstream stage — shuffle read</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((partition) => (
          <div key={partition} className="min-w-0 rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-3 text-center">
            <p className="text-xs font-bold text-white">Task for partition {partition}</p>
            <p className="mt-2 text-[11px] leading-5 text-neutral-300">Fetch P{partition} blocks from map tasks 1, 2, 3</p>
            <p className="mt-2 text-[11px] leading-5 text-emerald-200">Merge / sort / aggregate as required</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">Illustrative partition counts. The Driver coordinates scheduling and output-location metadata; the bulk shuffle data is fetched between execution processes.</figcaption>
    </figure>
  );
}
