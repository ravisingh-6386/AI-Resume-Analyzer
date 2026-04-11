import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuthStore } from "../lib/auth";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailInputRef = useRef<HTMLInputElement>(null);

  const emailError =
    touched.email && !email.trim()
      ? "Email is required"
      : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Please enter a valid email address"
      : "";

  const passwordError =
    touched.password && !password
      ? "Password is required"
      : touched.password && password.length < 6
      ? "Password should be at least 6 characters"
      : "";

  const isFormInvalid = Boolean(emailError || passwordError || !email || !password);
  const sharedInputClasses =
    "w-full h-14 rounded-xl border bg-white/80 text-base leading-tight text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
  const emailInputClasses = `${sharedInputClasses} pl-12 pr-20 ${
    emailError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
  }`;
  const passwordInputClasses = `${sharedInputClasses} pl-12 pr-16 ${
    passwordError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
  }`;

  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    clearError();

    if (isFormInvalid) {
      return;
    }

    try {
      await login(email, password);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      navigate("/");
    } catch (_err) {
      // Error is handled by the store
    }
  };

  const handleEmailFocus = () => {
    const input = emailInputRef.current;
    if (!input) return;

    const end = input.value.length;
    requestAnimationFrame(() => {
      input.setSelectionRange(end, end);
      input.scrollLeft = input.scrollWidth;
    });
  };

  const handleCopyEmail = async () => {
    if (!email.trim()) return;

    try {
      await navigator.clipboard.writeText(email.trim());
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 1200);
    } catch {
      setCopiedEmail(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="text-sm font-semibold tracking-wide text-slate-700"
        >
          Email
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M5.5 7l6.5 5 6.5-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <input
            ref={emailInputRef}
            id="email"
            type="email"
            aria-label="Email address"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : "email-help"}
            placeholder="Enter your email"
            title={email}
            dir="ltr"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (!touched.email) {
                setTouched((prev) => ({ ...prev, email: true }));
              }
            }}
            onFocus={handleEmailFocus}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            disabled={isLoading}
            className={emailInputClasses}
          />
          <button
            type="button"
            onClick={handleCopyEmail}
            disabled={!email.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Copy email"
            title={copiedEmail ? "Copied" : "Copy email"}
          >
            {copiedEmail ? "Copied" : "Copy"}
          </button>
        </div>
        {emailError && (
          <p id="email-error" className="text-xs font-medium text-red-600" role="alert">
            {emailError}
          </p>
        )}
        {!emailError && email && (
          <p id="email-help" className="text-xs text-slate-500" aria-live="polite">
            Full email is visible on hover; focus jumps to the end for long addresses.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-semibold tracking-wide text-slate-700"
          >
            Password
          </label>
          <Link
            to="/auth?mode=forgot-password"
            className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-md"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M8 10V7a4 4 0 118 0v3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            aria-label="Password"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "password-error" : undefined}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (!touched.password) {
                setTouched((prev) => ({ ...prev, password: true }));
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            disabled={isLoading}
            className={passwordInputClasses}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {passwordError && (
          <p id="password-error" className="text-xs font-medium text-red-600" role="alert">
            {passwordError}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
          />
          Remember me
        </label>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50/90 p-3 text-sm font-medium text-red-700"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || isFormInvalid}
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_30px_rgba(79,70,229,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(79,70,229,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Logging in...
          </>
        ) : (
          "Log In"
        )}
        </span>
      </button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full bg-slate-200" />
        </div>
        <p className="relative mx-auto w-fit bg-white/50 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Or continue with
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          aria-label="Continue with Google"
        >
          Google
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          aria-label="Continue with GitHub"
        >
          GitHub
        </button>
      </div>

      <p className="pt-1 text-center text-sm text-slate-600">
        New here?{" "}
        <Link
          to="/auth?mode=signup"
          className="font-semibold text-indigo-600 underline-offset-4 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
