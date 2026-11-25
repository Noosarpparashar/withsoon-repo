import content from "@/lib/sparkPerformanceAnswer.json";
import type { ReactNode } from "react";
import SparkExecutionHierarchy from "./SparkExecutionHierarchy";
import { SparkPracticalExecution, SparkTaskWaves } from "./SparkPracticalExecution";
import SparkTaskExecution from "./SparkTaskExecution";
import SparkStageExecution, { SparkExecutionCounts } from "./SparkStageExecution";
import SparkTransformationDiagram from "./SparkTransformationDiagrams";
import SparkLineageDiagram from "./SparkLineageDiagram";
import SparkLineageRecovery from "./SparkLineageRecovery";
import SparkFailureRecoveryDiagram from "./SparkFailureRecoveryDiagram";
import { SparkExecutorLossDiagram, SparkLostShuffleDiagram } from "./SparkExecutorLossDiagrams";
import SparkReadLifecycle from "./SparkReadLifecycle";
import SparkShuffleDiagram from "./SparkShuffleDiagram";
import SparkShuffleInternals from "./SparkShuffleInternals";
import { SparkShuffleCostDiagram, SparkShuffleSkewChart } from "./SparkShuffleCostDiagrams";
import SparkJoinShuffleComparison from "./SparkJoinShuffleComparison";
import SparkKeyAggregationDiagram from "./SparkKeyAggregationDiagram";
import SparkPartitioningDiagram from "./SparkPartitioningDiagram";
import SparkPartitionInternals from "./SparkPartitionInternals";
import SparkDefaultPartitions from "./SparkDefaultPartitions";
import SparkPartitionSizing from "./SparkPartitionSizing";
import SparkPartitionWaves from "./SparkPartitionWaves";
import SparkClusterCapacity from "./SparkClusterCapacity";
import SparkSharedTaskMemory from "./SparkSharedTaskMemory";
import SparkPartitionParallelism from "./SparkPartitionParallelism";
import SparkPartitionEfficiency, { SparkManyTaskWaves } from "./SparkPartitionEfficiency";
import SparkIdleSlots from "./SparkIdleSlots";
import SparkPartitionOverhead from "./SparkPartitionOverhead";
import SparkShufflePartitions from "./SparkShufflePartitions";
import SparkShuffleSizingBenefits from "./SparkShuffleSizingBenefits";
import SparkBroadcastJoinDiagram from "./SparkBroadcastJoinDiagram";
import SparkLargeBroadcast from "./SparkLargeBroadcast";
import SparkSharedVariableFlow from "./SparkSharedVariableFlow";
import SparkReferenceDiagram from "./SparkReferenceDiagrams";
import SparkJoinExplorer, { SparkJoinSelection } from "./SparkJoinExplorer";
import SparkJoinStrategyFlow from "./SparkJoinStrategyFlow";
import SparkAdaptiveJoin from "./SparkAdaptiveJoin";
import SparkSemiAntiExplorer from "./SparkSemiAntiExplorer";
import SparkJoinMultiplicity from "./SparkJoinMultiplicity";
import SparkSaltingDistribution from "./SparkSaltingDistribution";
import SparkDynamicPruning from "./SparkDynamicPruning";
import SparkStreamingJoinDiagram from "./SparkStreamingJoinDiagrams";
import SparkSkewTaskDurations from "./SparkSkewTaskDurations";
import SparkSkewScenarioChooser, { SparkSkewSolutionDiagram } from "./SparkSkewSolutions";
import SparkSaltShuffle from "./SparkSaltShuffle";
import SparkSaltExchange from "./SparkSaltExchange";
import SparkSpeculationDiagram from "./SparkSpeculationDiagram";
import SparkSpeculationBenefit from "./SparkSpeculationBenefit";
import SparkSpeculationSkew from "./SparkSpeculationSkew";
import SparkExecutorWorkload from "./SparkExecutorWorkload";
import SparkRunVariation from "./SparkRunVariation";
import SparkScalePartitionSizes from "./SparkScalePartitionSizes";
import SparkExecutorMemoryDiagram from "./SparkExecutorMemoryDiagrams";
import SparkSmallFiles from "./SparkSmallFiles";
import SparkSmallFileScan from "./SparkSmallFileScan";
import SparkFilePartitionSizing from "./SparkFilePartitionSizing";
import SparkCommonPartitionSize from "./SparkCommonPartitionSize";
import SparkSmallClusterWaves from "./SparkSmallClusterWaves";
import SparkControlledConcurrency from "./SparkControlledConcurrency";
import SparkEightTaskExecutors from "./SparkEightTaskExecutors";
import SparkTaskSerialization from "./SparkTaskSerialization";
import SparkRepartitionCoalesce from "./SparkRepartitionCoalesce";
import { SparkTaskRetryDiagram, SparkExecutorRecoveryDiagram, SparkShuffleRecoveryDiagram } from "./SparkFaultToleranceDiagrams";

export function inline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**")
    ? <strong key={index} className="font-semibold text-neutral-900">{part.slice(2, -2)}</strong>
    : part.startsWith("`")
    ? <code key={index} className="rounded bg-neutral-100 px-1 py-0.5 text-[.9em] text-neutral-900">{part.slice(1, -1)}</code>
    : part);
}

export function renderBody(text: string) {
  const blocks: ReactNode[] = [];
  const lines = text.trim().split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const key = i;
    if (line.trim() === "[spark-cache-reuse-comparison]") {
      blocks.push(<SparkReferenceDiagram key={key} name="cache-reuse-comparison" />);
      i++;
    } else if (line.trim() === "[spark-task-serialization]") {
      blocks.push(<SparkTaskSerialization key={key} />);
      i++;
    } else if (line.trim() === "[spark-eight-task-executors]") {
      blocks.push(<SparkEightTaskExecutors key={key} />);
      i++;
    } else if (line.trim() === "[spark-controlled-concurrency]") {
      blocks.push(<SparkControlledConcurrency key={key} />);
      i++;
    } else if (line.trim() === "[spark-small-cluster-waves]") {
      blocks.push(<SparkSmallClusterWaves key={key} />);
      i++;
    } else if (line.trim() === "[spark-common-partition-size]") {
      blocks.push(<SparkCommonPartitionSize key={key} />);
      i++;
    } else if (line.trim() === "[spark-tune-file-partition-size]") {
      blocks.push(<SparkCommonPartitionSize key={key} tuning />);
      i++;
    } else if (line.trim() === "[spark-file-partition-sizing]") {
      blocks.push(<SparkFilePartitionSizing key={key} />);
      i++;
    } else if (line.trim() === "[spark-small-file-scan]") {
      blocks.push(<SparkSmallFileScan key={key} />);
      i++;
    } else if (line.trim() === "[spark-small-files]") {
      blocks.push(<SparkSmallFiles key={key} />);
      i++;
    } else if (line.trim() === "[spark-executor-memory-layout]") {
      blocks.push(<SparkExecutorMemoryDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-executor-memory-demand]") {
      blocks.push(<SparkExecutorMemoryDiagram key={key} demand />);
      i++;
    } else if (line.trim() === "[spark-scale-partition-sizes]") {
      blocks.push(<SparkScalePartitionSizes key={key} />);
      i++;
    } else if (line.trim() === "[spark-run-variation]") {
      blocks.push(<SparkRunVariation key={key} />);
      i++;
    } else if (line.trim() === "[spark-executor-workload]") {
      blocks.push(<SparkExecutorWorkload key={key} />);
      i++;
    } else if (line.trim() === "[spark-speculation-skew]") {
      blocks.push(<SparkSpeculationSkew key={key} />);
      i++;
    } else if (line.trim() === "[spark-speculation-benefit]") {
      blocks.push(<SparkSpeculationBenefit key={key} />);
      i++;
    } else if (line.trim() === "[spark-use-speculation]") {
      blocks.push(<SparkSpeculationBenefit key={key} launch={20} finish={30} />);
      i++;
    } else if (line.trim() === "[spark-speculation]") {
      blocks.push(<SparkSpeculationDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-salt-exchange]") {
      blocks.push(<SparkSaltExchange key={key} />);
      i++;
    } else if (line.trim() === "[spark-salt-shuffle]") {
      blocks.push(<SparkSaltShuffle key={key} />);
      i++;
    } else if (line.trim() === "[spark-skew-salting-solution]") {
      blocks.push(<SparkSkewSolutionDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-skew-aqe-solution]") {
      blocks.push(<SparkSkewSolutionDiagram key={key} adaptive />);
      i++;
    } else if (line.trim() === "[spark-skew-scenario]") {
      blocks.push(<SparkSkewScenarioChooser key={key} />);
      i++;
    } else if (line.trim() === "[spark-skew-task-durations]") {
      blocks.push(<SparkSkewTaskDurations key={key} />);
      i++;
    } else if (line.trim() === "[spark-stream-join]") {
      blocks.push(<SparkStreamingJoinDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-stream-watermark]") {
      blocks.push(<SparkStreamingJoinDiagram key={key} watermark />);
      i++;
    } else if (line.trim() === "[spark-dynamic-pruning]") {
      blocks.push(<SparkDynamicPruning key={key} />);
      i++;
    } else if (line.trim() === "[spark-before-salting]") {
      blocks.push(<SparkSaltingDistribution key={key} />);
      i++;
    } else if (line.trim() === "[spark-skew-distribution]") {
      blocks.push(<SparkSaltingDistribution key={key} skewExample />);
      i++;
    } else if (line.trim() === "[spark-after-salting]") {
      blocks.push(<SparkSaltingDistribution key={key} salted />);
      i++;
    } else if (line.trim() === "[spark-join-multiplicity]") {
      blocks.push(<SparkJoinMultiplicity key={key} />);
      i++;
    } else if (line.trim() === "[spark-semi-anti-explorer]") {
      blocks.push(<SparkSemiAntiExplorer key={key} />);
      i++;
    } else if (line.trim() === "[spark-adaptive-join]") {
      blocks.push(<SparkAdaptiveJoin key={key} />);
      i++;
    } else if (line.trim() === "[spark-orders-broadcast]") {
      blocks.push(<SparkJoinStrategyFlow key={key} />);
      i++;
    } else if (line.trim() === "[spark-hinted-broadcast]") {
      blocks.push(<SparkJoinStrategyFlow key={key} hinted />);
      i++;
    } else if (line.trim() === "[spark-orders-sort-merge]") {
      blocks.push(<SparkJoinStrategyFlow key={key} merge />);
      i++;
    } else if (line.trim() === "[spark-huge-sort-merge]") {
      blocks.push(<SparkJoinStrategyFlow key={key} merge huge />);
      i++;
    } else if (line.trim() === "[spark-join-explorer]") {
      blocks.push(<SparkJoinExplorer key={key} />);
      i++;
    } else if (line.trim() === "[spark-join-selection]") {
      blocks.push(<SparkJoinSelection key={key} />);
      i++;
    } else if (/^\[spark-reference:[a-z-]+\]$/.test(line.trim())) {
      blocks.push(<SparkReferenceDiagram key={key} name={line.trim().slice(17, -1)} />);
      i++;
    } else if (line.trim() === "[spark-execution-hierarchy]") {
      blocks.push(<SparkExecutionHierarchy key={key} />);
      i++;
    } else if (line.trim() === "[spark-key-aggregation]") {
      blocks.push(<SparkKeyAggregationDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-partition-scheduling]") {
      blocks.push(<SparkPartitionInternals key={key} />);
      i++;
    } else if (line.trim() === "[spark-default-partitions]") {
      blocks.push(<SparkDefaultPartitions key={key} />);
      i++;
    } else if (line.trim() === "[spark-partition-sizing]") {
      blocks.push(<SparkPartitionSizing key={key} />);
      i++;
    } else if (line.trim() === "[spark-partition-waves]") {
      blocks.push(<SparkPartitionWaves key={key} />);
      i++;
    } else if (line.trim() === "[spark-cluster-capacity]") {
      blocks.push(<SparkClusterCapacity key={key} />);
      i++;
    } else if (line.trim() === "[spark-shared-task-memory]") {
      blocks.push(<SparkSharedTaskMemory key={key} />);
      i++;
    } else if (line.trim() === "[spark-partition-parallelism]") {
      blocks.push(<SparkPartitionParallelism key={key} />);
      i++;
    } else if (line.trim() === "[spark-many-task-waves]") {
      blocks.push(<SparkManyTaskWaves key={key} />);
      i++;
    } else if (line.trim() === "[spark-idle-slots]") {
      blocks.push(<SparkIdleSlots key={key} />);
      i++;
    } else if (line.trim() === "[spark-ten-active-slots]") {
      blocks.push(<SparkIdleSlots key={key} active={10} />);
      i++;
    } else if (line.trim() === "[spark-partition-overhead]") {
      blocks.push(<SparkPartitionOverhead key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-partitions]") {
      blocks.push(<SparkShufflePartitions key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-sizing-benefits]") {
      blocks.push(<SparkShuffleSizingBenefits key={key} />);
      i++;
    } else if (line.trim() === "[spark-broadcast-join]") {
      blocks.push(<SparkBroadcastJoinDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-large-broadcast]") {
      blocks.push(<SparkLargeBroadcast key={key} />);
      i++;
    } else if (line.trim() === "[spark-shared-variable-flow]") {
      blocks.push(<SparkSharedVariableFlow key={key} />);
      i++;
    } else if (line.trim() === "[spark-repartition-flow]") {
      blocks.push(<SparkRepartitionCoalesce key={key} />);
      i++;
    } else if (line.trim() === "[spark-coalesce-flow]") {
      blocks.push(<SparkRepartitionCoalesce key={key} coalesce />);
      i++;
    } else if (line.trim() === "[spark-partition-efficiency]") {
      blocks.push(<SparkPartitionEfficiency key={key} />);
      i++;
    } else if (line.trim() === "[spark-aqe-partition-sizing]") {
      blocks.push(<SparkPartitionSizing key={key} adaptive />);
      i++;
    } else if (line.trim() === "[spark-partition-shuffle]") {
      blocks.push(<SparkPartitionInternals key={key} shuffle />);
      i++;
    } else if (line.trim() === "[spark-partitioning]") {
      blocks.push(<SparkPartitioningDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-join-shuffle-comparison]") {
      blocks.push(<SparkJoinShuffleComparison key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-cost]") {
      blocks.push(<SparkShuffleCostDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-skew]") {
      blocks.push(<SparkShuffleSkewChart key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-internals]") {
      blocks.push(<SparkShuffleInternals key={key} />);
      i++;
    } else if (line.trim() === "[spark-groupby-shuffle]") {
      blocks.push(<SparkStageExecution key={key} aggregationOnly />);
      i++;
    } else if (line.trim() === "[spark-shuffle-departments]") {
      blocks.push(<SparkShuffleDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-stages]") {
      blocks.push(<SparkStageExecution key={key} shuffleExample />);
      i++;
    } else if (line.trim() === "[spark-read-lifecycle]") {
      blocks.push(<SparkReadLifecycle key={key} />);
      i++;
    } else if (line.trim() === "[spark-executor-loss]") {
      blocks.push(<SparkExecutorLossDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-lost-shuffle]") {
      blocks.push(<SparkLostShuffleDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-failure-recovery]") {
      blocks.push(<SparkFailureRecoveryDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-task-retry]") {
      blocks.push(<SparkTaskRetryDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-executor-recovery]") {
      blocks.push(<SparkExecutorRecoveryDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-shuffle-recovery]") {
      blocks.push(<SparkShuffleRecoveryDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-lineage-recovery]") {
      blocks.push(<SparkLineageRecovery key={key} />);
      i++;
    } else if (line.trim() === "[spark-lineage]") {
      blocks.push(<SparkLineageDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-narrow-transformation]") {
      blocks.push(<SparkTransformationDiagram key={key} />);
      i++;
    } else if (line.trim() === "[spark-wide-transformation]") {
      blocks.push(<SparkTransformationDiagram key={key} wide />);
      i++;
    } else if (line.trim() === "[spark-narrow-wide-stages]") {
      blocks.push(<SparkStageExecution key={key} includePartialAggregation />);
      i++;
    } else if (line.trim() === "[spark-job-hierarchy]") {
      blocks.push(<SparkExecutionHierarchy key={key} variant="job" />);
      i++;
    } else if (line.trim() === "[spark-stage-execution]") {
      blocks.push(<SparkStageExecution key={key} />);
      i++;
    } else if (line.trim() === "[spark-execution-counts]") {
      blocks.push(<SparkExecutionCounts key={key} />);
      i++;
    } else if (line.trim() === "[spark-practical-execution]") {
      blocks.push(<SparkPracticalExecution key={key} />);
      i++;
    } else if (line.trim() === "[spark-task-waves]") {
      blocks.push(<SparkTaskWaves key={key} />);
      i++;
    } else if (line.trim() === "[spark-task-execution]") {
      blocks.push(<SparkTaskExecution key={key} />);
      i++;
    } else if (/^#{1,6} /.test(line)) {
      blocks.push(<h4 key={key} className="pt-2 text-sm font-bold text-neutral-900">{line.replace(/^#+ /, "")}</h4>);
      i++;
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
      blocks.push(<ol key={key} className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-neutral-500">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>);
    } else if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key} className="overflow-x-auto rounded-xl bg-neutral-900 p-5 text-xs leading-6 text-neutral-100"><code>{code.join("\n")}</code></pre>);
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const row = lines[i++].split("|").slice(1, -1).map(cell => cell.trim());
        if (!row.every(cell => /^[-: ]+$/.test(cell))) rows.push(row);
      }
      blocks.push(<div key={key} role="region" aria-label="Optimization techniques comparison" tabIndex={0} className="overflow-x-auto rounded-xl border border-neutral-200 focus-visible:outline-2 focus-visible:outline-amber-500">
        <table className="w-full min-w-[450px] text-left text-[13px] leading-6">
          <thead className="bg-neutral-900 text-white"><tr>{rows[0].map(cell => <th key={cell} scope="col" className="px-4 py-3">{inline(cell)}</th>)}</tr></thead>
          <tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-neutral-200 even:bg-neutral-50"><th scope="row" className="px-4 py-3 align-top font-semibold text-neutral-900">{inline(row[0])}</th>{row.slice(1).map((cell, index) => <td key={index} className="px-4 py-3 align-top">{inline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>);
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      blocks.push(<ul key={key} className="list-disc space-y-2 pl-5 marker:text-neutral-400">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>);
    } else if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^> ?/, ""));
      blocks.push(<blockquote key={key} className="space-y-4 border-l-2 border-amber-400 pl-4 text-neutral-800">{quote.join("\n").split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{inline(paragraph)}</p>)}</blockquote>);
    } else {
      const paragraph: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(```|\||- |>|#|\d+\. )/.test(lines[i])) paragraph.push(lines[i++]);
      const value = paragraph.join(" ");
      blocks.push(<p key={key} className={/^(Important:|Key takeaway:)/.test(value) ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-neutral-800" : undefined}>{inline(value)}</p>);
    }
  }
  return blocks;
}

const sections = content.split(/^#{2,3} /m).filter(Boolean).map(section => {
  const newline = section.indexOf("\n");
  return { title: section.slice(0, newline).trim(), body: section.slice(newline + 1) };
});

export default function SparkPerformanceAnswer() {
  return (
    <article className="overflow-hidden bg-white">
      <header className="bg-neutral-900 px-5 py-8 text-white sm:px-7"><h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{sections[0].title}</h2></header>
      <div className="space-y-8 px-5 py-6 text-sm leading-7 text-neutral-600 sm:px-7 sm:py-8">
        <div className="space-y-4">{renderBody(sections[0].body)}</div>
        {sections.slice(1).map(section => <section key={section.title} className={section.title.startsWith("Interview-ready") ? "space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6" : "space-y-4 border-t border-neutral-200 pt-6"}>
          <h3 className="text-base font-bold tracking-tight text-neutral-900">{section.title}</h3>
          {renderBody(section.body)}
        </section>)}
      </div>
    </article>
  );
}
