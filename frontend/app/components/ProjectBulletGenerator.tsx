import { useEffect, useMemo, useState } from "react";

const ProjectBulletGenerator = ({ bullets }: { bullets: string[] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftBullets, setDraftBullets] = useState(bullets);

  useEffect(() => {
    setDraftBullets(bullets);
  }, [bullets]);

  const allBullets = useMemo(() => draftBullets.join("\n\n"), [draftBullets]);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(allBullets);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1400);
  };

  return (
    <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Bullet generator</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Project Bullet Generator</h3>
          <p className="mt-1 text-sm text-slate-600">
            Turn these into polished bullets for your projects or experience section.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          onClick={handleCopyAll}
        >
          {copiedAll ? "Copied all" : "Copy all"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {bullets.map((bullet, index) => (
          <div key={`${bullet}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Bullet {index + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                >
                  {editingIndex === index ? "Done" : "Edit"}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  onClick={() => void handleCopy(draftBullets[index], index)}
                >
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {editingIndex === index ? (
              <textarea
                className="mt-3 min-h-[100px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                value={draftBullets[index]}
                onChange={(e) => {
                  const next = [...draftBullets];
                  next[index] = e.target.value;
                  setDraftBullets(next);
                }}
              />
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-700">{draftBullets[index]}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProjectBulletGenerator;
