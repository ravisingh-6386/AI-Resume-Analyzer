import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuthStore, initializeAuth } from "../lib/auth";
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";
const API_HEALTH_URL = `${API_BASE_URL}/api/health`;

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
  const [isApiReachable, setIsApiReachable] = useState<boolean | null>(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const mode = searchParams.get("mode") || "login";
  const next = searchParams.get("next") || "/";
  const isServerOfflineError = Boolean(error?.includes("Cannot reach auth server"));
  const isMailConfigError = Boolean(
    error?.includes("MAIL_USER") ||
      error?.includes("MAIL_APP_PASSWORD") ||
      error?.includes("Email service is not configured")
  );
  const isApiOffline = isApiReachable === false;
  const shouldShowOfflineContent = isApiOffline || isServerOfflineError;

  const showSetupBanner = shouldShowOfflineContent || (Boolean(error) && isMailConfigError);

  const checkApiHealth = async () => {
    setIsCheckingApi(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(API_HEALTH_URL, {
        method: "GET",
        signal: controller.signal,
      });
      setIsApiReachable(response.ok);
    } catch {
      setIsApiReachable(false);
    } finally {
      window.clearTimeout(timeoutId);
      setIsCheckingApi(false);
    }
  };

  const copyStartCommand = async () => {
    try {
      await navigator.clipboard.writeText("npm run dev:api");
      setCopiedCommand(true);
      window.setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      setCopiedCommand(false);
    }
  };

  // Initialize auth from localStorage on mount
  useEffect(() => {
    initializeAuth();
    void checkApiHealth();
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
                    <p className="text-sm font-semibold text-amber-800">
                      {shouldShowOfflineContent
                        ? "Auth API is not running"
                        : "Email setup required for SMTP delivery"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSetupGuide((prev) => !prev)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      {showSetupGuide ? "Hide Guide" : "Open Setup Guide"}
                    </button>
                  </div>
                  {shouldShowOfflineContent ? (
                    <>
                      <p className="mt-1 text-xs leading-6 text-amber-700">
                        Frontend is running, but the auth API at
                        <span className="font-semibold"> http://localhost:4000</span> is unreachable.
                      </p>
                      <p className="mt-1 text-xs text-amber-700">Start the backend server with: npm run dev:api</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void checkApiHealth()}
                          disabled={isCheckingApi}
                          className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCheckingApi ? "Checking..." : "Retry connection"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyStartCommand()}
                          className="rounded-md border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-white"
                        >
                          {copiedCommand ? "Copied" : "Copy npm run dev:api"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs leading-6 text-amber-700">
                        Set <span className="font-semibold">MAIL_USER</span> and
                        <span className="font-semibold"> MAIL_APP_PASSWORD</span> in
                        <span className="font-semibold"> backend/.env</span> for real email delivery.
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        In development you can keep <span className="font-semibold">ALLOW_INSECURE_DEV_OTP=true</span> to use dev OTP preview without SMTP.
                      </p>
                    </>
                  )}

                  {showSetupGuide && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3 text-xs text-amber-900">
                      {shouldShowOfflineContent ? (
                        <>
                          <p className="font-semibold">Quick fix</p>
                          <ol className="mt-2 list-decimal space-y-1 pl-4">
                            <li>Start API: <span className="font-semibold">npm run dev:api</span>.</li>
                            <li>Ensure MongoDB is running on <span className="font-semibold">mongodb://127.0.0.1:27017</span>.</li>
                            <li>Keep frontend running: <span className="font-semibold">npm run dev</span>.</li>
                          </ol>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">SMTP setup</p>
                          <ol className="mt-2 list-decimal space-y-1 pl-4">
                            <li>Open <span className="font-semibold">backend/.env</span>.</li>
                            <li>Set <span className="font-semibold">MAIL_USER</span> and <span className="font-semibold">MAIL_APP_PASSWORD</span>.</li>
                            <li>Restart API: <span className="font-semibold">npm run dev:api</span>.</li>
                          </ol>
                        </>
                      )}
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
                {isApiReachable !== null && (
                  <div className="mt-3 flex justify-center">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        isApiReachable
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                          isApiReachable ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {isApiReachable ? "API connected" : "API offline"}
                    </span>
                  </div>
                )}
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
