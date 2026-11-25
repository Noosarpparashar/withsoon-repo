export default function SparkTransformationDiagram({ wide = false }: { wide?: boolean }) {
  const inputs = wide ? ["A: 1 · B: 2", "A: 3 · C: 4", "B: 5 · C: 6"] : ["[1, 2]", "[3, 4]", "[5, 6]"];
  const outputs = wide ? ["A: 4", "B: 7", "C: 10"] : ["[2, 4]", "[6, 8]", "[10, 12]"];
  const edges = wide ? [[0, 0], [0, 1], [1, 0], [1, 2], [2, 1], [2, 2]] : [[0, 0], [1, 1], [2, 2]];
  const positions = [100, 300, 500];

  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label={wide ? "Wide transformation: key aggregation redistributes records from multiple input partitions into grouped output partitions" : "Narrow transformation: each input partition maps independently to an output partition without shuffle"}>
      <p className="text-center text-sm font-bold text-white">{wide ? "Wide transformation — shuffle required" : "Narrow transformation — no shuffle"}</p>
      <p className="mb-5 mt-1 text-center text-xs text-neutral-300">{wide ? "Group matching keys and sum their values" : "map(x × 2): process each partition independently"}</p>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Input partitions</p>
      <div className="grid grid-cols-3 gap-2">
        {inputs.map((values, index) => (
          <div key={index} className="min-w-0 rounded-lg border border-blue-400/35 bg-blue-400/5 px-1 py-3 text-center">
            <p className="text-[11px] font-bold leading-5 text-neutral-100">Partition {index + 1}</p>
            <p className="mt-1 text-[10px] leading-5 text-blue-200 sm:text-xs">{values}</p>
          </div>
        ))}
      </div>

      <svg viewBox="0 0 600 105" className="h-20 w-full text-neutral-500 sm:h-24" preserveAspectRatio="none" fill="none" aria-hidden="true">
        {edges.map(([from, to]) => (
          <g key={`${from}-${to}`} stroke={wide ? "#fb923c" : "#60a5fa"} strokeWidth="1.8" opacity={wide ? 0.7 : 0.9}>
            <path d={`M ${positions[from]} 4 C ${positions[from]} 40, ${positions[to]} 65, ${positions[to]} 98`} vectorEffect="non-scaling-stroke" />
            <path d={`M ${positions[to] - 5} 90 L ${positions[to]} 99 L ${positions[to] + 5} 90`} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Output partitions</p>
      <div className="grid grid-cols-3 gap-2">
        {outputs.map((values, index) => (
          <div key={index} className="min-w-0 rounded-lg border border-emerald-400/35 bg-emerald-400/5 px-1 py-3 text-center">
            <p className="text-[11px] font-bold leading-5 text-neutral-100">Partition {index + 1}</p>
            <p className="mt-1 text-[10px] leading-5 text-emerald-200 sm:text-xs">{values}</p>
          </div>
        ))}
      </div>

      <figcaption className="mt-4 text-xs leading-5 text-neutral-300">
        {wide
          ? "Output partitions can receive data from multiple input partitions. This illustrates grouping; actual hash placement does not guarantee one key per partition."
          : "Each illustrated output partition reads from one input partition. Compatible narrow operations can be pipelined within the same stage."}
      </figcaption>
    </figure>
  );
}
