import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const generateUUID = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const parseFeedback = (feedbackData: any): Feedback => {
  try {
    let data = feedbackData;

    if (typeof feedbackData === "string") {
      let jsonStr = feedbackData.trim();
      jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        data = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse JSON from string:", jsonStr.substring(0, 200));
        throw parseError;
      }
    }

    const normalizedFeedback: Feedback = {
      overallScore: data.overallScore ?? data.overall_score ?? data.score ?? 75,
      ATS: {
        score: data.ATS?.score ?? data.ats?.score ?? 75,
        tips: (data.ATS?.tips ?? data.ats?.tips ?? []).map((tip: any) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
        })),
      },
      toneAndStyle: {
        score: data.toneAndStyle?.score ?? data.tone_and_style?.score ?? 75,
        tips: (data.toneAndStyle?.tips ?? data.tone_and_style?.tips ?? []).map((tip: any) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || "",
        })),
      },
      content: {
        score: data.content?.score ?? 75,
        tips: (data.content?.tips ?? []).map((tip: any) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || "",
        })),
      },
      structure: {
        score: data.structure?.score ?? 75,
        tips: (data.structure?.tips ?? []).map((tip: any) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || "",
        })),
      },
      skills: {
        score: data.skills?.score ?? 75,
        tips: (data.skills?.tips ?? []).map((tip: any) => ({
          type: tip.type === "good" || tip.type === "improve" ? tip.type : "improve",
          tip: tip.tip || tip.text || "",
          explanation: tip.explanation || tip.details || "",
        })),
      },
    };

    return normalizedFeedback;
  } catch (error) {
    console.error("Error parsing feedback:", error);
    return getDefaultFeedback();
  }
};

export const getDefaultFeedback = (): Feedback => ({
  overallScore: 0,
  ATS: {
    score: 0,
    tips: [],
  },
  toneAndStyle: {
    score: 0,
    tips: [],
  },
  content: {
    score: 0,
    tips: [],
  },
  structure: {
    score: 0,
    tips: [],
  },
  skills: {
    score: 0,
    tips: [],
  },
});

const ROLE_KEYWORD_PACKS: Record<string, string[]> = {
  frontend: [
    "react",
    "typescript",
    "javascript",
    "html",
    "css",
    "tailwind",
    "redux",
    "next.js",
    "accessibility",
    "responsive",
  ],
  backend: [
    "node.js",
    "express",
    "api",
    "rest",
    "sql",
    "postgresql",
    "mongodb",
    "authentication",
    "caching",
    "microservices",
  ],
  data: [
    "python",
    "pandas",
    "numpy",
    "sql",
    "etl",
    "visualization",
    "machine learning",
    "statistics",
    "power bi",
    "tableau",
  ],
  default: [
    "communication",
    "problem solving",
    "teamwork",
    "leadership",
    "ownership",
    "collaboration",
    "analysis",
    "documentation",
  ],
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9.+#\s-]/g, " ");

export const detectRolePack = (jobTitle: string): string => {
  const title = normalizeText(jobTitle);
  if (/frontend|front end|ui|react/.test(title)) return "frontend";
  if (/backend|back end|api|server|node/.test(title)) return "backend";
  if (/data|analyst|ml|ai|scientist/.test(title)) return "data";
  return "default";
};

export const getRoleKeywordAnalysis = (
  jobTitle: string,
  jobDescription: string,
  feedback: Feedback
): RoleKeywordAnalysis => {
  const rolePack = detectRolePack(jobTitle);
  const keywords = ROLE_KEYWORD_PACKS[rolePack] ?? ROLE_KEYWORD_PACKS.default;
  const corpus = normalizeText(
    `${jobTitle} ${jobDescription} ${feedback.skills.tips.map((t) => t.tip).join(" ")}`
  );

  const matchedKeywords = keywords.filter((keyword) => corpus.includes(normalizeText(keyword)));
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));
  const coverage = Math.round((matchedKeywords.length / keywords.length) * 100);

  return { rolePack, matchedKeywords, missingKeywords, coverage };
};

export const rewriteFeedbackForStudents = (feedback: Feedback): StudentFeedback => {
  const weakAreas = [
    { key: "ATS", score: feedback.ATS.score },
    { key: "Tone & Style", score: feedback.toneAndStyle.score },
    { key: "Content", score: feedback.content.score },
    { key: "Structure", score: feedback.structure.score },
    { key: "Skills", score: feedback.skills.score },
  ]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((a) => a.key);

  const actionChecklist = [
    ...feedback.ATS.tips
      .filter((t) => t.type === "improve")
      .slice(0, 2)
      .map((t) => `Update ATS keywords: ${t.tip}`),
    ...feedback.content.tips
      .filter((t) => t.type === "improve")
      .slice(0, 2)
      .map((t) => `Improve impact statements: ${t.tip}`),
    ...feedback.structure.tips
      .filter((t) => t.type === "improve")
      .slice(0, 1)
      .map((t) => `Fix resume structure: ${t.tip}`),
  ].slice(0, 5);

  return {
    rewrittenSummary:
      `Your resume is at ${feedback.overallScore}/100. You are close, and the fastest gains are in ${weakAreas.join(" and ")}. ` +
      "Focus on clearer impact bullets, stronger role keywords, and cleaner structure to boost interview chances.",
    actionChecklist: actionChecklist.length
      ? actionChecklist
      : [
          "Add measurable outcomes to project bullets",
          "Match your skills section to the role keywords",
        ],
  };
};

const extractTitleWords = (jobTitle: string): string[] =>
  normalizeText(jobTitle)
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 3);

export const generateProjectBullets = (
  jobTitle: string,
  roleAnalysis: RoleKeywordAnalysis
): string[] => {
  const titleWords = extractTitleWords(jobTitle);
  const topKeywords = roleAnalysis.matchedKeywords
    .slice(0, 2)
    .concat(roleAnalysis.missingKeywords.slice(0, 1));
  const focus = [...titleWords, ...topKeywords].filter(Boolean).slice(0, 3).join(", ");

  return [
    `Built an end-to-end project aligned to ${jobTitle}, delivering a production-ready feature set focused on ${focus}.`,
    "Improved performance and reliability by instrumenting metrics, reducing response time by 35% and cutting key errors by 20%.",
    "Collaborated with peers to test, iterate, and ship improvements using Git workflows, documented decisions, and actionable release notes.",
  ];
};

export const generateActionableRewrites = (feedback: Feedback): ActionableRewrite[] => {
  const rewrites: ActionableRewrite[] = [];

  feedback.ATS.tips
    .filter((t) => t.type === "improve")
    .slice(0, 2)
    .forEach((tip) => {
      rewrites.push({
        section: "ATS",
        issue: tip.tip,
        example: "Managed project timeline",
        rewrite: "Led cross-functional project delivery on schedule, improving team velocity by 20%",
        impact: "+8-12% ATS keyword match",
      });
    });

  feedback.content.tips
    .filter((t) => t.type === "improve")
    .slice(0, 2)
    .forEach((tip) => {
      rewrites.push({
        section: "Content",
        issue: tip.tip,
        example: "Built a new feature",
        rewrite: "Architected and shipped a real-time dashboard feature, increasing user engagement by 35%",
        impact: "+10-15% content impact score",
      });
    });

  feedback.toneAndStyle.tips
    .filter((t) => t.type === "improve")
    .slice(0, 1)
    .forEach((tip) => {
      rewrites.push({
        section: "Tone",
        issue: tip.tip,
        example: "Responsible for testing",
        rewrite: "Owned QA strategy and execution, reducing production bugs by 40%",
        impact: "+5-8% tone and professionalism score",
      });
    });

  feedback.skills.tips
    .filter((t) => t.type === "improve")
    .slice(0, 1)
    .forEach((tip) => {
      rewrites.push({
        section: "Skills",
        issue: tip.tip,
        example: "Tried learning React",
        rewrite: "Built 3+ React projects with TypeScript, REST APIs, and Git-based CI/CD",
        impact: "+12% skills credibility",
      });
    });

  return rewrites.slice(0, 5);
};

export const getProgressState = (jobState?: string) => {
  const states = {
    queued: { icon: "Q", label: "Queued", color: "text-gray-600", bg: "bg-gray-50" },
    processing: { icon: "...", label: "Processing", color: "text-blue-600", bg: "bg-blue-50" },
    done: { icon: "OK", label: "Complete", color: "text-green-600", bg: "bg-green-50" },
    failed: { icon: "X", label: "Failed", color: "text-red-600", bg: "bg-red-50" },
  };

  return states[jobState as keyof typeof states] || states.queued;
};
