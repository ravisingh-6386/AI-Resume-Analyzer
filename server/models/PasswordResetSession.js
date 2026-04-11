import mongoose from "mongoose";

const passwordResetSessionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
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

passwordResetSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const PasswordResetSession =
  mongoose.models.PasswordResetSession ||
  mongoose.model("PasswordResetSession", passwordResetSessionSchema);
