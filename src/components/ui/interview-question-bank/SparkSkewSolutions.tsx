"use client";

import { useState } from "react";

export function SparkSkewSolutionDiagram({ adaptive = false }: { adaptive?: boolean }) {
  const before = adaptive ? ["80 MiB","90 MiB","70 MiB","1 GiB"] : ["10M","100K","120K","90K"];
  const after = adaptive ? ["256 MiB","256 MiB","256 MiB","256 MiB"] : ["2.5M","2.6M","2.4M","2.5M"];
  return <figure aria-label={adaptive ? "AQE splits a one GiB skewed partition into four illustrative 256 MiB pieces" : "Salting distributes one hot key across multiple tasks"} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-3 text-sm font-bold text-white">{adaptive ? "Before AQE optimization" : "Without salting"}</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{before.map((v,i)=><div key={i} className={`rounded-lg border p-3 text-center text-xs ${(adaptive ? i===3 : i===0) ? "border-amber-400/40 bg-amber-400/10" : "border-neutral-600"}`}><p>P{i+1}</p><p className="mt-2 font-bold">{v}</p></div>)}</div>
    <p className="py-4 text-center text-xs text-amber-300">↓ {adaptive ? "Split P4 into smaller task inputs" : "Distribute the hot key using salted composite keys"}</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{after.map((v,i)=><div key={i} className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-3 text-center text-xs"><p>{adaptive ? `P4${"abcd"[i]}` : `Group ${i+1}`}</p><p className="mt-2 font-bold text-emerald-300">{v}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">{adaptive ? "Illustrative split only; P1–P3 remain unchanged. Actual split sizes depend on shuffle blocks and runtime decisions; the other join side may be replicated." : "After-view shows approximately 10M hot-key rows only; other keys are omitted. Salt groups need not map one-to-one to physical partitions, and their sizes need not be exactly equal."}</figcaption>
  </figure>;
}

const scenarios = [
  {label:"Large table + small dimension",title:"Use a broadcast join",detail:"A sufficiently small dimension can be copied to executors, avoiding the large-side join shuffle.",code:'transactions.join(broadcast(customers), "customer_id")'},
  {label:"Two large tables, skewed shuffle",title:"Start with AQE skew-join handling",detail:"For supported physical joins, AQE can split oversized shuffle partitions and replicate matching partition data as needed.",code:'spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")'},
  {label:"A few extremely frequent keys",title:"Consider selective salting",detail:"Split known hot keys into composite keys and replicate the matching join-side records across salts. Measure the extra shuffle and replication cost.",code:'salted_left.join(replicated_right, ["customer_id", "salt"])'},
  {label:"Skewed groupBy or aggregation",title:"Use two-stage aggregation where valid",detail:"For decomposable aggregates such as sum, aggregate by key plus bucket, then combine by the original key. A join-specific AQE setting does not fix every aggregation.",code:'partial = df.groupBy("customer_id", "bucket").sum("amount")'},
];

export default function SparkSkewScenarioChooser() {
  const [selected,setSelected] = useState(0);
  return <div className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5"><p className="font-bold text-white">Choose your scenario</p><div role="group" aria-label="Select a skew scenario" className="my-4 grid gap-2 sm:grid-cols-2">{scenarios.map((s,i)=><button key={s.label} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)} className={`rounded-lg border p-3 text-left text-xs focus-visible:outline-2 focus-visible:outline-blue-400 ${i===selected ? "border-blue-400 bg-blue-400/15 text-blue-200" : "border-neutral-600"}`}>{s.label}</button>)}</div><div aria-live="polite"><p className="text-sm font-bold text-emerald-300">{scenarios[selected].title}</p><p className="mt-2 text-xs leading-6">{scenarios[selected].detail}</p><pre className="mt-3 overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs"><code>{scenarios[selected].code}</code></pre></div></div>;
}
