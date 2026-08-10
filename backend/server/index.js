import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pathToFileURL } from "url";
import { connectDatabase, getDatabaseStatus } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";

export const app = express();

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
app.use(express.json({ limit: "2mb" }));

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
  const database = getDatabaseStatus();
  res.status(database === "connected" ? 200 : 503).json({
    status: database === "connected" ? "ok" : "degraded",
    database,
    analysisFallbackAvailable: true,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled API error", err);
  res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });

  server.on("error", (error) => {
    console.error("API server error", error);
    process.exit(1);
  });

  return server;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer().catch((error) => {
    console.error("Failed to start API server", error);
    process.exit(1);
  });
}

export { startServer };
