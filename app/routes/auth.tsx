import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuthStore, initializeAuth } from "../lib/auth";
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";

export const meta = () => ([
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your account" },
]);

const Auth = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  return (
    <main className="auth-shell min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Gradient Border Card */}
        <div className="relative">
          <div className="auth-glow absolute inset-0 rounded-3xl opacity-20 blur-xl" />
          
          <section className="auth-card relative rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 mb-8 text-center">
              <h1 className="text-3xl font-bold">
                Welcome <span className="text-indigo-600">Back</span>
              </h1>
              <h2 className="auth-subtitle text-sm">
                {mode === "signup"
                  ? "Create Your Account"
                  : mode === "forgot-password"
                  ? "Reset Your Password"
                  : "Log In to Continue Your Job Journey"}
              </h2>
            </div>

            {/* Forms */}
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
    </main>
  );
};

export default Auth;
