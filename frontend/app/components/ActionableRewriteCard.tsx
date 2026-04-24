import { useMemo, useState } from "react";

const ActionableRewriteCard = ({ rewrites }: { rewrites: ActionableRewrite[] }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyAllState, setCopyAllState] = useState(false);

  const rewriteSummary = useMemo(
    () => rewrites.map((rewrite) => `${rewrite.section}: ${rewrite.rewrite}`).join("\n\n"),
    [rewrites]
  );

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(rewriteSummary);
    setCopyAllState(true);
    setTimeout(() => setCopyAllState(false), 1400);
  };

  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Actionable rewrites</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            High-impact improvements you can copy right now
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Expand each card to compare the weak version with the recommended rewrite.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
        >
          {copyAllState ? "Copied all" : "Copy all"}
        </button>
      </div>

      <div className="space-y-3">
        {rewrites.map((rewrite, index) => {
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={`${rewrite.section}-${index}`}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 text-left"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                aria-expanded={isExpanded}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {rewrite.section}
                  </span>
                  <p className="break-words font-medium text-slate-800">{rewrite.issue}</p>
                </div>
                <span className="ml-2 text-xl text-slate-500">{isExpanded ? "-" : "+"}</span>
              </button>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Before</p>
                        <p className="mt-2 break-words text-sm leading-6 text-rose-900">{rewrite.example}</p>
                      </div>

                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">After</p>
                        <p className="mt-2 break-words text-sm leading-6 text-emerald-900">{rewrite.rewrite}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Expected impact
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{rewrite.impact}</p>
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleCopy(rewrite.rewrite, index);
                      }}
                    >
                      {copiedIndex === index ? "Copied to clipboard" : "Copy rewrite"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ActionableRewriteCard;
