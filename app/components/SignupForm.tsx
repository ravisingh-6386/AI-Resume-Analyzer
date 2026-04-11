import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuthStore } from "../lib/auth";

export default function SignupForm() {
  const navigate = useNavigate();
  const {
    signup,
    verifySignupOtp,
    resendSignupOtp,
    resetSignupOtpState,
    pendingSignupEmail,
    isOtpStep,
    otpExpiresAt,
    signupDevOtp,
    resendCount,
    maxResendAttempts,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(60);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    otpCode: false,
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

  const otpError =
    touched.otpCode && !otpCode
      ? "OTP is required"
      : touched.otpCode && !/^\d{6}$/.test(otpCode)
      ? "Enter a valid 6-digit OTP"
      : "";

  const isFormInvalid = Boolean(
    nameError || emailError || passwordError || confirmPasswordError || !name || !email || !password || !confirmPassword
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true, otpCode: false });
    clearError();

    if (isFormInvalid) {
      return;
    }

    try {
      await signup(email, password, name);
    } catch (_err) {
      // Error is handled by the store
    }
  };

  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, otpCode: true }));
    clearError();

    if (otpError) {
      otpInputRef.current?.focus();
      return;
    }

    try {
      await verifySignupOtp(otpCode);
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

  useEffect(() => {
    if (!isOtpStep || !otpExpiresAt) {
      setSecondsUntilResend(60);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setSecondsUntilResend(remaining > 60 ? 60 : remaining);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isOtpStep, otpExpiresAt]);

  useEffect(() => {
    if (!isOtpStep) return;
    const id = window.setTimeout(() => otpInputRef.current?.focus(), 150);
    return () => window.clearTimeout(id);
  }, [isOtpStep]);

  const canResend = secondsUntilResend === 0 && resendCount < maxResendAttempts;

  const inputShellBase =
    "flex h-14 w-full items-center gap-3 rounded-2xl border bg-white/90 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_26px_rgba(15,23,42,0.06)] transition-all duration-200";

  const inputTextBase =
    "min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none";

  const getInputShellState = (hasError: boolean) =>
    hasError
      ? "border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100"
      : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100";

  if (isOtpStep) {
    return (
      <form onSubmit={handleOtpSubmit} className="flex w-full flex-col gap-5" noValidate>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
          <p className="text-sm font-semibold text-indigo-700">Verify Your Email</p>
          <p className="mt-1 text-sm text-slate-600">
            Enter the 6-digit code sent to <span className="font-semibold text-slate-800">{pendingSignupEmail}</span>
          </p>
          {signupDevOtp && (
            <p className="mt-2 rounded-lg border border-indigo-200 bg-white/70 px-3 py-2 text-xs font-medium text-indigo-700">
              Dev OTP preview: <span className="font-bold tracking-[0.2em]">{signupDevOtp}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="otpCode" className="text-sm font-semibold tracking-wide text-slate-700">
            Verification Code
          </label>
          <div className={`flex h-14 w-full items-center gap-3 rounded-2xl border bg-white/90 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_26px_rgba(15,23,42,0.06)] transition-all duration-200 ${otpError ? "border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100" : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100"}`}>
            <span className="pointer-events-none text-slate-400" aria-hidden="true">#</span>
            <input
              ref={otpInputRef}
              id="otpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(next);
                if (!touched.otpCode) {
                  setTouched((prev) => ({ ...prev, otpCode: true }));
                }
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, otpCode: true }))}
              aria-invalid={Boolean(otpError)}
              aria-describedby={otpError ? "otp-error" : "otp-help"}
              disabled={isLoading}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold tracking-[0.28em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 outline-none"
            />
          </div>
          {otpError ? (
            <p id="otp-error" className="text-xs font-medium text-red-600" role="alert">
              {otpError}
            </p>
          ) : (
            <p id="otp-help" className="text-xs text-slate-500">
              Code expires in 5 minutes. Check spam if you don’t see it.
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
          disabled={isLoading || Boolean(otpError)}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_30px_rgba(79,70,229,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(79,70,229,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? "Verifying..." : "Verify & Create Account"}
          </span>
        </button>

        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              resetSignupOtpState();
              setOtpCode("");
              clearError();
            }}
            className="font-semibold text-slate-600 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded"
          >
            Edit details
          </button>

          <button
            type="button"
            onClick={() => void resendSignupOtp()}
            disabled={!canResend || isLoading}
            className="font-semibold text-indigo-600 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {canResend ? "Resend OTP" : `Resend in ${secondsUntilResend}s`}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Resend attempts: {resendCount}/{maxResendAttempts}
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
      <div className="flex flex-col gap-2.5">
        <label htmlFor="name" className="text-sm font-semibold tracking-wide text-slate-700">
          Full Name
        </label>
        <div className={`${inputShellBase} ${getInputShellState(Boolean(nameError))} ${isLoading ? "opacity-70" : ""}`}>
          <span className="pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center text-slate-400" aria-hidden="true">
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
            className={inputTextBase}
          />
        </div>
        {nameError && (
          <p id="name-error" className="text-xs font-medium text-red-600" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="email" className="text-sm font-semibold tracking-wide text-slate-700">
          Email
        </label>
        <div className={`${inputShellBase} ${getInputShellState(Boolean(emailError))} ${isLoading ? "opacity-70" : ""}`}>
          <span className="pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center text-slate-400" aria-hidden="true">
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
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "signup-email-error" : "signup-email-help"}
            placeholder="name@company.com"
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
            className={inputTextBase}
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              disabled={!email.trim()}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Copy email"
              title={copiedEmail ? "Copied" : "Copy email"}
            >
              {copiedEmail ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        {emailError && (
          <p id="signup-email-error" className="text-xs font-medium text-red-600" role="alert">
            {emailError}
          </p>
        )}
        {!emailError && email && (
          <p id="signup-email-help" className="text-xs text-slate-500" aria-live="polite">
            Full email is visible on hover; focus jumps to the end for long addresses.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="password" className="text-sm font-semibold tracking-wide text-slate-700">
          Password
        </label>
        <div className={`${inputShellBase} ${getInputShellState(Boolean(passwordError))} ${isLoading ? "opacity-70" : ""}`}>
          <span className="pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center text-slate-400" aria-hidden="true">
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
            className={inputTextBase}
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span aria-hidden="true">{showPassword ? "🙈" : "👁"}</span>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {passwordError && (
          <p id="signup-password-error" className="text-xs font-medium text-red-600" role="alert">
            {passwordError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="confirmPassword" className="text-sm font-semibold tracking-wide text-slate-700">
          Confirm Password
        </label>
        <div className={`${inputShellBase} ${getInputShellState(Boolean(confirmPasswordError))} ${isLoading ? "opacity-70" : ""}`}>
          <span className="pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center text-slate-400" aria-hidden="true">
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
            className={inputTextBase}
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98]"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              <span aria-hidden="true">{showConfirmPassword ? "🙈" : "👁"}</span>
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
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
