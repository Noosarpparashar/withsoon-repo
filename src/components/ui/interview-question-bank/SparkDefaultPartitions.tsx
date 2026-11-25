export default function SparkDefaultPartitions() {
  return (
    <figure aria-label="Illustrative 10 GiB input produces about 80 input partitions, followed by 200 initial shuffle partitions which AQE may adjust" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-center text-neutral-200 sm:p-5">
      <p className="font-bold text-white">10 GiB Parquet data</p>
      <p className="mt-1 text-xs text-neutral-400">Illustrative splittable input</p>
      <div aria-hidden="true" className="py-3">↓</div>
      <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-4">
        <p className="text-2xl font-bold text-blue-300">≈80</p>
        <p className="mt-1 text-sm font-semibold">Input partitions</p>
        <p className="mt-1 text-xs text-neutral-400">10 × 1024 MiB ÷ 128 MiB</p>
      </div>
      <div className="py-4 text-sm font-semibold text-amber-300">↓ Shuffle: groupBy(&quot;country&quot;) ↓</div>
      <div className="rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-4">
        <p className="text-2xl font-bold text-emerald-300">200</p>
        <p className="mt-1 text-sm font-semibold">Initial shuffle partitions</p>
        <p className="mt-1 text-xs text-neutral-400">Before AQE adjustments</p>
      </div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Input and shuffle partition counts are determined separately. AQE may coalesce small shuffle partitions at runtime.</figcaption>
    </figure>
  );
}
