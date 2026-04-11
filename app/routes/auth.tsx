import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuthStore, initializeAuth } from "../lib/auth";
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import ThemeToggle from "../components/ThemeToggle";

export const meta = () => ([
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your account" },
]);

const Auth = () => {
  const { isAuthenticated, error } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const mode = searchParams.get("mode") || "login";
  const next = searchParams.get("next") || "/";

  const showSetupBanner =
    Boolean(error) &&
    (error.includes("Cannot reach auth server") ||
      error.includes("MAIL_USER") ||
      error.includes("MAIL_APP_PASSWORD") ||
      error.includes("Email service is not configured"));

  // Initialize auth from localStorage on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(next);
    }
  }, [isAuthenticated, navigate, next]);

  useEffect(() => {
    const onScroll = () => {
      setIsHeaderCompact(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="auth-shell min-h-screen px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-5">
      <div
        className={`sticky top-4 z-40 mx-auto flex w-full max-w-5xl items-center justify-between rounded-2xl border border-white/70 bg-white/75 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-out md:px-6 ${
          isHeaderCompact ? "px-4 py-2.5 md:py-2" : "px-4 py-3"
        }`}
      >
        <Link to="/" className="shrink-0">
          <p
            className={`bg-gradient-to-r from-slate-900 via-indigo-700 to-slate-900 bg-clip-text font-bold tracking-tight text-transparent transition-all duration-300 ${
              isHeaderCompact ? "text-lg md:text-xl" : "text-xl md:text-2xl"
            }`}
          >
            RESUMIND
          </p>
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-5xl items-center justify-center md:mt-12">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="relative">
            <div className="auth-glow absolute inset-0 rounded-[2rem] opacity-25 blur-2xl" />

            <section className="auth-card auth-card-enter relative rounded-[2rem] p-6 shadow-2xl sm:p-8 md:p-10">
              {showSetupBanner && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-amber-800">Backend setup required for OTP auth</p>
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide((prev) => !prev)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      {showSetupGuide ? "Hide Guide" : "Open Setup Guide"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-amber-700">
                    Create a <span className="font-semibold">.env</span> file from <span className="font-semibold">.env.example</span>, then set
                    <span className="font-semibold"> VITE_API_BASE_URL</span>, <span className="font-semibold">MONGODB_URI</span>,
                    <span className="font-semibold"> MAIL_USER</span>, and <span className="font-semibold"> MAIL_APP_PASSWORD</span>.
                  </p>
                  <p className="mt-1 text-xs text-amber-700">Run both servers: npm run dev:api and npm run dev.</p>

                  {showSetupGuide && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3 text-xs text-amber-900">
                      <p className="font-semibold">Quick setup checklist</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-4">
                        <li>Copy <span className="font-semibold">.env.example</span> to <span className="font-semibold">.env</span>.</li>
                        <li>Set Gmail App Password in <span className="font-semibold">MAIL_APP_PASSWORD</span>.</li>
                        <li>Start API: <span className="font-semibold">npm run dev:api</span>.</li>
                        <li>Start frontend: <span className="font-semibold">npm run dev</span>.</li>
                      </ol>
                      <div className="mt-3 rounded-lg bg-amber-100/60 p-2 font-mono text-[11px] leading-5 text-amber-900">
                        VITE_API_BASE_URL=http://localhost:4000<br />
                        MONGODB_URI=mongodb://127.0.0.1:27017/ai_resume_analyzer<br />
                        MAIL_USER=your-email@gmail.com<br />
                        MAIL_APP_PASSWORD=your-gmail-app-password
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-8 text-center">
                <h1 className="auth-title text-3xl font-bold sm:text-4xl">
                  {mode === "signup"
                    ? "Create Your Account"
                    : mode === "forgot-password"
                    ? "Reset Password"
                    : "Welcome Back"}
                </h1>
                <h2 className="auth-subtitle mt-2 text-sm sm:text-base">
                  {mode === "signup"
                    ? "Build your profile and start tailoring winning resumes."
                    : mode === "forgot-password"
                    ? "We will help you secure your account in a few quick steps."
                    : "Sign in to continue optimizing your resume for every role."}
                </h2>
              </div>

              {mode === "signup" ? (
                <SignupForm />
              ) : mode === "forgot-password" ? (
                <ForgotPasswordForm />
              ) : (
                <LoginForm />
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Auth;
