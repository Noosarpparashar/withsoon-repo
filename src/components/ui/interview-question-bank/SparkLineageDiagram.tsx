export default function SparkLineageDiagram() {
  const steps = [
    { label: "Original RDD", values: "[1, 2, 3, 4, 5]", transformation: "" },
    { label: "RDD 1", values: "[2, 4, 6, 8, 10]", transformation: "map(x × 2)" },
    { label: "RDD 2", values: "[6, 8, 10]", transformation: "filter(x > 5)" },
    { label: "RDD 3", values: "[16, 18, 20]", transformation: "map(x + 10)" },
  ];

  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="RDD lineage: original numbers are doubled, filtered above five, then increased by ten; collect triggers execution">
      <p className="mb-4 text-center text-sm font-bold text-white">Transformation lineage</p>
      <ol>
        {steps.map(({ label, values, transformation }, index) => (
          <li key={label}>
            {transformation ? (
              <div className="py-2 text-center">
                <p className="font-mono text-[11px] text-neutral-300">{transformation}</p>
                <span className="text-lg text-neutral-400" aria-hidden="true">↓</span>
              </div>
            ) : null}
            <div className={`rounded-lg border px-3 py-3 text-center ${index === 0 ? "border-blue-400/35 bg-blue-400/5" : "border-emerald-400/35 bg-emerald-400/5"}`}>
              <p className="text-xs font-bold text-white">{label}</p>
              <p className="mt-1 font-mono text-xs leading-5 text-neutral-300">{values}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <div className="rounded-lg border border-amber-400/35 bg-amber-400/5 px-3 py-3 text-center">
        <p className="font-mono text-xs font-bold text-white">collect()</p>
        <p className="mt-1 text-xs text-neutral-300">Action triggers execution</p>
      </div>
    </figure>
  );
}
