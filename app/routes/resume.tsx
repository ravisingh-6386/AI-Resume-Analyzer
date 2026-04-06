import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
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
    const maxPolls = 23;
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

        if (pollCount >= maxPolls) {
          stopPolling(timeTracker);
          console.warn("Feedback polling timeout: 3 minutes reached");
          setPollingTimeout(true);
          
          // Check the current job state to provide better error messaging
          const finalData = await loadResume();
          if (finalData?.jobState === "failed") {
            setLoadingError(finalData?.lastError || "Analysis failed. Please try again.");
          } else {
            setLoadingError(
              "Analysis is taking longer than expected. The AI service may be busy or the job description may be too long. Please try uploading again with a shorter description."
            );
          }
        }
      }, 8000);
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

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {loadingError && !imageUrl ? (
            <div className="text-center p-5">
              <p className="text-red-600 font-semibold">{loadingError}</p>
              <Link to="/upload" className="text-blue-600 underline mt-3 inline-block">
                Upload a new resume
              </Link>
            </div>
          ) : imageUrl && resumeUrl ? (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                />
              </a>
            </div>
          ) : (
            <div className="text-center p-5">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading resume...</p>
            </div>
          )}
        </section>

        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>

          {pollingTimeout ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="text-red-600 text-lg font-semibold">Analysis Timeout</div>
              <p className="text-gray-700 max-w-md">
                The AI analysis is taking longer than expected. This might be due to:
              </p>
              <ul className="text-left text-gray-600 text-sm space-y-2 ml-8">
                <li>High server load and a busy AI service</li>
                <li>Large resume file size</li>
                <li>Very long job description</li>
                <li>Network connectivity issues</li>
              </ul>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Check Status Again
                </button>
                <Link
                  to="/upload"
                  className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Upload New Resume
                </Link>
              </div>
            </div>
          ) : loadingError ? (
            <div className="text-red-600 text-center">
              <p className="mb-4">{loadingError}</p>
              <Link to="/upload" className="text-blue-600 underline">
                Upload a new resume
              </Link>
            </div>
          ) : feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              {usedFallbackAnalysis && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <p className="font-semibold">Fallback analysis mode</p>
                  <p className="text-sm">
                    Live AI service was unavailable, so this review used a local fallback analysis.
                  </p>
                </div>
              )}
              {jobState && jobState !== "done" && (
                <ProgressStateCard
                  jobState={jobState}
                  lastError={lastError}
                  retryCount={retryCount}
                  onRetry={() => window.location.reload()}
                />
              )}
              <Summary feedback={feedback} />
              {actionableRewrites.length > 0 && (
                <ActionableRewriteCard rewrites={actionableRewrites} />
              )}
              {studentFeedback && <StudentFeedbackCard data={studentFeedback} />}
              {roleKeywordAnalysis && <RoleKeywordAnalysisCard data={roleKeywordAnalysis} />}
              {generatedProjectBullets.length > 0 && (
                <ProjectBulletGenerator bullets={generatedProjectBullets} />
              )}
              <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
              <Details feedback={feedback} />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {jobState && jobState !== "done" && (
                <ProgressStateCard
                  jobState={jobState}
                  lastError={lastError}
                  retryCount={retryCount}
                  onRetry={() => window.location.reload()}
                />
              )}
              {jobState === "failed" ? (
                <div className="text-center">
                  <p className="text-gray-700 font-semibold">
                    The analysis stopped before feedback was generated.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Try again, or upload a new resume if the problem continues.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4">
                  <img src="/images/resume-scan-2.gif" className="w-full max-w-md" />
                  <div className="text-center">
                    <p className="text-gray-700 font-semibold">AI is analyzing your resume...</p>
                    <p className="text-gray-500 text-sm mt-2">
                      This usually takes 2-3 minutes
                      {elapsedTime > 0 && (
                        <span className="font-medium"> (elapsed: {elapsedTime}s)</span>
                      )}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-200"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-400"></div>
                    </div>
                    {elapsedTime > 90 && (
                      <p className="text-amber-600 text-sm mt-4">
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
    </main>
  );
};

export default Resume;
