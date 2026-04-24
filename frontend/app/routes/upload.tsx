import { type FormEvent, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";
import { usePuterStore } from "../lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "../lib/pdf2img";
import {
    generateActionableRewrites,
    generateProjectBullets,
    generateUUID,
    getRoleKeywordAnalysis,
    parseFeedback,
    rewriteFeedbackForStudents,
} from "../lib/utils";
import { prepareInstructions } from "../../constants";

type FormValues = {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
};

type FormErrors = {
    companyName?: string;
    jobTitle?: string;
    jobDescription?: string;
    file?: string;
};

const Upload = () => {
    const { fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [formValues, setFormValues] = useState<FormValues>({
        companyName: "",
        jobTitle: "",
        jobDescription: "",
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const descriptionLength = formValues.jobDescription.length;

    const handleFileSelect = (nextFile: File | null) => {
        setFile(nextFile);
        setFormErrors((prev) => ({ ...prev, file: undefined }));
    };

    const inputClassName =
        "h-14 w-full rounded-xl border border-slate-300/90 bg-white px-4 text-base text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
    const textareaClassName =
        "min-h-[160px] w-full resize-y rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-base text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

    const formProgress = useMemo(() => {
        const requiredFields = [
            formValues.companyName.trim(),
            formValues.jobTitle.trim(),
            formValues.jobDescription.trim(),
            file ? "file" : "",
        ];
        const completedCount = requiredFields.filter(Boolean).length;
        return Math.round((completedCount / requiredFields.length) * 100);
    }, [file, formValues.companyName, formValues.jobDescription, formValues.jobTitle]);

    const validateForm = () => {
        const nextErrors: FormErrors = {};

        if (!formValues.companyName.trim()) {
            nextErrors.companyName = "Please enter a company name.";
        }
        if (!formValues.jobTitle.trim()) {
            nextErrors.jobTitle = "Please enter the role you are targeting.";
        }
        if (!formValues.jobDescription.trim()) {
            nextErrors.jobDescription = "Please paste the job description.";
        } else if (formValues.jobDescription.length > 5000) {
            nextErrors.jobDescription = "Job description is too long (max 5000 characters).";
        }
        if (!file) {
            nextErrors.file = "Please upload your resume in PDF format.";
        }

        setFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        setIsProcessing(true);
        let analysisId = "";

        try {
            setStatusText("Uploading your resume...");
            const uploadedFile = (await Promise.race([
                fs.upload([file]),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 30000)),
            ])) as any;

            if (!uploadedFile || !uploadedFile.path) {
                throw new Error("Failed to upload file. Please check your connection and try again.");
            }

            setStatusText("Preparing preview data...");
            const imageFile = await convertPdfToImage(file);
            if (!imageFile.file) throw new Error(imageFile.error || "Failed to convert PDF to image");

            setStatusText("Uploading preview image...");
            const uploadedImage = (await Promise.race([
                fs.upload([imageFile.file]),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 30000)),
            ])) as any;

            if (!uploadedImage || !uploadedImage.path) throw new Error("Failed to upload image. Please try again.");

            setStatusText("Configuring your analysis...");
            const uuid = generateUUID();
            analysisId = uuid;
            const createdAt = Date.now();
            const data: {
                id: string;
                resumePath: string;
                imagePath: string;
                companyName: string;
                jobTitle: string;
                jobDescription: string;
                feedback: Feedback | null;
                studentFeedback?: StudentFeedback;
                roleKeywordAnalysis?: RoleKeywordAnalysis;
                generatedProjectBullets?: string[];
                actionableRewrites?: ActionableRewrite[];
                usedFallbackAnalysis?: boolean;
                jobState: string;
                retryCount: number;
                createdAt: number;
                completedAt?: number;
            } = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: null,
                jobState: "queued",
                retryCount: 0,
                createdAt,
            };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText("Analyzing ATS readiness and interview impact...");
            data.jobState = "processing";
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            const feedbackTimeout = new Promise((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "Analysis timeout: exceeded 180 seconds (3 minutes). Please try again with a shorter job description."
                            )
                        ),
                    180000
                )
            );

            const feedback = (await Promise.race([
                ai.feedback(uploadedFile.path, prepareInstructions({ jobTitle, jobDescription })),
                feedbackTimeout,
            ])) as any;

            if (!feedback || !feedback.message) {
                throw new Error("Invalid AI response format. Please try again.");
            }

            const feedbackText =
                typeof feedback.message.content === "string"
                    ? feedback.message.content
                    : Array.isArray(feedback.message.content)
                    ? feedback.message.content[0]?.text
                    : "";

            if (!feedbackText) {
                throw new Error("AI returned an empty response. Please try again.");
            }

            const parsedFeedback = parseFeedback(feedbackText);
            const usedFallbackAnalysis = feedback?.via_ai_chat_service === false;

            if (!parsedFeedback || parsedFeedback.overallScore === 0) {
                throw new Error("Failed to parse AI feedback properly.");
            }

            const hasTips =
                parsedFeedback.ATS.tips.length > 0 ||
                parsedFeedback.content.tips.length > 0 ||
                parsedFeedback.skills.tips.length > 0;

            if (!hasTips && parsedFeedback.overallScore < 10) {
                throw new Error("AI returned incomplete feedback. Please try again.");
            }

            data.feedback = parsedFeedback;
            const roleKeywordAnalysis = getRoleKeywordAnalysis(jobTitle, jobDescription, parsedFeedback);
            const studentFeedback = rewriteFeedbackForStudents(parsedFeedback);
            const generatedProjectBullets = generateProjectBullets(jobTitle, roleKeywordAnalysis);
            const actionableRewrites = generateActionableRewrites(parsedFeedback);

            data.roleKeywordAnalysis = roleKeywordAnalysis;
            data.studentFeedback = studentFeedback;
            data.generatedProjectBullets = generatedProjectBullets;
            data.actionableRewrites = actionableRewrites;
            data.usedFallbackAnalysis = usedFallbackAnalysis;
            data.jobState = "done";
            data.completedAt = Date.now();

            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            const savedData = await kv.get(`resume:${uuid}`);
            if (!savedData) {
                throw new Error("Failed to save analysis results. Please try again.");
            }

            setStatusText("Analysis complete! Opening your results...");
            setTimeout(() => {
                navigate(`/resume/${uuid}`);
            }, 450);
        } catch (error) {
            const errorMsg =
                error instanceof Error
                    ? error.message
                    : typeof error === "string"
                    ? error
                    : "An unexpected error occurred. Please try again.";

            try {
                if (!analysisId) throw new Error("No analysis ID available");
                const existingData = await kv.get(`resume:${analysisId}`);
                if (existingData) {
                    const parsed = JSON.parse(existingData);
                    parsed.jobState = "failed";
                    parsed.lastError = errorMsg;
                    parsed.retryCount = (parsed.retryCount || 0) + 1;
                    await kv.set(`resume:${analysisId}`, JSON.stringify(parsed));
                }
            } catch {
                // Best-effort state update only
            }

            setStatusText(`Error: ${errorMsg}`);
            setIsProcessing(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatusText("");

        if (!validateForm()) {
            return;
        }

        const companyName = formValues.companyName.trim();
        const jobTitle = formValues.jobTitle.trim();
        const jobDescription = formValues.jobDescription.trim();

        if (jobDescription.length > 2000) {
            const shouldContinue = confirm(
                "Your job description is long. Analysis may take 3+ minutes. Continue?"
            );
            if (!shouldContinue) return;
        }

        if (!file) return;
        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="app-shell relative min-h-screen overflow-hidden bg-cover pb-14">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
                <div className="absolute right-0 top-44 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />
            </div>

            <Navbar />

            <section className="mx-auto mt-8 w-full max-w-6xl px-4 md:px-8">
                <div className="mb-10 flex flex-col gap-4 text-center md:text-left">
                    <p className="mx-auto w-fit rounded-full border border-indigo-200 bg-white/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 md:mx-0">
                        Trusted by 10,000+ job seekers
                    </p>
                    <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                        Get a stronger ATS score and land interviews faster
                    </h1>
                    <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-600 md:mx-0 md:text-lg">
                        Upload your resume, match it to your target role, and receive clear, actionable fixes that improve visibility, relevance, and recruiter confidence.
                    </p>
                </div>

                {statusText && (
                    <div
                        className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                            statusText.startsWith("Error")
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                        role="status"
                        aria-live="polite"
                    >
                        {statusText}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl md:p-8">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900">Start Resume Analysis</h2>
                                <p className="mt-1 text-sm text-slate-600">Complete all fields to unlock personalized ATS and content feedback.</p>
                            </div>
                            <div className="hidden rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 sm:block">
                                {formProgress}% complete
                            </div>
                        </div>

                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                            <div className="form-div gap-2.5">
                                <label htmlFor="company-name" className="text-sm font-semibold tracking-wide text-slate-700">
                                    Company Name
                                </label>
                                <input
                                    id="company-name"
                                    name="company-name"
                                    type="text"
                                    placeholder="Ex: Notion, Microsoft, Atlassian"
                                    autoComplete="organization"
                                    value={formValues.companyName}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, companyName: e.target.value }));
                                        setFormErrors((prev) => ({ ...prev, companyName: undefined }));
                                    }}
                                    className={`${inputClassName} ${formErrors.companyName ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                                    aria-invalid={Boolean(formErrors.companyName)}
                                    aria-describedby={formErrors.companyName ? "company-error" : undefined}
                                />
                                {formErrors.companyName && (
                                    <p id="company-error" className="text-sm font-medium text-red-600" role="alert">
                                        {formErrors.companyName}
                                    </p>
                                )}
                            </div>

                            <div className="form-div gap-2.5">
                                <label htmlFor="job-title" className="text-sm font-semibold tracking-wide text-slate-700">
                                    Job Title
                                </label>
                                <input
                                    id="job-title"
                                    name="job-title"
                                    type="text"
                                    placeholder="Ex: Frontend Engineer"
                                    value={formValues.jobTitle}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, jobTitle: e.target.value }));
                                        setFormErrors((prev) => ({ ...prev, jobTitle: undefined }));
                                    }}
                                    className={`${inputClassName} ${formErrors.jobTitle ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                                    aria-invalid={Boolean(formErrors.jobTitle)}
                                    aria-describedby={formErrors.jobTitle ? "title-error" : undefined}
                                />
                                {formErrors.jobTitle && (
                                    <p id="title-error" className="text-sm font-medium text-red-600" role="alert">
                                        {formErrors.jobTitle}
                                    </p>
                                )}
                            </div>

                            <div className="form-div gap-2.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="job-description" className="text-sm font-semibold tracking-wide text-slate-700">
                                        Job Description
                                    </label>
                                    <span
                                        className={`text-xs font-medium ${
                                            descriptionLength > 5000 ? "text-red-600" : "text-slate-500"
                                        }`}
                                    >
                                        {descriptionLength}/5000
                                    </span>
                                </div>
                                <textarea
                                    id="job-description"
                                    name="job-description"
                                    rows={6}
                                    placeholder="Paste the full job description here for role-specific scoring and rewrite suggestions"
                                    value={formValues.jobDescription}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, jobDescription: e.target.value }));
                                        setFormErrors((prev) => ({ ...prev, jobDescription: undefined }));
                                    }}
                                    className={`${textareaClassName} ${
                                        formErrors.jobDescription ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""
                                    }`}
                                    aria-invalid={Boolean(formErrors.jobDescription)}
                                    aria-describedby={formErrors.jobDescription ? "description-error" : undefined}
                                />
                                {formErrors.jobDescription && (
                                    <p id="description-error" className="text-sm font-medium text-red-600" role="alert">
                                        {formErrors.jobDescription}
                                    </p>
                                )}
                            </div>

                            <div className="form-div gap-2.5">
                                <label htmlFor="uploader" className="text-sm font-semibold tracking-wide text-slate-700">
                                    Upload Resume (PDF)
                                </label>
                                <FileUploader onFileSelect={handleFileSelect} />
                                {formErrors.file && (
                                    <p className="text-sm font-medium text-red-600" role="alert">
                                        {formErrors.file}
                                    </p>
                                )}
                            </div>

                            <button
                                className="group relative mt-2 inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-6 text-base font-semibold text-white shadow-[0_16px_34px_rgba(79,70,229,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(79,70,229,0.42)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                                type="submit"
                                disabled={isProcessing}
                            >
                                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                                <span className="relative flex items-center gap-2">
                                    {isProcessing && (
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    )}
                                    {isProcessing ? "Analyzing Resume..." : "Analyze Resume"}
                                </span>
                            </button>
                        </form>
                    </div>

                    <aside className="space-y-4 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-7">
                        <h3 className="text-xl font-semibold text-slate-900">What You’ll Get</h3>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">ATS score breakdown with clear improvement priorities.</li>
                            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Role-specific keyword analysis based on your target position.</li>
                            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Actionable rewrites for bullet points, impact, and clarity.</li>
                        </ul>

                        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Sample Result Preview</p>
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-700">ATS Compatibility</p>
                                <p className="text-xl font-bold text-indigo-700">84/100</p>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-indigo-100">
                                <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" />
                            </div>
                            <p className="mt-3 text-xs text-slate-600">Most users improve their score by 15-25 points after applying suggestions.</p>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-500">
                            Your files are used only for analysis and are associated with your account for result tracking.
                        </p>
                    </aside>
                </div>
            </section>
        </main>
    );
};

export default Upload;
