"use client";

import { useState } from "react";

export default function SparkJoinMultiplicity() {
  const [left,setLeft] = useState(5);
  const [right,setRight] = useState(4);
  return <div className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="font-bold text-white">Explore row multiplication</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-xs">Matching rows in left table<input type="number" min="0" max="1000000" value={left} onChange={e=>setLeft(Math.max(0,Math.min(1000000,Math.round(Number(e.target.value))||0)))} className="mt-2 block w-full rounded-lg border border-neutral-600 bg-neutral-900 p-2 text-sm text-white" /></label>
      <label className="text-xs">Matching rows in right table<input type="number" min="0" max="1000000" value={right} onChange={e=>setRight(Math.max(0,Math.min(1000000,Math.round(Number(e.target.value))||0)))} className="mt-2 block w-full rounded-lg border border-neutral-600 bg-neutral-900 p-2 text-sm text-white" /></label>
    </div>
    <div aria-live="polite" className="mt-4 grid grid-cols-3 gap-2">{[{label:"Left",value:left},{label:"Right",value:right},{label:"Joined",value:left*right}].map(({label,value})=><div key={label} className={`min-w-0 rounded-xl border p-3 text-center ${label==="Joined" ? "border-emerald-400/35 bg-emerald-400/5" : "border-blue-400/35 bg-blue-400/5"}`}><p className="text-xs text-neutral-400">{label}</p><p className="mt-2 break-all text-lg font-bold text-white">{value.toLocaleString()}</p></div>)}</div>
    <p className="mt-3 text-xs leading-5 text-neutral-400">For one shared non-null key in an inner equi-join: M matching left rows × N matching right rows. Assumes no additional condition removes matching pairs.</p>
  </div>;
}
