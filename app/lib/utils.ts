import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  // Determine the appropriate unit by calculating the log
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Format with 2 decimal places and round
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const generateUUID = () => crypto.randomUUID();

/**
 * Parse and normalize feedback from Puter AI into the expected Feedback type
 */
export const parseFeedback = (feedbackData: any): Feedback => {
  try {
    let data = feedbackData;
    
    // If it's a string, try to extract JSON
    if (typeof feedbackData === 'string') {
      let jsonStr = feedbackData.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object in the string
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      try {
        data = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse JSON from string:', jsonStr.substring(0, 200));
        throw parseError;
      }
    }

    // Ensure the structure matches the Feedback type
    const normalizedFeedback: Feedback = {
      overallScore: data.overallScore ?? data.overall_score ?? data.score ?? 75,
      ATS: {
        score: data.ATS?.score ?? data.ats?.score ?? 75,
        tips: (data.ATS?.tips ?? data.ats?.tips ?? []).map((tip: any) => ({
          type: (tip.type === 'good' || tip.type === 'improve') ? tip.type : 'improve',
          tip: tip.tip || tip.text || '',
        })),
      },
      toneAndStyle: {
        score: data.toneAndStyle?.score ?? data.tone_and_style?.score ?? 75,
        tips: (data.toneAndStyle?.tips ?? data.tone_and_style?.tips ?? []).map((tip: any) => ({
          type: (tip.type === 'good' || tip.type === 'improve') ? tip.type : 'improve',
          tip: tip.tip || tip.text || '',
          explanation: tip.explanation || tip.details || '',
        })),
      },
      content: {
        score: data.content?.score ?? 75,
        tips: (data.content?.tips ?? []).map((tip: any) => ({
          type: (tip.type === 'good' || tip.type === 'improve') ? tip.type : 'improve',
          tip: tip.tip || tip.text || '',
          explanation: tip.explanation || tip.details || '',
        })),
      },
      structure: {
        score: data.structure?.score ?? 75,
        tips: (data.structure?.tips ?? []).map((tip: any) => ({
          type: (tip.type === 'good' || tip.type === 'improve') ? tip.type : 'improve',
          tip: tip.tip || tip.text || '',
          explanation: tip.explanation || tip.details || '',
        })),
      },
      skills: {
        score: data.skills?.score ?? 75,
        tips: (data.skills?.tips ?? []).map((tip: any) => ({
          type: (tip.type === 'good' || tip.type === 'improve') ? tip.type : 'improve',
          tip: tip.tip || tip.text || '',
          explanation: tip.explanation || tip.details || '',
        })),
      },
    };

    return normalizedFeedback;
  } catch (error) {
    console.error('Error parsing feedback:', error);
    // Return default feedback structure if parsing fails
    return getDefaultFeedback();
  }
};

/**
 * Get default feedback structure with placeholder data
 */
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

