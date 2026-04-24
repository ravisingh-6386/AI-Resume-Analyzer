import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { usePuterStore } from "../lib/puter";
import { useAuthStore } from "../lib/auth";
import Summary from "../components/Summary";
import ATS from "../components/ATS";
import Details from "../components/Details";
import StudentFeedbackCard from "../components/StudentFeedbackCard";
import RoleKeywordAnalysisCard from "../components/RoleKeywordAnalysisCard";
import ProjectBulletGenerator from "../components/ProjectBulletGenerator";
import ActionableRewriteCard from "../components/ActionableRewriteCard";
import ProgressStateCard from "../components/ProgressStateCard";

export const meta = () => ([
  { title: "Resumind | Review" },
  { name: "description", content: "Detailed overview of your resume" },
]);

const ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;
const ANALYSIS_STALE_GRACE_MS = 30 * 1000;
const MAX_RESUME_PAGE_WAIT_MS = 45 * 1000;
const LEGACY_IN_PROGRESS_MAX_WAIT_MS = 15 * 1000;
const POLL_INTERVAL_MS = 4000;

const Resume = () => {
  const { isLoading, fs, kv } = usePuterStore();
  const { isAuthenticated } = useAuthStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [studentFeedback, setStudentFeedback] = useState<StudentFeedback | null>(null);
  const [roleKeywordAnalysis, setRoleKeywordAnalysis] = useState<RoleKeywordAnalysis | null>(null);
  const [generatedProjectBullets, setGeneratedProjectBullets] = useState<string[]>([]);
  const [actionableRewrites, setActionableRewrites] = useState<ActionableRewrite[]>([]);
  const [jobState, setJobState] = useState<string | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const [loadingError, setLoadingError] = useState("");
  const [pollingTimeout, setPollingTimeout] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [usedFallbackAnalysis, setUsedFallbackAnalysis] = useState(false);
  const navigate = useNavigate();

  const scoreLift = useMemo(() => {
    if (!feedback) return 0;
    return Math.min(24, Math.max(8, Math.round((100 - feedback.overallScore) * 0.35)));
  }, [feedback]);

  const copyAllSuggestions = async () => {
    const sections: string[] = [];

    if (feedback) {
      sections.push(`Overall score: ${feedback.overallScore}/100`);
      sections.push(`ATS: ${feedback.ATS.score}/100`);
      sections.push(`Tone & Style: ${feedback.toneAndStyle.score}/100`);
      sections.push(`Content: ${feedback.content.score}/100`);
      sections.push(`Structure: ${feedback.structure.score}/100`);
      sections.push(`Skills: ${feedback.skills.score}/100`);
      sections.push("");
      sections.push("ATS tips:");
      feedback.ATS.tips.forEach((tip) => sections.push(`- ${tip.tip}`));
      sections.push("");
      sections.push("Action checklist:");
      studentFeedback?.actionChecklist.forEach((item) => sections.push(`- ${item}`));
      sections.push("");
      sections.push("Keyword gaps:");
      roleKeywordAnalysis?.missingKeywords.forEach((keyword) => sections.push(`- ${keyword}`));
    }

    await navigator.clipboard.writeText(sections.join("\n"));
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [id, isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isActive = true;
    let pollCount = 0;
    const maxPolls = Math.ceil(MAX_RESUME_PAGE_WAIT_MS / POLL_INTERVAL_MS);
    const startTime = Date.now();
    let pollInterval: ReturnType<typeof setInterval> | undefined;

    setPollingTimeout(false);
    setLoadingError("");
    setElapsedTime(0);

    const shouldStopPolling = (data: Resume | null) =>
      Boolean(data?.feedback) || data?.jobState === "done" || data?.jobState === "failed";

    const stopPolling = (timeTracker: ReturnType<typeof setInterval>) => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      clearInterval(timeTracker);
    };

    const loadResume = async (): Promise<Resume | null> => {
      try {
        console.log(`Loading resume with id: ${id}`);
        const resume = await kv.get(`resume:${id}`);

        if (!resume) {
          if (isActive) {
            setLoadingError("Resume not found. Please upload a resume first.");
          }
          return null;
        }

        const data = JSON.parse(resume) as Resume;
        console.log("Resume data loaded:", data);

        const createdAt = data.createdAt || 0;
        const isInProgress = data.jobState === "queued" || data.jobState === "processing";
        const isStaleInProgress =
          !data.feedback &&
          isInProgress &&
          createdAt > 0 &&
          Date.now() - createdAt > ANALYSIS_TIMEOUT_MS + ANALYSIS_STALE_GRACE_MS;

        const isLegacyInProgressStale =
          !data.feedback && isInProgress && createdAt === 0 && Date.now() - startTime > LEGACY_IN_PROGRESS_MAX_WAIT_MS;

        if (isStaleInProgress || isLegacyInProgressStale) {
          const staleMessage =
            "This analysis request appears to be stuck. Please upload your resume again to restart analysis.";
          const staleData: Resume = {
            ...data,
            jobState: "failed",
            lastError: staleMessage,
            retryCount: (data.retryCount || 0) + 1,
          };

          await kv.set(`resume:${id}`, JSON.stringify(staleData));

          if (isActive) {
            setJobState("failed");
            setLastError(staleMessage);
            setRetryCount(staleData.retryCount || 1);
            setLoadingError(staleMessage);
            setPollingTimeout(true);
          }

          return staleData;
        }

        // Load file blobs only once (checked via existing URLs in state)
        if (resumeUrl === "" || imageUrl === "") {
          const resumeBlob = await fs.read(data.resumePath);
          if (!resumeBlob) {
            if (isActive) {
              setLoadingError("Failed to load resume file");
            }
            return null;
          }

          const nextResumeUrl = URL.createObjectURL(
            new Blob([resumeBlob], { type: "application/pdf" })
          );

          const imageBlob = await fs.read(data.imagePath);
          if (!imageBlob) {
            URL.revokeObjectURL(nextResumeUrl);
            if (isActive) {
              setLoadingError("Failed to load resume preview");
            }
            return null;
          }

          const nextImageUrl = URL.createObjectURL(imageBlob);

          if (!isActive) {
            URL.revokeObjectURL(nextResumeUrl);
            URL.revokeObjectURL(nextImageUrl);
            return null;
          }

          setResumeUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return nextResumeUrl;
          });
          setImageUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return nextImageUrl;
          });
        }

        if (data.feedback) {
          setFeedback(data.feedback);
          setStudentFeedback(data.studentFeedback || null);
          setRoleKeywordAnalysis(data.roleKeywordAnalysis || null);
          setGeneratedProjectBullets(
            Array.isArray(data.generatedProjectBullets) ? data.generatedProjectBullets : []
          );
          setActionableRewrites(
            Array.isArray(data.actionableRewrites) ? data.actionableRewrites : []
          );
          setUsedFallbackAnalysis(Boolean(data.usedFallbackAnalysis));
          console.log("Feedback loaded:", data.feedback);
        } else {
          console.log("No feedback available yet");
          // Only update job state if no feedback yet
          setJobState(data.jobState);
          setLastError(data.lastError);
          setRetryCount(data.retryCount || 0);
        }

        return data;
      } catch (error) {
        console.error("Error loading resume:", error);
        if (isActive) {
          setLoadingError(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
        return null;
      }
    };

    const timeTracker = setInterval(() => {
      if (isActive) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    const startPolling = async () => {
      const initialData = await loadResume();
      if (!isActive || shouldStopPolling(initialData)) {
        stopPolling(timeTracker);
        return;
      }

      const createdAt = initialData?.createdAt || 0;
      const absoluteTimeoutAt =
        createdAt > 0
          ? createdAt + ANALYSIS_TIMEOUT_MS + ANALYSIS_STALE_GRACE_MS
          : Date.now() + LEGACY_IN_PROGRESS_MAX_WAIT_MS;
      const pageDeadlineAt = Date.now() + MAX_RESUME_PAGE_WAIT_MS;
      const pollDeadlineAt = Math.min(absoluteTimeoutAt, pageDeadlineAt);

      pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`Polling for feedback update... (attempt ${pollCount}/${maxPolls})`);
        const latestData = await loadResume();

        if (!isActive) {
          return;
        }

        if (shouldStopPolling(latestData)) {
          stopPolling(timeTracker);
          return;
        }

        const reachedDeadline = Date.now() >= pollDeadlineAt;

        if (pollCount >= maxPolls || reachedDeadline) {
          stopPolling(timeTracker);
          console.warn("Feedback polling timeout reached");
          setPollingTimeout(true);

          // Check the current job state to provide better error messaging
          const finalData = await loadResume();
          if (finalData?.jobState === "failed") {
            setLoadingError(finalData?.lastError || "Analysis failed. Please try again.");
          } else {
            setLoadingError(
              "Still processing after multiple checks. Please try uploading again to restart analysis."
            );
          }
        }
      }, POLL_INTERVAL_MS);
    };

    void startPolling();

    return () => {
      isActive = false;
      stopPolling(timeTracker);
    };
  }, [fs, id, kv, resumeUrl, imageUrl]);

  useEffect(() => {
    return () => {
      if (resumeUrl) {
        URL.revokeObjectURL(resumeUrl);
      }
    };
  }, [resumeUrl]);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const loadingSkeleton = !feedback && !loadingError;
  const isMissingResumeError = loadingError === "Resume not found. Please upload a resume first.";

  return (
    <main className="review-shell min-h-screen overflow-hidden !pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Premium dashboard
        </div>
      </nav>
      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8 lg:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Resume review dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Resume Review
            </h1>
          </div>
          {feedback && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void copyAllSuggestions()}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                Copy all suggestions
              </button>
              <a
                href={resumeUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(79,70,229,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(79,70,229,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                Open PDF
              </a>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.35fr)]">
          <aside className="sticky top-24 h-fit">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resume preview</p>
                  <p className="mt-1 text-sm text-slate-600">Pinned while you review the feedback.</p>
                </div>
                {feedback && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Target lift</p>
                    <p className="text-lg font-bold text-emerald-600">+{scoreLift}%</p>
                  </div>
                )}
              </div>

              {loadingError && !imageUrl ? (
                isMissingResumeError ? (
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="h-[74vh] rounded-2xl bg-slate-200/70" />
                    <p className="text-center text-sm text-slate-600">No preview available yet.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                    <p className="font-semibold text-red-700">{loadingError}</p>
                    <Link to="/upload" className="mt-3 inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline">
                      Upload a new resume
                    </Link>
                  </div>
                )
              ) : imageUrl && resumeUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={imageUrl}
                      className="h-[74vh] w-full object-contain object-top"
                      title="resume"
                      alt="Resume preview"
                    />
                  </a>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="h-[74vh] animate-pulse rounded-2xl bg-slate-200/70" />
                  <p className="text-center text-sm text-slate-600">Loading resume preview...</p>
                </div>
              )}

              {jobState && jobState !== "done" && (
                <div className="mt-4">
                  <ProgressStateCard
                    jobState={jobState}
                    lastError={lastError}
                    retryCount={retryCount}
                    onRetry={() => window.location.reload()}
                  />
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-5">
            {pollingTimeout ? (
              <div className="rounded-3xl border border-red-200 bg-white/90 p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                <div className="text-lg font-semibold text-red-600">Analysis Timeout</div>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  The analysis is taking longer than expected. High server load, a long job description, or a large file can slow things down.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 text-sm font-semibold text-white"
                  >
                    Check Status Again
                  </button>
                  <Link
                    to="/upload"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
                  >
                    Upload New Resume
                  </Link>
                </div>
              </div>
            ) : loadingError ? (
              <div className="rounded-3xl border border-red-200 bg-white/90 p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                <p className="font-semibold text-red-700">{loadingError}</p>
                <Link to="/upload" className="mt-3 inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline">
                  Upload a new resume
                </Link>
              </div>
            ) : feedback ? (
              <div className="space-y-5">
                {usedFallbackAnalysis && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
                    <p className="font-semibold">Fallback analysis mode</p>
                    <p className="text-sm">
                      Live AI service was unavailable, so this review used a local fallback analysis.
                    </p>
                  </div>
                )}

                <Summary feedback={feedback} />

                <div className="grid gap-5">
                  <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                  {actionableRewrites.length > 0 && <ActionableRewriteCard rewrites={actionableRewrites} />}
                  {roleKeywordAnalysis && <RoleKeywordAnalysisCard data={roleKeywordAnalysis} />}
                  {generatedProjectBullets.length > 0 && <ProjectBulletGenerator bullets={generatedProjectBullets} />}
                  {studentFeedback && <StudentFeedbackCard data={studentFeedback} />}
                  <Details feedback={feedback} />
                </div>
              </div>
            ) : loadingSkeleton ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 w-40 rounded-full bg-slate-200" />
                    <div className="h-32 rounded-2xl bg-slate-200/70" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="h-24 rounded-2xl bg-slate-200/70" />
                      <div className="h-24 rounded-2xl bg-slate-200/70" />
                      <div className="h-24 rounded-2xl bg-slate-200/70" />
                    </div>
                  </div>
                </div>
                <ProgressStateCard
                  jobState={jobState}
                  lastError={lastError}
                  retryCount={retryCount}
                  onRetry={() => window.location.reload()}
                />
                <div className="rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                  <img src="/images/resume-scan-2.gif" className="mx-auto w-full max-w-md" alt="Analysis in progress" />
                  <div className="mt-4">
                    <p className="font-semibold text-slate-800">AI is analyzing your resume...</p>
                    <p className="mt-2 text-sm text-slate-500">
                      This usually takes 2-3 minutes
                      {elapsedTime > 0 && <span className="font-medium"> (elapsed: {elapsedTime}s)</span>}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {jobState && jobState !== "done" && (
                  <ProgressStateCard
                    jobState={jobState}
                    lastError={lastError}
                    retryCount={retryCount}
                    onRetry={() => window.location.reload()}
                  />
                )}
                {jobState === "failed" ? (
                  <div className="rounded-3xl border border-white/70 bg-white/90 p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                    <p className="font-semibold text-slate-800">
                      The analysis stopped before feedback was generated.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try again, or upload a new resume if the problem continues.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                    <img src="/images/resume-scan-2.gif" className="mx-auto w-full max-w-md" alt="Analysis in progress" />
                    <div className="mt-4">
                      <p className="font-semibold text-slate-800">AI is analyzing your resume...</p>
                      <p className="mt-2 text-sm text-slate-500">
                        This usually takes 2-3 minutes
                        {elapsedTime > 0 && (
                          <span className="font-medium"> (elapsed: {elapsedTime}s)</span>
                        )}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500"></div>
                        <div className="animation-delay-200 h-2 w-2 animate-bounce rounded-full bg-indigo-500"></div>
                        <div className="animation-delay-400 h-2 w-2 animate-bounce rounded-full bg-indigo-500"></div>
                      </div>
                      {elapsedTime > 90 && (
                        <p className="mt-4 text-sm text-amber-600">
                          Taking longer than usual. The AI service may be busy.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};

export default Resume;
