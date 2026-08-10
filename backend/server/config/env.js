import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, "..", "..");
const workspaceRoot = path.resolve(backendDir, "..");

[
  path.join(workspaceRoot, ".env.local"),
  path.join(workspaceRoot, ".env"),
  path.join(backendDir, ".env.local"),
  path.join(backendDir, ".env"),
].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const mailUser = process.env.MAIL_USER || "";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure =
  (process.env.SMTP_SECURE || String(smtpPort === 465)).toLowerCase() === "true";
const smtpService = process.env.SMTP_SERVICE || "";
const looksLikePlaceholder = (value, placeholders = []) => {
  const normalized = (value || "").trim().toLowerCase();
  return (
    !normalized ||
    placeholders.some((placeholder) => normalized.includes(placeholder))
  );
};

const openAiApiKey = process.env.OPENAI_API_KEY || "";
const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openAiBaseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const looksLikeMailPlaceholder = (value) =>
  looksLikePlaceholder(value, [
    "your-email@gmail.com",
    "your-gmail-app-password",
    "your-smtp-password",
    "your-mail-password",
  ]);
const looksLikeOpenAiPlaceholder = (value) =>
  looksLikePlaceholder(value, ["your-openai-api-key"]);

const passwordCandidates = [process.env.MAIL_PASSWORD || "", process.env.MAIL_APP_PASSWORD || ""];
const mailPassword =
  passwordCandidates.find((value) => value && !looksLikeMailPlaceholder(value)) ||
  passwordCandidates.find(Boolean) ||
  "";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.API_PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_resume_analyzer",
  mailUser,
  mailPassword,
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpService,
  openAiApiKey,
  openAiModel,
  openAiBaseUrl,
  isOpenAiConfigured: Boolean(openAiApiKey) && !looksLikeOpenAiPlaceholder(openAiApiKey),
  isMailConfigured:
    Boolean(mailUser && mailPassword) &&
    !looksLikeMailPlaceholder(mailUser) &&
    !looksLikeMailPlaceholder(mailPassword),
  mailFrom: process.env.MAIL_FROM || mailUser,
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowInsecureDevOtp:
    (process.env.ALLOW_INSECURE_DEV_OTP || "false").toLowerCase() === "true",
  otpTtlMs: 5 * 60 * 1000,
  otpMaxResend: 3,
  otpMaxVerifyAttempts: 5,
};
