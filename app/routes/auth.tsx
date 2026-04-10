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
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const mode = searchParams.get("mode") || "login";
  const next = searchParams.get("next") || "/";

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
