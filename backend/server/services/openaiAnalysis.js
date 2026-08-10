import { env } from "../config/env.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "you",
  "your",
  "are",
  "will",
  "have",
  "has",
  "our",
  "their",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "as",
  "is",
  "be",
  "or",
  "by",
  "at",
  "we",
]);

const tokenize = (value) =>
  Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token))
    )
  );

const clampScore = (value) => Math.max(35, Math.min(96, Math.round(value)));

const countMatches = (value, pattern) => (value.match(pattern) || []).length;

const scoreFromHash = (value, min, max) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return min + (hash % (max - min + 1));
};

const buildAnalysisPrompt = ({ jobTitle, jobDescription, resumeText }) => {
  const trimmedResume = resumeText.slice(0, 12000);

  return `You are an expert resume reviewer. Analyze this resume for the ${jobTitle} position.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Resume Text:
${trimmedResume}

Return ONLY valid JSON with this exact structure:
{
  "overallScore": number,
  "ATS": {"score": number, "tips": [{"type": "good"|"improve", "tip": string}]},
  "toneAndStyle": {"score": number, "tips": [{"type": "good"|"improve", "tip": string, "explanation": string}]},
  "content": {"score": number, "tips": [{"type": "good"|"improve", "tip": string, "explanation": string}]},
  "structure": {"score": number, "tips": [{"type": "good"|"improve", "tip": string, "explanation": string}]},
  "skills": {"score": number, "tips": [{"type": "good"|"improve", "tip": string, "explanation": string}]}
}

Keep scores realistic, make the tips concise, and do not include markdown or extra text.`;
};

const isRetryableStatus = (status) => status === 429 || status >= 500;

const buildRequestError = async (response) => {
  const text = await response.text().catch(() => "");
  const details = text ? ` - ${text.slice(0, 500)}` : "";
  return new Error(`OpenAI request failed with status ${response.status}${details}`);
};

const requestWithRetry = async (requestBody, maxAttempts = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.openAiApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return response.json();
      }

      const error = await buildRequestError(response);
      if (!isRetryableStatus(response.status) || attempt === maxAttempts) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }
    }

    const backoffMs = 500 * 2 ** (attempt - 1);
    await delay(backoffMs);
  }

  throw lastError || new Error("OpenAI request failed after retries");
};

const buildLocalFallbackAnalysis = ({ jobTitle, jobDescription, resumeText }) => {
  const jdTokens = tokenize(`${jobTitle} ${jobDescription}`).slice(0, 60);
  const resumeTokens = tokenize(resumeText);
  const matchedKeywords = jdTokens.filter((token) => resumeTokens.includes(token));
  const missingKeywords = jdTokens.filter((token) => !resumeTokens.includes(token));
  const keywordCoverage = jdTokens.length > 0 ? matchedKeywords.length / jdTokens.length : 0;
  const metricsCount = countMatches(
    resumeText,
    /\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:x|yrs?|years?|months?|days?)\b/gi
  );
  const actionVerbCount = countMatches(
    resumeText,
    /\b(led|built|delivered|implemented|optimized|designed|developed|launched|reduced|improved|increased|automated|managed|scaled|created|owned|shipped)\b/gi
  );
  const sectionCount = ["experience", "education", "skills", "projects", "summary", "certifications"].filter(
    (section) => resumeText.toLowerCase().includes(section)
  ).length;
  const contentSignal = Math.min(18, Math.floor(resumeText.length / 1400));
  const seedSource = `${jobTitle}|${jobDescription.slice(0, 1000)}|${resumeText.slice(0, 3000)}`;

  const atsScore = clampScore(
    42 +
      Math.round(keywordCoverage * 38) +
      Math.min(14, metricsCount * 2) +
      Math.min(12, sectionCount * 2) +
      contentSignal +
      scoreFromHash(`${seedSource}:ats`, -5, 5)
  );
  const toneScore = clampScore(
    52 +
      Math.min(18, actionVerbCount * 2) +
      Math.min(8, sectionCount) +
      scoreFromHash(`${seedSource}:tone`, -6, 6)
  );
  const contentScore = clampScore(
    48 +
      Math.round(keywordCoverage * 24) +
      Math.min(18, metricsCount * 2) +
      contentSignal +
      scoreFromHash(`${seedSource}:content`, -6, 6)
  );
  const structureScore = clampScore(
    54 + Math.min(20, sectionCount * 3) + scoreFromHash(`${seedSource}:structure`, -5, 5)
  );
  const skillsScore = clampScore(
    48 +
      Math.round(keywordCoverage * 34) +
      Math.min(12, matchedKeywords.length * 2) +
      scoreFromHash(`${seedSource}:skills`, -6, 6)
  );
  const overallScore = clampScore(
    atsScore * 0.34 + toneScore * 0.14 + contentScore * 0.22 + structureScore * 0.16 + skillsScore * 0.14
  );
  const topKeywords = jdTokens.slice(0, 3).join(", ") || "role-specific keywords";
  const missingKeywordHint = missingKeywords.slice(0, 3).join(", ") || topKeywords;

  return {
    overallScore,
    ATS: {
      score: atsScore,
      tips: [
        {
          type: "good",
          tip: `Resume text matched ${matchedKeywords.length}/${jdTokens.length || 0} target-role keywords.`,
        },
        {
          type: "improve",
          tip: `Add missing role terms naturally in bullets and skills: ${missingKeywordHint}.`,
        },
      ],
    },
    toneAndStyle: {
      score: toneScore,
      tips: [
        {
          type: "good",
          tip: "Tone score considered action verbs and direct phrasing in the extracted resume text.",
          explanation: "Strong verbs and concise wording help recruiters understand your impact quickly.",
        },
        {
          type: "improve",
          tip: "Start more bullets with action verbs and avoid passive phrasing.",
          explanation: "Action-led phrasing makes experience easier to scan and compare.",
        },
      ],
    },
    content: {
      score: contentScore,
      tips: [
        {
          type: "good",
          tip: `Detected ${metricsCount} measurable result signals such as percentages, durations, or multipliers.`,
          explanation: "Numbers make achievements more credible and easier to evaluate.",
        },
        {
          type: "improve",
          tip: "Add quantified outcomes to project and experience bullets wherever possible.",
          explanation: "Impact metrics help separate responsibilities from results.",
        },
      ],
    },
    structure: {
      score: structureScore,
      tips: [
        {
          type: "good",
          tip: `Detected ${sectionCount} common resume sections from the extracted content.`,
          explanation: "Clear sections improve both readability and ATS parsing.",
        },
        {
          type: "improve",
          tip: "Keep headings, dates, and bullet formatting consistent across all sections.",
          explanation: "Consistent formatting helps automated parsers and human reviewers.",
        },
      ],
    },
    skills: {
      score: skillsScore,
      tips: [
        {
          type: "good",
          tip: `Skill relevance was estimated from overlap with the ${jobTitle} job description.`,
          explanation: "A focused skills section improves keyword matching opportunities.",
        },
        {
          type: "improve",
          tip: `Prioritize exact target-role terms where accurate, especially ${topKeywords}.`,
          explanation: "Closer keyword alignment generally improves ATS match quality.",
        },
      ],
    },
  };
};

const buildFallbackResponse = ({ jobTitle, jobDescription, resumeText }) => ({
  content: JSON.stringify(buildLocalFallbackAnalysis({ jobTitle, jobDescription, resumeText })),
  model: "local-fallback",
  usage: null,
  viaAiChatService: false,
});

export const analyzeResumeWithOpenAI = async ({ jobTitle, jobDescription, resumeText }) => {
  if (!env.isOpenAiConfigured) {
    return buildFallbackResponse({ jobTitle, jobDescription, resumeText });
  }

  const requestBody = {
    model: env.openAiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a precise resume reviewer. Return only valid JSON that matches the requested schema.",
      },
      {
        role: "user",
        content: buildAnalysisPrompt({ jobTitle, jobDescription, resumeText }),
      },
    ],
  };

  try {
    const data = await requestWithRetry(requestBody, 3);
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI returned an empty or invalid response");
    }

    return {
      content,
      model: env.openAiModel,
      usage: data.usage || null,
      viaAiChatService: true,
    };
  } catch (error) {
    console.warn("OpenAI analysis failed; using local fallback", error);
    return buildFallbackResponse({ jobTitle, jobDescription, resumeText });
  }
};
