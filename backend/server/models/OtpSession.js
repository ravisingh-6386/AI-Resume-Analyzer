import mongoose from "mongoose";

const otpSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    otpSalt: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    verifyAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const OtpSession = mongoose.models.OtpSession || mongoose.model("OtpSession", otpSessionSchema);
