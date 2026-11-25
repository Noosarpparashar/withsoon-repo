export default function SparkFilePartitionSizing() {
  return <figure aria-label="For one GiB of splittable input, 64 MiB yields about sixteen partitions, 128 yields eight, 256 yields four, and 512 yields two" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">1 GiB of splittable input data</p>
    <div className="mt-5 space-y-4">{[{size:64,count:16},{size:128,count:8},{size:256,count:4},{size:512,count:2}].map(({size,count})=><div key={size}><div className="mb-2 flex justify-between text-xs"><span>{size} MiB target</span><span>{count} partitions</span></div><div className="flex gap-1">{Array.from({length:count},(_,i)=><span key={i} aria-hidden="true" className="h-7 min-w-0 flex-1 rounded border border-blue-400/40 bg-blue-400/15" />)}</div></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Simplified estimates ignoring file-opening cost and other sizing rules. Each box represents one input partition, normally processed by one task.</figcaption>
  </figure>;
}
