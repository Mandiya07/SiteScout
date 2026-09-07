import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log("WARNING: GEMINI_API_KEY environment variable is not set. Using mock fallbacks.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export function isApiKeyConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY !== "");
}

// Robust wrapper with exponential backoff retries and automatic backup model fallback
export async function generateContentWithRetry(params: any, maxRetries = 2, initialDelayMs = 500): Promise<any> {
  const ai = getGeminiClient();
  let delay = initialDelayMs;
  let lastError: any = null;
  const originalModel = params.model || "gemini-2.5-flash";
  const candidateModels = [originalModel, "gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
  const modelsToTry = Array.from(new Set(candidateModels));

  for (const modelName of modelsToTry) {
    delay = initialDelayMs; // reset backoff for each new model candidate
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API Service] Requesting ${modelName} (Attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        console.log(`[Gemini SDK Service Status] ${modelName} - status code ${error?.status || error?.code || "unavailable"} (attempt ${attempt}/${maxRetries})`);
        
        if (error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.status === 404) {
          console.log(`[Gemini API Service Early Exit] Non-transient status ${error.status}. Skipping retries for ${modelName}.`);
          break; // Switch to next model immediately
        }

        const errorStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
        const isQuotaExceeded = error?.status === 429 || error?.code === 429 || errorStr.includes('Quota exceeded') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('resource_exhausted');
        const isHighDemand = error?.status === 503 || error?.code === 503 || error?.error?.code === 503 || error?.error?.status === "UNAVAILABLE" || errorStr.includes('503') || errorStr.includes('high demand') || errorStr.includes('UNAVAILABLE') || errorStr.includes('overloaded');
        
        if (isQuotaExceeded || isHighDemand) {
          console.log(`[Gemini API Service Early Exit] High demand (503) or Quota Exceeded detected for ${modelName}. Switching to backup model immediately.`);
          break; // Switch to next model immediately
        }

        if (attempt < maxRetries) {
          console.log(`[Gemini API Service] Transient issue on ${modelName}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        } else if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
          console.log(`[Gemini API Service] Max retries reached for ${modelName}. Switching to next model fallback in 500ms...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }
  throw lastError;
}
