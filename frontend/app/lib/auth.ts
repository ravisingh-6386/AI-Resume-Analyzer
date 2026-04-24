import { create } from "zustand";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface SendOtpResponse {
  message: string;
  expiresIn: number;
  resendCount: number;
  maxResend: number;
  devOtp?: string;
  deliveryMode?: "smtp" | "development";
}

interface VerifyOtpResponse {
  message: string;
  user: AuthUser;
}

interface LoginResponse {
  message: string;
  user: AuthUser;
}

interface ForgotPasswordResponse {
  message: string;
  expiresIn: number;
  resendCount: number;
  maxResend: number;
  devOtp?: string;
  deliveryMode?: "smtp" | "development";
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingSignupEmail: string | null;
  isOtpStep: boolean;
  resendCount: number;
  maxResendAttempts: number;
  otpExpiresAt: number | null;
  signupDevOtp: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  verifySignupOtp: (otp: string) => Promise<void>;
  resendSignupOtp: () => Promise<void>;
  resetSignupOtpState: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse>;
  resetPassword: (email: string, newPassword: string, otp?: string) => Promise<void>;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "";

const authApi = async <T>(endpoint: string, payload: Record<string, unknown>) => {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Cannot reach auth server. Start API with npm run dev:api and verify VITE_API_BASE_URL."
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Request failed");
  }

  return data as T;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingSignupEmail: null,
  isOtpStep: false,
  resendCount: 0,
  maxResendAttempts: 3,
  otpExpiresAt: null,
  signupDevOtp: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Simple email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      const data = await authApi<LoginResponse>("login", {
        email,
        password,
      });

      const authUser = data.user;
      localStorage.setItem("authUser", JSON.stringify(authUser));
      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      // Validate inputs
      if (!email || !password || !name) {
        throw new Error("All fields are required");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const data = await authApi<LoginResponse>("signup", { email, password, name });
      localStorage.setItem("authUser", JSON.stringify(data.user));
      set({
        user: data.user,
        isAuthenticated: true,
        pendingSignupEmail: null,
        isOtpStep: false,
        resendCount: 0,
        maxResendAttempts: 3,
        otpExpiresAt: null,
        signupDevOtp: null,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  verifySignupOtp: async (otp: string) => {
    set({ isLoading: true, error: null });

    try {
      const pendingEmail = useAuthStore.getState().pendingSignupEmail;

      if (!pendingEmail) {
        throw new Error("Signup session expired. Please start again.");
      }

      if (!/^\d{6}$/.test(otp.trim())) {
        throw new Error("Please enter a valid 6-digit OTP");
      }

      const data = await authApi<VerifyOtpResponse>("verify-otp", {
        email: pendingEmail,
        otp: otp.trim(),
      });

      localStorage.setItem("authUser", JSON.stringify(data.user));
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isOtpStep: false,
        pendingSignupEmail: null,
        otpExpiresAt: null,
        resendCount: 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resendSignupOtp: async () => {
    set({ isLoading: true, error: null });

    try {
      const pendingEmail = useAuthStore.getState().pendingSignupEmail;

      if (!pendingEmail) {
        throw new Error("Signup session expired. Please start again.");
      }

      const data = await authApi<SendOtpResponse>("send-otp", { email: pendingEmail });

      set({
        resendCount: data.resendCount,
        maxResendAttempts: data.maxResend,
        otpExpiresAt: Date.now() + data.expiresIn * 1000,
        signupDevOtp: data.devOtp || null,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend OTP";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resetSignupOtpState: () => {
    set({
      isOtpStep: false,
      pendingSignupEmail: null,
      otpExpiresAt: null,
      resendCount: 0,
      maxResendAttempts: 3,
      signupDevOtp: null,
    });
  },

  logout: async () => {
    localStorage.removeItem("authUser");
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => {
    set({ error: null });
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!email) {
        throw new Error("Email is required");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      const data = await authApi<ForgotPasswordResponse>("forgot-password", { email });

      set({ isLoading: false });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reset OTP";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email: string, newPassword: string, otp?: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!email || !newPassword) {
        throw new Error("Email and new password are required");
      }

      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      await authApi<{ message: string }>("reset-password", {
        email,
        newPassword,
        otp,
      });

      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      set({ error: message, isLoading: false });
      throw error;
    }
  },
}));

// Initialize auth state from localStorage
// Initialize auth state from localStorage
export const initializeAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  const authUserJson = localStorage.getItem("authUser");
  if (authUserJson) {
    try {
      const authUser = JSON.parse(authUserJson);
      useAuthStore.setState({
        user: authUser,
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem("authUser");
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
      });
    }
  }
};
