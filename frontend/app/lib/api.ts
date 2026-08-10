const normalizeBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim().replace(/\/$/, "") || "";

  if (!trimmed) {
    return "";
  }

  const isLoopbackUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|$)/i.test(trimmed);

  if (!import.meta.env.DEV && isLoopbackUrl) {
    return "";
  }

  return trimmed;
};

export const getApiBaseUrl = () => normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

export const buildApiUrl = (baseUrl: string, path: string, namespace = "auth") => {
  const cleanedBase = baseUrl.replace(/\/$/, "");
  const cleanedPath = path.replace(/^\/+/, "");
  const suffix = namespace ? `${namespace}/${cleanedPath}` : cleanedPath;

  if (!cleanedBase) {
    return `/api/${suffix}`;
  }

  if (cleanedBase.startsWith("/")) {
    return `${cleanedBase}/${suffix}`;
  }

  return `${cleanedBase}/api/${suffix}`;
};