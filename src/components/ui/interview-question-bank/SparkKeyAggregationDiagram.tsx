export default function SparkKeyAggregationDiagram() {
  const input = ["P1: A10, A30, B20", "P2: A50, B40", "P3: B60"];
  const partials = ["P1: A40, B20", "P2: A50, B40", "P3: B60"];

  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="With the illustrated partitions, groupByKey transfers six values; reduceByKey combines two A values in partition 1 and transfers five partial values. Both sums are A equals 90 and B equals 120.">
      <div className="grid gap-4 sm:grid-cols-2">
        {[false, true].map((reduce) => (
          <div key={String(reduce)} className={`min-w-0 rounded-xl border p-3 ${reduce ? "border-emerald-400/30 bg-emerald-400/5" : "border-orange-400/30 bg-orange-400/5"}`}>
            <p className="mb-4 text-center font-mono text-sm font-bold text-white">{reduce ? "reduceByKey()" : "groupByKey()"}</p>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Input partitions</p>
            <ul className="space-y-2">
              {input.map((partition) => <li key={partition} className="rounded-md border border-neutral-600 bg-neutral-800 px-2 py-2 font-mono text-[10px] leading-5">{partition}</li>)}
            </ul>
            <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

            {reduce ? (
              <div>
                <p className="mb-2 text-center text-xs font-semibold text-emerald-200">Combine values locally</p>
                <ul className="space-y-2">
                  {partials.map((partition) => <li key={partition} className="rounded-md border border-emerald-400/25 px-2 py-2 font-mono text-[10px] leading-5">{partition}</li>)}
                </ul>
                <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
              </div>
            ) : null}

            <p className={`rounded-lg border px-2 py-3 text-center text-xs font-bold ${reduce ? "border-emerald-400/30 text-emerald-200" : "border-orange-400/30 text-orange-200"}`}>
              {reduce ? "Shuffle 5 partial values" : "Shuffle all 6 values"}
            </p>
            <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
            <div className="rounded-lg border border-neutral-600 bg-neutral-800 p-3 font-mono text-[10px] leading-6">
              <p>{reduce ? "A: 40 + 50 = 90" : "A: [10, 30, 50]"}</p>
              <p>{reduce ? "B: 20 + 40 + 60 = 120" : "B: [20, 40, 60]"}</p>
            </div>
            {!reduce ? <p className="mt-2 text-center text-[11px] leading-5 text-neutral-300">mapValues(sum) → A: 90, B: 120</p> : null}
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-300">Conceptual example with the illustrated input layout. Real benefits become much greater when many records share each key within individual partitions.</figcaption>
    </figure>
  );
}
