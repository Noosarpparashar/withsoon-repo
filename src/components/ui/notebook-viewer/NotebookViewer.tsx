import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  type NotebookCell,
  type NotebookDocument,
  type NotebookOutput,
  notebookSource,
} from "@/lib/notebook";

type NotebookViewerProps = {
  notebook: NotebookDocument;
  language: "Scala" | "PySpark";
  title: string;
  filename: string;
  downloadHref: string;
};

const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;

function plainText(value: string | string[] | undefined): string {
  if (!value) return "";
  return (Array.isArray(value) ? value.join("") : value).replace(ANSI_PATTERN, "");
}

function inlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-[#111820]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-[#eceff2] px-1.5 py-0.5 font-mono text-[.92em] text-[#202934]">{part.slice(1, -1)}</code>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function isBlockStart(line: string): boolean {
  return /^(#{1,6})\s+/.test(line)
    || /^```/.test(line)
    || /^---+$/.test(line)
    || /^>\s?/.test(line)
    || /^[-*]\s+/.test(line)
    || /^\d+\.\s+/.test(line);
}

function MarkdownCell({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <div key={`code-${index}`} className="my-4 overflow-hidden rounded-xl border border-[#20252b] bg-[#11151a] shadow-[0_8px_22px_rgba(15,20,25,.12)]">
          {language ? <div className="border-b border-white/10 bg-[#191e24] px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#aeb7c0]">{language}</div> : null}
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-5 text-[#f0f3f5]"><code>{code.join("\n")}</code></pre>
        </div>,
      );
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = inlineMarkdown(heading[2]);
      const className = level === 1
        ? "mb-4 mt-2 text-2xl font-bold tracking-[-.045em] text-[#111820] sm:text-3xl"
        : level === 2
          ? "mb-3 mt-6 text-xl font-bold tracking-[-.03em] text-[#111820]"
          : "mb-2 mt-4 text-base font-bold text-[#17202b]";
      const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      blocks.push(<Heading key={`heading-${index}`} className={className}>{content}</Heading>);
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={`rule-${index}`} className="my-5 border-[#dfe4e8]" />);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`} className="my-4 rounded-r-xl border-l-[3px] border-[#111820] bg-[#f3f4f5] px-5 py-3.5 text-sm leading-6 text-[#43515e]">
          {inlineMarkdown(quote.join(" "))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`list-${index}`} className="my-2 list-disc space-y-1 pl-6 text-sm leading-6 text-[#354453]">
          {items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${index}`} className="my-2 list-decimal space-y-1 pl-6 text-sm leading-6 text-[#354453]">
          {items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}
        </ol>,
      );
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`} className="my-2 text-sm leading-6 text-[#40505f]">
        {inlineMarkdown(paragraph.join(" "))}
      </p>,
    );
  }

  return <div className="min-w-0">{blocks}</div>;
}

function outputText(output: NotebookOutput): string {
  if (output.output_type === "stream") return plainText(output.text);
  if (output.output_type === "error") {
    return plainText(output.traceback) || `${output.ename ?? "Error"}: ${output.evalue ?? ""}`;
  }
  return plainText(output.data?.["text/plain"]);
}

function cellAnchor(cell: NotebookCell, index: number): string {
  const source = notebookSource(cell.source);
  if (/(?:^|\n)# PROBLEMS(?:\n|$)/.test(source)) return "problems";
  if (/(?:^|\n)# SOLUTIONS(?:\n|$)/.test(source)) return "solutions";
  if (/## Setup/.test(source)) return "setup";
  return `cell-${index + 1}`;
}

function CodeCell({ cell, index, language }: { cell: NotebookCell; index: number; language: string }) {
  const outputs = (cell.outputs ?? [])
    .map((output) => ({ output, text: outputText(output) }))
    .filter(({ text }) => text.trim().length > 0);
  const executionCount = cell.execution_count ?? " ";

  return (
    <div className="py-4">
      <div className="grid gap-2.5 sm:grid-cols-[72px_minmax(0,1fr)]">
        <div className="hidden select-none items-start pt-1 sm:flex sm:justify-end sm:pr-2 sm:pt-3">
          <span className="rounded-md bg-[#111820] px-2 py-1 font-mono text-[9px] font-semibold text-white">In [{executionCount}]</span>
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#20262d] bg-[#11151a] shadow-[0_9px_24px_rgba(15,20,25,.13)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#191e24] px-4 py-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[#b5bec7]">{language}<span className="sm:hidden"> · In [{executionCount}]</span></span>
            <span className="font-mono text-[9px] text-[#7f8993]">cell {index + 1}</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-5 text-[#f2f4f6]"><code>{notebookSource(cell.source)}</code></pre>
        </div>
      </div>

      {outputs.map(({ output, text }, outputIndex) => (
        <div key={outputIndex} className="mt-3 grid gap-2.5 sm:grid-cols-[72px_minmax(0,1fr)]">
          <div className="hidden select-none sm:block sm:pr-2 sm:pt-2 sm:text-right">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-[#7b858f]">
              {output.output_type === "execute_result" ? "Out" : "Output"}
            </span>
          </div>
          <pre className={`min-w-0 overflow-x-auto rounded-xl border p-4 font-mono text-[12px] leading-5 shadow-[0_5px_16px_rgba(15,20,25,.04)] ${output.output_type === "error" ? "border-[#b7b7b7] bg-[#f5f5f5] text-[#292929]" : "border-[#dfe3e6] bg-[#fbfbfc] text-[#27323d]"}`}><code>{text}</code></pre>
        </div>
      ))}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NotebookViewer({ notebook, language, title, filename, downloadHref }: NotebookViewerProps) {
  const codeCells = notebook.cells.filter((cell) => cell.cell_type === "code").length;
  const savedOutputs = notebook.cells.reduce((count, cell) => count + (cell.outputs?.length ?? 0), 0);
  const kernel = notebook.metadata?.kernelspec?.display_name ?? language;

  return (
    <div className="min-h-screen bg-[#f1f2f3] text-[#17202b]">
      <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-8">
        <header className="overflow-hidden rounded-[20px] border border-[#111820] bg-[#111820] shadow-[0_20px_55px_rgba(17,24,32,.16)]">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-mono text-xs font-black text-[#111820] shadow-sm">NB</span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-[-.025em] text-white sm:text-lg">{title}</p>
                <p className="truncate font-mono text-[10px] text-[#aeb7c0]">{filename}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#e2e7eb]">Read only</span>
              <span className="rounded-full border border-white/20 bg-transparent px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#e2e7eb]">{kernel}</span>
              <a href={downloadHref} download={filename} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#111820] transition hover:bg-[#eceff1]">
                Download
                <DownloadIcon />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white px-4 py-2.5 text-[11px] text-[#5c6975] sm:px-6">
            <nav className="flex flex-wrap items-center gap-1" aria-label="Notebook sections">
              <a href="#setup" className="rounded-md px-2.5 py-1.5 font-semibold hover:bg-[#eceff1] hover:text-[#111820]">Setup</a>
              <a href="#problems" className="rounded-md px-2.5 py-1.5 font-semibold hover:bg-[#eceff1] hover:text-[#111820]">Problems</a>
              <a href="#solutions" className="rounded-md px-2.5 py-1.5 font-semibold hover:bg-[#eceff1] hover:text-[#111820]">Solutions</a>
              <Link href="/#practice-notebooks" className="rounded-md px-2.5 py-1.5 font-semibold hover:bg-[#eceff1] hover:text-[#111820]">Back to library</Link>
            </nav>
            <p className="font-mono text-[10px]">{notebook.cells.length} cells · {codeCells} code · {savedOutputs} saved outputs</p>
          </div>
        </header>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="sticky top-20 hidden overflow-hidden rounded-2xl border border-[#d5d9dd] bg-white shadow-[0_10px_28px_rgba(17,24,32,.06)] xl:block">
            <div className="border-b border-[#e3e6e8] px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#7b858e]">Notebook contents</p>
              <p className="mt-1 text-sm font-bold text-[#111820]">Jump to a section</p>
            </div>
            <nav className="space-y-1 p-3 text-sm" aria-label="Notebook outline">
              <a href="#setup" className="block rounded-lg px-3 py-2.5 font-semibold text-[#344250] transition hover:bg-[#f0f2f3] hover:text-[#111820]">01&nbsp;&nbsp;Setup</a>
              <a href="#problems" className="block rounded-lg px-3 py-2.5 font-semibold text-[#344250] transition hover:bg-[#f0f2f3] hover:text-[#111820]">02&nbsp;&nbsp;Problems</a>
              <a href="#solutions" className="block rounded-lg px-3 py-2.5 font-semibold text-[#344250] transition hover:bg-[#f0f2f3] hover:text-[#111820]">03&nbsp;&nbsp;Solutions</a>
            </nav>
            <div className="border-t border-[#e3e6e8] bg-[#f8f9fa] p-4">
              <dl className="grid grid-cols-2 gap-3 text-[10px]">
                <div><dt className="text-[#7a858e]">Cells</dt><dd className="mt-0.5 font-mono font-bold text-[#111820]">{notebook.cells.length}</dd></div>
                <div><dt className="text-[#7a858e]">Code</dt><dd className="mt-0.5 font-mono font-bold text-[#111820]">{codeCells}</dd></div>
                <div><dt className="text-[#7a858e]">Outputs</dt><dd className="mt-0.5 font-mono font-bold text-[#111820]">{savedOutputs}</dd></div>
                <div><dt className="text-[#7a858e]">Mode</dt><dd className="mt-0.5 font-bold text-[#111820]">Read only</dd></div>
              </dl>
            </div>
          </aside>

          <section data-testid="notebook-viewer" className="min-w-0 overflow-hidden rounded-2xl border border-[#d2d7db] bg-white shadow-[0_18px_48px_rgba(17,24,32,.08)]" aria-label={`${language} notebook preview`}>
            <div className="flex items-center justify-between border-b border-[#e1e5e8] bg-[#fafafa] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-[#111820]" />
                <span className="h-2.5 w-2.5 rounded-full border border-[#8c959d] bg-white" />
                <span className="h-2.5 w-2.5 rounded-full border border-[#c0c6cb] bg-white" />
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#77828d]">Trusted · exact notebook preview</p>
            </div>
            <div className="divide-y divide-[#eceff1] px-3 py-2 sm:px-6 lg:px-10">
              {notebook.cells.map((cell, index) => {
                const anchor = cellAnchor(cell, index);
                if (cell.cell_type === "code") {
                  return <section id={anchor} key={index} data-notebook-cell="code" className="scroll-mt-28"><CodeCell cell={cell} index={index} language={language} /></section>;
                }
                const markdown = notebookSource(cell.source);
                const isQuestion = /(?:^|\n)## Q\d+(?:\s|—)/.test(markdown);
                return (
                  <section id={anchor} key={index} data-notebook-cell="markdown" className="scroll-mt-28 py-5 sm:grid sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-2">
                    <div aria-hidden="true" />
                    <div className={isQuestion ? "rounded-xl border border-[#c9ced3] border-l-[4px] border-l-[#111820] bg-[#e9ebed] px-4 py-3 sm:px-5" : ""}>
                      <MarkdownCell source={markdown} />
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
