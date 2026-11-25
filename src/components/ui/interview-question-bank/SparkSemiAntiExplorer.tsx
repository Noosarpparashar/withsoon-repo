"use client";

import { useState } from "react";

export default function SparkSemiAntiExplorer() {
  const [anti, setAnti] = useState(false);
  const rows = anti ? [[2,"Bob"],[4,"David"]] : [[1,"Alice"],[3,"Charlie"]];
  return <div className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="font-bold text-white">Compare join results</p>
    <p className="mt-1 text-xs leading-5 text-neutral-400">Left IDs: 1, 2, 3, 4 · Right IDs: 1, 3, 5</p>
    <div role="group" aria-label="Choose semi or anti join" className="my-4 flex gap-2">{[false,true].map(a=><button key={String(a)} type="button" aria-pressed={anti===a} onClick={()=>setAnti(a)} className={`rounded-lg border px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${anti===a ? "border-blue-400 bg-blue-400/20 text-blue-200" : "border-neutral-600 text-neutral-300"}`}>Left {a ? "Anti" : "Semi"}</button>)}</div>
    <div aria-live="polite"><p className="mb-3 text-sm leading-6">Returns employees whose IDs {anti ? "do not exist" : "exist"} in the right DataFrame.</p><table className="w-full text-left text-xs"><thead><tr><th className="border-b border-neutral-600 p-2">ID</th><th className="border-b border-neutral-600 p-2">Name</th></tr></thead><tbody>{rows.map(([id,name])=><tr key={id}><td className="border-b border-neutral-800 p-2">{id}</td><td className="border-b border-neutral-800 p-2">{name}</td></tr>)}</tbody></table></div>
    <p className="mt-3 text-xs leading-5 text-neutral-400">Both return only left-side columns. Right-side ID 5 never appears in the output.</p>
  </div>;
}
