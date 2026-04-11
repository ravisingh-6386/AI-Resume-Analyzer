import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuthStore } from "../lib/auth";

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [maxResend, setMaxResend] = useState(3);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState({
    email: false,
    otpCode: false,
    newPassword: false,
    confirmPassword: false,
  });

  const trimmedEmail = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  const emailError =
    touched.email && !trimmedEmail
      ? "Email is required"
      : touched.email && !isEmailValid
      ? "Please enter a valid email address"
      : "";

  const newPasswordError =
    touched.newPassword && !newPassword
      ? "New password is required"
      : touched.newPassword && newPassword.length < 6
      ? "Password must be at least 6 characters"
      : "";

  const confirmPasswordError =
    touched.confirmPassword && !confirmPassword
      ? "Please confirm your new password"
      : touched.confirmPassword && newPassword !== confirmPassword
      ? "Passwords do not match"
      : "";

  const otpError =
    touched.otpCode && !otpCode
      ? "OTP is required"
      : touched.otpCode && !/^\d{6}$/.test(otpCode)
      ? "Enter a valid 6-digit OTP"
      : "";

  const handleEmailFocus = () => {
    const input = emailRef.current;
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

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, email: true }));
    clearError();

    if (!trimmedEmail) {
      emailRef.current?.focus();
      return;
    }

    if (!isEmailValid) {
      emailRef.current?.focus();
      return;
    }

    try {
      const response = await forgotPassword(trimmedEmail);
      setStep("reset");
      setTouched({ email: true, otpCode: false, newPassword: false, confirmPassword: false });
      setResendCount(response.resendCount);
      setMaxResend(response.maxResend);
      setSecondsUntilResend(60);
      setDevOtp(response.devOtp || null);
    } catch (_error) {
      // Error is handled by the store
    }
  };

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, otpCode: true, newPassword: true, confirmPassword: true }));
    clearError();

    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      newPasswordRef.current?.focus();
      return;
    }

    if (!confirmPassword || newPassword !== confirmPassword) {
      confirmPasswordRef.current?.focus();
      return;
    }

    try {
      await resetPassword(email, newPassword, otpCode);
      navigate("/auth?mode=login");
    } catch (_error) {
      // Error is handled by the store
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await forgotPassword(trimmedEmail);
      setResendCount(response.resendCount);
      setMaxResend(response.maxResend);
      setSecondsUntilResend(60);
      setDevOtp(response.devOtp || null);
    } catch {
      // Error is handled by the store
    }
  };

  useEffect(() => {
    if (secondsUntilResend <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsUntilResend((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsUntilResend]);

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5 w-full" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold tracking-wide text-slate-700">
            Email Address
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
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              required
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "forgot-email-error" : "forgot-email-help"}
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
              className={`w-full rounded-2xl border bg-white/75 py-3.5 pl-12 pr-20 text-base text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                emailError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
              }`}
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
            <p
              id="forgot-email-error"
              className="text-xs font-medium text-red-600"
              role="alert"
              aria-live="polite"
            >
              {emailError}
            </p>
          )}
          {!emailError && email && (
            <p id="forgot-email-help" className="text-xs text-slate-500" aria-live="polite">
              Full email is visible on hover; focus jumps to the end for long addresses.
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
          disabled={isLoading || Boolean(emailError) || !email}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_30px_rgba(79,70,229,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(79,70,229,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
          </span>
        </button>

        <p className="pt-1 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link
            to="/auth?mode=login"
            className="font-semibold text-indigo-600 underline-offset-4 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded"
          >
            Log In
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleResetSubmit} className="flex flex-col gap-5 w-full" noValidate>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-sm font-medium text-emerald-700">
        OTP sent to {email}. Enter the 6-digit code and your new password.
      </div>

      {devOtp && (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-medium text-indigo-700">
          Dev OTP preview: <span className="font-bold tracking-[0.2em]">{devOtp}</span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="otpCode" className="text-sm font-semibold tracking-wide text-slate-700">
          OTP Code
        </label>
        <div className="relative">
          <input
            id="otpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-invalid={Boolean(otpError)}
            aria-describedby={otpError ? "otp-code-error" : "otp-code-help"}
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
            disabled={isLoading}
            className={`w-full rounded-2xl border bg-white/75 py-3.5 px-4 text-base font-semibold tracking-[0.28em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
              otpError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-indigo-400"
            }`}
          />
        </div>
        {otpError ? (
          <p id="otp-code-error" className="text-xs font-medium text-red-600" role="alert" aria-live="polite">
            {otpError}
          </p>
        ) : (
          <p id="otp-code-help" className="text-xs text-slate-500">
            OTP expires in 5 minutes.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="newPassword" className="text-sm font-semibold tracking-wide text-slate-700">
          New Password
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
              ref={newPasswordRef}
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
            aria-invalid={Boolean(newPasswordError)}
              aria-describedby={newPasswordError ? "new-password-error new-password-hint" : "new-password-hint"}
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (!touched.newPassword) {
                setTouched((prev) => ({ ...prev, newPassword: true }));
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
            disabled={isLoading}
            className={`w-full rounded-2xl border bg-white/75 py-3.5 pl-12 pr-14 text-base text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_rgba(15,23,42,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
              newPasswordError
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-indigo-400"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
          >
            {showNewPassword ? "Hide" : "Show"}
          </button>
        </div>
        {newPasswordError && (
          <p id="new-password-error" className="text-xs font-medium text-red-600" role="alert" aria-live="polite">
            {newPasswordError}
          </p>
        )}
        <p id="new-password-hint" className="text-xs text-slate-500">
          Use at least 6 characters.
        </p>
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
            ref={confirmPasswordRef}
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(confirmPasswordError)}
            aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
            placeholder="Confirm your new password"
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
          <p id="confirm-password-error" className="text-xs font-medium text-red-600" role="alert" aria-live="polite">
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

      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => setStep("email")}
          className="font-semibold text-slate-600 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded"
        >
          Change email
        </button>

        <button
          type="button"
          onClick={() => void handleResendOtp()}
          disabled={isLoading || secondsUntilResend > 0 || resendCount >= maxResend}
          className="font-semibold text-indigo-600 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {secondsUntilResend > 0 ? `Resend in ${secondsUntilResend}s` : "Resend OTP"}
        </button>
      </div>

      <p className="text-xs text-slate-500">Resend attempts: {resendCount}/{maxResend}</p>

      <button
        type="submit"
        disabled={isLoading || Boolean(otpError) || Boolean(newPasswordError) || Boolean(confirmPasswordError) || !otpCode || !newPassword || !confirmPassword}
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_30px_rgba(79,70,229,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(79,70,229,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Resetting...
          </>
        ) : (
          "Reset Password"
        )}
        </span>
      </button>

      <p className="pt-1 text-center text-sm text-slate-600">
        <Link
          to="/auth?mode=login"
          className="font-semibold text-indigo-600 underline-offset-4 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded"
        >
          Back to Log In
        </Link>
      </p>
    </form>
  );
}
