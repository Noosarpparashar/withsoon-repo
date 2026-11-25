"use client";

import { useState } from "react";

const results: Record<string, (string | number)[][]> = {
  Inner: [[1,"Alice","IT"],[2,"Bob","HR"]],
  "Left Outer": [[1,"Alice","IT"],[2,"Bob","HR"],[3,"Charlie","NULL"]],
  "Right Outer": [[1,"Alice","IT"],[2,"Bob","HR"],[4,"NULL","Sales"]],
  "Full Outer": [[1,"Alice","IT"],[2,"Bob","HR"],[3,"Charlie","NULL"],[4,"NULL","Sales"]],
  "Left Semi": [[1,"Alice"],[2,"Bob"]],
  "Left Anti": [[3,"Charlie"]],
};

export default function SparkJoinExplorer() {
  const [type, setType] = useState("Inner");
  return <div className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="font-bold text-white">Explore different join results</p>
    <div role="group" aria-label="Choose a join type" className="my-4 flex flex-wrap gap-2">{Object.keys(results).map(label=><button key={label} type="button" aria-pressed={type===label} onClick={()=>setType(label)} className={`rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${type===label ? "border-blue-400 bg-blue-400/20 text-blue-200" : "border-neutral-600 text-neutral-300"}`}>{label}</button>)}</div>
    <div aria-live="polite"><p className="mb-2 text-xs text-neutral-400">{type} · {results[type].length} rows · join on ID</p>
      <table className="w-full text-left text-xs"><thead><tr>{["ID","Name",...(/Semi|Anti/.test(type)?[]:["Department"])].map(h=><th key={h} className="border-b border-neutral-600 p-2 text-white">{h}</th>)}</tr></thead><tbody>{results[type].map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} className={`border-b border-neutral-800 p-2 ${v==="NULL" ? "text-amber-300" : "text-neutral-200"}`}>{v}</td>)}</tr>)}</tbody></table>
    </div>
    <p className="mt-3 text-xs leading-5 text-neutral-400">Unique IDs in this example. Semi and anti joins return only left-side columns; duplicate keys can produce multiple matches in other joins.</p>
  </div>;
}

export function SparkJoinSelection() {
  return <figure aria-label="Simplified physical join selection for equi and non-equi joins" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-3 text-center text-sm font-bold text-white">Join condition + table statistics</p>
    <div aria-hidden="true" className="py-3 text-center">↓</div>
    <div className="grid gap-3 sm:grid-cols-2">{[false,true].map(non=><div key={String(non)} className="rounded-xl border border-neutral-700 p-3 text-center"><p className="text-sm font-bold text-blue-300">{non ? "Non-equi join" : "Equi-join"}</p><p className="my-3 text-xs">{non ? "Is broadcast suitable?" : "Small side broadcastable?"}</p><p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 text-xs text-emerald-300">Yes → {non ? "Broadcast Nested Loop Join" : "Broadcast Hash Join"}</p><p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">Otherwise → {non ? "Nested-loop or Cartesian strategy where applicable" : "Sort Merge Join or Shuffle Hash Join"}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Simplified decision diagram. Join-type support, hints, configuration, partitioning, and runtime statistics also influence selection. AQE may revise the strategy during execution.</figcaption>
  </figure>;
}
