export default function SparkLineageRecovery() {
  const partitions = [
    { number: 1, source: "[1, 2]", mapped: "[2, 4]", filtered: "[]" },
    { number: 2, source: "[3, 4]", mapped: "[6, 8]", filtered: "[6, 8]" },
    { number: 3, source: "[5, 6]", mapped: "[10, 12]", filtered: "[10, 12]" },
  ];

  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Three partitions execute map and filter independently. Partition 2 is lost and recomputed from source values three and four, while partitions 1 and 3 are unaffected.">
      <p className="mb-4 text-center text-sm font-bold text-white">Original execution</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {partitions.map(({ number, source, mapped, filtered }) => (
          <div key={number} className="min-w-0 rounded-lg border border-blue-400/35 bg-blue-400/5 px-2 py-3 text-center">
            <p className="text-xs font-bold text-white">Partition {number}</p>
            <p className="mt-2 font-mono text-xs">{source}</p>
            <p className="mt-2 text-[10px] leading-5 text-neutral-300">map(x × 2)</p>
            <span className="text-neutral-400" aria-hidden="true">↓</span>
            <p className="font-mono text-xs">{mapped}</p>
            <p className="mt-2 text-[10px] leading-5 text-neutral-300">filter(x &gt; 5)</p>
            <span className="text-neutral-400" aria-hidden="true">↓</span>
            <p className="font-mono text-xs text-emerald-200">{filtered}</p>
          </div>
        ))}
      </div>

      <p className="mb-3 mt-5 text-center text-xs font-semibold text-neutral-200">Suppose the executor holding Partition 2 fails</p>
      <div className="grid grid-cols-3 gap-2">
        {partitions.map(({ number }) => (
          <div key={number} className={`min-w-0 rounded-lg border px-1 py-3 text-center ${number === 2 ? "border-red-400/40 bg-red-400/10" : "border-emerald-400/25 bg-emerald-400/5"}`}>
            <p className="text-[11px] font-bold text-white">Partition {number}</p>
            <p className={`mt-1 text-[11px] ${number === 2 ? "text-red-200" : "text-emerald-200"}`}>{number === 2 ? "Lost" : "Unaffected"}</p>
          </div>
        ))}
      </div>

      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <div className="rounded-xl border border-amber-400/35 bg-amber-400/5 p-3">
        <p className="mb-3 text-center text-xs font-bold text-white">Spark uses lineage to recompute Partition 2</p>
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="Partition 2 recomputation steps">
          {[
            { label: "Source", result: "[3, 4]" },
            { label: "map(x × 2)", result: "[6, 8]" },
            { label: "filter(x > 5)", result: "[6, 8]" },
          ].map(({ label, result }, index) => (
            <li key={label} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              {index > 0 ? <span className="text-center text-neutral-400" aria-hidden="true"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></span> : null}
              <div className="min-w-0 flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-2 py-2 text-center">
                <p className="text-[10px] leading-5 text-neutral-300">{label}</p>
                <p className="font-mono text-xs leading-5">{result}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-center text-xs font-semibold text-emerald-200">Partition recovered</p>
      </div>

      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">Only the missing partition needs recomputation in this simplified narrow-transformation example.</figcaption>
    </figure>
  );
}
