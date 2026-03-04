import { create } from "zustand";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

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

      // Get stored users from localStorage (for demo)
      const usersJson = localStorage.getItem("users");
      const users = usersJson ? JSON.parse(usersJson) : [];

      // Check if user exists and password matches
      const user = users.find(
        (u: any) => u.email === email && u.password === password
      );

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Set authenticated user
      const authUser = { id: user.id, email: user.email, name: user.name };
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

      // Get stored users
      const usersJson = localStorage.getItem("users");
      const users = usersJson ? JSON.parse(usersJson) : [];

      // Check if user already exists
      if (users.some((u: any) => u.email === email)) {
        throw new Error("Email already registered");
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        password,
        name,
      };

      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));

      // Auto login after signup
      const authUser = { id: newUser.id, email: newUser.email, name: newUser.name };
      localStorage.setItem("authUser", JSON.stringify(authUser));
      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    localStorage.removeItem("authUser");
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Initialize auth state from localStorage
// Initialize auth state from localStorage
export const initializeAuth = () => {
  const authUserJson = localStorage.getItem("authUser");
  if (authUserJson) {
    const authUser = JSON.parse(authUserJson);
    useAuthStore.setState({
      user: authUser,
      isAuthenticated: true,
    });
  }
};
