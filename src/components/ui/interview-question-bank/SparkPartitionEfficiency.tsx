"use client";

import { useState } from "react";

export function SparkManyTaskWaves() {
  return <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label="8000 tasks execute in approximately 200 waves on 40 task slots">
    <p className="text-center font-bold text-white">8,000 tasks across 200 waves</p>
    <p className="mt-1 text-center text-xs text-neutral-400">Each row represents 20 waves</p>
    <div className="mt-4 grid grid-cols-10 gap-1.5">{Array.from({length:100},(_,i)=><span key={i} aria-hidden="true" className={`h-4 rounded border ${i < 10 ? "border-emerald-400/50 bg-emerald-400/25" : "border-blue-400/30 bg-blue-400/10"}`} />)}</div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Each cell represents two waves of 40 tasks. Conceptual waves assume uniform task durations, all slots available, and no retries.</figcaption>
  </figure>;
}

export default function SparkPartitionEfficiency() {
  const [gib, setGib] = useState(1000);
  const [partitions, setPartitions] = useState(8000);
  const size = gib * 1024 / partitions;
  return <div className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="font-bold text-white">Explore partition sizing on a 40-core cluster</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Data size (GiB)<input type="number" min="1" max="100000" value={gib} onChange={e=>setGib(Math.max(1,Math.min(100000,Number(e.target.value)||1)))} className="mt-2 block w-full rounded-lg border border-neutral-600 bg-neutral-900 p-2 text-white" /></label>
      <label className="text-sm">Partitions<input type="number" min="1" max="1000000" value={partitions} onChange={e=>setPartitions(Math.max(1,Math.min(1000000,Math.round(Number(e.target.value))||1)))} className="mt-2 block w-full rounded-lg border border-neutral-600 bg-neutral-900 p-2 text-white" /></label>
    </div>
    <div aria-live="polite" className="mt-4 grid grid-cols-3 gap-2">
      {[{label:"Avg. partition",value:`${size.toLocaleString(undefined,{maximumFractionDigits:1})} MiB`},{label:"Task waves",value:Math.ceil(partitions/40).toLocaleString()},{label:"Concurrent tasks",value:Math.min(40,partitions).toString()}].map(({label,value})=><div key={label} className="min-w-0 rounded-lg border border-blue-400/30 p-2 text-center"><p className="text-[11px] text-neutral-400">{label}</p><p className="mt-2 break-words text-sm font-bold text-blue-300 sm:text-lg">{value}</p></div>)}
    </div>
    <p className="mt-4 text-sm leading-6">{size < 64 ? "Small partitions may add scheduling overhead. CPU-intensive work may still benefit; measure task duration." : size <= 256 ? "This is a common starting range for many ETL workloads. Validate using Spark UI metrics." : "Larger partitions may increase task duration and memory pressure. Check the working set, spill, and skew."}</p>
    <p className="mt-3 text-xs leading-5 text-neutral-400">Uses binary units. Assumes uniform partitions, one CPU core per task, 40 available slots, similar task durations, and no AQE coalescing.</p>
  </div>;
}
