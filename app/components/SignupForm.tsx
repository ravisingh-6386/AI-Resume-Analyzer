import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuthStore } from "../lib/auth";

export default function SignupForm() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const nameError = touched.name && !name.trim() ? "Full name is required" : "";
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
      ? "Password must be at least 6 characters"
      : "";
  const confirmPasswordError =
    touched.confirmPassword && !confirmPassword
      ? "Please confirm your password"
      : touched.confirmPassword && confirmPassword !== password
      ? "Passwords do not match"
      : "";

  const isFormInvalid = Boolean(
    nameError || emailError || passwordError || confirmPasswordError || !name || !email || !password || !confirmPassword
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    clearError();

    if (isFormInvalid) {
      return;
    }

    try {
      await signup(email, password, name);
      navigate("/");
    } catch (_err) {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-semibold tracking-wide text-slate-700">
          Full Name
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M5.5 19a6.5 6.5 0 0113 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            id="name"
            type="text"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "name-error" : undefined}
            placeholder="Your full name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!touched.name) {
                setTouched((prev) => ({ ...prev, name: true }));
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            disabled={isLoading}
            className={`w-full rounded-2xl border bg-white/75 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
              nameError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
            }`}
          />
        </div>
        {nameError && (
          <p id="name-error" className="text-xs font-medium text-red-600" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold tracking-wide text-slate-700">
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
            id="email"
            type="email"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "signup-email-error" : undefined}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (!touched.email) {
                setTouched((prev) => ({ ...prev, email: true }));
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            disabled={isLoading}
            className={`w-full rounded-2xl border bg-white/75 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
              emailError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
            }`}
          />
        </div>
        {emailError && (
          <p id="signup-email-error" className="text-xs font-medium text-red-600" role="alert">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold tracking-wide text-slate-700">
          Password
        </label>
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
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "signup-password-error" : undefined}
            placeholder="Create a password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (!touched.password) {
                setTouched((prev) => ({ ...prev, password: true }));
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            disabled={isLoading}
            className={`w-full rounded-2xl border bg-white/75 py-3.5 pl-12 pr-14 text-base text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
              passwordError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
            }`}
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
          <p id="signup-password-error" className="text-xs font-medium text-red-600" role="alert">
            {passwordError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-semibold tracking-wide text-slate-700">
          Confirm Password
        </label>
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
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            aria-invalid={Boolean(confirmPasswordError)}
            aria-describedby={confirmPasswordError ? "signup-confirm-error" : undefined}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (!touched.confirmPassword) {
                setTouched((prev) => ({ ...prev, confirmPassword: true }));
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
            disabled={isLoading}
            className={`w-full rounded-2xl border bg-white/75 py-3.5 pl-12 pr-14 text-base text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
              confirmPasswordError
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-indigo-400"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
        {confirmPasswordError && (
          <p id="signup-confirm-error" className="text-xs font-medium text-red-600" role="alert">
            {confirmPasswordError}
          </p>
        )}
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
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
        </span>
      </button>

      <p className="pt-1 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          to="/auth"
          className="font-semibold text-indigo-600 underline-offset-4 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded"
        >
          Log In
        </Link>
      </p>
    </form>
  );
}
