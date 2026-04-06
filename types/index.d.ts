interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    jobDescription?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback | null;
    studentFeedback?: StudentFeedback;
    roleKeywordAnalysis?: RoleKeywordAnalysis;
    generatedProjectBullets?: string[];
    jobState?: 'queued' | 'processing' | 'done' | 'failed';
    lastError?: string;
    retryCount?: number;
    createdAt?: number;
    completedAt?: number;
    actionableRewrites?: ActionableRewrite[];
    usedFallbackAnalysis?: boolean;
}

interface StudentFeedback {
    rewrittenSummary: string;
    actionChecklist: string[];
}

interface RoleKeywordAnalysis {
    rolePack: string;
    matchedKeywords: string[];
    missingKeywords: string[];
    coverage: number;
}

interface ActionableRewrite {
    section: 'ATS' | 'Content' | 'Tone' | 'Structure' | 'Skills';
    issue: string;
    example: string;
    rewrite: string;
    impact: string;
}

interface Feedback {
    overallScore: number;
    ATS: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    toneAndStyle: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
}
