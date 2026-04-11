import crypto from "crypto";

export const generateOtpCode = () =>
  crypto.randomInt(100000, 999999).toString();

export const createOtpHash = (otp, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto
    .createHash("sha256")
    .update(`${otp}:${salt}`)
    .digest("hex");

  return { salt, hash };
};

export const isOtpMatch = (otp, expectedHash, salt) => {
  const candidate = createOtpHash(otp, salt).hash;

  const expected = Buffer.from(expectedHash, "hex");
  const provided = Buffer.from(candidate, "hex");

  if (expected.length !== provided.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, provided);
};
