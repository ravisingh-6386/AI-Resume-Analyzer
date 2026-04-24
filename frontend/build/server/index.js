import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts, useNavigate, Link, useSearchParams, useParams } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { create } from "zustand";
import { useState, useEffect, memo, useCallback, useRef, createContext, useContext } from "react";
import { useDropzone } from "react-dropzone";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const getPuter = () => typeof window !== "undefined" && window.puter ? window.puter : null;
const LOCAL_FS_INDEX_KEY = "localfs:index";
const LOCAL_FS_DATA_PREFIX = "localfs:data:";
const LOCAL_KV_PREFIX = "localkv:";
const getRandomId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(new Error("Failed to read blob"));
  reader.readAsDataURL(blob);
});
const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};
const getLocalFsIndex = () => {
  const raw = localStorage.getItem(LOCAL_FS_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};
const setLocalFsIndex = (items) => {
  localStorage.setItem(LOCAL_FS_INDEX_KEY, JSON.stringify(items));
};
const upsertLocalFsItem = (item) => {
  const items = getLocalFsIndex();
  const idx = items.findIndex((entry2) => entry2.path === item.path);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  setLocalFsIndex(items);
};
const createLocalFsItem = (path, name, size) => {
  const now = Date.now();
  const id = getRandomId();
  return {
    id,
    uid: "local",
    name,
    path,
    is_dir: false,
    parent_id: "local-root",
    parent_uid: "local",
    created: now,
    modified: now,
    accessed: now,
    size,
    writable: true
  };
};
const getLocalKvKeys = () => Object.keys(localStorage).filter((key) => key.startsWith(LOCAL_KV_PREFIX));
const buildFallbackFeedbackText = () => {
  const fallback = {
    overallScore: 72,
    ATS: {
      score: 74,
      tips: [
        { type: "good", tip: "Your resume has clear section separation." },
        { type: "improve", tip: "Use more exact keywords from the target job description." }
      ]
    },
    toneAndStyle: {
      score: 70,
      tips: [
        {
          type: "good",
          tip: "Bullet points are concise and easy to scan.",
          explanation: "Short bullet points improve recruiter readability."
        },
        {
          type: "improve",
          tip: "Start achievements with strong action verbs.",
          explanation: "Action-led statements create stronger impact."
        }
      ]
    },
    content: {
      score: 71,
      tips: [
        {
          type: "good",
          tip: "Experience entries are listed in clear order.",
          explanation: "Chronological structure is easy to evaluate."
        },
        {
          type: "improve",
          tip: "Add measurable outcomes to achievements.",
          explanation: "Metrics help demonstrate impact and scale."
        }
      ]
    },
    structure: {
      score: 73,
      tips: [
        {
          type: "good",
          tip: "Overall layout is clean and readable.",
          explanation: "Consistent spacing improves navigation."
        },
        {
          type: "improve",
          tip: "Keep formatting consistent across all section headers.",
          explanation: "Uniform typography improves professional polish."
        }
      ]
    },
    skills: {
      score: 69,
      tips: [
        {
          type: "good",
          tip: "Skills section is present and categorized.",
          explanation: "Categorization helps ATS and recruiters parse faster."
        },
        {
          type: "improve",
          tip: "Prioritize skills that directly match the role.",
          explanation: "Role-specific alignment improves shortlist probability."
        }
      ]
    }
  };
  return JSON.stringify(fallback);
};
const usePuterStore = create((set, get) => {
  const setError = (msg) => {
    set({
      error: msg,
      isLoading: false,
      auth: {
        user: null,
        isAuthenticated: false,
        signIn: get().auth.signIn,
        signOut: get().auth.signOut,
        refreshUser: get().auth.refreshUser,
        checkAuthStatus: get().auth.checkAuthStatus,
        getUser: get().auth.getUser
      }
    });
  };
  const checkAuthStatus = async () => {
    const puter = getPuter();
    if (!puter) {
      const authUserRaw = localStorage.getItem("authUser");
      if (authUserRaw) {
        try {
          const authUser = JSON.parse(authUserRaw);
          const localUser = {
            uuid: authUser.id || getRandomId(),
            username: authUser.name || authUser.email || "Local User"
          };
          set({
            auth: {
              user: localUser,
              isAuthenticated: true,
              signIn: get().auth.signIn,
              signOut: get().auth.signOut,
              refreshUser: get().auth.refreshUser,
              checkAuthStatus: get().auth.checkAuthStatus,
              getUser: () => localUser
            },
            isLoading: false,
            error: null
          });
          return true;
        } catch {
        }
      }
      set({
        auth: {
          user: null,
          isAuthenticated: false,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus: get().auth.checkAuthStatus,
          getUser: () => null
        },
        isLoading: false,
        error: null
      });
      return false;
    }
    set({ isLoading: true, error: null });
    try {
      const isSignedIn = await puter.auth.isSignedIn();
      if (isSignedIn) {
        const user = await puter.auth.getUser();
        set({
          auth: {
            user,
            isAuthenticated: true,
            signIn: get().auth.signIn,
            signOut: get().auth.signOut,
            refreshUser: get().auth.refreshUser,
            checkAuthStatus: get().auth.checkAuthStatus,
            getUser: () => user
          },
          isLoading: false
        });
        return true;
      } else {
        set({
          auth: {
            user: null,
            isAuthenticated: false,
            signIn: get().auth.signIn,
            signOut: get().auth.signOut,
            refreshUser: get().auth.refreshUser,
            checkAuthStatus: get().auth.checkAuthStatus,
            getUser: () => null
          },
          isLoading: false
        });
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to check auth status";
      setError(msg);
      return false;
    }
  };
  const signIn = async () => {
    const puter = getPuter();
    if (!puter) {
      await checkAuthStatus();
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await puter.auth.signIn();
      await checkAuthStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
    }
  };
  const signOut = async () => {
    const puter = getPuter();
    if (!puter) {
      set({
        auth: {
          user: null,
          isAuthenticated: false,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus: get().auth.checkAuthStatus,
          getUser: () => null
        },
        isLoading: false,
        error: null
      });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await puter.auth.signOut();
      set({
        auth: {
          user: null,
          isAuthenticated: false,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus: get().auth.checkAuthStatus,
          getUser: () => null
        },
        isLoading: false
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      setError(msg);
    }
  };
  const refreshUser = async () => {
    const puter = getPuter();
    if (!puter) {
      await checkAuthStatus();
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const user = await puter.auth.getUser();
      set({
        auth: {
          user,
          isAuthenticated: true,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus: get().auth.checkAuthStatus,
          getUser: () => user
        },
        isLoading: false
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh user";
      setError(msg);
    }
  };
  const init = () => {
    const puter = getPuter();
    if (puter) {
      set({ puterReady: true });
      checkAuthStatus();
    } else {
      set({ puterReady: false, error: null, isLoading: false });
      checkAuthStatus();
    }
  };
  const write = async (path, data) => {
    const puter = getPuter();
    if (!puter) {
      const blob = typeof data === "string" ? new Blob([data], { type: "text/plain" }) : data;
      const dataUrl = await blobToDataUrl(blob);
      const fileName = path.split("/").pop() || `file-${getRandomId()}`;
      localStorage.setItem(`${LOCAL_FS_DATA_PREFIX}${path}`, dataUrl);
      const item = createLocalFsItem(path, fileName, blob.size);
      upsertLocalFsItem(item);
      return void 0;
    }
    try {
      const result = await puter.fs.write(path, data);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to write file";
      throw new Error(message);
    }
  };
  const readDir = async (path) => {
    const puter = getPuter();
    if (!puter) {
      const items = getLocalFsIndex();
      if (!path || path === "./" || path === "/") return items;
      return items.filter((item) => item.path.startsWith(path));
    }
    try {
      const result = await puter.fs.readdir(path);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read directory";
      throw new Error(message);
    }
  };
  const readFile = async (path) => {
    const puter = getPuter();
    if (!puter) {
      const dataUrl = localStorage.getItem(`${LOCAL_FS_DATA_PREFIX}${path}`);
      if (!dataUrl) return void 0;
      return dataUrlToBlob(dataUrl);
    }
    try {
      const result = await puter.fs.read(path);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read file";
      throw new Error(message);
    }
  };
  const upload2 = async (files) => {
    const puter = getPuter();
    if (!puter) {
      const firstFile = files[0];
      if (!firstFile) return void 0;
      const id = getRandomId();
      const name = firstFile instanceof File ? firstFile.name : `blob-${id}`;
      const path = `/local/${id}-${name}`;
      const dataUrl = await blobToDataUrl(firstFile);
      localStorage.setItem(`${LOCAL_FS_DATA_PREFIX}${path}`, dataUrl);
      const item = createLocalFsItem(path, name, firstFile.size);
      upsertLocalFsItem(item);
      return item;
    }
    try {
      const result = await puter.fs.upload(files);
      if (!result) {
        throw new Error("File upload failed: No response from server");
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "File upload failed. Please check your connection and try again.";
      throw new Error(message);
    }
  };
  const deleteFile = async (path) => {
    const puter = getPuter();
    if (!puter) {
      localStorage.removeItem(`${LOCAL_FS_DATA_PREFIX}${path}`);
      const items = getLocalFsIndex().filter((item) => item.path !== path);
      setLocalFsIndex(items);
      return;
    }
    try {
      await puter.fs.delete(path);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete file";
      throw new Error(message);
    }
  };
  const chat = async (prompt, imageURL, testMode, options) => {
    const puter = getPuter();
    if (!puter) {
      const response = {
        index: 0,
        message: {
          role: "assistant",
          content: buildFallbackFeedbackText(),
          refusal: null,
          annotations: []
        },
        logprobs: null,
        finish_reason: "stop",
        usage: [],
        via_ai_chat_service: false
      };
      return response;
    }
    try {
      const result = await puter.ai.chat(prompt, imageURL, testMode, options);
      if (!result) {
        throw new Error("Chat service returned no response");
      }
      return result;
    } catch (error) {
      console.error("Chat service failed, using fallback response:", error);
      return {
        index: 0,
        message: {
          role: "assistant",
          content: buildFallbackFeedbackText(),
          refusal: null,
          annotations: []
        },
        logprobs: null,
        finish_reason: "stop",
        usage: [],
        via_ai_chat_service: false
      };
    }
  };
  const feedback = async (path, message) => {
    const puter = getPuter();
    if (!puter) {
      const response = {
        index: 0,
        message: {
          role: "assistant",
          content: buildFallbackFeedbackText(),
          refusal: null,
          annotations: []
        },
        logprobs: null,
        finish_reason: "stop",
        usage: [],
        via_ai_chat_service: false
      };
      return response;
    }
    try {
      const result = await puter.ai.chat(
        [
          {
            role: "user",
            content: [
              {
                type: "file",
                puter_path: path
              },
              {
                type: "text",
                text: message
              }
            ]
          }
        ],
        { model: "claude-3-7-sonnet" }
      );
      if (!result) {
        throw new Error("AI analysis failed: No response from AI service");
      }
      return result;
    } catch (error) {
      console.error("AI analysis failed, using fallback feedback:", error);
      return {
        index: 0,
        message: {
          role: "assistant",
          content: buildFallbackFeedbackText(),
          refusal: null,
          annotations: []
        },
        logprobs: null,
        finish_reason: "stop",
        usage: [],
        via_ai_chat_service: false
      };
    }
  };
  const img2txt = async (image, testMode) => {
    const puter = getPuter();
    if (!puter) {
      return "Local mode: OCR is unavailable without Puter service.";
    }
    try {
      const result = await puter.ai.img2txt(image, testMode);
      if (!result) {
        throw new Error("OCR service returned empty result");
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image text extraction failed";
      throw new Error(message);
    }
  };
  const getKV = async (key) => {
    const puter = getPuter();
    if (!puter) {
      return localStorage.getItem(`${LOCAL_KV_PREFIX}${key}`);
    }
    try {
      return await puter.kv.get(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read from storage";
      throw new Error(message);
    }
  };
  const setKV = async (key, value) => {
    const puter = getPuter();
    if (!puter) {
      localStorage.setItem(`${LOCAL_KV_PREFIX}${key}`, value);
      return true;
    }
    try {
      return await puter.kv.set(key, value);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save to storage";
      throw new Error(message);
    }
  };
  const deleteKV = async (key) => {
    const puter = getPuter();
    if (!puter) {
      localStorage.removeItem(`${LOCAL_KV_PREFIX}${key}`);
      return true;
    }
    try {
      return await puter.kv.delete(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete from storage";
      throw new Error(message);
    }
  };
  const listKV = async (pattern, returnValues) => {
    const puter = getPuter();
    if (!puter) {
      const localKeys = getLocalKvKeys().map((key) => key.replace(LOCAL_KV_PREFIX, ""));
      const matcher = pattern.endsWith("*") ? (key) => key.startsWith(pattern.slice(0, -1)) : (key) => key === pattern;
      const matchedKeys = localKeys.filter(matcher);
      if (returnValues) {
        return matchedKeys.map((key) => ({
          key,
          value: localStorage.getItem(`${LOCAL_KV_PREFIX}${key}`) || ""
        }));
      }
      return matchedKeys;
    }
    if (returnValues === void 0) {
      returnValues = false;
    }
    try {
      return await puter.kv.list(pattern, returnValues);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list storage keys";
      throw new Error(message);
    }
  };
  const flushKV = async () => {
    const puter = getPuter();
    if (!puter) {
      getLocalKvKeys().forEach((key) => localStorage.removeItem(key));
      return true;
    }
    try {
      return await puter.kv.flush();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to flush storage";
      throw new Error(message);
    }
  };
  return {
    isLoading: false,
    error: null,
    puterReady: false,
    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signOut,
      refreshUser,
      checkAuthStatus,
      getUser: () => get().auth.user
    },
    fs: {
      write: (path, data) => write(path, data),
      read: (path) => readFile(path),
      readDir: (path) => readDir(path),
      upload: (files) => upload2(files),
      delete: (path) => deleteFile(path)
    },
    ai: {
      chat: (prompt, imageURL, testMode, options) => chat(prompt, imageURL, testMode, options),
      feedback: (path, message) => feedback(path, message),
      img2txt: (image, testMode) => img2txt(image, testMode)
    },
    kv: {
      get: (key) => getKV(key),
      set: (key, value) => setKV(key, value),
      delete: (key) => deleteKV(key),
      list: (pattern, returnValues) => listKV(pattern, returnValues),
      flush: () => flushKV()
    },
    init,
    clearError: () => set({ error: null })
  };
});
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      const usersJson = localStorage.getItem("users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      const user = users.find(
        (u) => u.email === email && u.password === password
      );
      if (!user) {
        throw new Error("Invalid email or password");
      }
      const authUser = { id: user.id, email: user.email, name: user.name };
      localStorage.setItem("authUser", JSON.stringify(authUser));
      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      if (!email || !password || !name) {
        throw new Error("All fields are required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const usersJson = localStorage.getItem("users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      if (users.some((u) => u.email === email)) {
        throw new Error("Email already registered");
      }
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        password,
        name
      };
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      const authUser = { id: newUser.id, email: newUser.email, name: newUser.name };
      localStorage.setItem("authUser", JSON.stringify(authUser));
      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false
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
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      if (!email) {
        throw new Error("Email is required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      const usersJson = localStorage.getItem("users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      const user = users.find((u) => u.email === email);
      if (!user) {
        throw new Error("No account found with this email address");
      }
      const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const resetTokens = JSON.parse(localStorage.getItem("resetTokens") || "{}");
      resetTokens[email] = {
        token: resetToken,
        expiresAt: Date.now() + 10 * 60 * 1e3
      };
      localStorage.setItem("resetTokens", JSON.stringify(resetTokens));
      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reset link";
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  resetPassword: async (email, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      if (!email || !newPassword) {
        throw new Error("Email and password are required");
      }
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const usersJson = localStorage.getItem("users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      const userIndex = users.findIndex((u) => u.email === email);
      if (userIndex === -1) {
        throw new Error("User not found");
      }
      const resetTokens = JSON.parse(localStorage.getItem("resetTokens") || "{}");
      if (!resetTokens[email] || resetTokens[email].expiresAt < Date.now()) {
        throw new Error("Reset link has expired. Please try again.");
      }
      users[userIndex].password = newPassword;
      localStorage.setItem("users", JSON.stringify(users));
      delete resetTokens[email];
      localStorage.setItem("resetTokens", JSON.stringify(resetTokens));
      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      set({ error: message, isLoading: false });
      throw error;
    }
  }
}));
const initializeAuth = () => {
  if (typeof window === "undefined") {
    return;
  }
  const authUserJson = localStorage.getItem("authUser");
  if (authUserJson) {
    try {
      const authUser = JSON.parse(authUserJson);
      useAuthStore.setState({
        user: authUser,
        isAuthenticated: true
      });
    } catch {
      localStorage.removeItem("authUser");
      useAuthStore.setState({
        user: null,
        isAuthenticated: false
      });
    }
  }
};
const setupTestAccounts = () => {
  const testUsers = [
    {
      id: "user_1",
      email: "adrian@jsmastery.pro",
      password: "password123",
      name: "Adrian Hajdin"
    },
    {
      id: "user_2",
      email: "test@example.com",
      password: "123456",
      name: "Test User"
    },
    {
      id: "user_3",
      email: "demo@example.com",
      password: "demo1234",
      name: "Demo User"
    }
  ];
  localStorage.setItem("users", JSON.stringify(testUsers));
  console.log("Test accounts setup completed.");
  console.log("\nAvailable test accounts:");
  testUsers.forEach((user, index) => {
    console.log(`
${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
  });
};
const clearAuthData = () => {
  localStorage.removeItem("users");
  localStorage.removeItem("authUser");
  console.log("All auth data cleared.");
  window.location.reload();
};
const viewCurrentUser = () => {
  const user = localStorage.getItem("authUser");
  if (user) {
    console.log("Currently logged in as:");
    console.log(JSON.parse(user));
  } else {
    console.log("No user logged in");
  }
};
const viewAllUsers = () => {
  const users = localStorage.getItem("users");
  if (users) {
    console.log("Registered users:");
    console.log(JSON.parse(users));
  } else {
    console.log("No registered users found");
  }
};
if (typeof window !== "undefined") {
  window.setupTestAccounts = setupTestAccounts;
  window.clearAuthData = clearAuthData;
  window.viewCurrentUser = viewCurrentUser;
  window.viewAllUsers = viewAllUsers;
}
const links = () => [{
  rel: "preconnect",
  href: "https://fonts.googleapis.com"
}, {
  rel: "preconnect",
  href: "https://fonts.gstatic.com",
  crossOrigin: "anonymous"
}, {
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
}];
function Layout({
  children
}) {
  const init = usePuterStore((s) => s.init);
  const [theme, setTheme] = useState("light");
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    initializeAuth();
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      init();
    };
    script.onerror = () => {
      usePuterStore.setState({
        error: "Puter.js failed to load"
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [init]);
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setTheme(initialTheme);
    setThemeReady(true);
  }, []);
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {}), /* @__PURE__ */ jsx("style", {
        children: `html,body{font-family:"Mona Sans",ui-sans-serif,system-ui,sans-serif;}`
      })]
    }), /* @__PURE__ */ jsxs("body", {
      children: [themeReady && /* @__PURE__ */ jsxs("button", {
        type: "button",
        onClick: toggleTheme,
        className: "theme-toggle",
        "aria-label": `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        title: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        children: [/* @__PURE__ */ jsx("span", {
          className: "text-lg",
          "aria-hidden": "true",
          children: theme === "dark" ? "Sun" : "Moon"
        }), /* @__PURE__ */ jsx("span", {
          className: "text-xs font-semibold uppercase tracking-wide",
          children: theme === "dark" ? "Light" : "Dark"
        })]
      }), children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack;
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  }
  return /* @__PURE__ */ jsxs("main", {
    className: "pt-16 p-4 container mx-auto",
    children: [/* @__PURE__ */ jsx("h1", {
      children: message
    }), /* @__PURE__ */ jsx("p", {
      children: details
    }), stack]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root,
  links
}, Symbol.toStringTag, { value: "Module" }));
const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };
  return /* @__PURE__ */ jsxs("nav", { className: "navbar", children: [
    /* @__PURE__ */ jsx(Link, { to: "/", children: /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-gradient", children: "RESUMIND" }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/upload", className: "primary-button w-fit", children: "Upload Resume" }),
      user && /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowMenu(!showMenu),
            className: "w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg transition-shadow",
            children: user.name.charAt(0).toUpperCase()
          }
        ),
        showMenu && /* @__PURE__ */ jsxs("div", { className: "absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50", children: [
          /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-gray-200", children: [
            /* @__PURE__ */ jsx("p", { className: "font-semibold text-gray-800", children: user.name }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: user.email })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleLogout,
              className: "w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors",
              children: "Log Out"
            }
          )
        ] })
      ] })
    ] })
  ] });
};
const ScoreCircle = ({ score = 75 }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = score / 100;
  const strokeDashoffset = circumference * (1 - progress);
  return /* @__PURE__ */ jsxs("div", { className: "relative w-[100px] h-[100px]", children: [
    /* @__PURE__ */ jsxs(
      "svg",
      {
        height: "100%",
        width: "100%",
        viewBox: "0 0 100 100",
        className: "transform -rotate-90",
        children: [
          /* @__PURE__ */ jsx(
            "circle",
            {
              cx: "50",
              cy: "50",
              r: normalizedRadius,
              stroke: "#e5e7eb",
              strokeWidth: stroke,
              fill: "transparent"
            }
          ),
          /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "grad", x1: "1", y1: "0", x2: "0", y2: "1", children: [
            /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#FF97AD" }),
            /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#5171FF" })
          ] }) }),
          /* @__PURE__ */ jsx(
            "circle",
            {
              cx: "50",
              cy: "50",
              r: normalizedRadius,
              stroke: "url(#grad)",
              strokeWidth: stroke,
              fill: "transparent",
              strokeDasharray: circumference,
              strokeDashoffset,
              strokeLinecap: "round"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "font-semibold text-sm", children: `${score}/100` }) })
  ] });
};
const ResumeCard = memo(({ resume: { id, companyName, jobTitle, feedback, imagePath } }) => {
  const { fs } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState("");
  useEffect(() => {
    const loadResume = async () => {
      const blob = await fs.read(imagePath);
      if (!blob) return;
      let url = URL.createObjectURL(blob);
      setResumeUrl(url);
    };
    loadResume();
  }, [imagePath]);
  return /* @__PURE__ */ jsxs(Link, { to: `/resume/${id}`, className: "resume-card animate-in fade-in duration-1000", children: [
    /* @__PURE__ */ jsxs("div", { className: "resume-card-header", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
        companyName && /* @__PURE__ */ jsx("h2", { className: "!text-black font-bold break-words", children: companyName }),
        jobTitle && /* @__PURE__ */ jsx("h3", { className: "text-lg break-words text-gray-500", children: jobTitle }),
        !companyName && !jobTitle && /* @__PURE__ */ jsx("h2", { className: "!text-black font-bold", children: "Resume" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-shrink-0", children: feedback && feedback.overallScore !== void 0 ? /* @__PURE__ */ jsx(ScoreCircle, { score: feedback.overallScore }) : /* @__PURE__ */ jsx("div", { className: "w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "--" }) }) })
    ] }),
    resumeUrl && /* @__PURE__ */ jsx("div", { className: "gradient-border animate-in fade-in duration-1000", children: /* @__PURE__ */ jsx("div", { className: "w-full h-full", children: /* @__PURE__ */ jsx(
      "img",
      {
        src: resumeUrl,
        alt: "resume",
        className: "w-full h-[350px] max-sm:h-[200px] object-cover object-top"
      }
    ) }) })
  ] });
});
ResumeCard.displayName = "ResumeCard";
function meta$2({}) {
  return [{
    title: "Resumind"
  }, {
    name: "description",
    content: "Smart feedback for your dream job!"
  }];
}
const home = UNSAFE_withComponentProps(function Home() {
  const {
    kv
  } = usePuterStore();
  const {
    isAuthenticated
  } = useAuthStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) navigate("/auth?next=/");
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);
      const resumes2 = await kv.list("resume:*", true);
      const parsedResumes = resumes2 == null ? void 0 : resumes2.map((resume2) => JSON.parse(resume2.value));
      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    };
    loadResumes();
  }, []);
  return /* @__PURE__ */ jsxs("main", {
    className: "app-shell bg-cover",
    children: [/* @__PURE__ */ jsx(Navbar, {}), /* @__PURE__ */ jsxs("section", {
      className: "main-section",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "page-heading py-16",
        children: [/* @__PURE__ */ jsx("h1", {
          children: "Track Your Applications & Resume Ratings"
        }), !loadingResumes && (resumes == null ? void 0 : resumes.length) === 0 ? /* @__PURE__ */ jsx("h2", {
          children: "No resumes found. Upload your first resume to get feedback."
        }) : /* @__PURE__ */ jsx("h2", {
          children: "Review your submissions and check AI-powered feedback."
        })]
      }), loadingResumes && /* @__PURE__ */ jsx("div", {
        className: "flex flex-col items-center justify-center",
        children: /* @__PURE__ */ jsx("img", {
          src: "/images/resume-scan-2.gif",
          className: "w-[200px]"
        })
      }), !loadingResumes && resumes.length > 0 && /* @__PURE__ */ jsx("div", {
        className: "resumes-section",
        children: resumes.map((resume2) => /* @__PURE__ */ jsx(ResumeCard, {
          resume: resume2
        }, resume2.id))
      }), !loadingResumes && (resumes == null ? void 0 : resumes.length) === 0 && /* @__PURE__ */ jsx("div", {
        className: "flex flex-col items-center justify-center mt-10 gap-4",
        children: /* @__PURE__ */ jsx(Link, {
          to: "/upload",
          className: "primary-button w-fit text-xl font-semibold",
          children: "Upload Resume"
        })
      })]
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
function LoginForm() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("adrian@jsmastery.pro");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    clearError();
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-6 w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "text-sm font-medium text-gray-700", children: "Email" }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "email",
            type: "email",
            placeholder: "Enter your email",
            value: email,
            onChange: (e) => {
              setEmail(e.target.value);
              setValidationError("");
            },
            disabled: isLoading,
            className: "w-full pl-4 pr-20 py-8 text-lg rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-base", children: "R" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "text-sm font-medium text-gray-700", children: "Password" }),
        /* @__PURE__ */ jsx(
          Link,
          {
            to: "/auth?mode=forgot-password",
            className: "text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors",
            children: "Forgot?"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "password",
          type: "password",
          placeholder: "Enter your password",
          value: password,
          onChange: (e) => {
            setPassword(e.target.value);
            setValidationError("");
          },
          disabled: isLoading,
          className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    (error || validationError) && /* @__PURE__ */ jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm", children: error || validationError }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading,
        className: "w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
          "Signing in..."
        ] }) : "Log In"
      }
    ),
    /* @__PURE__ */ jsxs("p", { className: "text-center text-gray-600 text-sm", children: [
      "Don't have an account?",
      " ",
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/auth?mode=signup",
          className: "text-indigo-600 hover:text-indigo-700 font-semibold transition-colors",
          children: "Sign up"
        }
      )
    ] })
  ] });
}
function SignupForm() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      await signup(email, password, name);
      navigate("/");
    } catch (err) {
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-5 w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "name", className: "text-sm font-medium text-gray-700", children: "Full Name" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "name",
          type: "text",
          placeholder: "Enter your full name",
          value: name,
          onChange: (e) => setName(e.target.value),
          disabled: isLoading,
          className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "text-sm font-medium text-gray-700", children: "Email" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "email",
          type: "email",
          placeholder: "Enter your email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          disabled: isLoading,
          className: "w-full px-24 py-6 text-lg rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "text-sm font-medium text-gray-700", children: "Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "password",
          type: "password",
          placeholder: "Create a password (min. 6 characters)",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          disabled: isLoading,
          className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "confirmPassword", className: "text-sm font-medium text-gray-700", children: "Confirm Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "confirmPassword",
          type: "password",
          placeholder: "Confirm your password",
          value: confirmPassword,
          onChange: (e) => setConfirmPassword(e.target.value),
          disabled: isLoading,
          className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm", children: error }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading,
        className: "w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
          "Creating account..."
        ] }) : "Create Account"
      }
    ),
    /* @__PURE__ */ jsxs("p", { className: "text-center text-gray-600 text-sm", children: [
      "Already have an account?",
      " ",
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/auth",
          className: "text-indigo-600 hover:text-indigo-700 font-semibold transition-colors",
          children: "Log in"
        }
      )
    ] })
  ] });
}
function ForgotPasswordForm() {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    clearError();
    if (!email) {
      setValidationError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address");
      return;
    }
    try {
      await forgotPassword(email);
      setStep("reset");
    } catch (_error) {
    }
  };
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    clearError();
    if (!newPassword || !confirmPassword) {
      setValidationError("Both password fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }
    try {
      await resetPassword(email, newPassword);
      navigate("/auth?mode=login");
    } catch (_error) {
    }
  };
  if (step === "email") {
    return /* @__PURE__ */ jsxs("form", { onSubmit: handleEmailSubmit, className: "flex flex-col gap-6 w-full", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "text-sm font-medium text-gray-700", children: "Email Address" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "email",
            type: "email",
            placeholder: "Enter your email address",
            value: email,
            onChange: (e) => {
              setEmail(e.target.value);
              setValidationError("");
            },
            disabled: isLoading,
            className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
          }
        )
      ] }),
      (error || validationError) && /* @__PURE__ */ jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm", children: error || validationError }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2",
          children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
            "Sending..."
          ] }) : "Send Reset Link"
        }
      ),
      /* @__PURE__ */ jsxs("p", { className: "text-center text-gray-600 text-sm", children: [
        "Remember your password?",
        " ",
        /* @__PURE__ */ jsx(
          Link,
          {
            to: "/auth?mode=login",
            className: "text-indigo-600 hover:text-indigo-700 font-semibold transition-colors",
            children: "Log In"
          }
        )
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleResetSubmit, className: "flex flex-col gap-6 w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm", children: [
      "Reset link sent to ",
      email,
      ". Enter your new password below."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "newPassword", className: "text-sm font-medium text-gray-700", children: "New Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "newPassword",
          type: "password",
          placeholder: "Enter your new password",
          value: newPassword,
          onChange: (e) => {
            setNewPassword(e.target.value);
            setValidationError("");
          },
          disabled: isLoading,
          className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "confirmPassword", className: "text-sm font-medium text-gray-700", children: "Confirm Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "confirmPassword",
          type: "password",
          placeholder: "Confirm your new password",
          value: confirmPassword,
          onChange: (e) => {
            setConfirmPassword(e.target.value);
            setValidationError("");
          },
          disabled: isLoading,
          className: "w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        }
      )
    ] }),
    (error || validationError) && /* @__PURE__ */ jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm", children: error || validationError }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading,
        className: "w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
          "Resetting..."
        ] }) : "Reset Password"
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "text-center text-gray-600 text-sm", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: "/auth?mode=login",
        className: "text-indigo-600 hover:text-indigo-700 font-semibold transition-colors",
        children: "Back to Log In"
      }
    ) })
  ] });
}
const meta$1 = () => [{
  title: "Resumind | Auth"
}, {
  name: "description",
  content: "Log into your account"
}];
const Auth = () => {
  const {
    isAuthenticated
  } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "login";
  const next = searchParams.get("next") || "/";
  useEffect(() => {
    initializeAuth();
  }, []);
  useEffect(() => {
    if (isAuthenticated) {
      navigate(next);
    }
  }, [isAuthenticated, navigate, next]);
  return /* @__PURE__ */ jsx("main", {
    className: "auth-shell min-h-screen flex items-center justify-center px-4 py-8",
    children: /* @__PURE__ */ jsx("div", {
      className: "w-full max-w-2xl",
      children: /* @__PURE__ */ jsxs("div", {
        className: "relative",
        children: [/* @__PURE__ */ jsx("div", {
          className: "auth-glow absolute inset-0 rounded-3xl opacity-20 blur-xl"
        }), /* @__PURE__ */ jsxs("section", {
          className: "auth-card relative rounded-3xl p-8 shadow-2xl",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "flex flex-col items-center gap-3 mb-8 text-center",
            children: [/* @__PURE__ */ jsxs("h1", {
              className: "text-3xl font-bold",
              children: ["Welcome ", /* @__PURE__ */ jsx("span", {
                className: "text-indigo-600",
                children: "Back"
              })]
            }), /* @__PURE__ */ jsx("h2", {
              className: "auth-subtitle text-sm",
              children: mode === "signup" ? "Create Your Account" : mode === "forgot-password" ? "Reset Your Password" : "Log In to Continue Your Job Journey"
            })]
          }), mode === "signup" ? /* @__PURE__ */ jsx(SignupForm, {}) : mode === "forgot-password" ? /* @__PURE__ */ jsx(ForgotPasswordForm, {}) : /* @__PURE__ */ jsx(LoginForm, {})]
        })]
      })
    })
  });
};
const auth = UNSAFE_withComponentProps(Auth);
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: auth,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function formatSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
const generateUUID = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const parseFeedback = (feedbackData) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  try {
    let data = feedbackData;
    if (typeof feedbackData === "string") {
      let jsonStr = feedbackData.trim();
      jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      try {
        data = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse JSON from string:", jsonStr.substring(0, 200));
        throw parseError;
      }
    }
    const normalizedFeedback = {
      overallScore: data.overallScore ?? data.overall_score ?? data.score ?? 75,
      ATS: {
        score: ((_a = data.ATS) == null ? void 0 : _a.score) ?? ((_b = data.ats) == null ? void 0 : _b.score) ?? 75,
        tips: (((_c = data.ATS) == null ? void 0 : _c.tips) ?? ((_d = data.ats) == null ? void 0 : _d.tips) ?? []).map((tip) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || ""
        }))
      },
      toneAndStyle: {
        score: ((_e = data.toneAndStyle) == null ? void 0 : _e.score) ?? ((_f = data.tone_and_style) == null ? void 0 : _f.score) ?? 75,
        tips: (((_g = data.toneAndStyle) == null ? void 0 : _g.tips) ?? ((_h = data.tone_and_style) == null ? void 0 : _h.tips) ?? []).map((tip) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || ""
        }))
      },
      content: {
        score: ((_i = data.content) == null ? void 0 : _i.score) ?? 75,
        tips: (((_j = data.content) == null ? void 0 : _j.tips) ?? []).map((tip) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || ""
        }))
      },
      structure: {
        score: ((_k = data.structure) == null ? void 0 : _k.score) ?? 75,
        tips: (((_l = data.structure) == null ? void 0 : _l.tips) ?? []).map((tip) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || ""
        }))
      },
      skills: {
        score: ((_m = data.skills) == null ? void 0 : _m.score) ?? 75,
        tips: (((_n = data.skills) == null ? void 0 : _n.tips) ?? []).map((tip) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || ""
        }))
      }
    };
    return normalizedFeedback;
  } catch (error) {
    console.error("Error parsing feedback:", error);
    return getDefaultFeedback();
  }
};
const getDefaultFeedback = () => ({
  overallScore: 0,
  ATS: {
    score: 0,
    tips: []
  },
  toneAndStyle: {
    score: 0,
    tips: []
  },
  content: {
    score: 0,
    tips: []
  },
  structure: {
    score: 0,
    tips: []
  },
  skills: {
    score: 0,
    tips: []
  }
});
const ROLE_KEYWORD_PACKS = {
  frontend: [
    "react",
    "typescript",
    "javascript",
    "html",
    "css",
    "tailwind",
    "redux",
    "next.js",
    "accessibility",
    "responsive"
  ],
  backend: [
    "node.js",
    "express",
    "api",
    "rest",
    "sql",
    "postgresql",
    "mongodb",
    "authentication",
    "caching",
    "microservices"
  ],
  data: [
    "python",
    "pandas",
    "numpy",
    "sql",
    "etl",
    "visualization",
    "machine learning",
    "statistics",
    "power bi",
    "tableau"
  ],
  default: [
    "communication",
    "problem solving",
    "teamwork",
    "leadership",
    "ownership",
    "collaboration",
    "analysis",
    "documentation"
  ]
};
const normalizeText = (value) => value.toLowerCase().replace(/[^a-z0-9.+#\s-]/g, " ");
const detectRolePack = (jobTitle) => {
  const title = normalizeText(jobTitle);
  if (/frontend|front end|ui|react/.test(title)) return "frontend";
  if (/backend|back end|api|server|node/.test(title)) return "backend";
  if (/data|analyst|ml|ai|scientist/.test(title)) return "data";
  return "default";
};
const getRoleKeywordAnalysis = (jobTitle, jobDescription, feedback) => {
  const rolePack = detectRolePack(jobTitle);
  const keywords = ROLE_KEYWORD_PACKS[rolePack] ?? ROLE_KEYWORD_PACKS.default;
  const corpus = normalizeText(
    `${jobTitle} ${jobDescription} ${feedback.skills.tips.map((t) => t.tip).join(" ")}`
  );
  const matchedKeywords = keywords.filter((keyword) => corpus.includes(normalizeText(keyword)));
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));
  const coverage = Math.round(matchedKeywords.length / keywords.length * 100);
  return { rolePack, matchedKeywords, missingKeywords, coverage };
};
const rewriteFeedbackForStudents = (feedback) => {
  const weakAreas = [
    { key: "ATS", score: feedback.ATS.score },
    { key: "Tone & Style", score: feedback.toneAndStyle.score },
    { key: "Content", score: feedback.content.score },
    { key: "Structure", score: feedback.structure.score },
    { key: "Skills", score: feedback.skills.score }
  ].sort((a, b) => a.score - b.score).slice(0, 2).map((a) => a.key);
  const actionChecklist = [
    ...feedback.ATS.tips.filter((t) => t.type === "improve").slice(0, 2).map((t) => `Update ATS keywords: ${t.tip}`),
    ...feedback.content.tips.filter((t) => t.type === "improve").slice(0, 2).map((t) => `Improve impact statements: ${t.tip}`),
    ...feedback.structure.tips.filter((t) => t.type === "improve").slice(0, 1).map((t) => `Fix resume structure: ${t.tip}`)
  ].slice(0, 5);
  return {
    rewrittenSummary: `Your resume is at ${feedback.overallScore}/100. You are close, and the fastest gains are in ${weakAreas.join(" and ")}. Focus on clearer impact bullets, stronger role keywords, and cleaner structure to boost interview chances.`,
    actionChecklist: actionChecklist.length ? actionChecklist : [
      "Add measurable outcomes to project bullets",
      "Match your skills section to the role keywords"
    ]
  };
};
const extractTitleWords = (jobTitle) => normalizeText(jobTitle).split(/\s+/).filter((word) => word.length > 2).slice(0, 3);
const generateProjectBullets = (jobTitle, roleAnalysis) => {
  const titleWords = extractTitleWords(jobTitle);
  const topKeywords = roleAnalysis.matchedKeywords.slice(0, 2).concat(roleAnalysis.missingKeywords.slice(0, 1));
  const focus = [...titleWords, ...topKeywords].filter(Boolean).slice(0, 3).join(", ");
  return [
    `Built an end-to-end project aligned to ${jobTitle}, delivering a production-ready feature set focused on ${focus}.`,
    "Improved performance and reliability by instrumenting metrics, reducing response time by 35% and cutting key errors by 20%.",
    "Collaborated with peers to test, iterate, and ship improvements using Git workflows, documented decisions, and actionable release notes."
  ];
};
const generateActionableRewrites = (feedback) => {
  const rewrites = [];
  feedback.ATS.tips.filter((t) => t.type === "improve").slice(0, 2).forEach((tip) => {
    rewrites.push({
      section: "ATS",
      issue: tip.tip,
      example: "Managed project timeline",
      rewrite: "Led cross-functional project delivery on schedule, improving team velocity by 20%",
      impact: "+8-12% ATS keyword match"
    });
  });
  feedback.content.tips.filter((t) => t.type === "improve").slice(0, 2).forEach((tip) => {
    rewrites.push({
      section: "Content",
      issue: tip.tip,
      example: "Built a new feature",
      rewrite: "Architected and shipped a real-time dashboard feature, increasing user engagement by 35%",
      impact: "+10-15% content impact score"
    });
  });
  feedback.toneAndStyle.tips.filter((t) => t.type === "improve").slice(0, 1).forEach((tip) => {
    rewrites.push({
      section: "Tone",
      issue: tip.tip,
      example: "Responsible for testing",
      rewrite: "Owned QA strategy and execution, reducing production bugs by 40%",
      impact: "+5-8% tone and professionalism score"
    });
  });
  feedback.skills.tips.filter((t) => t.type === "improve").slice(0, 1).forEach((tip) => {
    rewrites.push({
      section: "Skills",
      issue: tip.tip,
      example: "Tried learning React",
      rewrite: "Built 3+ React projects with TypeScript, REST APIs, and Git-based CI/CD",
      impact: "+12% skills credibility"
    });
  });
  return rewrites.slice(0, 5);
};
const getProgressState = (jobState) => {
  const states = {
    queued: { icon: "Q", label: "Queued", color: "text-gray-600", bg: "bg-gray-50" },
    processing: { icon: "...", label: "Processing", color: "text-blue-600", bg: "bg-blue-50" },
    done: { icon: "OK", label: "Complete", color: "text-green-600", bg: "bg-green-50" },
    failed: { icon: "X", label: "Failed", color: "text-red-600", bg: "bg-red-50" }
  };
  return states[jobState] || states.queued;
};
const FileUploader = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const maxFileSize = 20 * 1024 * 1024;
  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0] || null;
      setSelectedFile(file);
      onFileSelect == null ? void 0 : onFileSelect(file);
    },
    [onFileSelect]
  );
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: maxFileSize
  });
  const handleRemove = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFile(null);
    setInputKey((currentKey) => currentKey + 1);
    onFileSelect == null ? void 0 : onFileSelect(null);
  };
  return /* @__PURE__ */ jsx("div", { className: "w-full gradient-border", children: /* @__PURE__ */ jsxs("div", { ...getRootProps(), children: [
    /* @__PURE__ */ jsx("input", { ...getInputProps() }, inputKey),
    /* @__PURE__ */ jsx("div", { className: "space-y-4 cursor-pointer", children: selectedFile ? /* @__PURE__ */ jsxs("div", { className: "uploader-selected-file", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsx("img", { src: "/images/pdf.png", alt: "pdf", className: "size-10" }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center space-x-3", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-700 truncate max-w-xs", children: selectedFile.name }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: formatSize(selectedFile.size) })
      ] }) }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "p-2 cursor-pointer", onClick: handleRemove, children: /* @__PURE__ */ jsx("img", { src: "/icons/cross.svg", alt: "remove", className: "w-4 h-4" }) })
    ] }) : /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto w-16 h-16 flex items-center justify-center mb-2", children: /* @__PURE__ */ jsx("img", { src: "/icons/info.svg", alt: "upload", className: "size-20" }) }),
      /* @__PURE__ */ jsxs("p", { className: "text-lg text-gray-500", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Click to upload" }),
        " or drag and drop"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-lg text-gray-500", children: [
        "PDF (max ",
        formatSize(maxFileSize),
        ")"
      ] })
    ] }) })
  ] }) });
};
let pdfjsLib = null;
let loadPromise = null;
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;
  loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsLib = lib;
    return lib;
  });
  return loadPromise;
}
async function convertPdfToImage(file) {
  try {
    const lib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    }
    await page.render({ canvasContext: context, viewport }).promise;
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.png`, {
              type: "image/png"
            });
            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile
            });
          } else {
            resolve({
              imageUrl: "",
              file: null,
              error: "Failed to create image blob"
            });
          }
        },
        "image/png",
        1
      );
    });
  } catch (err) {
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${err}`
    };
  }
}
const AIResponseFormat = `{
  overallScore: number,
  ATS: {score: number(0-100), tips: [{type: "good"|"improve", tip: string}]},
  toneAndStyle: {score: number(0-100), tips: [{type: "good"|"improve", tip: string, explanation: string}]},
  content: {score: number(0-100), tips: [{type: "good"|"improve", tip: string, explanation: string}]},
  structure: {score: number(0-100), tips: [{type: "good"|"improve", tip: string, explanation: string}]},
  skills: {score: number(0-100), tips: [{type: "good"|"improve", tip: string, explanation: string}]}
}`;
const prepareInstructions = ({ jobTitle, jobDescription }) => {
  const maxLength = 2500;
  const truncatedDesc = jobDescription.length > maxLength ? jobDescription.substring(0, maxLength) + "..." : jobDescription;
  return `You are an expert resume reviewer. Analyze this resume for the ${jobTitle} position.

Job Title: ${jobTitle}
Job Description: ${truncatedDesc}

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object
2. NO markdown formatting (no \`\`\`json tags)
3. NO explanatory text before or after the JSON
4. Just the raw JSON object, nothing else

JSON Format Required:
${AIResponseFormat}

Scoring Guidelines:
- Use realistic scores between 60-95
- Provide 2-4 specific, actionable tips per category
- Include both "good" (strengths) and "improve" (areas to enhance) tips
- Focus on ATS compatibility and job relevance
- Keep each tip concise (max 100 characters)

Start your response with { and end with }`;
};
const Upload = () => {
  const {
    fs,
    ai,
    kv
  } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState(null);
  const handleFileSelect = (file2) => {
    setFile(file2);
  };
  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file: file2
  }) => {
    var _a;
    setIsProcessing(true);
    try {
      console.log("Starting analysis. file:", file2, "fs object:", fs, "puter:", window.puter);
      setStatusText("Uploading the file...");
      const uploadedFile = await Promise.race([fs.upload([file2]), new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 3e4))]);
      if (!uploadedFile || !uploadedFile.path) {
        console.error("fs.upload returned:", uploadedFile);
        throw new Error("Failed to upload file. Please check your connection and try again.");
      }
      setStatusText("Converting to image...");
      const imageFile = await convertPdfToImage(file2);
      if (!imageFile.file) throw new Error(imageFile.error || "Failed to convert PDF to image");
      setStatusText("Uploading the image...");
      const uploadedImage = await Promise.race([fs.upload([imageFile.file]), new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 3e4))]);
      if (!uploadedImage || !uploadedImage.path) throw new Error("Failed to upload image. Please try again.");
      setStatusText("Preparing data...");
      const uuid2 = generateUUID();
      const createdAt = Date.now();
      const data = {
        id: uuid2,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: null,
        jobState: "queued",
        retryCount: 0,
        createdAt
      };
      await kv.set(`resume:${uuid2}`, JSON.stringify(data));
      setStatusText("Analyzing resume with AI (this may take 2-3 minutes)...");
      data.jobState = "processing";
      await kv.set(`resume:${uuid2}`, JSON.stringify(data));
      console.log("Starting AI feedback analysis...");
      console.log("Job Title:", jobTitle);
      console.log("Job Description length:", jobDescription.length);
      const feedbackTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Analysis timeout: exceeded 180 seconds (3 minutes). The AI service may be overloaded. Please try again in a moment or use a shorter job description.")), 18e4));
      const feedback = await Promise.race([ai.feedback(uploadedFile.path, prepareInstructions({
        jobTitle,
        jobDescription
      })), feedbackTimeout]);
      console.log("Raw AI response:", feedback);
      if (!feedback) {
        throw new Error("No response from AI analysis. Please try again.");
      }
      if (!feedback.message) {
        console.error("Invalid feedback structure:", feedback);
        throw new Error("Invalid AI response format. Please try again.");
      }
      const feedbackText = typeof feedback.message.content === "string" ? feedback.message.content : Array.isArray(feedback.message.content) ? (_a = feedback.message.content[0]) == null ? void 0 : _a.text : "";
      console.log("Extracted feedback text:", feedbackText);
      if (!feedbackText) {
        console.error("No text content in feedback:", feedback);
        throw new Error("AI returned empty response. Please try again.");
      }
      console.log("Parsing feedback text...");
      const parsedFeedback = parseFeedback(feedbackText);
      console.log("Parsed feedback:", parsedFeedback);
      const usedFallbackAnalysis = (feedback == null ? void 0 : feedback.via_ai_chat_service) === false;
      if (!parsedFeedback || parsedFeedback.overallScore === 0) {
        console.error("Parsed feedback is invalid or empty:", parsedFeedback);
        throw new Error("Failed to parse AI feedback properly. The AI may have returned invalid data.");
      }
      const hasTips = parsedFeedback.ATS.tips.length > 0 || parsedFeedback.content.tips.length > 0 || parsedFeedback.skills.tips.length > 0;
      if (!hasTips && parsedFeedback.overallScore < 10) {
        console.error("Feedback has no tips and invalid score:", parsedFeedback);
        throw new Error("AI returned incomplete feedback. Please try again.");
      }
      data.feedback = parsedFeedback;
      const roleKeywordAnalysis = getRoleKeywordAnalysis(jobTitle, jobDescription, parsedFeedback);
      const studentFeedback = rewriteFeedbackForStudents(parsedFeedback);
      const generatedProjectBullets = generateProjectBullets(jobTitle, roleKeywordAnalysis);
      const actionableRewrites = generateActionableRewrites(parsedFeedback);
      data.roleKeywordAnalysis = roleKeywordAnalysis;
      data.studentFeedback = studentFeedback;
      data.generatedProjectBullets = generatedProjectBullets;
      data.actionableRewrites = actionableRewrites;
      data.usedFallbackAnalysis = usedFallbackAnalysis;
      data.jobState = "done";
      data.completedAt = Date.now();
      console.log("Saving data to KV store:", data);
      await kv.set(`resume:${uuid2}`, JSON.stringify(data));
      const savedData = await kv.get(`resume:${uuid2}`);
      if (!savedData) {
        throw new Error("Failed to save analysis results. Please try again.");
      }
      console.log("Verified saved data:", savedData);
      setStatusText("Analysis complete! Redirecting...");
      console.log("Analysis successful, redirecting to resume page");
      setTimeout(() => {
        navigate(`/resume/${uuid2}`);
      }, 500);
    } catch (error) {
      console.error("Analysis error details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : void 0,
        errorType: error ? typeof error : "undefined"
      });
      const errorMsg = error instanceof Error ? error.message : typeof error === "string" ? error : "An unexpected error occurred. Please try again.";
      try {
        const existingData = await kv.get(`resume:${uuid}`);
        if (existingData) {
          const parsed = JSON.parse(existingData);
          parsed.jobState = "failed";
          parsed.lastError = errorMsg;
          parsed.retryCount = (parsed.retryCount || 0) + 1;
          await kv.set(`resume:${uuid}`, JSON.stringify(parsed));
          console.log("Updated KV with failed state for UUID:", uuid);
        }
      } catch (kvError) {
        console.error("Failed to update KV with error state:", kvError);
      }
      setStatusText(`Error: ${errorMsg}`);
      setIsProcessing(false);
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  };
  const handleSubmit = (e) => {
    var _a, _b, _c;
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const formData = new FormData(form);
    const companyName = (_a = formData.get("company-name")) == null ? void 0 : _a.trim();
    const jobTitle = (_b = formData.get("job-title")) == null ? void 0 : _b.trim();
    const jobDescription = (_c = formData.get("job-description")) == null ? void 0 : _c.trim();
    if (!companyName) {
      setStatusText("Error: Please enter a company name");
      return;
    }
    if (!jobTitle) {
      setStatusText("Error: Please enter a job title");
      return;
    }
    if (!jobDescription) {
      setStatusText("Error: Please enter a job description");
      return;
    }
    if (jobDescription.length > 5e3) {
      setStatusText("Error: Job description is too long (max 5000 characters). Please shorten it to improve analysis speed.");
      return;
    }
    if (!file) {
      setStatusText("Error: Please upload a resume file");
      return;
    }
    if (jobDescription.length > 2e3) {
      if (!confirm("Your job description is quite long. This may increase analysis time to 3+ minutes. Continue?")) {
        return;
      }
    }
    handleAnalyze({
      companyName,
      jobTitle,
      jobDescription,
      file
    });
  };
  return /* @__PURE__ */ jsxs("main", {
    className: "app-shell bg-cover",
    children: [/* @__PURE__ */ jsx(Navbar, {}), /* @__PURE__ */ jsx("section", {
      className: "main-section",
      children: /* @__PURE__ */ jsxs("div", {
        className: "page-heading py-16",
        children: [/* @__PURE__ */ jsx("h1", {
          children: "Smart feedback for your dream job"
        }), isProcessing && /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsx("h2", {
            children: statusText
          }), /* @__PURE__ */ jsx("img", {
            src: "/images/resume-scan.gif",
            className: "w-full"
          })]
        }), !isProcessing && statusText && statusText.startsWith("Error") && /* @__PURE__ */ jsxs(Fragment, {
          children: [/* @__PURE__ */ jsx("h2", {
            className: "text-red-600",
            children: statusText
          }), /* @__PURE__ */ jsx("button", {
            className: "primary-button mt-4",
            onClick: () => setStatusText(""),
            children: "Try Again"
          })]
        }), !isProcessing && (!statusText || !statusText.startsWith("Error")) && /* @__PURE__ */ jsx("h2", {
          children: "Drop your resume for an ATS score and improvement tips"
        }), !isProcessing && /* @__PURE__ */ jsxs("form", {
          id: "upload-form",
          onSubmit: handleSubmit,
          className: "flex flex-col gap-4 mt-8",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "form-div",
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "company-name",
              children: "Company Name"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              name: "company-name",
              placeholder: "Company Name",
              id: "company-name"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "form-div",
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "job-title",
              children: "Job Title"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              name: "job-title",
              placeholder: "Job Title",
              id: "job-title"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "form-div",
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "job-description",
              children: "Job Description"
            }), /* @__PURE__ */ jsx("textarea", {
              rows: 5,
              name: "job-description",
              placeholder: "Job Description",
              id: "job-description"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "form-div",
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "uploader",
              children: "Upload Resume"
            }), /* @__PURE__ */ jsx(FileUploader, {
              onFileSelect: handleFileSelect
            })]
          }), /* @__PURE__ */ jsx("button", {
            className: "primary-button",
            type: "submit",
            children: "Analyze Resume"
          })]
        })]
      })
    })]
  });
};
const upload = UNSAFE_withComponentProps(Upload);
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: upload
}, Symbol.toStringTag, { value: "Module" }));
const ScoreGauge = ({ score = 75 }) => {
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef(null);
  const percentage = score / 100;
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);
  return /* @__PURE__ */ jsx("div", { className: "flex flex-col items-center", children: /* @__PURE__ */ jsxs("div", { className: "relative w-40 h-20", children: [
    /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 100 50", className: "w-full h-full", children: [
      /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs(
        "linearGradient",
        {
          id: "gaugeGradient",
          x1: "0%",
          y1: "0%",
          x2: "100%",
          y2: "0%",
          children: [
            /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#a78bfa" }),
            /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#fca5a5" })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx(
        "path",
        {
          d: "M10,50 A40,40 0 0,1 90,50",
          fill: "none",
          stroke: "#e5e7eb",
          strokeWidth: "10",
          strokeLinecap: "round"
        }
      ),
      /* @__PURE__ */ jsx(
        "path",
        {
          ref: pathRef,
          d: "M10,50 A40,40 0 0,1 90,50",
          fill: "none",
          stroke: "url(#gaugeGradient)",
          strokeWidth: "10",
          strokeLinecap: "round",
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength * (1 - percentage)
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center pt-2", children: /* @__PURE__ */ jsxs("div", { className: "text-xl font-semibold pt-4", children: [
      score,
      "/100"
    ] }) })
  ] }) });
};
const ScoreBadge$1 = ({ score }) => {
  let badgeColor = "";
  let badgeText = "";
  if (score > 70) {
    badgeColor = "bg-badge-green text-green-600";
    badgeText = "Strong";
  } else if (score > 49) {
    badgeColor = "bg-badge-yellow text-yellow-600";
    badgeText = "Good Start";
  } else {
    badgeColor = "bg-badge-red text-red-600";
    badgeText = "Needs Work";
  }
  return /* @__PURE__ */ jsx("div", { className: `px-3 py-1 rounded-full ${badgeColor}`, children: /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: badgeText }) });
};
const Category = memo(({ title, score }) => {
  const textColor = score > 70 ? "text-green-600" : score > 49 ? "text-yellow-600" : "text-red-600";
  return /* @__PURE__ */ jsx("div", { className: "resume-summary", children: /* @__PURE__ */ jsxs("div", { className: "category", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-row gap-2 items-center justify-center", children: [
      /* @__PURE__ */ jsx("p", { className: "text-2xl", children: title }),
      /* @__PURE__ */ jsx(ScoreBadge$1, { score })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-2xl", children: [
      /* @__PURE__ */ jsx("span", { className: textColor, children: score }),
      "/100"
    ] })
  ] }) });
});
Category.displayName = "Category";
const Summary = memo(({ feedback }) => {
  return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-md w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-row items-center p-4 gap-8", children: [
      /* @__PURE__ */ jsx(ScoreGauge, { score: feedback.overallScore }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold", children: "Your Resume Score" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "This score is calculated based on the variables listed below." })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Category, { title: "Tone & Style", score: feedback.toneAndStyle.score }),
    /* @__PURE__ */ jsx(Category, { title: "Content", score: feedback.content.score }),
    /* @__PURE__ */ jsx(Category, { title: "Structure", score: feedback.structure.score }),
    /* @__PURE__ */ jsx(Category, { title: "Skills", score: feedback.skills.score })
  ] });
});
Summary.displayName = "Summary";
const ATS = memo(({ score, suggestions }) => {
  const gradientClass = score > 69 ? "from-green-100" : score > 49 ? "from-yellow-100" : "from-red-100";
  const iconSrc = score > 69 ? "/icons/ats-good.svg" : score > 49 ? "/icons/ats-warning.svg" : "/icons/ats-bad.svg";
  const subtitle = score > 69 ? "Great Job!" : score > 49 ? "Good Start" : "Needs Improvement";
  return /* @__PURE__ */ jsxs("div", { className: `bg-gradient-to-b ${gradientClass} to-white rounded-2xl shadow-md w-full p-6`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mb-6", children: [
      /* @__PURE__ */ jsx("img", { src: iconSrc, alt: "ATS Score Icon", className: "w-12 h-12" }),
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("h2", { className: "text-2xl font-bold", children: [
        "ATS Score - ",
        score,
        "/100"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold mb-2", children: subtitle }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-600 mb-4", children: "This score represents how well your resume is likely to perform in Applicant Tracking Systems used by employers." }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: suggestions.map((suggestion, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            src: suggestion.type === "good" ? "/icons/check.svg" : "/icons/warning.svg",
            alt: suggestion.type === "good" ? "Check" : "Warning",
            className: "w-5 h-5 mt-1"
          }
        ),
        /* @__PURE__ */ jsx("p", { className: suggestion.type === "good" ? "text-green-700" : "text-amber-700", children: suggestion.tip })
      ] }, index)) })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-700 italic", children: "Keep refining your resume to improve your chances of getting past ATS filters and into the hands of recruiters." })
  ] });
});
ATS.displayName = "ATS";
const AccordionContext = createContext(
  void 0
);
const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
};
const Accordion = ({
  children,
  defaultOpen,
  allowMultiple = false,
  className = ""
}) => {
  const [activeItems, setActiveItems] = useState(
    defaultOpen ? [defaultOpen] : []
  );
  const toggleItem = (id) => {
    setActiveItems((prev) => {
      if (allowMultiple) {
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      } else {
        return prev.includes(id) ? [] : [id];
      }
    });
  };
  const isItemActive = (id) => activeItems.includes(id);
  return /* @__PURE__ */ jsx(
    AccordionContext.Provider,
    {
      value: { activeItems, toggleItem, isItemActive },
      children: /* @__PURE__ */ jsx("div", { className: `space-y-2 ${className}`, children })
    }
  );
};
const AccordionItem = ({
  id,
  children,
  className = ""
}) => {
  return /* @__PURE__ */ jsx("div", { className: `overflow-hidden border-b border-gray-200 ${className}`, children });
};
const AccordionHeader = ({
  itemId,
  children,
  className = "",
  icon,
  iconPosition = "right"
}) => {
  const { toggleItem, isItemActive } = useAccordion();
  const isActive = isItemActive(itemId);
  const defaultIcon = /* @__PURE__ */ jsx(
    "svg",
    {
      className: cn("w-5 h-5 transition-transform duration-200", {
        "rotate-180": isActive
      }),
      fill: "none",
      stroke: "#98A2B3",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      children: /* @__PURE__ */ jsx(
        "path",
        {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 2,
          d: "M19 9l-7 7-7-7"
        }
      )
    }
  );
  const handleClick = () => {
    toggleItem(itemId);
  };
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: handleClick,
      className: `
        w-full px-4 py-3 text-left
        focus:outline-none
        transition-colors duration-200 flex items-center justify-between cursor-pointer
        ${className}
      `,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
          iconPosition === "left" && (icon || defaultIcon),
          /* @__PURE__ */ jsx("div", { className: "flex-1", children })
        ] }),
        iconPosition === "right" && (icon || defaultIcon)
      ]
    }
  );
};
const AccordionContent = ({
  itemId,
  children,
  className = ""
}) => {
  const { isItemActive } = useAccordion();
  const isActive = isItemActive(itemId);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `
        overflow-hidden transition-all duration-300 ease-in-out
        ${isActive ? "max-h-fit opacity-100" : "max-h-0 opacity-0"}
        ${className}
      `,
      children: /* @__PURE__ */ jsx("div", { className: "px-4 py-3 ", children })
    }
  );
};
const ScoreBadge = memo(({ score }) => {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "flex flex-row gap-1 items-center px-2 py-0.5 rounded-[96px]",
        score > 69 ? "bg-badge-green" : score > 39 ? "bg-badge-yellow" : "bg-badge-red"
      ),
      children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            src: score > 69 ? "/icons/check.svg" : "/icons/warning.svg",
            alt: "score",
            className: "size-4"
          }
        ),
        /* @__PURE__ */ jsxs(
          "p",
          {
            className: cn(
              "text-sm font-medium",
              score > 69 ? "text-badge-green-text" : score > 39 ? "text-badge-yellow-text" : "text-badge-red-text"
            ),
            children: [
              score,
              "/100"
            ]
          }
        )
      ]
    }
  );
});
ScoreBadge.displayName = "ScoreBadge";
const CategoryHeader = memo(({
  title,
  categoryScore
}) => {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-row gap-4 items-center py-2", children: [
    /* @__PURE__ */ jsx("p", { className: "text-2xl font-semibold", children: title }),
    /* @__PURE__ */ jsx(ScoreBadge, { score: categoryScore })
  ] });
});
CategoryHeader.displayName = "CategoryHeader";
const CategoryContent = memo(({
  tips
}) => {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 items-center w-full", children: [
    /* @__PURE__ */ jsx("div", { className: "bg-gray-50 w-full rounded-lg px-5 py-4 grid grid-cols-2 gap-4", children: tips.map((tip, index) => /* @__PURE__ */ jsxs("div", { className: "flex flex-row gap-2 items-center", children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          src: tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg",
          alt: "score",
          className: "size-5"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "text-xl text-gray-500 ", children: tip.tip })
    ] }, index)) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-4 w-full", children: tips.map((tip, index) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: cn(
          "flex flex-col gap-2 rounded-2xl p-4",
          tip.type === "good" ? "bg-green-50 border border-green-200 text-green-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700"
        ),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-row gap-2 items-center", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg",
                alt: "score",
                className: "size-5"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: tip.tip })
          ] }),
          /* @__PURE__ */ jsx("p", { children: tip.explanation })
        ]
      },
      index + tip.tip
    )) })
  ] });
});
CategoryContent.displayName = "CategoryContent";
const Details = memo(({ feedback }) => {
  return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-4 w-full", children: /* @__PURE__ */ jsxs(Accordion, { children: [
    /* @__PURE__ */ jsxs(AccordionItem, { id: "tone-style", children: [
      /* @__PURE__ */ jsx(AccordionHeader, { itemId: "tone-style", children: /* @__PURE__ */ jsx(
        CategoryHeader,
        {
          title: "Tone & Style",
          categoryScore: feedback.toneAndStyle.score
        }
      ) }),
      /* @__PURE__ */ jsx(AccordionContent, { itemId: "tone-style", children: /* @__PURE__ */ jsx(CategoryContent, { tips: feedback.toneAndStyle.tips }) })
    ] }),
    /* @__PURE__ */ jsxs(AccordionItem, { id: "content", children: [
      /* @__PURE__ */ jsx(AccordionHeader, { itemId: "content", children: /* @__PURE__ */ jsx(
        CategoryHeader,
        {
          title: "Content",
          categoryScore: feedback.content.score
        }
      ) }),
      /* @__PURE__ */ jsx(AccordionContent, { itemId: "content", children: /* @__PURE__ */ jsx(CategoryContent, { tips: feedback.content.tips }) })
    ] }),
    /* @__PURE__ */ jsxs(AccordionItem, { id: "structure", children: [
      /* @__PURE__ */ jsx(AccordionHeader, { itemId: "structure", children: /* @__PURE__ */ jsx(
        CategoryHeader,
        {
          title: "Structure",
          categoryScore: feedback.structure.score
        }
      ) }),
      /* @__PURE__ */ jsx(AccordionContent, { itemId: "structure", children: /* @__PURE__ */ jsx(CategoryContent, { tips: feedback.structure.tips }) })
    ] }),
    /* @__PURE__ */ jsxs(AccordionItem, { id: "skills", children: [
      /* @__PURE__ */ jsx(AccordionHeader, { itemId: "skills", children: /* @__PURE__ */ jsx(
        CategoryHeader,
        {
          title: "Skills",
          categoryScore: feedback.skills.score
        }
      ) }),
      /* @__PURE__ */ jsx(AccordionContent, { itemId: "skills", children: /* @__PURE__ */ jsx(CategoryContent, { tips: feedback.skills.tips }) })
    ] })
  ] }) });
});
Details.displayName = "Details";
const StudentFeedbackCard = ({ data }) => {
  return /* @__PURE__ */ jsxs("section", { className: "bg-white rounded-2xl shadow-md w-full p-5", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-2xl font-semibold text-black", children: "Student-Friendly Feedback" }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-700 mt-3", children: data.rewrittenSummary }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5", children: [
      /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-black", children: "Action Checklist" }),
      /* @__PURE__ */ jsx("ul", { className: "mt-2 space-y-2", children: data.actionChecklist.map((item, index) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2 text-gray-700", children: [
        /* @__PURE__ */ jsx("span", { className: "text-green-600 mt-0.5", children: "OK" }),
        /* @__PURE__ */ jsx("span", { children: item })
      ] }, `${item}-${index}`)) })
    ] })
  ] });
};
const RoleKeywordAnalysisCard = ({ data }) => {
  return /* @__PURE__ */ jsxs("section", { className: "bg-white rounded-2xl shadow-md w-full p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 flex-wrap", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-2xl font-semibold text-black", children: "Role Keyword Pack" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full", children: [
        data.rolePack.toUpperCase(),
        " pack | ",
        data.coverage,
        "% coverage"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-green-200 bg-green-50 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold text-green-800", children: "Matched Keywords" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-green-700 mt-2", children: data.matchedKeywords.length ? data.matchedKeywords.join(", ") : "No matched keywords yet." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-amber-200 bg-amber-50 p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold text-amber-800", children: "Missing Keywords" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-amber-700 mt-2", children: data.missingKeywords.length ? data.missingKeywords.join(", ") : "Great match. No high-priority gaps." })
      ] })
    ] })
  ] });
};
const ProjectBulletGenerator = ({ bullets }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const handleCopy = async (text, index) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };
  return /* @__PURE__ */ jsxs("section", { className: "bg-white rounded-2xl shadow-md w-full p-5", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-2xl font-semibold text-black", children: "Project Bullet Generator" }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-600 mt-2", children: "Reuse these tailored bullet points in your Projects section." }),
    /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-3", children: bullets.map((bullet, index) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-gray-200 p-4 bg-gray-50", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-gray-800", children: [
        "- ",
        bullet
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "mt-3 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white",
          onClick: () => void handleCopy(bullet, index),
          children: copiedIndex === index ? "Copied" : "Copy"
        }
      )
    ] }, `${bullet}-${index}`)) })
  ] });
};
const ActionableRewriteCard = ({ rewrites }) => {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const handleCopy = async (text, index) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };
  return /* @__PURE__ */ jsxs("section", { className: "bg-white rounded-2xl shadow-md w-full p-4 md:p-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-2xl font-semibold text-black", children: "Actionable Rewrites" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Click each card to see a concrete example and expected impact." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3", children: rewrites.map((rewrite, index) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all",
        onClick: () => setExpandedIndex(expandedIndex === index ? null : index),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-indigo-600 text-sm py-1 px-2 bg-indigo-50 rounded whitespace-nowrap", children: rewrite.section }),
              /* @__PURE__ */ jsx("p", { className: "text-gray-800 font-medium break-words", children: rewrite.issue })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "ml-2 text-gray-500 text-xl", children: expandedIndex === index ? "-" : "+" })
          ] }),
          expandedIndex === index && /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-3 border-t pt-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-gray-600 uppercase", children: "Before (Weak):" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded mt-1 break-words", children: rewrite.example })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-gray-600 uppercase", children: "After (Strong):" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm bg-green-50 border border-green-200 text-green-800 p-3 rounded mt-1 break-words", children: rewrite.rewrite })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-green-600 mt-0.5", children: "OK" }),
              /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
                /* @__PURE__ */ jsx("strong", { children: "Expected impact:" }),
                " ",
                rewrite.impact
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "w-full text-sm px-3 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors",
                onClick: (e) => {
                  e.stopPropagation();
                  void handleCopy(rewrite.rewrite, index);
                },
                children: copiedIndex === index ? "Copied to clipboard" : "Copy rewrite"
              }
            )
          ] })
        ]
      },
      `${rewrite.section}-${index}`
    )) })
  ] });
};
const ProgressStateCard = ({ jobState, lastError, retryCount = 0, onRetry }) => {
  const state = getProgressState(jobState);
  return /* @__PURE__ */ jsxs("div", { className: `${state.bg} border border-gray-200 rounded-xl p-4 md:p-5`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsx("span", { className: "text-2xl", children: state.icon }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: `font-semibold text-lg ${state.color}`, children: state.label }),
        lastError && /* @__PURE__ */ jsx("p", { className: "text-sm text-red-700 mt-2 break-words", children: lastError })
      ] })
    ] }),
    jobState === "failed" && onRetry && /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: onRetry,
        className: "mt-3 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm",
        children: [
          "Retry Analysis ",
          retryCount > 0 && `(Attempt ${retryCount + 1})`
        ]
      }
    )
  ] });
};
const meta = () => [{
  title: "Resumind | Review"
}, {
  name: "description",
  content: "Detailed overview of your resume"
}];
const Resume = () => {
  const {
    isLoading,
    fs,
    kv
  } = usePuterStore();
  const {
    isAuthenticated
  } = useAuthStore();
  const {
    id
  } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [studentFeedback, setStudentFeedback] = useState(null);
  const [roleKeywordAnalysis, setRoleKeywordAnalysis] = useState(null);
  const [generatedProjectBullets, setGeneratedProjectBullets] = useState([]);
  const [actionableRewrites, setActionableRewrites] = useState([]);
  const [jobState, setJobState] = useState();
  const [lastError, setLastError] = useState();
  const [retryCount, setRetryCount] = useState(0);
  const [loadingError, setLoadingError] = useState("");
  const [pollingTimeout, setPollingTimeout] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [usedFallbackAnalysis, setUsedFallbackAnalysis] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [id, isAuthenticated, isLoading, navigate]);
  useEffect(() => {
    if (!id) {
      return;
    }
    let isActive = true;
    let pollCount = 0;
    const maxPolls = 23;
    const startTime = Date.now();
    let pollInterval;
    setPollingTimeout(false);
    setLoadingError("");
    setElapsedTime(0);
    const shouldStopPolling = (data) => Boolean(data == null ? void 0 : data.feedback) || (data == null ? void 0 : data.jobState) === "done" || (data == null ? void 0 : data.jobState) === "failed";
    const stopPolling = (timeTracker2) => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      clearInterval(timeTracker2);
    };
    const loadResume = async () => {
      try {
        console.log(`Loading resume with id: ${id}`);
        const resume2 = await kv.get(`resume:${id}`);
        if (!resume2) {
          if (isActive) {
            setLoadingError("Resume not found. Please upload a resume first.");
          }
          return null;
        }
        const data = JSON.parse(resume2);
        console.log("Resume data loaded:", data);
        if (resumeUrl === "" || imageUrl === "") {
          const resumeBlob = await fs.read(data.resumePath);
          if (!resumeBlob) {
            if (isActive) {
              setLoadingError("Failed to load resume file");
            }
            return null;
          }
          const nextResumeUrl = URL.createObjectURL(new Blob([resumeBlob], {
            type: "application/pdf"
          }));
          const imageBlob = await fs.read(data.imagePath);
          if (!imageBlob) {
            URL.revokeObjectURL(nextResumeUrl);
            if (isActive) {
              setLoadingError("Failed to load resume preview");
            }
            return null;
          }
          const nextImageUrl = URL.createObjectURL(imageBlob);
          if (!isActive) {
            URL.revokeObjectURL(nextResumeUrl);
            URL.revokeObjectURL(nextImageUrl);
            return null;
          }
          setResumeUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return nextResumeUrl;
          });
          setImageUrl((currentUrl) => {
            if (currentUrl) {
              URL.revokeObjectURL(currentUrl);
            }
            return nextImageUrl;
          });
        }
        if (data.feedback) {
          setFeedback(data.feedback);
          setStudentFeedback(data.studentFeedback || null);
          setRoleKeywordAnalysis(data.roleKeywordAnalysis || null);
          setGeneratedProjectBullets(Array.isArray(data.generatedProjectBullets) ? data.generatedProjectBullets : []);
          setActionableRewrites(Array.isArray(data.actionableRewrites) ? data.actionableRewrites : []);
          setUsedFallbackAnalysis(Boolean(data.usedFallbackAnalysis));
          console.log("Feedback loaded:", data.feedback);
        } else {
          console.log("No feedback available yet");
          setJobState(data.jobState);
          setLastError(data.lastError);
          setRetryCount(data.retryCount || 0);
        }
        return data;
      } catch (error) {
        console.error("Error loading resume:", error);
        if (isActive) {
          setLoadingError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        return null;
      }
    };
    const timeTracker = setInterval(() => {
      if (isActive) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1e3));
      }
    }, 1e3);
    const startPolling = async () => {
      const initialData = await loadResume();
      if (!isActive || shouldStopPolling(initialData)) {
        stopPolling(timeTracker);
        return;
      }
      pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`Polling for feedback update... (attempt ${pollCount}/${maxPolls})`);
        const latestData = await loadResume();
        if (!isActive) {
          return;
        }
        if (shouldStopPolling(latestData)) {
          stopPolling(timeTracker);
          return;
        }
        if (pollCount >= maxPolls) {
          stopPolling(timeTracker);
          console.warn("Feedback polling timeout: 3 minutes reached");
          setPollingTimeout(true);
          const finalData = await loadResume();
          if ((finalData == null ? void 0 : finalData.jobState) === "failed") {
            setLoadingError((finalData == null ? void 0 : finalData.lastError) || "Analysis failed. Please try again.");
          } else {
            setLoadingError("Analysis is taking longer than expected. The AI service may be busy or the job description may be too long. Please try uploading again with a shorter description.");
          }
        }
      }, 8e3);
    };
    void startPolling();
    return () => {
      isActive = false;
      stopPolling(timeTracker);
    };
  }, [fs, id, kv, resumeUrl, imageUrl]);
  useEffect(() => {
    return () => {
      if (resumeUrl) {
        URL.revokeObjectURL(resumeUrl);
      }
    };
  }, [resumeUrl]);
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);
  return /* @__PURE__ */ jsxs("main", {
    className: "!pt-0",
    children: [/* @__PURE__ */ jsx("nav", {
      className: "resume-nav",
      children: /* @__PURE__ */ jsxs(Link, {
        to: "/",
        className: "back-button",
        children: [/* @__PURE__ */ jsx("img", {
          src: "/icons/back.svg",
          alt: "logo",
          className: "w-2.5 h-2.5"
        }), /* @__PURE__ */ jsx("span", {
          className: "text-gray-800 text-sm font-semibold",
          children: "Back to Homepage"
        })]
      })
    }), /* @__PURE__ */ jsxs("div", {
      className: "flex flex-row w-full max-lg:flex-col-reverse",
      children: [/* @__PURE__ */ jsx("section", {
        className: "feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center",
        children: loadingError && !imageUrl ? /* @__PURE__ */ jsxs("div", {
          className: "text-center p-5",
          children: [/* @__PURE__ */ jsx("p", {
            className: "text-red-600 font-semibold",
            children: loadingError
          }), /* @__PURE__ */ jsx(Link, {
            to: "/upload",
            className: "text-blue-600 underline mt-3 inline-block",
            children: "Upload a new resume"
          })]
        }) : imageUrl && resumeUrl ? /* @__PURE__ */ jsx("div", {
          className: "animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit",
          children: /* @__PURE__ */ jsx("a", {
            href: resumeUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            children: /* @__PURE__ */ jsx("img", {
              src: imageUrl,
              className: "w-full h-full object-contain rounded-2xl",
              title: "resume"
            })
          })
        }) : /* @__PURE__ */ jsxs("div", {
          className: "text-center p-5",
          children: [/* @__PURE__ */ jsx("div", {
            className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-gray-600 mt-4",
            children: "Loading resume..."
          })]
        })
      }), /* @__PURE__ */ jsxs("section", {
        className: "feedback-section",
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-4xl !text-black font-bold",
          children: "Resume Review"
        }), pollingTimeout ? /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col items-center justify-center gap-4 text-center",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-red-600 text-lg font-semibold",
            children: "Analysis Timeout"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-gray-700 max-w-md",
            children: "The AI analysis is taking longer than expected. This might be due to:"
          }), /* @__PURE__ */ jsxs("ul", {
            className: "text-left text-gray-600 text-sm space-y-2 ml-8",
            children: [/* @__PURE__ */ jsx("li", {
              children: "High server load and a busy AI service"
            }), /* @__PURE__ */ jsx("li", {
              children: "Large resume file size"
            }), /* @__PURE__ */ jsx("li", {
              children: "Very long job description"
            }), /* @__PURE__ */ jsx("li", {
              children: "Network connectivity issues"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "flex gap-4 mt-4",
            children: [/* @__PURE__ */ jsx("button", {
              onClick: () => window.location.reload(),
              className: "px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors",
              children: "Check Status Again"
            }), /* @__PURE__ */ jsx(Link, {
              to: "/upload",
              className: "px-6 py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors",
              children: "Upload New Resume"
            })]
          })]
        }) : loadingError ? /* @__PURE__ */ jsxs("div", {
          className: "text-red-600 text-center",
          children: [/* @__PURE__ */ jsx("p", {
            className: "mb-4",
            children: loadingError
          }), /* @__PURE__ */ jsx(Link, {
            to: "/upload",
            className: "text-blue-600 underline",
            children: "Upload a new resume"
          })]
        }) : feedback ? /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col gap-8 animate-in fade-in duration-1000",
          children: [usedFallbackAnalysis && /* @__PURE__ */ jsxs("div", {
            className: "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900",
            children: [/* @__PURE__ */ jsx("p", {
              className: "font-semibold",
              children: "Fallback analysis mode"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-sm",
              children: "Live AI service was unavailable, so this review used a local fallback analysis."
            })]
          }), jobState && jobState !== "done" && /* @__PURE__ */ jsx(ProgressStateCard, {
            jobState,
            lastError,
            retryCount,
            onRetry: () => window.location.reload()
          }), /* @__PURE__ */ jsx(Summary, {
            feedback
          }), actionableRewrites.length > 0 && /* @__PURE__ */ jsx(ActionableRewriteCard, {
            rewrites: actionableRewrites
          }), studentFeedback && /* @__PURE__ */ jsx(StudentFeedbackCard, {
            data: studentFeedback
          }), roleKeywordAnalysis && /* @__PURE__ */ jsx(RoleKeywordAnalysisCard, {
            data: roleKeywordAnalysis
          }), generatedProjectBullets.length > 0 && /* @__PURE__ */ jsx(ProjectBulletGenerator, {
            bullets: generatedProjectBullets
          }), /* @__PURE__ */ jsx(ATS, {
            score: feedback.ATS.score || 0,
            suggestions: feedback.ATS.tips || []
          }), /* @__PURE__ */ jsx(Details, {
            feedback
          })]
        }) : /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col gap-6",
          children: [jobState && jobState !== "done" && /* @__PURE__ */ jsx(ProgressStateCard, {
            jobState,
            lastError,
            retryCount,
            onRetry: () => window.location.reload()
          }), jobState === "failed" ? /* @__PURE__ */ jsxs("div", {
            className: "text-center",
            children: [/* @__PURE__ */ jsx("p", {
              className: "text-gray-700 font-semibold",
              children: "The analysis stopped before feedback was generated."
            }), /* @__PURE__ */ jsx("p", {
              className: "text-gray-500 text-sm mt-2",
              children: "Try again, or upload a new resume if the problem continues."
            })]
          }) : /* @__PURE__ */ jsxs("div", {
            className: "flex flex-col items-center justify-center gap-4",
            children: [/* @__PURE__ */ jsx("img", {
              src: "/images/resume-scan-2.gif",
              className: "w-full max-w-md"
            }), /* @__PURE__ */ jsxs("div", {
              className: "text-center",
              children: [/* @__PURE__ */ jsx("p", {
                className: "text-gray-700 font-semibold",
                children: "AI is analyzing your resume..."
              }), /* @__PURE__ */ jsxs("p", {
                className: "text-gray-500 text-sm mt-2",
                children: ["This usually takes 2-3 minutes", elapsedTime > 0 && /* @__PURE__ */ jsxs("span", {
                  className: "font-medium",
                  children: [" (elapsed: ", elapsedTime, "s)"]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "mt-4 flex items-center justify-center gap-2",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                }), /* @__PURE__ */ jsx("div", {
                  className: "w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-200"
                }), /* @__PURE__ */ jsx("div", {
                  className: "w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-400"
                })]
              }), elapsedTime > 90 && /* @__PURE__ */ jsx("p", {
                className: "text-amber-600 text-sm mt-4",
                children: "Taking longer than usual. The AI service may be busy."
              })]
            })]
          })]
        })]
      })]
    })]
  });
};
const resume = UNSAFE_withComponentProps(Resume);
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: resume,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const WipeApp = () => {
  const {
    isLoading,
    error,
    clearError,
    fs,
    ai,
    kv
  } = usePuterStore();
  const {
    isAuthenticated,
    user
  } = useAuthStore();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const loadFiles = async () => {
    const files2 = await fs.readDir("./");
    setFiles(files2);
  };
  useEffect(() => {
    loadFiles();
  }, []);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth?next=/wipe");
    }
  }, [isLoading, isAuthenticated, navigate]);
  const handleDelete = async () => {
    files.forEach(async (file) => {
      await fs.delete(file.path);
    });
    await kv.flush();
    loadFiles();
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", {
      children: "Loading..."
    });
  }
  if (error) {
    return /* @__PURE__ */ jsxs("div", {
      children: ["Error ", error]
    });
  }
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx(Navbar, {}), /* @__PURE__ */ jsx("div", {
      className: "main-section",
      children: /* @__PURE__ */ jsxs("div", {
        children: ["Authenticated as: ", user == null ? void 0 : user.name, /* @__PURE__ */ jsx("div", {
          children: "Existing files:"
        }), /* @__PURE__ */ jsx("div", {
          className: "flex flex-col gap-4",
          children: files.map((file) => /* @__PURE__ */ jsx("div", {
            className: "flex flex-row gap-4",
            children: /* @__PURE__ */ jsx("p", {
              children: file.name
            })
          }, file.id))
        }), /* @__PURE__ */ jsx("div", {
          children: /* @__PURE__ */ jsx("button", {
            className: "bg-red-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-red-600",
            onClick: () => handleDelete(),
            children: "Wipe App Data"
          })
        })]
      })
    })]
  });
};
const wipe = UNSAFE_withComponentProps(WipeApp);
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: wipe
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-Bj98tKBe.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": true, "module": "/assets/root-O5hDW-Oq.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js", "/assets/puter-Cs0KbMiy.js", "/assets/auth-B3HLnrav.js"], "css": ["/assets/root-CVmBZOF9.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/home-Bn8dqMtK.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js", "/assets/Navbar-Da0cD2t-.js", "/assets/puter-Cs0KbMiy.js", "/assets/auth-B3HLnrav.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth": { "id": "routes/auth", "parentId": "root", "path": "/auth", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/auth-DKN8sG1W.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js", "/assets/auth-B3HLnrav.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/upload": { "id": "routes/upload", "parentId": "root", "path": "/upload", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/upload-P7-U4zsX.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js", "/assets/Navbar-Da0cD2t-.js", "/assets/utils-BoUr_NfL.js", "/assets/puter-Cs0KbMiy.js", "/assets/auth-B3HLnrav.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/resume": { "id": "routes/resume", "parentId": "root", "path": "/resume/:id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/resume-D2ACfG20.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js", "/assets/puter-Cs0KbMiy.js", "/assets/auth-B3HLnrav.js", "/assets/utils-BoUr_NfL.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/wipe": { "id": "routes/wipe", "parentId": "root", "path": "/wipe", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/wipe-V7nNXeyW.js", "imports": ["/assets/chunk-QMGIS6GS-CvuoQ3WG.js", "/assets/puter-Cs0KbMiy.js", "/assets/auth-B3HLnrav.js", "/assets/Navbar-Da0cD2t-.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-ce34ddbb.js", "version": "ce34ddbb", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_middleware": false, "unstable_optimizeDeps": false, "unstable_splitRouteModules": false, "unstable_subResourceIntegrity": false, "unstable_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/home": {
    id: "routes/home",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  },
  "routes/auth": {
    id: "routes/auth",
    parentId: "root",
    path: "/auth",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/upload": {
    id: "routes/upload",
    parentId: "root",
    path: "/upload",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/resume": {
    id: "routes/resume",
    parentId: "root",
    path: "/resume/:id",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/wipe": {
    id: "routes/wipe",
    parentId: "root",
    path: "/wipe",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
