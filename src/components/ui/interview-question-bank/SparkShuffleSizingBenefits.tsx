export default function SparkShuffleSizingBenefits() {
  return <figure aria-label="Conceptual comparison of 50, 800, and 10000 shuffle partitions for 100 GiB on 40 cores" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Comparing shuffle partition configurations</p>
    <p className="mt-1 text-center text-xs text-neutral-400">100 GiB shuffle · 40 CPU cores</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {[{label:"Too few",count:"50",size:"2 GiB per task",detail:"Large tasks · greater spill risk",balanced:false},{label:"Balanced",count:"800",size:"128 MiB per task",detail:"Manageable tasks · reasonable overhead",balanced:true},{label:"Too many",count:"10,000",size:"≈10 MiB per task",detail:"Tiny tasks · greater scheduling overhead",balanced:false}].map(({label,count,size,detail,balanced})=><div key={count} className={`rounded-xl border p-4 text-center ${balanced ? "border-emerald-400/40 bg-emerald-400/5" : "border-amber-400/30 bg-amber-400/5"}`}>
        <p className={`text-xs font-semibold ${balanced ? "text-emerald-300" : "text-amber-300"}`}>{label}</p><p className="mt-3 text-2xl font-bold text-white">{count}</p><p className="text-xs">partitions</p><p className="mt-3 text-xs font-semibold">{size}</p><p className="mt-2 text-xs leading-5 text-neutral-400">{detail}</p>
      </div>)}
    </div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Conceptual comparison, not a measured benchmark. Assumes balanced partitions; workload, memory, skew, and AQE affect actual performance.</figcaption>
  </figure>;
}
