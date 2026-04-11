import express from "express";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { OtpSession } from "../models/OtpSession.js";
import { PasswordResetSession } from "../models/PasswordResetSession.js";
import { User } from "../models/User.js";
import { sendOtpEmail } from "../services/mailer.js";
import { createOtpHash, generateOtpCode, isOtpMatch } from "../services/otpService.js";

const router = express.Router();

const normalizeEmail = (email) => email.trim().toLowerCase();

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.post("/login", async (req, res) => {
  try {
    const emailInput = req.body.email;
    const password = req.body.password;

    if (typeof emailInput !== "string" || !isEmailValid(emailInput)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const email = normalizeEmail(emailInput);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("login error", error);
    return res.status(500).json({ message: "Unable to login right now" });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const emailInput = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    if (typeof emailInput !== "string" || !isEmailValid(emailInput)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const email = normalizeEmail(emailInput);
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingSession = await OtpSession.findOne({ email });
    const isResend = Boolean(existingSession) && (!name || !password);

    if (!existingSession && (!name || !password)) {
      return res.status(400).json({ message: "Name and password are required for signup" });
    }

    if (typeof password === "string" && password.length > 0 && password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const otp = generateOtpCode();
    const { hash, salt } = createOtpHash(otp);

    let session = existingSession;

    if (!session) {
      const passwordHash = await bcrypt.hash(password, 12);

      session = await OtpSession.create({
        name: name.trim(),
        email,
        passwordHash,
        otpHash: hash,
        otpSalt: salt,
        expiresAt: new Date(Date.now() + env.otpTtlMs),
        resendCount: 0,
        verifyAttempts: 0,
      });
    } else {
      if (isResend && session.resendCount >= env.otpMaxResend) {
        return res.status(429).json({ message: "Resend limit reached. Please try again later." });
      }

      if (!isResend && (typeof name !== "string" || typeof password !== "string")) {
        return res.status(400).json({ message: "Name and password are required" });
      }

      if (!isResend) {
        session.name = name.trim();
        session.passwordHash = await bcrypt.hash(password, 12);
        session.resendCount = 0;
      } else {
        session.resendCount += 1;
      }

      session.otpHash = hash;
      session.otpSalt = salt;
      session.expiresAt = new Date(Date.now() + env.otpTtlMs);
      session.verifyAttempts = 0;
      await session.save();
    }

    const shouldUseDevOtp =
      !env.isMailConfigured && env.nodeEnv !== "production" && env.allowInsecureDevOtp;

    if (!shouldUseDevOtp && !env.isMailConfigured) {
      return res.status(500).json({
        message: "Email service is not configured. Set MAIL_USER and MAIL_APP_PASSWORD in .env.",
      });
    }

    if (!shouldUseDevOtp) {
      await sendOtpEmail({ to: email, name: session.name, otp });
    }

    return res.json({
      message: "OTP sent successfully",
      expiresIn: Math.floor(env.otpTtlMs / 1000),
      resendCount: session.resendCount,
      maxResend: env.otpMaxResend,
      devOtp: shouldUseDevOtp ? otp : undefined,
      deliveryMode: shouldUseDevOtp ? "development" : "smtp",
    });
  } catch (error) {
    console.error("send-otp error", error);
    const message = error instanceof Error ? error.message : "Unable to send OTP right now";
    return res.status(500).json({ message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const emailInput = req.body.email;
    const otpInput = req.body.otp;

    if (typeof emailInput !== "string" || !isEmailValid(emailInput)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (typeof otpInput !== "string" || !/^\d{6}$/.test(otpInput.trim())) {
      return res.status(400).json({ message: "Please enter a valid 6-digit OTP" });
    }

    const email = normalizeEmail(emailInput);
    const otp = otpInput.trim();

    const session = await OtpSession.findOne({ email });

    if (!session) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await OtpSession.deleteOne({ _id: session._id });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (session.verifyAttempts >= env.otpMaxVerifyAttempts) {
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const isMatch = isOtpMatch(otp, session.otpHash, session.otpSalt);
    if (!isMatch) {
      session.verifyAttempts += 1;
      await session.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      await OtpSession.deleteOne({ _id: session._id });
      return res.status(409).json({ message: "Email already registered" });
    }

    const newUser = await User.create({
      name: session.name,
      email,
      passwordHash: session.passwordHash,
      emailVerified: true,
    });

    await OtpSession.deleteOne({ _id: session._id });

    return res.json({
      message: "Email verified successfully",
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error("verify-otp error", error);
    return res.status(500).json({ message: "Unable to verify OTP right now" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const emailInput = req.body.email;

    if (typeof emailInput !== "string" || !isEmailValid(emailInput)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const email = normalizeEmail(emailInput);
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    const existingSession = await PasswordResetSession.findOne({ email });
    if (existingSession && existingSession.resendCount >= env.otpMaxResend) {
      return res.status(429).json({ message: "Resend limit reached. Please try again later." });
    }

    const otp = generateOtpCode();
    const { hash, salt } = createOtpHash(otp);

    let session = existingSession;

    if (!session) {
      session = await PasswordResetSession.create({
        email,
        otpHash: hash,
        otpSalt: salt,
        expiresAt: new Date(Date.now() + env.otpTtlMs),
        resendCount: 0,
        verifyAttempts: 0,
      });
    } else {
      session.resendCount += 1;
      session.verifyAttempts = 0;
      session.otpHash = hash;
      session.otpSalt = salt;
      session.expiresAt = new Date(Date.now() + env.otpTtlMs);
      await session.save();
    }

    const shouldUseDevOtp =
      !env.isMailConfigured && env.nodeEnv !== "production" && env.allowInsecureDevOtp;

    if (!shouldUseDevOtp && !env.isMailConfigured) {
      return res.status(500).json({
        message: "Email service is not configured. Set MAIL_USER and MAIL_APP_PASSWORD in .env.",
      });
    }

    if (!shouldUseDevOtp) {
      await sendOtpEmail({
        to: email,
        name: user.name,
        otp,
        purpose: "reset",
      });
    }

    return res.json({
      message: "Password reset OTP sent",
      expiresIn: Math.floor(env.otpTtlMs / 1000),
      resendCount: session.resendCount,
      maxResend: env.otpMaxResend,
      devOtp: shouldUseDevOtp ? otp : undefined,
      deliveryMode: shouldUseDevOtp ? "development" : "smtp",
    });
  } catch (error) {
    console.error("forgot-password error", error);
    const message = error instanceof Error ? error.message : "Unable to send reset OTP right now";
    return res.status(500).json({ message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const emailInput = req.body.email;
    const otpInput = req.body.otp;
    const newPassword = req.body.newPassword;

    if (typeof emailInput !== "string" || !isEmailValid(emailInput)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (typeof otpInput !== "string" || !/^\d{6}$/.test(otpInput.trim())) {
      return res.status(400).json({ message: "Please enter a valid 6-digit OTP" });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const email = normalizeEmail(emailInput);
    const otp = otpInput.trim();

    const session = await PasswordResetSession.findOne({ email });
    if (!session) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await PasswordResetSession.deleteOne({ _id: session._id });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (session.verifyAttempts >= env.otpMaxVerifyAttempts) {
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const isMatch = isOtpMatch(otp, session.otpHash, session.otpSalt);
    if (!isMatch) {
      session.verifyAttempts += 1;
      await session.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await PasswordResetSession.deleteOne({ _id: session._id });
      return res.status(404).json({ message: "No account found with this email address" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    await PasswordResetSession.deleteOne({ _id: session._id });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("reset-password error", error);
    return res.status(500).json({ message: "Unable to reset password right now" });
  }
});

export default router;
