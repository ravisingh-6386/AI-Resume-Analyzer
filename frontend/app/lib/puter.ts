import { create } from "zustand";

declare global {
    interface Window {
        puter: {
            auth: {
                getUser: () => Promise<PuterUser>;
                isSignedIn: () => Promise<boolean>;
                signIn: () => Promise<void>;
                signOut: () => Promise<void>;
            };
            fs: {
                write: (
                    path: string,
                    data: string | File | Blob
                ) => Promise<File | undefined>;
                read: (path: string) => Promise<Blob>;
                upload: (file: File[] | Blob[]) => Promise<FSItem>;
                delete: (path: string) => Promise<void>;
                readdir: (path: string) => Promise<FSItem[] | undefined>;
            };
            ai: {
                chat: (
                    prompt: string | ChatMessage[],
                    imageURL?: string | PuterChatOptions,
                    testMode?: boolean,
                    options?: PuterChatOptions
                ) => Promise<Object>;
                img2txt: (
                    image: string | File | Blob,
                    testMode?: boolean
                ) => Promise<string>;
            };
            kv: {
                get: (key: string) => Promise<string | null>;
                set: (key: string, value: string) => Promise<boolean>;
                delete: (key: string) => Promise<boolean>;
                list: (pattern: string, returnValues?: boolean) => Promise<string[]>;
                flush: () => Promise<boolean>;
            };
        };
    }
}

interface PuterStore {
    isLoading: boolean;
    error: string | null;
    puterReady: boolean;
    auth: {
        user: PuterUser | null;
        isAuthenticated: boolean;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        refreshUser: () => Promise<void>;
        checkAuthStatus: () => Promise<boolean>;
        getUser: () => PuterUser | null;
    };
    fs: {
        write: (
            path: string,
            data: string | File | Blob
        ) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob | undefined>;
        upload: (file: File[] | Blob[]) => Promise<FSItem | undefined>;
        delete: (path: string) => Promise<void>;
        readDir: (path: string) => Promise<FSItem[] | undefined>;
    };
    ai: {
        chat: (
            prompt: string | ChatMessage[],
            imageURL?: string | PuterChatOptions,
            testMode?: boolean,
            options?: PuterChatOptions
        ) => Promise<AIResponse | undefined>;
        feedback: (
            path: string,
            message: string
        ) => Promise<AIResponse | undefined>;
        img2txt: (
            image: string | File | Blob,
            testMode?: boolean
        ) => Promise<string | undefined>;
    };
    kv: {
        get: (key: string) => Promise<string | null | undefined>;
        set: (key: string, value: string) => Promise<boolean | undefined>;
        delete: (key: string) => Promise<boolean | undefined>;
        list: (
            pattern: string,
            returnValues?: boolean
        ) => Promise<string[] | KVItem[] | undefined>;
        flush: () => Promise<boolean | undefined>;
    };

    init: () => void;
    clearError: () => void;
}

const getPuter = (): typeof window.puter | null =>
    typeof window !== "undefined" && window.puter ? window.puter : null;

const LOCAL_FS_INDEX_KEY = "localfs:index";
const LOCAL_FS_DATA_PREFIX = "localfs:data:";
const LOCAL_KV_PREFIX = "localkv:";
const localFsDataStore = new Map<string, Blob>();

const getRandomId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read blob"));
        reader.readAsDataURL(blob);
    });

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
};

const getLocalFsIndex = (): FSItem[] => {
    const raw = localStorage.getItem(LOCAL_FS_INDEX_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as FSItem[];
    } catch {
        return [];
    }
};

const clearLegacyLocalFsData = () => {
    const legacyKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith(LOCAL_FS_DATA_PREFIX)
    );
    legacyKeys.forEach((key) => localStorage.removeItem(key));
};

const setLocalFsIndex = (items: FSItem[]) => {
    try {
        localStorage.setItem(LOCAL_FS_INDEX_KEY, JSON.stringify(items));
    } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "QuotaExceededError"
        ) {
            clearLegacyLocalFsData();
            localStorage.setItem(LOCAL_FS_INDEX_KEY, JSON.stringify(items));
            return;
        }
        throw error;
    }
};

const upsertLocalFsItem = (item: FSItem) => {
    const items = getLocalFsIndex();
    const idx = items.findIndex((entry) => entry.path === item.path);
    if (idx >= 0) {
        items[idx] = item;
    } else {
        items.push(item);
    }
    setLocalFsIndex(items);
};

const createLocalFsItem = (path: string, name: string, size: number): FSItem => {
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
        writable: true,
    };
};

const getLocalKvKeys = () =>
    Object.keys(localStorage).filter((key) => key.startsWith(LOCAL_KV_PREFIX));

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
};

const scoreFromHash = (seed: string, min: number, max: number) => {
    const range = Math.max(1, max - min + 1);
    return min + (hashString(seed) % range);
};

const cleanToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9.+#-]/g, "");

const tokenize = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9.+#\s-]/g, " ")
        .split(/\s+/)
        .map(cleanToken)
        .filter((token) => token.length > 2);

const stopWords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "have",
    "will", "all", "not", "but", "our", "job", "role", "position", "resume", "analysis",
    "into", "about", "also", "only", "just", "using", "use", "per", "yrs", "year", "years",
]);

const extractOriginalFilename = (path: string) => {
    const baseName = path.split("/").pop() || path;
    const localPrefixMatch = baseName.match(/^[0-9a-f-]{8,}-(.+)$/i);
    return localPrefixMatch?.[1] || baseName;
};

const getLocalFileSize = (path?: string) => {
    if (!path) return 0;
    const fileLike = localFsDataStore.get(path);
    if (!fileLike) return 0;
    return fileLike.size || 0;
};

const extractPromptContext = (message?: string) => {
    if (!message) {
        return {
            jobTitle: "your target role",
            jobDescription: "",
            jdTokens: [] as string[],
        };
    }

    const titleMatch = message.match(/Job Title:\s*([^\n]+)/i);
    const descriptionMatch = message.match(/Job Description:\s*([\s\S]*?)(?:\n\n|CRITICAL INSTRUCTIONS:|JSON Format Required:|Scoring Guidelines:|$)/i);
    const jobTitle = (titleMatch?.[1] || "your target role").trim();
    const jobDescription = (descriptionMatch?.[1] || "").trim();

    const jdTokens = Array.from(
        new Set(tokenize(`${jobTitle} ${jobDescription}`).filter((token) => !stopWords.has(token)))
    );

    return { jobTitle, jobDescription, jdTokens };
};

const extractFallbackContextFromChatPrompt = (prompt: string | ChatMessage[]) => {
    if (typeof prompt === "string") {
        return { message: prompt, path: undefined as string | undefined };
    }

    const messageParts: string[] = [];
    let path: string | undefined;

    for (const entry of prompt) {
        if (typeof entry.content === "string") {
            messageParts.push(entry.content);
            continue;
        }

        for (const contentPart of entry.content) {
            if (contentPart.type === "text" && contentPart.text) {
                messageParts.push(contentPart.text);
            }
            if (contentPart.type === "file" && contentPart.puter_path && !path) {
                path = contentPart.puter_path;
            }
        }
    }

    return {
        message: messageParts.join("\n"),
        path,
    };
};

const readBlobFromPath = async (
    path: string,
    puter: typeof window.puter | null
): Promise<Blob | null> => {
    const localBlob = localFsDataStore.get(path);
    if (localBlob) return localBlob;

    if (!puter) {
        const dataUrl = localStorage.getItem(`${LOCAL_FS_DATA_PREFIX}${path}`);
        if (!dataUrl) return null;
        return dataUrlToBlob(dataUrl);
    }

    try {
        return await puter.fs.read(path);
    } catch {
        return null;
    }
};

const extractTextFromPdfBlob = async (blob: Blob): Promise<string> => {
    try {
        // @ts-expect-error - dynamic path has no static module type
        const pdfJs = await import("pdfjs-dist/build/pdf.mjs");
        pdfJs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfJs.getDocument({ data: await blob.arrayBuffer() }).promise;
        const maxPages = Math.min(doc.numPages || 1, 3);

        const pageTexts: string[] = [];
        for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
            const page = await doc.getPage(pageIndex);
            const textContent = await page.getTextContent();
            const parts = (textContent.items as Array<{ str?: string }>).map((item) => item.str || "");
            pageTexts.push(parts.join(" "));
        }

        return pageTexts.join(" ").replace(/\s+/g, " ").trim();
    } catch {
        return "";
    }
};

const extractResumeTextForFallback = async (
    path: string | undefined,
    puter: typeof window.puter | null
): Promise<string> => {
    if (!path) return "";

    const blob = await readBlobFromPath(path, puter);
    if (!blob) return "";

    const fileName = extractOriginalFilename(path);
    const extension = (fileName.split(".").pop() || "").toLowerCase();

    if (extension === "pdf") {
        return extractTextFromPdfBlob(blob);
    }

    if (["txt", "md", "json", "csv", "xml", "yml", "yaml", "log"].includes(extension) || blob.type.startsWith("text/")) {
        try {
            const raw = await blob.text();
            return raw.replace(/\s+/g, " ").trim();
        } catch {
            return "";
        }
    }

    if (["png", "jpg", "jpeg", "webp", "bmp", "gif"].includes(extension) && puter) {
        try {
            const text = await puter.ai.img2txt(blob);
            return text.replace(/\s+/g, " ").trim();
        } catch {
            return "";
        }
    }

    return "";
};

const countMatches = (value: string, pattern: RegExp) => (value.match(pattern) || []).length;

const buildFallbackFeedbackText = async (
    path?: string,
    message?: string,
    puter: typeof window.puter | null = null
) => {
    const { jobTitle, jdTokens } = extractPromptContext(message);
    const fileName = path ? extractOriginalFilename(path) : "resume.pdf";
    const fileSize = getLocalFileSize(path);
    const sizeBucket = Math.min(15, Math.floor(fileSize / 35_000));
    const resumeText = (await extractResumeTextForFallback(path, puter)).slice(0, 120_000);

    const resumeTokens = Array.from(
        new Set(tokenize(`${fileName} ${resumeText}`).filter((token) => !stopWords.has(token)))
    );
    const matchedKeywords = jdTokens.filter((token) => resumeTokens.includes(token));
    const missingKeywords = jdTokens.filter((token) => !resumeTokens.includes(token));
    const keywordCoverage = jdTokens.length > 0 ? matchedKeywords.length / jdTokens.length : 0;
    const metricsCount = countMatches(resumeText, /\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:x|yrs?|years?|months?|days?)\b/gi);
    const actionVerbCount = countMatches(
        resumeText,
        /\b(led|built|delivered|implemented|optimized|designed|developed|launched|reduced|improved|increased|automated|managed|scaled)\b/gi
    );
    const sectionCount = ["experience", "education", "skills", "projects", "summary", "certifications"].filter(
        (section) => resumeText.toLowerCase().includes(section)
    ).length;
    const textLength = resumeText.length;
    const contentSignal = Math.min(18, Math.floor(textLength / 1400));

    const seedSource = `${fileName}|${fileSize}|${jobTitle}|${message || ""}|${resumeText.slice(0, 3000)}`;
    const atsBase =
        40 +
        Math.round(keywordCoverage * 40) +
        Math.min(14, metricsCount * 2) +
        Math.min(12, sectionCount * 2) +
        contentSignal +
        Math.min(8, sizeBucket);
    const atsScore = clampScore(atsBase + scoreFromHash(`${seedSource}:ats`, -5, 5));
    const toneScore = clampScore(
        52 + Math.min(16, actionVerbCount * 2) + Math.min(8, sectionCount) + Math.min(6, sizeBucket) + scoreFromHash(`${seedSource}:tone`, -6, 6)
    );
    const contentScore = clampScore(
        50 + Math.round(keywordCoverage * 22) + Math.min(16, metricsCount * 2) + contentSignal + scoreFromHash(`${seedSource}:content`, -6, 6)
    );
    const structureScore = clampScore(
        54 + Math.min(18, sectionCount * 3) + Math.min(8, sizeBucket) + scoreFromHash(`${seedSource}:structure`, -5, 5)
    );
    const skillsScore = clampScore(
        48 + Math.round(keywordCoverage * 34) + Math.min(12, matchedKeywords.length * 2) + scoreFromHash(`${seedSource}:skills`, -6, 6)
    );
    const overallScore = clampScore(
        atsScore * 0.34 + toneScore * 0.14 + contentScore * 0.22 + structureScore * 0.16 + skillsScore * 0.14
    );

    const topKeywords = jdTokens.slice(0, 3).join(", ") || "role-specific keywords";
    const missingKeywordHint = missingKeywords.slice(0, 3).join(", ") || topKeywords;

    const fallback: Feedback = {
        overallScore,
        ATS: {
            score: atsScore,
            tips: [
                {
                    type: "good",
                    tip: `Fallback used resume text signals: matched ${matchedKeywords.length}/${jdTokens.length || 0} role keywords.`,
                },
                {
                    type: "improve",
                    tip: `Add missing role terms in bullets and skills: ${missingKeywordHint}.`,
                },
            ],
        },
        toneAndStyle: {
            score: toneScore,
            tips: [
                {
                    type: "good",
                    tip: "Tone score considered action verbs and sentence clarity in parsed resume text.",
                    explanation: "Strong verbs and direct phrasing increase recruiter confidence.",
                },
                {
                    type: "improve",
                    tip: "Use action-led bullet starts consistently and avoid passive phrases.",
                    explanation: "Action-led phrasing increases clarity and professionalism.",
                },
            ],
        },
        content: {
            score: contentScore,
            tips: [
                {
                    type: "good",
                    tip: `Detected ${metricsCount} measurable tokens (%, years, multipliers) in resume content.`,
                    explanation: "Quantified impact improves credibility and interview conversion.",
                },
                {
                    type: "improve",
                    tip: "Increase quantified outcomes in project and experience bullets.",
                    explanation: "Metrics show impact and help your resume stand out.",
                },
            ],
        },
        structure: {
            score: structureScore,
            tips: [
                {
                    type: "good",
                    tip: `Detected ${sectionCount} common resume sections from extracted content.`,
                    explanation: "Clear section boundaries improve parser reliability.",
                },
                {
                    type: "improve",
                    tip: "Keep heading and date formatting consistent across all sections.",
                    explanation: "Consistent formatting improves visual hierarchy and ATS parsing.",
                },
            ],
        },
        skills: {
            score: skillsScore,
            tips: [
                {
                    type: "good",
                    tip: `Skill relevance was estimated from keyword overlap with ${jobTitle}.`,
                    explanation: "A focused skills block improves keyword matching opportunities.",
                },
                {
                    type: "improve",
                    tip: `Prioritize skills that exactly match the target role terms (${topKeywords}).`,
                    explanation: "Closer keyword alignment generally improves ATS match rate.",
                },
            ],
        },
    };

    return JSON.stringify(fallback);
};

export const usePuterStore = create<PuterStore>((set, get) => {
    const setError = (msg: string) => {
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
                getUser: get().auth.getUser,
            },
        });
    };

    const checkAuthStatus = async (): Promise<boolean> => {
        const puter = getPuter();
        if (!puter) {
            const authUserRaw = localStorage.getItem("authUser");
            if (authUserRaw) {
                try {
                    const authUser = JSON.parse(authUserRaw) as {
                        id?: string;
                        email?: string;
                        name?: string;
                    };
                    const localUser: PuterUser = {
                        uuid: authUser.id || getRandomId(),
                        username: authUser.name || authUser.email || "Local User",
                    };
                    set({
                        auth: {
                            user: localUser,
                            isAuthenticated: true,
                            signIn: get().auth.signIn,
                            signOut: get().auth.signOut,
                            refreshUser: get().auth.refreshUser,
                            checkAuthStatus: get().auth.checkAuthStatus,
                            getUser: () => localUser,
                        },
                        isLoading: false,
                        error: null,
                    });
                    return true;
                } catch {
                    // fall through
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
                    getUser: () => null,
                },
                isLoading: false,
                error: null,
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
                        getUser: () => user,
                    },
                    isLoading: false,
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
                        getUser: () => null,
                    },
                    isLoading: false,
                });
                return false;
            }
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Failed to check auth status";
            setError(msg);
            return false;
        }
    };

    const signIn = async (): Promise<void> => {
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

    const signOut = async (): Promise<void> => {
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
                    getUser: () => null,
                },
                isLoading: false,
                error: null,
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
                    getUser: () => null,
                },
                isLoading: false,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Sign out failed";
            setError(msg);
        }
    };

    const refreshUser = async (): Promise<void> => {
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
                    getUser: () => user,
                },
                isLoading: false,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to refresh user";
            setError(msg);
        }
    };

    const init = (): void => {
        const puter = getPuter();
        if (puter) {
            set({ puterReady: true });
            checkAuthStatus();
        } else {
            clearLegacyLocalFsData();
            set({ puterReady: false, error: null, isLoading: false });
            checkAuthStatus();
        }
    };

    const write = async (path: string, data: string | File | Blob) => {
        const puter = getPuter();
        if (!puter) {
            const blob =
                typeof data === "string"
                    ? new Blob([data], { type: "text/plain" })
                    : data;
            const fileName = path.split("/").pop() || `file-${getRandomId()}`;
            localFsDataStore.set(path, blob);
            const item = createLocalFsItem(path, fileName, blob.size);
            upsertLocalFsItem(item);
            return undefined;
        }
        try {
            const result = await puter.fs.write(path, data);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to write file';
            throw new Error(message);
        }
    };

    const readDir = async (path: string) => {
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
            const message = error instanceof Error ? error.message : 'Failed to read directory';
            throw new Error(message);
        }
    };

    const readFile = async (path: string) => {
        const puter = getPuter();
        if (!puter) {
            const inMemoryBlob = localFsDataStore.get(path);
            if (inMemoryBlob) return inMemoryBlob;

            const dataUrl = localStorage.getItem(`${LOCAL_FS_DATA_PREFIX}${path}`);
            if (!dataUrl) return undefined;
            return dataUrlToBlob(dataUrl);
        }
        try {
            const result = await puter.fs.read(path);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to read file';
            throw new Error(message);
        }
    };

    const upload = async (files: File[] | Blob[]) => {
        const puter = getPuter();
        if (!puter) {
            const firstFile = files[0];
            if (!firstFile) return undefined;
            const id = getRandomId();
            const name = firstFile instanceof File ? firstFile.name : `blob-${id}`;
            const path = `/local/${id}-${name}`;
            localFsDataStore.set(path, firstFile);
            const item = createLocalFsItem(path, name, firstFile.size);
            upsertLocalFsItem(item);
            return item;
        }
        try {
            const result = await puter.fs.upload(files);
            if (!result) {
                throw new Error('File upload failed: No response from server');
            }
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'File upload failed. Please check your connection and try again.';
            throw new Error(message);
        }
    };

    const deleteFile = async (path: string) => {
        const puter = getPuter();
        if (!puter) {
            localFsDataStore.delete(path);
            localStorage.removeItem(`${LOCAL_FS_DATA_PREFIX}${path}`);
            const items = getLocalFsIndex().filter((item) => item.path !== path);
            setLocalFsIndex(items);
            return;
        }
        try {
            await puter.fs.delete(path);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete file';
            throw new Error(message);
        }
    };

    const chat = async (
        prompt: string | ChatMessage[],
        imageURL?: string | PuterChatOptions,
        testMode?: boolean,
        options?: PuterChatOptions
    ) => {
        const puter = getPuter();
        const fallbackContext = extractFallbackContextFromChatPrompt(prompt);
        if (!puter) {
            const response: AIResponse = {
                index: 0,
                message: {
                    role: "assistant",
                    content: await buildFallbackFeedbackText(
                        fallbackContext.path,
                        fallbackContext.message,
                        null
                    ),
                    refusal: null,
                    annotations: [],
                },
                logprobs: null,
                finish_reason: "stop",
                usage: [],
                via_ai_chat_service: false,
            };
            return response;
        }
        try {
            const result = await puter.ai.chat(prompt, imageURL, testMode, options) as Promise<AIResponse | undefined>;
            if (!result) {
                throw new Error('Chat service returned no response');
            }
            return result;
        } catch (error) {
            console.error('Chat service failed, using fallback response:', error);
            return {
                index: 0,
                message: {
                    role: "assistant",
                    content: await buildFallbackFeedbackText(
                        fallbackContext.path,
                        fallbackContext.message,
                        puter
                    ),
                    refusal: null,
                    annotations: [],
                },
                logprobs: null,
                finish_reason: "stop",
                usage: [],
                via_ai_chat_service: false,
            };
        }
    };

    const feedback = async (path: string, message: string) => {
        const puter = getPuter();
        if (!puter) {
            const response: AIResponse = {
                index: 0,
                message: {
                    role: "assistant",
                    content: await buildFallbackFeedbackText(path, message, null),
                    refusal: null,
                    annotations: [],
                },
                logprobs: null,
                finish_reason: "stop",
                usage: [],
                via_ai_chat_service: false,
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
                                puter_path: path,
                            },
                            {
                                type: "text",
                                text: message,
                            },
                        ],
                    },
                ],
                { model: "claude-3-7-sonnet" }
            ) as Promise<AIResponse | undefined>;
            if (!result) {
                throw new Error('AI analysis failed: No response from AI service');
            }
            return result;
        } catch (error) {
            console.error('AI analysis failed, using fallback feedback:', error);
            return {
                index: 0,
                message: {
                    role: "assistant",
                    content: await buildFallbackFeedbackText(path, message, puter),
                    refusal: null,
                    annotations: [],
                },
                logprobs: null,
                finish_reason: "stop",
                usage: [],
                via_ai_chat_service: false,
            };
        }
    };

    const img2txt = async (image: string | File | Blob, testMode?: boolean) => {
        const puter = getPuter();
        if (!puter) {
            return "Local mode: OCR is unavailable without Puter service.";
        }
        try {
            const result = await puter.ai.img2txt(image, testMode);
            if (!result) {
                throw new Error('OCR service returned empty result');
            }
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Image text extraction failed';
            throw new Error(message);
        }
    };

    const getKV = async (key: string) => {
        const puter = getPuter();
        if (!puter) {
            return localStorage.getItem(`${LOCAL_KV_PREFIX}${key}`);
        }
        try {
            return await puter.kv.get(key);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to read from storage';
            throw new Error(message);
        }
    };

    const setKV = async (key: string, value: string) => {
        const puter = getPuter();
        if (!puter) {
            localStorage.setItem(`${LOCAL_KV_PREFIX}${key}`, value);
            return true;
        }
        try {
            return await puter.kv.set(key, value);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save to storage';
            throw new Error(message);
        }
    };

    const deleteKV = async (key: string) => {
        const puter = getPuter();
        if (!puter) {
            localStorage.removeItem(`${LOCAL_KV_PREFIX}${key}`);
            return true;
        }
        try {
            return await puter.kv.delete(key);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete from storage';
            throw new Error(message);
        }
    };

    const listKV = async (pattern: string, returnValues?: boolean) => {
        const puter = getPuter();
        if (!puter) {
            const localKeys = getLocalKvKeys().map((key) => key.replace(LOCAL_KV_PREFIX, ""));
            const matcher = pattern.endsWith("*")
                ? (key: string) => key.startsWith(pattern.slice(0, -1))
                : (key: string) => key === pattern;
            const matchedKeys = localKeys.filter(matcher);

            if (returnValues) {
                return matchedKeys.map((key) => ({
                    key,
                    value: localStorage.getItem(`${LOCAL_KV_PREFIX}${key}`) || "",
                }));
            }

            return matchedKeys;
        }
        if (returnValues === undefined) {
            returnValues = false;
        }
        try {
            return await puter.kv.list(pattern, returnValues);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list storage keys';
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
            const message = error instanceof Error ? error.message : 'Failed to flush storage';
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
            getUser: () => get().auth.user,
        },
        fs: {
            write: (path: string, data: string | File | Blob) => write(path, data),
            read: (path: string) => readFile(path),
            readDir: (path: string) => readDir(path),
            upload: (files: File[] | Blob[]) => upload(files),
            delete: (path: string) => deleteFile(path),
        },
        ai: {
            chat: (
                prompt: string | ChatMessage[],
                imageURL?: string | PuterChatOptions,
                testMode?: boolean,
                options?: PuterChatOptions
            ) => chat(prompt, imageURL, testMode, options),
            feedback: (path: string, message: string) => feedback(path, message),
            img2txt: (image: string | File | Blob, testMode?: boolean) =>
                img2txt(image, testMode),
        },
        kv: {
            get: (key: string) => getKV(key),
            set: (key: string, value: string) => setKV(key, value),
            delete: (key: string) => deleteKV(key),
            list: (pattern: string, returnValues?: boolean) =>
                listKV(pattern, returnValues),
            flush: () => flushKV(),
        },
        init,
        clearError: () => set({ error: null }),
    };
});
