import express from "express";
import { env } from "../config/env.js";
import { analyzeResumeWithOpenAI } from "../services/openaiAnalysis.js";

const router = express.Router();

router.post("/feedback", async (req, res) => {
  try {
    const jobTitle = typeof req.body.jobTitle === "string" ? req.body.jobTitle.trim() : "";
    const jobDescription = typeof req.body.jobDescription === "string" ? req.body.jobDescription.trim() : "";
    const resumeText = typeof req.body.resumeText === "string" ? req.body.resumeText.trim() : "";

    if (!jobTitle || !jobDescription || !resumeText) {
      return res.status(400).json({
        message: "jobTitle, jobDescription, and resumeText are required",
      });
    }

    const analysis = await analyzeResumeWithOpenAI({ jobTitle, jobDescription, resumeText });

    return res.json({
      message: {
        role: "assistant",
        content: analysis.content,
      },
      model: analysis.model,
      usage: analysis.usage,
      via_ai_chat_service: analysis.viaAiChatService,
    });
  } catch (error) {
    console.error("analysis feedback error", error);
    const message = error instanceof Error ? error.message : "AI analysis failed";
    return res.status(503).json({ message });
  }
});

router.get("/health", (_req, res) => {
  return res.json({
    status: env.isOpenAiConfigured ? "ok" : "fallback",
    configured: env.isOpenAiConfigured,
    fallbackAvailable: true,
  });
});

export default router;
