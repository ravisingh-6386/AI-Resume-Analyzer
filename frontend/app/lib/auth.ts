import { create } from "zustand";
import { buildApiUrl, getApiBaseUrl } from "./api";

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

const API_BASE_URL = getApiBaseUrl();
const USE_LOCAL_AUTH = !API_BASE_URL;

interface LocalUser extends AuthUser {
  password: string;
}

interface LocalSignupSession {
  email: string;
  name: string;
  password: string;
  otp: string;
  expiresAt: number;
  resendCount: number;
  maxResend: number;
}

interface LocalResetSession {
  email: string;
  otp: string;
  expiresAt: number;
  resendCount: number;
  maxResend: number;
}

const LOCAL_USERS_KEY = "users";
const LOCAL_AUTH_USER_KEY = "authUser";
const LOCAL_SIGNUP_SESSION_KEY = "pendingSignupSession";
const LOCAL_RESET_SESSIONS_KEY = "passwordResetSessions";

const DEFAULT_LOCAL_USERS: LocalUser[] = [
  {
    id: "user_1",
    email: "adrian@jsmastery.pro",
    password: "password123",
    name: "Adrian Hajdin",
  },
  {
    id: "user_2",
    email: "test@example.com",
    password: "123456",
    name: "Test User",
  },
  {
    id: "user_3",
    email: "demo@example.com",
    password: "demo1234",
    name: "Demo User",
  },
];

class RemoteAuthUnavailableError extends Error {
  constructor() {
    super("Auth backend is unavailable");
    this.name = "RemoteAuthUnavailableError";
  }
}

const isRemoteAuthUnavailableError = (error: unknown): error is RemoteAuthUnavailableError =>
  error instanceof RemoteAuthUnavailableError;

const readJson = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizedEmail = (email: string) => email.trim().toLowerCase();

const makeAuthUser = (user: LocalUser): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `user_${crypto.randomUUID()}`;
  }

  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const readLocalUsers = (): LocalUser[] => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_USERS;
  }

  const storedUsers = readJson<unknown>(localStorage.getItem(LOCAL_USERS_KEY), null);

  if (!Array.isArray(storedUsers) || storedUsers.length === 0) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_LOCAL_USERS));
    return DEFAULT_LOCAL_USERS;
  }

  return storedUsers
    .map((user) => {
      if (!user || typeof user !== "object") {
        return null;
      }

      const candidate = user as Partial<LocalUser>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.email !== "string" ||
        typeof candidate.name !== "string" ||
        typeof candidate.password !== "string"
      ) {
        return null;
      }

      return {
        id: candidate.id,
        email: normalizedEmail(candidate.email),
        name: candidate.name,
        password: candidate.password,
      } satisfies LocalUser;
    })
    .filter((user): user is LocalUser => Boolean(user));
};

const writeLocalUsers = (users: LocalUser[]) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const readSignupSession = (): LocalSignupSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return readJson<LocalSignupSession | null>(localStorage.getItem(LOCAL_SIGNUP_SESSION_KEY), null);
};

const writeSignupSession = (session: LocalSignupSession | null) => {
  if (!session) {
    localStorage.removeItem(LOCAL_SIGNUP_SESSION_KEY);
    return;
  }

  localStorage.setItem(LOCAL_SIGNUP_SESSION_KEY, JSON.stringify(session));
};

const readResetSessions = (): Record<string, LocalResetSession> => {
  if (typeof window === "undefined") {
    return {};
  }

  return readJson<Record<string, LocalResetSession>>(localStorage.getItem(LOCAL_RESET_SESSIONS_KEY), {});
};

const writeResetSessions = (sessions: Record<string, LocalResetSession>) => {
  localStorage.setItem(LOCAL_RESET_SESSIONS_KEY, JSON.stringify(sessions));
};

const persistAuthUser = (user: AuthUser) => {
  localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
};

const clearAuthState = () => {
  localStorage.removeItem(LOCAL_AUTH_USER_KEY);
  localStorage.removeItem(LOCAL_SIGNUP_SESSION_KEY);
  localStorage.removeItem(LOCAL_RESET_SESSIONS_KEY);
};

const remoteAuthApi = async <T>(endpoint: string, payload: Record<string, unknown>) => {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(API_BASE_URL, endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new RemoteAuthUnavailableError();
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 404 || response.status === 502 || response.status === 503 || response.status === 504) {
    throw new RemoteAuthUnavailableError();
  }

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

      if (USE_LOCAL_AUTH) {
        const users = readLocalUsers();
        const user = users.find(
          (candidate) => candidate.email === normalizedEmail(email) && candidate.password === password
        );

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const authUser = makeAuthUser(user);
        persistAuthUser(authUser);
        set({
          user: authUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      const data = await remoteAuthApi<LoginResponse>("login", {
        email,
        password,
      });

      const authUser = data.user;
      persistAuthUser(authUser);
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

      if (USE_LOCAL_AUTH) {
        const emailValue = normalizedEmail(email);
        const users = readLocalUsers();

        if (users.some((candidate) => candidate.email === emailValue)) {
          throw new Error("An account with this email already exists");
        }

        const otp = makeOtp();
        const session: LocalSignupSession = {
          email: emailValue,
          name: name.trim(),
          password,
          otp,
          expiresAt: Date.now() + 5 * 60 * 1000,
          resendCount: 0,
          maxResend: 3,
        };

        writeSignupSession(session);
        set({
          pendingSignupEmail: emailValue,
          isOtpStep: true,
          resendCount: session.resendCount,
          maxResendAttempts: session.maxResend,
          otpExpiresAt: session.expiresAt,
          signupDevOtp: session.otp,
          isLoading: false,
        });
        return;
      }

      const data = await remoteAuthApi<SendOtpResponse>("send-otp", { email, password, name });
      set({
        pendingSignupEmail: email.trim().toLowerCase(),
        isOtpStep: true,
        resendCount: data.resendCount,
        maxResendAttempts: data.maxResend,
        otpExpiresAt: Date.now() + data.expiresIn * 1000,
        signupDevOtp: data.devOtp || null,
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
      if (USE_LOCAL_AUTH) {
        const session = readSignupSession();

        if (!session) {
          throw new Error("Signup session expired. Please start again.");
        }

        if (Date.now() > session.expiresAt) {
          writeSignupSession(null);
          throw new Error("Signup code expired. Please start again.");
        }

        if (otp.trim() !== session.otp) {
          throw new Error("Invalid OTP");
        }

        const users = readLocalUsers();
        const authUser = {
          id: makeId(),
          email: session.email,
          name: session.name,
        };

        writeLocalUsers([
          ...users.filter((candidate) => candidate.email !== session.email),
          {
            ...authUser,
            password: session.password,
          },
        ]);
        persistAuthUser(authUser);
        writeSignupSession(null);
        set({
          user: authUser,
          isAuthenticated: true,
          isLoading: false,
          isOtpStep: false,
          pendingSignupEmail: null,
          otpExpiresAt: null,
          resendCount: 0,
          signupDevOtp: null,
        });
        return;
      }

      const pendingEmail = useAuthStore.getState().pendingSignupEmail;

      if (!pendingEmail) {
        throw new Error("Signup session expired. Please start again.");
      }

      if (!/^\d{6}$/.test(otp.trim())) {
        throw new Error("Please enter a valid 6-digit OTP");
      }

      const data = await remoteAuthApi<VerifyOtpResponse>("verify-otp", {
        email: pendingEmail,
        otp: otp.trim(),
      });

      persistAuthUser(data.user);
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
      if (USE_LOCAL_AUTH) {
        const session = readSignupSession();

        if (!session) {
          throw new Error("Signup session expired. Please start again.");
        }

        if (session.resendCount >= session.maxResend) {
          throw new Error("You have reached the resend limit. Please start again.");
        }

        const nextSession: LocalSignupSession = {
          ...session,
          otp: makeOtp(),
          resendCount: session.resendCount + 1,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };

        writeSignupSession(nextSession);
        set({
          resendCount: nextSession.resendCount,
          maxResendAttempts: nextSession.maxResend,
          otpExpiresAt: nextSession.expiresAt,
          signupDevOtp: nextSession.otp,
          isLoading: false,
        });
        return;
      }

      const pendingEmail = useAuthStore.getState().pendingSignupEmail;

      if (!pendingEmail) {
        throw new Error("Signup session expired. Please start again.");
      }

      const data = await remoteAuthApi<SendOtpResponse>("send-otp", { email: pendingEmail });

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
    writeSignupSession(null);
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
    clearAuthState();
    set({
      user: null,
      isAuthenticated: false,
      isOtpStep: false,
      pendingSignupEmail: null,
      otpExpiresAt: null,
      resendCount: 0,
      signupDevOtp: null,
    });
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

      if (USE_LOCAL_AUTH) {
        const emailValue = normalizedEmail(email);
        const users = readLocalUsers();

        if (!users.some((candidate) => candidate.email === emailValue)) {
          throw new Error("No account found for this email");
        }

        const otp = makeOtp();
        const sessions = readResetSessions();
        sessions[emailValue] = {
          email: emailValue,
          otp,
          expiresAt: Date.now() + 5 * 60 * 1000,
          resendCount: 0,
          maxResend: 3,
        };
        writeResetSessions(sessions);

        const data: ForgotPasswordResponse = {
          message: "Password reset code generated",
          expiresIn: 5 * 60,
          resendCount: 0,
          maxResend: 3,
          devOtp: otp,
          deliveryMode: "development",
        };

        set({ isLoading: false });
        return data;
      }

      const data = await remoteAuthApi<ForgotPasswordResponse>("forgot-password", { email });

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

      if (!otp || !/^\d{6}$/.test(otp.trim())) {
        throw new Error("Please enter the 6-digit OTP sent to your email");
      }

      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (USE_LOCAL_AUTH) {
        const emailValue = normalizedEmail(email);
        const sessions = readResetSessions();
        const session = sessions[emailValue];

        if (!session) {
          throw new Error("No password reset request found. Please request a new code.");
        }

        if (Date.now() > session.expiresAt) {
          delete sessions[emailValue];
          writeResetSessions(sessions);
          throw new Error("Reset code expired. Please request a new code.");
        }

        if (session.otp !== otp.trim()) {
          throw new Error("Invalid OTP");
        }

        const users = readLocalUsers();
        const userIndex = users.findIndex((candidate) => candidate.email === emailValue);

        if (userIndex === -1) {
          throw new Error("No account found for this email");
        }

        users[userIndex] = {
          ...users[userIndex],
          password: newPassword,
        };
        writeLocalUsers(users);
        delete sessions[emailValue];
        writeResetSessions(sessions);
        set({ isLoading: false });
        return;
      }

      await remoteAuthApi<{ message: string }>("reset-password", {
        email,
        newPassword,
        otp: otp.trim(),
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

  if (USE_LOCAL_AUTH) {
    readLocalUsers();
  }

  const authUserJson = localStorage.getItem(LOCAL_AUTH_USER_KEY);
  if (authUserJson) {
    try {
      const authUser = JSON.parse(authUserJson);
      useAuthStore.setState({
        user: authUser,
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem(LOCAL_AUTH_USER_KEY);
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
      });
    }
  }
};
