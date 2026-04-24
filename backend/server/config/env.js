import dotenv from "dotenv";

dotenv.config({ path: "backend/.env" });
dotenv.config();

const mailUser = process.env.MAIL_USER || "";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure =
  (process.env.SMTP_SECURE || String(smtpPort === 465)).toLowerCase() === "true";
const smtpService = process.env.SMTP_SERVICE || "";
const looksLikePlaceholder = (value) => {
  const normalized = (value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("your-email@gmail.com") ||
    normalized.includes("your-gmail-app-password") ||
    normalized.includes("your-smtp-password") ||
    normalized.includes("your-mail-password")
  );
};

const passwordCandidates = [process.env.MAIL_PASSWORD || "", process.env.MAIL_APP_PASSWORD || ""];
const mailPassword =
  passwordCandidates.find((value) => value && !looksLikePlaceholder(value)) ||
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
  isMailConfigured:
    Boolean(mailUser && mailPassword) &&
    !looksLikePlaceholder(mailUser) &&
    !looksLikePlaceholder(mailPassword),
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
