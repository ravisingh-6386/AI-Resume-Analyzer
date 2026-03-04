import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuthStore, initializeAuth } from "../lib/auth";
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";

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
    <main className="bg-gradient-to-br from-rose-50 via-white to-pink-100 min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Gradient Border Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-3xl opacity-20 blur-xl" />
          
          <section className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 mb-8 text-center">
              <h1 className="text-3xl font-bold">
                Welcome <span className="text-indigo-600">Back</span>
              </h1>
              <h2 className="text-gray-600 text-sm">
                {mode === "signup"
                  ? "Create Your Account"
                  : "Log In to Continue Your Job Journey"}
              </h2>
            </div>

            {/* Forms */}
            {mode === "signup" ? <SignupForm /> : <LoginForm />}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Auth;
