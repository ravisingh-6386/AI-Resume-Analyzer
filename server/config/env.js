import dotenv from "dotenv";

dotenv.config();

const mailUser = process.env.MAIL_USER || "";
const mailAppPassword = process.env.MAIL_APP_PASSWORD || "";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.API_PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_resume_analyzer",
  mailUser,
  mailAppPassword,
  isMailConfigured: Boolean(mailUser && mailAppPassword),
  mailFrom: process.env.MAIL_FROM || mailUser,
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowInsecureDevOtp:
    (process.env.ALLOW_INSECURE_DEV_OTP || "true").toLowerCase() === "true",
  otpTtlMs: 5 * 60 * 1000,
  otpMaxResend: 3,
  otpMaxVerifyAttempts: 5,
};
