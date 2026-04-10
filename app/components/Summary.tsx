import { useEffect, useState, memo } from "react";
import ScoreCircle from "./ScoreCircle";

const getMomentumText = (score: number) => {
    if (score >= 80) return "Strong foundation";
    if (score >= 65) return "Good, but still room to sharpen";
    if (score >= 50) return "Needs focused refinement";
    return "High-priority improvements needed";
};

const getOpportunityLabel = (score: number) => {
    const gap = Math.max(0, 100 - score);
    return Math.min(24, Math.max(8, Math.round(gap * 0.35)));
};

const getScoreTone = (score: number) => {
    if (score >= 75) {
        return {
            label: "Strong",
            labelClass: "bg-emerald-100 text-emerald-700",
            scoreClass: "text-emerald-700",
            barClass: "from-emerald-500 to-green-500",
            chipClass: "bg-emerald-50 text-emerald-700",
        };
    }

    if (score >= 50) {
        return {
            label: "Needs Improvement",
            labelClass: "bg-amber-100 text-amber-700",
            scoreClass: "text-amber-700",
            barClass: "from-amber-500 to-yellow-500",
            chipClass: "bg-amber-50 text-amber-700",
        };
    }

    return {
        label: "Weak",
        labelClass: "bg-rose-100 text-rose-700",
        scoreClass: "text-rose-700",
        barClass: "from-rose-500 to-red-500",
        chipClass: "bg-rose-50 text-rose-700",
    };
};

const getScoreHelper = (title: string, score: number) => {
    if (title === "ATS Match") {
        if (score >= 75) return "Good ATS alignment with room to sharpen keywords.";
        if (score >= 50) return "Good but can improve role keyword coverage.";
        return "ATS keywords are too weak for reliable filtering.";
    }

    if (title === "Tone & Style") {
        if (score >= 75) return "Confident, professional tone with strong clarity.";
        if (score >= 50) return "Readable, but could sound more polished and direct.";
        return "Tone feels too generic or inconsistent.";
    }

    if (title === "Content") {
        if (score >= 75) return "Content is specific and impact-focused.";
        if (score >= 50) return "Solid base, but needs sharper outcomes and metrics.";
        return "Content needs stronger proof of impact.";
    }

    if (title === "Structure") {
        if (score >= 75) return "Layout and hierarchy are easy to scan.";
        if (score >= 50) return "Readable, but better structure could improve flow.";
        return "Structure is making the resume harder to scan.";
    }

    return "You can improve this section with small edits.";
};

const getIcon = (title: string, scoreTone: ReturnType<typeof getScoreTone>) => {
    const iconClass = `h-5 w-5 ${scoreTone.scoreClass}`;

    if (title === "ATS Match") {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3l8 4v6c0 5-3.5 8.5-8 8.5S4 18 4 13V7l8-4z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9.2 12.2l1.9 1.9 3.9-4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (title === "Tone & Style") {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 17.5V21l4.5-2.5H17a3 3 0 003-3v-8a3 3 0 00-3-3H7a3 3 0 00-3 3v7a3 3 0 003 3h0z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M8 9h8M8 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    if (title === "Content") {
        return (
            <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 4.5h7.5L19 9v10.5A1.5 1.5 0 0117.5 21h-10A1.5 1.5 0 016 19.5v-13A1.5 1.5 0 017.5 5H7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M13.5 4.5V9H18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            <rect x="14" y="5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            <rect x="4" y="13" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            <rect x="14" y="13" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
};

const Category = memo(({ title, score }: { title: string; score: number }) => {
    const [animatedScore, setAnimatedScore] = useState(0);
    const tone = getScoreTone(score);
    const helper = getScoreHelper(title, score);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            setAnimatedScore(score);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [score]);

    return (
        <div
            title={helper}
            className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.1)]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.chipClass}`}>
                        {getIcon(title, tone)}
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
                        <p className="mt-1 text-sm text-slate-500">{helper}</p>
                    </div>
                </div>
                <span className={`review-chip ${tone.labelClass}`}>{tone.label}</span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                    <p className={`text-4xl font-black tracking-tight ${tone.scoreClass}`}>{animatedScore}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">/100 score</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Trend</p>
                    <p className={`mt-1 text-sm font-semibold ${tone.scoreClass}`}>{score >= 75 ? "+ Strong" : score >= 50 ? "~ Average" : "- Weak"}</p>
                </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${tone.barClass} transition-[width] duration-700 ease-out`}
                    style={{ width: `${animatedScore}%` }}
                />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">Tooltip: hover card for guidance</span>
                <span className={tone.scoreClass}>{score >= 75 ? "Healthy" : score >= 50 ? "Watch this" : "Priority"}</span>
            </div>
        </div>
    )
});
Category.displayName = 'Category';

const Summary = memo(({ feedback }: { feedback: Feedback }) => {
    const categoriesWithMeta = [
        { title: "ATS Match", score: feedback.ATS.score },
        { title: "Tone & Style", score: feedback.toneAndStyle.score },
        { title: "Content", score: feedback.content.score },
        { title: "Structure", score: feedback.structure.score },
        { title: "Skills", score: feedback.skills.score },
    ]
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);

    const nextSteps = categoriesWithMeta.map((item) => {
        const label = item.score < 50 ? "High Impact" : item.score < 70 ? "Medium Impact" : "Low Effort";
        return { ...item, label };
    });

    const opportunity = getOpportunityLabel(feedback.overallScore);

    return (
        <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
            <div className="mb-6 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                            Resume health snapshot
                        </p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                            Fix the right things first to reach a stronger interview-ready score.
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                            The cards below show where your resume is already strong, where it needs work, and which changes are most likely to move the score.
                        </p>
                    </div>

                    <div className="grid min-w-[280px] gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <div className="review-stat">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Current score
                            </p>
                            <p className={`mt-2 text-3xl font-black tracking-tight ${getScoreTone(feedback.overallScore).scoreClass}`}>
                                {feedback.overallScore}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">/100 overall</p>
                        </div>
                        <div className="review-stat">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Potential uplift
                            </p>
                            <p className="mt-2 text-3xl font-black tracking-tight text-emerald-700">+{opportunity}%</p>
                            <p className="mt-1 text-xs text-slate-500">Estimated score gain</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="review-chip bg-white text-slate-600 shadow-sm">ATS ready: {feedback.ATS.score}/100</span>
                    <span className="review-chip bg-white text-slate-600 shadow-sm">Top priority: {nextSteps[0]?.title ?? "N/A"}</span>
                    <span className="review-chip bg-white text-slate-600 shadow-sm">Focus label: {nextSteps[0]?.label ?? "—"}</span>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[auto,minmax(0,1fr)] lg:items-center">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-5 text-center">
                    <ScoreCircle score={feedback.overallScore} size={168} />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Overall Score</p>
                        <p className="mt-1 text-sm font-medium text-slate-600">{getMomentumText(feedback.overallScore)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Resume Review</p>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                Your resume is close, but a few key changes can unlock more interviews.
                            </h2>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Potential uplift</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-700">+{opportunity}%</p>
                        </div>
                    </div>

                    <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                        This score reflects overall ATS readiness, keyword alignment, clarity, and structure. Focus on the highest-impact gaps first for the fastest improvement.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {nextSteps.map((item) => (
                            <div
                                key={item.title}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${item.score < 50 ? "text-rose-600" : item.score < 70 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {item.label}
                                </p>
                                <p className="mt-2 text-base font-semibold text-slate-900">{item.title}</p>
                                <p className="mt-1 text-sm text-slate-600">Score: {item.score}/100</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Category title="ATS Match" score={feedback.ATS.score} />
                <Category title="Tone & Style" score={feedback.toneAndStyle.score} />
                <Category title="Content" score={feedback.content.score} />
                <Category title="Structure" score={feedback.structure.score} />
            </div>
        </section>
    )
});
Summary.displayName = 'Summary';
export default Summary
