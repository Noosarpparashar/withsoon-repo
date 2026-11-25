export default function SparkShuffleDiagram() {
  const inputs = [["IT", "HR"], ["IT", "Finance"], ["HR", "Finance"]];
  const outputs = [["IT", "IT"], ["HR", "HR"], ["Finance", "Finance"]];
  const positions = [100, 300, 500];
  const edges = [[0, 0], [0, 1], [1, 0], [1, 2], [2, 1], [2, 2]];

  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Shuffle by department: IT, HR, and Finance records begin in different partitions and are redistributed so matching department keys are grouped together">
      <p className="mb-4 text-center text-sm font-bold text-white">Before shuffle</p>
      <p className="mb-3 text-center text-xs text-neutral-300">Same department exists in multiple partitions</p>
      <div className="grid grid-cols-3 gap-2">
        {inputs.map((departments, partition) => (
          <div key={partition} className="min-w-0 rounded-lg border border-blue-400/35 bg-blue-400/5 px-1 py-3 text-center">
            <p className="mb-2 text-[11px] font-bold text-white">Partition {partition + 1}</p>
            {departments.map((department, index) => <p key={index} className="text-[11px] leading-6 text-blue-200">{department}</p>)}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs font-semibold text-orange-300">Shuffle by department</p>
      <svg viewBox="0 0 600 100" className="h-20 w-full sm:h-24" preserveAspectRatio="none" fill="none" aria-hidden="true">
        {edges.map(([from, to]) => (
          <g key={`${from}-${to}`} stroke="#fb923c" strokeWidth="1.8" opacity="0.75">
            <path d={`M ${positions[from]} 4 C ${positions[from]} 40, ${positions[to]} 60, ${positions[to]} 93`} vectorEffect="non-scaling-stroke" />
            <path d={`M ${positions[to] - 5} 85 L ${positions[to]} 94 L ${positions[to] + 5} 85`} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>

      <p className="mb-3 text-center text-sm font-bold text-white">After shuffle</p>
      <div className="grid grid-cols-3 gap-2">
        {outputs.map((departments, partition) => (
          <div key={partition} className="min-w-0 rounded-lg border border-emerald-400/35 bg-emerald-400/5 px-1 py-3 text-center">
            <p className="mb-2 text-[11px] font-bold text-white">Partition {partition + 1}</p>
            {departments.map((department, index) => <p key={index} className="text-[11px] leading-6 text-emerald-200">{department}</p>)}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-neutral-300">Records with the same key are grouped together</p>
      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">Conceptual illustration; actual hash partitioning may place multiple keys in one partition.</figcaption>
    </figure>
  );
}
