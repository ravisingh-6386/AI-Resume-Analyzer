import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporterConfig = {
  auth: {
    user: env.mailUser,
    pass: env.mailPassword,
  },
};

if (env.smtpService) {
  transporterConfig.service = env.smtpService;
} else {
  transporterConfig.host = env.smtpHost;
  transporterConfig.port = env.smtpPort;
  transporterConfig.secure = env.smtpSecure;
}

const transporter = nodemailer.createTransport(transporterConfig);

const buildOtpEmailHtml = ({ name, otp, heading, body }) => `
  <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <h2 style="margin:0 0 12px;color:#0f172a;">${heading}</h2>
      <p style="margin:0 0 16px;color:#475569;line-height:1.6;">
        Hi ${name || "there"}, ${body}
      </p>
      <div style="margin:16px 0 20px;padding:14px 16px;border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe;">
        <p style="margin:0;font-size:28px;letter-spacing:8px;font-weight:700;color:#312e81;">${otp}</p>
      </div>
      <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
        This OTP expires in 5 minutes. If you did not request this, you can ignore this email.
      </p>
    </div>
  </div>
`;

export const sendOtpEmail = async ({ to, name, otp, purpose = "signup" }) => {
  if (!env.isMailConfigured) {
    throw new Error("Email service is not configured. Set MAIL_USER and MAIL_PASSWORD (or MAIL_APP_PASSWORD) in .env.");
  }

  const isReset = purpose === "reset";
  const heading = isReset ? "Reset your password" : "Verify your email";
  const body = isReset
    ? "use the one-time password below to reset your account password."
    : "use the one-time password below to complete your signup.";
  const subject = isReset ? "Your password reset verification code" : "Your signup verification code";

  await transporter.sendMail({
    from: env.mailFrom,
    to,
    subject,
    text: `Hi ${name || "there"}, your verification code is ${otp}. It expires in 5 minutes.`,
    html: buildOtpEmailHtml({ name, otp, heading, body }),
  });
};
