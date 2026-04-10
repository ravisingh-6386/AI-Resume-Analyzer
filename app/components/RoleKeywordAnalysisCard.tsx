const RoleKeywordAnalysisCard = ({ data }: { data: RoleKeywordAnalysis }) => {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Keyword match</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Role Keyword Pack</h3>
          <p className="mt-1 text-sm text-slate-600">
            Focus on the keywords most likely to influence ATS and recruiter relevance.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Coverage</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data.coverage}%</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${data.coverage}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-emerald-800">Matched Keywords</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {data.matchedKeywords.length}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.matchedKeywords.length ? data.matchedKeywords.map((keyword) => (
              <span key={keyword} title="Already present in your resume" className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-medium text-emerald-700">
                {keyword}
              </span>
            )) : <p className="text-sm text-emerald-700">No matched keywords yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-amber-800">Missing Keywords</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">
              {data.missingKeywords.length}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.missingKeywords.length ? data.missingKeywords.map((keyword) => (
              <span key={keyword} title="This keyword appears to be missing from your resume" className="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm font-medium text-amber-700">
                {keyword}
              </span>
            )) : <p className="text-sm text-amber-700">Great match. No high-priority gaps.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoleKeywordAnalysisCard;
