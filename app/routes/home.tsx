import type { Route } from "./+types/home";
import Navbar from "../components/Navbar";
import ResumeCard from "../components/ResumeCard";
import { usePuterStore } from "../lib/puter";
import { useAuthStore } from "../lib/auth";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { kv } = usePuterStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/auth?next=/");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list("resume:*", true)) as KVItem[];

      const parsedResumes = resumes?.map((resume) => JSON.parse(resume.value) as Resume);

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    };

    loadResumes();
  }, []);

  return (
    <main className="app-shell relative min-h-screen overflow-hidden bg-cover pb-14">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-200/25 blur-3xl" />
      </div>

      <Navbar />

      <section className="mx-auto mt-8 w-full max-w-6xl px-4 md:px-8">
        <div className="mb-10 flex flex-col gap-4 text-center md:text-left">
          <p className="mx-auto w-fit rounded-full border border-indigo-200 bg-white/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 md:mx-0">
            Trusted by 10,000+ job seekers
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Track every resume version and improve your ATS win rate
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-600 md:mx-0 md:text-lg">
            View past analyses, compare scores, and optimize faster for every role you apply to.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white/85 p-4 text-center shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Resumes Analyzed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{resumes.length}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/85 p-4 text-center shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Average ATS Score</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {resumes.length > 0
                ? Math.round(
                    resumes.reduce((sum, item) => sum + (item.feedback?.overallScore || 0), 0) / resumes.length
                  )
                : "--"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/85 p-4 text-center shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next Step</p>
            <Link
              to="/upload"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Analyze new resume
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {loadingResumes && (
          <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <img src="/images/resume-scan-2.gif" className="mx-auto w-[200px]" alt="Loading resumes" />
            <p className="mt-4 text-sm font-medium text-slate-600">Loading your resume dashboard...</p>
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!loadingResumes && resumes.length === 0 && (
          <div className="rounded-3xl border border-white/70 bg-white/85 px-6 py-12 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <h2 className="text-2xl font-semibold text-slate-900">No resumes yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600">
              Upload your first resume to get ATS insights, rewrite suggestions, and role-specific feedback.
            </p>
            <Link
              to="/upload"
              className="group mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-6 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(79,70,229,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(79,70,229,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
            >
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
