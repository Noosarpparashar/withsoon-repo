export default function SparkLargeBroadcast() {
  return <figure aria-label="Illustrative two GiB broadcast occupies 25 percent of an eight GiB executor heap, with twenty GiB across ten copies" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Illustrative executor heap allocation</p>
    <div className="mt-5 flex overflow-hidden rounded-xl border border-neutral-600 text-center text-xs"><div className="w-1/4 bg-amber-400/20 p-3 text-amber-200">2 GiB<br />Broadcast<br />25%</div><div className="flex flex-1 items-center justify-center bg-blue-400/10 p-3">Remaining 6 GiB</div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-neutral-700 p-4 text-center"><p className="text-xs text-neutral-400">Across 10 executors</p><p className="mt-2 text-2xl font-bold text-amber-300">20 GiB</p><p className="mt-1 text-xs">Assuming one 2 GiB copy each</p></div><div className="rounded-xl border border-neutral-700 p-4 text-center"><p className="text-xs text-neutral-400">Heap per executor</p><p className="mt-2 text-2xl font-bold text-blue-300">8 GiB</p><p className="mt-1 text-xs">Also needed for other processing</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Logical sizes only, not a measured heap breakdown. Serialization, deserialization, caching, and Python worker copies can change memory usage. Executors may share a node.</figcaption>
  </figure>;
}
