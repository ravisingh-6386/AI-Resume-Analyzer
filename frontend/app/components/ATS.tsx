interface Suggestion {
  type: "good" | "improve";
  tip: string;
}

interface ATSProps {
  score: number;
  suggestions: Suggestion[];
}

import { memo } from "react";

const ATS = memo(({ score, suggestions }: ATSProps) => {
  const toneClass = score > 69 ? "text-emerald-700" : score > 49 ? "text-amber-700" : "text-rose-700";
  const fillClass = score > 69 ? "from-emerald-500 to-green-500" : score > 49 ? "from-amber-500 to-yellow-500" : "from-rose-500 to-red-500";
  const subtitle = score > 69 ? "Strong ATS readiness" : score > 49 ? "Good, but could be sharper" : "Needs focused improvements";
  const tips = suggestions.slice(0, 6);

  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">ATS Insights</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">ATS Score - {score}/100</h2>
          <p className={`mt-1 text-sm font-medium ${toneClass}`}>{subtitle}</p>
        </div>
        <div className="min-w-[160px] flex-1 rounded-2xl bg-slate-50 p-4 sm:flex-none">
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full bg-gradient-to-r ${fillClass}`} style={{ width: `${score}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Higher is better. Aim for 80+ for stronger ATS filtering.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {tips.map((suggestion, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
              suggestion.type === "good"
                ? "border-emerald-200 bg-emerald-50/80"
                : "border-amber-200 bg-amber-50/80"
            }`}
          >
            <div className="flex items-start gap-3">
              <img
                src={suggestion.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                alt={suggestion.type === "good" ? "Check" : "Warning"}
                className="w-5 h-5 mt-1"
              />
              <p className={suggestion.type === "good" ? "text-emerald-800" : "text-amber-800"}>
                {suggestion.tip}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        ATS filtering rewards clear role alignment, keyword coverage, and concise formatting. Small edits here can create a meaningful score lift.
      </p>
    </section>
  )
});
ATS.displayName = 'ATS';

export default ATS
