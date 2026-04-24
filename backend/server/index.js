import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server and same-origin requests without an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const isLocalDevOrigin = /^https?:\/\/localhost:\d+$/.test(origin);
      if (env.nodeEnv !== "production" && isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled API error", err);
  res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`OTP API running on http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
