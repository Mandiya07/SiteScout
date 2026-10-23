import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiInstance: GoogleGenAI | null = null;

export function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return !!(key && key !== "MY_GEMINI_API_KEY" && key !== "MOCK_KEY" && key !== "");
}

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY?.trim();
    const isProduction = process.env.NODE_ENV === "production";

    if (!isApiKeyConfigured()) {
      if (isProduction) {
        throw new Error("GEMINI_API_KEY is not configured in production environment. Live AI provider is required.");
      }
      console.log("[Gemini Config Notice] GEMINI_API_KEY is not configured. Local fallback responses active for development.");
    }

    aiInstance = new GoogleGenAI({
      apiKey: key && key !== "MY_GEMINI_API_KEY" ? key : "DEV_FALLBACK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust wrapper with exponential backoff retries and automatic backup model fallback
export async function generateContentWithRetry(params: any, maxRetries = 2, initialDelayMs = 500): Promise<any> {
  const ai = getGeminiClient();
  let delay = initialDelayMs;
  let lastError: any = null;
  const originalModel = params.model || "gemini-2.5-flash";
  const candidateModels = ["gemini-2.5-flash", originalModel, "gemini-2.0-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
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
        
        // If Google Search tool quota was exhausted, try direct generation without search tool
        if (isQuotaExceeded && params.config?.tools?.some((t: any) => t.googleSearch)) {
          console.log(`[Gemini API Service] Search grounding tool quota limit reached on ${modelName}. Attempting tool-less generation fallback...`);
          try {
            const noToolParams = {
              ...params,
              model: modelName,
              config: {
                ...params.config,
                tools: undefined
              }
            };
            const directRes = await ai.models.generateContent(noToolParams);
            return directRes;
          } catch (toolFallbackErr) {
            // Direct generation on this model also hit quota/error - switch to backup model
            console.log(`[Gemini API Service] Tool-less fallback on ${modelName} transitioned to next backup model candidate.`);
          }
        }

        if (isQuotaExceeded || isHighDemand) {
          console.log(`[Gemini API Service Early Exit] High demand or quota limit detected for ${modelName}. Switching to next backup model candidate.`);
          break; // Switch to next model immediately
        }

        if (attempt < maxRetries) {
          const jitter = Math.floor(Math.random() * 150);
          const actualDelay = delay + jitter;
          console.log(`[Gemini API Service] Transient issue on ${modelName}. Retrying in ${actualDelay}ms (delay ${delay}ms + jitter ${jitter}ms)...`);
          await new Promise((resolve) => setTimeout(resolve, actualDelay));
          delay = Math.floor(delay * 1.5);
        } else if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
          console.log(`[Gemini API Service] Max retries reached for ${modelName}. Switching to next model fallback in 500ms...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }
  throw lastError;
}
