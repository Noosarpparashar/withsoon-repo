export default function SparkReadLifecycle() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Spark read lifecycle: validate the path and resolve metadata immediately; invalid paths raise an exception, valid paths form a logical plan, and an action triggers data processing">
      <p className="mb-4 text-center text-sm font-bold text-white">Spark read lifecycle</p>
      <div className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-4 text-center">
        <p className="font-mono text-xs font-bold text-white">spark.read.parquet(path)</p>
        <p className="mt-2 text-xs text-neutral-300">Driver initiates the operation</p>
      </div>
      <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <div className="rounded-lg border border-amber-400/35 bg-amber-400/5 p-4 text-center">
        <p className="text-sm font-bold text-white">Validate path and resolve metadata</p>
        <p className="mt-2 text-xs leading-5 text-neutral-300">Can happen immediately, before an action</p>
      </div>
      <div className="grid gap-3 pt-3 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-center text-[11px] text-neutral-400">Invalid path ↓</p>
          <div className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-center">
            <p className="text-sm font-bold text-red-100">Exception</p>
            <p className="mt-2 font-mono text-[11px] text-red-200">PATH_NOT_FOUND</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-center text-[11px] text-neutral-400">Valid input ↓</p>
          <div className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-4 text-center">
            <p className="text-sm font-bold text-white">Build logical plan</p>
            <p className="mt-2 text-xs leading-5 text-neutral-300">Dataset processing remains lazy</p>
          </div>
          <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
          <div className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-4 text-center">
            <p className="font-mono text-xs font-bold text-white">df.show() / df.count()</p>
            <p className="mt-2 text-xs leading-5 text-neutral-300">Action triggers job execution and data reading</p>
          </div>
        </div>
      </div>
    </figure>
  );
}
