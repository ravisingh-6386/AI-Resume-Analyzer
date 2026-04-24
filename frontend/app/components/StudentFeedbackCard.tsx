const StudentFeedbackCard = ({ data }: { data: StudentFeedback }) => {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Plain-English summary</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Student-Friendly Feedback</h3>
      </div>
      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{data.rewrittenSummary}</p>

      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Action Checklist</p>
        <ul className="mt-3 grid gap-3">
          {data.actionChecklist.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{index + 1}</span>
              <span className="text-sm leading-6">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default StudentFeedbackCard;
