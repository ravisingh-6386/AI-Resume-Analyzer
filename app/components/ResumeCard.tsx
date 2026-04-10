import {Link} from "react-router";
import ScoreCircle from "./ScoreCircle";
import {useEffect, useState, memo} from "react";
import {usePuterStore} from "../lib/puter";

const ResumeCard = memo(({ resume: { id, companyName, jobTitle, feedback, imagePath } }: { resume: Resume }) => {
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');

    useEffect(() => {
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if(!blob) return;
            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResume();
    }, [imagePath]);

    return (
        <Link
            to={`/resume/${id}`}
            className="group flex h-full flex-col gap-5 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.14)]"
        >
            <div className="flex min-h-[90px] items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    {companyName && <h2 className="break-words text-xl font-bold text-slate-900">{companyName}</h2>}
                    {jobTitle && <h3 className="break-words text-sm font-medium text-slate-600">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="text-xl font-bold text-slate-900">Resume</h2>}
                </div>
                <div className="flex-shrink-0">
                    {feedback && feedback.overallScore !== undefined ? (
                        <ScoreCircle score={feedback.overallScore} />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <span className="text-xs text-slate-500">--</span>
                        </div>
                    )}
                </div>
            </div>
            {resumeUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                    <div className="w-full h-full">
                        <img
                            src={resumeUrl}
                            alt="resume"
                            className="h-[300px] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02] max-sm:h-[220px]"
                        />
                    </div>
                </div>
            )}

            <div className="mt-auto flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">View Analysis</p>
                <span className="text-sm font-semibold text-indigo-700">Open →</span>
            </div>
        </Link>
    )
});
ResumeCard.displayName = 'ResumeCard';
export default ResumeCard
